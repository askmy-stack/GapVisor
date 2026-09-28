"""vNext Phase G8: Py-Outlier anomaly detection, investigation, hypotheses."""

from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from models import (
    Anomaly,
    CausalEdge,
    Competitor,
    ContentRecommendation,
    ExternalSignal,
    MetricDaily,
)
from models.base import Base
from services import anomalies as svc
from services.experiments import _parse_primary_metric

WS = "workspace-1"
KONG = "competitor-kong"
BRAND_COMP = "competitor-brand"
MODEL = "chatgpt"
TARGET = date(2026, 9, 20)


class FakeScorer:
    """Plain |x - mean| / pstdev, with py-outlier's stdev-0 -> 1.0 floor."""

    method = "fake.zscore"
    version = "test"

    def __init__(self):
        self.calls: list[tuple[list[float], float]] = []

    def score(self, baseline_points, current_point):
        self.calls.append((list(baseline_points), current_point))
        import statistics

        std = statistics.pstdev(baseline_points) or 1.0
        return abs(current_point - statistics.fmean(baseline_points)) / std


@pytest.fixture
def db():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    tables = [
        Competitor.__table__,
        MetricDaily.__table__,
        ContentRecommendation.__table__,
        Anomaly.__table__,
        ExternalSignal.__table__,
        CausalEdge.__table__,
    ]
    try:
        Base.metadata.create_all(engine, tables=tables)
    except SQLAlchemyError as exc:
        pytest.skip(f"SQLite cannot create the anomaly tables in this environment: {exc}")
    session = sessionmaker(bind=engine)()
    session.add(Competitor(id=KONG, workspace_id=WS, name="Kong", logo_letter="K"))
    session.add(Competitor(id=BRAND_COMP, workspace_id=WS, name="Northstar", logo_letter="N", is_brand=True))
    session.commit()
    yield session
    session.close()


def _series(db, *, values, metric_key="inclusion_rate", model_id=MODEL, competitor_id=None, n=20, end=TARGET):
    """values[-1] lands on `end`; earlier values on the preceding days."""
    for offset, value in enumerate(reversed(values)):
        db.add(
            MetricDaily(
                workspace_id=WS,
                date=end - timedelta(days=offset),
                metric_key=metric_key,
                model_id=model_id,
                competitor_id=competitor_id,
                value=value,
                sample_size=n,
                parser_version=1,
            )
        )
    db.commit()


FLAT_THEN_DROP = [0.66, 0.68, 0.67, 0.66, 0.68, 0.67, 0.66, 0.68, 0.30]


def _signal(db, *, signal_id, entity_id, observed_at, confidence=0.3):
    signal = ExternalSignal(
        workspace_id=WS,
        entity_type="brand" if entity_id == WS else "competitor",
        entity_id=entity_id,
        source_system="test",
        signal_type="product_launch_discussion",
        external_signal_id=signal_id,
        observed_at=observed_at,
        value={},
        confidence=confidence,
        provenance={"source_ref": f"test:{signal_id}"},
        schema_version="1.0",
    )
    db.add(signal)
    db.commit()
    return signal


# ---------------------------------------------------------------------------
# Detection policy
# ---------------------------------------------------------------------------


def test_detects_a_real_drop_and_records_the_series(db):
    _series(db, values=FLAT_THEN_DROP)
    report = svc.detect_anomalies(db, workspace_id=WS, scorer=FakeScorer())

    assert len(report.created) == 1
    a = report.created[0]
    assert (a.metric_key, a.model_id, a.competitor_id) == ("inclusion_rate", MODEL, None)
    assert (a.entity_type, a.entity_id) == ("brand", WS)
    assert a.detected_for == TARGET
    assert a.direction == "down"
    assert a.observed_value == pytest.approx(30.0)
    assert a.baseline_points == 8
    assert a.status == "OPEN"
    assert a.method == "fake.zscore"


def test_scorer_receives_percentage_points_not_fractions(db):
    _series(db, values=FLAT_THEN_DROP)
    scorer = FakeScorer()
    svc.detect_anomalies(db, workspace_id=WS, scorer=scorer)
    baseline, current = scorer.calls[0]
    assert current == pytest.approx(30.0)
    assert min(baseline) >= 60


def test_normal_variation_is_not_flagged(db):
    _series(db, values=[0.60, 0.70, 0.62, 0.68, 0.61, 0.69, 0.63, 0.67, 0.66])
    assert svc.detect_anomalies(db, workspace_id=WS, scorer=FakeScorer()).created == []


def test_high_score_but_tiny_move_is_not_flagged(db):
    """A perfectly flat series makes any wiggle score high; the 2pp floor
    from the confidence layer stops that from becoming an anomaly."""
    _series(db, values=[0.50] * 8 + [0.51])
    assert svc.detect_anomalies(db, workspace_id=WS, scorer=FakeScorer()).created == []


