"""Per-call bridge to the OpenAI Realtime API.

One RealtimeBridge is created per phone call by the Exotel media consumer.
Caller audio always goes to OpenAI Realtime (G.711 u-law 8 kHz — the phone
line's own format), which also handles turn-taking (VAD) and thinking.

The agent's voice depends on AI_VOICE_PROVIDER:
  - 'openai'      — Realtime speaks directly (speech-to-speech, lowest latency)
  - 'elevenlabs'  — Realtime produces text only; ElevenLabs streams the speech
                    (better Hindi/Hinglish voices), also as u-law 8 kHz
"""
import asyncio
import base64
import json
import logging

import websockets
from django.conf import settings

logger = logging.getLogger(__name__)

REALTIME_URL = 'wss://api.openai.com/v1/realtime?model={model}'

# Appended to every call's system prompt. Phone audio is 8 kHz and noisy, so
# without an explicit language policy the model guesses (and then sticks with)
# whatever language the first unclear utterance resembled.
LANGUAGE_POLICY = (
    ' LANGUAGE RULES: The caller speaks English and Hindi, often mixed (Hinglish). '
    'Reply ONLY in English or Hindi, mirroring whichever language the caller used last. '
    'NEVER use any other language, no matter what you think you heard. '
    'If you could not understand the caller, ask them to repeat, in English.'
)


class RealtimeBridge:
    """Owns the OpenAI Realtime WebSocket (and optional TTS) for one call.

    Callbacks (all async):
      on_audio(ulaw_bytes)   — AI speech to play to the caller
      on_audio_done()        — AI finished a response (flush playback buffer)
      on_transcript(role, text) — completed transcript ('human' or 'ai')
      on_interrupt()         — caller started speaking; stop playback (barge-in)
    """

    def __init__(self, system_prompt, on_audio, on_audio_done, on_transcript, on_interrupt):
        self.system_prompt = system_prompt
        self.on_audio = on_audio
        self.on_audio_done = on_audio_done
        self.on_transcript = on_transcript
        self.on_interrupt = on_interrupt
        self.ws = None
        self._recv_task = None
        self._text_buf = ''
        self._tts = None
        self._tts_task = None
        if settings.AI_VOICE_PROVIDER == 'elevenlabs' and settings.ELEVENLABS_API_KEY:
            from .tts import ElevenLabsTTS
            self._tts = ElevenLabsTTS()

    async def connect(self, greeting_hint: str):
        url = REALTIME_URL.format(model=settings.OPENAI_REALTIME_MODEL)
        self.ws = await websockets.connect(
            url,
            additional_headers={'Authorization': f'Bearer {settings.OPENAI_API_KEY}'},
            max_size=16 * 1024 * 1024,
        )

        audio_config = {
            'input': {
                'format': {'type': 'audio/pcmu'},
                'turn_detection': {'type': 'server_vad'},
                'transcription': {
                    'model': 'gpt-4o-mini-transcribe',
                    # Steers language autodetection on noisy phone audio
                    'prompt': 'Phone call in English and Hindi (Hinglish). '
                              'Transcribe Hindi in Devanagari script.',
                },
            },
        }
        if self._tts is None:
            audio_config['output'] = {
                'format': {'type': 'audio/pcmu'},
                'voice': settings.OPENAI_REALTIME_VOICE,
            }

        await self._send({
            'type': 'session.update',
            'session': {
                'type': 'realtime',
                'output_modalities': ['text'] if self._tts else ['audio'],
                'instructions': self.system_prompt + LANGUAGE_POLICY,
                'audio': audio_config,
            },
        })
        # Have the AI speak first.
        await self._send({
            'type': 'response.create',
            'response': {'instructions': greeting_hint},
        })
        self._recv_task = asyncio.create_task(self._recv_loop())

    async def send_caller_audio(self, ulaw: bytes):
        if self.ws is not None:
            await self._send({
                'type': 'input_audio_buffer.append',
                'audio': base64.b64encode(ulaw).decode('ascii'),
            })

    async def close(self):
        if self._recv_task:
            self._recv_task.cancel()
        await self._cancel_tts()
        if self._tts is not None:
            await self._tts.close()
        if self.ws is not None:
            await self.ws.close()
            self.ws = None

    async def _send(self, event: dict):
        await self.ws.send(json.dumps(event))

    async def _cancel_tts(self):
        if self._tts_task and not self._tts_task.done():
            self._tts_task.cancel()
            try:
                await self._tts_task
            except asyncio.CancelledError:
                pass
        self._tts_task = None

    async def _speak(self, text: str):
        """Stream one reply through ElevenLabs to the caller."""
        try:
            async for chunk in self._tts.stream(text):
                await self.on_audio(chunk)
            await self.on_audio_done()
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception('ElevenLabs TTS streaming failed')

    async def _recv_loop(self):
        try:
            async for raw in self.ws:
                event = json.loads(raw)
                etype = event.get('type', '')

                # --- voice mode (AI_VOICE_PROVIDER=openai) ---
                if etype in ('response.output_audio.delta', 'response.audio.delta'):
                    await self.on_audio(base64.b64decode(event['delta']))
                elif etype in ('response.output_audio.done', 'response.audio.done'):
                    await self.on_audio_done()
                elif etype in ('response.output_audio_transcript.done', 'response.audio_transcript.done'):
                    text = (event.get('transcript') or '').strip()
                    if text:
                        await self.on_transcript('ai', text)

                # --- text mode (AI_VOICE_PROVIDER=elevenlabs) ---
                elif etype in ('response.output_text.delta', 'response.text.delta'):
                    self._text_buf += event.get('delta', '')
                elif etype in ('response.output_text.done', 'response.text.done'):
                    text = (event.get('text') or self._text_buf).strip()
                    self._text_buf = ''
                    if text:
                        await self.on_transcript('ai', text)
                        await self._cancel_tts()
                        self._tts_task = asyncio.create_task(self._speak(text))

                # --- both modes ---
                elif etype == 'input_audio_buffer.speech_started':
                    await self._cancel_tts()
                    await self.on_interrupt()
                elif etype == 'conversation.item.input_audio_transcription.completed':
                    text = (event.get('transcript') or '').strip()
                    if text:
                        await self.on_transcript('human', text)
                elif etype == 'error':
                    logger.error('OpenAI Realtime error: %s', event.get('error'))
        except asyncio.CancelledError:
            pass
        except websockets.ConnectionClosed:
            logger.info('OpenAI Realtime connection closed')
        except Exception:
            logger.exception('OpenAI Realtime receive loop crashed')
