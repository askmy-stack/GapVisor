# Data Model: GapVisor Backend Platform

**Feature**: `002-backend-platform` | **Plan**: [plan.md](./plan.md)

Postgres 16. All identifiers are `uuid` primary keys generated with `gen_random_uuid()` unless
noted. All timestamps are `timestamptz` stored in UTC. Every tenant-scoped table carries
`workspace_id uuid NOT NULL` and has row-level security enabled.

---

## Conventions

**Row-level security.** Every tenant-scoped table gets:

```sql
ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON <t>
  USING (workspace_id = current_setting('app.workspace_id', true)::uuid);
```

A FastAPI dependency issues `SET LOCAL app.workspace_id = $1` inside the request transaction after
resolving the caller's membership. The application connects as a role **without** `BYPASSRLS`;
migrations use a separate role that has it.

**Money** is `bigint` minor units plus a `char(3)` ISO-4217 currency column. Never `float`, never a
pre-formatted string.

**Enumerations** are Postgres `enum` types where the set is closed and product-defining
(`outcome`, `sentiment_label`, `severity`, `role`), and `text` with a `CHECK` where the set is
expected to grow.

**Soft deletion** applies only to `prompts`, `competitors` and `content_recommendations`, via
`archived_at timestamptz`. History must not disappear from charts because a prompt was retired.

---

## 1. Tenancy & Identity

### organizations
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text NOT NULL | |
| `stripe_customer_id` | text UNIQUE | null until first subscription |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

### workspaces
Backs the Workspace Setup wizard (`src/data/workspace-setup/`).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid FK -> organizations | |
| `name` | text NOT NULL | "Workspace Basics" |
| `brand_name` | text NOT NULL | the tracked brand; mirrors `competitors.is_brand` |
| `brand_domains` | text[] NOT NULL DEFAULT '{}' | drives citation `authority = 'owned'` |
| `fact_sheet` | text | ground truth for inaccuracy detection |
| `monitoring_frequency` | text NOT NULL CHECK (in 'realtime','daily','weekly') | `frequencies.json` |
| `timezone` | text NOT NULL DEFAULT 'UTC' | rollup boundary |
| `onboarding_completed_at` | timestamptz | null while the wizard is unfinished |
| `created_at` | timestamptz NOT NULL | |

### users
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `email` | citext UNIQUE NOT NULL | |
| `password_hash` | text | null for OAuth-only accounts (Argon2id) |
| `name` | text NOT NULL | |
| `avatar_url` | text | |
| `oauth_provider` / `oauth_subject` | text | unique together; Google / Microsoft |
| `last_active_at` | timestamptz | Team Access "Last Active" column |
| `created_at` | timestamptz NOT NULL | |

### memberships
Backs the Team Access panel. A user may belong to several workspaces.

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid FK -> users | PK part |
| `workspace_id` | uuid FK -> workspaces | PK part |
| `role` | enum `member_role` ('owner','admin','analyst','viewer') NOT NULL | |
| `status` | text CHECK (in 'active','invited','suspended') NOT NULL | "Pending" chips in the UI |
| `invited_by` / `invited_at` / `accepted_at` | uuid / timestamptz | |

### refresh_tokens
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `token_hash` | bytea NOT NULL | SHA-256; the raw token is never stored |
| `family_id` | uuid NOT NULL | rotation lineage; reuse of a rotated token revokes the family |
| `expires_at` / `revoked_at` | timestamptz | |
| `user_agent` / `ip` | text / inet | |

### audit_log
Append-only; no UPDATE or DELETE grant.

| Column | Type | Notes |
|---|---|---|
| `id` | bigserial PK | |
| `workspace_id` | uuid | nullable for org-level actions |
| `actor_user_id` | uuid | null for system actions |
| `action` | text NOT NULL | `prompt.created`, `member.invited`, ... |
| `entity_type` / `entity_id` | text / uuid | |
| `diff` | jsonb | before/after, secrets redacted at write time |
| `request_id` | text | correlates to `X-Request-Id` and the trace |
| `ip` | inet | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

---

## 2. Reference & Configuration

