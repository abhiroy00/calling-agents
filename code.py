#!/usr/bin/env python3
"""
Sarvam AI — Hindi Text-to-Speech Only
Convert Hindi text to speech using your Sarvam API key.

Usage:
  python3 sarvam_tts_hindi.py                           # default text
  python3 sarvam_tts_hindi.py "आप कैसे हैं?"              # custom Hindi text
  python3 sarvam_tts_hindi.py "नमस्ते दुनिया" vidya      # change speaker

Requires: pip install requests

LIMITS:
  • Max 2,500 characters per request (REST API)
  • Free credits: ₹100 on signup (never expire)
  • Rate limit: depends on your plan (Starter/Pro/Business)
  • Sample rates: 8000 / 16000 / 22050 / 24000 Hz

SPEAKERS (Hindi compatible):
  anushka (female), abhilash (male), manisha (female),
  vidya (female), arya (male)
"""

import requests
import base64
import sys

SARVAM_API_KEY = "sk_bcqk6x24_1fvHA2Jld8zvq0onroU0vdRK"
URL = "https://api.sarvam.ai/text-to-speech"

def tts_hindi(text, speaker="anushka", filename="hindi_output.wav"):
    resp = requests.post(
        URL,
        headers={
            "Authorization": f"Bearer {SARVAM_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "inputs": [text],
            "target_language_code": "hi-IN",   # Hindi
            "speaker": speaker,
            "pitch": 0,
            "pace": 1.0,
            "loudness": 1.0,
            "enable_preprocessing": True,
            "sample_rate": 22050,
        },
        timeout=60,
    )
    if resp.status_code == 200:
        audio_b64 = resp.json()["audios"][0]
        audio_bytes = base64.b64decode(audio_b64)
        with open(filename, "wb") as f:
            f.write(audio_bytes)
        print(f"✓ Saved: {filename} ({len(audio_bytes):,} bytes)")
        print(f"  Text:   {text}")
        print(f"  Speaker: {speaker}")
    else:
        print(f"✗ Error {resp.status_code}: {resp.text[:200]}")

if __name__ == "__main__":
    # Default Hindi text if no argument given
    default_text = "नमस्ते! कोडिंगनाउ में आपका स्वागत है। यह एक परीक्षण है।"
    text = sys.argv[1] if len(sys.argv) > 1 else default_text
    speaker = sys.argv[2] if len(sys.argv) > 2 else "anushka"
    tts_hindi(text, speaker=speaker)
