// ─── MoodPulse — inline daily mood logger (5 levels) ─────────────────────────
// One-tap save to journal API. Loads today's entry on mount; preserves notes.
import { useEffect, useState } from 'react';
import { upsertEntry, getEntry, type DayEntryStored } from '../services/journalService';
import { haptic } from '../hooks/useHaptic';

interface ThemeLike { card: string; header: string; accent: string; text: string; symbol: string; }
interface Props { theme: ThemeLike; userId?: string; }

const MOODS: Array<{ v: number; emoji: string; label: string }> = [
  { v: 1, emoji: '😞', label: 'тяжело' },
  { v: 2, emoji: '😐', label: 'так себе' },
  { v: 3, emoji: '🙂', label: 'норм' },
  { v: 4, emoji: '😊', label: 'хорошо' },
  { v: 5, emoji: '🤩', label: 'супер' },
];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function MoodPulse({ theme, userId }: Props) {
  const [entry, setEntry] = useState<DayEntryStored | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    getEntry(todayISO(), userId)
      .then((e) => { if (!cancel) setEntry(e); })
      .catch(() => { /* silent — keep empty state */ });
    return () => { cancel = true; };
  }, [userId]);

  async function pick(v: number) {
    haptic('select');
    setPending(v); setError(null);
    try {
      const saved = await upsertEntry({
        user_id:      userId ?? null,
        date:         todayISO(),
        morning_note: entry?.morning_note ?? '',
        evening_note: entry?.evening_note ?? '',
        mood:         v,
        gratitude:    entry?.gratitude ?? '',
        tags:         entry?.tags ?? [],
      });
      setEntry(saved);
      haptic('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
      haptic('error');
    } finally {
      setPending(null);
    }
  }

  const current = entry?.mood ?? null;

  return (
    <div className={`rounded-2xl border ${theme.card} p-3.5`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[11px] uppercase tracking-wider font-semibold ${theme.text} opacity-70`}>
          Как ты сейчас?
        </span>
        {current && (
          <span className={`ml-auto text-[10px] ${theme.text} opacity-50`}>
            записано
          </span>
        )}
      </div>
      <div role="radiogroup" aria-label="Настроение сегодня" className="flex gap-1.5 justify-between">
        {MOODS.map((m) => {
          const active = current === m.v;
          const busy = pending === m.v;
          return (
            <button
              key={m.v}
              role="radio"
              aria-checked={active}
              aria-label={`${m.label} (${m.v} из 5)`}
              disabled={busy}
              onClick={() => pick(m.v)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border transition-all min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                active
                  ? 'bg-white/15 border-white/30 scale-105'
                  : 'bg-white/4 border-white/10 hover:bg-white/8 active:scale-95'
              } ${busy ? 'opacity-60' : ''}`}
              title={m.label}
            >
              <span className="text-2xl leading-none" aria-hidden="true">{m.emoji}</span>
              <span className={`text-[9px] uppercase tracking-wide ${theme.text} ${active ? 'opacity-90 font-semibold' : 'opacity-50'}`}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-[11px] text-red-300 mt-2 m-0" role="alert">{error}</p>
      )}
    </div>
  );
}
