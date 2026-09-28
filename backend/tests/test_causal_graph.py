"""vNext Phase G4: Causal Visibility Graph foundation."""

from datetime import UTC, datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from models import CausalEdge
from models.base import Base
from services.causal_graph import (
    CAUSAL_STATUSES,
    EDGE_TYPES,
    edges_for_entity,
    record_edge,
    trace_prompt_to_brand_mentions,
)

WORKSPACE_ID = "workspace-1"


@pytest.fixture
def db():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    try:
        Base.metadata.create_all(engine, tables=[CausalEdge.__table__])
    except SQLAlchemyError as exc:
        pytest.skip(f"SQLite cannot create causal_edges in this environment: {exc}")

    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_edge_types_and_causal_statuses_match_the_plan():
    assert EDGE_TYPES == {
        "PROMPT_PRODUCED_RESPONSE",
        "RESPONSE_MENTIONED_BRAND",
        "RESPONSE_CITED_SOURCE",
        "SOURCE_MAPS_TO_ASSET",
        "ASSET_CHANGED_BY_INTERVENTION",
        "INTERVENTION_TESTED_BY_EXPERIMENT",
        "EXPERIMENT_OBSERVED_METRIC",
        "SIGNAL_PRECEDED_CHANGE",
    }
    assert CAUSAL_STATUSES == {"OBSERVED", "CORRELATED", "SUPPORTED", "NOT_SUPPORTED", "INCONCLUSIVE"}


def test_record_edge_rejects_unknown_edge_type(db):
    with pytest.raises(ValueError, match="Unknown edge_type"):
        record_edge(
            db,
            workspace_id=WORKSPACE_ID,
            source_type="prompt",
            source_id="p1",
            target_type="observation",
            target_id="o1",
            edge_type="NOT_A_REAL_EDGE_TYPE",
            observed_at=datetime.now(UTC),
            evidence_refs=["o1"],
            confidence=1.0,
        )


def test_record_edge_rejects_unknown_causal_status(db):
    with pytest.raises(ValueError, match="Unknown causal_status"):
        record_edge(
            db,
            workspace_id=WORKSPACE_ID,
            source_type="prompt",
            source_id="p1",
            target_type="observation",
            target_id="o1",
            edge_type="PROMPT_PRODUCED_RESPONSE",
            observed_at=datetime.now(UTC),
            evidence_refs=["o1"],
            confidence=1.0,
            causal_status="DEFINITELY_TRUE",
        )


def test_record_edge_rejects_empty_evidence(db):
    with pytest.raises(ValueError, match="no evidence"):
        record_edge(
            db,
            workspace_id=WORKSPACE_ID,
            source_type="prompt",
            source_id="p1",
            target_type="observation",
            target_id="o1",
            edge_type="PROMPT_PRODUCED_RESPONSE",
            observed_at=datetime.now(UTC),
            evidence_refs=[],
            confidence=1.0,
        )


def test_record_edge_never_defaults_to_supported(db):
    """The plan's core rule: never infer SUPPORTED merely from an edge
    existing. record_edge's default causal_status is OBSERVED, not
    SUPPORTED, and nothing in this module ever passes SUPPORTED."""
    edge = record_edge(
        db,
        workspace_id=WORKSPACE_ID,
        source_type="prompt",
        source_id="p1",
        target_type="observation",
        target_id="o1",
        edge_type="PROMPT_PRODUCED_RESPONSE",
        observed_at=datetime.now(UTC),
        evidence_refs=["o1"],
        confidence=1.0,
    )
    assert edge.causal_status == "OBSERVED"


def test_edges_for_entity_finds_both_directions(db):
    now = datetime.now(UTC)
    record_edge(
        db,
        workspace_id=WORKSPACE_ID,
        source_type="prompt",
        source_id="p1",
        target_type="observation",
        target_id="o1",
        edge_type="PROMPT_PRODUCED_RESPONSE",
        observed_at=now,
        evidence_refs=["o1"],
        confidence=1.0,
    )
    record_edge(
        db,
        workspace_id=WORKSPACE_ID,
        source_type="observation",
        source_id="o1",
        target_type="workspace",
        target_id=WORKSPACE_ID,
        edge_type="RESPONSE_MENTIONED_BRAND",
        observed_at=now,
        evidence_refs=["o1"],
        confidence=0.9,
    )
    db.commit()

    as_source = edges_for_entity(db, workspace_id=WORKSPACE_ID, entity_type="prompt", entity_id="p1")
    assert len(as_source) == 1
    assert as_source[0].edge_type == "PROMPT_PRODUCED_RESPONSE"

    as_both = edges_for_entity(db, workspace_id=WORKSPACE_ID, entity_type="observation", entity_id="o1")
    assert len(as_both) == 2  # o1 is target of the first edge and source of the second


def test_edges_for_entity_respects_workspace_isolation(db):
    record_edge(
        db,
        workspace_id="other-workspace",
        source_type="prompt",
        source_id="p1",
        target_type="observation",
        target_id="o1",
        edge_type="PROMPT_PRODUCED_RESPONSE",
        observed_at=datetime.now(UTC),
        evidence_refs=["o1"],
        confidence=1.0,
    )
    db.commit()

    edges = edges_for_entity(db, workspace_id=WORKSPACE_ID, entity_type="prompt", entity_id="p1")
    assert edges == []


def test_trace_prompt_to_brand_mentions_returns_empty_with_no_data(db):
    result = trace_prompt_to_brand_mentions(db, workspace_id=WORKSPACE_ID, prompt_id="p-never-scanned")
    assert result == []


def test_trace_prompt_to_brand_mentions_follows_the_chain(db):
    now = datetime.now(UTC)
    # Two observations for this prompt: one mentioned the brand, one didn't.
    record_edge(
        db,
        workspace_id=WORKSPACE_ID,
        source_type="prompt",
        source_id="p1",
        target_type="observation",
        target_id="o1",
        edge_type="PROMPT_PRODUCED_RESPONSE",
        observed_at=now,
        evidence_refs=["o1"],
        confidence=1.0,
    )
    record_edge(
        db,
        workspace_id=WORKSPACE_ID,
        source_type="prompt",
        source_id="p1",
        target_type="observation",
        target_id="o2",
        edge_type="PROMPT_PRODUCED_RESPONSE",
        observed_at=now,
        evidence_refs=["o2"],
        confidence=1.0,
    )
    record_edge(
        db,
        workspace_id=WORKSPACE_ID,
        source_type="observation",
        source_id="o1",
        target_type="workspace",
        target_id=WORKSPACE_ID,
        edge_type="RESPONSE_MENTIONED_BRAND",
        observed_at=now,
        evidence_refs=["o1"],
        confidence=0.9,
    )
    # No RESPONSE_MENTIONED_BRAND edge for o2 — that observation didn't
    # mention the brand.
    db.commit()

    chain = trace_prompt_to_brand_mentions(db, workspace_id=WORKSPACE_ID, prompt_id="p1")
    edge_types = sorted(e.edge_type for e in chain)
    assert edge_types == ["PROMPT_PRODUCED_RESPONSE", "PROMPT_PRODUCED_RESPONSE", "RESPONSE_MENTIONED_BRAND"]
