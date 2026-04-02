/**
 * HOLO Astrology Service — calls our FastAPI Python backend.
 * All AI/Gemini logic replaced with real astronomical calculations.
 */
import type { NatalChart, SynastryResult, BirthInput } from '../types/astro';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

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

// ─── Geocoding (Nominatim + TimeAPI) ─────────────────────────────────────────
function _parseUtcOffset(s: string): number {
  const m = s.match(/([+-])(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] === '+' ? 1 : -1) * (parseInt(m[2]) + parseInt(m[3]) / 60);
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

  // Resolve UTC offset via our own backend (no CORS issues)
  let utc = 0;
  try {
    const tzRes = await fetch(`${API_URL}/timezone?lat=${lat}&lon=${lon}`);
    if (tzRes.ok) {
      const tzData = await tzRes.json();
      utc = typeof tzData.utc_offset === 'number' ? tzData.utc_offset : 0;
    }
  } catch { /* fall back to 0 */ }

  return {
    lat: Math.round(lat * 10000) / 10000,
    lon: Math.round(lon * 10000) / 10000,
    utc,
    displayName,
  };
}
