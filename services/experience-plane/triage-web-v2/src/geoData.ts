/**
 * geoData.ts — Static geographic intelligence datasets
 *
 * Ported from WorldMonitor (worldmonitor.app) config layer.
 * Contains curated geopolitical, infrastructure, and military datasets
 * for map overlay rendering.
 */

/* ═══════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════ */

export type PortType = 'container' | 'oil' | 'lng' | 'naval' | 'mixed' | 'bulk';

export interface Port {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: string;
  type: PortType;
  rank?: number;
  note: string;
}

export interface Pipeline {
  id: string;
  name: string;
  type: 'oil' | 'gas';
  status: 'operating' | 'construction' | 'planned';
  points: [number, number][];
  capacity: string;
  length: string;
  operator: string;
  countries: string[];
}

export interface StrategicWaterway {
  id: string;
  name: string;
  lat: number;
  lon: number;
  description: string;
}

export interface ConflictZone {
  id: string;
  name: string;
  coords: number[][];
  center: [number, number];
  intensity: 'low' | 'medium' | 'high';
  parties: string[];
  casualties?: string;
  displaced?: string;
  startDate?: string;
  location?: string;
  description?: string;
  keyDevelopments?: string[];
}

export interface IntelHotspot {
  id: string;
  name: string;
  subtext: string;
  lat: number;
  lon: number;
  location?: string;
  description: string;
  escalationScore?: number; // 1-5
  escalationTrend?: 'stable' | 'escalating' | 'deescalating';
  whyItMatters?: string;
}

export type MilitaryBaseType = 'us-nato' | 'russia' | 'china' | 'france' | 'uk' | 'india' | 'other';

export interface MilitaryBase {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: MilitaryBaseType;
  country?: string;
  description: string;
}

export interface TradeRoute {
  id: string;
  name: string;
  from: string;
  to: string;
  category: 'container' | 'energy' | 'bulk';
  status: 'active' | 'disrupted' | 'high_risk';
  volumeDesc: string;
  waypoints: string[];
}

export interface TradeRouteSegment {
  routeId: string;
  routeName: string;
  category: 'container' | 'energy' | 'bulk';
  status: string;
  volumeDesc: string;
  sourcePosition: [number, number];
  targetPosition: [number, number];
}

/* ═══════════════════════════════════════════════════════════════════════
   PORTS — 75 major global ports
   Source: WorldMonitor ports.ts
   ═══════════════════════════════════════════════════════════════════════ */

