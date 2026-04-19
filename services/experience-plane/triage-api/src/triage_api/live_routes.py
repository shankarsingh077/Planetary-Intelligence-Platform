"""
live_routes.py — Live data proxy endpoints

Proxies external API calls to keep keys server-side.
Each endpoint returns: { success: bool, data: ..., source: str, source_url: str, timestamp: str }
On failure returns { success: false, error: str } so frontend can fall back to seed.

Phase 2+3 enhancements:
- TTL caching to avoid redundant external calls
- source_url for credibility/provenance layer
- Server-side news region filtering
- /conflict-stats aggregation endpoint
"""

from __future__ import annotations

import os
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Query

from .cache import cache

router = APIRouter(prefix="/v1/live", tags=["live"])

TIMEOUT = httpx.Timeout(15.0, connect=8.0)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ok(data: Any, source: str, source_url: str = "") -> dict:
    return {
        "success": True,
        "data": data,
        "source": source,
        "source_url": source_url,
        "timestamp": _now_iso(),
        "item_count": len(data) if isinstance(data, list) else 0,
    }


def _fail(source: str, error: str) -> dict:
    return {"success": False, "data": None, "source": source, "error": error, "timestamp": _now_iso()}


def _parse_timestamp(value: str | None) -> float:
    if not value:
        return 0.0

    text = str(value).strip()
    if not text:
        return 0.0

    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).timestamp()
    except Exception:
        pass

    try:
        return parsedate_to_datetime(text).timestamp()
    except Exception:
        pass

    for fmt in ("%Y-%m-%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=timezone.utc).timestamp()
        except Exception:
            continue

    return 0.0


# ──────────────────────────────────────────────────────────────────────────────
# NASA FIRMS — Active Fire Hotspots
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/fires")
async def live_fires():
    """Fetch active fire hotspots from NASA FIRMS (last 24h, VIIRS/MODIS)."""
    cached = cache.get("fires", ttl_seconds=300)
    if cached:
        return cached

    key = os.getenv("NASA_FIRMS_API_KEY", "")
    if not key:
        return cache.get_last_known_good("fires", "nasa_firms") or _fail("nasa_firms", "NASA_FIRMS_API_KEY not set")

    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/VIIRS_SNPP_NRT/world/1"

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(url)
            resp.raise_for_status()

        lines = resp.text.strip().split("\n")
        if len(lines) < 2:
            return cache.get_last_known_good("fires", "nasa_firms") or _fail("nasa_firms", "No data returned")

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

        result = _ok(fires, "nasa_firms", source_url="https://firms.modaps.eosdis.nasa.gov/")
        cache.set("fires", result)
        return result
    except Exception as e:
        return cache.get_last_known_good("fires", "nasa_firms") or _fail("nasa_firms", str(e))


# ──────────────────────────────────────────────────────────────────────────────
# ACLED — Conflict Events
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/conflicts")
async def live_conflicts():
    """Fetch recent conflict events from ACLED (last 7 days)."""
    cached = cache.get("conflicts", ttl_seconds=600)
    if cached:
        return cached

    email = os.getenv("ACLED_EMAIL", "")
    password = os.getenv("ACLED_PASSWORD", "")

    if not email or not password:
        return cache.get_last_known_good("conflicts", "acled") or _fail("acled", "ACLED credentials not set")

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
                return cache.get_last_known_good("conflicts", "acled") or _fail("acled", "Failed to obtain ACLED token")

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

        result = _ok(events, "acled", source_url="https://acleddata.com/")
        cache.set("conflicts", result)
        return result
    except Exception as e:
        return cache.get_last_known_good("conflicts", "acled") or _fail("acled", str(e))


# ──────────────────────────────────────────────────────────────────────────────
# Finnhub — Market Quotes
# ──────────────────────────────────────────────────────────────────────────────

FINNHUB_SYMBOLS = {
    # Commodities (ETFs that track them - work on free tier)
    "brent_crude": "BNO",       # United States Brent Oil Fund
    "wti_crude": "USO",         # United States Oil Fund
    "gold": "GLD",              # SPDR Gold Shares
    "silver": "SLV",            # iShares Silver Trust
    "natural_gas": "UNG",       # United States Natural Gas Fund
    "copper": "CPER",           # United States Copper Index Fund
    # Major Indices (ETFs)
    "sp500": "SPY",             # SPDR S&P 500 ETF
    "dow_jones": "DIA",         # SPDR Dow Jones ETF
    "nasdaq": "QQQ",            # Invesco QQQ Trust (NASDAQ-100)
    "russell2000": "IWM",       # iShares Russell 2000
    # Forex proxies (ETFs)
    "us_dollar": "UUP",         # Invesco DB US Dollar Index
    "euro": "FXE",              # Invesco CurrencyShares Euro Trust
    # Defense & Energy stocks (geopolitically relevant)
    "lockheed": "LMT",          # Lockheed Martin
    "exxon": "XOM",             # Exxon Mobil
}


@router.get("/markets")
async def live_markets():
    """Fetch commodity & index quotes from Finnhub."""
    cached = cache.get("markets", ttl_seconds=30)
    if cached:
        return cached

    key = os.getenv("FINNHUB_API_KEY", "")
    if not key:
        return cache.get_last_known_good("markets", "finnhub") or _fail("finnhub", "FINNHUB_API_KEY not set")

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

        result = _ok(quotes, "finnhub", source_url="https://finnhub.io/")
        cache.set("markets", result)
        return result
    except Exception as e:
        return cache.get_last_known_good("markets", "finnhub") or _fail("finnhub", str(e))


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
    "crude_stocks": ("PET.WCESTUS1.W", "Crude Oil Stocks (Mbbl)"),
    "spr_level": ("PET.WCSSTUS1.W", "SPR Level (Mbbl)"),
    "crude_production": ("PET.WCRFPUS2.W", "Crude Production (Mbbl/d)"),
    "gasoline_stocks": ("PET.WGTSTUS1.W", "Gasoline Stocks (Mbbl)"),
    "distillate_stocks": ("PET.WDISTUS1.W", "Distillate Stocks (Mbbl)"),
    "crude_imports": ("PET.WCRIMUS2.W", "Crude Imports (Mbbl/d)"),
}


