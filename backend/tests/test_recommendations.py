"""vNext Phase G5: evidence-backed recommendations."""

from datetime import UTC, date, datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from models import ContentRecommendation, MetricDaily, Observation, Prompt
from models.base import Base
from services.recommendations import (
    DEFAULT_MEASUREMENT_WINDOW_DAYS,
    MAX_RECOMMENDATIONS_PER_GENERATION,
    evidence_strength_for,
    generate_evidence_backed_recommendations,
)

WORKSPACE_ID = "workspace-1"


@pytest.fixture
def db():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    try:
        Base.metadata.create_all(
            engine,
            tables=[
                Prompt.__table__,
                MetricDaily.__table__,
                Observation.__table__,
                ContentRecommendation.__table__,
            ],
        )
    except SQLAlchemyError as exc:
        pytest.skip(f"SQLite cannot create the recommendation tables in this environment: {exc}")

    Session = sessionmaker(bind=engine)
    session = Session()
    # Every test's observations point at this one uncategorized prompt —
    # matches _add_metric's default category_id=None, and lets the
    # evidence query's Prompt join resolve.
    session.add(Prompt(id="prompt-1", workspace_id=WORKSPACE_ID, text="Best API gateway?"))
    session.commit()
    yield session
    session.close()


def _add_metric(db, *, model_id: str, value: float, sample_size: int, day: date) -> MetricDaily:
    metric = MetricDaily(
        workspace_id=WORKSPACE_ID,
        date=day,
        metric_key="inclusion_rate",
        model_id=model_id,
        value=value,
        sample_size=sample_size,
        parser_version=1,
    )
    db.add(metric)
    return metric


def _add_observations(db, *, model_id: str, day: date, count: int) -> None:
    for i in range(count):
        db.add(
            Observation(
                id=f"{model_id}-{day}-{i}",
                workspace_id=WORKSPACE_ID,
                prompt_id="prompt-1",
                model_id=model_id,
                surface=model_id,
                collection_method="api",
                status="completed",
                validation_status="VALID",
                parser_version=1,
                normalizer_version=1,
                captured_at=datetime(day.year, day.month, day.day, 12, 0, tzinfo=UTC),
            )
        )


def test_evidence_refs_do_not_leak_across_categories(db):
    """A model/day pair can be shared by prompts in different categories,
    each rolled up into its own MetricDaily row (rollup_answers groups by
    (day, model_id, category_id)). Evidence for one category's metric must
    not include observations from a different category that happens to
    share the same model and day."""
    db.add(Prompt(id="prompt-other-category", workspace_id=WORKSPACE_ID, text="Other prompt", category_id="cat-2"))
    db.commit()

    # 5 observations for the uncategorized prompt (category_id=None) ...
    _add_observations(db, model_id="chatgpt", day=date(2026, 9, 1), count=5)
    # ... and 20 more for a differently-categorized prompt, same model+day.
    for i in range(20):
        db.add(
            Observation(
                id=f"other-cat-{i}",
                workspace_id=WORKSPACE_ID,
                prompt_id="prompt-other-category",
                model_id="chatgpt",
                surface="chatgpt",
                collection_method="api",
                status="completed",
                validation_status="VALID",
                parser_version=1,
                normalizer_version=1,
                captured_at=datetime(2026, 9, 1, 12, 0, tzinfo=UTC),
            )
        )
    # The metric row being cited is for the uncategorized prompt only.
    _add_metric(db, model_id="chatgpt", value=0.1, sample_size=5, day=date(2026, 9, 1))
    db.commit()

    created = generate_evidence_backed_recommendations(db, workspace_id=WORKSPACE_ID)
    assert len(created) == 1
    assert len(created[0].evidence_refs) == 5  # not 10 (capped) or 25 (both categories)
    assert all(ref.startswith("chatgpt-") for ref in created[0].evidence_refs)


def test_evidence_strength_thresholds_match_confidence_layer():
    """Aligned with services/confidence.py: n>=30 reliable, n>=10 meaningful."""
    assert evidence_strength_for(5) == "WEAK"
    assert evidence_strength_for(9) == "WEAK"
    assert evidence_strength_for(10) == "MODERATE"
    assert evidence_strength_for(29) == "MODERATE"
    assert evidence_strength_for(30) == "STRONG"
    assert evidence_strength_for(1000) == "STRONG"


