"""
FieldMedic — Guidance Agent

Generates calm, clear, step-by-step emergency instructions
from a triage result. Optionally generates TTS audio per step.
"""

import json
import logging
from typing import Optional

import google.generativeai as genai
from models.schemas import (
    TriageResult, GuidanceResponse,
    GuidanceStep, Severity,
)
from config import settings, AGENT_PROMPTS, OFFLINE_SCENARIOS

logger = logging.getLogger(__name__)

# Steps that always warrant an emergency call recommendation
ALWAYS_CALL_SEVERITIES = {Severity.CRITICAL, Severity.SERIOUS}


class GuidanceAgent:
    """
    Generates multilingual, step-by-step emergency guidance.
    Falls back to the offline decision tree if Gemini is unavailable.
    """

    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(
            model_name="gemini-2.5-flash-lite",
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
                max_output_tokens=1024,
            ),
        )

    async def generate(
        self,
        triage: TriageResult,
        language: str = "en",
    ) -> GuidanceResponse:
        """
        Generate guidance steps from a triage result.
        Returns structured steps ready for voice playback.
        """
        try:
            prompt = self._build_prompt(triage, language)
            response = await self.model.generate_content_async(prompt)

            raw = response.text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]

            parsed = json.loads(raw)

            steps = [
                GuidanceStep(
                    index=i,
                    instruction=step["instruction"],
                    is_critical=step.get("is_critical", False),
                )
                for i, step in enumerate(parsed.get("steps", []))
            ]

            call_emergency = (
                triage.severity in ALWAYS_CALL_SEVERITIES
                or parsed.get("call_emergency", False)
            )

            result = GuidanceResponse(
                steps=steps,
                call_emergency=call_emergency,
                emergency_note=parsed.get("emergency_note"),
                language=language,
                is_offline=False,
            )

            logger.info(
                f"[GuidanceAgent] Generated {len(steps)} steps "
                f"lang={language} call_emergency={call_emergency}"
            )
            return result

        except Exception as e:
            logger.warning(f"[GuidanceAgent] Falling back to offline tree: {e}")
            return self._offline_fallback(triage, language)

    def _build_prompt(self, triage: TriageResult, language: str) -> str:
        from agents.intake import SUPPORTED_LANGUAGES
        lang_name = SUPPORTED_LANGUAGES.get(language, "English")
        return f"""{AGENT_PROMPTS['GUIDANCE']}

CRITICAL: You MUST respond entirely in {lang_name} (language code: {language}).
Every instruction must be written in {lang_name} — not English unless {lang_name} is English.

Triage assessment:
- Observation: {triage.observation}
- Severity: {triage.severity}
- Injury type: {triage.injury_type}
- Immediate dangers: {', '.join(triage.immediate_dangers) or 'none identified'}
- First action already given: {triage.first_action}

Generate the NEXT steps as a JSON object:
{{
  "steps": [
    {{"instruction": "...", "is_critical": true/false}},
    ...
  ],
  "call_emergency": true/false,
  "emergency_note": "Call 911 immediately / Seek urgent care within 1 hour / etc."
}}

Generate 4-8 clear steps. Mark any step involving airway, bleeding control,
or CPR as is_critical: true."""

    def _offline_fallback(
        self,
        triage: TriageResult,
        language: str,
    ) -> GuidanceResponse:
        """
        Returns pre-loaded offline scenario steps.
        Maps triage category to closest offline scenario.
        """
        category = triage.injury_type or "bleeding"
        scenario_key = self._map_to_scenario(category)
        scenario = OFFLINE_SCENARIOS.get(scenario_key, OFFLINE_SCENARIOS["bleeding"])

        steps = [
            GuidanceStep(
                index=i,
                instruction=step,
                is_critical=(i == 0),  # Always mark first step critical
            )
            for i, step in enumerate(scenario["steps"])
        ]

        return GuidanceResponse(
            steps=steps,
            call_emergency=True,
            emergency_note="Call emergency services immediately.",
            language=language,
            is_offline=True,
        )

    def _map_to_scenario(self, injury_type: str) -> str:
        """Map free-text injury type to a known offline scenario key."""
        injury_lower = injury_type.lower()
        mapping = {
            "bleed": "bleeding", "lacerat": "bleeding", "cut": "bleeding",
            "burn": "burns", "scald": "burns",
            "chok": "choking", "airway": "choking",
            "fracture": "fracture", "bone": "fracture",
            "cardiac": "cardiac", "heart": "cardiac", "cpr": "cardiac",
            "shock": "shock",
        }
        for keyword, scenario in mapping.items():
            if keyword in injury_lower:
                return scenario
        return "bleeding"
