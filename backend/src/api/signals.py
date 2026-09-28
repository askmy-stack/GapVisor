"""External signals (vNext plan section 20: POST /api/v1/signals/ingest)."""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from adapters.external_signals import social_signal_pipeline
from core.config import settings
from core.deps import DbSession, WorkspaceId
from models import ExternalSignal
from services.signals import ExternalSignalEnvelope, ingest_signals, tracked_entities_for_workspace

router = APIRouter(prefix="/signals", tags=["signals"])


class IngestRequest(BaseModel):
    signals: list[ExternalSignalEnvelope] = Field(max_length=1000)


class IngestReportOut(BaseModel):
    accepted: int
    duplicates: int
    rejected: list[dict[str, str]]
    skipped: list[dict[str, str]] = Field(default_factory=list)


class SocialSignalIngestRequest(BaseModel):
    # Raw enriched records exactly as social-signal-pipeline writes them to
    # its JSONL export — the adapter owns interpreting them.
    records: list[dict[str, Any]] = Field(max_length=1000)


class ExternalSignalOut(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    source_system: str
    signal_type: str
    external_signal_id: str
    observed_at: datetime
    value: dict
    confidence: float | None
    provenance: dict
    schema_version: str

    model_config = {"from_attributes": True}


class ExternalSignalListOut(BaseModel):
    workspace_id: str
    total: int
    signals: list[ExternalSignalOut]


@router.post("/ingest", response_model=IngestReportOut)
def ingest(body: IngestRequest, db: DbSession, workspace_id: WorkspaceId) -> IngestReportOut:
    """Ingest envelopes already in the shared contract (plan section 5.3)."""
    report = ingest_signals(db, workspace_id=workspace_id, envelopes=body.signals)
    db.commit()
    return IngestReportOut(accepted=report.accepted, duplicates=report.duplicates, rejected=report.rejected)


@router.post("/ingest/social-signal-pipeline", response_model=IngestReportOut)
def ingest_social_signal_pipeline(
    body: SocialSignalIngestRequest,
    db: DbSession,
    workspace_id: WorkspaceId,
) -> IngestReportOut:
    if not settings.SOCIAL_SIGNALS_ENABLED:
        raise HTTPException(status_code=503, detail="The social-signal-pipeline integration is disabled")

    mapping = social_signal_pipeline.map_enriched_records(
        body.records,
        workspace_id=workspace_id,
        tracked=tracked_entities_for_workspace(db, workspace_id=workspace_id),
    )
    report = ingest_signals(db, workspace_id=workspace_id, envelopes=mapping.envelopes)
    db.commit()
    return IngestReportOut(
        accepted=report.accepted,
        duplicates=report.duplicates,
        rejected=report.rejected,
        skipped=mapping.skipped,
    )


@router.get("", response_model=ExternalSignalListOut)
def list_signals(
    db: DbSession,
    workspace_id: WorkspaceId,
    entity_id: str | None = Query(default=None),
    signal_type: str | None = Query(default=None),
    source_system: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> ExternalSignalListOut:
    query = select(ExternalSignal).where(ExternalSignal.workspace_id == workspace_id)
    if entity_id:
        query = query.where(ExternalSignal.entity_id == entity_id)
    if signal_type:
        query = query.where(ExternalSignal.signal_type == signal_type)
    if source_system:
        query = query.where(ExternalSignal.source_system == source_system)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = db.scalars(query.order_by(ExternalSignal.observed_at.desc()).limit(limit).offset(offset)).all()
    return ExternalSignalListOut(
        workspace_id=workspace_id,
        total=total,
        signals=[ExternalSignalOut.model_validate(r) for r in rows],
    )
