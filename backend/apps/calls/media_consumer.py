"""WebSocket consumer for Exotel's Voicebot applet.

Exotel opens a socket here when an outbound call's flow reaches the Voicebot
applet, then streams the caller's audio as base64 PCM16LE 8 kHz inside JSON
events. We bridge that audio to an OpenAI Realtime session and stream the AI's
speech back on the same socket.
"""
import asyncio
import base64
import json
import logging
import re
import time

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone

from django.conf import settings

from .ai_bridge import RealtimeBridge
from .audio import pcm_to_ulaw, ulaw_to_pcm
from .counselor_prompt import COUNSELOR_SYSTEM_PROMPT, FIXED_GREETING
from .nevo_prompt import NEVO_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

# Exotel requires outgoing media payloads in multiples of 320 bytes (20 ms).
OUT_FRAME = 320
OUT_CHUNK = 3200  # 200 ms — Exotel's minimum recommended chunk
PCM_BYTES_PER_SEC = 16000  # 8 kHz * 16-bit mono

# Fast-path hangup: if the caller's transcript contains a farewell, force-cut
# the call shortly after, even if the model never calls its end_call tool.
# Covers "bye", "bye bye", "thank you bye", "no thanks bye", बाय, अलविदा.
FAREWELL_RE = re.compile(r'\b(bye+|good ?bye|बाय|अलविदा|टाटा)\b', re.IGNORECASE)
# Long enough for the agent's ≤5-word goodbye, short enough to feel immediate.
FORCE_HANGUP_AFTER = 2.0


class ExotelMediaConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.call_id = None
        self.stream_sid = None
        self.bridge = None
        self._out_buf = bytearray()
        self._resp_pcm = 0  # bytes sent to Exotel for the response in flight
        self._resp_started_at = None  # monotonic time the first chunk was sent
        self._last_resp_seconds = 0.0
        self._last_resp_started = None
        self._closed = False
        self._force_hangup_task = None
        await self.accept()

    async def disconnect(self, code):
        self._closed = True
        if self._force_hangup_task:
            self._force_hangup_task.cancel()
        if self.bridge:
            await self.bridge.close()

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return
        msg = json.loads(text_data)
        event = msg.get('event')

        if event == 'start':
            await self._handle_start(msg)
        elif event == 'media':
            if self.bridge:
                pcm = base64.b64decode(msg['media']['payload'])
                await self.bridge.send_caller_audio(pcm_to_ulaw(pcm))
        elif event == 'stop':
            if self.bridge:
                await self.bridge.close()
                self.bridge = None
            await self.close()

    async def _handle_start(self, msg):
        start = msg.get('start', {})
        self.stream_sid = start.get('stream_sid') or msg.get('stream_sid')
        call_sid = start.get('call_sid', '')
        custom = start.get('custom_parameters') or {}

        call = await self._find_call(custom, call_sid)
        if call is None:
            logger.error('Voicebot stream for unknown call (sid=%s, custom=%s)', call_sid, custom)
            await self.close()
            return

        self.call_id = call['id']
        await self._mark_in_progress(self.call_id)
        await self._broadcast({'type': 'call.status', 'call_id': self.call_id, 'status': 'in_progress'})

        self.bridge = RealtimeBridge(
            system_prompt=call['system_prompt'],
            on_audio=self._play_to_caller,
            on_audio_done=self._flush_playback,
            on_transcript=self._save_transcript,
            on_interrupt=self._barge_in,
            on_hangup=self._hangup,
        )
        await self.bridge.connect(greeting_hint=self._greeting_hint(call))

    @staticmethod
    def _greeting_hint(call) -> str:
        """Per-profile opener. CodingNowAI uses a fixed scripted greeting;
        Nevo is an outbound B2B call, so the opener confirms we have the
        right person before anything else (see nevo_prompt step 1)."""
        if settings.AGENT_PROFILE == 'codingnowai':
            return ('Start the call by saying EXACTLY this greeting and '
                    f'nothing else: "{FIXED_GREETING}"')
        name = (call['lead_name'] or '').strip()
        # Placeholder names read terribly on a call ("Hello Unknown").
        if name.lower() in ('unknown', 'na', 'n/a', 'none', 'test'):
            name = ''
        who = (f'You are calling {name} — greet them by name and confirm you '
               'are speaking to them.') if name else (
            'You do not know their name — ask who you are speaking to.')
        return ('Say ONLY a natural one-sentence opener to start the call. '
                f'{who} Introduce yourself and where you are calling from, '
                'and ask if it is a good time to talk. Say NOTHING else — no '
                'rules, no policies, no lists, no product pitch yet.')

    # --- bridge callbacks -------------------------------------------------

    async def _play_to_caller(self, ulaw: bytes):
        self._out_buf.extend(ulaw_to_pcm(ulaw))
        while len(self._out_buf) >= OUT_CHUNK:
            await self._send_media(bytes(self._out_buf[:OUT_CHUNK]))
            del self._out_buf[:OUT_CHUNK]

    async def _flush_playback(self):
        if self._out_buf:
            pcm = bytes(self._out_buf)
            self._out_buf.clear()
            pad = (-len(pcm)) % OUT_FRAME
            await self._send_media(pcm + b'\x00' * pad)
        self._last_resp_seconds = self._resp_pcm / PCM_BYTES_PER_SEC
        self._last_resp_started = self._resp_started_at
        self._resp_pcm = 0
        self._resp_started_at = None

    async def _close_stream(self):
        """Close the Voicebot socket exactly once; Exotel then ends the call."""
        if self._closed:
            return
        self._closed = True
        try:
            await self.close()
        except Exception:
            logger.warning('closing Voicebot stream failed', exc_info=True)

    async def _hangup(self):
        """The agent called end_call: let the goodbye finish playing, then
        close the stream, which makes Exotel end the call.

        We push audio to Exotel faster than real time, so playback lags what
        we've sent. Exotel started playing roughly when we sent the first
        chunk; whatever hasn't played yet is duration minus elapsed.
        """
        remaining = self._last_resp_seconds
        if self._last_resp_started is not None:
            remaining -= time.monotonic() - self._last_resp_started
        await asyncio.sleep(max(0.0, remaining) + 0.3)
        await self._close_stream()

    async def _force_hangup(self):
        """The caller said a farewell: cut the call after a short grace period
        for the agent's goodbye, whether or not the model calls end_call."""
        try:
            await asyncio.sleep(FORCE_HANGUP_AFTER)
        except asyncio.CancelledError:
            return
        logger.info('Force hangup after caller farewell (call_id=%s)', self.call_id)
        await self._close_stream()

    async def _barge_in(self):
        self._out_buf.clear()
        self._resp_pcm = 0
        self._resp_started_at = None
        if self.stream_sid:
            await self.send(text_data=json.dumps({
                'event': 'clear',
                'stream_sid': self.stream_sid,
            }))

    async def _save_transcript(self, role: str, text: str):
        await self._create_transcript(self.call_id, role, text)
        await self._broadcast({
            'type': 'call.transcript',
            'call_id': self.call_id,
            'role': role,
            'text': text,
        })
        if (role == 'human' and FAREWELL_RE.search(text)
                and self._force_hangup_task is None and not self._closed):
            self._force_hangup_task = asyncio.create_task(self._force_hangup())

    # --- helpers ----------------------------------------------------------

    async def _send_media(self, pcm: bytes):
        if self._resp_pcm == 0:
            self._resp_started_at = time.monotonic()
        self._resp_pcm += len(pcm)
        await self.send(text_data=json.dumps({
            'event': 'media',
            'stream_sid': self.stream_sid,
            'media': {'payload': base64.b64encode(pcm).decode('ascii')},
        }))

    async def _broadcast(self, data):
        try:
            await self.channel_layer.group_send('live_calls', {'type': 'live_update', 'data': data})
        except Exception:
            logger.warning('live_calls broadcast failed', exc_info=True)

    @database_sync_to_async
    def _find_call(self, custom_params, call_sid):
        from .models import Call

        call = None
        call_id = None
        if isinstance(custom_params, dict):
            call_id = custom_params.get('call_id')
            if not call_id:
                # CustomField may arrive as a raw 'call_id=N' string value.
                for value in custom_params.values():
                    if isinstance(value, str) and value.startswith('call_id='):
                        call_id = value.split('=', 1)[1]
                        break
        elif isinstance(custom_params, str) and custom_params.startswith('call_id='):
            call_id = custom_params.split('=', 1)[1]
        if call_id and str(call_id).isdigit():
            call = Call.objects.select_related('lead').filter(pk=call_id).first()
        if call is None and call_sid:
            call = Call.objects.select_related('lead').filter(twilio_sid=call_sid).first()
        if call is None:
            return None
        return {
            'id': call.id,
            'system_prompt': call.system_prompt or (
                COUNSELOR_SYSTEM_PROMPT
                if settings.AGENT_PROFILE == 'codingnowai'
                else NEVO_SYSTEM_PROMPT
            ),
            'lead_name': call.lead.name if call.lead else '',
        }

    @database_sync_to_async
    def _mark_in_progress(self, call_id):
        from .models import Call
        Call.objects.filter(pk=call_id).update(status='in_progress', started_at=timezone.now())

    @database_sync_to_async
    def _create_transcript(self, call_id, role, text):
        from .models import Transcript
        Transcript.objects.create(call_id=call_id, role=role, text=text)
