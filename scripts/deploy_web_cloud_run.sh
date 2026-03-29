#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-planetaryintelligenceplatform}"
REGION="${REGION:-asia-south1}"
SERVICE_NAME="${SERVICE_NAME:-pip-web}"
EVENTS_BUCKET="${EVENTS_BUCKET:-pip-events-145930903164-asia-south1}"
EVENTS_PREFIX="${EVENTS_PREFIX:-events-live}"
TRIAGE_EVENTS_GCS_URI="${TRIAGE_EVENTS_GCS_URI:-gs://${EVENTS_BUCKET}/${EVENTS_PREFIX}}"
TRIAGE_REDIS_URL="${TRIAGE_REDIS_URL:-}"
TRIAGE_REDIS_CACHE_TTL_SECONDS="${TRIAGE_REDIS_CACHE_TTL_SECONDS:-30}"
TRIAGE_REDIS_TIMEOUT_SECONDS="${TRIAGE_REDIS_TIMEOUT_SECONDS:-0.25}"
RUN_SECRET_KEYS_CSV="${RUN_SECRET_KEYS_CSV:-}"
USE_STANDARD_LIVE_SECRETS="${USE_STANDARD_LIVE_SECRETS:-false}"

if [[ "${USE_STANDARD_LIVE_SECRETS}" == "true" && -z "${RUN_SECRET_KEYS_CSV}" ]]; then
  RUN_SECRET_KEYS_CSV="GROK_API_KEY,FINNHUB_API_KEY,EIA_API_KEY,FRED_API_KEY,AVIATIONSTACK_API,AVIATIONSTACK_API_KEY,OPENSKY_CLIENT_ID,OPENSKY_CLIENT_SECRET,AISSTREAM_API_KEY,ICAO_API_KEY,ACLED_EMAIL,ACLED_PASSWORD,ACLED_ACCESS_KEY,ACLED_ACCESS_TOKEN,ACLED_BEARER_TOKEN,UCDP_ACCESS_TOKEN,NASA_FIRMS_API_KEY,ABUSEIPDB_API_KEY"
fi

echo "Using project=${PROJECT_ID} region=${REGION} service=${SERVICE_NAME}"
echo "Using TRIAGE_EVENTS_GCS_URI=${TRIAGE_EVENTS_GCS_URI}"

gcloud config set project "${PROJECT_ID}" >/dev/null

STAMP="$(date -u +%Y%m%d-%H%M%S)"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:${STAMP}"

echo "Building image=${IMAGE} with Dockerfile.web"
TMP_BUILD_CONFIG="$(mktemp)"
trap 'rm -f "${TMP_BUILD_CONFIG}"' EXIT
cat >"${TMP_BUILD_CONFIG}" <<EOF
steps:
  - name: gcr.io/cloud-builders/docker
    args: ["build", "-f", "Dockerfile.web", "-t", "${IMAGE}", "."]
images:
  - "${IMAGE}"
EOF

gcloud builds submit \
  --project "${PROJECT_ID}" \
  --config "${TMP_BUILD_CONFIG}" \
  .

if [[ -n "${RUN_SECRET_KEYS_CSV}" ]]; then
  gcloud run services update "${SERVICE_NAME}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --clear-secrets >/dev/null 2>&1 || true
fi

gcloud run deploy "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --image "${IMAGE}" \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "TRIAGE_EVENTS_FILE=/app/runtime-output/events.enriched.jsonl,TRIAGE_AUDIT_FILE=/app/runtime-output/audit.assignments.jsonl,TRIAGE_EVENTS_GCS_URI=${TRIAGE_EVENTS_GCS_URI},TRIAGE_REDIS_URL=${TRIAGE_REDIS_URL},TRIAGE_REDIS_CACHE_TTL_SECONDS=${TRIAGE_REDIS_CACHE_TTL_SECONDS},TRIAGE_REDIS_TIMEOUT_SECONDS=${TRIAGE_REDIS_TIMEOUT_SECONDS}"

if [[ -n "${RUN_SECRET_KEYS_CSV}" ]]; then
  SECRET_MAPPINGS=()
  IFS=',' read -r -a SECRET_KEYS <<<"${RUN_SECRET_KEYS_CSV}"
  for key in "${SECRET_KEYS[@]}"; do
    trimmed="$(echo "${key}" | xargs)"
    if [[ -n "${trimmed}" ]] && gcloud secrets describe "${trimmed}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
      SECRET_MAPPINGS+=("${trimmed}=${trimmed}:latest")
    fi
  done

  if [[ "${#SECRET_MAPPINGS[@]}" -gt 0 ]]; then
    gcloud run services update "${SERVICE_NAME}" \
      --project "${PROJECT_ID}" \
      --region "${REGION}" \
      --set-secrets "$(IFS=,; echo "${SECRET_MAPPINGS[*]}")"
  fi
fi

URL="$(gcloud run services describe "${SERVICE_NAME}" --project "${PROJECT_ID}" --region "${REGION}" --format='value(status.url)')"

echo "WEB_URL=${URL}"
