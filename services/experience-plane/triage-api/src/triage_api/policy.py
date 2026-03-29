from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .rego_runtime import RegoPolicyEngine


ROOT = Path(__file__).resolve().parents[5]
REGO_PATH = ROOT / "control-plane" / "policy" / "rbac.rego"
PERMISSIONS_PATH = ROOT / "control-plane" / "policy" / "role_permissions.json"

_ENGINE = RegoPolicyEngine(rego_path=REGO_PATH, permissions_path=PERMISSIONS_PATH)


@dataclass(slots=True)
class AuthContext:
    tenant_id: str
    user_id: str
    roles: list[str]


def authorize(action: str, ctx: AuthContext, resource: dict[str, Any] | None = None) -> None:
    resource_doc = {"tenant_id": ctx.tenant_id, "sensitivity": "low"}
    if resource:
        resource_doc.update(resource)

    allowed, reason = _ENGINE.evaluate(
        {
            "action": action,
            "subject": {
                "tenant_id": ctx.tenant_id,
                "user_id": ctx.user_id,
                "roles": ctx.roles,
            },
            "resource": resource_doc,
        }
    )

    if not allowed:
        raise PermissionError(reason or f"forbidden_action:{action}")
