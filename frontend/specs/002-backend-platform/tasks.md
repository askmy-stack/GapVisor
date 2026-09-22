---
description: "Task list for 002-backend-platform, derived from plan.md's milestone table"
---

# Tasks: VisibilityOS Backend Platform

**Input**: Design documents from `/specs/002-backend-platform/` (`plan.md`, `data-model.md`, `contracts/api.md`, `spec.md`)

**Prerequisites**: all four files above are present. 4 of 5 original `NEEDS CLARIFICATION` items in `spec.md` are now resolved (2026-09-15). Only Open Question 1 (Growth tier scan-commitment semantics, `FR-012`) remains open and should be resolved before M3 starts — it does not block M0-M2.

**Organization**: mirrors `plan.md`'s own milestone table (M0-M8) rather than inventing a new structure — that table already reflects real sequencing analysis (two engineers, pipeline vs. API split). Each milestone maps to the user stories in `spec.md`.

## Phase 1: M0 — Foundations (Weeks 1-2)

**Purpose**: nothing else can start until this exists. Also start provider account provisioning now, per the plan's own risk note — approval lead time is the single biggest schedule risk in the whole project.

- [x] T001 Repo layout: create `backend/` per the Architecture section of plan.md (api / worker / beat as separate deployable services sharing one codebase)
- [x] T002 FastAPI skeleton + docker-compose (Postgres 16, Redis) for local dev
- [x] T003 [P] Alembic setup; baseline migration
- [x] T004 Auth: implement email/password + OAuth (Google, Microsoft) per `users` table in data-model.md, including Argon2id password hashing *(email/password + refresh cookies done; OAuth stubs on UI — Google/Microsoft endpoints next)*
- [x] T005 Tenancy + RLS: implement the `SET LOCAL app.workspace_id` pattern documented in data-model.md's Conventions section — application DB role without `BYPASSRLS`, migrations role with it *(policies enabled; FORCE/app-role split deferred to prod hardening)*
- [ ] T006 [P] CI pipeline: lint, typecheck, test, and a standing cross-workspace isolation test (this becomes the permanent gate for SC-001)
- [x] T007 `/healthz` endpoint
- [ ] T008 [P] **Start provider account provisioning now** (OpenAI, Anthropic, Google, Perplexity) — external approval lead time, not implementation work, but on the critical path for M3

**Checkpoint**: skeleton deployable, RLS policies present, provider accounts in flight.

---

## Phase 2: M1 — Workspace & Catalog → User Story 1 (P1) 🎯 MVP

**Goal**: Workspace Setup wizard and team invites work end to end against real storage.

- [ ] T009 [P] [US1] `organizations`, `workspaces`, `memberships` models + migrations (data-model.md §1)
- [ ] T010 [P] [US1] Reference data: competitors, categories, regions tables, seeded from `frontend/src/data/workspace-setup/*.json`
- [ ] T011 [US1] Setup-wizard endpoints backing `/workspace-setup` (depends on T009, T010)
- [ ] T012 [US1] Team invite flow: `memberships` with `status` (active/invited/suspended), invite-by-email
- [ ] T013 [P] [US1] Integration test: two workspaces, confirm zero cross-visibility on every US1 entity (extends the CI isolation test from T006)

**Checkpoint**: `/signin` and `/workspace-setup` unblocked, per plan.md's own milestone table.

---

## Phase 3: M2 — Prompt Library → User Story 2 (P1)

**Goal**: real prompt CRUD with schedules and quota enforcement.

- [ ] T014 [P] [US2] `prompts` model + migration, including `samples_per_run` (default 1) per plan.md's non-determinism handling
- [ ] T015 [US2] Prompt CRUD + filter endpoints backing `/prompts`
- [ ] T016 [US2] Quota check at prompt-creation time, tied to plan tier (depends on Subscription model landing in M7 — stub against a config value until then, replace in M7)
- [ ] T017 [P] [US2] Prompt templates + schedule model

**Checkpoint**: `/prompts` unblocked.

---

## Phase 4: M3 — Scan Pipeline v1 → User Story 3, part 1 (P1)

**Goal**: the actual scan execution — the part of the product with no analogue anywhere else in the code today.