@router.get("/energy")
async def live_energy():
    """Fetch EIA weekly petroleum data."""
    key = os.getenv("EIA_API_KEY", "")
    if not key:
        return _fail("eia", "EIA_API_KEY not set")

    # Check cache first
    cached = cache.get("energy")
    if cached:
        return _ok(cached, "eia", "https://www.eia.gov/opendata/")

    try:
        series_data: dict = {}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            for name, (series_id, label) in EIA_SERIES.items():
                try:
                    # EIA v2 API format
                    resp = await client.get(
                        f"https://api.eia.gov/v2/seriesid/{series_id}",
                        params={"api_key": key, "num": "2"},
                    )
                    if resp.status_code != 200:
                        # Try alternative v1 endpoint
                        resp = await client.get(
                            "https://api.eia.gov/series/",
                            params={"api_key": key, "series_id": series_id},
                        )
                    resp.raise_for_status()
                    payload = resp.json()

                    # v2 format
                    data_list = payload.get("response", {}).get("data", [])
                    if not data_list:
                        # v1 format fallback
                        series_list = payload.get("series", [])
                        if series_list:
                            data_list = [
                                {"value": d[1], "period": d[0]}
                                for d in series_list[0].get("data", [])[:2]
                            ]

                    if data_list:
                        latest = data_list[0]
                        prev = data_list[1] if len(data_list) > 1 else None
                        val = float(latest.get("value", 0) or 0)
                        prev_val = float(prev.get("value", 0) or 0) if prev else 0
                        series_data[name] = {
                            "series_id": series_id,
                            "label": label,
                            "value": val,
                            "period": latest.get("period", ""),
                            "previous": prev_val,
                            "change": round(val - prev_val, 2),
                            "change_pct": round((val - prev_val) / prev_val * 100, 2) if prev_val else 0,
                        }
                except Exception:
                    series_data[name] = {"series_id": series_id, "label": label, "error": "fetch_failed"}

        if series_data:
            cache.set("energy", series_data)
        return _ok(series_data, "eia", "https://www.eia.gov/opendata/")
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
    # ─── Major Wire Services & World News ─────────────────────
    {"name": "Reuters World", "url": "https://feeds.reuters.com/reuters/worldNews", "category": "world"},
    {"name": "AP Top News", "url": "https://rsshub.app/apnews/topics/apf-topnews", "category": "world"},
    {"name": "Al Jazeera", "url": "https://www.aljazeera.com/xml/rss/all.xml", "category": "world"},
    {"name": "BBC World", "url": "https://feeds.bbci.co.uk/news/world/rss.xml", "category": "world"},
    {"name": "France24", "url": "https://www.france24.com/en/rss", "category": "world"},
    {"name": "DW News", "url": "https://rss.dw.com/xml/rss-en-world", "category": "world"},
    {"name": "NPR World", "url": "https://feeds.npr.org/1004/rss.xml", "category": "world"},
    # ─── Security & Defense ───────────────────────────────────
    {"name": "Defense One", "url": "https://www.defenseone.com/rss/", "category": "defense"},
    {"name": "The War Zone", "url": "https://www.thedrive.com/the-war-zone/feed", "category": "defense"},
    {"name": "Military Times", "url": "https://www.militarytimes.com/arc/outboundfeeds/rss/", "category": "defense"},
    {"name": "Janes", "url": "https://www.janes.com/feeds/news", "category": "defense"},
    # ─── Finance & Energy ─────────────────────────────────────
    {"name": "CNBC Markets", "url": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258", "category": "finance"},
    {"name": "Reuters Business", "url": "https://feeds.reuters.com/reuters/businessNews", "category": "finance"},
    {"name": "Bloomberg Energy", "url": "https://feeds.bloomberg.com/energy/news.rss", "category": "energy"},
    {"name": "OilPrice.com", "url": "https://oilprice.com/rss/main", "category": "energy"},
    # ─── Maritime & Logistics ─────────────────────────────────
    {"name": "Maritime Executive", "url": "https://maritime-executive.com/rss", "category": "maritime"},
    {"name": "gCaptain", "url": "https://gcaptain.com/feed/", "category": "maritime"},
    # ─── Cyber & Technology ───────────────────────────────────
    {"name": "Ars Technica Security", "url": "https://feeds.arstechnica.com/arstechnica/security", "category": "cyber"},
    {"name": "Threat Post", "url": "https://threatpost.com/feed/", "category": "cyber"},
    {"name": "The Record", "url": "https://therecord.media/feed", "category": "cyber"},
    # ─── Climate & Environment ────────────────────────────────
    {"name": "Climate Home News", "url": "https://www.climatechangenews.com/feed/", "category": "climate"},
    {"name": "Carbon Brief", "url": "https://www.carbonbrief.org/feed", "category": "climate"},
]


