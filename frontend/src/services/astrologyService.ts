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

// ─── Geocoding (Nominatim + Multi-source Timezone Resolution) ─────────────────
function _parseUtcOffset(s: string): number {
  const m = s.match(/([+-])(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] === '+' ? 1 : -1) * (parseInt(m[2]) + parseInt(m[3]) / 60);
}

async function _resolveTimezoneViaMethods(lat: number, lon: number): Promise<number> {
  // Method 1: GeoNames timezone lookup (Public API, works for most locations including Tiraspo)
  try {
    const geonamesRes = await fetchJsonWithTimeout(
      `https://secure.geonames.org/timezoneJSON?lat=${lat}&lng=${lon}&username=demo`,
      3000
    );
    if (geonamesRes.ok) {
      const data = await geonamesRes.json();
      if (data.dstOffset !== undefined && data.rawOffset !== undefined) {
        // Return base offset (corrected for DST if applicable)
        return (data.rawOffset + data.dstOffset) / 3600;
      }
    }
  } catch (e) {
    // GeoNames failed, try next method
  }

  // Method 2: Our backend timezone endpoint (if available)
  const timezoneApis = getTimezoneApiCandidates();
  for (const baseUrl of timezoneApis) {
    try {
      const tzRes = await fetchJsonWithTimeout(`${baseUrl}/timezone?lat=${lat}&lon=${lon}`, 3000);
      if (!tzRes.ok) continue;
      const tzData = await tzRes.json();
      const parsed = Number(tzData.utc_offset);
      if (Number.isFinite(parsed)) return parsed;
    } catch {
      // Continue to next method
    }
  }

  // Method 3: Open-Meteo timezone lookup (Reliable, no API key needed)
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

export async function geocodeCity(cityName: string): Promise<{
  lat: number; lon: number; utc: number; displayName: string;
}> {
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

  // Resolve UTC offset using multiple methods for reliability
  const utc = await _resolveTimezoneViaMethods(lat, lon);

  return {
    lat: Math.round(lat * 10000) / 10000,
    lon: Math.round(lon * 10000) / 10000,
    utc: Math.round(utc * 4) / 4, // Round to nearest 0.25 hours (15 min increments)
    displayName,
  };
}
