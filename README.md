# FieldMedic 🏥

**AI-powered emergency triage and guidance — voice, vision, offline-first.**

> *"Every 4 minutes, someone dies from a preventable injury because no one knew what to do."*

FieldMedic turns any smartphone into an expert emergency medical assistant. Point the camera at a wound, speak what you see, and receive calm step-by-step guidance in any language — powered by Gemini 2.0 and Google Cloud, with graceful offline fallback when it matters most.

---

## 🏆 Gemini Live Agent Challenge — Category: Creative Storyteller / Live Agent

| Requirement | How FieldMedic delivers |
|---|---|
| **Gemini model** | Gemini 2.0 Flash + Gemini Live API |
| **GenAI SDK / ADK** | Multi-agent orchestration via ADK |
| **Google Cloud service** | Cloud Run · Firestore · Cloud Storage · Cloud TTS · Cloud Build |
| **Multimodal** | Voice in · Camera/vision in · TTS audio out · Text out |

---

## ✨ What It Does

```
User speaks or shows a wound
         ↓
  Intake Agent detects language, urgency, emotion
         ↓
  Triage Agent analyzes image via Gemini Vision
         ↓
  Guidance Agent generates step-by-step instructions
         ↓
  Voice narration plays each step in the user's language
         ↓
  Medical responder dashboard shows case in real time
```

**Three operation modes:**
- 🟢 **Online** — Full Gemini AI triage + Live API voice + Cloud TTS narration
- 🟡 **Poor connection** — Compressed requests, cached responses, degraded gracefully
- 🔴 **Fully offline** — Pre-loaded decision tree for 6 trauma categories, zero network required

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│                  React PWA (Frontend)                │
│  HomePage · TriagePage · GuidancePage · Responder   │
│  Service Worker → offline cache + decision tree     │
└──────────────┬──────────────────────────────────────┘
               │ HTTPS / WebSocket
┌──────────────▼──────────────────────────────────────┐
│           FastAPI Backend (Cloud Run)                │
│                                                     │
│  ┌─────────────── ADK Orchestrator ───────────────┐ │
│  │                                                │ │
│  │  IntakeAgent    TriageAgent    GuidanceAgent   │ │
│  │  (language,     (Gemini        (step-by-step   │ │
│  │   emotion,       Vision,        instructions,  │ │
│  │   urgency)       severity)      multilingual)  │ │
│  └────────────────────────────────────────────────┘ │
└──────────┬──────────────┬──────────────┬────────────┘
           │              │              │
    ┌──────▼───┐   ┌──────▼───┐  ┌──────▼──────┐
    │Firestore │   │  Cloud   │  │  Cloud TTS  │
    │  Cases   │   │ Storage  │  │  (voices)   │
    └──────────┘   └──────────┘  └─────────────┘
```

---

## 📁 Project Structure

```
fieldmedic/
├── src/                          # React PWA
│   ├── config/index.js           # All constants, feature flags, prompts
│   ├── store/index.js            # Zustand global state (5 slices)
│   ├── api/client.js             # Axios + retry + offline detection
│   ├── hooks/
│   │   ├── useGeminiLive.js      # Gemini Live API WebSocket session
│   │   ├── useCamera.js          # Camera capture + compression
│   │   └── useOfflineMode.js     # Network quality + offline fallback
│   ├── pages/
│   │   ├── HomePage.jsx          # Landing + quick-access scenarios
│   │   ├── TriagePage.jsx        # Camera + voice input
│   │   ├── GuidancePage.jsx      # Step-by-step instructions + audio
│   │   └── ResponderPage.jsx     # Medical professional dashboard
│   └── components/
│       ├── VoiceOrb.jsx          # Animated voice interaction button
│       ├── SeverityBadge.jsx     # Color-coded severity indicator
│       ├── ProgressTrack.jsx     # Step progress bar
│       ├── ConnectionBar.jsx     # Offline/degraded status banner
│       ├── ConnectionBadge.jsx   # Inline connection status pill
│       └── ToastStack.jsx        # Global notifications
│
├── backend/                      # FastAPI
│   ├── main.py                   # App entry point
│   ├── config.py                 # Settings + agent prompts
│   ├── models/schemas.py         # All Pydantic schemas
│   ├── agents/
│   │   ├── orchestrator.py       # ADK multi-agent coordinator
│   │   ├── intake.py             # Language/emotion/urgency detection
│   │   ├── triage.py             # Gemini Vision wound analysis
│   │   └── guidance.py           # Step generator + offline fallback
│   ├── routers/                  # FastAPI route handlers
│   ├── services/
│   │   ├── firestore.py          # Case persistence
│   │   ├── storage.py            # Image/audio upload
│   │   └── tts.py                # Cloud TTS synthesis + cache
│   ├── Dockerfile                # Multi-stage, non-root
│   └── requirements.txt
│
├── cloudbuild.yaml               # CI/CD → Cloud Run (auto-deploy)
├── vite.config.js                # PWA config + Service Worker
└── .env.example                  # Environment variable template
```

---

## 🚀 Setup & Running

### Prerequisites
- Node.js 20+
- Python 3.12+
- Google Cloud project with APIs enabled:
  - Gemini API / Vertex AI
  - Cloud Firestore
  - Cloud Storage
  - Cloud Text-to-Speech
  - Cloud Run
  - Cloud Build

### 1. Clone & configure

```bash
git clone https://github.com/yourname/fieldmedic
cd fieldmedic
cp .env.example .env
# Fill in your API keys in .env
```

### 2. Run the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs available at: `http://localhost:8000/api/docs`

### 3. Run the frontend

```bash
cd ..          # back to root
npm install
npm run dev    # http://localhost:3000
```

