"""Streaming text-to-speech via ElevenLabs.

Used when AI_VOICE_PROVIDER=elevenlabs: OpenAI Realtime produces text and
ElevenLabs speaks it. Audio is requested as G.711 u-law 8 kHz (ulaw_8000),
the telephone-line format, so chunks flow to Exotel without conversion.
"""
import logging

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

STREAM_URL = 'https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream'


class ElevenLabsTTS:
    def __init__(self):
        self._client = httpx.AsyncClient(timeout=30)

    async def stream(self, text: str):
        """Yield u-law 8 kHz audio chunks for the given text as they arrive."""
        url = STREAM_URL.format(voice_id=settings.ELEVENLABS_VOICE_ID)
        async with self._client.stream(
            'POST',
            url,
            params={
                'output_format': 'ulaw_8000',
                'optimize_streaming_latency': 3,
            },
            headers={'xi-api-key': settings.ELEVENLABS_API_KEY},
            json={
                'text': text,
                'model_id': settings.ELEVENLABS_MODEL,
            },
        ) as resp:
            if resp.status_code >= 400:
                body = await resp.aread()
                logger.error('ElevenLabs TTS %s: %s', resp.status_code, body[:300])
                return
            async for chunk in resp.aiter_bytes(3200):
                yield chunk

    async def close(self):
        await self._client.aclose()
