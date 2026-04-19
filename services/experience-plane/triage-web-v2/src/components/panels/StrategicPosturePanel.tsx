/**
 * StrategicPosturePanel – Force correlation and escalation monitoring
 * 
 * Now pulls REAL data from /v1/live/conflict-stats (ACLED) and /v1/live/news (RSS)
 * to compute escalation levels dynamically from actual conflict event counts.
 */

import { useState, useEffect, useCallback } from 'react';
import { ShieldIcon } from '../../Icons';

interface ForceMetric {
  region: string;
  blueForce: number;  // NATO/Allied
  redForce: number;   // Adversary
  escalationLevel: number; // 1-5
  trend: 'stable' | 'increasing' | 'decreasing';
  recentActivity: string;
}

interface EscalationEvent {
  id: string;
  timestamp: Date;
  title: string;
  region: string;
  deltaLevel: number; // +/- change
}

// Seed defaults (used only when API is unreachable)
const SEED_METRICS: ForceMetric[] = [
  { region: 'Eastern Europe', blueForce: 142000, redForce: 280000, escalationLevel: 4, trend: 'stable', recentActivity: 'Data unavailable — using seed estimates' },
  { region: 'Indo-Pacific', blueForce: 85000, redForce: 320000, escalationLevel: 3, trend: 'increasing', recentActivity: 'Data unavailable — using seed estimates' },
  { region: 'Middle East', blueForce: 45000, redForce: 95000, escalationLevel: 4, trend: 'increasing', recentActivity: 'Data unavailable — using seed estimates' },
  { region: 'Korean Peninsula', blueForce: 62000, redForce: 1200000, escalationLevel: 2, trend: 'stable', recentActivity: 'Data unavailable — using seed estimates' },
];

const SEED_EVENTS: EscalationEvent[] = [];

// Map ACLED zone keys to display regions
const ZONE_TO_REGION: Record<string, string> = {
  ukraine: 'Eastern Europe',
  gaza: 'Middle East',
  lebanon: 'Middle East',
  sudan: 'East Africa',
  yemen: 'Middle East',
  myanmar: 'Indo-Pacific',
  sahel: 'West Africa',
  haiti: 'Caribbean',
};

function escalationFromEvents(events7d: number): number {
  if (events7d >= 40) return 5;
  if (events7d >= 20) return 4;
  if (events7d >= 10) return 3;
  if (events7d >= 3) return 2;
  return 1;
}

function trendFromTrend(t: string): 'stable' | 'increasing' | 'decreasing' {
  if (t === 'escalating') return 'increasing';
  if (t === 'low') return 'decreasing';
  return 'stable';
}

