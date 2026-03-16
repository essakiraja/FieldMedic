"""
FieldMedic — Cloud Storage Service

Uploads wound images and TTS audio to Google Cloud Storage.
Returns public URLs for use in case records and responder dashboard.
"""

import base64
import logging
from datetime import datetime, timezone
from typing import Optional

from google.cloud import storage
from config import settings

logger = logging.getLogger(__name__)

_client: Optional[storage.Client] = None


def get_client() -> Optional[storage.Client]:
    global _client
    if not _client:
        try:
            _client = storage.Client(project=settings.GCP_PROJECT_ID)
        except Exception as e:
            logger.warning(f"[Storage] Client init failed: {e}")
    return _client


async def upload_image(
    case_id: str,
    image_base64: str,
    index: int = 0,
) -> Optional[str]:
    """
    Upload a base64-encoded image to Cloud Storage.
    Returns the public URL or None on failure.
    """
    client = get_client()
    if not client:
        return None

    try:
        bucket = client.bucket(settings.STORAGE_BUCKET)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        blob_name = f"cases/{case_id}/images/{timestamp}_{index}.jpg"

        blob = bucket.blob(blob_name)
        image_bytes = base64.b64decode(image_base64)

        blob.upload_from_string(image_bytes, content_type="image/jpeg")
        blob.make_public()

        url = blob.public_url
        logger.info(f"[Storage] Image uploaded: {url}")
        return url

    except Exception as e:
        logger.warning(f"[Storage] Image upload failed: {e}")
        return None


async def upload_audio(
    case_id: str,
    audio_base64: str,
    step_index: int,
) -> Optional[str]:
    """Upload TTS audio for a guidance step."""
    client = get_client()
    if not client:
        return None

    try:
        bucket = client.bucket(settings.STORAGE_BUCKET)
        blob_name = f"cases/{case_id}/audio/step_{step_index}.mp3"

        blob = bucket.blob(blob_name)
        audio_bytes = base64.b64decode(audio_base64)

        blob.upload_from_string(audio_bytes, content_type="audio/mpeg")
        blob.make_public()

        return blob.public_url

    except Exception as e:
        logger.warning(f"[Storage] Audio upload failed: {e}")
        return None
