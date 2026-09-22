---

description: "Task list for feature 001-extract-data-to-json"
---

# Tasks: Extract Hardcoded Data to JSON

**Input**: Design documents from `/specs/001-extract-data-to-json/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/data-modules.md](./contracts/data-modules.md), [quickstart.md](./quickstart.md)

**Tests**: No test tasks are generated. The project has no test runner in `package.json`, and the
spec does not request TDD. Verification is `npm run lint`, `npm run build`, and the screen-by-screen
procedure in [quickstart.md](./quickstart.md), per the constitution's quality gates.

**Organization**: Tasks are grouped by user story so each story is independently implementable,
verifiable, and deliverable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story the task belongs to (US1, US2, US3)
- Every task names its exact file path

## Path Conventions

Front-end single-page app. All source lives under `src/` at the repository root. New data modules
go in `src/data/<feature>/`, mirroring `src/components/<Screen>/` per plan.md.

**Recurring pattern** — every feature folder is built with the same three steps, defined in
[contracts/data-modules.md](./contracts/data-modules.md):

1. `*.json` — data values only, copied **verbatim** from the source literal
2. `types.ts` — exported record shapes + `Record<key, …>` lookups for icons and colors
3. `index.ts` — `import type` the shapes, import the JSON, assert, re-export by name

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Capture the baseline and make JSON imports type-check

- [X] T001 Capture the before-state. **Deviation**: no browser automation is available in this environment, so screenshots were not possible. Substituted a byte-exact snapshot of `src/` and `tsconfig.app.json` to the scratchpad, which supports stronger value-level verification for a pure data move (every extracted value diffable against its original literal).
- [X] T002 Add `"resolveJsonModule": true` to `compilerOptions` in `tsconfig.app.json` (decision D6; required or every barrel fails `tsc -b`)
- [X] T003 Create the empty feature folder skeleton under `src/data/`: `shared/`, `visibility-dashboard/`, `model-monitoring/`, `prompt-library/`, `answer-analysis/`, `competitor-intelligence/`, `content-recommendations/`, `experiments-impact/`, `reports-billing/`, `workspace-setup/`, `sign-in/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The `shared/` module that User Stories 1, 2, and 3 all import

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create `src/data/shared/ai-models.json` with the six models as `{ id, name, longName, badge }`, taking short names from `src/components/VisibilityDashboard/FilterBar.tsx:13`, long names from `src/components/PromptLibrary/CreatePromptDialog.tsx:113`, and badges from `src/components/ModelMonitoring/ModelStatusCards.tsx:6` (decision D8 — both name forms must survive)
- [X] T005 [P] Create `src/data/shared/competitors.json` as `{ id, name, logo, isBrand }` from `src/pages/CompetitorIntelligence.tsx:54`, adding the Northstar brand entry with `isBrand: true` sourced from the `comparisonTable` row at line 87
- [X] T006 [P] Create `src/data/shared/categories.json` as `{ value, label }[]` from `src/components/VisibilityDashboard/FilterBar.tsx:14`
- [X] T007 Create `src/data/shared/types.ts` exporting `AiModel`, `Competitor`, `Category`, and `Option` types, plus `modelChartColors: Record<string, string>` mapping model id to its `hsl(var(--chart-N))` token (decision D2 — the color must not enter JSON)
- [X] T008 Create `src/data/shared/index.ts` importing the three JSON files, asserting each to its type, and re-exporting `aiModels`, `competitors`, `categories`, the types, and `modelChartColors` per contract C3

**Checkpoint**: `npm run build` passes with the shared module in place and no component using it yet

---

## Phase 3: User Story 1 - Change demo numbers on the core analytics screens (Priority: P1) 🎯 MVP

**Goal**: All Visibility Dashboard and Model Monitoring data lives in `src/data/`, editable without
touching a single `.tsx` file, with icons and colors correctly rejoined.

**Independent Test**: Edit a KPI value, a chart point, and a competitor name in the dashboard data
files; reload and confirm each change appears, no component file was modified, and both screens
render identically otherwise.

### Visibility Dashboard

