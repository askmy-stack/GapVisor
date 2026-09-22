"""Billing stubs (M7) — usage counters without Stripe until pricing lane closes."""

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import func, select

from core.config import settings
from core.deps import DbSession, WorkspaceId
from models import Answer, Prompt

router = APIRouter(prefix="/billing", tags=["billing"])


class UsageOut(BaseModel):
    prompts_used: int
    prompts_quota: int
    answers_this_month: int
    scan_commitment_mode: str
    pricing_lane: str = "undecided"  # enterprise_ui | mid_market_case_study


@router.get("/usage", response_model=UsageOut)
def usage(db: DbSession, workspace_id: WorkspaceId) -> UsageOut:
    prompts_used = db.scalar(
        select(func.count()).select_from(Prompt).where(
            Prompt.workspace_id == workspace_id,
            Prompt.archived_at.is_(None),
        )
    ) or 0
    answers = db.scalar(
        select(func.count()).select_from(Answer).where(Answer.workspace_id == workspace_id)
    ) or 0
    return UsageOut(
        prompts_used=int(prompts_used),
        prompts_quota=settings.PROMPT_QUOTA_DEFAULT,
        answers_this_month=int(answers),
        scan_commitment_mode=settings.SCAN_COMMITMENT_MODE,
    )
