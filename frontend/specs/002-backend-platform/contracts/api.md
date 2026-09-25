# API Contract: GapVisor Backend Platform

**Feature**: `002-backend-platform` | **Plan**: [../plan.md](../plan.md)

Every endpoint below is traced to the front-end collection it replaces, so the migration can be
verified collection-by-collection rather than screen-by-screen. All 58 current exports from
`src/data/*/index.ts` are accounted for.

---

## Conventions

| Concern | Rule |
|---|---|
| Base path | `/api/v1`, served same-origin through the CloudFront `/api/*` behavior |
| Collections | `{"data": [...], "meta": {"next_cursor": "...", "total": 1234}}` |
| Single resources | the object, unenveloped |
| Pagination | opaque cursor: `?cursor=<c>&limit=<n>`; `limit` max 200, default 50 |
| Errors | RFC 9457 `application/problem+json` with `type`, `title`, `status`, `detail`, `instance`, and a `errors[]` array for field-level validation |
| Auth | `Authorization: Bearer <access>`; refresh via `HttpOnly` cookie |
| Tenancy | `X-Workspace-Id` header, validated against the caller's memberships on every request |
| Idempotency | `Idempotency-Key` required on POSTs that spend money or start jobs |
| Caching | `ETag` + `If-None-Match` on all composite reads; `Cache-Control: private, max-age=60` |
| Async | `202 Accepted` with `Location: /api/v1/jobs/{id}` and a job resource to poll |
| Time | ISO-8601 UTC with `Z`. Never a relative string — see Finding 1 |
| Money | `{"amount_minor": 600000, "currency": "USD"}`. Never `"$6,000"` |

**Shared query parameters** on analytics endpoints: `range` (`24h`, `7d`, `30d`, `90d`, `custom`),
`from` / `to` (ISO dates, required when `range=custom`), `model_id`, `category_id`, `region_id`.
These are exactly the controls in `FilterBar`, `MonitoringControls` and `PromptFilters`.

---

## Auth

| Method | Path | Notes |
|---|---|---|
| `POST` | `/auth/login` | `{email, password}` -> access token + refresh cookie. Rate-limited 5/min/IP. |
| `POST` | `/auth/refresh` | Rotates; reuse of a spent token revokes the family |
| `POST` | `/auth/logout` | Revokes the refresh family |
| `GET` | `/auth/me` | Current user, memberships, active workspace, role |
| `GET` | `/auth/oauth/google` / `/auth/oauth/microsoft` | OIDC start; `/callback` completes. Backs the two buttons already on the sign-in form |
| `POST` | `/auth/password/forgot` / `/auth/password/reset` | Backs the "Forgot password?" link, which currently routes to a page that does not exist |

**Replaces**: nothing today — `SignInForm.onSubmit` currently `console.log`s the credentials and
navigates. That line is the security bug this endpoint set closes.

---

## Public

| Method | Path | Replaces |
|---|---|---|
| `GET` | `/public/showcase-metrics` | `sign-in/showcase-metrics.json` (3 records). Unauthenticated, cached at the edge for 5 min |

---

## Reference & Workspace

| Method | Path | Replaces |
|---|---|---|
| `GET` | `/reference/setup` | `workspace-setup`: `suggestedCategories`, `regions`, `frequencies`, `defaults` (4) |
| `GET` | `/reference/models` | `shared/aiModels` (1). Includes `measurement_method` per Finding 2 |
| `GET` | `/reference/filters?screen=` | `filterOptions` x3 (prompt-library, model-monitoring, answer-analysis). One endpoint, screen-scoped |
| `POST` | `/workspaces` | The wizard's "Create Workspace & Launch Dashboard" button. Creates workspace, competitors, categories, regions and the default schedule in one transaction |
| `GET` `PATCH` | `/workspaces/{id}` | Post-onboarding settings |
| `GET` `POST` | `/competitors` | `shared/competitors`, `rivalCompetitors`, `brandNames` (3). The latter two are client-side derivations that stay client-side |
| `PATCH` `DELETE` | `/competitors/{id}` | The Competitor Tracker chips |
| `GET` `POST` `PATCH` `DELETE` | `/categories`, `/regions` | `shared/categories` (1) plus the wizard's editable lists |

---

## Visibility Dashboard

| Method | Path | Replaces |
|---|---|---|
| `GET` | `/dashboard/overview` | **7 collections in one response**: `kpis`, `shareOverTime`, `inclusion`, `sentiment`, `competitorSov`, `citationSources`, plus alert counts |
| `GET` | `/alerts?status=&severity=` | `visibility-dashboard/alerts` (1). Paginated — backs "View all historical alerts" |
| `PATCH` | `/alerts/{id}` | `{read_at}` / `{resolved_at}` |

`GET /dashboard/overview` response sketch:

