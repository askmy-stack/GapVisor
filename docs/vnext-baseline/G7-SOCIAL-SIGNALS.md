# vNext Phase G7 — Social Signal integration

Delivered against `GAPVISOR_VNEXT_AGENT_PLAN.md` sections 5.3 and 13 and
Phase G7: "ExternalSignal contract, Social Signal adapter, provenance, no
automatic causal claim."

## Built against the real upstream, not a guess

Before writing any adapter code, the upstream repo
([askmy-stack/social-signal-pipeline](https://github.com/askmy-stack/social-signal-pipeline),
commit `bf657d4`) was read and **run**. The facts that shaped the design:

- It has **no HTTP API**. Its output is one enriched record per tweet,
  written as JSONL (`twitter_etl.py:501-526`). So the integration reads
  that export, via either `scripts/ingest_social_signals.py <file>` or
  `POST /api/v1/signals/ingest/social-signal-pipeline` with the records in
  the body.
- The test fixture, `backend/tests/fixtures/social_signal_pipeline/enriched_sample.jsonl`,
  is **genuine pipeline output**. Four clearly-labelled sample tweets were
  run through the pipeline's own deterministic local provider. See the
  fixture README for the exact command.
- Its local provider's `entities[]` only knows 21 hard-coded names
  (OpenAI, Kafka, …), and none of them is a typical workspace's brand or
  competitor. GapVisor therefore resolves entities itself: tracked names
  are matched against `entities[]` first, then against the tweet text,
  whole-word. Plan section 4 already makes this GapVisor's job.

## What it emits, and what it deliberately doesn't

A single-tweet record honestly supports two signal types:

- **`product_launch_discussion`** — the upstream `intent` is
  `product_update` or `announcement`.
- **`community_complaints`** — `negative`/`mixed` sentiment, plus either a
  `warning` intent or a `risk`/`controversy` signal.

The adapter never emits these:

- `developer_sentiment_shift`, `topic_growth`, `competitor_mention_growth`:
  these are changes over time, and one record has no baseline or window.
- `feature_discussion`: not distinguishable from a product update with the
  upstream intent vocabulary.

Emitting any of these would mean inventing a trend from one data point.
Every skipped record comes back with a reason
(`no_supported_signal_type`, `no_tracked_entity`,
`unsupported_upstream_schema_version`, `failed_upstream_validation`,
`unparseable_created_at`), so an ingest run can be audited rather than
silently losing records.

## Contract and storage

- **`services/signals.py::ExternalSignalEnvelope`** is the plan's section
  5.3 envelope, version `1.0`:
  - `provenance.source_ref` is required.
  - `confidence` may be null.
  - `signal_type` must be lower_snake_case.
  - Every integration, including G9's, goes through this one contract and
    `ingest_signals()`.
- **`ingest_signals()`** checks whose signal it is:
  - A signal for another workspace is rejected (`workspace_mismatch`).
  - So is an entity the workspace doesn't track, including another
    workspace's competitor (`unknown_entity`).
  - Ingest is idempotent across and within batches, backed by a unique
    `(workspace_id, source_system, external_signal_id)` index.
- **Confidence** is derived from the upstream record's own quality fields,
  never invented:
  - The base comes from `source_confidence`: verified 0.8, exported 0.6,
    sample 0.3.
  - It is halved when the upstream flags `requires_human_review` or
    `fallback_used`.
  - It is capped at 0.5 for local-rule enrichment, which has a known
    substring false-positive ("evaluation" matching the keyword "valuation").
- **Provenance** keeps the source URL, tweet id, connector, `is_sample`,
  the upstream AI provider/model, the enrichment mode, the upstream schema
  version and the adapter version.
- **No causal claim at ingest.** Signals aren't linked to anything here.
  G8 links a signal to a detected visibility change, and only ever as a
  `CORRELATED` edge.
- **Feature-flagged.** The flag is `SOCIAL_SIGNALS_ENABLED`. It defaults
  to on because this is the plan's first and demo-required integration.
  When it's off, the endpoint returns 503 and the CLI exits non-zero.

## Test coverage

`backend/tests/test_signals.py` has 17 tests:

- The adapter emits exactly the two honest signals from the real fixture,
  and skips the other two with the right reason.
- Entities are resolved from the text when the upstream `entities[]`
  misses them.
- The `no_tracked_entity` path works.
- Confidence is correct for sample data, local enrichment, and
  upstream-flagged human review.
- Provenance is preserved.
- Unsupported upstream schema versions and records that failed upstream
  validation are rejected.
- Signal ids are deterministic, so re-ingest is idempotent.
- The envelope's own validation is covered.
- `ingest_signals`:
  - accepts brand and competitor signals;
  - rejects cross-workspace and untracked-entity signals (including a real
    competitor from another workspace);
  - is idempotent across and within batches;
  - passes a full real-fixture run end-to-end.

## Verified live

- Migration `007_experiment_lab` → `008_external_signals` applies cleanly.
- The full suite passes, locally and in-container. `ruff check` is clean.
- Against the real demo workspace:
  - API ingest of the real fixture accepted 2 signals and skipped 2, with
    reasons.
  - The file-based CLI run on the same JSONL was fully idempotent:
    0 accepted, 2 duplicates.
  - `GET /api/v1/signals` returns both signals with correct entity types,
    confidence and provenance.
