# Feature Specification: VisibilityOS Backend Platform

**Feature Branch**: `002-backend-platform`

**Created**: 2026-09-10 (written retroactively — `plan.md`, `data-model.md`, and `contracts/api.md` were drafted first; this spec closes the gap the plan itself flags under "Open Questions for `/speckit-specify`")

**Status**: Draft — 4 of the 5 original open questions are now resolved (2026-09-15, product owner decision) and reflected below. Open Question 1 (Growth tier scan-commitment semantics) remains unresolved and still gates `FR-012` — everything else is no longer a blocker.

**Input**: User description: "Build the backend for VisibilityOS: track how AI assistants describe a brand versus its competitors, the way Ahrefs or Semrush track Google rankings. The frontend (10 screens) and an extremely detailed technical plan already exist; this spec defines what that plan is building and why, so implementation can proceed against an approved spec instead of the plan front-running it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Onboard a Workspace and Team (Priority: P1)

An admin completes Workspace Setup — brand, competitors, categories, regions, monitoring frequency — and invites teammates, and the workspace is ready to track real data instead of the demo JSON currently rendered.

**Why this priority**: nothing else functions without a workspace, a tenant boundary, and at least one authenticated user. Every other story depends on this.

**Independent Test**: complete the setup wizard end to end, invite a second user, confirm both can sign in and see the same workspace with zero data from any other workspace.

**Acceptance Scenarios**:

1. **Given** a new organization, **When** the setup wizard is completed, **Then** a Workspace is created with brand, competitors, categories, regions, and a monitoring frequency, and `onboarding_completed_at` is set.
2. **Given** an admin invites a teammate by email, **When** the invite is accepted, **Then** the teammate has a Membership with the assigned role and appears in the Team Access panel.
3. **Given** two separate workspaces, **When** either queries any tenant-scoped data, **Then** row-level security guarantees zero cross-workspace visibility — no query-layer bug can leak another tenant's data.

---

### User Story 2 - Maintain a Prompt Library (Priority: P1)

A marketer creates and manages the buyer-language prompts that get tracked, with templates, schedules, and quota awareness — the Prompt Library screen's actual data, not a static list.

**Why this priority**: prompts are the input to everything the product measures; the scan pipeline (User Story 3) has nothing to run without this.

**Independent Test**: create a prompt, assign it a schedule, confirm it appears correctly in a subsequent list call and is picked up by the (mocked, in this story) scan scheduler.

**Acceptance Scenarios**:

1. **Given** a new prompt with a schedule, **When** saved, **Then** it persists with its template and schedule intact.
2. **Given** a workspace at its plan's prompt quota, **When** another prompt is added, **Then** the system blocks the add with a clear quota message rather than silently exceeding it.

---

### User Story 3 - Automated Scans Produce Real Monitoring Data (Priority: P1)

The system runs each tracked prompt against each tracked AI model on schedule, and Model Monitoring / Answer Analysis / the Visibility Dashboard render real, derived data — mention detection, position, sentiment, citations, reasoning — instead of static JSON.

**Why this priority**: this is the core value proposition of the entire product. Every downstream screen depends on this pipeline existing and running correctly.

**Independent Test**: trigger a manual scan for one prompt across the available providers; confirm an Answer record is captured, parsed, and reflected in `metric_daily` within the expected pipeline latency.

**Acceptance Scenarios**:

1. **Given** a due scheduled scan, **When** `beat` enqueues it, **Then** a quota check runs first — an over-quota workspace is skipped with an alert, and no provider spend occurs.
2. **Given** a captured provider answer, **When** parsed, **Then** mention detection, position, and outcome classification run deterministically (no LLM call), while sentiment, reasoning, and inaccuracy checks run as cached LLM calls.
3. **Given** a parser bug fix, **When** `backfill_reparse` is run over already-captured raw payloads, **Then** metrics are corrected without any new provider calls or cost.
4. **Given** a metric computed from a small sample, **When** rendered, **Then** its `sample_size` is available so the frontend can distinguish a real move from noise.

---

### User Story 4 - Competitive Intelligence and Recommendations (Priority: P2)

A marketer sees share-of-voice against named competitors and works a recommendation queue with quantified predicted impact, matching the Competitor Intelligence and Content Recommendations screens.

