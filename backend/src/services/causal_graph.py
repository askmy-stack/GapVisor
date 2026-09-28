"""Causal Visibility Graph (vNext plan section 10): a graph-shaped
relational model in Postgres, not a graph database.

Only two of the plan's eight listed edge types are actually written today,
and both only ever as `causal_status="OBSERVED"` — a structural fact, not a
causal claim:

- `PROMPT_PRODUCED_RESPONSE` (prompt -> observation): written for every
  observation `record_observation()` creates.
- `RESPONSE_MENTIONED_BRAND` (observation -> workspace): written only when
  that observation's extraction found the brand.

The other six (`RESPONSE_CITED_SOURCE`, `SOURCE_MAPS_TO_ASSET`,
`ASSET_CHANGED_BY_INTERVENTION`, `INTERVENTION_TESTED_BY_EXPERIMENT`,
`EXPERIMENT_OBSERVED_METRIC`, `SIGNAL_PRECEDED_CHANGE`) all depend on data
that doesn't exist yet — citations, source assets, interventions, and
external signals are later phases (G5+/G7+) — so nothing writes them.
`EDGE_TYPES` lists all eight so validation and the eventual graph UI don't
need another migration to recognize them once that data exists; it isn't a
claim that all eight are populated.

`causal_status` is never set to `SUPPORTED`/`NOT_SUPPORTED` by anything in
this module — the plan is explicit that causality must never be inferred
merely from an edge existing or from time order. Those two statuses only
make sense once an Experiment resolves (G6), by code that lives there.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from models import CausalEdge

EDGE_TYPES = frozenset(
    {
        "PROMPT_PRODUCED_RESPONSE",
        "RESPONSE_MENTIONED_BRAND",
        "RESPONSE_CITED_SOURCE",
        "SOURCE_MAPS_TO_ASSET",
        "ASSET_CHANGED_BY_INTERVENTION",
        "INTERVENTION_TESTED_BY_EXPERIMENT",
        "EXPERIMENT_OBSERVED_METRIC",
        "SIGNAL_PRECEDED_CHANGE",
    }
)

CAUSAL_STATUSES = frozenset({"OBSERVED", "CORRELATED", "SUPPORTED", "NOT_SUPPORTED", "INCONCLUSIVE"})


def record_edge(
    db: Session,
    *,
    workspace_id: str,
    source_type: str,
    source_id: str,
    target_type: str,
    target_id: str,
    edge_type: str,
    observed_at: datetime,
    evidence_refs: list[str],
    confidence: float,
    causal_status: str = "OBSERVED",
) -> CausalEdge:
    if edge_type not in EDGE_TYPES:
        raise ValueError(f"Unknown edge_type {edge_type!r}; must be one of {sorted(EDGE_TYPES)}")
    if causal_status not in CAUSAL_STATUSES:
        raise ValueError(f"Unknown causal_status {causal_status!r}; must be one of {sorted(CAUSAL_STATUSES)}")
    if not evidence_refs:
        raise ValueError("An edge with no evidence isn't an edge, it's a guess — evidence_refs is required")

    edge = CausalEdge(
        workspace_id=workspace_id,
        source_type=source_type,
        source_id=source_id,
        target_type=target_type,
        target_id=target_id,
        edge_type=edge_type,
        observed_at=observed_at,
        evidence_refs=list(evidence_refs),
        confidence=confidence,
        causal_status=causal_status,
    )
    db.add(edge)
    return edge


def edges_for_entity(
    db: Session,
    *,
    workspace_id: str,
    entity_type: str,
    entity_id: str,
) -> list[CausalEdge]:
    """Every edge where this entity is the source or the target."""
    return list(
        db.scalars(
            select(CausalEdge)
            .where(
                CausalEdge.workspace_id == workspace_id,
                or_(
                    (CausalEdge.source_type == entity_type) & (CausalEdge.source_id == entity_id),
                    (CausalEdge.target_type == entity_type) & (CausalEdge.target_id == entity_id),
                ),
            )
            .order_by(CausalEdge.observed_at.desc())
        ).all()
    )


def trace_prompt_to_brand_mentions(
    db: Session,
    *,
    workspace_id: str,
    prompt_id: str,
) -> list[CausalEdge]:
    """The currently-populated slice of the full evidence chain from the
    plan's section 3.3 (Intent -> Prompt -> Surface -> Response ->
    Recommendation -> Claim -> Citation -> Source -> ...): every
    PROMPT_PRODUCED_RESPONSE edge from this prompt, plus every
    RESPONSE_MENTIONED_BRAND edge from each of those responses. Partial by
    design — later phases extend this chain as citation/asset/experiment
    data starts existing, not by changing this function's contract, only
    what it finds.
    """
    produced = list(
        db.scalars(
            select(CausalEdge).where(
                CausalEdge.workspace_id == workspace_id,
                CausalEdge.source_type == "prompt",
                CausalEdge.source_id == prompt_id,
                CausalEdge.edge_type == "PROMPT_PRODUCED_RESPONSE",
            )
        ).all()
    )
    if not produced:
        return []

    observation_ids = [e.target_id for e in produced]
    mentioned = list(
        db.scalars(
            select(CausalEdge).where(
                CausalEdge.workspace_id == workspace_id,
                CausalEdge.source_type == "observation",
                CausalEdge.source_id.in_(observation_ids),
                CausalEdge.edge_type == "RESPONSE_MENTIONED_BRAND",
            )
        ).all()
    )
    return produced + mentioned
