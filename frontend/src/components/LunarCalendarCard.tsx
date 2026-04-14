// ─── LunarCalendarCard — 7-day or 28-day lunar calendar with mansions ─────────
import React, { useEffect, useState, useCallback } from 'react';
import { Moon, AlertTriangle, Info } from 'lucide-react';
import { getLunarCalendar } from '../services/astrologyService';
import type { LunarDay } from '../services/astrologyService';

interface ThemeLike {
  card: string;
  accent: string;
  text: string;
  header: string;
}

interface Props {
  theme: ThemeLike;
  utc?: number;
  lat?: number;
  lon?: number;
  days?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PHASE_EMOJI: Record<string, string> = {
  new_moon:       '🌑', waxing_crescent: '🌒', first_quarter: '🌓',
  waxing_gibbous: '🌔', full_moon:       '🌕', waning_gibbous: '🌖',
  last_quarter:   '🌗', waning_crescent: '🌘',
};

const SIGN_RU: Record<string, string> = {
  aries: 'Овен', taurus: 'Телец', gemini: 'Близнецы', cancer: 'Рак',
  leo: 'Лев', virgo: 'Дева', libra: 'Весы', scorpio: 'Скорпион',
  sagittarius: 'Стрелец', capricorn: 'Козерог', aquarius: 'Водолей', pisces: 'Рыбы',
};

const SIGN_GLYPH: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌', virgo: '♍',
  libra: '♎', scorpio: '♏', sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

const NATURE_COLOR: Record<string, string> = {
  benefic: 'text-emerald-400',
  malefic: 'text-red-400',
  mixed:   'text-amber-400',
};

const WEEKDAYS_SHORT_RU: Record<string, string> = {
  Monday: 'Пн', Tuesday: 'Вт', Wednesday: 'Ср', Thursday: 'Чт',
  Friday: 'Пт', Saturday: 'Сб', Sunday: 'Вс',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function LunarCalendarCard({ theme, utc = 0, lat = 0, lon = 0, days = 7 }: Props) {
  const [calendar, setCalendar] = useState<LunarDay[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<LunarDay | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await getLunarCalendar(today, days, utc, lat, lon);
      setCalendar(res.calendar);
      setSelected(res.calendar[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [days, utc, lat, lon]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className={`rounded-2xl border p-4 ${theme.card} flex items-center gap-2 text-sm ${theme.text}`}>
      <Moon size={16} className="animate-pulse" /> Загрузка лунного календаря…
    </div>
  );

  if (error) return (
    <div className={`rounded-2xl border p-4 ${theme.card} text-red-400 text-sm`}>
      ⚠ {error}
    </div>
  );

  if (!calendar.length) return null;

  return (
    <div className={`rounded-2xl border ${theme.card} overflow-hidden`}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 border-b border-white/10">
        <Moon size={16} className={theme.accent} />
        <span className={`text-sm font-medium ${theme.header}`}>Лунный календарь</span>
        <span className={`ml-auto text-xs ${theme.text} opacity-60`}>{days} дней</span>
      </div>

      {/* Day grid */}
      <div className="p-3 grid grid-cols-7 gap-1">
        {calendar.slice(0, 7).map(day => {
          const isSelected = selected?.date === day.date;
          const isToday    = day.date === new Date().toISOString().slice(0, 10);
          return (
            <button
              key={day.date}
              onClick={() => setSelected(day)}
              className={`
                flex flex-col items-center gap-0.5 rounded-xl p-1.5 text-center transition-all
                ${isSelected
                  ? 'bg-amber-400/20 ring-1 ring-amber-400/50'
                  : 'hover:bg-white/5'}
                ${day.void_of_course ? 'opacity-60' : ''}
              `}
            >
              <span className={`text-[10px] ${theme.text} opacity-50`}>
                {WEEKDAYS_SHORT_RU[day.weekday] ?? day.weekday.slice(0, 2)}
              </span>
              <span className={`text-[11px] font-medium ${isToday ? theme.accent : theme.text}`}>
                {day.date.slice(8)}
              </span>
              <span className="text-base leading-none">{PHASE_EMOJI[day.phase] ?? '🌙'}</span>
              <span className={`text-[10px] ${NATURE_COLOR[day.mansion.nature]}`}>
                {SIGN_GLYPH[day.moon_sign] ?? '?'}
              </span>
              {day.void_of_course && (
                <span className="text-[9px] text-amber-400 leading-none">VoC</span>
              )}
              {day.is_critical_degree && (
                <AlertTriangle size={8} className="text-orange-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selected && (
        <div className="border-t border-white/10 p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className={`text-sm font-medium ${theme.header}`}>
                {PHASE_EMOJI[selected.phase]} Луна в {SIGN_RU[selected.moon_sign] ?? selected.moon_sign}
                {' '}— {selected.moon_degree.toFixed(1)}°
              </div>
              <div className={`text-xs ${theme.text} opacity-70 mt-0.5`}>
                Мансия #{selected.mansion.number} — {selected.mansion.name_ru}
                {' '}· <span className={NATURE_COLOR[selected.mansion.nature]}>
                  {selected.mansion.nature === 'benefic' ? 'благоприятная' :
                   selected.mansion.nature === 'malefic' ? 'неблагоприятная' : 'смешанная'}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {selected.void_of_course && (
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full">
                  VoC{selected.voc_end_sign ? ` → ${SIGN_RU[selected.voc_end_sign] ?? selected.voc_end_sign}` : ''}
                </span>
              )}
              {selected.is_critical_degree && (
                <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle size={8} /> Критический °
                </span>
              )}
            </div>
          </div>

          {/* Mansion theme */}
          <div className={`text-xs ${theme.text} opacity-80 italic`}>
            {selected.mansion.theme}
          </div>

          {/* Do / Avoid */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-emerald-400 font-medium mb-1 flex items-center gap-1">
                <Info size={9} /> Рекомендуется
              </div>
              <ul className={`text-[11px] ${theme.text} opacity-70 space-y-0.5`}>
                {selected.mansion.do.slice(0, 3).map((item, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-emerald-400 mt-0.5">›</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[10px] text-red-400 font-medium mb-1 flex items-center gap-1">
                <AlertTriangle size={9} /> Избегать
              </div>
              <ul className={`text-[11px] ${theme.text} opacity-70 space-y-0.5`}>
                {selected.mansion.avoid.slice(0, 3).map((item, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-red-400 mt-0.5">›</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
