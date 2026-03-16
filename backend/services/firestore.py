"""
FieldMedic — Firestore Service

On Cloud Run: credentials are automatic via the service account metadata server.
Locally: requires GOOGLE_APPLICATION_CREDENTIALS or gcloud auth application-default login.
"""

import logging
import os
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

_db = None


def get_db():
    """Return the Firestore client — used by chat router."""
    return _db


async def init_firestore():
    """Initialize Firestore client."""
    global _db
    try:
        from google.cloud import firestore
        from config import settings

        _db = firestore.AsyncClient(
            project=settings.GCP_PROJECT_ID,
            database=settings.FIRESTORE_DB,
        )
        logger.info(f"[Firestore] Connected to project={settings.GCP_PROJECT_ID}")
    except Exception as e:
        logger.warning(f"[Firestore] Init failed — running without persistence: {e}")
        _db = None


def get_db():
    """Return the Firestore client — used by chat router."""
    return _db


async def save_case(session) -> dict:
    if not _db:
        logger.warning("[Firestore] _db is None — case not persisted")
        return {
            "case_id": session.id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "local"
        }
    try:
        from google.cloud import firestore
        doc_ref = _db.collection("cases").document(session.id)
        data = {
            **session.model_dump(exclude={"images"}),
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
        await doc_ref.set(data, merge=True)
        logger.info(f"[Firestore] Case saved: {session.id}")
        return {
            "case_id": session.id,
            "created_at": session.started_at,
            "status": "active"
        }
    except Exception as e:
        logger.error(f"[Firestore] Save failed: {e}", exc_info=True)
        return {
            "case_id": session.id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "local"
        }


async def get_case(case_id: str) -> Optional[dict]:
    if not _db:
        return None
    try:
        doc = await _db.collection("cases").document(case_id).get()
        return doc.to_dict() if doc.exists else None
    except Exception as e:
        logger.error(f"[Firestore] Get failed: {e}", exc_info=True)
        return None


async def list_active_cases() -> list:
    if not _db:
        return []
    try:
        docs = await _db.collection("cases").limit(50).get()
        cases = [doc.to_dict() for doc in docs if doc.to_dict()]
        cases.sort(key=lambda c: c.get("started_at", ""), reverse=True)
        return cases
    except Exception as e:
        logger.warning(f"[Firestore] List failed: {e}")
        return []
