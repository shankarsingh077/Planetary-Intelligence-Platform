import { COUNTRY_RISK } from "./config/countries";
import {
  CONFLICT_ZONES,
  INTEL_HOTSPOTS,
  MILITARY_BASES,
  PORTS,
  STRATEGIC_WATERWAYS,
} from "./geoData";
import type { LiveEvent, LiveNewsItem } from "./liveApi";
import type { Alert } from "./types";

export interface GeoPoint {
  lat: number;
  lon: number;
  label?: string;
}

export interface SourceCredibility {
  label: string;
  score: number;
  note: string;
  color: string;
}

interface GeoEntry extends GeoPoint {
  keywords: string[];
}

const COUNTRY_COORDS: Record<string, GeoPoint> = {
  AF: { lat: 34.56, lon: 69.21, label: "Afghanistan" },
  AR: { lat: -34.6, lon: -58.38, label: "Argentina" },
  AU: { lat: -35.28, lon: 149.13, label: "Australia" },
  BD: { lat: 23.81, lon: 90.41, label: "Bangladesh" },
  BF: { lat: 12.37, lon: -1.52, label: "Burkina Faso" },
  BR: { lat: -15.79, lon: -47.88, label: "Brazil" },
  CA: { lat: 45.42, lon: -75.69, label: "Canada" },
  CL: { lat: -33.45, lon: -70.67, label: "Chile" },
  CN: { lat: 39.9, lon: 116.4, label: "China" },
  CO: { lat: 4.71, lon: -74.07, label: "Colombia" },
  DE: { lat: 52.52, lon: 13.4, label: "Germany" },
  EG: { lat: 30.04, lon: 31.24, label: "Egypt" },
  ET: { lat: 8.98, lon: 38.79, label: "Ethiopia" },
  FI: { lat: 60.17, lon: 24.94, label: "Finland" },
  FR: { lat: 48.86, lon: 2.35, label: "France" },
  GB: { lat: 51.5, lon: -0.12, label: "United Kingdom" },
  HT: { lat: 18.54, lon: -72.34, label: "Haiti" },
  ID: { lat: -6.21, lon: 106.85, label: "Indonesia" },
  IL: { lat: 31.77, lon: 35.21, label: "Israel" },
  IN: { lat: 28.61, lon: 77.21, label: "India" },
  IQ: { lat: 33.31, lon: 44.36, label: "Iraq" },
  IR: { lat: 35.69, lon: 51.39, label: "Iran" },
  JP: { lat: 35.68, lon: 139.76, label: "Japan" },
  KE: { lat: -1.29, lon: 36.82, label: "Kenya" },
  KP: { lat: 39.03, lon: 125.75, label: "North Korea" },
  KR: { lat: 37.57, lon: 126.98, label: "South Korea" },
  LB: { lat: 33.89, lon: 35.5, label: "Lebanon" },
  LY: { lat: 32.89, lon: 13.19, label: "Libya" },
  ML: { lat: 12.65, lon: -8.0, label: "Mali" },
  MM: { lat: 19.76, lon: 96.08, label: "Myanmar" },
  MX: { lat: 19.43, lon: -99.13, label: "Mexico" },
  MY: { lat: 3.14, lon: 101.69, label: "Malaysia" },
  NE: { lat: 13.51, lon: 2.12, label: "Niger" },
  NG: { lat: 9.06, lon: 7.49, label: "Nigeria" },
  NL: { lat: 52.37, lon: 4.9, label: "Netherlands" },
  NO: { lat: 59.91, lon: 10.75, label: "Norway" },
  PE: { lat: -12.05, lon: -77.04, label: "Peru" },
  PH: { lat: 14.6, lon: 120.98, label: "Philippines" },
  PK: { lat: 33.69, lon: 73.06, label: "Pakistan" },
  PL: { lat: 52.23, lon: 21.01, label: "Poland" },
  PS: { lat: 31.5, lon: 34.47, label: "Palestine" },
  QA: { lat: 25.29, lon: 51.53, label: "Qatar" },
  RU: { lat: 55.76, lon: 37.62, label: "Russia" },
  SA: { lat: 24.71, lon: 46.67, label: "Saudi Arabia" },
  SD: { lat: 15.5, lon: 32.56, label: "Sudan" },
  SE: { lat: 59.33, lon: 18.07, label: "Sweden" },
  SG: { lat: 1.29, lon: 103.85, label: "Singapore" },
  SO: { lat: 2.04, lon: 45.34, label: "Somalia" },
  SY: { lat: 33.51, lon: 36.29, label: "Syria" },
  TH: { lat: 13.75, lon: 100.5, label: "Thailand" },
  TR: { lat: 39.93, lon: 32.85, label: "Turkey" },
  TW: { lat: 25.03, lon: 121.57, label: "Taiwan" },
  UA: { lat: 50.45, lon: 30.52, label: "Ukraine" },
  US: { lat: 38.89, lon: -77.03, label: "United States" },
  VE: { lat: 10.48, lon: -66.9, label: "Venezuela" },
  VN: { lat: 21.03, lon: 105.85, label: "Vietnam" },
  YE: { lat: 15.35, lon: 44.21, label: "Yemen" },
  ZA: { lat: -25.75, lon: 28.19, label: "South Africa" },
};

