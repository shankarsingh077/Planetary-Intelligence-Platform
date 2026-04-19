/**
 * FearGreedGauge – Circular gauge for Fear & Greed Index
 * 
 * Displays a semi-circular gauge with gradient coloring
 * from red (fear) to green (greed).
 */

import { useMemo } from 'react';

interface FearGreedGaugeProps {
  value: number; // 0-100
  size?: number;
  label?: string;
  showValue?: boolean;
}

export function FearGreedGauge({
  value,
  size = 120,
  label = 'Fear & Greed',
  showValue = true,
}: FearGreedGaugeProps) {
  const { needleAngle, sentiment, color } = useMemo(() => {
    const clampedValue = Math.max(0, Math.min(100, value));
    // Map 0-100 to -90deg to 90deg
    const angle = -90 + (clampedValue / 100) * 180;

    let sent: string;
    let col: string;

    if (clampedValue <= 20) {
      sent = 'Extreme Fear';
      col = '#ff4444';
    } else if (clampedValue <= 40) {
      sent = 'Fear';
      col = '#ff8800';
    } else if (clampedValue <= 60) {
      sent = 'Neutral';
      col = '#ffaa00';
    } else if (clampedValue <= 80) {
      sent = 'Greed';
      col = '#88cc44';
    } else {
      sent = 'Extreme Greed';
      col = '#44ff88';
    }

    return { needleAngle: angle, sentiment: sent, color: col };
  }, [value]);

  const cx = size / 2;
  const cy = size / 2 + 10;
  const radius = (size / 2) - 15;
  const strokeWidth = 12;

  // Arc path for the gauge background
  const arcPath = describeArc(cx, cy, radius, -135, 135);

  return (
    <div className="fear-greed-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff4444" />
            <stop offset="25%" stopColor="#ff8800" />
            <stop offset="50%" stopColor="#ffaa00" />
            <stop offset="75%" stopColor="#88cc44" />
            <stop offset="100%" stopColor="#44ff88" />
          </linearGradient>
        </defs>

        {/* Background arc */}
        <path
          d={arcPath}
          fill="none"
          stroke="#222"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Gradient arc */}
        <path
          d={arcPath}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map(tick => {
          const angle = -135 + (tick / 100) * 270;
          const rad = (angle * Math.PI) / 180;
          const innerR = radius - strokeWidth / 2 - 4;
          const outerR = radius - strokeWidth / 2 - 10;
          return (
            <line
              key={tick}
              x1={cx + innerR * Math.cos(rad)}
              y1={cy + innerR * Math.sin(rad)}
              x2={cx + outerR * Math.cos(rad)}
              y2={cy + outerR * Math.sin(rad)}
              stroke="#444"
              strokeWidth={2}
            />
          );
        })}

        {/* Needle */}
        <g transform={`rotate(${needleAngle}, ${cx}, ${cy})`}>
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - radius + 20}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r={6} fill={color} />
          <circle cx={cx} cy={cy} r={3} fill="#000" />
        </g>

        {/* Value text */}
        {showValue && (
          <>
            <text
              x={cx}
              y={cy + 6}
              textAnchor="middle"
              fill={color}
              fontSize={24}
              fontWeight="bold"
              fontFamily="var(--font-mono)"
            >
              {Math.round(value)}
            </text>
            <text
              x={cx}
              y={cy + 22}
              textAnchor="middle"
              fill="#888"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {sentiment}
            </text>
          </>
        )}
      </svg>
      {label && (
        <div className="gauge-label">{label}</div>
      )}
    </div>
  );
}

// Helper to create SVG arc path
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}
