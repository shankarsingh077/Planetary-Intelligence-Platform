# Connectors Runtime

Concrete source connectors built on the Connector SDK.

## Included Connectors

1. News API connector
2. Regulation API connector
3. Market API connector
4. Mobility API connector

## Runtime Features

- Stream publish adapter
- Dead-letter queue adapter
- Unified connector runner
- Per-connector freshness SLA and retry settings

## Stream Backend Configuration

- `STREAM_PROFILE=local` writes records to `runtime-output/stream.jsonl`.
- `STREAM_PROFILE=kafka` loads `deploy/profiles/streams/kafka.json`.
- `STREAM_PROFILE=redpanda` loads `deploy/profiles/streams/redpanda.json`.
- `KAFKA_BOOTSTRAP_SERVERS` and `REDPANDA_BOOTSTRAP_SERVERS` set broker endpoints.
- `STREAM_DRY_RUN=1` bypasses broker client dependency and reports healthy dry-run checks.

## Run

1. Install local packages

```bash
cd services/data-plane/connector-sdk
python -m pip install -e .
cd ../connectors-runtime
python -m pip install -e .
```

2. Run one ingestion cycle

```bash
python -m connectors_runtime.runner
```

If external endpoints are not configured, connectors emit deterministic sample records.
