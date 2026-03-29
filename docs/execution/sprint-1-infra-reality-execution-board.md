# Sprint 1 Execution Board: Infra Reality Cutover

Date: 2026-03-29
Sprint length: 2 weeks
Objective: Move managed backend support from profile simulation to real staging infrastructure with verified broker and cloud storage connectivity, live telemetry, and failure drill evidence.

## Sprint Goal

By the end of Sprint 1:

1. Staging managed stream and storage are provisioned and reachable.
2. Connectors publish to real broker topics.
3. Enriched events land in real object store and serving database path.
4. Dashboards show live lag, freshness, and ingest success.
5. One controlled failure drill is executed and documented.

## Web-First Progress Update

1. Public web interface deployed to Cloud Run.
2. Live URL: `https://pip-web-145930903164.asia-south1.run.app`
3. Health check verified: `/health` returned 200.
4. Initial demo dataset wired for non-empty triage UI.
5. Cloud-backed event source configured via GCS URI.
6. Manual ingest endpoint removed; web is connector-driven.
7. Browser UI now consumes live connector publications only.
8. Assignment and audit persistence extended to optional GCS path (`TRIAGE_AUDIT_GCS_URI`).
9. Production auth mode switch implemented (`TRIAGE_AUTH_MODE=header|token`).
10. Live auto-refresh loop enabled with top-strip counters (alerts, events, audit, live state).
11. Global posture map first 2D layer added with live alert markers.
12. Live connector waves implemented in runtime: GDELT, Weather.gov, FRED, CoinGecko, ACLED, EIA, AviationStack, AbuseIPDB.
13. Connector-wave automation publishes enriched output to web cloud feed path.

## Scope (In)

1. Staging only.
2. Existing connectors runtime and storage runtime profile system.
3. Real broker and real object store integration.
4. Baseline telemetry and verification jobs.

## Scope (Out)

1. Production environment cutover.
2. Forecasting and graph features.
3. Full UI expansion.

## Atomic Task Plan (Strict Order)

### Day 0: Access and guardrails

- [x] Task 0.1 Create staging access package.
  - Input needed from user:
    - Cloud project ID.
    - IAM role grant for provisioning and deployment.
    - Kubernetes cluster access (or permission to create cluster).
  - Output:
    - Access verified checklist in `docs/execution/sprint-1-proof/access-verification.md`.
  - Acceptance:
    - Can run cloud CLI and list project resources with least-privilege role.
  - Status update:
    - gcloud installed and authenticated.
    - project configured: planetaryintelligenceplatform.
    - core Sprint 1 APIs enabled.
    - baseline inventory discovered (currently empty resources).

- [ ] Task 0.2 Define environment naming and tagging policy.
  - Output:
    - `docs/execution/sprint-1-proof/environment-convention.md`.
  - Acceptance:
    - All resources have owner, env, cost-center, and retention tags.

### Day 1: Infrastructure as code scaffold

- [ ] Task 1.1 Create infra module skeleton.
  - Output paths:
    - `infra/README.md`
    - `infra/modules/stream/`
    - `infra/modules/storage/`
    - `infra/modules/k8s/`
    - `infra/environments/staging/`
  - Acceptance:
    - `infra/environments/staging` composes stream, storage, and k8s modules.

- [ ] Task 1.2 Add policy checks for IaC.
  - Output paths:
    - `infra/policies/`
    - CI lint hook for infra validate.
  - Acceptance:
    - IaC validation job fails on invalid config.

### Day 2: Managed stream provisioning

- [ ] Task 2.1 Provision staging broker.
  - Input needed from user:
    - Managed stream provider choice (Kafka or Redpanda).
    - Region and expected throughput tier.
  - Output:
    - Broker endpoint, auth mechanism, topic plan.
  - Acceptance:
    - Broker endpoint reachable from k8s worker network.

- [ ] Task 2.2 Create topics and ACLs.
  - Topics:
    - `pip.raw.events`
    - `pip.enriched.events`
    - `pip.dlq.events`
    - `pip.metrics.events`
  - Acceptance:
    - Service principal can produce and consume only allowed topics.

- [ ] Task 2.3 Add connectivity verification job.
  - Output path:
    - `scripts/verify_stream_connectivity.sh`
  - Acceptance:
    - Script produces and consumes canary records and exits non-zero on failures.

### Day 3: Managed storage provisioning

- [ ] Task 3.1 Provision object bucket layout.
  - Prefixes:
    - `raw/`
    - `events/`
    - `events_enriched/`
    - `dlq/`
  - Input needed from user:
    - Bucket naming policy and retention policy.
  - Acceptance:
    - Service account can write/read only required prefixes.

