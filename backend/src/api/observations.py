"""Raw observation provenance + validation (vNext plan section 20)."""

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from core.deps import DbSession, WorkspaceId
from models import Observation
from schemas.observations import ObservationDetailOut, ObservationListOut, ObservationOut

router = APIRouter(prefix="/observations", tags=["observations"])

VALID_STATUSES = {"VALID", "UNCERTAIN", "INVALID"}


@router.get("", response_model=ObservationListOut)
def list_observations(
    db: DbSession,
    workspace_id: WorkspaceId,
    validation_status: str | None = Query(default=None),
    model_id: str | None = Query(default=None),
    prompt_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> ObservationListOut:
    if validation_status is not None and validation_status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"validation_status must be one of {sorted(VALID_STATUSES)}")

    query = select(Observation).where(Observation.workspace_id == workspace_id)
    if validation_status:
        query = query.where(Observation.validation_status == validation_status)
    if model_id:
        query = query.where(Observation.model_id == model_id)
    if prompt_id:
        query = query.where(Observation.prompt_id == prompt_id)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0

    rows = db.scalars(
        query.options(joinedload(Observation.extraction))
        .order_by(Observation.captured_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()

    return ObservationListOut(
        workspace_id=workspace_id,
        total=total,
        limit=limit,
        offset=offset,
        observations=[ObservationOut.model_validate(row) for row in rows],
    )


@router.get("/{observation_id}", response_model=ObservationDetailOut)
def get_observation(observation_id: str, db: DbSession, workspace_id: WorkspaceId) -> ObservationDetailOut:
    row = db.get(Observation, observation_id, options=[joinedload(Observation.extraction)])
    if row is None or row.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Observation not found")
    return ObservationDetailOut.model_validate(row)
