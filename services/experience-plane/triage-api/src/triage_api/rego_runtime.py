from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class RegoPolicyEngine:
    rego_path: Path
    permissions_path: Path
    _rego_text: str = field(default="", init=False)
    _permissions: dict[str, set[str]] = field(default_factory=dict, init=False)

    def __post_init__(self) -> None:
        self._rego_text = self.rego_path.read_text(encoding="utf-8")
        raw = json.loads(self.permissions_path.read_text(encoding="utf-8"))
        self._permissions: dict[str, set[str]] = {k: set(v) for k, v in raw.items()}

        required_tokens = [
            "input.subject.tenant_id == input.resource.tenant_id",
            "role_allows_action",
            "requires_human_review",
        ]
        for token in required_tokens:
            if token not in self._rego_text:
                raise RuntimeError(f"rego_policy_missing_clause:{token}")

    def evaluate(self, input_doc: dict[str, Any]) -> tuple[bool, str | None]:
        subject = input_doc.get("subject", {})
        resource = input_doc.get("resource", {})
        action = str(input_doc.get("action", ""))

        subject_tenant = str(subject.get("tenant_id", ""))
        resource_tenant = str(resource.get("tenant_id", ""))
        if subject_tenant != resource_tenant:
            return False, "tenant_mismatch"

        roles = [str(r).strip() for r in subject.get("roles", [])]
        allowed = any(action in self._permissions.get(role, set()) for role in roles)
        if not allowed:
            return False, f"forbidden_action:{action}"

        sensitivity = str(resource.get("sensitivity", "low"))
        human_review_approved = bool(resource.get("human_review_approved", False))
        if action == "publish_strategic_recommendation" and sensitivity == "high" and not human_review_approved:
            return False, "human_review_required"

        return True, None
