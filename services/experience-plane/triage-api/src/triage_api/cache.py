"""
cache.py — In-memory TTL cache for live API responses.

Prevents redundant external API calls when multiple frontend panels
request the same data within a short window. Also provides last-known-good
fallback for graceful degradation.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any


class ResponseCache:
    """Simple in-memory TTL cache with last-known-good file persistence."""

    def __init__(self, lkg_dir: str = "/tmp/pip-lkg") -> None:
        self._store: dict[str, tuple[float, Any]] = {}
        self._last_success: dict[str, float] = {}
        self._lkg_dir = Path(lkg_dir)
        self._lkg_dir.mkdir(parents=True, exist_ok=True)

    def get(self, key: str, ttl_seconds: int = 120) -> Any | None:
        """Return cached value if within TTL, else None."""
        if key in self._store:
            stored_at, data = self._store[key]
            if time.time() - stored_at < ttl_seconds:
                return data
        return None

    def set(self, key: str, data: Any) -> None:
        """Cache a response and persist as last-known-good."""
        now = time.time()
        self._store[key] = (now, data)
        self._last_success[key] = now
        # Persist LKG to disk
        try:
            lkg_file = self._lkg_dir / f"{key}.json"
            lkg_file.write_text(json.dumps(data), encoding="utf-8")
        except Exception:  # noqa: BLE001
            pass

    def get_last_known_good(self, key: str, source: str) -> Any | None:
        """Return last-known-good data from disk, marking source as cached."""
        try:
            lkg_file = self._lkg_dir / f"{key}.json"
            if lkg_file.exists():
                data = json.loads(lkg_file.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    data["source"] = f"{source}_cached"
                    data["cached"] = True
                return data
        except Exception:  # noqa: BLE001
            pass
        return None

    def last_success(self, key: str) -> str | None:
        """Return ISO timestamp of the last successful fetch for a key."""
        ts = self._last_success.get(key)
        if ts:
            import datetime
            return datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc).isoformat()
        return None

    def stats(self) -> dict[str, Any]:
        """Return cache statistics for monitoring."""
        now = time.time()
        return {
            "entries": len(self._store),
            "keys": list(self._store.keys()),
            "ages": {
                key: round(now - stored_at, 1)
                for key, (stored_at, _) in self._store.items()
            },
        }


# Module-level singleton
cache = ResponseCache()