- [X] T009 [US1] Create `src/data/visibility-dashboard/kpis.json` from `src/pages/VisibilityDashboard.tsx:15`, converting each `generateSparkline(base, variance)` call into `sparklineBase` and `sparklineVariance` number fields (the function itself stays in the page — keep K7)
- [X] T010 [P] [US1] Create `src/data/visibility-dashboard/share-over-time.json` verbatim from `src/components/VisibilityDashboard/ShareOverTimeChart.tsx:14`, preserving every field name so the recharts `dataKey`s keep resolving (invariant I3)
- [X] T011 [P] [US1] Create `src/data/visibility-dashboard/inclusion.json` and `sentiment.json` verbatim from `src/components/VisibilityDashboard/DetailCharts.tsx:4` and `:12`
- [X] T012 [P] [US1] Create `src/data/visibility-dashboard/competitor-sov.json` verbatim from `src/components/VisibilityDashboard/CompetitorSOV.tsx:5`
- [X] T013 [P] [US1] Create `src/data/visibility-dashboard/citation-sources.json` verbatim from `src/components/VisibilityDashboard/CitationCoverage.tsx:12`
- [X] T014 [US1] Create `src/data/visibility-dashboard/alerts.json` from `src/components/VisibilityDashboard/AlertsPanel.tsx:6`, adding a stable `id` and a `severity` field, and **dropping the `color` and icon fields** (FR-005, decision D2)
- [X] T015 [US1] Create `src/data/visibility-dashboard/types.ts` declaring `VisibilityMetric`, `TimeSeriesPoint`, `CompetitorShare`, `CitationSource`, `Alert`, `AlertSeverity`, plus `alertIcons: Record<AlertSeverity, LucideIcon>` and `alertColors: Record<AlertSeverity, string>` carrying the exact Lucide components and `text-*` classes removed in T014
- [X] T016 [US1] Create `src/data/visibility-dashboard/index.ts` asserting and re-exporting `kpis`, `shareOverTime`, `inclusion`, `sentiment`, `competitorSov`, `citationSources`, `alerts` per contract C3
- [X] T017 [US1] Update `src/pages/VisibilityDashboard.tsx`: import `kpis` from `@/data/visibility-dashboard`, delete the literal at line 15, and map each record's `sparklineBase`/`sparklineVariance` through the retained `generateSparkline` when building `KPICard` props
- [X] T018 [P] [US1] Update `src/components/VisibilityDashboard/ShareOverTimeChart.tsx`: import `shareOverTime` and `aiModels`, delete the literals at lines 14 and 24, and derive the model list from `@/data/shared`
- [X] T019 [P] [US1] Update `src/components/VisibilityDashboard/DetailCharts.tsx`: import `inclusion` and `sentiment`, delete both literals
- [X] T020 [P] [US1] Update `src/components/VisibilityDashboard/CompetitorSOV.tsx`: import `competitorSov`, delete the literal at line 5
- [X] T021 [P] [US1] Update `src/components/VisibilityDashboard/CitationCoverage.tsx`: import `citationSources`, delete the literal at line 12
- [X] T022 [US1] Update `src/components/VisibilityDashboard/AlertsPanel.tsx`: import `alerts`, `alertIcons`, `alertColors`; delete the literal at line 6; resolve each alert's icon and color by `severity` so the rendered output is identical
- [X] T023 [US1] Update `src/components/VisibilityDashboard/FilterBar.tsx`: import `aiModels` and `categories` from `@/data/shared`, delete the `MODELS` and `CATEGORIES` literals at lines 13–14, and keep the `selectedModels` state and toggle logic unchanged

### Model Monitoring

