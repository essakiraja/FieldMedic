"""
FieldMedic — Chat Router

Handles real-time two-way messages between bystander and remote doctor.
Messages are stored in Firestore under cases/{case_id}/messages.
The frontend uses Firestore's onSnapshot listener for real-time updates.
"""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.firestore import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])


class ChatMessage(BaseModel):
    case_id:   str
    role:      str          # 'doctor' | 'bystander'
    text:      str
    spoken:    bool = False  # whether TTS was triggered
    sender_id: Optional[str] = None


@router.post("/chat/message")
async def send_message(msg: ChatMessage):
    """
    Save a chat message to Firestore.
    Frontend listeners pick it up in real time via onSnapshot.
    """
    db = get_db()
    if not db:
        logger.warning("[Chat] No Firestore — message dropped")
        return {"status": "dropped", "reason": "no_db"}

    try:
        doc = {
            "role":      msg.role,
            "text":      msg.text,
            "spoken":    msg.spoken,
            "sender_id": msg.sender_id,
            "ts":        datetime.now(timezone.utc).isoformat(),
        }

        await db.collection("cases") \
                .document(msg.case_id) \
                .collection("messages") \
                .add(doc)

        logger.info(f"[Chat] Message saved case={msg.case_id} role={msg.role}")
        return {"status": "sent"}

    except Exception as e:
        logger.error(f"[Chat] Save failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chat/{case_id}/messages")
async def get_messages(case_id: str, limit: int = 50):
    """
    Fetch recent messages for a case.
    Used on initial load — after that, onSnapshot handles updates.
    """
    db = get_db()
    if not db:
        return {"messages": []}

    try:
        docs = await db.collection("cases") \
                       .document(case_id) \
                       .collection("messages") \
                       .order_by("ts") \
                       .limit(limit) \
                       .get()

        messages = [{"id": doc.id, **doc.to_dict()} for doc in docs]
        return {"messages": messages}

    except Exception as e:
        logger.warning(f"[Chat] Fetch failed: {e}")
        return {"messages": []}
