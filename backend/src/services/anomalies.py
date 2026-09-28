"""Visibility anomaly detection, investigation and hypotheses (vNext G8).

Py-Outlier scores how unusual the latest point of a series is; GapVisor
decides which series exist, what counts as unusual enough to act on, and
what an anomaly may and may not be used to claim (plan section 16):

- An anomaly is an investigation candidate, not an explanation.
- Investigation links external signals that *preceded* it, and only as
  `SIGNAL_PRECEDED_CHANGE` edges with `causal_status="CORRELATED"`. Time
  order is not causation.
- A hypothesis is a `NOT_YET_TESTED` recommendation whose
  `recommended_experiment` names a brand metric the Experiment Lab can
  actually measure. Only a resolved experiment can support or refute it.
"""

from __future__ import annotations

import statistics
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, time, timedelta
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import (
    Anomaly,
    CausalEdge,
    Competitor,
    ContentRecommendation,
    ExternalSignal,
    MetricDaily,
)
from services.causal_graph import record_edge
from services.experiments import daily_weighted_values
from services.recommendations import DEFAULT_MEASUREMENT_WINDOW_DAYS, evidence_strength_for

SERIES_METRIC_KEYS = ("inclusion_rate", "recommendation_share", "share_of_voice")
# |z| >= 3 is the conventional "clearly outside normal variation" cutoff.
Z_CUTOFF = 3.0
# Same minimum move the confidence layer treats as meaningful
# (services/confidence.py::is_meaningful_change min_delta).
MIN_DELTA_PP = 2.0
# Same minimum sample the confidence layer requires before calling a change.
MIN_TARGET_SAMPLE = 10
MIN_BASELINE_POINTS = 7
BASELINE_WINDOW_DAYS = 28
SIGNAL_LOOKBACK_DAYS = 14

CORRELATION_DISCLAIMER = (
    "These signals were observed before the change. That is time order only: "
    "it does not show that any of them caused it."
)


class AnomalyScorer(Protocol):
    method: str
    version: str

    def score(self, baseline_points: list[float], current_point: float) -> float: ...


@dataclass(frozen=True)
class _SeriesKey:
    metric_key: str
    model_id: str | None
    competitor_id: str | None


@dataclass
class DetectionReport:
    series_scanned: int = 0
    created: list[Anomaly] = field(default_factory=list)
    already_detected: int = 0
    skipped: list[dict[str, str]] = field(default_factory=list)


@dataclass
class Investigation:
    anomaly: Anomaly
    signals: list[ExternalSignal]
    edges: list[CausalEdge]
    window_start: date
    window_end: date
    disclaimer: str = CORRELATION_DISCLAIMER


def _load_series(db: Session, *, workspace_id: str) -> dict[_SeriesKey, dict[date, tuple[float, int]]]:
    rows = db.scalars(
        select(MetricDaily).where(
            MetricDaily.workspace_id == workspace_id,
            MetricDaily.metric_key.in_(SERIES_METRIC_KEYS),
        )
    ).all()
    grouped: dict[_SeriesKey, list[MetricDaily]] = defaultdict(list)
    for row in rows:
        grouped[_SeriesKey(row.metric_key, row.model_id, row.competitor_id)].append(row)
    # Categories are combined per day, weighted by sample size.
    return {key: daily_weighted_values(series_rows) for key, series_rows in grouped.items()}


def _entity_for(key: _SeriesKey, *, workspace_id: str, brand_competitor_ids: set[str]) -> tuple[str, str]:
    if key.competitor_id is None or key.competitor_id in brand_competitor_ids:
        return "brand", workspace_id
    return "competitor", key.competitor_id


def _series_label(key: _SeriesKey) -> str:
    return f"{key.metric_key}/{key.model_id or 'all_models'}/{key.competitor_id or 'brand'}"


def _existing_anomaly(db: Session, *, workspace_id: str, key: _SeriesKey, day: date) -> Anomaly | None:
    query = select(Anomaly).where(
        Anomaly.workspace_id == workspace_id,
        Anomaly.metric_key == key.metric_key,
        Anomaly.detected_for == day,
        Anomaly.model_id.is_(None) if key.model_id is None else Anomaly.model_id == key.model_id,
        Anomaly.competitor_id.is_(None) if key.competitor_id is None else Anomaly.competitor_id == key.competitor_id,
    )
    return db.scalars(query).first()


