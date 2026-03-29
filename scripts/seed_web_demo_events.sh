#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-planetaryintelligenceplatform}"
PROJECT_NUMBER="${PROJECT_NUMBER:-145930903164}"
REGION="${REGION:-asia-south1}"
EVENTS_BUCKET="${EVENTS_BUCKET:-pip-events-${PROJECT_NUMBER}-${REGION}}"
EVENTS_PREFIX="${EVENTS_PREFIX:-events-live}"

SRC_FILE="data/demo/events.enriched.sample.jsonl"
DST_URI="gs://${EVENTS_BUCKET}/${EVENTS_PREFIX}/bootstrap.jsonl"

echo "Seeding ${SRC_FILE} -> ${DST_URI}"
gcloud storage cp "${SRC_FILE}" "${DST_URI}" --project "${PROJECT_ID}"

echo "SEEDED_URI=${DST_URI}"
