/**
 * dataCache.ts — Persistent Local Data Cache
 * 
 * Stores fetched API data in localStorage so:
 * 1. When offline, we show the LAST REAL data (not ancient hardcoded seeds)
 * 2. On reconnect, we only need to fetch what's new
 * 3. The platform always shows real intelligence, never fake data
 */

const CACHE_PREFIX = 'pip-cache-';

interface CachedEntry<T> {
  data: T;
  timestamp: number;       // when it was cached (ms)
  source: string;           // which API provided it
}

/**
 * Save data to persistent cache
 */
export function cacheSet<T>(key: string, data: T, source: string): void {
  try {
    const entry: CachedEntry<T> = {
      data,
      timestamp: Date.now(),
      source,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full — silently fail
  }
}

/**
 * Get cached data. Returns null if nothing cached.
 */
export function cacheGet<T>(key: string): CachedEntry<T> | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CachedEntry<T>;
  } catch {
    return null;
  }
}

/**
 * Get just the data from cache (or fallback)
 */
export function cacheGetData<T>(key: string, fallback: T): T {
  const cached = cacheGet<T>(key);
  return cached ? cached.data : fallback;
}

/**
 * Get the age of cached data in minutes
 */
export function cacheAge(key: string): number {
  const cached = cacheGet(key);
  if (!cached) return Infinity;
  return (Date.now() - cached.timestamp) / 60000;
}

/**
 * Format cache timestamp as human-readable string
 */
export function cacheTimeLabel(key: string): string {
  const cached = cacheGet(key);
  if (!cached) return '';
  const age = (Date.now() - cached.timestamp) / 1000;
  if (age < 60) return `${cached.source} · just now`;
  if (age < 3600) return `${cached.source} · ${Math.floor(age / 60)}m ago`;
  if (age < 86400) return `${cached.source} · ${Math.floor(age / 3600)}h ago`;
  return `${cached.source} · ${Math.floor(age / 86400)}d ago`;
}
