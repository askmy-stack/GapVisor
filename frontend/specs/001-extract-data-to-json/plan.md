# Implementation Plan: Extract Hardcoded Data to JSON

**Branch**: `001-extract-data-to-json` | **Date**: 2026-09-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-extract-data-to-json/spec.md`

## Summary

Move every hardcoded business and sample data collection out of the GapVisor pages and
components into JSON files under `src/data`, organized by feature, leaving components holding
only markup, logic, and presentation.

The technical approach is a **three-file-per-feature pattern**: a `.json` file holding pure data
values, a `types.ts` declaring the record shapes, and an `index.ts` barrel that imports the JSON,
asserts it to the declared types, and re-exports it. Components import named collections from the
barrel via the `@/data/...` alias and never touch the JSON directly.

This indirection exists to solve the two problems a naive extraction would hit: JSON imports
infer widened types (`string`, not `"Positive" | "Neutral" | "Negative"`), and many records
currently carry icon component references and theme color tokens that cannot be serialized. The
barrel is where the type assertion happens; a small in-code lookup keyed by a stable data
identifier is where icons and colors get rejoined.

## Technical Context

**Language/Version**: TypeScript 5.8, ES2022 target, `moduleResolution: bundler`,
`verbatimModuleSyntax: true` (type-only imports must use `import type`)

**Primary Dependencies**: React 18.3, Vite 5.4 (SWC), Tailwind 3.4, shadcn/ui on Radix,
React Router 6.30, recharts 2.15. **No new dependencies are added by this feature.**

**Storage**: JSON files bundled at build time under `src/data/`. No backend, database, or network
API — explicitly out of scope per FR-012.

**Testing**: No test runner exists in `package.json`. Verification is `npm run lint` +
`npm run build` plus per-screen visual comparison, per the constitution's quality gates and
[quickstart.md](./quickstart.md).

**Target Platform**: Modern browsers; single-page app served by Vite.

**Project Type**: Front-end single-page web application (no backend tier).

**Performance Goals**: No regression. Data is bundled, so there is no runtime fetch and no
loading state. Bundle growth is bounded by the size of the data already present in the source.

**Constraints**: Zero visual change (FR-010); zero route change (FR-008, FR-012); no executable
code, icons, colors, or sizing values in JSON (FR-004); `src/components/ui/` untouched.

**Scale/Scope**: 10 screens, 37 source files, **76 data collections** identified — 69 to move,
7 to deliberately keep in code. Full classification in [research.md](./research.md).

**Resolved unknown**: `resolveJsonModule` is not currently enabled in `tsconfig.app.json`, so JSON
imports would fail the type build. Enabling it is in scope under FR-016 and is the only
configuration change this feature makes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against [constitution.md](../../.specify/memory/constitution.md) v1.0.0.

| Principle | Gate | Pre-design | Post-design |
|-----------|------|-----------|-------------|
| I. Design-System Fidelity | No hex colors, no inline `style`, tokens preserved; charts keep the `--chart-*` ramp | PASS — colors are explicitly excluded from JSON (FR-004) and stay in component-side lookups | PASS — `chartColor` lookups live in `types.ts`/component code, never in JSON |
| II. Data-Source Separation | No multi-record literals in components; every dataset in a typed module with a shape a future API could return | PASS — this feature exists to satisfy this principle | PASS — `types.ts` per feature is the exported contract; barrel is the single import seam a future TanStack Query layer replaces |
| III. Type Safety & Build Integrity | `tsc -b` + `eslint` clean; no unexplained `any`; shapes defined once and imported | PASS | PASS — one type per entity, reused by every consumer; the JSON→type assertion in the barrel is the single narrowing point and is documented |
| IV. Responsive & Accessible | Renders 375px–1600px, keyboard reachable, no color-only meaning | PASS — no markup or styling changes | PASS — option lists rendered via `.map()` produce byte-identical DOM to the current hand-written items |
| V. Scaffold Integrity & Simplicity | `PreviewErrorBoundary` and the UXPilot vite bridge untouched; no new deps; abstractions need two call sites | PASS | PASS — no new dependencies; the three-file pattern is justified by 10 features using it |

**Technology & Architecture Constraints check**: imports use the `@/` alias (`@/data/...`);
directory layout preserved and extended with a sibling `src/data/`; every screen stays inside
`DashboardShell`; routing untouched; charts stay in `recharts`/`ResponsiveContainer`; demo content
remains fictional and unchanged in substance.

**Result: PASS — no violations, Complexity Tracking table omitted.**

The one configuration change (`resolveJsonModule: true` in `tsconfig.app.json`) is not a
scaffold-owned file under Principle V — the protected items are `PreviewErrorBoundary` in
`src/main.tsx` and the `uxpilotCanvasVhBridge` plugin plus `allowedHosts` in `vite.config.ts`,
none of which are touched.

## Project Structure

### Documentation (this feature)

```text
specs/001-extract-data-to-json/
├── plan.md              # This file
├── research.md          # Phase 0: full 76-item inventory + 8 design decisions
├── data-model.md        # Phase 1: entity shapes and their JSON representation
├── quickstart.md        # Phase 1: how to verify the refactor screen by screen
├── contracts/
│   └── data-modules.md  # Phase 1: the import contract components depend on
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

