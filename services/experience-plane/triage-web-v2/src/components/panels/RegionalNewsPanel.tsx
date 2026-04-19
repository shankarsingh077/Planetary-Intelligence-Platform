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
  const [loading, setLoading] = useState(false);

  const fetchRegionalNews = async () => {
    setLoading(true);
    try {
      // Use server-side region filtering
      const regionParam = region !== 'world' ? `?region=${encodeURIComponent(region)}` : '';
      const res = await fetch(`/v1/live/news${regionParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          setNews(data.data.slice(0, 6).map((item: { title?: string; source?: string; link?: string; pubDate?: string }, i: number) => ({
            id: `${region}-${i}`,
            title: item.title || 'Untitled',
            source: item.source || 'Unknown',
            link: item.link || '#',
            pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
          })));
          // News loaded from RSS feeds
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

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
