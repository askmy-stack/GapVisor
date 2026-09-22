# Contract: Data Module Interface

**Feature**: [../spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md)

VisibilityOS exposes no network API. Its one internal interface introduced by this feature is the
**data module** — the boundary between JSON data files and the React components that render them.
This contract is what code review and `/speckit-analyze` check against.

---

## C1 — Folder shape

Every feature folder under `src/data/` contains exactly three kinds of file:

```text
src/data/<feature>/
├── <collection>.json   one or more; data values only
├── types.ts            record shapes + presentation lookups
└── index.ts            the public surface — the only file components import
```

`<feature>` is the kebab-case route name (`visibility-dashboard`, not `VisibilityDashboard`),
mirroring `src/components/<Screen>/` one-to-one.

---

## C2 — What each file may contain

| File | MUST contain | MUST NOT contain |
|------|--------------|------------------|
| `*.json` | Business and sample data values only | Any executable code; component or icon references; colors, `hsl(var(--…))`, hex, or Tailwind class strings; font, spacing, width, height, or size values; comments |
| `types.ts` | Exported `type`/`interface` declarations; `Record<Id, LucideIcon>` and `Record<Id, string>` presentation lookups | Data values that belong in JSON |
| `index.ts` | JSON imports, one type assertion per collection, named re-exports | Logic, formatting, computation, or transformation |

A JSON file containing any item from the right-hand column is a contract violation and fails
**SC-008**.

---

## C3 — The barrel

`index.ts` is the single place a JSON import is narrowed to its declared type:

```ts
import type { Alert } from './types'
import alertsJson from './alerts.json'

export const alerts = alertsJson as Alert[]
export type { Alert } from './types'
export { alertIcons, alertColors } from './types'
```

**Rules**

1. Exactly one assertion per collection, and only in `index.ts`. Components never assert.
2. Type imports use `import type` — required by `verbatimModuleSyntax: true` (decision D7).
3. Exports are named. No default exports, so collections are greppable by name.
4. The exported name is the domain plural (`alerts`, `prompts`, `invoices`), not the file name.

**Why the assertion is necessary**: TypeScript infers JSON string fields as `string`, so a field
declared `"Positive" | "Neutral" | "Negative"` will not typecheck without narrowing. Concentrating
it in the barrel means the shape is stated once (FR-014) rather than at every call site.

---

## C4 — The consumer contract

Components import named collections from the barrel through the `@/` alias:

```ts
import { alerts } from '@/data/visibility-dashboard'
import type { Alert } from '@/data/visibility-dashboard'
```

**Rules**

1. Components MUST NOT import a `.json` file directly — always through the barrel.
2. Components MUST NOT redeclare a record shape that `types.ts` already declares.
3. Components MUST NOT mutate an imported collection. Copy before sorting or filtering.
4. Where a collection seeds editable state, it is passed as the `useState` **initial value**, not
   used as the render source (decision D3).
5. Deep paths (`@/data/visibility-dashboard/alerts.json`) are prohibited — the folder's `index.ts`
   is the only entry point.

---

## C5 — Presentation rejoin

Records that previously carried an icon or a color keep a stable identifier and resolve
presentation in code:

```ts
// types.ts
export type AlertSeverity = 'critical' | 'warning' | 'info'
export const alertIcons: Record<AlertSeverity, LucideIcon> = { … }
export const alertColors: Record<AlertSeverity, string> = { … }
```

**Rules**

1. The lookup key is a business value already present in the JSON — a severity, a status, an
   entity id. Never a positional index.
2. Lookups are exhaustive `Record<K, V>` over a literal union, so a missing entry is a compile
   error rather than a blank icon at runtime.
3. Icon *names* as strings in JSON are prohibited — a name is still a presentation value
   (decision D2).

---

## C6 — Invariants

These hold for every collection and are what "behavior preserved" means concretely:

- **I1** Values are byte-identical to the literals they replaced, including pre-formatted display
  strings like `"42.8%"`.
- **I2** Array order is unchanged — order is visible on screen.
- **I3** Field names are unchanged, so every recharts `dataKey` keeps resolving.
- **I4** Filter `value` attributes are preserved verbatim, including existing inconsistencies
  across screens (decision D4).
- **I5** No collection is duplicated across feature folders. Data used by three or more screens
  lives in `shared/`.
- **I6** Every collection is reachable from exactly one `index.ts`.

---

## C7 — Build configuration dependency

`tsconfig.app.json` requires `"resolveJsonModule": true`. Without it every barrel fails to compile.
This is the only configuration change in scope (FR-016). Vite bundles JSON natively, so no
build-tool or dependency change is required.

---

## C8 — Contract test

There is no automated test runner in this project, so the contract is verified by the procedure in
[../quickstart.md](../quickstart.md). The mechanical checks that map to this contract:

| Check | Verifies |
|-------|----------|
| No `hsl(`, `text-`, `bg-`, `#`, `px`, `rem` in any `src/data/**/*.json` | C2, SC-008 |
| No `import … from '…json'` outside `src/data/**/index.ts` | C4.1 |
| No multi-record literal remains in `src/pages/` or `src/components/` outside the 7 documented keeps | SC-001 |
| `npm run lint` and `npm run build` clean | C7, SC-007 |
| Ten-screen visual walkthrough | I1–I4, SC-002 |
