from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from connectors_runtime.registry import build_connectors


class TestLiveConnectorWave(unittest.TestCase):
    def test_registry_includes_live_connectors(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            connectors = build_connectors(output_dir=Path(tmp))
            connector_ids = {connector.config.connector_id for connector in connectors}

        for expected in [
            "gdelt-api",
            "weather-gov-api",
            "fred-api",
            "coingecko-api",
            "acled-api",
            "eia-api",
            "aviationstack-api",
            "abuseipdb-api",
            "finnhub-api",
            "corridorrisk-api",
        ]:
            self.assertIn(expected, connector_ids)

    def test_live_connectors_publish_with_stubbed_network(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            with patch("connectors_runtime.connectors.gdelt_api.fetch_json") as gdelt_fetch, patch(
                "connectors_runtime.connectors.weather_gov_api.fetch_json"
            ) as weather_fetch, patch("connectors_runtime.connectors.coingecko_api.fetch_json") as cg_fetch, patch(
                "connectors_runtime.connectors.fred_api.fetch_text"
            ) as fred_fetch, patch("connectors_runtime.connectors.acled_api.fetch_json") as acled_fetch, patch(
                "connectors_runtime.connectors.eia_api.fetch_json"
            ) as eia_fetch, patch("connectors_runtime.connectors.aviationstack_api.fetch_json") as aviation_fetch, patch(
                "connectors_runtime.connectors.abuseipdb_api.fetch_json"
            ) as abuse_fetch, patch("connectors_runtime.connectors.finnhub_api.fetch_json") as finnhub_fetch, patch(
                "connectors_runtime.connectors.corridorrisk_api.fetch_json"
            ) as corridor_fetch:
                gdelt_fetch.return_value = {
                    "articles": [
                        {
                            "title": "Diplomatic talks resume",
                            "url": "https://example.com/gdelt-1",
                            "sourcecountry": "US",
                            "seendate": "2026-03-29T10:00:00+00:00",
                        }
                    ]
                }
                weather_fetch.return_value = {
                    "features": [
                        {
                            "properties": {
                                "headline": "Severe storm warning",
                                "event": "Storm Warning",
                                "sent": "2026-03-29T11:00:00+00:00",
                                "@id": "https://api.weather.gov/alerts/xyz",
                            },
                            "geometry": {"coordinates": [[[-77.0, 38.9]]]},
                        }
                    ]
                }
                cg_fetch.return_value = {
                    "bitcoin": {"usd": 70000, "usd_24h_change": 1.2},
                    "ethereum": {"usd": 3500, "usd_24h_change": -0.5},
                }
                fred_fetch.return_value = "DATE,DGS10\n2026-03-28,4.10\n2026-03-29,4.12\n"
                acled_fetch.return_value = {
                    "data": [
                        {
                            "event_type": "Battles",
                            "sub_event_type": "Armed clash",
                            "country": "IN",
                            "latitude": "19.0760",
                            "longitude": "72.8777",
                            "event_date": "2026-03-29",
                        }
                    ]
                }
                eia_fetch.return_value = {
                    "response": {
                        "data": [
                            {"period": "2026-03-29", "value": "3.05", "product-name": "motor_gasoline"}
                        ]
                    }
                }
                aviation_fetch.return_value = {
                    "data": [
                        {
                            "flight_status": "active",
                            "departure": {"iata": "SFO"},
                            "arrival": {"iata": "LHR"},
                        }
                    ]
                }
                abuse_fetch.return_value = {
                    "data": [
                        {
                            "ipAddress": "198.51.100.7",
                            "abuseConfidenceScore": 97,
                            "countryCode": "US",
                        }
                    ]
                }
                finnhub_fetch.return_value = {"c": 520.1, "pc": 517.0}
                corridor_fetch.side_effect = [
                    {"events": [{"corridor": "red-sea", "type": "incident", "severity": "high", "date": "2026-03-29"}]},
                    {"corridor": "red-sea", "score": 74, "level": "high"},
                    {"corridor": "red-sea", "risk": "high"},
                ]

                connectors = build_connectors(output_dir=out)
                for connector in connectors:
                    if connector.config.connector_id in {
                        "gdelt-api",
                        "weather-gov-api",
                        "fred-api",
                        "coingecko-api",
                        "acled-api",
                        "eia-api",
                        "aviationstack-api",
                        "abuseipdb-api",
                        "finnhub-api",
                        "corridorrisk-api",
                    }:
                        status = connector.run_once()
                        self.assertGreaterEqual(int(status.metadata.get("records_published", 0)), 1)


if __name__ == "__main__":
    unittest.main()
