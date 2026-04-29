/**
 * RegionalNewsPanel – Display news by region
 * 
 * Configurable news panel that filters live RSS news by region.
 */

import { useState, useEffect } from 'react';
import { RefreshIcon } from '../../Icons';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  link: string;
  pubDate: Date;
  description?: string;
  sourceLeaning?: string;
  sourceLeaningLabel?: string;
}

interface BalancedNewsSource {
  source: string;
  leaning: string;
  leaning_label: string;
  article_count: number;
}

interface BalancedNewsCard {
  id: string;
  headline: string;
  center_summary: string;
  source_count: number;
  distribution: {
    left: number;
    center: number;
    right: number;
    unknown: number;
  };
  common_facts: string[];
  blindspots: string[];
  related_sources: BalancedNewsSource[];
}

interface RegionalNewsPanelProps {
  region: string;
  regionName: string;
  icon: string;
  keywords?: string[];
}

// Seed news items per region (fallback)
const SEED_NEWS: Record<string, NewsItem[]> = {
  'us': [
    { id: 'us1', title: 'Pentagon announces new Pacific defense posture', source: 'Defense One', link: '#', pubDate: new Date() },
    { id: 'us2', title: 'Treasury implements new Russia sanctions package', source: 'Reuters', link: '#', pubDate: new Date() },
    { id: 'us3', title: 'Federal Reserve signals rate decision approach', source: 'CNBC', link: '#', pubDate: new Date() },
  ],
  'europe': [
    { id: 'eu1', title: 'NATO allies commit additional air defense to Ukraine', source: 'Reuters', link: '#', pubDate: new Date() },
    { id: 'eu2', title: 'EU announces 14th sanctions package against Russia', source: 'BBC', link: '#', pubDate: new Date() },
    { id: 'eu3', title: 'ECB maintains hawkish stance on inflation', source: 'Financial Times', link: '#', pubDate: new Date() },
  ],
  'middle-east': [
    { id: 'me1', title: 'Houthi attacks disrupt Red Sea shipping lanes', source: 'Al Jazeera', link: '#', pubDate: new Date() },
    { id: 'me2', title: 'Iran-Israel tensions escalate following strikes', source: 'BBC', link: '#', pubDate: new Date() },
    { id: 'me3', title: 'Saudi Arabia announces Vision 2030 update', source: 'Reuters', link: '#', pubDate: new Date() },
  ],
  'africa': [
    { id: 'af1', title: 'Sudan conflict displaces millions in new offensive', source: 'UN News', link: '#', pubDate: new Date() },
    { id: 'af2', title: 'Sahel nations expand military cooperation', source: 'Africa Report', link: '#', pubDate: new Date() },
    { id: 'af3', title: 'Ethiopia-Eritrea border tensions resurface', source: 'Reuters', link: '#', pubDate: new Date() },
  ],
  'latin-america': [
    { id: 'la1', title: 'Brazil-Argentina trade tensions affect Mercosur', source: 'Reuters', link: '#', pubDate: new Date() },
    { id: 'la2', title: 'Venezuela election crisis deepens', source: 'AP', link: '#', pubDate: new Date() },
    { id: 'la3', title: 'Mexico announces new energy policy framework', source: 'Bloomberg', link: '#', pubDate: new Date() },
  ],
  'asia-pacific': [
    { id: 'ap1', title: 'China conducts exercises near Taiwan Strait', source: 'Reuters', link: '#', pubDate: new Date() },
    { id: 'ap2', title: 'Japan-US alliance strengthens under new framework', source: 'Nikkei', link: '#', pubDate: new Date() },
    { id: 'ap3', title: 'South China Sea tensions as Philippines protests', source: 'AP', link: '#', pubDate: new Date() },
  ],
};

