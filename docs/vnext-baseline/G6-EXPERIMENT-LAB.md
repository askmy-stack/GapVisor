# vNext Phase G6 — Experiment Lab

Delivered against `GAPVISOR_VNEXT_AGENT_PLAN.md` section 12 and section 22
Phase G6: "hypothesis -> intervention -> experiment workflow, measurement
windows, holdout support, supported/not-supported/inconclusive result
model."

## A real, silent pre-existing bug, fixed along the way

The pre-vNext `_enrich()` in `api/experiments.py` computed baseline/current
inclusion/lift/confidence by querying `MetricDaily.model_id.is_(None)` —
but `rollup_answers` groups `inclusion_rate`/`recommendation_share` by
`(day, model_id, category_id)` and never writes an aggregated
`model_id=None` row. **That filter matched zero rows for every experiment
that has ever existed in this codebase**, so every experiment's
measurement fields were silently `None` regardless of how much real data
existed. There's a dedicated regression test for this
(`test_regression_per_model_rows_are_found_not_a_nonexistent_null_aggregate`),
and it's confirmed live: a fresh experiment against real demo data now
returns `baseline_inclusion: 0.667` with `baseline_sample_size: 816`
instead of `null`.

## What changed

- **`Experiment`** gains the plan's minimum fields: `primary_metric`
  (parses the `"{model_id}_inclusion_rate"` convention G5's
  `recommended_experiment` already emits, or a bare metric key to
  aggregate across all models), `secondary_metrics`,
  `measurement_window_days`, `intervention` (a human description of what
  changed — there's no tracked content-asset system to point at yet, so
  this is honestly a description, not a fabricated asset reference),
  `holdout_definition`, and `supporting_evidence_refs` (copied from a
  source recommendation's `evidence_refs`).
- **Real held-out-group measurement is explicitly not implemented.**
  `holdout_definition` can record *intent* (which prompts would be held
  out), but nothing in `services/experiments.py` acts on it — there's no
  mechanism today to apply an intervention to only some prompts, so a real
  randomized control comparison isn't possible yet. This is documented on
  the model rather than silently ignored or faked.
- **`services/experiments.py`** resolves every experiment to exactly one
  of `SUPPORTED` / `NOT_SUPPORTED` / `INCONCLUSIVE`, reusing the existing
  `services/confidence.py::is_meaningful_change` gate rather than
  inventing new statistics: not-yet-enough-data → `INCONCLUSIVE` (`"no_data"`
  or `"missing_baseline_or_measurement_window_data"`); a real but too-small
  sample → `INCONCLUSIVE` (`"small_sample"`); a change within the existing
  noise-band threshold → `INCONCLUSIVE` (`"change_within_noise_band"`); a
  meaningful move in the expected direction → `SUPPORTED`; a meaningful
  move the *wrong* way → `NOT_SUPPORTED` ("the product must be able to
  state that an intervention failed" — plan section 12). Verified live: a
  manually-created experiment with genuinely flat data (`lift: 0.0`)
  correctly resolves `INCONCLUSIVE`/`change_within_noise_band`, never a
  fabricated result.
- **`POST /api/v1/recommendations/{id}/experiment`** (plan's own suggested
  path): converts an evidence-backed recommendation directly into a
  running experiment, copying its `evidence_refs` and
  `recommended_experiment` config. Refuses (400) on a recommendation with
  no real evidence — verified live against a customer-authored
  recommendation, which legitimately has none.

## Not done in this pass

The plan calls Experiments one of vNext's "hero screens" and lists a
"polished experiment UI" as this phase's frontend deliverable. The
existing Experiments & Impact screen is still 100% static-JSON (unchanged
by this PR) — building a UI that does justice to hypothesis/intervention/
target/baseline/measurement-window/holdout/result the way G3's
`RecommendationStability` did for disagreement is a substantial frontend
task in its own right, not a small addition on top of this backend work.
Flagging it explicitly as follow-up rather than shipping something shallow
under time pressure.

## Test coverage

`backend/tests/test_experiments.py`: 12 tests — `primary_metric` parsing
(model-suffixed and bare); weighted daily aggregation across categories;
the regression test for the model_id bug; no-data and missing-window-data
cases; a real meaningful improvement resolving `SUPPORTED` with the
correct lift; a real meaningful decline resolving `NOT_SUPPORTED`; a tiny
change correctly staying `INCONCLUSIVE` rather than overclaiming either
direction; a too-small sample correctly gated to `INCONCLUSIVE`; a
bare-metric experiment correctly aggregating across every model instead of
matching nothing; and workspace isolation.

## Verified live

Migration applies clean (`006_evidence_recommendations` →
`007_experiment_lab`). Full suite: 62/62 passing (local + in-container).
`ruff check` clean. Full recommendation-to-experiment flow confirmed live
against the real demo workspace: generate → convert → real baseline with
816 real samples (previously always `null`) → correctly `INCONCLUSIVE`
until the measurement window has data. A manually-created backdated
experiment against real flat data confirms the `SUPPORTED`/`NOT_SUPPORTED`/
`INCONCLUSIVE` math end-to-end. Frontend and all other endpoints
unaffected.