- [X] T024 [US1] Create `src/data/model-monitoring/model-status.json` from `src/components/ModelMonitoring/ModelStatusCards.tsx:6`, adding an `id` matching `AiModel.id`, renaming the letters field `icon` → `badge` (it holds text, not an icon), and **dropping `color`**
- [X] T025 [P] [US1] Create `src/data/model-monitoring/model-sparkline.json` verbatim from `src/components/ModelMonitoring/ModelStatusCards.tsx:15`
- [X] T026 [P] [US1] Create `src/data/model-monitoring/performance.json` verbatim from `src/components/ModelMonitoring/PerformanceChart.tsx:4`
- [X] T027 [P] [US1] Create `src/data/model-monitoring/metrics.json` verbatim from `src/components/ModelMonitoring/MetricsTable.tsx:5`
- [X] T028 [P] [US1] Create `src/data/model-monitoring/recent-runs.json` verbatim from `src/components/ModelMonitoring/RecentRuns.tsx:7`
- [X] T029 [US1] Create `src/data/model-monitoring/position-distribution.json` and `top-sources.json` from `src/components/ModelMonitoring/InsightsCards.tsx:4` and `:12`, adding an `id` to each distribution slice and **dropping `color`**
- [X] T030 [US1] Create `src/data/model-monitoring/filter-options.json` holding `{ dateRanges, categories, regions }` as `{ value, label }[]`, transcribed verbatim from all three `<SelectItem>` groups at `src/components/ModelMonitoring/MonitoringControls.tsx:16`, `:31` and `:46`, preserving the existing `value` strings exactly (invariant I4). **The category group stays screen-local** — its values differ from `shared/categories.json` (decision D5a)
- [X] T031 [US1] Create `src/data/model-monitoring/types.ts` declaring `ModelStatus`, `ModelHealth`, `PerformancePoint`, `MetricRow`, `MonitoringRun`, `PositionSlice`, `TopSource`, plus `positionSliceColors: Record<string, string>` carrying the chart tokens removed in T029 and the model color lookup reused from `@/data/shared`
- [X] T032 [US1] Create `src/data/model-monitoring/index.ts` asserting and re-exporting `modelStatus`, `modelSparkline`, `performance`, `metrics`, `recentRuns`, `positionDistribution`, `topSources`, `filterOptions`
- [X] T033 [US1] Update `src/components/ModelMonitoring/ModelStatusCards.tsx`: import `modelStatus`, `modelSparkline`, and `modelChartColors`; delete both literals; resolve each card's color by model `id`
- [X] T034 [P] [US1] Update `src/components/ModelMonitoring/PerformanceChart.tsx`: import `performance`, delete the literal at line 4
- [X] T035 [P] [US1] Update `src/components/ModelMonitoring/MetricsTable.tsx`: import `metrics`, delete the literal at line 5
- [X] T036 [P] [US1] Update `src/components/ModelMonitoring/RecentRuns.tsx`: import `recentRuns`, delete the literal at line 7
- [X] T037 [US1] Update `src/components/ModelMonitoring/InsightsCards.tsx`: import `positionDistribution`, `topSources`, and `positionSliceColors`; delete both literals; resolve each slice color by `id`
- [X] T038 [US1] Update `src/components/ModelMonitoring/MonitoringControls.tsx`: import `filterOptions`; replace the three hand-written `<SelectItem>` groups with `.map()` renders producing the identical elements in the identical order (decision D4). All three groups come from the feature-local file, not `shared` (decision D5a)

**Checkpoint**: `npm run lint` and `npm run build` clean; `/dashboard` and `/monitoring` match the
T001 baseline exactly; the Story 1 independent test passes. **This is a shippable MVP.**

---

## Phase 4: User Story 2 - Every remaining screen follows the same pattern (Priority: P2)

**Goal**: The other seven screens externalize their data using the identical three-file pattern.

**Independent Test**: For each screen, locate its data in one predictable place, edit one record,
reload, and confirm the screen reflects the edit and still renders every section it did before.

### Prompt Library

