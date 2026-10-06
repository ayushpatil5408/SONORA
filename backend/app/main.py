"""SONORA Backend Application Core
Authoritative Reference: PRD.md Section 67 Deliverables 3 & 12

Exposes the minimal FastAPI backend foundation with machine-readable GET /health.
Strict Milestone 1 Boundary: Domain routes (/auth, /tracks, /playlists, /creators)
are explicitly deferred to future milestones.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .database import check_database_connection
from .migrations import run_initial_migration


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str
    database: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is migrated on startup
    run_initial_migration()
    yield


app = FastAPI(
    title="SONORA API",
    description="Unified audiovisual music platform backend foundation",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS for local development
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
cors_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


@app.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Backend Health & Dependency Check",
    tags=["System"],
)
def get_health() -> JSONResponse:
    """Verifies backend operational status and active database connectivity."""
    db_ok = check_database_connection()
    env = os.getenv("ENVIRONMENT", "development")

    payload = {
        "status": "healthy" if db_ok else "degraded",
        "service": "sonora-backend",
        "version": "0.1.0",
        "environment": env,
        "database": "connected" if db_ok else "disconnected",
    }

    http_status = status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=http_status, content=payload)


@app.get("/", summary="Root Index", tags=["System"])
def get_root():
    return {
        "product": "SONORA",
        "milestone": "1.0 - Product Foundation",
        "health_check": "/health",
        "docs": "/docs",
    }
