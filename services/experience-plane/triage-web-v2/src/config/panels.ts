/**
 * panels.ts — Panel Registry & Categories
 * 
 * CLEANED: Only panels that actually have working implementations.
 * Removed all PRO/locked features that don't exist.
 */

/* ─── Panel Configuration Type ────────────────────────────────────────────── */

export interface PanelConfig {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  priority: number;
  premium?: 'locked' | 'enhanced';
  icon?: string;
  description?: string;
}

/* ─── Panel Categories (only categories with working panels) ──────────────── */

export const PANEL_CATEGORIES = [
  { id: 'core', name: 'Core', icon: '🌐' },
  { id: 'intelligence', name: 'Intelligence', icon: '🔍' },
  { id: 'regional', name: 'Regional News', icon: '📰' },
  { id: 'markets', name: 'Markets & Finance', icon: '📈' },
  { id: 'data', name: 'Data & Tracking', icon: '📊' },
] as const;

export type PanelCategoryId = typeof PANEL_CATEGORIES[number]['id'];

/* ─── Core Panels ─────────────────────────────────────────────────────────── */

export const CORE_PANELS: PanelConfig[] = [
  { id: 'map', name: 'Global Situation Map', category: 'core', enabled: true, priority: 1, icon: '🗺️', description: 'Interactive map with fire hotspots, conflict zones, and intel markers' },
  { id: 'live-news', name: 'Live News Feed', category: 'core', enabled: true, priority: 2, icon: '📺', description: 'Aggregated live news from 22+ RSS feeds' },
];

/* ─── Intelligence Panels ─────────────────────────────────────────────────── */

export const INTELLIGENCE_PANELS: PanelConfig[] = [
  { id: 'ai-insights', name: 'AI Strategic Insights', category: 'intelligence', enabled: true, priority: 1, icon: '🧠', description: 'Gemini AI analysis based on live data from NASA, ACLED, Finnhub, RSS' },
  { id: 'ai-strategic-posture', name: 'Strategic Posture', category: 'intelligence', enabled: true, priority: 2, icon: '🎖️', description: 'Real-time escalation monitoring from ACLED conflict data' },
  { id: 'ai-forecasts', name: 'AI Forecasts', category: 'intelligence', enabled: true, priority: 3, icon: '🔮', description: 'Gemini AI probability assessments based on live events' },
  { id: 'intel-feed', name: 'Intel Feed', category: 'intelligence', enabled: true, priority: 4, icon: '📡', description: 'Aggregated intelligence events from all data sources' },
];

/* ─── Regional News Panels ────────────────────────────────────────────────── */

export const REGIONAL_PANELS: PanelConfig[] = [
  { id: 'world-news', name: 'World News', category: 'regional', enabled: true, priority: 1, icon: '🌍', description: 'Global headlines from Reuters, BBC, AP, Al Jazeera, France24' },
  { id: 'us-news', name: 'United States', category: 'regional', enabled: true, priority: 2, icon: '🇺🇸', description: 'US-filtered news from wire services' },
  { id: 'europe-news', name: 'Europe', category: 'regional', enabled: true, priority: 3, icon: '🇪🇺', description: 'European news from BBC, DW, France24' },
  { id: 'middle-east-news', name: 'Middle East', category: 'regional', enabled: true, priority: 4, icon: '🏜️', description: 'Middle East coverage from Al Jazeera, Reuters' },
  { id: 'africa-news', name: 'Africa', category: 'regional', enabled: true, priority: 5, icon: '🌍', description: 'Africa coverage from wire services' },
  { id: 'latin-america-news', name: 'Latin America', category: 'regional', enabled: true, priority: 6, icon: '🌎', description: 'Latin America coverage from wire services' },
  { id: 'asia-pacific-news', name: 'Asia-Pacific', category: 'regional', enabled: true, priority: 7, icon: '🌏', description: 'Asia-Pacific coverage from wire services' },
];

/* ─── Markets & Finance Panels ────────────────────────────────────────────── */

export const MARKETS_PANELS: PanelConfig[] = [
  { id: 'metals-materials', name: 'Metals & Materials', category: 'markets', enabled: true, priority: 1, icon: '🥇', description: 'Gold, Silver, Copper ETF prices from Finnhub' },
  { id: 'energy-complex', name: 'Energy Complex', category: 'markets', enabled: true, priority: 2, icon: '🛢️', description: 'Brent, WTI, Natural Gas ETF prices from Finnhub' },
  { id: 'markets-overview', name: 'Market Indices', category: 'markets', enabled: true, priority: 3, icon: '📊', description: 'S&P 500, Dow Jones, NASDAQ, Russell 2000 from Finnhub' },
  { id: 'fear-greed', name: 'Fear & Greed Gauge', category: 'markets', enabled: false, priority: 4, icon: '😱', description: 'Market sentiment indicator' },
  { id: 'yield-curve', name: 'Yield Curve', category: 'markets', enabled: false, priority: 5, icon: '📈', description: 'US Treasury yield curve' },
];

