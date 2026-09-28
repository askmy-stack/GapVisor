# vNext Phase G9 — StartupIntel and MarketPulse adapters

Delivered against `GAPVISOR_VNEXT_AGENT_PLAN.md` Phase G9: optional
company-intelligence and market-context signals, mapped into the existing
`ExternalSignalEnvelope` contract and fed to `ingest_signals()`.

- Both adapters are off by default.
- Neither is a dependency of the core loop.
- Neither makes a causal claim. G8's investigation can only link their
  signals as `CORRELATED`.

## Built against the real upstreams, and recorded from them

Both services were installed from source and run locally against throwaway
Postgres databases, which were dropped afterwards. The test fixtures are
genuine responses from their own FastAPI apps. Each fixture directory has a
README that says exactly how it was produced.

| | StartupIntel | MarketPulse |
|---|---|---|
| Pinned | `askmy-stack/startupintel@13b0e40` | `askmy-stack/Market-Pulse-MCP@3792ac6` |
| Endpoints used | `GET /startup?page=&page_size=` | `GET /anomalies`, `GET /news/latest` (offset + `next_offset`) |
| Auth | none | optional `X-API-Key` |
| Joined to GapVisor by | normalized **domain** (existing column) | **ticker** (new nullable `competitors.ticker_symbol`, migration `010`) |
| Signals emitted | `funding_event` | `market_anomaly`, `major_company_news` |

### Found by recording against the real services

At `3792ac6`, MarketPulse's `GET /anomalies/symbol/{s}` and
`GET /news/company/{s}` return **HTTP 500**. They serialize ORM rows after
the session closes, which raises `DetachedInstanceError`.

A schema-only adapter would have called exactly those per-symbol endpoints and
broken. This one pages the two list endpoints that work, and filters to tracked
tickers itself. `/explain` is never called, because it writes to MarketPulse's
database.

## What is emitted, and what deliberately isn't

**StartupIntel → `funding_event`**

- `observed_at` is the company's `last_funding_date`.
- The upstream `total_funding_usd` is **cumulative**. It is stored as
  `total_funding_usd_cumulative`, with `round_amount_usd: null` and a note;
  the adapter never presents it as a round size.
- Not emitted: hiring, growth, product-launch or GitHub signals, since a
  snapshot record would make those invented trends. `/stress` and the bot
  scores aren't used either, because they are StartupIntel's model outputs,
  not observations.

**MarketPulse → `market_anomaly`**

- Severity `medium` or above; `low` is skipped as noise.
- Carries the upstream z-score, volume ratio, price change and description.

**MarketPulse → `major_company_news`**

- Company or earnings news naming a tracked ticker, with |sentiment| ≥ 0.5.
  "Major" is GapVisor's documented threshold, not an upstream concept.
- Mock sources are flagged `is_sample`.
- `news_volume_spike` is not emitted, since it would be a trend built from
  individual events.

**Every MarketPulse signal** carries `MARKET_DISCLAIMER`: market context only,
not financial advice, not a price prediction, and correlation rather than
causation.

**Confidence is `null` for all three signal types.** Neither upstream publishes
one, and GapVisor has nothing honest to derive one from. The contract allows
null; G8 then uses 0.0 as the edge confidence.

Every skipped record comes back with a reason, so a sync can be audited:

- `no_tracked_entity`
- `no_funding_date`
- `malformed_record`
- `below_min_severity`
- `unknown_severity`
- `not_company_news`
- `below_major_threshold`

## Brand and competitor mapping

`services/signals.py::tracked_companies_for_workspace()`:

- **The brand** keeps entity id = workspace id. It is matched on
  `Workspace.brand_domains` plus the `is_brand` competitor row's domain and
  ticker.
- **Competitors** are matched on their own domain and ticker.

`PATCH /api/v1/competitors/{id}` sets `domain` and `ticker_symbol`. An explicit
null clears a field; an omitted field is left unchanged.

## Endpoints and flags

- `POST /api/v1/signals/sync/startupintel` needs `STARTUPINTEL_ENABLED` and
  `STARTUPINTEL_BASE_URL`.
- `POST /api/v1/signals/sync/marketpulse` needs `MARKETPULSE_ENABLED`,
  `MARKETPULSE_BASE_URL` and, optionally, `MARKETPULSE_API_KEY`.
- The timeout is `EXTERNAL_SIGNAL_TIMEOUT_SECONDS`, default 10.
- A disabled integration, or one with no URL, returns **503**.
- An upstream HTTP error, a non-JSON body or an unexpected response shape
  returns **502**, with the cause in the detail.

## Verified

- **22 new tests** in `tests/test_company_signals.py`, all on the recorded
  fixtures:
  - mapping and skip reasons;
  - no invented round amount;
  - provenance;
  - domain normalization;
  - naive timestamps read as UTC;
  - malformed records and unknown severity;
  - the disclaimer;
  - pagination through an `httpx.MockTransport`, using MarketPulse's own
    `_paginate` metadata and the StartupIntel page and total;
  - whether the API key is sent;
  - the real upstream 500, non-JSON bodies and bad response shapes;
  - an idempotent end-to-end ingest (6 accepted, then 6 duplicates).
- **Full suite:** 121 passing, locally and in-container. `ruff` is clean.
  Migration `009` → `010` applied.
- **Live, against both running upstreams from the API container:**
  - **Real HTTP, mapping and ingest on Postgres**, inside a rolled-back
    transaction:
    - StartupIntel: 4 fetched, 2 emitted.
    - MarketPulse: 3 + 9 fetched, 1 + 3 emitted.
    - Ingest: 6 accepted.
    - A missing API key gave a 401.
  - **The sync endpoints with the flags on:**
    - Both returned 200. Nothing was stored, because the demo workspace's
      real-named competitors don't match the sample companies. Sample funding
      data is never attached to a real company name.
    - A wrong key returned 502 (upstream 401); an unreachable host returned 502.
  - **With the flags off (the default):** both return 503.
