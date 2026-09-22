from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.config import settings
from core.db import SessionLocal
from models import AiModel, Answer, AnswerMention, Competitor, Prompt, Workspace
from services.parse import parse_answer
from services.provider import MockProvider, Provider
from services.rollup import rollup_answers
from services.scan_commitment import plan_models_for_day


def run_scan(
    workspace_id: str,
    prompt_id: str,
    model_ids: list[str] | None = None,
    *,
    db: Session | None = None,
    provider: Provider | None = None,
) -> list[Answer]:
    """Run a prompt scan synchronously and roll up daily metrics."""
    owns_session = db is None
    session = db or SessionLocal()
    try:
        workspace = session.get(Workspace, workspace_id)
        prompt = session.get(Prompt, prompt_id)
        if workspace is None or prompt is None or prompt.workspace_id != workspace_id:
            raise ValueError("Workspace or prompt not found")

        selected_model_ids = model_ids or _planned_model_ids(session)
        competitors = session.scalars(
            select(Competitor)
            .where(
                Competitor.workspace_id == workspace_id,
                Competitor.archived_at.is_(None),
                Competitor.is_brand.is_(False),
            )
            .order_by(Competitor.name)
        ).all()

        local_provider = provider or MockProvider()
        answers: list[Answer] = []
        for model_id in selected_model_ids:
            for _ in range(prompt.samples_per_run):
                raw_text = local_provider.generate(
                    workspace=workspace,
                    prompt=prompt,
                    model_id=model_id,
                    competitors=list(competitors),
                )
                parsed = parse_answer(
                    raw_text=raw_text,
                    brand_name=workspace.brand_name,
                    competitors=list(competitors),
                )
                answer = Answer(
                    workspace_id=workspace_id,
                    prompt_id=prompt_id,
                    model_id=model_id,
                    status="completed",
                    raw_text=raw_text,
                    brand_position=parsed.brand_position,
                    outcome=parsed.outcome,
                    sentiment_label=parsed.sentiment_label,
                    parser_version=settings.PARSER_VERSION,
                    created_at=datetime.now(UTC),
                )
                session.add(answer)
                session.flush()
                for competitor_id, mentioned in parsed.competitor_mentions.items():
                    session.add(
                        AnswerMention(
                            answer_id=answer.id,
                            competitor_id=competitor_id,
                            mentioned=mentioned,
                        )
                    )
                answers.append(answer)

        session.flush()
        rollup_answers(session, workspace_id=workspace_id, answer_ids=[a.id for a in answers])
        session.commit()
        for answer in answers:
            session.refresh(answer)
        return answers
    except Exception:
        session.rollback()
        raise
    finally:
        if owns_session:
            session.close()


def _planned_model_ids(db: Session) -> list[str]:
    enabled = db.scalars(
        select(AiModel.id).where(AiModel.enabled.is_(True)).order_by(AiModel.id)
    ).all()
    plan = plan_models_for_day(enabled_model_ids=list(enabled))
    return plan.model_ids
