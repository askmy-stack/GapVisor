from fastapi import APIRouter
from sqlalchemy import select

from core.deps import DbSession, WorkspaceId
from models import Answer, Prompt
from schemas import AnswerListOut

router = APIRouter(prefix="/answers", tags=["answers"])


@router.get("", response_model=list[AnswerListOut])
def list_answers(db: DbSession, workspace_id: WorkspaceId) -> list[AnswerListOut]:
    rows = db.execute(
        select(Answer, Prompt.text)
        .join(Prompt, Prompt.id == Answer.prompt_id)
        .where(Answer.workspace_id == workspace_id)
        .order_by(Answer.created_at.desc())
        .limit(100)
    ).all()
    return [
        AnswerListOut(
            id=answer.id,
            prompt_id=answer.prompt_id,
            model_id=answer.model_id,
            status=answer.status,
            brand_position=answer.brand_position,
            outcome=answer.outcome,
            sentiment_label=answer.sentiment_label,
            parser_version=answer.parser_version,
            created_at=answer.created_at,
            prompt_text=prompt_text,
            raw_text=answer.raw_text,
        )
        for answer, prompt_text in rows
    ]
