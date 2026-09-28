"""Content recommendations (M5 hybrid: platform-drafted + customer-authored).

vNext G5: platform-generated recommendations are evidence-backed and
falsifiable (plan section 11) — see services/recommendations.py.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from core.deps import CurrentUser, DbSession, WorkspaceId
from models import ContentRecommendation
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
