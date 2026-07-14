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

# gpt-realtime generates speech directly, so without an explicit anchor the
# voice character can drift (e.g. female → male) mid-call on noisy phone audio.
VOICE_POLICY = (
    ' VOICE RULES: You have ONE fixed voice. Speak with exactly the same '
    'voice, gender, tone, and accent from the first word of the call to the '
    'last. NEVER change your voice character or imitate the caller or any '
    'background speaker.'
)

# Without this the model happily keeps pitching after the caller has already
# said goodbye. end_call is a session tool handled below in _recv_loop.
CALL_END_POLICY = (
    ' CALL ENDING RULES: When the caller indicates the conversation is over — '
    'for example "thank you", "thanks", "bye", "goodbye", "theek hai bye", '
    '"not interested", "do not call again", or "I have to go" — reply with ONE '
    'short polite goodbye sentence and then call the end_call function. '
    'Do NOT continue the pitch, ask another question, or start a new topic '
    'after the caller has said goodbye.'
)

END_CALL_TOOL = {
    'type': 'function',
    'name': 'end_call',
    'description': (
        'Hang up the phone call. Use this immediately after saying a short '
        'goodbye, once the caller has indicated the conversation is over '
        '(said thank you / bye / not interested) or the purpose of the call '
        'is complete.'
    ),
    'parameters': {'type': 'object', 'properties': {}, 'required': []},
}


class RealtimeBridge:
    """Owns the OpenAI Realtime WebSocket (and optional TTS) for one call.

    Callbacks (all async):
      on_audio(ulaw_bytes)   — AI speech to play to the caller
      on_audio_done()        — AI finished a response (flush playback buffer)
      on_transcript(role, text) — completed transcript ('human' or 'ai')
      on_interrupt()         — caller started speaking; stop playback (barge-in)
      on_hangup()            — the agent decided the call is over (end_call tool)
    """

    def __init__(self, system_prompt, on_audio, on_audio_done, on_transcript, on_interrupt,
                 on_hangup=None):
        self.system_prompt = system_prompt
        self.on_audio = on_audio
        self.on_audio_done = on_audio_done
        self.on_transcript = on_transcript
        self.on_interrupt = on_interrupt
        self.on_hangup = on_hangup
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
                # Filters background noise/voices before VAD sees the audio.
                # near_field = close-talking mic, which a phone handset is.
                'noise_reduction': {'type': 'near_field'},
                'turn_detection': {
                    'type': 'server_vad',
                    # Default threshold (0.5) lets distant background voices
                    # trigger barge-in, which pauses the agent mid-sentence.
                    # Higher = only the caller's own (louder) voice counts.
                    'threshold': 0.85,
                    'prefix_padding_ms': 300,
                    # Wait a bit longer before treating silence as end-of-turn,
                    # so brief background chatter doesn't split the caller's turn.
                    'silence_duration_ms': 700,
                },
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
                'instructions': self.system_prompt + LANGUAGE_POLICY + VOICE_POLICY + CALL_END_POLICY,
                'audio': audio_config,
                'tools': [END_CALL_TOOL],
                'tool_choice': 'auto',
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

    @staticmethod
    def _response_called_end_call(event: dict) -> bool:
        """True if a completed response includes a call to the end_call tool."""
        output = (event.get('response') or {}).get('output') or []
        return any(
            item.get('type') == 'function_call' and item.get('name') == 'end_call'
            for item in output
        )

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
                elif etype == 'response.done':
                    if self._response_called_end_call(event) and self.on_hangup:
                        # In ElevenLabs mode the goodbye is still streaming out
                        # via TTS; let it finish before hanging up.
                        if self._tts_task and not self._tts_task.done():
                            try:
                                await self._tts_task
                            except asyncio.CancelledError:
                                pass
                        logger.info('Agent requested hangup via end_call')
                        await self.on_hangup()
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