def test_short_history_is_skipped_with_reason(db):
    _series(db, values=[0.67, 0.67, 0.30])
    report = svc.detect_anomalies(db, workspace_id=WS, scorer=FakeScorer())
    assert report.created == []
    assert report.skipped == [{"series": f"inclusion_rate/{MODEL}/brand", "reason": "insufficient_baseline"}]


def test_small_target_sample_is_skipped_with_reason(db):
    _series(db, values=FLAT_THEN_DROP, n=4)
    report = svc.detect_anomalies(db, workspace_id=WS, scorer=FakeScorer())
    assert report.created == []
    assert report.skipped[0]["reason"] == "small_sample"


def test_detection_is_idempotent(db):
    _series(db, values=FLAT_THEN_DROP)
    svc.detect_anomalies(db, workspace_id=WS, scorer=FakeScorer())
    db.commit()
    second = svc.detect_anomalies(db, workspace_id=WS, scorer=FakeScorer())
    assert second.created == []
    assert second.already_detected == 1
    assert db.query(Anomaly).count() == 1


def test_as_of_detects_a_past_day(db):
    _series(db, values=FLAT_THEN_DROP + [0.67], end=TARGET + timedelta(days=1))
    assert svc.detect_anomalies(db, workspace_id=WS, scorer=FakeScorer()).created == []
    past = svc.detect_anomalies(db, workspace_id=WS, scorer=FakeScorer(), as_of=TARGET)
    assert [a.detected_for for a in past.created] == [TARGET]


def test_competitor_and_brand_share_of_voice_map_to_the_right_entity(db):
    _series(db, values=[0.2] * 8 + [0.6], competitor_id=KONG)
    _series(db, values=[0.4] * 8 + [0.1], metric_key="share_of_voice", model_id=None, competitor_id=BRAND_COMP)
    created = svc.detect_anomalies(db, workspace_id=WS, scorer=FakeScorer()).created
    entities = {(a.metric_key, a.entity_type, a.entity_id) for a in created}
    assert entities == {("inclusion_rate", "competitor", KONG), ("share_of_voice", "brand", WS)}


# ---------------------------------------------------------------------------
# Investigation: correlated, never causal
# ---------------------------------------------------------------------------


def _detected(db, **series_kwargs) -> Anomaly:
    _series(db, **{"values": FLAT_THEN_DROP, **series_kwargs})
    anomaly = svc.detect_anomalies(db, workspace_id=WS, scorer=FakeScorer()).created[0]
    db.commit()
    return anomaly


def test_investigation_links_preceding_signals_as_correlated_only(db):
    anomaly = _detected(db)
    before = _signal(db, signal_id="before", entity_id=KONG, observed_at=datetime(2026, 9, 15, tzinfo=UTC))
    _signal(db, signal_id="after", entity_id=KONG, observed_at=datetime(2026, 9, 22, tzinfo=UTC))
    _signal(db, signal_id="too-old", entity_id=KONG, observed_at=datetime(2026, 8, 1, tzinfo=UTC))

    result = svc.investigate_anomaly(db, workspace_id=WS, anomaly=anomaly)

    assert [s.id for s in result.signals] == [before.id]
    edge = result.edges[0]
    assert edge.edge_type == "SIGNAL_PRECEDED_CHANGE"
    assert edge.causal_status == "CORRELATED"
    assert (edge.source_id, edge.target_id) == (before.id, anomaly.id)
    assert edge.confidence == 0.3
    assert "not" in result.disclaimer and "caused" in result.disclaimer
    assert anomaly.status == "INVESTIGATING"


def test_competitor_anomaly_ignores_other_competitors_signals(db):
    db.add(Competitor(id="competitor-postman", workspace_id=WS, name="Postman", logo_letter="P"))
    anomaly = _detected(db, competitor_id=KONG)
    kong = _signal(db, signal_id="kong", entity_id=KONG, observed_at=datetime(2026, 9, 18, tzinfo=UTC))
    brand = _signal(db, signal_id="brand", entity_id=WS, observed_at=datetime(2026, 9, 18, tzinfo=UTC))
    _signal(db, signal_id="postman", entity_id="competitor-postman", observed_at=datetime(2026, 9, 18, tzinfo=UTC))

    result = svc.investigate_anomaly(db, workspace_id=WS, anomaly=anomaly)
    assert {s.id for s in result.signals} == {kong.id, brand.id}


def test_null_signal_confidence_becomes_zero_edge_confidence(db):
    anomaly = _detected(db)
    _signal(db, signal_id="s", entity_id=WS, observed_at=datetime(2026, 9, 19, tzinfo=UTC), confidence=None)
    assert svc.investigate_anomaly(db, workspace_id=WS, anomaly=anomaly).edges[0].confidence == 0.0


