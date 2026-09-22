# Specification Quality Checklist: Extract Hardcoded Data to JSON

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-02
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Validation Findings

**Iteration 1** — three items initially failed; all were corrected in the spec before this
checklist was finalized:

1. *No implementation details* — FAILED. Draft success criteria referenced the specific build
   and lint commands, and a requirement named the TypeScript configuration flag needed for JSON
   imports. **Resolved**: SC-007 now reads "builds and passes static checks with zero new errors
   or warnings"; FR-016 states the build configuration must support loading data files without
   naming the flag. The concrete flag is left for `/speckit-plan` to determine.
2. *Requirements are testable* — FAILED. An early requirement said data should be organized
   "sensibly", which no reviewer could fail objectively. **Resolved**: FR-003 now states the
   testable outcome (locatable without searching the whole application), paired with SC-005's
   one-minute discovery measure.
3. *Scope is clearly bounded* — FAILED. The draft did not say what happens to list-shaped values
   that are not business data. **Resolved**: FR-006 through FR-009 now enumerate the exclusions
   (logic, one-off UI text, navigation, presentation lookup tables), and the Edge Cases section
   names each specific case found in the codebase.

**Iteration 2** — all items pass. No `[NEEDS CLARIFICATION]` markers were required: the feature
description was unusually explicit about scope boundaries, and every remaining gap had a
defensible default recorded in the Assumptions section.

## Notes

- The spec is grounded in a real inventory of the codebase: 53 hardcoded data collections across
  37 files, excluding `src/components/ui/`. FR-001 requires the exhaustive per-entry inventory to
  be produced during planning.
- Two findings from the code review deserve planning attention because they are the main sources
  of risk in an otherwise mechanical refactor:
  - Records that mix business data with icon references and theme color tokens (FR-005) — these
    cannot be moved verbatim.
  - `src/components/WorkspaceSetup/CompetitorTracker.tsx` seeds editable component state from a
    hardcoded list; externalizing it must not turn editable state into fixed content.
- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`.