def detect_anomalies(
    db: Session,
    *,
    workspace_id: str,
    scorer: AnomalyScorer,
    as_of: date | None = None,
) -> DetectionReport:
    """Score each series' latest day (on or before `as_of`) against the
    prior BASELINE_WINDOW_DAYS. Values go to the scorer in percentage
    points; see adapters/anomaly/py_outlier.py for why that matters.
    Idempotent: a series already flagged for that day is not re-created.
    """
    brand_competitor_ids = set(
        db.scalars(
            select(Competitor.id).where(Competitor.workspace_id == workspace_id, Competitor.is_brand.is_(True))
        ).all()
    )
    report = DetectionReport()

    for key, daily in sorted(_load_series(db, workspace_id=workspace_id).items(), key=lambda kv: _series_label(kv[0])):
        days = sorted(d for d in daily if as_of is None or d <= as_of)
        if not days:
            continue
        report.series_scanned += 1
        target_day = days[-1]
        target_value, target_n = daily[target_day]
        window_start = target_day - timedelta(days=BASELINE_WINDOW_DAYS)
        baseline = [daily[d][0] * 100 for d in days if window_start <= d < target_day]

        label = _series_label(key)
        if len(baseline) < MIN_BASELINE_POINTS:
            report.skipped.append({"series": label, "reason": "insufficient_baseline"})
            continue
        if target_n < MIN_TARGET_SAMPLE:
            report.skipped.append({"series": label, "reason": "small_sample"})
            continue

        current = target_value * 100
        score = scorer.score(baseline, current)
        baseline_mean = statistics.fmean(baseline)
        delta = current - baseline_mean
        if score < Z_CUTOFF or abs(delta) < MIN_DELTA_PP:
            continue

        if _existing_anomaly(db, workspace_id=workspace_id, key=key, day=target_day) is not None:
            report.already_detected += 1
            continue

        entity_type, entity_id = _entity_for(key, workspace_id=workspace_id, brand_competitor_ids=brand_competitor_ids)
        anomaly = Anomaly(
            workspace_id=workspace_id,
            metric_key=key.metric_key,
            model_id=key.model_id,
            competitor_id=key.competitor_id,
            entity_type=entity_type,
            entity_id=entity_id,
            detected_for=target_day,
            observed_value=current,
            target_sample_size=target_n,
            baseline_mean=baseline_mean,
            # Population stdev, matching what py-outlier's z-score divides by.
            baseline_stdev=statistics.pstdev(baseline),
            baseline_points=len(baseline),
            delta=delta,
            direction="up" if delta > 0 else "down",
            score=score,
            threshold=Z_CUTOFF,
            method=scorer.method,
            detector_version=scorer.version,
            status="OPEN",
        )
        db.add(anomaly)
        report.created.append(anomaly)

    db.flush()
    return report


