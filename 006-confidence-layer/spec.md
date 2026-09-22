# Feature Spec: Confidence Layer

**Phase**: `006-confidence-layer`  
**Depends on**: `002` M4 (`sample_size` on metric_daily)  
**Status**: Core library shipped — `services/confidence.py` + `/api/v1/confidence/*`

## Product intent

Unclaimed whitespace: every KPI shows whether a move is statistically meaningful.

## Shipped

- `mean_with_interval`, `is_meaningful_change`
- Experiments enrich with confidence payload
- Contract tests for small-sample behavior

## Remaining

- FE bands on charts
- Wire dashboard KPIs to `/confidence/change`
- Document methodology page for customers
