import { Suspense, lazy, startTransition, useEffect, useRef, useState, useCallback, useMemo, RefObject } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { getAlerts, getBrief, getCounters } from "./api";
import type { Alert, AuthConfig } from "./types";
import { SEED_ALERTS, SEED_BRIEF } from "./seedData";
import {
  fetchLiveConflicts,
  fetchLiveEvents,
  fetchLiveFlights,
  fetchLiveFires,
  fetchLiveMarkets,
  fetchLiveNews,
  type LiveConflict,
  type LiveFire,
  type LiveFlight,
  type MarketQuote,
} from "./liveApi";
import { cacheSet, cacheGetData } from "./dataCache";
import { CountryPanel } from "./CountryPanel";
import { LiveFeedPanel } from "./LiveFeedPanel";
import { LiveNewsVideoPanel, LIVE_CHANNELS } from "./LiveNewsVideoPanel";
import { CascadePage } from "./CascadePage";
import { MapLegend } from "./MapLegend";
import { loadCountriesGeoJson, preloadGlobe3D, warmMapAssets } from "./mapAssets";
import { PanelSelector } from "./components/PanelSelector";
import {
  AIInsightsPanel,
  StrategicPosturePanel,
  AIForecastsPanel,
  RegionalNewsPanel,
  MarketDataPanel,
  DataTrackingPanel,
} from "./components/panels";
import { DEFAULT_ENABLED_PANELS, PANEL_STORAGE_KEYS } from "./config/panels";
import {
  PORTS,
  PIPELINES,
  STRATEGIC_WATERWAYS,
  CONFLICT_ZONES,
  INTEL_HOTSPOTS,
  MILITARY_BASES,
  resolveTradeRouteSegments,
  DEFAULT_LAYERS,
} from "./geoData";
import type { LayerVisibility } from "./geoData";
import {
  GlobeIcon,
  SirenIcon,
  SignalIcon,
  ClipboardIcon,
  GithubIcon,
  SearchIcon,
  FileTextIcon,
  RefreshIcon,
  MapIcon,
  Globe3DIcon,
  WarningIcon,
  CrosshairIcon,
  MaximizeIcon,
  MinimizeIcon,
} from "./Icons";
import {
  buildLiveHeadlineAlerts,
  explainAlertConfidence,
  formatRelativeAlertTime,
  getAlertSourceDetails,
  getSourceCredibility,
} from "./liveAlertUtils";

const AUTH_CONFIG: AuthConfig = {
  mode: "header",
  tenantId: "tenant-demo",
  userId: "user-demo",
  roles: "analyst",
  token: "",
};

const Globe3DLazy = lazy(async () => {
  const module = await preloadGlobe3D();
  return { default: module.Globe3D };
});

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function markerColor(severity: string | undefined): string {
  if (severity === "critical") return "#ff4444";
  if (severity === "high") return "#ff8800";
  if (severity === "medium") return "#ffaa00";
  return "#44aa44";
}

function fmtConfidence(value: number | undefined): string {
  return Number(value || 0).toFixed(2);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function marketQuoteHref(symbol: string | undefined, fallbackName: string): string {
  const ticker = String(symbol || fallbackName || "").trim().toUpperCase();
  if (!ticker) return "https://finance.yahoo.com/markets/";
  return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`;
}

function escapeHtml(value: string | undefined | null): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function flightIdentity(flight: LiveFlight): string {
  return String(flight.callsign || flight.icao24 || "Unknown flight").trim().toUpperCase();
}

function formatFlightAltitude(altitude: number | null | undefined): string {
  if (typeof altitude !== "number" || !Number.isFinite(altitude)) return "Unknown";
  return `${Math.round(altitude * 3.28084).toLocaleString("en-US")} ft`;
}

function formatFlightSpeed(velocity: number | null | undefined): string {
  if (typeof velocity !== "number" || !Number.isFinite(velocity)) return "Unknown";
  return `${Math.round(velocity * 1.94384).toLocaleString("en-US")} kt`;
}

function formatFlightHeading(heading: number | null | undefined): string {
  if (typeof heading !== "number" || !Number.isFinite(heading)) return "Unknown";
  return `${Math.round(heading)}deg`;
}

function flightPopupHtml(flight: LiveFlight): string {
  return `
    <div style="min-width:220px;font-family:'Inter',monospace;">
      <div style="font-weight:700;color:#67d4ff;font-size:11px;margin-bottom:2px;">✈ OPENSKY NETWORK FLIGHT</div>
      <div style="font-size:14px;font-weight:700;margin-bottom:4px;">${escapeHtml(flightIdentity(flight))}</div>
      <div style="font-size:11px;color:#ccc;">Origin: ${escapeHtml(flight.origin_country || "Unknown")}</div>
      <div style="font-size:11px;color:#ccc;">Altitude: ${formatFlightAltitude(flight.altitude)}</div>
      <div style="font-size:11px;color:#ccc;">Speed: ${formatFlightSpeed(flight.velocity)}</div>
      <div style="font-size:11px;color:#ccc;">Heading: ${formatFlightHeading(flight.heading)}</div>
      ${flight.squawk ? `<div style="font-size:11px;color:#ccc;">Squawk: ${escapeHtml(flight.squawk)}</div>` : ""}
      <div style="font-size:10px;color:#888;margin-top:4px;">ICAO24: ${escapeHtml(String(flight.icao24 || "").toUpperCase())} · Source: OpenSky Network</div>
    </div>
  `;
}

function flightMarkerIcon(flight: LiveFlight): L.DivIcon {
  const heading = typeof flight.heading === "number" && Number.isFinite(flight.heading)
    ? Math.round(flight.heading)
    : 0;
  return L.divIcon({
    className: "aviation-flight-icon",
    html: `
      <div class="aviation-flight-marker" title="${escapeHtml(flightIdentity(flight))}">
        <span class="aviation-flight-glyph" style="transform: rotate(${heading}deg);">✈</span>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -12],
  });
}

function severityClass(severity: string | undefined): string {
  return `sev-${severity || "low"}`;
}

function syncSelectedAlert(previous: Alert | null, nextAlerts: Alert[]): Alert | null {
  if (nextAlerts.length === 0) return null;
  if (!previous) return nextAlerts[0];
  return nextAlerts.find((alert) => alert.alert_id === previous.alert_id) || nextAlerts[0];
}

function formatBrief(briefData: Record<string, unknown>): string {
  const brief = briefData as {
    generatedAt?: string;
    changed?: string[];
    whyItMatters?: string[];
    likelyNext?: string[];
    recommendedActions?: { action: string; urgency: string }[];
    confidence?: number;
  };

  const lines: string[] = [];
  lines.push(`GENERATED: ${brief.generatedAt || new Date().toISOString()}`);
  lines.push(`CONFIDENCE: ${Number(brief.confidence || 0).toFixed(2)}`);
  lines.push("");

  if (brief.changed?.length) {
    lines.push("═══ WHAT CHANGED ═══");
    brief.changed.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
    lines.push("");
  }

  if (brief.whyItMatters?.length) {
    lines.push("═══ WHY IT MATTERS ═══");
    brief.whyItMatters.forEach((w) => lines.push(`• ${w}`));
    lines.push("");
  }

  if (brief.likelyNext?.length) {
    lines.push("═══ LIKELY NEXT ═══");
    brief.likelyNext.forEach((n) => lines.push(`▸ ${n}`));
    lines.push("");
  }

  if (brief.recommendedActions?.length) {
    lines.push("═══ RECOMMENDED ACTIONS ═══");
    brief.recommendedActions.forEach((a) => {
      lines.push(`[${(a.urgency || "medium").toUpperCase()}] ${a.action}`);
    });
  }

  return lines.join("\n");
}

/* ─── Country GeoJSON styles (very subtle) ────────────────────────────── */

const COUNTRY_STYLE: L.PathOptions = {
  fillColor: "#44ff88",
  fillOpacity: 0.01, // Nearly invisible but still receives mouse events
  color: "rgba(68, 255, 136, 0.12)",
  weight: 0.8,
};

const COUNTRY_HOVER_STYLE: L.PathOptions = {
  fillColor: "#44ff88",
  fillOpacity: 0.08,
  color: "rgba(68, 255, 136, 0.5)",
  weight: 1.5,
};

/* ─── App ─────────────────────────────────────────────────────────────── */