export const PORTS: Port[] = [
  // Top Container Ports
  { id: 'shanghai', name: 'Port of Shanghai', lat: 31.23, lon: 121.47, country: 'China', type: 'container', rank: 1, note: "World's busiest container port. 47M+ TEU." },
  { id: 'singapore', name: 'Port of Singapore', lat: 1.26, lon: 103.84, country: 'Singapore', type: 'mixed', rank: 2, note: 'Major transshipment hub. Malacca Strait gateway. 37M+ TEU.' },
  { id: 'ningbo', name: 'Ningbo-Zhoushan', lat: 29.87, lon: 121.55, country: 'China', type: 'mixed', rank: 3, note: 'Largest cargo throughput globally. 33M+ TEU.' },
  { id: 'shenzhen', name: 'Port of Shenzhen', lat: 22.52, lon: 114.05, country: 'China', type: 'container', rank: 4, note: 'South China gateway. Yantian terminal. 30M+ TEU.' },
  { id: 'guangzhou', name: 'Port of Guangzhou', lat: 23.08, lon: 113.24, country: 'China', type: 'mixed', rank: 5, note: 'Pearl River Delta. Nansha terminal. 24M+ TEU.' },
  { id: 'qingdao', name: 'Port of Qingdao', lat: 36.07, lon: 120.31, country: 'China', type: 'mixed', rank: 6, note: 'North China hub. PLA Navy North Sea Fleet nearby.' },
  { id: 'busan', name: 'Port of Busan', lat: 35.10, lon: 129.04, country: 'South Korea', type: 'container', rank: 7, note: 'Northeast Asia transshipment hub. 22M+ TEU.' },
  { id: 'tianjin', name: 'Port of Tianjin', lat: 38.99, lon: 117.70, country: 'China', type: 'mixed', rank: 8, note: "Beijing's maritime gateway. 21M+ TEU." },
  { id: 'hong_kong', name: 'Port of Hong Kong', lat: 22.29, lon: 114.15, country: 'China (SAR)', type: 'container', rank: 9, note: 'Historic transshipment hub. 16M+ TEU.' },
  { id: 'rotterdam', name: 'Port of Rotterdam', lat: 51.90, lon: 4.50, country: 'Netherlands', type: 'mixed', rank: 10, note: "Europe's largest port. Gateway to EU. 14M+ TEU." },
  { id: 'jebel_ali', name: 'Jebel Ali (Dubai)', lat: 25.01, lon: 55.06, country: 'UAE', type: 'container', rank: 11, note: "Middle East's largest port. DP World hub. 14M+ TEU." },
  { id: 'antwerp', name: 'Port of Antwerp-Bruges', lat: 51.26, lon: 4.40, country: 'Belgium', type: 'mixed', rank: 12, note: "Europe's second largest. Petrochemicals hub. 13M+ TEU." },
  { id: 'klang', name: 'Port Klang', lat: 3.00, lon: 101.39, country: 'Malaysia', type: 'container', rank: 13, note: 'Malacca Strait. Westports terminal. 13M+ TEU.' },
  { id: 'xiamen', name: 'Port of Xiamen', lat: 24.45, lon: 118.08, country: 'China', type: 'container', rank: 14, note: 'Taiwan Strait. Strategic location. 12M+ TEU.' },
  { id: 'kaohsiung', name: 'Port of Kaohsiung', lat: 22.61, lon: 120.28, country: 'Taiwan', type: 'container', rank: 15, note: "Taiwan's largest port. Semiconductor exports. 9M+ TEU." },
  { id: 'los_angeles', name: 'Port of Los Angeles', lat: 33.73, lon: -118.26, country: 'USA', type: 'container', rank: 16, note: 'Western Hemisphere busiest. US-Asia trade gateway. 9M+ TEU.' },
  { id: 'long_beach', name: 'Port of Long Beach', lat: 33.75, lon: -118.20, country: 'USA', type: 'container', rank: 17, note: 'Handles 40% of US container imports with LA. 8M+ TEU.' },
  { id: 'tanjung_pelepas', name: 'Tanjung Pelepas', lat: 1.37, lon: 103.55, country: 'Malaysia', type: 'container', rank: 18, note: 'Maersk hub. Singapore competitor. 11M+ TEU.' },
  { id: 'hamburg', name: 'Port of Hamburg', lat: 53.54, lon: 9.99, country: 'Germany', type: 'container', rank: 19, note: "Germany's largest. North Sea-Baltic connector. 8M+ TEU." },
  { id: 'laem_chabang', name: 'Laem Chabang', lat: 13.08, lon: 100.88, country: 'Thailand', type: 'container', rank: 20, note: "Thailand's main port. EEC hub. 8M+ TEU." },
  { id: 'new_york_nj', name: 'Port of NY/NJ', lat: 40.67, lon: -74.04, country: 'USA', type: 'container', rank: 21, note: 'US East Coast largest. Newark/Elizabeth terminals. 9M+ TEU.' },
  { id: 'piraeus', name: 'Port of Piraeus', lat: 37.94, lon: 23.65, country: 'Greece', type: 'container', rank: 25, note: "COSCO-operated. China's Mediterranean gateway. 5M+ TEU." },
  // Critical Oil/LNG Terminals
  { id: 'ras_tanura', name: 'Ras Tanura', lat: 26.64, lon: 50.16, country: 'Saudi Arabia', type: 'oil', note: "World's largest offshore oil terminal. Saudi Aramco. 6.5M+ bpd." },
  { id: 'fujairah', name: 'Port of Fujairah', lat: 25.12, lon: 56.35, country: 'UAE', type: 'oil', note: 'Major bunkering hub. Hormuz bypass. Outside Persian Gulf.' },
  { id: 'kharg_island', name: 'Kharg Island', lat: 29.23, lon: 50.31, country: 'Iran', type: 'oil', note: "Iran's main oil export terminal. 90%+ of oil exports." },
  { id: 'ras_laffan', name: 'Ras Laffan', lat: 25.93, lon: 51.54, country: 'Qatar', type: 'lng', note: "World's largest LNG export facility. 77M+ tonnes/year." },
  { id: 'houston', name: 'Port of Houston', lat: 29.73, lon: -95.02, country: 'USA', type: 'mixed', note: 'US oil/petrochemical hub. 2nd busiest US port by tonnage.' },
  { id: 'sabine_pass', name: 'Sabine Pass LNG', lat: 29.73, lon: -93.87, country: 'USA', type: 'lng', note: 'Largest US LNG export terminal. Cheniere Energy.' },
  { id: 'novorossiysk', name: 'Novorossiysk', lat: 44.72, lon: 37.77, country: 'Russia', type: 'oil', note: "Russia's largest Black Sea port. CPC terminal. 140M+ tonnes/year." },
  { id: 'primorsk', name: 'Primorsk', lat: 60.35, lon: 28.62, country: 'Russia', type: 'oil', note: "Baltic Sea oil terminal. Russia's largest oil port." },
  // Chokepoint Ports
  { id: 'port_said', name: 'Port Said', lat: 31.26, lon: 32.30, country: 'Egypt', type: 'mixed', note: 'Suez Canal northern entrance. 12% of global trade.' },
  { id: 'suez_port', name: 'Port of Suez', lat: 29.97, lon: 32.55, country: 'Egypt', type: 'mixed', note: 'Suez Canal southern terminus. Red Sea access.' },
  { id: 'gibraltar', name: 'Port of Gibraltar', lat: 36.14, lon: -5.35, country: 'UK (Gibraltar)', type: 'naval', note: 'Mediterranean-Atlantic gateway. UK naval base.' },
  { id: 'djibouti', name: 'Port of Djibouti', lat: 11.59, lon: 43.15, country: 'Djibouti', type: 'mixed', note: 'Bab el-Mandeb gateway. Chinese + US military bases.' },
  { id: 'aden', name: 'Port of Aden', lat: 12.79, lon: 45.03, country: 'Yemen', type: 'mixed', note: 'Red Sea strategic port. Houthi conflict area.' },
  { id: 'bandar_abbas', name: 'Bandar Abbas', lat: 27.18, lon: 56.28, country: 'Iran', type: 'mixed', note: "Iran's largest container port. Hormuz Strait." },
  { id: 'colon', name: 'Port of Colon', lat: 9.35, lon: -79.90, country: 'Panama', type: 'container', note: 'Panama Canal Atlantic side. Major transshipment.' },
  { id: 'balboa', name: 'Port of Balboa', lat: 8.95, lon: -79.56, country: 'Panama', type: 'container', note: 'Panama Canal Pacific terminus. Americas hub.' },
  { id: 'algeciras', name: 'Port of Algeciras', lat: 36.13, lon: -5.43, country: 'Spain', type: 'container', note: 'Gibraltar Strait. Maersk transshipment hub. 5M+ TEU.' },
  // Naval Ports
  { id: 'zhanjiang', name: 'Zhanjiang', lat: 21.20, lon: 110.40, country: 'China', type: 'naval', note: 'PLA Navy South Sea Fleet HQ. Carrier base.' },
  { id: 'yulin', name: 'Yulin Naval Base', lat: 18.23, lon: 109.52, country: 'China', type: 'naval', note: 'Hainan Island. Nuclear submarine base. SCS control.' },
  { id: 'vladivostok', name: 'Port of Vladivostok', lat: 43.12, lon: 131.88, country: 'Russia', type: 'naval', note: 'Russian Pacific Fleet HQ. Trans-Siberian terminus.' },
  { id: 'murmansk', name: 'Port of Murmansk', lat: 68.97, lon: 33.05, country: 'Russia', type: 'naval', note: 'Arctic ice-free port. Northern Fleet base.' },
  { id: 'gwadar', name: 'Gwadar', lat: 25.12, lon: 62.33, country: 'Pakistan', type: 'mixed', note: 'Chinese CPEC port. Strategic PLA Navy interest.' },
  { id: 'hambantota', name: 'Hambantota', lat: 6.12, lon: 81.12, country: 'Sri Lanka', type: 'mixed', note: 'Chinese 99-year lease. Indian Ocean strategic.' },
  // Major Regional Ports
  { id: 'colombo', name: 'Port of Colombo', lat: 6.94, lon: 79.84, country: 'Sri Lanka', type: 'container', note: 'Indian Ocean transshipment hub. 7M+ TEU.' },
  { id: 'yokohama', name: 'Port of Yokohama', lat: 35.44, lon: 139.64, country: 'Japan', type: 'container', note: "Tokyo Bay. Japan's 2nd largest. US 7th Fleet logistics." },
  { id: 'felixstowe', name: 'Port of Felixstowe', lat: 51.95, lon: 1.33, country: 'UK', type: 'container', note: "UK's busiest container port. 4M+ TEU." },
  { id: 'savannah', name: 'Port of Savannah', lat: 32.08, lon: -81.09, country: 'USA', type: 'container', note: 'Fastest growing US port. 5M+ TEU.' },
  { id: 'santos', name: 'Port of Santos', lat: -23.95, lon: -46.30, country: 'Brazil', type: 'mixed', note: "Latin America's busiest port. Sao Paulo gateway." },
  { id: 'nhava_sheva', name: 'Nhava Sheva (JNPT)', lat: 18.95, lon: 72.95, country: 'India', type: 'container', note: "India's busiest container port. Mumbai gateway. 6M+ TEU." },
  { id: 'mundra', name: 'Mundra Port', lat: 22.73, lon: 69.72, country: 'India', type: 'mixed', note: "India's largest private port. Adani Group." },
  { id: 'chennai', name: 'Port of Chennai', lat: 13.10, lon: 80.29, country: 'India', type: 'container', note: "India's 2nd largest. Auto industry. Bay of Bengal." },
  { id: 'karachi', name: 'Port of Karachi', lat: 24.84, lon: 67.00, country: 'Pakistan', type: 'mixed', note: "Pakistan's largest port. Naval HQ. 2M+ TEU." },
];