### ai_models
Global catalog, not tenant-scoped. Seeded from `src/data/shared/ai-models.json`.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | slug: `chatgpt`, `claude`, `gemini`, `perplexity`, `copilot`, `buyer-agents` |
| `name` / `long_name` / `badge` | text NOT NULL | exactly the current JSON fields |
| `provider` | text | `openai`, `anthropic`, `google`, `perplexity`, null for derived |
| `provider_model_id` | text | e.g. the concrete API model name; versioned over time |
| `measurement_method` | enum ('api','proxy','derived','unavailable') NOT NULL | **Finding 2** |
| `supports_native_citations` | boolean NOT NULL DEFAULT false | true for Perplexity |
| `cost_per_1k_input` / `cost_per_1k_output` | numeric(10,6) | drives spend estimates |
| `enabled` | boolean NOT NULL DEFAULT true | |

### workspace_models
`(workspace_id, model_id, enabled, monthly_quota)` — which models a workspace pays to track.

### competitors
Seeded per workspace from the setup wizard. `is_brand = true` for exactly one row, enforced by a
partial unique index.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `workspace_id` | uuid FK | |
| `name` | text NOT NULL | |
| `logo_letter` | text NOT NULL | the single-letter badge the UI renders |
| `domain` | text | |
| `is_brand` | boolean NOT NULL DEFAULT false | |
| `archived_at` | timestamptz | |

### competitor_aliases
`(competitor_id, alias, match_type)` where `match_type` is `exact` or `regex`. Mention detection is
only as good as this table — "Mulesoft", "MuleSoft" and "Anypoint" must all resolve to one row.

### categories / regions
`(id, workspace_id, value, label, sort_order)`. Seeded from `suggested-categories.json` and
`regions.json`; both are user-editable, which is why they are tables and not enums.

### authority_domains
`(domain PK, authority, source, updated_at)` plus a per-workspace override table. Classifies
citations as `owned` / `high` / `medium` / `low`.

---

## 3. Prompts & Scheduling

### prompts
Backs `src/data/prompt-library/prompts.json`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `workspace_id` | uuid FK | |
| `text` | text NOT NULL | |
| `category_id` / `region_id` | uuid FK | |
| `use_case` | text NOT NULL | Procurement / Technical / Strategic |
| `intent` | enum ('awareness','comparison','evaluation','decision') NOT NULL | |
| `status` | enum ('active','paused') NOT NULL DEFAULT 'active' | |
| `samples_per_run` | smallint NOT NULL DEFAULT 1 | n-sampling for metric stability |
| `created_by` | uuid FK -> users | |
| `archived_at` | timestamptz | |
| `created_at` / `updated_at` | timestamptz | |

`prompts.last_run_at` and `prompts.brand_mention_rate` — both shown in the Prompt Library table —
are **derived**, served from `metric_daily` rather than stored, so they cannot drift.

### prompt_models
`(prompt_id, model_id)`. The Create Prompt dialog's "Models to Track" checkboxes.

### prompt_templates
Global, not tenant-scoped: `(id, title, description, tag, body)`. Seeded from `templates.json`.

### schedules
Backs the Scheduled Runs panel.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `workspace_id` | uuid FK | |
| `name` | text NOT NULL | |
| `frequency` | text NOT NULL | `daily`, `weekly`, `bi-weekly`, `manual` |
| `cron` | text | derived from `frequency` + `timezone`; stored so it is inspectable |
| `rotation_strategy` | text NOT NULL DEFAULT 'all' | `all` or `rotate` — **Finding 3** |
| `next_run_at` | timestamptz | indexed; the beat scheduler's only query |
| `enabled` | boolean NOT NULL DEFAULT true | |

### schedule_prompts
`(schedule_id, prompt_id)`, or a stored filter in `schedules.filter jsonb` for "all prompts in
category X". Both are supported; the filter form is what the UI exposes.

### scan_jobs
One row per triggered batch. Backs the "Run New Scan" button and the job-status polling.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `workspace_id` | uuid FK | |
| `schedule_id` | uuid FK | null for manual runs |
| `trigger` | text CHECK (in 'scheduled','manual','backfill') | |
| `status` | enum ('queued','running','completed','failed','partial') | |
| `idempotency_key` | text | UNIQUE per `(workspace_id, schedule_id, window)`; stops double-scheduling |
| `planned_count` / `completed_count` / `failed_count` | integer | progress bar |
| `estimated_cost_usd` / `actual_cost_usd` | numeric(12,4) | |
| `started_at` / `finished_at` | timestamptz | |

