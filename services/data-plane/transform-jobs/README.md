# Transform Jobs

Transform Data Plane raw signal records into canonical intelligence objects.

## Current Job

- `raw_to_event`: maps connector output records into canonical `Event` schema envelopes.
- `enrich_event`: applies baseline impact and uncertainty enrichment on canonical events.

## Run

```bash
python -m transform_jobs.raw_to_event --input ./services/data-plane/connectors-runtime/runtime-output/stream.jsonl --output ./runtime-output/events.jsonl
python -m transform_jobs.enrich_event --input ./runtime-output/events.jsonl --output ./runtime-output/events.enriched.jsonl
```