/* ═══════════════════════════════════════════════════════════════════════
   STRATEGIC WATERWAYS — 13 global chokepoints
   ═══════════════════════════════════════════════════════════════════════ */

export const STRATEGIC_WATERWAYS: StrategicWaterway[] = [
  { id: 'taiwan_strait', name: 'TAIWAN STRAIT', lat: 24.0, lon: 119.5, description: 'Critical shipping lane, PLA activity' },
  { id: 'malacca_strait', name: 'MALACCA STRAIT', lat: 2.5, lon: 101.5, description: 'Major oil shipping route — 25% of global trade' },
  { id: 'hormuz_strait', name: 'STRAIT OF HORMUZ', lat: 26.5, lon: 56.5, description: 'Oil chokepoint — 20% of global oil transits' },
  { id: 'bosphorus', name: 'BOSPHORUS STRAIT', lat: 41.1, lon: 29.0, description: 'Black Sea access, Turkey control' },
  { id: 'suez', name: 'SUEZ CANAL', lat: 30.5, lon: 32.3, description: 'Europe-Asia shipping — 12% of global trade' },
  { id: 'panama', name: 'PANAMA CANAL', lat: 9.1, lon: -79.7, description: 'Americas shipping route — 5% of global trade' },
  { id: 'gibraltar', name: 'STRAIT OF GIBRALTAR', lat: 35.9, lon: -5.6, description: 'Mediterranean access, NATO control' },
  { id: 'bab_el_mandeb', name: 'BAB EL-MANDEB', lat: 12.5, lon: 43.3, description: 'Red Sea chokepoint — Houthi attacks disrupting trade' },
  { id: 'cape_of_good_hope', name: 'CAPE OF GOOD HOPE', lat: -34.36, lon: 18.49, description: 'Suez bypass route — surge in tanker traffic' },
  { id: 'dover_strait', name: 'DOVER STRAIT', lat: 51.0, lon: 1.5, description: 'English Channel narrows — busiest shipping lane' },
  { id: 'korea_strait', name: 'KOREA STRAIT', lat: 34.0, lon: 129.0, description: 'Japan-Korea shipping lane' },
  { id: 'kerch_strait', name: 'KERCH STRAIT', lat: 45.3, lon: 36.6, description: 'Black Sea-Azov access — Russia-Ukraine flashpoint' },
  { id: 'lombok_strait', name: 'LOMBOK STRAIT', lat: -8.5, lon: 115.7, description: 'Malacca bypass for deep-draft vessels' },
];

/* ═══════════════════════════════════════════════════════════════════════
   CONFLICT ZONES — Active conflict polygons
   ═══════════════════════════════════════════════════════════════════════ */

