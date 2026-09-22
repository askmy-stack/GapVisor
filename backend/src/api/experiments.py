"""Experiments & impact (M6 observational slice)."""

from datetime import UTC, date, datetime

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from core.deps import DbSession, WorkspaceId
from models import Experiment, MetricDaily
from services.confidence import mean_with_interval

router = APIRouter(prefix="/experiments", tags=["experiments"])


class ExperimentCreate(BaseModel):
    name: str = Field(min_length=1)
    hypothesis: str | None = None
    recommendation_id: str | None = None
    start_date: date | None = None


class ExperimentOut(BaseModel):
    id: str
    name: str
    hypothesis: str | None
    recommendation_id: str | None
    start_date: date | None
    status: str
    baseline_inclusion: float | None = None
    current_inclusion: float | None = None
    lift: float | None = None
    confidence: dict | None = None

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
    metrics = db.scalars(
        select(MetricDaily).where(
            MetricDaily.workspace_id == workspace_id,
            MetricDaily.metric_key == "inclusion_rate",
            MetricDaily.model_id.is_(None),
        )
    ).all()
    baseline_vals = [m.value for m in metrics if row.start_date and m.date < row.start_date]
    current_vals = [m.value for m in metrics if row.start_date and m.date >= row.start_date]
    if not current_vals and metrics:
        current_vals = [metrics[-1].value]
    baseline = sum(baseline_vals) / len(baseline_vals) if baseline_vals else None
    current = sum(current_vals) / len(current_vals) if current_vals else None
    lift = (current - baseline) if baseline is not None and current is not None else None
    conf = mean_with_interval(current_vals) if current_vals else None
    return ExperimentOut(
        id=row.id,
        name=row.name,
        hypothesis=row.hypothesis,
        recommendation_id=row.recommendation_id,
        start_date=row.start_date,
        status=row.status,
        baseline_inclusion=baseline,
        current_inclusion=current,
        lift=lift,
        confidence=conf,
    )
