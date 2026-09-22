# Phase 0 Research: Extract Hardcoded Data to JSON

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-09-02

This document satisfies **FR-001**: an exhaustive inventory of every hardcoded business and sample
data collection, each classified as *move* or *keep* with a stated reason, plus the design
decisions that resolve the questions the inventory raised.

**Counting unit**: one *collection* is one contiguous data literal, or one hand-written group of
sibling `<SelectItem>` options that becomes a single JSON array. Files under
`src/components/ui/` are excluded throughout — they are design primitives containing no business
data.

**Totals**: **76 collections** across 37 files — **69 to move**, **7 to keep in code**.

---

## Part 1 — Inventory

### 1.1 Visibility Dashboard → `src/data/visibility-dashboard/`

| # | Source | Collection | Target | Notes |
|---|--------|-----------|--------|-------|
| 1 | `pages/VisibilityDashboard.tsx:15` | `kpis` | `kpis.json` | Sparkline `base`/`variance` are data; the generator function stays |
| 2 | `components/VisibilityDashboard/ShareOverTimeChart.tsx:14` | `data` | `share-over-time.json` | |
| 3 | `components/VisibilityDashboard/DetailCharts.tsx:4` | `inclusionData` | `inclusion.json` | |
| 4 | `components/VisibilityDashboard/DetailCharts.tsx:12` | `sentimentData` | `sentiment.json` | |
| 5 | `components/VisibilityDashboard/CompetitorSOV.tsx:5` | `competitors` | `competitor-sov.json` | |
| 6 | `components/VisibilityDashboard/CitationCoverage.tsx:12` | `sources` | `citation-sources.json` | |
| 7 | `components/VisibilityDashboard/AlertsPanel.tsx:6` | `alerts` | `alerts.json` | **Carries `color` + icon** — see D2 |
| 8 | `components/VisibilityDashboard/FilterBar.tsx:13` | `MODELS` | `shared/ai-models.json` | Duplicate of #10 |
| 9 | `components/VisibilityDashboard/FilterBar.tsx:14` | `CATEGORIES` | `shared/categories.json` | |
| 10 | `components/VisibilityDashboard/ShareOverTimeChart.tsx:24` | `MODELS` | `shared/ai-models.json` | Duplicate of #8 |

### 1.2 Model Monitoring → `src/data/model-monitoring/`

| # | Source | Collection | Target | Notes |
|---|--------|-----------|--------|-------|
| 11 | `ModelStatusCards.tsx:6` | `data` | `model-status.json` | **Carries `color`** — see D2 |
| 12 | `ModelStatusCards.tsx:15` | `mockSparkline` | `model-sparkline.json` | |
| 13 | `PerformanceChart.tsx:4` | `data` | `performance.json` | |
| 14 | `MetricsTable.tsx:5` | `metrics` | `metrics.json` | |
| 15 | `RecentRuns.tsx:7` | `recentRuns` | `recent-runs.json` | |
| 16 | `InsightsCards.tsx:4` | `distData` | `position-distribution.json` | **Carries `color`** — see D2 |
| 17 | `InsightsCards.tsx:12` | `topSources` | `top-sources.json` | |
| 18 | `MonitoringControls.tsx:16` | Time-range options | `filter-options.json` | Hand-written `<SelectItem>` group — see D4 |
| 19 | `MonitoringControls.tsx:31` | Category options | `filter-options.json` | Screen-local — values differ from the shared set, see D5a |
| 20 | `MonitoringControls.tsx:46` | Region options | `filter-options.json` | |

### 1.3 Prompt Library → `src/data/prompt-library/`

