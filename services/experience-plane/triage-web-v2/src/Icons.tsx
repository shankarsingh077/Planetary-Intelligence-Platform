/**
 * SVG Icon library – replaces all emoji usage with clean inline SVGs
 * Each icon is a React component returning an SVG element.
 */

import { CSSProperties } from "react";

interface IconProps {
  size?: number;
  color?: string;
  style?: CSSProperties;
  className?: string;
}

const defaults = (props: IconProps, fallbackColor = "currentColor") => ({
  width: props.size || 16,
  height: props.size || 16,
  fill: "none",
  stroke: props.color || fallbackColor,
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  style: props.style,
  className: props.className || "icon",
});

export function GlobeIcon(props: IconProps) {
  const a = defaults(props, "#44ff88");
  return (
    <svg {...a}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
    </svg>
  );
}

export function AlertTriangleIcon(props: IconProps) {
  const a = defaults(props, "#ff4444");
  return (
    <svg {...a}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function SirenIcon(props: IconProps) {
  const a = defaults(props, "#ff4444");
  return (
    <svg {...a}>
      <path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h-2M4 12H2M19.07 4.93l-1.41 1.41" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M8.46 8.46a5 5 0 0 0 0 7.07" />
      <path d="M6 20h12M10 20v-4a2 2 0 1 1 4 0v4" />
    </svg>
  );
}

export function SignalIcon(props: IconProps) {
  const a = defaults(props, "#00d4ff");
  return (
    <svg {...a}>
      <path d="M2 20h.01" />
      <path d="M7 20v-4" />
      <path d="M12 20v-8" />
      <path d="M17 20V8" />
      <path d="M22 4v16" />
    </svg>
  );
}

export function RadioIcon(props: IconProps) {
  const a = defaults(props, "#00d4ff");
  return (
    <svg {...a}>
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
      <path d="M7.76 16.24a6 6 0 0 1 0-8.49" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M4.93 19.07a10 10 0 0 1 0-14.14" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  const a = defaults(props, "#888");
  return (
    <svg {...a}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function ChartIcon(props: IconProps) {
  const a = defaults(props, "#ffaa00");
  return (
    <svg {...a}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

export function FileTextIcon(props: IconProps) {
  const a = defaults(props, "#888");
  return (
    <svg {...a}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  const a = defaults(props, "currentColor");
  return (
    <svg {...a}>
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

export function MapIcon(props: IconProps) {
  const a = defaults(props, "#e8e8e8");
  return (
    <svg {...a}>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

export function Globe3DIcon(props: IconProps) {
  const a = defaults(props, "#e8e8e8");
  return (
    <svg {...a}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

export function ClipboardIcon(props: IconProps) {
  const a = defaults(props, "#888");
  return (
    <svg {...a}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

export function ZapIcon(props: IconProps) {
  const a = defaults(props, "#ff4444");
  return (
    <svg {...a} fill={props.color || "#ff4444"} stroke="none">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export function BrainIcon(props: IconProps) {
  const a = defaults(props, "#44ff88");
  return (
    <svg {...a}>
      <path d="M12 2a4 4 0 0 1 4 4v1a3 3 0 0 1 2 2.83V12a4 4 0 0 1-2 3.46V17a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3v-1.54A4 4 0 0 1 6 12V9.83A3 3 0 0 1 8 7V6a4 4 0 0 1 4-4z" />
      <path d="M12 2v20" />
    </svg>
  );
}

export function CrosshairIcon(props: IconProps) {
  const a = defaults(props, "#44ff88");
  return (
    <svg {...a}>
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  const a = defaults(props, "#3b82f6");
  return (
    <svg {...a}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function AnchorIcon(props: IconProps) {
  const a = defaults(props, "#00d4ff");
  return (
    <svg {...a}>
      <circle cx="12" cy="5" r="3" />
      <line x1="12" y1="22" x2="12" y2="8" />
      <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
    </svg>
  );
}

export function PlaneIcon(props: IconProps) {
  const a = defaults(props, "#e8e8e8");
  return (
    <svg {...a}>
      <path d="M17.8 19.2L16 11l3.5-3.5A2.1 2.1 0 0 0 16 4.5L12.5 8 4 6.2 2.8 7.4l5.7 3L5 14l-2.5-.6L1 15l4 2 2 4 1.5-1.5L8 17l3.5 3.4 1.2-1.2" />
    </svg>
  );
}

export function FlameIcon(props: IconProps) {
  const a = defaults(props, "#ff8800");
  return (
    <svg {...a} fill={props.color || "#ff8800"} fillOpacity={0.2}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

export function TrendingUpIcon(props: IconProps) {
  const a = defaults(props, "#ff8800");
  return (
    <svg {...a}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

export function SwordsIcon(props: IconProps) {
  const a = defaults(props, "#ff4444");
  return (
    <svg {...a}>
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l4 4" />
      <path d="M19 21l2-2" />
      <path d="M9.5 6.5L21 18v3h-3L6.5 9.5" />
      <path d="M5 8l4-4" />
      <path d="M2 5l2-2" />
    </svg>
  );
}

export function ActivityIcon(props: IconProps) {
  const a = defaults(props, "#44ff88");
  return (
    <svg {...a}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export function PinIcon(props: IconProps) {
  const a = defaults(props, "#888");
  return (
    <svg {...a} width={props.size || 12} height={props.size || 12}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function BoltIcon(props: IconProps) {
  const a = defaults(props, "#ffaa00");
  return (
    <svg {...a} fill={props.color || "#ffaa00"} stroke="none">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export function WarningIcon(props: IconProps) {
  const a = defaults(props, "#ffaa00");
  return (
    <svg {...a}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function BuildingIcon(props: IconProps) {
  const a = defaults(props, "#888");
  return (
    <svg {...a}>
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <line x1="8" y1="6" x2="8" y2="6.01" />
      <line x1="16" y1="6" x2="16" y2="6.01" />
      <line x1="12" y1="6" x2="12" y2="6.01" />
      <line x1="8" y1="10" x2="8" y2="10.01" />
      <line x1="16" y1="10" x2="16" y2="10.01" />
      <line x1="12" y1="10" x2="12" y2="10.01" />
      <line x1="8" y1="14" x2="8" y2="14.01" />
      <line x1="16" y1="14" x2="16" y2="14.01" />
      <line x1="12" y1="14" x2="12" y2="14.01" />
    </svg>
  );
}
