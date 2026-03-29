from __future__ import annotations

import json
import os

from fastapi import Header, HTTPException

from .policy import AuthContext


def _build_context_from_token(authorization: str | None) -> AuthContext:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="missing_bearer_token")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="missing_bearer_token")

    mapping_raw = os.getenv("TRIAGE_AUTH_TOKENS_JSON", "{}")
    try:
        mapping = json.loads(mapping_raw)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="invalid_token_mapping") from exc

    claims = mapping.get(token)
    if not isinstance(claims, dict):
        raise HTTPException(status_code=401, detail="invalid_token")

    tenant_id = str(claims.get("tenant_id", "")).strip()
    user_id = str(claims.get("user_id", "")).strip()
    roles_claim = claims.get("roles", ["viewer"])
    roles = [str(role).strip() for role in roles_claim if str(role).strip()] if isinstance(roles_claim, list) else ["viewer"]
    if not tenant_id or not user_id:
        raise HTTPException(status_code=401, detail="invalid_token_claims")
    if not roles:
        roles = ["viewer"]

    return AuthContext(tenant_id=tenant_id, user_id=user_id, roles=roles)


def build_auth_context(
    x_tenant_id: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None),
    x_roles: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
) -> AuthContext:
    mode = os.getenv("TRIAGE_AUTH_MODE", "header").strip().lower()
    if mode == "token":
        return _build_context_from_token(authorization)

    if not x_tenant_id or not x_user_id:
        raise HTTPException(status_code=401, detail="missing_auth_headers")

    roles = [r.strip() for r in (x_roles or "viewer").split(",") if r.strip()]
    if not roles:
        roles = ["viewer"]

    return AuthContext(tenant_id=x_tenant_id, user_id=x_user_id, roles=roles)
