# vNext Phase G0 — Regression Baseline

Captured 2026-09-26, immediately before vNext architecture work begins
(GAPVISOR_VNEXT_AGENT_PLAN.md), from `main` at commit `09f08ac` plus one
follow-up test fix (see below). This is the "current product" snapshot that
every later vNext phase must not silently break.

## What was verified

- **Full stack starts clean**: `docker compose up -d --build` brings up
  db/redis/api/worker/beat/frontend with no manual steps.
- **Backend test suite**: 7/7 passing (`PYTHONPATH=src python -m pytest -q`,
  run both in a local venv and inside the `api` container).
- **Seeded demo persists correctly** across container restarts (idempotent
  seed, confirmed by row counts below staying stable on a second `up`).
- **Sign-in page renders** at `http://localhost:5173/signin` with no console
  errors, verified visually in-session.
- **OpenAPI contract** captured in full at
  [`openapi-g0-baseline.json`](./openapi-g0-baseline.json) — 30 endpoint
  paths, OpenAPI 3.1.0, title "GapVisor API".

## Pre-existing regression found and fixed

`tests/test_scan_pipeline.py::test_rollup_answers_sqlite_when_possible`
hardcoded `len(metrics) == 3`, from before PR #44 added `share_of_voice` to
`rollup_answers`. Fixed on branch `vnext/g0-baseline` (commit `86f3424`):
updated the expected count to 4 and added an explicit assertion on the new
metric's shape. This is the actual, current baseline — no other test
changes were needed.

## Current API surface (30 paths)

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
GET    /api/v1/auth/oauth/{provider}
POST   /api/v1/workspaces
GET    /api/v1/workspaces/{workspace_id}
GET,POST /api/v1/prompts
GET,PATCH /api/v1/prompts/{prompt_id}
POST   /api/v1/prompts/{prompt_id}/run
POST   /api/v1/monitoring/scans
GET    /api/v1/monitoring/overview
GET    /api/v1/answers
GET    /api/v1/dashboard/overview
GET    /api/v1/competitors
GET    /api/v1/competitors/overview
GET,POST /api/v1/recommendations
POST   /api/v1/recommendations/generate
PATCH  /api/v1/recommendations/{rec_id}
GET,POST /api/v1/experiments
GET    /api/v1/experiments/{experiment_id}
POST   /api/v1/confidence/change
POST   /api/v1/confidence/series
GET    /api/v1/billing/usage
GET    /api/v1/reference/models
GET    /api/v1/reference/setup
POST   /api/v1/public/grader
GET    /api/v1/public/showcase-metrics
GET    /healthz
```

## Seeded workspace row counts (Northstar demo workspace)

| Table | Count |
|---|---|
| workspaces | 1 |
| users | 1 |
| ai_models | 6 |
| competitors | 6 (5 named + 1 brand row) |
| categories | 3 |
| prompts | 9 |
| answers | 675 |
| answer_mentions | 3,375 |
| metric_daily | 1,665 |
| content_recommendations | 0 |
| experiments | 0 |

`content_recommendations` and `experiments` are both empty — the seed
script doesn't populate them and no frontend screen currently writes to
them live (Content Recommendations and Experiments & Impact are 100%
static-JSON screens today, per the earlier gap audit in this session).
vNext's G5/G6 phases need to account for this: there is currently zero
real recommendation/experiment data to build the causal graph on top of
until synthetic or real rows exist.

## Existing data model (pre-vNext)

Tables: `organizations`, `workspaces`, `users`, `memberships`,
`refresh_tokens`, `ai_models`, `competitors`, `categories`, `regions`,
`prompts`, `answers`, `answer_mentions`, `metric_daily`,
`content_recommendations`, `experiments`.

No `observations`, `claims`, `citations`, `causal_edges`, `hypotheses`, or
`external_signals` tables exist yet — these are new in vNext G1/G4/G5/G7.

## Note on the landing/sign-in redesign

Earlier this session a landing-page + sign-in redesign was prototyped as a
standalone Claude Artifact (not committed to this repo) for review. The
actual React app's sign-in page is unchanged from what's described above.
That redesign is a separate, explicitly out-of-scope-for-vNext frontend
task and is not touched by this plan.
