"""vNext Phase G1: Observation provenance + VALID/UNCERTAIN/INVALID gate."""

from datetime import UTC, datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from adapters.providers import MockProvider
from models import (
    AiModel,
    Answer,
    Category,
    CausalEdge,
    Competitor,
    Observation,
    ObservationExtraction,
    Prompt,
    Workspace,
)
from models.base import Base
from services.parse import parse_answer
from services.scan import record_observation
from services.validation import classify_observation

# ---------------------------------------------------------------------------
# classify_observation: pure unit tests, no DB needed
# ---------------------------------------------------------------------------


def test_classify_observation_invalid_when_provider_call_failed():
    result = classify_observation(
        provider_status="failed",
        raw_text="Northstar is a great choice.",
        brand_position=1,
        competitor_mentions={},
    )
    assert result == "INVALID"


def test_classify_observation_invalid_when_response_empty():
    result = classify_observation(
        provider_status="completed",
        raw_text="   ",
        brand_position=None,
        competitor_mentions={},
    )
    assert result == "INVALID"


def test_classify_observation_uncertain_when_response_truncated():
    result = classify_observation(
        provider_status="completed",
        raw_text="Sure, here",
        brand_position=None,
        competitor_mentions={},
    )
    assert result == "UNCERTAIN"


def test_classify_observation_uncertain_when_nobody_detected():
    result = classify_observation(
        provider_status="completed",
        raw_text="This is a long enough answer that mentions no tracked entity at all.",
        brand_position=None,
        competitor_mentions={"competitor-1": False, "competitor-2": False},
    )
    assert result == "UNCERTAIN"


def test_classify_observation_valid_when_brand_found():
    result = classify_observation(
        provider_status="completed",
        raw_text="I recommend Northstar for this use case over the alternatives.",
        brand_position=1,
        competitor_mentions={"competitor-1": False},
    )
    assert result == "VALID"


def test_classify_observation_valid_when_only_competitor_found():
    result = classify_observation(
        provider_status="completed",
        raw_text="Strong options include Kong and Postman for this use case.",
        brand_position=None,
        competitor_mentions={"competitor-1": True},
    )
    assert result == "VALID"


# ---------------------------------------------------------------------------
# record_observation: DB-backed, mirrors test_scan_pipeline's sqlite pattern
# ---------------------------------------------------------------------------


@pytest.fixture
def sqlite_session():
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
                Observation.__table__,
                ObservationExtraction.__table__,
                CausalEdge.__table__,
            ],
        )
    except SQLAlchemyError as exc:
        pytest.skip(f"SQLite cannot create the observation tables in this environment: {exc}")

    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_record_observation_captures_provenance_and_validation(sqlite_session):
    db = sqlite_session
    workspace_id = "workspace-1"
    db.add(
        AiModel(
            id="chatgpt",
            name="ChatGPT",
            long_name="ChatGPT 4o",
            badge="C",
            provider="openai",
            measurement_method="api",
        )
    )
    prompt = Prompt(id="prompt-1", workspace_id=workspace_id, text="Best API gateway?")
    competitor = Competitor(id="competitor-1", workspace_id=workspace_id, name="Kong", logo_letter="K")
    db.add_all([prompt, competitor])
    db.flush()

    ai_model = db.get(AiModel, "chatgpt")
    raw_text = "I recommend Northstar over Kong for this use case."
    parsed = parse_answer(raw_text=raw_text, brand_name="Northstar", competitors=[competitor])

    answer = Answer(
        workspace_id=workspace_id,
        prompt_id=prompt.id,
        model_id="chatgpt",
        status="completed",
        raw_text=raw_text,
        brand_position=parsed.brand_position,
        outcome=parsed.outcome,
        sentiment_label=parsed.sentiment_label,
        parser_version=1,
        created_at=datetime.now(UTC),
    )
    db.add(answer)
    db.flush()

    captured_at = datetime.now(UTC)
    observation = record_observation(
        db,
        workspace_id=workspace_id,
        prompt=prompt,
        answer=answer,
        model_id="chatgpt",
        ai_model=ai_model,
        raw_text=raw_text,
        latency_ms=42,
        captured_at=captured_at,
        parsed=parsed,
    )
    db.commit()

    stored = db.get(Observation, observation.id)
    assert stored is not None
    assert stored.workspace_id == workspace_id
    assert stored.answer_id == answer.id
    assert stored.surface == "chatgpt"
    assert stored.provider == "openai"
    assert stored.collection_method == "api"
    assert stored.latency_ms == 42
    # sqlite drops tzinfo on round-trip (Postgres' DateTime(timezone=True)
    # doesn't); compare naive to isolate that from a real assertion.
    assert stored.captured_at.replace(tzinfo=None) == captured_at.replace(tzinfo=None)
    assert stored.validation_status == "VALID"

    extraction = db.query(ObservationExtraction).filter_by(observation_id=observation.id).one()
    assert extraction.brand_mentioned is True
    assert extraction.recommendation_rank == parsed.brand_position
    assert extraction.competitor_mentions == parsed.competitor_mentions
    assert extraction.extraction_confidence == 1.0  # VALID -> 1.0, see services/validation.py


def test_record_observation_marks_unknown_ai_model_gracefully(sqlite_session):
    """If an AiModel row is somehow missing, provenance degrades honestly
    (provider=None, collection_method="unknown") instead of raising."""
    db = sqlite_session
    workspace_id = "workspace-1"
    prompt = Prompt(id="prompt-1", workspace_id=workspace_id, text="Best API gateway?")
    db.add(prompt)
    db.flush()

    provider = MockProvider()
    raw_text = provider.generate(
        workspace=Workspace(id=workspace_id, org_id="org-1", name="W", brand_name="Northstar", brand_domains=[]),
        prompt=prompt,
        model_id="ghost-model",
        competitors=[],
    ).raw_text
    parsed = parse_answer(raw_text=raw_text, brand_name="Northstar", competitors=[])
    answer = Answer(
        workspace_id=workspace_id,
        prompt_id=prompt.id,
        model_id="ghost-model",
        status="completed",
        raw_text=raw_text,
        brand_position=parsed.brand_position,
        outcome=parsed.outcome,
        sentiment_label=parsed.sentiment_label,
        parser_version=1,
        created_at=datetime.now(UTC),
    )
    # Note: no AiModel row and no FK enforcement in this sqlite fixture
    # (Base.metadata.create_all only creates the listed tables' own
    # constraints; ai_models isn't among them here), so this exercises the
    # ai_model=None fallback path in isolation.
    db.add(answer)
    db.flush()

    observation = record_observation(
        db,
        workspace_id=workspace_id,
        prompt=prompt,
        answer=answer,
        model_id="ghost-model",
        ai_model=None,
        raw_text=raw_text,
        latency_ms=None,
        captured_at=datetime.now(UTC),
        parsed=parsed,
    )
    db.commit()

    stored = db.get(Observation, observation.id)
    assert stored.provider is None
    assert stored.collection_method == "unknown"
    assert stored.latency_ms is None
