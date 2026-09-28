# vNext Phase G4 — Causal Visibility Graph foundation

Delivered against `GAPVISOR_VNEXT_AGENT_PLAN.md` section 10 and section 22
Phase G4: "graph-shaped relational schema, edge types, provenance,
causal-status field, graph query API."

## What this adds

- **`causal_edges`** (new table): a graph-shaped relational model in
  Postgres, not a graph database — the plan is explicit one isn't
  warranted until the relational shape demonstrably can't keep up.
  `source_type`/`target_type` name which table the row's `source_id`/
  `target_id` point into; there's no FK constraint because a single edges
  table spans several unrelated target tables (the same trade-off
  `MetricDaily` already makes with its optional dimension columns).
- **All eight of the plan's edge types are recognized** by
  `services/causal_graph.py`'s `EDGE_TYPES`, but **only two are actually
  written**: `PROMPT_PRODUCED_RESPONSE` (prompt → observation) and
  `RESPONSE_MENTIONED_BRAND` (observation → workspace, only when that
  observation's extraction found the brand). The other six all depend on
  data that doesn't exist yet — citations, source assets, interventions,
  and external signals are later phases (G5+/G7+) — so nothing fabricates
  them.
- **Every edge this codebase writes is `causal_status="OBSERVED"`** — a
  structural fact ("this response was produced by this prompt"), never a
  causal claim. `record_edge()` never defaults to or accepts a path to
  `SUPPORTED`/`NOT_SUPPORTED` from this module; those two only make sense
  once an Experiment resolves (G6), by code that will live there. This is
  the plan's most explicit rule for this phase ("do not infer SUPPORTED
  merely from time order") and there's a test asserting it.
- **`record_edge()` requires non-empty `evidence_refs`** — "an edge with no
  evidence isn't an edge, it's a guess" is enforced, not just documented.
- **Wired into `record_observation()`** (G1/G2's shared entry point used by
  live scans and both seed backfills): every observation gets a
  `PROMPT_PRODUCED_RESPONSE` edge, and a `RESPONSE_MENTIONED_BRAND` edge
  when the brand was mentioned.

## API

`GET /api/v1/graph/entities/{entity_id}?entity_type=...` (plan's suggested
path) — every edge where this entity is source or target.

`GET /api/v1/graph/paths?prompt_id=...` — `trace_prompt_to_brand_mentions`:
the currently-populated slice of the plan's full evidence chain (section
3.3's Intent → Prompt → Surface → Response → Recommendation → Claim →
Citation → Source → ... → Business Outcome): prompt → its observations →
which of those mentioned the brand. Explicitly partial — later phases
extend the chain as citation/asset/experiment data starts existing, by
adding to what this function *finds*, not by changing its contract.

## Backfill

Same pattern as G1's answer backfill: `record_observation()` gives new
scans edges automatically, but the 676 observations already in the demo
workspace from earlier phases had none. `backfill_causal_edges_for_existing_observations`
retroactively writes them, idempotently (checked live: 676 backfilled on
first restart after this migration, 0 on the second).

## Test coverage

`backend/tests/test_causal_graph.py`: 9 tests — edge types and causal
statuses match the plan's list exactly; `record_edge` rejects an unknown
edge type, an unknown causal status, and empty evidence; a dedicated test
asserts the default is `OBSERVED` and nothing here ever sets `SUPPORTED`;
`edges_for_entity` finds edges in both directions and respects workspace
isolation; `trace_prompt_to_brand_mentions` returns `[]` with no data and
correctly follows the two-hop chain otherwise.

## Verified live

Migration applies clean (`004_observations` → `005_causal_graph`). Full
suite: 42/42 passing (local + in-container). `ruff check` clean. Backfill
confirmed idempotent against the real demo workspace (676 observations →
676 `PROMPT_PRODUCED_RESPONSE` + 676 `RESPONSE_MENTIONED_BRAND` edges, all
`OBSERVED`). Both graph endpoints verified live: `/graph/paths` for one
prompt returns 152 edges (76 + 76, matching that prompt's real scan
history); `/graph/entities/{id}?entity_type=prompt` returns the 76 edges
where it's the source. Frontend and existing endpoints unaffected.
