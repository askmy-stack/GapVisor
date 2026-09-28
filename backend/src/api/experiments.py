"""Experiment Lab (vNext plan section 12): hypothesis -> intervention ->
experiment -> measurement -> SUPPORTED/NOT_SUPPORTED/INCONCLUSIVE."""

from datetime import UTC, date, datetime

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from core.deps import DbSession, WorkspaceId
from models import Experiment
from services.experiments import measure_experiment

router = APIRouter(prefix="/experiments", tags=["experiments"])


class ExperimentCreate(BaseModel):
    name: str = Field(min_length=1)
    hypothesis: str | None = None
    recommendation_id: str | None = None
    start_date: date | None = None
    primary_metric: str = "inclusion_rate"
    secondary_metrics: list[str] = Field(default_factory=list)
    measurement_window_days: int = Field(default=28, ge=1)
    intervention: dict | None = None
    holdout_definition: dict | None = None


class ExperimentOut(BaseModel):
    id: str
    name: str
    hypothesis: str | None
    recommendation_id: str | None
    start_date: date | None
    status: str
    primary_metric: str
    secondary_metrics: list[str]
    measurement_window_days: int
    intervention: dict | None
    holdout_definition: dict | None
    supporting_evidence_refs: list[str]

    baseline_inclusion: float | None = None
    current_inclusion: float | None = None
    baseline_sample_size: int = 0
    current_sample_size: int = 0
    lift: float | None = None
    confidence: dict | None = None
    result: str
    result_reason: str

    model_config = {"from_attributes": True}


@router.get("", response_model=list[ExperimentOut])
def list_experiments(db: DbSession, workspace_id: WorkspaceId) -> list[ExperimentOut]:
    rows = db.scalars(select(Experiment).where(Experiment.workspace_id == workspace_id)).all()
    return [_enrich(db, workspace_id, r) for r in rows]


@router.post("", response_model=ExperimentOut, status_code=status.HTTP_201_CREATED)
def create_experiment(
    body: ExperimentCreate,
    db: DbSession,
    workspace_id: WorkspaceId,
) -> ExperimentOut:
    row = Experiment(
        workspace_id=workspace_id,
        name=body.name,
        hypothesis=body.hypothesis,
        recommendation_id=body.recommendation_id,
        start_date=body.start_date or datetime.now(UTC).date(),
        status="running" if body.start_date else "planned",
        primary_metric=body.primary_metric,
        secondary_metrics=body.secondary_metrics,
        measurement_window_days=body.measurement_window_days,
        intervention=body.intervention,
        holdout_definition=body.holdout_definition,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _enrich(db, workspace_id, row)


@router.get("/{experiment_id}", response_model=ExperimentOut)
def get_experiment(experiment_id: str, db: DbSession, workspace_id: WorkspaceId) -> ExperimentOut:
    row = db.get(Experiment, experiment_id)
    if row is None or row.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Not found")
    return _enrich(db, workspace_id, row)


def _enrich(db, workspace_id: str, row: Experiment) -> ExperimentOut:
    measurement = measure_experiment(db, workspace_id=workspace_id, experiment=row)
    return ExperimentOut(
        id=row.id,
        name=row.name,
        hypothesis=row.hypothesis,
        recommendation_id=row.recommendation_id,
        start_date=row.start_date,
        status=row.status,
        primary_metric=row.primary_metric,
        secondary_metrics=row.secondary_metrics,
        measurement_window_days=row.measurement_window_days,
        intervention=row.intervention,
        holdout_definition=row.holdout_definition,
        supporting_evidence_refs=row.supporting_evidence_refs,
        baseline_inclusion=measurement.baseline_mean,
        current_inclusion=measurement.current_mean,
        baseline_sample_size=measurement.baseline_sample_size,
        current_sample_size=measurement.current_sample_size,
        lift=measurement.lift,
        confidence=measurement.confidence,
        result=measurement.result,
        result_reason=measurement.result_reason,
    )
