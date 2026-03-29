from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from triage_api.store import AssignmentStore


class TestAssignmentStorePersistence(unittest.TestCase):
    def test_assignments_survive_store_restart_via_local_audit(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            audit_file = Path(tmp) / "audit.assignments.jsonl"

            store_a = AssignmentStore(audit_file=audit_file)
            store_a.assign(
                tenant_id="tenant-a",
                alert_id="alr_evt_001",
                user_id="analyst-1",
                note="owned",
            )

            store_b = AssignmentStore(audit_file=audit_file)
            recovered = store_b.get("alr_evt_001")

            self.assertIsNotNone(recovered)
            self.assertEqual(recovered.get("tenant_id"), "tenant-a")
            self.assertEqual(recovered.get("assigned_to"), "analyst-1")


if __name__ == "__main__":
    unittest.main()
