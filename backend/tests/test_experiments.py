"""vNext Phase G6: Experiment Lab."""

from datetime import date

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from models import Experiment, MetricDaily
from models.base import Base
from services.experiments import _daily_weighted_values, _parse_primary_metric, measure_experiment

WORKSPACE_ID = "workspace-1"


@pytest.fixture
def db():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    try:
        Base.metadata.create_all(engine, tables=[MetricDaily.__table__, Experiment.__table__])
    except SQLAlchemyError as exc:
        pytest.skip(f"SQLite cannot create the experiment tables in this environment: {exc}")

    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def _metric(day: date, model_id: str, value: float, sample_size: int, category_id: str | None = None):
    return MetricDaily(
        workspace_id=WORKSPACE_ID,
        date=day,
        metric_key="inclusion_rate",
        model_id=model_id,
        category_id=category_id,
        value=value,
        sample_size=sample_size,
        parser_version=1,
    )


def _experiment(*, primary_metric="chatgpt_inclusion_rate", start_date=date(2026, 9, 15), window_days=28):
    return Experiment(
        workspace_id=WORKSPACE_ID,
        name="Test experiment",
        primary_metric=primary_metric,
        measurement_window_days=window_days,
        start_date=start_date,
    )


# ---------------------------------------------------------------------------
# _parse_primary_metric
# ---------------------------------------------------------------------------


def test_parse_primary_metric_extracts_model_suffix():
    assert _parse_primary_metric("chatgpt_inclusion_rate") == ("inclusion_rate", "chatgpt")
    assert _parse_primary_metric("claude_recommendation_share") == ("recommendation_share", "claude")


def test_parse_primary_metric_bare_key_has_no_model():
    assert _parse_primary_metric("inclusion_rate") == ("inclusion_rate", None)


# ---------------------------------------------------------------------------
# _daily_weighted_values
# ---------------------------------------------------------------------------


def test_daily_weighted_values_combines_categories_by_sample_size():
    rows = [
        _metric(date(2026, 9, 1), "chatgpt", 0.8, 10, category_id="cat-a"),
        _metric(date(2026, 9, 1), "chatgpt", 0.2, 30, category_id="cat-b"),
    ]
    result = _daily_weighted_values(rows)
    value, n = result[date(2026, 9, 1)]
    assert n == 40
    # (0.8*10 + 0.2*30) / 40 = (8 + 6) / 40 = 0.35
    assert value == pytest.approx(0.35)


# ---------------------------------------------------------------------------
# measure_experiment: the actual bug fix + real resolution logic
# ---------------------------------------------------------------------------


def test_regression_per_model_rows_are_found_not_a_nonexistent_null_aggregate(db):
    """The pre-vNext bug: inclusion_rate rows always have a concrete
    model_id (rollup_answers never writes model_id=None), but the old
    _enrich() filtered on model_id.is_(None) and always got zero rows.
    A per-model-scoped experiment must actually find its data."""
    db.add(_metric(date(2026, 9, 1), "chatgpt", 0.3, 20))
    db.commit()

    measurement = measure_experiment(
        db, workspace_id=WORKSPACE_ID, experiment=_experiment(start_date=date(2026, 9, 10))
    )
    assert measurement.baseline_mean == pytest.approx(0.3)
    assert measurement.baseline_sample_size == 20


def test_no_data_is_inconclusive(db):
    measurement = measure_experiment(db, workspace_id=WORKSPACE_ID, experiment=_experiment())
    assert measurement.result == "INCONCLUSIVE"
    assert measurement.result_reason == "no_data"


def test_missing_measurement_window_data_is_inconclusive(db):
    db.add(_metric(date(2026, 9, 1), "chatgpt", 0.3, 20))  # only baseline, nothing after start_date
    db.commit()

    measurement = measure_experiment(
        db, workspace_id=WORKSPACE_ID, experiment=_experiment(start_date=date(2026, 9, 15))
    )
    assert measurement.result == "INCONCLUSIVE"
    assert measurement.result_reason == "missing_baseline_or_measurement_window_data"


def test_meaningful_improvement_is_supported(db):
    for i in range(15):
        db.add(_metric(date(2026, 9, 1 + i), "chatgpt", 0.30, 20))
    for i in range(15):
        db.add(_metric(date(2026, 9, 16 + i), "chatgpt", 0.55, 20))
    db.commit()

    measurement = measure_experiment(
        db, workspace_id=WORKSPACE_ID, experiment=_experiment(start_date=date(2026, 9, 16))
    )
    assert measurement.result == "SUPPORTED"
    assert measurement.result_reason == "meaningful_improvement"
    assert measurement.lift == pytest.approx(0.25, abs=1e-6)


