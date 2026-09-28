# vNext Phase G8 — Py-Outlier anomaly detection

Delivered against `GAPVISOR_VNEXT_AGENT_PLAN.md` section 16 and Phase G8:
"Py-Outlier integration, visibility anomaly records, investigation panel
data, hypothesis generation."

## Built against the real upstream

[askmy-stack/py-outlier](https://github.com/askmy-stack/py-outlier) is pinned
at commit `9a15aba`. It isn't on PyPI, so the pin is a tarball URL. It is an
optional dependency: the `anomaly` extra in `pyproject.toml`, and a line in
`requirements.txt` so the Docker image includes it. It is imported lazily, so
the core app never needs it.

Reading and running its code shaped three adapter decisions
(`adapters/anomaly/py_outlier.py`):

- **`score()`, never `predict()`.** `predict()` thresholds at a percentile of
  the *training* scores, so it flags the top ~5% of any varied series whether
  or not anything happened. GapVisor applies its own fixed policy instead.
- **Percentage points, not fractions.** Py-Outlier replaces a zero stdev with
  1.0. On a 0..1 scale that floor is 100 points, so a flat 67% → 30% drop would
  score 0.37. In percentage points it scores 37.
- **Inputs rounded to 6 decimals.** This was found on the live demo data. Daily
  values are sample-weighted means, so a flat baseline has a stdev of ~1e-14,
  not 0. The floor never triggered, and scores came out around 7.8e15.
  Rounding removes the float noise without touching any real variation.

## Detection policy (`services/anomalies.py`)

**Series scanned:**

- brand `inclusion_rate` and `recommendation_share` per model;
- competitor `inclusion_rate` per model;
- `share_of_voice` per competitor. The `is_brand` competitor row maps to the
  brand entity.

Categories are combined per day, weighted by sample size.

**Target point:** the latest day on or before `as_of`, compared with the prior
28 days.

**An anomaly needs all of these:**

| Gate | Value | Source |
|---|---|---|
| Baseline points | ≥ 7 | otherwise skipped: `insufficient_baseline` |
| Target-day sample | ≥ 10 | same `min_n` as `confidence.is_meaningful_change`; otherwise `small_sample` |
| Py-Outlier z-score | ≥ 3.0 | conventional cutoff |
| Absolute move | ≥ 2.0 pp | same `min_delta` as the confidence layer |

The last gate matters: a perfectly flat series makes any wiggle score high.

**Recorded with each anomaly:** method, pinned detector version, baseline mean
and stdev, number of baseline points, target sample size, and threshold.

**Idempotent:** one row per series per day. The unique index is
`NULLS NOT DISTINCT` (Postgres 15+). Without that, the brand series
(`competitor_id` NULL) and share-of-voice (`model_id` NULL) would never dedupe.
This was verified live: a duplicate insert is rejected.

## Investigation: correlated, never causal

`GET /visibility/anomalies/{id}/investigation` links external signals from the
14 days up to and including the anomaly's day.

- **Brand anomalies** consider all of the workspace's signals, since a
  competitor's launch can move the brand.
- **Competitor anomalies** consider that competitor's signals plus the brand's.

Each link is a `SIGNAL_PRECEDED_CHANGE` edge with `causal_status="CORRELATED"`.
Its confidence is the signal's own, or 0.0 if the signal has none. Links are
idempotent. The response carries a disclaimer that time order is not causation.

## Hypotheses

`POST /visibility/anomalies/{id}/hypothesis` creates one idempotent
`ContentRecommendation` per anomaly:

- `source="anomaly_investigation"` and `causal_status="NOT_YET_TESTED"`;
- `evidence_refs` holds the anomaly id plus the ids of the linked signals;
- `evidence_strength` comes from the target sample size.

Its `recommended_experiment.primary_metric` is always a brand metric that
`measure_experiment()` can measure. A competitor or share-of-voice anomaly is
tested by its effect on the brand's own inclusion. From there, the existing
`POST /recommendations/{id}/experiment` turns the hypothesis into an experiment.

## Endpoints

- `GET /visibility/anomalies` (optional `?status=`) and
  `PATCH /visibility/anomalies/{id}`, for OPEN / INVESTIGATING / DISMISSED.
- `POST /visibility/anomalies/detect` (optional `?as_of=`).
- Detect, investigation and hypothesis return 503 when
  `ANOMALY_DETECTION_ENABLED` is off. Detect also returns 503 when py-outlier
  isn't installed.

## Verified

- 20 new tests in `tests/test_anomalies.py`:
  - a fake scorer covers the policy gates, idempotency, `as_of`, entity mapping,
    investigation scoping, null confidence, and hypothesis metrics;
  - three tests run against the **real** py-outlier (`importorskip`), including
    the float-noise regression.
- Full suite passes locally and in-container; `ruff check` is clean.
- Migration `008_external_signals` → `009_anomalies` applies cleanly.
- **Live, on the demo workspace:** detection scanned 41 series and flagged
  **0**. That is the honest result, not a bug:
  - most demo series have 9 answers per model per day, below the 10-answer
    minimum;
  - the six that qualify show no unusual move.

  No anomaly was seeded to make the demo look busier.
- **Full flow on real Postgres, rolled back afterwards:**
  - a synthetic 67% → 30% drop scored 42.7;
  - the preceding signal was linked as CORRELATED (confidence 0.3);
  - the hypothesis came out as NOT_YET_TESTED / STRONG with
    `chatgpt_inclusion_rate`;
  - the duplicate insert was rejected.
