"""
FieldMedic — Triage Agent

Uses Gemini Vision to analyze wound/scene images.
Returns structured severity assessment and immediate action recommendation.
"""

import json
import base64
import logging

import google.generativeai as genai
from models.schemas import TriageResult, TriageContext, Severity
from config import settings, AGENT_PROMPTS

logger = logging.getLogger(__name__)


class TriageAgent:
    """
    Vision-powered triage assessment.
    Accepts a base64 image and structured context.
    Returns a TriageResult with severity, dangers, and first action.
    """

    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(
            model_name="gemini-2.5-flash-lite",
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=512,
            ),
        )

    async def analyze(self, image_base64: str, context: TriageContext) -> TriageResult:
        """
        Analyze image with context.
        Falls back to a safe default if vision analysis fails.
        """
        try:
            prompt = self._build_prompt(context)

            image_part = {
                "mime_type": "image/jpeg",
                "data": base64.b64decode(image_base64),
            }

            response = await self.model.generate_content_async([prompt, image_part])

            raw = response.text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]

            parsed = json.loads(raw)

            # Parse optional wound region
            wound_region = None
            if parsed.get("wound_region"):
                from models.schemas import WoundRegion
                try:
                    wound_region = WoundRegion(**parsed["wound_region"])
                except Exception:
                    pass

            result = TriageResult(
                observation=parsed["observation"],
                severity=Severity(parsed.get("severity", "unknown")),
                injury_type=parsed.get("injury_type", "unknown"),
                immediate_dangers=parsed.get("immediate_dangers", []),
                first_action=parsed["first_action"],
                language=context.language,
                wound_region=wound_region,
            )

            logger.info(
                f"[TriageAgent] severity={result.severity} "
                f"injury={result.injury_type} "
                f"dangers={result.immediate_dangers}"
            )
            return result

        except Exception as e:
            logger.error(f"[TriageAgent] Analysis failed: {e}")
            return self._safe_fallback(context)

    def _build_prompt(self, context: TriageContext) -> str:
        extra = ""
        if context.summary:
            extra = f"\nAdditional context from responder: {context.summary}"
        if context.category:
            extra += f"\nSuspected category: {context.category}"

        return f"""{AGENT_PROMPTS['TRIAGE']}{extra}

Also include a 'wound_region' field estimating where the wound is located in the image:
{{
  "wound_region": {{
    "x_pct": 0.5,
    "y_pct": 0.4,
    "radius_pct": 0.12,
    "description": "centre-left of image"
  }}
}}
Coordinates are 0.0-1.0 as fraction of image dimensions. radius_pct is approximate wound size."""

    def _safe_fallback(self, context: TriageContext) -> TriageResult:
        """
        When vision fails, return a conservative safe response.
        Never return nothing — that could cost a life.
        """
        return TriageResult(
            observation="Image analysis unavailable. Proceeding with standard guidance.",
            severity=Severity.SERIOUS,
            injury_type=context.category or "unknown",
            immediate_dangers=[],
            first_action="Ensure the scene is safe. Keep the person still and calm.",
            language=context.language,
            confidence=0.0,
        )
