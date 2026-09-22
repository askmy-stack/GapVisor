# Implementation Plan: VisibilityOS Backend Platform

**Branch**: `002-backend-platform` | **Date**: 2026-09-03 | **Spec**: not yet written — see note below

**Input**: Direct request to analyze the existing front end and plan the backend that replaces its
static data layer with a live platform.

> **Process note.** The constitution's Development Workflow requires `/speckit-specify` before
> `/speckit-plan`. This document was produced from a direct request and therefore front-runs that
> gate. Before implementation starts, run `/speckit-specify` to turn the Scope section below into a
> numbered spec with acceptance criteria, then re-derive `tasks.md` from it. Everything here is
> written so that step is a formalization, not a rewrite.

---

## Summary

The front end is a complete, ten-screen analytics product with **zero backend**. Every number on
every screen comes from one of **58 static collections** exported by eleven barrels under
`src/data/`, each already carrying an explicit TypeScript type "describing the shape a real API is
expected to return" (Constitution, Principle II). That principle is the whole reason this is a
tractable project: the seam already exists, and the backend's job is to fill it.

This plan builds the real platform behind that seam: a **Python 3.12 / FastAPI** service plus an
asynchronous **scan pipeline** that queries AI assistants on a schedule, parses their answers for
brand and competitor treatment, rolls the results into time-series metrics, and serves them to the
existing screens. It runs on **ECS Fargate with RDS Postgres**, extending the Terraform stack
already deployed for the SPA in AWS account `605134435037` / `us-east-1`.

The architecture separates three concerns that must not be conflated:

1. **Immutable capture** — the raw provider response is written once to S3 and never edited.
2. **Versioned derivation** — every metric is computed from that capture by a numbered parser, so
   improving the scoring logic means re-running the parser, not re-buying the LLM calls.
3. **Pre-aggregated read models** — dashboards read daily rollups, never the fact table.

That split is what makes the product affordable to operate and safe to change.

---

## Technical Context

**Language/Version**: Python 3.12 (API and workers). TypeScript 5.8 stays the language of the
front end; the two are bridged by a generated OpenAPI client, not by hand-written types.

**Primary Dependencies**: FastAPI + Pydantic v2 (contracts and validation), SQLAlchemy 2.0 +
Alembic (ORM and migrations), Celery 5 + Redis (task queue and beat), httpx (provider calls),
`openai` / `anthropic` / `google-genai` provider SDKs, Stripe (billing), structlog +
OpenTelemetry (observability), pytest + testcontainers (tests), ruff + mypy (gates).

**Storage**:

- **Postgres 16 (RDS, Multi-AZ)** — all OLTP plus the derived rollups. The fact table
  (`answers`) is range-partitioned by month.
- **Redis (ElastiCache)** — Celery broker/result backend, per-provider rate-limit token buckets,
  response cache, idempotency keys.
- **S3** — raw provider payloads (`raw-answers` bucket, lifecycle to Glacier at 90d) and generated
  reports/exports (`reports` bucket, presigned download URLs).

**Testing**: pytest with testcontainers-postgres for repository and migration tests; provider
adapters tested against recorded fixtures (`respx`); contract tests assert every response validates
against the published OpenAPI schema. This is the project's first automated test harness — adopting
it is a MINOR constitutional amendment (the constitution currently gates on `tsc -b` + `eslint`
only) and should be recorded as such.

**Target Platform**: Linux containers on ECS Fargate behind an ALB, fronted by the existing
CloudFront distribution `E9ZW63034HTP`.

**Project Type**: Web application, now two-tier — the existing SPA plus a new backend service in a
sibling directory of the same repository.

**Performance Goals**: p95 < 300 ms for dashboard composite reads (served from rollups, cached),
p95 < 150 ms for CRUD. A full daily scan of 3,000 prompts x 5 models completes inside a 4-hour
window. Rollups for the previous day are available by 06:00 in the workspace's timezone.

**Constraints**:

- No secrets in the repository (Constitution, Technology Constraints) — all credentials live in
  AWS Secrets Manager and reach containers as task-definition secret references.
