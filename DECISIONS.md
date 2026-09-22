# VisibilityOS product decisions

## FR-012 — Growth tier scan commitment (provisional)

**Status:** provisional engineering default until product owner confirms.

**Default:** `SCAN_COMMITMENT_MODE=rotating_weekly`

| Mode | Meaning |
|---|---|
| `rotating_weekly` | A prompt scheduled "daily" hits a rotating subset of models each day so every model refreshes within the week (~60% less volume than hard daily). |
| `hard_daily` | Every enabled prompt × every enabled model every day. |

Hard daily at Growth face value (3,000 prompts × 5 models × 30) is ~450k completions/month before analysis and does not close against a $6k/mo price at frontier rates. The scheduler and quota code must honor whichever mode is configured; switching modes must not require a schema rewrite.

**Confirm before Milestone 3** locks beat/enqueue semantics.

## Pricing lane (open)

Two stories exist in the materials:

- Billing UI: Starter $2,000 / Growth $6,000 / Enterprise $15,000
- Case study: $99–$299 mid-market self-serve

Engineering continues against **prompt quotas** as the unit. Stripe products (M7) wait on this call.

## Resolved 2026-09-15 (from spec.md)

- Copilot brand dropped → generic AI API Key tracked source
- Regions = signaled locale for v1
- Recommendations = platform-drafted, customer-editable/authorable
- Deployment = US-only for v1
