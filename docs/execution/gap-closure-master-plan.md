# Gap Closure Master Plan

Date: 2026-03-29
Objective: Close the execution, product, operations, and reliability gaps identified in comparative analysis and deliver a production-grade intelligence platform.

## North Star Outcomes

1. Time-to-brief (p95) under 30 seconds.
2. Explainability coverage: 100% of generated alerts include evidence, confidence, uncertainty, and invalidation conditions.
3. Ingestion freshness SLOs enforced per source class.
4. Tenant isolation and policy enforcement proven by automated tests.
5. Global alert triage workflow fully operational end-to-end.

## Program Structure

Run seven tracks in parallel with explicit dependency order.

Track A: Experience Plane (Global Alert Triage first)
Track B: Intelligence Plane services (entity, fusion, confidence, causality)
Track C: Data Plane productionization (stream + storage + connectors)
Track D: Control Plane hardening (auth, RBAC, tenant isolation, governance)
Track E: Reliability and SRE (SLOs, telemetry, game days)
Track F: CI/CD and supply chain (quality gates, release engineering)
Track G: Data source scale-up (high-volume, multi-domain connector portfolio)

## Critical Dependencies

1. Canonical schemas and contracts are already in place and remain the foundation.
2. Track A cannot be production-ready without Track B explainability outputs.
3. Track B quality depends on Track C data quality and provenance.
4. Track C and D must converge before enterprise rollout.
5. Track F and E are mandatory for scaling beyond MVP.

## Phase Plan (0-32 weeks)

### Phase 1 (Weeks 1-4): Deliver one complete user workflow

Goal:
- Ship Global Alert Triage v1 with real data and explainability.

Build:
1. Experience shell v1:
   - Alert inbox
   - Severity/confidence grouping
   - Explainable alert card (snapshot, drivers, contradictions, forecast, actions)
2. Intelligence APIs backing UI:
   - /v1/briefs/now implementation
   - /v1/alerts query endpoint
3. Data integration:
   - Current 4 connectors to stream + transform + enrichment pipeline
4. Control integration:
   - Tenant-scoped auth middleware + policy checks on all mutating routes

Acceptance:
- Analyst can triage alerts, assign status, and see complete explainability fields.
- All API responses include source attribution and confidence/uncertainty.
- Cross-tenant access attempts fail in automated tests.

### Phase 2 (Weeks 5-10): Intelligence Plane core runtime

Goal:
- Replace heuristic-only pipeline with real intelligence services.

Build:
1. Entity Resolver v1:
   - normalization
   - alias graph
   - multilingual support
   - organization hierarchy links
2. Event Fusion v1:
   - temporal, geo, entity, semantic and historical similarity matching
3. Confidence Engine v1:
   - source reliability, corroboration, contradiction strength, freshness decay
4. Explainability Composer:
   - why generated
   - contributing sources
   - weak assumptions
   - invalidation conditions

Acceptance:
- Entity resolution precision and recall baselines defined and tracked.
- Fusion and confidence outputs available through intelligence APIs.
- Explainability completeness > 95% in staging.

### Phase 3 (Weeks 11-16): Data Plane productionization

Goal:
- Production-ready ingestion and storage fabric.

Build:
1. Stream backbone provisioning:
   - Kafka/Redpanda managed cluster
   - topic governance (retention, partitions, compaction strategy)
2. Storage wiring:
   - object lake (immutable raw)
   - serving/search store
   - metadata OLTP
   - graph store for causality/entity traversal
3. Connector operations:
   - connector deployment runtime
   - DLQ replay service
   - source-level telemetry and health pages

Acceptance:
- End-to-end production pipeline for at least 12 high-value sources.
- Stream lag, source freshness, and DLQ metrics available in dashboards.

### Phase 4 (Weeks 17-22): Security, tenancy, governance, and resilience

Goal:
- Enterprise-grade trust and reliability baseline.

Build:
1. Policy-as-code enforcement in service layer.
2. Tenant boundary tests, audit trails, and compliance logs.
3. Secrets lifecycle with rotation automation.
4. SLO framework and incident/degradation playbooks.
5. Chaos tests:
   - source outage
   - stream partition
   - cache failure
   - model endpoint degradation

Acceptance:
- Security and tenancy acceptance tests pass in CI.
- SLO dashboards and alerts live.
- Game-day reports produced and signed off.

### Phase 5 (Weeks 23-32): Forecasting, simulation, and scale-up

Goal:
- Move from monitoring to actionable foresight.

Build:
1. Scenario simulator v1 (policy shock, escalation ladder, commodity bottleneck, cyber contagion).
2. Probabilistic forecast endpoints (short/medium/long horizon).
3. Backtesting lab with lead-time and miss-cost metrics.
4. Persona overlays (risk, supply chain, investment, security, policy).

Acceptance:
- Forecast calibration tracked and improving.
- Users can run scenario queries from triage workflow.
- Action recommendations are policy-constrained and explainable.

## Work Breakdown by Gap

### Gap 1: Execution breadth
Action:
- Expand from foundation to full runtime services by phase gates above.
KPI:
- Active production subsystems in all four planes.

### Gap 2: Experience Plane missing
Action:
- Build triage-first UI before any broad dashboard expansion.
KPI:
- Mean triage completion time and analyst trust score.

### Gap 3: Intelligence Plane missing
Action:
- Implement entity, fusion, confidence, causality as separate deployable services.
KPI:
- Explainability completeness, confidence calibration error, fusion precision.

### Gap 4: Data plane local-only
Action:
- Move connectors and transforms into managed stream/storage runtime.
KPI:
- Freshness SLO attainment and DLQ drain latency.

### Gap 5: Control plane skeletal
Action:
- Enforce policy checks everywhere and add tenant isolation integration tests.
KPI:
- 0 critical authz findings in security test suite.

### Gap 6: Reliability discipline early
Action:
- Add SLOs, error budgets, degradation modes, and game days.
KPI:
- MTTR reduction and error budget burn rate control.

### Gap 7: CI/release engineering insufficient
Action:
- Multi-track CI with lint/type/integration/security/perf/release gates.
KPI:
- Change failure rate and lead time for changes.

## Immediate 2-Week Delivery (must ship now)

1. Implement Global Alert Triage web shell (minimal but production quality).
2. Implement intelligence API service to power triage view.
3. Enforce tenant-aware auth + RBAC in API layer.
4. Add 8 additional priority data sources (total 12) with SLAs.
5. Add CI workflows: lint, type, integration, security scan.

## Definition of Done (Program)

1. One complete end-to-end workflow is production live.
2. Intelligence outputs are explainable and auditable.
3. Data quality and freshness are observable and enforced.
4. Multi-tenant security controls are verified in automation.
5. Release process has quality and supply-chain gates.
