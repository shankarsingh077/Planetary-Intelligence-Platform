/**
 * Globe3D — Interactive 3D globe using globe.gl
 *
 * Keeps the 3D scene mounted after first load so mode switches stay quick,
 * while mirroring the same legend-driven layers available in 2D.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe from "globe.gl";
import type { GlobeInstance } from "globe.gl";
import type { LiveConflict, LiveFire, LiveFlight } from "./liveApi";
import type { Alert } from "./types";
import {
  CONFLICT_ZONES,
  INTEL_HOTSPOTS,
  MILITARY_BASES,
  PIPELINES,
  PORTS,
  STRATEGIC_WATERWAYS,
  resolveTradeRouteSegments,
} from "./geoData";
import type { ConflictZone, LayerVisibility } from "./geoData";
import {
  EARTH_BUMP_URL,
  EARTH_TEXTURE_URL,
  loadCountriesGeoJson,
} from "./mapAssets";
import { resolveAlertGeo, seededCoordinates } from "./liveAlertUtils";

function alertCoords(alert: Alert): { lat: number; lon: number } {
  const resolved = resolveAlertGeo(alert);
  if (resolved) {
    return { lat: resolved.lat, lon: resolved.lon };
  }
  return seededCoordinates(alert.event_id || alert.alert_id || "unknown");
}

function severityColor(severity: string | undefined): string {
  if (severity === "critical") return "#ff4444";
  if (severity === "high") return "#ff8800";
  if (severity === "medium") return "#ffaa00";
  return "#44aa44";
}

function escapeHtml(value: string | undefined): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function portColor(type: string): string {
  switch (type) {
    case "container":
      return "#00b4d8";
    case "oil":
      return "#ff6b35";
    case "lng":
      return "#b44dff";
    case "naval":
      return "#ff2244";
    case "mixed":
      return "#1abc9c";
    default:
      return "#8a94a6";
  }
}

function baseColor(type: string): string {
  switch (type) {
    case "us-nato":
      return "#4488ff";
    case "russia":
      return "#ff4444";
    case "china":
      return "#ffcc00";
    case "france":
      return "#3388ff";
    case "uk":
      return "#44aaff";
    case "india":
      return "#ff8844";
    default:
      return "#aa88ff";
  }
}

function hotspotColor(score: number): string {
  if (score >= 5) return "#ff2244";
  if (score >= 4) return "#ff6b35";
  if (score >= 3) return "#ffaa00";
  return "#44ff88";
}

function routeColor(category: string): string {
  if (category === "energy") return "#ff6b35";
  if (category === "bulk") return "#cd853f";
  return "#44ff88";
}

function conflictZoneHtml(zone: ConflictZone): string {
  return `
    <div style="min-width:230px;background:rgba(10,10,10,0.94);border:1px solid rgba(255,68,68,0.24);padding:10px 12px;border-radius:8px;font-family:'Inter',system-ui,sans-serif;color:#eef3ff;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#ff5d6e;margin-bottom:6px;">CONFLICT ZONE</div>
      <div style="font-size:13px;font-weight:700;margin-bottom:4px;">${escapeHtml(zone.name)}</div>
      <div style="font-size:10px;color:#97a3b6;margin-bottom:4px;">${escapeHtml(zone.location || "Active theater")}</div>
      <div style="font-size:11px;line-height:1.45;color:#cfd6e6;">${escapeHtml(zone.description || "")}</div>
    </div>
  `;
}

function alertLabelHtml(alert: Alert): string {
  const severity = alert.severity || "low";
  return `
    <div style="min-width:220px;background:rgba(10,10,10,0.94);border:1px solid rgba(68,255,136,0.18);padding:10px 12px;border-radius:8px;font-family:'Inter',system-ui,sans-serif;color:#eef3ff;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:${severityColor(severity)};margin-bottom:6px;">${escapeHtml(severity.toUpperCase())} ALERT</div>
      <div style="font-size:13px;line-height:1.45;margin-bottom:6px;">${escapeHtml(alert.snapshot || "No summary available.")}</div>
      <div style="font-size:10px;color:#97a3b6;">Confidence ${Number(alert.confidence || 0).toFixed(2)}</div>
    </div>
  `;
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

function flightLabelHtml(flight: LiveFlight): string {
  return `
    <div style="min-width:220px;background:rgba(10,10,10,0.94);border:1px solid rgba(103,212,255,0.26);padding:10px 12px;border-radius:8px;font-family:'Inter',system-ui,sans-serif;color:#eef3ff;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#67d4ff;margin-bottom:6px;">OPENSKY NETWORK FLIGHT</div>
      <div style="font-size:13px;font-weight:700;margin-bottom:4px;">${escapeHtml(flightIdentity(flight))}</div>
      <div style="font-size:10px;color:#97a3b6;margin-bottom:4px;">${escapeHtml(flight.origin_country || "Unknown origin")}</div>
      <div style="font-size:11px;line-height:1.45;color:#cfd6e6;">Altitude ${formatFlightAltitude(flight.altitude)} · Speed ${formatFlightSpeed(flight.velocity)}</div>
      <div style="font-size:10px;color:#97a3b6;margin-top:4px;">Heading ${formatFlightHeading(flight.heading)} · ICAO24 ${escapeHtml(String(flight.icao24 || "").toUpperCase())}</div>
    </div>
  `;
}

function tunePointShape(altitude: number, radius: number): Pick<GlobePointDatum, "altitude" | "radius"> {
  return {
    // Keep the markers broad and much flatter so they sit on the globe instead of spiking outward.
    altitude: altitude * 0.39,
    radius: radius * 1.75,
  };
}

interface GlobePointDatum {
  id: string;
  kind: string;
  lat: number;
  lng: number;
  altitude: number;
  radius: number;
  color: string;
  label: string;
  alert?: Alert;
}

interface GlobeRingDatum {
  id: string;
  lat: number;
  lng: number;
  altitude: number;
  color: string;
  maxRadius: number;
  speed: number;
  period: number;
}

interface GlobeLabelDatum {
  id: string;
  lat: number;
  lng: number;
  text: string;
  color: string;
  altitude: number;
  size: number;
  dotRadius: number;
}

interface GlobePathDatum {
  id: string;
  color: string;
  stroke: number;
  dashLength: number;
  dashGap: number;
  dashAnimateTime: number;
  label: string;
  points: Array<{ lat: number; lng: number; alt: number }>;
}

interface GlobeArcDatum {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  altitude: number;
  stroke: number;
  dashLength: number;
  dashGap: number;
  dashAnimateTime: number;
  color: string;
  label: string;
}

interface Globe3DProps {
  active: boolean;
  alerts: Alert[];
  liveFires: LiveFire[];
  liveConflicts: LiveConflict[];
  liveFlights: LiveFlight[];
  layerVisibility: LayerVisibility;
  focusRequest?: { alertId: string; seq: number } | null;
  onAlertClick?: (alert: Alert) => void;
  onCountryClick?: (country: { code: string; name: string }) => void;
}

export function Globe3D({
  active,
  alerts,
  liveFires,
  liveConflicts,
  liveFlights,
  layerVisibility,
  focusRequest,
  onAlertClick,
  onCountryClick,
}: Globe3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const autoRotateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [countriesGeoJson, setCountriesGeoJson] = useState<any>(null);
  const [selectedOverlayHtml, setSelectedOverlayHtml] = useState<string | null>(null);
  const realConflictZones = useMemo(() => CONFLICT_ZONES.filter((zone) => !zone.isScenario), []);

  const scheduleAutoRotate = useCallback(() => {
    if (autoRotateTimerRef.current) clearTimeout(autoRotateTimerRef.current);
    autoRotateTimerRef.current = setTimeout(() => {
      const globe = globeRef.current;
      if (!globe) return;
      const controls = globe.controls() as any;
      if (controls) {
        controls.autoRotate = active;
      }
    }, 60_000);
  }, [active]);

  const pauseAutoRotate = useCallback(() => {
    const globe = globeRef.current;
    if (globe) {
      const controls = globe.controls() as any;
      if (controls) {
        controls.autoRotate = false;
      }
    }
    scheduleAutoRotate();
  }, [scheduleAutoRotate]);

  const countryPolygons = useMemo(() => {
    const features = countriesGeoJson?.features || [];
    return features
      .filter((feature: any) => feature?.properties?.ISO_A2 !== "AQ")
      .map((feature: any) => ({
        ...feature,
        properties: {
          ...feature.properties,
          __layerKind: "country",
        },
      }));
  }, [countriesGeoJson]);

  const alertPoints = useMemo<GlobePointDatum[]>(() => {
    if (!layerVisibility.alerts) return [];
    return alerts.map((alert) => {
      const coords = alertCoords(alert);
      const severity = alert.severity || "low";
      const isCritical = severity === "critical";
      const isHigh = severity === "high";
      return {
        id: alert.alert_id || alert.event_id || `${coords.lat}:${coords.lon}`,
        kind: "alert",
        lat: coords.lat,
        lng: coords.lon,
        ...tunePointShape(
          isCritical ? 0.06 : isHigh ? 0.05 : 0.04,
          isCritical ? 0.22 : isHigh ? 0.18 : 0.14
        ),
        color: severityColor(severity),
        label: alertLabelHtml(alert),
        alert,
      };
    });
  }, [alerts, layerVisibility.alerts]);

  const contextPoints = useMemo<GlobePointDatum[]>(() => {
    const points: GlobePointDatum[] = [];

    if (layerVisibility.waterways) {
      for (const waterway of STRATEGIC_WATERWAYS) {
        points.push({
          id: `waterway-${waterway.id}`,
          kind: "waterway",
          lat: waterway.lat,
          lng: waterway.lon,
          ...tunePointShape(0.034, 0.18),
          color: "#ffd700",
          label: `
            <div style="min-width:210px;background:rgba(10,10,10,0.94);border:1px solid rgba(255,215,0,0.28);padding:10px 12px;border-radius:8px;font-family:'Inter',system-ui,sans-serif;color:#eef3ff;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#ffd700;margin-bottom:6px;">STRATEGIC WATERWAY</div>
              <div style="font-size:13px;font-weight:700;margin-bottom:5px;">${escapeHtml(waterway.name)}</div>
              <div style="font-size:11px;line-height:1.45;color:#cfd6e6;">${escapeHtml(waterway.description)}</div>
            </div>
          `,
        });
      }
    }

    if (layerVisibility.aviation) {
      for (const flight of liveFlights) {
        if (!Number.isFinite(flight.lat) || !Number.isFinite(flight.lon) || flight.on_ground) continue;
        const velocityBoost = Math.min(0.012, Math.max((flight.velocity || 0) / 12000, 0));
        points.push({
          id: `flight-${flight.icao24}-${Math.round(flight.lat * 100)}-${Math.round(flight.lon * 100)}`,
          kind: "flight",
          lat: flight.lat,
          lng: flight.lon,
          ...tunePointShape(0.024 + velocityBoost, 0.08 + velocityBoost * 3.5),
          color: "#67d4ff",
          label: flightLabelHtml(flight),
        });
      }
    }

    if (layerVisibility.ports) {
      for (const port of PORTS) {
        const color = portColor(port.type);
        points.push({
          id: `port-${port.id}`,
          kind: "port",
          lat: port.lat,
          lng: port.lon,
          ...tunePointShape(
            port.rank && port.rank <= 10 ? 0.03 : 0.024,
            port.rank && port.rank <= 10 ? 0.17 : 0.12
          ),
          color,
          label: `
            <div style="min-width:220px;background:rgba(10,10,10,0.94);border:1px solid rgba(68,255,136,0.18);padding:10px 12px;border-radius:8px;font-family:'Inter',system-ui,sans-serif;color:#eef3ff;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:${color};margin-bottom:6px;">${escapeHtml(port.type.toUpperCase())} PORT${port.rank ? ` #${port.rank}` : ""}</div>
              <div style="font-size:13px;font-weight:700;margin-bottom:4px;">${escapeHtml(port.name)}</div>
              <div style="font-size:10px;color:#97a3b6;margin-bottom:4px;">${escapeHtml(port.country)}</div>
              <div style="font-size:11px;line-height:1.45;color:#cfd6e6;">${escapeHtml(port.note)}</div>
            </div>
          `,
        });
      }
    }

    if (layerVisibility.militaryBases) {
      for (const base of MILITARY_BASES) {
        const color = baseColor(base.type);
        points.push({
          id: `base-${base.id}`,
          kind: "base",
          lat: base.lat,
          lng: base.lon,
          ...tunePointShape(0.036, 0.15),
          color,
          label: `
            <div style="min-width:200px;background:rgba(10,10,10,0.94);border:1px solid rgba(68,255,136,0.18);padding:10px 12px;border-radius:8px;font-family:'Inter',system-ui,sans-serif;color:#eef3ff;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:${color};margin-bottom:6px;">${escapeHtml(base.type.toUpperCase())} BASE</div>
              <div style="font-size:13px;font-weight:700;margin-bottom:4px;">${escapeHtml(base.name)}</div>
              ${base.country ? `<div style="font-size:10px;color:#97a3b6;margin-bottom:4px;">${escapeHtml(base.country)}</div>` : ""}
              <div style="font-size:11px;line-height:1.45;color:#cfd6e6;">${escapeHtml(base.description)}</div>
            </div>
          `,
        });
      }
    }

    if (layerVisibility.hotspots) {
      for (const hotspot of INTEL_HOTSPOTS) {
        const score = hotspot.escalationScore || 2;
        const color = hotspotColor(score);
        points.push({
          id: `hotspot-${hotspot.id}`,
          kind: "hotspot",
          lat: hotspot.lat,
          lng: hotspot.lon,
          ...tunePointShape(score >= 4 ? 0.045 : 0.036, score >= 4 ? 0.18 : 0.14),
          color,
          label: `
            <div style="min-width:230px;background:rgba(10,10,10,0.94);border:1px solid rgba(68,255,136,0.18);padding:10px 12px;border-radius:8px;font-family:'Inter',system-ui,sans-serif;color:#eef3ff;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:${color};margin-bottom:6px;">INTEL HOTSPOT ${score}/5</div>
              <div style="font-size:13px;font-weight:700;margin-bottom:4px;">${escapeHtml(hotspot.name)}</div>
              <div style="font-size:10px;color:#97a3b6;margin-bottom:4px;">${escapeHtml(hotspot.subtext)}</div>
              <div style="font-size:11px;line-height:1.45;color:#cfd6e6;">${escapeHtml(hotspot.description)}</div>
            </div>
          `,
        });
      }

      for (const fire of liveFires) {
        if (!fire.lat || !fire.lon) continue;
        points.push({
          id: `fire-${fire.lat}-${fire.lon}-${fire.acq_date}-${fire.acq_time}`,
          kind: "fire",
          lat: fire.lat,
          lng: fire.lon,
          ...tunePointShape(0.04, Math.min(0.1 + (fire.frp || 0) / 700, 0.22)),
          color: "#ff6600",
          label: `
            <div style="min-width:220px;background:rgba(10,10,10,0.94);border:1px solid rgba(255,102,0,0.25);padding:10px 12px;border-radius:8px;font-family:'Inter',system-ui,sans-serif;color:#eef3ff;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#ff6600;margin-bottom:6px;">NASA FIRMS FIRE</div>
              <div style="font-size:11px;line-height:1.45;color:#cfd6e6;">FRP ${Number(fire.frp || 0).toFixed(1)} MW</div>
              <div style="font-size:10px;color:#97a3b6;">${escapeHtml(fire.acq_date)} ${escapeHtml(fire.acq_time)} · ${escapeHtml(fire.satellite)}</div>
            </div>
          `,
        });
      }
    }

    if (layerVisibility.conflictZones) {
      for (const zone of realConflictZones) {
        const intensityBoost = zone.intensity === "high" ? 1 : zone.intensity === "medium" ? 0.8 : 0.65;
        points.push({
          id: `conflict-zone-${zone.id}`,
          kind: "conflict-zone",
          lat: zone.center[1],
          lng: zone.center[0],
          ...tunePointShape(0.046 * intensityBoost, 0.16 * intensityBoost),
          color: "#ff3344",
          label: conflictZoneHtml(zone),
        });
      }

      for (const event of liveConflicts) {
        if (!event.lat || !event.lon) continue;
        const color = event.fatalities > 10 ? "#ff2244" : event.fatalities > 0 ? "#ff8800" : "#ffaa00";
        points.push({
          id: `conflict-${event.id}`,
          kind: "conflict-event",
          lat: event.lat,
          lng: event.lon,
          ...tunePointShape(0.042, event.fatalities > 10 ? 0.16 : 0.12),
          color,
          label: `
            <div style="min-width:220px;background:rgba(10,10,10,0.94);border:1px solid rgba(255,68,68,0.25);padding:10px 12px;border-radius:8px;font-family:'Inter',system-ui,sans-serif;color:#eef3ff;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:${color};margin-bottom:6px;">ACLED CONFLICT EVENT</div>
              <div style="font-size:13px;font-weight:700;margin-bottom:4px;">${escapeHtml(event.type)}</div>
              <div style="font-size:10px;color:#97a3b6;margin-bottom:4px;">${escapeHtml(event.location)}, ${escapeHtml(event.country)}</div>
              <div style="font-size:11px;line-height:1.45;color:#cfd6e6;">Fatalities ${event.fatalities}</div>
            </div>
          `,
        });
      }
    }

    return points;
  }, [layerVisibility, liveConflicts, liveFires, liveFlights, realConflictZones]);

  const globePoints = useMemo(
    () => [...contextPoints, ...alertPoints],
    [contextPoints, alertPoints]
  );

  const alertRings = useMemo<GlobeRingDatum[]>(() => {
    if (!layerVisibility.alerts) return [];
    return alertPoints.map((point) => ({
      id: `${point.id}-ring`,
      lat: point.lat,
      lng: point.lng,
      altitude: Math.max(0.012, point.altitude - 0.004),
      color: point.color,
      maxRadius: point.kind === "alert" && point.alert?.severity === "critical" ? 2.5 : 1.9,
      speed: 1.2,
      period: 0,
    }));
  }, [alertPoints, layerVisibility.alerts]);

  const globeLabels = useMemo<GlobeLabelDatum[]>(() => {
    const labels: GlobeLabelDatum[] = [];

    if (layerVisibility.waterways) {
      for (const waterway of STRATEGIC_WATERWAYS) {
        labels.push({
          id: `waterway-label-${waterway.id}`,
          lat: waterway.lat,
          lng: waterway.lon,
          text: waterway.name,
          color: "#ffe27a",
          altitude: 0.052,
          size: 0.36,
          dotRadius: 0.08,
        });
      }
    }

    if (layerVisibility.hotspots) {
      for (const hotspot of INTEL_HOTSPOTS) {
        if ((hotspot.escalationScore || 0) < 4) continue;
        labels.push({
          id: `hotspot-label-${hotspot.id}`,
          lat: hotspot.lat,
          lng: hotspot.lon,
          text: hotspot.name,
          color: hotspotColor(hotspot.escalationScore || 0),
          altitude: 0.058,
          size: 0.34,
          dotRadius: 0.08,
        });
      }
    }

    if (layerVisibility.alerts) {
      for (const point of alertPoints) {
        if (point.alert?.severity !== "critical" && point.alert?.severity !== "high") continue;
        labels.push({
          id: `alert-label-${point.id}`,
          lat: point.lat,
          lng: point.lng,
          text: point.alert?.severity === "critical" ? "Critical alert" : "High alert",
          color: point.color,
          altitude: point.altitude + 0.016,
          size: 0.3,
          dotRadius: 0.07,
        });
      }
    }

    return labels;
  }, [alertPoints, layerVisibility.alerts, layerVisibility.hotspots, layerVisibility.waterways]);

  const tradeArcs = useMemo<GlobeArcDatum[]>(() => {
    if (!layerVisibility.tradeRoutes) return [];
    return resolveTradeRouteSegments().map((segment) => ({
      id: `trade-${segment.routeId}-${segment.sourcePosition.join(",")}-${segment.targetPosition.join(",")}`,
      startLat: segment.sourcePosition[1],
      startLng: segment.sourcePosition[0],
      endLat: segment.targetPosition[1],
      endLng: segment.targetPosition[0],
      altitude: segment.status === "high_risk" ? 0.18 : segment.status === "disrupted" ? 0.15 : 0.12,
      stroke: segment.category === "energy" ? 0.45 : 0.35,
      dashLength: 0.55,
      dashGap: 0.3,
      dashAnimateTime: 2200,
      color: routeColor(segment.category),
      label: `
        <div style="min-width:210px;background:rgba(10,10,10,0.94);border:1px solid rgba(68,255,136,0.18);padding:10px 12px;border-radius:8px;font-family:'Inter',system-ui,sans-serif;color:#eef3ff;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:${routeColor(segment.category)};margin-bottom:6px;">TRADE ROUTE</div>
          <div style="font-size:13px;font-weight:700;margin-bottom:4px;">${escapeHtml(segment.routeName)}</div>
          <div style="font-size:10px;color:#97a3b6;margin-bottom:4px;">${escapeHtml(segment.category.toUpperCase())} · ${escapeHtml(segment.status.replace(/_/g, " "))}</div>
          <div style="font-size:11px;line-height:1.45;color:#cfd6e6;">${escapeHtml(segment.volumeDesc)}</div>
        </div>
      `,
    }));
  }, [layerVisibility.tradeRoutes]);

  const conflictOutlinePaths = useMemo<GlobePathDatum[]>(() => {
    if (!layerVisibility.conflictZones) return [];
    return realConflictZones
      .filter((zone) => zone.coords.length > 5)
      .map((zone) => ({
        id: `conflict-outline-${zone.id}`,
        color: "#ff3344",
        stroke: zone.intensity === "high" ? 0.5 : zone.intensity === "medium" ? 0.42 : 0.34,
        dashLength: 0.72,
        dashGap: 0.16,
        dashAnimateTime: 0,
        label: conflictZoneHtml(zone),
        points: zone.coords.map(([lng, lat]) => ({
          lat,
          lng,
          alt: 0.01,
        })),
      }));
  }, [layerVisibility.conflictZones, realConflictZones]);

  const pipelinePaths = useMemo<GlobePathDatum[]>(() => {
    if (!layerVisibility.pipelines) return [];
    return PIPELINES.map((pipeline) => {
      const color = pipeline.type === "oil" ? "#ff6b35" : "#00b4d8";
      return {
        id: `pipeline-${pipeline.id}`,
        color,
        stroke: pipeline.type === "oil" ? 0.62 : 0.54,
        dashLength: pipeline.status === "operating" ? 1 : 0.5,
        dashGap: pipeline.status === "operating" ? 0 : 0.35,
        dashAnimateTime: pipeline.status === "operating" ? 0 : 1600,
        label: `
          <div style="min-width:210px;background:rgba(10,10,10,0.94);border:1px solid rgba(68,255,136,0.18);padding:10px 12px;border-radius:8px;font-family:'Inter',system-ui,sans-serif;color:#eef3ff;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:${color};margin-bottom:6px;">${escapeHtml(pipeline.type.toUpperCase())} PIPELINE</div>
            <div style="font-size:13px;font-weight:700;margin-bottom:4px;">${escapeHtml(pipeline.name)}</div>
            <div style="font-size:10px;color:#97a3b6;margin-bottom:4px;">${escapeHtml(pipeline.status.toUpperCase())} · ${escapeHtml(pipeline.length)}</div>
            <div style="font-size:11px;line-height:1.45;color:#cfd6e6;">Capacity ${escapeHtml(pipeline.capacity)} · ${escapeHtml(pipeline.operator)}</div>
          </div>
        `,
        points: pipeline.points.map(([lng, lat]) => ({
          lat,
          lng,
          alt: pipeline.status === "operating" ? 0.012 : 0.016,
        })),
      };
    });
  }, [layerVisibility.pipelines]);

  useEffect(() => {
    if (!containerRef.current || globeRef.current) return;

    const element = containerRef.current;
    const globe = new Globe(element);
    let canvas: HTMLCanvasElement | null = null;
    let frameId = 0;
    let cancelled = false;

    globe
      .globeImageUrl(EARTH_TEXTURE_URL)
      .bumpImageUrl(EARTH_BUMP_URL)
      .backgroundImageUrl("")
      .atmosphereColor("#3388ff")
      .atmosphereAltitude(0.22)
      .width(element.clientWidth)
      .height(element.clientHeight);

    try {
      const scene = globe.scene();
      const THREE = (window as any).THREE;
      if (scene && THREE && THREE.Color) {
        scene.background = new THREE.Color(0x0a0e1a);
      }
    } catch {
      // Ignore if THREE isn't exposed on window.
    }

    const controls = globe.controls() as any;
    if (controls) {
      controls.autoRotate = active;
      controls.autoRotateSpeed = 0.35;
      controls.enablePan = false;
      controls.enableZoom = true;
      controls.zoomSpeed = 1.1;
      controls.minDistance = 145;
      controls.maxDistance = 460;
      controls.enableDamping = true;
      controls.enabled = active;
    }

    frameId = window.requestAnimationFrame(() => {
      canvas = element.querySelector("canvas");
      if (!canvas) return;

      canvas.style.position = "absolute";
      canvas.style.inset = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";

      canvas.addEventListener("mousedown", pauseAutoRotate);
      canvas.addEventListener("touchstart", pauseAutoRotate, { passive: true });
      canvas.addEventListener("wheel", pauseAutoRotate, { passive: true });
      canvas.addEventListener("mouseup", scheduleAutoRotate);
      canvas.addEventListener("touchend", scheduleAutoRotate);
    });

    loadCountriesGeoJson()
      .then((geoData) => {
        if (!cancelled) {
          setCountriesGeoJson(geoData);
        }
      })
      .catch((error) => {
        console.warn("[Globe3D] Failed to load countries GeoJSON:", error);
      });

    const resizeObserver = new ResizeObserver(() => {
      if (element.clientWidth > 0 && element.clientHeight > 0) {
        globe.width(element.clientWidth).height(element.clientHeight);
      }
    });
    resizeObserver.observe(element);

    globeRef.current = globe;

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      if (autoRotateTimerRef.current) clearTimeout(autoRotateTimerRef.current);
      if (canvas) {
        canvas.removeEventListener("mousedown", pauseAutoRotate);
        canvas.removeEventListener("touchstart", pauseAutoRotate);
        canvas.removeEventListener("wheel", pauseAutoRotate);
        canvas.removeEventListener("mouseup", scheduleAutoRotate);
        canvas.removeEventListener("touchend", scheduleAutoRotate);
      }
      globe._destructor();
      globeRef.current = null;
    };
  }, [active, pauseAutoRotate, scheduleAutoRotate]);

  useEffect(() => {
    const globe = globeRef.current as any;
    if (!globe) return;

    const controls = globe.controls() as any;
    if (controls) {
      controls.enabled = active;
      controls.autoRotate = active;
    }

    if (active) {
      globe.resumeAnimation?.();
      scheduleAutoRotate();
    } else {
      if (autoRotateTimerRef.current) clearTimeout(autoRotateTimerRef.current);
      globe.pauseAnimation?.();
    }
  }, [active, scheduleAutoRotate]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const polygons = countryPolygons;

    const applyPolygonStyles = (activeCountryPolygon: any | null) => {
      globe
        .polygonsData(polygons)
        .polygonAltitude((polygon: any) => (polygon === activeCountryPolygon ? 0.012 : 0.004))
        .polygonCapColor((polygon: any) =>
          polygon === activeCountryPolygon ? "rgba(68, 255, 136, 0.24)" : "rgba(60, 200, 120, 0.08)"
        )
        .polygonSideColor((polygon: any) =>
          polygon === activeCountryPolygon ? "rgba(68, 255, 136, 0.18)" : "rgba(60, 200, 120, 0.04)"
        )
        .polygonStrokeColor((polygon: any) =>
          polygon === activeCountryPolygon ? "rgba(68, 255, 136, 0.78)" : "rgba(68, 255, 136, 0.25)"
        );
    };

    applyPolygonStyles(null);

    globe
      .polygonLabel((polygon: any) => {
        const props = polygon?.properties || {};
        const name = props.ADMIN || props.NAME || "Unknown";
        const iso = props.ISO_A2 || "";
        return `
          <div style="min-width:170px;background:rgba(10,10,10,0.94);border:1px solid rgba(68,255,136,0.18);padding:10px 12px;border-radius:8px;font-family:'Inter',system-ui,sans-serif;color:#eef3ff;">
            <div style="font-size:13px;font-weight:700;color:#44ff88;margin-bottom:4px;">${escapeHtml(name)}</div>
            <div style="font-size:10px;color:#97a3b6;">${iso ? `ISO ${escapeHtml(iso)} · ` : ""}Click for intel</div>
          </div>
        `;
      })
      .onPolygonHover((polygon: any) => {
        setHoveredCountry(polygon?.properties?.ADMIN || polygon?.properties?.NAME || null);
        applyPolygonStyles(polygon || null);
      })
      .onPolygonClick((polygon: any) => {
        const props = polygon.properties || {};
        setSelectedOverlayHtml(`
          <div style="min-width:170px;background:rgba(10,10,10,0.94);border:1px solid rgba(68,255,136,0.18);padding:10px 12px;border-radius:8px;font-family:'Inter',system-ui,sans-serif;color:#eef3ff;">
            <div style="font-size:13px;font-weight:700;color:#44ff88;margin-bottom:4px;">${escapeHtml(props.ADMIN || props.NAME || "Unknown")}</div>
            <div style="font-size:10px;color:#97a3b6;">${props.ISO_A2 ? `ISO ${escapeHtml(props.ISO_A2)} · ` : ""}Country profile</div>
          </div>
        `);
        if (!onCountryClick) return;
        onCountryClick({
          code: props.ISO_A2 || props.ISO_A3 || "",
          name: props.ADMIN || props.NAME || "Unknown",
        });
      });
  }, [countryPolygons, onCountryClick]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    globe
      .pointsData(globePoints)
      .pointLat("lat")
      .pointLng("lng")
      .pointColor("color")
      .pointAltitude("altitude")
      .pointRadius("radius")
      .pointLabel("label")
      .pointResolution(10)
      .pointsMerge(false)
      .pointsTransitionDuration(0)
      .onPointClick((point: any) => {
        if (point?.label) {
          setSelectedOverlayHtml(point.label);
        }
        if (point?.kind === "alert" && point.alert && onAlertClick) {
          onAlertClick(point.alert);
        }
      })
      .ringsData(alertRings)
      .ringLat("lat")
      .ringLng("lng")
      .ringAltitude("altitude")
      .ringColor("color")
      .ringMaxRadius("maxRadius")
      .ringPropagationSpeed("speed")
      .ringRepeatPeriod("period")
      .labelsData(globeLabels)
      .labelLat("lat")
      .labelLng("lng")
      .labelText("text")
      .labelColor("color")
      .labelAltitude("altitude")
      .labelSize("size")
      .labelIncludeDot(false)
      .labelDotRadius("dotRadius")
      .labelsTransitionDuration(0)
      .arcsData(tradeArcs)
      .arcStartLat("startLat")
      .arcStartLng("startLng")
      .arcEndLat("endLat")
      .arcEndLng("endLng")
      .arcAltitude("altitude")
      .arcStroke("stroke")
      .arcColor("color")
      .arcLabel("label")
      .arcDashLength("dashLength")
      .arcDashGap("dashGap")
      .arcDashAnimateTime("dashAnimateTime")
      .arcsTransitionDuration(0)
      .onArcClick((arc: any) => {
        if (arc?.label) {
          setSelectedOverlayHtml(arc.label);
        }
      })
      .pathsData([...pipelinePaths, ...conflictOutlinePaths])
      .pathPoints("points")
      .pathPointLat("lat")
      .pathPointLng("lng")
      .pathPointAlt("alt")
      .pathColor("color")
      .pathLabel("label")
      .pathStroke("stroke")
      .pathDashLength("dashLength")
      .pathDashGap("dashGap")
      .pathDashAnimateTime("dashAnimateTime")
      .pathTransitionDuration(0)
      .onPathClick((path: any) => {
        if (path?.label) {
          setSelectedOverlayHtml(path.label);
        }
      });
  }, [alertRings, conflictOutlinePaths, globeLabels, globePoints, onAlertClick, pipelinePaths, tradeArcs]);

  useEffect(() => {
    if (!active || !focusRequest?.alertId || !globeRef.current) return;

    const alert = alerts.find((item) => item.alert_id === focusRequest.alertId);
    if (!alert) return;

    const coords = alertCoords(alert);
    pauseAutoRotate();
    setSelectedOverlayHtml(alertLabelHtml(alert));
    globeRef.current.pointOfView(
      {
        lat: coords.lat,
        lng: coords.lon,
        altitude: 1.7,
      },
      1100
    );
  }, [active, alerts, focusRequest, pauseAutoRotate]);

  return (
    <div className="globe-container" ref={containerRef}>
      {hoveredCountry && <div className="globe-hover-badge">{hoveredCountry}</div>}
      {selectedOverlayHtml && (
        <div
          style={{
            position: "absolute",
            left: "12px",
            bottom: "12px",
            zIndex: 14,
            maxWidth: "320px",
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedOverlayHtml(null)}
            style={{
              position: "absolute",
              top: "-8px",
              right: "-8px",
              width: "24px",
              height: "24px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(8, 12, 20, 0.96)",
              color: "#d7deeb",
              cursor: "pointer",
              zIndex: 2,
            }}
          >
            ×
          </button>
          <div dangerouslySetInnerHTML={{ __html: selectedOverlayHtml }} />
        </div>
      )}
    </div>
  );
}
