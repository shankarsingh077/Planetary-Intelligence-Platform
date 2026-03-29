/**
 * Globe3D – Interactive 3D globe using globe.gl
 *
 * Features:
 *  - Dark earth texture with atmosphere glow
 *  - Auto-rotate (resumes after 60s idle)
 *  - Alert circle markers plotted on the globe
 *  - Country polygon hover (highlight + tooltip)
 *  - Country click → emits onCountryClick
 */

import { useEffect, useRef, useCallback, useState } from "react";
import Globe from "globe.gl";
import type { GlobeInstance } from "globe.gl";
import type { Alert } from "./types";

/* ─── helpers ─────────────────────────────────────────────────────────── */

function seededCoordinates(seed: string): { lat: number; lon: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const lat = ((Math.abs(hash) % 16000) / 100) - 80;
  const lon = ((Math.abs(hash * 97) % 36000) / 100) - 180;
  return { lat, lon };
}

function alertCoords(a: Alert): { lat: number; lon: number } {
  const lat = Number(a.location?.geo?.lat);
  const lon = Number(a.location?.geo?.lon);
  if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    return { lat, lon };
  }
  return seededCoordinates(a.event_id || a.alert_id || "unknown");
}

function sevColor(severity: string | undefined): string {
  if (severity === "critical") return "#ff4444";
  if (severity === "high") return "#ff8800";
  if (severity === "medium") return "#ffaa00";
  return "#44aa44";
}

/* ─── types ───────────────────────────────────────────────────────────── */

interface AlertMarker {
  lat: number;
  lng: number;
  size: number;
  color: string;
  label: string;
  alert: Alert;
}

interface Globe3DProps {
  alerts: Alert[];
  onAlertClick?: (alert: Alert) => void;
  onCountryClick?: (country: { code: string; name: string }) => void;
}

/* ─── component ───────────────────────────────────────────────────────── */

