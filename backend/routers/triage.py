"""FieldMedic — Triage Router"""

import logging
from fastapi import APIRouter, HTTPException
from models.schemas import TriageRequest, TriageResult
from agents.orchestrator import orchestrator

logger = logging.getLogger(__name__)
router = APIRouter(tags=["triage"])


@router.post("/triage", response_model=TriageResult)
async def triage_endpoint(request: TriageRequest):
    """
    Analyze a wound image with optional context.
    Runs intake → triage agent pipeline.
    """
    try:
        result = await orchestrator.run_triage(request)
        return result
    except Exception as e:
        logger.error(f"[Triage] Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Triage analysis failed.")
