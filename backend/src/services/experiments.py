"""Experiment Lab measurement + resolution (vNext plan section 12).

Every experiment resolves to one of `SUPPORTED` / `NOT_SUPPORTED` /
`INCONCLUSIVE` — never anything stronger, and never inferred from an
insufficient sample. This reuses the existing confidence layer
(`services/confidence.py`) rather than inventing new statistics: the same
`is_meaningful_change()` gate that already decides whether a metric move
is noise elsewhere in this codebase decides it here too.

Fixes a real pre-existing bug along the way: the old `_enrich()` in
`api/experiments.py` filtered `MetricDaily.model_id.is_(None)`, but
`inclusion_rate`/`recommendation_share` rows are always written per-model
(`rollup_answers` groups by `(day, model_id, category_id)` — there is no
aggregated `model_id=None` row), so that filter matched zero rows and
baseline/current/lift/confidence were silently `None` for every
experiment, always.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Experiment, MetricDaily
from services.confidence import is_meaningful_change, mean_with_interval

KNOWN_METRIC_KEYS = ("inclusion_rate", "recommendation_share")


@dataclass(frozen=True)
class ExperimentMeasurement:
    baseline_mean: float | None
    baseline_sample_size: int
    current_mean: float | None
    current_sample_size: int
    lift: float | None
    confidence: dict | None
    result: str  # SUPPORTED | NOT_SUPPORTED | INCONCLUSIVE
    result_reason: str


def _parse_primary_metric(primary_metric: str) -> tuple[str, str | None]:
    """"{model_id}_inclusion_rate" (the convention
    services/recommendations.py emits in recommended_experiment) -> the
    real metric_key plus which model to filter on. A bare
    "inclusion_rate"/"recommendation_share" (an experiment not tied to one
    model) -> that metric_key with no model filter, aggregating across all
    models instead of querying a model_id=None row that doesn't exist.
    """
    for metric_key in KNOWN_METRIC_KEYS:
        suffix = f"_{metric_key}"
        if primary_metric.endswith(suffix) and len(primary_metric) > len(suffix):
            return metric_key, primary_metric[: -len(suffix)]
    return primary_metric, None


def _daily_weighted_values(rows: list[MetricDaily]) -> dict[date, tuple[float, int]]:
    """One (weighted mean value, total sample_size) per calendar day,
    combining every matching model/category row for that day rather than
    treating a small-sample category the same as a large one."""
    by_day: dict[date, list[MetricDaily]] = defaultdict(list)
    for row in rows:
        by_day[row.date].append(row)

    result: dict[date, tuple[float, int]] = {}
    for day, day_rows in by_day.items():
        total_n = sum(r.sample_size for r in day_rows)
        if total_n == 0:
            continue
        weighted_value = sum(r.value * r.sample_size for r in day_rows) / total_n
        result[day] = (weighted_value, total_n)
    return result


def measure_experiment(db: Session, *, workspace_id: str, experiment: Experiment) -> ExperimentMeasurement:
    metric_key, model_id = _parse_primary_metric(experiment.primary_metric)

    query = select(MetricDaily).where(
        MetricDaily.workspace_id == workspace_id,
        MetricDaily.metric_key == metric_key,
    )
    if model_id:
        query = query.where(MetricDaily.model_id == model_id)
    rows = list(db.scalars(query).all())
    daily = _daily_weighted_values(rows)

    if experiment.start_date is None or not daily:
        return ExperimentMeasurement(
            baseline_mean=None,
            baseline_sample_size=0,
            current_mean=None,
            current_sample_size=0,
            lift=None,
            confidence=None,
            result="INCONCLUSIVE",
            result_reason="no_data",
        )

    window_end = experiment.start_date + timedelta(days=experiment.measurement_window_days)
    baseline_days = {d: v for d, v in daily.items() if d < experiment.start_date}
    current_days = {d: v for d, v in daily.items() if experiment.start_date <= d < window_end}

    baseline_n = sum(n for _, n in baseline_days.values())
    current_n = sum(n for _, n in current_days.values())
    baseline_mean = (
        sum(v * n for v, n in baseline_days.values()) / baseline_n if baseline_n > 0 else None
    )
    current_mean = sum(v * n for v, n in current_days.values()) / current_n if current_n > 0 else None
    lift = (current_mean - baseline_mean) if baseline_mean is not None and current_mean is not None else None
    confidence = mean_with_interval([v for v, _ in current_days.values()]) if current_days else None

    if baseline_mean is None or current_mean is None:
        return ExperimentMeasurement(
            baseline_mean=baseline_mean,
            baseline_sample_size=baseline_n,
            current_mean=current_mean,
            current_sample_size=current_n,
            lift=lift,
            confidence=confidence,
            result="INCONCLUSIVE",
            result_reason="missing_baseline_or_measurement_window_data",
        )

    # is_meaningful_change's min_delta (2.0) is in percentage points; our
    # metric values are 0..1 fractions, so scale both sides by 100 rather
    # than comparing a 0..1 delta against a 2.0-point threshold.
    change = is_meaningful_change(baseline_mean * 100, current_mean * 100, sample_size=current_n)
    if not change["meaningful"]:
        reason = "small_sample" if change["reason"] == "small_sample" else "change_within_noise_band"
        result = "INCONCLUSIVE"
    elif lift > 0:
        result = "SUPPORTED"
        reason = "meaningful_improvement"
    else:
        result = "NOT_SUPPORTED"
        reason = "meaningful_decline"

    return ExperimentMeasurement(
        baseline_mean=baseline_mean,
        baseline_sample_size=baseline_n,
        current_mean=current_mean,
        current_sample_size=current_n,
        lift=lift,
        confidence=confidence,
        result=result,
        result_reason=reason,
    )
