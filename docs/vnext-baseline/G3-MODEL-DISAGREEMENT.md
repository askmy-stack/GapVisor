# vNext Phase G3 — Model Disagreement Index

Delivered against `GAPVISOR_VNEXT_AGENT_PLAN.md` section 9 and section 22
Phase G3: "presence disagreement, ranking disagreement, citation
disagreement, frontend stability view."

## What this computes

For one prompt, `services/disagreement.py` looks at the latest **VALID**
`Observation` from each model that has scanned it (an UNCERTAIN/INVALID
observation doesn't count as a real model opinion) and measures:

- **Presence agreement** — the majority share on whether the brand is
  mentioned at all. 3 of 4 models mentioning it is `0.75` agreement,
  regardless of which side is the majority.
- **Rank agreement** — among models that *do* mention the brand,
  `1 - (population stdev of ranks / mean of ranks)`, clipped to `[0, 1]`.
  Undefined (`None`) with fewer than two ranked models — spread isn't
  meaningful from one data point.
- **Citation agreement — not computed.** The plan's section 9 lists this
  third measure, but no citation extraction exists yet
  (`ObservationExtraction.citations` is always `[]`, deferred since G1).
  The API returns `null` with an explicit `citation_agreement_reason`
  string rather than fabricating a number from data that doesn't exist.
- **`stability_band`** (HIGH/MODERATE/LOW) — a documented, adjustable
  first-pass average of whichever real scores exist (`>=0.7` avg → HIGH,
  `>=0.4` → MODERATE, below → LOW). The underlying components stay visible
  in the API response regardless — per the plan's explicit instruction not
  to hide disagreement behind one opaque score.

## API

`GET /api/v1/visibility/disagreement` (plan section 20's suggested path):
- No `prompt_id` → one entry per active prompt that has at least one VALID
  observation (prompts never scanned, or only scanned with failures, are
  skipped rather than returned as an empty placeholder).
- `?prompt_id=X` → that one prompt, or 404 if it doesn't exist in the
  caller's workspace or has no VALID observations yet.

Verified live against the demo workspace: e.g. "What are the best API
gateway platforms for developer-first teams?" — 5 models all mention the
brand (`presence_agreement: 1.0`) but disagree sharply on rank (ChatGPT/
Claude/AI-API-Key at #1, Gemini/Perplexity at #4 → `rank_agreement: 0.33`,
`stability_band: "MODERATE"`).

## Frontend

`RecommendationStability` (new component, wired into the real Visibility
Dashboard, not a prototype): shows the workspace's most noteworthy prompt
(lowest stability band, then lowest average agreement — the plan's "top
anomalies" dashboard intent from section 18, not an arbitrary pick), each
model's rank or "Not mentioned", the two real agreement scores, and
"Not available" for citation agreement (with the reason as a tooltip).

**Live-only, by design.** There's no static-demo equivalent for real
cross-model disagreement — fabricating one would mean inventing numbers
this exact feature exists specifically to avoid inventing. The card
renders nothing (not a placeholder, not an error) when the API is
unreachable; verified both ways: renders correctly with real per-model
data when live, disappears cleanly with the rest of the dashboard
unaffected when the API is stopped (demo-mode banner shown as normal).

## Test coverage

`backend/tests/test_disagreement.py`: 8 tests — no-data and wrong-workspace
return `None`; unanimous agreement across 4 models computes to exactly
`1.0`/`1.0`/HIGH; a mixed case matches the plan's own worked example's
`0.75` presence-agreement number, with rank agreement computed and checked
against the documented formula by hand; a single ranked model correctly
leaves rank agreement undefined rather than a fake perfect score; a model
that changes its answer over time is scored by its *latest* observation,
not an earlier one; UNCERTAIN/INVALID observations are excluded; and
`compute_workspace_disagreement` skips prompts with no data rather than
padding the list.

## Verified live

Full suite: 33/35 passing (2 pre-existing unrelated skips), both locally
and in-container. `ruff check` clean. Frontend `npm run build` (tsc + vite)
passes. Live scan, live disagreement endpoint (list + single-prompt +
404), and the dashboard card all confirmed working against real Postgres
in the browser, in both live and demo mode.
