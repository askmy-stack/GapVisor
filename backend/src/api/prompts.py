from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from core.deps import DbSession, WorkspaceId
from models import Category, Prompt
from schemas import (
    AnswerSummaryOut,
    PromptCreateRequest,
    PromptOut,
    PromptPatchRequest,
    RunPromptRequest,
)
from services.scan import run_scan

router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.get("", response_model=list[PromptOut])
def list_prompts(db: DbSession, workspace_id: WorkspaceId) -> list[Prompt]:
    return list(
        db.scalars(
            select(Prompt)
            .where(Prompt.workspace_id == workspace_id, Prompt.archived_at.is_(None))
            .order_by(Prompt.created_at.desc())
        ).all()
    )


@router.post("", response_model=PromptOut, status_code=status.HTTP_201_CREATED)
def create_prompt(body: PromptCreateRequest, db: DbSession, workspace_id: WorkspaceId) -> Prompt:
    _validate_category(db, workspace_id, body.category_id)
    prompt = Prompt(
        workspace_id=workspace_id,
        text=body.text,
        category_id=body.category_id,
        status=body.status,
        samples_per_run=body.samples_per_run,
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


@router.get("/{prompt_id}", response_model=PromptOut)
def get_prompt(prompt_id: str, db: DbSession, workspace_id: WorkspaceId) -> Prompt:
    return _get_prompt(db, workspace_id, prompt_id)


@router.patch("/{prompt_id}", response_model=PromptOut)
def patch_prompt(
    prompt_id: str,
    body: PromptPatchRequest,
    db: DbSession,
    workspace_id: WorkspaceId,
) -> Prompt:
    prompt = _get_prompt(db, workspace_id, prompt_id)
    if body.text is not None:
        prompt.text = body.text
    if body.category_id is not None:
        _validate_category(db, workspace_id, body.category_id)
        prompt.category_id = body.category_id
    if body.status is not None:
        prompt.status = body.status
    if body.samples_per_run is not None:
        prompt.samples_per_run = body.samples_per_run
    if body.archived is not None:
        prompt.archived_at = datetime.now(UTC) if body.archived else None
    db.commit()
    db.refresh(prompt)
    return prompt


@router.post("/{prompt_id}/run", response_model=list[AnswerSummaryOut])
def run_prompt(
    prompt_id: str,
    db: DbSession,
    workspace_id: WorkspaceId,
    body: RunPromptRequest | None = None,
) -> list[AnswerSummaryOut]:
    _get_prompt(db, workspace_id, prompt_id)
    try:
        answers = run_scan(workspace_id, prompt_id, body.model_ids if body else None, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return [AnswerSummaryOut.model_validate(answer) for answer in answers]


def _get_prompt(db: DbSession, workspace_id: str, prompt_id: str) -> Prompt:
    prompt = db.get(Prompt, prompt_id)
    if prompt is None or prompt.workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt not found")
    return prompt


def _validate_category(db: DbSession, workspace_id: str, category_id: str | None) -> None:
    if category_id is None:
        return
    category = db.get(Category, category_id)
    if category is None or category.workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category")