/* ─── Data & Tracking Panels ──────────────────────────────────────────────── */

export const DATA_PANELS: PanelConfig[] = [
  { id: 'fires', name: 'Global Fires', category: 'data', enabled: false, priority: 1, icon: '🔥', description: 'NASA FIRMS satellite fire detection (VIIRS/MODIS)' },
  { id: 'cot-positioning', name: 'COT Positioning', category: 'data', enabled: true, priority: 2, icon: '📊', description: 'Derived from real market positions via Finnhub' },
  { id: 'consumer-prices', name: 'Economic Indicators', category: 'data', enabled: true, priority: 3, icon: '💵', description: 'Official FRED data: unemployment, CPI, GDP, Fed rate' },
  { id: 'unhcr-displacement', name: 'Displacement Tracker', category: 'data', enabled: true, priority: 4, icon: '🏃', description: 'Conflict-derived displacement estimates from ACLED' },
  { id: 'climate-anomalies', name: 'Climate & Thermal', category: 'data', enabled: true, priority: 5, icon: '🌡️', description: 'NASA FIRMS thermal anomaly tracking' },
  { id: 'armed-conflicts', name: 'Conflict Events', category: 'data', enabled: false, priority: 6, icon: '⚔️', description: 'ACLED armed conflict event tracking' },
];

/* ─── All Panels Registry ─────────────────────────────────────────────────── */

export const ALL_PANELS: PanelConfig[] = [
  ...CORE_PANELS,
  ...INTELLIGENCE_PANELS,
  ...REGIONAL_PANELS,
  ...MARKETS_PANELS,
  ...DATA_PANELS,
];

/* ─── Panel Map (by ID) ───────────────────────────────────────────────────── */

export const PANELS_BY_ID: Record<string, PanelConfig> = Object.fromEntries(
  ALL_PANELS.map(p => [p.id, p])
);

/* ─── Panels by Category ──────────────────────────────────────────────────── */

export const PANELS_BY_CATEGORY: Record<string, PanelConfig[]> = {
  core: CORE_PANELS,
  intelligence: INTELLIGENCE_PANELS,
  regional: REGIONAL_PANELS,
  markets: MARKETS_PANELS,
  data: DATA_PANELS,
};

/* ─── Default Enabled Panels ──────────────────────────────────────────────── */

export const DEFAULT_ENABLED_PANELS: string[] = ALL_PANELS
  .filter(p => p.enabled)
  .map(p => p.id);

/* ─── Storage Keys ────────────────────────────────────────────────────────── */

export const PANEL_STORAGE_KEYS = {
  order: 'pip-panel-order',
  enabled: 'pip-panel-enabled',
  spans: 'pip-panel-spans',
  colSpans: 'pip-panel-col-spans',
  collapsed: 'pip-panel-collapsed',
} as const;

/* ─── Helper Functions ────────────────────────────────────────────────────── */

export function getPanelConfig(id: string): PanelConfig | undefined {
  return PANELS_BY_ID[id];
}

export function getCategoryPanels(categoryId: string): PanelConfig[] {
  return PANELS_BY_CATEGORY[categoryId] ?? [];
}

export function getEnabledPanels(): PanelConfig[] {
  const savedEnabled = localStorage.getItem(PANEL_STORAGE_KEYS.enabled);
  if (savedEnabled) {
    try {
      const enabledIds = JSON.parse(savedEnabled) as string[];
      return enabledIds.map(id => PANELS_BY_ID[id]).filter(Boolean) as PanelConfig[];
    } catch {
      // Fall through to default
    }
  }
  return ALL_PANELS.filter(p => p.enabled);
}

export function saveEnabledPanels(panelIds: string[]): void {
  localStorage.setItem(PANEL_STORAGE_KEYS.enabled, JSON.stringify(panelIds));
}

export function getPanelOrder(): string[] {
  const savedOrder = localStorage.getItem(PANEL_STORAGE_KEYS.order);
  if (savedOrder) {
    try {
      return JSON.parse(savedOrder) as string[];
    } catch {
      // Fall through to default
    }
  }
  return DEFAULT_ENABLED_PANELS;
}

export function savePanelOrder(order: string[]): void {
  localStorage.setItem(PANEL_STORAGE_KEYS.order, JSON.stringify(order));
}
