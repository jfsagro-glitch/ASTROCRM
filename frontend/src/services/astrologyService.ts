/**
 * HOLO Astrology Service — calls our FastAPI Python backend.
 * All AI/Gemini logic replaced with real astronomical calculations.
 */
import type { NatalChart, SynastryResult, BirthInput } from '../types/astro';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

async function fetchJsonWithTimeout(url: string, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function getTimezoneApiCandidates(): string[] {
  const out: string[] = [];
  if (API_URL) out.push(API_URL.replace(/\/$/, ''));
  if (typeof window !== 'undefined' && window.location?.origin) {
    const sameOrigin = window.location.origin.replace(/\/$/, '');
    if (!out.includes(sameOrigin)) out.push(sameOrigin);
  }
  return out;
}

async function post<T>(endpoint: string, body: object): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Natal chart ─────────────────────────────────────────────────────────────
export async function getNatalChart(b: BirthInput, houses = 'placidus'): Promise<NatalChart> {
  return post('/natal', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
    houses,
  });
}

// ─── Predictive ──────────────────────────────────────────────────────────────
export async function getTransits(b: BirthInput, targetDate: string, targetTime = '12:00') {
  return post('/predictive/transits', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
    target_date: targetDate,
    target_time: targetTime,
  });
}

export async function getEphemerides(startDate: string, days = 30, timeUtc = '12:00') {
  return post('/predictive/ephemerides', {
    start_date: startDate,
    days,
    time_utc: timeUtc,
  });
}

export async function getAstroSummary(targetDate: string, timeUtc = '12:00') {
  return post('/predictive/astrosummary', {
    target_date: targetDate,
    time_utc: timeUtc,
  });
}

export interface RectificationEventInput {
  type: string;
  date: string;
  time?: string;
}

export async function getRectification(
  b: BirthInput,
  events: RectificationEventInput[],
  rangeMinutes = 180,
) {
  return post('/predictive/rectification', {
    date: b.date,
    time: b.time,
    lat: b.lat,
    lon: b.lon,
    utc: b.utc,
    events,
    range_minutes: rangeMinutes,
    houses: 'placidus',
  });
}

export async function getEphemerisStatus(): Promise<{
  available: boolean; using_se_files: boolean; ephe_dir?: string;
  files?: Record<string, { exists: boolean; bytes: number }>;
}> {
  const res = await fetch(`${API_URL}/ephemeris/status`);
  if (!res.ok) return { available: false, using_se_files: false };
  return res.json();
}

export async function getSecondaryProgressions(b: BirthInput, targetDate: string) {
  return post('/predictive/secondary', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
    target_date: targetDate,
  });
}

export async function getSolarArc(b: BirthInput, targetDate: string) {
  return post('/predictive/solar-arc', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
    target_date: targetDate,
  });
}

export async function getTertiaryProgressions(b: BirthInput, targetDate: string) {
  return post('/predictive/tertiary', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
    target_date: targetDate,
  });
}

export async function getConverseProgressions(b: BirthInput, targetDate: string) {
  return post('/predictive/converse', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
    target_date: targetDate,
  });
}

export async function getSolarReturn(b: BirthInput, year: number, obsLat?: number, obsLon?: number) {
  return post('/predictive/solar-return', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
    target_date: `${year}-06-01`,
    target_lat: obsLat, target_lon: obsLon,
  });
}

export async function getLunarReturn(b: BirthInput, nearDate: string, obsLat?: number, obsLon?: number) {
  return post('/predictive/lunar-return', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
    target_date: nearDate,
    target_lat: obsLat, target_lon: obsLon,
  });
}

export async function getProfections(b: BirthInput, targetDate: string) {
  return post('/predictive/profections', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
    target_date: targetDate,
  });
}

export async function getPrenatalSyzygy(b: BirthInput) {
  return post('/predictive/prenatal-syzygy', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
  });
}

export async function getEclipses(startDate: string, count = 10) {
  return post('/predictive/eclipses', { start_date: startDate, count });
}

export async function getStations(planet: string, startDate: string, endDate: string) {
  return post('/predictive/stations', { planet, start_date: startDate, end_date: endDate });
}

export async function getIngress(year: number, sign: string, lat: number, lon: number) {
  return post('/predictive/ingress', { year, sign, lat, lon });
}

// ─── Synastry ─────────────────────────────────────────────────────────────────
export async function getSynastry(b1: BirthInput, b2: BirthInput): Promise<SynastryResult> {
  return post('/synastry/aspects', {
    date1: b1.date, time1: b1.time, lat1: b1.lat, lon1: b1.lon, utc1: b1.utc,
    date2: b2.date, time2: b2.time, lat2: b2.lat, lon2: b2.lon, utc2: b2.utc,
  });
}

