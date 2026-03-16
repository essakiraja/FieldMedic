"""
FieldMedic — Intake Agent

Analyzes the user's text description to extract:
- Language (BCP-47 code)
- Emotional state
- Urgency level
- Medical category

Also used by the frontend to auto-set voice language
so TTS responds in the same language the user spoke.
"""

import json
import logging

import google.generativeai as genai
from models.schemas import TriageContext
from config import settings, AGENT_PROMPTS

logger = logging.getLogger(__name__)

# Supported languages for TTS and Gemini voice responses
SUPPORTED_LANGUAGES = {
    "en": "English", "sw": "Swahili", "de": "German",
    "fr": "French",  "ar": "Arabic",  "hi": "Hindi",
    "es": "Spanish", "pt": "Portuguese", "zh": "Chinese",
    "ja": "Japanese","ko": "Korean",  "ru": "Russian",
    "tr": "Turkish", "nl": "Dutch",   "pl": "Polish",
    "it": "Italian", "ta": "Tamil",   "te": "Telugu",
    "bn": "Bengali", "ur": "Urdu",
}


class IntakeAgent:
    """
    First agent in the pipeline.
    Transforms raw user text into a structured TriageContext.
    Detects language so the entire response chain stays in that language.
    """

    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(
            model_name="gemini-2.5-flash-lite",
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=256,
            ),
        )

    async def analyze(self, user_text: str) -> TriageContext:
        """
        Analyze user text and return enriched TriageContext with language detected.
        Falls back to safe defaults if parsing fails — never blocks the pipeline.
        """
        try:
            response = await self.model.generate_content_async(
                f"{AGENT_PROMPTS['INTAKE']}\n\nUser message: {user_text}"
            )

            raw = response.text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]

            parsed = json.loads(raw.strip())

            # Validate language code — fall back to 'en' if unrecognized
            detected_lang = parsed.get("language", "en")
            if detected_lang not in SUPPORTED_LANGUAGES:
                detected_lang = "en"

            context = TriageContext(
                language=detected_lang,
                urgency=parsed.get("urgency", "unknown"),
                summary=parsed.get("summary", user_text),
                category=parsed.get("category"),
            )

            logger.info(
                f"[IntakeAgent] lang={context.language} "
                f"urgency={context.urgency} category={context.category}"
            )
            return context

        except Exception as e:
            logger.warning(f"[IntakeAgent] Falling back to defaults: {e}")
            return TriageContext(
                language="en",
                urgency="unknown",
                summary=user_text,
                category=None,
            )
