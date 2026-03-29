#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"

ENV_FILE="${ENV_FILE:-.env.live.local}"
PROJECT_ID="${PROJECT_ID:-planetaryintelligenceplatform}"
TRIAGE_REDIS_CACHE_TTL_SECONDS="${TRIAGE_REDIS_CACHE_TTL_SECONDS:-45}"
TRIAGE_REDIS_TIMEOUT_SECONDS="${TRIAGE_REDIS_TIMEOUT_SECONDS:-0.25}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Create it from .env.staging.example with real values."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

echo "Provisioning cache/database..."
CACHE_OUTPUT="$(bash scripts/provision_gcp_cache_db.sh)"
echo "${CACHE_OUTPUT}"

REDIS_URL_LINE="$(echo "${CACHE_OUTPUT}" | grep '^TRIAGE_REDIS_URL=' | tail -n 1 || true)"
if [[ -n "${REDIS_URL_LINE}" ]]; then
  export TRIAGE_REDIS_URL="${REDIS_URL_LINE#TRIAGE_REDIS_URL=}"
fi

echo "Provisioning secrets..."
ENV_FILE="${ENV_FILE}" PROJECT_ID="${PROJECT_ID}" bash scripts/provision_gcp_live_secrets.sh

echo "Deploying web service with bound secrets..."
export USE_STANDARD_LIVE_SECRETS=true
export TRIAGE_REDIS_CACHE_TTL_SECONDS
export TRIAGE_REDIS_TIMEOUT_SECONDS
bash scripts/deploy_web_cloud_run.sh

echo "Running live connector wave with secrets..."
PROJECT_ID="${PROJECT_ID}" bash scripts/run_live_connector_wave_with_secrets.sh

echo "Bootstrap complete."
