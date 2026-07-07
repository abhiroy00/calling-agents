"""WebSocket consumer for Exotel's Voicebot applet.

Exotel opens a socket here when an outbound call's flow reaches the Voicebot
applet, then streams the caller's audio as base64 PCM16LE 8 kHz inside JSON
events. We bridge that audio to an OpenAI Realtime session and stream the AI's
speech back on the same socket.
"""
import base64
import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone

from .ai_bridge import RealtimeBridge
from .audio import pcm_to_ulaw, ulaw_to_pcm

logger = logging.getLogger(__name__)

# Exotel requires outgoing media payloads in multiples of 320 bytes (20 ms).
OUT_FRAME = 320
OUT_CHUNK = 3200  # 200 ms — Exotel's minimum recommended chunk


class ExotelMediaConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.call_id = None
        self.stream_sid = None
        self.bridge = None
        self._out_buf = bytearray()
        await self.accept()

    async def disconnect(self, code):
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

        name = call['lead_name'] or 'there'
        self.bridge = RealtimeBridge(
            system_prompt=call['system_prompt'],
            on_audio=self._play_to_caller,
            on_audio_done=self._flush_playback,
            on_transcript=self._save_transcript,
            on_interrupt=self._barge_in,
        )
        await self.bridge.connect(
            greeting_hint=(
                f'Greet the caller now, in English. Their name is {name}. '
                'Keep it to one short sentence.'
            )
        )

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

    async def _barge_in(self):
        self._out_buf.clear()
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

    # --- helpers ----------------------------------------------------------

    async def _send_media(self, pcm: bytes):
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
                'You are a helpful AI assistant on a phone call. '
                'Be concise and friendly. Keep responses under 2 sentences.'
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
