"""vNext Phase G9: StartupIntel and MarketPulse adapters, against recorded responses."""

import copy
import json
from datetime import UTC, datetime
from pathlib import Path

import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from adapters.external_signals import marketpulse as mp
from adapters.external_signals import startupintel as si
from models import Competitor, ExternalSignal
from models.base import Base
from services.signals import TrackedCompany, ingest_signals, normalize_domain

FIXTURES = Path(__file__).parent / "fixtures"
WS = "workspace-1"
GATEWAY = "competitor-gateway"
UNFUNDED = "competitor-bootstrapped"
SI_BASE = "http://startupintel.test"
MP_BASE = "http://marketpulse.test"

SI_TRACKED = [
    TrackedCompany(entity_id=WS, name="Northstar", domains=("sample-testing.example",)),
    TrackedCompany(entity_id=GATEWAY, name="Gateway", domains=("sample-gateway.example",)),
    TrackedCompany(entity_id=UNFUNDED, name="Bootstrapped", domains=("sample-bootstrapped.example",)),
]
MP_TRACKED = [
    TrackedCompany(entity_id=WS, name="Northstar", ticker_symbol="DDOG"),
    TrackedCompany(entity_id=GATEWAY, name="Gateway", ticker_symbol="NET"),
]


def _load(*parts: str) -> dict:
    return json.loads(FIXTURES.joinpath(*parts).read_text())


def _startups() -> list[dict]:
    return _load("startupintel", "startup_list_page1.json")["items"] + _load("startupintel", "startup_list_page2.json")["items"]


def _anomalies() -> list[dict]:
    return _load("marketpulse", "anomalies_page.json")["anomalies"]


def _news() -> list[dict]:
    return _load("marketpulse", "news_latest_page.json")["articles"]


# ---------------------------------------------------------------------------
# StartupIntel
# ---------------------------------------------------------------------------


def _si_map(items=None, tracked=SI_TRACKED):
    return si.map_startups(items if items is not None else _startups(), workspace_id=WS, tracked=tracked, source_base_url=SI_BASE)


def test_startupintel_emits_funding_events_only_for_tracked_funded_companies():
    result = _si_map()
    assert {(e.entity_id, e.signal_type) for e in result.envelopes} == {(GATEWAY, "funding_event"), (WS, "funding_event")}
    by_name = {s["record"]: s["reason"] for s in result.skipped}
    reasons = sorted(by_name.values())
    assert reasons == ["no_funding_date", "no_tracked_entity"]


def test_startupintel_never_reports_a_round_amount():
    env = next(e for e in _si_map().envelopes if e.entity_id == GATEWAY)
    assert env.value["round_amount_usd"] is None
    assert env.value["total_funding_usd_cumulative"] == 62000000.0
    assert "cumulative" in env.value["note"]
    assert env.confidence is None
    assert env.observed_at == datetime(2026, 9, 12, tzinfo=UTC)


def test_startupintel_provenance_points_at_the_upstream_record():
    env = next(e for e in _si_map().envelopes if e.entity_id == GATEWAY)
    upstream_id = env.provenance["upstream_id"]
    assert env.provenance["source_ref"] == f"{SI_BASE}/startup/{upstream_id}"
    assert env.provenance["upstream_ref"] == si.UPSTREAM_REF
    assert env.signal_id == f"startupintel:{upstream_id}:funding_event:2026-09-12:{GATEWAY}"


def test_startupintel_matches_on_normalized_domain():
    tracked = [TrackedCompany(entity_id=GATEWAY, name="Gateway", domains=(normalize_domain("https://www.Sample-Gateway.example/about"),))]
    assert [e.entity_id for e in _si_map(tracked=tracked).envelopes] == [GATEWAY]


def test_startupintel_malformed_record_is_skipped_not_fatal():
    items = _startups()
    broken = copy.deepcopy(items[0])
    del broken["domain"]
    result = _si_map(items=[broken, *items])
    assert {"record": broken["id"], "reason": "malformed_record"} in result.skipped
    assert len(result.envelopes) == 2


