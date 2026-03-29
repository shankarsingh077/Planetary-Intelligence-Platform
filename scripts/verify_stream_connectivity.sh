#!/usr/bin/env bash
set -euo pipefail

# Verifies stream host reachability and required env values.
# Optional deep check with kcat if installed.

BOOTSTRAP="${KAFKA_BOOTSTRAP_SERVERS:-${REDPANDA_BOOTSTRAP_SERVERS:-}}"
if [[ -z "${BOOTSTRAP}" ]]; then
  echo "ERROR: Set KAFKA_BOOTSTRAP_SERVERS or REDPANDA_BOOTSTRAP_SERVERS"
  exit 1
fi

HOST="${BOOTSTRAP%%:*}"
PORT="${BOOTSTRAP##*:}"
if [[ "${HOST}" == "${PORT}" ]]; then
  PORT="9092"
fi

echo "Checking TCP connectivity to ${HOST}:${PORT}"
if command -v nc >/dev/null 2>&1; then
  nc -z -w 3 "${HOST}" "${PORT}"
else
  bash -c "</dev/tcp/${HOST}/${PORT}" >/dev/null 2>&1
fi

echo "TCP connectivity OK"

if command -v kcat >/dev/null 2>&1; then
  TOPIC="${PIP_STREAM_TOPIC_RAW:-pip.raw.events}"
  echo "kcat detected, running produce smoke test on topic ${TOPIC}"
  printf '{"kind":"canary","ts":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}\n' \
    | kcat -P -b "${BOOTSTRAP}" -t "${TOPIC}"
  echo "kcat produce test OK"
else
  echo "kcat not installed, skipping produce smoke test"
fi

echo "STREAM_VERIFICATION_OK"
