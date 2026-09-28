"""GapVisor FastAPI application."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import (
    anomalies,
    answers,
    auth,
    billing,
    competitors,
    confidence,
    dashboard,
    experiments,
    grader,
    graph,
    health,
    monitoring,
    observations,
    prompts,
    public,
    recommendations,
    reference,
    signals,
    visibility,
    workspaces,
)
from core.config import settings

app = FastAPI(
    title="GapVisor API",
    version="0.2.0",
    description="Backend for AI recommendation visibility monitoring (002-backend-platform)",
)

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API = "/api/v1"
app.include_router(health.router)
app.include_router(auth.router, prefix=API)
app.include_router(public.router, prefix=API)
app.include_router(grader.router, prefix=API)
app.include_router(reference.router, prefix=API)
app.include_router(workspaces.router, prefix=API)
app.include_router(prompts.router, prefix=API)
app.include_router(monitoring.router, prefix=API)
app.include_router(dashboard.router, prefix=API)
app.include_router(answers.router, prefix=API)
app.include_router(competitors.router, prefix=API)
app.include_router(observations.router, prefix=API)
app.include_router(visibility.router, prefix=API)
app.include_router(anomalies.router, prefix=API)
app.include_router(graph.router, prefix=API)
app.include_router(signals.router, prefix=API)
app.include_router(recommendations.router, prefix=API)
app.include_router(experiments.router, prefix=API)
app.include_router(billing.router, prefix=API)
app.include_router(confidence.router, prefix=API)
