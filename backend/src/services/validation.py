"""Observation validation gate (vNext plan section 8).

Only VALID observations should enter core metrics by default. This is a
first, honest heuristic — not a trained classifier — and is documented as
such: it flags the cases we can detect mechanically today (a failed
provider call, an empty or truncated response, or a parse that found no
brand and no competitor at all, which is more often a parser miss than a
real "nobody was mentioned" answer). It does not attempt anything more
sophisticated; extending it is future work, not something to fake now.
"""

from __future__ import annotations

# Below this length a "completed" response is almost certainly truncated
# or an error message rather than a real answer.
MIN_PLAUSIBLE_RESPONSE_LENGTH = 20


def classify_observation(
    *,
    provider_status: str,
    raw_text: str | None,
    brand_position: int | None,
    competitor_mentions: dict[str, bool],
) -> str:
    """Return VALID, UNCERTAIN, or INVALID for one collected observation."""
    if provider_status != "completed" or not raw_text or not raw_text.strip():
        return "INVALID"

    if len(raw_text.strip()) < MIN_PLAUSIBLE_RESPONSE_LENGTH:
        return "UNCERTAIN"

    no_brand_found = brand_position is None
    no_competitor_found = not any(competitor_mentions.values())
    if no_brand_found and no_competitor_found:
        # Could be a genuine "answer didn't mention anyone we track", but
        # is indistinguishable from a parser miss without more signal, so
        # it's surfaced separately rather than silently trusted.
        return "UNCERTAIN"

    return "VALID"
