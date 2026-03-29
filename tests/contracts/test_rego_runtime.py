from __future__ import annotations

import unittest
from pathlib import Path

from triage_api.rego_runtime import RegoPolicyEngine


class TestRegoRuntime(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        root = Path(__file__).resolve().parents[2]
        rego = root / "control-plane" / "policy" / "rbac.rego"
        perms = root / "control-plane" / "policy" / "role_permissions.json"
        cls.engine = RegoPolicyEngine(rego_path=rego, permissions_path=perms)

    def test_allows_same_tenant_permitted_action(self) -> None:
        allowed, reason = self.engine.evaluate(
            {
                "action": "alerts:read",
                "subject": {"tenant_id": "t1", "roles": ["viewer"]},
                "resource": {"tenant_id": "t1", "sensitivity": "low"},
            }
        )
        self.assertTrue(allowed)
        self.assertIsNone(reason)

    def test_denies_cross_tenant(self) -> None:
        allowed, reason = self.engine.evaluate(
            {
                "action": "alerts:read",
                "subject": {"tenant_id": "t1", "roles": ["viewer"]},
                "resource": {"tenant_id": "t2", "sensitivity": "low"},
            }
        )
        self.assertFalse(allowed)
        self.assertEqual(reason, "tenant_mismatch")

    def test_requires_human_review_for_sensitive_publish(self) -> None:
        allowed, reason = self.engine.evaluate(
            {
                "action": "publish_strategic_recommendation",
                "subject": {"tenant_id": "t1", "roles": ["admin"]},
                "resource": {"tenant_id": "t1", "sensitivity": "high", "human_review_approved": False},
            }
        )
        self.assertFalse(allowed)
        self.assertEqual(reason, "human_review_required")


if __name__ == "__main__":
    unittest.main()
