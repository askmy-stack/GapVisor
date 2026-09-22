# GapVisor — Phase Roadmap

**Purpose**: entry point for any coding agent (or person) picking up work on this repo. Read this first, then open the phase you're assigned.

**Current state**: `001-extract-data-to-json` is complete — the frontend is a full 10-screen UI backed by static JSON, with no backend. `002-backend-platform` has an unusually complete technical plan already written (`plan.md`, `data-model.md`, `contracts/api.md` — ~14 weeks, 2 engineers, 9 milestones M0-M8) but was missing `spec.md` and `tasks.md` until this pass — both are now present, completing the phase per this repo's own process rules.

## Phases

| Phase | Folder | Depends On | Can Run In Parallel With |
|---|---|---|---|
| 1 | `002-backend-platform` | 001 (done) | — (blocking foundation; internally, M1-M2 and M3-M4 can split across 2 engineers per plan.md) |
| 2 | `003-gtm-and-coverage-enhancements` | 002 (M4 specifically — needs real metric data) | `004-frontend-design-fixes` |
| 3 | `004-frontend-design-fixes` | none (frontend-only) | 002, 003, 005-010 — different files, safe to run anytime |
| 4 | `005-insight-to-renewal-loop` | 002 (M5-M7) | `004-frontend-design-fixes` |
| 5 | `006-confidence-layer` | 002 (M4 — needs `sample_size` on `metric_daily`) | `004`, `007`-`010` |
| 6 | `007-absorption-funnel` | 002 (M3-M4), 003 (crawl-log data) | `004`, `006`, `008`-`010` |
| 7 | `008-revenue-thread` | 002 (M5-M7), 005 | `004`, `006`, `007`, `009`, `010` |
| 8 | `009-experiment-lab` | 002 (M6), 006 (reuses its confidence methodology) | `004`, `007`, `008`, `010` |
| 9 | `010-reconciliation-layer` | 002 (M4), 006 | `004`, `007`-`009` — but see its own Status note before starting |

Phases 6-10 are the "unique whitespace" set — capabilities checked against 30+ named platforms in this space (Profound, HubSpot AEO, Semrush, Ahrefs Brand Radar, Otterly.AI, Peec AI, Scrunch, AthenaHQ, Lantern, SE Ranking, and dozens more found during research) and validated as genuinely open, contested-by-one-specialist, or documented-methodology-not-yet-productized — never presented as unclaimed without a specific check. `006` and `007` are confirmed unclaimed by any major platform. `008` is real but contested — Lantern and HubSpot's native integration already do a version of it; most of the market (Profound included) doesn't. `009` upgrades an existing planned milestone (002's Experiments) from observational to genuinely causal. `010` is the least validated of the five — its own spec says to pilot with real customers before building a general import framework.

## How to Use This With a Coding Agent

1. `002-backend-platform` is the only phase with all four spec-kit documents (`spec.md`, `plan.md`, `data-model.md`, `contracts/api.md`, `tasks.md`) — it's ready to implement now, following its own milestone-ordered `tasks.md`.
2. **Before M3 of `002` starts**, resolve the one remaining `NEEDS CLARIFICATION` item in `002-backend-platform/spec.md` (`FR-012` — Growth tier scan-commitment semantics). The other four original open questions (Copilot handling, region semantics, recommendation authoring, data residency) are resolved as of 2026-09-15 — see spec.md for the decisions.
3. For `003` through `010`: `spec.md` only. Run `/speckit-plan` once each phase's dependencies are actually merged, so technical context reflects what's really built.
4. `004-frontend-design-fixes` has zero backend dependency — assign it to a second agent from day one, same reasoning as EvalOps' equivalent phase.
5. `006-confidence-layer` unlocks two downstream phases (`009` reuses its statistics, `010` reuses it to check whether two numbers are really different) — worth prioritizing early within the whitespace set for that reason alone, not just because it's independently the strongest finding.

## Why This Order

- **002 first, in full, no exceptions.** Every screen currently renders static JSON; nothing else in this list means anything until real data is flowing.
- **003 needs 002's M4 specifically** — the GTM enhancements (free grader, new tracked surfaces) are extensions of the scan pipeline and metric rollups, not the workspace/prompt scaffolding from M1-M2.
- **004 is intentionally parallel**, same logic as EvalOps' phase: it's presentation-layer only and shares no files with the backend work.
- **005 needs 002's M5-M7** — connecting recommendations, experiments, and billing reports into one visible thread requires all three to exist first.
- **006 as the first whitespace phase, deliberately** — cheapest (a computation layer over data 002 already plans to store), and two other whitespace phases (`009`, `010`) depend on its statistics engine existing.
- **007 next** — needs both `002` and `003`'s data, but is otherwise independent of `006` and can run in parallel with it.
- **008 needs 005**, not just `002` — it's a direct extension of that phase's recommendation-to-experiment connection, pushed one step further into actual CRM pipeline.
- **009 and 010 both need 006** — one reuses its stats for causal inference, the other reuses it to tell whether two conflicting numbers are actually different or just noise.
- **010 last, and treated as a pilot** — the only phase in this whole set with a "validate before generalizing" note in its own spec.