export async function getCompositeChart(b1: BirthInput, b2: BirthInput) {
  return post('/synastry/composite', {
    date1: b1.date, time1: b1.time, lat1: b1.lat, lon1: b1.lon, utc1: b1.utc,
    date2: b2.date, time2: b2.time, lat2: b2.lat, lon2: b2.lon, utc2: b2.utc,
  });
}

export async function getDavisonChart(b1: BirthInput, b2: BirthInput) {
  return post('/synastry/davison', {
    date1: b1.date, time1: b1.time, lat1: b1.lat, lon1: b1.lon, utc1: b1.utc,
    date2: b2.date, time2: b2.time, lat2: b2.lat, lon2: b2.lon, utc2: b2.utc,
  });
}

// ─── Relocation ──────────────────────────────────────────────────────────────
export async function getRelocatedChart(b: BirthInput, newLat: number, newLon: number) {
  return post('/relocation/chart', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
    new_lat: newLat, new_lon: newLon,
  });
}

export async function getACGLines(b: BirthInput) {
  return post('/relocation/acg', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
  });
}

export async function getLocalSpace(b: BirthInput, obsLat: number, obsLon: number) {
  return post('/relocation/local-space', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
    new_lat: obsLat, new_lon: obsLon,
  });
}

export async function getParans(b: BirthInput, observerLat: number) {
  return post('/relocation/parans', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
    new_lat: observerLat, new_lon: b.lon,
  });
}

// ─── Interaction + Relocation Scenarios ──────────────────────────────────────

export interface InteractionPersonInput {
  date: string; time: string; lat: number; lon: number; utc: number;
  name?: string; houses?: string; julian?: boolean;
  current_lat?: number; current_lon?: number;
}

export interface LocationInput { name: string; lat: number; lon: number; }

export async function compareScenarios(
  subject: InteractionPersonInput,
  partner: InteractionPersonInput,
  periodStart: string,
  periodEnd: string,
  locations: LocationInput[],
  goal = 'overall',
  stayDays = 90,
  partnerType = 'romantic',
) {
  return post('/interaction/compare-scenarios', {
    subject: { ...subject, houses: subject.houses ?? 'placidus', julian: subject.julian ?? false },
    partner: { ...partner, houses: partner.houses ?? 'placidus', julian: partner.julian ?? false },
    period: { start: periodStart, end: periodEnd },
    locations,
    goal,
    stay_days: stayDays,
    partner_type: partnerType,
  });
}

export async function getPersonalForecastInteraction(
  subject: InteractionPersonInput,
  partner: InteractionPersonInput,
  periodStart: string,
  periodEnd: string,
  topics?: string[],
) {
  return post('/interaction/personal-forecast', {
    subject_person: { ...subject, houses: subject.houses ?? 'placidus', julian: subject.julian ?? false },
    influencer_person: { ...partner, houses: partner.houses ?? 'placidus', julian: partner.julian ?? false },
    period: { start: periodStart, end: periodEnd },
    topics: topics ?? ['love', 'career', 'money', 'emotional_state', 'decisions'],
  });
}

// ─── Geocoding (Nominatim + Multi-source Timezone Resolution) ─────────────────
function _parseUtcOffset(s: string): number {
  const m = s.match(/([+-])(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] === '+' ? 1 : -1) * (parseInt(m[2]) + parseInt(m[3]) / 60);
}

