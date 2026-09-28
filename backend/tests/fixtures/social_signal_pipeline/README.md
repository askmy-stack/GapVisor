# social-signal-pipeline fixture

`enriched_sample.jsonl` is **real output** of
[askmy-stack/social-signal-pipeline](https://github.com/askmy-stack/social-signal-pipeline)
at commit `bf657d4ff9b252157d83fd6e16f23ef548122316`, not a hand-written
imitation of its schema. It was produced from `input_sample_tweets.jsonl`
(four clearly-labelled sample tweets, all `is_sample: true`) with the
pipeline's deterministic local provider:

```bash
cd social-signal-pipeline
FIXTURE_TWEETS_PATH=/path/to/input_sample_tweets.jsonl \
AI_PROVIDER=local \
OUTPUT_JSONL_PATH=/path/to/enriched_sample.jsonl \
OUTPUT_JSON_PATH=/tmp/enriched.json \
OUTPUT_CSV_PATH=/tmp/enriched.csv \
python -c "from twitter_etl import run_twitter_etl; run_twitter_etl()"
```

Only `tweet.ingested_at` differs between runs. What the adapter does with
each record:

| Record | Pipeline classification | Adapter result |
|---|---|---|
| `gv-sample-1` | Kong mentioned, `intent: news` | skipped — `no_supported_signal_type` |
| `gv-sample-2` | Kong mentioned, `intent: product_update` | `product_launch_discussion` for Kong |
| `gv-sample-3` | Northstar, `negative`, `intent: warning`, `signal: risk` | `community_complaints` for the brand |
| `gv-sample-4` | nothing tracked, `intent: news` | skipped — `no_supported_signal_type` |

(The `no_tracked_entity` path is covered in `tests/test_signals.py` by
editing a copy of `gv-sample-2`.)
