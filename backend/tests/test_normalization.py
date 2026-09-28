"""vNext Phase G2: normalized provider adapter interface + response
validation against malformed/failed provider responses."""

import pytest
from sqlalchemy import create_engine, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from models import (
    AiModel,
    Answer,
    AnswerMention,
    CausalEdge,
    Competitor,
    MetricDaily,
    Observation,
    ObservationExtraction,
    Prompt,
)
from models.base import Base
from services.normalize import normalize_response
from services.scan import run_scan
from tests.fixtures.provider_responses import (
    EMPTY_RESPONSE,
    FAILED_WITH_STRAY_TEXT_RESPONSE,
    MESSY_WHITESPACE_RESPONSE,
    PROVIDER_ERROR_RESPONSE,
    TIMEOUT_RESPONSE,
    WHITESPACE_ONLY_RESPONSE,
    FixtureProvider,
)

# ---------------------------------------------------------------------------
# normalize_response: pure unit tests
# ---------------------------------------------------------------------------


def test_normalize_response_collapses_whitespace():
    result = normalize_response(MESSY_WHITESPACE_RESPONSE)
    assert result.status == "completed"
    assert result.text == "I recommend Northstar for this use case."


def test_normalize_response_marks_empty_text_as_failed():
    result = normalize_response(EMPTY_RESPONSE)
    assert result.status == "failed"
    assert result.text is None
    assert result.error == "empty_after_normalization"


def test_normalize_response_marks_whitespace_only_as_failed():
    result = normalize_response(WHITESPACE_ONLY_RESPONSE)
    assert result.status == "failed"
    assert result.text is None


def test_normalize_response_passes_through_timeout():
    result = normalize_response(TIMEOUT_RESPONSE)
    assert result.status == "timeout"
    assert result.text is None
    assert result.error == "request timed out after 30s"


def test_normalize_response_passes_through_provider_error():
    result = normalize_response(PROVIDER_ERROR_RESPONSE)
    assert result.status == "failed"
    assert result.text is None
    assert result.error == "rate_limited: HTTP 429"


def test_normalize_response_discards_stray_text_on_failed_status():
    """A "failed" status always wins over any leftover text — a partial
    stream before a dropped connection isn't a usable answer."""
    result = normalize_response(FAILED_WITH_STRAY_TEXT_RESPONSE)
    assert result.status == "failed"
    assert result.text is None


# ---------------------------------------------------------------------------
# run_scan with a failing/malformed provider: full pipeline, sqlite-backed
# ---------------------------------------------------------------------------


@pytest.fixture
def sqlite_session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    try:
        Base.metadata.create_all(
            engine,
            tables=[
                AiModel.__table__,
                Competitor.__table__,
                Prompt.__table__,
                Answer.__table__,
                AnswerMention.__table__,
                Observation.__table__,
                ObservationExtraction.__table__,
                MetricDaily.__table__,
                CausalEdge.__table__,
            ],
        )
        # Workspace.brand_domains is postgresql.ARRAY(Text), which the
        # SQLite compiler can't render — create this one table with a raw
        # DDL stand-in instead of via Base.metadata. The ORM only needs
        # matching column names to query it back with session.get().
        with engine.begin() as conn:
            conn.execute(
                text(
                    """
                    CREATE TABLE workspaces (
                        id VARCHAR(36) PRIMARY KEY,
                        org_id VARCHAR(36) NOT NULL,
                        name TEXT NOT NULL,
                        brand_name TEXT NOT NULL,
                        brand_domains TEXT NOT NULL,
                        fact_sheet TEXT,
                        monitoring_frequency VARCHAR(32) NOT NULL DEFAULT 'weekly',
                        timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
                        onboarding_completed_at DATETIME,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )
            )
    except SQLAlchemyError as exc:
        pytest.skip(f"SQLite cannot create the scan tables in this environment: {exc}")

    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def _seed_basics(db):
    db.execute(
        text(
            "INSERT INTO workspaces (id, org_id, name, brand_name, brand_domains) "
            "VALUES (:id, :org_id, :name, :brand_name, :brand_domains)"
        ),
        {
            "id": "workspace-1",
            "org_id": "org-1",
            "name": "Northstar Workspace",
            "brand_name": "Northstar",
            "brand_domains": "northstar.dev",
        },
    )
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
    db.add(Competitor(id="competitor-1", workspace_id="workspace-1", name="Kong", logo_letter="K"))
    db.add(Prompt(id="prompt-1", workspace_id="workspace-1", text="Best API gateway?", samples_per_run=1))
    db.commit()


@pytest.mark.parametrize(
    "response,expected_status,expected_validation",
    [
        (TIMEOUT_RESPONSE, "timeout", "INVALID"),
        (PROVIDER_ERROR_RESPONSE, "failed", "INVALID"),
        (EMPTY_RESPONSE, "failed", "INVALID"),
    ],
)
def test_run_scan_handles_failed_provider_without_crashing(
    sqlite_session, response, expected_status, expected_validation
):
    db = sqlite_session
    _seed_basics(db)

    answers = run_scan(
        "workspace-1",
        "prompt-1",
        ["chatgpt"],
        db=db,
        provider=FixtureProvider(response),
    )

    assert len(answers) == 1
    answer = answers[0]
    assert answer.status == expected_status
    assert answer.raw_text is None
    assert answer.brand_position is None
    assert answer.outcome == "error"

    # No mentions get fabricated from a response that was never parsed.
    assert db.scalars(select(AnswerMention).where(AnswerMention.answer_id == answer.id)).all() == []

    observation = db.scalars(select(Observation).where(Observation.answer_id == answer.id)).one()
    assert observation.validation_status == expected_validation
    assert observation.status == expected_status
    assert observation.raw_text is None


def test_run_scan_still_succeeds_normally_alongside_failure_handling(sqlite_session):
    """Sanity check: the failure-handling branch above didn't regress the
    ordinary successful path (covered in depth by test_scan_pipeline.py)."""
    db = sqlite_session
    _seed_basics(db)

    answers = run_scan(
        "workspace-1",
        "prompt-1",
        ["chatgpt"],
        db=db,
        provider=FixtureProvider(MESSY_WHITESPACE_RESPONSE),
    )

    assert len(answers) == 1
    answer = answers[0]
    assert answer.status == "completed"
    assert answer.raw_text == "I recommend Northstar for this use case."

    observation = db.scalars(select(Observation).where(Observation.answer_id == answer.id)).one()
    assert observation.validation_status == "VALID"
    assert observation.raw_text == answer.raw_text
