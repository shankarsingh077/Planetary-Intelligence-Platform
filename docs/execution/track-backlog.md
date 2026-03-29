# Execution Backlog (One-by-One)

This backlog is ordered by dependency and delivery impact.

## Epic A: Global Alert Triage Workflow (P0)

1. Build alert inbox API and model.
2. Build triage UI shell with list/detail/filters.
3. Add explainable cards with evidence + confidence + uncertainty + invalidation.
4. Add assignment state and analyst notes with audit trail.

Exit criteria:
- Triage flow is end-to-end usable with real data.

## Epic B: Intelligence Services (P0)

1. Entity resolver service with alias and confidence model.
2. Event fusion service for multi-signal clustering.
3. Confidence service with calibration hooks.
4. Causality edge generator (triggered_by, correlated_with, precedes, amplifies, mitigates).

Exit criteria:
- Alerts and briefs are generated from intelligence services, not static heuristics.

## Epic C: Data Plane Production Runtime (P0)

1. Provision stream backbone and topic policy.
2. Deploy connector runtime workers.
3. Persist raw immutable data and serving records.
4. Implement DLQ replay tool and health dashboards.

Exit criteria:
- Managed runtime handles at least 12 production sources with freshness SLOs.

## Epic D: Control Plane Enforcement (P0)

1. Integrate authN/authZ middleware in APIs.
2. Tenant isolation checks in query path and write path.
3. Policy decision audit events.
4. Human-review gate for sensitive recommendation publication.

Exit criteria:
- Cross-tenant and unauthorized actions are blocked and audited.

## Epic E: Reliability and SRE (P1)

1. Publish SLO definitions and alert thresholds.
2. Build dashboards for ingestion freshness, lag, model latency, API latency.
3. Add degradation modes (read-only, reduced model mode, last-known-good view).
4. Run monthly game day scenarios.

Exit criteria:
- Operational incidents are measurable and recoverable with playbooks.

## Epic F: CI/CD and Supply Chain (P1)

1. Add lint and static analysis workflow.
2. Add integration test workflow for connector + transform + API flow.
3. Add security scan workflow (dependency and secret scans).
4. Add SBOM generation and artifact signing in release workflow.

Exit criteria:
- Every merge and release passes quality and security gates.

## Epic G: Data Source Scale-Up (P0/P1)

1. Implement source catalog and onboarding checklist.
2. Add connectors in waves by domain:
   - Wave 1: Geopolitics, Markets, Mobility, Regulation
   - Wave 2: Climate, Cyber, Maritime, Aviation
   - Wave 3: Energy, Supply Chain, Public Health, Commodities
3. Add source trust scoring and narrative drift tracking.
4. Add legal controls for scraping fallback connectors.

Exit criteria:
- 50+ active sources with quality metadata and provenance.
