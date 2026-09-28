"""Adapter: askmy-stack/social-signal-pipeline -> ExternalSignalEnvelope.

Built against that repo's real output (commit bf657d4), not a guessed
schema: one enriched record per tweet, written as JSONL, with
`tweet`, `ai_enrichment`, `domain_analysis` and `quality` sections
(`twitter_etl.py:501-526`). The pipeline has no HTTP API, so the realistic
integration path is reading its JSONL export — see
`scripts/ingest_social_signals.py` and `POST /signals/ingest/social-signal-pipeline`.

What this adapter can honestly derive from a *single* record:

- `product_launch_discussion` — the pipeline tagged `intent` as
  `product_update` or `announcement`.
- `community_complaints` — `negative`/`mixed` sentiment *and* either a
  `warning` intent or a `risk`/`controversy` signal.

What it deliberately does not emit: `developer_sentiment_shift`,
`topic_growth`, `competitor_mention_growth` and `feature_discussion`. The
first three are changes over time, and a single-tweet record carries no
baseline or window; the last isn't distinguishable from a product update
with the pipeline's intent vocabulary. Emitting them per-record would be
inventing a trend from one data point.

Entity resolution is GapVisor's job (plan section 4: GapVisor owns
brand/competitor extraction). The pipeline's own `entities[]` only knows 21
hard-coded names (`twitter_etl.py:192-214`) — none of them a typical
workspace's brand or competitors — so the adapter matches the workspace's
tracked names against `entities[]` first and the tweet text second,
whole-word and case-insensitive.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from services.signals import ExternalSignalEnvelope, TrackedEntity

SOURCE_SYSTEM = "social-signal-pipeline"
ADAPTER_VERSION = 1
SUPPORTED_UPSTREAM_SCHEMA_VERSIONS = frozenset({"1.0"})

# Base confidence by the pipeline's own `tweet.source_confidence`.
_SOURCE_CONFIDENCE = {"verified": 0.8, "exported": 0.6, "sample": 0.3}
# The local rule-based enricher matches substrings (e.g. "evaluation"
# matches the finance keyword "valuation"), so its classifications are
# capped well below an LLM-enriched record's.
_LOCAL_ENRICHMENT_CAP = 0.5


@dataclass
class MappingResult:
    envelopes: list[ExternalSignalEnvelope] = field(default_factory=list)
    skipped: list[dict[str, str]] = field(default_factory=list)


def _mentions(text: str, name: str) -> bool:
    if not name.strip():
        return False
    return re.search(rf"(?<!\w){re.escape(name.strip())}(?!\w)", text, re.IGNORECASE) is not None


def _classify(enrichment: dict[str, Any]) -> str | None:
    intent = enrichment.get("intent")
    sentiment = enrichment.get("sentiment")
    upstream_signal = (enrichment.get("market_or_social_signal") or {}).get("signal_type")

    if intent in {"product_update", "announcement"}:
        return "product_launch_discussion"
    if sentiment in {"negative", "mixed"} and (
        intent == "warning" or upstream_signal in {"risk", "controversy"}
    ):
        return "community_complaints"
    return None


def _resolve_entities(
    record: dict[str, Any],
    tracked: list[TrackedEntity],
) -> list[tuple[TrackedEntity, str]]:
    upstream_names = {
        (e.get("name") or "").strip().lower()
        for e in (record.get("ai_enrichment") or {}).get("entities") or []
    }
    text = (record.get("tweet") or {}).get("text") or ""
    matches: list[tuple[TrackedEntity, str]] = []
    for entity in tracked:
        if entity.name.strip().lower() in upstream_names:
            matches.append((entity, "upstream_entities"))
        elif _mentions(text, entity.name):
            matches.append((entity, "text"))
    return matches


def _confidence(tweet: dict[str, Any], quality: dict[str, Any]) -> float:
    score = _SOURCE_CONFIDENCE.get(tweet.get("source_confidence"), 0.3)
    if quality.get("fallback_used") or quality.get("requires_human_review"):
        score *= 0.5
    if quality.get("enrichment_mode") == "local" or quality.get("ai_provider") == "local":
        score = min(score, _LOCAL_ENRICHMENT_CAP)
    return round(score, 3)


def map_enriched_records(
    records: list[dict[str, Any]],
    *,
    workspace_id: str,
    tracked: list[TrackedEntity],
) -> MappingResult:
    """One envelope per (record, tracked entity it mentions) for records
    with a supported signal type; everything else lands in `skipped` with
    the reason, so an ingest run can be audited rather than silently lossy."""
    result = MappingResult()

    for record in records:
        tweet = record.get("tweet") or {}
        quality = record.get("quality") or {}
        enrichment = record.get("ai_enrichment") or {}
        ref = str(tweet.get("tweet_id") or "unknown")

        if quality.get("schema_version") not in SUPPORTED_UPSTREAM_SCHEMA_VERSIONS:
            result.skipped.append({"record": ref, "reason": "unsupported_upstream_schema_version"})
            continue
        if not quality.get("validated", False):
            result.skipped.append({"record": ref, "reason": "failed_upstream_validation"})
            continue

        signal_type = _classify(enrichment)
        if signal_type is None:
            result.skipped.append({"record": ref, "reason": "no_supported_signal_type"})
            continue

        matches = _resolve_entities(record, tracked)
        if not matches:
            result.skipped.append({"record": ref, "reason": "no_tracked_entity"})
            continue

        created_at = tweet.get("created_at")
        try:
            observed_at = datetime.fromisoformat(str(created_at))
        except ValueError:
            result.skipped.append({"record": ref, "reason": "unparseable_created_at"})
            continue

        connector = tweet.get("source_connector") or "unknown"
        confidence = _confidence(tweet, quality)
        for entity, matched_by in matches:
            result.envelopes.append(
                ExternalSignalEnvelope(
                    signal_id=f"{connector}:{ref}:{signal_type}:{entity.entity_id}",
                    workspace_id=workspace_id,
                    entity_id=entity.entity_id,
                    source_system=SOURCE_SYSTEM,
                    signal_type=signal_type,
                    observed_at=observed_at,
                    value={
                        "sentiment": enrichment.get("sentiment"),
                        "intent": enrichment.get("intent"),
                        "topics": enrichment.get("topics") or [],
                        "summary": enrichment.get("summary"),
                        "metrics": tweet.get("metrics") or {},
                        "upstream_signal": enrichment.get("market_or_social_signal") or {},
                        "entity_name": entity.name,
                        "matched_by": matched_by,
                    },
                    confidence=confidence,
                    provenance={
                        "source_ref": tweet.get("source_url") or f"tweet:{ref}",
                        "tweet_id": ref,
                        "source_connector": connector,
                        "source_confidence": tweet.get("source_confidence"),
                        "is_sample": bool(tweet.get("is_sample")),
                        "ai_provider": quality.get("ai_provider"),
                        "ai_model": quality.get("ai_model"),
                        "enrichment_mode": quality.get("enrichment_mode"),
                        "upstream_schema_version": quality.get("schema_version"),
                        "adapter_version": ADAPTER_VERSION,
                    },
                )
            )

    return result
