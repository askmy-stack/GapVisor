# Phase 1 Data Model: Extract Hardcoded Data to JSON

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

The 20 entities named in the spec, resolved into concrete record shapes. Every shape here is
declared once in its feature's `types.ts` and imported by all consumers (FR-014).

**Reading the tables**: *JSON fields* are what appears in the `.json` file. *Stays in code* names
the presentation values that must NOT be serialized (FR-004, FR-005) and how they rejoin.

---

## Shared reference data — `src/data/shared/`

Only collections with three or more consuming screens live here (decision D5).

### AiModel — `ai-models.json`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Stable key: `chatgpt`, `claude`, `gemini`, `perplexity`, `copilot`, `buyer-agents` |
| `name` | `string` | Short display name — `"ChatGPT"` |
| `longName` | `string` | Full name used by the create-prompt dialog — `"ChatGPT 4o"` (decision D8) |
| `badge` | `string` | Short letters shown on status cards — `"C"`, `"Cl"` |

**Stays in code**: the `--chart-*` color assigned per model index.
**Consumers**: dashboard filter bar, share-over-time legend, model status cards, prompt filters,
answer-analysis filters, create-prompt dialog.

### Competitor — `competitors.json`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | `kong`, `postman`, `apigee`, `tyk`, `mulesoft` |
| `name` | `string` | Display name |
| `logo` | `string` | Single-letter badge text — data, not an image asset |
| `isBrand` | `boolean` | True for the tracked brand itself (Northstar) |

**Stays in code**: `color: "hsl(var(--chart-N))"` — resolved by index in the component.
**Consumers**: competitor intelligence, dashboard share-of-voice, answer-detail brand
highlighting.

### Category — `categories.json`

| Field | Type | Notes |
|-------|------|-------|
| `value` | `string` | Filter value, preserved verbatim per screen (decision D4) |
| `label` | `string` | Display text |

**Consumers**: dashboard filter bar, monitoring controls, prompt filters, answer filters, content
gap map.

---

## Visibility Dashboard — `src/data/visibility-dashboard/`

### VisibilityMetric — `kpis.json`

| Field | Type | Notes |
|-------|------|-------|
| `title` | `string` | |
| `value` | `string` | Pre-formatted display value (`"42.8%"`, `"82/100"`) — preserved verbatim |
| `change` | `number` | |
| `trend` | `"up" \| "down"` | Literal union — narrowed by the barrel assertion (D1) |
| `sparklineBase` | `number` | Input to `generateSparkline()` |
| `sparklineVariance` | `number` | Input to `generateSparkline()` |

**Stays in code**: `generateSparkline()` itself (K7) and the up/down arrow and color mapping.

### TimeSeriesPoint — `share-over-time.json`, `inclusion.json`, `sentiment.json`

| Field | Type | Notes |
|-------|------|-------|
| `date` \| `name` | `string` | X-axis key — field name preserved to match the existing recharts `dataKey` |
| *(one key per series)* | `number` | e.g. `chatgpt`, `claude`, `gemini`, `perplexity`, `copilot` |

**Stays in code**: every recharts `dataKey`, `stroke`, and axis configuration.

### CompetitorShare — `competitor-sov.json`

| Field | Type |
|-------|------|
| `name` | `string` |
| `share` | `number` |
| `change` | `number` |

### CitationSource — `citation-sources.json`

| Field | Type | Notes |
|-------|------|-------|
| `domain` | `string` | |
| `count` | `number` | |
| `authority` | `string` | `"High"`, `"Medium"`, `"Owned"` |

### Alert — `alerts.json`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | **Added** — the rejoin key for icon and color (FR-005) |
| `title` | `string` | |
| `description` | `string` | |
| `time` | `string` | |
| `severity` | `"critical" \| "warning" \| "info"` | Replaces the embedded color |

**Stays in code**: `alertIcons: Record<Severity, LucideIcon>` and
`alertColors: Record<Severity, string>` — currently `color: "text-red-500"` inline in the record.

---

## Model Monitoring — `src/data/model-monitoring/`

