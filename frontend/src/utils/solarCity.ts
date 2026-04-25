// ─── solarCity — per-user persistence of the Solar Return observation city ───
// Stored in localStorage keyed by a stable hash of birth identity
// (date + time + lat + lon), so each natal subject keeps its own SR city.
import type { BirthInput } from '../types/astro';

export interface ObsCity {
  name: string;
  lat:  number;
  lon:  number;
}

const STORAGE_KEY = 'holo_sr_obs_city_v1';

function birthKey(b: BirthInput): string {
  const lat = (b.lat ?? 0).toFixed(2);
  const lon = (b.lon ?? 0).toFixed(2);
  return `${b.date ?? ''}|${b.time ?? ''}|${lat},${lon}`;
}

function readStore(): Record<string, ObsCity> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch {
    return {};
  }
}

export function loadObsCity(birth: BirthInput): ObsCity | null {
  const store = readStore();
  return store[birthKey(birth)] ?? null;
}

export function saveObsCity(birth: BirthInput, city: ObsCity): void {
  try {
    const store = readStore();
    store[birthKey(birth)] = { name: city.name, lat: city.lat, lon: city.lon };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // quota / privacy mode — silently ignore
  }
}

export function clearObsCity(birth: BirthInput): void {
  try {
    const store = readStore();
    delete store[birthKey(birth)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* noop */
  }
}