export const CONFLICT_ZONES: ConflictZone[] = [
  {
    id: 'ukraine', name: 'Ukraine War',
    coords: [[22.1,48.1],[22.6,49.1],[23.2,50.4],[24.1,51.9],[27.9,52.2],[32.8,52.3],[36.3,50.3],[40.2,49.6],[40.1,48.9],[39.7,47.8],[38.2,47.1],[36.5,46.1],[33.6,44.4],[31.8,45.2],[30.8,46.4],[29.6,45.4],[28.2,45.5],[28.7,46.5],[26.6,48.3],[24.6,48.0],[22.1,48.1]],
    center: [31, 48.5], intensity: 'high',
    parties: ['Russia', 'Ukraine', 'NATO (support)'],
    casualties: '500,000+ (est.)', displaced: '6.5M+ refugees',
    startDate: 'Feb 24, 2022', location: 'Eastern Ukraine',
    description: 'Full-scale Russian invasion. Active frontlines in Donetsk, Luhansk, Zaporizhzhia, and Kherson oblasts.',
    keyDevelopments: ['Battle of Bakhmut', 'Kursk incursion', 'Black Sea drone strikes', 'Infrastructure attacks'],
  },
  {
    id: 'gaza', name: 'Gaza Conflict',
    coords: [[34,32],[35,32],[35,31],[34,31],[34,32]],
    center: [34.5, 31.5], intensity: 'high',
    parties: ['Israel', 'Hamas', 'Hezbollah', 'PIJ'],
    casualties: '40,000+ (Gaza)', displaced: '2M+ displaced',
    startDate: 'Oct 7, 2023', location: 'Gaza Strip',
    description: 'Israeli military operations following October 7 attacks. Ground invasion, aerial bombardment, humanitarian crisis.',
    keyDevelopments: ['Rafah ground operation', 'Humanitarian crisis', 'Hostage negotiations', 'Iran-backed attacks'],
  },
  {
    id: 'yemen_redsea', name: 'Red Sea Crisis',
    coords: [[42.6,16.5],[42.9,14.8],[43.3,12.6],[44.0,12.6],[46.0,13.4],[48.5,14.5],[52.0,15.0],[52.2,15.6],[48.5,16.8],[45.0,17.0],[42.6,16.5]],
    center: [46, 14.5], intensity: 'high',
    parties: ['Houthis', 'US/UK Coalition', 'Yemen Govt'],
    casualties: 'Maritime casualties', displaced: '4.5M+ (Civil War)',
    startDate: 'Nov 19, 2023', location: 'Red Sea & Gulf of Aden',
    description: 'Houthi maritime campaign against commercial shipping. US/UK airstrikes on Houthi targets.',
    keyDevelopments: ['Ship hijackings', 'US airstrikes', 'Cable cuts', 'Shipping rerouted via Cape'],
  },
  {
    id: 'sudan', name: 'Sudan Civil War',
    coords: [[21.8,22],[33.2,22],[37.5,18.2],[38.5,17.4],[36.5,14.5],[34.1,10.6],[29.0,9.8],[24.0,12.5],[22.0,16.0],[21.8,22]],
    center: [30, 15.5], intensity: 'high',
    parties: ['SAF', 'RSF', 'Allied militias'],
    casualties: '150,000+ killed', displaced: '14M+ internally displaced',
    startDate: 'Apr 15, 2023', location: 'Sudan (nationwide)',
    description: "World's largest displacement crisis. RSF controls Darfur/Khartoum; SAF holds Port Sudan.",
    keyDevelopments: ['Khartoum destruction', 'Darfur massacres', 'El Fasher siege', 'Famine declared'],
  },
  {
    id: 'myanmar', name: 'Myanmar Civil War',
    coords: [[92.2,21],[93.0,24.2],[96.0,28.3],[98.5,27.5],[100.2,23.5],[100.5,20],[98.5,13],[97.5,10.5],[97.8,12.5],[96.5,16],[94.5,18.5],[92.2,21]],
    center: [96.5, 20], intensity: 'high',
    parties: ['Tatmadaw (Junta)', 'NUG / PDF', 'Ethnic armed orgs'],
    casualties: '50,000+ (est.)', displaced: '3M+ internally displaced',
    startDate: 'Feb 1, 2021', location: 'Myanmar (nationwide)',
    description: 'Civil war after 2021 coup. Resistance + ethnic armies capturing territory. Junta losing border regions.',
    keyDevelopments: ['Operation 1027', 'AA controls Rakhine', 'Myawaddy capture', 'Junta airstrikes'],
  },
  {
    id: 'south_lebanon', name: 'Israel-Lebanon Border',
    coords: [[35.1,33],[35.1,33.4],[35.8,33.4],[35.8,33],[35.1,33]],
    center: [35.4, 33.2], intensity: 'high',
    parties: ['Israel (IDF)', 'Hezbollah'],
    casualties: '500+ killed', displaced: '150k+ displaced',
    startDate: 'Oct 8, 2023', location: 'Southern Lebanon / Northern Israel',
    description: 'Cross-border artillery and rocket fire. Targeted assassinations.',
  },
  {
    id: 'pak_afghan', name: 'Pakistan–Afghanistan Border',
    coords: [[72.5,35.7],[69.4,31.7],[66.0,29.3],[64.9,30.3],[71.0,36.6],[72.5,35.7]],
    center: [69, 31.8], intensity: 'medium',
    parties: ['Pakistan Military', 'TTP', 'Afghan Taliban'],
    startDate: 'Feb 21, 2026', location: 'Pak-Afghan border',
    description: 'Cross-border strikes on TTP sanctuaries. Border closures and diplomatic friction.',
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   INTEL HOTSPOTS — Key geopolitical monitoring points
   ═══════════════════════════════════════════════════════════════════════ */

export const INTEL_HOTSPOTS: IntelHotspot[] = [
  { id: 'kyiv', name: 'Kyiv', subtext: 'Conflict Zone', lat: 50.45, lon: 30.5, description: 'Active conflict zone. NATO support operations.', escalationScore: 5, escalationTrend: 'stable', whyItMatters: 'Largest European war since WWII; NATO Article 5 test' },
  { id: 'moscow', name: 'Moscow', subtext: 'Kremlin Activity', lat: 55.75, lon: 37.6, description: 'Russian Federation command center.', escalationScore: 4, escalationTrend: 'stable', whyItMatters: 'Nuclear power at war; energy leverage over Europe' },
  { id: 'tehran', name: 'Tehran', subtext: 'IRGC Activity', lat: 35.7, lon: 51.4, description: 'Nuclear program. Regional proxy operations.', escalationScore: 4, escalationTrend: 'escalating', whyItMatters: 'Near-nuclear threshold; controls Strait of Hormuz' },
  { id: 'telaviv', name: 'Tel Aviv', subtext: 'Mossad/IDF', lat: 32.1, lon: 34.8, description: 'Military operations. Intelligence activities.', escalationScore: 5, escalationTrend: 'stable', whyItMatters: 'Multi-front conflict risk; Iran confrontation flashpoint' },
  { id: 'beijing', name: 'Beijing', subtext: 'PLA/MSS Activity', lat: 39.9, lon: 116.4, description: 'CCP HQ. PLA command center.', escalationScore: 3, escalationTrend: 'stable', whyItMatters: 'Largest economy by PPP; Taiwan contingency risk' },
  { id: 'taipei', name: 'Taipei', subtext: 'Strait Watch', lat: 25.03, lon: 121.5, description: 'Taiwan Strait tensions. Semiconductor supply chain.', escalationScore: 3, whyItMatters: 'TSMC produces 90% of advanced chips' },
  { id: 'pyongyang', name: 'Pyongyang', subtext: 'DPRK Watch', lat: 39.0, lon: 125.75, description: 'Nuclear weapons. Missile testing. Cyber ops.', escalationScore: 3, whyItMatters: 'Nuclear-armed; ICBM range to US; Russia arms supplier' },
  { id: 'dc', name: 'DC', subtext: 'Pentagon', lat: 38.9, lon: -77.0, description: 'US government and military headquarters.' },
  { id: 'brussels', name: 'Brussels', subtext: 'NATO HQ', lat: 50.85, lon: 4.35, description: 'NATO alliance headquarters. EU center.' },
  { id: 'london', name: 'London', subtext: 'GCHQ/MI6', lat: 51.5, lon: -0.12, description: 'UK intelligence HQ. Five Eyes member.' },
  { id: 'sanaa', name: "Sana'a", subtext: 'Yemen/Houthis', lat: 15.4, lon: 44.2, description: 'Houthi Red Sea attacks. Shipping disruption.', escalationScore: 4, escalationTrend: 'escalating', whyItMatters: 'Disrupting 12% of global trade via Suez' },
  { id: 'sahel', name: 'Sahel', subtext: 'Insurgency/Coups', lat: 14.0, lon: -1.0, description: 'Military coups and Islamist insurgency. Russian influence.', escalationScore: 4, escalationTrend: 'escalating', whyItMatters: 'Russian influence in former French sphere' },
  { id: 'horn_africa', name: 'Horn of Africa', subtext: 'Piracy/Conflict', lat: 10.0, lon: 49.0, description: 'Resurgent piracy. Al-Shabaab. Red Sea spillover.', escalationScore: 4, escalationTrend: 'escalating' },
  { id: 'wall_street', name: 'Wall Street', subtext: 'Financial Hub', lat: 40.7, lon: -74.0, description: 'Global financial center. Fed policy.' },
  { id: 'silicon_valley', name: 'Silicon Valley', subtext: 'Tech/AI Hub', lat: 37.4, lon: -122.1, description: 'Global tech center. AI development hub.' },
  { id: 'riyadh', name: 'Riyadh', subtext: 'Saudi GIP/MBS', lat: 24.7, lon: 46.7, description: 'OPEC+ decisions. Regional influence.' },
  { id: 'ankara', name: 'Ankara', subtext: 'Turkey/MIT', lat: 39.9, lon: 32.9, description: 'NATO member. Kurdish conflict. Syria/Libya ops.' },
  { id: 'cairo', name: 'Cairo', subtext: 'Egypt/GIS', lat: 30.0, lon: 31.2, description: 'Gaza border. Suez Canal security.' },
  { id: 'mexico', name: 'Mexico', subtext: 'Cartel Violence', lat: 23.6, lon: -102.5, description: 'Cartel warfare. Fentanyl trafficking.', escalationScore: 4, escalationTrend: 'escalating' },
  { id: 'caracas', name: 'Caracas', subtext: 'Venezuela Crisis', lat: 10.5, lon: -66.9, description: 'Political crisis. Economic sanctions.' },
];

/* ═══════════════════════════════════════════════════════════════════════
   MILITARY BASES — Top 60 strategically important bases
   ═══════════════════════════════════════════════════════════════════════ */

export const MILITARY_BASES: MilitaryBase[] = [
  // US/NATO key overseas bases
  { id: 'camp_lemonnier', name: 'Camp Lemonnier', lat: 11.54, lon: 43.15, type: 'us-nato', country: 'Djibouti', description: 'US Navy base. Horn of Africa operations.' },
  { id: 'al_udeid', name: 'Al Udeid Air Base', lat: 25.12, lon: 51.31, type: 'us-nato', country: 'Qatar', description: 'CENTCOM Forward HQ. Largest US base in Middle East.' },
  { id: 'ramstein', name: 'Ramstein Air Base', lat: 49.44, lon: 7.60, type: 'us-nato', country: 'Germany', description: 'USAFE HQ. NATO Air Command.' },
  { id: 'incirlik', name: 'Incirlik Air Base', lat: 37.0, lon: 35.43, type: 'us-nato', country: 'Turkey', description: 'US/Turkish base. Nuclear weapons storage.' },
  { id: 'yokosuka', name: 'Yokosuka Naval Base', lat: 35.28, lon: 139.67, type: 'us-nato', country: 'Japan', description: 'US 7th Fleet HQ. Carrier strike group.' },
  { id: 'kadena', name: 'Kadena Air Base', lat: 26.35, lon: 127.77, type: 'us-nato', country: 'Japan', description: 'Largest US Air Force base in Pacific.' },
  { id: 'osan', name: 'Osan Air Base', lat: 37.09, lon: 127.03, type: 'us-nato', country: 'South Korea', description: 'Key base near DMZ. F-16 wing.' },
  { id: 'humphreys', name: 'Camp Humphreys', lat: 36.97, lon: 127.03, type: 'us-nato', country: 'South Korea', description: 'Largest US overseas base. Army garrison.' },
  { id: 'guantanamo', name: 'Guantanamo Bay', lat: 20.14, lon: -75.21, type: 'us-nato', country: 'Cuba', description: 'US Naval Station. Detention facility.' },
  { id: 'rota', name: 'Naval Station Rota', lat: 36.62, lon: -6.35, type: 'us-nato', country: 'Spain', description: 'Aegis destroyers. Atlantic access.' },
  { id: 'norfolk', name: 'Norfolk Naval Base', lat: 36.95, lon: -76.31, type: 'us-nato', country: 'USA', description: 'World largest naval base. Atlantic Fleet HQ.' },
  { id: 'diego_garcia', name: 'Diego Garcia', lat: -7.30, lon: 72.41, type: 'us-nato', country: 'BIOT', description: 'Strategic Indian Ocean base. B-2 capable.' },
  { id: 'aviano', name: 'Aviano Air Base', lat: 46.07, lon: 12.59, type: 'us-nato', country: 'Italy', description: 'NATO Southern Europe. F-16 wing.' },
  { id: 'bahrain', name: 'NSA Bahrain', lat: 26.21, lon: 50.61, type: 'us-nato', country: 'Bahrain', description: 'US 5th Fleet HQ. Persian Gulf.' },
  { id: 'camp_arifjan', name: 'Camp Arifjan', lat: 28.88, lon: 48.16, type: 'us-nato', country: 'Kuwait', description: 'US Army Central command. 10,000+ troops.' },
  { id: 'al_dhafra', name: 'Al Dhafra Air Base', lat: 24.24, lon: 54.55, type: 'us-nato', country: 'UAE', description: 'F-35/RQ-4 operations. Strategic strike.' },
  // Russian bases
  { id: 'khmeimim', name: 'Khmeimim Air Base', lat: 35.41, lon: 35.95, type: 'russia', country: 'Syria', description: 'Russian Aerospace Forces. Syria operations.' },
  { id: 'tartus', name: 'Tartus Naval Facility', lat: 34.92, lon: 35.87, type: 'russia', country: 'Syria', description: 'Only Russian navy base in Mediterranean.' },
  { id: 'sevastopol', name: 'Sevastopol', lat: 44.6, lon: 33.5, type: 'russia', country: 'Crimea', description: 'Black Sea Fleet HQ (occupied).' },
  { id: 'kaliningrad', name: 'Kaliningrad', lat: 54.71, lon: 20.51, type: 'russia', country: 'Russia', description: 'Baltic Fleet. Iskander missiles. NATO enclave.' },
  { id: 'murmansk_base', name: 'Murmansk Naval', lat: 68.97, lon: 33.09, type: 'russia', country: 'Russia', description: 'Northern Fleet. Strategic nuclear submarines.' },
  { id: 'vladivostok_base', name: 'Vladivostok Naval', lat: 43.12, lon: 131.9, type: 'russia', country: 'Russia', description: 'Pacific Fleet HQ. Nuclear submarines.' },
  { id: 'baikonur', name: 'Baikonur Cosmodrome', lat: 45.96, lon: 63.31, type: 'russia', country: 'Kazakhstan', description: 'Spaceport. ICBM testing.' },
  // Chinese bases
  { id: 'djibouti_cn', name: 'PLA Support Base', lat: 11.59, lon: 43.06, type: 'china', country: 'Djibouti', description: "China's first overseas military base." },
  { id: 'ream', name: 'Ream Naval Base', lat: 10.50, lon: 103.61, type: 'china', country: 'Cambodia', description: 'PLA Navy access. Operational 2025.' },
  { id: 'scs_fiery', name: 'Fiery Cross Reef', lat: 9.55, lon: 112.89, type: 'china', country: 'SCS (disputed)', description: 'Artificial island. Combined arms.' },
  { id: 'scs_subi', name: 'Subi Reef', lat: 10.92, lon: 114.08, type: 'china', country: 'SCS (disputed)', description: 'Artificial island. Airstrip + radar.' },
  // French bases
  { id: 'djibouti_fr', name: 'Héron Naval Base', lat: 11.56, lon: 43.14, type: 'france', country: 'Djibouti', description: 'French Navy. Largest French overseas base.' },
  { id: 'abu_dhabi_fr', name: 'Abu Dhabi Base', lat: 24.52, lon: 54.40, type: 'france', country: 'UAE', description: 'Navy + Air Force. Persian Gulf.' },
  { id: 'akrotiri', name: 'RAF Akrotiri', lat: 34.59, lon: 32.99, type: 'uk', country: 'Cyprus', description: 'UK Sovereign Base Area. Middle East staging.' },
  { id: 'lakenheath', name: 'RAF Lakenheath', lat: 52.42, lon: 0.52, type: 'us-nato', country: 'UK', description: 'US Air Force in Europe. F-15E/F-35A wing.' },
  // India
  { id: 'india_farkhor', name: 'Farkhor Air Base', lat: 37.47, lon: 69.38, type: 'india', country: 'Tajikistan', description: 'Indian Air Force. Central Asia presence.' },
];

/* ═══════════════════════════════════════════════════════════════════════
   PIPELINES — Top 40 strategically important oil & gas pipelines
   ═══════════════════════════════════════════════════════════════════════ */

export const PIPELINES: Pipeline[] = [
  // Key Oil Pipelines
  { id: 'colonial', name: 'Colonial Pipeline', type: 'oil', status: 'operating', points: [[-95.4,29.8],[-90.1,30.0],[-84.4,33.8],[-78.6,35.8],[-74.0,40.7]], capacity: '2.5M bpd', length: '8,850 km', operator: 'Colonial Pipeline Co', countries: ['USA'] },
  { id: 'druzhba', name: 'Druzhba Pipeline', type: 'oil', status: 'operating', points: [[52.3,54.7],[37.6,52.3],[24.0,52.2],[14.4,52.5]], capacity: '1.2M bpd', length: '5,327 km', operator: 'Transneft', countries: ['Russia','Belarus','Poland','Germany'] },
  { id: 'espo', name: 'ESPO Pipeline', type: 'oil', status: 'operating', points: [[114.5,56.5],[126.0,52.0],[133.0,47.0]], capacity: '1.6M bpd', length: '4,857 km', operator: 'Transneft', countries: ['Russia'] },
  { id: 'btc', name: 'Baku-Tbilisi-Ceyhan', type: 'oil', status: 'operating', points: [[49.9,40.4],[44.8,41.7],[35.9,37.0]], capacity: '1.2M bpd', length: '1,768 km', operator: 'BP', countries: ['Azerbaijan','Georgia','Turkey'] },
  { id: 'keystone', name: 'Keystone Pipeline', type: 'oil', status: 'operating', points: [[-104.05,50.95],[-97.5,44.4],[-95.0,29.8]], capacity: '590K bpd', length: '3,456 km', operator: 'TC Energy', countries: ['Canada','USA'] },
  { id: 'east-west', name: 'East-West Pipeline', type: 'oil', status: 'operating', points: [[50.1,26.3],[44.0,25.5],[38.5,22.5]], capacity: '5M bpd', length: '1,200 km', operator: 'Saudi Aramco', countries: ['Saudi Arabia'] },
  { id: 'sumed', name: 'SUMED Pipeline', type: 'oil', status: 'operating', points: [[33.0,29.0],[31.2,30.0],[29.9,31.2]], capacity: '2.5M bpd', length: '320 km', operator: 'SUMED', countries: ['Egypt'] },
  { id: 'kirkuk-ceyhan', name: 'Kirkuk-Ceyhan', type: 'oil', status: 'operating', points: [[44.4,35.5],[40.0,37.0],[35.9,37.0]], capacity: '1.6M bpd', length: '970 km', operator: 'BOTAS/SOMO', countries: ['Iraq','Turkey'] },
  { id: 'cpc', name: 'Caspian Pipeline', type: 'oil', status: 'operating', points: [[53.0,46.9],[45.5,45.5],[37.4,45.0]], capacity: '1.4M bpd', length: '1,510 km', operator: 'CPC', countries: ['Kazakhstan','Russia'] },
  { id: 'china-myanmar', name: 'China-Myanmar Pipeline', type: 'oil', status: 'operating', points: [[93.2,20.1],[98.5,24.0],[102.7,25.0]], capacity: '440K bpd', length: '771 km', operator: 'CNPC', countries: ['Myanmar','China'] },
  { id: 'enbridge-mainline', name: 'Enbridge Mainline', type: 'oil', status: 'operating', points: [[-114.1,53.5],[-97.0,49.9],[-83.5,42.5]], capacity: '2.85M bpd', length: '5,353 km', operator: 'Enbridge', countries: ['Canada','USA'] },
  { id: 'chad-cameroon', name: 'Chad-Cameroon Pipeline', type: 'oil', status: 'operating', points: [[16.8,10.0],[12.5,5.5],[10.0,4.0]], capacity: '250K bpd', length: '1,070 km', operator: 'COTCO', countries: ['Chad','Cameroon'] },
  { id: 'sudan-port', name: 'Greater Nile Oil Pipeline', type: 'oil', status: 'operating', points: [[30.0,9.5],[34.0,16.0],[37.2,19.6]], capacity: '500K bpd', length: '1,610 km', operator: 'GNPOC', countries: ['South Sudan','Sudan'] },
  // Key Gas Pipelines
  { id: 'turkstream', name: 'TurkStream', type: 'gas', status: 'operating', points: [[38.5,44.6],[31.0,42.5],[29.0,41.3]], capacity: '31.5 bcm/yr', length: '930 km', operator: 'Gazprom', countries: ['Russia','Turkey'] },
  { id: 'yamal-europe', name: 'Yamal-Europe', type: 'gas', status: 'operating', points: [[73.5,67.5],[55.0,60.0],[32.0,55.0],[14.0,52.5]], capacity: '33 bcm/yr', length: '4,196 km', operator: 'Gazprom', countries: ['Russia','Belarus','Poland','Germany'] },
  { id: 'power-of-siberia', name: 'Power of Siberia', type: 'gas', status: 'operating', points: [[118.0,62.0],[127.5,52.0],[127.5,45.8]], capacity: '38 bcm/yr', length: '3,000 km', operator: 'Gazprom', countries: ['Russia','China'] },
  { id: 'tanap', name: 'TANAP', type: 'gas', status: 'operating', points: [[42.0,41.6],[35.0,39.0],[26.5,40.5]], capacity: '16 bcm/yr', length: '1,850 km', operator: 'TANAP', countries: ['Azerbaijan','Georgia','Turkey'] },
  { id: 'tap', name: 'TAP', type: 'gas', status: 'operating', points: [[20.1,39.6],[18.0,40.8],[16.5,41.0]], capacity: '10 bcm/yr', length: '878 km', operator: 'TAP AG', countries: ['Greece','Albania','Italy'] },
  { id: 'central-asia-china', name: 'Central Asia-China', type: 'gas', status: 'operating', points: [[62.5,39.0],[69.0,41.0],[80.0,40.0],[87.5,44.0]], capacity: '55 bcm/yr', length: '1,833 km', operator: 'CNPC', countries: ['Turkmenistan','Uzbekistan','Kazakhstan','China'] },
  { id: 'dolphin', name: 'Dolphin Pipeline', type: 'gas', status: 'operating', points: [[51.5,25.9],[52.0,25.3],[54.4,24.5]], capacity: '3.2 bcf/d', length: '364 km', operator: 'Dolphin Energy', countries: ['Qatar','UAE'] },
  { id: 'transmed', name: 'TransMed Pipeline', type: 'gas', status: 'operating', points: [[3.0,36.8],[10.0,37.5],[14.2,40.8]], capacity: '33.5 bcm/yr', length: '2,475 km', operator: 'Sonatrach/Eni', countries: ['Algeria','Tunisia','Italy'] },
  { id: 'langeled', name: 'Langeled Pipeline', type: 'gas', status: 'operating', points: [[2.0,61.5],[0.0,56.5],[0.5,53.5]], capacity: '25.5 bcm/yr', length: '1,200 km', operator: 'Gassco', countries: ['Norway','UK'] },
  { id: 'hbj', name: 'HBJ Pipeline', type: 'gas', status: 'operating', points: [[72.6,21.1],[76.0,23.5],[82.0,26.0]], capacity: '33 mcm/d', length: '2,700 km', operator: 'GAIL', countries: ['India'] },
  { id: 'bolivia-brazil', name: 'GASBOL', type: 'gas', status: 'operating', points: [[-63.2,-17.8],[-56.0,-21.0],[-47.0,-23.5]], capacity: '30 mcm/d', length: '3,150 km', operator: 'TBG', countries: ['Bolivia','Brazil'] },
];

/* ═══════════════════════════════════════════════════════════════════════
   TRADE ROUTES — Major maritime corridors
   ═══════════════════════════════════════════════════════════════════════ */

export const TRADE_ROUTES: TradeRoute[] = [
  { id: 'china-europe-suez', name: 'China → Europe (Suez)', from: 'shanghai', to: 'rotterdam', category: 'container', status: 'active', volumeDesc: '47M+ TEU/year', waypoints: ['malacca_strait','bab_el_mandeb','suez'] },
  { id: 'china-us-west', name: 'China → US West Coast', from: 'shanghai', to: 'los_angeles', category: 'container', status: 'active', volumeDesc: '24M+ TEU/year', waypoints: ['taiwan_strait'] },
  { id: 'gulf-asia-oil', name: 'Persian Gulf → Asia (Oil)', from: 'ras_tanura', to: 'singapore', category: 'energy', status: 'active', volumeDesc: '15M+ bpd', waypoints: ['hormuz_strait','malacca_strait'] },
  { id: 'gulf-europe-oil', name: 'Persian Gulf → Europe (Oil)', from: 'ras_tanura', to: 'rotterdam', category: 'energy', status: 'active', volumeDesc: '6.5M+ bpd', waypoints: ['hormuz_strait','bab_el_mandeb','suez','gibraltar'] },
  { id: 'qatar-europe-lng', name: 'Qatar LNG → Europe', from: 'ras_laffan', to: 'felixstowe', category: 'energy', status: 'active', volumeDesc: '77M+ tonnes/yr', waypoints: ['hormuz_strait','bab_el_mandeb','suez'] },
  { id: 'us-europe-lng', name: 'US LNG → Europe', from: 'sabine_pass', to: 'rotterdam', category: 'energy', status: 'active', volumeDesc: '80M+ tonnes/yr', waypoints: [] },
  { id: 'brazil-china-bulk', name: 'Brazil → China (Bulk)', from: 'santos', to: 'shanghai', category: 'bulk', status: 'active', volumeDesc: '350M+ tonnes/yr', waypoints: ['cape_of_good_hope'] },
  { id: 'transatlantic', name: 'TransAtlantic', from: 'new_york_nj', to: 'felixstowe', category: 'container', status: 'active', volumeDesc: '8M+ TEU/year', waypoints: [] },
  { id: 'india-europe', name: 'India → Europe', from: 'nhava_sheva', to: 'rotterdam', category: 'container', status: 'active', volumeDesc: '6M+ TEU/year', waypoints: ['bab_el_mandeb','suez','gibraltar'] },
  { id: 'china-africa', name: 'China → Africa', from: 'guangzhou', to: 'djibouti', category: 'container', status: 'active', volumeDesc: '5M+ TEU/year', waypoints: ['malacca_strait'] },
  { id: 'asia-europe-cape', name: 'Asia → Europe (Cape Route)', from: 'singapore', to: 'rotterdam', category: 'container', status: 'active', volumeDesc: '5M+ TEU/year', waypoints: ['cape_of_good_hope','gibraltar'] },
  { id: 'cpec-route', name: 'CPEC Route', from: 'gwadar', to: 'guangzhou', category: 'container', status: 'active', volumeDesc: '1M+ TEU/year', waypoints: ['malacca_strait'] },
];

/* ═══════════════════════════════════════════════════════════════════════
   TRADE ROUTE SEGMENT RESOLVER
   ═══════════════════════════════════════════════════════════════════════ */

export function resolveTradeRouteSegments(): TradeRouteSegment[] {
  const portMap = new Map<string, [number, number]>();
  for (const p of PORTS) portMap.set(p.id, [p.lon, p.lat]);

  const waterwayMap = new Map<string, [number, number]>();
  for (const w of STRATEGIC_WATERWAYS) waterwayMap.set(w.id, [w.lon, w.lat]);

  const segments: TradeRouteSegment[] = [];

  for (const route of TRADE_ROUTES) {
    const fromCoord = portMap.get(route.from);
    const toCoord = portMap.get(route.to);
    if (!fromCoord || !toCoord) continue;

    const waypointCoords: [number, number][] = [];
    let valid = true;
    for (const wpId of route.waypoints) {
      const coord = waterwayMap.get(wpId);
      if (!coord) { valid = false; break; }
      waypointCoords.push(coord);
    }
    if (!valid) continue;

    const chain: [number, number][] = [fromCoord, ...waypointCoords, toCoord];

    for (let i = 0; i < chain.length - 1; i++) {
      segments.push({
        routeId: route.id,
        routeName: route.name,
        category: route.category,
        status: route.status,
        volumeDesc: route.volumeDesc,
        sourcePosition: chain[i]!,
        targetPosition: chain[i + 1]!,
      });
    }
  }

  return segments;
}

/* ═══════════════════════════════════════════════════════════════════════
   LAYER VISIBILITY STATE TYPE
   ═══════════════════════════════════════════════════════════════════════ */

export interface LayerVisibility {
  ports: boolean;
  pipelines: boolean;
  tradeRoutes: boolean;
  conflictZones: boolean;
  waterways: boolean;
  militaryBases: boolean;
  hotspots: boolean;
  alerts: boolean;
}

export const DEFAULT_LAYERS: LayerVisibility = {
  ports: false,
  pipelines: false,
  tradeRoutes: false,
  conflictZones: true,
  waterways: true,
  militaryBases: false,
  hotspots: true,
  alerts: true,
};
