#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-planetaryintelligenceplatform}"
REGION="${REGION:-asia-south1}"
REDIS_INSTANCE="${REDIS_INSTANCE:-pip-triage-cache}"
REDIS_TIER="${REDIS_TIER:-BASIC}"
REDIS_MEMORY_GB="${REDIS_MEMORY_GB:-1}"

SQL_INSTANCE="${SQL_INSTANCE:-pip-postgres}"
SQL_TIER="${SQL_TIER:-db-custom-1-3840}"
SQL_DB_VERSION="${SQL_DB_VERSION:-POSTGRES_15}"
SQL_DISK_GB="${SQL_DISK_GB:-20}"
SQL_CREATE="${SQL_CREATE:-false}"

gcloud config set project "${PROJECT_ID}" >/dev/null

if ! gcloud redis instances describe "${REDIS_INSTANCE}" --region "${REGION}" >/dev/null 2>&1; then
  gcloud redis instances create "${REDIS_INSTANCE}" \
    --region "${REGION}" \
    --tier "${REDIS_TIER}" \
    --size "${REDIS_MEMORY_GB}" \
    --redis-version=redis_7_0
fi

REDIS_HOST="$(gcloud redis instances describe "${REDIS_INSTANCE}" --region "${REGION}" --format='value(host)')"
REDIS_PORT="$(gcloud redis instances describe "${REDIS_INSTANCE}" --region "${REGION}" --format='value(port)')"

echo "TRIAGE_REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}/0"

echo "Redis provisioned or already present."

if [[ "${SQL_CREATE}" == "true" ]]; then
  if ! gcloud sql instances describe "${SQL_INSTANCE}" >/dev/null 2>&1; then
    gcloud sql instances create "${SQL_INSTANCE}" \
      --database-version "${SQL_DB_VERSION}" \
      --tier "${SQL_TIER}" \
      --region "${REGION}" \
      --storage-size "${SQL_DISK_GB}" \
      --availability-type=zonal
  fi

  SQL_CONN="$(gcloud sql instances describe "${SQL_INSTANCE}" --format='value(connectionName)')"
  echo "CLOUDSQL_INSTANCE_CONNECTION_NAME=${SQL_CONN}"
  echo "Cloud SQL instance provisioned or already present."
else
  echo "Skipping Cloud SQL creation (set SQL_CREATE=true to enable)."
fi
