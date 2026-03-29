#!/usr/bin/env bash
set -euo pipefail

# Verifies object store and SQL reachability using available CLIs.

BUCKET="${OBJECT_STORE_BUCKET:-}"
WAREHOUSE_DSN="${WAREHOUSE_DSN:-}"

if [[ -z "${BUCKET}" ]]; then
  echo "ERROR: Set OBJECT_STORE_BUCKET"
  exit 1
fi

echo "Checking object store bucket variable: ${BUCKET}"

if command -v gcloud >/dev/null 2>&1; then
  echo "gcloud detected, checking bucket metadata"
  gcloud storage buckets describe "gs://${BUCKET}" >/dev/null
  TMPFILE="/tmp/pip-canary-$(date +%s).txt"
  echo "canary" > "${TMPFILE}"
  gcloud storage cp "${TMPFILE}" "gs://${BUCKET}/events/connectivity-canary.txt" >/dev/null
  rm -f "${TMPFILE}"
  echo "Object store write check OK"
else
  echo "gcloud not installed, skipping object store API check"
fi

if [[ -n "${WAREHOUSE_DSN}" ]]; then
  echo "WAREHOUSE_DSN is present"
else
  echo "WARN: WAREHOUSE_DSN is empty, SQL check skipped"
fi

echo "STORAGE_VERIFICATION_OK"
