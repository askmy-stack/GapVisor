"""vNext Phase G7: ExternalSignal contract + social-signal-pipeline adapter."""

import copy
import json
from datetime import UTC, datetime
from pathlib import Path

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from adapters.external_signals import social_signal_pipeline as ssp
from models import Competitor, ExternalSignal
from models.base import Base
from services.signals import ExternalSignalEnvelope, TrackedEntity, ingest_signals

FIXTURE = Path(__file__).parent / "fixtures" / "social_signal_pipeline" / "enriched_sample.jsonl"
WORKSPACE_ID = "workspace-1"
KONG_ID = "competitor-kong"
POSTMAN_ID = "competitor-postman"
TRACKED = [
    TrackedEntity(entity_id=WORKSPACE_ID, name="Northstar"),
    TrackedEntity(entity_id=KONG_ID, name="Kong"),
    TrackedEntity(entity_id=POSTMAN_ID, name="Postman"),
]


def _records() -> list[dict]:
    return [json.loads(line) for line in FIXTURE.read_text().splitlines() if line.strip()]


def _record(tweet_id: str) -> dict:
    return copy.deepcopy(next(r for r in _records() if r["tweet"]["tweet_id"] == tweet_id))


# ---------------------------------------------------------------------------
# Adapter, against real social-signal-pipeline output
# ---------------------------------------------------------------------------


def test_adapter_emits_only_honestly_supported_signals_from_real_output():
    result = ssp.map_enriched_records(_records(), workspace_id=WORKSPACE_ID, tracked=TRACKED)

    emitted = {(e.provenance["tweet_id"], e.signal_type, e.entity_id) for e in result.envelopes}
    assert emitted == {
        ("gv-sample-2", "product_launch_discussion", KONG_ID),
        ("gv-sample-3", "community_complaints", WORKSPACE_ID),
    }
    skipped = {s["record"]: s["reason"] for s in result.skipped}
    # gv-sample-1 mentions Kong but the pipeline classified it as plain news.
    assert skipped == {
        "gv-sample-1": "no_supported_signal_type",
        "gv-sample-4": "no_supported_signal_type",
    }


def test_adapter_resolves_entities_from_text_when_upstream_entities_miss_them():
    """The pipeline's local provider only knows 21 hard-coded entity names,
    none of them the workspace's; resolution falls back to the tweet text."""
    result = ssp.map_enriched_records([_record("gv-sample-2")], workspace_id=WORKSPACE_ID, tracked=TRACKED)
    assert result.envelopes[0].value["matched_by"] == "text"
    assert result.envelopes[0].value["entity_name"] == "Kong"


def test_adapter_skips_supported_type_with_no_tracked_entity():
    record = _record("gv-sample-2")
    record["tweet"]["text"] = "Sample fixture: a product update from a company we do not track."
    result = ssp.map_enriched_records([record], workspace_id=WORKSPACE_ID, tracked=TRACKED)
    assert result.envelopes == []
    assert result.skipped == [{"record": "gv-sample-2", "reason": "no_tracked_entity"}]


def test_adapter_confidence_reflects_sample_and_local_enrichment():
    result = ssp.map_enriched_records([_record("gv-sample-2")], workspace_id=WORKSPACE_ID, tracked=TRACKED)
    # source_confidence="sample" -> 0.3, and local enrichment is capped at 0.5.
    assert result.envelopes[0].confidence == 0.3


def test_adapter_halves_confidence_when_upstream_requests_human_review():
    """gv-sample-3 is flagged requires_human_review by the pipeline itself."""
    result = ssp.map_enriched_records([_record("gv-sample-3")], workspace_id=WORKSPACE_ID, tracked=TRACKED)
    assert result.envelopes[0].confidence == 0.15


def test_adapter_preserves_provenance():
    env = ssp.map_enriched_records([_record("gv-sample-3")], workspace_id=WORKSPACE_ID, tracked=TRACKED).envelopes[0]
    assert env.provenance["source_ref"] == "https://twitter.com/gv_demo_ops/status/gv-sample-3"
    assert env.provenance["is_sample"] is True
    assert env.provenance["upstream_schema_version"] == "1.0"
    assert env.provenance["ai_provider"] == "local"
    assert env.source_system == "social-signal-pipeline"
    assert env.observed_at == datetime(2026, 9, 22, 16, 45, tzinfo=UTC)


def test_adapter_rejects_unsupported_upstream_schema_version():
    record = _record("gv-sample-2")
    record["quality"]["schema_version"] = "2.0"
    result = ssp.map_enriched_records([record], workspace_id=WORKSPACE_ID, tracked=TRACKED)
    assert result.envelopes == []
    assert result.skipped[0]["reason"] == "unsupported_upstream_schema_version"