- [X] T039 [P] [US2] Create `src/data/prompt-library/prompts.json` verbatim from the `mockPrompts` literal at `src/components/PromptLibrary/PromptTable.tsx:47`
- [X] T040 [P] [US2] Create `src/data/prompt-library/templates.json`, `scheduled-runs.json`, and `stats.json` verbatim from `PromptTemplates.tsx:5`, `ScheduledRuns.tsx:5`, and `StatsStrip.tsx:4`
- [X] T041 [US2] Create `src/data/prompt-library/filter-options.json` holding `{ useCases, intents, regions }` transcribed from the `<SelectItem>` groups at `src/components/PromptLibrary/PromptFilters.tsx:51`, `:63`, and `:76`, preserving every `value` verbatim
- [X] T042 [US2] Create `src/data/prompt-library/types.ts` moving the existing `Prompt` interface out of `PromptTable.tsx` and declaring `PromptTemplate`, `ScheduledRun`, `PromptStat`
- [X] T043 [US2] Create `src/data/prompt-library/index.ts` asserting and re-exporting `prompts`, `templates`, `scheduledRuns`, `stats`, `filterOptions`, and the `Prompt` type
- [X] T044 [US2] Update `src/components/PromptLibrary/PromptTable.tsx`: import `prompts` and the `Prompt` type; delete the literal at line 47; **keep `modelIcons` (line 170) and `intentColors` (line 178) in place** — they are presentation lookups (K2, K3)
- [X] T045 [P] [US2] Update `src/components/PromptLibrary/PromptTemplates.tsx`, `ScheduledRuns.tsx`, and `StatsStrip.tsx` to import their collections and delete the literals
- [X] T046 [US2] Update `src/components/PromptLibrary/PromptFilters.tsx`: import `filterOptions`; replace all five hand-written `<SelectItem>` groups with `.map()` renders. All five stay feature-local — the category and model values differ from the shared sets (decision D5a)
- [X] T047 [US2] Update `src/components/PromptLibrary/CreatePromptDialog.tsx`: import `aiModels` and replace the inline array at line 113 with a map over `longName`, preserving the exact strings shown today

### Answer Analysis

- [X] T048 [US2] Create `src/data/answer-analysis/answers.json` verbatim from `MOCK_RECORDS` at `src/pages/AnswerAnalysis.tsx:10`, including every nested `reasoning`, `sources`, and `inaccuracies` array
- [X] T049 [P] [US2] Create `src/data/answer-analysis/filter-options.json` holding `{ outcomes }` from the `<SelectItem>` group at `src/components/AnswerAnalysis/FilterBar.tsx:51`
- [X] T050 [US2] Create `src/data/answer-analysis/types.ts` declaring `AnswerRecord`, `ReasoningFactor`, `AnswerSource`, `Inaccuracy`, and the `AnswerOutcome`/`Sentiment` unions — consolidating the shape currently redeclared across `pages/AnswerAnalysis.tsx`, `AnswerList.tsx`, and `AnswerDetail.tsx` into one declaration (FR-014)
- [X] T051 [US2] Create `src/data/answer-analysis/index.ts` asserting and re-exporting `answers`, `filterOptions`, and the types
- [X] T052 [US2] Update `src/pages/AnswerAnalysis.tsx`: import `answers`, delete the literal and its inline type annotation, and keep the `selectedId` state and lookup logic unchanged
- [X] T053 [P] [US2] Update `src/components/AnswerAnalysis/AnswerList.tsx` and `AnswerDetail.tsx` to import the shared `AnswerRecord` type instead of redeclaring their prop shapes; keep `getOutcomeIcon` and `highlightText` in code
- [X] T054 [US2] Update `src/components/AnswerAnalysis/FilterBar.tsx`: import `filterOptions`; replace the three `<SelectItem>` groups with `.map()` renders. All three stay feature-local — "GPT-4o"/"Claude 3.5" wording differs from the shared model names (decision D5a)

### Competitor Intelligence

- [X] T055 [US2] Create `src/data/competitor-intelligence/kpis.json`, `sov-by-category.json`, `sov-trend.json`, and `comparison.json` verbatim from `src/pages/CompetitorIntelligence.tsx:62`, `:69`, `:78`, and `:87`
- [X] T056 [US2] Create `src/data/competitor-intelligence/strengths.json` and `root-causes.json` from lines 96 and 120, adding a stable `id` to each record and **dropping the `color` and `icon` fields**
- [X] T057 [US2] Create `src/data/competitor-intelligence/types.ts` declaring `CompetitorKpi`, `CategoryShare`, `TrendPoint`, `ComparisonRow`, `Strength`, `RootCause`, plus `strengthColors` and `rootCauseIcons` lookups keyed by `id`
- [X] T058 [US2] Create `src/data/competitor-intelligence/index.ts` asserting and re-exporting all six collections
- [X] T059 [US2] Update `src/pages/CompetitorIntelligence.tsx`: import all six collections plus `competitors` and `modelChartColors` from `@/data/shared`; delete all seven literals at lines 54–124; resolve competitor and strength colors by `id`

