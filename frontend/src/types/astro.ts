// ─── Shared astrology types ──────────────────────────────────────────────────

export interface PlanetData {
  lon: number;
  sign: string;
  glyph: string;
  deg: number;
  min: number;
  deg_min: string;
  retrograde: boolean;
  house: number;
  dec: number;
  oob: boolean;
  speed: number;
  speed_status: 'retrograde' | 'stationary' | 'slow' | 'average' | 'fast' | 'unknown';
  decan: number;
  decan_ruler: string;
  term_ruler: string;
  sect_status?: string | null;
  // Moon only
  mansion_num?: number;
  mansion_name?: string;
  mansion_nature?: string;
}

export interface HouseData {
  lon: number;
  sign: string;
  glyph: string;
  deg: number;
  min: number;
  deg_min: string;
}

export interface AspectData {
  p1: string;
  p2: string;
  aspect: string;
  orb: number;
  applying: boolean;
  lon1: number;
  lon2: number;
  type?: 'major' | 'minor' | 'parallel' | 'contra_parallel';
}

export interface DignityData {
  dignity: string | null;
  score: number;
  ruler?: boolean;
  exalted?: boolean;
  detriment?: boolean;
  fall?: boolean;
  peregrine?: boolean;
}

export interface LunarPhase {
  angle: number;
  name: string;
  phase?: string;
  illumination: number;
}

export interface ArabicPart {
  lon: number;
  sign: string;
  deg_min: string;
}

export interface FixedStar {
  star: string;
  planet: string;
  star_lon: number;
  planet_lon: number;
  orb: number;
  nature: string;
  magnitude: number;
}

// In calc_chart, `sect` is stored as a plain "day"|"night" string.
// Per-planet sect_status is on each PlanetData.sect_status field.
export type SectData = string;

export interface DispositorData {
  chains: Record<string, string[]>;
  mutual_receptions: string[][];
  final_dispositors: string[];
  dispositor: Record<string, string | null>;
}

export interface PatternData {
  has_grand_trine: boolean;
  has_t_square: boolean;
  has_grand_cross: boolean;
  has_yod: boolean;
  has_stellium: boolean;
  has_kite: boolean;
  has_mystic_rectangle: boolean;
}

export interface ChartMetadata {
  date: string;
  time: string;
  lat: number;
  lon: number;
  utc: number;
  julian: boolean;
  jd: number;
  houses_system: string;
}

export interface ChartAnalysis {
  shape: 'bundle' | 'bowl' | 'bucket' | 'locomotive' | 'seesaw' | 'splash' | 'splay';
  spread_deg: number;
  max_gap_deg: number;
  element_scores: Record<string, number>;
  dominant_element: 'fire' | 'earth' | 'air' | 'water';
  modality_scores: Record<string, number>;
  dominant_modality: 'cardinal' | 'fixed' | 'mutable';
  unaspected_planets: string[];
}

export interface NatalChart {
  metadata: ChartMetadata;
  planets: Record<string, PlanetData>;
  houses: Record<string, HouseData>;
  aspects: AspectData[];
  patterns: PatternData;
  dignities: Record<string, DignityData>;
  lunar_phase: LunarPhase;
  arabic_parts: Record<string, ArabicPart>;
  sect?: SectData;
  dispositors?: DispositorData;
  fixed_stars?: FixedStar[];
  chart_analysis?: ChartAnalysis;
  mutual_receptions?: string[][];
}

export interface SynastryResult {
  chart1: NatalChart;
  chart2: NatalChart;
  aspects: AspectData[];
  score: {
    harmony: number;
    challenge: number;
    attraction: number;
    communication: number;
    total_score: number;
  };
}

export interface BirthInput {
  date: string;     // YYYY-MM-DD
  time: string;     // HH:MM
  lat: number;
  lon: number;
  utc: number;
  name?: string;
}

export const PLANET_SYMBOLS: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  node: '☊', chiron: '⚷', lilith: '⚸',
};

export const PLANET_NAMES: Record<string, string> = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune',
  pluto: 'Pluto', node: 'North Node', chiron: 'Chiron', lilith: 'Lilith',
};

export const ASPECT_SYMBOLS: Record<string, string> = {
  conjunction: '☌', opposition: '☍', trine: '△', square: '□',
  sextile: '⚹', quincunx: '⚻', semisextile: '⚺', semisquare: '∠',
  sesquisquare: '⚼', quintile: 'Q', biquintile: 'bQ',
  parallel: '∥', contra_parallel: '⊬',
};

export const SIGN_COLORS: Record<string, string> = {
  aries: '#ef4444', taurus: '#22c55e', gemini: '#eab308', cancer: '#3b82f6',
  leo: '#f97316', virgo: '#84cc16', libra: '#ec4899', scorpio: '#8b5cf6',
  sagittarius: '#f59e0b', capricorn: '#64748b', aquarius: '#06b6d4', pisces: '#a855f7',
};

export const SIGN_ELEMENTS: Record<string, string> = {
  aries: 'fire', taurus: 'earth', gemini: 'air', cancer: 'water',
  leo: 'fire', virgo: 'earth', libra: 'air', scorpio: 'water',
  sagittarius: 'fire', capricorn: 'earth', aquarius: 'air', pisces: 'water',
};
