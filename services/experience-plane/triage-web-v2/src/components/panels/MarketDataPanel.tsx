/**
 * MarketDataPanel – Display market metrics with sparklines
 * 
 * Shows commodity prices, indices, and financial metrics.
 */

import { useState, useEffect } from 'react';
import { RefreshIcon } from '../../Icons';
import { MiniSparkline } from '../charts/MiniSparkline';
import { FearGreedGauge } from '../charts/FearGreedGauge';
import { YieldCurveChart, DEFAULT_YIELD_CURVE } from '../charts/YieldCurveChart';
import { cacheSet, cacheGetData, cacheTimeLabel } from '../../dataCache';

interface MarketMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  change: number;
  history: number[];
}

// Seed market data
const SEED_COMMODITIES: MarketMetric[] = [
  { id: 'brent', name: 'Brent Crude', value: 82.45, unit: '$/bbl', change: 1.2, history: [80, 81, 82, 81, 82, 83, 82, 82.45] },
  { id: 'wti', name: 'WTI Crude', value: 78.32, unit: '$/bbl', change: 0.8, history: [76, 77, 78, 77, 78, 79, 78, 78.32] },
  { id: 'gold', name: 'Gold', value: 2341.50, unit: '$/oz', change: 0.4, history: [2320, 2325, 2330, 2335, 2340, 2338, 2340, 2341.50] },
  { id: 'silver', name: 'Silver', value: 28.45, unit: '$/oz', change: -0.3, history: [29, 28.8, 28.6, 28.4, 28.5, 28.3, 28.4, 28.45] },
  { id: 'natgas', name: 'Natural Gas', value: 2.89, unit: '$/MMBtu', change: 2.1, history: [2.6, 2.7, 2.75, 2.8, 2.82, 2.85, 2.87, 2.89] },
  { id: 'copper', name: 'Copper', value: 4.25, unit: '$/lb', change: -0.6, history: [4.3, 4.28, 4.27, 4.26, 4.25, 4.26, 4.25, 4.25] },
];

const SEED_INDICES: MarketMetric[] = [
  { id: 'spx', name: 'S&P 500', value: 5234.18, unit: '', change: 0.32, history: [5200, 5210, 5220, 5225, 5230, 5228, 5232, 5234.18] },
  { id: 'dji', name: 'Dow Jones', value: 39127.80, unit: '', change: 0.18, history: [38900, 38950, 39000, 39050, 39080, 39100, 39120, 39127.80] },
  { id: 'ndx', name: 'NASDAQ 100', value: 18654.32, unit: '', change: 0.54, history: [18400, 18450, 18500, 18550, 18580, 18620, 18640, 18654.32] },
  { id: 'vix', name: 'VIX', value: 14.82, unit: '', change: -2.1, history: [16, 15.5, 15.2, 15, 14.9, 14.85, 14.83, 14.82] },
];

interface MarketDataPanelProps {
  type: 'commodities' | 'indices' | 'fear-greed' | 'yield-curve';
  title: string;
  icon: string;
}

export function MarketDataPanel({ type, title, icon }: MarketDataPanelProps) {
  const seedData = type === 'commodities' ? SEED_COMMODITIES : SEED_INDICES;
  const [data, setData] = useState<MarketMetric[]>(
    cacheGetData<MarketMetric[]>(`market-${type}`, seedData)
  );
  const [fearGreedValue] = useState(58);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/v1/live/markets');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const marketMap = json.data as Record<string, any>;
          const updated = data.map(m => {
            const live = marketMap[m.id] || marketMap[m.name.toLowerCase().replace(/\s+/g, '_')];
            if (live && !live.error) {
              return {
                ...m,
                value: live.price || m.value,
                change: live.change_pct || m.change,
                history: [...m.history.slice(1), live.price || m.value],
              };
            }
            return m;
          });
          setData(updated);
          cacheSet(`market-${type}`, updated, 'Finnhub');
          return;
        }
      }
    } catch {
      // Use cached data (already loaded on init)
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 120000);
    return () => clearInterval(interval);
  }, []);

  const timeLabel = cacheTimeLabel(`market-${type}`);

  if (type === 'fear-greed') {
    return (
      <article className="panel market-panel fear-greed-panel">
        <div className="panel-header">
          <div className="panel-header-left">
            <span className="panel-icon">{icon}</span>
            <h2 className="panel-title">{title}</h2>
          </div>
        </div>
        <div className="panel-content centered">
          <FearGreedGauge value={fearGreedValue} size={150} />
        </div>
      </article>
    );
  }

  if (type === 'yield-curve') {
    return (
      <article className="panel market-panel yield-curve-panel">
        <div className="panel-header">
          <div className="panel-header-left">
            <span className="panel-icon">{icon}</span>
            <h2 className="panel-title">{title}</h2>
          </div>
        </div>
        <div className="panel-content">
          <YieldCurveChart 
            currentCurve={DEFAULT_YIELD_CURVE}
            width={280}
            height={150}
          />
        </div>
      </article>
    );
  }

  return (
    <article className="panel market-panel">
      <div className="panel-header">
        <div className="panel-header-left">
          <span className="panel-icon">{icon}</span>
          <h2 className="panel-title">{title}</h2>
        </div>
        <div className="panel-header-right">
          <button 
            className="refresh-btn-small" 
            onClick={refresh}
            disabled={loading}
          >
            <RefreshIcon size={12} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      <div className="panel-content">
        <div className="market-list">
          {data.map(metric => (
            <div key={metric.id} className="market-row">
              <div className="market-info">
                <span className="market-name">{metric.name}</span>
                <span className="market-value">
                  {metric.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  {metric.unit && <span className="unit">{metric.unit}</span>}
                </span>
              </div>
              <div className="market-trend">
                <MiniSparkline 
                  data={metric.history}
                  width={50}
                  height={20}
                  color={metric.change >= 0 ? '#44ff88' : '#ff4444'}
                  showDot={false}
                />
                <span className={`change ${metric.change >= 0 ? 'up' : 'down'}`}>
                  {metric.change >= 0 ? '↑' : '↓'} {Math.abs(metric.change).toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '6px 10px', fontSize: 9, color: '#555', fontFamily: 'monospace', borderTop: '1px solid var(--border)' }}>
          Finnhub.io Real-Time Market Data{timeLabel ? ` · ${timeLabel}` : ''}
        </div>
      </div>
    </article>
  );
}