### Content Recommendations

- [X] T060 [P] [US2] Create `src/data/content-recommendations/recommendations.json` verbatim from `src/pages/ContentRecommendations.tsx:58` and `content-types.json` from line 45
- [X] T061 [US2] Create `src/data/content-recommendations/stats.json` from line 38, adding a stable `id` per stat and **dropping the `icon` field**
- [X] T062 [US2] Create `src/data/content-recommendations/gap-map.json` merging `categories`, `contentTypes`, and the nested `mockData` coverage map from `src/components/ContentRecommendations/ContentGapMap.tsx:5`, `:6`, and `:29` into one `{ categories, contentTypes, coverage }` object
- [X] T063 [US2] Create `src/data/content-recommendations/missing-documentation.json`, `customer-evidence.json`, and `review-platforms.json` from the three literals declared **inside** the component bodies at `src/components/ContentRecommendations/ActionableLists.tsx:8`, `:46`, and `:82` (decision D3)
- [X] T064 [US2] Create `src/data/content-recommendations/types.ts` declaring `ContentRecommendation`, `Priority`, `Status`, `RecommendationStat`, `GapMap`, `GapStatus`, `DocumentationGap`, `EvidenceOpportunity`, `ReviewPlatform`, plus `statIcons` keyed by stat `id`
- [X] T065 [US2] Create `src/data/content-recommendations/index.ts` asserting and re-exporting all seven collections
- [X] T066 [US2] Update `src/pages/ContentRecommendations.tsx`: import `recommendations`, `contentTypes`, `stats`, and `statIcons`; delete all three literals; keep the `activeTab` state and filtering logic unchanged
- [X] T067 [P] [US2] Update `src/components/ContentRecommendations/ContentGapMap.tsx` to import `gapMap` and delete its three literals
- [X] T068 [P] [US2] Update `src/components/ContentRecommendations/ActionableLists.tsx` to import the three collections at module scope and delete the in-body literals; **leave `priorityColors` in `RecommendationCard.tsx` untouched** (K4)

### Experiments & Impact

- [X] T069 [P] [US2] Create `src/data/experiments-impact/experiments.json`, `impact.json`, `recommended-next.json`, `secondary-metrics.json`, and `signal-stages.json` verbatim from `ExperimentsTable.tsx:13`, `ImpactChart.tsx:14`, `RecommendedNext.tsx:6`, `SecondaryMetrics.tsx:5`, and `SignalGraph.tsx:4`
- [X] T070 [US2] Create `src/data/experiments-impact/summary-kpis.json` and `timeline.json` from `SummaryKPIs.tsx:5` and `ExperimentTimeline.tsx:4`, adding a stable `id` to each record and **dropping the `icon` and `color` fields**
- [X] T071 [US2] Create `src/data/experiments-impact/types.ts` declaring `Experiment`, `ExperimentKpi`, `TimelineEntry`, `ImpactPoint`, `NextSuggestion`, `SecondaryMetric`, `SignalStage`, plus `kpiIcons`, `timelineIcons`, and `timelineColors` keyed by `id`
- [X] T072 [US2] Create `src/data/experiments-impact/index.ts` asserting and re-exporting all seven collections
- [X] T073 [P] [US2] Update `src/components/ExperimentsImpact/ExperimentsTable.tsx`, `ImpactChart.tsx`, `RecommendedNext.tsx`, `SecondaryMetrics.tsx`, and `SignalGraph.tsx` to import their collections and delete the literals
- [X] T074 [US2] Update `src/components/ExperimentsImpact/SummaryKPIs.tsx` and `ExperimentTimeline.tsx` to import their collections plus the icon and color lookups, resolving each by `id`