**Why this priority**: depends on User Story 3's derived metrics existing; it's the "so what" layer on top of raw monitoring.

**Independent Test**: with metric data present, confirm the comparison table, gap map, and a generated recommendation with a predicted-impact figure all render correctly and can be assigned to a user.

**Acceptance Scenarios**:

1. **Given** metric data for the brand and its competitors, **When** Competitor Intelligence is queried, **Then** share-of-voice by category reconciles against the underlying `metric_daily` rows.
2. **Given** a content gap is detected, **When** a recommendation is generated, **Then** the platform drafts it automatically (rationale + quantified predicted impact from the detected gap), and the assigned customer user can edit, accept, or reject that draft, or author a net-new recommendation from scratch that carries no platform-generated rationale of its own. *(Resolved 2026-09-15 — hybrid: platform-drafted by default, customer-editable, customer-authorable.)*

---

### User Story 5 - Experiments Prove Impact (Priority: P2)

A marketer ties a content change to a before/after visibility measurement, matching Experiments & Impact.

**Why this priority**: depends on User Story 3 and 4; it's the proof layer that closes the loop back to the renewal case in Reports & Billing.

**Independent Test**: create an Experiment tied to a recommendation, let metric data accrue on both sides of its start date, confirm the impact series correctly computes baseline vs. current lift.

**Acceptance Scenarios**:

1. **Given** an Experiment with a start date, **When** queried, **Then** its impact series shows baseline (pre-start) vs. current (post-start) values computed from real `metric_daily` data.

---

### User Story 6 - Billing, Reports, and Compliance (Priority: P3)

An admin manages subscription, usage, and invoices, and exports reports and compliance/audit records, matching Reports & Billing.

**Why this priority**: lowest priority of the six — necessary for a real commercial product, but not blocking for internal validation of Stories 1-5.

**Independent Test**: confirm usage counters accurately reflect actual scan volume, a plan-limit breach is enforced (not just displayed), and a report export completes asynchronously with a presigned download link.

**Acceptance Scenarios**:

1. **Given** a workspace approaching its plan's scan quota, **When** the limit is reached, **Then** further scans are blocked, not merely flagged, until the next billing cycle or a plan upgrade.
2. **Given** a requested report export, **When** generation completes, **Then** a presigned, time-limited download link is returned — the report is never served synchronously from the request thread.

---

### Edge Cases

- What happens when a tracked AI model has no queryable consumer API? *(Resolved 2026-09-15)* — drop the Copilot-branded catalog slot entirely. Replace it with a generic "AI API Key" tracked source: a customer connects their own key for whichever backing API they actually use (Azure OpenAI, OpenAI, or another provider), and that connection is what gets measured and labeled — never the Copilot brand name, since the brand's consumer surface itself stays unmeasurable regardless of which API sits behind it.
- What happens when `beat` runs twice during a deployment overlap? MUST NOT double-spend on provider calls — enforced via a Redis leader lock and an idempotency key per `(schedule, window)`.
- What happens when a provider returns a 429 or 5xx? MUST retry with exponential backoff and jitter, with a circuit breaker per provider so one struggling provider doesn't starve the queue for others.
- What happens to historical charts when scoring logic changes? MUST NOT silently blend two parser versions in one series — `parser_version` is carried on every derived row specifically to prevent this.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST isolate every tenant-scoped table by workspace using row-level security, not application-layer filtering alone.
- **FR-002**: System MUST support the full Workspace Setup flow (brand, competitors, categories, regions, monitoring frequency) and team invites with role-based membership.
- **FR-003**: System MUST support prompt CRUD with templates, schedules, and quota enforcement tied to plan tier.
- **FR-004**: System MUST run scheduled scans via a singleton scheduler that cannot double-enqueue during a deployment overlap.
- **FR-005**: System MUST capture every raw provider answer immutably (S3) before any derived parsing, so re-scoring never requires re-spending on provider calls.
- **FR-006**: System MUST perform mention/position/outcome classification deterministically, without an LLM call, and MUST use cached, cheap-LLM calls only for sentiment, reasoning, and inaccuracy detection.
- **FR-007**: System MUST expose `sample_size` on every metric so the frontend can distinguish a statistically meaningful change from noise.
- **FR-008**: System MUST version every derived row with `parser_version` and never mix versions within one rendered series.
- **FR-009**: System MUST enforce plan-tier usage limits (prompts, scan frequency) by blocking over-quota actions, not just displaying a warning.
- **FR-010**: System MUST generate reports asynchronously and deliver them via presigned, time-limited download links.
- **FR-011** *(resolved 2026-09-15)*: System MUST measure five catalog models via their queryable APIs. The sixth slot MUST be a generic "AI API Key" tracked source — the customer connects their own backing-API key (Azure OpenAI, OpenAI, or similar) and that connection is what gets measured — never a Copilot-branded number, since Copilot's own consumer surface has no queryable API regardless of what sits behind it.
- **FR-012**: System MUST resolve the Growth tier's scan-commitment semantics before the scheduler's contract is finalized. `[NEEDS CLARIFICATION: Open Question 1 — hard daily commitment vs. rotating weekly-refresh model — still open, product owner actively deciding]`
- **FR-013** *(resolved 2026-09-15)*: System MUST implement "regional focus" as a *signaled* region for v1 — passing legitimate locale/language parameters and region-specific endpoints where a provider supports them (e.g., an `Accept-Language` header, a locale field, or a country-specific endpoint such as `google.de`) — rather than standing up real per-region network egress. Every region-tagged result MUST carry a `region_method` value (`signaled` for v1) so the UI can be honest that this is a best-effort locale signal, not a verified regional vantage point. True network-egress-based regional scanning is explicitly deferred to a later phase, gated on demonstrated customer demand, not built speculatively now.
- **FR-014** *(resolved 2026-09-15)*: System MUST target a US-only deployment for v1 — no EU-resident infrastructure in M0. The GDPR claim on the sign-in screen MUST be reviewed against this decision before launch: either scope the claim to what a US deployment can actually back (standard cross-border safeguards, not data residency) or remove/soften it until EU-resident infrastructure exists. Shipping an unqualified GDPR-compliance claim against infrastructure not built to support it is a real trust and legal exposure, not just a wording detail.

