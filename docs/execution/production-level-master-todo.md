# Production Level Master TODO

Date: 2026-03-29
Owner: Platform program
Objective: Move this repository from strong foundation stage to production-grade planetary intelligence platform at worldmonitor-class breadth and reliability.

## 0. Program Definition

### 0.1 North star outcomes

1. Answer in under 30 seconds:
   - What changed globally now?
   - Why it matters?
   - What likely happens next?
   - What this user should do now?
2. Evidence-first trust:
   - Every alert includes evidence, confidence, uncertainty, invalidation conditions.
3. Enterprise-grade guarantees:
   - Multi-tenant isolation proven by tests.
   - SLOs monitored with incident response.
   - Secure software supply chain.

### 0.2 Release gates

1. Gate A: Functional
   - End-to-end triage workflow complete.
2. Gate B: Trust
   - Explainability and confidence calibration acceptance achieved.
3. Gate C: Reliability
   - SLO dashboards, alerting, and game days operational.
4. Gate D: Security
   - Identity, policy, secrets lifecycle, and audit controls pass review.
5. Gate E: Scale
   - Production infra and workload tests pass.

### 0.3 Workstream map

1. Data Plane
2. Intelligence Plane
3. Experience Plane
4. Control Plane
5. Reliability and SRE
6. CI/CD and Supply Chain
7. Product and GTM readiness

---

## 1. Program Setup and Governance TODO

### 1.1 Program operating system

- [ ] Create program board with epics and sprint cadence.
- [ ] Define RACI across platform, ingestion, intelligence, frontend, security, SRE.
- [ ] Define architecture review process and weekly design reviews.
- [ ] Create RFC template and mandatory ADR workflow.
- [ ] Define severity model for incidents and bug triage.

### 1.2 Quality governance

- [ ] Define acceptance criteria template for every epic.
- [ ] Define Definition of Ready and Definition of Done across teams.
- [ ] Add change control for schema, taxonomy, and confidence policy.
- [ ] Add rollback and migration runbook template.

### 1.3 Delivery cadence

- [ ] Set sprint length and demo schedule.
- [ ] Add release train branches and environment promotion flow.
- [ ] Define dependencies and blocker escalation process.

Deliverables:
- Program charter
- RACI matrix
- Release governance doc

---

## 2. Infrastructure and Environment Provisioning TODO

### 2.1 Environment topology

- [ ] Create dev, staging, prod projects.
- [ ] Define network topology and service boundaries.
- [ ] Define VPC, private subnetting, egress control, NAT strategy.
- [ ] Define DNS plan and certificate strategy.

### 2.2 Stream infrastructure

- [ ] Provision managed Kafka or Redpanda cluster in staging.
- [ ] Provision production cluster with HA settings.
- [ ] Configure topics, partitions, retention, compaction policies.
- [ ] Configure ACLs and service principals.
- [ ] Implement stream lag monitoring and broker health dashboards.

### 2.3 Storage infrastructure

- [ ] Provision object storage buckets for raw immutable lake.
- [ ] Provision managed SQL for serving metadata and workflow state.
- [ ] Provision analytics warehouse.
- [ ] Provision search index.
- [ ] Provision graph backend for causality and entity traversal.
- [ ] Configure backups, retention, and disaster recovery.

### 2.4 Runtime infrastructure

- [ ] Provision Kubernetes cluster with autoscaling.
- [ ] Create namespaces and environment isolation.
- [ ] Deploy ingress controller and service mesh baseline.
- [ ] Configure workload identity and secret access bindings.

Deliverables:
- Infra as code modules
- Environment inventory
- Provisioning runbook

---

## 3. Data Plane TODO

### 3.1 Source connector expansion

- [ ] Implement Wave 1 connectors to reach 12 production connectors.
- [ ] Implement Wave 2 connectors to reach 25 connectors.
- [ ] Implement Wave 3 connectors to reach 40 connectors.
- [ ] Implement Wave 4 connectors to reach 50 plus connectors.
- [ ] Add connector conformance tests for heartbeat, SLA, DLQ, quality score.

### 3.2 Connector operations