def test_adapter_rejects_records_that_failed_upstream_validation():
    record = _record("gv-sample-2")
    record["quality"]["validated"] = False
    result = ssp.map_enriched_records([record], workspace_id=WORKSPACE_ID, tracked=TRACKED)
    assert result.skipped[0]["reason"] == "failed_upstream_validation"


def test_signal_ids_are_deterministic_for_idempotent_reingest():
    first = ssp.map_enriched_records(_records(), workspace_id=WORKSPACE_ID, tracked=TRACKED)
    second = ssp.map_enriched_records(_records(), workspace_id=WORKSPACE_ID, tracked=TRACKED)
    assert [e.signal_id for e in first.envelopes] == [e.signal_id for e in second.envelopes]


# ---------------------------------------------------------------------------
# Envelope contract
# ---------------------------------------------------------------------------


def _envelope(**overrides) -> ExternalSignalEnvelope:
    data = {
        "signal_id": "sig-1",
        "workspace_id": WORKSPACE_ID,
        "entity_id": KONG_ID,
        "source_system": "test",
        "signal_type": "product_launch_discussion",
        "observed_at": "2026-09-20T12:00:00Z",
        "confidence": 0.5,
        "provenance": {"source_ref": "test:1"},
    }
    data.update(overrides)
    return ExternalSignalEnvelope(**data)


def test_envelope_requires_provenance_source_ref():
    with pytest.raises(ValidationError, match="source_ref"):
        _envelope(provenance={})


def test_envelope_rejects_malformed_signal_type():
    with pytest.raises(ValidationError, match="signal_type"):
        _envelope(signal_type="Not A Type")


def test_envelope_rejects_out_of_range_confidence():
    with pytest.raises(ValidationError):
        _envelope(confidence=1.5)


def test_envelope_allows_null_confidence():
    assert _envelope(confidence=None).confidence is None


# ---------------------------------------------------------------------------
# ingest_signals (sqlite-backed)
# ---------------------------------------------------------------------------


@pytest.fixture
def db():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    try:
        Base.metadata.create_all(engine, tables=[Competitor.__table__, ExternalSignal.__table__])
    except SQLAlchemyError as exc:
        pytest.skip(f"SQLite cannot create the signal tables in this environment: {exc}")
    session = sessionmaker(bind=engine)()
    session.add(Competitor(id=KONG_ID, workspace_id=WORKSPACE_ID, name="Kong", logo_letter="K"))
    session.add(Competitor(id="competitor-elsewhere", workspace_id="other-workspace", name="Tyk", logo_letter="T"))
    session.commit()
    yield session
    session.close()


def test_ingest_accepts_brand_and_competitor_signals(db):
    report = ingest_signals(
        db,
        workspace_id=WORKSPACE_ID,
        envelopes=[_envelope(signal_id="a"), _envelope(signal_id="b", entity_id=WORKSPACE_ID)],
    )
    db.commit()
    assert report.accepted == 2
    stored = {s.external_signal_id: s.entity_type for s in db.query(ExternalSignal).all()}
    assert stored == {"a": "competitor", "b": "brand"}


def test_ingest_rejects_other_workspaces_and_untracked_entities(db):
    report = ingest_signals(
        db,
        workspace_id=WORKSPACE_ID,
        envelopes=[
            _envelope(signal_id="mismatch", workspace_id="other-workspace"),
            _envelope(signal_id="unknown", entity_id="not-a-real-competitor"),
            # A real competitor, but tracked by a different workspace.
            _envelope(signal_id="foreign", entity_id="competitor-elsewhere"),
        ],
    )
    assert report.accepted == 0
    assert {r["signal_id"]: r["reason"] for r in report.rejected} == {
        "mismatch": "workspace_mismatch",
        "unknown": "unknown_entity",
        "foreign": "unknown_entity",
    }


def test_ingest_is_idempotent_across_and_within_batches(db):
    first = ingest_signals(db, workspace_id=WORKSPACE_ID, envelopes=[_envelope(), _envelope()])
    db.commit()
    second = ingest_signals(db, workspace_id=WORKSPACE_ID, envelopes=[_envelope()])
    db.commit()
    assert (first.accepted, first.duplicates) == (1, 1)
    assert (second.accepted, second.duplicates) == (0, 1)
    assert db.query(ExternalSignal).count() == 1


def test_real_fixture_end_to_end_through_ingest(db):
    mapping = ssp.map_enriched_records(_records(), workspace_id=WORKSPACE_ID, tracked=TRACKED)
    report = ingest_signals(db, workspace_id=WORKSPACE_ID, envelopes=mapping.envelopes)
    db.commit()
    assert report.accepted == 2
    assert report.rejected == []
