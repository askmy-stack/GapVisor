# Quickstart: Verifying the Data Extraction

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contract**: [contracts/data-modules.md](./contracts/data-modules.md)

How to prove the refactor preserved behavior. This is the verification procedure, not the
implementation guide — tasks live in `tasks.md`.

Because the project has no test runner, verification is: a capture of the current rendering
**before** any change, then automated checks plus a screen-by-screen comparison after.

---

## Prerequisites

```bash
npm install
```

Confirm `tsconfig.app.json` has `"resolveJsonModule": true` under `compilerOptions`. Without it
the build fails at the first JSON import (decision D6).

---

## Step 0 — Capture the baseline (BEFORE any code changes)

This step is mandatory and cannot be done retroactively.

```bash
npm run dev
```

Walk all ten routes and capture a screenshot of each at 1440px width:

| Route | Screen |
|-------|--------|
| `/signin` | Sign In |
| `/workspace-setup` | Workspace Setup |
| `/dashboard` | Visibility Dashboard |
| `/prompts` | Prompt Library |
| `/monitoring` | Model Monitoring |
| `/answers` | Answer Analysis |
| `/competitors` | Competitor Intelligence |
| `/recommendations` | Content Recommendations |
| `/experiments` | Experiments & Impact |
| `/billing` | Reports & Billing |

Also capture `/dashboard` and `/answers` at 375px width — the two screens whose layout changes
most between breakpoints.

Keep these under the scratchpad directory, not in the repository.

---

## Step 1 — Automated gates

```bash
npm run lint
npm run build
```

Both must be clean. Any new error or warning fails **SC-007** and the constitution's Principle III
gate.

---

## Step 2 — Contract checks

Run from the repository root. Each command must produce **no output**.

**No presentation values leaked into JSON** (C2, SC-008):

```bash
grep -rniE "hsl\(|#[0-9a-f]{3,8}\b|\b(text|bg|border)-[a-z]+-[0-9]{3}\b|[0-9]+(px|rem)\b" src/data --include=*.json
```

**No executable code or component references in JSON** (C2):

```bash
grep -rnE "=>|function |import |require\(" src/data --include=*.json
```

**Components never import JSON directly** (C4.1):

```bash
grep -rn "from ['\"].*\.json['\"]" src/pages src/components
```

**No multi-record literals left behind** (SC-001) — the only permitted hits are the seven
documented keeps in [research.md](./research.md) §1.11:

```bash
grep -rn "^\s*const [A-Za-z_][A-Za-z_0-9]*\s*(:[^=]*)?=\s*\[" src/pages src/components --include=*.tsx | grep -v "src/components/ui/"
```

**Every JSON file is valid** :

```bash
for f in $(find src/data -name '*.json'); do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" || echo "INVALID: $f"; done
```

---

## Step 3 — Screen-by-screen comparison

```bash
npm run dev
```

For each of the ten routes, compare against the Step 0 baseline. A screen passes only if **all**
hold:

- [ ] Every number, label, and text string is identical
- [ ] Every list has the same entries in the same order
- [ ] Every icon is the same icon, in the same color
- [ ] Charts have the same series, colors, and shapes
- [ ] No section is missing, empty, or duplicated
- [ ] The `PreviewErrorBoundary` "This page failed to render" panel never appears
- [ ] The browser console shows no new errors or warnings

---

## Step 4 — Interaction checks (FR-011, SC-006)

Behavior that a naive extraction would break:

| # | Screen | Action | Expected |
|---|--------|--------|----------|
| 1 | Workspace Setup | Type a competitor, press Add; then remove one | List updates both ways — **the seed must not be frozen** (decision D3) |
| 2 | Answer Analysis | Click each record in the left list | Detail pane updates: answer, reasoning, sources, inaccuracies |
| 3 | Content Recommendations | Click each content-type tab | List filters and the count badge updates |
| 4 | Reports & Billing | Switch all four tabs | Each renders its own records |
| 5 | Visibility Dashboard | Open the model dropdown, toggle entries | Checkboxes toggle as before |
| 6 | Model Monitoring | Open each of the three filter dropdowns | Same options, same order, same values |
| 7 | Prompt Library | Open filters and the Create Prompt dialog | All five filter groups and the dialog's model list populate |
| 8 | Any dashboard screen | Collapse and expand the sidebar | Works; nav labels unchanged |
| 9 | Any dashboard screen at 375px | Open mobile navigation | All eight destinations present |
| 10 | Competitor Intelligence | Scroll the full page | Charts, table, strengths, and root causes all render |

---

## Step 5 — Outcome probes

These prove the point of the feature rather than the absence of regressions.

**SC-003 — one file, one edit:**

1. Open `src/data/visibility-dashboard/kpis.json`.
2. Change the first KPI's `value` to `"99.9%"`.
3. Reload `/dashboard`.
4. The card shows `99.9%`. **No `.tsx` file was touched.**
5. Revert.

**SC-004 — shared rename propagates:**

1. Open `src/data/shared/ai-models.json`.
2. Rename `"ChatGPT"` to `"TestModel"`.
3. Reload and check `/dashboard` (filter + chart legend), `/monitoring` (status cards),
   `/prompts` (filters), `/answers` (filters).
4. Every surface shows `TestModel`. Then confirm nothing stale remains:

   ```bash
   grep -rn "ChatGPT" src/ --include=*.tsx --include=*.ts | grep -v src/data
   ```

   Only presentation lookups keyed by model id may appear.
5. Revert.

**SC-005 — locatability:** pick any three on-screen values at random and find the file backing
each in under a minute, using only the folder names under `src/data/`.

---

## Failure triage

| Symptom | Likely cause |
|---------|--------------|
| Build error: *Cannot find module './x.json'* | `resolveJsonModule` not enabled (D6) |
| Build error: *Type 'string' is not assignable to '"Positive" \| …'* | Missing barrel assertion (C3) |
| Build error about a type-only import | Needs `import type` — `verbatimModuleSyntax` (D7) |
| Blank card where an icon was | Lookup key missing from the `Record` (C5) |
| Chart renders axes but no lines | A JSON field was renamed; `dataKey` no longer resolves (I3) |
| Wizard competitor list won't accept additions | Rendering from the import instead of seeding state (D3) |
| Dropdown option selects nothing | A filter `value` was normalized instead of preserved (I4) |
