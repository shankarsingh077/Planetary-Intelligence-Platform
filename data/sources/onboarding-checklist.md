# Source Onboarding Checklist

Use this checklist for every new data source.

## 1) Legal and policy

1. Terms of use reviewed and recorded.
2. Collection method approved (API/RSS/websocket/bulk/scrape fallback).
3. Attribution and redistribution constraints documented.

## 2) Connector contract

1. Connector class selected.
2. Heartbeat endpoint/logic implemented.
3. Freshness SLA defined.
4. Retry/backoff policy set.
5. Circuit breaker threshold set.
6. DLQ reason codes defined.
7. Quality score dimensions configured.

## 3) Data contract

1. Raw payload schema versioned.
2. Canonical mapping spec documented.
3. Provenance fields preserved.
4. Confidence and uncertainty mapping policy documented.

## 4) Operational readiness

1. Source-level dashboard created.
2. Alerts for freshness and error spikes configured.
3. Replay and backfill procedure documented.
4. On-call owner assigned.

## 5) Security and tenancy

1. Secret handling method approved.
2. Tenant visibility policy applied.
3. Access controls tested.

## 6) Validation

1. Contract tests added.
2. Integration smoke test added.
3. Historical replay validation completed.
