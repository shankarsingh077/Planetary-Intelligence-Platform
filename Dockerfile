FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Minimal runtime dependencies for web interface deployment.
RUN pip install --no-cache-dir fastapi uvicorn pydantic google-cloud-storage

COPY . /app

ENV PYTHONPATH=/app/services/intelligence-plane/brief-service/src:/app/services/intelligence-plane/entity-resolver/src:/app/services/intelligence-plane/fusion-service/src:/app/services/intelligence-plane/confidence-service/src:/app/services/experience-plane/triage-api/src
ENV TRIAGE_EVENTS_FILE=/app/data/demo/events.enriched.sample.jsonl
ENV TRIAGE_AUDIT_FILE=/app/runtime-output/audit.assignments.jsonl

EXPOSE 8080

CMD ["sh", "-c", "uvicorn triage_api.app:app --host 0.0.0.0 --port ${PORT:-8080}"]