def test_startupintel_naive_funding_date_is_read_as_utc():
    item = copy.deepcopy(next(i for i in _startups() if i["domain"] == "sample-gateway.example"))
    item["last_funding_date"] = "2026-09-12T00:00:00"
    assert _si_map(items=[item]).envelopes[0].observed_at.tzinfo is not None


def _si_transport(pages: dict[int, dict]):
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/startup"
        page = int(request.url.params["page"])
        return httpx.Response(200, json=pages.get(page, {"items": [], "total": 4}))

    return httpx.MockTransport(handler)


def test_startupintel_client_follows_pages_until_total():
    pages = {1: _load("startupintel", "startup_list_page1.json"), 2: _load("startupintel", "startup_list_page2.json")}
    client = si.StartupIntelClient(SI_BASE, transport=_si_transport(pages))
    assert len(client.fetch_startups()) == 4


def test_startupintel_client_rejects_an_unexpected_response_shape():
    client = si.StartupIntelClient(SI_BASE, transport=_si_transport({1: {"results": []}}))
    with pytest.raises(si.UpstreamError):
        client.fetch_startups()


def test_startupintel_client_surfaces_http_errors():
    transport = httpx.MockTransport(lambda request: httpx.Response(503, json={"detail": "down"}))
    with pytest.raises(httpx.HTTPStatusError):
        si.StartupIntelClient(SI_BASE, transport=transport).fetch_startups()


# ---------------------------------------------------------------------------
# MarketPulse
# ---------------------------------------------------------------------------


def _mp_kwargs():
    return {"workspace_id": WS, "tracked": MP_TRACKED, "source_base_url": MP_BASE}


def test_marketpulse_emits_only_medium_or_worse_anomalies():
    result = mp.map_anomalies(_anomalies(), **_mp_kwargs())
    assert [(e.entity_id, e.value["severity"]) for e in result.envelopes] == [(GATEWAY, "critical")]
    assert sorted(s["reason"] for s in result.skipped) == ["below_min_severity", "below_min_severity"]


def test_marketpulse_anomaly_carries_disclaimer_and_no_invented_confidence():
    env = mp.map_anomalies(_anomalies(), **_mp_kwargs()).envelopes[0]
    assert env.signal_type == "market_anomaly"
    assert env.value["disclaimer"] == mp.MARKET_DISCLAIMER
    assert "Not financial advice" in env.value["disclaimer"]
    assert env.confidence is None
    assert env.observed_at.tzinfo is not None  # upstream timestamps are naive UTC
    assert env.provenance["source_ref"] == f"{MP_BASE}/anomalies/{env.provenance['upstream_event_id']}"


def test_marketpulse_major_news_uses_gapvisors_threshold():
    result = mp.map_news(_news(), **_mp_kwargs())
    emitted = sorted((e.entity_id, e.value["headline"]) for e in result.envelopes)
    assert emitted == [
        (GATEWAY, "Analysts upgrade NET citing strong cloud growth"),
        (WS, "Analysts upgrade DDOG citing strong cloud growth"),
        (WS, "DDOG beats earnings expectations, shares jump in pre-market"),
    ]
    reasons = sorted({s["reason"] for s in result.skipped})
    assert reasons == ["below_major_threshold", "not_company_news"]


def test_marketpulse_news_flags_mock_sources_as_sample():
    env = mp.map_news(_news(), **_mp_kwargs()).envelopes[0]
    assert env.provenance["is_sample"] is True
    assert env.provenance["news_source"] == "mock_company_wire"


def test_marketpulse_untracked_ticker_is_skipped():
    tracked = [TrackedCompany(entity_id=GATEWAY, name="Gateway", ticker_symbol="NET")]
    result = mp.map_news(_news(), workspace_id=WS, tracked=tracked, source_base_url=MP_BASE)
    assert all(e.entity_id == GATEWAY for e in result.envelopes)
    assert any(s["reason"] == "no_tracked_entity" for s in result.skipped)


def test_marketpulse_malformed_and_unknown_severity_rows_are_skipped():
    rows = _anomalies()
    missing = {k: v for k, v in rows[1].items() if k != "z_score"}
    weird = {**rows[1], "event_id": "weird", "severity": "apocalyptic"}
    result = mp.map_anomalies([missing, weird], **_mp_kwargs())
    assert [s["reason"] for s in result.skipped] == ["malformed_record", "unknown_severity"]


