from __future__ import annotations

import json
import importlib
import unittest
from pathlib import Path

try:
    jsonschema = importlib.import_module("jsonschema")
except Exception:  # noqa: BLE001
    jsonschema = None

from transform_jobs.raw_to_event import map_signal_record_to_event
from transform_jobs.enrich_event import enrich_event


class TestEventContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        root = Path(__file__).resolve().parents[2]
        schema_path = root / "schemas" / "canonical" / "event.schema.json"
        cls.schema = json.loads(schema_path.read_text(encoding="utf-8"))

    def test_mapping_populates_required_event_fields(self) -> None:
        record = {
            "domain": "markets",
            "symbol": "OIL-BRENT",
            "price": 87.42,
            "change_pct": 3.1,
            "timestamp": "2026-03-29T10:00:00+00:00",
        }

        event = map_signal_record_to_event(record)

        required = self.schema["required"]
        for field in required:
            self.assertIn(field, event)

    def test_mapped_event_validates_against_schema(self) -> None:
        if jsonschema is None:
            self.skipTest("jsonschema not installed")

        record = {
            "domain": "mobility",
            "route": "SEA-LANE-ALPHA",
            "status": "congested",
            "severity": "high",
            "reported_at": "2026-03-29T10:00:00+00:00",
        }

        event = map_signal_record_to_event(record)
        jsonschema.validate(instance=event, schema=self.schema)

    def test_enriched_event_validates_against_schema(self) -> None:
        if jsonschema is None:
            self.skipTest("jsonschema not installed")

        event = map_signal_record_to_event(
            {
                "domain": "news",
                "headline": "Emergency export controls announced",
                "published_at": "2026-03-29T10:00:00+00:00",
            }
        )
        enriched = enrich_event(event)
        jsonschema.validate(instance=enriched, schema=self.schema)

    def test_enrichment_keeps_or_adds_impact_dimensions(self) -> None:
        event = map_signal_record_to_event(
            {
                "domain": "markets",
                "symbol": "OIL-BRENT",
                "price": 90.0,
                "change_pct": 5.0,
                "timestamp": "2026-03-29T10:00:00+00:00",
            }
        )
        enriched = enrich_event(event)
        names = {d["name"] for d in enriched["impact"]["dimensions"]}
        self.assertIn("operational", names)
        self.assertIn("financial", names)


if __name__ == "__main__":
    unittest.main()
