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
  }>;
  compensatory: Record<string, unknown>;
  firdaria: Record<string, unknown>;
  profections: Record<string, unknown>;
  fortune_today: { lon?: number; sign?: string; deg_min?: string };
  arabic_natal: Record<string, unknown>;
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
  transiting_planet: string;
  natal_planet: string;
  aspect: string;
  orb: number;
  applying: boolean;
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