```jsonc
{
  "range": { "from": "2026-08-27", "to": "2026-09-03", "timezone": "UTC" },
  "kpis": [
    { "key": "recommendation_share", "value": 42.8, "unit": "percent",
      "change": 5.2, "trend": "up", "sample_size": 1240,
      "sparkline": [40.1, 41.3, 40.8, 42.0, 42.8] }
  ],
  "share_over_time": {
    "series": [ { "competitor_id": "...", "name": "Northstar", "is_brand": true,
                  "points": [ { "date": "2026-08-27", "value": 42 } ] } ]
  },
  "inclusion": [ { "model_id": "chatgpt", "value": 84.2 } ],
  "sentiment": [ { "category_id": "...", "positive": 62, "neutral": 28, "negative": 10 } ],
  "competitor_sov": [ { "competitor_id": "kong", "name": "Kong", "share": 35.0 } ],
  "citation_sources": [ { "domain": "g2.com", "category": "Review", "count": 142, "trend": "up" } ]
}
```

Two deliberate differences from today's JSON. **`sparkline` is real data**, not the
`sparklineBase` / `sparklineVariance` pair the page currently uses to fabricate a shape — those two
fields disappear from `VisibilityMetric`. And every series carries a **stable id** alongside its
display name, so `modelChartColors` and `competitorChartColors` keep resolving by id even when a
customer renames a competitor.

---

## Prompt Library

| Method | Path | Replaces |
|---|---|---|
| `GET` | `/prompts?category_id=&use_case=&intent=&region_id=&model_id=&status=&q=&cursor=` | `prompt-library/prompts` (1). `last_run_at` and `brand_mention_rate` are joined from `metric_daily` |
| `POST` | `/prompts` | The Create Prompt dialog. Validates against the workspace prompt quota |
| `PATCH` `DELETE` | `/prompts/{id}` | Edit, pause/resume, archive |
| `POST` | `/prompts/{id}/run` | Ad-hoc single-prompt scan. `202` + job |
| `GET` | `/prompts/stats` | `prompt-library/stats` (1) — total, active schedules, categories, avg runs |
| `GET` | `/prompt-templates` | `prompt-library/templates` (1) |
| `GET` `POST` | `/schedules` | `prompt-library/scheduledRuns` (1) |
| `PATCH` `DELETE` | `/schedules/{id}` | |

---

## Model Monitoring

| Method | Path | Replaces |
|---|---|---|
| `GET` | `/monitoring/overview?range=&category_id=&region_id=&compare=` | **6 collections**: `modelStatus`, `modelSparkline`, `performance`, `metrics`, `positionDistribution`, `topSources` |
| `GET` | `/monitoring/runs?model_id=&mentioned=&cursor=` | `model-monitoring/recentRuns` (1). Paginated |
| `POST` | `/monitoring/scans` | The "Run New Scan" button. Body selects prompts/models; returns `202` + `scan_job`. Refuses with `429` and a quota problem-detail when the plan limit is hit |
| `GET` | `/monitoring/scans/{id}` | Progress: `planned`, `completed`, `failed`, `estimated_finish_at` |

The `compare` flag backs the "Compare models" switch; when set, series are returned per model rather
than aggregated.

---

## Answer Analysis

| Method | Path | Replaces |
|---|---|---|
| `GET` | `/answers?model_id=&category_id=&outcome=&sentiment=&region_id=&from=&to=&q=&cursor=` | `answer-analysis/answers` (1) — list projection: id, prompt snippet, model, outcome, run_at, brand_position |
| `GET` | `/answers/{id}` | Full record: answer text, reasoning factors, citations, inaccuracies, mentions |
| `POST` | `/answers/{id}/export` | The "Export Answer" button. `202` + report job |
| `PATCH` | `/answers/{id}/inaccuracies/{iid}` | Resolve or dismiss a flagged claim |

The list and detail split matters: `answers.json` today inlines the full answer text, reasoning and
sources for every record. At real volume that payload is megabytes for one page of results.

---

## Competitor Intelligence

| Method | Path | Replaces |
|---|---|---|
| `GET` | `/competitors/overview?range=&category_id=` | **6 collections**: `kpis`, `sovByCategory`, `sovTrend`, `comparison`, `strengths`, `rootCauses` |
| `POST` | `/competitors/battlecard` | "Generate Full Battlecard" — `202` + report job |

`strengths` and `rootCauses` are generated analyses, not stored facts. They are computed by a
worker on a schedule and cached with a `computed_at` the UI can display, rather than recomputed per
request — an LLM call on a page load is neither fast nor affordable.

---

## Content Recommendations

