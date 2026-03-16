"""
FieldMedic — FastAPI Backend
Entry point. Registers routers, middleware, and startup logic.
"""

# Load .env file FIRST — before any other imports that read env vars
from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from routers import triage, guidance, case, responder, health, chat
from services.firestore import init_firestore


# ─── Lifespan (startup / shutdown) ───────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[FieldMedic] Starting up...")
    await init_firestore()
    yield
    print("[FieldMedic] Shutting down...")


# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="FieldMedic API",
    description="AI-powered emergency triage and guidance backend",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ─── Middleware ───────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(health.router,     prefix="/api")
app.include_router(triage.router,     prefix="/api")
app.include_router(guidance.router,   prefix="/api")
app.include_router(case.router,       prefix="/api")
app.include_router(responder.router,  prefix="/api")
app.include_router(chat.router,       prefix="/api")
