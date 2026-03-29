# Phase 0 Backlog (Weeks 1-6)

## Epic 1: Canonical Schema and Taxonomy

1. Finalize object schemas for Event, Entity, Claim, Evidence, Alert.
2. Add schema examples for each domain (geopolitics, markets, climate, cyber).
3. Add compatibility CI checks for all schema changes.

Acceptance:
- All schema artifacts versioned and reviewed.
- Compatibility test pipeline green.

## Epic 2: Connector Framework and First Sources

1. Finalize connector SDK interfaces for fetch/publish/DLQ hooks.
2. Implement source health reporting and quality score.
3. Build first four connectors (news API, official regulation feed, market data API, mobility feed).

Acceptance:
- Each connector reports heartbeat, freshness lag, retry count, circuit status.
- DLQ behavior verified with simulated failures.

## Epic 3: Stream and Storage Foundation

1. Provision stream topics and retention policy.
2. Define canonical ingestion topic naming convention.
3. Integrate raw object storage sink for immutable payload archive.

Acceptance:
- Event payloads flowing from at least four connectors to stream and archive.
- Lag and throughput dashboards available.

## Epic 4: Global Alert Triage MVP Shell

1. Implement API endpoint contract for 30-second brief responses.
2. Add alert envelope contract for downstream consumers.
3. Define explainability minimum fields in response shape.

Acceptance:
- Sample end-to-end response includes changed/why/next/action with evidence refs.
- Contract tests for request/response payloads pass.

## Epic 5: Security and Multi-Tenant Baseline

1. Implement tenant boundary policy definitions.
2. Define role-to-permission matrix.
3. Add audit event schema for policy decisions.

Acceptance:
- Policy checks deny cross-tenant access.
- Sensitive actions can be flagged for human review.
