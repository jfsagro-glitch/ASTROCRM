// ─── DailyJournalCard — morning intention + evening reflection + mood ───────
// Саморитуал "день" (см. Q2 roadmap, Epic 3).
// Load/save per (userId, date) via /api/journal.  Auto-save on blur (debounced).
import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Sun, Moon, Heart, Check, Loader2, Flame } from 'lucide-react';
import {
  upsertEntry, getEntry, getStats,
  type DayEntry, type DayEntryStored, type JournalStats,
} from '../services/journalService';

interface Props {
  userId?: string;
  date?: string;   // YYYY-MM-DD; default = today
}

const MOOD_LABELS = ['Ужасно', 'Плохо', 'Так-сяк', 'Хорошо', 'Отлично'];
const MOOD_EMOJI  = ['😞', '😕', '😐', '🙂', '😄'];

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function DailyJournalCard({ userId, date }: Props) {
  const activeDate = date || todayISO();

  const [entry, setEntry] = useState<DayEntry>({
    user_id: userId ?? null,
    date: activeDate,
    morning_note: '',
    evening_note: '',
    mood: null,
    gratitude: '',
    tags: [],
  });
  const [stored, setStored] = useState<DayEntryStored | null>(null);
  const [stats, setStats] = useState<JournalStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load on mount + refresh stats ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const [e, s] = await Promise.all([
          getEntry(activeDate, userId).catch(() => null),
          getStats(userId, 30).catch(() => null),
        ]);
        if (cancelled) return;
        if (e) {
          setEntry({
            user_id:      e.user_id ?? null,
            date:         e.date,
            morning_note: e.morning_note || '',
            evening_note: e.evening_note || '',
            mood:         e.mood ?? null,
            gratitude:    e.gratitude || '',
            tags:         e.tags || [],
          });
          setStored(e);
        }
        if (s) setStats(s);
      } catch {
        if (!cancelled) setError('Не удалось загрузить запись');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeDate, userId]);

  // ─── Save (debounced) ───────────────────────────────────────────────────
  const save = useCallback(async (partial: Partial<DayEntry>) => {
    setSaving(true); setError(null);
    const next: DayEntry = { ...entry, ...partial };
    setEntry(next);
    try {
      const res = await upsertEntry(next);
      setStored(res);
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1500);
      // refresh streak stats in background (non-blocking)
      getStats(userId, 30).then(setStats).catch(() => { /* noop */ });
    } catch (e) {
      setError((e as Error).message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }, [entry, userId]);

  const scheduleSave = useCallback((partial: Partial<DayEntry>) => {
    setEntry(e => ({ ...e, ...partial }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      // fire with latest state — re-read inside save via closure trick:
      void save(partial);
    }, 800);
  }, [save]);

  const onBlurSave = useCallback(() => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    void save({});
  }, [save]);

  const setMood = useCallback((m: number) => {
    void save({ mood: entry.mood === m ? null : m });
  }, [entry.mood, save]);

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <section
      aria-label="Дневник дня"
      className="card-lift rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 sm:p-6"
    >
      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-amber-300" aria-hidden="true" />
          <h2 className="m-0 text-base sm:text-lg font-semibold text-white">Ритуал дня</h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/60">
          {stats && stats.streak > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-300" title={`Серия дней подряд: ${stats.streak}`}>
              <Flame size={14} aria-hidden="true" /> {stats.streak}
            </span>
          )}
          {stored && <span>✓ сохранено</span>}
          {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
          {savedTick && !saving && <Check size={14} className="text-emerald-400" aria-hidden="true" />}
        </div>
      </header>

      {loading ? (
        <div className="py-6 flex items-center justify-center text-white/60">
          <Loader2 size={18} className="animate-spin mr-2" aria-hidden="true" />
          Загружаем запись…
        </div>
      ) : (
        <div className="space-y-5">
          {/* Morning intention */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
              <Sun size={14} className="text-amber-300" aria-hidden="true" />
              Утренняя интенция
            </label>
            <textarea
              value={entry.morning_note}
              onChange={e => scheduleSave({ morning_note: e.target.value })}
              onBlur={onBlurSave}
              rows={2}
              placeholder="Что сегодня главное? Одно намерение на день."
              className="w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900/40 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
            />
          </div>

          {/* Evening reflection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
              <Moon size={14} className="text-sky-300" aria-hidden="true" />
              Вечерняя рефлексия
            </label>
            <textarea
              value={entry.evening_note}
              onChange={e => scheduleSave({ evening_note: e.target.value })}
              onBlur={onBlurSave}
              rows={3}
              placeholder="Что удалось? Что разбудило? Что перенести?"
              className="w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900/40 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
            />
          </div>

          {/* Mood */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Самочувствие</span>
              <span className="text-xs text-white/60">
                {entry.mood ? `${MOOD_EMOJI[entry.mood - 1]} ${MOOD_LABELS[entry.mood - 1]}` : '—'}
              </span>
            </div>
            <div
              role="radiogroup"
              aria-label="Самочувствие: 1 ужасно, 5 отлично"
              className="grid grid-cols-5 gap-2"
            >
              {[1, 2, 3, 4, 5].map(m => {
                const active = entry.mood === m;
                return (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`${m} — ${MOOD_LABELS[m - 1]}`}
                    onClick={() => setMood(m)}
                    className={
                      'min-h-[44px] rounded-xl border text-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ' +
                      (active
                        ? 'border-amber-300 bg-amber-300/20 scale-105'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20')
                    }
                  >
                    {MOOD_EMOJI[m - 1]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gratitude */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
              <Heart size={14} className="text-rose-300" aria-hidden="true" />
              Благодарность
            </label>
            <input
              value={entry.gratitude}
              onChange={e => scheduleSave({ gratitude: e.target.value })}
              onBlur={onBlurSave}
              placeholder="За что сегодня «спасибо»?"
              className="w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900/40 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          {stats && stats.count > 0 && (
            <div className="pt-3 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/65">
              <span>Записей за 30 дн: <strong className="text-white/85">{stats.count}</strong></span>
              {stats.avg_mood !== null && (
                <span>
                  Средний mood: <strong className="text-white/85">{stats.avg_mood.toFixed(1)}</strong> / 5
                </span>
              )}
              <span>Серия: <strong className="text-amber-300">{stats.streak}</strong> дн.</span>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
              {error}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
