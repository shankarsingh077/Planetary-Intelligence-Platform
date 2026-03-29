# Storage Runtime

Persistent storage wiring for enriched event ingestion.

## Components

1. Object lake writer (raw immutable JSONL partitions).
2. SQLite serving store for low-latency reads.
3. Ingestion command for enriched events.

## Store profile selection

- `STORE_PROFILE=local` uses local object lake + SQLite.
- `STORE_PROFILE=cloud` uses cloud object-store and warehouse adapters.
- `OBJECT_STORE_BUCKET` and `WAREHOUSE_DSN` are required for cloud profile.
- Cloud mode writes mirror files locally for integration testing and dry runs.

## Run

```bash
export PYTHONPATH="services/data-plane/storage-runtime/src"
./.venv/bin/python -m storage_runtime.ingest_events --input ./runtime-output/events.enriched.jsonl --lake ./runtime-output/lake --sqlite ./runtime-output/serving.db
```