### ModelStatus — `model-status.json`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Matches `AiModel.id` |
| `name` | `string` | |
| `badge` | `string` | Currently the `icon` field — it holds letters, not an icon |
| `status` | `"Healthy" \| "Degraded"` | |
| `lastScan` | `string` | |
| `inclusion` | `string` | |
| `trend` | `"up" \| "down" \| "stable"` | |

**Stays in code**: `color: "hsl(var(--chart-N))"` — resolved by model id.

### Other collections

| File | Shape |
|------|-------|
| `model-sparkline.json` | `{ v: number }[]` |
| `performance.json` | `TimeSeriesPoint[]` — one numeric key per model |
| `metrics.json` | `{ metric, chatgpt, claude, gemini, perplexity, copilot }` |
| `recent-runs.json` | `{ id, model, prompts, started, duration, status }` |
| `position-distribution.json` | `{ id, name, value }` — **color moves to a code lookup keyed by `id`** |
| `top-sources.json` | `{ domain, citations, share }` |
| `filter-options.json` | `{ timeRanges: Option[], regions: Option[] }` where `Option = { value, label }` |

---

## Prompt Library — `src/data/prompt-library/`

### Prompt — `prompts.json`

Existing `Prompt` type in `PromptTable.tsx` moves verbatim to `types.ts`.

| Field | Type |
|-------|------|
| `id` | `string` |
| `text` | `string` |
| `category` | `string` |
| `intent` | `string` |
| `region` | `string` |
| `models` | `string[]` |
| `frequency` | `string` |
| `lastRun` | `string` |
| `outcome` | `string` |

**Stays in code**: `modelIcons` (K2) and `intentColors` (K3).

| File | Shape |
|------|-------|
| `templates.json` | `{ name, description, promptCount }` |
| `scheduled-runs.json` | `{ name, schedule, nextRun, status }` |
| `stats.json` | `{ label, value, change }` |
| `filter-options.json` | `{ useCases: Option[], intents: Option[], regions: Option[] }` |

---

## Answer Analysis — `src/data/answer-analysis/`

### AnswerRecord — `answers.json`

The largest record set. The inline type annotation at `pages/AnswerAnalysis.tsx:10` moves to
`types.ts` and is shared with `AnswerList` and `AnswerDetail`, which currently redeclare parts of
it — this satisfies "defined once" (FR-014).

| Field | Type |
|-------|------|
| `id` | `string` |
| `promptSnippet` | `string` |
| `prompt` | `string` |
| `model` | `string` |
| `outcome` | `"recommended" \| "not-recommended" \| "negative"` |
| `timestamp` | `string` |
| `brandPosition` | `string` |
| `category` | `string` |
| `intent` | `string` |
| `region` | `string` |
| `runDate` | `string` |
| `sentiment` | `"Positive" \| "Neutral" \| "Negative"` |
| `aiAnswer` | `string` |
| `reasoning` | `ReasoningFactor[]` |
| `sources` | `AnswerSource[]` |
| `inaccuracies` | `Inaccuracy[]` |

**Nested shapes**

| Type | Fields |
|------|--------|
| `ReasoningFactor` | `factor: string`, `status: "positive" \| "negative" \| "neutral"` |
| `AnswerSource` | `title`, `url`, `authority`, `domain` — all `string` |
| `Inaccuracy` | `claim: string`, `severity: "High" \| "Medium" \| "Low"` |

**Stays in code**: `getOutcomeIcon()` in `AnswerList`, and `highlightText()` in `AnswerDetail`
(its brand list moves to `shared/competitors.json`).

`filter-options.json` holds `{ outcomes: Option[] }`.

---

## Competitor Intelligence — `src/data/competitor-intelligence/`

| File | Shape | Presentation staying in code |
|------|-------|------------------------------|
| `kpis.json` | `{ title, value, delta, trend, sub? }` | trend arrow + color |
| `sov-by-category.json` | `{ category, brand, kong, postman, apigee, tyk, mulesoft }` | recharts `dataKey`s |
| `sov-trend.json` | `{ date, brand, kong, postman, apigee }` | line colors |
| `comparison.json` | `{ name, sov, pos, sentiment, citations, lead, isBrand }` | row emphasis for `isBrand` |
| `strengths.json` | `{ id, comp, logo, text, stat }` | `color` keyed by `id` |
| `root-causes.json` | `{ id, text }` | `icon` keyed by `id` |

