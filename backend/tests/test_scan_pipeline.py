from datetime import UTC, datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from models import (
    AiModel,
    Answer,
    AnswerMention,
    Category,
    Competitor,
    MetricDaily,
    Prompt,
    Workspace,
)
from models.base import Base
from services.parse import parse_answer
from services.provider import MockProvider
from services.rollup import rollup_answers


def test_mock_provider_and_parser_are_deterministic():
    workspace = Workspace(
        id="workspace-1",
        org_id="org-1",
        name="Northstar Workspace",
        brand_name="Northstar",
        brand_domains=["northstar.dev"],
    )
    prompt = Prompt(id="prompt-1", workspace_id=workspace.id, text="Best API gateway?")
    competitors = [
        Competitor(id="competitor-1", workspace_id=workspace.id, name="Kong", logo_letter="K"),
        Competitor(id="competitor-2", workspace_id=workspace.id, name="Postman", logo_letter="P"),
    ]
    provider = MockProvider()

    first = provider.generate(
        workspace=workspace,
        prompt=prompt,
        model_id="chatgpt",
        competitors=competitors,
    )
    second = provider.generate(
        workspace=workspace,
        prompt=prompt,
        model_id="chatgpt",
        competitors=competitors,
    )

    assert first == second
    parsed = parse_answer(raw_text=first, brand_name="Northstar", competitors=competitors)
    assert parsed.outcome in {"recommended", "mentioned"}
    assert parsed.brand_position is not None
    assert any(parsed.competitor_mentions.values())


def test_rollup_answers_sqlite_when_possible():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    try:
        Base.metadata.create_all(
            engine,
            tables=[
                AiModel.__table__,
                Category.__table__,
                Competitor.__table__,
                Prompt.__table__,
                Answer.__table__,
                AnswerMention.__table__,
                MetricDaily.__table__,
            ],
        )
    except SQLAlchemyError as exc:
        pytest.skip(f"SQLite cannot create the scan tables in this environment: {exc}")

    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        workspace_id = "workspace-1"
        db.add(AiModel(id="chatgpt", name="ChatGPT", long_name="ChatGPT", badge="C", measurement_method="api"))
        category = Category(id="category-1", workspace_id=workspace_id, name="API Gateways", slug="api-gateways")
        competitor = Competitor(
            id="competitor-1",
            workspace_id=workspace_id,
            name="Kong",
            logo_letter="K",
        )
        prompt = Prompt(
            id="prompt-1",
            workspace_id=workspace_id,
            text="Best API gateway?",
            category_id=category.id,
            status="active",
            samples_per_run=1,
        )
        answer = Answer(
            id="answer-1",
            workspace_id=workspace_id,
            prompt_id=prompt.id,
            model_id="chatgpt",
            status="completed",
            raw_text="I recommend Northstar alongside Kong.",
            brand_position=1,
            outcome="recommended",
            sentiment_label="positive",
            parser_version=1,
            created_at=datetime.now(UTC),
        )
        db.add_all([category, competitor, prompt, answer])
        db.flush()
        db.add(AnswerMention(answer_id=answer.id, competitor_id=competitor.id, mentioned=True))
        metrics = rollup_answers(db, workspace_id=workspace_id, answer_ids=[answer.id])
        db.commit()

        assert len(metrics) == 3
        stored = db.query(MetricDaily).filter(MetricDaily.metric_key == "recommendation_share").one()
        assert stored.value == 1.0
        assert stored.sample_size == 1
    finally:
        db.close()
