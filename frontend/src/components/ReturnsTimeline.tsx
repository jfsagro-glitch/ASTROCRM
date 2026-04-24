// ─── ReturnsTimeline — Solar + next 2 Lunar Returns on a compact horizontal line
// Q2 roadmap Epic 4: «Solar/Lunar Return Timeline».
// Рассчитывает ближайший Solar Return (следующий день рождения по солнечному
// возвращению) и 2 ближайших Lunar Returns (цикл ~27.3 дн) и визуализирует
// их на горизонтальной шкале с текущей датой посередине.
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sun, Moon, Calendar } from 'lucide-react';
import type { BirthInput } from '../types/astro';
import { getSolarReturn, getLunarReturn } from '../services/astrologyService';

interface Props {
  birth: BirthInput;
}

interface Event {
  kind: 'solar' | 'lunar';
  iso: string;        // YYYY-MM-DD
  label: string;
  daysFromNow: number;
  sign?: string;
  degMin?: string;
}

function parseReturnDate(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  // "2026-05-14 07:22 UTC"
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(aISO + 'T00:00:00Z').getTime();
  const b = new Date(bISO + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000);
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

const SIGN_RU: Record<string, string> = {
  Aries: 'Овен', Taurus: 'Телец', Gemini: 'Близнецы', Cancer: 'Рак',
  Leo: 'Лев', Virgo: 'Дева', Libra: 'Весы', Scorpio: 'Скорпион',
  Sagittarius: 'Стрелец', Capricorn: 'Козерог', Aquarius: 'Водолей', Pisces: 'Рыбы',
};

export default function ReturnsTimeline({ birth }: Props) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!birth.date || !birth.time) return;
    let cancelled = false;
    setLoading(true); setError(null);

    (async () => {
      try {
        const today = todayISO();
        const thisYear = Number(today.slice(0, 4));

        // Fetch SR for this year and next (pick whichever is in the future)
        const [sr1, sr2] = await Promise.all([
          getSolarReturn(birth, thisYear).catch(() => null),
          getSolarReturn(birth, thisYear + 1).catch(() => null),
        ]);

        const nextSolarIso = (() => {
          const iso1 = parseReturnDate((sr1 as Record<string, unknown>)?.sr_date_utc);
          const iso2 = parseReturnDate((sr2 as Record<string, unknown>)?.sr_date_utc);
          if (iso1 && iso1 >= today) return { iso: iso1, data: sr1 };
          if (iso2) return { iso: iso2, data: sr2 };
          return null;
        })();

        // Fetch 2 upcoming Lunar Returns (today + ~14 days seed, then +27d)
        const [lr1, lr2] = await Promise.all([
          getLunarReturn(birth, today).catch(() => null),
          getLunarReturn(birth, addDays(today, 27)).catch(() => null),
        ]);

        const out: Event[] = [];
        if (nextSolarIso) {
          const data = nextSolarIso.data as Record<string, unknown>;
          const sunInfo = (data?.planets as Record<string, { sign?: string; deg_min?: string }> | undefined)?.sun;
          out.push({
            kind:  'solar',
            iso:   nextSolarIso.iso,
            label: 'Solar Return',
            daysFromNow: daysBetween(today, nextSolarIso.iso),
            sign:   sunInfo?.sign,
            degMin: sunInfo?.deg_min,
          });
        }
        for (const raw of [lr1, lr2]) {
          const iso = parseReturnDate((raw as Record<string, unknown>)?.lr_date_utc)
                   ?? parseReturnDate((raw as Record<string, unknown>)?.return_date);
          if (!iso || iso < today) continue;
          if (out.some(e => e.kind === 'lunar' && e.iso === iso)) continue;
          const planets = (raw as Record<string, unknown>)?.planets as Record<string, { sign?: string; deg_min?: string }> | undefined;
          const moonInfo = planets?.moon;
          out.push({
            kind:  'lunar',
            iso,
            label: 'Lunar Return',
            daysFromNow: daysBetween(today, iso),
            sign:   moonInfo?.sign,
            degMin: moonInfo?.deg_min,
          });
        }
        out.sort((a, b) => a.daysFromNow - b.daysFromNow);
        if (!cancelled) setEvents(out);
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Не удалось рассчитать');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [birth.date, birth.time, birth.lat, birth.lon, birth.utc]);

  const { minDay, maxDay } = useMemo(() => {
    if (!events.length) return { minDay: 0, maxDay: 1 };
    const days = events.map(e => e.daysFromNow);
    return {
      minDay: Math.min(0, ...days),
      maxDay: Math.max(30, ...days),
    };
  }, [events]);

  return (
    <section
      aria-label="Таймлайн возвращений"
      className="card-lift rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5"
    >
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-amber-300" aria-hidden="true" />
          <h3 className="m-0 text-sm sm:text-base font-semibold text-white">Ближайшие возвращения</h3>
        </div>
        {loading && <Loader2 size={14} className="animate-spin text-white/50" aria-hidden="true" />}
      </header>

      {error && (
        <div className="text-xs text-red-300">{error}</div>
      )}

      {!loading && !events.length && !error && (
        <p className="text-xs text-white/60 m-0">Нет данных для расчёта — проверьте дату/время рождения.</p>
      )}

      {!!events.length && (
        <>
          {/* Timeline bar */}
          <div className="relative h-16 mt-2 mb-4" aria-hidden="true">
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
            {/* today marker */}
            {(() => {
              const pct = ((0 - minDay) / (maxDay - minDay)) * 100;
              return (
                <div
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/80 ring-4 ring-white/10"
                  style={{ left: `${pct}%` }}
                  title="Сегодня"
                />
              );
            })()}
            {events.map((e, i) => {
              const pct = ((e.daysFromNow - minDay) / (maxDay - minDay)) * 100;
              const isSolar = e.kind === 'solar';
              return (
                <div key={`${e.kind}-${e.iso}`} className="absolute top-0 bottom-0 -translate-x-1/2" style={{ left: `${pct}%` }}>
                  <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${isSolar ? 'bg-amber-300' : 'bg-sky-300'} ring-4 ${isSolar ? 'ring-amber-300/20' : 'ring-sky-300/20'}`} />
                  <div className={`absolute ${i % 2 === 0 ? 'top-0' : 'bottom-0'} text-[10px] whitespace-nowrap ${isSolar ? 'text-amber-300' : 'text-sky-300'}`}>
                    {e.iso.slice(5).replace('-', '.')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* List */}
          <ul className="space-y-2 m-0 p-0 list-none">
            {events.map(e => {
              const isSolar = e.kind === 'solar';
              return (
                <li key={`${e.kind}-${e.iso}`} className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-slate-900/40">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSolar ? 'bg-amber-400/20 text-amber-300' : 'bg-sky-400/20 text-sky-300'}`} aria-hidden="true">
                    {isSolar ? <Sun size={16} /> : <Moon size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-white">{e.label}</span>
                      <span className="text-xs text-white/60">
                        {e.daysFromNow === 0 ? 'сегодня'
                          : e.daysFromNow === 1 ? 'завтра'
                          : `через ${e.daysFromNow} дн.`}
                      </span>
                    </div>
                    <div className="text-xs text-white/70 mt-0.5">
                      {e.iso}
                      {e.sign && <span> · {SIGN_RU[e.sign] ?? e.sign}</span>}
                      {e.degMin && <span className="text-white/50"> {e.degMin}</span>}
                    </div>
                    <p className="text-[11px] text-white/60 mt-1 m-0 leading-relaxed">
                      {isSolar
                        ? 'Карта года: ключевая тема следующих 12 месяцев. Проведите день вдумчиво — как закладку сценария.'
                        : 'Месячная «луна-карта»: настроение и бытовые ритмы на ~27 дней. Отметьте доминанту эмоций.'}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
