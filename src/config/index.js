/**
 * FieldMedic — Central Configuration
 *
 * All environment-dependent values, feature flags, and constants live here.
 * Never scatter import.meta.env across the codebase — always import from this file.
 */

// ─── Environment ─────────────────────────────────────────────────────────────

export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  APP_URL: import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
  GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
  GCP_PROJECT_ID: import.meta.env.VITE_GCP_PROJECT_ID || '',
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
}

// ─── Feature Flags ────────────────────────────────────────────────────────────
// Toggle capabilities without code changes — useful for demo mode

export const FEATURES = {
  GEMINI_LIVE_VOICE: true,      // Real-time voice via Gemini Live API
  GEMINI_VISION: true,           // Wound photo analysis
  CLOUD_TTS: true,               // Google Cloud TTS narration
  OFFLINE_FALLBACK: true,        // Service worker + decision tree fallback
  RESPONDER_DASHBOARD: true,     // Medical professional remote view
  LOCATION_TRACKING: true,       // GPS location capture
  CASE_HISTORY: true,            // Firestore case persistence
}

// ─── Triage Configuration ─────────────────────────────────────────────────────

export const TRIAGE = {
  // Severity levels — used across backend and frontend
  SEVERITY: {
    CRITICAL: 'critical',   // Immediate threat to life
    SERIOUS: 'serious',     // Urgent, needs professional help soon
    MODERATE: 'moderate',   // Manageable with guidance
    MINOR: 'minor',         // First aid sufficient
    UNKNOWN: 'unknown',     // Assessment in progress
  },

  // How long before we consider a session stale (ms)
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes

  // Image capture constraints
  IMAGE: {
    MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
    QUALITY: 0.85,
    FORMAT: 'image/jpeg',
  },
}

// ─── Offline Decision Tree ────────────────────────────────────────────────────
// Pre-loaded scenarios that work with ZERO network connectivity.
// Each scenario maps to a sequence of guidance steps.

export const OFFLINE_SCENARIOS = {
  bleeding: {
    label: 'Severe bleeding',
    icon: '🩸',
    steps: [
      'Apply firm, direct pressure with a clean cloth or bandage.',
      'Do not lift the cloth — add more on top if it soaks through.',
      'Elevate the injured limb above heart level if possible.',
      'Maintain pressure continuously for at least 10 minutes.',
      'If bleeding does not slow, apply a tourniquet 5–8 cm above the wound.',
      'Mark the time the tourniquet was applied.',
      'Keep the person warm and still. Call emergency services immediately.',
    ],
  },
  burns: {
    label: 'Burns',
    icon: '🔥',
    steps: [
      'Remove the person from the heat source immediately.',
      'Cool the burn under cool (not cold) running water for 20 minutes.',
      'Do NOT use ice, butter, or any creams.',
      'Remove jewellery or clothing near the burn — unless stuck to skin.',
      'Cover loosely with a clean non-fluffy material.',
      'Do not burst any blisters.',
      'For burns larger than a hand, or on face/hands/genitals — seek emergency care.',
    ],
  },
  choking: {
    label: 'Choking',
    icon: '🫁',
    steps: [
      'Ask the person: "Are you choking?" — if they cannot speak, act immediately.',
      'Give up to 5 firm back blows between shoulder blades with heel of hand.',
      'Check mouth after each blow — remove any visible obstruction.',
      'If back blows fail: give up to 5 abdominal thrusts (Heimlich maneuver).',
      'Alternate 5 back blows and 5 abdominal thrusts.',
      'If the person becomes unconscious: begin CPR.',
      'Call emergency services immediately.',
    ],
  },
  fracture: {
    label: 'Suspected fracture',
    icon: '🦴',
    steps: [
      'Do not attempt to realign or straighten the injury.',
      'Immobilize the injured area in the position found.',
      'Apply ice wrapped in cloth to reduce swelling — not directly on skin.',
      'Splint if available: pad and secure above and below the injury.',
      'Elevate if possible to reduce swelling.',
      'Monitor for signs of shock: pale, cold, sweating.',
      'Seek medical attention — do not let the person walk on a suspected leg fracture.',
    ],
  },
  cardiac: {
    label: 'Cardiac arrest / unresponsive',
    icon: '❤️',
    steps: [
      'Check for response: tap shoulders, shout "Are you okay?"',
      'Call emergency services immediately — or have someone else call.',
      'Check for normal breathing — no more than 10 seconds.',
      'If not breathing normally: begin CPR.',
      'Place heel of hand on centre of chest. Push hard and fast — 100–120 per minute.',
      'Allow full chest recoil between compressions.',
      'If trained: give 2 rescue breaths after every 30 compressions.',
      'Continue until emergency services arrive or an AED is available.',
    ],
  },
  shock: {
    label: 'Shock',
    icon: '⚡',
    steps: [
      'Lay the person flat. Raise legs 30 cm unless head, neck, or spine injury suspected.',
      'Keep them warm with a blanket or coat.',
      'Do not give food or water.',
      'Loosen tight clothing at neck, chest, and waist.',
      'Reassure them calmly and continuously.',
      'Monitor breathing and pulse every minute.',
      'Call emergency services immediately.',
    ],
  },
}