- [ ] Build connector registry service.
- [ ] Build connector deployment templates by source class.
- [ ] Build connector health API.
- [ ] Build connector incident and suppression controls.

### 3.3 DLQ and replay

- [ ] Build dead letter replay CLI.
- [ ] Build replay validation checks.
- [ ] Build replay dashboard and audit logs.
- [ ] Add replay SLO and runbook.

### 3.4 Schema and contracts

- [ ] Introduce schema registry runtime integration.
- [ ] Add Avro or Protobuf stream schemas.
- [ ] Enforce compatibility checks on producer startup.
- [ ] Add contract tests for all stream topics.

### 3.5 Orchestration runtime

- [ ] Stand up workflow orchestrator for scheduled pipelines.
- [ ] Build daily backfill jobs.
- [ ] Build late data correction jobs.
- [ ] Build source pause and resume workflows.

### 3.6 Data quality controls

- [ ] Add completeness checks per source.
- [ ] Add freshness checks per source.
- [ ] Add consistency checks across domains.
- [ ] Add anomaly checks on volume and confidence distributions.

Deliverables:
- Production connector fleet
- Topic and schema catalog
- DLQ replay service

---

## 4. Intelligence Plane TODO

### 4.1 Entity resolver v2

- [ ] Add multilingual normalization.
- [ ] Add alias graph persistence.
- [ ] Add hierarchy resolution and confidence scoring upgrades.
- [ ] Add feedback correction ingestion from analysts.

### 4.2 Fusion engine v2

- [ ] Add semantic similarity model.
- [ ] Add temporal and geo weighting controls.
- [ ] Add contradiction-aware fusion logic.
- [ ] Add cluster quality metrics.

### 4.3 Confidence engine v2

- [ ] Add calibration datasets.
- [ ] Add domain-specific calibration models.
- [ ] Add confidence drift monitors.
- [ ] Add uncertainty explanation taxonomy.

### 4.4 Causality graph service

- [ ] Build edge generation service.
- [ ] Build graph persistence and query API.
- [ ] Add causal path explainability endpoint.
- [ ] Add edge confidence and decay policy.

### 4.5 Forecasting and scenarios

- [ ] Implement short horizon probabilistic forecast.
- [ ] Implement medium horizon strategic forecast.
- [ ] Implement long horizon trend forecast.
- [ ] Add scenario simulation engine.
- [ ] Add backtesting pipeline and calibration reports.

### 4.6 HITL and governance

- [ ] Build analyst approval queue.
- [ ] Build correction feedback loop.
- [ ] Build model version registry and approval workflow.
- [ ] Build policy checks for sensitive recommendations.

Deliverables:
- Intelligence service mesh v2
- Causality graph and forecast services
- Backtesting lab outputs

---

## 5. Experience Plane TODO

### 5.1 Triage workspace v2

- [ ] Add assignment board and escalation queues.
- [ ] Add collaboration notes and threaded comments.
- [ ] Add SLA timers and triage aging indicators.
- [ ] Add analyst activity and audit timeline panel.

### 5.2 Global map and panel framework

- [ ] Build global posture map.
- [ ] Add theater view and country deep dive.
- [ ] Add entity deep-dive panel.
- [ ] Add time-travel timeline and incident replay UI.

### 5.3 Command workflow

- [ ] Add global command bar.
- [ ] Add commands for jump, brief, simulate, compare periods.
- [ ] Add quick actions for assign, escalate, and trigger playbook.

### 5.4 Persona workspaces

- [ ] Risk officer workspace.
- [ ] Investment workspace.
- [ ] Supply chain workspace.
- [ ] Security operations workspace.
- [ ] Public policy workspace.

### 5.5 Mobile and TV mode

- [ ] Add responsive workspace layouts.
- [ ] Add low-bandwidth mode.
- [ ] Add decision room display mode.

### 5.6 Frontend performance and quality

- [ ] Set bundle and render performance budgets.
- [ ] Add worker offloading for heavy transforms.
- [ ] Add visual regression suite.
- [ ] Add accessibility audits and keyboard navigation coverage.