| Method | Path | Replaces |
|---|---|---|
| `GET` | `/recommendations?status=&priority=&assignee_id=&cursor=` | `recommendations` (1) |
| `PATCH` | `/recommendations/{id}` | Status and assignee changes — the card's inline controls |
| `POST` | `/recommendations/{id}/tasks` | "Create Content Task" |
| `GET` | `/recommendations/stats` | `content-recommendations/stats` (1) |
| `GET` | `/content-gaps` | `gapMap` + `contentTypes` (2) |
| `GET` | `/opportunities?kind=documentation,evidence,reviews` | `missingDocumentation`, `customerEvidence`, `reviewPlatforms` (3) |
| `POST` | `/recommendations/{id}/brief` | "Generate Brief" — `202` + report job |

---

## Experiments & Impact

| Method | Path | Replaces |
|---|---|---|
| `GET` `POST` | `/experiments` | `experiments` (1) |
| `GET` | `/experiments/summary?range=` | `summaryKpis` (1) |
| `GET` | `/experiments/{id}` | `timeline`, `impact`, `secondaryMetrics` (3) for one experiment |
| `POST` | `/experiments/{id}/events` | Mark published / completed |
| `GET` | `/experiments/recommended-next` | `recommendedNext` (1) — ranked from open gaps and past lift |
| `GET` | `/experiments/signal-stages` | `signalStages` (1) — the funnel definition; static reference data |

`impact` is served as two labelled series (brand, competitor) over the experiment window with the
baseline boundary marked, so the chart can shade before/after without the client inferring it.

---

## Reports, Billing, Team, Compliance

| Method | Path | Replaces |
|---|---|---|
| `GET` | `/billing/plan` | `planTiers` (1) plus the current subscription |
| `GET` | `/billing/usage` | `usageLimits` (1) — live counters, not fixtures |
| `GET` | `/billing/invoices?cursor=` | `invoices` (1) |
| `POST` | `/billing/subscription` | Upgrade/downgrade -> Stripe Checkout or portal session |
| `POST` | `/billing/portal` | "Manage Payment Method" |
| `POST` | `/webhooks/stripe` | Signature-verified; the only unauthenticated write endpoint |
| `GET` `POST` | `/team/members` | `teamMembers` (1) + "Invite Team Member" |
| `PATCH` `DELETE` | `/team/members/{id}` | Role change, revoke. Cannot remove the last owner |
| `GET` | `/reports/types` | `reportTypes` (1) |
| `GET` | `/reports?cursor=` | `recentExports` (1) |
| `POST` | `/reports` | "Generate Report" — `202` + job |
| `GET` | `/reports/{id}/download` | `302` to a 15-minute presigned S3 URL |
| `GET` `PATCH` | `/compliance` | The Compliance Settings panel |
| `POST` | `/compliance/export` / `/compliance/erase` | GDPR subject rights |

---

## Coverage Check

| Module | Exports | Covered by |
|---|---|---|
| `shared` | 5 | `/reference/models`, `/competitors`, `/categories` (2 are client derivations) |
| `sign-in` | 1 | `/public/showcase-metrics` |
| `workspace-setup` | 4 | `/reference/setup` |
| `visibility-dashboard` | 7 | `/dashboard/overview`, `/alerts` |
| `prompt-library` | 5 | `/prompts`, `/prompts/stats`, `/prompt-templates`, `/schedules`, `/reference/filters` |
| `model-monitoring` | 8 | `/monitoring/overview`, `/monitoring/runs`, `/reference/filters` |
| `answer-analysis` | 2 | `/answers`, `/reference/filters` |
| `competitor-intelligence` | 6 | `/competitors/overview` |
| `content-recommendations` | 7 | `/recommendations`, `/recommendations/stats`, `/content-gaps`, `/opportunities` |
| `experiments-impact` | 7 | `/experiments*` |
| `reports-billing` | 6 | `/billing/*`, `/team/members`, `/reports*` |
| **Total** | **58** | **fully mapped** |

---

## Errors

| Status | `type` | When |
|---|---|---|
| 400 | `/errors/validation` | Body or query failed Pydantic validation; `errors[]` names each field |
| 401 | `/errors/unauthenticated` | Missing or expired access token |
| 403 | `/errors/forbidden` | Role lacks the permission, or the workspace is not the caller's |
| 404 | `/errors/not-found` | Also returned for rows in another tenant — never 403, which would confirm existence |
| 409 | `/errors/conflict` | Idempotency key replayed with a different body; concurrent update |
| 422 | `/errors/unprocessable` | Semantically invalid, e.g. an experiment whose baseline ends after it starts |
| 429 | `/errors/rate-limited` | Request rate; `Retry-After` set |
| 429 | `/errors/quota-exceeded` | Plan limit hit. Distinct `type` so the UI can offer an upgrade rather than a retry |
| 503 | `/errors/provider-unavailable` | A model provider is circuit-broken; names the affected model so partial results stay legible |
