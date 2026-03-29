from __future__ import annotations

import json
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen


def fetch_json(url: str, headers: dict[str, str] | None = None, timeout: float = 5.0) -> Any:
    request = Request(url=url, headers=headers or {})
    try:
        with urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except URLError as exc:
        raise RuntimeError(f"failed_http_fetch:{url}") from exc


def fetch_text(url: str, headers: dict[str, str] | None = None, timeout: float = 5.0) -> str:
    request = Request(url=url, headers=headers or {})
    try:
        with urlopen(request, timeout=timeout) as response:
            return response.read().decode("utf-8")
    except URLError as exc:
        raise RuntimeError(f"failed_http_fetch:{url}") from exc