export function App() {
  const CORE_PANEL_IDS = useMemo(() => new Set(["live-feed", "alerts", "details", "brief", "live-news-video"]), []);
  const panelBaseId = useCallback((panelId: string) => panelId.split("__")[0], []);
  const createPanelInstanceId = useCallback((baseId: string) => `${baseId}__${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, []);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selected, setSelected] = useState<Alert | null>(null);
  const [brief, setBrief] = useState<string>("Connecting to intelligence pipeline...");
  const [eventsCount, setEventsCount] = useState<number>(0);
  const [auditCount, setAuditCount] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [clock, setClock] = useState<string>("");
  const [briefTime, setBriefTime] = useState<string>("");
  const [dataMode, setDataMode] = useState<"live" | "mixed" | "fallback">("fallback");
  const [incomingAlert, setIncomingAlert] = useState<Alert | null>(null);
  const [incomingAlertCount, setIncomingAlertCount] = useState(0);
  const [alertFocusRequest, setAlertFocusRequest] = useState<{ alertId: string; seq: number } | null>(null);
  const [mapMode, setMapMode] = useState<"2d" | "3d">("2d");
  const [shouldRenderGlobe, setShouldRenderGlobe] = useState(false);
  const [mapHeight, setMapHeight] = useState<number>(() => {
    const saved = localStorage.getItem('pip-map-height');
    return saved ? Number(saved) : 45;
  });
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string } | null>(null);
  // apiReachable removed — platform always shows cached data
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(DEFAULT_LAYERS);
  const [mapReady, setMapReady] = useState(0);
  const [liveFires, setLiveFires] = useState<LiveFire[]>(cacheGetData<LiveFire[]>('app-fires', []));
  const [liveConflicts, setLiveConflicts] = useState<LiveConflict[]>(cacheGetData<LiveConflict[]>('app-conflicts', []));
  const [liveFlights, setLiveFlights] = useState<LiveFlight[]>(cacheGetData<LiveFlight[]>('app-flights', []));
  const [liveMarkets, setLiveMarkets] = useState<Record<string, MarketQuote> | null>(cacheGetData<Record<string, MarketQuote> | null>('app-markets', null));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [showPanelSelector, setShowPanelSelector] = useState(false);
  const [cascadeAlert, setCascadeAlert] = useState<Alert | null>(null);
  const [enabledPanels, setEnabledPanels] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(PANEL_STORAGE_KEYS.enabled);
    if (saved) {
      try {
        return new Set(JSON.parse(saved) as string[]);
      } catch {
        // fall through
      }
    }
    return new Set(DEFAULT_ENABLED_PANELS);
  });
  const [panelOrder, setPanelOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(PANEL_STORAGE_KEYS.order);
    if (saved) {
      try {
        return JSON.parse(saved) as string[];
      } catch {
        // fall through
      }
    }
    return [
      "live-feed",
      "alerts",
      "details",
      "brief",
      "live-news-video",
      "ai-insights",
      "strategic-posture",
      "ai-forecasts",
      "world-news",
      "us-news",
      "europe-news",
      "middle-east-news",
      "africa-news",
      "asia-pacific-news",
      "metals-materials",
      "energy-complex",
      "markets-overview",
      "fear-greed",
      "yield-curve",
      "fires",
      "armed-conflicts",
      "climate-anomalies",
      "cot-positioning",
      "unhcr-displacement",
      "consumer-prices",
    ];
  });
  const [panelSpans, setPanelSpans] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(PANEL_STORAGE_KEYS.spans);
    if (saved) {
      try {
        return JSON.parse(saved) as Record<string, number>;
      } catch {
        // fall through
      }
    }
    return {};
  });
  const [panelColSpans, setPanelColSpans] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(PANEL_STORAGE_KEYS.colSpans);
    if (saved) {
      try {
        return JSON.parse(saved) as Record<string, number>;
      } catch {
        // fall through
      }
    }
    return {};
  });
  const [liveNewsChannelByPanel, setLiveNewsChannelByPanel] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem("pip-panel-live-news-channel");
    if (saved) {
      try {
        return JSON.parse(saved) as Record<string, string>;
      } catch {
        // fall through
      }
    }
    return {};
  });
  const [settingsPanelId, setSettingsPanelId] = useState<string | null>(null);

  // Footer / header badge popup state
  const alertsChipRef = useRef<HTMLSpanElement | null>(null);
  const eventsChipRef = useRef<HTMLSpanElement | null>(null);
  const auditChipRef = useRef<HTMLSpanElement | null>(null);
  const [badgePopupType, setBadgePopupType] = useState<string | null>(null);
  const [badgePopupStyle, setBadgePopupStyle] = useState<React.CSSProperties>({});

  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const geoLayerRef = useRef<L.LayerGroup | null>(null);
  const geoJsonRef = useRef<L.GeoJSON | null>(null);
  const liveLayerRef = useRef<L.LayerGroup | null>(null);
  const timerRef = useRef<number | null>(null);
  const mapSectionRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastAlertIdsRef = useRef<string[]>([]);
  const alertMarkerRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const hasInitialAlertFrameRef = useRef(false);
  const alertFocusSeqRef = useRef(0);

  const isResizingRef = useRef(false);
  const resizeStartYRef = useRef(0);
  const resizeStartHeightRef = useRef(0);
  const dragPanelIdRef = useRef<string | null>(null);
  const panelResizeRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    startRows: number;
    startCols: number;
    mode: "corner" | "right" | "bottom";
  } | null>(null);

  const selectedAlert = selected || alerts[0] || null;
  const aviationFlights = useMemo(
    () =>
      liveFlights
        .filter(
          (flight) =>
            Number.isFinite(flight.lat) &&
            Number.isFinite(flight.lon) &&
            !flight.on_ground
        )
        .sort((left, right) => (right.velocity || 0) - (left.velocity || 0))
        .slice(0, 180),
    [liveFlights]
  );

  const handleAlertSelection = useCallback((alert: Alert, options?: { focusMap?: boolean }) => {
    setSelected(alert);
    if (options?.focusMap) {
      alertFocusSeqRef.current += 1;
      setAlertFocusRequest({ alertId: alert.alert_id, seq: alertFocusSeqRef.current });
    }
  }, []);

  /* ─── Clock ──────────────────────────────────────────────────────────── */

  useEffect(() => {
    const updateClock = () => {
      setClock(`${formatDateTime(new Date())} UTC`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  /* ─── Data refresh with seed fallback ────────────────────────────────── */

  const refreshAll = useCallback(async () => {
    setError("");

    const [
      firesResult,
      conflictsResult,
      flightsResult,
      marketsResult,
      liveEventsResult,
      liveNewsResult,
      legacyAlertsResult,
      briefResult,
      countersResult,
    ] = await Promise.allSettled([
      fetchLiveFires(),
      fetchLiveConflicts(),
      fetchLiveFlights(),
      fetchLiveMarkets(),
      fetchLiveEvents(),
      fetchLiveNews(),
      getAlerts(AUTH_CONFIG),
      getBrief(AUTH_CONFIG),
      getCounters(AUTH_CONFIG),
    ]);

    if (firesResult.status === "fulfilled" && firesResult.value) {
      setLiveFires(firesResult.value);
      cacheSet("app-fires", firesResult.value, "NASA FIRMS");
    }
    if (conflictsResult.status === "fulfilled" && conflictsResult.value) {
      setLiveConflicts(conflictsResult.value);
      cacheSet("app-conflicts", conflictsResult.value, "ACLED");
    }
    if (flightsResult.status === "fulfilled" && flightsResult.value) {
      setLiveFlights(flightsResult.value);
      cacheSet("app-flights", flightsResult.value, "OpenSky Network");
    }
    if (marketsResult.status === "fulfilled" && marketsResult.value) {
      setLiveMarkets(marketsResult.value);
      cacheSet("app-markets", marketsResult.value, "Finnhub");
    }

    const liveSourceHits = [
      firesResult.status === "fulfilled" && firesResult.value ? 1 : 0,
      conflictsResult.status === "fulfilled" && conflictsResult.value ? 1 : 0,
      flightsResult.status === "fulfilled" && flightsResult.value ? 1 : 0,
      marketsResult.status === "fulfilled" && marketsResult.value ? 1 : 0,
      liveEventsResult.status === "fulfilled" && liveEventsResult.value ? 1 : 0,
      liveNewsResult.status === "fulfilled" && liveNewsResult.value ? 1 : 0,
    ].reduce((sum, count) => sum + count, 0);

    const liveHeadlineAlerts = buildLiveHeadlineAlerts(
      liveEventsResult.status === "fulfilled" ? liveEventsResult.value : null,
      liveNewsResult.status === "fulfilled" ? liveNewsResult.value : null
    );
    const legacyAlerts = legacyAlertsResult.status === "fulfilled" ? legacyAlertsResult.value : [];
    const nextAlerts = liveHeadlineAlerts.length > 0
      ? liveHeadlineAlerts
      : legacyAlerts.length > 0
        ? legacyAlerts
        : alerts.length > 0
          ? alerts
          : SEED_ALERTS;

    if (liveHeadlineAlerts.length > 0 || legacyAlerts.length > 0 || alerts.length === 0) {
      const previousIds = lastAlertIdsRef.current;
      if (previousIds.length > 0) {
        const newAlerts = nextAlerts.filter((alert) => !previousIds.includes(alert.alert_id));
        if (newAlerts.length > 0) {
          setIncomingAlert(newAlerts[0]);
          setIncomingAlertCount(newAlerts.length);
        }
      }
      setAlerts(nextAlerts);
      setSelected((prev) => syncSelectedAlert(prev, nextAlerts));
      lastAlertIdsRef.current = nextAlerts.map((alert) => alert.alert_id);
    }

    if (liveHeadlineAlerts.length > 0 && liveSourceHits >= 2) {
      setDataMode("live");
    } else if (legacyAlerts.length > 0 || liveSourceHits > 0) {
      setDataMode("mixed");
    } else {
      setDataMode("fallback");
    }

    if (briefResult.status === "fulfilled") {
      setBrief(formatBrief(briefResult.value as unknown as Record<string, unknown>));
      setBriefTime(`Updated ${formatTime(new Date())}`);
    } else if (brief === "Connecting to intelligence pipeline..." || brief.startsWith("{")) {
      setBrief(formatBrief(SEED_BRIEF as unknown as Record<string, unknown>));
      setBriefTime(`Seed data ${formatTime(new Date())}`);
    }

    const rawLiveEventsCount =
      (liveEventsResult.status === "fulfilled" && liveEventsResult.value ? liveEventsResult.value.length : 0) +
      (liveNewsResult.status === "fulfilled" && liveNewsResult.value ? liveNewsResult.value.length : 0);

    if (rawLiveEventsCount > 0) {
      setEventsCount(rawLiveEventsCount);
    } else if (countersResult.status === "fulfilled") {
      setEventsCount(Number(countersResult.value.eventRecords || nextAlerts.length));
    } else {
      setEventsCount(nextAlerts.length);
    }

    if (countersResult.status === "fulfilled") {
      setAuditCount(Number(countersResult.value.auditAssignments ?? 0));
    } else {
      setAuditCount(null);
    }
  }, [alerts.length, brief]);

  useEffect(() => {
    void refreshAll();
    timerRef.current = window.setInterval(() => {
      if (document.hidden) return; // skip when tab hidden
      void refreshAll();
    }, 120000);  // 2 minutes — prevents API hammering

    const onVisible = () => {
      if (!document.hidden) void refreshAll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshAll]);

  useEffect(() => {
    if (!layerVisibility.aviation) return;

    let cancelled = false;
    const refreshFlights = async () => {
      const nextFlights = await fetchLiveFlights();
      if (!nextFlights || cancelled) return;
      setLiveFlights(nextFlights);
      cacheSet("app-flights", nextFlights, "OpenSky Network");
    };

    void refreshFlights();
    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      void refreshFlights();
    }, 45000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [layerVisibility.aviation]);

  useEffect(() => {
    const warmupTimer = window.setTimeout(() => {
      warmMapAssets();
      setShouldRenderGlobe(true);
    }, 1500);

    return () => window.clearTimeout(warmupTimer);
  }, []);

  /* ─── 2D Map (Leaflet) ────────────────────────────────────────────────── */

  useEffect(() => {
    if (mapMode !== "2d") return;

    const initTimer = setTimeout(() => {
      const mapEl = document.getElementById("map-canvas");
      if (!mapEl) return;

      if (!mapRef.current) {
        const map = L.map("map-canvas", {
          center: [20, 20],
          zoom: 3,
          minZoom: 3,
          maxZoom: 8,
          worldCopyJump: true,
          zoomControl: true,
        });

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          maxZoom: 18,
          attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: "abcd",
        }).addTo(map);

        layerRef.current = L.layerGroup().addTo(map);
        geoLayerRef.current = L.layerGroup().addTo(map);
        liveLayerRef.current = L.layerGroup().addTo(map);

        loadCountriesGeoJson()
          .then((geoData) => {
            const geoLayer = L.geoJSON(geoData, {
              style: () => COUNTRY_STYLE,
              interactive: true,
              bubblingMouseEvents: false,
              onEachFeature: (feature, layer) => {
                const name = feature.properties?.ADMIN || feature.properties?.NAME || "Unknown";
                const iso = feature.properties?.ISO_A2 || "";

                layer.on("mouseover", () => {
                  (layer as L.Path).setStyle(COUNTRY_HOVER_STYLE);
                });

                layer.on("mouseout", () => {
                  (layer as L.Path).setStyle(COUNTRY_STYLE);
                });

                layer.on("click", (e) => {
                  if (e.originalEvent) {
                    e.originalEvent.stopPropagation();
                    e.originalEvent.preventDefault();
                  }
                  console.log("[PIP] Country clicked:", name, iso);
                  setSelectedCountry((prev) => {
                    if (prev?.code === iso && prev?.name === name) return prev;
                    return { code: iso, name };
                  });
                });
              },
            }).addTo(map);

            geoJsonRef.current = geoLayer;
          })
          .catch((err) => console.warn("Failed to load countries GeoJSON:", err));

        mapRef.current = map;
        setMapReady((n) => n + 1);
      }
    }, 50);

    return () => clearTimeout(initTimer);
  }, [mapMode]);

  useEffect(() => {
    if (mapMode !== "2d" || !mapRef.current || !layerRef.current) return;

    const map = mapRef.current;
    const layer = layerRef.current;

    layer.clearLayers();
    alertMarkerRef.current.clear();
    const latLngs: [number, number][] = [];

    for (const alert of alerts) {
      const lat = Number(alert.location?.geo?.lat);
      const lon = Number(alert.location?.geo?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      latLngs.push([lat, lon]);

      const color = markerColor(alert.severity);
      const marker = L.circleMarker([lat, lon], {
        radius: alert.severity === "critical" ? 10 : alert.severity === "high" ? 8 : 6,
        color,
        weight: 2,
        fillOpacity: 0.6,
        fillColor: color,
      });

      // Pulse effect ring for critical alerts
      if (alert.severity === "critical") {
        L.circleMarker([lat, lon], {
          radius: 16,
          color,
          weight: 1,
          fillOpacity: 0.15,
          fillColor: color,
          interactive: false,
          className: "marker-pulse",
        }).addTo(layer);
      }

      marker.bindPopup(`
        <div style="min-width:220px;font-family:monospace;">
          <div style="font-weight:700;margin-bottom:6px;color:${color};font-size:12px;">
            ${(alert.severity || "low").toUpperCase()} ALERT
          </div>
          <div style="margin-bottom:8px;font-size:11px;line-height:1.5;">${alert.snapshot || "No summary"}</div>
          <div style="font-size:10px;color:#888;">
            Confidence: ${fmtConfidence(alert.confidence)}
          </div>
        </div>
      `);

      marker.on("click", () => handleAlertSelection(alert));
      marker.addTo(layer);
      alertMarkerRef.current.set(alert.alert_id, marker);
    }

    if (latLngs.length > 0 && !hasInitialAlertFrameRef.current) {
      map.fitBounds(L.latLngBounds(latLngs).pad(0.25), { maxZoom: 5 });
      hasInitialAlertFrameRef.current = true;
    }
  }, [alerts, handleAlertSelection, mapMode]);

  useEffect(() => {
    if (!alertFocusRequest || mapMode !== "2d" || !mapRef.current || mapReady === 0) return;

    const alert = alerts.find((item) => item.alert_id === alertFocusRequest.alertId);
    const lat = Number(alert?.location?.geo?.lat);
    const lon = Number(alert?.location?.geo?.lon);
    if (!alert || !Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const map = mapRef.current;
    map.flyTo([lat, lon], Math.max(map.getZoom(), 5), { duration: 0.9 });

    const marker = alertMarkerRef.current.get(alert.alert_id);
    if (marker) {
      window.setTimeout(() => marker.openPopup(), 220);
    }
  }, [alertFocusRequest, alerts, mapMode, mapReady]);

  /* ─── Geo Intelligence Layers ────────────────────────────────────────── */

  const handleLayerToggle = useCallback((key: keyof LayerVisibility) => {
    setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  useEffect(() => {
    if (mapMode !== "2d" || !mapRef.current || !geoLayerRef.current) return;

    const map = mapRef.current;
    const geoLayer = geoLayerRef.current;
    geoLayer.clearLayers();
    const realConflictZones = CONFLICT_ZONES.filter((zone) => !zone.isScenario);

    const portColor = (type: string) => {
      switch (type) {
        case 'container': return '#00b4d8';
        case 'oil': return '#ff6b35';
        case 'lng': return '#b44dff';
        case 'naval': return '#ff2244';
        case 'mixed': return '#1abc9c';
        default: return '#888';
      }
    };

    const baseColor = (type: string) => {
      switch (type) {
        case 'us-nato': return '#4488ff';
        case 'russia': return '#ff4444';
        case 'china': return '#ffcc00';
        case 'france': return '#3388ff';
        case 'uk': return '#44aaff';
        case 'india': return '#ff8844';
        default: return '#aa88ff';
      }
    };

    const buildConflictPopup = (zone: typeof CONFLICT_ZONES[number]) => `
      <div style="min-width:200px;font-family:'Inter',monospace;">
        <div style="font-weight:700;color:#ff4444;font-size:12px;margin-bottom:4px;">CONFLICT ZONE</div>
        <div style="font-size:13px;font-weight:600;margin-bottom:6px;">${zone.name}</div>
        <div style="font-size:10px;color:#aaa;margin-bottom:4px;">Parties: ${zone.parties.join(', ')}</div>
        ${zone.casualties ? `<div style="font-size:10px;color:#ff8888;">Casualties: ${zone.casualties}</div>` : ''}
        ${zone.displaced ? `<div style="font-size:10px;color:#ffaa44;">Displaced: ${zone.displaced}</div>` : ''}
        ${zone.description ? `<div style="font-size:10px;color:#ccc;margin-top:4px;">${zone.description}</div>` : ''}
      </div>
    `;

    // CONFLICT ZONES — red polygons
    if (layerVisibility.conflictZones) {
      for (const zone of realConflictZones) {
        const latlngs = zone.coords.map(c => [c[1], c[0]] as [number, number]);
        const intensityOpacity = zone.intensity === 'high' ? 0.18 : zone.intensity === 'medium' ? 0.12 : 0.06;
        const centerLatLng = L.latLng(zone.center[1], zone.center[0]);
        const isCoarseBox = zone.coords.length <= 5;

        if (isCoarseBox) {
          const radiusMeters = Math.max(
            45_000,
            ...latlngs.map((point) => map.distance(centerLatLng, L.latLng(point[0], point[1])))
          );
          const circle = L.circle(centerLatLng, {
            radius: radiusMeters,
            color: '#ff2233',
            weight: 1.8,
            fillColor: '#ff2233',
            fillOpacity: Math.max(0.05, intensityOpacity * 0.7),
            dashArray: '6 4',
          });
          circle.bindPopup(buildConflictPopup(zone));
          circle.addTo(geoLayer);
          continue;
        }

        const polygon = L.polygon(latlngs, {
          color: '#ff2233',
          weight: 1.8,
          fillColor: '#ff2233',
          fillOpacity: Math.max(0.04, intensityOpacity * 0.75),
          dashArray: '4 3',
        });
        polygon.bindPopup(buildConflictPopup(zone));
        polygon.addTo(geoLayer);
      }
    }

    // STRATEGIC WATERWAYS — yellow diamonds
    if (layerVisibility.waterways) {
      for (const ww of STRATEGIC_WATERWAYS) {
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:14px;height:14px;background:#ffd700;transform:rotate(45deg);border:1.5px solid #ffee88;box-shadow:0 0 8px rgba(255,215,0,0.5);border-radius:2px;"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const marker = L.marker([ww.lat, ww.lon], { icon });
        marker.bindPopup(`
          <div style="min-width:180px;font-family:'Inter',monospace;">
            <div style="font-weight:700;color:#ffd700;font-size:11px;margin-bottom:4px;">STRATEGIC WATERWAY</div>
            <div style="font-size:13px;font-weight:600;margin-bottom:4px;">${ww.name}</div>
            <div style="font-size:10px;color:#ccc;">${ww.description}</div>
          </div>
        `);
        marker.addTo(geoLayer);
      }
    }

    // PORTS
    if (layerVisibility.ports) {
      for (const port of PORTS) {
        const color = portColor(port.type);
        const marker = L.circleMarker([port.lat, port.lon], {
          radius: port.rank && port.rank <= 10 ? 5 : 3.5,
          color,
          weight: 1,
          fillColor: color,
          fillOpacity: 0.7,
        });
        marker.bindPopup(`
          <div style="min-width:200px;font-family:'Inter',monospace;">
            <div style="font-weight:700;color:${color};font-size:11px;margin-bottom:2px;">${port.type.toUpperCase()} PORT${port.rank ? ' #' + port.rank : ''}</div>
            <div style="font-size:13px;font-weight:600;margin-bottom:4px;">${port.name}</div>
            <div style="font-size:10px;color:#aaa;margin-bottom:2px;">${port.country}</div>
            <div style="font-size:10px;color:#ccc;">${port.note}</div>
          </div>
        `);
        marker.addTo(geoLayer);
      }
    }

    // PIPELINES
    if (layerVisibility.pipelines) {
      for (const pipe of PIPELINES) {
        const color = pipe.type === 'oil' ? '#ff6b35' : '#00b4d8';
        const latlngs = pipe.points.map(p => [p[1], p[0]] as [number, number]);
        const line = L.polyline(latlngs, {
          color,
          weight: pipe.type === 'oil' ? 3.8 : 3.4,
          opacity: 0.82,
          dashArray: pipe.status === 'operating' ? undefined : '6 4',
          lineCap: 'round',
          lineJoin: 'round',
        });
        line.bindPopup(`
          <div style="min-width:200px;font-family:'Inter',monospace;">
            <div style="font-weight:700;color:${color};font-size:11px;margin-bottom:2px;">${pipe.type.toUpperCase()} PIPELINE</div>
            <div style="font-size:13px;font-weight:600;margin-bottom:4px;">${pipe.name}</div>
            <div style="font-size:10px;color:#aaa;">Capacity: ${pipe.capacity}</div>
            <div style="font-size:10px;color:#aaa;">Length: ${pipe.length}</div>
            <div style="font-size:10px;color:#aaa;">Operator: ${pipe.operator}</div>
            <div style="font-size:10px;color:#888;margin-top:2px;">${pipe.countries.join(' → ')}</div>
          </div>
        `);
        line.addTo(geoLayer);
      }
    }

    // TRADE ROUTES — animated arcs
    if (layerVisibility.tradeRoutes) {
      const segments = resolveTradeRouteSegments();
      const routeColor = (cat: string) => cat === 'energy' ? '#ff6b35' : cat === 'bulk' ? '#cd853f' : '#44ff88';
      for (const seg of segments) {
        const color = routeColor(seg.category);
        const line = L.polyline(
          [[seg.sourcePosition[1], seg.sourcePosition[0]], [seg.targetPosition[1], seg.targetPosition[0]]],
          { color, weight: 1.5, opacity: 0.5, dashArray: '8 6' }
        );
        line.bindPopup(`
          <div style="min-width:180px;font-family:'Inter',monospace;">
            <div style="font-weight:700;color:${color};font-size:11px;margin-bottom:2px;">TRADE ROUTE</div>
            <div style="font-size:13px;font-weight:600;margin-bottom:4px;">${seg.routeName}</div>
            <div style="font-size:10px;color:#aaa;">Volume: ${seg.volumeDesc}</div>
            <div style="font-size:10px;color:#aaa;">Type: ${seg.category}</div>
          </div>
        `);
        line.addTo(geoLayer);
      }
    }

    // MILITARY BASES
    if (layerVisibility.militaryBases) {
      for (const base of MILITARY_BASES) {
        const color = baseColor(base.type);
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:10px solid ${color};filter:drop-shadow(0 0 3px ${color}60);"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 10],
        });
        const marker = L.marker([base.lat, base.lon], { icon });
        marker.bindPopup(`
          <div style="min-width:180px;font-family:'Inter',monospace;">
            <div style="font-weight:700;color:${color};font-size:11px;margin-bottom:2px;">${base.type.toUpperCase()} BASE</div>
            <div style="font-size:13px;font-weight:600;margin-bottom:4px;">${base.name}</div>
            ${base.country ? `<div style="font-size:10px;color:#aaa;">${base.country}</div>` : ''}
            <div style="font-size:10px;color:#ccc;">${base.description}</div>
          </div>
        `);
        marker.addTo(geoLayer);
      }
    }

    // INTEL HOTSPOTS — pulsing dots
    if (layerVisibility.hotspots) {
      for (const hs of INTEL_HOTSPOTS) {
        const score = hs.escalationScore || 2;
        const color = score >= 5 ? '#ff2244' : score >= 4 ? '#ff6b35' : score >= 3 ? '#ffaa00' : '#44ff88';
        const radius = score >= 4 ? 7 : 5;

        // Outer pulse
        L.circleMarker([hs.lat, hs.lon], {
          radius: radius + 6,
          color,
          weight: 0.8,
          fillColor: color,
          fillOpacity: 0.08,
          interactive: false,
          className: 'marker-pulse',
        }).addTo(geoLayer);

        const marker = L.circleMarker([hs.lat, hs.lon], {
          radius,
          color,
          weight: 1.5,
          fillColor: color,
          fillOpacity: 0.5,
        });
        marker.bindPopup(`
          <div style="min-width:200px;font-family:'Inter',monospace;">
            <div style="font-weight:700;color:${color};font-size:11px;margin-bottom:2px;">INTEL HOTSPOT${score ? ' [' + score + '/5]' : ''}</div>
            <div style="font-size:14px;font-weight:700;margin-bottom:2px;">${hs.name}</div>
            <div style="font-size:11px;color:#888;margin-bottom:4px;">${hs.subtext}</div>
            <div style="font-size:10px;color:#ccc;margin-bottom:4px;">${hs.description}</div>
            ${hs.whyItMatters ? `<div style="font-size:10px;color:#ffaa44;border-top:1px solid #333;padding-top:4px;margin-top:4px;">Why it matters: ${hs.whyItMatters}</div>` : ''}
          </div>
        `);
        marker.addTo(geoLayer);
      }
    }
  }, [mapMode, layerVisibility, mapReady]);
  /* ─── Live Data Map Overlay (fires, conflicts) ─────────────────────── */

  useEffect(() => {
    if (mapMode !== "2d" || !mapRef.current || !liveLayerRef.current) return;

    const liveLayer = liveLayerRef.current;
    liveLayer.clearLayers();

    // Render live FIRMS fire hotspots — only when hotspots layer enabled
    if (layerVisibility.hotspots && liveFires.length > 0) {
      for (const fire of liveFires) {
        if (!fire.lat || !fire.lon) continue;
        const r = Math.min(4 + (fire.frp || 0) / 50, 10);
        const marker = L.circleMarker([fire.lat, fire.lon], {
          radius: r,
          color: "#ff6600",
          weight: 0.5,
          fillColor: "#ff4400",
          fillOpacity: 0.6,
        });
        marker.bindPopup(`
          <div style="min-width:180px;font-family:'Inter',monospace;">
            <div style="font-weight:700;color:#ff6600;font-size:11px;margin-bottom:2px;">🔥 NASA FIRMS FIRE DETECTION</div>
            <div style="font-size:12px;margin-bottom:4px;">FRP: <b>${fire.frp?.toFixed(1)} MW</b></div>
            <div style="font-size:11px;color:#ccc;">Brightness: ${fire.brightness?.toFixed(1)} K</div>
            <div style="font-size:11px;color:#ccc;">Confidence: ${fire.confidence}</div>
            <div style="font-size:10px;color:#888;margin-top:4px;">${fire.acq_date} ${fire.acq_time} · ${fire.satellite}</div>
            <div style="font-size:10px;color:#888;">${fire.lat.toFixed(3)}°, ${fire.lon.toFixed(3)}°</div>
          </div>
        `);
        marker.addTo(liveLayer);
      }
    }

    if (layerVisibility.aviation && aviationFlights.length > 0) {
      for (const flight of aviationFlights) {
        const marker = L.marker([flight.lat, flight.lon], {
          icon: flightMarkerIcon(flight),
          keyboard: false,
          riseOnHover: true,
        });
        marker.bindPopup(flightPopupHtml(flight));
        marker.addTo(liveLayer);
      }
    }

    // Render live ACLED conflict events — only when conflictZones layer enabled
    if (layerVisibility.conflictZones && liveConflicts.length > 0) {
      for (const ev of liveConflicts) {
        if (!ev.lat || !ev.lon) continue;
        const sev = ev.fatalities > 10 ? "critical" : ev.fatalities > 0 ? "high" : "medium";
        const color = sev === "critical" ? "#ff2244" : sev === "high" ? "#ff8800" : "#ffaa00";
        const r = sev === "critical" ? 8 : sev === "high" ? 6 : 4;

        const marker = L.circleMarker([ev.lat, ev.lon], {
          radius: r,
          color,
          weight: 1.5,
          fillColor: color,
          fillOpacity: 0.5,
        });
        marker.bindPopup(`
          <div style="min-width:200px;font-family:'Inter',monospace;">
            <div style="font-weight:700;color:${color};font-size:11px;margin-bottom:2px;">⚔️ ACLED CONFLICT EVENT</div>
            <div style="font-size:13px;font-weight:700;margin-bottom:2px;">${ev.type}</div>
            <div style="font-size:11px;color:#ccc;margin-bottom:4px;">${ev.location}, ${ev.country}</div>
            ${ev.actor1 ? `<div style="font-size:10px;color:#aaa;">Actor 1: ${ev.actor1}</div>` : ""}
            ${ev.actor2 ? `<div style="font-size:10px;color:#aaa;">Actor 2: ${ev.actor2}</div>` : ""}
            <div style="font-size:11px;color:#ff6644;margin-top:4px;">Fatalities: ${ev.fatalities}</div>
            <div style="font-size:10px;color:#888;margin-top:2px;">${ev.date} · ${ev.source}</div>
          </div>
        `);
        marker.addTo(liveLayer);
      }
    }
  }, [aviationFlights, mapMode, liveFires, liveConflicts, mapReady, layerVisibility]);

  useEffect(() => {
    if (mapMode === "2d" && mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    }
  }, [mapHeight, mapMode]);

  useEffect(() => {
    if (mapMode === "3d") {
      setShouldRenderGlobe(true);
      void preloadGlobe3D();
    }
  }, [mapMode]);

  /* ─── Resize Handle (smooth with requestAnimationFrame) ────────────────── */

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      isResizingRef.current = true;
      resizeStartYRef.current = e.clientY;
      resizeStartHeightRef.current = mapHeight;
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
      document.body.classList.add("resizing");
      e.preventDefault();
    },
    [mapHeight]
  );

  useEffect(() => {
    let pendingHeight: number | null = null;

    const updateHeight = () => {
      if (pendingHeight !== null) {
        setMapHeight(pendingHeight);
        localStorage.setItem('pip-map-height', String(pendingHeight));
        pendingHeight = null;
      }
      rafRef.current = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaY = e.clientY - resizeStartYRef.current;
      const deltaPercent = (deltaY / window.innerHeight) * 100;
      pendingHeight = Math.max(15, Math.min(80, resizeStartHeightRef.current + deltaPercent));
      
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(updateHeight);
      }
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.body.classList.remove("resizing");
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        // Resize map after layout change
        setTimeout(() => mapRef.current?.invalidateSize(), 100);
      }
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* ─── Fullscreen Toggle ───────────────────────────────────────────────── */

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  const toggleMapFullscreen = useCallback(() => {
    setIsMapFullscreen(prev => !prev);
    setTimeout(() => mapRef.current?.invalidateSize(), 80);
    setTimeout(() => mapRef.current?.invalidateSize(), 240);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMapFullscreen) {
        setIsMapFullscreen(false);
        setTimeout(() => mapRef.current?.invalidateSize(), 100);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isMapFullscreen]);

  /* ─── Map mode toggle ────────────────────────────────────────────────── */

  const handleModeSwitch = useCallback(
    (mode: "2d" | "3d") => {
      if (mode === mapMode) return;
      if (mode === "3d") {
        setShouldRenderGlobe(true);
        void preloadGlobe3D();
      }
      startTransition(() => {
        setMapMode(mode);
      });
    },
    [mapMode]
  );

  const handleCascadeClose = useCallback(() => {
    setCascadeAlert(null);
    window.setTimeout(() => mapRef.current?.invalidateSize(), 80);
    window.setTimeout(() => mapRef.current?.invalidateSize(), 240);
  }, []);

  /* ─── Panel Management ─────────────────────────────────────────────────── */

  const handleTogglePanel = useCallback((panelId: string) => {
    setEnabledPanels(prev => {
      const next = new Set(prev);
      if (next.has(panelId)) {
        next.delete(panelId);
        setPanelOrder((prevOrder) => {
          const filtered = prevOrder.filter((id) => panelBaseId(id) !== panelId);
          localStorage.setItem(PANEL_STORAGE_KEYS.order, JSON.stringify(filtered));
          return filtered;
        });
      } else {
        next.add(panelId);
        setPanelOrder((prevOrder) => {
          if (prevOrder.some((id) => panelBaseId(id) === panelId)) return prevOrder;
          const nextOrder = [...prevOrder, panelId];
          localStorage.setItem(PANEL_STORAGE_KEYS.order, JSON.stringify(nextOrder));
          return nextOrder;
        });
      }
      return next;
    });
  }, [panelBaseId]);

  const addPanelInstance = useCallback((baseId: string) => {
    const instanceId = createPanelInstanceId(baseId);
    setEnabledPanels((prev) => {
      const next = new Set(prev);
      next.add(baseId);
      localStorage.setItem(PANEL_STORAGE_KEYS.enabled, JSON.stringify([...next]));
      return next;
    });
    setPanelOrder((prev) => {
      const next = [...prev, instanceId];
      localStorage.setItem(PANEL_STORAGE_KEYS.order, JSON.stringify(next));
      return next;
    });
  }, [createPanelInstanceId]);

  const handleSavePanels = useCallback(() => {
    localStorage.setItem(PANEL_STORAGE_KEYS.enabled, JSON.stringify([...enabledPanels]));
    localStorage.setItem(PANEL_STORAGE_KEYS.order, JSON.stringify(panelOrder));
    localStorage.setItem(PANEL_STORAGE_KEYS.spans, JSON.stringify(panelSpans));
    localStorage.setItem(PANEL_STORAGE_KEYS.colSpans, JSON.stringify(panelColSpans));
    setShowPanelSelector(false);
  }, [enabledPanels, panelOrder, panelSpans, panelColSpans]);

  const handleResetPanels = useCallback(() => {
    const defaults = new Set(DEFAULT_ENABLED_PANELS);
    setEnabledPanels(defaults);
    localStorage.setItem(PANEL_STORAGE_KEYS.enabled, JSON.stringify([...defaults]));
  }, []);

  const movePanel = useCallback((dragId: string, targetId: string) => {
    if (dragId === targetId) return;
    setPanelOrder((prev) => {
      const next = [...prev];
      const from = next.indexOf(dragId);
      const to = next.indexOf(targetId);
      if (from === -1 || to === -1) return prev;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      localStorage.setItem(PANEL_STORAGE_KEYS.order, JSON.stringify(next));
      return next;
    });
  }, []);

  const removePanel = useCallback((instanceId: string) => {
    const baseId = panelBaseId(instanceId);
    setPanelOrder((prev) => {
      const next = prev.filter((id) => id !== instanceId);
      localStorage.setItem(PANEL_STORAGE_KEYS.order, JSON.stringify(next));
      const hasRemaining = next.some((id) => panelBaseId(id) === baseId);
      if (!hasRemaining) {
        setEnabledPanels((prevEnabled) => {
          const nextEnabled = new Set(prevEnabled);
          nextEnabled.delete(baseId);
          localStorage.setItem(PANEL_STORAGE_KEYS.enabled, JSON.stringify([...nextEnabled]));
          return nextEnabled;
        });
      }
      return next;
    });
    setPanelSpans((prev) => {
      const { [instanceId]: _, ...rest } = prev;
      localStorage.setItem(PANEL_STORAGE_KEYS.spans, JSON.stringify(rest));
      return rest;
    });
    setPanelColSpans((prev) => {
      const { [instanceId]: _, ...rest } = prev;
      localStorage.setItem(PANEL_STORAGE_KEYS.colSpans, JSON.stringify(rest));
      return rest;
    });
    setLiveNewsChannelByPanel((prev) => {
      const { [instanceId]: _, ...rest } = prev;
      localStorage.setItem("pip-panel-live-news-channel", JSON.stringify(rest));
      return rest;
    });
  }, [panelBaseId]);

  const startPanelResize = useCallback((id: string, mode: "corner" | "right" | "bottom", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    panelResizeRef.current = {
      id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startRows: panelSpans[id] ?? 1,
      startCols: panelColSpans[id] ?? 1,
    };
    document.body.classList.add("resizing-panel");
  }, [panelSpans, panelColSpans]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!panelResizeRef.current) return;
      const { id, mode, startX, startY, startRows, startCols } = panelResizeRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const nextCols = mode === "bottom" ? startCols : Math.max(1, Math.min(4, startCols + Math.round(dx / 320)));
      const nextRows = mode === "right" ? startRows : Math.max(1, Math.min(4, startRows + Math.round(dy / 220)));
      setPanelColSpans((prev) => ({ ...prev, [id]: nextCols }));
      setPanelSpans((prev) => ({ ...prev, [id]: nextRows }));
    };
    const onUp = () => {
      if (!panelResizeRef.current) return;
      panelResizeRef.current = null;
      document.body.classList.remove("resizing-panel");
      localStorage.setItem(PANEL_STORAGE_KEYS.spans, JSON.stringify({ ...panelSpans }));
      localStorage.setItem(PANEL_STORAGE_KEYS.colSpans, JSON.stringify({ ...panelColSpans }));
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [panelSpans, panelColSpans]);

  const panelClass = useCallback((id: string) => {
    const baseId = panelBaseId(id);
    const defaultRow = baseId === "live-news-video" ? 2 : 1;
    const defaultCol = baseId === "live-news-video" ? 2 : 1;
    const row = panelSpans[id] ?? defaultRow;
    const col = panelColSpans[id] ?? defaultCol;
    const rowClass = row > 1 ? `span-${row}-rows` : "";
    const colClass = col > 1 ? `span-${col}-cols` : "";
    return `${rowClass} ${colClass}`.trim();
  }, [panelSpans, panelColSpans, panelBaseId]);

  const renderPanel = useCallback((instanceId: string) => {
    const id = panelBaseId(instanceId);
    switch (id) {
      case "live-feed":
        return <LiveFeedPanel />;
      case "alerts":
        return (
          <article className={`panel alerts-panel ${panelClass(id)}`}>
            <div className="panel-header">
              <div className="panel-header-left">
                <span className="panel-icon"><SirenIcon size={15} /></span>
                <h2 className="panel-title">Live Alert Inbox</h2>
              </div>
              <span className="panel-badge">{alerts.length}</span>
            </div>
            <p className="panel-hint">Live headline alerts from conflict, maritime, energy, market, and news feeds</p>
            <div className="panel-content">
              {alerts.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon"><CrosshairIcon size={32} color="#444" /></span>
                  <p>Waiting for live headlines...</p>
                </div>
              ) : (
                <ul className="alert-list">
                  {alerts.map((alert) => (
                    <li
                      key={alert.alert_id}
                      className={`alert-item ${severityClass(alert.severity)} ${selected?.alert_id === alert.alert_id ? "selected" : ""}`}
                      onClick={() => handleAlertSelection(alert, { focusMap: true })}
                    >
                      <strong>{alert.snapshot || "No snapshot available"}</strong>
                      <div className="meta meta-subline">
                        <span>{alert.source || alert.category || "Live feed"}</span>
                        {alert.timestamp ? <span>{formatRelativeAlertTime(alert.timestamp)}</span> : null}
                        <span style={{ color: (alert.credibility || getSourceCredibility(alert.source)).color }}>
                          {(alert.credibility || getSourceCredibility(alert.source)).label}
                        </span>
                      </div>
                      <div className="meta">
                        <span className="meta-badge">{(alert.severity || "low").toUpperCase()}</span>
                        <span>confidence: {fmtConfidence(alert.confidence)}</span>
                        <button
                          className="cascade-btn-small"
                          onClick={(e) => { e.stopPropagation(); setCascadeAlert(alert); }}
                          title="Analyze cascading effects"
                        >
                          ⚡ Cascade
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        );
      case "details":
        return (
          <article className={`panel details-panel ${panelClass(id)}`}>
            <div className="panel-header">
              <div className="panel-header-left">
                <span className="panel-icon"><SearchIcon size={15} /></span>
                <h2 className="panel-title">Alert Intelligence</h2>
              </div>
            </div>
            <p className="panel-hint">Evidence, contradictions, and forecast narrative</p>
            <div className="panel-content">
              {selectedAlert ? (
                <div className="details-content">
                  {(() => {
                    const sourceDetails = selectedAlert.source_details || getAlertSourceDetails(selectedAlert.source, selectedAlert.link);
                    const showOfficialLink =
                      !!sourceDetails.officialUrl &&
                      (!sourceDetails.articleUrl || sourceDetails.officialUrl !== sourceDetails.articleUrl);

                    if (!selectedAlert.source && !selectedAlert.category && !selectedAlert.timestamp && !sourceDetails.articleUrl && !showOfficialLink) {
                      return null;
                    }

                    return (
                      <p>
                        <strong>Source</strong>
                        {[
                          selectedAlert.source,
                          selectedAlert.category ? selectedAlert.category.toUpperCase() : "",
                          selectedAlert.timestamp ? formatRelativeAlertTime(selectedAlert.timestamp) : "",
                        ].filter(Boolean).join(" | ")}
                        {sourceDetails.articleUrl ? (
                          <a
                            href={sourceDetails.articleUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: "inline-block", marginTop: 6, color: "#67d4ff" }}
                          >
                            {sourceDetails.articleLabel || "Open linked report"}
                          </a>
                        ) : null}
                        {showOfficialLink ? (
                          <a
                            href={sourceDetails.officialUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: "inline-block", marginTop: 6, marginLeft: sourceDetails.articleUrl ? 12 : 0, color: "#9de0ff" }}
                          >
                            Open official {sourceDetails.officialLabel || "source"}
                          </a>
                        ) : null}
                      </p>
                    );
                  })()}
                  {(() => {
                    const credibility = selectedAlert.credibility || getSourceCredibility(selectedAlert.source);
                    const confidenceDetails = explainAlertConfidence(selectedAlert);
                    return (
                      <p>
                        <strong>Credibility</strong>
                        <span style={{ color: credibility.color, fontWeight: 700 }}>
                          {credibility.label} ({Math.round(credibility.score * 100)}%)
                        </span>
                        <span style={{ display: "block", marginTop: 4, fontSize: 10, color: "#97a3b6" }}>
                          {credibility.note}
                        </span>
                        <span style={{ display: "block", marginTop: 8, color: "#d8deea", fontWeight: 700 }}>
                          Confidence {Math.round((selectedAlert.confidence || 0) * 100)}%
                        </span>
                        <span style={{ display: "block", marginTop: 4, fontSize: 10, color: "#97a3b6" }}>
                          {confidenceDetails.summary}
                        </span>
                        <span style={{ display: "block", marginTop: 6, whiteSpace: "pre-wrap", fontSize: 10, color: "#aeb8c8" }}>
                          {confidenceDetails.factors.map((factor) => `• ${factor}`).join("\n")}
                        </span>
                      </p>
                    );
                  })()}
                  <p><strong>Snapshot</strong>{selectedAlert.snapshot || "No snapshot"}</p>
                  <p><strong>Drivers</strong>{(selectedAlert.drivers || []).join("\n• ") || "None identified"}</p>
                  <p><strong>Contradictions</strong>{(selectedAlert.contradictions || []).join("\n• ") || "None found"}</p>
                  <p><strong>Forecast</strong>{selectedAlert.forecast || "No forecast available"}</p>
                  <p><strong>Recommended Actions</strong>
                    <span style={{ display: "block", marginTop: 4, whiteSpace: "pre-wrap", fontSize: 10 }}>
                      {(selectedAlert.recommended_actions || []).map(a => `▸ ${a}`).join("\n") || "▸ No specific actions recommended"}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="empty-state">
                  <span className="empty-icon"><SearchIcon size={32} color="#444" /></span>
                  <p>Select an alert to inspect explainability fields</p>
                </div>
              )}
            </div>
          </article>
        );
      case "brief":
        return (
          <article className={`panel brief-panel span-2 ${panelClass(id)}`}>
            <div className="panel-header">
              <div className="panel-header-left">
                <span className="panel-icon"><FileTextIcon size={15} /></span>
                <h2 className="panel-title">30-Second Intelligence Brief</h2>
              </div>
              <span className="panel-time">{briefTime}</span>
            </div>
            <p className="panel-hint">AI-generated current-state summary across all active threat domains</p>
            <div className="panel-content">
              <pre className="brief-output">{brief}</pre>
            </div>
          </article>
        );
      case "live-news-video":
      case "live-news":
        return (
          <LiveNewsVideoPanel
            selectedChannelId={liveNewsChannelByPanel[instanceId]}
            onSelectChannel={(channelId) => {
              setLiveNewsChannelByPanel((prev) => {
                const next = { ...prev, [instanceId]: channelId };
                localStorage.setItem("pip-panel-live-news-channel", JSON.stringify(next));
                return next;
              });
            }}
          />
        );
      case "ai-insights":
        return <AIInsightsPanel />;
      case "ai-strategic-posture":
      case "strategic-posture":
        return <StrategicPosturePanel />;
      case "ai-forecasts":
        return <AIForecastsPanel />;
      case "intel-feed":
        return <LiveFeedPanel />;
      case "world-news":
        return <RegionalNewsPanel region="world" regionName="World News" icon="🌍" />;
      case "us-news":
        return <RegionalNewsPanel region="us" regionName="United States" icon="🇺🇸" />;
      case "europe-news":
        return <RegionalNewsPanel region="europe" regionName="Europe" icon="🇪🇺" />;
      case "middle-east-news":
        return <RegionalNewsPanel region="middle-east" regionName="Middle East" icon="🏜️" />;
      case "africa-news":
        return <RegionalNewsPanel region="africa" regionName="Africa" icon="🌍" />;
      case "latin-america-news":
        return <RegionalNewsPanel region="latin-america" regionName="Latin America" icon="🌎" />;
      case "asia-pacific-news":
        return <RegionalNewsPanel region="asia-pacific" regionName="Asia-Pacific" icon="🌏" />;
      case "metals-materials":
        return <MarketDataPanel type="commodities" title="Metals & Materials" icon="🥇" />;
      case "energy-complex":
        return <MarketDataPanel type="commodities" title="Energy Complex" icon="🛢️" />;
      case "markets-overview":
        return <MarketDataPanel type="indices" title="Market Indices" icon="📊" />;
      case "fear-greed":
        return <MarketDataPanel type="fear-greed" title="Fear & Greed" icon="😱" />;
      case "yield-curve":
        return <MarketDataPanel type="yield-curve" title="Yield Curve" icon="📈" />;
      case "fires":
        return <DataTrackingPanel type="fires" title="Global Fires" icon="🔥" />;
      case "armed-conflicts":
        return <DataTrackingPanel type="conflicts" title="Conflict Events" icon="⚔️" />;
      case "climate-anomalies":
        return <DataTrackingPanel type="climate" title="Climate & Thermal" icon="🌡️" />;
      case "cot-positioning":
        return <DataTrackingPanel type="cot" title="COT Positioning" icon="📊" />;
      case "unhcr-displacement":
        return <DataTrackingPanel type="displacement" title="Displacement Tracker" icon="🏃" />;
      case "consumer-prices":
        return <DataTrackingPanel type="economic" title="Economic Indicators" icon="💵" />;
      default:
        return null;
    }
  }, [alerts, brief, briefTime, panelClass, selected, selectedAlert, panelBaseId, liveNewsChannelByPanel]);

  const visiblePanelOrder = useMemo(
    () => panelOrder.filter((id) => {
      const baseId = panelBaseId(id);
      return enabledPanels.has(baseId) || CORE_PANEL_IDS.has(baseId);
    }),
    [enabledPanels, panelOrder, panelBaseId, CORE_PANEL_IDS]
  );
  const closeablePanels = useMemo(
    () => new Set(visiblePanelOrder.filter((id) => !CORE_PANEL_IDS.has(panelBaseId(id)))),
    [visiblePanelOrder, CORE_PANEL_IDS, panelBaseId]
  );

  /* ─── Status ─────────────────────────────────────────────────────────── */

  // statusDotClass removed — always shows LIVE

  /* ─── Render ─────────────────────────────────────────────────────────── */

  const statusLabel = dataMode === "live" ? "LIVE" : dataMode === "mixed" ? "MIXED" : "FALLBACK";
  const statusDotClass = dataMode === "live" ? "live" : dataMode === "mixed" ? "paused" : "error";

  // Badge popup handler
  const handleBadgeClick = (type: 'alerts' | 'events' | 'audit', ref: React.RefObject<HTMLElement> | null) => {
    if (!ref || !ref.current) {
      setBadgePopupType(type);
      setBadgePopupStyle({});
      return;
    }
    const rect = ref.current.getBoundingClientRect();
    const top = rect.bottom + 8 + window.scrollY;
    const left = rect.left + window.scrollX;
    setBadgePopupType(type);
    setBadgePopupStyle({ position: 'absolute', top: `${top}px`, left: `${left}px`, zIndex: 9999 });
  };

  const closeBadgePopup = () => setBadgePopupType(null);

  return (
    <div id="app">
      {/* Panel Selector Modal */}
      <PanelSelector
        isOpen={showPanelSelector}
        onClose={() => setShowPanelSelector(false)}
        enabledPanels={enabledPanels}
        onTogglePanel={handleTogglePanel}
        onAddPanel={addPanelInstance}
        onSave={handleSavePanels}
        onReset={handleResetPanels}
      />

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="brand">
            <span className="brand-icon"><GlobeIcon size={22} /></span>
            <div className="brand-text">
              <span className="brand-name">PIP</span>
              <span className="brand-sub">Planetary Intelligence</span>
            </div>
          </div>
          <div className="status-indicator">
            <span className={`status-dot ${statusDotClass}`} />
            <span>{statusLabel}</span>
          </div>
        </div>
        <div className="header-center">
          <span className="header-title">Global Situation Console</span>
          <span className="header-clock">{clock}</span>
        </div>
        <div className="header-right">
          <div className="stat-chips">
            <span ref={alertsChipRef} role="button" tabIndex={0} className="chip" onClick={() => handleBadgeClick('alerts', alertsChipRef)}>
              <SirenIcon size={12} /> ALERTS {alerts.length}
            </span>
            <span ref={eventsChipRef} role="button" tabIndex={0} className="chip" onClick={() => handleBadgeClick('events', eventsChipRef)}>
              <SignalIcon size={12} /> EVENTS {eventsCount}
            </span>
            <span ref={auditChipRef} role="button" tabIndex={0} className="chip" onClick={() => handleBadgeClick('audit', auditChipRef)}>
              <ClipboardIcon size={12} /> AUDIT {auditCount ?? "--"}
            </span>
            <span className={`chip chip-${dataMode}`}>{statusLabel} DATA</span>
          </div>
          <button className="refresh-btn" onClick={() => void refreshAll()}>
            <RefreshIcon size={14} />
            Refresh
          </button>
          <button 
            className="panels-btn" 
            onClick={() => setShowPanelSelector(true)}
            title="Configure panels"
          >
            ⚙️
          </button>
          <a className="github-link" href="https://github.com/shankarsingh077/Planetary-Intelligence-Platform" target="_blank" rel="noopener noreferrer" title="View on GitHub">
            <GithubIcon size={18} />
          </a>
          <button 
            className="fullscreen-btn" 
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <MinimizeIcon size={14} /> : <MaximizeIcon size={14} />}
          </button>
        </div>
      </header>

      {/* Badge popup (Alerts / Events / Audit) */}
      {badgePopupType ? (
        <div className="badge-popup" style={badgePopupStyle} role="dialog" aria-label="Badge details">
          <div className="badge-popup-header">
            <strong>{badgePopupType.toUpperCase()}</strong>
            <button className="badge-popup-close" onClick={closeBadgePopup}>✕</button>
          </div>
          <div className="badge-popup-body">
            {badgePopupType === 'alerts' && (
              <div>
                <div style={{marginBottom:8}}>Total alerts: <strong>{alerts.length}</strong></div>
                <div style={{maxHeight:180, overflowY:'auto'}}>
                  {alerts.slice(0,8).map((a) => (
                    <div key={a.alert_id} className="badge-alert-row">
                      <button className="link-like" onClick={() => { handleAlertSelection(a, { focusMap: true }); closeBadgePopup(); }}>
                        {a.snapshot || a.alert_id}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {badgePopupType === 'events' && (
              <div>
                <div>Total events: <strong>{eventsCount}</strong></div>
                <div style={{marginTop:8,fontSize:12,color:'#cfc'}}>
                  Events are sourced from live feeds and the event store. Click Refresh to update.
                </div>
              </div>
            )}
            {badgePopupType === 'audit' && (
              <div>
                <div>Audit assignments: <strong>{auditCount ?? 0}</strong></div>
                <div style={{marginTop:8}}>
                  <button className="incoming-alert-btn" onClick={() => { alert('Opening audit panel'); }}>
                    View Audit Assignments
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {incomingAlert ? (
        <div className="incoming-alert-banner">
          <div className="incoming-alert-copy">
            <span className="incoming-alert-label">NEW ALERT{incomingAlertCount > 1 ? ` +${incomingAlertCount - 1}` : ""}</span>
            <strong>{incomingAlert.snapshot || "New live alert"}</strong>
            <span className="incoming-alert-meta">
              {(incomingAlert.source || "Live feed")} | {formatRelativeAlertTime(incomingAlert.timestamp)}
            </span>
          </div>
          <div className="incoming-alert-actions">
            <button
              className="incoming-alert-btn"
              onClick={() => {
                handleAlertSelection(incomingAlert, { focusMap: true });
                setIncomingAlert(null);
                setIncomingAlertCount(0);
              }}
            >
              View Alert
            </button>
            <button
              className="incoming-alert-btn primary"
              onClick={() => {
                handleAlertSelection(incomingAlert);
                setCascadeAlert(incomingAlert);
                setIncomingAlert(null);
                setIncomingAlertCount(0);
              }}
            >
              Open Cascade
            </button>
            <button
              className="incoming-alert-dismiss"
              onClick={() => {
                setIncomingAlert(null);
                setIncomingAlertCount(0);
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}


      {/* Banner removed — platform always shows cached real data when offline */}


      {/* Market Ticker Bar — auto-scrolling */}
      {liveMarkets && (
        <div className="market-ticker-bar">
          <div className="market-ticker-track">
            {/* Render twice for seamless infinite scroll */}
            {[0, 1].map(copy => (
              <div key={copy} className="market-ticker-set">
                {Object.entries(liveMarkets).map(([name, q]) => {
                  if (!q || q.error) return null;
                  const isUp = (q.change_pct || 0) >= 0;
                  const ticker = q.symbol || name;
                  return (
                    <a
                      key={`${name}-${copy}`}
                      className="market-ticker-item"
                      href={marketQuoteHref(ticker, name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${name.replace(/_/g, " ")} — Open live market quote`}
                    >
                      <span className="market-ticker-name">{name.replace(/_/g, " ").toUpperCase()}</span>
                      <span className="market-ticker-price">${typeof q.price === "number" ? q.price.toFixed(2) : "—"}</span>
                      <span className={`market-ticker-change ${isUp ? "up" : "down"}`}>
                        {isUp ? "▲" : "▼"} {Math.abs(q.change_pct || 0).toFixed(2)}%
                      </span>
                    </a>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`main-content ${isMapFullscreen ? 'map-fullscreen' : ''}`}>
        {/* Map Section */}
        <section
          className={`map-section ${isMapFullscreen ? 'fullscreen' : ''}`}
          ref={mapSectionRef}
          style={isMapFullscreen ? undefined : { height: `${mapHeight}vh` }}
        >
          <div className="map-header">
            <div className="map-header-left">
              <span className="map-title">
                {mapMode === "2d" ? <><MapIcon size={15} /> Global Posture Map</> : <><Globe3DIcon size={15} /> 3D Intelligence Globe</>}
              </span>
              <span className="map-subtitle">
                {mapMode === "2d"
                  ? "Live alert markers · Country hover intelligence · Real-time updates"
                  : "Interactive globe · Country click intel · Auto-rotate"}
              </span>
            </div>
            <div className="map-header-right">
              <div className="map-dimension-toggle">
                <button
                  className={`map-dim-btn ${mapMode === "2d" ? "active" : ""}`}
                  onClick={() => handleModeSwitch("2d")}
                >
                  2D
                </button>
                <button
                  className={`map-dim-btn ${mapMode === "3d" ? "active" : ""}`}
                  onClick={() => handleModeSwitch("3d")}
                >
                  3D
                </button>
              </div>
              <button 
                className="map-fullscreen-btn" 
                onClick={toggleMapFullscreen}
                title={isMapFullscreen ? "Exit map fullscreen (ESC)" : "Expand map fullscreen"}
              >
                {isMapFullscreen ? <MinimizeIcon size={14} /> : <MaximizeIcon size={14} />}
              </button>
            </div>
          </div>

          <div className="map-container">
            <div className={`map-view map-view-map ${mapMode === "2d" ? "is-active" : "is-hidden"}`}>
              <div id="map-canvas" />
            </div>
            <div className={`map-view map-view-globe ${mapMode === "3d" ? "is-active" : "is-hidden"}`}>
              {shouldRenderGlobe ? (
                <Suspense fallback={<div className="globe-loading">Preparing 3D globe...</div>}>
                  <Globe3DLazy
                    active={mapMode === "3d"}
                    alerts={alerts}
                    liveFires={liveFires}
                    liveConflicts={liveConflicts}
                    liveFlights={aviationFlights}
                    layerVisibility={layerVisibility}
                    focusRequest={alertFocusRequest}
                    onAlertClick={(a) => handleAlertSelection(a)}
                    onCountryClick={(c) => setSelectedCountry(c)}
                  />
                </Suspense>
              ) : (
                mapMode === "3d" ? <div className="globe-loading">Preparing 3D globe...</div> : null
              )}
            </div>
            {/* Legend is shared between both views */}
            <MapLegend layers={layerVisibility} onToggle={handleLayerToggle} />
          </div>
        </section>

        {/* Resize Handle */}
        {!isMapFullscreen && (
          <div
            className="resize-handle"
            onMouseDown={handleResizeStart}
            title="Drag to resize map"
          >
            <div className="resize-handle-grip">
              <span /><span /><span />
            </div>
          </div>
        )}

        {/* Panels Grid */}
        {!isMapFullscreen && (
          <div className="panels-grid">
            {visiblePanelOrder.map((id) => (
              <div
                key={id}
                className={`panel-shell ${panelClass(id)}`}
                draggable
                onDragStart={(e) => {
                  dragPanelIdRef.current = id;
                  e.currentTarget.classList.add("dragging");
                }}
                onDragEnd={(e) => e.currentTarget.classList.remove("dragging")}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => {
                  if (dragPanelIdRef.current && dragPanelIdRef.current !== id) {
                    movePanel(dragPanelIdRef.current, id);
                  }
                }}
                onDrop={() => {
                  if (dragPanelIdRef.current) movePanel(dragPanelIdRef.current, id);
                  dragPanelIdRef.current = null;
                }}
              >
                <div className="panel-resize-controls">
                  {panelBaseId(id) === "live-news-video" && (
                    <button
                      className="panel-settings-btn"
                      onClick={() => setSettingsPanelId((prev) => (prev === id ? null : id))}
                      title="Panel settings"
                    >
                      ⚙
                    </button>
                  )}
                  {closeablePanels.has(id) && (
                    <button className="panel-close-btn" onClick={() => removePanel(id)} title="Remove panel">×</button>
                  )}
                </div>
                {settingsPanelId === id && (
                  <div className="panel-settings-menu">
                    {panelBaseId(id) === "live-news-video" ? (
                      <>
                        <div className="panel-settings-title">Live channel</div>
                        <select
                          className="panel-settings-select"
                          value={liveNewsChannelByPanel[id] ?? LIVE_CHANNELS[0]?.id}
                          onChange={(e) => {
                            const channelId = e.target.value;
                            setLiveNewsChannelByPanel((prev) => {
                              const next = { ...prev, [id]: channelId };
                              localStorage.setItem("pip-panel-live-news-channel", JSON.stringify(next));
                              return next;
                            });
                          }}
                        >
                          {LIVE_CHANNELS.map((channel) => (
                            <option key={channel.id} value={channel.id}>{channel.name}</option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <div className="panel-settings-title">No extra settings</div>
                    )}
                  </div>
                )}
                <div className="panel-right-resize" onMouseDown={(e) => startPanelResize(id, "right", e)} title="Resize width" />
                <div className="panel-bottom-resize" onMouseDown={(e) => startPanelResize(id, "bottom", e)} title="Resize height" />
                <div className="panel-corner-resize" onMouseDown={(e) => startPanelResize(id, "corner", e)} title="Resize panel" />
                {renderPanel(id)}
              </div>
            ))}

            <button className="add-panel-btn" onClick={() => setShowPanelSelector(true)}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>+</span>
              <span>Add panel</span>
            </button>

            {/* Error Panel */}
            {error && (
              <article className="panel error-panel">
                <div className="panel-header">
                  <div className="panel-header-left">
                    <span className="panel-icon"><WarningIcon size={15} /></span>
                    <h2 className="panel-title">System Notice</h2>
                  </div>
                </div>
                <div className="panel-content">
                  <pre className="error-output">{error}</pre>
                </div>
              </article>
            )}
          </div>
        )}
      </main>

      {/* Country Deep Dive Panel */}
      <CountryPanel
        country={selectedCountry}
        alerts={alerts}
        onClose={() => setSelectedCountry(null)}
      />

      {cascadeAlert ? (
        <CascadePage alert={cascadeAlert} onClose={handleCascadeClose} />
      ) : null}
    </div>
  );
}
