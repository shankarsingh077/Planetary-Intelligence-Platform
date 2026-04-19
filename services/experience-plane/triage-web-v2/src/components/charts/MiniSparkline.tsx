/**
 * MiniSparkline – Inline sparkline chart
 * 
 * Renders a small inline chart showing trend data.
 * Uses SVG polyline for efficient rendering.
 */

import { useMemo } from 'react';

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  showDot?: boolean;
  className?: string;
}

export function MiniSparkline({
  data,
  width = 80,
  height = 24,
  color = '#00d4ff',
  fillOpacity = 0.1,
  strokeWidth = 1.5,
  showDot = true,
  className = '',
}: MiniSparklineProps) {
  const { points, fillPoints, lastPoint, isUp } = useMemo(() => {
    if (!data.length) return { points: '', fillPoints: '', lastPoint: null, isUp: true };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;

    const normalizedData = data.map((v, i) => ({
      x: padding + (i / (data.length - 1 || 1)) * (width - padding * 2),
      y: height - padding - ((v - min) / range) * (height - padding * 2),
    }));

    const linePoints = normalizedData.map(p => `${p.x},${p.y}`).join(' ');
    
    // Create fill area (closed polygon)
    const fillPath = [
      ...normalizedData.map(p => `${p.x},${p.y}`),
      `${width - padding},${height - padding}`,
      `${padding},${height - padding}`,
    ].join(' ');

    const last = normalizedData[normalizedData.length - 1];
    const first = data[0];
    const latest = data[data.length - 1];

    return {
      points: linePoints,
      fillPoints: fillPath,
      lastPoint: last,
      isUp: latest >= first,
    };
  }, [data, width, height]);

  if (!data.length) {
    return (
      <svg width={width} height={height} className={`sparkline ${className}`}>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#333"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      </svg>
    );
  }

  const effectiveColor = color === 'auto' ? (isUp ? '#44ff88' : '#ff4444') : color;

  return (
    <svg width={width} height={height} className={`sparkline ${className}`}>
      {/* Fill area */}
      <polygon
        points={fillPoints}
        fill={effectiveColor}
        fillOpacity={fillOpacity}
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={effectiveColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {showDot && lastPoint && (
        <>
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={3}
            fill={effectiveColor}
          />
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={5}
            fill={effectiveColor}
            fillOpacity={0.3}
          />
        </>
      )}
    </svg>
  );
}