// ─── Agent Prompts ─────────────────────────────────────────────────────────────
// System prompts for each AI agent — centralized for easy tuning

export const AGENT_PROMPTS = {
  INTAKE: `You are FieldMedic's intake agent. Your role is to:
1. Detect the language of the user's message and respond in that same language.
2. Assess the emotional state (calm, panicked, distressed) from tone and word choice.
3. Determine urgency level: immediate (life-threatening), urgent, or non-urgent.
4. Extract the core medical situation in one clear sentence.
5. Identify the most relevant trauma category: bleeding, burns, choking, fracture, cardiac, shock, or other.

Respond ONLY with a JSON object:
{
  "language": "en",
  "emotion": "panicked",
  "urgency": "immediate",
  "summary": "Person with deep laceration to left forearm, bleeding heavily",
  "category": "bleeding"
}`,

  TRIAGE: `You are FieldMedic's triage agent — an expert in emergency medical assessment.
Given an image of a wound or medical situation and context about the patient:
1. Describe what you observe clinically and clearly.
2. Assign a severity level: critical, serious, moderate, or minor.
3. Identify the specific injury type.
4. Flag any immediate dangers (arterial bleeding, airway compromise, spinal risk, etc.)
5. Recommend the first action the bystander should take RIGHT NOW in one sentence.

Be direct and calm. Do not sugarcoat critical situations — accuracy saves lives.

Respond ONLY with a JSON object:
{
  "observation": "...",
  "severity": "critical",
  "injury_type": "deep laceration",
  "immediate_dangers": ["arterial bleeding"],
  "first_action": "Apply firm direct pressure immediately with both hands."
}`,

  GUIDANCE: `You are FieldMedic's guidance agent — a calm, expert emergency medical voice.
You provide step-by-step instructions to an untrained bystander in a real emergency.

Rules:
- Speak in short, clear, numbered steps. One action per step.
- Use plain language — no medical jargon unless unavoidable.
- Acknowledge what the person is doing well when they confirm progress.
- Adapt if the situation changes.
- Always end with: whether to call emergency services, and how urgently.
- Match the language of the user.

You are calm. You are clear. You save lives.`,
}

// ─── API Endpoints ─────────────────────────────────────────────────────────────

export const ENDPOINTS = {
  TRIAGE: '/api/triage',
  GUIDANCE: '/api/guidance',
  CASE: '/api/case',
  RESPONDER: '/api/responder',
  HEALTH: '/api/health',
}

// ─── UI Constants ──────────────────────────────────────────────────────────────

export const UI = {
  ANIMATION_DURATION_MS: 300,
  TOAST_DURATION_MS: 4000,
  DEBOUNCE_MS: 300,
}
