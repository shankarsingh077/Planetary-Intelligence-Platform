#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-planetaryintelligenceplatform}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"

# Pull secret versions into process env without printing values.
SECRET_ENV_KEYS=(
  FINNHUB_API_KEY
  EIA_API_KEY
  FRED_API_KEY
  AVIATIONSTACK_API_KEY
  AVIATIONSTACK_API
  ABUSEIPDB_API_KEY
  ACLED_EMAIL
  ACLED_PASSWORD
  ACLED_ACCESS_KEY
  ACLED_ACCESS_TOKEN
  GROK_API_KEY
  UCDP_ACCESS_TOKEN
  NASA_FIRMS_API_KEY
  OPENSKY_CLIENT_ID
  OPENSKY_CLIENT_SECRET
  AISSTREAM_API_KEY
  ICAO_API_KEY
)

for key in "${SECRET_ENV_KEYS[@]}"; do
  if value="$(gcloud secrets versions access latest --secret="${key}" --project "${PROJECT_ID}" 2>/dev/null)"; then
    export "${key}=${value}"
  fi
done

bash scripts/run_live_connector_wave_to_web.sh
