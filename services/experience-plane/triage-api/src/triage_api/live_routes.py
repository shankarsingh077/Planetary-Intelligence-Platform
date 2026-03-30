"""
live_routes.py — Live data proxy endpoints

Proxies external API calls to keep keys server-side.
Each endpoint returns: { success: bool, data: ..., source: str, timestamp: str }
On failure returns { success: false, error: str } so frontend can fall back to seed.
"""

from __future__ import annotations

import os
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter

router = APIRouter(prefix="/v1/live", tags=["live"])

TIMEOUT = httpx.Timeout(15.0, connect=8.0)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ok(data: Any, source: str) -> dict:
    return {"success": True, "data": data, "source": source, "timestamp": _now_iso()}


def _fail(source: str, error: str) -> dict:
    return {"success": False, "data": None, "source": source, "error": error, "timestamp": _now_iso()}


# ──────────────────────────────────────────────────────────────────────────────
# NASA FIRMS — Active Fire Hotspots
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/fires")
async def live_fires():
    """Fetch active fire hotspots from NASA FIRMS (last 24h, VIIRS/MODIS)."""
    key = os.getenv("NASA_FIRMS_API_KEY", "")
    if not key:
        return _fail("nasa_firms", "NASA_FIRMS_API_KEY not set")

    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/VIIRS_SNPP_NRT/world/1"

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(url)
            resp.raise_for_status()

        lines = resp.text.strip().split("\n")
        if len(lines) < 2:
            return _fail("nasa_firms", "No data returned")

        headers = lines[0].split(",")
        fires = []
        for line in lines[1:501]:  # Cap at 500 hotspots
            vals = line.split(",")
            if len(vals) < len(headers):
                continue
            row = dict(zip(headers, vals))
            try:
                fires.append({
                    "lat": float(row.get("latitude", 0)),
                    "lon": float(row.get("longitude", 0)),
                    "brightness": float(row.get("bright_ti4", row.get("brightness", 0))),
                    "confidence": row.get("confidence", "nominal"),
                    "acq_date": row.get("acq_date", ""),
                    "acq_time": row.get("acq_time", ""),
                    "frp": float(row.get("frp", 0)),
                    "satellite": row.get("satellite", "VIIRS"),
                })
            except (ValueError, KeyError):
                continue

        return _ok(fires, "nasa_firms")
    except Exception as e:
        return _fail("nasa_firms", str(e))


