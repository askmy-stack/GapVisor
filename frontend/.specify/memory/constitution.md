<!--
SYNC IMPACT REPORT
==================
Version change: (unversioned template) -> 1.0.0
Bump rationale: Initial ratification. All placeholder tokens replaced with concrete,
project-specific governance for VisibilityOS. Set to 1.0.0 to mark the first binding
version of the constitution.

Modified principles:
  [PRINCIPLE_1_NAME] -> I. Design-System Fidelity
  [PRINCIPLE_2_NAME] -> II. Data-Source Separation (NON-NEGOTIABLE)
  [PRINCIPLE_3_NAME] -> III. Type Safety & Build Integrity
  [PRINCIPLE_4_NAME] -> IV. Responsive & Accessible By Default
  [PRINCIPLE_5_NAME] -> V. Scaffold Integrity & Simplicity

Added sections:
  [SECTION_2_NAME] -> Technology & Architecture Constraints
  [SECTION_3_NAME] -> Development Workflow & Quality Gates

Removed sections: none

Deferred items / follow-up TODOs:
  - RESOLVED 2026-09-02 by feature 001-extract-data-to-json: the Principle II debt for
    src/pages/AnswerAnalysis.tsx, src/pages/CompetitorIntelligence.tsx and
    src/pages/ContentRecommendations.tsx is discharged. All 69 business-data collections now
    live under src/data/<feature>/ as JSON with companion types; the only list-shaped literals
    remaining in components are navigation entries and presentation lookups.
  - RESOLVED 2026-09-02: src/vite-env.d.ts added, supplying the vite/client types for
    `import.meta.env`. `tsc -b` and `npm run build` now pass, so the Principle III build
    gate is enforceable for the first time.
  - NEW: package.json defines `"lint": "eslint ."` but no ESLint configuration exists, so the
    Principle III lint gate cannot run. Adopting a config is its own change.
  - No automated test harness exists in package.json. Principle III gates on `tsc -b` and
    `eslint` only until a test runner is adopted; adopting one is a MINOR amendment.
-->

# VisibilityOS Constitution

## Core Principles

### I. Design-System Fidelity

VisibilityOS is a design-led product surface; visual consistency is a functional requirement,
not decoration. All UI MUST be composed from the shadcn/ui and Radix primitives in
`src/components/ui/` before any new primitive is authored. Color, spacing, radius, and
typography MUST be expressed through Tailwind tokens and the CSS custom properties defined in
`src/index.css` and `tailwind.config.js` (for example `bg-card`, `text-muted-foreground`,
`hsl(var(--chart-1))`). Hard-coded hex colors, arbitrary pixel values where a token exists, and
inline `style` attributes are PROHIBITED in feature code. Charts MUST draw series colors from
the `--chart-*` token ramp so light and dark themes both remain legible.

Rationale: the product's value proposition is an executive-grade analytics surface. Token drift
produces a demo that reads as unfinished, and it silently breaks theming for every later screen.

### II. Data-Source Separation (NON-NEGOTIABLE)

Presentation components MUST NOT own their data. Every dataset — mock or live — MUST be declared
in a dedicated module outside the rendering component, exported with an explicit TypeScript type
describing the shape a real API is expected to return. Page and component files MUST receive data
via props, a hook, or an import; they MUST NOT declare multi-record literal arrays inline. When a
backend is introduced it MUST be consumed through TanStack Query (already a dependency) behind
that same type, so the swap touches the data module and not the view.

Rationale: this codebase is a mock-data prototype intended to become a real product. The seam
between view and data is the single thing that decides whether that transition is a refactor or
a rewrite.

### III. Type Safety & Build Integrity

`npm run build` (which runs `tsc -b` then `vite build`) and `npm run lint` MUST both pass before
any change is considered complete. `any`, `@ts-ignore`, `@ts-expect-error`, and disabled ESLint
rules are PROHIBITED in feature code unless the suppression carries an adjacent comment naming
the specific upstream limitation that forces it. Every exported component MUST have explicitly
typed props; shared domain shapes (metrics, prompts, answer records, competitors,
recommendations, experiments) MUST be defined once and imported, never re-declared per call site.

Rationale: types are the contract that lets Principle II hold. A duplicated or loosened shape is
how a prototype's data model quietly forks into three incompatible versions.

### IV. Responsive & Accessible By Default

Every screen MUST render correctly from a 375px viewport up to the 1600px content ceiling, with
no horizontal page scroll; wide content (tables, charts, filter strips) MUST scroll inside its
own container. Navigation MUST remain reachable on small viewports through the mobile
navigation, not only the desktop sidebar. All interactive elements MUST be keyboard-reachable
and carry an accessible name; icon-only controls MUST supply one via `aria-label`, `title`, or
visually hidden text. Images MUST carry `alt` text. Meaning MUST NOT be conveyed by color alone —
status, trend, and severity MUST also be carried by label, icon, or text.