- The API must not force visual change. Where the current shapes prevent that (see
  **Finding 1**), the change is confined to the data barrels and a new formatter module.
- Demo content must remain fictional until a real workspace exists; the "Northstar" fixture set
  becomes seed data for a demo workspace, not a hardcoded default.

**Scale/Scope**: 10 screens, 58 data collections, ~40 REST endpoints, 31 tables, 3 long-running
services, 1 scheduler. Target tenancy: 50 workspaces, 3,000 prompts each, 6 models, 24 months of
retained history — roughly 450k answer rows per workspace per month at daily cadence.

---

## Findings From the Front-End Analysis

These are the four things the code says that a naive port would get wrong.

### Finding 1 — The UI stores pre-formatted display strings, and the API must not

`kpis.json` carries `"value": "42.8%"` and `"change": 5.2`; `metrics.json` carries
`"lastRun": "12m ago"`; `plan-tiers.json` carries `"price": "$2,000"`; `answers.json` carries
`"timestamp": "2 hours ago"` alongside `"runDate": "Oct 24, 2024"`.

A backend cannot serve `"12m ago"` — it is a function of read time, not of the data. The API returns
**raw typed values only**: numbers for metrics, ISO-8601 UTC instants for times, integer minor units
plus a currency code for money, and enum slugs for statuses.

**Consequence**: a `src/lib/format.ts` module (`formatPercent`, `formatRelativeTime` via the
existing `date-fns` dependency, `formatMoney`, `formatPosition`) is a required part of this feature,
and roughly fifteen components change from rendering `row.value` to rendering
`formatPercent(row.value)`. This is the single largest front-end edit in the project and it is
mechanical. Budget it explicitly rather than discovering it in M4.

### Finding 2 — Two of the six tracked "models" have no queryable API

`ai-models.json` lists `copilot` (Microsoft Copilot) and `buyer-agents` (Buyer AI Agents). Microsoft
Copilot's consumer surface has no public API — Azure OpenAI is a different product with different
grounding and retrieval, so measuring it and labelling the result "Copilot" would be false. "Buyer
AI Agents" is a category, not a provider.

**Decision**: the `ai_models` catalog gains a `measurement_method` column
(`api` | `proxy` | `derived` | `unavailable`). ChatGPT, Claude, Gemini and Perplexity are `api`.
Copilot is `unavailable` at launch and its cards render a documented "not yet measured" state rather
than a fabricated number. `buyer-agents` is `derived` — an aggregate over the `api` providers, with
its derivation stated in the UI. Shipping honest coverage is a product requirement, not a nicety;
the sign-in screen claims SOC 2 and the billing screen sells these as measured counts.

### Finding 3 — The Growth tier's unit economics do not close at face value

`plan-tiers.json` sells **Growth at $6,000/mo for 3,000 prompts monitored with daily model scans**.
That is 3,000 x 5 models x 30 days = **450,000 completions per month**, before the sentiment and
reasoning-extraction passes that Answer Analysis requires. At frontier-model prices with the long
answers these prompts produce, inference alone exceeds the subscription price; at cheap-model prices
with aggressive caching it lands in the low thousands, leaving thin margin.

**Design response** (all of which the pipeline must support from M3, not bolt on later):

- **Model rotation** — a prompt scheduled "daily" hits each model on a staggered cadence rather than
  all five every day, with the union still refreshing every model within the week. Cuts volume ~60%.
- **Content-hash caching** — identical `(prompt, model, day)` requests dedupe through Redis.
- **Tiered judging** — mention/position/outcome are extracted deterministically in Python (no LLM);
  only sentiment and reasoning factors call a model, and they use the cheapest capable one with
  results cached by answer hash.
- **Hard quota enforcement at enqueue time** against `usage_counters`, so an overspend is refused
  and surfaced as an alert instead of appearing on an invoice.

Flagging this now because it changes the scheduler's design. The pricing itself is a commercial
decision, not mine to make — but the backend must be able to honor whatever is decided.

