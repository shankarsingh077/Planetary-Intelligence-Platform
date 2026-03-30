/**
 * LiveNewsVideoPanel — Live video news channels
 *
 * Embeds live news streams from YouTube and other sources.
 * Includes channel selector and auto-rotate.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { RadioIcon } from "./Icons";

interface Channel {
  id: string;
  name: string;
  category: string;
  type: "youtube" | "hls" | "iframe";
  url: string;
  thumbnail?: string;
}

const LIVE_CHANNELS: Channel[] = [
  {
    id: "aljaz",
    name: "Al Jazeera English",
    category: "World News",
    type: "youtube",
    url: "https://www.youtube.com/embed/gCNeDWCI0vo?autoplay=1&mute=1",
  },
  {
    id: "france24",
    name: "France 24 English",
    category: "World News",
    type: "youtube",
    url: "https://www.youtube.com/embed/h3MuIUNCCzI?autoplay=1&mute=1",
  },
  {
    id: "dw",
    name: "DW News",
    category: "World News",
    type: "youtube",
    url: "https://www.youtube.com/embed/pqabxBKzZ6A?autoplay=1&mute=1",
  },
  {
    id: "sky",
    name: "Sky News",
    category: "World News",
    type: "youtube",
    url: "https://www.youtube.com/embed/9Auq9mYxFEE?autoplay=1&mute=1",
  },
  {
    id: "euronews",
    name: "Euronews",
    category: "Europe",
    type: "youtube",
    url: "https://www.youtube.com/embed/pykpO5kQJ98?autoplay=1&mute=1",
  },
  {
    id: "ndtv",
    name: "NDTV 24x7",
    category: "India & Asia",
    type: "youtube",
    url: "https://www.youtube.com/embed/MN8p-Vrn6G0?autoplay=1&mute=1",
  },
  {
    id: "abc",
    name: "ABC News Live",
    category: "US News",
    type: "youtube",
    url: "https://www.youtube.com/embed/w_Ma8oQLmSM?autoplay=1&mute=1",
  },
  {
    id: "cna",
    name: "CNA 24/7",
    category: "Asia Pacific",
    type: "youtube",
    url: "https://www.youtube.com/embed/XWq5kBlakcQ?autoplay=1&mute=1",
  },
  {
    id: "trt",
    name: "TRT World",
    category: "Middle East",
    type: "youtube",
    url: "https://www.youtube.com/embed/TV3Sofqulqk?autoplay=1&mute=1",
  },
  {
    id: "wion",
    name: "WION",
    category: "World News",
    type: "youtube",
    url: "https://www.youtube.com/embed/iOLRXECXfpM?autoplay=1&mute=1",
  },
];

export function LiveNewsVideoPanel() {
  const [activeChannel, setActiveChannel] = useState<Channel>(LIVE_CHANNELS[0]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const rotateRef = useRef<number | null>(null);

  const switchChannel = useCallback((ch: Channel) => {
    setActiveChannel(ch);
  }, []);

  // Auto-rotate channels (every 60s)
  useEffect(() => {
    if (!autoRotate) {
      if (rotateRef.current) clearInterval(rotateRef.current);
      return;
    }
    rotateRef.current = window.setInterval(() => {
      setActiveChannel((prev) => {
        const idx = LIVE_CHANNELS.findIndex((c) => c.id === prev.id);
        return LIVE_CHANNELS[(idx + 1) % LIVE_CHANNELS.length];
      });
    }, 60000);
    return () => {
      if (rotateRef.current) clearInterval(rotateRef.current);
    };
  }, [autoRotate]);

  return (
    <article className={`panel live-video-panel ${isExpanded ? "expanded" : ""}`}>
      <div className="panel-header">
        <div className="panel-header-left">
          <span className="panel-icon"><RadioIcon size={15} /></span>
          <h2 className="panel-title">Live News Channels</h2>
        </div>
        <div className="video-header-controls">
          <button
            className={`video-rotate-btn ${autoRotate ? "active" : ""}`}
            onClick={() => setAutoRotate(!autoRotate)}
            title="Auto-rotate channels"
          >
            ↻ {autoRotate ? "ON" : "OFF"}
          </button>
          <button
            className="video-expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? "▼" : "▲"}
          </button>
        </div>
      </div>

      <div className="video-content">
        <div className="video-player">
          <iframe
            key={activeChannel.id}
            src={activeChannel.url}
            title={activeChannel.name}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              width: "100%",
              height: isExpanded ? "360px" : "200px",
              border: "none",
              borderRadius: "6px",
              background: "#0a0e1a",
            }}
          />
          <div className="video-now-playing">
            <span className="video-live-dot" />
            <span className="video-channel-name">{activeChannel.name}</span>
            <span className="video-channel-category">{activeChannel.category}</span>
          </div>
        </div>

        <div className="video-channel-list">
          {LIVE_CHANNELS.map((ch) => (
            <button
              key={ch.id}
              className={`video-channel-btn ${ch.id === activeChannel.id ? "active" : ""}`}
              onClick={() => switchChannel(ch)}
            >
              <span className="ch-name">{ch.name}</span>
              <span className="ch-cat">{ch.category}</span>
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