const EXTRA_COUNTRY_ALIASES: Record<string, string[]> = {
  AU: ["australia", "canberra"],
  BD: ["bangladesh", "dhaka"],
  CA: ["canada", "ottawa"],
  CL: ["chile", "santiago"],
  FI: ["finland", "helsinki"],
  GB: ["united kingdom", "britain", "london", "england"],
  ID: ["indonesia", "jakarta"],
  IQ: ["iraq", "baghdad"],
  KE: ["kenya", "nairobi"],
  MY: ["malaysia", "kuala lumpur"],
  NL: ["netherlands", "amsterdam", "rotterdam", "dutch"],
  NO: ["norway", "oslo"],
  PE: ["peru", "lima"],
  PH: ["philippines", "manila"],
  PL: ["poland", "warsaw"],
  QA: ["qatar", "doha"],
  SE: ["sweden", "stockholm"],
  SG: ["singapore"],
  TH: ["thailand", "bangkok"],
  VN: ["vietnam", "hanoi"],
  ZA: ["south africa", "johannesburg", "pretoria"],
};

const COMPANY_NODE_COORDS: Record<string, GeoPoint> = {
  TSMC: { lat: 25.04, lon: 121.56, label: "TSMC" },
  "Samsung Foundry": { lat: 37.57, lon: 126.98, label: "Samsung Foundry" },
  "Intel Fabs": { lat: 33.45, lon: -111.94, label: "Intel Fabs" },
  ASML: { lat: 52.31, lon: 4.95, label: "ASML" },
  "Saudi Aramco": { lat: 26.43, lon: 50.1, label: "Saudi Aramco" },
  Gazprom: { lat: 55.75, lon: 37.62, label: "Gazprom" },
  ExxonMobil: { lat: 29.76, lon: -95.37, label: "ExxonMobil" },
  ADNOC: { lat: 24.47, lon: 54.37, label: "ADNOC" },
  Rosneft: { lat: 55.75, lon: 37.62, label: "Rosneft" },
  Maersk: { lat: 55.68, lon: 12.57, label: "Maersk" },
  MSC: { lat: 46.2, lon: 6.15, label: "MSC" },
  "CMA CGM": { lat: 43.3, lon: 5.37, label: "CMA CGM" },
  "COSCO Shipping": { lat: 31.23, lon: 121.47, label: "COSCO Shipping" },
  Cargill: { lat: 44.98, lon: -93.26, label: "Cargill" },
  ADM: { lat: 41.88, lon: -87.63, label: "ADM" },
  Bunge: { lat: 38.63, lon: -90.2, label: "Bunge" },
  "Yara International": { lat: 59.91, lon: 10.75, label: "Yara International" },
  CATL: { lat: 26.66, lon: 119.55, label: "CATL" },
  BYD: { lat: 22.54, lon: 114.06, label: "BYD" },
  "Rio Tinto": { lat: -31.95, lon: 115.86, label: "Rio Tinto" },
  BHP: { lat: -37.81, lon: 144.96, label: "BHP" },
  Vale: { lat: -22.9, lon: -43.2, label: "Vale" },
  Glencore: { lat: 47.17, lon: 8.52, label: "Glencore" },
};