def test_healthy_inclusion_rate_generates_nothing(db):
    """Regression test for the pre-existing bug: MetricDaily.value is a
    0..1 fraction, and `< 50` (the old comparison) was always true. A
    genuinely healthy 90% inclusion rate must not generate a
    "low inclusion" recommendation."""
    _add_metric(db, model_id="chatgpt", value=0.9, sample_size=50, day=date(2026, 9, 1))
    _add_observations(db, model_id="chatgpt", day=date(2026, 9, 1), count=50)
    db.commit()

    created = generate_evidence_backed_recommendations(db, workspace_id=WORKSPACE_ID)
    assert created == []


def test_low_inclusion_with_evidence_generates_recommendation(db):
    _add_metric(db, model_id="gemini", value=0.2, sample_size=45, day=date(2026, 9, 1))
    _add_observations(db, model_id="gemini", day=date(2026, 9, 1), count=45)
    db.commit()

    created = generate_evidence_backed_recommendations(db, workspace_id=WORKSPACE_ID)
    assert len(created) == 1
    rec = created[0]
    assert rec.source == "platform"
    assert rec.causal_status == "NOT_YET_TESTED"
    assert rec.evidence_strength == "STRONG"  # sample_size=45 >= 30
    assert len(rec.evidence_refs) == 10  # capped at MAX_EVIDENCE_REFS
    assert rec.recommended_experiment == {
        "primary_metric": "gemini_inclusion_rate",
        "measurement_window_days": DEFAULT_MEASUREMENT_WINDOW_DAYS,
    }
    assert "20.0%" in rec.rationale


def test_low_inclusion_without_real_observations_generates_nothing(db):
    """A metric row can predate the vNext G1 migration (no Observation
    rows exist for that day) — don't recommend without real evidence to
    cite, even though the metric itself qualifies as low."""
    _add_metric(db, model_id="claude", value=0.1, sample_size=20, day=date(2026, 9, 1))
    # No matching Observation rows added.
    db.commit()

    created = generate_evidence_backed_recommendations(db, workspace_id=WORKSPACE_ID)
    assert created == []


def test_only_most_recent_qualifying_day_per_model(db):
    _add_metric(db, model_id="chatgpt", value=0.1, sample_size=20, day=date(2026, 8, 1))
    _add_observations(db, model_id="chatgpt", day=date(2026, 8, 1), count=20)
    _add_metric(db, model_id="chatgpt", value=0.05, sample_size=15, day=date(2026, 9, 1))
    _add_observations(db, model_id="chatgpt", day=date(2026, 9, 1), count=15)
    db.commit()

    created = generate_evidence_backed_recommendations(db, workspace_id=WORKSPACE_ID)
    assert len(created) == 1
    assert "2026-09-01" in created[0].rationale


def test_caps_at_max_recommendations_per_generation(db):
    models = ["chatgpt", "claude", "gemini", "perplexity", "ai-api-key", "buyer-agents", "extra-model"]
    for model_id in models:
        _add_metric(db, model_id=model_id, value=0.1, sample_size=15, day=date(2026, 9, 1))
        _add_observations(db, model_id=model_id, day=date(2026, 9, 1), count=15)
    db.commit()

    created = generate_evidence_backed_recommendations(db, workspace_id=WORKSPACE_ID)
    assert len(created) == MAX_RECOMMENDATIONS_PER_GENERATION


def test_respects_workspace_isolation(db):
    other_metric = MetricDaily(
        workspace_id="other-workspace",
        date=date(2026, 9, 1),
        metric_key="inclusion_rate",
        model_id="chatgpt",
        value=0.1,
        sample_size=20,
        parser_version=1,
    )
    db.add(other_metric)
    db.commit()

    created = generate_evidence_backed_recommendations(db, workspace_id=WORKSPACE_ID)
    assert created == []


def test_competitor_inclusion_rows_never_generate_brand_recommendations(db):
    """Regression: rollup_answers writes inclusion_rate per competitor too
    (competitor_id set). Live demo data had the brand at 100% inclusion on
    every row while competitors were at 0%, and the generator produced
    "low inclusion" recommendations for the brand from those competitor
    rows. Only brand rows (competitor_id NULL) may qualify."""
    competitor_row = MetricDaily(
        workspace_id=WORKSPACE_ID,
        date=date(2026, 9, 1),
        metric_key="inclusion_rate",
        model_id="claude",
        competitor_id="competitor-kong",
        value=0.0,
        sample_size=20,
        parser_version=1,
    )
    brand_row = _add_metric(db, model_id="claude", value=1.0, sample_size=20, day=date(2026, 9, 1))
    db.add(competitor_row)
    _add_observations(db, model_id="claude", day=date(2026, 9, 1), count=20)
    db.commit()
    assert brand_row.competitor_id is None

    created = generate_evidence_backed_recommendations(db, workspace_id=WORKSPACE_ID)
    assert created == []
