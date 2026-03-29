# Connector SDK

Reliability-first ingestion framework for source connectors.

## Reliability Contract

Each connector instance reports:

1. Heartbeat status
2. Freshness SLA compliance
3. Retry/backoff metrics
4. Circuit breaker state
5. Dead letter queue events
6. Quality score

## Run Example

```bash
python -m pip install -e .
python -m connector_sdk.example_runner
```
