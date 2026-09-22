from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from core.config import settings
from core.deps import DbSession, WorkspaceId
from models import Answer, Prompt
from schemas import AnswerSummaryOut, MonitoringOverviewOut, ScanRequest
from services.scan import run_scan

router = APIRouter(prefix="/monitoring", tags=["monitoring"])


@router.post("/scans", response_model=list[AnswerSummaryOut])
def run_scans(
    db: DbSession,
    workspace_id: WorkspaceId,
    body: ScanRequest | None = None,
) -> list[AnswerSummaryOut]:
    body = body or ScanRequest()
    target_workspace_id = body.workspace_id or workspace_id
    if target_workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Workspace mismatch")

    if body.prompt_id:
        prompts = [db.get(Prompt, body.prompt_id)]
    else:
        prompts = list(
            db.scalars(
                select(Prompt).where(
                    Prompt.workspace_id == workspace_id,
                    Prompt.status == "active",
                    Prompt.archived_at.is_(None),
                )
            ).all()
        )

    answers = []
    for prompt in prompts:
        if prompt is None or prompt.workspace_id != workspace_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt not found")
        answers.extend(run_scan(workspace_id, prompt.id, body.model_ids, db=db))
    return [AnswerSummaryOut.model_validate(answer) for answer in answers]


@router.get("/overview", response_model=MonitoringOverviewOut)
def monitoring_overview(db: DbSession, workspace_id: WorkspaceId) -> MonitoringOverviewOut:
    active_prompts = db.scalar(
        select(func.count())
        .select_from(Prompt)
        .where(
            Prompt.workspace_id == workspace_id,
            Prompt.status == "active",
            Prompt.archived_at.is_(None),
        )
    )
    total_answers = db.scalar(
        select(func.count()).select_from(Answer).where(Answer.workspace_id == workspace_id)
    )
    latest_answer_at = db.scalar(
        select(func.max(Answer.created_at)).where(Answer.workspace_id == workspace_id)
    )
    return MonitoringOverviewOut(
        workspace_id=workspace_id,
        active_prompts=active_prompts or 0,
        total_answers=total_answers or 0,
        latest_answer_at=latest_answer_at,
        sync_scans=settings.SYNC_SCANS,
    )