def _parse_rss_xml(xml_text: str, feed_name: str, category: str) -> list[dict]:
    """Parse RSS/Atom XML into normalized news items."""
    items = []
    try:
        root = ET.fromstring(xml_text)

        # RSS 2.0
        rss_items = root.findall(".//item")
        for item in rss_items[:8]:
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


REGION_KEYWORDS: dict[str, list[str]] = {
    "us": ["united states", "us ", "usa", "america", "washington", "trump", "biden", "congress", "pentagon", "white house", "federal"],
    "europe": ["europe", "eu ", "nato", "uk", "britain", "germany", "france", "ukraine", "russia", "brussels", "london", "paris", "berlin"],
    "middle-east": ["middle east", "iran", "israel", "gaza", "yemen", "saudi", "syria", "iraq", "lebanon", "houthi", "hezbollah"],
    "africa": ["africa", "niger", "sudan", "ethiopia", "somalia", "sahel", "congo", "kenya", "nigeria", "sahara"],
    "asia-pacific": ["asia", "pacific", "china", "japan", "korea", "taiwan", "india", "philippines", "indonesia", "vietnam", "south china sea"],
    "latin-america": ["latin america", "brazil", "mexico", "argentina", "venezuela", "colombia", "peru", "chile", "caribbean"],
}


