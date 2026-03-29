#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-planetaryintelligenceplatform}"
PROJECT_NUMBER="${PROJECT_NUMBER:-145930903164}"
REGION="${REGION:-asia-south1}"
EVENTS_BUCKET="${EVENTS_BUCKET:-pip-events-${PROJECT_NUMBER}-${REGION}}"
RUNTIME_SA="${RUNTIME_SA:-${PROJECT_NUMBER}-compute@developer.gserviceaccount.com}"

echo "Ensuring bucket gs://${EVENTS_BUCKET} in ${REGION}"
gcloud storage buckets describe "gs://${EVENTS_BUCKET}" --project "${PROJECT_ID}" >/dev/null 2>&1 || \
  gcloud storage buckets create "gs://${EVENTS_BUCKET}" --project "${PROJECT_ID}" --location "${REGION}" --uniform-bucket-level-access

echo "Granting objectAdmin to ${RUNTIME_SA} on bucket"
gcloud storage buckets add-iam-policy-binding "gs://${EVENTS_BUCKET}" \
  --member "serviceAccount:${RUNTIME_SA}" \
  --role "roles/storage.objectAdmin" \
  --project "${PROJECT_ID}" >/dev/null

echo "BUCKET_READY=gs://${EVENTS_BUCKET}"
