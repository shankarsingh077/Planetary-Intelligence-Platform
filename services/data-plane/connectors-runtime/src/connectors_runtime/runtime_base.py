from __future__ import annotations

from typing import Any

from connector_sdk.base import BaseConnector
from connector_sdk.models import ConnectorConfig

from .adapters import LocalDLQWriter, StreamProducer


class RuntimeConnector(BaseConnector):
    def __init__(
        self,
        config: ConnectorConfig,
        topic: str,
        publisher: StreamProducer,
        dlq: LocalDLQWriter,
    ) -> None:
        super().__init__(config)
        self.topic = topic
        self.publisher = publisher
        self.dlq = dlq

    def publish(self, records: list[dict[str, Any]]) -> None:
        self.publisher.publish(self.topic, records)

    def send_to_dlq(self, payload: dict[str, Any], reason: str) -> None:
        self.stats.dlq_count += 1
        self.dlq.write(self.config.connector_id, payload, reason)
