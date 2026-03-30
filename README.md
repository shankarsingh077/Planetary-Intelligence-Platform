<p align="center">
  <img src="docs/assets/hero-banner.png" alt="Planetary Intelligence Platform" width="700"/>
</p>

<h1 align="center">🌍 Planetary Intelligence Platform</h1>

<p align="center">
  <b>Real-time global situation awareness powered by multi-source intelligence fusion</b>
</p>

<p align="center">
  <a href="https://pip-web-145930903164.asia-south1.run.app">
    <img src="https://img.shields.io/badge/🔴_LIVE-Cloud_Run-00C853?style=for-the-badge&logo=google-cloud&logoColor=white" alt="Live Demo"/>
  </a>
  <img src="https://img.shields.io/badge/Status-Operational-44ff88?style=for-the-badge" alt="Status"/>
  <img src="https://img.shields.io/badge/Data_Sources-10+-FF6B6B?style=for-the-badge" alt="Data Sources"/>
  <img src="https://img.shields.io/badge/React_18-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Python-FastAPI-009688?style=for-the-badge&logo=python&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/GCP-Cloud_Run-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white" alt="GCP"/>
</p>

---

## 📡 Live Dashboard Preview

> **[👉 Access the live platform →](https://pip-web-145930903164.asia-south1.run.app)**

<p align="center">
  <img src="docs/assets/dashboard-preview.png" alt="PIP Dashboard — Global Situation Console" width="900"/>
</p>

<p align="center"><i>Global Situation Console — 8-layer intelligence overlay with conflict zones, trade routes, pipelines, military bases, ports, and strategic waterways</i></p>

---

## 🧠 What is PIP?

**Planetary Intelligence Platform (PIP)** is a production-grade, real-time global intelligence console that fuses data from **10+ heterogeneous sources** — satellite imagery, maritime AIS transponders, military aviation transponders, commodity markets, macroeconomic indicators, conflict event databases, and AI-powered analysis — into a single, unified situational awareness dashboard.

Think of it as a **command-center-grade OSINT platform** built for the modern web.

### Key Capabilities

| Capability | Description |
|:---|:---|
| **Multi-Source Fusion** | Ingests AIS maritime, NASA FIRMS fire detection, ACLED conflict events, OpenSky aviation, Finnhub markets, FRED economic data, and EIA energy data |
| **AI-Powered Analysis** | Grok AI integration for emerging pattern recognition and natural language intelligence briefs |
| **8-Layer Geo Intelligence** | Ports (55+), Pipelines (24+), Trade Routes (12), Conflict Zones (7), Strategic Waterways (13), Military Bases (30+), Intel Hotspots (20), and live alerts — all toggleable via collapsible legend panel |
| **Confidence Scoring** | Every alert carries a machine-generated confidence score (0.0–1.0) for decision support |
| **Explainable Intelligence** | Each alert decomposes into **Snapshot → Drivers → Contradictions → Forecast** |
| **Interactive Geospatial** | 2D Leaflet map with country-click intel, GeoJSON boundaries, pulsing alert markers, and rich interactive popups for every layer |
| **Fail-Soft Architecture** | Platform remains fully functional with rich seed data even when backend APIs are unreachable |
| **Real-Time Streaming** | 15-second polling with live ticker, breaking news banners, and auto-refresh |

---

## 🏗️ Architecture

<p align="center">
  <img src="docs/assets/architecture.png" alt="PIP Architecture — Three-Plane Design" width="700"/>
</p>

PIP follows a **three-plane architecture** inspired by military C4ISR systems:

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXPERIENCE PLANE                            │
│  React 18 + TypeScript │ Leaflet/Globe.gl │ SVG Icon System     │
│  Country Intel Panel   │ Live Feed Panel  │ Alert Explainability│
├─────────────────────────────────────────────────────────────────┤
│                    INTELLIGENCE PLANE                           │
│  Fusion Service │ Brief Service │ Confidence Engine │ Resolver  │
│  FastAPI + Redis Cache │ GCS Event Store │ Grok AI Integration  │
├─────────────────────────────────────────────────────────────────┤
│                       DATA PLANE                                │
│  AIS Maritime │ NASA FIRMS │ ACLED │ Finnhub │ OpenSky │ FRED  │
│  EIA Energy   │ AviationStack │ Grok AI │ GCS Connector Waves  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```mermaid
graph LR
    A[Connector Wave] -->|GCS JSONL| B[Fusion Service]
    B --> C[Confidence Engine]
    C --> D[Redis Cache]
    D --> E[Triage API]
    E -->|REST /v1/events| F[React Console]
    E -->|REST /v1/briefs/now| F
    G[Grok AI] -->|Analysis| B
    H[Seed Data] -->|Fallback| F
```

---

## 🔌 Data Sources

| Source | Type | Data | Update Frequency |
|:---|:---|:---|:---|
| **AIS Maritime** | 🚢 Maritime | Vessel positions, naval activity, port congestion | Real-time |
| **NASA FIRMS** | 🔥 Satellite | Active fire hotspots, thermal anomalies | ~3h delay |
| **ACLED** | ⚔️ Conflict | Armed conflict events, political violence | Daily |
| **OpenSky Network** | ✈️ Aviation | Military/civilian flight patterns, transponder data | Real-time |
| **Finnhub** | 📈 Financial | Commodity prices, forex, market sentiment | Real-time |
| **FRED** | 📊 Economic | Macroeconomic indicators, unemployment, CPI | Weekly |
| **EIA** | ⚡ Energy | SPR levels, crude inventory, energy forecasts | Weekly |
| **AviationStack** | 🛫 Aviation | Commercial flight tracking, delay analysis | Real-time |
| **Grok AI** | 🤖 AI/ML | Pattern recognition, threat narrative generation | On-demand |
| **GCS Events** | ☁️ Storage | Connector wave JSONL event archive | Per-wave |

---

## 🖥️ Frontend Features

### Global Posture Map
- **2D Mode**: Dark-themed Leaflet map with CARTO dark tiles, GeoJSON country boundaries, and animated alert markers
- **3D Mode**: Globe.gl WebGL globe with interactive rotation
- **Country Click Intelligence**: Click any country to reveal per-nation threat levels, active signals, confidence scores, and related alerts
- **8-Layer Toggle Legend**: Collapsible glassmorphism panel with per-layer toggle switches and a color-coded legend

### Intelligence Map Layers
- **Conflict Zones**: Dashed-red polygons for active wars (Ukraine, Gaza, Sudan, Yemen, Myanmar, Lebanon, Pak-Afghan border) with casualty/displacement data
- **Strategic Waterways**: Yellow diamond markers at 13 global chokepoints (Hormuz, Malacca, Suez, Panama, Bab el-Mandeb, etc.)
- **Global Ports**: 55+ ports color-coded by type (Container, Oil, LNG, Naval, Mixed) with throughput data
- **Oil & Gas Pipelines**: 24+ pipelines rendered as polylines (oil=orange, gas=cyan) with capacity and operator info
- **Trade Routes**: 12 major maritime corridors as dashed arcs with volume data
- **Military Bases**: 30+ bases as triangular markers color-coded by nation (US/NATO, Russia, China, France, UK, India)
- **Intel Hotspots**: 20 pulsing circle markers at geopolitical monitoring points with escalation scores (1–5)

### Live Intelligence Feed
- **Breaking News Banner**: Auto-detected critical events with flash animation  
- **Scrolling Ticker**: Real-time event stream across all data sources
- **Event Cards**: Source-attributed, severity-tagged intelligence items with geo-location

### Alert Intelligence Panel
- **Explainability Fields**: Snapshot, Drivers, Contradictions, and Forecast for every alert
- **Confidence Scoring**: ML-generated confidence with visual indicators
- **Severity Classification**: CRITICAL / HIGH / MEDIUM / LOW with color-coded badges

### Design System
- **Zero Emoji**: All icons are custom SVG components (`Icons.tsx`) for pixel-perfect rendering
- **Dark Theme**: Military-grade dark UI with `#0a0e1a` base and neon green `#44ff88` accents
- **Responsive Layout**: Draggable resize handle between map and panels
- **Monospace Typography**: SF Mono / JetBrains Mono for data-dense readability

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.12
- **Google Cloud SDK** (for deployment)
- **Docker** (for containerized builds)

### Local Development

```bash
# Clone the repository
git clone https://github.com/shankarsingh077/Planetary-Intelligence-Platform.git
cd Planetary-Intelligence-Platform

# Install frontend dependencies
cd services/experience-plane/triage-web-v2
npm install

# Start the dev server
npm run dev
# → http://localhost:5173
```

The frontend runs independently with **built-in seed data** — no backend required for development.

### Backend Setup

```bash
# From project root
pip install -r requirements.txt  # or use .venv

# Configure environment
cp .env.staging.example .env.local
# Edit .env.local with your API keys

# Start the API server
uvicorn triage_api.app:app --host 0.0.0.0 --port 8080
```

---

## ☁️ Deployment (GCP Cloud Run)

### Production Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│  Cloud Run      │───▶│  Redis Cache  │───▶│  GCS Bucket     │
│  pip-web        │    │  Memorystore  │    │  Event Archive  │
│  asia-south1    │    │  10.x.x.x    │    │  JSONL Waves    │
└─────────────────┘    └──────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Secret Manager                         │
│  API Keys: Grok, Finnhub, EIA, FRED,   │
│  AviationStack, OpenSky, AIS, ACLED,   │
│  NASA FIRMS                             │
└─────────────────────────────────────────┘
```

### Deploy

```bash
# Build and deploy to Cloud Run
gcloud builds submit --tag gcr.io/planetaryintelligenceplatform/pip-web \
  --project=planetaryintelligenceplatform

gcloud run deploy pip-web \
  --image gcr.io/planetaryintelligenceplatform/pip-web \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --dockerfile Dockerfile.web
```

### Health Check

```bash
curl https://pip-web-145930903164.asia-south1.run.app/health
# → {"status":"ok"}
```

---

## 📁 Project Structure

```
Planetary-Intelligence-Platform/
├── services/
│   ├── experience-plane/
│   │   └── triage-web-v2/          # React 18 + TypeScript frontend
│   │       ├── src/
│   │       │   ├── App.tsx          # Main application (map, layout, data flow)
│   │       │   ├── Icons.tsx        # 25+ custom SVG icon components
│   │       │   ├── LiveFeedPanel.tsx # Breaking news, ticker, event cards
│   │       │   ├── CountryPanel.tsx  # Per-country intelligence slide-in
│   │       │   ├── MapLegend.tsx     # Collapsible 8-layer toggle legend
│   │       │   ├── geoData.ts       # Static geo datasets (ports, pipelines, etc.)
│   │       │   ├── seedData.ts      # Fail-soft fallback intelligence data
│   │       │   └── styles.css       # Complete design system (1400+ lines)
│   │       ├── public/
│   │       │   └── countries-110m.geojson  # Natural Earth boundaries
│   │       └── package.json
│   ├── intelligence-plane/
│   │   ├── brief-service/           # AI-generated intelligence briefs
│   │   ├── fusion-service/          # Multi-source data fusion engine
│   │   ├── confidence-service/      # ML confidence scoring
│   │   └── entity-resolver/         # Cross-source entity resolution
│   └── triage-api/                  # FastAPI REST gateway
├── data/
│   └── demo/                        # Sample enriched events
├── infra/                           # GCP infrastructure configs
├── deploy/                          # Deployment scripts
├── docs/                            # Documentation and assets
├── Dockerfile.web                   # Multi-stage Docker build
└── .env.staging.example             # Environment template
```

---

## 🔒 Security

- All API keys are stored in **GCP Secret Manager** and injected as environment variables at runtime
- No secrets are committed to the repository
- The `/v1/ops/counters` endpoint requires authentication headers
- The `.env.local` and `.env.live.local` files are `.gitignore`-d

---

## 📊 Performance Metrics

| Metric | Value |
|:---|:---|
| **Frontend Build Size** | ~280 KB gzipped |
| **Time to Interactive** | < 2s on 3G |
| **Data Refresh Interval** | 15 seconds |
| **Alert Processing** | 10+ concurrent sources |
| **GeoJSON Resolution** | 110m (Natural Earth) |
| **Uptime Target** | 99.9% (Cloud Run SLA) |

---

## 🛣️ Roadmap

- [x] Multi-source intelligence fusion (10 connectors)
- [x] Interactive 2D/3D geospatial visualization 
- [x] Per-country intelligence panels
- [x] AI-powered alert explainability
- [x] GCP Cloud Run production deployment
- [x] Redis caching layer
- [x] Fail-soft seed data architecture
- [x] 8-layer geo intelligence overlay (ports, pipelines, trade routes, conflict zones, waterways, bases, hotspots)
- [x] Collapsible map legend with toggle switches
- [ ] WebSocket real-time streaming (replace polling)
- [ ] User authentication and role-based access
- [ ] Custom alert rules and notification pipelines
- [ ] Historical trend analysis and time-series charts
- [ ] Mobile-responsive layout optimization
- [ ] Multi-language intelligence brief generation

---

## 🧑‍💻 Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite" alt="Vite"/>
  <img src="https://img.shields.io/badge/Leaflet-1.9-199900?style=flat-square&logo=leaflet" alt="Leaflet"/>
  <img src="https://img.shields.io/badge/Globe.gl-2.35-333333?style=flat-square" alt="Globe.gl"/>
  <img src="https://img.shields.io/badge/Three.js-0.170-000000?style=flat-square&logo=three.js" alt="Three.js"/>
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python" alt="Python"/>
  <img src="https://img.shields.io/badge/Redis-7.0-DC382D?style=flat-square&logo=redis" alt="Redis"/>
  <img src="https://img.shields.io/badge/Docker-Multi_Stage-2496ED?style=flat-square&logo=docker" alt="Docker"/>
  <img src="https://img.shields.io/badge/GCP-Cloud_Run-4285F4?style=flat-square&logo=google-cloud" alt="GCP"/>
</p>

---

## 📄 License

This project is for educational and portfolio demonstration purposes.

---

<p align="center">
  <b>Built with precision by <a href="https://github.com/shankarsingh077">Shankar Singh</a></b><br/>
  <sub>Fusing planetary-scale intelligence into actionable awareness</sub>
</p>
