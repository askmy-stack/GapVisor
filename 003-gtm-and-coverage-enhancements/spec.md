# Feature Spec: GTM and Coverage Enhancements

**Phase**: `003-gtm-and-coverage-enhancements`  
**Depends on**: `002` M4 (real scan pipeline + metric_daily)  
**Status**: Spec scaffold — implement after M4 is live

## Scope

1. **Free Visibility Grader** — public `POST /api/v1/public/grader` (stub shipped with mock provider)
2. **Google AI Overviews / AI Mode** as tracked catalog surface
3. **Crawl-log / bot analytics** (GPTBot, ClaudeBot, PerplexityBot) — tie into S3 raw capture design
4. Optional: publish proprietary visibility index from aggregate `metric_daily`

## Success criteria

- Grader converts anonymous runs → signup (instrument events)
- New surfaces appear with honest `measurement_method`
- Crawl drop vs content drop are distinguishable in UI

## Out of scope

- Agency multi-brand (v2)
- Racing Profound’s 11-engine breadth before retention
