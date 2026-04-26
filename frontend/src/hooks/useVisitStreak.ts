// ─── useVisitStreak — count consecutive-day dashboard opens (localStorage) ───
// Pure-client, privacy-friendly. Resets if user skips a day.
import { useEffect, useState } from 'react';

const KEY = 'astrocrm:visit_streak';

interface State { last: string; streak: number; longest: number; }

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<State>;
      return {
        last:    typeof v.last === 'string' ? v.last : '',
        streak:  typeof v.streak === 'number' ? v.streak : 0,
        longest: typeof v.longest === 'number' ? v.longest : 0,
      };
    }
  } catch {/* ignore */}
  return { last: '', streak: 0, longest: 0 };
}

function write(s: State) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {/* ignore */}
}

export function useVisitStreak() {
  const [state, setState] = useState<State>(() => read());

  useEffect(() => {
    const today = todayISO();
    setState((prev) => {
      if (prev.last === today) return prev;
      const cont = prev.last === yesterdayISO();
      const next: State = {
        last: today,
        streak: cont ? prev.streak + 1 : 1,
        longest: Math.max(prev.longest, cont ? prev.streak + 1 : 1),
      };
      write(next);
      return next;
    });
  }, []);

  return state;
}
