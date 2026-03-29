from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from connector_sdk.base import BaseConnector

from .adapters import KafkaStreamPublisher, LocalDLQWriter, LocalStreamPublisher, RedpandaStreamPublisher
from .connectors.abuseipdb_api import AbuseIPDBAPIConnector
from .connectors.acled_api import ACLEDAPIConnector
from .connectors.aviationstack_api import AviationStackAPIConnector
from .connectors.coingecko_api import CoinGeckoAPIConnector
from .connectors.corridorrisk_api import CorridorRiskAPIConnector
from .connectors.eia_api import EIAAPIConnector
from .connectors.finnhub_api import FinnhubAPIConnector
from .connectors.fred_api import FREDAPIConnector
from .connectors.gdelt_api import GDELTAPIConnector
from .connectors.market_api import MarketAPIConnector
from .connectors.mobility_api import MobilityAPIConnector
from .connectors.news_api import NewsAPIConnector
from .connectors.regulation_api import RegulationAPIConnector
from .connectors.weather_gov_api import WeatherGovAPIConnector
from .profiles import load_stream_profile


def build_stream_publisher(output_dir: Path):
    stream_profile = os.getenv("STREAM_PROFILE", "local").strip().lower()
    if stream_profile == "local":
        return LocalStreamPublisher(output_file=output_dir / "stream.jsonl")

    profile = load_stream_profile(stream_profile)
    bootstrap = os.getenv(profile.bootstrap_env, profile.default_bootstrap)
    if profile.backend == "redpanda":
        return RedpandaStreamPublisher(bootstrap_servers=bootstrap)
    return KafkaStreamPublisher(bootstrap_servers=bootstrap, profile_name=profile.backend)


def stream_health(output_dir: Path | None = None) -> dict[str, Any]:
    out = output_dir or Path("./runtime-output")
    publisher = build_stream_publisher(out)
    return publisher.health_check()


def build_connectors(output_dir: Path | None = None) -> list[BaseConnector]:
    out = output_dir or Path("./runtime-output")
    publisher = build_stream_publisher(out)

    dlq = LocalDLQWriter(output_file=out / "dlq.jsonl")

    return [
        NewsAPIConnector(publisher, dlq),
        RegulationAPIConnector(publisher, dlq),
        MarketAPIConnector(publisher, dlq),
        MobilityAPIConnector(publisher, dlq),
        GDELTAPIConnector(publisher, dlq),
        WeatherGovAPIConnector(publisher, dlq),
        FREDAPIConnector(publisher, dlq),
        CoinGeckoAPIConnector(publisher, dlq),
        ACLEDAPIConnector(publisher, dlq),
        EIAAPIConnector(publisher, dlq),
        AviationStackAPIConnector(publisher, dlq),
        AbuseIPDBAPIConnector(publisher, dlq),
        FinnhubAPIConnector(publisher, dlq),
        CorridorRiskAPIConnector(publisher, dlq),
    ]
