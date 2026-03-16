"""
FieldMedic — Backend Configuration

All settings loaded from environment variables.
Agent prompts mirrored here so backend agents are self-contained.
"""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GEMINI_API_KEY:   str = os.getenv("GEMINI_API_KEY", "")
    GCP_PROJECT_ID:   str = os.getenv("GCP_PROJECT_ID", "fieldmedic")
    GCP_REGION:       str = os.getenv("GCP_REGION", "us-central1")
    FIRESTORE_DB:     str = os.getenv("FIRESTORE_DB", "(default)")
    STORAGE_BUCKET:   str = os.getenv("STORAGE_BUCKET", "fieldmedic-assets")
    TTS_LANGUAGE:     str = os.getenv("TTS_LANGUAGE", "en-US")
    DEBUG:            bool = os.getenv("DEBUG", "false").lower() == "true"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# ─── Agent Prompts ─────────────────────────────────────────────────────────────

AGENT_PROMPTS = {
    "INTAKE": """You are FieldMedic's intake agent. Analyze the user's message and respond ONLY with this JSON:
{
  "language": "<BCP-47 code, e.g. en, sw, de, ar>",
  "emotion": "<calm|nervous|panicked|distressed>",
  "urgency": "<immediate|urgent|non-urgent|unknown>",
  "summary": "<one sentence clinical summary>",
  "category": "<bleeding|burns|choking|fracture|cardiac|shock|other>"
}""",

    "TRIAGE": """You are FieldMedic's triage agent — expert in emergency medical assessment.
Analyze the image clinically and respond ONLY with this JSON:
{
  "observation": "<clinical description of what you see>",
  "severity": "<critical|serious|moderate|minor>",
  "injury_type": "<specific injury type>",
  "immediate_dangers": ["<danger 1>", ...],
  "first_action": "<single most urgent action RIGHT NOW>"
}
Be direct. Accuracy saves lives.""",

    "GUIDANCE": """You are FieldMedic's guidance agent — a calm, expert emergency voice.
Provide clear numbered steps to an untrained bystander.
- One action per step. Plain language. No jargon.
- Adapt to the severity and injury type.
- End with emergency services recommendation.""",
}

# ─── Offline Scenario Steps ────────────────────────────────────────────────────

OFFLINE_SCENARIOS = {
    "bleeding": {
        "label": "Severe bleeding",
        "steps": [
            "Apply firm, direct pressure with a clean cloth or bandage.",
            "Do not lift the cloth — add more on top if it soaks through.",
            "Elevate the injured limb above heart level if possible.",
            "Maintain pressure continuously for at least 10 minutes.",
            "If bleeding does not slow, apply a tourniquet 5–8 cm above the wound.",
            "Mark the time the tourniquet was applied.",
            "Keep the person warm and still. Call emergency services immediately.",
        ],
    },
    "burns": {
        "label": "Burns",
        "steps": [
            "Remove the person from the heat source immediately.",
            "Cool the burn under cool (not cold) running water for 20 minutes.",
            "Do NOT use ice, butter, or any creams.",
            "Remove jewellery or clothing near the burn — unless stuck to skin.",
            "Cover loosely with a clean non-fluffy material.",
            "Do not burst any blisters.",
            "For burns larger than a hand — seek emergency care.",
        ],
    },
    "choking": {
        "label": "Choking",
        "steps": [
            "Ask: 'Are you choking?' — if they cannot speak, act immediately.",
            "Give up to 5 firm back blows between shoulder blades.",
            "Check mouth after each blow — remove any visible obstruction.",
            "If back blows fail: give up to 5 abdominal thrusts.",
            "Alternate 5 back blows and 5 abdominal thrusts.",
            "If the person becomes unconscious: begin CPR.",
            "Call emergency services immediately.",
        ],
    },
    "fracture": {
        "label": "Suspected fracture",
        "steps": [
            "Do not attempt to realign the injury.",
            "Immobilize in the position found.",
            "Apply ice wrapped in cloth — not directly on skin.",
            "Splint above and below the injury if possible.",
            "Elevate the injured area to reduce swelling.",
            "Monitor for shock: pale, cold, sweating.",
            "Seek medical attention — do not walk on a suspected leg fracture.",
        ],
    },
    "cardiac": {
        "label": "Cardiac arrest",
        "steps": [
            "Check for response: tap shoulders, shout 'Are you okay?'",
            "Call emergency services immediately.",
            "Check for normal breathing — no more than 10 seconds.",
            "Begin CPR: place heel of hand on centre of chest.",
            "Push hard and fast — 100 to 120 compressions per minute.",
            "Allow full chest recoil between compressions.",
            "If trained: give 2 rescue breaths after every 30 compressions.",
            "Continue until emergency services arrive.",
        ],
    },
    "shock": {
        "label": "Shock",
        "steps": [
            "Lay the person flat. Raise legs 30 cm unless neck injury suspected.",
            "Keep them warm with a blanket or coat.",
            "Do not give food or water.",
            "Loosen tight clothing at neck, chest, and waist.",
            "Reassure them calmly and continuously.",
            "Monitor breathing and pulse every minute.",
            "Call emergency services immediately.",
        ],
    },
}
