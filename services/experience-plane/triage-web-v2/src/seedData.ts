/**
 * seedData.ts — Rich fallback intelligence data
 *
 * Provides realistic geo-tagged alerts, events, briefs, and country intelligence
 * when the backend API is unreachable.
 */

import type { Alert } from "./types";

/* ─── Seed Alerts ─────────────────────────────────────────────────────── */

export const SEED_ALERTS: Alert[] = [
  {
    alert_id: "alr_evt_blacksea_001",
    event_id: "evt_blacksea_001",
    severity: "critical",
    confidence: 0.91,
    snapshot: "Significant naval buildup detected in Black Sea — 14 warships repositioned within 72h window. AIS signals indicate potential blockade formation near key shipping corridor.",
    drivers: [
      "AIS satellite tracking: 14+ military vessels redeployed",
      "OSINT intercepts confirm heightened comms traffic",
      "Historical pattern match: 87% similarity to 2023 blockade scenario",
    ],
    contradictions: [
      "Diplomatic sources report ongoing de-escalation talks",
      "Commercial shipping lanes remain technically open",
    ],
    forecast: "High probability of partial maritime corridor restriction within 48-72 hours. Expect insurance premium spikes on Black Sea routes.",
    recommended_actions: [
      "Issue watchlist update for Black Sea maritime assets",
      "Activate shipping contingency routes via Mediterranean",
      "Brief stakeholders on insurance premium exposure",
    ],
    location: { geo: { lat: 43.5, lon: 34.0 } },
  },
  {
    alert_id: "alr_evt_amazon_002",
    event_id: "evt_amazon_002",
    severity: "high",
    confidence: 0.86,
    snapshot: "NASA FIRMS detects 312 active fire hotspots across Amazon Basin — 47% increase week-over-week. Carbon emission estimates exceed seasonal baseline by 3.2x.",
    drivers: [
      "NASA FIRMS: 312 validated thermal anomalies",
      "VIIRS satellite: smoke plume extends 1,400km northeast",
      "INPE deforestation alerts up 67% MoM",
    ],
    contradictions: [
      "Regional rainfall forecast shows precipitation increase in 5 days",
    ],
    forecast: "Fire activity likely to intensify before seasonal rains. Expect commodity impact on Brazilian soy and cattle futures.",
    recommended_actions: [
      "Monitor CBOT soy futures for supply disruption pricing",
      "Track carbon credit market response",
      "Update ESG risk scoring for affected supply chains",
    ],
    location: { geo: { lat: -3.4, lon: -60.0 } },
  },
  {
    alert_id: "alr_evt_baltic_003",
    event_id: "evt_baltic_003",
    severity: "critical",
    confidence: 0.88,
    snapshot: "Unusual military flight patterns detected over Baltic region — 23 sorties in 6h exceeding NATO baseline by 4x. Electronic warfare signatures detected on multiple frequencies.",
    drivers: [
      "OpenSky Network: 23 military transponder codes in 6h",
      "ADS-B gap analysis: 7 aircraft operating dark for 45+ min",
      "Frequency analysis: EW jamming on 3 bands confirmed",
    ],
    contradictions: [
      "NATO spokesperson cites planned exercise BALTOPS",
    ],
    forecast: "Pattern inconsistent with published exercise parameters. Recommend elevated monitoring through next 96 hours.",
    recommended_actions: [
      "Correlate with ground force movement data",
      "Request satellite imagery of identified staging areas",
      "Brief defense intelligence liaison on pattern anomaly",
    ],
    location: { geo: { lat: 56.9, lon: 24.1 } },
  },
  {
    alert_id: "alr_evt_hormuz_004",
    event_id: "evt_hormuz_004",
    severity: "high",
    confidence: 0.82,
    snapshot: "Strait of Hormuz vessel transit time increased 34% — AIS analysis shows diversionary routing patterns consistent with maritime threat avoidance behavior.",
    drivers: [
      "AIS data: average transit time up from 4.2h to 5.6h",
      "Route deviation index: 2.8x normal",
      "Insurance underwriter queries up 156% in 48h",
    ],
    contradictions: [
      "No official maritime advisory issued by regional authorities",
    ],
    forecast: "Energy supply chain disruption risk elevated. Brent crude likely to see 2-4% upward pressure if transit delays persist beyond 72h.",
    recommended_actions: [
      "Monitor Brent and WTI spreads for dislocation",
      "Activate tanker fleet contingency communications",
      "Update energy sector exposure models",
    ],
    location: { geo: { lat: 26.6, lon: 56.2 } },
  },
  {
    alert_id: "alr_evt_sahel_005",
    event_id: "evt_sahel_005",
    severity: "critical",
    confidence: 0.84,
    snapshot: "ACLED reports 47 conflict events across Sahel corridor in 72h — highest concentration since monitoring began. Infrastructure targeting pattern suggests coordinated campaign.",
    drivers: [
      "ACLED: 47 events, 34 involving armed groups",
      "Pattern analysis: 8 infrastructure targets (power, transport)",
      "GDELT sentiment: regional instability index at 94th percentile",
    ],
    contradictions: [
      "UN peacekeeping force reports no change in operational tempo",
    ],
    forecast: "Expect civilian displacement acceleration and humanitarian corridor disruptions. Regional food security index likely to deteriorate within 2 weeks.",
    recommended_actions: [
      "Activate humanitarian monitoring protocols",
      "Brief supply chain teams on West African logistics exposure",
      "Update travel risk assessments for Sahel countries",
    ],
    location: { geo: { lat: 14.5, lon: 1.5 } },
  },
  {
    alert_id: "alr_evt_treasuries_006",
    event_id: "evt_treasuries_006",
    severity: "medium",
    confidence: 0.77,
    snapshot: "10Y-2Y Treasury yield spread inverted to -42bps — steepest inversion since 2007. Foreign central bank selling detected via TIC data with 3-week lag.",
    drivers: [
      "FRED data: yield curve inversion deepened -12bps WoW",
      "TIC data: $47B net foreign selling in latest reporting period",
      "Futures positioning: record short in 10Y contract",
    ],
    contradictions: [
      "Fed dot plot still signals rate cuts in H2",
      "Corporate bond spreads remain orderly",
    ],
    forecast: "Recession probability model now at 67%. Expect increased hedging activity and flight-to-quality rotation in coming sessions.",
    recommended_actions: [
      "Review fixed income portfolio duration exposure",
      "Stress-test credit portfolio against recession scenarios",
      "Monitor money market fund flows for liquidity signals",
    ],
    location: { geo: { lat: 38.9, lon: -77.0 } },
  },
  {
    alert_id: "alr_evt_scs_007",
    event_id: "evt_scs_007",
    severity: "high",
    confidence: 0.85,
    snapshot: "South China Sea: Anomalous vessel clustering detected — 42 fishing militia vessels identified near contested reef. Pattern matches 2024 grey-zone escalation playbook.",
    drivers: [
      "SAR imagery: 42 vessels in tight formation near Scarborough Shoal",
      "AIS blackout: 67% of identified vessels went dark in last 12h",
      "Historical correlation: 91% match to known militia deployment pattern",
    ],
    contradictions: [
      "Chinese MFA states vessels are conducting normal fishing operations",
    ],
    forecast: "Elevated risk of maritime confrontation incident. Potential for regional ASEAN diplomatic response within 48h if formation persists.",
    recommended_actions: [
      "Increase South China Sea monitoring cadence to 4h intervals",
      "Prepare briefing on ASEAN response scenarios",
      "Alert shipping operations in adjacent trade lanes",
    ],
    location: { geo: { lat: 15.2, lon: 117.8 } },
  },
  {
    alert_id: "alr_evt_cyber_008",
    event_id: "evt_cyber_008",
    severity: "medium",
    confidence: 0.73,
    snapshot: "Coordinated DDoS campaign targeting European financial infrastructure — 340Gbps peak volume across 6 institutions in 3 countries. Attribution indicators point to state-sponsored APT.",
    drivers: [
      "CERT-EU: 6 simultaneous incident reports in 90min window",
      "Traffic analysis: peak 340Gbps, amplification vector identified",
      "TTP analysis: infrastructure overlap with known APT28 C2 network",
    ],
    contradictions: [
      "No data exfiltration detected — may be diversionary",
    ],
    forecast: "Follow-on intrusion attempts probable within 24-48h. Recommend heightened SOC alert posture across financial sector.",
    recommended_actions: [
      "Distribute IOCs to financial sector ISAC",
      "Verify backup communication channels",
      "Review incident response playbook for financial sector disruption",
    ],
    location: { geo: { lat: 50.8, lon: 4.3 } },
  },
  {
    alert_id: "alr_evt_india_energy_009",
    event_id: "evt_india_energy_009",
    severity: "medium",
    confidence: 0.79,
    snapshot: "India power grid demand hits record 243 GW amid heatwave — coal stockpiles at 14 thermal plants below critical 7-day threshold. Renewable intermittency compounding supply gap.",
    drivers: [
      "CEA data: peak demand 243 GW, supply deficit 4.2 GW",
      "Coal inventory: 14 plants below 7-day stock level",
      "IMD forecast: heatwave conditions expected through next 10 days",
    ],
    contradictions: [
      "Government states coal supply pipeline is adequate",
    ],
    forecast: "Rolling brownouts possible in northern states if demand exceeds 250 GW. Industrial output impact estimated at $120M/day.",
    recommended_actions: [
      "Monitor coal import logistics for supply chain disruption",
      "Track industrial output indicators for affected regions",
      "Update energy commodity exposure models for South Asia",
    ],
    location: { geo: { lat: 28.6, lon: 77.2 } },
  },
  {
    alert_id: "alr_evt_econ_010",
    event_id: "evt_econ_010",
    severity: "medium",
    confidence: 0.71,
    snapshot: "EIA reports US strategic petroleum reserve drawdown of 8.2M barrels — exceeding forecast by 3.1M barrels. Commercial crude inventories declined for 5th consecutive week.",
    drivers: [
      "EIA weekly: SPR draw 8.2M bbl vs 5.1M expected",
      "Commercial crude: -4.7M bbl (5th consecutive weekly decline)",
      "Refinery utilization: 93.4% indicates robust demand",
    ],
    contradictions: [
      "Gasoline demand seasonality suggests peak may have passed",
    ],
    forecast: "Crude prices likely to find support. WTI front-month contract may test $82-84 resistance zone within 5 trading sessions.",
    recommended_actions: [
      "Review energy sector portfolio positioning",
      "Monitor OPEC+ production compliance signals",
      "Update transportation cost models for crude scenario",
    ],
    location: { geo: { lat: 29.7, lon: -95.3 } },
  },
];

