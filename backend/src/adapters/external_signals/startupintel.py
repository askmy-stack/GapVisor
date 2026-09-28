"""Adapter: askmy-stack/startupintel -> ExternalSignalEnvelope.

Built against that repo's real API at commit 13b0e40 and tested against
responses recorded from it (tests/fixtures/startupintel/):
`GET /startup?page=&page_size=` returns
`{"items": [StartupResponse], "total": int}`, where StartupResponse is
name, domain, crunchbase_id, founded_year, industry, stage, hq_city,
hq_country, employee_count, total_funding_usd, last_funding_date, id,
created_at, updated_at (`startupintel/api/schemas.py`).

What it can honestly support is one signal type, `funding_event`: the
company's `last_funding_date`. Two limits are carried into every signal:

- `total_funding_usd` is **cumulative**. The size of that round is not in
  the response, so the adapter never reports one.
- The record is a snapshot, so hiring, growth and product-launch signals
  would be invented trends. They are not emitted. Neither are
  `/startup/{id}/stress` or any of the bot scores, which are StartupIntel's
  model outputs, not observations.

Companies are matched to tracked entities by normalized domain; names are
too ambiguous to join on.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

import httpx
from pydantic import BaseModel, ValidationError

from services.signals import ExternalSignalEnvelope, TrackedCompany, normalize_domain

SOURCE_SYSTEM = "startupintel"
UPSTREAM_REF = "askmy-stack/startupintel@13b0e40"
ADAPTER_VERSION = 1
PAGE_SIZE = 100  # the upstream maximum (`le=100`)
MAX_PAGES = 50


class UpstreamError(RuntimeError):
    """The upstream responded, but not with the shape this adapter was built for."""


class _Startup(BaseModel):
    id: str
    name: str
    domain: str
    crunchbase_id: str | None = None
    stage: str | None = None
    employee_count: int | None = None
    total_funding_usd: float | None = None
    last_funding_date: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class MappingResult:
    envelopes: list[ExternalSignalEnvelope] = field(default_factory=list)
    skipped: list[dict[str, str]] = field(default_factory=list)


def _utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def map_startups(
    items: list[dict[str, Any]],
    *,
    workspace_id: str,
    tracked: list[TrackedCompany],
    source_base_url: str,
) -> MappingResult:
    by_domain = {d: company for company in tracked for d in company.domains}
    result = MappingResult()
    base = source_base_url.rstrip("/")

    for raw in items:
        ref = str(raw.get("id", "?")) if isinstance(raw, dict) else "?"
        try:
            startup = _Startup.model_validate(raw)
        except ValidationError:
            result.skipped.append({"record": ref, "reason": "malformed_record"})
            continue

        company = by_domain.get(normalize_domain(startup.domain))
        if company is None:
            result.skipped.append({"record": startup.id, "reason": "no_tracked_entity"})
            continue
        if startup.last_funding_date is None:
            result.skipped.append({"record": startup.id, "reason": "no_funding_date"})
            continue

        funded_at = _utc(startup.last_funding_date)
        result.envelopes.append(
            ExternalSignalEnvelope(
                signal_id=f"{SOURCE_SYSTEM}:{startup.id}:funding_event:{funded_at.date().isoformat()}:{company.entity_id}",
                workspace_id=workspace_id,
                entity_id=company.entity_id,
                source_system=SOURCE_SYSTEM,
                signal_type="funding_event",
                observed_at=funded_at,
                value={
                    "entity_name": company.name,
                    "upstream_name": startup.name,
                    "matched_by": "domain",
                    "stage": startup.stage,
                    "last_funding_date": funded_at.isoformat(),
                    "total_funding_usd_cumulative": startup.total_funding_usd,
                    "round_amount_usd": None,
                    "note": "Upstream reports cumulative funding only; the size of this round is unknown.",
                },
                # StartupIntel publishes no confidence for these fields, and
                # GapVisor has nothing to derive one from.
                confidence=None,
                provenance={
                    "source_ref": f"{base}/startup/{startup.id}",
                    "upstream_ref": UPSTREAM_REF,
                    "upstream_id": startup.id,
                    "crunchbase_id": startup.crunchbase_id,
                    "upstream_updated_at": startup.updated_at.isoformat() if startup.updated_at else None,
                    "adapter_version": ADAPTER_VERSION,
                },
            )
        )
    return result


class StartupIntelClient:
    def __init__(self, base_url: str, *, timeout: float = 10.0, transport: httpx.BaseTransport | None = None):
        self.base_url = base_url.rstrip("/")
        self._client = httpx.Client(base_url=self.base_url, timeout=timeout, transport=transport)

    def close(self) -> None:
        self._client.close()

    def fetch_startups(self) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for page in range(1, MAX_PAGES + 1):
            response = self._client.get("/startup", params={"page": page, "page_size": PAGE_SIZE})
            response.raise_for_status()
            body = response.json()
            if not isinstance(body, dict) or not isinstance(body.get("items"), list) or not isinstance(body.get("total"), int):
                raise UpstreamError("GET /startup did not return {items: [...], total: int}")
            items.extend(body["items"])
            if not body["items"] or len(items) >= body["total"]:
                break
        return items
