"""Evidence-backed recommendation generation (vNext plan section 11).

Every platform-generated recommendation must cite real evidence and start
as a testable, falsifiable hypothesis — never a fabricated placeholder.
If there's no real gap with real observations behind it, this generates
nothing; it never falls back to a generic "publish more content"
suggestion with no evidence, which the plan explicitly warns against.

Fixes a real pre-existing bug along the way: `MetricDaily.value` is a
0..1 fraction (see services/rollup.py), but the old inline generator in
api/recommendations.py compared it against `< 50`, which is always true
for any fraction — every inclusion_rate row "qualified" regardless of
whether inclusion was actually low.
"""

from __future__ import annotations

from datetime import UTC, datetime, time

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import ContentRecommendation, MetricDaily, Observation, Prompt

# MetricDaily.value is a fraction (0..1), not a percent.
LOW_INCLUSION_THRESHOLD = 0.5
MAX_RECOMMENDATIONS_PER_GENERATION = 5
MAX_EVIDENCE_REFS = 10
# The plan's own worked example in section 11 uses 28 days as the default
# measurement window; reused here rather than inventing a different number.
DEFAULT_MEASUREMENT_WINDOW_DAYS = 28


def _evidence_strength(sample_size: int) -> str:
    """WEAK | MODERATE | STRONG, aligned with the existing confidence-layer
    thresholds in services/confidence.py (n>=30 "reliable", n>=10
    "meaningful counts as a real change"), not a separately invented scale.
    """
    if sample_size >= 30:
        return "STRONG"
    if sample_size >= 10:
        return "MODERATE"
    return "WEAK"


def _evidence_observation_ids(db: Session, *, workspace_id: str, metric: MetricDaily) -> list[str]:
    """Real Observation ids that fed this specific metric row: same
    workspace, model, calendar day, *and category* as the
    (day, model_id, category_id) grouping rollup_answers uses — matching
    on model and day alone would pull in observations from other
    categories that happen to share both, over-citing relative to the
    metric's actual sample_size. VALID only. This is what "evidence_refs"
    points at — not a citation of the metric itself, but of the underlying
    collected data.
    """
    day_start = datetime.combine(metric.date, time.min, tzinfo=UTC)
    day_end = datetime.combine(metric.date, time.max, tzinfo=UTC)
    query = (
        select(Observation.id)
        .join(Prompt, Prompt.id == Observation.prompt_id)
        .where(
            Observation.workspace_id == workspace_id,
            Observation.validation_status == "VALID",
            Observation.captured_at >= day_start,
            Observation.captured_at <= day_end,
        )
    )
    if metric.model_id:
        query = query.where(Observation.model_id == metric.model_id)
    query = query.where(Prompt.category_id.is_(None) if metric.category_id is None else Prompt.category_id == metric.category_id)
    return list(db.scalars(query.limit(MAX_EVIDENCE_REFS)).all())


def generate_evidence_backed_recommendations(
    db: Session,
    *,
    workspace_id: str,
) -> list[ContentRecommendation]:
    """One recommendation per model with a genuinely low, evidence-backed
    inclusion rate (most recent qualifying day only, one per model)."""
    candidates = db.scalars(
        select(MetricDaily)
        .where(
            MetricDaily.workspace_id == workspace_id,
            MetricDaily.metric_key == "inclusion_rate",
            MetricDaily.value < LOW_INCLUSION_THRESHOLD,
            MetricDaily.model_id.is_not(None),
            # Brand rows only. rollup_answers also writes inclusion_rate
            # per competitor (competitor_id set); without this filter a
            # competitor's low inclusion produced a "low inclusion"
            # recommendation for the brand.
            MetricDaily.competitor_id.is_(None),
        )
        .order_by(MetricDaily.date.desc())
    ).all()

    seen_models: set[str] = set()
    created: list[ContentRecommendation] = []
    for metric in candidates:
        if metric.model_id in seen_models:
            continue  # most recent qualifying day per model only
        seen_models.add(metric.model_id)

        evidence_refs = _evidence_observation_ids(db, workspace_id=workspace_id, metric=metric)
        if not evidence_refs:
            # The metric row exists but we can't point at the real
            # observations behind it (e.g. predates the vNext G1
            # migration) — don't recommend without real evidence.
            continue

        row = ContentRecommendation(
            workspace_id=workspace_id,
            title=f"Improve inclusion on {metric.model_id}",
            rationale=(
                f"Inclusion rate {metric.value * 100:.1f}% on {metric.model_id} "
                f"on {metric.date} (sample_size={metric.sample_size})"
            ),
            predicted_impact=f"+{max(2.0, (LOW_INCLUSION_THRESHOLD - metric.value) * 100 * 0.2):.1f}pt inclusion",
            source="platform",
            status="draft",
            evidence_refs=evidence_refs,
            evidence_strength=_evidence_strength(metric.sample_size),
            causal_status="NOT_YET_TESTED",
            recommended_experiment={
                "primary_metric": f"{metric.model_id}_inclusion_rate",
                "measurement_window_days": DEFAULT_MEASUREMENT_WINDOW_DAYS,
            },
        )
        db.add(row)
        created.append(row)
        if len(created) >= MAX_RECOMMENDATIONS_PER_GENERATION:
            break

    return created