/* ─── Seed Brief ──────────────────────────────────────────────────────── */

export const SEED_BRIEF = {
  generatedAt: "2026-03-29T08:00:00Z",
  changed: [
    "Black Sea naval buildup reaching critical threshold — blockade formation indicators elevated",
    "Amazon fire season intensifying beyond seasonal norms — 312 active hotspots detected",
    "Baltic military flight activity 4x above NATO exercise baseline — EW signatures confirmed",
    "Strait of Hormuz transit delays signal potential maritime threat escalation",
    "Sahel conflict corridor: highest event concentration on record — coordinated infrastructure targeting",
  ],
  whyItMatters: [
    "Cross-domain signal convergence indicates elevated geopolitical risk across maritime, energy, and security domains simultaneously.",
    "Three of five top alerts involve maritime chokepoints, suggesting systemic supply chain vulnerability window.",
    "Confidence-weighted analysis shows 73% probability of at least one escalation event in next 72 hours.",
  ],
  likelyNext: [
    "Black Sea maritime corridor restrictions probable within 48-72 hours — insurance premium implications",
    "Energy price volatility expected as Hormuz transit delays compound SPR drawdown pressure",
    "Sahel corridor deterioration likely to trigger humanitarian response and logistics disruption",
  ],
  recommendedActions: [
    {
      action: "Prioritize Black Sea and Hormuz maritime alerts for immediate analyst review",
      rationale: "Dual maritime chokepoint stress creates compound supply chain exposure",
      urgency: "high",
    },
    {
      action: "Run cross-domain scenario simulation on energy-geopolitical correlation",
      rationale: "Multiple independent signals suggest correlated energy market stress",
      urgency: "high",
    },
    {
      action: "Update all-hazards situational awareness summary for C-suite distribution",
      rationale: "Signal density exceeds normal parametric threshold by 2.4 standard deviations",
      urgency: "medium",
    },
  ],
  confidence: 0.83,
  uncertainty: {
    score: 0.17,
    factors: [
      "diplomatic-channel-opacity",
      "satellite-revisit-gap",
      "fusion-engine-v1",
    ],
  },
  evidence: [
    { sourceId: "src_ais_maritime", claimId: "clm_blacksea_001" },
    { sourceId: "src_nasa_firms", claimId: "clm_amazon_001" },
    { sourceId: "src_opensky", claimId: "clm_baltic_001" },
    { sourceId: "src_ais_hormuz", claimId: "clm_hormuz_001" },
    { sourceId: "src_acled", claimId: "clm_sahel_001" },
    { sourceId: "src_fred", claimId: "clm_treasury_001" },
  ],
};

