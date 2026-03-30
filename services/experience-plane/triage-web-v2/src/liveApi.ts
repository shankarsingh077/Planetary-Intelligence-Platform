/**
 * liveApi.ts — Client for the live data proxy endpoints
 *
 * Each function calls the backend /v1/live/* routes.
 * Returns null on failure so callers can fall back to seed data.
 */

/* ─── Response Shape ──────────────────────────────────────────────────── */

interface LiveResponse<T> {
  success: boolean;
  data: T | null;
  source: string;
  timestamp: string;
  error?: string;
}

/* ─── Types ───────────────────────────────────────────────────────────── */

export interface LiveFire {
  lat: number;
  lon: number;
  brightness: number;
  confidence: string;
  acq_date: string;
  acq_time: string;
  frp: number;
  satellite: string;
}

export interface LiveConflict {
  id: string;
  date: string;
  type: string;
  sub_type: string;
  actor1: string;
  actor2: string;
  country: string;
  admin1: string;
  location: string;
  lat: number;
  lon: number;
  fatalities: number;
  source: string;
}

export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
  high: number;
  low: number;
  open: number;
  prev_close: number;
  error?: string;
}

export interface EconomicIndicator {
  series_id: string;
  value: number;
  date: string;
  previous: number;
  change: number;
  change_pct: number;
  error?: string;
}

export interface EnergySeries {
  series_id: string;
  value: number;
  period: string;
  units: string;
  previous: number;
  change: number;
  error?: string;
}

export interface LiveFlight {
  icao24: string;
  callsign: string;
  origin_country: string;
  lat: number;
  lon: number;
  altitude: number | null;
  velocity: number | null;
  heading: number | null;
  on_ground: boolean;
  squawk: string | null;
}

export interface CorridorScore {
  corridor: string;
  score: Record<string, unknown> | null;
}

export interface LiveNewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  category: string;
}

export interface LiveEvent {
  id: string;
  source: string;
  category: string;
  severity: string;
  title: string;
  location: string;
  timestamp: string;
  lat?: number;
  lon?: number;
  link?: string;
}

/* ─── Fetch Helpers ───────────────────────────────────────────────────── */

async function fetchLive<T>(endpoint: string): Promise<T | null> {
  try {
    const resp = await fetch(endpoint);
    if (!resp.ok) return null;
    const payload: LiveResponse<T> = await resp.json();
    if (payload.success && payload.data !== null) return payload.data;
    return null;
  } catch {
    return null;
  }
}

/* ─── Exported Functions ──────────────────────────────────────────────── */

export async function fetchLiveFires(): Promise<LiveFire[] | null> {
  return fetchLive<LiveFire[]>("/v1/live/fires");
}

export async function fetchLiveConflicts(): Promise<LiveConflict[] | null> {
  return fetchLive<LiveConflict[]>("/v1/live/conflicts");
}

export async function fetchLiveMarkets(): Promise<Record<string, MarketQuote> | null> {
  return fetchLive<Record<string, MarketQuote>>("/v1/live/markets");
}

export async function fetchLiveEconomic(): Promise<Record<string, EconomicIndicator> | null> {
  return fetchLive<Record<string, EconomicIndicator>>("/v1/live/economic");
}

export async function fetchLiveEnergy(): Promise<Record<string, EnergySeries> | null> {
  return fetchLive<Record<string, EnergySeries>>("/v1/live/energy");
}

export async function fetchLiveFlights(): Promise<LiveFlight[] | null> {
  return fetchLive<LiveFlight[]>("/v1/live/flights");
}

export async function fetchLiveCorridors(): Promise<CorridorScore[] | null> {
  return fetchLive<CorridorScore[]>("/v1/live/corridors");
}

export async function fetchLiveNews(): Promise<LiveNewsItem[] | null> {
  return fetchLive<LiveNewsItem[]>("/v1/live/news");
}

export async function fetchLiveEvents(): Promise<LiveEvent[] | null> {
  return fetchLive<LiveEvent[]>("/v1/live/events");
}
