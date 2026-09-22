# Feature Spec: Frontend Design Fixes

**Phase**: `004-frontend-design-fixes`  
**Depends on**: none (parallel with 002)  
**Status**: Partially started (honesty pass, Copilot→AI API Key, GDPR softening)

## Remaining work

- ESLint/build polish across all screens at 375–1600px
- Token consistency (no hard-coded hex in feature code)
- Align setup-wizard volumes with billing plan tier copy
- Loading skeletons + per-panel error boundaries on live data
- Chart empty states for `customer_key` / unavailable models
- OpenAPI-generated client once `/openapi.json` is stable

## Done in repo

- Copilot removed from hero + fixtures
- Compliance badges softened to US-hosted / roadmap language
- AuthProvider + live/demo dual mode
- Dashboard KPI live hook with sample_size
- Workspace setup controlled form + API create