Existing directories are unchanged. This feature adds one new top-level directory under `src/`,
organized to mirror the existing per-screen component grouping:

```text
src/
├── data/                          # NEW — all business and sample data
│   ├── shared/                    # Reference data used by 3+ screens (FR-015)
│   │   ├── ai-models.json
│   │   ├── competitors.json
│   │   ├── categories.json
│   │   ├── types.ts
│   │   └── index.ts
│   ├── visibility-dashboard/
│   │   ├── kpis.json
│   │   ├── share-over-time.json
│   │   ├── inclusion.json
│   │   ├── sentiment.json
│   │   ├── competitor-sov.json
│   │   ├── citation-sources.json
│   │   ├── alerts.json
│   │   ├── types.ts
│   │   └── index.ts
│   ├── model-monitoring/          # model-status, performance, metrics,
│   ├── prompt-library/            #   recent-runs, position-distribution,
│   ├── answer-analysis/           #   top-sources, filter-options, …
│   ├── competitor-intelligence/   # (same three-file pattern per feature)
│   ├── content-recommendations/
│   ├── experiments-impact/
│   ├── reports-billing/
│   ├── workspace-setup/
│   └── sign-in/
├── pages/                         # unchanged files, data literals removed
├── components/
│   ├── <Screen>/                  # unchanged files, data literals removed
│   ├── layout/                    # navItems stays — navigation is out of scope
│   └── ui/                        # UNTOUCHED — design primitives, no business data
├── hooks/                         # untouched
└── lib/                           # untouched
```

**Structure Decision**: `src/data/<feature>/` mirrors `src/components/<Screen>/` one-to-one, so a
developer looking at a component knows its data folder without searching (SC-005). Feature folder
names use the kebab-case route name rather than the PascalCase component folder name, matching the
`src/pages` route vocabulary. `shared/` holds only data proven to appear on three or more screens;
anything narrower stays with its feature to avoid a junk-drawer module.

Each feature folder follows the same three-file contract, specified in
[contracts/data-modules.md](./contracts/data-modules.md):

| File | Holds | Never holds |
|------|-------|-------------|
| `*.json` | Business and sample data values only | Code, icons, colors, class names, sizes |
| `types.ts` | Exported record shapes; presentation lookup maps keyed by data id | Data values |
| `index.ts` | JSON imports asserted to the declared types, re-exported by name | Logic, formatting, computation |

## Phase 0 — Research

Complete. See [research.md](./research.md). It contains the exhaustive 63-item classification
required by FR-001 and resolves eight design questions, of which four materially shape the work:

1. **JSON cannot express literal union types.** Resolved by asserting in the `index.ts` barrel, so
   the assertion appears once per collection rather than at every call site.
2. **Records mixing data with icons/colors** (`AlertsPanel`, `SummaryKPIs`, `ExperimentTimeline`,
   `ModelStatusCards`, `InsightsCards`, `ContentRecommendations` stats, `CompetitorIntelligence`
   competitors and strengths). Resolved by keeping a stable `id`/`key` in the JSON and a
   `Record<id, LucideIcon>` / `Record<id, string>` lookup in `types.ts`.
3. **`CompetitorTracker` seeds editable state** from `["Postman", "Datadog"]`. Resolved by
   importing the seed as the `useState` initial value — the add/remove behavior must survive.
4. **Hand-written `<SelectItem>` option lists** across five filter bars are repeated data values
   under FR-007 and move to JSON, rendered with `.map()`. The rendered DOM is unchanged.

## Phase 1 — Design & Contracts

Complete. Artifacts generated:

- **[data-model.md](./data-model.md)** — the 20 entities from the spec resolved into concrete
  record shapes, each with its fields, its JSON representation, its owning feature folder, and the
  presentation values that stay behind in code.
- **[contracts/data-modules.md](./contracts/data-modules.md)** — the interface every data module
  exposes and every consuming component depends on: naming, import style, assertion rule, and the
  rules governing what may never enter a JSON file. This is the contract `/speckit-analyze` and
  code review check against.
- **[quickstart.md](./quickstart.md)** — the runnable verification procedure: enable JSON
  resolution, build, then walk all ten screens against a before/after checklist, plus the
  single-edit and shared-rename probes that prove SC-003 and SC-004.

**Post-design Constitution re-check: PASS** (table above, right-hand column). The design adds no
dependency, no route, no styling value in data, and no untyped collection.

## Execution Order

Sequenced so that each step leaves the application in a working, buildable state:

1. **Foundation** — enable `resolveJsonModule`; create `src/data/shared/` (AI models, competitors,
   categories) since later features reference it.
2. **User Story 1 (P1)** — Visibility Dashboard, then Model Monitoring. Proves the pattern
   end-to-end on the two highest-density screens, including the icon/color rejoin.
3. **User Story 2 (P2)** — the remaining seven screens, one feature folder at a time, each
   independently buildable and verifiable.
4. **User Story 3 (P3)** — replace the duplicated model/competitor/category literals with the
   `shared/` imports and delete the copies, including the brand list inside `AnswerDetail`'s
   `highlightText`.
5. **Verification** — full lint, build, and the ten-screen walkthrough in `quickstart.md`.

Detailed, dependency-ordered tasks are produced by `/speckit-tasks`, not here.
