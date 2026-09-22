from __future__ import annotations

import re
from dataclasses import dataclass

from models import Competitor


@dataclass(frozen=True)
class ParsedAnswer:
    brand_position: int | None
    outcome: str
    sentiment_label: str
    competitor_mentions: dict[str, bool]


def parse_answer(
    *,
    raw_text: str,
    brand_name: str,
    competitors: list[Competitor],
) -> ParsedAnswer:
    """Parse one provider answer with deterministic local rules."""
    brand_index = _find_name(raw_text, brand_name)
    competitor_indexes = {c.id: _find_name(raw_text, c.name) for c in competitors}
    competitor_mentions = {cid: idx is not None for cid, idx in competitor_indexes.items()}

    ordered_mentions = sorted(
        [idx for idx in [brand_index, *competitor_indexes.values()] if idx is not None]
    )
    brand_position = (
        ordered_mentions.index(brand_index) + 1
        if brand_index is not None and brand_index in ordered_mentions
        else None
    )

    if brand_position is None:
        outcome = "absent"
    elif brand_position == 1 and _has_recommendation_language(raw_text, brand_name):
        outcome = "recommended"
    else:
        outcome = "mentioned"

    return ParsedAnswer(
        brand_position=brand_position,
        outcome=outcome,
        sentiment_label=_sentiment(raw_text),
        competitor_mentions=competitor_mentions,
    )


def _find_name(text: str, name: str) -> int | None:
    if not name.strip():
        return None
    pattern = re.compile(rf"(?<!\w){re.escape(name.strip())}(?!\w)", re.IGNORECASE)
    match = pattern.search(text)
    return match.start() if match else None


def _has_recommendation_language(text: str, brand_name: str) -> bool:
    lowered = text.lower()
    brand = brand_name.lower()
    return any(
        phrase in lowered
        for phrase in (
            f"recommend {brand}",
            f"recommend using {brand}",
            f"{brand} is recommended",
            f"{brand} as the recommended",
        )
    )


def _sentiment(text: str) -> str:
    lowered = text.lower()
    if any(word in lowered for word in ("recommend", "strong", "best", "well", "leader")):
        return "positive"
    if any(word in lowered for word in ("avoid", "weak", "poor", "limited")):
        return "negative"
    return "neutral"
