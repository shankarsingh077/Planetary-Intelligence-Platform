/**
 * countries.ts — Country Risk Configuration
 * 
 * Defines baseline risk scores, event multipliers, and keywords
 * for geopolitical risk assessment per country.
 */

export interface CountryRiskConfig {
  code: string;
  name: string;
  baselineRisk: number;       // 0-100 baseline risk score
  eventMultiplier: number;    // Multiplier for event impact (0.5-3.0)
  keywords: string[];         // Keywords for event matching
  region: string;
  notes?: string;
}

/* ─── Country Risk Data ───────────────────────────────────────────────────── */

export const COUNTRY_RISK: Record<string, CountryRiskConfig> = {
  // Active Conflict Zones — Highest Risk
  UA: {
    code: 'UA', name: 'Ukraine', baselineRisk: 50, eventMultiplier: 0.8,
    keywords: ['ukraine', 'kyiv', 'kiev', 'zelensky', 'donbas', 'crimea', 'bakhmut', 'kherson'],
    region: 'Europe', notes: 'Active war zone. Reduced multiplier due to event saturation.'
  },
  RU: {
    code: 'RU', name: 'Russia', baselineRisk: 35, eventMultiplier: 2.0,
    keywords: ['russia', 'moscow', 'kremlin', 'putin', 'duma', 'rosneft', 'gazprom'],
    region: 'Eurasia', notes: 'Nuclear power at war. High impact on global energy.'
  },
  IL: {
    code: 'IL', name: 'Israel', baselineRisk: 45, eventMultiplier: 0.7,
    keywords: ['israel', 'gaza', 'hamas', 'hezbollah', 'netanyahu', 'idf', 'mossad', 'tel aviv'],
    region: 'Middle East', notes: 'Multi-front conflict. Regional escalation risk.'
  },
  IR: {
    code: 'IR', name: 'Iran', baselineRisk: 40, eventMultiplier: 2.0,
    keywords: ['iran', 'tehran', 'irgc', 'khamenei', 'raisi', 'natanz', 'hormuz', 'revolutionary guard'],
    region: 'Middle East', notes: 'Near-nuclear threshold. Controls Hormuz chokepoint.'
  },
  PS: {
    code: 'PS', name: 'Palestine', baselineRisk: 55, eventMultiplier: 0.6,
    keywords: ['palestine', 'gaza', 'west bank', 'hamas', 'pij', 'rafah'],
    region: 'Middle East', notes: 'Active conflict zone. Humanitarian crisis.'
  },
  YE: {
    code: 'YE', name: 'Yemen', baselineRisk: 50, eventMultiplier: 1.5,
    keywords: ['yemen', 'houthi', 'sanaa', 'aden', 'red sea', 'bab el mandeb'],
    region: 'Middle East', notes: 'Civil war. Houthi Red Sea attacks.'
  },
  SD: {
    code: 'SD', name: 'Sudan', baselineRisk: 55, eventMultiplier: 1.2,
    keywords: ['sudan', 'khartoum', 'darfur', 'rsf', 'saf', 'hemeti', 'burhan'],
    region: 'Africa', notes: 'Civil war. World\'s largest displacement crisis.'
  },
  MM: {
    code: 'MM', name: 'Myanmar', baselineRisk: 45, eventMultiplier: 1.0,
    keywords: ['myanmar', 'burma', 'tatmadaw', 'junta', 'nug', 'arakan', 'rohingya'],
    region: 'Asia', notes: 'Civil war. Junta losing territory.'
  },
  
  // High Tension Countries
  CN: {
    code: 'CN', name: 'China', baselineRisk: 25, eventMultiplier: 2.5,
    keywords: ['china', 'beijing', 'taiwan strait', 'south china sea', 'xi jinping', 'pla', 'ccp'],
    region: 'Asia', notes: 'Superpower. Taiwan contingency. Highest multiplier.'
  },
  TW: {
    code: 'TW', name: 'Taiwan', baselineRisk: 30, eventMultiplier: 2.5,
    keywords: ['taiwan', 'taipei', 'tsmc', 'taiwan strait', 'formosa'],
    region: 'Asia', notes: 'TSMC produces 90% of advanced chips. China flashpoint.'
  },
  KP: {
    code: 'KP', name: 'North Korea', baselineRisk: 45, eventMultiplier: 3.0,
    keywords: ['north korea', 'dprk', 'kim jong', 'pyongyang', 'icbm', 'hwasong'],
    region: 'Asia', notes: 'Nuclear-armed. Unpredictable. Highest multiplier.'
  },
  PK: {
    code: 'PK', name: 'Pakistan', baselineRisk: 35, eventMultiplier: 1.5,
    keywords: ['pakistan', 'islamabad', 'isi', 'ttp', 'balochistan', 'karachi'],
    region: 'Asia', notes: 'Nuclear-armed. TTP insurgency. Afghanistan border.'
  },
  AF: {
    code: 'AF', name: 'Afghanistan', baselineRisk: 45, eventMultiplier: 0.8,
    keywords: ['afghanistan', 'kabul', 'taliban', 'isis-k', 'khorasan'],
    region: 'Asia', notes: 'Taliban rule. ISIS-K terrorism.'
  },
  SY: {
    code: 'SY', name: 'Syria', baselineRisk: 45, eventMultiplier: 1.0,
    keywords: ['syria', 'damascus', 'assad', 'idlib', 'aleppo'],
    region: 'Middle East', notes: 'Civil war aftermath. Iranian/Russian presence.'
  },
  LB: {
    code: 'LB', name: 'Lebanon', baselineRisk: 40, eventMultiplier: 1.5,
    keywords: ['lebanon', 'beirut', 'hezbollah', 'nasrallah'],
    region: 'Middle East', notes: 'Economic collapse. Hezbollah stronghold.'
  },
  LY: {
    code: 'LY', name: 'Libya', baselineRisk: 40, eventMultiplier: 1.0,
    keywords: ['libya', 'tripoli', 'benghazi', 'haftar', 'oil'],
    region: 'Africa', notes: 'Divided country. Oil producer.'
  },
  VE: {
    code: 'VE', name: 'Venezuela', baselineRisk: 35, eventMultiplier: 1.2,
    keywords: ['venezuela', 'caracas', 'maduro', 'pdvsa', 'guaido'],
    region: 'Americas', notes: 'Political crisis. Oil reserves.'
  },
  
  // Regional Powers — Moderate Risk
  SA: {
    code: 'SA', name: 'Saudi Arabia', baselineRisk: 20, eventMultiplier: 2.0,
    keywords: ['saudi', 'riyadh', 'aramco', 'mbs', 'opec', 'ghawar'],
    region: 'Middle East', notes: 'OPEC leader. Oil prices. Vision 2030.'
  },
  AE: {
    code: 'AE', name: 'UAE', baselineRisk: 15, eventMultiplier: 1.5,
    keywords: ['uae', 'dubai', 'abu dhabi', 'emirates', 'dp world'],
    region: 'Middle East', notes: 'Financial hub. Jebel Ali port.'
  },
  TR: {
    code: 'TR', name: 'Turkey', baselineRisk: 25, eventMultiplier: 1.5,
    keywords: ['turkey', 'ankara', 'erdogan', 'bosphorus', 'incirlik'],
    region: 'Middle East/Europe', notes: 'NATO member. Bosphorus control.'
  },
  EG: {
    code: 'EG', name: 'Egypt', baselineRisk: 25, eventMultiplier: 1.5,
    keywords: ['egypt', 'cairo', 'suez', 'sisi', 'sinai'],
    region: 'Middle East/Africa', notes: 'Suez Canal. Gaza border.'
  },
  IN: {
    code: 'IN', name: 'India', baselineRisk: 20, eventMultiplier: 1.5,
    keywords: ['india', 'new delhi', 'modi', 'kashmir', 'lac'],
    region: 'Asia', notes: 'Nuclear power. China/Pakistan tensions.'
  },
  JP: {
    code: 'JP', name: 'Japan', baselineRisk: 15, eventMultiplier: 1.5,
    keywords: ['japan', 'tokyo', 'yen', 'nikkei', 'senkaku'],
    region: 'Asia', notes: 'G7 economy. US ally. China tensions.'
  },
  KR: {
    code: 'KR', name: 'South Korea', baselineRisk: 20, eventMultiplier: 1.5,
    keywords: ['south korea', 'seoul', 'samsung', 'kospi', 'dmz'],
    region: 'Asia', notes: 'Tech hub. North Korea threat.'
  },
  
  // Western Powers — Low Baseline, High Impact
  US: {
    code: 'US', name: 'United States', baselineRisk: 10, eventMultiplier: 2.5,
    keywords: ['united states', 'usa', 'washington', 'pentagon', 'fed', 'treasury'],
    region: 'Americas', notes: 'Global superpower. Highest impact events.'
  },
  GB: {
    code: 'GB', name: 'United Kingdom', baselineRisk: 10, eventMultiplier: 1.5,
    keywords: ['uk', 'britain', 'london', 'gchq', 'mi6', 'pound'],
    region: 'Europe', notes: 'G7. Five Eyes. NATO.'
  },
  DE: {
    code: 'DE', name: 'Germany', baselineRisk: 10, eventMultiplier: 1.5,
    keywords: ['germany', 'berlin', 'scholz', 'dax', 'bundesbank'],
    region: 'Europe', notes: 'EU largest economy. Energy security.'
  },
  FR: {
    code: 'FR', name: 'France', baselineRisk: 10, eventMultiplier: 1.5,
    keywords: ['france', 'paris', 'macron', 'cac', 'sahel'],
    region: 'Europe', notes: 'Nuclear power. UNSC permanent member.'
  },
  
  // Africa Hotspots
  NG: {
    code: 'NG', name: 'Nigeria', baselineRisk: 30, eventMultiplier: 1.0,
    keywords: ['nigeria', 'abuja', 'lagos', 'boko haram', 'niger delta'],
    region: 'Africa', notes: 'Africa\'s largest economy. Oil producer.'
  },
  ET: {
    code: 'ET', name: 'Ethiopia', baselineRisk: 35, eventMultiplier: 1.0,
    keywords: ['ethiopia', 'addis ababa', 'tigray', 'abiy', 'gerd'],
    region: 'Africa', notes: 'Horn of Africa. Tigray conflict aftermath.'
  },
  SO: {
    code: 'SO', name: 'Somalia', baselineRisk: 45, eventMultiplier: 0.8,
    keywords: ['somalia', 'mogadishu', 'al shabaab', 'puntland'],
    region: 'Africa', notes: 'Al-Shabaab insurgency. Piracy.'
  },
  ML: {
    code: 'ML', name: 'Mali', baselineRisk: 45, eventMultiplier: 1.0,
    keywords: ['mali', 'bamako', 'jnim', 'wagner', 'sahel'],
    region: 'Africa', notes: 'Sahel insurgency. Wagner presence.'
  },
  NE: {
    code: 'NE', name: 'Niger', baselineRisk: 40, eventMultiplier: 1.0,
    keywords: ['niger', 'niamey', 'uranium', 'sahel', 'coup'],
    region: 'Africa', notes: 'July 2023 coup. French forces expelled.'
  },
  BF: {
    code: 'BF', name: 'Burkina Faso', baselineRisk: 45, eventMultiplier: 1.0,
    keywords: ['burkina faso', 'ouagadougou', 'isgs', 'jnim'],
    region: 'Africa', notes: 'Two coups since 2022. Islamist insurgency.'
  },
  
  // Latin America
  MX: {
    code: 'MX', name: 'Mexico', baselineRisk: 35, eventMultiplier: 1.0,
    keywords: ['mexico', 'cartel', 'sinaloa', 'jalisco', 'cjng', 'fentanyl'],
    region: 'Americas', notes: 'Cartel violence. US border. Fentanyl crisis.'
  },
  HT: {
    code: 'HT', name: 'Haiti', baselineRisk: 50, eventMultiplier: 1.0,
    keywords: ['haiti', 'port au prince', 'gang', 'ariel henry'],
    region: 'Americas', notes: 'State collapse. Gang control.'
  },
  CO: {
    code: 'CO', name: 'Colombia', baselineRisk: 30, eventMultiplier: 1.0,
    keywords: ['colombia', 'bogota', 'farc', 'eln', 'cocaine'],
    region: 'Americas', notes: 'Peace process. Drug trafficking.'
  },
  AR: {
    code: 'AR', name: 'Argentina', baselineRisk: 25, eventMultiplier: 1.0,
    keywords: ['argentina', 'buenos aires', 'milei', 'peso'],
    region: 'Americas', notes: 'Economic crisis. Dollarization debate.'
  },
  BR: {
    code: 'BR', name: 'Brazil', baselineRisk: 20, eventMultiplier: 1.2,
    keywords: ['brazil', 'brasilia', 'lula', 'petrobras', 'amazon'],
    region: 'Americas', notes: 'BRICS. Amazon. G20 economy.'
  },
};

/* ─── Helper Functions ────────────────────────────────────────────────────── */

export function getCountryRisk(code: string): CountryRiskConfig | undefined {
  return COUNTRY_RISK[code.toUpperCase()];
}

export function calculateEventRisk(countryCode: string, eventSeverity: number): number {
  const config = getCountryRisk(countryCode);
  if (!config) return eventSeverity;
  return Math.min(100, config.baselineRisk + (eventSeverity * config.eventMultiplier));
}

export function matchCountryByKeyword(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [code, config] of Object.entries(COUNTRY_RISK)) {
    for (const keyword of config.keywords) {
      if (lower.includes(keyword)) return code;
    }
  }
  return undefined;
}

export function getHighRiskCountries(threshold = 35): CountryRiskConfig[] {
  return Object.values(COUNTRY_RISK).filter(c => c.baselineRisk >= threshold);
}

export function getRegionCountries(region: string): CountryRiskConfig[] {
  return Object.values(COUNTRY_RISK).filter(c => c.region === region);
}