/* ─── Country Intelligence Database ──────────────────────────────────── */

interface CountryIntel {
  riskLevel: string;
  summary: string;
  indicators: { label: string; value: string; trend: "up" | "down" | "stable" }[];
  dataSources: string[];
}

export const COUNTRY_INTEL: Record<string, CountryIntel> = {
  US: {
    riskLevel: "medium",
    summary: "Treasury yield curve inversion deepened to -42bps, steepest since 2007. Strategic petroleum reserve drawdown exceeded forecast by 3.1M barrels. Cyber threat activity elevated against financial sector. Federal Reserve policy uncertainty contributing to market volatility.",
    indicators: [
      { label: "Threat Level", value: "MEDIUM", trend: "up" },
      { label: "Active Signals", value: "24", trend: "up" },
      { label: "Confidence", value: "0.77", trend: "stable" },
      { label: "Data Freshness", value: "2m", trend: "stable" },
    ],
    dataSources: ["FRED", "EIA", "Finnhub", "CERT-US", "OpenSky"],
  },
  IN: {
    riskLevel: "medium",
    summary: "Power grid demand at record 243 GW amid severe heatwave conditions. Coal stockpiles critically low at 14 thermal plants. Renewable energy intermittency compounding supply deficit of 4.2 GW. Industrial output at risk in northern states.",
    indicators: [
      { label: "Threat Level", value: "MEDIUM", trend: "up" },
      { label: "Active Signals", value: "18", trend: "up" },
      { label: "Confidence", value: "0.79", trend: "stable" },
      { label: "Data Freshness", value: "5m", trend: "stable" },
    ],
    dataSources: ["CEA Grid Data", "IMD Weather", "Coal India", "ISRO Satellite", "Finnhub"],
  },
  UA: {
    riskLevel: "critical",
    summary: "Black Sea naval buildup detected with 14 warships repositioned. AIS signals indicate potential blockade formation. Ongoing conflict continues to drive regional instability. Critical infrastructure under persistent cyber and kinetic threat.",
    indicators: [
      { label: "Threat Level", value: "CRITICAL", trend: "up" },
      { label: "Active Signals", value: "67", trend: "up" },
      { label: "Confidence", value: "0.91", trend: "up" },
      { label: "Data Freshness", value: "1m", trend: "stable" },
    ],
    dataSources: ["AIS Maritime", "ACLED", "NASA FIRMS", "GDELT", "OpenSky", "Sentinel-2"],
  },
  BR: {
    riskLevel: "high",
    summary: "Amazon Basin fire season intensifying dramatically — 312 active hotspots with 47% WoW increase. Carbon emissions 3.2x above seasonal baseline. Deforestation alerts up 67% month-over-month per INPE. Commodity market impact expected on soy and cattle futures.",
    indicators: [
      { label: "Threat Level", value: "HIGH", trend: "up" },
      { label: "Active Signals", value: "31", trend: "up" },
      { label: "Confidence", value: "0.86", trend: "stable" },
      { label: "Data Freshness", value: "3m", trend: "stable" },
    ],
    dataSources: ["NASA FIRMS", "VIIRS", "INPE", "CBOT Futures", "ESG Monitors"],
  },
  CN: {
    riskLevel: "high",
    summary: "South China Sea grey-zone activity elevated — 42 fishing militia vessels identified near Scarborough Shoal in coordinated formation. 67% of vessels went dark on AIS in last 12 hours. Pattern matches known militia deployment playbook with 91% correlation.",
    indicators: [
      { label: "Threat Level", value: "HIGH", trend: "up" },
      { label: "Active Signals", value: "42", trend: "up" },
      { label: "Confidence", value: "0.85", trend: "stable" },
      { label: "Data Freshness", value: "4m", trend: "stable" },
    ],
    dataSources: ["AIS Maritime", "SAR Imagery", "OpenSky", "GDELT", "ASEAN Monitors"],
  },
  RU: {
    riskLevel: "critical",
    summary: "Multiple indicators of heightened military posture — Baltic flight activity 4x above baseline with electronic warfare signatures confirmed. Black Sea naval movements contributing to regional threat assessment. Energy export policy changes under monitoring.",
    indicators: [
      { label: "Threat Level", value: "CRITICAL", trend: "up" },
      { label: "Active Signals", value: "53", trend: "up" },
      { label: "Confidence", value: "0.88", trend: "up" },
      { label: "Data Freshness", value: "2m", trend: "stable" },
    ],
    dataSources: ["OpenSky", "AIS Maritime", "ACLED", "GDELT", "Energy Markets", "Sentinel-1"],
  },
  DE: {
    riskLevel: "medium",
    summary: "European financial infrastructure under DDoS campaign — 340Gbps peak targeting institutions in Germany and neighboring countries. Energy security concerns persist amid pipeline dependency shifts. Industrial output indicators showing seasonal softness.",
    indicators: [
      { label: "Threat Level", value: "MEDIUM", trend: "up" },
      { label: "Active Signals", value: "15", trend: "stable" },
      { label: "Confidence", value: "0.73", trend: "stable" },
      { label: "Data Freshness", value: "8m", trend: "stable" },
    ],
    dataSources: ["CERT-EU", "Finnhub", "EIA", "Eurostat", "GDELT"],
  },
  LV: {
    riskLevel: "high",
    summary: "Baltic airspace under heightened military activity — 23 sorties detected in 6-hour window, 4x above NATO exercise norms. Electronic warfare jamming signatures confirmed on 3 frequency bands. Elevated border monitoring posture.",
    indicators: [
      { label: "Threat Level", value: "HIGH", trend: "up" },
      { label: "Active Signals", value: "23", trend: "up" },
      { label: "Confidence", value: "0.88", trend: "stable" },
      { label: "Data Freshness", value: "6m", trend: "stable" },
    ],
    dataSources: ["OpenSky", "NATO AWACS", "ADS-B Exchange", "GDELT"],
  },
  NE: {
    riskLevel: "critical",
    summary: "Sahel corridor experiencing record conflict event density — 47 events in 72 hours with coordinated infrastructure targeting pattern. Civilian displacement accelerating. Food security indicators deteriorating rapidly.",
    indicators: [
      { label: "Threat Level", value: "CRITICAL", trend: "up" },
      { label: "Active Signals", value: "47", trend: "up" },
      { label: "Confidence", value: "0.84", trend: "stable" },
      { label: "Data Freshness", value: "10m", trend: "stable" },
    ],
    dataSources: ["ACLED", "UNHCR", "WFP", "NASA FIRMS", "GDELT"],
  },
  IR: {
    riskLevel: "high",
    summary: "Strait of Hormuz transit disruption indicators elevated — vessel diversionary routing patterns detected with 34% transit time increase. Insurance queries surged 156% in 48 hours. Regional maritime threat posture assessed as heightened.",
    indicators: [
      { label: "Threat Level", value: "HIGH", trend: "up" },
      { label: "Active Signals", value: "28", trend: "up" },
      { label: "Confidence", value: "0.82", trend: "stable" },
      { label: "Data Freshness", value: "7m", trend: "stable" },
    ],
    dataSources: ["AIS Maritime", "Lloyd's List", "Energy Markets", "OpenSky", "GDELT"],
  },
  BE: {
    riskLevel: "medium",
    summary: "European financial infrastructure DDoS campaign affecting Belgian institutions. CERT-EU coordinating response across affected countries. NATO HQ security posture elevated in coordination with national authorities.",
    indicators: [
      { label: "Threat Level", value: "MEDIUM", trend: "up" },
      { label: "Active Signals", value: "12", trend: "stable" },
      { label: "Confidence", value: "0.73", trend: "stable" },
      { label: "Data Freshness", value: "8m", trend: "stable" },
    ],
    dataSources: ["CERT-EU", "NATO SHAPE", "Finnhub", "GDELT"],
  },
};

