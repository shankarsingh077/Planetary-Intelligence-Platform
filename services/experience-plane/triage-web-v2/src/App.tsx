import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { getAlerts, getBrief, getCounters, getMeta } from "./api";
import type { Alert, AuthConfig } from "./types";
import { SEED_ALERTS, SEED_BRIEF } from "./seedData";
import { fetchLiveFires, fetchLiveConflicts, fetchLiveMarkets, type LiveFire, type LiveConflict, type MarketQuote } from "./liveApi";
import { Globe3D } from "./Globe3D";
import { CountryPanel } from "./CountryPanel";
import { LiveFeedPanel } from "./LiveFeedPanel";
import { LiveNewsVideoPanel } from "./LiveNewsVideoPanel";
import { MapLegend } from "./MapLegend";
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
  SearchIcon,
  FileTextIcon,
  RefreshIcon,
  MapIcon,
  Globe3DIcon,
  WarningIcon,
  CrosshairIcon,
} from "./Icons";

const AUTH_CONFIG: AuthConfig = {
  mode: "header",
  tenantId: "tenant-demo",
  userId: "user-demo",
  roles: "analyst",
  token: "",
};

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

function severityClass(severity: string | undefined): string {
  return `sev-${severity || "low"}`;
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
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selected, setSelected] = useState<Alert | null>(null);
  const [brief, setBrief] = useState<string>("Connecting to intelligence pipeline...");
  const [eventsCount, setEventsCount] = useState<number>(0);
  const [auditCount, setAuditCount] = useState<number>(0);
  const [liveState, setLiveState] = useState<string>("CONNECTING");
  const [error, setError] = useState<string>("");
  const [clock, setClock] = useState<string>("");
  const [briefTime, setBriefTime] = useState<string>("");
  const [mapMode, setMapMode] = useState<"2d" | "3d">("2d");
  const [mapHeight, setMapHeight] = useState<number>(45);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string } | null>(null);
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(DEFAULT_LAYERS);
  const [mapReady, setMapReady] = useState(0);
  const [liveFires, setLiveFires] = useState<LiveFire[]>([]);
  const [liveConflicts, setLiveConflicts] = useState<LiveConflict[]>([]);
  const [liveMarkets, setLiveMarkets] = useState<Record<string, MarketQuote> | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const geoLayerRef = useRef<L.LayerGroup | null>(null);
  const geoJsonRef = useRef<L.GeoJSON | null>(null);
  const liveLayerRef = useRef<L.LayerGroup | null>(null);
  const timerRef = useRef<number | null>(null);
  const mapSectionRef = useRef<HTMLElement | null>(null);

  const isResizingRef = useRef(false);
  const resizeStartYRef = useRef(0);
  const resizeStartHeightRef = useRef(0);

  const selectedAlert = selected || alerts[0] || null;

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

    // Fetch live data in parallel (non-blocking)
    const livePromises = Promise.allSettled([
      fetchLiveFires(),
      fetchLiveConflicts(),
      fetchLiveMarkets(),
    ]).then(([firesResult, conflictsResult, marketsResult]) => {
      if (firesResult.status === "fulfilled" && firesResult.value) {
        setLiveFires(firesResult.value);
      }
      if (conflictsResult.status === "fulfilled" && conflictsResult.value) {
        setLiveConflicts(conflictsResult.value);
      }
      if (marketsResult.status === "fulfilled" && marketsResult.value) {
        setLiveMarkets(marketsResult.value);
      }
    });

    try {
      const [, nextAlerts, nextBrief, counters] = await Promise.all([
        getMeta(),
        getAlerts(AUTH_CONFIG),
        getBrief(AUTH_CONFIG),
        getCounters(AUTH_CONFIG),
      ]);

      if (nextAlerts.length > 0) {
        setAlerts(nextAlerts);
        setSelected((prev: Alert | null) => prev || nextAlerts[0] || null);
        setApiReachable(true);
        setLiveState("LIVE");
      } else {
        throw new Error("No alerts from API");
      }

      setBrief(formatBrief(nextBrief as unknown as Record<string, unknown>));
      setBriefTime(`Updated ${formatTime(new Date())}`);
      setEventsCount(Number(counters.eventRecords || 0));
      setAuditCount(Number(counters.auditAssignments || 0));
    } catch {
      // Fallback to seed data
      if (alerts.length === 0) {
        setAlerts(SEED_ALERTS);
        setSelected(SEED_ALERTS[0]);
        setEventsCount(SEED_ALERTS.length);
        setAuditCount(0);
      }
      if (brief === "Connecting to intelligence pipeline..." || brief.startsWith("{")) {
        setBrief(formatBrief(SEED_BRIEF as unknown as Record<string, unknown>));
        setBriefTime(`Seed data ${formatTime(new Date())}`);
      }
      setApiReachable(false);
      setLiveState("LIVE SEED");
    }

    await livePromises;
  }, [alerts.length, brief]);

  useEffect(() => {
    void refreshAll();
    timerRef.current = window.setInterval(() => {
      if (document.hidden) {
        setLiveState((prev) => prev.includes("PAUSED") ? prev : prev + " PAUSED");
        return;
      }
      void refreshAll();
    }, 15000);

    const onVisible = () => {
      if (!document.hidden) void refreshAll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshAll]);

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

        fetch("/countries-110m.geojson")
          .then((r) => r.json())
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
                  setSelectedCountry({ code: iso, name });
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

      marker.on("click", () => setSelected(alert));
      marker.addTo(layer);
    }

    if (latLngs.length > 0) {
      map.fitBounds(L.latLngBounds(latLngs).pad(0.25), { maxZoom: 5 });
    }
  }, [alerts, mapMode]);

  /* ─── Geo Intelligence Layers ────────────────────────────────────────── */

  const handleLayerToggle = useCallback((key: keyof LayerVisibility) => {
    setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  useEffect(() => {
    if (mapMode !== "2d" || !mapRef.current || !geoLayerRef.current) return;

    const geoLayer = geoLayerRef.current;
    geoLayer.clearLayers();

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

    // CONFLICT ZONES — red polygons
    if (layerVisibility.conflictZones) {
      for (const zone of CONFLICT_ZONES) {
        const latlngs = zone.coords.map(c => [c[1], c[0]] as [number, number]);
        const intensityOpacity = zone.intensity === 'high' ? 0.18 : zone.intensity === 'medium' ? 0.12 : 0.06;
        const polygon = L.polygon(latlngs, {
          color: '#ff2233',
          weight: 1.5,
          fillColor: '#ff2233',
          fillOpacity: intensityOpacity,
          dashArray: '4 3',
        });
        polygon.bindPopup(`
          <div style="min-width:200px;font-family:'Inter',monospace;">
            <div style="font-weight:700;color:#ff4444;font-size:12px;margin-bottom:4px;">CONFLICT ZONE</div>
            <div style="font-size:13px;font-weight:600;margin-bottom:6px;">${zone.name}</div>
            <div style="font-size:10px;color:#aaa;margin-bottom:4px;">Parties: ${zone.parties.join(', ')}</div>
            ${zone.casualties ? `<div style="font-size:10px;color:#ff8888;">Casualties: ${zone.casualties}</div>` : ''}
            ${zone.displaced ? `<div style="font-size:10px;color:#ffaa44;">Displaced: ${zone.displaced}</div>` : ''}
            ${zone.description ? `<div style="font-size:10px;color:#ccc;margin-top:4px;">${zone.description}</div>` : ''}
          </div>
        `);
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
          weight: 1.8,
          opacity: 0.65,
          dashArray: pipe.status === 'operating' ? undefined : '6 4',
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

    // Render live FIRMS fire hotspots
    if (liveFires.length > 0) {
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

    // Render live ACLED conflict events
    if (liveConflicts.length > 0) {
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
  }, [mapMode, liveFires, liveConflicts, mapReady]);

  useEffect(() => {
    if (mapMode === "2d" && mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    }
  }, [mapHeight, mapMode]);

  useEffect(() => {
    if (mapMode === "3d" && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      layerRef.current = null;
      geoJsonRef.current = null;
    }
  }, [mapMode]);

  /* ─── Resize Handle ──────────────────────────────────────────────────── */

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      isResizingRef.current = true;
      resizeStartYRef.current = e.clientY;
      resizeStartHeightRef.current = mapHeight;
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
      e.preventDefault();
    },
    [mapHeight]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaY = e.clientY - resizeStartYRef.current;
      const deltaPercent = (deltaY / window.innerHeight) * 100;
      const newHeight = Math.max(15, Math.min(80, resizeStartHeightRef.current + deltaPercent));
      setMapHeight(newHeight);
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  /* ─── Map mode toggle ────────────────────────────────────────────────── */

  const handleModeSwitch = useCallback(
    (mode: "2d" | "3d") => {
      if (mode === mapMode) return;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
        geoJsonRef.current = null;
      }
      setMapMode(mode);
    },
    [mapMode]
  );

  /* ─── Status ─────────────────────────────────────────────────────────── */

  const statusDotClass =
    liveState.includes("ERR") ? "status-dot error"
    : liveState.includes("PAUSED") ? "status-dot paused"
    : liveState === "CONNECTING" ? "status-dot paused"
    : "status-dot";

  /* ─── Render ─────────────────────────────────────────────────────────── */

  return (
    <div id="app">
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
            <span className={statusDotClass} />
            <span>{liveState}</span>
            {apiReachable === false && <span className="status-source">SEED</span>}
          </div>
        </div>
        <div className="header-center">
          <span className="header-title">Global Situation Console</span>
          <span className="header-clock">{clock}</span>
        </div>
        <div className="header-right">
          <div className="stat-chips">
            <span className="chip"><SirenIcon size={12} /> ALERTS {alerts.length}</span>
            <span className="chip"><SignalIcon size={12} /> EVENTS {eventsCount}</span>
            <span className="chip"><ClipboardIcon size={12} /> AUDIT {auditCount}</span>
          </div>
          <button className="refresh-btn" onClick={() => void refreshAll()}>
            <RefreshIcon size={14} />
            Refresh
          </button>
        </div>
      </header>

      {/* Market Ticker Bar */}
      {liveMarkets && (
        <div className="market-ticker-bar">
          {Object.entries(liveMarkets).map(([name, q]) => {
            if (!q || q.error) return null;
            const isUp = (q.change_pct || 0) >= 0;
            return (
              <span key={name} className="market-ticker-item">
                <span className="market-ticker-name">{name.replace(/_/g, " ").toUpperCase()}</span>
                <span className="market-ticker-price">${typeof q.price === "number" ? q.price.toFixed(2) : "—"}</span>
                <span className={`market-ticker-change ${isUp ? "up" : "down"}`}>
                  {isUp ? "▲" : "▼"} {Math.abs(q.change_pct || 0).toFixed(2)}%
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        {/* Map Section */}
        <section
          className="map-section"
          ref={mapSectionRef}
          style={{ height: `${mapHeight}vh` }}
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
            </div>
          </div>

          <div className="map-container">
            {mapMode === "2d" ? (
              <>
                <div id="map-canvas" key="leaflet-map" />
                <MapLegend layers={layerVisibility} onToggle={handleLayerToggle} />
              </>
            ) : (
              <Globe3D
                key="globe-3d"
                alerts={alerts}
                onAlertClick={(a) => setSelected(a)}
                onCountryClick={(c) => setSelectedCountry(c)}
              />
            )}
          </div>
        </section>

        {/* Resize Handle */}
        <div
          className="resize-handle"
          onMouseDown={handleResizeStart}
          title="Drag to resize map"
        >
          <div className="resize-handle-grip">
            <span /><span /><span />
          </div>
        </div>

        {/* Panels Grid */}
        <div className="panels-grid">
          {/* Live Feed Panel */}
          <LiveFeedPanel />

          {/* Alerts Panel */}
          <article className="panel alerts-panel">
            <div className="panel-header">
              <div className="panel-header-left">
                <span className="panel-icon"><SirenIcon size={15} /></span>
                <h2 className="panel-title">Live Alert Inbox</h2>
              </div>
              <span className="panel-badge">{alerts.length}</span>
            </div>
            <p className="panel-hint">Click an alert for explainability and recommended actions</p>
            <div className="panel-content">
              {alerts.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon"><CrosshairIcon size={32} color="#444" /></span>
                  <p>Waiting for alerts from intelligence pipeline...</p>
                </div>
              ) : (
                <ul className="alert-list">
                  {alerts.map((alert) => (
                    <li
                      key={alert.alert_id}
                      className={`alert-item ${severityClass(alert.severity)} ${selected?.alert_id === alert.alert_id ? "selected" : ""}`}
                      onClick={() => setSelected(alert)}
                    >
                      <strong>{alert.snapshot || "No snapshot available"}</strong>
                      <div className="meta">
                        <span className="meta-badge">{(alert.severity || "low").toUpperCase()}</span>
                        <span>confidence: {fmtConfidence(alert.confidence)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>

          {/* Details Panel */}
          <article className="panel details-panel">
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

          {/* Brief Panel */}
          <article className="panel brief-panel span-2">
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

          {/* Live News Video Panel */}
          <LiveNewsVideoPanel />

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
      </main>

      {/* Country Deep Dive Panel */}
      <CountryPanel
        country={selectedCountry}
        alerts={alerts}
        onClose={() => setSelectedCountry(null)}
      />
    </div>
  );
}
