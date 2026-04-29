#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-planetaryintelligenceplatform}"
ENV_FILE="${ENV_FILE:-.env.live.local}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

# Expects secret values to already be present in shell env vars.
SECRET_KEYS=(
  GROK_API_KEY
  FINNHUB_API_KEY
  EIA_API_KEY
  FRED_API_KEY
  AVIATIONSTACK_API_KEY
  AVIATIONSTACK_API
  OPENSKY_CLIENT_ID
  OPENSKY_CLIENT_SECRET
  AISSTREAM_API_KEY
  ICAO_API_KEY
  ACLED_EMAIL
  ACLED_PASSWORD
  ACLED_ACCESS_KEY
  ACLED_ACCESS_TOKEN
  ACLED_BEARER_TOKEN
  UCDP_ACCESS_TOKEN
  NASA_FIRMS_API_KEY
  ABUSEIPDB_API_KEY
  GEMINI_API_KEY
)

gcloud config set project "${PROJECT_ID}" >/dev/null

for key in "${SECRET_KEYS[@]}"; do
  value="${!key:-}"
  if [[ -z "${value}" ]]; then
    echo "skip ${key} (empty)"
    continue
  fi

  if ! gcloud secrets describe "${key}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
    gcloud secrets create "${key}" --replication-policy="automatic" --project "${PROJECT_ID}" >/dev/null
  fi

  printf '%s' "${value}" | gcloud secrets versions add "${key}" --data-file=- --project "${PROJECT_ID}" >/dev/null
  echo "upserted ${key}"
done

echo "Secret provisioning complete."