def test_meaningful_decline_is_not_supported(db):
    for i in range(15):
        db.add(_metric(date(2026, 9, 1 + i), "chatgpt", 0.55, 20))
    for i in range(15):
        db.add(_metric(date(2026, 9, 16 + i), "chatgpt", 0.30, 20))
    db.commit()

    measurement = measure_experiment(
        db, workspace_id=WORKSPACE_ID, experiment=_experiment(start_date=date(2026, 9, 16))
    )
    assert measurement.result == "NOT_SUPPORTED"
    assert measurement.result_reason == "meaningful_decline"


def test_tiny_change_is_inconclusive_not_supported_or_not_supported(db):
    """A change too small to distinguish from noise is INCONCLUSIVE, never
    SUPPORTED or NOT_SUPPORTED — the plan's core rule against
    overclaiming from insufficient evidence."""
    for i in range(15):
        db.add(_metric(date(2026, 9, 1 + i), "chatgpt", 0.40, 20))
    for i in range(15):
        db.add(_metric(date(2026, 9, 16 + i), "chatgpt", 0.405, 20))
    db.commit()

    measurement = measure_experiment(
        db, workspace_id=WORKSPACE_ID, experiment=_experiment(start_date=date(2026, 9, 16))
    )
    assert measurement.result == "INCONCLUSIVE"
    assert measurement.result_reason == "change_within_noise_band"


def test_small_sample_is_inconclusive(db):
    db.add(_metric(date(2026, 9, 1), "chatgpt", 0.3, 20))
    db.add(_metric(date(2026, 9, 16), "chatgpt", 0.8, 3))  # sample_size well below the meaningful threshold
    db.commit()

    measurement = measure_experiment(
        db, workspace_id=WORKSPACE_ID, experiment=_experiment(start_date=date(2026, 9, 16))
    )
    assert measurement.result == "INCONCLUSIVE"
    assert measurement.result_reason == "small_sample"


def test_bare_metric_key_aggregates_across_models(db):
    """An experiment not tied to one model (primary_metric="inclusion_rate",
    no suffix) should combine every model's rows, not silently match
    nothing the way the old model_id.is_(None) filter did."""
    for i in range(15):
        db.add(_metric(date(2026, 9, 1 + i), "chatgpt", 0.30, 10))
        db.add(_metric(date(2026, 9, 1 + i), "claude", 0.30, 10))
    for i in range(15):
        db.add(_metric(date(2026, 9, 16 + i), "chatgpt", 0.55, 10))
        db.add(_metric(date(2026, 9, 16 + i), "claude", 0.55, 10))
    db.commit()

    measurement = measure_experiment(
        db,
        workspace_id=WORKSPACE_ID,
        experiment=_experiment(primary_metric="inclusion_rate", start_date=date(2026, 9, 16)),
    )
    assert measurement.baseline_sample_size == 15 * 20  # both models, all days
    assert measurement.result == "SUPPORTED"


def test_respects_workspace_isolation(db):
    other = MetricDaily(
        workspace_id="other-workspace",
        date=date(2026, 9, 1),
        metric_key="inclusion_rate",
        model_id="chatgpt",
        value=0.9,
        sample_size=50,
        parser_version=1,
    )
    db.add(other)
    db.commit()

    measurement = measure_experiment(db, workspace_id=WORKSPACE_ID, experiment=_experiment())
    assert measurement.result == "INCONCLUSIVE"
    assert measurement.result_reason == "no_data"


def test_competitor_inclusion_rows_are_excluded_from_brand_measurement(db):
    """Regression: per-competitor inclusion_rate rows must not be blended
    into a brand experiment's baseline (live demo data showed a 0.667
    "baseline" that was really brand 1.0 mixed with competitor rows)."""
    db.add(_metric(date(2026, 9, 1), "chatgpt", 1.0, 10))
    competitor_row = _metric(date(2026, 9, 1), "chatgpt", 0.0, 10)
    competitor_row.competitor_id = "competitor-kong"
    db.add(competitor_row)
    db.commit()

    measurement = measure_experiment(
        db, workspace_id=WORKSPACE_ID, experiment=_experiment(start_date=date(2026, 9, 10))
    )
    assert measurement.baseline_mean == pytest.approx(1.0)
    assert measurement.baseline_sample_size == 10