### 4. Deploy to Google Cloud (one command)

```bash
# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Deploy backend to Cloud Run
gcloud builds submit --config cloudbuild.yaml

# Deploy frontend (Cloud Storage + CDN, or Firebase Hosting)
npm run build
gcloud storage cp -r dist/* gs://YOUR_FRONTEND_BUCKET/
```

---

## 🤖 Agent Architecture (ADK)

### IntakeAgent
Analyzes user text input to extract structured context before any other processing.

**Input:** Raw user description (any language)
**Output:** `{ language, emotion, urgency, summary, category }`

### TriageAgent
Sends wound image to Gemini 2.0 Flash Vision with enriched context from IntakeAgent.

**Input:** Base64 image + TriageContext
**Output:** `{ observation, severity, injury_type, immediate_dangers, first_action }`

### GuidanceAgent
Generates clear, multilingual step-by-step instructions. Falls back to pre-loaded decision tree if Gemini is unreachable.

**Input:** TriageResult + language code
**Output:** `{ steps[], call_emergency, emergency_note }`

### Orchestrator
Coordinates all three agents. Handles the full pipeline: intake → triage → guidance. Exposes a single `run_full_pipeline()` for convenience.

---

## 📴 Offline Mode

The Service Worker pre-caches all static assets and the offline decision tree on first load. When the backend is unreachable:

1. `useOfflineMode` detects network loss via browser events + active health probes
2. The app immediately switches to offline mode — no error, no blank screen
3. `detectOfflineCategory()` maps user description keywords to a trauma category
4. Pre-loaded step sequences are displayed and spoken via browser Web Speech API
5. Images captured offline are queued and uploaded when connection returns

**Covered offline scenarios:** Bleeding · Burns · Choking · Fracture · Cardiac arrest · Shock

---

## 🌍 Multilingual Support

- **Voice input:** Gemini Live API supports 40+ languages natively — no translation layer
- **Text analysis:** IntakeAgent detects language from user input and preserves it through the pipeline
- **TTS output:** Cloud TTS with language-specific Neural2 voices (EN, SW, DE, FR, AR, HI, ES, PT)
- **Offline speech:** Browser Web Speech API provides system-level multilingual TTS as fallback

---

## 🔒 Design Principles

**Privacy first** — Images are processed for triage and then stored only as Cloud Storage URLs. Raw base64 never reaches Firestore.

**Fail safely** — Every agent has a documented fallback. The triage agent returns a conservative "serious" assessment rather than nothing when vision fails.

**One action at a time** — Guidance steps are deliberately atomic. One verb. One object. Bystanders under stress cannot process complex instructions.

**Calm by design** — TTS voice rate is 0.92 (slightly slow), pitch is -1.0 (slightly lower). The UI uses muted greens rather than alarming reds except for genuine critical states.

---

## 🎯 Demo Script

1. **Open FieldMedic** on a phone — tap "Start Emergency Assessment"
2. **Camera mode** — show any object as the "wound" — watch Gemini Vision analyze it in real time
3. **Switch to voice** — describe the emergency in any language — watch the intake agent detect it
4. **Guidance screen** — step through instructions with audio playback, show the progress track
5. **Turn on airplane mode** — demonstrate offline mode activating seamlessly
6. **Open Responder dashboard** — show the case appearing with location, transcript, and images
7. **Show Cloud Run dashboard** — proof of live Google Cloud backend

---

## 🏅 Bonus Points Checklist

- [x] **Public code repository** — github.com/yourname/fieldmedic
- [x] **Architecture diagram** — included above
- [x] **Setup guide** — this README
- [x] **Demo video** — link here
- [x] **Cloud deployment scripts** — `cloudbuild.yaml` with full CI/CD pipeline
- [x] **Blog post** — link here (hashtag #GeminiLiveAgentChallenge)

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · Vite · PWA (Service Worker) |
| State | Zustand |
| Animation | Framer Motion |
| Backend | FastAPI · Python 3.12 · Uvicorn |
| AI Orchestration | Google Agent Development Kit (ADK) |
| AI Models | Gemini 2.0 Flash · Gemini Live API |
| Vision | Gemini 2.0 Flash multimodal |
| Voice synthesis | Google Cloud TTS (Neural2) |
| Database | Google Cloud Firestore |
| File storage | Google Cloud Storage |
| Deployment | Google Cloud Run · Cloud Build |
| CI/CD | Cloud Build triggers on `main` |

---

## 👤 Author

Built for the Gemini Live Agent Challenge · February–March 2026

*"Because the first responder is always whoever is there."*

---

## 📱 Mobile Testing on Local Network

Running on a Windows machine and testing from a phone on the same WiFi requires a few extra steps because **mobile browsers block camera/mic over plain HTTP**.

### Setup

```powershell
# 1. Find your Windows LAN IP
ipconfig
# → note the IPv4 Address, e.g. 192.168.1.42

# 2. Set it in .env
VITE_API_BASE_URL=http://192.168.1.42:8000

# 3. Start backend — listen on all interfaces
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 4. Start frontend — HTTPS enabled in vite.config.js
npm run dev
# → Vite will print: https://192.168.1.42:3000
```

### On your phone

1. Open `https://192.168.1.42:3000` (note **https**)
2. Browser shows "Your connection is not private" — this is the self-signed cert
3. Tap **Advanced → Proceed to 192.168.1.42 (unsafe)** — safe to do on your own network
4. Camera and microphone will now work ✅

### Why HTTPS is needed
Mobile Chrome and Safari enforce **Secure Context** requirements — `getUserMedia()` (camera/mic) only works on `localhost` or HTTPS origins. Plain `http://192.168.x.x` is blocked at the browser level regardless of permissions.
