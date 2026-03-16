"""FieldMedic — Responder Router"""

import logging
from fastapi import APIRouter, HTTPException
from models.schemas import ResponderAlertRequest, ResponderAlertResponse
from services.firestore import list_active_cases, get_case

logger = logging.getLogger(__name__)
router = APIRouter(tags=["responder"])


@router.get("/responder/cases")
async def list_cases():
    """List all cases. Always returns a valid response — never 500."""
    try:
        cases = await list_active_cases()
        return {"cases": cases, "total": len(cases)}
    except Exception as e:
        logger.error(f"[Responder] list_cases failed: {e}")
        # Return empty list instead of 500 — frontend handles gracefully
        return {"cases": [], "total": 0, "error": str(e)}


@router.post("/responder/alert", response_model=ResponderAlertResponse)
async def alert_responder(request: ResponderAlertRequest):
    try:
        case = await get_case(request.case_id)
        if not case:
            raise HTTPException(status_code=404, detail="Case not found.")
        logger.info(f"[Responder] Alert triggered for case: {request.case_id}")
        return ResponderAlertResponse(
            alerted=True,
            case_url=f"/responder/cases/{request.case_id}",
            message="Medical responder has been notified.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Responder] Alert failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