---

## Content Recommendations — `src/data/content-recommendations/`

### ContentRecommendation — `recommendations.json`

| Field | Type |
|-------|------|
| `priority` | `"Critical" \| "High" \| "Medium" \| "Low"` |
| `title` | `string` |
| `contentType` | `string` |
| `rationale` | `string` |
| `impact` | `string` |
| `tags` | `string[]` |
| `status` | `"Not Started" \| "In Progress" \| "In Review"` |
| `assignee` | `{ name: string }` *optional* |

**Stays in code**: `priorityColors` (K4).

| File | Shape | Notes |
|------|-------|-------|
| `stats.json` | `{ id, title, value, description, trend? }` | `icon` rejoins by `id` |
| `content-types.json` | `string[]` | Drives the filter tabs |
| `gap-map.json` | `{ categories: string[], contentTypes: string[], coverage: Record<string, Record<string, Status>> }` | Three related literals merged into one file |
| `missing-documentation.json` | `{ title, detail }` | Was declared inside the component (D3) |
| `customer-evidence.json` | `{ title, detail }` | Was declared inside the component |
| `review-platforms.json` | `{ platform, reviews, target }` | Was declared inside the component |

---

## Experiments & Impact — `src/data/experiments-impact/`

### Experiment — `experiments.json`

| Field | Type |
|-------|------|
| `id` | `string` |
| `name` | `string` |
| `hypothesis` | `string` |
| `status` | `string` |
| `started` | `string` |
| `shareChange` | `string` |
| `confidence` | `string` |

| File | Shape | Presentation staying in code |
|------|-------|------------------------------|
| `summary-kpis.json` | `{ id, label, value, change }` | `icon` keyed by `id` |
| `timeline.json` | `{ id, title, date, detail }` | `icon` **and** `color` class keyed by `id` |
| `impact.json` | `{ date, before, after }` | chart config |
| `recommended-next.json` | `{ title, rationale, effort }` | |
| `secondary-metrics.json` | `{ label, value, change }` | |
| `signal-stages.json` | `{ stage, value }` | |

---

## Reports & Billing — `src/data/reports-billing/`

| File | Entity | Fields |
|------|--------|--------|
| `plan-tiers.json` | PlanTier | `name`, `price`, `period`, `features: string[]`, `current: boolean` |
| `usage-limits.json` | UsageLimit | `label`, `used`, `limit` |
| `team-members.json` | TeamMember | `name`, `email`, `role`, `access`, `lastActive` |
| `invoices.json` | Invoice | `id`, `date`, `amount`, `period`, `status` |
| `report-types.json` | ReportType | `id`, `name`, `description`, `cadence` |
| `recent-exports.json` | RecentExport | `name`, `date`, `format`, `size` |

**Stays in code**: plan-tier highlight styling, invoice status badge colors, report-type icons
(keyed by `id`).

---

## Workspace Setup — `src/data/workspace-setup/`

| File | Shape | Notes |
|------|-------|-------|
| `suggested-categories.json` | `string[]` | |
| `regions.json` | `{ id, label, description }` | |
| `frequencies.json` | `{ id, label, description, recommended? }` | |
| `default-competitors.json` | `string[]` | **Seeds `useState`, not render** (D3) — add/remove must keep working |

---

## Sign In — `src/data/sign-in/`

| File | Shape |
|------|-------|
| `showcase-metrics.json` | `{ label, value, trend }` |

**Stays in code**: the avatar repeat count (K5) and decorative bar heights (K6).

---

## Cross-cutting rules

1. **Field names are preserved verbatim.** Renaming a field would require touching recharts
   `dataKey` strings and risks silent chart breakage (FR-010, risk register).
2. **Pre-formatted display strings stay strings.** `"42.8%"` and `"$249"` are not converted to
   numbers — formatting them at render time would be a behavior change beyond this refactor.
3. **Every literal union is declared in `types.ts`, never inferred from JSON.** The barrel
   assertion is the single narrowing point (D1).
4. **Every added `id` is stable and business-meaningful**, never a positional index, so the
   icon/color lookups survive reordering.
5. **Arrays keep their existing order.** Ordering is visible on screen and is therefore behavior.
