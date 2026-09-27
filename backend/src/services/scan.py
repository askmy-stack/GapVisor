from __future__ import annotations

import time
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.config import settings
from core.db import SessionLocal
from models import (
    AiModel,
    Answer,
    AnswerMention,
    Competitor,
    Observation,
    ObservationExtraction,
    Prompt,
    Workspace,
)
from services.parse import ParsedAnswer, parse_answer
from services.provider import MockProvider, Provider
from services.rollup import rollup_answers
from services.scan_commitment import plan_models_for_day
from services.validation import classify_observation


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
        ai_model_cache: dict[str, AiModel | None] = {}
        answers: list[Answer] = []
        for model_id in selected_model_ids:
            if model_id not in ai_model_cache:
                ai_model_cache[model_id] = session.get(AiModel, model_id)
            ai_model = ai_model_cache[model_id]

            for _ in range(prompt.samples_per_run):
                started_at = time.perf_counter()
                raw_text = local_provider.generate(
                    workspace=workspace,
                    prompt=prompt,
                    model_id=model_id,
                    competitors=list(competitors),
                )
                latency_ms = int((time.perf_counter() - started_at) * 1000)
                parsed = parse_answer(
                    raw_text=raw_text,
                    brand_name=workspace.brand_name,
                    competitors=list(competitors),
                )
                captured_at = datetime.now(UTC)
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
                    created_at=captured_at,
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
                record_observation(
                    session,
                    workspace_id=workspace_id,
                    prompt=prompt,
                    answer=answer,
                    model_id=model_id,
                    ai_model=ai_model,
                    raw_text=raw_text,
                    latency_ms=latency_ms,
                    captured_at=captured_at,
                    parsed=parsed,
                )

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


# Heuristic confidence tied directly to the validation gate, not a
# separately trained extraction-confidence model — there isn't one yet.
_CONFIDENCE_BY_VALIDATION_STATUS = {"VALID": 1.0, "UNCERTAIN": 0.5, "INVALID": 0.0}


def record_observation(
    session: Session,
    *,
    workspace_id: str,
    prompt: Prompt,
    answer: Answer,
    model_id: str,
    ai_model: AiModel | None,
    raw_text: str,
    latency_ms: int | None,
    captured_at: datetime,
    parsed: ParsedAnswer,
) -> Observation:
    """Write the Observation + ObservationExtraction pair for one generated
    answer. Additive to the existing Answer/AnswerMention/MetricDaily path,
    which is untouched — see Observation's docstring for why."""
    validation_status = classify_observation(
        provider_status=answer.status,
        raw_text=raw_text,
        brand_position=parsed.brand_position,
        competitor_mentions=parsed.competitor_mentions,
    )
    observation = Observation(
        workspace_id=workspace_id,
        prompt_id=prompt.id,
        prompt_family_id=prompt.prompt_family_id,
        answer_id=answer.id,
        surface=model_id,
        provider=ai_model.provider if ai_model else None,
        model_id=model_id,
        collection_method=ai_model.measurement_method if ai_model else "unknown",
        region=None,
        status=answer.status,
        latency_ms=latency_ms,
        raw_text=raw_text,
        raw_response_ref=None,
        validation_status=validation_status,
        parser_version=answer.parser_version,
        normalizer_version=1,
        captured_at=captured_at,
    )
    session.add(observation)
    session.flush()
    session.add(
        ObservationExtraction(
            observation_id=observation.id,
            brand_mentioned=parsed.brand_position is not None,
            recommendation_rank=parsed.brand_position,
            outcome=parsed.outcome,
            sentiment_label=parsed.sentiment_label,
            competitor_mentions=dict(parsed.competitor_mentions),
            claims=[],
            citations=[],
            extraction_confidence=_CONFIDENCE_BY_VALIDATION_STATUS[validation_status],
            parser_version=answer.parser_version,
        )
    )
    return observation