| # | Source | Collection | Target | Notes |
|---|--------|-----------|--------|-------|
| 21 | `PromptTable.tsx:47` | `mockPrompts` | `prompts.json` | Already typed `Prompt[]`; type moves to `types.ts` |
| 22 | `PromptTemplates.tsx:5` | `templates` | `templates.json` | |
| 23 | `ScheduledRuns.tsx:5` | `scheduledRuns` | `scheduled-runs.json` | |
| 24 | `StatsStrip.tsx:4` | `stats` | `stats.json` | |
| 25 | `PromptFilters.tsx:39` | Category options | `filter-options.json` | Screen-local — "Fintech"/"Dev Tools", see D5a |
| 26 | `PromptFilters.tsx:51` | Use-case options | `filter-options.json` | |
| 27 | `PromptFilters.tsx:63` | Intent options | `filter-options.json` | |
| 28 | `PromptFilters.tsx:76` | Region options | `filter-options.json` | |
| 29 | `PromptFilters.tsx:88` | Model options | `filter-options.json` | Screen-local — 4 models, not the shared 6, see D5a |
| 30 | `CreatePromptDialog.tsx:113` | Inline model array in `.map()` | `shared/ai-models.json` | Uses long model names — see D8 |

### 1.4 Answer Analysis → `src/data/answer-analysis/`

| # | Source | Collection | Target | Notes |
|---|--------|-----------|--------|-------|
| 31 | `pages/AnswerAnalysis.tsx:10` | `MOCK_RECORDS` | `answers.json` | Largest record set; nested reasoning/sources/inaccuracies |
| 32 | `AnswerAnalysis/FilterBar.tsx:25` | Model options | `filter-options.json` | Screen-local — "GPT-4o"/"Claude 3.5" wording, see D5a |
| 33 | `AnswerAnalysis/FilterBar.tsx:38` | Category options | `filter-options.json` | Screen-local — values differ, see D5a |
| 34 | `AnswerAnalysis/FilterBar.tsx:51` | Outcome options | `filter-options.json` | |
| 35 | `AnswerDetail.tsx:39` | `keywords` (brand names) | `shared/competitors.json` | Inside `highlightText()`; the function stays, the list moves |

### 1.5 Competitor Intelligence → `src/data/competitor-intelligence/`

| # | Source | Collection | Target | Notes |
|---|--------|-----------|--------|-------|
| 36 | `pages/CompetitorIntelligence.tsx:54` | `competitors` | `shared/competitors.json` | **Carries `color`** — see D2 |
| 37 | `pages/CompetitorIntelligence.tsx:62` | `kpiData` | `kpis.json` | |
| 38 | `pages/CompetitorIntelligence.tsx:69` | `sovByCategoryData` | `sov-by-category.json` | |
| 39 | `pages/CompetitorIntelligence.tsx:78` | `trendData` | `sov-trend.json` | |
| 40 | `pages/CompetitorIntelligence.tsx:87` | `comparisonTable` | `comparison.json` | |
| 41 | `pages/CompetitorIntelligence.tsx:96` | `strengths` | `strengths.json` | **Carries `color`** — see D2 |
| 42 | `pages/CompetitorIntelligence.tsx:120` | `rootCauses` | `root-causes.json` | **Carries icon refs** — see D2 |

### 1.6 Content Recommendations → `src/data/content-recommendations/`

| # | Source | Collection | Target | Notes |
|---|--------|-----------|--------|-------|
| 43 | `pages/ContentRecommendations.tsx:38` | `STATS` | `stats.json` | **Carries icon refs** — see D2 |
| 44 | `pages/ContentRecommendations.tsx:45` | `CONTENT_TYPES` | `content-types.json` | Drives the filter tabs |
| 45 | `pages/ContentRecommendations.tsx:58` | `RECOMMENDATIONS` | `recommendations.json` | |
| 46 | `ContentGapMap.tsx:5` | `categories` | `gap-map.json` | |
| 47 | `ContentGapMap.tsx:6` | `contentTypes` | `gap-map.json` | |
| 48 | `ContentGapMap.tsx:29` | `mockData` | `gap-map.json` | Nested `Record<string, Record<string, Status>>` |
| 49 | `ActionableLists.tsx:8` | `gaps` | `missing-documentation.json` | Declared **inside** the component — see D3 |
| 50 | `ActionableLists.tsx:46` | `opportunities` | `customer-evidence.json` | Declared inside the component |
| 51 | `ActionableLists.tsx:82` | `platforms` | `review-platforms.json` | Declared inside the component |

