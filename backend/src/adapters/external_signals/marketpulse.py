"""Adapter: askmy-stack/Market-Pulse-MCP -> ExternalSignalEnvelope.

Built against that repo's real API at commit 3792ac6 and tested against
responses recorded from it (tests/fixtures/marketpulse/). Two endpoints are
used, both paginated as `{..., "metadata": {offset, limit, next_offset}}`
and both optionally gated by an `X-API-Key` header (`api/auth.py`):

- `GET /anomalies`: rows shaped like `StockAnomalyEvent` (event_id,
  symbol, timestamp, anomaly_type, severity, z_score, volume_ratio, price,
  price_change_pct, description, related_news_ids).
- `GET /news/latest`: rows shaped like `NewsEvent` (event_id, headline,
  summary, category, symbols, sentiment_score, published_at, source, url).

The per-symbol endpoints (`/anomalies/symbol/{s}`, `/news/company/{s}`)
return HTTP 500 at that commit: they serialize ORM rows after the session
has closed (`DetachedInstanceError`, found while recording the fixtures).
The adapter therefore pages the two list endpoints and filters to tracked
tickers itself. `/explain` is never called, because it writes to
MarketPulse's database.

Signals emitted:

- `market_anomaly`: severity `medium` or above; `low` is left out as
  noise.
- `major_company_news`: company or earnings news naming a tracked ticker,
  with |sentiment_score| >= 0.5. "Major" is GapVisor's threshold;
  MarketPulse has no such notion.

`news_volume_spike` is not emitted: a count over time is a trend, and these
rows are individual events. Every signal carries MARKET_DISCLAIMER.
MarketPulse timestamps are naive UTC (`datetime.utcnow`) and are read as
UTC.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

import httpx
from pydantic import BaseModel, ValidationError

from services.signals import ExternalSignalEnvelope, TrackedCompany

SOURCE_SYSTEM = "marketpulse"
UPSTREAM_REF = "askmy-stack/Market-Pulse-MCP@3792ac6"
ADAPTER_VERSION = 1
PAGE_LIMIT = 500  # the upstream MAX_QUERY_LIMIT
MAX_PAGES = 20

MARKET_DISCLAIMER = (
    "Market activity context only. Not financial advice and not a price prediction; "
    "any link to a visibility change is correlation, not causation."
)
_SEVERITY_RANK = {"low": 0, "medium": 1, "high": 2, "critical": 3}
MIN_ANOMALY_SEVERITY = "medium"
MAJOR_NEWS_MIN_ABS_SENTIMENT = 0.5
COMPANY_NEWS_CATEGORIES = frozenset({"company", "earnings"})


class UpstreamError(RuntimeError):
    """The upstream responded, but not with the shape this adapter was built for."""


class _Anomaly(BaseModel):
    event_id: str
    symbol: str
    timestamp: datetime
    anomaly_type: str
    severity: str
    z_score: float
    volume_ratio: float
    price_change_pct: float
    description: str = ""
    related_news_ids: list[str] = []


class _News(BaseModel):
    event_id: str
    headline: str
    category: str
    symbols: list[str] = []
    sentiment_score: float = 0.0
    published_at: datetime
    source: str
    url: str | None = None


@dataclass
class MappingResult:
    envelopes: list[ExternalSignalEnvelope] = field(default_factory=list)
    skipped: list[dict[str, str]] = field(default_factory=list)


def _utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def _by_ticker(tracked: list[TrackedCompany]) -> dict[str, TrackedCompany]:
    return {c.ticker_symbol.upper(): c for c in tracked if c.ticker_symbol}


def _ref(raw: Any) -> str:
    return str(raw.get("event_id", "?")) if isinstance(raw, dict) else "?"


def map_anomalies(
    items: list[dict[str, Any]],
    *,
    workspace_id: str,
    tracked: list[TrackedCompany],
    source_base_url: str,
) -> MappingResult:
    tickers = _by_ticker(tracked)
    base = source_base_url.rstrip("/")
    result = MappingResult()
    for raw in items:
        try:
            row = _Anomaly.model_validate(raw)
        except ValidationError:
            result.skipped.append({"record": _ref(raw), "reason": "malformed_record"})
            continue
        company = tickers.get(row.symbol.upper())
        if company is None:
            result.skipped.append({"record": row.event_id, "reason": "no_tracked_entity"})
            continue
        rank = _SEVERITY_RANK.get(row.severity.lower())
        if rank is None:
            result.skipped.append({"record": row.event_id, "reason": "unknown_severity"})
            continue
        if rank < _SEVERITY_RANK[MIN_ANOMALY_SEVERITY]:
            result.skipped.append({"record": row.event_id, "reason": "below_min_severity"})
            continue

        result.envelopes.append(
            ExternalSignalEnvelope(
                signal_id=f"{SOURCE_SYSTEM}:{row.event_id}:market_anomaly:{company.entity_id}",
                workspace_id=workspace_id,
                entity_id=company.entity_id,
                source_system=SOURCE_SYSTEM,
                signal_type="market_anomaly",
                observed_at=_utc(row.timestamp),
                value={
                    "entity_name": company.name,
                    "symbol": row.symbol.upper(),
                    "anomaly_type": row.anomaly_type,
                    "severity": row.severity.lower(),
                    "z_score": row.z_score,
                    "volume_ratio": row.volume_ratio,
                    "price_change_pct": row.price_change_pct,
                    "description": row.description,
                    "disclaimer": MARKET_DISCLAIMER,
                },
                confidence=None,
                provenance={
                    "source_ref": f"{base}/anomalies/{row.event_id}",
                    "upstream_ref": UPSTREAM_REF,
                    "upstream_event_id": row.event_id,
                    "related_news_ids": row.related_news_ids,
                    "adapter_version": ADAPTER_VERSION,
                },
            )
        )
    return result


def map_news(
    items: list[dict[str, Any]],
    *,
    workspace_id: str,
    tracked: list[TrackedCompany],
    source_base_url: str,
) -> MappingResult:
    tickers = _by_ticker(tracked)
    base = source_base_url.rstrip("/")
    result = MappingResult()
    for raw in items:
        try:
            row = _News.model_validate(raw)
        except ValidationError:
            result.skipped.append({"record": _ref(raw), "reason": "malformed_record"})
            continue
        if row.category.lower() not in COMPANY_NEWS_CATEGORIES:
            result.skipped.append({"record": row.event_id, "reason": "not_company_news"})
            continue
        companies = [tickers[s.upper()] for s in row.symbols if s.upper() in tickers]
        if not companies:
            result.skipped.append({"record": row.event_id, "reason": "no_tracked_entity"})
            continue
        if abs(row.sentiment_score) < MAJOR_NEWS_MIN_ABS_SENTIMENT:
            result.skipped.append({"record": row.event_id, "reason": "below_major_threshold"})
            continue

        for company in companies:
            result.envelopes.append(
                ExternalSignalEnvelope(
                    signal_id=f"{SOURCE_SYSTEM}:{row.event_id}:major_company_news:{company.entity_id}",
                    workspace_id=workspace_id,
                    entity_id=company.entity_id,
                    source_system=SOURCE_SYSTEM,
                    signal_type="major_company_news",
                    observed_at=_utc(row.published_at),
                    value={
                        "entity_name": company.name,
                        "symbols": [s.upper() for s in row.symbols],
                        "headline": row.headline,
                        "category": row.category.lower(),
                        "sentiment_score": row.sentiment_score,
                        "major_threshold_abs_sentiment": MAJOR_NEWS_MIN_ABS_SENTIMENT,
                        "disclaimer": MARKET_DISCLAIMER,
                    },
                    confidence=None,
                    provenance={
                        "source_ref": row.url or f"{base}/news/latest#{row.event_id}",
                        "upstream_ref": UPSTREAM_REF,
                        "upstream_event_id": row.event_id,
                        "news_source": row.source,
                        "is_sample": row.source.startswith("mock"),
                        "adapter_version": ADAPTER_VERSION,
                    },
                )
            )
    return result


class MarketPulseClient:
    def __init__(
        self,
        base_url: str,
        *,
        api_key: str | None = None,
        timeout: float = 10.0,
        transport: httpx.BaseTransport | None = None,
    ):
        self.base_url = base_url.rstrip("/")
        headers = {"X-API-Key": api_key} if api_key else {}
        self._client = httpx.Client(base_url=self.base_url, headers=headers, timeout=timeout, transport=transport)

    def close(self) -> None:
        self._client.close()

    def _paged(self, path: str, key: str) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        offset: int | None = 0
        for _ in range(MAX_PAGES):
            response = self._client.get(path, params={"offset": offset, "limit": PAGE_LIMIT})
            response.raise_for_status()
            body = response.json()
            if not isinstance(body, dict) or not isinstance(body.get(key), list):
                raise UpstreamError(f"GET {path} did not return {{{key}: [...]}}")
            items.extend(body[key])
            offset = (body.get("metadata") or {}).get("next_offset")
            if offset is None:
                break
        return items

    def fetch_anomalies(self) -> list[dict[str, Any]]:
        return self._paged("/anomalies", "anomalies")

    def fetch_news(self) -> list[dict[str, Any]]:
        return self._paged("/news/latest", "articles")
