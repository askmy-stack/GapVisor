"""Model Disagreement Index (vNext plan section 9): a first practical
version, not sophisticated research.

For one prompt, look at the most recent VALID observation from each model
that has scanned it, and measure how much those models agree with each
other on two things:

- **presence agreement** — do models agree on whether the brand shows up
  at all? Computed as the majority share: if 3 of 4 models mention the
  brand and 1 doesn't, that's 3/4 = 0.75 agreement, regardless of which
  side is the "majority".
- **rank agreement** — among the models that *do* mention the brand, how
  consistent is the rank they give it? Computed as
  `1 - (population stdev of ranks / mean of ranks)`, clipped to [0, 1]: a
  spread of ranks large relative to their average pulls this toward 0;
  models giving nearly the same rank pull it toward 1. Undefined (None)
  with fewer than two ranked models — spread isn't meaningful from one
  point.

**Citation-source disagreement is not computed.** The plan's section 9
lists it alongside presence/rank, but no citation extraction exists yet
(`ObservationExtraction.citations` is always `[]` — see the G1 baseline
doc). Returning a number here would be fabricating precision from data
that doesn't exist; the API surfaces an explicit reason instead.

The `stability_band` (HIGH/MODERATE/LOW) is a documented, adjustable
first-pass average of whichever of the two real scores exist, not a
mathematically arbitrary single score: >=0.7 avg -> HIGH, >=0.4 -> MODERATE,
below that -> LOW. The underlying components stay visible in the API
response either way, per the plan's explicit instruction not to hide
disagreement behind one opaque score.
"""

from __future__ import annotations

from dataclasses import dataclass
from statistics import mean, pstdev

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from models import Observation, Prompt

CITATION_AGREEMENT_UNAVAILABLE_REASON = (
    "Citation-source disagreement is not computed yet: no citation extraction "
    "exists (ObservationExtraction.citations is always empty). See "
    "docs/vnext-baseline/G1-OBSERVATION-MODEL.md."
)


@dataclass(frozen=True)
class ModelSnapshot:
    model_id: str
    surface: str
    brand_mentioned: bool
    recommendation_rank: int | None
    validation_status: str


@dataclass(frozen=True)
class PromptDisagreement:
    prompt_id: str
    prompt_text: str
    models: list[ModelSnapshot]
    presence_agreement: float | None
    rank_agreement: float | None
    citation_agreement: float | None
    citation_agreement_reason: str | None
    stability_band: str | None


def _stability_band(presence_agreement: float | None, rank_agreement: float | None) -> str | None:
    scores = [s for s in (presence_agreement, rank_agreement) if s is not None]
    if not scores:
        return None
    avg = sum(scores) / len(scores)
    if avg >= 0.7:
        return "HIGH"
    if avg >= 0.4:
        return "MODERATE"
    return "LOW"


def _rank_agreement(ranks: list[int]) -> float | None:
    if len(ranks) < 2:
        return None
    avg = mean(ranks)
    if avg <= 0:
        return None
    spread = pstdev(ranks) / avg
    return max(0.0, min(1.0, 1 - spread))


def compute_prompt_disagreement(
    db: Session,
    *,
    workspace_id: str,
    prompt_id: str,
) -> PromptDisagreement | None:
    """Latest VALID observation per model for this prompt. Returns None if
    the prompt doesn't exist in this workspace or has no VALID observations
    yet (never scanned, or every scan so far failed/was uncertain)."""
    prompt = db.get(Prompt, prompt_id)
    if prompt is None or prompt.workspace_id != workspace_id:
        return None

    rows = db.scalars(
        select(Observation)
        .options(joinedload(Observation.extraction))
        .where(
            Observation.workspace_id == workspace_id,
            Observation.prompt_id == prompt_id,
            Observation.validation_status == "VALID",
        )
        .order_by(Observation.captured_at.desc())
    ).all()

    latest_by_model: dict[str, Observation] = {}
    for row in rows:
        latest_by_model.setdefault(row.model_id, row)

    if not latest_by_model:
        return None

    models = [
        ModelSnapshot(
            model_id=obs.model_id,
            surface=obs.surface,
            brand_mentioned=obs.extraction.brand_mentioned if obs.extraction else False,
            recommendation_rank=obs.extraction.recommendation_rank if obs.extraction else None,
            validation_status=obs.validation_status,
        )
        for obs in latest_by_model.values()
    ]
    models.sort(key=lambda m: m.model_id)

    n = len(models)
    mentioned_count = sum(1 for m in models if m.brand_mentioned)
    presence_agreement = max(mentioned_count, n - mentioned_count) / n

    ranks = [m.recommendation_rank for m in models if m.recommendation_rank is not None]
    rank_agreement = _rank_agreement(ranks)

    return PromptDisagreement(
        prompt_id=prompt.id,
        prompt_text=prompt.text,
        models=models,
        presence_agreement=presence_agreement,
        rank_agreement=rank_agreement,
        citation_agreement=None,
        citation_agreement_reason=CITATION_AGREEMENT_UNAVAILABLE_REASON,
        stability_band=_stability_band(presence_agreement, rank_agreement),
    )


def compute_workspace_disagreement(
    db: Session,
    *,
    workspace_id: str,
    prompt_ids: list[str],
) -> list[PromptDisagreement]:
    """compute_prompt_disagreement for several prompts, skipping any with no
    VALID observations yet rather than returning a placeholder row."""
    results = []
    for prompt_id in prompt_ids:
        result = compute_prompt_disagreement(db, workspace_id=workspace_id, prompt_id=prompt_id)
        if result is not None:
            results.append(result)
    return results