---

## 4. Facts

### answers
The fact table. Range-partitioned by `run_at` month; partitions created a quarter ahead by a
maintenance job. Backs `src/data/answer-analysis/answers.json` and `recent-runs.json`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK is `(id, run_at)` because of partitioning |
| `workspace_id` | uuid NOT NULL | |
| `job_id` | uuid FK -> scan_jobs | |
| `prompt_id` | uuid FK -> prompts | |
| `model_id` | text FK -> ai_models | |
| `run_at` | timestamptz NOT NULL | partition key; the UI's "timestamp" and "runDate" both derive from this |
| `raw_s3_key` | text NOT NULL | immutable capture |
| `answer_text` | text NOT NULL | |
| `brand_mentioned` | boolean | null until parsed |
| `brand_position` | smallint | 1-based ordinal among recommended vendors; null if absent |
| `outcome` | enum ('recommended','not_recommended','negative') | |
| `sentiment_label` | enum ('positive','neutral','negative') | |
| `sentiment_score` | numeric(5,2) | 0-100, the "82/100" KPI |
| `tokens_in` / `tokens_out` | integer | |
| `cost_usd` | numeric(10,6) | |
| `latency_ms` | integer | |
| `parse_status` | text CHECK (in 'pending','parsed','failed') NOT NULL | |
| `parser_version` | smallint | null while pending; the re-scoring key |
| `content_hash` | bytea | dedupe and judge-cache key |

Indexes: `(workspace_id, run_at DESC)`, `(workspace_id, prompt_id, run_at DESC)`,
`(workspace_id, model_id, run_at DESC)`, partial `(workspace_id) WHERE parse_status = 'pending'`.

### answer_mentions
One row per brand or competitor detected in an answer. This is what share-of-voice is computed from.

`(answer_id, run_at, competitor_id, position smallint, mention_count smallint, sentiment_label,
context text)`

### answer_citations
`(answer_id, run_at, url, domain, title, authority, ordinal, is_native)` — `is_native` distinguishes
a provider-supplied citation from one extracted from the answer text.

### answer_reasoning
`(answer_id, run_at, factor text, status enum('positive','neutral','negative'), ordinal)` — the
"Why this answer" panel in Answer Analysis.

### answer_inaccuracies
`(id, answer_id, run_at, claim text, severity enum('high','medium','low'), resolved_at, resolved_by)`
— resolvable, because the UI treats these as a work queue.

---

## 5. Rollups

### metric_daily
The single read model behind every KPI, chart and metric table.

| Column | Type | Notes |
|---|---|---|
| `workspace_id` | uuid NOT NULL | |
| `date` | date NOT NULL | workspace-local day |
| `metric_key` | text NOT NULL | `inclusion_rate`, `recommendation_share`, `avg_position`, `citation_coverage`, `sentiment_score`, `share_of_voice` |
| `model_id` | text | NULL = all models |
| `category_id` | uuid | NULL = all categories |
| `region_id` | uuid | NULL = all regions |
| `competitor_id` | uuid | NULL = the brand; set for competitor SOV |
| `value` | numeric(12,4) NOT NULL | |
| `sample_size` | integer NOT NULL | how many answers this is computed from |
| `parser_version` | smallint NOT NULL | never mix versions inside one series |

PK `(workspace_id, date, metric_key, model_id, category_id, region_id, competitor_id)` with
`NULL`-safe uniqueness via `COALESCE` expressions in a unique index. Written by `UPSERT` so an
incremental rollup and a nightly full rollup converge on the same value.

This one table serves: Visibility Dashboard KPIs and all four charts; Model Monitoring's metrics
table, performance chart and sparklines; Competitor Intelligence's SOV by category, trend and
comparison table; Experiments' impact series and secondary metrics.

### citation_domain_daily
`(workspace_id, date, domain, category, count, prev_count)` — the Citation Coverage panel and
Model Monitoring's Top Sources, including the growth percentage.

### position_distribution_daily
`(workspace_id, date, model_id, bucket, count)` where bucket is `pos_1` / `pos_2` / `pos_3` /
`other` / `none`, matching `position-distribution.json` exactly.

