# vNext Phase G5 — Evidence-backed recommendations

Delivered against `GAPVISOR_VNEXT_AGENT_PLAN.md` section 11 and section 22
Phase G5: "evidence references, evidence strength, causal status, testable
hypothesis output."

## A real pre-existing bug, fixed along the way

The old `/recommendations/generate` compared `MetricDaily.value < 50`, but
`value` is a `0..1` fraction (see `services/rollup.py`) — that comparison
is true for every possible inclusion rate, so it never actually filtered
for "low" anything. It also had no per-model dedup (could return several
stale rows for the same model) and a fallback path that fabricated a
generic "Publish comparison page vs top competitor" recommendation with no
evidence at all when nothing else qualified — exactly what section 11
explicitly warns against. Both are gone: the threshold is `0.5` (correct
units), one recommendation per model (most recent qualifying day only),
and no evidence means no recommendation, full stop.

## What changed

- **`ContentRecommendation`** gains `evidence_refs` (JSON list of real
  `Observation` ids, never empty for a platform-generated recommendation),
  `evidence_strength` (`WEAK`/`MODERATE`/`STRONG`), `causal_status`
  (`NOT_YET_TESTED`/`SUPPORTED`/`NOT_SUPPORTED`/`INCONCLUSIVE` — plan
  section 3.4's vocabulary), and `recommended_experiment` (a suggested
  `{primary_metric, measurement_window_days}` config, not a created
  `Experiment` row). All four stay `null`/`[]` for a customer-authored
  recommendation — a person's own idea isn't backed by observation data,
  and the API confirms this live rather than fabricating placeholder
  evidence for it.
- **`evidence_strength` thresholds are reused, not invented**: `n>=30` →
  `STRONG`, `n>=10` → `MODERATE`, else `WEAK` — identical to
  `services/confidence.py`'s existing `n>=30` "reliable" and `n>=10`
  "meaningful" thresholds from the confidence layer, so the same sample
  size means the same thing everywhere in this codebase.
- **`evidence_refs` are exact, not approximate.** `rollup_answers` groups
  `MetricDaily` by `(day, model_id, category_id)` — the first version of
  this fix queried Observations by day + model only, which could pull in
  observations from a *different* category that happened to share both,
  over-citing relative to the metric's real `sample_size`. Fixed by
  joining through `Prompt.category_id` to match the same grouping;
  verified live that `len(evidence_refs) == sample_size` exactly for every
  generated recommendation.
- **Every generated recommendation is `causal_status="NOT_YET_TESTED"`.**
  Nothing in this codebase ever sets a freshly-generated recommendation to
  `SUPPORTED` — that only makes sense once an Experiment resolves (G6).

## Test coverage

`backend/tests/test_recommendations.py`: 8 tests — evidence-strength
thresholds match the confidence layer exactly; a genuinely healthy 90%
inclusion rate generates nothing (the bug-fix regression test — the old
code would have "recommended" fixing it anyway); a real low-inclusion
metric with real observations generates a correctly-shaped recommendation;
a low metric with *no* matching observations (predates G1) generates
nothing rather than fabricating evidence; only the most recent qualifying
day per model produces a recommendation; generation caps at 5 and respects
workspace isolation; and a dedicated test proves evidence doesn't leak
across categories that share a model and day.

## Verified live

Migration applies clean (`005_causal_graph` → `006_evidence_recommendations`).
Full suite: 50/50 passing (local + in-container). `ruff check` clean.
`POST /api/v1/recommendations/generate` against the real demo workspace
produces 5 recommendations, one per model, each with `evidence_refs`
exactly matching its cited `sample_size` (1↔1, 3↔3↔3↔3↔3), correct
`evidence_strength`, `causal_status: "NOT_YET_TESTED"`, and a
`recommended_experiment` config. Customer-authored creation via `POST
/api/v1/recommendations` confirmed to still return `null`/`[]` for all
four new fields. Frontend and all other endpoints unaffected.