Deliverables:
- Full analyst-facing workspace suite
- Persona-specific workspace overlays

---

## 6. Control Plane and Security TODO

### 6.1 Identity and access

- [ ] Implement OIDC SSO integration.
- [ ] Implement SCIM lifecycle integration.
- [ ] Add role and policy management UI.
- [ ] Add tenant-scoped access reviews.

### 6.2 Policy and authorization

- [ ] Integrate policy engine as centralized sidecar or service.
- [ ] Add policy decision logs and explainability.
- [ ] Add policy simulation mode for safe policy changes.
- [ ] Add policy regression tests.

### 6.3 Tenant isolation

- [ ] Enforce tenant boundaries in storage and query paths.
- [ ] Add tenant isolation fuzz tests.
- [ ] Add cross-tenant penetration test scenarios.

### 6.4 Secrets and key lifecycle

- [ ] Integrate vault or cloud secret manager.
- [ ] Add key rotation automation.
- [ ] Add secret usage inventory and access reports.

### 6.5 Service security

- [ ] Implement mTLS service identity.
- [ ] Add network policy constraints.
- [ ] Add WAF and bot controls for public surfaces.

### 6.6 Supply chain security

- [ ] Add SBOM generation in release pipeline.
- [ ] Add artifact signing.
- [ ] Add dependency policy gates.
- [ ] Add provenance attestation.

Deliverables:
- Enterprise identity stack
- Policy and audit platform
- Supply-chain hardening controls

---

## 7. Reliability and SRE TODO

### 7.1 Observability platform

- [ ] Instrument services with OpenTelemetry.
- [ ] Stand up metrics backend.
- [ ] Stand up centralized logging.
- [ ] Stand up trace backend.
- [ ] Build service and source dashboards.

### 7.2 SLO operations

- [ ] Convert SLO document to active monitor definitions.
- [ ] Set error budgets and burn alerts.
- [ ] Add on-call routing and escalation policy.

### 7.3 Incident readiness

- [ ] Build incident command playbook.
- [ ] Build status update templates.
- [ ] Add postmortem template and review cadence.

### 7.4 Degradation modes

- [ ] Implement read-only mode trigger.
- [ ] Implement reduced model mode trigger.
- [ ] Implement last-known-good snapshot mode.
- [ ] Add automatic feature shedding controls.

### 7.5 Chaos and game days

- [ ] Schedule monthly game day.
- [ ] Add broker outage drill.
- [ ] Add storage outage drill.
- [ ] Add model endpoint failure drill.
- [ ] Track MTTR and recovery objective attainment.

Deliverables:
- Live observability platform
- On-call and incident operations
- Chaos engineering program

---

## 8. CI/CD and Release Engineering TODO

### 8.1 CI split pipelines

- [ ] Add lint workflow.
- [ ] Add static typing workflow.
- [ ] Add unit and integration workflow.
- [ ] Add security workflow.
- [ ] Add performance smoke workflow.
- [ ] Add release packaging workflow.

### 8.2 Release management

- [ ] Add semantic versioning and release notes automation.
- [ ] Add environment promotion gates.
- [ ] Add deployment approval and rollback controls.

### 8.3 Infrastructure validation

- [ ] Add infra drift detection checks.
- [ ] Add manifest lint and policy checks.
- [ ] Add runtime config validation checks.

### 8.4 Quality metrics

- [ ] Track lead time, change failure rate, MTTR, deployment frequency.
- [ ] Build engineering quality dashboard.

Deliverables:
- Multi-track CI system
- Controlled release pipeline
- Engineering quality dashboard

---

## 9. Product and Domain Expansion TODO

### 9.1 Domain packs

- [ ] Build geopolitics pack.
- [ ] Build markets pack.
- [ ] Build supply chain pack.
- [ ] Build cyber pack.
- [ ] Build climate and humanitarian pack.

### 9.2 Recommendation playbooks

- [ ] Define policy-driven recommendation templates by persona.
- [ ] Add playbook trigger engine.
- [ ] Add post-action outcome capture loop.

### 9.3 Narrative and trust

