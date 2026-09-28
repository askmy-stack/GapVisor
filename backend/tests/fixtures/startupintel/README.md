# StartupIntel fixture

`startup_list_page1.json` and `startup_list_page2.json` are **real responses** from
[askmy-stack/startupintel](https://github.com/askmy-stack/startupintel) at commit `13b0e40`:

```bash
GET /startup?page=1&page_size=3
GET /startup?page=2&page_size=3
```

They were recorded from its own FastAPI app, run locally against a throwaway Postgres
database after `alembic upgrade head`.

The four companies were created through its own `POST /startup` and are **sample data**:

- every name starts with "Sample";
- every domain is on the reserved `.example` TLD;
- no real company has funding figures attributed to it.

What the adapter does with each company:

| Company | Domain | Funding date | Adapter result (tests) |
|---|---|---|---|
| Sample Gateway Co | `sample-gateway.example` | 2026-09-12 | `funding_event`, tracked competitor |
| Sample Testing Labs | `sample-testing.example` | 2025-11-03 | `funding_event`, tracked as the brand |
| Sample Untracked Inc | `sample-untracked.example` | 2026-09-01 | skipped: `no_tracked_entity` |
| Sample Bootstrapped Ltd | `sample-bootstrapped.example` | none | skipped: `no_funding_date` (when tracked) |