### Finding 4 — The dashboards are composite reads, and pure REST would create waterfalls

`/dashboard` needs 7 collections, `/monitoring` needs 8, `/competitors` needs 6. Seven round trips
per screen through CloudFront is a visibly slower dashboard.

**Decision**: two endpoint families. **Composite reads** (`GET /dashboard/overview`,
`GET /monitoring/overview`, `GET /competitors/overview`) return one screen's full payload in a
single cached, ETagged response. **Resource REST** (`/prompts`, `/answers`, `/recommendations`,
`/experiments`, `/team`) stays conventional for anything that is listed, paginated, or mutated.
This is a deliberate BFF-shaped exception, justified here per the constitution's requirement that
complexity beyond the simplest solution be justified in writing at the point of introduction.

---

## Constitution Check

Evaluated against [constitution.md](../../.specify/memory/constitution.md) v1.0.0.

| Principle | Gate | Assessment |
|-----------|------|------------|
| I. Design-System Fidelity | Tokens preserved, no hex, charts on `--chart-*` | **PASS** — the backend returns data, never colors or class names. `modelChartColors` / `competitorChartColors` / `alertStyles` stay in `types.ts` and are joined by stable id, exactly as today. |
| II. Data-Source Separation | Views take data via props/hooks/imports; a backend is consumed through TanStack Query behind the same type | **PASS by design** — this feature is the swap that principle was written for. Each `src/data/<feature>/index.ts` barrel changes from a JSON re-export to a TanStack Query hook module. Components are edited only where Finding 1 forces a formatter call. |
| III. Type Safety & Build Integrity | `tsc -b` + `eslint` clean; shapes defined once | **PASS with an addition** — front-end types become **generated** from the backend's OpenAPI schema, making the server the single source of truth and removing the hand-maintained duplicate. The backend adds `ruff` + `mypy --strict` + `pytest` as its own equivalent gates. |
| IV. Responsive & Accessible | 375-1600px, no color-only meaning | **PASS** — no layout change. Loading and error states are new UI and must meet the same bar: skeletons must not shift layout, and errors must be announced, not merely tinted red. |
| V. Scaffold Integrity & Simplicity | Scaffold files untouched; no gratuitous deps; abstractions need two call sites | **PASS** — `PreviewErrorBoundary` and the UXPilot vite bridge are not touched. `@tanstack/react-query` is already a dependency and already wired in `App.tsx`. The one new front-end dependency is the OpenAPI client generator (dev-only). |

**Technology & Architecture Constraints**: routing stays client-side under `BrowserRouter`; the
`@/` alias rule is unaffected; charts stay on recharts. **No secrets enter the repository** — the
provider API keys this feature requires live only in Secrets Manager, and `terraform.tfvars` remains
git-ignored.

**Amendment required**: adopting pytest and a backend directory is a MINOR amendment (new tooling
and a second language in a repo the constitution describes as a fixed front-end stack). Run
`/speckit-constitution` alongside M0 to record it rather than deviating silently.

---

## Architecture