export function RegionalNewsPanel({ region, regionName, icon }: RegionalNewsPanelProps) {
  const [news, setNews] = useState<NewsItem[]>(SEED_NEWS[region] || []);
  const [comparisonCard, setComparisonCard] = useState<BalancedNewsCard | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRegionalNews = async () => {
    setLoading(true);
    try {
      const regionParam = region !== 'world' ? `?region=${encodeURIComponent(region)}` : '';
      const res = await fetch(`/v1/live/news-balanced${regionParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const articles = Array.isArray(data.data.articles) ? data.data.articles : [];
          const cards = Array.isArray(data.data.comparison_cards) ? data.data.comparison_cards : [];
          if (articles.length > 0) {
            setNews(articles.slice(0, 6).map((item: {
              title?: string;
              source?: string;
              link?: string;
              pubDate?: string;
              source_leaning?: string;
              source_leaning_label?: string;
            }, i: number) => ({
              id: `${region}-${i}`,
              title: item.title || 'Untitled',
              source: item.source || 'Unknown',
              link: item.link || '#',
              pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
              sourceLeaning: item.source_leaning || 'unknown',
              sourceLeaningLabel: item.source_leaning_label || 'Unrated',
            })));
          }
          setComparisonCard(cards[0] || null);
          if (articles.length > 0) {
            return;
          }
        }
      }

      const fallbackRes = await fetch(`/v1/live/news${regionParam}`);
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        if (data.success && data.data && data.data.length > 0) {
          setNews(data.data.slice(0, 6).map((item: { title?: string; source?: string; link?: string; pubDate?: string }, i: number) => ({
            id: `${region}-${i}`,
            title: item.title || 'Untitled',
            source: item.source || 'Unknown',
            link: item.link || '#',
            pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
          })));
          setComparisonCard(null);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to fetch regional news:', err);
    } finally {
      setLoading(false);
    }
    // Stay on existing data if fetch failed
  };

  useEffect(() => {
    fetchRegionalNews();
    const interval = setInterval(fetchRegionalNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [region]);

  return (
    <article className="panel regional-news-panel">
      <div className="panel-header">
        <div className="panel-header-left">
          <span className="panel-icon">{icon}</span>
          <h2 className="panel-title">{regionName}</h2>
        </div>
        <div className="panel-header-right">
          <button 
            className="refresh-btn-small" 
            onClick={fetchRegionalNews}
            disabled={loading}
          >
            <RefreshIcon size={12} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      <div className="panel-content">
        {comparisonCard ? (
          <div className="news-balance-card">
            <div className="news-balance-header">
              <div>
                <span className="news-balance-badge">Balanced Coverage</span>
                <div className="news-balance-title">{comparisonCard.headline}</div>
              </div>
              <div className="news-balance-count">{comparisonCard.source_count} sources</div>
            </div>

            <p className="news-balance-summary">{comparisonCard.center_summary}</p>

            <div className="news-balance-distribution">
              <DistributionPill label="L" value={comparisonCard.distribution.left} tone="left" />
              <DistributionPill label="C" value={comparisonCard.distribution.center} tone="center" />
              <DistributionPill label="R" value={comparisonCard.distribution.right} tone="right" />
              {comparisonCard.distribution.unknown > 0 ? (
                <DistributionPill label="U" value={comparisonCard.distribution.unknown} tone="unknown" />
              ) : null}
            </div>

            <div className="news-balance-bar">
              {buildDistributionSegments(comparisonCard.distribution).map((segment) => (
                <span
                  key={segment.label}
                  className={`news-balance-segment ${segment.tone}`}
                  style={{ width: `${segment.width}%` }}
                  title={`${segment.label}: ${segment.value}`}
                />
              ))}
            </div>

            <div className="news-balance-section">
              <span className="news-balance-section-title">Center Summary</span>
              <p>{comparisonCard.center_summary}</p>
            </div>

            <div className="news-balance-section">
              <span className="news-balance-section-title">Common Facts</span>
              <div className="news-balance-bullets">
                {comparisonCard.common_facts.slice(0, 3).map((fact, index) => (
                  <p key={`${comparisonCard.id}-fact-${index}`}>{fact}</p>
                ))}
              </div>
            </div>

            <div className="news-balance-section">
              <span className="news-balance-section-title">Blindspots / Missing Angles</span>
              <div className="news-balance-bullets subdued">
                {comparisonCard.blindspots.slice(0, 3).map((blindspot, index) => (
                  <p key={`${comparisonCard.id}-blindspot-${index}`}>{blindspot}</p>
                ))}
              </div>
            </div>

            {comparisonCard.related_sources.length > 0 ? (
              <div className="news-balance-sources">
                {comparisonCard.related_sources.slice(0, 5).map((source) => (
                  <span key={`${comparisonCard.id}-${source.source}`} className={`news-source-chip ${source.leaning || 'unknown'}`}>
                    {source.source} · {source.leaning_label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="news-balance-empty">
            Need more overlapping coverage before a balanced comparison card can be generated for this region.
          </div>
        )}

        <div className="news-list">
          {news.map(item => (
            <a 
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="news-item"
            >
              <span className="news-title">{item.title}</span>
              <span className="news-meta">
                {item.source} · {formatTimeAgo(item.pubDate)}
                {item.sourceLeaningLabel ? (
                  <span className={`news-leaning-chip ${item.sourceLeaning || 'unknown'}`}>
                    {item.sourceLeaningLabel}
                  </span>
                ) : null}
              </span>
            </a>
          ))}
        </div>
        <div style={{ padding: '6px 10px', fontSize: 9, color: '#555', fontFamily: 'monospace', borderTop: '1px solid var(--border)' }}>
          {news.length > 0 ? [...new Set(news.map(n => n.source))].slice(0, 4).join(', ') : 'RSS'} · Live feeds
        </div>
      </div>
    </article>
  );
}

function DistributionPill({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <span className={`news-distribution-pill ${tone}`}>
      {label} {value}
    </span>
  );
}

function buildDistributionSegments(distribution: BalancedNewsCard['distribution']) {
  const entries = [
    { label: 'Left', value: distribution.left, tone: 'left' },
    { label: 'Center', value: distribution.center, tone: 'center' },
    { label: 'Right', value: distribution.right, tone: 'right' },
    { label: 'Unknown', value: distribution.unknown, tone: 'unknown' },
  ].filter((entry) => entry.value > 0);

  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  if (total === 0) {
    return [{ label: 'Unknown', value: 1, width: 100, tone: 'unknown' }];
  }

  return entries.map((entry) => ({
    ...entry,
    width: (entry.value / total) * 100,
  }));
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