Rationale: this is a dashboard whose entire content is status and comparison. Color-only encoding
excludes color-blind users from the primary signal, and a dashboard that breaks on a laptop
screen fails in the exact room where it is shown.

### V. Scaffold Integrity & Simplicity

Files marked scaffold-owned MUST NOT be edited or removed: the `PreviewErrorBoundary` in
`src/main.tsx`, and the `uxpilotCanvasVhBridge` plugin plus `allowedHosts` in `vite.config.ts`.
New dependencies MUST NOT be added when an installed dependency covers the need; the existing set
(Radix, lucide-react, recharts, framer-motion, react-hook-form with zod, date-fns, sonner) is the
default toolbox. New abstractions — wrappers, context providers, generic helpers — MUST be
justified by at least two existing call sites. Speculative features, unused props, and
placeholder routes are PROHIBITED (YAGNI).

Rationale: the scaffold hooks keep the preview host working and failures legible; editing them
produces blank pages with no error text. Unjustified abstraction and dependency sprawl are the
fastest way to make a prototype expensive to finish.

## Technology & Architecture Constraints

The stack is fixed for this project: React 18, TypeScript, Vite 5 (SWC), Tailwind CSS 3,
shadcn/ui on Radix primitives, React Router 6, and TanStack Query for server state.

- Imports MUST use the `@/` alias for anything under `src/`; deep relative chains (`../../`) are
  PROHIBITED.
- Directory layout MUST be preserved: routed screens in `src/pages/`, feature components grouped
  by screen in `src/components/<Screen>/`, shared chrome in `src/components/layout/`, design
  primitives in `src/components/ui/`, hooks in `src/hooks/`, helpers in `src/lib/`.
- Every dashboard screen MUST render inside `DashboardShell` with a `DashboardTopbar`, and MUST
  be registered in both the routes in `src/App.tsx` and the `navItems` array in
  `src/components/layout/DashboardSidebar.tsx`. A route present in one and absent from the other
  is a defect.
- Routing MUST remain client-side under `BrowserRouter` with
  `basename={import.meta.env.BASE_URL}`; an unmatched path MUST resolve to `NotFound`.
- Charts MUST use `recharts` inside a `ResponsiveContainer`.
- No secrets, API keys, tokens, or real customer data may appear in the repository. Demo content
  MUST remain fictional (the "Northstar" brand and its named competitors) and MUST NOT be
  presented as any real company's measured data.

## Development Workflow & Quality Gates

- Feature work MUST follow the Spec Kit flow: `/speckit-specify` then `/speckit-plan` then
  `/speckit-tasks` then `/speckit-implement`. Screens MUST NOT be implemented directly from an
  informal request.
- All of the following gates MUST pass before a change is reported complete:
  1. `npm run lint` — clean.
  2. `npm run build` — clean (`tsc -b` plus `vite build`).
  3. Manual verification that each touched route renders without hitting the
     `PreviewErrorBoundary`, at both a narrow (375px) and a wide (1440px) viewport.
  4. Principle II check: no new inline multi-record data literals in a component file.
- Changes MUST be scoped to the requested work. Unrelated refactors, dependency bumps, and
  reformatting MUST be proposed separately rather than bundled in.
- Reviewers MUST verify compliance with each Core Principle. A violation MUST either be fixed or
  recorded in the change description with an explicit justification; silent deviation is a
  blocking defect.
- Any complexity beyond the simplest solution that satisfies the spec MUST be justified in
  writing at the point of introduction.

## Governance

This constitution supersedes all other development practices, conventions, and agent guidance for
this repository. Agent guidance files (for example `CLAUDE.md`) and Spec Kit templates MUST NOT
contradict it; where they conflict, this document wins and the conflicting file MUST be corrected.

Amendments MUST be made by editing `.specify/memory/constitution.md` through
`/speckit-constitution`, and MUST include an updated Sync Impact Report, a version bump, and an
updated **Last Amended** date. Versioning follows semantic versioning:

- **MAJOR** — a principle is removed, or redefined so that previously compliant work no longer
  complies.
- **MINOR** — a new principle or section is added, or existing guidance is materially expanded.
- **PATCH** — clarifications, wording, and typo fixes that do not change what is required.

Compliance is reviewed on every change under the Quality Gates above. Code predating a principle
is not retroactively blocking, but any file touched by a change MUST be brought into compliance
with the principles governing the lines being modified. Deviations that cannot be resolved MUST
be raised as a proposed amendment rather than normalized in practice.

**Version**: 1.0.0 | **Ratified**: 2026-09-02 | **Last Amended**: 2026-09-02