- [ ] Task 3.2 Provision serving metadata store.
  - Option:
    - managed SQL (recommended for first cut).
  - Acceptance:
    - Network and auth allow app connectivity from k8s namespace.

- [ ] Task 3.3 Add storage verification job.
  - Output path:
    - `scripts/verify_storage_connectivity.sh`
  - Acceptance:
    - Script writes and reads canary object and verifies SQL insert/select.

### Day 4: Runtime secret wiring and profile cutover

- [ ] Task 4.1 Add environment secret contract.
  - Output path:
    - `.env.staging.example` (template only, no secrets)
  - Acceptance:
    - Variables map exactly to runtime adapters.

- [ ] Task 4.2 Configure connector runtime profile to real stream.
  - Acceptance:
    - `STREAM_PROFILE` in staging set to managed backend profile.

- [ ] Task 4.3 Configure storage runtime profile to real store.
  - Acceptance:
    - `STORE_PROFILE` in staging set to cloud profile with real SDK path.

### Day 5: Replace simulation paths with real SDK-backed writes

- [ ] Task 5.1 Implement object-store SDK adapter.
  - Acceptance:
    - No mirror-file fallback in staging path.

- [ ] Task 5.2 Implement serving-store real write path.
  - Acceptance:
    - Ingestion persists metadata rows in managed SQL.

- [ ] Task 5.3 Add idempotency guards.
  - Acceptance:
    - Duplicate event writes are safely handled.

### Day 6: Deploy and smoke test

- [ ] Task 6.1 Deploy connectors runtime to staging.
- [ ] Task 6.2 Deploy transform and storage runtime jobs.
- [ ] Task 6.3 Run end-to-end smoke pipeline.
  - Acceptance:
    - 4 current connectors publish to broker, transform succeeds, storage persists output.

### Day 7: Telemetry and dashboards

- [ ] Task 7.1 Add lag metric export.
- [ ] Task 7.2 Add source freshness metric export.
- [ ] Task 7.3 Add ingest success/failure counters.
- [ ] Task 7.4 Build staging dashboard panels.
  - Acceptance:
    - Dashboards visible with live data for at least 24h.

### Day 8: DLQ and replay operability

- [ ] Task 8.1 Verify DLQ routing in staging.
- [ ] Task 8.2 Add replay command and operator steps.
- [ ] Task 8.3 Record replay drill evidence.
  - Acceptance:
    - Operator can replay failed records and verify recovery.

### Day 9: Failure drill and recovery evidence

- [ ] Task 9.1 Run broker outage simulation.
- [ ] Task 9.2 Validate reconnect and backlog drain.
- [ ] Task 9.3 Capture MTTR and data loss indicators.
  - Acceptance:
    - Recovery within agreed objective and no silent data loss.

### Day 10: Sprint close and handoff

- [ ] Task 10.1 Publish Sprint 1 evidence pack.
  - Output folder:
    - `docs/execution/sprint-1-proof/`
- [ ] Task 10.2 Sign off gates.
  - Gate checks:
    - Connectivity verified
    - Real writes verified
    - Telemetry live
    - Drill completed

## Deliverables Checklist

- [ ] IaC scaffold and staging environment definition
- [ ] Real managed stream and storage connectivity scripts
- [ ] Runtime configured for real backends in staging
- [ ] SDK-backed write path implemented
- [ ] Live telemetry dashboard
- [ ] DLQ replay operator flow
- [ ] Failure drill report

## Risks and Mitigations

1. Risk: IAM permissions incomplete.
   - Mitigation: Access verification on Day 0 before any provisioning work.
2. Risk: Broker networking blocked from cluster.
   - Mitigation: Connectivity verification job before runtime deployment.
3. Risk: Storage latency affects ingest.
   - Mitigation: Batch tuning and retry policy tests in staging.
4. Risk: Secrets leakage risk.
   - Mitigation: Secret manager only, never commit secret values.

## What I Need From You to Start Sprint 1

1. Cloud provider confirmation for staging (GCP in your case).
2. Staging project ID.
3. IAM user or service account with rights to:
   - create stream resources
   - create storage resources
   - deploy to k8s
   - read secret manager entries
4. Region and compliance constraints.
5. Preferred managed broker and tier.
6. Preferred managed SQL engine.
7. Bucket naming convention and retention rules.
8. Alert destination for on-call test alerts.

## Daily Update Template

Use this in every progress update:

1. Completed today
2. Blockers
3. Inputs needed from user
4. Next 24h tasks
5. Evidence links

## Exit Criteria (Must all pass)

1. End-to-end pipeline runs on real staging infra.
2. At least one successful and one recovered failure run documented.
3. Dashboards show lag, freshness, and ingestion outcomes.
4. No hardcoded secrets and no plaintext credentials in repo.
