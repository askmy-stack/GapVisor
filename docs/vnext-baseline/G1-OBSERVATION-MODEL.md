# vNext Phase G1 — Observation model + surface fidelity

Delivered against `GAPVISOR_VNEXT_AGENT_PLAN.md` section 3.1 / 5.1 / 5.2 / 8.

## What this adds

- **`prompt_families`** — optional grouping of prompts into a cluster
  (nullable `prompt_family_id` on `prompts`). Disagreement/causal-graph work
  in later phases is scoped per family, not per individual prompt string.
- **`observations`** — one row per prompt-sent-to-one-surface collection
  event, carrying the provenance the plan's section 3.1 requires: `surface`,
  `provider`, `model_id`, `collection_method`, `region` (nullable — no
  region-per-prompt assignment exists yet, left honestly unset rather than
  defaulted), `latency_ms`, `status`, and a `validation_status` gate.
- **`observation_extractions`** — the derived brand/competitor/rank read
  from one observation (spec section 5.2's contract), kept as its own table
  so raw collection and extraction can be re-run independently at a new
  `parser_version` later, without re-collecting.
- **`VALID` / `UNCERTAIN` / `INVALID`** validation gate
  (`services/validation.py`): a documented heuristic, not a trained
  classifier — INVALID on a failed provider call or empty response,
  UNCERTAIN on a truncated response or one where neither the brand nor any
  competitor was detected (ambiguous between "really absent" and "parser
  miss"), VALID otherwise.
- **`GET /api/v1/observations`** (filterable by `validation_status`,
  `model_id`, `prompt_id`, paginated) and **`GET
  /api/v1/observations/{id}`** (adds `raw_text` for audit/re-parse).

## What this deliberately does not do

- **Does not touch the existing `Answer`/`AnswerMention`/`MetricDaily`
  pipeline.** `run_scan` now also writes an `Observation` +
  `ObservationExtraction` alongside the `Answer` it already wrote — additive,
  not a replacement. Every G0-baseline endpoint and metric still works
  exactly as before (re-verified: 15/15 tests pass, dashboard/competitors/
  monitoring endpoints return unchanged shapes).
- **No claims/citations extraction.** `claims` and `citations` stay `[]` on
  every `ObservationExtraction` — that's real future work (plan section 10),
  not fabricated placeholder content.
- **No `ai_surfaces` table.** The plan lists one as a suggested table, but
  today there is exactly one surface per catalog model (direct API access) —
  `ai_models.id` already serves as the surface identifier (see that model's
  own docstring, predating this phase). Adding a separate table for a
  distinction that doesn't exist in practice yet would be premature; it's
  one migration away whenever a model actually gains a second surface (e.g.
  a consumer web UI variant).
- **No S3/blob storage.** `raw_response_ref` exists as a column (matching
  the plan's contract shape) but stays `null` — `raw_text` is the real
  source of truth until object storage is actually wired up. Storing a fake
  `s3://` URL would violate the "no fabricated claims" operating rule.

## Backfill behavior

- **New scans** (via `run_scan`, live or via `backfill_scan_history` in
  `seed.py`) write observations going forward automatically.
- **Pre-existing answers** (any workspace seeded before this migration) get
  their observations reconstructed from already-stored `raw_text` +
  `AnswerMention` rows by `backfill_observations_for_existing_answers`,
  idempotently (skips any answer that already has an observation). Verified
  live: 675/675 pre-existing demo answers backfilled on first restart after
  this migration, 0 on the second (idempotency confirmed), all landing as
  `VALID` (consistent with MockProvider always producing coherent,
  non-truncated text).

## Test coverage

`backend/tests/test_observations.py`: 6 unit tests on the classification
heuristic (all three states, both trigger conditions for UNCERTAIN) + 2
DB-backed tests on `record_observation` (normal path with a real `AiModel`
row, and the degraded-but-safe path when one is missing). Combined with the
existing 7, full suite is 15/15.
