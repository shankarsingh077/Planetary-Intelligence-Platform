from __future__ import annotations

import json
import os
import socket
from importlib import import_module
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol


class StreamProducer(Protocol):
    def publish(self, topic: str, records: list[dict[str, Any]]) -> None:
        ...

    def health_check(self) -> dict[str, Any]:
        ...


@dataclass(slots=True)
class LocalStreamPublisher:
    output_file: Path

    def publish(self, topic: str, records: list[dict[str, Any]]) -> None:
        self.output_file.parent.mkdir(parents=True, exist_ok=True)
        with self.output_file.open("a", encoding="utf-8") as f:
            for record in records:
                envelope = {"topic": topic, "record": record}
                f.write(json.dumps(envelope) + "\n")

    def health_check(self) -> dict[str, Any]:
        return {"backend": "local", "healthy": True, "detail": "local_jsonl_ready"}


@dataclass(slots=True)
class KafkaStreamPublisher:
    bootstrap_servers: str
    profile_name: str = "kafka"
    _producer: Any = field(default=None, init=False)

    def __post_init__(self) -> None:
        try:
            kafka_module = import_module("confluent_kafka")
        except Exception as exc:  # noqa: BLE001
            if os.getenv("STREAM_DRY_RUN", "0") == "1":
                self._producer = None
                return
            raise RuntimeError("Kafka mode requires confluent-kafka. Install it in your runtime environment.") from exc

        producer_cls = getattr(kafka_module, "Producer", None)
        if producer_cls is None:
            raise RuntimeError("confluent_kafka.Producer was not found in runtime")

        self._producer = producer_cls({"bootstrap.servers": self.bootstrap_servers})

    @staticmethod
    def _delivery_callback(err: Any, _msg: Any) -> None:
        if err is not None:
            raise RuntimeError(f"kafka_delivery_failed:{err}")

    def publish(self, topic: str, records: list[dict[str, Any]]) -> None:
        if self._producer is None:
            return
        for record in records:
            payload = json.dumps(record).encode("utf-8")
            self._producer.produce(topic=topic, value=payload, callback=self._delivery_callback)
        self._producer.flush()

    def health_check(self) -> dict[str, Any]:
        host, _, port_text = self.bootstrap_servers.partition(":")
        port = int(port_text or "9092")

        if os.getenv("STREAM_DRY_RUN", "0") == "1":
            return {
                "backend": self.profile_name,
                "healthy": True,
                "detail": "dry_run_enabled",
                "bootstrap": self.bootstrap_servers,
            }

        try:
            with socket.create_connection((host, port), timeout=1.5):
                return {
                    "backend": self.profile_name,
                    "healthy": True,
                    "detail": "tcp_connect_ok",
                    "bootstrap": self.bootstrap_servers,
                }
        except OSError as exc:
            return {
                "backend": self.profile_name,
                "healthy": False,
                "detail": f"tcp_connect_failed:{type(exc).__name__}",
                "bootstrap": self.bootstrap_servers,
            }


@dataclass(slots=True)
class RedpandaStreamPublisher(KafkaStreamPublisher):
    profile_name: str = "redpanda"


@dataclass(slots=True)
class LocalDLQWriter:
    output_file: Path

    def write(self, connector_id: str, payload: dict[str, Any], reason: str) -> None:
        self.output_file.parent.mkdir(parents=True, exist_ok=True)
        with self.output_file.open("a", encoding="utf-8") as f:
            envelope = {
                "connector_id": connector_id,
                "reason": reason,
                "payload": payload,
            }
            f.write(json.dumps(envelope) + "\n")