### Reports & Billing

- [X] T075 [P] [US2] Create `src/data/reports-billing/plan-tiers.json`, `usage-limits.json`, `team-members.json`, and `invoices.json` verbatim from `PlanTiers.tsx:6`, `UsageLimits.tsx:4`, `TeamAccess.tsx:21`, and `InvoicesHistory.tsx:13`
- [X] T076 [US2] Create `src/data/reports-billing/report-types.json` and `recent-exports.json` from `ExecutiveReports.tsx:5` and `:23`, adding a stable `id` to report types and dropping any icon field
- [X] T077 [US2] Create `src/data/reports-billing/types.ts` declaring `PlanTier`, `UsageLimit`, `TeamMember`, `Invoice`, `ReportType`, `RecentExport`, plus `reportTypeIcons` keyed by `id`
- [X] T078 [US2] Create `src/data/reports-billing/index.ts` asserting and re-exporting all six collections
- [X] T079 [P] [US2] Update `src/components/ReportsBilling/PlanTiers.tsx`, `UsageLimits.tsx`, `TeamAccess.tsx`, and `InvoicesHistory.tsx` to import their collections and delete the literals
- [X] T080 [US2] Update `src/components/ReportsBilling/ExecutiveReports.tsx` to import `reportTypes`, `recentExports`, and `reportTypeIcons`, resolving icons by `id`

### Workspace Setup

- [X] T081 [P] [US2] Create `src/data/workspace-setup/suggested-categories.json`, `regions.json`, and `frequencies.json` verbatim from `TargetCategories.tsx:7`, `RegionalFocus.tsx:6`, and `MonitoringFrequency.tsx:6`
- [X] T082 [P] [US2] Create `src/data/workspace-setup/default-competitors.json` holding `["Postman", "Datadog"]` from the `useState` seed at `src/components/WorkspaceSetup/CompetitorTracker.tsx:8`
- [X] T083 [US2] Create `src/data/workspace-setup/types.ts` and `index.ts` declaring `SetupRegion`, `SetupFrequency` and re-exporting `suggestedCategories`, `regions`, `frequencies`, `defaultCompetitors`
- [X] T084 [P] [US2] Update `src/components/WorkspaceSetup/TargetCategories.tsx`, `RegionalFocus.tsx`, and `MonitoringFrequency.tsx` to import their collections and delete the literals
- [X] T085 [US2] Update `src/components/WorkspaceSetup/CompetitorTracker.tsx` to pass `defaultCompetitors` as the **`useState` initial value**, keeping `addCompetitor` and `removeCompetitor` fully working (decision D3 — rendering directly from the import would freeze the list)

### Sign In

- [X] T086 [US2] Create `src/data/sign-in/showcase-metrics.json` from the inline array at `src/components/SignIn/ShowcasePanel.tsx:65`, plus `types.ts` and `index.ts`
- [X] T087 [US2] Update `src/components/SignIn/ShowcasePanel.tsx` to import `showcaseMetrics`; **leave the avatar repeat array at line 52 and the decorative bar heights at line 74 in place** — they are layout values (K5, K6)

**Checkpoint**: all ten screens render from `src/data/`; `npm run build` clean

---

## Phase 5: User Story 3 - Shared reference data is defined once (Priority: P3)

**Goal**: The AI model, competitor, and category lists exist in exactly one place, with every
duplicate copy deleted.

**Independent Test**: Rename one model in `src/data/shared/ai-models.json`, reload, and confirm the
new name appears on every screen listing models with no occurrence of the old name left anywhere.