def test_investigation_is_idempotent(db):
    anomaly = _detected(db)
    _signal(db, signal_id="s", entity_id=WS, observed_at=datetime(2026, 9, 19, tzinfo=UTC))
    svc.investigate_anomaly(db, workspace_id=WS, anomaly=anomaly)
    db.commit()
    svc.investigate_anomaly(db, workspace_id=WS, anomaly=anomaly)
    db.commit()
    assert db.query(CausalEdge).count() == 1


# ---------------------------------------------------------------------------
# Hypotheses
# ---------------------------------------------------------------------------


def test_hypothesis_is_untested_cites_evidence_and_is_measurable(db):
    anomaly = _detected(db)
    signal = _signal(db, signal_id="s", entity_id=WS, observed_at=datetime(2026, 9, 19, tzinfo=UTC))
    svc.investigate_anomaly(db, workspace_id=WS, anomaly=anomaly)

    rec = svc.hypothesis_from_anomaly(db, workspace_id=WS, anomaly=anomaly)

    assert rec.source == "anomaly_investigation"
    assert rec.causal_status == "NOT_YET_TESTED"
    assert rec.evidence_refs == [anomaly.id, signal.id]
    assert rec.evidence_strength == "MODERATE"  # n=20
    assert "correlated only" in rec.rationale
    assert rec.recommended_experiment["primary_metric"] == f"{MODEL}_inclusion_rate"
    assert _parse_primary_metric(rec.recommended_experiment["primary_metric"]) == ("inclusion_rate", MODEL)
    assert anomaly.hypothesis_recommendation_id == rec.id


def test_hypothesis_is_idempotent(db):
    anomaly = _detected(db)
    first = svc.hypothesis_from_anomaly(db, workspace_id=WS, anomaly=anomaly)
    db.commit()
    assert svc.hypothesis_from_anomaly(db, workspace_id=WS, anomaly=anomaly).id == first.id
    assert db.query(ContentRecommendation).count() == 1


def test_non_brand_anomalies_are_tested_on_a_brand_metric(db):
    """measure_experiment only measures brand rows, so a competitor or
    share-of-voice anomaly must still point at something it can measure."""
    _series(db, values=[0.2] * 8 + [0.6], competitor_id=KONG)
    _series(db, values=[0.4] * 8 + [0.1], metric_key="share_of_voice", model_id=None, competitor_id=BRAND_COMP)
    created = svc.detect_anomalies(db, workspace_id=WS, scorer=FakeScorer()).created
    metrics = {
        a.metric_key: svc.hypothesis_from_anomaly(db, workspace_id=WS, anomaly=a).recommended_experiment["primary_metric"]
        for a in created
    }
    assert metrics == {"inclusion_rate": f"{MODEL}_inclusion_rate", "share_of_voice": "inclusion_rate"}


# ---------------------------------------------------------------------------
# The real py-outlier adapter
# ---------------------------------------------------------------------------


def test_real_py_outlier_scorer_end_to_end(db):
    pytest.importorskip("anomaly_detection")
    from adapters.anomaly.py_outlier import METHOD, UPSTREAM_REF, PyOutlierZScoreScorer

    _series(db, values=FLAT_THEN_DROP)
    _series(db, values=[0.60, 0.70, 0.62, 0.68, 0.61, 0.69, 0.63, 0.67, 0.66], model_id="claude")
    created = svc.detect_anomalies(db, workspace_id=WS, scorer=PyOutlierZScoreScorer()).created

    assert [(a.model_id, a.direction) for a in created] == [(MODEL, "down")]
    assert created[0].score > svc.Z_CUTOFF
    assert (created[0].method, created[0].detector_version) == (METHOD, UPSTREAM_REF)


def test_real_py_outlier_flat_baseline_is_scored_in_percentage_points():
    pytest.importorskip("anomaly_detection")
    from adapters.anomaly.py_outlier import PyOutlierZScoreScorer

    # py-outlier floors a zero stdev at 1.0, so this is |30 - 67| / 1.
    assert PyOutlierZScoreScorer().score([67.0] * 8, 30.0) == pytest.approx(37.0)


def test_real_py_outlier_scorer_ignores_float_noise_in_a_flat_baseline():
    """Weighted daily means of a flat series differ in the last bit; that
    must not turn a 37-point drop into a score of ~1e15."""
    pytest.importorskip("anomaly_detection")
    from adapters.anomaly.py_outlier import PyOutlierZScoreScorer

    noisy_flat = [66.66666666666667, 66.66666666666666] * 4
    assert PyOutlierZScoreScorer().score(noisy_flat, 30.0) == pytest.approx(36.666667)
