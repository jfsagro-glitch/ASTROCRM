// ─── WeeklyRibbon — next 7 days at-a-glance bars (idle-fetched) ──────────────
// Renders skeleton bars first; replaces with real day_score as each lazy fetch
// resolves. Reuses sessionStorage cache via getDashboard() to share with the
// idle-prefetch in DashboardView and avoid duplicate network.
import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { getDashboard } from '../services/astrologyService';
import type { BirthInput } from '../types/astro';

interface ThemeLike { card: string; header: string; accent: string; text: string; symbol: string; }
interface Props { birthData: BirthInput; theme: ThemeLike; days?: number; }

const WD = ['вс','пн','вт','ср','чт','пт','сб'];

function isoOffset(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function colorFor(score: number | null): string {
  if (score == null) return 'rgba(255,255,255,0.06)';
  if (score >= 65) return '#22c55e';
  if (score <= 40) return '#ef4444';
  return '#f59e0b';
}

export default function WeeklyRibbon({ birthData, theme, days = 7 }: Props) {
  const [scores, setScores] = useState<Array<number | null>>(() => Array(days).fill(null));

  useEffect(() => {
    let cancel = false;
    const dates = Array.from({ length: days }, (_, i) => isoOffset(i));

    // sequential, lightly throttled — keeps server gentle and lets bars
    // populate left-to-right (today first) with visible progress.
    (async () => {
      for (let i = 0; i < dates.length; i++) {
        if (cancel) return;
        try {
          const d = await getDashboard(birthData, dates[i]);
          if (cancel) return;
          setScores((prev) => {
            const next = prev.slice();
            next[i] = d.day_score ?? 50;
            return next;
          });
        } catch {
          // leave as null — bar will stay grey
        }
      }
    })();

    return () => { cancel = true; };
  }, [birthData, days]);

  const max = Math.max(...scores.filter((s): s is number => s != null), 70);

  return (
    <div className={`rounded-2xl border ${theme.card} p-3.5`}>
      <div className="flex items-center gap-2 mb-2.5">
        <CalendarDays size={14} className={theme.symbol} aria-hidden="true" />
        <h3 className={`text-sm font-semibold ${theme.header} m-0`}>Ближайшие {days} дней</h3>
      </div>
      <div className="flex items-end gap-1.5 h-20" aria-label="Прогноз дней вперёд">
        {scores.map((s, i) => {
          const date = new Date();
          date.setDate(date.getDate() + i);
          const wd = WD[date.getDay()];
          const dayNum = date.getDate();
          const isToday = i === 0;
          const h = s == null ? 28 : Math.max(20, Math.round((s / max) * 78));
          const c = colorFor(s);
          const tip = s == null
            ? `${wd} ${dayNum} — загрузка…`
            : `${wd} ${dayNum} — балл ${s}`;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group"
              title={tip}
              aria-label={tip}
            >
              <div
                className="w-full rounded-md transition-all"
                style={{
                  height: `${h}%`,
                  backgroundColor: c,
                  opacity: s == null ? 0.5 : 1,
                  boxShadow: isToday && s != null ? `0 0 8px ${c}88` : undefined,
                  border: isToday ? '1px solid rgba(255,255,255,0.35)' : undefined,
                }}
              />
              <div className="text-center leading-tight">
                <div className={`text-[10px] uppercase tracking-wider ${isToday ? theme.accent : `${theme.text} opacity-60`} font-semibold`}>
                  {isToday ? 'сег' : wd}
                </div>
                <div className={`text-[10px] ${theme.text} opacity-60 tabular-nums`}>{dayNum}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
