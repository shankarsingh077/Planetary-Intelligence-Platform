# Sprint 1 Credentials and Access Checklist

Date: 2026-03-29
Purpose: Collect only the minimum credentials and platform details needed to execute Sprint 1 (staging infra reality cutover).

## 1. Cloud Project Access (GCP)

Provide:

1. Staging project ID.
2. Billing account attached confirmation.
3. Region and optional secondary region.
4. Principal to use for automation:
   - service account email, or
   - workload identity binding target.

Required permissions (least privilege preferred):

1. Resource provisioning for stream, storage, SQL, and networking.
2. Kubernetes deployment permissions in staging namespace.
3. Secret Manager read for runtime secrets.
4. Monitoring dashboard and alert policy write.

## 2. Managed Stream Details

Provide:

1. Provider choice: managed Kafka or managed Redpanda.
2. Bootstrap endpoint(s).
3. Authentication mode:
   - SASL SCRAM, mTLS, or provider token.
4. Credentials material location (secret reference, not plaintext).
5. Topic defaults:
   - retention period
   - partition count
   - replication factor

## 3. Managed Storage Details

Provide:

1. Object storage bucket name(s) for staging.
2. Prefix policy for raw/events/enriched/dlq.
3. Service account or role for object read/write.
4. Managed SQL instance details:
   - engine type
   - host or connection name
   - database name
   - secret references for credentials

## 4. Kubernetes and Runtime Details

Provide:

1. Cluster name and region.
2. Namespace for staging workloads.
3. Ingress approach (if needed).
4. Workload identity mapping or pod-level service account strategy.

## 5. Security and Secret Handling

Provide:

1. Secret Manager project and path conventions.
2. Naming convention for secret keys.
3. Rotation policy baseline (even if manual initially).
4. Contact for security sign-off.

## 6. Observability and Alerts

Provide:

1. Metrics backend target (Cloud Monitoring or external).
2. Logging destination.
3. Alert notification channel (email, Slack, PagerDuty).
4. On-call test recipient for non-prod alerts.

## 7. Compliance and Constraints

Provide:

1. Data residency restrictions.
2. Source-specific legal restrictions.
3. Data retention and deletion policy.
4. Incident reporting requirements.

## 8. Delivery Format

Share values by secret-safe method only:

1. Secret references and IDs are fine in chat.
2. Never paste raw secret values in chat or repo.
3. If needed, we will use placeholder values in `.env.staging.example` and wire real values in secret manager.

## 9. Ready-to-Start Checklist

- [ ] Staging project identified
- [ ] IAM principal created and granted
- [ ] Broker endpoint and auth mode confirmed
- [ ] Bucket and SQL instance confirmed
- [ ] K8s namespace confirmed
- [ ] Secret references created
- [ ] Alert channel confirmed
- [ ] Compliance constraints documented

## 10. Live Input Tracker

Current intake status is tracked in:

- `docs/execution/sprint-1-input-status.md`