- [X] T088 [US3] Replace the brand list inside `highlightText()` at `src/components/AnswerAnalysis/AnswerDetail.tsx:39` with names derived from `competitors` in `@/data/shared`; the highlighting function itself stays in code (FR-006)
- [X] T089 [US3] Update `src/components/VisibilityDashboard/CompetitorSOV.tsx` and `src/pages/CompetitorIntelligence.tsx` to source competitor identity from `@/data/shared`, keeping only per-screen measured values in the feature-local JSON (invariant I5)
- [X] T090 [US3] Audit every category option list — `src/components/ModelMonitoring/MonitoringControls.tsx`, `src/components/PromptLibrary/PromptFilters.tsx`, `src/components/AnswerAnalysis/FilterBar.tsx`, `src/components/ContentRecommendations/ContentGapMap.tsx` — and determine for each whether its values genuinely match the shared set. **Outcome: none did.** Each keeps its feature-local option list, preserving its `value` strings verbatim (invariant I4, decision D5a). Only the dashboard FilterBar sources categories from `@/data/shared`
- [X] T091 [US3] Verify no duplicate model, competitor, or category literal survives: `grep -rn "ChatGPT\|Perplexity\|Kong\|Postman" src/pages src/components --include=*.tsx` must return only presentation lookups keyed by id
- [X] T092 [US3] Run the SC-004 rename probe from [quickstart.md](./quickstart.md) Step 5 and revert

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Prove the contract holds and nothing regressed

- [X] T093 [P] Run the four contract greps in [quickstart.md](./quickstart.md) Step 2 — no colors, sizes, or code in `src/data/**/*.json`; no direct JSON imports outside `src/data/**/index.ts` — and fix any hit
- [X] T094 [P] Verify every file under `src/data/` parses as valid JSON using the loop in [quickstart.md](./quickstart.md) Step 2
- [X] T095 Confirm only the seven documented keeps remain when scanning `src/pages` and `src/components` for multi-record literals (SC-001, and FR-002 — every "move" collection relocated and its original literal removed), cross-checked against [research.md](./research.md) §1.11
- [X] T096 Run `npm run lint` and `npm run build`; both must be clean with zero new warnings (FR-013, SC-007)
- [X] T097 Walk all ten routes against the T001 baseline using the [quickstart.md](./quickstart.md) Step 3 checklist, at 1440px and at 375px for `/dashboard` and `/answers` (SC-002, and FR-017 — demo content unchanged in substance and still fictional)
- [X] T098 Run all ten interaction checks in [quickstart.md](./quickstart.md) Step 4, paying particular attention to check 1 — the Workspace Setup add/remove behavior (SC-006)
- [X] T099 Run the SC-003 single-edit probe and the SC-005 locatability probe from [quickstart.md](./quickstart.md) Step 5
- [X] T100 Update the Sync Impact Report note in `.specify/memory/constitution.md` recording that the Principle II debt for `AnswerAnalysis.tsx`, `CompetitorIntelligence.tsx`, and `ContentRecommendations.tsx` is now discharged

---

## Dependencies & Execution Order

### Phase dependencies

```text
Phase 1 (Setup)          T001 → T002 → T003
        ↓
Phase 2 (Foundational)   T004 → T005,T006 → T007 → T008     ⚠️ BLOCKS all stories
        ↓
Phase 3 (US1, P1)  ──┐
Phase 4 (US2, P2)  ──┼── independent of each other once Phase 2 is done
                     │
Phase 5 (US3, P3)  ──┘   requires US1 + US2 (consolidates what they created)
        ↓
Phase 6 (Polish)
```

### Critical ordering rules

- **T001 must be first.** The baseline cannot be captured after the code changes.
- **T002 before any barrel.** Without `resolveJsonModule`, every `index.ts` fails to compile.
- **Within a feature folder**: JSON files → `types.ts` → `index.ts` → component updates. The
  component update is the last step because it is what deletes the original literal.
- **US3 comes last** because it consolidates copies that US1 and US2 must have created first.

### Parallel opportunities

- **Phase 2**: T005 and T006 run together (different files); T004 first since T007 references it.
- **Phase 3**: T010–T013 in parallel; T018–T021 in parallel. T009/T014 and T017/T022 are serial
  because they involve the sparkline transform and the icon/color rejoin.
- **Phase 4**: the seven feature blocks (Prompt Library, Answer Analysis, Competitor Intelligence,
  Content Recommendations, Experiments, Reports & Billing, Workspace Setup, Sign In) are fully
  independent of one another and can be worked in any order or simultaneously.
