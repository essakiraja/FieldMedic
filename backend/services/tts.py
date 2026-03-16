"""
FieldMedic — Text-to-Speech Service

Converts guidance step text to audio using Google Cloud TTS.
Gracefully skips if credentials are not configured —
frontend falls back to browser speechSynthesis automatically.
"""

import base64
import hashlib
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# In-memory cache — avoid re-generating identical text
_cache: dict[str, str] = {}

VOICE_MAP = {
    "en": ("en-US", "en-US-Neural2-C"),
    "sw": ("sw-KE", "sw-KE-Standard-A"),
    "de": ("de-DE", "de-DE-Neural2-C"),
    "fr": ("fr-FR", "fr-FR-Neural2-C"),
    "ar": ("ar-XA", "ar-XA-Neural2-C"),
    "hi": ("hi-IN", "hi-IN-Neural2-C"),
    "es": ("es-ES", "es-ES-Neural2-C"),
    "pt": ("pt-BR", "pt-BR-Neural2-C"),
}

DEFAULT_VOICE = ("en-US", "en-US-Neural2-C")


def _has_credentials() -> bool:
    """Check if GCP credentials are available without making a network call."""
    return bool(
        os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        or os.getenv("GOOGLE_CLOUD_PROJECT")
    )


async def synthesize(text: str, language: str = "en") -> Optional[str]:
    """
    Convert text to base64-encoded MP3.
    Returns None if credentials not configured — frontend uses browser TTS fallback.
    """
    if not _has_credentials():
        # Silently skip — no error log spam, frontend handles it
        return None

    cache_key = hashlib.md5(f"{language}:{text}".encode()).hexdigest()
    if cache_key in _cache:
        return _cache[cache_key]

    try:
        from google.cloud import texttospeech

        client = texttospeech.TextToSpeechAsyncClient()
        lang_code, voice_name = VOICE_MAP.get(language, DEFAULT_VOICE)

        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code=lang_code,
            name=voice_name,
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=0.92,
            pitch=-1.0,
        )

        response = await client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )

        encoded = base64.b64encode(response.audio_content).decode("utf-8")
        _cache[cache_key] = encoded
        logger.debug(f"[TTS] Synthesized {len(text)} chars in {language}")
        return encoded

    except Exception as e:
        logger.debug(f"[TTS] Unavailable — using browser fallback: {e}")
        return None


async def synthesize_steps(steps: list[str], language: str = "en") -> list[Optional[str]]:
    """Synthesize all guidance steps. Returns None for each if TTS unavailable."""
    import asyncio
    tasks = [synthesize(step, language) for step in steps]
    return await asyncio.gather(*tasks)
