"""Visibility anomalies (vNext plan section 20: GET /api/v1/visibility/anomalies)."""

from datetime import date, datetime

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select

from adapters.anomaly import py_outlier
from api.recommendations import RecommendationOut
from api.signals import ExternalSignalOut
from core.config import settings
from core.deps import DbSession, WorkspaceId
from models import Anomaly
from services.anomalies import detect_anomalies, hypothesis_from_anomaly, investigate_anomaly

router = APIRouter(prefix="/visibility/anomalies", tags=["visibility"])

ANOMALY_STATUSES = ("OPEN", "INVESTIGATING", "DISMISSED")


class AnomalyOut(BaseModel):
    id: str
    metric_key: str
    model_id: str | None
    competitor_id: str | None
    entity_type: str
    entity_id: str
    detected_for: date
    observed_value: float
    target_sample_size: int
    baseline_mean: float
    baseline_stdev: float
    baseline_points: int
    delta: float
    direction: str
    score: float
    threshold: float
    method: str
    detector_version: str
    status: str
    hypothesis_recommendation_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AnomalyListOut(BaseModel):
    workspace_id: str
    anomalies: list[AnomalyOut]


class DetectionReportOut(BaseModel):
    series_scanned: int
    created: list[AnomalyOut]
    already_detected: int
    skipped: list[dict[str, str]]


class CorrelatedSignalOut(BaseModel):
    signal: ExternalSignalOut
    edge_id: str
    causal_status: str
    confidence: float


class InvestigationOut(BaseModel):
    anomaly: AnomalyOut
    window_start: date
    window_end: date
    correlated_signals: list[CorrelatedSignalOut]
    disclaimer: str


class AnomalyStatusPatch(BaseModel):
    status: str


def _require_enabled() -> None:
    if not settings.ANOMALY_DETECTION_ENABLED:
        raise HTTPException(status_code=503, detail="Anomaly detection is disabled")


def _get_anomaly(db: DbSession, workspace_id: str, anomaly_id: str) -> Anomaly:
    anomaly = db.get(Anomaly, anomaly_id)
    if anomaly is None or anomaly.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Anomaly not found")
    return anomaly


@router.get("", response_model=AnomalyListOut)
def list_anomalies(
    db: DbSession,
    workspace_id: WorkspaceId,
    status: str | None = Query(default=None),
) -> AnomalyListOut:
    query = select(Anomaly).where(Anomaly.workspace_id == workspace_id)
    if status:
        query = query.where(Anomaly.status == status)
    rows = db.scalars(query.order_by(Anomaly.detected_for.desc(), Anomaly.score.desc())).all()
    return AnomalyListOut(workspace_id=workspace_id, anomalies=[AnomalyOut.model_validate(r) for r in rows])


@router.post("/detect", response_model=DetectionReportOut)
def run_detection(
    db: DbSession,
    workspace_id: WorkspaceId,
    as_of: date | None = None,
) -> DetectionReportOut:
    _require_enabled()
    if not py_outlier.is_available():
        raise HTTPException(
            status_code=503,
            detail=f"py-outlier ({py_outlier.UPSTREAM_REF}) is not installed in this environment",
        )
    report = detect_anomalies(db, workspace_id=workspace_id, scorer=py_outlier.PyOutlierZScoreScorer(), as_of=as_of)
    db.commit()
    return DetectionReportOut(
        series_scanned=report.series_scanned,
        created=[AnomalyOut.model_validate(a) for a in report.created],
        already_detected=report.already_detected,
        skipped=report.skipped,
    )


@router.get("/{anomaly_id}/investigation", response_model=InvestigationOut)
def get_investigation(anomaly_id: str, db: DbSession, workspace_id: WorkspaceId) -> InvestigationOut:
    _require_enabled()
    anomaly = _get_anomaly(db, workspace_id, anomaly_id)
    result = investigate_anomaly(db, workspace_id=workspace_id, anomaly=anomaly)
    db.commit()
    edges_by_signal = {e.source_id: e for e in result.edges}
    return InvestigationOut(
        anomaly=AnomalyOut.model_validate(anomaly),
        window_start=result.window_start,
        window_end=result.window_end,
        correlated_signals=[
            CorrelatedSignalOut(
                signal=ExternalSignalOut.model_validate(s),
                edge_id=edges_by_signal[s.id].id,
                causal_status=edges_by_signal[s.id].causal_status,
                confidence=edges_by_signal[s.id].confidence,
            )
            for s in result.signals
        ],
        disclaimer=result.disclaimer,
    )


@router.post("/{anomaly_id}/hypothesis", response_model=RecommendationOut)
def create_hypothesis(anomaly_id: str, db: DbSession, workspace_id: WorkspaceId) -> RecommendationOut:
    _require_enabled()
    anomaly = _get_anomaly(db, workspace_id, anomaly_id)
    rec = hypothesis_from_anomaly(db, workspace_id=workspace_id, anomaly=anomaly)
    db.commit()
    return RecommendationOut.model_validate(rec)


@router.patch("/{anomaly_id}", response_model=AnomalyOut)
def update_status(anomaly_id: str, body: AnomalyStatusPatch, db: DbSession, workspace_id: WorkspaceId) -> AnomalyOut:
    if body.status not in ANOMALY_STATUSES:
        raise HTTPException(status_code=422, detail=f"status must be one of {list(ANOMALY_STATUSES)}")
    anomaly = _get_anomaly(db, workspace_id, anomaly_id)
    anomaly.status = body.status
    db.commit()
    return AnomalyOut.model_validate(anomaly)
