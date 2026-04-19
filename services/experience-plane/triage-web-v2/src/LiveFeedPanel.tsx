/**
 * LiveFeedPanel – Real-time intelligence event feed
 * Uses SVG icons instead of emoji. Connected to LIVE API with seed fallback.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { RadioIcon, ZapIcon, AnchorIcon, TrendingUpIcon, FlameIcon, PlaneIcon, SwordsIcon, ShieldIcon, BoltIcon, BuildingIcon, SignalIcon, PinIcon } from "./Icons";
import { SEED_FEED_EVENTS, type FeedItem } from "./seedData";
import { fetchLiveEvents } from "./liveApi";
import { getSourceCredibility } from "./liveAlertUtils";

interface LiveFeedPanelProps {
  isVisible?: boolean;
}

const CATEGORY_ICONS: Record<string, JSX.Element> = {
  conflict: <SwordsIcon size={13} />,
  economic: <TrendingUpIcon size={13} />,
  climate: <FlameIcon size={13} />,
  cyber: <ShieldIcon size={13} />,
  health: <BuildingIcon size={13} />,
  political: <BuildingIcon size={13} />,
  maritime: <AnchorIcon size={13} />,
  aviation: <PlaneIcon size={13} />,
  energy: <BoltIcon size={13} />,
  default: <SignalIcon size={13} />,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff4444",
  high: "#ff8800",
  medium: "#ffaa00",
  low: "#44aa44",
};

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function LiveFeedPanel({ isVisible = true }: LiveFeedPanelProps) {
  const [events, setEvents] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [breakingNews, setBreakingNews] = useState<FeedItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

  const loadEvents = useCallback(async () => {
    try {
      // Try live API first
      const liveEvents = await fetchLiveEvents();
      if (liveEvents && liveEvents.length > 0) {
        const mapped: FeedItem[] = [...liveEvents]
          .sort((a, b) => Date.parse(b.timestamp || "") - Date.parse(a.timestamp || ""))
          .map((ev) => ({
          id: ev.id,
          source: ev.source,
          category: ev.category || "default",
          severity: (ev.severity || "medium") as FeedItem["severity"],
          title: ev.title,
          location: ev.location || undefined,
          timestamp: ev.timestamp || new Date().toISOString(),
          link: ev.link,
        }));
        setEvents(mapped);
        setLastUpdate(new Date().toLocaleTimeString("en-US", { hour12: false }));
        setIsLoading(false);

        const critical = mapped.find((e) => e.severity === "critical");
        if (critical && !breakingNews) {
          setBreakingNews(critical);
          setTimeout(() => setBreakingNews(null), 15000);
        }
        return;
      }
    } catch {
      // Fall through to seed
    }

    // Also try the legacy /v1/events endpoint
    try {
      const response = await fetch("/v1/events", {
        headers: {
          "X-Tenant-ID": "tenant-demo",
          "X-User-ID": "user-demo",
          "X-Roles": "analyst",
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.events) && data.events.length > 0) {
          setEvents(data.events);
          setLastUpdate(new Date().toLocaleTimeString("en-US", { hour12: false }));
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Fall back to seed data
    }

    // Use seed data as-is without faking timestamps
    setEvents(SEED_FEED_EVENTS);
    setLastUpdate(new Date().toLocaleTimeString("en-US", { hour12: false }));
    setIsLoading(false);

    const critical = SEED_FEED_EVENTS.find((e) => e.severity === "critical");
    if (critical && !breakingNews) {
      setBreakingNews(critical);
      setTimeout(() => setBreakingNews(null), 15000);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 30000);
    return () => clearInterval(interval);
  }, [loadEvents]);

  if (!isVisible) return null;

  return (
    <article className="panel live-feed-panel">
      {breakingNews && (
        <div className="breaking-news-banner">
          <span className="breaking-badge"><ZapIcon size={10} color="#fff" /> BREAKING</span>
          <span className="breaking-text">{breakingNews.title}</span>
          <button className="breaking-close" onClick={() => setBreakingNews(null)}>
            ×
          </button>
        </div>
      )}

      <div className="panel-header">
        <div className="panel-header-left">
          <span className="panel-icon"><RadioIcon size={15} /></span>
          <h2 className="panel-title">Live Intelligence Feed</h2>
        </div>
        <div className="feed-header-right">
          <span className="panel-time">Updated {lastUpdate}</span>
        </div>
      </div>

      {/* Scrolling Ticker */}
      <div className="feed-ticker" ref={tickerRef}>
        <div className="feed-ticker-content">
          {events.map((evt) => (
            <span key={evt.id} className="ticker-item" style={{ color: SEVERITY_COLORS[evt.severity] }}>
              {CATEGORY_ICONS[evt.category] || CATEGORY_ICONS.default}{" "}
              {evt.title}
              <span className="ticker-separator">•</span>
            </span>
          ))}
          {/* Duplicate for seamless loop */}
          {events.map((evt) => (
            <span key={`dup-${evt.id}`} className="ticker-item" style={{ color: SEVERITY_COLORS[evt.severity] }}>
              {CATEGORY_ICONS[evt.category] || CATEGORY_ICONS.default}{" "}
              {evt.title}
              <span className="ticker-separator">•</span>
            </span>
          ))}
        </div>
      </div>

      <div className="panel-content feed-content">
        {isLoading ? (
          <div className="feed-loading">
            <div className="feed-loading-pulse" />
            <p>Connecting to intelligence feeds...</p>
          </div>
        ) : (
          <div className="feed-list">
            {events.map((evt, idx) => {
              const isExpanded = expandedId === evt.id;
              const credibility = getSourceCredibility(evt.source);
              return (
                <div
                  key={evt.id}
                  className={`feed-item sev-${evt.severity} ${isExpanded ? 'expanded' : ''}`}
                  style={{ animationDelay: `${idx * 60}ms`, cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                >
                  <div className="feed-item-header">
                    <span className="feed-item-icon">
                      {CATEGORY_ICONS[evt.category] || CATEGORY_ICONS.default}
                    </span>
                    <span className="feed-item-source">{evt.source}</span>
                    <span className="feed-item-time">{formatRelativeTime(evt.timestamp)}</span>
                    <span
                      className="feed-item-severity"
                      style={{ color: SEVERITY_COLORS[evt.severity] }}
                    >
                      {evt.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="feed-item-body">
                    <p className="feed-item-title">{evt.title}</p>
                    {evt.location && (
                      <span className="feed-item-location"><PinIcon size={10} /> {evt.location}</span>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="feed-item-details" style={{ padding: '6px 10px', fontSize: 10, color: '#aaa', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 4 }}>
                      <div><strong>Category:</strong> {evt.category}</div>
                      <div><strong>Severity:</strong> {evt.severity}</div>
                      <div><strong>Source:</strong> {evt.source}</div>
                      <div><strong>Credibility:</strong> <span style={{ color: credibility.color }}>{credibility.label}</span> ({Math.round(credibility.score * 100)}%)</div>
                      <div><strong>Assessment:</strong> {credibility.note}</div>
                      {evt.location && <div><strong>Location:</strong> {evt.location}</div>}
                      <div><strong>Time:</strong> {new Date(evt.timestamp).toLocaleString()}</div>
                      {evt.link ? (
                        <div style={{ marginTop: 4 }}>
                          <a href={evt.link} target="_blank" rel="noreferrer" style={{ color: "#67d4ff" }}>
                            Open source
                          </a>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div style={{ padding: '6px 10px', fontSize: 9, color: '#555', fontFamily: 'monospace', borderTop: '1px solid var(--border)' }}>
          GDELT · ACLED · NASA FIRMS · RSS Feeds
        </div>
      </div>
    </article>
  );
}
