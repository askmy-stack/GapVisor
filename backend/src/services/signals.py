"""ExternalSignal contract + ingest (vNext plan section 5.3 and Phase G7).

Every optional integration (social-signal-pipeline, StartupIntel,
MarketPulse) maps its own output into `ExternalSignalEnvelope` — the one
shared, versioned contract — and goes through `ingest_signals()`. GapVisor
never consumes another system's internal state directly.

Ingest is deliberately strict about *whose* signal it is: the envelope's
workspace must be the caller's, and its entity must be the workspace's own
brand or one of its tracked competitors. A signal about an entity GapVisor
doesn't track is rejected, not stored against a guess.

Ingesting a signal makes no causal claim. Linking it to a visibility change
happens later, and only ever as a CORRELATED causal edge.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Competitor, ExternalSignal, Workspace

ENVELOPE_SCHEMA_VERSION = "1.0"
_SIGNAL_TYPE_PATTERN = re.compile(r"^[a-z][a-z0-9_]{2,63}$")


class ExternalSignalEnvelope(BaseModel):
    schema_version: Literal["1.0"] = ENVELOPE_SCHEMA_VERSION
    signal_id: str = Field(min_length=1, max_length=255)
    workspace_id: str
    entity_id: str
    source_system: str = Field(min_length=1, max_length=64)
    signal_type: str
    observed_at: datetime
    value: dict[str, Any] = Field(default_factory=dict)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    provenance: dict[str, Any]

    @field_validator("signal_type")
    @classmethod
    def _signal_type_shape(cls, v: str) -> str:
        if not _SIGNAL_TYPE_PATTERN.match(v):
            raise ValueError("signal_type must be lower_snake_case, 3-64 chars")
        return v

    @field_validator("provenance")
    @classmethod
    def _provenance_has_source_ref(cls, v: dict[str, Any]) -> dict[str, Any]:
        if not v.get("source_ref"):
            raise ValueError("provenance.source_ref is required — a signal must say where it came from")
        return v


@dataclass(frozen=True)
class TrackedEntity:
    """An entity an adapter may attribute a signal to. The brand uses the
    workspace id as its entity_id; competitors use their own row id."""

    entity_id: str
    name: str


def tracked_entities_for_workspace(db: Session, *, workspace_id: str) -> list[TrackedEntity]:
    workspace = db.get(Workspace, workspace_id)
    if workspace is None:
        return []
    entities = [TrackedEntity(entity_id=workspace.id, name=workspace.brand_name)]
    for competitor in db.scalars(
        select(Competitor).where(
            Competitor.workspace_id == workspace_id,
            Competitor.archived_at.is_(None),
            Competitor.is_brand.is_(False),
        )
    ).all():
        entities.append(TrackedEntity(entity_id=competitor.id, name=competitor.name))
    return entities


@dataclass(frozen=True)
class TrackedCompany:
    """A tracked entity with the identifiers company-data adapters join on
    (StartupIntel by domain, MarketPulse by ticker)."""

    entity_id: str
    name: str
    domains: tuple[str, ...] = ()
    ticker_symbol: str | None = None


def normalize_domain(value: str | None) -> str | None:
    if not value:
        return None
    domain = value.strip().lower()
    domain = re.sub(r"^[a-z][a-z0-9+.-]*://", "", domain)
    domain = domain.split("/", 1)[0].split(":", 1)[0]
    domain = domain.removeprefix("www.")
    return domain or None


def tracked_companies_for_workspace(db: Session, *, workspace_id: str) -> list[TrackedCompany]:
    """The brand (workspace id; its brand_domains plus the is_brand
    competitor row's domain/ticker) and each active non-brand competitor."""
    workspace = db.get(Workspace, workspace_id)
    if workspace is None:
        return []
    competitors = db.scalars(
        select(Competitor).where(Competitor.workspace_id == workspace_id, Competitor.archived_at.is_(None))
    ).all()

    brand_domains = {normalize_domain(d) for d in (workspace.brand_domains or [])}
    brand_ticker: str | None = None
    companies: list[TrackedCompany] = []
    for c in competitors:
        ticker = c.ticker_symbol.strip().upper() if c.ticker_symbol else None
        if c.is_brand:
            brand_domains.add(normalize_domain(c.domain))
            brand_ticker = brand_ticker or ticker
            continue
        domain = normalize_domain(c.domain)
        companies.append(
            TrackedCompany(entity_id=c.id, name=c.name, domains=(domain,) if domain else (), ticker_symbol=ticker)
        )
    brand_domains.discard(None)
    companies.insert(
        0,
        TrackedCompany(
            entity_id=workspace.id,
            name=workspace.brand_name,
            domains=tuple(sorted(brand_domains)),
            ticker_symbol=brand_ticker,
        ),
    )
    return companies


@dataclass
class IngestReport:
    accepted: int = 0
    duplicates: int = 0
    rejected: list[dict[str, str]] = field(default_factory=list)
    signal_ids: list[str] = field(default_factory=list)


def _entity_type_for(db: Session, *, workspace_id: str, entity_id: str) -> str | None:
    if entity_id == workspace_id:
        return "brand"
    competitor = db.get(Competitor, entity_id)
    if competitor is not None and competitor.workspace_id == workspace_id and competitor.archived_at is None:
        return "brand" if competitor.is_brand else "competitor"
    return None


def ingest_signals(
    db: Session,
    *,
    workspace_id: str,
    envelopes: list[ExternalSignalEnvelope],
) -> IngestReport:
    """Store each valid, not-yet-seen envelope. Idempotent: an envelope
    whose (source_system, signal_id) already exists for this workspace —
    or repeats earlier in the same batch — counts as a duplicate."""
    report = IngestReport()
    seen_in_batch: set[tuple[str, str]] = set()

    for env in envelopes:
        key = (env.source_system, env.signal_id)
        if env.workspace_id != workspace_id:
            report.rejected.append({"signal_id": env.signal_id, "reason": "workspace_mismatch"})
            continue

        entity_type = _entity_type_for(db, workspace_id=workspace_id, entity_id=env.entity_id)
        if entity_type is None:
            report.rejected.append({"signal_id": env.signal_id, "reason": "unknown_entity"})
            continue

        if key in seen_in_batch:
            report.duplicates += 1
            continue
        existing = db.scalar(
            select(ExternalSignal.id).where(
                ExternalSignal.workspace_id == workspace_id,
                ExternalSignal.source_system == env.source_system,
                ExternalSignal.external_signal_id == env.signal_id,
            )
        )
        if existing is not None:
            report.duplicates += 1
            seen_in_batch.add(key)
            continue

        row = ExternalSignal(
            workspace_id=workspace_id,
            entity_type=entity_type,
            entity_id=env.entity_id,
            source_system=env.source_system,
            signal_type=env.signal_type,
            external_signal_id=env.signal_id,
            observed_at=env.observed_at,
            value=env.value,
            confidence=env.confidence,
            provenance=env.provenance,
            schema_version=env.schema_version,
        )
        db.add(row)
        db.flush()
        seen_in_batch.add(key)
        report.accepted += 1
        report.signal_ids.append(row.id)

    return report
