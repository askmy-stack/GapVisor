"""Content recommendations (M5 hybrid: platform-drafted + customer-authored).

vNext G5: platform-generated recommendations are evidence-backed and
falsifiable (plan section 11) — see services/recommendations.py.
vNext G6: a recommendation with a recommended_experiment config can be
converted directly into a running Experiment — see services/experiments.py.
"""

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from api.experiments import ExperimentOut
from api.experiments import _enrich as _enrich_experiment
from core.deps import CurrentUser, DbSession, WorkspaceId
from models import ContentRecommendation, Experiment
from services.recommendations import generate_evidence_backed_recommendations

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


class RecommendationOut(BaseModel):
    id: str
    title: str
    rationale: str | None
    predicted_impact: str | None
    status: str
    source: str
    evidence_refs: list
    evidence_strength: str | None
    causal_status: str | None
    recommended_experiment: dict | None

    model_config = {"from_attributes": True}


class RecommendationCreate(BaseModel):
    title: str = Field(min_length=1)
    rationale: str | None = None
    predicted_impact: str | None = None
    source: str = "customer"


class RecommendationPatch(BaseModel):
    title: str | None = None
    rationale: str | None = None
    status: str | None = None


@router.get("", response_model=list[RecommendationOut])
def list_recommendations(db: DbSession, workspace_id: WorkspaceId) -> list[ContentRecommendation]:
    return list(
        db.scalars(
            select(ContentRecommendation).where(
                ContentRecommendation.workspace_id == workspace_id,
                ContentRecommendation.archived_at.is_(None),
            )
        ).all()
    )


@router.post("", response_model=RecommendationOut, status_code=status.HTTP_201_CREATED)
def create_recommendation(
    body: RecommendationCreate,
    db: DbSession,
    workspace_id: WorkspaceId,
    current_user: CurrentUser,
) -> ContentRecommendation:
    # Customer-authored: a person's own idea isn't backed by observation
    # data, so it legitimately carries no evidence/causal-status fields.
    row = ContentRecommendation(
        workspace_id=workspace_id,
        title=body.title,
        rationale=body.rationale,
        predicted_impact=body.predicted_impact,
        source=body.source,
        status="draft",
        assignee_user_id=current_user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post("/generate", response_model=list[RecommendationOut])
def generate_from_gaps(db: DbSession, workspace_id: WorkspaceId) -> list[ContentRecommendation]:
    created = generate_evidence_backed_recommendations(db, workspace_id=workspace_id)
    db.commit()
    for row in created:
        db.refresh(row)
    return created


@router.post("/{rec_id}/experiment", response_model=ExperimentOut, status_code=status.HTTP_201_CREATED)
def convert_to_experiment(rec_id: str, db: DbSession, workspace_id: WorkspaceId) -> ExperimentOut:
    """Turn an evidence-backed recommendation into a running Experiment
    (plan section 20). Refuses to run on a recommendation with no real
    evidence or experiment config — e.g. a customer-authored one, which
    legitimately has neither (see ContentRecommendation's docstring)."""
    rec = db.get(ContentRecommendation, rec_id)
    if rec is None or rec.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    if not rec.evidence_refs or not rec.recommended_experiment:
        raise HTTPException(
            status_code=400,
            detail="This recommendation has no evidence-backed experiment config to convert",
        )

    experiment = Experiment(
        workspace_id=workspace_id,
        name=rec.title,
        hypothesis=rec.rationale,
        recommendation_id=rec.id,
        start_date=datetime.now(UTC).date(),
        status="running",
        primary_metric=rec.recommended_experiment.get("primary_metric", "inclusion_rate"),
        measurement_window_days=rec.recommended_experiment.get("measurement_window_days", 28),
        intervention={"type": "content_change", "description": rec.title},
        supporting_evidence_refs=list(rec.evidence_refs),
    )
    db.add(experiment)
    rec.status = "testing"
    db.commit()
    db.refresh(experiment)
    return _enrich_experiment(db, workspace_id, experiment)


@router.patch("/{rec_id}", response_model=RecommendationOut)
def patch_recommendation(
    rec_id: str,
    body: RecommendationPatch,
    db: DbSession,
    workspace_id: WorkspaceId,
) -> ContentRecommendation:
    row = db.get(ContentRecommendation, rec_id)
    if row is None or row.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Not found")
    if body.title is not None:
        row.title = body.title
    if body.rationale is not None:
        row.rationale = body.rationale
    if body.status is not None:
        row.status = body.status
    db.commit()
    db.refresh(row)
    return row
