from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from sre.chaos.run_chaos_check import run as run_chaos
from sre.metrics.emit_metrics import emit as emit_metrics


class TestSREScaffold(unittest.TestCase):
    def test_slo_file_has_expected_targets(self) -> None:
        root = Path(__file__).resolve().parents[2]
        slo_file = root / "sre" / "slo.yaml"
        text = slo_file.read_text(encoding="utf-8")
        self.assertIn("ingestion_freshness", text)
        self.assertIn("alert_delivery_delay", text)
        self.assertIn("dashboard_availability", text)

    def test_chaos_and_metrics_emit_files(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp)
            chaos_out = tmp_root / "chaos.json"
            metrics_out = tmp_root / "metrics.json"

            run_chaos("dry-run", chaos_out)
            emit_metrics(metrics_out)

            chaos_payload = json.loads(chaos_out.read_text(encoding="utf-8"))
            metrics_payload = json.loads(metrics_out.read_text(encoding="utf-8"))

            self.assertIn("scenarios", chaos_payload)
            self.assertIn("metrics", metrics_payload)


if __name__ == "__main__":
    unittest.main()
