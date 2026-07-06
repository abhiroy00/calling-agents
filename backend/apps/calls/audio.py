"""Audio conversion between Exotel and OpenAI Realtime.

Exotel's Voicebot applet streams raw 16-bit signed little-endian PCM at 8 kHz.
OpenAI Realtime supports G.711 u-law at 8 kHz (audio/pcmu), so the only
conversion needed is PCM16 <-> u-law — no resampling.

audioop is stdlib through Python 3.12; on 3.13+ install `audioop-lts`.
"""
import audioop


def pcm_to_ulaw(pcm: bytes) -> bytes:
    return audioop.lin2ulaw(pcm, 2)


def ulaw_to_pcm(ulaw: bytes) -> bytes:
    return audioop.ulaw2lin(ulaw, 2)