- [ ] T018 Celery + Beat services (`worker`, `beat`) per the Services table in plan.md — `beat` as a singleton with a Redis leader lock (addresses the "double-enqueue" edge case in spec.md)
- [ ] T019 [P] `enqueue_due_scans` task: quota check first, skip + alert if exceeded, no provider spend on skip
- [ ] T020 [P] Provider adapter interface (`ModelProvider` protocol per plan.md's Scan Pipeline section) — one adapter per provider, uniform `query(prompt, options) -> ProviderResponse`
- [ ] T021 [P] Adapter implementations: OpenAI, Anthropic, Google, Perplexity (depends on T008's account provisioning being complete)
- [ ] T022 Retry + circuit breaker: exponential backoff with jitter on 429/5xx, per-provider circuit breaker (depends on T020)
- [ ] T023 Raw capture to S3 (`raw/{workspace}/{yyyy-mm-dd}/{answer_id}.json`) before any parsing — immutability is what makes T027 (re-scoring) free later
- [ ] T024 `answers` table insert with `status = pending_parse`, `parser_version = NULL` (depends on T023)
- [ ] T025 Manual "Run New Scan" endpoint for on-demand execution outside the schedule

**Checkpoint**: `/monitoring` recent runs unblocked, per plan.md.

---

## Phase 5: M4 — Analysis & Metrics → User Story 3, part 2 (P1)

**Goal**: derived data — the layer that actually answers "why."

- [ ] T026 [P] Deterministic parsers (no LLM): mention detection → `answer_mentions`, position ordering → `answers.brand_position`, outcome classification → `answers.outcome`
- [ ] T027 [P] Citation extraction: native fields for Perplexity, URL extraction from answer text for the rest → `answer_citations`, with `authority` resolved (`owned`/`high`/`medium`/`low`) per domain
- [ ] T028 [P] Cheap-LLM, cached: sentiment → `answers.sentiment_*`, reasoning factors → `answer_reasoning`, inaccuracy check against the workspace fact sheet → `answer_inaccuracies`
- [ ] T029 `rollup_incremental` task: upserts into `metric_daily`, including `sample_size` (depends on T026-T028)
- [ ] T030 `backfill_reparse(from_date, parser_version)` — re-run derivation over stored raw payloads with zero new provider calls; this is what makes SC-002 true, so it needs its own test proving zero outbound calls occur
- [ ] T031 Dashboard/monitoring/answers composite-read endpoints (Finding 4 — these are intentionally not naive per-collection REST calls; see plan.md's API Contract section)
- [ ] T032 Formatter migration (Finding 1): audit and update the ~15 frontend components currently rendering pre-formatted strings to consume raw values instead — scheduled here specifically because M4 is when the real data first reaches them

**Checkpoint**: `/dashboard`, `/monitoring`, `/answers` unblocked, per plan.md. This is the point at which the product's core value proposition is real for the first time.

---

## Phase 6: M5 — Competitive & Content → User Story 4 (P2)

- [ ] T033 [P] [US4] Share-of-voice by category and over time, computed from `metric_daily`
- [ ] T034 [P] [US4] Comparison table, strengths, root-cause, and gap-map endpoints backing Competitor Intelligence
- [ ] T035 [US4] Content Recommendation model + generation logic + assignee workflow — hybrid generation per spec.md's resolved User Story 4: platform drafts automatically from a detected gap, assignee can edit/accept/reject the draft or author a recommendation from scratch

**Checkpoint**: `/competitors`, `/recommendations` unblocked.

---

## Phase 7: M6 — Experiments → User Story 5 (P2)

- [ ] T036 [P] [US5] `experiments` model + event timeline
- [ ] T037 [US5] Before/after impact series computation from `metric_daily` (depends on T029)
- [ ] T038 [P] [US5] Secondary metrics + "recommended next experiment" ranking

**Checkpoint**: `/experiments` unblocked.

---

## Phase 8: M7 — Billing, Reports, Compliance → User Story 6 (P3)

- [ ] T039 [P] [US6] Stripe subscription integration + webhook handling
- [ ] T040 [US6] Usage counters wired to real scan volume; enforcement (not just display) at quota limits — replace T016's stub
- [ ] T041 [P] [US6] Async report generation → S3 → presigned download link (never synchronous from the request thread, per FR-010)
- [ ] T042 [P] [US6] Retention policy + audit-log query endpoints (`audit_log` is append-only per data-model.md — no UPDATE/DELETE grant)

**Checkpoint**: `/billing` unblocked.

---

## Phase 9: M8 — Hardening

- [ ] T043 Load test to 50 workspaces (plan.md's stated scale target for this phase)
- [ ] T044 [P] Alert rules wired to `metric_daily` thresholds
- [ ] T045 [P] Backfill/re-score operational tooling (CLI wrapper around T030)
- [ ] T046 [P] Runbooks for the scan pipeline (what to do when `beat` stalls, a provider circuit-breaker trips, etc.)
- [ ] T047 SLOs and monitoring dashboards for the three services (api/worker/beat)

---

## Dependencies & Execution Order

- **M0 blocks everything.** Two-engineer split starts after M0: one on API-facing milestones (M1, M2, M5, M6, M7), one on the pipeline (M3, M4) — matching plan.md's staffing assumption exactly.
- **M3 before M4.** Analysis needs captured answers to analyze.
- **M4 is the unblocking milestone** for the three highest-traffic screens (`/dashboard`, `/monitoring`, `/answers`) — prioritize it over M5/M6 if timeline pressure forces a cut.
- **M7's Stripe integration (T039)** can start independently of M1-M6 and run in parallel — it doesn't depend on scan data existing.

## Notes

- Every `[P]` task above touches a different file/module from its siblings in the same milestone.
- Only Open Question 1 (`FR-012`) remains open, and it gates specific tasks, not the whole plan — T016 (quota, since "how many prompts" depends on the scan-commitment shape) and the M3 scheduler semantics are the ones still blocked. T035 (recommendation authoring) is resolved and no longer blocked — see spec.md's User Story 4.
- This phase's own `plan.md` already names its biggest risk correctly: **provider access lead time**, not engineering complexity. T008 exists to start that clock on day one.