@router.get("/news")
async def live_news(region: str | None = Query(default=None, description="Filter by region")):
    """Fetch and parse RSS feeds from major news outlets. Optional region filter."""
    cached = cache.get("news_all", ttl_seconds=120)
    if cached:
        all_items = cached.get("data", []) if isinstance(cached, dict) else []
    else:
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
        all_items = all_items[:50]
        full_result = _ok(all_items, "rss_feeds", source_url="")
        cache.set("news_all", full_result)

    # Apply region filter if specified
    if region and region in REGION_KEYWORDS:
        keywords = REGION_KEYWORDS[region]
        filtered = [
            item for item in all_items
            if any(kw in (item.get("title", "") + " " + item.get("description", "")).lower() for kw in keywords)
        ]
        return _ok(filtered[:20], "rss_feeds", source_url="")

    return _ok(all_items[:50], "rss_feeds", source_url="")


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

    events.sort(key=lambda event: _parse_timestamp(event.get("timestamp")), reverse=True)
    return _ok(events[:40], "combined")


# ──────────────────────────────────────────────────────────────────────────────
# Conflict Zone Statistics — Aggregate ACLED data by region
# ──────────────────────────────────────────────────────────────────────────────

_CONFLICT_ZONE_BOUNDS = {
    "ukraine": {"lat_range": (44, 53), "lon_range": (22, 41)},
    "gaza": {"lat_range": (31, 32), "lon_range": (34, 35)},
    "sudan": {"lat_range": (9, 22), "lon_range": (22, 38)},
    "yemen": {"lat_range": (12, 17), "lon_range": (42, 53)},
    "myanmar": {"lat_range": (10, 28), "lon_range": (92, 101)},
    "sahel": {"lat_range": (10, 20), "lon_range": (-12, 15)},
    "haiti": {"lat_range": (18, 20), "lon_range": (-75, -71)},
    "lebanon": {"lat_range": (33, 34.7), "lon_range": (35, 37)},
}


def _top_n(items: list[str], n: int = 3) -> list[str]:
    """Return top-n most common items."""
    from collections import Counter
    return [item for item, _ in Counter(items).most_common(n) if item]


@router.get("/conflict-stats")
async def live_conflict_stats():
    """Aggregate ACLED data into conflict zone statistics."""
    conflicts = await live_conflicts()
    if not conflicts.get("success") or not conflicts.get("data"):
        return _fail("conflict_stats", "ACLED data unavailable")

    all_events = conflicts["data"]
    stats: dict[str, Any] = {}

    for zone_id, bounds in _CONFLICT_ZONE_BOUNDS.items():
        lat_lo, lat_hi = bounds["lat_range"]
        lon_lo, lon_hi = bounds["lon_range"]
        zone_events = [
            e for e in all_events
            if lat_lo <= e.get("lat", 0) <= lat_hi
            and lon_lo <= e.get("lon", 0) <= lon_hi
        ]
        total_fatalities = sum(e.get("fatalities", 0) for e in zone_events)
        stats[zone_id] = {
            "events_7d": len(zone_events),
            "fatalities_7d": total_fatalities,
            "top_event_types": _top_n([e.get("type", "") for e in zone_events]),
            "top_actors": _top_n([e.get("actor1", "") for e in zone_events]),
            "last_event_date": zone_events[0].get("date", "") if zone_events else "",
            "trend": "escalating" if len(zone_events) > 20 else "stable" if len(zone_events) > 5 else "low",
        }

    return _ok(stats, "acled_aggregated", source_url="https://acleddata.com/")