# ──────────────────────────────────────────────────────────────────────────────
# ACLED — Conflict Events
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/conflicts")
async def live_conflicts():
    """Fetch recent conflict events from ACLED (last 7 days)."""
    email = os.getenv("ACLED_EMAIL", "")
    password = os.getenv("ACLED_PASSWORD", "")

    if not email or not password:
        return _fail("acled", "ACLED credentials not set")

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            # Get auth token
            token_resp = await client.post(
                "https://acleddata.com/oauth/token",
                data={
                    "username": email,
                    "password": password,
                    "grant_type": "password",
                    "client_id": "acled",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            token_resp.raise_for_status()
            access_token = token_resp.json().get("access_token", "")

            if not access_token:
                return _fail("acled", "Failed to obtain ACLED token")

            # Fetch recent events
            resp = await client.get(
                "https://api.acleddata.com/acled/read",
                params={
                    "limit": 200,
                    "fields": "event_id_cnty|event_date|event_type|sub_event_type|actor1|actor2|country|admin1|location|latitude|longitude|fatalities|source",
                },
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            payload = resp.json()

        raw_events = payload.get("data", [])
        events = []
        for ev in raw_events[:200]:
            try:
                events.append({
                    "id": ev.get("event_id_cnty", ""),
                    "date": ev.get("event_date", ""),
                    "type": ev.get("event_type", ""),
                    "sub_type": ev.get("sub_event_type", ""),
                    "actor1": ev.get("actor1", ""),
                    "actor2": ev.get("actor2", ""),
                    "country": ev.get("country", ""),
                    "admin1": ev.get("admin1", ""),
                    "location": ev.get("location", ""),
                    "lat": float(ev.get("latitude", 0)),
                    "lon": float(ev.get("longitude", 0)),
                    "fatalities": int(ev.get("fatalities", 0)),
                    "source": ev.get("source", ""),
                })
            except (ValueError, KeyError):
                continue

        return _ok(events, "acled")
    except Exception as e:
        return _fail("acled", str(e))


# ──────────────────────────────────────────────────────────────────────────────
# Finnhub — Market Quotes
# ──────────────────────────────────────────────────────────────────────────────

FINNHUB_SYMBOLS = {
    "brent_crude": "OANDA:BCO_USD",
    "gold": "OANDA:XAU_USD",
    "sp500": "OANDA:SPX500_USD",
    "natural_gas": "OANDA:NATGAS_USD",
    "eurusd": "OANDA:EUR_USD",
    "usdjpy": "OANDA:USD_JPY",
}


@router.get("/markets")
async def live_markets():
    """Fetch commodity & index quotes from Finnhub."""
    key = os.getenv("FINNHUB_API_KEY", "")
    if not key:
        return _fail("finnhub", "FINNHUB_API_KEY not set")

    try:
        quotes = {}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            for name, symbol in FINNHUB_SYMBOLS.items():
                try:
                    resp = await client.get(
                        "https://finnhub.io/api/v1/quote",
                        params={"symbol": symbol, "token": key},
                    )
                    resp.raise_for_status()
                    q = resp.json()
                    quotes[name] = {
                        "symbol": symbol,
                        "price": q.get("c", 0),
                        "change": q.get("d", 0),
                        "change_pct": q.get("dp", 0),
                        "high": q.get("h", 0),
                        "low": q.get("l", 0),
                        "open": q.get("o", 0),
                        "prev_close": q.get("pc", 0),
                    }
                except Exception:
                    quotes[name] = {"symbol": symbol, "error": "fetch_failed"}

        return _ok(quotes, "finnhub")
    except Exception as e:
        return _fail("finnhub", str(e))


# ──────────────────────────────────────────────────────────────────────────────
# FRED — Economic Indicators
# ──────────────────────────────────────────────────────────────────────────────

FRED_SERIES = {
    "unemployment_claims": "ICSA",
    "cpi": "CPIAUCSL",
    "gdp": "GDP",
    "fed_funds_rate": "FEDFUNDS",
    "consumer_sentiment": "UMCSENT",
}


@router.get("/economic")
async def live_economic():
    """Fetch latest FRED economic indicator observations."""
    key = os.getenv("FRED_API_KEY", "")
    if not key:
        return _fail("fred", "FRED_API_KEY not set")

    try:
        indicators = {}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            for name, series_id in FRED_SERIES.items():
                try:
                    resp = await client.get(
                        "https://api.stlouisfed.org/fred/series/observations",
                        params={
                            "series_id": series_id,
                            "api_key": key,
                            "file_type": "json",
                            "sort_order": "desc",
                            "limit": 2,
                        },
                    )
                    resp.raise_for_status()
                    obs = resp.json().get("observations", [])
                    if obs:
                        current = obs[0]
                        prev = obs[1] if len(obs) > 1 else None
                        current_val = float(current.get("value", 0)) if current.get("value", ".") != "." else 0
                        prev_val = float(prev.get("value", 0)) if prev and prev.get("value", ".") != "." else 0
                        change = current_val - prev_val if prev_val else 0
                        indicators[name] = {
                            "series_id": series_id,
                            "value": current_val,
                            "date": current.get("date", ""),
                            "previous": prev_val,
                            "change": round(change, 4),
                            "change_pct": round((change / prev_val * 100), 2) if prev_val else 0,
                        }
                except Exception:
                    indicators[name] = {"series_id": series_id, "error": "fetch_failed"}

        return _ok(indicators, "fred")
    except Exception as e:
        return _fail("fred", str(e))


# ──────────────────────────────────────────────────────────────────────────────
# EIA — Energy Data
# ──────────────────────────────────────────────────────────────────────────────

EIA_SERIES = {
    "crude_stocks": "PET.WCESTUS1.W",
    "spr_level": "PET.WCSSTUS1.W",
    "crude_production": "PET.WCRFPUS2.W",
    "gasoline_stocks": "PET.WGTSTUS1.W",
}


@router.get("/energy")
async def live_energy():
    """Fetch EIA weekly petroleum data."""
    key = os.getenv("EIA_API_KEY", "")
    if not key:
        return _fail("eia", "EIA_API_KEY not set")

    try:
        series_data = {}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            for name, series_id in EIA_SERIES.items():
                try:
                    resp = await client.get(
                        "https://api.eia.gov/v2/seriesid/" + series_id,
                        params={"api_key": key},
                    )
                    resp.raise_for_status()
                    payload = resp.json()
                    data_list = payload.get("response", {}).get("data", [])
                    if data_list:
                        latest = data_list[0]
                        prev = data_list[1] if len(data_list) > 1 else None
                        val = float(latest.get("value", 0))
                        prev_val = float(prev.get("value", 0)) if prev else 0
                        series_data[name] = {
                            "series_id": series_id,
                            "value": val,
                            "period": latest.get("period", ""),
                            "units": payload.get("response", {}).get("units", ""),
                            "previous": prev_val,
                            "change": round(val - prev_val, 2),
                        }
                except Exception:
                    series_data[name] = {"series_id": series_id, "error": "fetch_failed"}

        return _ok(series_data, "eia")
    except Exception as e:
        return _fail("eia", str(e))


# ──────────────────────────────────────────────────────────────────────────────
# OpenSky — Flight Tracking
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/flights")
async def live_flights():
    """Fetch all tracked aircraft from OpenSky Network."""
    client_id = os.getenv("OPENSKY_CLIENT_ID", "")
    client_secret = os.getenv("OPENSKY_CLIENT_SECRET", "")

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=10.0)) as client:
            auth = (client_id, client_secret) if client_id and client_secret else None
            resp = await client.get(
                "https://opensky-network.org/api/states/all",
                auth=auth,
            )
            resp.raise_for_status()
            payload = resp.json()

        states = payload.get("states", [])
        flights = []
        for s in states[:300]:  # Cap at 300
            if s[5] is None or s[6] is None:
                continue
            flights.append({
                "icao24": s[0],
                "callsign": (s[1] or "").strip(),
                "origin_country": s[2],
                "lat": s[6],
                "lon": s[5],
                "altitude": s[7] or s[13],
                "velocity": s[9],
                "heading": s[10],
                "on_ground": s[8],
                "squawk": s[14],
            })

        return _ok(flights, "opensky")
    except Exception as e:
        return _fail("opensky", str(e))


# ──────────────────────────────────────────────────────────────────────────────
# Corridor Risk — Maritime Corridor Risk Scores
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/corridors")
async def live_corridors():
    """Fetch maritime corridor risk scores (no auth required)."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            corridors_resp = await client.get("https://corridorrisk.io/api/corridors")
            corridors_resp.raise_for_status()
            corridors = corridors_resp.json()

        enriched = []
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            for corridor in corridors[:15]:
                slug = corridor if isinstance(corridor, str) else corridor.get("slug", "")
                if not slug:
                    continue
                try:
                    score_resp = await client.get(f"https://corridorrisk.io/api/score/{slug}")
                    score_resp.raise_for_status()
                    score_data = score_resp.json()
                    enriched.append({
                        "corridor": slug,
                        "score": score_data,
                    })
                except Exception:
                    enriched.append({"corridor": slug, "score": None})

        return _ok(enriched, "corridor_risk")
    except Exception as e:
        return _fail("corridor_risk", str(e))


# ──────────────────────────────────────────────────────────────────────────────
# RSS News Feeds
# ──────────────────────────────────────────────────────────────────────────────

RSS_FEEDS = [
    {"name": "Reuters World", "url": "https://feeds.reuters.com/reuters/worldNews", "category": "world"},
    {"name": "AP Top News", "url": "https://rsshub.app/apnews/topics/apf-topnews", "category": "world"},
    {"name": "Al Jazeera", "url": "https://www.aljazeera.com/xml/rss/all.xml", "category": "world"},
    {"name": "BBC World", "url": "https://feeds.bbci.co.uk/news/world/rss.xml", "category": "world"},
    {"name": "Defense One", "url": "https://www.defenseone.com/rss/", "category": "defense"},
    {"name": "The War Zone", "url": "https://www.thedrive.com/the-war-zone/feed", "category": "defense"},
    {"name": "Maritime Executive", "url": "https://maritime-executive.com/rss", "category": "maritime"},
    {"name": "CNBC Markets", "url": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258", "category": "finance"},
    {"name": "Reuters Business", "url": "https://feeds.reuters.com/reuters/businessNews", "category": "finance"},
    {"name": "Ars Technica Security", "url": "https://feeds.arstechnica.com/arstechnica/security", "category": "cyber"},
    {"name": "Threat Post", "url": "https://threatpost.com/feed/", "category": "cyber"},
    {"name": "Climate Home News", "url": "https://www.climatechangenews.com/feed/", "category": "climate"},
]


def _parse_rss_xml(xml_text: str, feed_name: str, category: str) -> list[dict]:
    """Parse RSS/Atom XML into normalized news items."""
    items = []
    try:
        root = ET.fromstring(xml_text)

        # RSS 2.0
        rss_items = root.findall(".//item")
        for item in rss_items[:5]:
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            pub_date = (item.findtext("pubDate") or "").strip()
            desc = (item.findtext("description") or "").strip()[:300]
            if title:
                items.append({
                    "title": title,
                    "link": link,
                    "pubDate": pub_date,
                    "description": desc,
                    "source": feed_name,
                    "category": category,
                })

        # Atom fallback
        if not items:
            ns = {"atom": "http://www.w3.org/2005/Atom"}
            entries = root.findall(".//atom:entry", ns) or root.findall(".//{http://www.w3.org/2005/Atom}entry")
            for entry in entries[:5]:
                title = ""
                link = ""
                pub_date = ""
                for child in entry:
                    tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                    if tag == "title":
                        title = (child.text or "").strip()
                    elif tag == "link":
                        link = child.get("href", "")
                    elif tag in ("published", "updated"):
                        pub_date = (child.text or "").strip()
                if title:
                    items.append({
                        "title": title,
                        "link": link,
                        "pubDate": pub_date,
                        "description": "",
                        "source": feed_name,
                        "category": category,
                    })
    except ET.ParseError:
        pass
    return items


@router.get("/news")
async def live_news():
    """Fetch and parse RSS feeds from major news outlets."""
    all_items: list[dict] = []

    async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0), follow_redirects=True) as client:
        for feed in RSS_FEEDS:
            try:
                resp = await client.get(feed["url"], headers={"User-Agent": "PIP-Intel/1.0"})
                if resp.status_code == 200:
                    items = _parse_rss_xml(resp.text, feed["name"], feed["category"])
                    all_items.extend(items)
            except Exception:
                continue

    # Sort by pubDate descending (newest first), best effort
    def parse_date(item: dict) -> float:
        try:
            from email.utils import parsedate_to_datetime
            return parsedate_to_datetime(item.get("pubDate", "")).timestamp()
        except Exception:
            return 0.0

    all_items.sort(key=parse_date, reverse=True)

    return _ok(all_items[:50], "rss_feeds")


# ──────────────────────────────────────────────────────────────────────────────
# Combined Live Events — Unified feed for the frontend
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/events")
async def live_events():
    """Combined event feed from multiple sources for the Live Intelligence Feed."""
    events = []
    now = datetime.now(timezone.utc)

    # 1. Try ACLED conflicts
    try:
        acled_data = await live_conflicts()
        if acled_data.get("success") and acled_data.get("data"):
            for ev in acled_data["data"][:5]:
                severity = "critical" if ev.get("fatalities", 0) > 10 else "high" if ev.get("fatalities", 0) > 0 else "medium"
                events.append({
                    "id": f"acled_{ev.get('id', '')}",
                    "source": "ACLED Conflict",
                    "category": "conflict",
                    "severity": severity,
                    "title": f"{ev.get('type', 'Conflict')} in {ev.get('location', ev.get('country', 'Unknown'))}: {ev.get('actor1', '')} vs {ev.get('actor2', '')}",
                    "location": f"{ev.get('location', '')}, {ev.get('country', '')}",
                    "timestamp": ev.get("date", now.isoformat()),
                    "lat": ev.get("lat"),
                    "lon": ev.get("lon"),
                })
    except Exception:
        pass

    # 2. Try NASA FIRMS fires
    try:
        fires_data = await live_fires()
        if fires_data.get("success") and fires_data.get("data"):
            # Group fires by region (rough grid)
            clusters: dict[str, list] = {}
            for f in fires_data["data"][:100]:
                grid_key = f"{round(f['lat'], 0)}_{round(f['lon'], 0)}"
                clusters.setdefault(grid_key, []).append(f)

            for key, cluster in list(clusters.items())[:5]:
                avg_lat = sum(f["lat"] for f in cluster) / len(cluster)
                avg_lon = sum(f["lon"] for f in cluster) / len(cluster)
                total_frp = sum(f.get("frp", 0) for f in cluster)
                severity = "critical" if len(cluster) > 20 else "high" if len(cluster) > 5 else "medium"

                events.append({
                    "id": f"firms_{key}",
                    "source": "NASA FIRMS",
                    "category": "climate",
                    "severity": severity,
                    "title": f"{len(cluster)} active fire hotspots detected — total FRP: {total_frp:.0f} MW",
                    "location": f"Region {avg_lat:.1f}°, {avg_lon:.1f}°",
                    "timestamp": cluster[0].get("acq_date", now.isoformat()),
                    "lat": avg_lat,
                    "lon": avg_lon,
                })
    except Exception:
        pass

    # 3. Try market data
    try:
        market_data = await live_markets()
        if market_data.get("success") and market_data.get("data"):
            for name, quote in market_data["data"].items():
                if "error" in quote:
                    continue
                change_pct = quote.get("change_pct", 0)
                if abs(change_pct) > 1.0:  # Only significant moves
                    direction = "surges" if change_pct > 0 else "plunges"
                    severity = "high" if abs(change_pct) > 3 else "medium"
                    events.append({
                        "id": f"finnhub_{name}",
                        "source": "Finnhub Markets",
                        "category": "economic",
                        "severity": severity,
                        "title": f"{name.replace('_', ' ').title()} {direction} {abs(change_pct):.1f}% to ${quote.get('price', 0):.2f}",
                        "location": "Global Markets",
                        "timestamp": now.isoformat(),
                    })
    except Exception:
        pass

    # 4. Try news headlines
    try:
        news_data = await live_news()
        if news_data.get("success") and news_data.get("data"):
            for item in news_data["data"][:5]:
                events.append({
                    "id": f"news_{hash(item.get('title', ''))}",
                    "source": item.get("source", "RSS"),
                    "category": item.get("category", "world"),
                    "severity": "medium",
                    "title": item.get("title", ""),
                    "location": "Global",
                    "timestamp": item.get("pubDate", now.isoformat()),
                    "link": item.get("link", ""),
                })
    except Exception:
        pass

    # 5. Try corridor risk
    try:
        corridor_data = await live_corridors()
        if corridor_data.get("success") and corridor_data.get("data"):
            for c in corridor_data["data"][:3]:
                score = c.get("score", {})
                if isinstance(score, dict) and score:
                    risk_level = score.get("risk_level", score.get("level", "unknown"))
                    events.append({
                        "id": f"corridor_{c.get('corridor', '')}",
                        "source": "Corridor Risk",
                        "category": "maritime",
                        "severity": "high" if risk_level in ("high", "critical") else "medium",
                        "title": f"Maritime corridor '{c.get('corridor', '').replace('-', ' ').title()}' risk: {risk_level}",
                        "location": c.get("corridor", "").replace("-", " ").title(),
                        "timestamp": now.isoformat(),
                    })
    except Exception:
        pass

    return _ok(events, "combined")