async function _resolveTimezoneViaMethods(
  lat: number,
  lon: number,
  date?: string,
  time?: string,
): Promise<number> {
  // Method 1: Our backend timezone endpoint — supports historical DST via pytz
  // Prioritize this when date is provided because external APIs return current-time offset only
  const timezoneApis = getTimezoneApiCandidates();
  for (const baseUrl of timezoneApis) {
    try {
      let url = `${baseUrl}/timezone?lat=${lat}&lon=${lon}`;
      if (date) url += `&date=${encodeURIComponent(date)}`;
      if (time) url += `&time=${encodeURIComponent(time)}`;
      const tzRes = await fetchJsonWithTimeout(url, 3000);
      if (!tzRes.ok) continue;
      const tzData = await tzRes.json();
      const parsed = Number(tzData.utc_offset);
      if (Number.isFinite(parsed)) return parsed;
    } catch {
      // Continue to next method
    }
  }

  // Method 2: GeoNames timezone lookup (returns current-time offset — acceptable fallback)
  try {
    const geonamesRes = await fetchJsonWithTimeout(
      `https://secure.geonames.org/timezoneJSON?lat=${lat}&lng=${lon}&username=demo`,
      3000
    );
    if (geonamesRes.ok) {
      const data = await geonamesRes.json();
      if (data.dstOffset !== undefined && data.rawOffset !== undefined) {
        return (data.rawOffset + data.dstOffset) / 3600;
      }
    }
  } catch (e) {
    // GeoNames failed, try next method
  }

  // Method 3: Open-Meteo timezone lookup (Reliable, no API key needed; returns current-time offset)
  try {
    const openMeteoRes = await fetchJsonWithTimeout(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto`,
      3000
    );
    if (openMeteoRes.ok) {
      const data = await openMeteoRes.json();
      if (data.timezone) {
        // Parse timezone string like "Europe/Chisinau" to UTC offset
        const formatter = new Intl.DateTimeFormat('en', {
          timeZone: data.timezone,
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
        const now = new Date();
        const localStr = formatter.format(now);
        const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
        const localDate = new Date(localStr);
        const diffMs = localDate.getTime() - utcDate.getTime();
        return diffMs / (3600 * 1000);
      }
    }
  } catch (e) {
    // Open-Meteo failed
  }

  // Fallback: return 0 (UTC)
  return 0;
}

export async function geocodeCity(
  cityName: string,
  date?: string,
  time?: string,
): Promise<{ lat: number; lon: number; utc: number; displayName: string }> {
  const geoRes = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`,
    { headers: { 'User-Agent': 'HOLO-AstroCRM/1.0', 'Accept-Language': 'en' } },
  );
  if (!geoRes.ok) throw new Error('Geocoding service unavailable');
  const geoData = await geoRes.json();
  if (!Array.isArray(geoData) || !geoData.length) throw new Error('City not found');

  const lat = parseFloat(geoData[0].lat);
  const lon = parseFloat(geoData[0].lon);
  const parts = (geoData[0].display_name as string).split(',');
  const displayName = parts.slice(0, 2).join(',').trim();

  // Resolve UTC offset — pass birth date/time for historically-correct DST handling
  const utc = await _resolveTimezoneViaMethods(lat, lon, date, time);

  return {
    lat: Math.round(lat * 10000) / 10000,
    lon: Math.round(lon * 10000) / 10000,
    utc: Math.round(utc * 4) / 4, // Round to nearest 0.25 hours (15 min increments)
    displayName,
  };
}

/**
 * Re-resolve the historical UTC offset for existing lat/lon coordinates when the birth
 * date or time changes. This is the key fix for historical DST cases (e.g. USSR 1986).
 */
export async function resolveHistoricalTimezone(
  lat: number,
  lon: number,
  date: string,
  time: string,
): Promise<number> {
  const utc = await _resolveTimezoneViaMethods(lat, lon, date, time);
  return Math.round(utc * 4) / 4;
}

// ─── Jyotish (Vedic Astrology) ────────────────────────────────────────────────
export async function getJyotish(b: BirthInput): Promise<Record<string, unknown>> {
  return post('/jyotish', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
  });
}

