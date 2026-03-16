"""FieldMedic — Case Router"""

import logging
from fastapi import APIRouter, HTTPException
from models.schemas import CaseRequest, CaseResponse
from services.firestore import save_case, get_case
from services.storage import upload_image

logger = logging.getLogger(__name__)
router = APIRouter(tags=["case"])


@router.post("/case", response_model=CaseResponse)
async def save_case_endpoint(request: CaseRequest):
    try:
        session = request.session
        logger.info(f"[Case] Saving case {session.id} severity={session.severity}")

        # Upload images to Cloud Storage
        for i, img in enumerate(session.images):
            if img.base64 and not img.storage_url:
                url = await upload_image(session.id, img.base64, i)
                if url:
                    img.base64 = None
                    img.storage_url = url

        result = await save_case(session)
        logger.info(f"[Case] Save result: {result}")
        return result

    except Exception as e:
        logger.error(f"[Case] Save failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Case save failed: {str(e)}")


@router.get("/case/{case_id}")
async def get_case_endpoint(case_id: str):
    """Retrieve a case by ID."""
    logger.info(f"[Case] Fetching case {case_id}")
    try:
        case = await get_case(case_id)
        if not case:
            logger.warning(f"[Case] Not found: {case_id}")
            raise HTTPException(status_code=404, detail="Case not found.")
        logger.info(f"[Case] Found: {case_id}")
        return case
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Case] Fetch failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
