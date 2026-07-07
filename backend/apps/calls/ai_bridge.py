"""Per-call bridge to the OpenAI Realtime API (speech-to-speech).

One RealtimeBridge is created per phone call by the Exotel media consumer.
Audio in both directions is G.711 u-law at 8 kHz, matching the telephone line,
so nothing is resampled between Exotel and OpenAI.
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
    """Owns the OpenAI Realtime WebSocket for a single call.

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

    async def connect(self, greeting_hint: str):
        url = REALTIME_URL.format(model=settings.OPENAI_REALTIME_MODEL)
        self.ws = await websockets.connect(
            url,
            additional_headers={'Authorization': f'Bearer {settings.OPENAI_API_KEY}'},
            max_size=16 * 1024 * 1024,
        )
        await self._send({
            'type': 'session.update',
            'session': {
                'type': 'realtime',
                'output_modalities': ['audio'],
                'instructions': self.system_prompt + LANGUAGE_POLICY,
                'audio': {
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
                    'output': {
                        'format': {'type': 'audio/pcmu'},
                        'voice': settings.OPENAI_REALTIME_VOICE,
                    },
                },
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
        if self.ws is not None:
            await self.ws.close()
            self.ws = None

    async def _send(self, event: dict):
        await self.ws.send(json.dumps(event))

    async def _recv_loop(self):
        try:
            async for raw in self.ws:
                event = json.loads(raw)
                etype = event.get('type', '')

                if etype in ('response.output_audio.delta', 'response.audio.delta'):
                    await self.on_audio(base64.b64decode(event['delta']))
                elif etype in ('response.output_audio.done', 'response.audio.done'):
                    await self.on_audio_done()
                elif etype == 'input_audio_buffer.speech_started':
                    await self.on_interrupt()
                elif etype == 'conversation.item.input_audio_transcription.completed':
                    text = (event.get('transcript') or '').strip()
                    if text:
                        await self.on_transcript('human', text)
                elif etype in ('response.output_audio_transcript.done', 'response.audio_transcript.done'):
                    text = (event.get('transcript') or '').strip()
                    if text:
                        await self.on_transcript('ai', text)
                elif etype == 'error':
                    logger.error('OpenAI Realtime error: %s', event.get('error'))
        except asyncio.CancelledError:
            pass
        except websockets.ConnectionClosed:
            logger.info('OpenAI Realtime connection closed')
        except Exception:
            logger.exception('OpenAI Realtime receive loop crashed')