// ─── Lunar Calendar ───────────────────────────────────────────────────────────
export async function getLunarCalendar(
  date?: string,
  days = 28,
  utc = 0,
  lat = 0,
  lon = 0,
): Promise<{
  start_date: string;
  days: number;
  calendar: LunarDay[];
}> {
  const params = new URLSearchParams({
    days: String(days),
    utc: String(utc),
    lat: String(lat),
    lon: String(lon),
  });
  if (date) params.set('date', date);
  const res = await fetch(`${API_URL}/lunar-calendar?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export interface LunarMansion {
  number: number;
  name: string;
  nature: 'benefic' | 'malefic' | 'mixed';
  name_ru: string;
  keyword: string;
  theme: string;
  do: string[];
  avoid: string[];
}

export interface LunarDay {
  date: string;
  weekday: string;
  moon_lon: number;
  moon_sign: string;
  moon_degree: number;
  phase_angle: number;
  phase: string;
  is_critical_degree: boolean;
  void_of_course: boolean;
  voc_end_sign: string | null;
  mansion: LunarMansion;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardData {
  target_date: string;
  moon: {
    sign: string;
    degree: number;
    phase: string;
    phase_angle: number;
    illumination?: number;
    is_void: boolean;
    void_end_sign: string | null;
    mansion: LunarMansion;
  };
  top_transits: Array<{
    transit_planet: string;
    natal_planet: string;
    aspect: string;
    orb: number;
    applying: boolean;
    nature?: 'benefic' | 'malefic' | 'mixed';
    compensatory_hint?: {
      tension_signal: string;
      top_practice: Record<string, unknown> | null;
    };
  }>;
  compensatory: Record<string, unknown>;
  firdaria: Record<string, unknown>;
  profections: Record<string, unknown>;
  fortune_today: { lon?: number; sign?: string; deg_min?: string };
  arabic_natal: Record<string, unknown>;
  retrograde_planets?: Array<{ planet: string; sign: string; degree: number }>;
  day_score?: number;
  sphere_scores?: { love: number; work: number; finance: number; health: number; creative: number };
  next_lunation?: { full_moon: string; new_moon: string; days_to_full: number; days_to_new: number };
  chart_analysis?: Record<string, unknown>;
  natal_essence?: {
    sun?:     { sign?: string; house?: number; deg_min?: string };
    moon?:    { sign?: string; house?: number; deg_min?: string };
    mercury?: { sign?: string; house?: number };
    venus?:   { sign?: string; house?: number };
    mars?:    { sign?: string; house?: number };
    asc?:     { sign?: string; lon?: number };
    mc?:      { sign?: string; lon?: number };
    sect?:    string | null;
  };
}

export async function getDashboard(b: BirthInput, targetDate?: string): Promise<DashboardData> {
  return post('/dashboard', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
    target_date: targetDate ?? new Date().toISOString().slice(0, 10),
  });
}

// ── Asteroids & Lilith Extended ───────────────────────────────────────────────

export interface AsteroidEntry {
  lon: number;
  sign: string;
  deg_in_sign: number;
  deg_min: string;
  retrograde: boolean;
  speed: number;
  name_ru?: string;
  keyword?: string;
}

export interface AsteroidsData {
  date: string;
  asteroids: Record<string, AsteroidEntry>;
  unavailable: string[];
  note: string;
}

export interface LilithEntry {
  lon: number;
  sign: string;
  deg_in_sign: number;
  deg_min: string;
  description: string;
}

export interface LilithExtendedData {
  date: string;
  lilith: { mean: LilithEntry; true: LilithEntry; interpolated: LilithEntry };
}

export async function getAsteroids(b: BirthInput): Promise<AsteroidsData> {
  return post('/natal/asteroids', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
  });
}

export async function getLilithExtended(b: BirthInput): Promise<LilithExtendedData> {
  return post('/natal/lilith-extended', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
  });
}

// ── Numerology / Kabbalah ─────────────────────────────────────────────────────

export interface LifePathData {
  number: number;
  day_reduced: number;
  month_reduced: number;
  year_reduced: number;
  total_before_reduction: number;
  is_master: boolean;
  meaning: string;
}

export interface PersonalYearData {
  current_year: number;
  personal_year: number;
  theme: string;
  next_year: number;
  next_theme: string;
  '9year_cycle': Array<{ year: number; py: number; theme: string }>;
}

export interface TikkunData {
  tikkun_number: number;
  angel: string;
  zodiac_lon: number;
  sign: string;
  degree_in_sign: number;
  description: string;
}

export interface KabbalahData {
  number: number;
  raw_sum: number;
  letters: string;
  meaning: string;
}

export interface SephirahEntry {
  sephirah: string;
  number: number;
  planet: string;
  sign: string;
  lon: number;
  pillar: string;
  theme: string;
}

export interface TreeOfLifeData {
  active_sephiroth: Record<string, SephirahEntry>;
  vacant_sephiroth: string[];
  pillar_counts: { right: number; left: number; middle: number };
  dominant_pillar: string;
  dominant_label: string;
  balance_comment: string;
}

export interface NumerologyProfile {
  life_path: LifePathData;
  personal_year: PersonalYearData;
  tikkun: TikkunData;
  kabbalah?: KabbalahData;
  tree_of_life?: TreeOfLifeData;
}

export async function getNumerologyProfile(
  b: BirthInput,
  name = '',
  natalChart?: object,
): Promise<NumerologyProfile> {
  return post('/numerology/profile', {
    date: b.date,
    name,
    current_year: new Date().getFullYear(),
    natal_chart: natalChart ?? null,
  });
}

// ─── Daily Personal ───────────────────────────────────────────────────────────

export interface DailyTransitAspect {
  transit_planet: string;
  natal_planet: string;
  aspect: string;
  orb: number;
  applying: boolean;
  transit_sign?: string;
  natal_sign?: string;
}

export interface DailyMoonInfo {
  sign: string;
  degree: number;
  phase: string;
  phase_angle: number;
  void_of_course: {
    is_void: boolean;
    moon_sign: string;
    void_duration_hours?: number;
    void_end_sign?: string;
    last_aspect?: { planet: string; aspect: string };
  } | null;
}

export interface DailyPersonalResult {
  name: string | null;
  birth_date: string;
  target_date: string;
  moon: DailyMoonInfo;
  top_transits: DailyTransitAspect[];
  profection: {
    age?: number;
    profected_house?: number;
    lord_of_year?: string;
  };
  firdaria: {
    current_period?: { planet: string; start: string; end: string };
    current_sub?: { planet: string; start: string; end: string };
  };
  advice: Array<{ category: string; text: string; depth: string }>;
}

export async function getDailyPersonal(
  b: BirthInput,
  targetDate?: string,
): Promise<DailyPersonalResult> {
  return post('/daily/personal', {
    date: b.date,
    time: b.time,
    lat: b.lat,
    lon: b.lon,
    utc: b.utc,
    name: b.name ?? '',
    target_date: targetDate ?? null,
  });
}

// ─── Ingress Calendar ─────────────────────────────────────────────────────────

export interface PlanetaryIngress {
  planet: string;
  sign: string;
  sign_idx: number;
  jd: number;
  datetime_utc: string;
}

export interface IngressCalendarResult {
  year: number;
  planets: string[];
  count: number;
  ingresses: PlanetaryIngress[];
}

export async function getIngressCalendar(
  year: number,
  planets = 'sun,mercury,venus,mars,jupiter,saturn',
  includeMoon = false,
): Promise<IngressCalendarResult> {
  const params = new URLSearchParams({
    year: String(year),
    planets,
    include_moon: String(includeMoon),
  });
  const res = await fetch(`${API_URL}/ephemeris/ingress-calendar?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── VoC Windows ─────────────────────────────────────────────────────────────

export interface VoCWindow {
  is_void: boolean;
  moon_sign: string;
  void_start_jd: number;
  void_end_jd?: number;
  void_end_sign?: string;
  void_duration_hours?: number;
  last_aspect?: { planet: string; aspect: string } | null;
}

export interface VoCWindowsResult {
  query_date: string;
  query_time: string;
  utc_offset: number;
  windows_returned: number;
  windows: VoCWindow[];
}

export async function getVoCWindows(
  b: BirthInput,
  date?: string,
  count = 5,
): Promise<VoCWindowsResult> {
  return post('/natal/void-of-course', {
    date: date ?? b.date,
    time: '12:00',
    utc: b.utc,
    lat: b.lat,
    lon: b.lon,
    count,
    look_ahead: 30,
  });
}

// ── Saturn Cycle ─────────────────────────────────────────────────────────────

export interface SaturnMilestone {
  type: string;          // "conjunction" | "square_1" | "opposition" | "square_2"
  angle: number;
  label: string;
  description: string;
  date_utc: string;
  age_years: number;
  age_display: string;
  saturn_sign: string;
  saturn_lon: number;
  orb_at_exact: number;
  cycle_number: number;
}

export interface SaturnCycleResult {
  type: 'saturn_cycle';
  natal_saturn_lon: number;
  natal_saturn_sign: string;
  natal_saturn_deg: string;
  natal_saturn_glyph: string;
  milestones: SaturnMilestone[];
  cycle_number: number;
  cycle_age_years: number;
  years_lived: number;
  current_phase: string;
  current_saturn_sign: string;
  current_saturn_lon: number;
  total_milestones: number;
}

export async function getSaturnCycle(
  b: BirthInput,
  maxAge = 90,
): Promise<SaturnCycleResult> {
  return post('/predictive/saturn-cycle', {
    date: b.date,
    time: b.time ?? '12:00',
    lat: b.lat ?? 0,
    lon: b.lon ?? 0,
    utc: b.utc ?? 0,
    max_age: maxAge,
  });
}

// ── Heliocentric Chart ───────────────────────────────────────────────────────

export interface HeliocentricPlanet {
  lon: number;
  sign: string;
  deg_in_sign: number;
  deg_min: string;
  lat?: number;
  dist_au?: number;
  speed?: number;
  retrograde?: boolean;
}

export interface HeliocentricAspect {
  planet1: string;
  planet2: string;
  aspect: string;
  glyph: string;
  orb: number;
  angle: number;
}

export interface HeliocentricResult {
  type: 'heliocentric';
  method: 'swiss_ephemeris' | 'approximate';
  jd_ut: number;
  metadata: {
    date: string;
    time: string;
    utc: number;
    lat: number;
    lon: number;
    note: string;
  };
  planets: Record<string, HeliocentricPlanet>;
  aspects: HeliocentricAspect[];
}

export async function getHeliocentricChart(b: BirthInput): Promise<HeliocentricResult> {
  return post('/heliocentric', {
    date: b.date,
    time: b.time ?? '12:00',
    lat: b.lat ?? 0,
    lon: b.lon ?? 0,
    utc: b.utc ?? 0,
  });
}

// ── Kabbalah Tree Mapping ─────────────────────────────────────────────────────

export interface TreeSephirah {
  number: number;
  name: string;
  planet?: string;
  sign?: string;
  pillar: string;   // "left" | "middle" | "right"
}

export interface TreeOfLifeResult {
  type: 'tree_of_life';
  date: string;
  tree: {
    active_sephiroth: TreeSephirah[];
    vacant_sephiroth: Array<{ number: number; name: string; pillar: string }>;
    pillar_balance: { left: number; middle: number; right: number };
    dominant_pillar: string;
    balance_comment: string;
    planet_sephirah: Record<string, { sephirah: string; number: number }>;
  };
  metadata?: Record<string, unknown>;
}

export async function getTreeOfLife(b: BirthInput): Promise<TreeOfLifeResult> {
  return post('/kabbalah/tree-mapping', {
    date: b.date,
    time: b.time ?? '12:00',
    lat: b.lat ?? 0,
    lon: b.lon ?? 0,
    utc: b.utc ?? 0,
  });
}

// ── Compensatory Practices ────────────────────────────────────────────────────

export interface CompensatoryPractice {
  emoji: string;
  text: string;
  category?: string;
}

export interface CompensatoryTransit {
  planet: string;
  sign: string;
  function: string;
  tension_signal: string;
  practices: CompensatoryPractice[] | string[];
}

export interface CompensatoryAspectPair {
  pair: string;
  name: string;
  image: string;
  tension: string;
  context: string;
  practices: CompensatoryPractice[] | string[];
}

export interface CompensatoryBackground {
  key: string;
  title: string;
  theme: string;
  practice: string;
}

export interface CompensatoryReport {
  target_date: string;
  intensity: string;
  context: string | null;
  opening: string;
  background: { active: CompensatoryBackground[] };
  sun_sign_note: {
    sign: string;
    strength?: string;
    challenge?: string;
    daily?: string;
  };
  active_transits: CompensatoryTransit[];
  aspect_pairs: CompensatoryAspectPair[];
}

export async function getCompensatoryPractices(
  birth: BirthInput,
  targetDate?: string,
  intensity: 'light' | 'medium' | 'deep' = 'medium',
  context?: string,
): Promise<CompensatoryReport> {
  const today = new Date().toISOString().split('T')[0];
  return post('/compensatory/practices', {
    date: birth.date,
    time: birth.time ?? '12:00',
    lat: birth.lat ?? 0,
    lon: birth.lon ?? 0,
    utc: birth.utc ?? 0,
    target_date: targetDate ?? today,
    target_time: '12:00',
    intensity,
    context: context ?? null,
  });
}

// ── 72 Angels of the Shemhamphorash ──────────────────────────────────────────

export interface ShemAngel {
  planet: string;
  lon: number;
  sign: string;
  angel_number: number;
  angel_name: string;
  hebrew: string;
  decan_planet: string;
  tarot_card: string;
  theme: string;
}

export interface Angels72Result {
  date: string;
  natal_angels: Record<string, ShemAngel>;
  tikkun_angel: {
    tikkun_number: number;
    angel: string;
    zodiac_lon: number;
    sign: string;
    degree_in_sign: number;
    description: string;
  };
  note: string;
}

export async function getAngels72(b: BirthInput): Promise<Angels72Result> {
  return post('/kabbalah/72-angels', {
    date: b.date,
    time: b.time ?? '12:00',
    lat: b.lat ?? 0,
    lon: b.lon ?? 0,
    utc: b.utc ?? 0,
  });
}

// ── Four Worlds of Kabbalah ───────────────────────────────────────────────────

export interface FourWorldInfo {
  name_ru: string;
  name_en: string;
  element: string;
  element_ru: string;
  hebrew_letter: string;
  soul_level: string;
  sephiroth: string[];
  planets: string[];
  theme: string;
  questions: string[];
  practice: string;
}

export interface FourWorldsResult {
  date: string;
  worlds_balance: Record<string, number>;
  worlds_percent: Record<string, number>;
  dominant_world: string;
  dominant_world_data: FourWorldInfo;
  planets_by_world: Record<string, Array<{ planet: string; sephirah: string; lon: number; sign: string }>>;
  world_descriptions: Record<string, FourWorldInfo>;
  interpretation: string;
}

export async function getFourWorlds(b: BirthInput): Promise<FourWorldsResult> {
  return post('/kabbalah/four-worlds', {
    date: b.date,
    time: b.time ?? '12:00',
    lat: b.lat ?? 0,
    lon: b.lon ?? 0,
    utc: b.utc ?? 0,
  });
}

// ── Planetary Nodes ───────────────────────────────────────────────────────────

export interface PlanetaryNode {
  planet: string;
  north_node_lon: number;
  north_node_sign: string;
  north_node_degree: number;
  south_node_lon: number;
  south_node_sign: string;
  aspects_to_natal: Array<{ natal_planet: string; aspect: string; glyph: string; orb: number }>;
}

export interface PlanetaryNodesResult {
  date: string;
  time: string;
  nodes: Record<string, PlanetaryNode>;
  note: string;
}

export async function getPlanetaryNodes(b: BirthInput): Promise<PlanetaryNodesResult> {
  return post('/natal/planetary-nodes', {
    date: b.date,
    time: b.time ?? '12:00',
    lat: b.lat ?? 0,
    lon: b.lon ?? 0,
    utc: b.utc ?? 0,
  });
}

// ── Report Generation ─────────────────────────────────────────────────────────

export async function generateReportHtml(
  birth: BirthInput,
  name: string,
  depth: 'brief' | 'full' | 'professional' = 'full',
  targetDate?: string,
): Promise<string> {
  const today = new Date().toISOString().split('T')[0];
  const res = await fetch(`${API_URL}/report/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: birth.date,
      time: birth.time ?? '12:00',
      lat: birth.lat ?? 0,
      lon: birth.lon ?? 0,
      utc: birth.utc ?? 0,
      name,
      depth,
      format: 'html',
      target_date: targetDate ?? today,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.text();
}

// ── Sprint 6 — Personal Eclipse / Ingress / Global / Synastry Progressed ─────

export interface PersonalEclipse {
  type: 'solar' | 'lunar';
  eclipse_class: string;
  date_str: string;
  jd: number;
  sun_lon?: number;
  moon_lon?: number;
  natal_house: number;
  activated_theme: string;
  sign: string;
  compensatory?: unknown[];
}

export interface EclipsePersonalResult {
  natal_date: string;
  scan_from: string;
  eclipses: PersonalEclipse[];
  count: number;
  interpretation: string;
}

export async function getEclipsePersonal(
  b: BirthInput,
  count = 6,
  includeCompensatory = false,
): Promise<EclipsePersonalResult> {
  return post('/predictive/eclipse-personal', {
    date: b.date,
    time: b.time ?? '12:00',
    lat: b.lat ?? 0,
    lon: b.lon ?? 0,
    utc: b.utc ?? 0,
    count,
    include_compensatory: includeCompensatory,
  });
}

export interface PersonalIngress {
  sign: string;
  sign_ru: string;
  ingress_date: string;
  ingress_lon: number;
  natal_house: number;
  activated_theme: string;
}

export interface IngressPersonalResult {
  natal_date: string;
  year: number;
  ingresses: PersonalIngress[];
  interpretation: string;
}

export async function getIngressPersonal(
  b: BirthInput,
  year?: number,
): Promise<IngressPersonalResult> {
  return post('/predictive/ingress-personal', {
    date: b.date,
    time: b.time ?? '12:00',
    lat: b.lat ?? 0,
    lon: b.lon ?? 0,
    utc: b.utc ?? 0,
    year: year ?? null,
  });
}

export interface GlobalPlanetPos {
  planet: string;
  lon: number;
  sign: string;
  degree: number;
}

export interface GlobalMutualAspect {
  planet1: string;
  planet2: string;
  aspect: string;
  orb: number;
}

export interface DailyGlobalResult {
  date: string;
  time: string;
  utc_offset: number;
  planets: GlobalPlanetPos[];
  mutual_aspects: GlobalMutualAspect[];
  moon: {
    sign: string;
    degree: number;
    phase: string;
    phase_angle: number;
    is_void: boolean;
    void_end_sign?: string;
    mansion?: { number: number; name: string; nature: string };
  };
  sun: { sign: string; degree: number; fresh_ingress: boolean };
  upcoming_eclipses: PersonalEclipse[];
  interpretation: string;
}

export async function getDailyGlobal(date?: string): Promise<DailyGlobalResult> {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  const res = await fetch(`${API_URL}/daily/global?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface ProgressedAspect {
  planet1: string;
  planet2: string;
  aspect: string;
  orb: number;
  type: string;
}

export interface SynastryProgressedResult {
  target_date: string;
  name1: string;
  name2: string;
  progressed1: Record<string, unknown>;
  progressed2: Record<string, unknown>;
  aspects: {
    prog_x_prog: ProgressedAspect[];
    prog1_x_natal2: ProgressedAspect[];
    prog2_x_natal1: ProgressedAspect[];
    all_sorted: ProgressedAspect[];
  };
  interpretation: string;
}

export async function getSynastryProgressed(
  b1: BirthInput,
  b2: BirthInput,
): Promise<SynastryProgressedResult> {
  return post('/synastry/progressed', {
    date1: b1.date, time1: b1.time ?? '12:00',
    lat1: b1.lat ?? 0, lon1: b1.lon ?? 0, utc1: b1.utc ?? 0,
    name1: b1.name ?? '',
    date2: b2.date, time2: b2.time ?? '12:00',
    lat2: b2.lat ?? 0, lon2: b2.lon ?? 0, utc2: b2.utc ?? 0,
    name2: b2.name ?? '',
  });
}

export interface SignalWeightsPlanet {
  planet: string;
  reliability_weight: number;
  orbital_speed_deg_day: number;
  positional_uncertainty_5min_deg: number;
  max_transit_orb_deg: number;
  calibration_data: {
    n: number;
    mae_arcmin: number;
    sign_accuracy_pct: number;
    within1deg_pct: number;
  } | null;
}

export interface SignalWeightsResult {
  calibration_dataset: { total_charts: number; computed_charts: number; source: string };
  planet_reliability_weights: SignalWeightsPlanet[];
  aspect_weights: Array<{ aspect: string; base_weight: number; correction: number; calibrated_weight: number }>;
  planet_transit_max_orbs: Record<string, number>;
  methodology: string;
  version: string;
}

export async function getSignalWeights(): Promise<SignalWeightsResult> {
  const res = await fetch(`${API_URL}/calibration/signal-weights`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── ANNUAL PROFECTION ────────────────────────────────────────────────────────

export interface ProfectionCycleYear {
  year_offset: number;
  age: number;
  house: number;
  house_lon: number;
  sign: string;
  lord: string;
  is_current: boolean;
}

export interface ActivatedPlanet {
  planet: string;
  lon: number;
  sign: string;
}

export interface AnnualProfectionResult {
  type: string;
  age: number;
  annual_house: number;
  annual_sign: string;
  annual_lord: string;
  annual_lord_natal_lon: number | null;
  annual_lord_sign: string | null;
  monthly_house: number;
  monthly_sign: string;
  monthly_lord: string;
  months_into_year: number;
  house_theme: string;
  interpretation: string;
  cycle_12: ProfectionCycleYear[];
  activated_natal_planets: ActivatedPlanet[];
}

export async function getAnnualProfection(
  b: BirthInput,
  targetDate: string
): Promise<AnnualProfectionResult> {
  return post('/predictive/annual-profection', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
    target_date: targetDate,
  });
}

// ── COMPENSATORY FORECAST ───────────────────────────────────────────────────

export interface ForecastKeyTransit {
  transit_planet: string;
  natal_planet: string;
  aspect: string;
  orb: number;
  applying: boolean;
  transit_sign: string;
  natal_sign: string;
  nature: 'benefic' | 'malefic' | 'mixed';
}

export interface ForecastActivePractice {
  planet: string;
  sign: string;
  tension_signal: string;
  function: string;
  practices: Array<{ practice: string; why?: string; timing?: string }>;
}

export interface ForecastWindow {
  window: 'now' | 'near' | 'medium';
  label: string;
  sample_date: string;
  key_transits: ForecastKeyTransit[];
  active_transits: ForecastActivePractice[];
  aspect_pairs: Array<Record<string, unknown>>;
  opening: string;
  background: Record<string, unknown>;
}

export interface CompensatoryForecastResult {
  type: string;
  natal_date: string;
  windows: ForecastWindow[];
  horizon_months: number;
}

export async function getCompensatoryForecast(b: BirthInput): Promise<CompensatoryForecastResult> {
  return post('/predictive/compensatory-forecast', {
    date: b.date, time: b.time, lat: b.lat, lon: b.lon, utc: b.utc,
    target_date: new Date().toISOString().slice(0, 10),
  });
}
