import type { BirthInput } from '../types/astro';
import type { HumanDesignResult } from '../types/humanDesign';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

export async function getHumanDesign(birth: BirthInput): Promise<HumanDesignResult> {
  const response = await fetch(`${API_URL}/human-design`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: birth.date,
      time: birth.time,
      lat: birth.lat,
      lon: birth.lon,
      utc: birth.utc,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || err.error || `HTTP ${response.status}`);
  }

  return response.json() as Promise<HumanDesignResult>;
}