### 1.7 Experiments & Impact → `src/data/experiments-impact/`

| # | Source | Collection | Target | Notes |
|---|--------|-----------|--------|-------|
| 52 | `ExperimentsTable.tsx:13` | `experiments` | `experiments.json` | |
| 53 | `ExperimentTimeline.tsx:4` | `timeline` | `timeline.json` | **Carries icon + `color` class** — see D2 |
| 54 | `ImpactChart.tsx:14` | `data` | `impact.json` | |
| 55 | `RecommendedNext.tsx:6` | `suggestions` | `recommended-next.json` | |
| 56 | `SecondaryMetrics.tsx:5` | `metrics` | `secondary-metrics.json` | |
| 57 | `SignalGraph.tsx:4` | `stages` | `signal-stages.json` | |
| 58 | `SummaryKPIs.tsx:5` | `kpis` | `summary-kpis.json` | **Carries icon refs** — see D2 |

### 1.8 Reports & Billing → `src/data/reports-billing/`

| # | Source | Collection | Target | Notes |
|---|--------|-----------|--------|-------|
| 59 | `ExecutiveReports.tsx:5` | `reportTypes` | `report-types.json` | |
| 60 | `ExecutiveReports.tsx:23` | `recentExports` | `recent-exports.json` | |
| 61 | `InvoicesHistory.tsx:13` | `invoices` | `invoices.json` | |
| 62 | `PlanTiers.tsx:6` | `plans` | `plan-tiers.json` | |
| 63 | `TeamAccess.tsx:21` | `teamMembers` | `team-members.json` | |
| 64 | `UsageLimits.tsx:4` | `usageData` | `usage-limits.json` | |

### 1.9 Workspace Setup → `src/data/workspace-setup/`

| # | Source | Collection | Target | Notes |
|---|--------|-----------|--------|-------|
| 65 | `MonitoringFrequency.tsx:6` | `FREQUENCIES` | `frequencies.json` | |
| 66 | `RegionalFocus.tsx:6` | `REGIONS` | `regions.json` | |
| 67 | `TargetCategories.tsx:7` | `SUGGESTED_CATEGORIES` | `suggested-categories.json` | |
| 68 | `CompetitorTracker.tsx:8` | `useState` seed `["Postman","Datadog"]` | `default-competitors.json` | **Seeds editable state** — see D3 |

### 1.10 Sign In → `src/data/sign-in/`

| # | Source | Collection | Target | Notes |
|---|--------|-----------|--------|-------|
| 69 | `ShowcasePanel.tsx:65` | Inline metrics array in `.map()` | `showcase-metrics.json` | |

### 1.11 Classified KEEP — stays in code

| # | Source | Collection | Reason |
|---|--------|-----------|--------|
| K1 | `layout/DashboardSidebar.tsx:20` | `navItems` | Navigation and routes are explicitly out of scope (FR-008). Also pairs each entry with a Lucide component. |
| K2 | `PromptLibrary/PromptTable.tsx:170` | `modelIcons` | Presentation lookup mapping a data value to a glyph (FR-009). |
| K3 | `PromptLibrary/PromptTable.tsx:178` | `intentColors` | Presentation lookup mapping a data value to Tailwind classes (FR-009). |
| K4 | `ContentRecommendations/RecommendationCard.tsx:26` | `priorityColors` | Presentation lookup (FR-009). |
| K5 | `SignIn/ShowcasePanel.tsx:52` | `[1,2,3,4,5]` | A repeat count for placeholder avatars — layout, not data (FR-004). |
| K6 | `SignIn/ShowcasePanel.tsx:74` | `[40,25,60,…]` | Decorative bar heights driving `style={{height}}` — sizing values (FR-004). |
| K7 | `pages/VisibilityDashboard.tsx:12` | `generateSparkline()` | A function. Logic stays in code (FR-006); only its `base`/`variance` inputs are data. |

