# MarketPulse fixture

`anomalies_page.json` and `news_latest_page.json` are **real responses** from
[askmy-stack/Market-Pulse-MCP](https://github.com/askmy-stack/Market-Pulse-MCP) at commit `3792ac6`:

```bash
GET /anomalies?limit=50
GET /news/latest?limit=50
```

Both were sent with `X-API-Key` against its own FastAPI app, run locally with `API_KEY` set and a
throwaway Postgres database.

The rows were produced by MarketPulse's own pipeline code, with no Kafka:

- **Ticks:** 40 synthetic minute ticks each for the symbols `NET` and `DDOG`, including one deliberate
  price and volume shock on `NET`.
- **Features and anomalies:** each tick went through `FeatureStore.process_tick` and
  `AnomalyDetector.detect`, and was saved with `Repository.save_*`.
- **News:** the news came from `MockNewsProvider`, with its own `clean_headline` and
  `analyze_sentiment` applied.

This is sample market data (`source: mock_*`), not real prices or real news. The tests map these
symbols to sample tracked companies.

Found while recording: at this commit `GET /anomalies/symbol/{s}` and `GET /news/company/{s}` return
HTTP 500 (`DetachedInstanceError`, because rows are serialized after the session closes). The adapter
therefore uses only the two paginated list endpoints above, which work.

| Row | Adapter result (tests) |
|---|---|
| NET `critical` anomaly (`price_zscore+volume_spike`) | `market_anomaly` |
| NET and DDOG `low` anomalies | skipped: `below_min_severity` |
| company news, abs(sentiment) = 1.0 (NET/DDOG analyst upgrade, DDOG earnings beat) | `major_company_news` |
| company news, sentiment 0.0 (CEO strategy) | skipped: `below_major_threshold` |
| market news (no symbol) | skipped: `not_company_news` |