export function Globe3D({ alerts, onAlertClick, onCountryClick }: Globe3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const autoRotateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const countriesRef = useRef<any>(null);

  // Build marker data from alerts
  const markers: AlertMarker[] = alerts.map((a) => {
    const c = alertCoords(a);
    return {
      lat: c.lat,
      lng: c.lon,
      size: a.severity === "critical" ? 1.0 : a.severity === "high" ? 0.8 : 0.6,
      color: sevColor(a.severity),
      label: a.snapshot || "Alert",
      alert: a,
    };
  });

  const scheduleAutoRotate = useCallback(() => {
    if (autoRotateTimerRef.current) clearTimeout(autoRotateTimerRef.current);
    autoRotateTimerRef.current = setTimeout(() => {
      const globe = globeRef.current;
      if (globe) {
        const controls = globe.controls() as any;
        if (controls) {
          controls.autoRotate = true;
        }
      }
    }, 60_000);
  }, []);

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

  // Initialize globe
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const globe = new Globe(el);

    globe
      .globeImageUrl("//unpkg.com/three-globe/example/img/earth-dark.jpg")
      .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
      .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
      .atmosphereColor("#4466cc")
      .atmosphereAltitude(0.18)
      .width(el.clientWidth)
      .height(el.clientHeight);

    // Controls
    const controls = globe.controls() as any;
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      controls.enablePan = false;
      controls.enableZoom = true;
      controls.zoomSpeed = 1.2;
      controls.minDistance = 120;
      controls.maxDistance = 600;
      controls.enableDamping = true;
    }

    // Load country polygons
    fetch("/countries-110m.geojson")
      .then((r) => r.json())
      .then((geoData) => {
        countriesRef.current = geoData;
        globe
          .polygonsData(geoData.features.filter((d: any) => d.properties.ISO_A2 !== "AQ"))
          .polygonAltitude(0.005)
          .polygonCapColor(() => "rgba(60, 200, 120, 0.08)")
          .polygonSideColor(() => "rgba(60, 200, 120, 0.05)")
          .polygonStrokeColor(() => "rgba(68, 255, 136, 0.25)")
          .polygonLabel((d: any) => {
            const props = d.properties;
            const name = props.ADMIN || props.NAME || "Unknown";
            const iso = props.ISO_A2 || "";
            return `
              <div style="
                background: rgba(10,10,10,0.92);
                border: 1px solid rgba(68,255,136,0.3);
                padding: 8px 14px;
                border-radius: 6px;
                font-family: 'SF Mono', monospace;
                font-size: 12px;
                color: #e8e8e8;
                backdrop-filter: blur(8px);
                min-width: 140px;
              ">
                <div style="font-weight:700;color:#44ff88;margin-bottom:4px;font-size:13px;">
                  ${name}
                </div>
                <div style="color:#888;font-size:10px;">
                  ${iso ? `ISO: ${iso}` : ""} • Click for intel
                </div>
              </div>
            `;
          })
          .onPolygonHover((polygon: any) => {
            const name = polygon?.properties?.ADMIN || polygon?.properties?.NAME || null;
            setHoveredCountry(name);
            globe
              .polygonCapColor((d: any) =>
                d === polygon ? "rgba(68, 255, 136, 0.25)" : "rgba(60, 200, 120, 0.08)"
              )
              .polygonStrokeColor((d: any) =>
                d === polygon ? "rgba(68, 255, 136, 0.7)" : "rgba(68, 255, 136, 0.25)"
              )
              .polygonAltitude((d: any) => (d === polygon ? 0.012 : 0.005));
          })
          .onPolygonClick((polygon: any) => {
            const props = polygon?.properties;
            if (props && onCountryClick) {
              onCountryClick({
                code: props.ISO_A2 || props.ISO_A3 || "",
                name: props.ADMIN || props.NAME || "Unknown",
              });
            }
          });
      })
      .catch((err) => console.warn("[Globe3D] Failed to load countries GeoJSON:", err));

    // Interaction listeners for auto-rotate
    const canvas = el.querySelector("canvas");
    if (canvas) {
      canvas.addEventListener("mousedown", pauseAutoRotate);
      canvas.addEventListener("touchstart", pauseAutoRotate, { passive: true });
      canvas.addEventListener("wheel", pauseAutoRotate, { passive: true });
      canvas.addEventListener("mouseup", scheduleAutoRotate);
      canvas.addEventListener("touchend", scheduleAutoRotate);
      // Force canvas to fill container
      (canvas as HTMLElement).style.cssText =
        "position:absolute;top:0;left:0;width:100%!important;height:100%!important;";
    }

    globeRef.current = globe;

    // Resize
    const ro = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        globe.width(el.clientWidth).height(el.clientHeight);
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      if (autoRotateTimerRef.current) clearTimeout(autoRotateTimerRef.current);
      globe._destructor();
      globeRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers when alerts change
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    globe
      .pointsData(markers)
      .pointLat("lat")
      .pointLng("lng")
      .pointAltitude(0.01)
      .pointRadius("size")
      .pointColor("color")
      .pointsMerge(false)
      .pointLabel((d: any) => {
        const m = d as AlertMarker;
        return `
          <div style="
            background:rgba(10,10,10,0.92);
            border:1px solid ${m.color};
            padding:8px 12px;
            border-radius:4px;
            font-family:'SF Mono',monospace;
            font-size:11px;color:#e8e8e8;
            max-width:260px;
          ">
            <div style="font-weight:600;color:${m.color};margin-bottom:4px;">
              ${(m.alert.severity || "low").toUpperCase()}
            </div>
            <div>${m.label}</div>
            <div style="color:#888;font-size:9px;margin-top:4px;">
              Confidence: ${Number(m.alert.confidence || 0).toFixed(2)}
            </div>
          </div>
        `;
      })
      .onPointClick((point: any) => {
        const m = point as AlertMarker;
        if (onAlertClick) onAlertClick(m.alert);
      });
  }, [alerts, markers, onAlertClick]);

  return (
    <div className="globe-container" ref={containerRef}>
      {hoveredCountry && (
        <div className="globe-hover-badge">
          {hoveredCountry}
        </div>
      )}
    </div>
  );
}
