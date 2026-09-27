# vNext Phase G2 — Provider normalization

Delivered against `GAPVISOR_VNEXT_AGENT_PLAN.md` section 22 Phase G2:
"normalized provider adapter interface, versioned parser metadata,
response-validation tests, failure fixtures."

## What changed

- **`adapters/providers/`** (new, per the plan's suggested `backend/src/`
  layout in section 7): `base.py` defines `ProviderAdapter` (protocol) and
  `ProviderResponse` (`status: "completed" | "failed" | "timeout"`,
  `raw_text`, `error`); `mock.py` moves `MockProvider` here, now returning a
  `ProviderResponse` instead of a bare string so a provider can represent
  failure explicitly. `services/provider.py` (the old location) is deleted;
  every caller (`services/scan.py`, `scripts/seed.py`, `api/grader.py`, and
  tests) is updated, not shimmed — this interface change is the point of
  the phase.
- **`services/normalize.py`** (new): the "Normalization + Validation" stage
  from the plan's architecture diagram (section 2), between raw collection
  and brand/claim extraction. Collapses whitespace/control characters,
  and turns a non-"completed" status *or* empty-after-cleaning text into an
  explicit failure — a `"failed"` status always wins over any stray leftover
  text (e.g. a partial stream before a dropped connection).
- **`run_scan` now branches on the normalized result**: a real failure
  produces an `Answer`/`Observation` pair with `status="failed"` (or
  `"timeout"`), `raw_text=None`, `outcome="error"` (a new value, distinct
  from a genuine "absent" — that's a completed answer that didn't mention
  the brand; "error" means the provider call itself never produced a real
  answer to judge), and no fabricated `AnswerMention` rows. Previously every
  `Answer.status` was hardcoded `"completed"` regardless of what actually
  happened.
- **`core.config.NORMALIZER_VERSION`** added alongside the existing
  `PARSER_VERSION`, for the same reason: so `Observation`/`Answer` rows
  record which version of the pipeline produced them as the rules evolve.
- **`tests/fixtures/provider_responses.py`** (new): six named failure
  fixtures (empty response, whitespace-only, messy-but-valid whitespace,
  timeout, provider error, failed-with-stray-text) plus `FixtureProvider`,
  a `ProviderAdapter` test double. Explicitly not used by the demo seed
  path — `MockProvider` stays deterministic and always-succeeding there;
  a demo that randomly fails isn't a better demo.
- **`tests/test_normalization.py`** (new): 6 pure unit tests on
  `normalize_response`, plus 4 tests that run the *real* `run_scan` against
  each fixture end-to-end (parametrized over timeout/provider-error/empty),
  asserting no crash, correct `Answer.status`/`outcome`, zero fabricated
  mentions, and `Observation.validation_status == "INVALID"`. One sanity
  test confirms the ordinary successful path wasn't regressed.

## A test infrastructure fix worth flagging

The `run_scan` integration tests initially all silently skipped: SQLite
can't compile `Workspace.brand_domains`'s `postgresql.ARRAY(Text)` column
type, and the existing test pattern (`Base.metadata.create_all` wrapped in
try/except → `pytest.skip`) swallowed that as "environment limitation."
A skip that always skips is worse than no test — it looks like coverage in
CI output but never actually runs. Fixed by creating the `workspaces` table
via raw DDL (a plain `TEXT` column instead of `ARRAY`) for just this test
file, sidestepping the incompatibility instead of asserting nothing. All 10
tests in this file now genuinely execute and pass.

## Verified live

Rebuilt the `api`/`worker`/`beat` containers against real Postgres:
- Full suite: 25/25 passing (was 15 after G1), both locally and in-container.
- `ruff check` clean (auto-fixed 5 import-order issues the refactor
  introduced across `scan.py`'s new import, `seed.py`, and two test files).
- A live scan via `POST /api/v1/monitoring/scans` produces a correct
  `Observation` (`collection_method: "api"`, `provider: "openai"`,
  `validation_status: "VALID"`) through the full new adapter → normalize →
  parse → observe pipeline.
- `POST /api/v1/public/grader` (the other `MockProvider` call site) still
  returns a normal score.