/* ─── Default country brief for unknown countries ─────────────────────── */

export function getDefaultCountryIntel(name: string): CountryIntel {
  return {
    riskLevel: "low",
    summary: `${name} currently shows no elevated threat indicators across monitored intelligence feeds. Routine surveillance continues via satellite, maritime AIS, aviation transponder, conflict event, and economic data streams. No active alerts assigned to this region.`,
    indicators: [
      { label: "Threat Level", value: "LOW", trend: "stable" },
      { label: "Active Signals", value: "3", trend: "stable" },
      { label: "Confidence", value: "0.65", trend: "stable" },
      { label: "Data Freshness", value: "15m", trend: "stable" },
    ],
    dataSources: ["GDELT", "ACLED", "Finnhub", "NASA FIRMS"],
  };
}

/* ─── Feed Events ──────────────────────────────────────────────────────── */

export interface FeedItem {
  id: string;
  title: string;
  source: string;
  category: string;
  timestamp: string;
  severity: "low" | "medium" | "high" | "critical";
  location?: string;
  link?: string;
}

export const SEED_FEED_EVENTS: FeedItem[] = [
  {
    id: "evt-feed-001",
    title: "Black Sea naval buildup: 14 warships repositioned, potential blockade formation detected via AIS satellite tracking",
    source: "AIS Maritime Intel",
    category: "maritime",
    timestamp: "2026-03-29T06:30:00Z",
    severity: "critical",
    location: "Black Sea",
  },
  {
    id: "evt-feed-002",
    title: "Brent crude +3.8% in 8h window as Hormuz transit delays compound SPR drawdown — WTI spread widening",
    source: "Finnhub Markets",
    category: "economic",
    timestamp: "2026-03-29T06:25:00Z",
    severity: "high",
    location: "Global Energy Markets",
  },
  {
    id: "evt-feed-003",
    title: "312 active fire hotspots detected across Amazon Basin — carbon emissions 3.2x above seasonal baseline",
    source: "NASA FIRMS",
    category: "climate",
    timestamp: "2026-03-29T06:20:00Z",
    severity: "high",
    location: "Amazon Basin, Brazil",
  },
  {
    id: "evt-feed-004",
    title: "23 military sorties over Baltic in 6h — electronic warfare jamming confirmed on 3 frequency bands",
    source: "OpenSky Network",
    category: "aviation",
    timestamp: "2026-03-29T06:15:00Z",
    severity: "critical",
    location: "Baltic Region",
  },
  {
    id: "evt-feed-005",
    title: "10Y-2Y Treasury yield curve inversion deepens to -42bps — steepest since 2007, recession model at 67%",
    source: "FRED Economic Data",
    category: "economic",
    timestamp: "2026-03-29T06:10:00Z",
    severity: "medium",
    location: "United States",
  },
  {
    id: "evt-feed-006",
    title: "47 conflict events recorded across Sahel corridor in 72h — coordinated infrastructure targeting pattern identified",
    source: "ACLED Conflict Data",
    category: "conflict",
    timestamp: "2026-03-29T06:05:00Z",
    severity: "critical",
    location: "Sahel Region, West Africa",
  },
  {
    id: "evt-feed-007",
    title: "SPR drawdown of 8.2M barrels exceeds forecast by 3.1M — commercial crude inventories decline for 5th consecutive week",
    source: "EIA Energy Data",
    category: "energy",
    timestamp: "2026-03-29T06:00:00Z",
    severity: "medium",
    location: "United States",
  },
  {
    id: "evt-feed-008",
    title: "42 fishing militia vessels in coordinated formation near Scarborough Shoal — 67% operating with AIS disabled",
    source: "SAR Maritime Intel",
    category: "maritime",
    timestamp: "2026-03-29T05:55:00Z",
    severity: "high",
    location: "South China Sea",
  },
  {
    id: "evt-feed-009",
    title: "Coordinated DDoS campaign hits 6 European financial institutions — 340Gbps peak, APT28 infrastructure overlap detected",
    source: "CERT-EU Cyber",
    category: "cyber",
    timestamp: "2026-03-29T05:50:00Z",
    severity: "medium",
    location: "Brussels, Belgium",
  },
  {
    id: "evt-feed-010",
    title: "India power grid demand hits record 243 GW — coal stockpiles critically low at 14 thermal plants, brownouts possible",
    source: "CEA Grid Monitor",
    category: "energy",
    timestamp: "2026-03-29T05:45:00Z",
    severity: "medium",
    location: "Northern India",
  },
  {
    id: "evt-feed-011",
    title: "Strait of Hormuz vessel transit time +34% with diversionary routing — insurance queries surged 156% in 48h",
    source: "AIS Maritime Intel",
    category: "maritime",
    timestamp: "2026-03-29T05:40:00Z",
    severity: "high",
    location: "Strait of Hormuz",
  },
  {
    id: "evt-feed-012",
    title: "GDELT global instability index reaches 94th percentile — cross-domain signal convergence detected across 4 regions",
    source: "GDELT Analysis",
    category: "political",
    timestamp: "2026-03-29T05:35:00Z",
    severity: "medium",
    location: "Global",
  },
];