- [ ] Build source trust index service.
- [ ] Build narrative contradiction detector.
- [ ] Build narrative drift timeline.

### 9.4 API productization

- [ ] Publish event stream API.
- [ ] Publish entity graph API.
- [ ] Publish brief generation API.
- [ ] Publish scenario simulation API.

Deliverables:
- Domain intelligence packs
- API product tier foundation

---

## 10. Documentation and Enablement TODO

### 10.1 Docs completeness

- [ ] Architecture docs for every service.
- [ ] Runbooks for all critical ops flows.
- [ ] Developer onboarding guide.
- [ ] Incident response handbook.

### 10.2 Training and process

- [ ] Train analysts on triage and explainability interpretation.
- [ ] Train engineering on policy and security workflows.
- [ ] Run tabletop incident exercises.

Deliverables:
- Full docs portal and runbook set

---

## 11. Detailed Sprint Sequence (Suggested)

### Sprint 1 to 2 (Infra reality)

- [ ] Provision managed stream and cloud stores in staging.
- [ ] Replace simulated cloud adapters with real SDK-backed writes.
- [ ] Add connectivity verification jobs.
- [ ] Add live lag and freshness dashboards.

### Sprint 3 to 4 (Intelligence depth)

- [ ] Build causality graph service and persistence.
- [ ] Build forecasting and scenario runtime v1.
- [ ] Add backtesting and calibration reporting.

### Sprint 5 to 6 (Experience expansion)

- [ ] Build map and panel framework.
- [ ] Add collaborative triage workflows.
- [ ] Add persona-specific workspace overlays.

### Sprint 7 to 8 (Security and SRE hardening)

- [ ] Add SSO and SCIM.
- [ ] Add mTLS and vault rotation.
- [ ] Add incident automation and degradation controls.

### Sprint 9 to 10 (Release and platformization)

- [ ] Split CI pipelines and add supply-chain hardening.
- [ ] Add API product boundaries and SLA controls.
- [ ] Add domain pack launch readiness.

---

## 12. Acceptance Checklist for Production Readiness

- [ ] Real managed stream and store infra deployed in staging and prod.
- [ ] Data contracts enforced at runtime with registry.
- [ ] Triage workflow complete with explainability and collaboration.
- [ ] Causality and forecasting services operational.
- [ ] Tenant isolation and policy controls validated by security tests.
- [ ] SLOs live with active alerting and game day evidence.
- [ ] CI/CD split pipelines with release signing and SBOM.
- [ ] Runbooks complete and on-call readiness validated.

---

## 13. What I Need From You (Credentials and Access)

Provide these when we are ready to execute each track in real environments.

### 13.1 Cloud and infra access

1. Cloud project or subscription IDs for dev, staging, prod.
2. IAM roles for provisioning and deployment.
3. Kubernetes cluster access and namespace policy.
4. DNS and certificate management access.

### 13.2 Managed stream and storage

1. Managed Kafka or Redpanda cluster endpoints and auth secrets.
2. Object store bucket names and service-account credentials.
3. Managed SQL and warehouse connection details.
4. Search and graph backend credentials.

### 13.3 Security and identity

1. SSO provider tenant details and app registrations.
2. SCIM provisioning endpoint and tokens.
3. Secret manager or vault access.
4. Artifact signing key or KMS key references.

### 13.4 Observability and ops

1. Metrics backend endpoint and credentials.
2. Logging backend endpoint and credentials.
3. Alert routing and incident platform credentials.

### 13.5 Compliance and legal

1. Data source legal approvals and restrictions.
2. Data residency and retention policy constraints.

---

## 14. Tracking Format

For every todo above, track:

1. Status: not started, in progress, blocked, done
2. Owner
3. Target sprint
4. Dependencies
5. Risk level
6. Verification evidence link

This document is the single master backlog. Use it as the canonical plan and execute one sprint at a time.

## 15. Immediate Execution Pack

Use these documents to run Sprint 1 in strict sequence.

1. `docs/execution/sprint-1-infra-reality-execution-board.md`
2. `docs/execution/sprint-1-credentials-checklist.md`
3. `.env.staging.example`
