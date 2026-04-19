/**
 * YieldCurveChart – Multi-line chart for yield curves
 * 
 * Displays treasury yield curves across different maturities.
 * Shows current curve vs historical for inversion detection.
 */

import { useMemo } from 'react';

interface YieldPoint {
  maturity: string;
  yield: number;
}

interface YieldCurveChartProps {
  currentCurve: YieldPoint[];
  historicalCurve?: YieldPoint[];
  width?: number;
  height?: number;
  showGrid?: boolean;
  showLabels?: boolean;
}

export function YieldCurveChart({
  currentCurve,
  historicalCurve,
  width = 280,
  height = 140,
  showGrid = true,
  showLabels = true,
}: YieldCurveChartProps) {
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const { currentPath, historicalPath, yScale, isInverted } = useMemo(() => {
    const allYields = [
      ...currentCurve.map(p => p.yield),
      ...(historicalCurve || []).map(p => p.yield),
    ];
    const minY = Math.min(...allYields) - 0.5;
    const maxY = Math.max(...allYields) + 0.5;

    const scaleX = (i: number) => padding.left + (i / (currentCurve.length - 1)) * chartWidth;
    const scaleY = (y: number) => padding.top + chartHeight - ((y - minY) / (maxY - minY)) * chartHeight;

    const buildPath = (curve: YieldPoint[]) => {
      return curve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(p.yield)}`).join(' ');
    };

    // Check for inversion (short-term > long-term)
    const shortTerm = currentCurve.slice(0, 3);
    const longTerm = currentCurve.slice(-3);
    const avgShort = shortTerm.reduce((s, p) => s + p.yield, 0) / shortTerm.length;
    const avgLong = longTerm.reduce((s, p) => s + p.yield, 0) / longTerm.length;

    return {
      currentPath: buildPath(currentCurve),
      historicalPath: historicalCurve ? buildPath(historicalCurve) : null,
      yScale: { min: minY, max: maxY, scaleY },
      isInverted: avgShort > avgLong,
    };
  }, [currentCurve, historicalCurve, chartWidth, chartHeight, padding]);

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = (yScale.max - yScale.min) / 4;
    for (let i = 0; i <= 4; i++) {
      ticks.push(yScale.min + step * i);
    }
    return ticks;
  }, [yScale]);

  return (
    <div className={`yield-curve-chart ${isInverted ? 'inverted' : ''}`}>
      {isInverted && (
        <div className="inversion-warning">
          ⚠️ Yield Curve Inverted
        </div>
      )}
      <svg width={width} height={height}>
        {/* Grid lines */}
        {showGrid && yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={yScale.scaleY(tick)}
              x2={width - padding.right}
              y2={yScale.scaleY(tick)}
              stroke="#222"
              strokeDasharray="3 3"
            />
            {showLabels && (
              <text
                x={padding.left - 8}
                y={yScale.scaleY(tick) + 4}
                textAnchor="end"
                fill="#666"
                fontSize={9}
                fontFamily="var(--font-mono)"
              >
                {tick.toFixed(1)}%
              </text>
            )}
          </g>
        ))}

        {/* Historical curve (if provided) */}
        {historicalPath && (
          <path
            d={historicalPath}
            fill="none"
            stroke="#444"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        )}

        {/* Current curve */}
        <path
          d={currentPath}
          fill="none"
          stroke={isInverted ? '#ff4444' : '#44ff88'}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {currentCurve.map((p, i) => {
          const x = padding.left + (i / (currentCurve.length - 1)) * chartWidth;
          const y = yScale.scaleY(p.yield);
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r={3}
                fill={isInverted ? '#ff4444' : '#44ff88'}
              />
              {showLabels && (
                <text
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  fill="#666"
                  fontSize={8}
                  fontFamily="var(--font-mono)"
                >
                  {p.maturity}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Default US Treasury yield curve data
export const DEFAULT_YIELD_CURVE: YieldPoint[] = [
  { maturity: '1M', yield: 5.25 },
  { maturity: '3M', yield: 5.33 },
  { maturity: '6M', yield: 5.28 },
  { maturity: '1Y', yield: 5.05 },
  { maturity: '2Y', yield: 4.78 },
  { maturity: '5Y', yield: 4.45 },
  { maturity: '10Y', yield: 4.35 },
  { maturity: '30Y', yield: 4.52 },
];