---

## Part 2 — Design Decisions

### D1 — JSON files with companion TypeScript types (not `.ts` data modules)

**Decision**: Data values live in `.json`. Record shapes live in a sibling `types.ts`. An
`index.ts` barrel imports the JSON, asserts it to the declared type, and re-exports it by name.

**Rationale**: The request is explicit that data belongs in JSON files under `src/data`, and JSON
is the format a future API would return — which is exactly the shape Principle II of the
constitution asks the seam to take. But JSON cannot carry types, and the constitution also
requires every dataset to have an explicit exported type. The barrel reconciles both: JSON stays
pure values, types stay in TypeScript, and consumers get one typed import.

**Alternatives considered**:
- *Typed `.ts` data modules* — would have solved typing and the icon problem in one step, and was
  raised with the user at spec time. Rejected: it contradicts the explicit instruction to use JSON
  files, and it leaves the door open to logic creeping back into data files.
- *Import JSON directly in components* — rejected: every call site would need its own type
  assertion, duplicating the shape and violating "defined once" (FR-014).
- *Runtime schema validation with zod* (already a dependency) — rejected under Principle V as
  unjustified complexity for build-time-bundled data that cannot vary at runtime.

### D2 — Icons and colors rejoin by stable identifier

**Decision**: Records that currently embed an icon component or a color token keep a stable
`id` (or reuse an existing key such as `name`) in the JSON. The component resolves presentation
through a lookup declared in code:

```
alerts.json          →  [{ "id": "citation-drop", "message": "…", "severity": "high", … }]
types.ts             →  export const alertIcons: Record<string, LucideIcon> = { … }
                        export const alertColors: Record<string, string> = { … }
```

**Rationale**: FR-004 forbids icons and colors in JSON and FR-005 requires a stable identifier to
rejoin them. This is also the pattern the codebase already uses in `intentColors` and
`priorityColors`, so it introduces no new idea.

**Affected collections**: #7, #11, #16, #36, #41, #42, #43, #53, #58.

**Alternatives considered**: storing an icon *name* string in JSON and mapping name → component.
Rejected — a name like `"AlertTriangle"` is still a presentation value living in a data file, and
it silently breaks if the icon set changes. Keying off the business identifier does not.

### D3 — Data inside component bodies, and data that seeds state