const ABSTRACT_NODE_COORDS: Record<string, GeoPoint> = {
  "Crude Oil": { lat: 25.2, lon: 51.53, label: "Crude Oil" },
  LPG: { lat: 24.47, lon: 54.37, label: "LPG" },
  "Natural Gas": { lat: 25.29, lon: 51.53, label: "Natural Gas" },
  LNG: { lat: 25.29, lon: 51.53, label: "LNG" },
  Coal: { lat: 39.9, lon: 116.4, label: "Coal" },
  Wheat: { lat: 50.45, lon: 30.52, label: "Wheat" },
  Corn: { lat: 41.88, lon: -87.63, label: "Corn" },
  Rice: { lat: 13.75, lon: 100.5, label: "Rice" },
  Soybeans: { lat: 41.88, lon: -87.63, label: "Soybeans" },
  "Palm Oil": { lat: 3.14, lon: 101.69, label: "Palm Oil" },
  Sugar: { lat: -15.79, lon: -47.88, label: "Sugar" },
  Coffee: { lat: -22.9, lon: -43.2, label: "Coffee" },
  Semiconductors: { lat: 25.03, lon: 121.57, label: "Semiconductors" },
  "Rare Earth Minerals": { lat: 40.84, lon: 111.75, label: "Rare Earth Minerals" },
  Lithium: { lat: -24.78, lon: -65.41, label: "Lithium" },
  Cobalt: { lat: -11.66, lon: 27.48, label: "Cobalt" },
  Copper: { lat: -33.45, lon: -70.67, label: "Copper" },
  "Iron Ore": { lat: -20.74, lon: 116.85, label: "Iron Ore" },
  Aluminum: { lat: 39.9, lon: 116.4, label: "Aluminum" },
  Nickel: { lat: -6.21, lon: 106.85, label: "Nickel" },
  Gold: { lat: 51.5, lon: -0.12, label: "Gold" },
  Platinum: { lat: -25.75, lon: 28.19, label: "Platinum" },
  Fertilizers: { lat: 55.76, lon: 37.62, label: "Fertilizers" },
  Potash: { lat: 53.9, lon: 27.56, label: "Potash" },
  Uranium: { lat: 51.17, lon: 71.43, label: "Uranium" },
  "Energy Supply Chain": { lat: 26.5, lon: 56.5, label: "Energy Supply Chain" },
  "Food Supply Chain": { lat: 41.88, lon: -87.63, label: "Food Supply Chain" },
  "Semiconductor Supply Chain": { lat: 25.03, lon: 121.57, label: "Semiconductor Supply Chain" },
  "Global Shipping": { lat: 1.29, lon: 103.85, label: "Global Shipping" },
  "Automotive Industry": { lat: 35.68, lon: 139.76, label: "Automotive Industry" },
  "Aerospace Industry": { lat: 47.45, lon: -122.31, label: "Aerospace Industry" },
  "Pharmaceutical Industry": { lat: 47.56, lon: 7.59, label: "Pharmaceutical Industry" },
  "Mining Industry": { lat: -25.75, lon: 28.19, label: "Mining Industry" },
  "Agriculture Sector": { lat: 41.88, lon: -87.63, label: "Agriculture Sector" },
  "Defense Industry": { lat: 38.89, lon: -77.03, label: "Defense Industry" },
  "Consumer Electronics": { lat: 22.54, lon: 114.06, label: "Consumer Electronics" },
  "Industrial Manufacturing": { lat: 31.23, lon: 121.47, label: "Industrial Manufacturing" },
  "Financial Markets": { lat: 40.71, lon: -74.0, label: "Financial Markets" },
  "Global Trade": { lat: 1.29, lon: 103.85, label: "Global Trade" },
  "Renewable Energy": { lat: 52.52, lon: 13.4, label: "Renewable Energy" },
  "Oil Prices": { lat: 51.5, lon: -0.12, label: "Oil Prices" },
  "Gas Prices": { lat: 52.37, lon: 4.9, label: "Gas Prices" },
  "Food Price Index": { lat: 41.9, lon: 12.49, label: "Food Price Index" },
  "Semiconductor Index": { lat: 25.03, lon: 121.57, label: "Semiconductor Index" },
  "Shipping Rates (BDI)": { lat: 51.5, lon: -0.12, label: "Shipping Rates" },
  "US Dollar Index": { lat: 40.71, lon: -74.0, label: "US Dollar Index" },
  "Global Inflation": { lat: 38.89, lon: -77.03, label: "Global Inflation" },
};

const MANUAL_LOCATION_ENTRIES: GeoEntry[] = [
  { keywords: ["black sea"], lat: 43.3, lon: 34.4, label: "Black Sea" },
  { keywords: ["persian gulf", "gulf of oman"], lat: 25.8, lon: 54.2, label: "Persian Gulf" },
  { keywords: ["south china sea"], lat: 14.6, lon: 114.2, label: "South China Sea" },
  { keywords: ["east china sea"], lat: 28.5, lon: 126.3, label: "East China Sea" },
  { keywords: ["red sea"], lat: 20.4, lon: 38.6, label: "Red Sea" },
  { keywords: ["gulf of aden"], lat: 12.0, lon: 48.0, label: "Gulf of Aden" },
  { keywords: ["sahel"], lat: 15.4, lon: 1.5, label: "Sahel" },
  { keywords: ["kashmir"], lat: 34.15, lon: 74.79, label: "Kashmir" },
  { keywords: ["eastern mediterranean", "east mediterranean"], lat: 33.0, lon: 32.0, label: "Eastern Mediterranean" },
];

const SPECIAL_LOCATION_ENTRIES: GeoEntry[] = [
  ...MANUAL_LOCATION_ENTRIES,
  ...STRATEGIC_WATERWAYS.map((waterway) => ({
    keywords: [waterway.name, waterway.id.replace(/_/g, " ")],
    lat: waterway.lat,
    lon: waterway.lon,
    label: waterway.name,
  })),
  ...CONFLICT_ZONES.filter((zone) => !zone.isScenario).map((zone) => ({
    keywords: [zone.name, zone.location || "", zone.id.replace(/_/g, " ")].filter(Boolean),
    lat: zone.center[1],
    lon: zone.center[0],
    label: zone.name,
  })),
  ...PORTS.map((port) => ({
    keywords: [port.name, port.id.replace(/_/g, " ")],
    lat: port.lat,
    lon: port.lon,
    label: port.name,
  })),
  ...INTEL_HOTSPOTS.map((hotspot) => ({
    keywords: [hotspot.name, hotspot.location || "", hotspot.subtext].filter(Boolean),
    lat: hotspot.lat,
    lon: hotspot.lon,
    label: hotspot.name,
  })),
  ...MILITARY_BASES.map((base) => ({
    keywords: [base.name, base.id.replace(/_/g, " ")],
    lat: base.lat,
    lon: base.lon,
    label: base.name,
  })),
].sort((a, b) => longestKeyword(b.keywords) - longestKeyword(a.keywords));

