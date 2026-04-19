/**
 * AIForecastsPanel – Probability estimates and timeline projections
 * 
 * Displays AI-generated forecasts for key geopolitical scenarios.
 */

import { useState, useCallback, useEffect } from 'react';
import { ChartIcon } from '../../Icons';
import { MiniSparkline } from '../charts/MiniSparkline';

interface Forecast {
  id: string;
  scenario: string;
  category: string;
  probability: number; // 0-100
  previousProbability: number;
  timeframe: string;
  lastUpdated: Date;
  factors: string[];
  trend: number[]; // Historical probability trend
}

// Seed forecasts
const FORECASTS: Forecast[] = [
  {
    id: 'f1',
    scenario: 'Major China-Taiwan military escalation',
    category: 'Conflict',
    probability: 18,
    previousProbability: 15,
    timeframe: '12 months',
    lastUpdated: new Date(),
    factors: ['PLA exercise frequency', 'US election dynamics', 'Economic pressure'],
    trend: [12, 13, 14, 14, 15, 16, 15, 17, 18, 18],
  },
  {
    id: 'f2',
    scenario: 'Iran achieves nuclear breakout capability',
    category: 'Proliferation',
    probability: 35,
    previousProbability: 32,
    timeframe: '6 months',
    lastUpdated: new Date(),
    factors: ['Enrichment progress', 'IAEA access restrictions', 'Regional tensions'],
    trend: [28, 29, 30, 31, 32, 33, 32, 34, 35, 35],
  },
  {
    id: 'f3',
    scenario: 'Russia-NATO direct confrontation',
    category: 'Conflict',
    probability: 8,
    previousProbability: 10,
    timeframe: '12 months',
    lastUpdated: new Date(),
    factors: ['Red lines maintained', 'Diplomatic channels open', 'Nuclear signaling'],
    trend: [12, 11, 10, 10, 9, 10, 9, 9, 8, 8],
  },
  {
    id: 'f4',
    scenario: 'Global recession (GDP contraction)',
    category: 'Economic',
    probability: 45,
    previousProbability: 42,
    timeframe: '18 months',
    lastUpdated: new Date(),
    factors: ['Rate environment', 'Credit conditions', 'Consumer sentiment'],
    trend: [38, 39, 40, 42, 43, 44, 43, 44, 45, 45],
  },
  {
    id: 'f5',
    scenario: 'Oil price spike (>$150/bbl)',
    category: 'Energy',
    probability: 25,
    previousProbability: 22,
    timeframe: '6 months',
    lastUpdated: new Date(),
    factors: ['Hormuz transit risk', 'SPR levels', 'OPEC+ discipline'],
    trend: [18, 19, 20, 21, 22, 23, 22, 24, 25, 25],
  },
  {
    id: 'f6',
    scenario: 'Major cyber attack on US infrastructure',
    category: 'Cyber',
    probability: 55,
    previousProbability: 50,
    timeframe: '12 months',
    lastUpdated: new Date(),
    factors: ['State actor capability', 'Election targeting', 'Critical infrastructure exposure'],
    trend: [45, 46, 48, 49, 50, 51, 52, 53, 54, 55],
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Conflict: '#ff4444',
  Proliferation: '#ff8800',
  Economic: '#ffaa00',
  Energy: '#00d4ff',
  Cyber: '#9966ff',
};

export function AIForecastsPanel() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'probability' | 'change'>('probability');
  const [forecasts, setForecasts] = useState<Forecast[]>(FORECASTS);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/v1/ai/forecast', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          setForecasts(json.data.map((d: any, i: number) => ({
            id: `f${i + 1}`,
            scenario: d.scenario || 'Unknown',
            category: d.category || 'Conflict',
            probability: d.probability || 0,
            previousProbability: (d.probability || 0) - (d.direction === 'increasing' ? 3 : d.direction === 'decreasing' ? -3 : 0),
            timeframe: d.timeframe || '12 months',
            lastUpdated: new Date(),
            factors: d.factors || [],
            trend: [d.probability || 0],
          })));
          return;
        }
      }
    } catch {
      // Gemini unavailable — use seed forecasts
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const sortedForecasts = [...forecasts].sort((a, b) => {
    if (sortBy === 'change') {
      const changeA = a.probability - a.previousProbability;
      const changeB = b.probability - b.previousProbability;
      return Math.abs(changeB) - Math.abs(changeA);
    }
    return b.probability - a.probability;
  });

  return (
    <article className="panel ai-forecasts-panel">
      <div className="panel-header">
        <div className="panel-header-left">
          <span className="panel-icon"><ChartIcon size={15} /></span>
          <h2 className="panel-title">AI Forecasts</h2>
        </div>
        <div className="panel-header-right">
          <select 
            className="sort-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'probability' | 'change')}
          >
            <option value="probability">By Probability</option>
            <option value="change">By Change</option>
          </select>
        </div>
      </div>

      <div className="panel-content">
        <div className="forecasts-list">
          {sortedForecasts.map(forecast => {
            const change = forecast.probability - forecast.previousProbability;
            const isExpanded = expandedId === forecast.id;

            return (
              <div 
                key={forecast.id}
                className={`forecast-card ${isExpanded ? 'expanded' : ''}`}
                onClick={() => setExpandedId(isExpanded ? null : forecast.id)}
              >
                <div className="forecast-header">
                  <div className="forecast-meta">
                    <span 
                      className="forecast-category"
                      style={{ background: CATEGORY_COLORS[forecast.category] || '#888' }}
                    >
                      {forecast.category}
                    </span>
                    <span className="forecast-timeframe">{forecast.timeframe}</span>
                  </div>
                  <div className="forecast-scenario">
                    {forecast.scenario}
                  </div>
                </div>

                <div className="forecast-metrics">
                  <div className="probability-display">
                    <span className="probability-value">{forecast.probability}%</span>
                    <span className={`probability-change ${change > 0 ? 'up' : change < 0 ? 'down' : ''}`}>
                      {change > 0 ? '↑' : change < 0 ? '↓' : '→'} {Math.abs(change)}%
                    </span>
                  </div>
                  <div className="probability-bar">
                    <div 
                      className="bar-fill"
                      style={{ 
                        width: `${forecast.probability}%`,
                        background: getProbabilityColor(forecast.probability),
                      }}
                    />
                  </div>
                  <MiniSparkline 
                    data={forecast.trend}
                    width={60}
                    height={18}
                    color={change >= 0 ? '#ff4444' : '#44ff88'}
                    showDot={true}
                    fillOpacity={0.05}
                  />
                </div>

                {isExpanded && (
                  <div className="forecast-details">
                    <h4>Contributing Factors</h4>
                    <ul className="factors-list">
                      {forecast.factors.map((factor, i) => (
                        <li key={i}>{factor}</li>
                      ))}
                    </ul>
                    <div className="forecast-updated">
                      Horizon: {forecast.timeframe}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ padding: '6px 10px', fontSize: 9, color: '#555', fontFamily: 'monospace', borderTop: '1px solid var(--border)' }}>
          Gemini AI · Probabilistic scenario forecasting
        </div>
      </div>
    </article>
  );
}

function getProbabilityColor(prob: number): string {
  if (prob >= 70) return '#ff4444';
  if (prob >= 50) return '#ff8800';
  if (prob >= 30) return '#ffaa00';
  return '#44ff88';
}