def investigate_anomaly(db: Session, *, workspace_id: str, anomaly: Anomaly) -> Investigation:
    """Link external signals observed in the SIGNAL_LOOKBACK_DAYS up to and
    including the anomaly's day. A brand anomaly considers every signal in
    the workspace (a competitor's launch can move the brand); a competitor
    anomaly considers that competitor's signals plus the brand's."""
    window_start = anomaly.detected_for - timedelta(days=SIGNAL_LOOKBACK_DAYS)
    window_end = anomaly.detected_for
    query = select(ExternalSignal).where(
        ExternalSignal.workspace_id == workspace_id,
        ExternalSignal.observed_at >= datetime.combine(window_start, time.min, tzinfo=UTC),
        ExternalSignal.observed_at <= datetime.combine(window_end, time.max, tzinfo=UTC),
    )
    if anomaly.entity_type == "competitor":
        query = query.where(ExternalSignal.entity_id.in_([anomaly.entity_id, workspace_id]))
    signals = list(db.scalars(query.order_by(ExternalSignal.observed_at)).all())

    existing = {
        edge.source_id: edge
        for edge in db.scalars(
            select(CausalEdge).where(
                CausalEdge.workspace_id == workspace_id,
                CausalEdge.edge_type == "SIGNAL_PRECEDED_CHANGE",
                CausalEdge.target_type == "anomaly",
                CausalEdge.target_id == anomaly.id,
            )
        ).all()
    }
    edges: list[CausalEdge] = []
    for signal in signals:
        edge = existing.get(signal.id)
        if edge is None:
            edge = record_edge(
                db,
                workspace_id=workspace_id,
                source_type="external_signal",
                source_id=signal.id,
                target_type="anomaly",
                target_id=anomaly.id,
                edge_type="SIGNAL_PRECEDED_CHANGE",
                observed_at=signal.observed_at,
                evidence_refs=[signal.id, anomaly.id],
                confidence=signal.confidence if signal.confidence is not None else 0.0,
                causal_status="CORRELATED",
            )
        edges.append(edge)

    if anomaly.status == "OPEN":
        anomaly.status = "INVESTIGATING"
    db.flush()
    return Investigation(anomaly=anomaly, signals=signals, edges=edges, window_start=window_start, window_end=window_end)


def _experiment_metric_for(anomaly: Anomaly) -> str:
    """A brand metric measure_experiment() can actually measure. Competitor
    and share-of-voice anomalies are tested by their effect on the brand's
    own inclusion, since that is what an intervention by the brand changes."""
    if anomaly.entity_type == "brand" and anomaly.metric_key in ("inclusion_rate", "recommendation_share"):
        return f"{anomaly.model_id}_{anomaly.metric_key}" if anomaly.model_id else anomaly.metric_key
    return f"{anomaly.model_id}_inclusion_rate" if anomaly.model_id else "inclusion_rate"


def hypothesis_from_anomaly(db: Session, *, workspace_id: str, anomaly: Anomaly) -> ContentRecommendation:
    """Turn an anomaly into a falsifiable, NOT_YET_TESTED recommendation.
    Idempotent: returns the existing hypothesis if one was already made."""
    if anomaly.hypothesis_recommendation_id:
        existing = db.get(ContentRecommendation, anomaly.hypothesis_recommendation_id)
        if existing is not None:
            return existing

    signal_ids = list(
        db.scalars(
            select(CausalEdge.source_id).where(
                CausalEdge.workspace_id == workspace_id,
                CausalEdge.edge_type == "SIGNAL_PRECEDED_CHANGE",
                CausalEdge.target_type == "anomaly",
                CausalEdge.target_id == anomaly.id,
            )
        ).all()
    )
    scope = anomaly.model_id or "all models"
    subject = "brand" if anomaly.entity_type == "brand" else f"competitor {anomaly.entity_id}"
    rationale = (
        f"{anomaly.metric_key} for {subject} on {scope} moved {anomaly.direction} to "
        f"{anomaly.observed_value:.1f}% on {anomaly.detected_for} against a "
        f"{anomaly.baseline_points}-day baseline of {anomaly.baseline_mean:.1f}% "
        f"(score {anomaly.score:.1f}, {anomaly.method}). "
    )
    rationale += (
        f"{len(signal_ids)} external signal(s) preceded it; correlated only, not shown to be the cause."
        if signal_ids
        else "No external signals were linked to it."
    )

    rec = ContentRecommendation(
        workspace_id=workspace_id,
        title=f"Investigate {anomaly.direction} shift in {anomaly.metric_key} on {scope}",
        rationale=rationale,
        source="anomaly_investigation",
        status="draft",
        evidence_refs=[anomaly.id, *signal_ids],
        evidence_strength=evidence_strength_for(anomaly.target_sample_size),
        causal_status="NOT_YET_TESTED",
        recommended_experiment={
            "primary_metric": _experiment_metric_for(anomaly),
            "measurement_window_days": DEFAULT_MEASUREMENT_WINDOW_DAYS,
        },
    )
    db.add(rec)
    db.flush()
    anomaly.hypothesis_recommendation_id = rec.id
    return rec
