from __future__ import annotations

import unittest

from triage_api.policy import AuthContext, authorize


class TestTriagePolicy(unittest.TestCase):
    def test_analyst_can_assign(self) -> None:
        ctx = AuthContext(tenant_id="tenant-a", user_id="user-a", roles=["analyst"])
        authorize("alerts:assign", ctx)

    def test_viewer_cannot_assign(self) -> None:
        ctx = AuthContext(tenant_id="tenant-a", user_id="user-a", roles=["viewer"])
        with self.assertRaises(PermissionError):
            authorize("alerts:assign", ctx)


if __name__ == "__main__":
    unittest.main()
