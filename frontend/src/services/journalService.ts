// ─── journalService — DayEntry CRUD client ──────────────────────────────────
const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

export interface DayEntry {
  user_id?: string | null;
  date: string;           // YYYY-MM-DD
  morning_note: string;
  evening_note: string;
  mood?: number | null;   // 1..5
  gratitude: string;
  tags: string[];
}

export interface DayEntryStored extends DayEntry {
  created_at: string;
  updated_at: string;
}

export interface JournalStats {
  count: number;
  avg_mood: number | null;
  streak: number;
  window: number;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Journal API ${res.status}`);
  const data = await res.json();
  return data as T;
}

export async function upsertEntry(entry: DayEntry): Promise<DayEntryStored> {
  const res = await fetch(`${API_URL}/api/journal/upsert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  const data = await json<{ ok: boolean; entry: DayEntryStored }>(res);
  return data.entry;
}

export async function getEntry(date: string, userId?: string): Promise<DayEntryStored | null> {
  const qs = new URLSearchParams({ date });
  if (userId) qs.set('user_id', userId);
  const res = await fetch(`${API_URL}/api/journal/get?${qs}`);
  const data = await json<{ ok: boolean; entry: DayEntryStored | null }>(res);
  return data.entry;
}

export async function listEntries(opts: {
  userId?: string; start?: string; end?: string; limit?: number;
} = {}): Promise<DayEntryStored[]> {
  const qs = new URLSearchParams();
  if (opts.userId) qs.set('user_id', opts.userId);
  if (opts.start)  qs.set('start', opts.start);
  if (opts.end)    qs.set('end', opts.end);
  if (opts.limit)  qs.set('limit', String(opts.limit));
  const res = await fetch(`${API_URL}/api/journal/list?${qs}`);
  const data = await json<{ ok: boolean; entries: DayEntryStored[] }>(res);
  return data.entries;
}

export async function deleteEntry(date: string, userId?: string): Promise<number> {
  const qs = new URLSearchParams({ date });
  if (userId) qs.set('user_id', userId);
  const res = await fetch(`${API_URL}/api/journal/delete?${qs}`, { method: 'DELETE' });
  const data = await json<{ ok: boolean; removed: number }>(res);
  return data.removed;
}

export async function getStats(userId?: string, days = 30): Promise<JournalStats> {
  const qs = new URLSearchParams({ days: String(days) });
  if (userId) qs.set('user_id', userId);
  const res = await fetch(`${API_URL}/api/journal/stats?${qs}`);
  const data = await json<{ ok: boolean } & JournalStats>(res);
  return { count: data.count, avg_mood: data.avg_mood, streak: data.streak, window: data.window };
}