const COUNTRY_ENTRIES: Array<{ code: string; keywords: string[]; geo: GeoPoint }> = [
  ...Object.values(COUNTRY_RISK)
    .filter((config) => COUNTRY_COORDS[config.code])
    .map((config) => ({
      code: config.code,
      keywords: Array.from(new Set([config.name, ...config.keywords])),
      geo: COUNTRY_COORDS[config.code],
    })),
  ...Object.entries(EXTRA_COUNTRY_ALIASES)
    .filter(([code]) => COUNTRY_COORDS[code])
    .map(([code, keywords]) => ({
      code,
      keywords,
      geo: COUNTRY_COORDS[code],
    })),
];

const SEVERITY_SCORE: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const CATEGORY_PRIORITY: Record<string, number> = {
  conflict: 6,
  maritime: 5,
  energy: 5,
  defense: 5,
  political: 4,
  cyber: 4,
  world: 4,
  finance: 3,
  economic: 3,
  climate: 2,
  health: 2,
  default: 1,
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function longestKeyword(keywords: string[]): number {
  return keywords.reduce((max, keyword) => Math.max(max, normalizeText(keyword).length), 0);
}

function matchesKeyword(text: string, keyword: string): boolean {
  const normalizedKeyword = normalizeText(keyword);
  if (!text || !normalizedKeyword) return false;
  const pattern = new RegExp(`(?:^|\\b)${escapeRegExp(normalizedKeyword).replace(/ /g, "\\s+")}(?:\\b|$)`);
  return pattern.test(text);
}

function stripHtml(value: string | undefined): string {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function severityRank(severity: string | undefined): number {
  return SEVERITY_SCORE[(severity || "low").toLowerCase()] || 0;
}

function categoryRank(category: string | undefined): number {
  return CATEGORY_PRIORITY[(category || "default").toLowerCase()] || CATEGORY_PRIORITY.default;
}

function timestampRank(timestamp: string | undefined): number {
  const parsed = Date.parse(timestamp || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function coerceSeverity(value: string | undefined, title = "", category = ""): Alert["severity"] {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "critical" || normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }

  const haystack = normalizeText(`${title} ${category}`);
  const criticalKeywords = [
    "under attack",
    "attack",
    "missile",
    "airstrike",
    "strike",
    "drone",
    "explosion",
    "invasion",
    "troops",
    "war",
    "blockade",
    "ship hit",
    "hijack",
    "killed",
    "dead",
  ];
  const highKeywords = [
    "threat",
    "warning",
    "sanction",
    "tariff",
    "pipeline",
    "oil",
    "gas",
    "shipping",
    "naval",
    "cyber",
    "hack",
    "protest",
    "unrest",
    "outage",
    "earthquake",
    "wildfire",
    "fire",
  ];

  if (criticalKeywords.some((keyword) => matchesKeyword(haystack, keyword))) return "critical";
  if (highKeywords.some((keyword) => matchesKeyword(haystack, keyword))) return "high";
  if (category === "conflict" || category === "maritime" || category === "energy") return "high";
  return "medium";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hostOf(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sameSourceHost(a: string | undefined, b: string | undefined): boolean {
  const hostA = hostOf(a);
  const hostB = hostOf(b);
  return !!hostA && !!hostB && hostA === hostB;
}

function sourceDirectory(source: string | undefined): { officialLabel: string; officialUrl: string } | null {
  const normalized = String(source || "").toLowerCase();

  const entries = [
    { match: ["acled"], officialLabel: "ACLED", officialUrl: "https://acleddata.com/" },
    { match: ["nasa firms", "firms"], officialLabel: "NASA FIRMS", officialUrl: "https://firms.modaps.eosdis.nasa.gov/" },
    { match: ["finnhub"], officialLabel: "Finnhub", officialUrl: "https://finnhub.io/" },
    { match: ["fred"], officialLabel: "FRED", officialUrl: "https://fred.stlouisfed.org/" },
    { match: ["eia"], officialLabel: "EIA", officialUrl: "https://www.eia.gov/" },
    { match: ["opensky"], officialLabel: "OpenSky Network", officialUrl: "https://opensky-network.org/" },
    { match: ["corridor risk"], officialLabel: "Corridor Risk", officialUrl: "https://corridorrisk.io/" },
    { match: ["reuters"], officialLabel: "Reuters", officialUrl: "https://www.reuters.com/" },
    { match: ["associated press", "ap top news", "ap "], officialLabel: "Associated Press", officialUrl: "https://apnews.com/" },
    { match: ["bbc"], officialLabel: "BBC News", officialUrl: "https://www.bbc.com/news" },
    { match: ["al jazeera"], officialLabel: "Al Jazeera", officialUrl: "https://www.aljazeera.com/" },
    { match: ["france24"], officialLabel: "France 24", officialUrl: "https://www.france24.com/" },
    { match: ["dw news", "dw "], officialLabel: "DW", officialUrl: "https://www.dw.com/" },
    { match: ["npr"], officialLabel: "NPR", officialUrl: "https://www.npr.org/" },
    { match: ["defense one"], officialLabel: "Defense One", officialUrl: "https://www.defenseone.com/" },
    { match: ["war zone"], officialLabel: "The War Zone", officialUrl: "https://www.twz.com/" },
    { match: ["military times"], officialLabel: "Military Times", officialUrl: "https://www.militarytimes.com/" },
    { match: ["janes"], officialLabel: "Janes", officialUrl: "https://www.janes.com/" },
    { match: ["cnbc"], officialLabel: "CNBC", officialUrl: "https://www.cnbc.com/" },
    { match: ["bloomberg"], officialLabel: "Bloomberg", officialUrl: "https://www.bloomberg.com/" },
    { match: ["oilprice"], officialLabel: "OilPrice.com", officialUrl: "https://oilprice.com/" },
    { match: ["maritime executive"], officialLabel: "The Maritime Executive", officialUrl: "https://maritime-executive.com/" },
    { match: ["gcaptain"], officialLabel: "gCaptain", officialUrl: "https://gcaptain.com/" },
    { match: ["ars technica"], officialLabel: "Ars Technica", officialUrl: "https://arstechnica.com/" },
    { match: ["threat post"], officialLabel: "Threatpost", officialUrl: "https://threatpost.com/" },
    { match: ["the record"], officialLabel: "The Record", officialUrl: "https://therecord.media/" },
    { match: ["climate home"], officialLabel: "Climate Home News", officialUrl: "https://www.climatechangenews.com/" },
    { match: ["carbon brief"], officialLabel: "Carbon Brief", officialUrl: "https://www.carbonbrief.org/" },
  ];

  const match = entries.find((entry) => entry.match.some((token) => normalized.includes(token)));
  return match ? { officialLabel: match.officialLabel, officialUrl: match.officialUrl } : null;
}

export function getAlertSourceDetails(source: string | undefined, link: string | undefined): NonNullable<Alert["source_details"]> {
  const official = sourceDirectory(source);
  const articleUrl = link || undefined;
  const articleLabel = articleUrl
    ? official && sameSourceHost(articleUrl, official.officialUrl)
      ? `Open ${official.officialLabel} report`
      : "Open linked report"
    : undefined;

  return {
    officialLabel: official?.officialLabel || (source || "Original source"),
    officialUrl: official?.officialUrl,
    articleLabel,
    articleUrl,
  };
}

function buildConfidenceModel(input: {
  source: string | undefined;
  timestamp?: string;
  link?: string;
  title?: string;
  description?: string;
  category?: string;
  geoPrecision?: "exact" | "resolved" | "unknown";
}): { score: number; details: NonNullable<Alert["confidence_details"]> } {
  const credibility = getSourceCredibility(input.source);
  const normalizedSource = String(input.source || "").toLowerCase();
  const ageMs = input.timestamp ? Date.now() - Date.parse(input.timestamp) : Number.NaN;
  const ageHours = Number.isFinite(ageMs) ? Math.max(0, ageMs / 3_600_000) : null;
  const contextLength = `${input.title || ""} ${input.description || ""}`.trim().length;
  const factors: string[] = [];

  let score = 0.32 + credibility.score * 0.38;
  factors.push(`${credibility.label} source profile contributes ${Math.round(credibility.score * 100)}% baseline reliability.`);

  if (input.link) {
    const directLinkBoost = normalizedSource.includes("rss") ? 0.05 : 0.08;
    score += directLinkBoost;
    factors.push("A direct report link is attached for verification.");
  } else {
    score -= 0.04;
    factors.push("No direct report link is attached, so verification depends on the source identity alone.");
  }

  if (input.geoPrecision === "exact") {
    score += 0.07;
    factors.push("Exact coordinates were supplied by the source feed.");
  } else if (input.geoPrecision === "resolved") {
    score += 0.03;
    factors.push("Location was resolved from headline text, so geography is useful but less exact.");
  } else {
    score -= 0.02;
    factors.push("Location is still approximate.");
  }

  if (ageHours !== null) {
    if (ageHours <= 6) {
      score += 0.07;
      factors.push("Timestamp is very recent.");
    } else if (ageHours <= 24) {
      score += 0.04;
      factors.push("Timestamp is within the last day.");
    } else if (ageHours <= 24 * 7) {
      score += 0.01;
      factors.push("Timestamp is recent enough for live monitoring.");
    } else {
      score -= 0.03;
      factors.push("Timestamp is aging out of the live window.");
    }
  } else {
    score -= 0.01;
    factors.push("Timestamp quality is unclear.");
  }

  if (contextLength >= 160) {
    score += 0.04;
    factors.push("The alert contains rich contextual detail.");
  } else if (contextLength >= 80) {
    score += 0.02;
    factors.push("The alert contains enough context to support quick validation.");
  } else if (contextLength <= 45) {
    score -= 0.02;
    factors.push("The alert is headline-thin, so corroboration matters more.");
  }

  if (normalizedSource.includes("rss")) {
    score -= 0.05;
    factors.push("The item arrived through an aggregation layer rather than a direct primary API.");
  }

  if (input.category === "finance" || input.category === "economic" || input.category === "energy") {
    score += 0.01;
    factors.push("Category is backed by a structured monitoring domain in the platform.");
  }

  const finalScore = clamp(score, 0.48, 0.97);
  return {
    score: finalScore,
    details: {
      summary: "Confidence blends source reputation, freshness, direct-link availability, geo precision, and how much concrete context the alert carries.",
      factors: factors.slice(0, 5),
    },
  };
}

export function explainAlertConfidence(alert: Alert): NonNullable<Alert["confidence_details"]> {
  if (alert.confidence_details) return alert.confidence_details;

  const geo = alert.location?.geo;
  const geoPrecision =
    Number.isFinite(Number(geo?.lat)) && Number.isFinite(Number(geo?.lon))
      ? "resolved"
      : "unknown";

  return buildConfidenceModel({
    source: alert.source,
    timestamp: alert.timestamp,
    link: alert.link,
    title: alert.snapshot,
    description: alert.drivers?.join(" "),
    category: alert.category,
    geoPrecision,
  }).details;
}

export function getSourceCredibility(source: string | undefined): SourceCredibility {
  const normalized = String(source || "").toLowerCase();

  if (normalized.includes("acled")) {
    return {
      label: "High",
      score: 0.93,
      note: "Structured conflict-event dataset with geocoded incident records.",
      color: "#ff6b35",
    };
  }
  if (normalized.includes("nasa firms") || normalized.includes("firms")) {
    return {
      label: "High",
      score: 0.95,
      note: "Satellite thermal detections from NASA FIRMS.",
      color: "#ff6b35",
    };
  }
  if (normalized.includes("finnhub") || normalized.includes("fred") || normalized.includes("eia") || normalized.includes("opensky")) {
    return {
      label: "High",
      score: 0.9,
      note: "Structured market, economic, energy, or tracking data feed.",
      color: "#ffaa00",
    };
  }
  if (
    normalized.includes("reuters") ||
    normalized.includes("associated press") ||
    normalized.includes("ap ") ||
    normalized.includes("bbc") ||
    normalized.includes("al jazeera") ||
    normalized.includes("france24") ||
    normalized.includes("dw") ||
    normalized.includes("npr")
  ) {
    return {
      label: "Verified Media",
      score: 0.82,
      note: "Editorial reporting from a major newsroom or wire service.",
      color: "#67d4ff",
    };
  }
  if (normalized.includes("corridor risk")) {
    return {
      label: "Specialized",
      score: 0.76,
      note: "Specialized corridor risk scoring feed. Useful, but not a primary newsroom.",
      color: "#44aaff",
    };
  }
  if (normalized.includes("rss")) {
    return {
      label: "Aggregated",
      score: 0.68,
      note: "Headline passed through an RSS aggregation layer. Verify with the linked publisher.",
      color: "#8aa2b6",
    };
  }

  return {
    label: "Monitor",
    score: 0.7,
    note: "Useful live signal, but best confirmed against the linked primary source.",
    color: "#8aa2b6",
  };
}

function formatTimestamp(timestamp: string | undefined): string {
  const parsed = Date.parse(timestamp || "");
  if (!Number.isFinite(parsed)) return "Live";
  return new Date(parsed).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildForecast(category: string, location: string, title: string): string {
  if (category === "conflict") {
    return `Watch for follow-on strikes, mobilization, and regional spillover around ${location || "the affected area"} over the next 24-72 hours.`;
  }
  if (category === "maritime") {
    return `Watch for rerouting, insurance repricing, and port congestion if disruption around ${location || "the corridor"} persists.`;
  }
  if (category === "energy") {
    return `Watch for supply interruptions, terminal status updates, and fast moves in crude or gas pricing tied to ${location || "this event"}.`;
  }
  if (category === "economic" || category === "finance") {
    return `Watch for second-order moves across futures, FX, and rates if ${title || "this headline"} broadens into policy or supply shocks.`;
  }
  if (category === "cyber") {
    return `Watch for follow-on intrusions, infrastructure outages, and official advisories tied to ${location || "the affected network"}.`;
  }
  return `Watch whether ${title || "this headline"} develops into wider security, policy, or supply-chain disruption over the next 24-48 hours.`;
}

function buildActions(category: string, location: string): string[] {
  if (category === "conflict") {
    return [
      `Monitor follow-on military activity around ${location || "the affected area"}`,
      "Re-check shipping, aviation, and travel exposure",
      "Track official statements and infrastructure damage reports",
    ];
  }
  if (category === "maritime") {
    return [
      `Monitor vessel rerouting and port advisories around ${location || "the corridor"}`,
      "Review tanker, container, and insurance exposure",
      "Track any navy or coast guard escalation statements",
    ];
  }
  if (category === "energy") {
    return [
      "Track oil and gas price reaction across front-month contracts",
      "Monitor terminal, pipeline, and refinery status updates",
      "Refresh exposure assumptions for energy-linked positions",
    ];
  }
  if (category === "economic" || category === "finance") {
    return [
      "Monitor follow-through across equities, FX, and rates",
      "Watch for policy comments or official filings",
      "Stress-check positions most exposed to headline repricing",
    ];
  }
  return [
    "Track confirmation from multiple live sources",
    "Monitor whether the event broadens geographically",
    "Escalate if infrastructure or transport disruption appears",
  ];
}

function buildDrivers(source: string, category: string, location: string, timestamp: string, description?: string): string[] {
  const drivers = [
    `${source || "Live feed"} headline`,
    location ? `Location: ${location}` : "",
    category ? `Category: ${category}` : "",
    timestamp ? `Updated: ${formatTimestamp(timestamp)}` : "",
  ].filter(Boolean);

  const cleanedDescription = stripHtml(description);
  if (cleanedDescription) {
    drivers.push(cleanedDescription.slice(0, 220));
  }
  return drivers;
}

function toAlertId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return `live_${Math.abs(hash).toString(36)}`;
}

function simplifyPlaceName(value: string): string {
  return normalizeText(value)
    .replace(/\bport\b/g, " ")
    .replace(/\bof\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clampLatitude(lat: number): number {
  return Math.max(-70, Math.min(70, lat));
}

function wrapLongitude(lon: number): number {
  let value = lon;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

export function seededCoordinates(seed: string, anchor?: GeoPoint | null, spread = 18): GeoPoint {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  if (anchor) {
    const latOffset = (((Math.abs(hash) % 1000) / 1000) - 0.5) * spread;
    const lonOffset = (((Math.abs(hash * 17) % 1000) / 1000) - 0.5) * spread * 1.3;
    return {
      lat: clampLatitude(anchor.lat + latOffset),
      lon: wrapLongitude(anchor.lon + lonOffset),
    };
  }

  return {
    lat: ((Math.abs(hash) % 14000) / 100) - 70,
    lon: ((Math.abs(hash * 97) % 36000) / 100) - 180,
  };
}

export function resolveGeoFromText(text: string): GeoPoint | null {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  for (const entry of SPECIAL_LOCATION_ENTRIES) {
    if (entry.keywords.some((keyword) => matchesKeyword(normalized, keyword))) {
      return { lat: entry.lat, lon: entry.lon, label: entry.label };
    }
  }

  for (const entry of COUNTRY_ENTRIES) {
    if (entry.keywords.some((keyword) => matchesKeyword(normalized, keyword))) {
      return entry.geo;
    }
  }

  return null;
}

export function resolveAlertGeo(alert: Partial<Alert> | null | undefined): GeoPoint | null {
  const lat = Number(alert?.location?.geo?.lat);
  const lon = Number(alert?.location?.geo?.lon);
  if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    return { lat, lon };
  }

  return resolveGeoFromText([
    alert?.snapshot,
    alert?.forecast,
    alert?.source,
    alert?.category,
    ...(alert?.drivers || []),
  ].filter(Boolean).join(" "));
}

function resolvePortGeo(nodeName: string): GeoPoint | null {
  const simplifiedNode = simplifyPlaceName(nodeName);
  const match = PORTS.find((port) => simplifyPlaceName(port.name) === simplifiedNode || simplifyPlaceName(port.id.replace(/_/g, " ")) === simplifiedNode);
  if (!match) return null;
  return { lat: match.lat, lon: match.lon, label: match.name };
}

export function resolveCascadeNodeGeo(nodeName: string, nodeType: string | undefined, anchor?: GeoPoint | null): GeoPoint {
  const direct = resolveGeoFromText(nodeName);
  if (direct) return direct;

  if (nodeType === "port") {
    const portGeo = resolvePortGeo(nodeName);
    if (portGeo) return portGeo;
  }

  if (COMPANY_NODE_COORDS[nodeName]) return COMPANY_NODE_COORDS[nodeName];
  if (ABSTRACT_NODE_COORDS[nodeName]) return ABSTRACT_NODE_COORDS[nodeName];

  const spread = nodeType === "index" || nodeType === "sector" ? 14 : 10;
  return seededCoordinates(`${nodeType || "node"}:${nodeName}`, anchor, spread);
}

function mapLiveEventToAlert(event: LiveEvent): Alert {
  const severity = coerceSeverity(event.severity, event.title, event.category);
  const hasExactGeo = Number.isFinite(Number(event.lat)) && Number.isFinite(Number(event.lon));
  const resolvedGeo =
    hasExactGeo
      ? { lat: Number(event.lat), lon: Number(event.lon) }
      : resolveGeoFromText(`${event.title} ${event.location} ${event.source}`);
  const credibility = getSourceCredibility(event.source);
  const confidenceModel = buildConfidenceModel({
    source: event.source,
    timestamp: event.timestamp,
    link: event.link,
    title: event.title,
    description: event.location,
    category: event.category,
    geoPrecision: hasExactGeo ? "exact" : resolvedGeo ? "resolved" : "unknown",
  });
  const sourceDetails = getAlertSourceDetails(event.source, event.link);

  return {
    alert_id: event.id || toAlertId(event.title),
    event_id: event.id,
    snapshot: event.title,
    severity,
    confidence: confidenceModel.score,
    confidence_details: confidenceModel.details,
    drivers: buildDrivers(event.source, event.category, event.location, event.timestamp),
    contradictions: [],
    forecast: buildForecast(event.category, event.location, event.title),
    recommended_actions: buildActions(event.category, event.location),
    location: resolvedGeo ? { geo: { lat: resolvedGeo.lat, lon: resolvedGeo.lon } } : undefined,
    source: event.source,
    source_details: sourceDetails,
    category: event.category,
    link: event.link,
    timestamp: event.timestamp,
    credibility,
  };
}

function mapLiveNewsToAlert(item: LiveNewsItem): Alert {
  const category = item.category || "world";
  const severity = coerceSeverity(undefined, item.title, category);
  const resolvedGeo = resolveGeoFromText(`${item.title} ${item.description} ${item.source}`);
  const credibility = getSourceCredibility(item.source);
  const confidenceModel = buildConfidenceModel({
    source: item.source,
    timestamp: item.pubDate,
    link: item.link,
    title: item.title,
    description: item.description,
    category,
    geoPrecision: resolvedGeo ? "resolved" : "unknown",
  });
  const sourceDetails = getAlertSourceDetails(item.source, item.link);

  return {
    alert_id: toAlertId(`${item.source}:${item.title}`),
    snapshot: item.title,
    severity,
    confidence: confidenceModel.score,
    confidence_details: confidenceModel.details,
    drivers: buildDrivers(item.source, category, resolvedGeo?.label || "", item.pubDate, item.description),
    contradictions: [],
    forecast: buildForecast(category, resolvedGeo?.label || "", item.title),
    recommended_actions: buildActions(category, resolvedGeo?.label || ""),
    location: resolvedGeo ? { geo: { lat: resolvedGeo.lat, lon: resolvedGeo.lon } } : undefined,
    source: item.source,
    source_details: sourceDetails,
    category,
    link: item.link,
    timestamp: item.pubDate,
    credibility,
  };
}

function dedupeAlerts(alerts: Alert[]): Alert[] {
  const seen = new Map<string, Alert>();

  for (const alert of alerts) {
    const key = normalizeText(alert.snapshot || alert.alert_id || "");
    if (!key) continue;

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, alert);
      continue;
    }

    const candidateScore =
      timestampRank(alert.timestamp) / 1_000_000_000_000 +
      severityRank(alert.severity) * 0.1 +
      categoryRank(alert.category) * 0.01;
    const existingScore =
      timestampRank(existing.timestamp) / 1_000_000_000_000 +
      severityRank(existing.severity) * 0.1 +
      categoryRank(existing.category) * 0.01;

    if (candidateScore > existingScore) {
      seen.set(key, alert);
    }
  }

  return Array.from(seen.values());
}

export function buildLiveHeadlineAlerts(events: LiveEvent[] | null, news: LiveNewsItem[] | null): Alert[] {
  const eventAlerts = (events || [])
    .filter((event) => !/policy_change detected/i.test(event.title))
    .map(mapLiveEventToAlert);
  const newsAlerts = (news || [])
    .filter((item) => item.title && !/policy_change detected/i.test(item.title))
    .map(mapLiveNewsToAlert);

  return dedupeAlerts([...eventAlerts, ...newsAlerts])
    .sort((a, b) => {
      const timeDelta = timestampRank(b.timestamp) - timestampRank(a.timestamp);
      if (timeDelta !== 0) return timeDelta;

      const severityDelta = severityRank(b.severity) - severityRank(a.severity);
      if (severityDelta !== 0) return severityDelta;

      const categoryDelta = categoryRank(b.category) - categoryRank(a.category);
      if (categoryDelta !== 0) return categoryDelta;

      return (b.credibility?.score || 0) - (a.credibility?.score || 0);
    })
    .slice(0, 14);
}

export function formatRelativeAlertTime(timestamp: string | undefined): string {
  const parsed = Date.parse(timestamp || "");
  if (!Number.isFinite(parsed)) return "Live";

  const diffMs = Date.now() - parsed;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