```
                    CloudFront  E9ZW63034HTP
                    |-- default ---> S3 (SPA, unchanged)
                    `-- /api/*  ---> ALB ---> ECS Fargate: api  (FastAPI)
                                                   |
        +------------------------------------------+------------------------+
        |                                          |                        |
   RDS Postgres 16                        ElastiCache Redis               S3
   (Multi-AZ, private)                 (broker . cache . limits)   raw-answers . reports
        |                                          |
        |                                ECS Fargate: worker  (Celery)
        |                                ECS Fargate: beat    (scheduler)
        |                                          |
        `------------------ rollups ---------------+---> AI providers
                                                         OpenAI . Anthropic
                                                         Google . Perplexity
```

**Serving the API through the existing CloudFront distribution as an `/api/*` behavior** is a
deliberate choice over a separate `api.` subdomain: it makes the API same-origin with the SPA, which
removes CORS entirely, lets refresh tokens ride in `SameSite=Strict` cookies with no third-party
cookie exposure, and reuses the ACM certificate and WAF already attached. The cost is that
cache-behavior ordering in `cloudfront.tf` becomes load-bearing and must be commented as such.

### Services

| Service | Runtime | Scaling | Responsibility |
|---------|---------|---------|----------------|
| `api` | uvicorn workers under gunicorn | 2-10 tasks on ALB request count | REST, auth, validation, composite reads |
| `worker` | Celery, 4 queues (`scan`, `parse`, `rollup`, `export`) | 2-20 tasks on queue depth | Provider calls, parsing, aggregation, report generation |
| `beat` | Celery Beat, singleton | exactly 1 | Enqueues due scans, nightly rollups, quota resets |

`beat` is a singleton by construction; run it as its own service with `desired_count = 1` and a
Redis-held leader lock so a deployment overlap cannot double-schedule a scan.

---

## The Scan Pipeline

This is the heart of the product and the part with no analogue in the current code.

```
beat: enqueue_due_scans (per workspace, per schedule)
  |-- quota check --(exceeded)--> alert + skip, no provider spend
  `-- fan out: one task per (prompt x model), rate-limited per provider
        `-- execute_scan
              |- provider adapter call (temperature 0 where supported)
              |- retry: exponential backoff + jitter on 429/5xx; circuit breaker per provider
              |- raw payload --> S3  raw/{workspace}/{yyyy-mm-dd}/{answer_id}.json
              `- INSERT answers (status = pending_parse, parser_version = NULL)
                    `-- analyze_answer  (parser_version = N)
                          |- mention detection   -> answer_mentions   (deterministic, no LLM)
                          |- position ordering   -> answers.brand_position
                          |- outcome class.      -> answers.outcome
                          |- citation extraction -> answer_citations  (text URLs + native fields)
                          |- sentiment           -> answers.sentiment_*   (cheap LLM, cached)
                          |- reasoning factors   -> answer_reasoning      (cheap LLM, cached)
                          `- inaccuracy check    -> answer_inaccuracies   (vs workspace fact sheet)
                                `-- rollup_incremental -> metric_daily upserts
                                      `-- evaluate_alert_rules -> alerts
```

**Provider adapters** implement one `ModelProvider` protocol — `query(prompt, options) ->
ProviderResponse{text, citations, tokens_in, tokens_out, latency_ms, raw}`. Perplexity returns
native citations; the others require URL extraction from the answer text. Adding a provider means
adding one adapter and one catalog row, nothing else.

**Non-determinism** is inherent: the same prompt to the same model yields different answers. Metrics
are therefore reported with a sample size, and `metric_daily.sample_size` is exposed so the UI can
distinguish a 2-point drop measured over 40 runs from one measured over 3. Where a workspace needs
stability over sensitivity, `prompts.samples_per_run` (default 1) allows n-sampling.

**Re-scoring without re-spending**: because the raw payload is immutable in S3 and every derived row
carries `parser_version`, shipping a better parser means running `backfill_reparse(from_date,
parser_version)` over stored payloads. No provider calls, no cost. This is why the capture and
derivation steps are separate tasks rather than one.

**Citation authority** (`owned` | `high` | `medium` | `low`) is resolved by domain: the workspace's
own domains are `owned`; the rest come from a maintained authority table seeded from a domain-rank
source and overridable per workspace.

---

## Data Model

Full DDL and column-level notes: **[data-model.md](./data-model.md)**. Thirty-one tables in seven
groups:

| Group | Tables |
|-------|--------|
| Tenancy & identity | `organizations`, `workspaces`, `users`, `memberships`, `refresh_tokens`, `audit_log` |
| Reference & config | `ai_models`, `workspace_models`, `competitors`, `competitor_aliases`, `categories`, `regions`, `authority_domains` |
| Prompts & scheduling | `prompts`, `prompt_models`, `prompt_templates`, `schedules`, `schedule_prompts`, `scan_jobs` |
| Facts | `answers` (partitioned monthly), `answer_mentions`, `answer_citations`, `answer_reasoning`, `answer_inaccuracies` |
| Rollups | `metric_daily`, `citation_domain_daily`, `position_distribution_daily` |
| Content & experiments | `content_gaps`, `content_recommendations`, `recommendation_tags`, `experiments`, `experiment_events`, `experiment_metrics` |
| Billing, reporting, alerting | `plans`, `subscriptions`, `usage_counters`, `invoices`, `report_runs`, `alerts`, `alert_rules`, `compliance_settings` |

**Tenancy** is enforced twice. Every tenant-scoped table carries `workspace_id NOT NULL`, and
Postgres **row-level security** filters on `current_setting('app.workspace_id')`, which a FastAPI
dependency sets with `SET LOCAL` at the start of each request's transaction. The repository layer
also filters explicitly. One layer is the guard; two is the guarantee that a forgotten `WHERE`
cannot leak another customer's competitive intelligence.

**`metric_daily`** is the single read model behind every KPI, chart and table on the dashboards:
`(workspace_id, date, metric_key, model_id, category_id, region_id, competitor_id, value,
sample_size)` with `NULL` dimensions meaning "all". One narrow table with a covering index answers
"share of voice by category for Kong over 90 days" and "brand inclusion rate, all models, 7 days"
with the same query plan.

---

## API Contract

Full endpoint list, parameters, and response shapes mapped collection-by-collection to the 58
current exports: **[contracts/api.md](./contracts/api.md)**.

Conventions: `/api/v1` prefix; cursor pagination (`?cursor=&limit=`); `{"data": ..., "meta": ...}`
envelope on collections; RFC 9457 `application/problem+json` errors; `Idempotency-Key` honored on
all POSTs that spend money or start jobs; `ETag`/`If-None-Match` on composite reads;
`X-Request-Id` echoed and logged; `202 Accepted` plus a job resource for anything asynchronous
(scans, reports, battlecards).

Screen-to-endpoint map:

| Screen | Endpoints |
|--------|-----------|
| Sign In | `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`, `GET /auth/oauth/{google,microsoft}`, `GET /public/showcase-metrics` |
| Workspace Setup | `GET /reference/setup`, `POST /workspaces`, `PATCH /workspaces/{id}` |
| Visibility Dashboard | `GET /dashboard/overview`, `GET /alerts`, `PATCH /alerts/{id}` |
| Prompt Library | `GET/POST /prompts`, `PATCH/DELETE /prompts/{id}`, `POST /prompts/{id}/run`, `GET /prompt-templates`, `GET/POST /schedules` |
| Model Monitoring | `GET /monitoring/overview`, `GET /monitoring/runs`, `POST /monitoring/scans`, `GET /monitoring/scans/{id}` |
| Answer Analysis | `GET /answers`, `GET /answers/{id}`, `POST /answers/{id}/export`, `PATCH /answers/{id}/inaccuracies/{iid}` |
| Competitor Intelligence | `GET /competitors/overview`, `GET/POST/DELETE /competitors`, `POST /competitors/battlecard` |
| Content Recommendations | `GET /recommendations`, `PATCH /recommendations/{id}`, `GET /content-gaps`, `GET /evidence-opportunities` |
| Experiments & Impact | `GET/POST /experiments`, `GET /experiments/{id}`, `POST /experiments/{id}/events`, `GET /experiments/recommended-next` |
| Reports & Billing | `GET /billing/{plan,usage,invoices}`, `POST /billing/subscription`, `GET/POST/DELETE /team/members`, `GET /reports`, `POST /reports`, `GET /reports/{id}/download`, `GET/PATCH /compliance` |

---

## Security & Compliance

The sign-in screen advertises **SOC 2 Type II** and **GDPR compliance**, and the Reports & Billing
screen exposes a compliance settings panel. Those claims are load-bearing requirements:

- **AuthN** — Argon2id password hashing; 15-minute JWT access tokens; rotating refresh tokens in
  `HttpOnly; Secure; SameSite=Strict` cookies with reuse detection; Google and Microsoft OIDC for
  the two buttons already on the form.
- **AuthZ** — roles `owner` / `admin` / `analyst` / `viewer` as a declared permission matrix checked
  by a FastAPI dependency, never ad hoc in handlers.
- **Tenant isolation** — Postgres RLS as above, with an integration test that asserts a cross-tenant
  read returns zero rows even when the repository filter is bypassed.
- **Audit** — every mutation writes `audit_log` (actor, workspace, action, entity, before/after
  diff, request id, IP). Immutable, append-only, 7-year retention.
- **Data subject rights** — `POST /compliance/export` and `POST /compliance/erase` back the GDPR
  claim with real endpoints; `compliance_settings.retention_days` drives a nightly purge job.
- **Secrets** — Secrets Manager with rotation for DB credentials; provider keys injected as task
  secrets. Nothing in the repo, per the constitution.
- **Transport** — TLS everywhere; RDS and Redis in private subnets with no public route; security
  groups reference each other rather than CIDRs.

---

## Front-End Integration

The swap is deliberately confined to the eleven barrels:

1. **Generate the client** — `openapi-typescript` against the served schema, checked into
   `src/api/schema.d.ts`, regenerated in CI and diffed so a breaking API change fails the front-end
   build rather than production.
2. **Rewrite each barrel** — `src/data/prompt-library/index.ts` stops exporting
   `prompts: Prompt[]` and starts exporting `usePrompts(filters)`, a TanStack Query hook returning
   the same `Prompt[]`. The presentation lookups (`statIcons`, `alertStyles`, `modelChartColors`)
   stay exactly where they are.
3. **Add the formatter module** — `src/lib/format.ts`, per Finding 1.
4. **Add auth** — an `AuthProvider` plus a `<RequireAuth>` route wrapper in `App.tsx`; `/signin` and
   `/workspace-setup` stay public, the eight dashboard routes become guarded.
5. **Add loading and error states** — skeletons sized to their content so nothing shifts, and error
   boundaries per panel so one failed widget does not blank a screen.
6. **Keep the JSON** — the current `src/data/**/*.json` files move to `src/mocks/` and become MSW
   fixtures, preserving offline development and giving the contract tests their golden payloads.

Filters that are currently client-side (`FilterBar`, `MonitoringControls`, `PromptFilters`) become
query parameters. Their option lists come from `GET /reference/*` instead of `filter-options.json`.

---

## Infrastructure

New Terraform under `terraform/backend/`, sharing the existing state bucket
(`ensar-terraform-state-605134435037`, key `visibilityos-backend/terraform.tfstate`) and the naming
conventions already established in `locals.tf`:

| File | Resources |
|------|-----------|
| `network.tf` | VPC, 2 AZs, public + private subnets, NAT, endpoints for S3/ECR/Secrets |
| `ecs.tf` | Cluster, three services, task definitions, autoscaling policies |
| `alb.tf` | Internal-facing ALB, target groups, health checks on `/healthz` |
| `rds.tf` | Postgres 16 Multi-AZ, parameter group, automated backups, PITR |
| `redis.tf` | ElastiCache Redis, encryption in transit and at rest |
| `s3-data.tf` | `raw-answers` and `reports` buckets, lifecycle rules, block-public-access |
| `secrets.tf` | Secrets Manager entries and IAM task-role grants |
| `observability.tf` | Log groups, alarms, dashboards |
| `cloudfront-api.tf` | The `/api/*` behavior added to the existing distribution |

Migrations run as a one-off ECS task gated between image push and service update, so a deploy that
fails to migrate never routes traffic to code expecting the new schema.

**CI/CD** (GitHub Actions): `ruff` -> `mypy --strict` -> `pytest` -> build and push to ECR ->
`terraform plan` on PR / `apply` on merge -> migrate -> rolling deploy -> smoke test. The existing
front-end gates (`npm run lint`, `npm run build`) run in the same workflow so the generated client
and the API cannot drift.

---

## Milestones

Estimates assume **two engineers**, one on the API and one on the pipeline, with the front-end
integration for each milestone included in that milestone rather than deferred.

| # | Milestone | Weeks | Delivers | Front end unblocked |
|---|-----------|-------|----------|---------------------|
| **M0** | Foundations | 1-2 | Repo layout, FastAPI skeleton, docker-compose, Postgres + Alembic, auth, tenancy + RLS, CI, `/healthz` | — |
| **M1** | Workspace & catalog | 2-3 | Org/workspace/user/membership, setup wizard, reference data, competitors, categories, regions, team invites | `/signin`, `/workspace-setup` |
| **M2** | Prompt library | 3-4 | Prompt CRUD + filters, templates, schedules, quota checks | `/prompts` |
| **M3** | Scan pipeline v1 | 4-6 | Celery + beat, four provider adapters, rate limiting, retries, S3 capture, manual "Run New Scan", deterministic mention/position/outcome parsing | `/monitoring` recent runs |
| **M4** | Analysis & metrics | 6-8 | Sentiment, citations, reasoning, inaccuracies, `metric_daily` rollups, dashboard + monitoring + answers reads, formatter migration (Finding 1) | `/dashboard`, `/monitoring`, `/answers` |
| **M5** | Competitive & content | 8-10 | SOV by category and over time, comparison table, strengths, root causes, gap map, recommendation workflow with assignees | `/competitors`, `/recommendations` |
| **M6** | Experiments | 10-11 | Experiment CRUD, event timeline, before/after impact series, secondary metrics, next-suggestion ranking | `/experiments` |
| **M7** | Billing, reports, compliance | 11-13 | Stripe subscriptions and webhooks, usage counters and enforcement, invoices, async report generation with presigned downloads, retention and audit endpoints | `/billing` |
| **M8** | Hardening | 13-14 | Load test to 50 workspaces, alert rules, backfill/re-score tooling, runbooks, SLOs and dashboards | — |

**~14 weeks.** M3 is the milestone most likely to slip: provider access approval, rate-limit
negotiation and per-provider quirks are external dependencies. Start provider account provisioning
during M0, not M3.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Inference cost exceeds subscription revenue (Finding 3) | Existential to the margin | Model rotation, content-hash caching, deterministic-first parsing, hard quotas at enqueue. Model the unit economics against real provider prices before M3 ships. |
| Provider access, ToS, or rate limits block a model (Finding 2) | Missing columns on every screen | `measurement_method` in the catalog and honest empty states. Provision accounts in M0. Adapter interface makes substitution cheap. |
| Answer non-determinism makes small metric moves meaningless | Users chase noise; trust erodes | Expose `sample_size`; support n-sampling per prompt; band the charts rather than implying precision the data lacks. |
| Scoring logic changes invalidate history | Charts jump for no product reason | `parser_version` on every derived row plus S3-backed re-scoring; never mix versions inside one series. |
| Formatter migration touches ~15 components (Finding 1) | Mechanical but broad; a late surprise | Scheduled explicitly inside M4 with the endpoints it depends on. |
| Cross-tenant leak | Catastrophic — this is competitive intelligence | RLS plus repository filters plus a standing isolation test in CI. |
| `beat` duplicated during deploy | Double provider spend | Singleton service with a Redis leader lock and an idempotency key per `(schedule, window)`. |

---

## Open Questions for `/speckit-specify`

1. **Pricing vs cost** — is the Growth tier's "daily scans across 3,000 prompts" a commitment, or
   may it become "each prompt refreshed against each model weekly, rotating daily"? Finding 3 needs
   an answer before M3 fixes the scheduler's semantics.
2. **Copilot** — ship as unmeasured, drop from the catalog, or measure Azure OpenAI under an
   explicitly different label?
3. **Region semantics** — is "regional focus" prompt-level metadata only, or must scans actually
   originate from regional egress (which requires per-region NAT and changes the network design)?
4. **Recommendation authoring** — are recommendations generated by the platform, authored by the
   customer, or both? The screen implies generation, which is a further LLM workload not costed above.
5. **Data residency** — the GDPR claim may imply an EU-resident deployment for EU customers. If so,
   that is a regional Terraform stack and must be decided before M0, not after.
