"""
FieldMedic — Data Models
All Pydantic schemas for request validation and response shaping.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


# ─── Enums ────────────────────────────────────────────────────────────────────

class Severity(str, Enum):
    CRITICAL = "critical"
    SERIOUS  = "serious"
    MODERATE = "moderate"
    MINOR    = "minor"
    UNKNOWN  = "unknown"


# ─── Triage ───────────────────────────────────────────────────────────────────

class TriageContext(BaseModel):
    language:  str = "en"
    urgency:   str = "unknown"
    summary:   Optional[str] = None
    category:  Optional[str] = None


class TriageRequest(BaseModel):
    image:   str = Field(default="", description="Base64-encoded JPEG image")
    context: TriageContext = Field(default_factory=TriageContext)


class WoundRegion(BaseModel):
    x_pct:       float = 0.5   # 0.0-1.0 fraction of image width
    y_pct:       float = 0.5   # 0.0-1.0 fraction of image height
    radius_pct:  float = 0.15  # approximate wound size
    description: str = ""


class TriageResult(BaseModel):
    observation:        str
    severity:           Severity
    injury_type:        str
    immediate_dangers:  List[str] = []
    first_action:       str
    confidence:         float = Field(ge=0.0, le=1.0, default=0.85)
    language:           str = "en"
    wound_region:       Optional[WoundRegion] = None


# ─── Guidance ─────────────────────────────────────────────────────────────────

class GuidanceRequest(BaseModel):
    triage:   TriageResult
    language: str = "en"
    step:     int = Field(default=0)


class GuidanceStep(BaseModel):
    index:       int
    instruction: str
    is_critical: bool = False
    audio_url:   Optional[str] = None


class GuidanceResponse(BaseModel):
    steps:          List[GuidanceStep]
    call_emergency: bool
    emergency_note: Optional[str] = None
    language:       str = "en"
    is_offline:     bool = False


# ─── Case ─────────────────────────────────────────────────────────────────────

class ImageData(BaseModel):
    base64:      Optional[str] = None
    captured_at: str = ""
    storage_url: Optional[str] = None


class TranscriptEntry(BaseModel):
    role: str
    text: str
    ts:   int = 0


class SessionData(BaseModel):
    id:                str
    started_at:        str
    status:            str = "active"   # ← added — required for dashboard
    location:          Optional[dict] = None
    severity:          Severity = Severity.UNKNOWN
    category:          Optional[str] = None
    images:            List[ImageData] = []
    transcripts:       List[TranscriptEntry] = []
    guidance_steps:    List[GuidanceStep] = []
    responder_alerted: bool = False


class CaseRequest(BaseModel):
    session: SessionData


class CaseResponse(BaseModel):
    case_id:    str
    created_at: str
    status:     str = "active"


# ─── Responder ────────────────────────────────────────────────────────────────

class ResponderAlertRequest(BaseModel):
    case_id: str


class ResponderAlertResponse(BaseModel):
    alerted:    bool
    case_url:   Optional[str] = None
    message:    str