### Key Entities

Entities are fully specified with column-level detail in `data-model.md` (31 tables across 7 groups). At the spec level:

- **Organization / Workspace / User / Membership**: the tenancy and access-control backbone.
- **Prompt**: a tracked buyer-language query with a template and schedule.
- **Answer**: one captured provider response to one prompt, immutable raw payload plus versioned derived fields (mention, position, outcome, sentiment, citations, reasoning, inaccuracies).
- **Competitor**: a tracked rival brand, including the workspace's own brand as a special case.
- **metric_daily**: the single rollup table nearly every chart reads from — keyed by workspace, date, metric, model, category, region, competitor.
- **Experiment**: a tracked content change with a before/after impact series.
- **Content Recommendation**: a prioritized, assignable action with a quantified predicted impact.
- **Subscription / Usage Counter / Invoice**: the billing backbone.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero cross-workspace data leaks across any entity, verified by a standing isolation test in CI — not a one-time manual check.
- **SC-002**: A scan captured today can be re-scored with an improved parser at zero additional provider cost, verified by a backfill run that makes zero outbound provider calls.
- **SC-003**: 100% of quota and plan-limit enforcement happens server-side and blocks the action — never a frontend-only check that a direct API call could bypass.
- **SC-004**: Every rendered metric that could plausibly be noise (small sample) carries a visible sample size in its API response.
- **SC-005**: The `beat` scheduler cannot double-enqueue the same `(schedule, window)` under any tested deployment-overlap scenario.

## Assumptions

- Provider account provisioning (OpenAI, Anthropic, Google, Perplexity) begins in parallel with M0, not gated behind spec approval — this is an external-dependency lead time, not a product decision, per the plan's own risk register.
- Of the five original open product decisions, four are now resolved (Copilot/AI API Key, region signaling, recommendation authoring, US-only deployment) and folded into `FR-011`, `FR-013`, `FR-014`, and User Story 4 above. Only Open Question 1 (`FR-012`, Growth tier scan-commitment semantics) remains genuinely open — it still gates the scheduler's final contract and Milestone 3's start, per `PHASE-ROADMAP.md`.
- This spec inherits `plan.md`'s technical context (FastAPI, Postgres 16 with RLS, Celery/Redis, ECS Fargate, S3) as already-decided rather than proposing alternatives, since that plan reflects real analysis already done against this exact frontend.
