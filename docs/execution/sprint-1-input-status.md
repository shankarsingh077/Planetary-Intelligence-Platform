# Sprint 1 Input Status

Date: 2026-03-29

## Received

1. Project name: PlanetaryIntelligencePlatform
2. Project number: 145930903164
3. Project ID: planetaryintelligenceplatform
4. Managed stream preference: Kafka
5. Managed SQL preference: PostgreSQL
6. GKE strategy: create new cluster
7. Bucket strategy: create new buckets
8. Region guidance from user: India-based; defaulting to asia-south1 unless changed

## Auto-discovery attempt from terminal

1. gcloud CLI: installed (Google Cloud SDK 562.0.0)
2. kubectl: available
3. terraform: missing
4. helm: missing
5. jq: available
6. gcloud auth: active account configured
7. Project set: planetaryintelligenceplatform
8. Core APIs enabled: GKE, Compute, Storage, SQL Admin, Secret Manager, Monitoring, Logging, Artifact Registry, Pub/Sub
9. Current discovered inventory: no GKE clusters, no SQL instances, no buckets, no secrets

## Why full auto-discovery is blocked

At this point auto-discovery is working. Remaining gaps are not access issues; they are missing resources that must be provisioned:

1. GKE cluster
2. Cloud SQL instance
3. GCS buckets
4. Secret Manager entries

## Minimum additional inputs needed to start Sprint 1 immediately

1. Staging region
2. Managed stream choice (Kafka or Redpanda)
3. Managed SQL engine choice (PostgreSQL recommended)
4. Existing GKE cluster name and namespace (or confirm that I should provision a new cluster)
5. Bucket names for raw/events/enriched/dlq (or confirm naming convention to create)
6. Secret reference names for broker auth and SQL auth

## Fast path options

Option A: Provision baseline resources from the scaffold (recommended next).
Option B: Manually create resources in console and I wire runtime configs.

## Current execution defaults now set in repo

1. Region: asia-south1
2. Stream: Kafka
3. SQL: PostgreSQL
4. New GKE cluster and new buckets in staging

These defaults can be changed later without blocking scaffold work.

## Latest delivery status

1. Public web deployed: https://pip-web-145930903164.asia-south1.run.app
2. Health verified: 200 from /health
3. Cloud-backed event source enabled:
	- TRIAGE_EVENTS_GCS_URI=gs://pip-events-145930903164-asia-south1/events-live
4. Manual ingest endpoint removed (connector-only ingestion path).
5. Validation evidence:
	- connector_wave_published=gs://pip-events-145930903164-asia-south1/events-live/connector-wave-*.jsonl
	- alerts_count=19 (post connector wave publish)
