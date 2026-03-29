from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from brief_service.engine import BriefScope, build_alerts, generate_now_brief
from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .auth import build_auth_context
from .events_source import build_event_source
from .policy import AuthContext, authorize
from .store import AssignmentStore


ROOT = Path(__file__).resolve().parents[5]
EVENTS_FILE = Path(os.getenv("TRIAGE_EVENTS_FILE", str(ROOT / "runtime-output" / "events.enriched.jsonl")))
LEGACY_WEB_DIR = ROOT / "services" / "experience-plane" / "triage-web"
TS_WEB_DIST_DIR = ROOT / "services" / "experience-plane" / "triage-web-v2" / "dist"
WEB_DIR = TS_WEB_DIST_DIR if TS_WEB_DIST_DIR.exists() else LEGACY_WEB_DIR
AUDIT_FILE = Path(os.getenv("TRIAGE_AUDIT_FILE", str(ROOT / "runtime-output" / "audit.assignments.jsonl")))

store = AssignmentStore(audit_file=AUDIT_FILE, audit_gcs_uri=os.getenv("TRIAGE_AUDIT_GCS_URI"))
event_source = build_event_source(EVENTS_FILE)
app = FastAPI(title="Planetary Intelligence Triage API", version="0.1.0")

ASSETS_DIR = WEB_DIR / "assets" if (WEB_DIR / "assets").exists() else WEB_DIR
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


class ScopeModel(BaseModel):
    regions: list[str] = Field(default_factory=list)
    entities: list[str] = Field(default_factory=list)
    domains: list[str] = Field(default_factory=list)


class BriefRequest(BaseModel):
    tenantId: str
    userId: str
    scope: ScopeModel = Field(default_factory=ScopeModel)


class AssignRequest(BaseModel):
    assigneeUserId: str
    note: str = ""


@app.get("/")
def ui_index() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/v1/meta")
def meta() -> dict[str, str]:
    return {"authMode": os.getenv("TRIAGE_AUTH_MODE", "header")}


@app.get("/v1/alerts")
def list_alerts(ctx: AuthContext = Depends(build_auth_context)) -> dict[str, Any]:
    try:
        authorize("alerts:read", ctx, resource={"tenant_id": ctx.tenant_id})
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    events_file = event_source.materialize_events_file()
    alerts = build_alerts(
        tenant_id=ctx.tenant_id,
        events_file=events_file,
        scope=BriefScope(regions=[], entities=[], domains=[]),
        max_alerts=50,
    )

    for alert in alerts:
        assignment = store.get(str(alert.get("alert_id", "")))
        if assignment and assignment.get("tenant_id") == ctx.tenant_id:
            alert["assignment"] = assignment

    return {"alerts": alerts}


@app.post("/v1/briefs/now")
def briefs_now(payload: BriefRequest, ctx: AuthContext = Depends(build_auth_context)) -> dict[str, Any]:
    if payload.tenantId != ctx.tenant_id or payload.userId != ctx.user_id:
        raise HTTPException(status_code=403, detail="tenant_or_user_mismatch")

    try:
        authorize("briefs:read", ctx, resource={"tenant_id": payload.tenantId})
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    scope = BriefScope(
        regions=payload.scope.regions,
        entities=payload.scope.entities,
        domains=payload.scope.domains,
    )
    events_file = event_source.materialize_events_file()
    return generate_now_brief(
        tenant_id=ctx.tenant_id,
        user_id=ctx.user_id,
        scope=scope,
        events_file=events_file,
    )


@app.post("/v1/alerts/{alert_id}/assign")
def assign_alert(alert_id: str, payload: AssignRequest, ctx: AuthContext = Depends(build_auth_context)) -> dict[str, Any]:
    try:
        authorize("alerts:assign", ctx, resource={"tenant_id": ctx.tenant_id, "sensitivity": "medium"})
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    assignment = store.assign(
        tenant_id=ctx.tenant_id,
        alert_id=alert_id,
        user_id=payload.assigneeUserId,
        note=payload.note,
    )
    return {"assignment": assignment}


@app.get("/v1/ops/counters")
def ops_counters(ctx: AuthContext = Depends(build_auth_context)) -> dict[str, Any]:
    try:
        authorize("alerts:read", ctx, resource={"tenant_id": ctx.tenant_id})
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    return {
        "authMode": os.getenv("TRIAGE_AUTH_MODE", "header"),
        "eventRecords": event_source.count_records(),
        "auditAssignments": store.count_assignments(),
    }
