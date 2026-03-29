# Worldmonitor Comparative Gap Analysis

Date: 2026-03-29
Scope: Compare Planetary Intelligence Platform (PIP) current implementation against the worldmonitor project to identify capability and readiness gaps.

## 1) Snapshot Comparison

### worldmonitor observed maturity
- Large production TypeScript codebase with broad feature depth.
- Multi-surface product: web variants and desktop runtime.
- Significant API + deployment + security hardening surface.
- Extensive testing and CI workflows.

### PIP current maturity
- Early-stage architecture-first foundation.
- Strong schema and data-contract governance baseline for Data Plane bootstrap.
- Functional local ingestion + transform + enrichment pipeline.
- Minimal UI, intelligence services, and production runtime infrastructure.

## 2) Quantitative Signals (repo-level)

worldmonitor:
- Source files (src/server/api/scripts/tests/e2e): 1137
- Proto files: 221
- CI workflows: 10
- Test files: 117
- Markdown docs: 158

PIP:
- Python source files (services/tests/tools): 21
- Schema/contract files: 12
- CI workflows: 1
- Test files: 1
- Markdown docs: 14

Interpretation:
- PIP is currently a foundational MVP scaffold, not yet a production intelligence platform.

## 3) Capability Gap Matrix

### A. Product and UX
Gap severity: Critical

Missing in PIP:
- No Experience Plane implementation (no web app, map framework, panel system, command workflows).
- No triage workspace UI.
- No collaboration, assignment, or analyst audit trail UX.

worldmonitor benchmark areas:
- Dual map engines and panelized operational dashboard model.
- Multi-variant productization and desktop distribution.

Priority actions:
1. Build single polished workflow UI first: global alert triage.
2. Implement explainable alert cards with evidence and uncertainty.
3. Add command-first interactions and entity/region jump workflows.

### B. Intelligence Plane Depth
Gap severity: Critical

Missing in PIP:
- No entity resolution service implementation.
- No event fusion/correlation engine.
- No confidence calibration service beyond static heuristic defaults.
- No causality graph service.
- No scenario simulator/forecasting engine in runtime.

Current PIP state:
- Canonical schemas and basic transform/enrichment scripts exist.

Priority actions:
1. Implement entity resolver v1 with alias and confidence scoring.
2. Implement event fusion v1 (time, geo, entity, semantic similarity).
3. Implement confidence engine v1 and explainability payload generator.

### C. Data Plane and Runtime Infrastructure
Gap severity: High

Missing in PIP:
- No live stream backbone deployment (Kafka/Redpanda provisioning not yet integrated end-to-end).
- No production-grade scheduler/orchestrator.
- No object-lake/warehouse/search/graph storage integrations.
- No ingestion lag dashboards or data quality dashboarding.

Current PIP state:
- Connector SDK with reliability pattern.
- 4 concrete connectors with local run path.
- Kafka producer interface path implemented but deployment wiring pending.

Priority actions:
1. Provision managed stream infra and topic governance.
2. Add persistent sinks (raw lake + queryable store).
3. Add freshness/heartbeat/lag telemetry pipeline and dashboards.

### D. Control Plane, Security, and Tenancy
Gap severity: High

Missing in PIP:
- RBAC policy exists as skeleton only; no enforcement runtime integration.
- No end-to-end tenant isolation tests.
- No secret management integration (KMS/Vault) yet.
- No key rotation, mTLS service auth, or supply-chain attestations.

worldmonitor benchmark areas:
- Clearly documented security boundaries and hardened runtime pathways.
- Policy and testing around desktop/edge trust boundaries.

Priority actions:
1. Integrate policy engine into every API mutation path.
2. Implement tenant-scoped authN/authZ middleware with audit events.
3. Add secrets management, rotation workflow, and threat-model tests.

### E. Testing and Reliability Discipline
Gap severity: High

Missing in PIP:
- Minimal test suite.
- No E2E scenario tests.
- No load/perf testing.
- No chaos drills or degradation-mode tests.

Current PIP state:
- Contract tests for canonical event transformation.
- Schema compatibility guard integrated in CI.

Priority actions:
1. Expand tests to connector failure modes, DLQ behavior, and freshness SLA assertions.
2. Add API contract and integration tests for brief generation endpoint.
3. Add SLOs and incident-oriented game-day drills.

### F. CI/CD and Release Engineering
Gap severity: Medium-High

Missing in PIP:
- Single CI workflow only.
- No dedicated lint/type/test matrix, security scans, packaging pipelines.
- No staged deployment topology or release automation.

worldmonitor benchmark areas:
- Multiple workflows for linting, type checking, proto checks, build and packaging.

Priority actions:
1. Split CI into lint, tests, schema/proto, security scan jobs.
2. Add environment promotion workflow (dev -> staging -> prod).
3. Add artifact signing and SBOM generation.

### G. API and Contract Ecosystem
Gap severity: Medium

Missing in PIP:
- API surface is currently minimal and not backed by full server implementation.
- No generated client/server stubs workflow.

Current PIP state:
- OpenAPI contract for brief endpoint.
- Event envelope and schema governance baseline.

Priority actions:
1. Implement intelligence API service backing current OpenAPI contracts.
2. Add SDK/client generation and compatibility checks per release.

## 4) Strategic Conclusion

PIP is not behind in architecture clarity; it is behind in execution breadth and operational hardening.

Strongest current advantages:
- Four-plane architecture separation is explicit.
- Canonical event contract strategy is already disciplined.
- Compatibility and contract checks are in place very early.

Largest deficits versus worldmonitor:
- Experience Plane and user-facing product workflows.
- Intelligence Plane runtime services (fusion, confidence, causality, forecasting).
- Production operations (multi-workflow CI, observability, security hardening, deployment topology).

## 5) Practical 8-Week Catch-Up Plan

Week 1-2:
1. Build triage web shell (alert inbox + explainable card + assignment metadata).
2. Implement auth middleware + tenant boundary checks.
3. Add integration tests for connector reliability and DLQ behavior.

Week 3-4:
1. Implement entity resolver v1 service and storage integration.
2. Implement event fusion + confidence scoring service.
3. Back the /v1/briefs/now contract with working server logic.

Week 5-6:
1. Provision stream + storage foundation in cloud (raw lake + searchable serving store).
2. Add telemetry pipelines and operational dashboards.
3. Add feature flags and degradation modes.

Week 7-8:
1. Add probabilistic forecast stub and first scenario type.
2. Add analyst feedback loop for corrections and confidence tuning.
3. Expand CI into security, load-test smoke, and release validation tracks.
