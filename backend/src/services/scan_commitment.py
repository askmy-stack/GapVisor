"""Scan commitment policy (FR-012).

Product must confirm Growth-tier semantics before M3. Engineering default is
rotating_weekly — see DECISIONS.md and settings.SCAN_COMMITMENT_MODE.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from core.config import settings


@dataclass(frozen=True)
class ScanPlan:
    """Which models to hit for a prompt on a given calendar day."""

    model_ids: list[str]
    mode: str
    rationale: str


# Ordered catalog of API-measurable models (customer_key is always optional / on-demand).
API_MODEL_ROTATION = ["chatgpt", "claude", "gemini", "perplexity"]


def plan_models_for_day(
    *,
    enabled_model_ids: list[str],
    day: date | None = None,
) -> ScanPlan:
    """Return the model subset that should be scanned today.

    TODO (product owner): confirm FR-012 — keep rotating_weekly, or switch
    settings.SCAN_COMMITMENT_MODE to hard_daily before Milestone 3 ships.
    """
    day = day or date.today()
    mode = settings.SCAN_COMMITMENT_MODE
    measurable = [m for m in enabled_model_ids if m in API_MODEL_ROTATION]

    if mode == "hard_daily":
        return ScanPlan(
            model_ids=list(enabled_model_ids),
            mode=mode,
            rationale="Hard daily: every enabled model every day",
        )

    # rotating_weekly: spread API models across the week; keep customer_key if enabled.
    if not measurable:
        extras = [m for m in enabled_model_ids if m not in API_MODEL_ROTATION]
        return ScanPlan(model_ids=extras, mode=mode, rationale="No API models enabled")

    idx = day.toordinal() % len(measurable)
    # Hit ~40% of models per day so the union covers all within ~3 days, full set in a week.
    window = max(1, round(len(measurable) * 0.4))
    rotated = []
    for i in range(window):
        rotated.append(measurable[(idx + i) % len(measurable)])
    extras = [m for m in enabled_model_ids if m not in API_MODEL_ROTATION]
    return ScanPlan(
        model_ids=rotated + extras,
        mode=mode,
        rationale=f"Rotating weekly: day-index {idx}, window {window}",
    )
