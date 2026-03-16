"""FieldMedic — Guidance Router"""

import logging
from fastapi import APIRouter, HTTPException
from models.schemas import GuidanceRequest, GuidanceResponse, GuidanceStep
from agents.orchestrator import orchestrator
from services.tts import synthesize_steps

logger = logging.getLogger(__name__)
router = APIRouter(tags=["guidance"])


@router.post("/guidance", response_model=GuidanceResponse)
async def guidance_endpoint(request: GuidanceRequest):
    """
    Generate step-by-step guidance from a triage result.
    Attaches TTS audio to each step when available.
    """
    try:
        response = await orchestrator.run_guidance(request)

        # Attach TTS audio to each step (best-effort — won't fail if TTS is down)
        step_texts = [s.instruction for s in response.steps]
        audio_list = await synthesize_steps(step_texts, request.language)

        enriched_steps = []
        for step, audio_b64 in zip(response.steps, audio_list):
            enriched_steps.append(
                GuidanceStep(
                    index=step.index,
                    instruction=step.instruction,
                    is_critical=step.is_critical,
                    # Embed audio as data URL for immediate playback
                    audio_url=f"data:audio/mp3;base64,{audio_b64}" if audio_b64 else None,
                )
            )

        response.steps = enriched_steps
        return response

    except Exception as e:
        logger.error(f"[Guidance] Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Guidance generation failed.")
