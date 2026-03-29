from __future__ import annotations

from pathlib import Path
import unittest


class TestSourceCatalog(unittest.TestCase):
    def test_catalog_exists_and_has_many_sources(self) -> None:
        root = Path(__file__).resolve().parents[2]
        catalog = root / "data" / "sources" / "catalog.yaml"
        self.assertTrue(catalog.exists())

        text = catalog.read_text(encoding="utf-8")
        entries = [line for line in text.splitlines() if line.strip().startswith("- id:")]
        self.assertGreaterEqual(len(entries), 45)

    def test_catalog_contains_required_classes(self) -> None:
        root = Path(__file__).resolve().parents[2]
        catalog = root / "data" / "sources" / "catalog.yaml"
        text = catalog.read_text(encoding="utf-8")

        for source_class in ["rss", "api", "websocket", "bulk", "scrape_fallback"]:
            self.assertIn(f"class: {source_class}", text)


if __name__ == "__main__":
    unittest.main()