---

## 6. Content & Experiments

### content_gaps
`(id, workspace_id, category_id, content_type, status enum('covered','partial','missing'),
evidence jsonb, computed_at)` — the Content Gap Map grid.

### content_recommendations
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `workspace_id` | uuid FK | |
| `title` | text NOT NULL | |
| `content_type` | text NOT NULL | |
| `priority` | enum ('critical','high','medium','low') NOT NULL | |
| `rationale` / `impact_estimate` | text | |
| `status` | enum ('not_started','in_progress','in_review','published') NOT NULL | |
| `assignee_user_id` | uuid FK -> users | the avatar in the card |
| `source_gap_id` | uuid FK -> content_gaps | provenance |
| `origin` | text CHECK (in 'generated','manual') | Open Question 4 |
| `archived_at` | timestamptz | |

`recommendation_tags` is `(recommendation_id, tag)`. `missing-documentation.json`,
`customer-evidence.json` and `review-platforms.json` become recommendations with a `kind`
discriminator rather than three near-duplicate tables.

### experiments
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `workspace_id` | uuid FK | |
| `name` / `type` | text NOT NULL | |
| `status` | text CHECK (in 'planned','running','completed','abandoned') | |
| `recommendation_id` | uuid FK | the content change under test |
| `primary_metric` | text NOT NULL | a `metric_daily.metric_key` |
| `baseline_start` / `baseline_end` / `started_at` / `ended_at` | timestamptz | window boundaries; lift is computed, not stored |

### experiment_events
`(id, experiment_id, event_type enum('published','first_citation','share_lift','completed'),
occurred_at, note)` — the timeline, whose icons and colors stay in `types.ts` keyed by
`event_type`.

### experiment_metrics
`(experiment_id, metric_key, before numeric, after numeric, delta numeric)` — the Secondary Metrics
table, materialized when an experiment completes so historical results do not shift under later
re-scoring.

---

## 7. Billing, Reporting, Alerting

### plans
`(code PK, name, price_cents, currency, limits jsonb, sort_order, active)` where `limits` holds
`{prompts, competitors, regions, scans_per_month, seats}` — the five rows of `usage-limits.json`.

### subscriptions
`(id, org_id, plan_code, status, current_period_start, current_period_end,
stripe_subscription_id, cancel_at_period_end)`.

### usage_counters
`(workspace_id, period date, metric text, value bigint)` with `metric` matching the `plans.limits`
keys. Incremented transactionally at enqueue time; the quota check reads this and refuses the scan
before any provider is called.

### invoices
`(id, org_id, stripe_invoice_id, number, amount_cents, currency, status, issued_at, paid_at,
pdf_url)`. Note `amount_cents`, not `"$6,000.00"` — Finding 1.

### report_runs
`(id, workspace_id, report_type, period_start, period_end, format, status, s3_key, size_bytes,
requested_by, created_at, completed_at)`. Downloads are presigned URLs with a 15-minute TTL, never
public objects.

### alerts
`(id, workspace_id, severity enum('critical','warning','info'), title, body, entity_type,
entity_id, rule_id, created_at, read_at, resolved_at)`. The current `alertStyles` lookup is keyed by
row id, which cannot survive real data — the front end must re-key it to `severity`, with the
deliberate blue/emerald split for two `info` alerts either dropped or promoted to a real
`alert_kind` column. Flagged for the spec.

### alert_rules
`(id, workspace_id, metric_key, comparator, threshold, window_days, severity, channels jsonb,
enabled)` — what turns a metric movement into a row in `alerts`.

### compliance_settings
`(workspace_id PK, retention_days, export_format_default, pii_redaction_enabled,
data_region, updated_by, updated_at)` — backs the Compliance Settings panel and drives the nightly
purge job.

---

## Seeding

`alembic upgrade head` then `python -m app.seed --demo` loads the existing fixture set — the
Northstar brand, its five competitors, six models, ten prompts and their sample answers — into a
workspace flagged `is_demo = true`. This keeps the demo reproducible, keeps the constitution's
"demo content must remain fictional" rule satisfiable, and gives the contract tests a stable
fixture that is byte-comparable with today's JSON.
