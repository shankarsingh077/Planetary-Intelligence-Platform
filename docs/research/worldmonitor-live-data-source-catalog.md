# Worldmonitor Live Data Source Catalog (For PIP Integration)

Date: 2026-03-29
Purpose: Map major live source families visible in worldmonitor and identify direct connector opportunities for this platform.

## Current ingestion posture in PIP

Manual browser ingest has been removed.

Current path is connector-driven only:

1. Connector runtime fetches upstream live sources.
2. Transform + enrich jobs normalize to canonical events.
3. Enriched JSONL is published to cloud feed storage.
4. Web API materializes live feed records for console, counters, and map.

## Deep source analysis extracted from worldmonitor

Worldmonitor source references indicate a multi-domain feed strategy with explicit env-key controls and graceful degraded behavior for missing credentials.

### Signals seen in worldmonitor configuration and changelog

1. Explicit env controls found for our key Wave 2 targets:
	- `ACLED_ACCESS_TOKEN`, `ACLED_EMAIL`, `ACLED_PASSWORD`
	- `EIA_API_KEY`
	- `AVIATIONSTACK_API`
	- `ABUSEIPDB_API_KEY`
2. Economic and conflict APIs are represented as first-class service contracts (proto definitions for conflict/economic/intelligence domains).
3. Changelog patterns show production hardening themes:
	- Circuit-breaker and cache tuning around FRED/EIA/GDELT.
	- Graceful fallback behavior when keys are missing.
	- Relay-side aggregation for high-volume sources (aviation/AIS).
4. Cyber source graph explicitly includes AbuseIPDB alongside other IOC feeds (URLhaus, OTX, Feodo, etc.).

### What this implies for PIP source strategy

1. API keys are necessary but not sufficient; per-source caching and rate policy are mandatory.
2. Conflict/economic/aviation/cyber should be separated into independent connector SLA classes.
3. Fallback continuity records should remain in place for operator continuity, but carry provenance (`credential_missing`/`fallback`) for downstream confidence scoring.
4. Source-level legal/licensing gates are required before promoting to production.

## Live source families identified in worldmonitor codebase

Observed from script naming and endpoint usage patterns in worldmonitor.

### 1) Geopolitics and conflict

1. ACLED (`acleddata.com`)
2. UCDP event feeds
3. GDELT event and geo feeds (`api.gdeltproject.org`)
4. Government advisory RSS feeds

### 2) Markets and macroeconomics

1. FRED / St. Louis Fed (`api.stlouisfed.org`)
2. EIA energy datasets (`api.eia.gov`)
3. CoinGecko / CoinPaprika (`api.coingecko.com`, `api.coinpaprika.com`)
4. WTO timeseries (`api.wto.org`)
5. World Bank indicators (`api.worldbank.org`)
6. National debt and fiscal datasets (`api.fiscaldata.treasury.gov`)

### 3) Aviation, maritime, mobility

1. OpenSky and aviation schedule feeds
2. AviationStack (`api.aviationstack.com`)
3. AIS feeds and relay architecture (`aisstream.io`)
4. Planespotters public API

### 4) Climate, natural hazards, earth systems

1. Weather.gov alerts (`api.weather.gov`)
2. RainViewer weather map API (`api.rainviewer.com`)
3. Open-Meteo historical archive
4. FIRMS-style fire detections (script references)
5. Safecast radiation (`api.safecast.org`)

### 5) Cyber and infrastructure

1. AbuseIPDB blacklist (`api.abuseipdb.com`)
2. Cloudflare radar outages (`api.cloudflare.com` radar annotations)
3. Submarine cable and service status seeders

### 6) News and narrative streams

1. Large RSS feed catalog
2. Regional media feeds
3. Security advisories and policy pages

## Can we collect all this live in PIP?

Yes, but in staged waves with legal and operational controls.

## Production credential matrix (PIP)

### Active wave (implemented)

1. GDELT
	- Credential requirement: none
	- PIP env: `GDELT_API_ENDPOINT`, `GDELT_QUERY`, `GDELT_MAX_RECORDS`
2. Weather.gov
	- Credential requirement: none (User-Agent recommended)
	- PIP env: `WEATHER_GOV_API_ENDPOINT`
3. FRED
	- Credential requirement: optional for current CSV path; key recommended for expanded API usage
	- PIP env: `FRED_API_ENDPOINT`
4. CoinGecko
	- Credential requirement: optional for public tier, key recommended for higher quotas
	- PIP env: `COINGECKO_API_ENDPOINT`
5. ACLED
	- Credential requirement: required for live API access
	- PIP env: `ACLED_EMAIL`, `ACLED_ACCESS_KEY` (or `ACLED_ACCESS_TOKEN`), `ACLED_API_ENDPOINT`, `ACLED_LIMIT`
6. EIA
	- Credential requirement: key recommended/required depending endpoint and quota
	- PIP env: `EIA_API_KEY`, `EIA_API_ENDPOINT`
7. AviationStack
	- Credential requirement: required
	- PIP env: `AVIATIONSTACK_API_KEY` (or `AVIATIONSTACK_API`), `AVIATIONSTACK_API_ENDPOINT`, `AVIATIONSTACK_LIMIT`
8. AbuseIPDB
	- Credential requirement: required
	- PIP env: `ABUSEIPDB_API_KEY`, `ABUSEIPDB_API_ENDPOINT`, `ABUSEIPDB_CONFIDENCE_MIN`, `ABUSEIPDB_LIMIT`

### Next expansion candidates (not yet implemented)

1. UCDP: conflict depth and historical coverage.
2. OpenSky/AIS: higher-frequency mobility and chokepoint risk.
3. FIRMS/Safecast/Rainviewer: environmental risk and anomaly context.
4. Multi-source cyber fusion (URLhaus/OTX/C2Intel) beyond AbuseIPDB.

## Recommended ingestion wave plan for PIP

### Wave 1 (immediate, no heavy licensing)

1. RSS geopolitics and regulation feeds
2. Weather.gov active alerts
3. FRED core macro indicators
4. CoinGecko spot metrics
5. GDELT geo feed

### Wave 2 (credentials and rate controls)

1. ACLED with approved credentials (implemented in connector runtime)
2. EIA detailed energy feeds (implemented in connector runtime)
3. AviationStack and selected flight feeds (implemented in connector runtime)
4. AbuseIPDB and outage monitors (implemented AbuseIPDB connector)

### Wave 3 (higher complexity)

1. AIS live stream ingestion + replay
2. Expanded aviation and maritime intelligence graph links
3. Multi-domain correlation and causality edges

## Implementation notes for PIP

1. Keep connector SLA and quality scores enforced for every new source.
2. Require source-level legal approval metadata before production activation.
3. Persist raw immutable payloads and normalized canonical events side by side.
4. Attach provenance and confidence factors in every transformed record.

## Immediate next connector candidates in this repo

1. `gdelt_geo_connector`
2. `weather_alerts_connector`
3. `fred_macro_connector`
4. `coingecko_market_connector`
5. `ucdp_conflict_connector`
6. `opensky_air_connector`
7. `ais_chokepoint_connector`
8. `urlhaus_otx_cyber_connector`