export function StrategicPosturePanel() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ForceMetric[]>(SEED_METRICS);
  const [events, setEvents] = useState<EscalationEvent[]>(SEED_EVENTS);
  const [dataSource, setDataSource] = useState<'live' | 'seed'>('seed');
  const [sourceLabel, setSourceLabel] = useState('');

  const refresh = useCallback(async () => {
    try {
      // 1. Pull real conflict stats from ACLED
      const statsRes = await fetch('/v1/live/conflict-stats');
      if (!statsRes.ok) return;
      const statsJson = await statsRes.json();
      if (!statsJson.success || !statsJson.data) return;

      const stats = statsJson.data as Record<string, {
        events_7d: number; fatalities_7d: number;
        trend: string; top_event_types: string[];
        top_actors: string[]; last_event_date: string;
      }>;

      // Aggregate into display regions
      const regionAgg: Record<string, { events: number; fatalities: number; trend: string; activity: string[] }> = {};
      for (const [zone, s] of Object.entries(stats)) {
        const region = ZONE_TO_REGION[zone] || zone;
        if (!regionAgg[region]) regionAgg[region] = { events: 0, fatalities: 0, trend: 'stable', activity: [] };
        regionAgg[region].events += s.events_7d;
        regionAgg[region].fatalities += s.fatalities_7d;
        if (s.trend === 'escalating') regionAgg[region].trend = 'escalating';
        if (s.events_7d > 0) {
          regionAgg[region].activity.push(
            `${zone.charAt(0).toUpperCase() + zone.slice(1)}: ${s.events_7d} events, ${s.fatalities_7d} fatalities (${s.top_event_types.slice(0, 2).join(', ')})`
          );
        }
      }

      const liveMetrics: ForceMetric[] = Object.entries(regionAgg)
        .sort((a, b) => b[1].events - a[1].events)
        .slice(0, 5)
        .map(([region, agg]) => ({
          region,
          blueForce: 0,
          redForce: agg.events,
          escalationLevel: escalationFromEvents(agg.events),
          trend: trendFromTrend(agg.trend),
          recentActivity: agg.activity.join(' | ') || 'No recent activity',
        }));

      if (liveMetrics.length > 0) {
        setMetrics(liveMetrics);
        setDataSource('live');
        setSourceLabel(`ACLED • ${statsJson.timestamp?.slice(0, 10) || 'Today'}`);
      }

      // 2. Pull recent news as escalation events
      const newsRes = await fetch('/v1/live/news');
      if (newsRes.ok) {
        const newsJson = await newsRes.json();
        if (newsJson.success && newsJson.data) {
          const recentNews = (newsJson.data as { title: string; source: string; pubDate: string; category: string }[])
            .filter(n => ['security', 'defense', 'world'].includes(n.category?.toLowerCase()))
            .slice(0, 4)
            .map((n, i) => ({
              id: `news-${i}`,
              timestamp: new Date(n.pubDate),
              title: n.title,
              region: n.source,
              deltaLevel: 0,
            }));
          setEvents(recentNews);
        }
      }
    } catch {
      // Keep seed data
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  const globalIndex = metrics.length > 0
    ? (metrics.reduce((s, m) => s + m.escalationLevel, 0) / metrics.length).toFixed(1)
    : '3.0';

  const getEscalationColor = (level: number) => {
    if (level >= 4) return '#ff4444';
    if (level >= 3) return '#ff8800';
    if (level >= 2) return '#ffaa00';
    return '#44ff88';
  };

  return (
    <article className="panel strategic-posture-panel">
      <div className="panel-header">
        <div className="panel-header-left">
          <span className="panel-icon"><ShieldIcon size={15} /></span>
          <h2 className="panel-title">Strategic Posture</h2>
        </div>
      </div>
      <div style={{ padding: '0 12px 4px', fontSize: 9, color: '#555', fontFamily: 'monospace' }}>
        {sourceLabel || 'Intelligence analysis'}
      </div>

      <div className="panel-content">
        {/* Global Escalation Index */}
        <div className="global-escalation">
          <div className="escalation-header">
            <span className="label">Global Escalation Index</span>
            <span className="value" style={{ color: getEscalationColor(parseFloat(globalIndex)) }}>
              {globalIndex} / 5.0
            </span>
          </div>
          <div className="escalation-bar-container">
            <div 
              className="escalation-bar"
              style={{ 
                width: `${(parseFloat(globalIndex) / 5) * 100}%`,
                background: `linear-gradient(90deg, #44ff88, #ffaa00, #ff4444)`,
              }}
            />
          </div>
        </div>

        {/* Force Metrics by Region */}
        <div className="force-metrics">
          <h3>Regional Escalation ({dataSource === 'live' ? 'ACLED Events' : 'Estimates'})</h3>
          {metrics.map(metric => (
            <div 
              key={metric.region}
              className={`force-metric ${selectedRegion === metric.region ? 'selected' : ''}`}
              onClick={() => setSelectedRegion(selectedRegion === metric.region ? null : metric.region)}
            >
              <div className="metric-header">
                <span className="region-name">{metric.region}</span>
                <span 
                  className="escalation-badge"
                  style={{ background: getEscalationColor(metric.escalationLevel) }}
                >
                  {metric.escalationLevel}/5
                </span>
              </div>

              <div className="force-bars">
                <div className="force-bar">
                  <span className="force-label">{dataSource === 'live' ? 'EVT' : 'NATO'}</span>
                  <div className="bar-track">
                    <div 
                      className="bar-fill"
                      style={{ 
                        width: `${dataSource === 'live' ? Math.min(metric.redForce * 2, 100) : (metric.blueForce / (metric.blueForce + metric.redForce)) * 100}%`,
                        background: getEscalationColor(metric.escalationLevel),
                      }}
                    />
                  </div>
                  <span className="force-value">{dataSource === 'live' ? `${metric.redForce} events` : formatNumber(metric.blueForce)}</span>
                </div>
              </div>

              <div className="metric-sparkline">
                <span className={`trend-indicator ${metric.trend}`}>
                  {metric.trend === 'increasing' ? '↑ Escalating' : metric.trend === 'decreasing' ? '↓ De-escalating' : '→ Stable'}
                </span>
              </div>

              {selectedRegion === metric.region && (
                <div className="metric-detail">
                  <p>{metric.recentActivity}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Recent Escalation Events */}
        <div className="escalation-events">
          <h3>Recent Events (from RSS)</h3>
          {events.length === 0 && <p style={{ fontSize: 10, color: '#888', padding: 8 }}>No recent security news available</p>}
          {events.map(event => (
            <div key={event.id} className="escalation-event">
              <div className="event-content">
                <span className="event-title">{event.title}</span>
                <span className="event-meta">{event.region} · {formatTimeAgo(event.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return String(num);
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