**Decision**: Collections declared inside a component body (#49, #50, #51) move to JSON and are
imported at module scope like any other. The `CompetitorTracker` seed (#68) is imported and passed
as the `useState` **initial value**, not used as the render source.

**Rationale**: FR-011 requires the wizard's add and remove behavior to keep working. Rendering
directly from the imported array would freeze the list; seeding state preserves the interaction
exactly.

### D4 — Hand-written option lists become mapped arrays

**Decision**: Sibling `<SelectItem>` groups (#18–20, #25–29, #32–34) move to JSON arrays of
`{ value, label }` and render with `.map()`.

**Rationale**: FR-007 keeps one-off labels in components but treats *repeated data values* as
data, and these lists are the domain vocabulary (models, categories, regions, intents) repeated
across five filter bars. The rendered DOM is identical: the same `<SelectItem value=…>` elements
in the same order.

**Verification note**: the existing `value` attributes are inconsistent across screens for the
same concept (`"all-models"` vs `"all"`, `"gemini-1-5"` vs `"gemini"`). These are preserved
verbatim per FR-010 — normalizing them would be a behavior change and is out of scope.

### D5 — Feature folders mirror screens; `shared/` requires three consumers

**Decision**: `src/data/<feature>/` matches `src/components/<Screen>/` one-to-one, kebab-cased to
match route vocabulary. Only three collections qualify for `shared/`: the AI model list, the
competitor list, and the category list.

**Rationale**: FR-003 and SC-005 demand locatability. FR-015 names exactly these three as shared.
Applying a three-consumer bar keeps `shared/` from becoming a junk drawer, consistent with
Principle V's two-call-site rule for abstractions.

### D5a — Filter option sets stay screen-local (corrected during implementation)

**Decision**: The `<SelectItem>` option groups on Model Monitoring, Prompt Library and Answer
Analysis keep a `filter-options.json` in their own feature folder. They are NOT sourced from
`shared/`.

**Rationale**: The original inventory (rows 19, 25, 29, 32, 33) assumed these lists were copies of
one another. Inspection during implementation showed they are not. `MonitoringControls` offers
"Enterprise SaaS" / "Cloud Infrastructure" / "Cybersecurity"; `PromptFilters` offers "Fintech" /
"Dev Tools" / "Marketing"; the dashboard offers "API Gateway" / "Service Mesh". The model lists
differ too — four entries on Prompt Library, five on Answer Analysis with different wording
("GPT-4o" vs "ChatGPT"), six in `shared`. Pointing them at one shared list would change what
renders, violating FR-010 and invariant I4.

**What did become shared**: only lists whose values are genuinely identical — the dashboard
FilterBar's `MODELS` and `CATEGORIES` (rows 8–10), the create-prompt dialog's long model names
(row 30, via `longName`), the brand list in `AnswerDetail` (row 35), and model identity on the
status cards, which now joins `name`/`badge` from `shared/ai-models.json` by id.

**Consequence for SC-004**: a rename in `shared/ai-models.json` reaches the identity surfaces
(dashboard filter, chart legend, create-prompt dialog, model status cards) but not the per-screen
filter labels, nor the measurement rows in `metrics.json` / `recent-runs.json`, which spell the
same brand differently ("ChatGPT" vs "ChatGPT-4o"). SC-004 is worded to match.

### D6 — `resolveJsonModule` must be enabled

**Decision**: Add `"resolveJsonModule": true` to `compilerOptions` in `tsconfig.app.json`.

**Rationale**: Without it `tsc -b` fails on the first JSON import, breaking the Principle III gate.
Vite bundles JSON natively, so no build-tool change is needed — this is a type-checking
requirement only. It is the single configuration change in scope (FR-016), and it touches no
scaffold-owned file.

### D7 — Type-only imports must use `import type`

**Decision**: All shape imports use `import type { … }`.

**Rationale**: `tsconfig.app.json` sets `verbatimModuleSyntax: true`, under which a value-style
import of a type is an error. This is a mechanical requirement that would otherwise surface as a
build failure late in the work.

### D8 — Model naming difference is preserved, not unified

**Decision**: `shared/ai-models.json` carries both the short display name (`"ChatGPT"`) and the
long name used by the create-prompt dialog (`"ChatGPT 4o"`) as separate fields on one record.

**Rationale**: The dialog (#30) lists `"ChatGPT 4o", "Claude 3.5 Sonnet", "Gemini 1.5 Pro"…`
while dashboards use `"ChatGPT", "Claude", "Gemini"…`. FR-010 forbids changing what renders, so
both strings must survive. One record with two fields satisfies FR-015's "defined once" without
altering any screen.

---

## Part 3 — Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| A value is altered in transit (typo, dropped record, reordered array) | Medium | Move collections verbatim; verify each screen against the before/after walkthrough in [quickstart.md](./quickstart.md) |
| Widened JSON types break a discriminated union at a call site | Medium | The barrel asserts to the declared type; `types.ts` declares the literal unions once (D1, D7) |
| Icon/color rejoin misses a record, rendering a blank icon | Medium | Lookups are exhaustive `Record<Id, …>` keyed by the same ids present in the JSON; a missing key is a type error |
| `CompetitorTracker` loses add/remove | Low | Explicitly covered by D3 and Acceptance Scenario 2.3 |
| Chart `dataKey` strings drift from renamed JSON fields | Medium | Field names are preserved verbatim; renaming fields is out of scope |
| Scope creep into fixing inconsistent filter `value` attributes | Low | Explicitly out of scope per D4 |
