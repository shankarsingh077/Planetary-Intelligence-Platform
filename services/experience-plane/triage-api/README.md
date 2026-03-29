# Triage API

Experience Plane service exposing global alert triage workflow APIs.

## Endpoints

1. GET /health
2. GET /v1/alerts
3. POST /v1/briefs/now
4. POST /v1/alerts/{alert_id}/assign

## Required headers

1. X-Tenant-ID
2. X-User-ID
3. X-Roles (comma-separated)

## Run

```bash
export PYTHONPATH="services/intelligence-plane/brief-service/src:services/experience-plane/triage-api/src"
./.venv/bin/python -m uvicorn triage_api.app:app --reload --port 8080
```

Open web triage shell at http://localhost:8080/
