/**
 * MapLegend.tsx — Collapsible map layer toggle panel
 *
 * Dark glassmorphism overlay pinned to the map. Provides toggles for
 * each intelligence layer with color-coded legend items.
 */

import { useState, useCallback } from "react";
import type { LayerVisibility } from "./geoData";
import {
  CrosshairIcon,
  SirenIcon,
  GlobeIcon,
} from "./Icons";

interface MapLegendProps {
  layers: LayerVisibility;
  onToggle: (layer: keyof LayerVisibility) => void;
}

/* ─── Layer Config ────────────────────────────────────────────────────── */

const svgIconStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "16px",
  height: "16px",
};

interface LayerConfig {
  key: keyof LayerVisibility;
  label: string;
  color: string;
  icon: React.ReactNode;
  description: string;
}

const LAYER_CONFIG: LayerConfig[] = [
  {
    key: "alerts",
    label: "Intel Alerts",
    color: "#ff4444",
    icon: <SirenIcon />,
    description: "Geo-tagged intelligence alerts",
  },
  {
    key: "hotspots",
    label: "Intel Hotspots",
    color: "#ff6b35",
    icon: <CrosshairIcon />,
    description: "Key geopolitical monitoring points",
  },
  {
    key: "conflictZones",
    label: "Conflict Zones",
    color: "#ff2233",
    icon: <span style={svgIconStyle}>⚔</span>,
    description: "Active conflict polygons",
  },
  {
    key: "waterways",
    label: "Strategic Waterways",
    color: "#ffd700",
    icon: <span style={svgIconStyle}>◆</span>,
    description: "Maritime chokepoints & canals",
  },
  {
    key: "ports",
    label: "Global Ports",
    color: "#00b4d8",
    icon: <span style={svgIconStyle}>⚓</span>,
    description: "Container, oil, LNG & naval ports",
  },
  {
    key: "pipelines",
    label: "Oil & Gas Pipelines",
    color: "#ff6b35",
    icon: <span style={svgIconStyle}>═</span>,
    description: "Major energy infrastructure",
  },
  {
    key: "tradeRoutes",
    label: "Trade Routes",
    color: "#44ff88",
    icon: <span style={svgIconStyle}>⟿</span>,
    description: "Maritime trade corridors",
  },
  {
    key: "militaryBases",
    label: "Military Bases",
    color: "#aa88ff",
    icon: <span style={svgIconStyle}>▲</span>,
    description: "Overseas & strategic bases",
  },
];

/* ─── Component ───────────────────────────────────────────────────────── */

export function MapLegend({ layers, onToggle }: MapLegendProps) {
  const [collapsed, setCollapsed] = useState(false);

  const activeCount = Object.values(layers).filter(Boolean).length;

  const handleToggle = useCallback(
    (key: keyof LayerVisibility) => {
      onToggle(key);
    },
    [onToggle]
  );

  return (
    <div
      id="map-legend-panel"
      className="map-legend-panel"
      style={{
        position: "absolute",
        top: "10px",
        right: "12px",
        zIndex: 1000,
        width: collapsed ? "44px" : "260px",
        maxHeight: collapsed ? "44px" : "calc(100vh - 200px)",
        background: "rgba(10, 14, 26, 0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(68, 255, 136, 0.2)",
        borderRadius: "12px",
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        fontFamily: "'Inter', 'SF Pro', system-ui, sans-serif",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: collapsed ? "10px 12px" : "10px 14px",
          cursor: "pointer",
          borderBottom: collapsed
            ? "none"
            : "1px solid rgba(68, 255, 136, 0.1)",
          userSelect: "none",
        }}
      >
        {collapsed ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "20px",
              height: "20px",
            }}
          >
            <GlobeIcon />
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <GlobeIcon />
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#e0e6f0",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                Map Layers
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#0a0e1a",
                  background: "#44ff88",
                  borderRadius: "8px",
                  padding: "1px 6px",
                  minWidth: "18px",
                  textAlign: "center",
                }}
              >
                {activeCount}
              </span>
            </div>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              style={{
                transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            >
              <path
                d="M2 8L6 4L10 8"
                stroke="#44ff88"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}
      </div>

      {/* Layer list */}
      {!collapsed && (
        <div
          style={{
            padding: "6px 8px 10px",
            overflowY: "auto",
            maxHeight: "calc(100vh - 280px)",
          }}
        >
          {LAYER_CONFIG.map((layer) => (
            <label
              key={layer.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 6px",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "background 0.15s",
                marginBottom: "2px",
              }}
              className="legend-layer-row"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(68, 255, 136, 0.06)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
              }}
            >
              {/* Toggle switch */}
              <div
                onClick={(e) => {
                  e.preventDefault();
                  handleToggle(layer.key);
                }}
                style={{
                  width: "32px",
                  height: "18px",
                  borderRadius: "9px",
                  background: layers[layer.key]
                    ? "rgba(68, 255, 136, 0.3)"
                    : "rgba(255,255,255,0.08)",
                  border: `1px solid ${
                    layers[layer.key]
                      ? "rgba(68, 255, 136, 0.5)"
                      : "rgba(255,255,255,0.15)"
                  }`,
                  position: "relative",
                  transition: "all 0.2s",
                  flexShrink: 0,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: layers[layer.key] ? "#44ff88" : "#555",
                    position: "absolute",
                    top: "2px",
                    left: layers[layer.key] ? "16px" : "2px",
                    transition: "all 0.2s",
                    boxShadow: layers[layer.key]
                      ? "0 0 6px rgba(68,255,136,0.4)"
                      : "none",
                  }}
                />
              </div>

              {/* Color indicator */}
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: layer.color,
                  flexShrink: 0,
                  opacity: layers[layer.key] ? 1 : 0.3,
                  transition: "opacity 0.2s",
                  boxShadow: layers[layer.key]
                    ? `0 0 8px ${layer.color}40`
                    : "none",
                }}
              />

              {/* Icon + label */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span
                    style={{
                      opacity: layers[layer.key] ? 0.9 : 0.4,
                      transition: "opacity 0.2s",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {layer.icon}
                  </span>
                  <span
                    style={{
                      fontSize: "11.5px",
                      fontWeight: 500,
                      color: layers[layer.key] ? "#e0e6f0" : "#667",
                      transition: "color 0.2s",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {layer.label}
                  </span>
                </div>
              </div>
            </label>
          ))}

          {/* Legend footer */}
          <div
            style={{
              marginTop: "8px",
              padding: "8px 6px 4px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                color: "#556",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                marginBottom: "6px",
              }}
            >
              Color Legend
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "3px 12px",
              }}
            >
              {[
                { label: "Container", color: "#00b4d8" },
                { label: "Oil/Energy", color: "#ff6b35" },
                { label: "LNG", color: "#b44dff" },
                { label: "Naval", color: "#ff2244" },
                { label: "US/NATO", color: "#4488ff" },
                { label: "Russia", color: "#ff4444" },
                { label: "China", color: "#ffcc00" },
                { label: "Gas Pipeline", color: "#00b4d8" },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: item.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{ fontSize: "9px", color: "#778", lineHeight: 1.3 }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
