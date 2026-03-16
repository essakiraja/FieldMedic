"""
FieldMedic — Agent Orchestrator (Google ADK)

Coordinates the three specialized agents:
  1. IntakeAgent    — language, emotion, urgency detection
  2. TriageAgent    — wound/scene analysis via Gemini Vision
  3. GuidanceAgent  — step-by-step voice instructions

Each agent is independently testable and swappable.
The orchestrator manages the flow and handles fallbacks.
"""

import asyncio
import logging
from typing import Optional

from agents.intake  import IntakeAgent
from agents.triage  import TriageAgent
from agents.guidance import GuidanceAgent
from models.schemas  import (
    TriageRequest, TriageResult,
    GuidanceRequest, GuidanceResponse,
    TriageContext,
)

logger = logging.getLogger(__name__)


class FieldMedicOrchestrator:
    """
    Top-level orchestrator.
    Instantiate once and reuse — agents hold no mutable state between calls.
    """

    def __init__(self):
        self.intake   = IntakeAgent()
        self.triage   = TriageAgent()
        self.guidance = GuidanceAgent()
        logger.info("[Orchestrator] Initialized — all agents ready")

    # ─── Full Triage Pipeline ─────────────────────────────────────────────────

    async def run_triage(self, request: TriageRequest) -> TriageResult:
        """
        Step 1: Intake agent enriches context (language, urgency, category).
        Step 2: Triage agent analyzes the image with enriched context.
        Steps run sequentially — triage depends on intake output.
        """
        logger.info("[Orchestrator] Starting triage pipeline")

        # Step 1: Enrich context via intake agent
        if request.context.summary:
            enriched_context = await self.intake.analyze(request.context.summary)
        else:
            enriched_context = request.context

        # Step 2: Vision triage with enriched context
        result = await self.triage.analyze(request.image, enriched_context)

        logger.info(f"[Orchestrator] Triage complete — severity={result.severity}")
        return result

    # ─── Guidance Pipeline ────────────────────────────────────────────────────

    async def run_guidance(self, request: GuidanceRequest) -> GuidanceResponse:
        """
        Generates step-by-step guidance based on triage result.
        Optionally pre-generates TTS audio for each step.
        """
        logger.info(f"[Orchestrator] Generating guidance — lang={request.language}")
        response = await self.guidance.generate(request.triage, request.language)
        return response

    # ─── Combined Pipeline (triage + guidance in one call) ────────────────────

    async def run_full_pipeline(
        self,
        image_base64: str,
        user_description: Optional[str] = None,
        language: str = "en",
    ) -> dict:
        """
        Convenience method: runs triage then immediately generates guidance.
        Returns both results together.
        """
        triage_request = TriageRequest(
            image=image_base64,
            context=TriageContext(
                language=language,
                summary=user_description,
            ),
        )

        # Run triage
        triage_result = await self.run_triage(triage_request)

        # Run guidance in parallel with any other async work
        guidance_request = GuidanceRequest(triage=triage_result, language=language)
        guidance_response = await self.run_guidance(guidance_request)

        return {
            "triage":   triage_result.model_dump(),
            "guidance": guidance_response.model_dump(),
        }


# ─── Singleton ────────────────────────────────────────────────────────────────
# Shared across all requests — no state, safe for concurrent use

orchestrator = FieldMedicOrchestrator()
