#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-planetaryintelligenceplatform}"
PROJECT_NUMBER="${PROJECT_NUMBER:-145930903164}"
REGION="${REGION:-asia-south1}"
EVENTS_BUCKET="${EVENTS_BUCKET:-pip-events-${PROJECT_NUMBER}-${REGION}}"
EVENTS_PREFIX="${EVENTS_PREFIX:-events-live}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

export PYTHONPATH="services/data-plane/connector-sdk/src:services/data-plane/connectors-runtime/src:services/data-plane/transform-jobs/src:services/data-plane/storage-runtime/src:services/intelligence-plane/brief-service/src:services/intelligence-plane/entity-resolver/src:services/intelligence-plane/fusion-service/src:services/intelligence-plane/confidence-service/src:services/experience-plane/triage-api/src:sre"

mkdir -p runtime-output
: > runtime-output/stream.jsonl

echo "Running connector wave..."
./.venv/bin/python -m connectors_runtime.runner

echo "Transforming connector stream..."
./.venv/bin/python -m transform_jobs.raw_to_event --input ./runtime-output/stream.jsonl --output ./runtime-output/events.wave.jsonl
./.venv/bin/python -m transform_jobs.enrich_event --input ./runtime-output/events.wave.jsonl --output ./runtime-output/events.wave.enriched.jsonl

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DST="gs://${EVENTS_BUCKET}/${EVENTS_PREFIX}/connector-wave-${STAMP}.jsonl"

echo "Publishing enriched events to ${DST}"
gcloud storage cp ./runtime-output/events.wave.enriched.jsonl "$DST" --project "$PROJECT_ID"

echo "CONNECTOR_WAVE_PUBLISHED=${DST}"