- **Phase 6**: T093 and T094 in parallel; T096–T099 are sequential verification.

---

## Implementation Strategy

### MVP scope

**Phases 1–3 only (T001–T038).** That delivers the two highest-density screens fully externalized,
proves the three-file pattern including the hard icon/color rejoin case, and is independently
demonstrable. If work stops there, the application is fully functional and 17 of 76 collections
are extracted.

### Incremental delivery

1. **Phases 1+2** → shared module exists, nothing consumes it, build green.
2. **Phase 3** → MVP. `/dashboard` and `/monitoring` are data-driven. Verify, then ship.
3. **Phase 4** → one feature folder at a time; build and eyeball that screen after each. Every
   folder is a safe stopping point.
4. **Phase 5** → deduplicate.
5. **Phase 6** → full verification sweep.

### Task counts

| Phase | Story | Tasks | IDs |
|-------|-------|-------|-----|
| 1 — Setup | — | 3 | T001–T003 |
| 2 — Foundational | — | 5 | T004–T008 |
| 3 — Visibility Dashboard + Model Monitoring | US1 (P1) | 30 | T009–T038 |
| 4 — Remaining seven screens | US2 (P2) | 49 | T039–T087 |
| 5 — Shared consolidation | US3 (P3) | 5 | T088–T092 |
| 6 — Polish | — | 8 | T093–T100 |
| **Total** | | **100** | |

---

## Implementation Notes & Deviations

Recorded during `/speckit-implement` on 2026-09-02. All are deliberate and verified.

1. **T001 baseline** — no browser automation is available here, so screenshots were not
   possible. Substituted a byte-exact snapshot of `src/` plus programmatic value-diffing of
   every extracted collection against its original literal. 54 collections verified identical,
   0 mismatches. This is stronger evidence than a visual check for a pure data move, but it does
   **not** confirm pixel rendering — a human should still walk the ten screens.

2. **Filter option sets are screen-local, not shared** — research §1.2/§1.3 planned to point the
   category and model dropdowns at `shared/`. On inspection the values differ per screen
   (`MonitoringControls` offers "Enterprise SaaS"/"Cybersecurity"; `PromptFilters` offers
   "Fintech"/"Dev Tools"; the model list is 4 entries on one screen and 5 on another). Sharing
   them would change what renders, violating FR-010, so each stayed with its feature.

3. **Two `color` fields were dead data** — `CompetitorSOV`'s `color` and `ModelStatusCards`'
   `color` were never read by their components. They were dropped rather than relocated to a
   lookup, and the unused lookup was removed (Principle V, no speculative code).

4. **Alert colors key by `id`, not `severity`** — two alerts share `severity: "info"` but render
   in different colors (blue and emerald). Keying by severity would have silently changed one.

5. **`ModelStatus` identity joined from shared** — `model-status.json` holds only measurements;
   `name`/`badge` are joined by id from `shared/ai-models.json` in the barrel. Verified to
   reproduce the original literal exactly.

6. **SC-004 is partially met.** Renaming a model in `shared/ai-models.json` propagates to the
   dashboard filter, chart legend, create-prompt dialog and model status cards. It does **not**
   reach `metrics.json`, `recent-runs.json` or filter option labels, which hold the same brand in
   a *different form* ("ChatGPT" as a metrics row label, "ChatGPT-4o" as a run's model). Unifying
   those would change displayed strings (FR-010) or require normalisation beyond this feature.

7. **Pre-existing build failure — RESOLVED 2026-09-02** (after implementation, while
   deploying: `src/vite-env.d.ts` was added and `npm run build` now passes) — `src/App.tsx:25` fails `tsc` with
   *Property 'env' does not exist on type 'ImportMeta'* because the project has no
   `src/vite-env.d.ts`. Confirmed present on the pristine baseline before any change here, so
   `npm run build` was already failing. Left alone as out of scope; the fix is a one-line file.

8. **`npm run lint` cannot run** — `package.json` defines `"lint": "eslint ."` but the project
   contains no ESLint configuration file at all. Also pre-existing and out of scope; creating one
   would surface findings across the whole untouched codebase.
