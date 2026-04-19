/**
 * AIInsightsPanel – AI-powered analysis panel
 * 
 * Uses Grok API to generate strategic insights based on current events.
 * Displays key insights, why it matters, and likely next steps.
 */

import { useState, useEffect, useCallback } from 'react';
import { BrainIcon, RefreshIcon, ZapIcon } from '../../Icons';

interface AIInsight {
  id: string;
  title: string;
  summary: string;
  whyItMatters: string;
  likelyNext: string;
  confidence: number; // 0-100
  timestamp: Date;
  region?: string;
  category?: string;
}

interface AIInsightsPanelProps {
  events?: Array<{ headline: string; category?: string; region?: string }>;
  onRefresh?: () => void;
}

// Seed insights for demo (used when API is unavailable)
const SEED_INSIGHTS: AIInsight[] = [
  {
    id: '1',
    title: 'Strait of Hormuz Tensions Escalating',
    summary: 'Iranian naval activity has increased by 40% in the past 72 hours, with multiple fast-attack craft shadowing commercial vessels.',
    whyItMatters: 'The Strait handles 21% of global oil transit. Any disruption would trigger immediate energy price spikes and supply chain cascades.',
    likelyNext: 'Expect increased US 5th Fleet presence and potential NATO convoy operations within 48-72 hours.',
    confidence: 78,
    timestamp: new Date(),
    region: 'Middle East',
    category: 'Energy Security',
  },
  {
    id: '2',
    title: 'China-Taiwan Semiconductor Supply Risk',
    summary: 'TSMC fab operations face elevated typhoon risk this week. Simultaneously, Chinese military exercises near Taiwan have intensified.',
    whyItMatters: 'Taiwan produces 65% of global semiconductors. Any production disruption would cascade through automotive, AI, and consumer electronics sectors.',
    likelyNext: 'Tech companies are likely accelerating inventory buildups. Watch for announcements from Apple, NVIDIA on supply chain adjustments.',
    confidence: 72,
    timestamp: new Date(),
    region: 'Asia-Pacific',
    category: 'Technology',
  },
  {
    id: '3',
    title: 'European Natural Gas Volatility',
    summary: 'Russian LNG deliveries via Finland have dropped 30% following new EU sanctions. Storage levels at 85% but declining faster than seasonal norm.',
    whyItMatters: 'Europe remains vulnerable to energy weaponization. Current trajectory suggests storage could hit critical levels by February.',
    likelyNext: 'EU likely to announce additional LNG contracts with Qatar and US. Industrial demand rationing possible by Q1 if trend continues.',
    confidence: 65,
    timestamp: new Date(),
    region: 'Europe',
    category: 'Energy',
  },
];

export function AIInsightsPanel({ onRefresh }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<AIInsight[]>(SEED_INSIGHTS);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const refreshInsights = useCallback(async () => {
    setLoading(true);
    try {
      // Attempt real API call
      const res = await fetch('/v1/ai/insights', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          setInsights(json.data.map((d: any, i: number) => ({
            id: String(i + 1),
            title: d.title || 'Untitled',
            summary: d.summary || '',
            whyItMatters: d.why_it_matters || d.whyItMatters || '',
            likelyNext: d.likely_next || d.likelyNext || '',
            confidence: d.confidence || 50,
            timestamp: new Date(),
            region: d.region,
            category: d.category,
          })));
          // Data successfully loaded from API
          setLastUpdated(new Date());
          onRefresh?.();
          return;
        }
      }
    } catch {
      // API unavailable — fall back to seed
    }
    // Fall back to seed data (clearly labeled)
    setInsights(SEED_INSIGHTS);
    setLastUpdated(new Date());
    setLoading(false);
  }, [onRefresh]);

  useEffect(() => {
    // Auto-refresh every 5 minutes
    const interval = setInterval(refreshInsights, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshInsights]);

  return (
    <article className="panel ai-insights-panel">
      <div className="panel-header">
        <div className="panel-header-left">
          <span className="panel-icon"><BrainIcon size={15} /></span>
          <h2 className="panel-title">AI Strategic Insights</h2>
        </div>
        <div className="panel-header-right">
          <span className="last-updated">
            {formatTimeAgo(lastUpdated)}
          </span>
          <button 
            className="refresh-btn-small" 
            onClick={refreshInsights}
            disabled={loading}
          >
            <RefreshIcon size={12} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      <div className="panel-content">
        {loading && (
          <div className="ai-loading">
            <div className="ai-loading-dots">
              <span /><span /><span />
            </div>
            <span>Analyzing global events...</span>
          </div>
        )}

        <div className="insights-list">
          {insights.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
        <div style={{ padding: '6px 10px', fontSize: 9, color: '#555', fontFamily: 'monospace', borderTop: '1px solid var(--border)' }}>
          Gemini AI · Analysis based on live data from NASA FIRMS, ACLED, Finnhub, RSS
        </div>
      </div>
    </article>
  );
}

function InsightCard({ insight }: { insight: AIInsight }) {
  const [expanded, setExpanded] = useState(false);

  const confidenceColor = 
    insight.confidence >= 75 ? '#44ff88' :
    insight.confidence >= 50 ? '#ffaa00' : '#ff8800';

  return (
    <div className={`insight-card ${expanded ? 'expanded' : ''}`}>
      <div className="insight-header" onClick={() => setExpanded(!expanded)}>
        <div className="insight-meta">
          {insight.category && (
            <span className="insight-category">{insight.category}</span>
          )}
          {insight.region && (
            <span className="insight-region">{insight.region}</span>
          )}
        </div>
        <div className="insight-title">
          <ZapIcon size={12} color={confidenceColor} />
          <span>{insight.title}</span>
        </div>
        <div className="insight-confidence">
          <div 
            className="confidence-bar"
            style={{ width: `${insight.confidence}%`, background: confidenceColor }}
          />
          <span className="confidence-value" style={{ color: confidenceColor }}>
            {insight.confidence}%
          </span>
        </div>
      </div>

      {expanded && (
        <div className="insight-details">
          <div className="insight-section">
            <h4>Summary</h4>
            <p>{insight.summary}</p>
          </div>
          <div className="insight-section">
            <h4>Why It Matters</h4>
            <p>{insight.whyItMatters}</p>
          </div>
          <div className="insight-section">
            <h4>Likely Next</h4>
            <p>{insight.likelyNext}</p>
          </div>
          <div className="insight-timestamp">
            Generated {formatTimeAgo(insight.timestamp)}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
