"""Model disagreement / recommendation-stability (vNext plan section 20:
GET /api/v1/visibility/disagreement)."""

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from core.deps import DbSession, WorkspaceId
from models import Prompt
from schemas.disagreement import DisagreementListOut, PromptDisagreementOut
from services.disagreement import compute_prompt_disagreement, compute_workspace_disagreement

router = APIRouter(prefix="/visibility", tags=["visibility"])


@router.get("/disagreement", response_model=DisagreementListOut)
def list_disagreement(
    db: DbSession,
    workspace_id: WorkspaceId,
    prompt_id: str | None = Query(default=None),
) -> DisagreementListOut:
    if prompt_id:
        result = compute_prompt_disagreement(db, workspace_id=workspace_id, prompt_id=prompt_id)
        if result is None:
            raise HTTPException(
                status_code=404,
                detail="Prompt not found in this workspace, or has no VALID observations yet",
            )
        return DisagreementListOut(workspace_id=workspace_id, prompts=[PromptDisagreementOut.model_validate(result)])

    prompt_ids = list(
        db.scalars(
            select(Prompt.id).where(
                Prompt.workspace_id == workspace_id,
                Prompt.status == "active",
            )
        ).all()
    )
    results = compute_workspace_disagreement(db, workspace_id=workspace_id, prompt_ids=prompt_ids)
    return DisagreementListOut(
        workspace_id=workspace_id,
        prompts=[PromptDisagreementOut.model_validate(r) for r in results],
    )