def _mp_transport(seen_headers: list, *, page_size: int = 4):
    """Serves the recorded rows with MarketPulse's own `_paginate` metadata."""
    data = {"/anomalies": ("anomalies", _anomalies()), "/news/latest": ("articles", _news())}

    def handler(request: httpx.Request) -> httpx.Response:
        seen_headers.append(request.headers.get("X-API-Key"))
        key, rows = data[request.url.path]
        offset = int(request.url.params["offset"])
        page = rows[offset : offset + page_size + 1]
        has_next = len(page) > page_size
        return httpx.Response(
            200,
            json={
                key: page[:page_size],
                "metadata": {"offset": offset, "limit": page_size, "next_offset": offset + page_size if has_next else None},
            },
        )

    return httpx.MockTransport(handler)


def test_marketpulse_client_pages_by_next_offset_and_sends_api_key():
    seen: list = []
    client = mp.MarketPulseClient(MP_BASE, api_key="k", transport=_mp_transport(seen))
    assert len(client.fetch_news()) == len(_news())
    assert len(client.fetch_anomalies()) == len(_anomalies())
    assert set(seen) == {"k"}
    assert len(seen) > 2  # more than one page each


def test_marketpulse_client_without_key_sends_no_header():
    seen: list = []
    mp.MarketPulseClient(MP_BASE, transport=_mp_transport(seen)).fetch_anomalies()
    assert set(seen) == {None}


def test_marketpulse_client_surfaces_the_upstream_500():
    """What the per-symbol endpoints really return at the pinned commit."""
    transport = httpx.MockTransport(lambda request: httpx.Response(500, text="Internal Server Error"))
    with pytest.raises(httpx.HTTPStatusError):
        mp.MarketPulseClient(MP_BASE, transport=transport).fetch_news()


def test_marketpulse_client_rejects_non_json():
    transport = httpx.MockTransport(lambda request: httpx.Response(200, text="<html>"))
    with pytest.raises(ValueError):
        mp.MarketPulseClient(MP_BASE, transport=transport).fetch_anomalies()


# ---------------------------------------------------------------------------
# Through the shared ingest contract
# ---------------------------------------------------------------------------


@pytest.fixture
def db():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    try:
        Base.metadata.create_all(engine, tables=[Competitor.__table__, ExternalSignal.__table__])
    except SQLAlchemyError as exc:
        pytest.skip(f"SQLite cannot create the signal tables in this environment: {exc}")
    session = sessionmaker(bind=engine)()
    session.add(Competitor(id=GATEWAY, workspace_id=WS, name="Gateway", logo_letter="G"))
    session.add(Competitor(id=UNFUNDED, workspace_id=WS, name="Bootstrapped", logo_letter="B"))
    session.commit()
    yield session
    session.close()


def test_both_adapters_ingest_idempotently(db):
    envelopes = (
        _si_map().envelopes
        + mp.map_anomalies(_anomalies(), **_mp_kwargs()).envelopes
        + mp.map_news(_news(), **_mp_kwargs()).envelopes
    )
    first = ingest_signals(db, workspace_id=WS, envelopes=envelopes)
    db.commit()
    second = ingest_signals(db, workspace_id=WS, envelopes=envelopes)
    db.commit()
    assert (first.accepted, first.rejected) == (6, [])
    assert (second.accepted, second.duplicates) == (0, 6)
    stored = sorted((s.source_system, s.signal_type) for s in db.query(ExternalSignal).all())
    assert stored == [
        ("marketpulse", "major_company_news"),
        ("marketpulse", "major_company_news"),
        ("marketpulse", "major_company_news"),
        ("marketpulse", "market_anomaly"),
        ("startupintel", "funding_event"),
        ("startupintel", "funding_event"),
    ]


def test_normalize_domain():
    assert normalize_domain("HTTPS://www.Example.com:443/path") == "example.com"
    assert normalize_domain("  ") is None
    assert normalize_domain(None) is None
