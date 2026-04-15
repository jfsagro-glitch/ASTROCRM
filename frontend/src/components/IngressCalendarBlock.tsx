/**
 * IngressCalendarBlock — yearly planetary sign ingress calendar.
 * Calls GET /ephemeris/ingress-calendar and shows a chronological timeline.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getIngressCalendar,
  IngressCalendarResult,
  PlanetaryIngress,
} from '../services/astrologyService';

// ── constants ────────────────────────────────────────────────────────────────

const PLANET_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера',
  mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн',
  uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон',
};

const PLANET_GLYPH: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
};

const PLANET_COLOR: Record<string, string> = {
  sun: 'text-amber-400 border-amber-500/40',
  moon: 'text-slate-300 border-slate-400/40',
  mercury: 'text-cyan-400 border-cyan-500/40',
  venus: 'text-pink-400 border-pink-500/40',
  mars: 'text-red-400 border-red-500/40',
  jupiter: 'text-indigo-400 border-indigo-500/40',
  saturn: 'text-stone-400 border-stone-500/40',
  uranus: 'text-teal-400 border-teal-500/40',
  neptune: 'text-violet-400 border-violet-500/40',
  pluto: 'text-rose-400 border-rose-500/40',
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

const MONTHS_RU = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
];

const ALL_SELECTABLE = ['sun','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];

// ── helpers ──────────────────────────────────────────────────────────────────

function parseDateTime(dtUtc: string): Date | null {
  // format: "2026-04-20 08:13 UTC"
  const clean = dtUtc.replace(' UTC', '').trim();
  const d = new Date(clean + 'Z');
  return isNaN(d.getTime()) ? null : d;
}

function countdownText(dtUtc: string): string | null {
  const d = parseDateTime(dtUtc);
  if (!d) return null;
  const diff = d.getTime() - Date.now();
  if (diff < 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `через ${days} д. ${hours} ч.`;
  return `через ${hours} ч.`;
}

// ── ingress item ─────────────────────────────────────────────────────────────

function IngressItem({ ing, isNext }: { ing: PlanetaryIngress; isNext: boolean }) {
  const d = parseDateTime(ing.datetime_utc);
  const dateStr = d ? d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) : ing.datetime_utc;
  const timeStr = d ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
  const colors = PLANET_COLOR[ing.planet] ?? 'text-white/60 border-white/20';
  const cd = countdownText(ing.datetime_utc);

  return (
    <div className={`flex items-center gap-3 rounded-lg border p-2.5 text-sm transition-all ${
      isNext ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/8 bg-white/3 hover:bg-white/5'
    }`}>
      {/* Planet badge */}
      <div className={`flex-shrink-0 w-16 flex items-center gap-1 text-xs font-medium border rounded-full px-2 py-0.5 ${colors}`}>
        <span>{PLANET_GLYPH[ing.planet] ?? ''}</span>
        <span className="truncate">{PLANET_RU[ing.planet] ?? ing.planet}</span>
      </div>

      {/* Arrow + sign */}
      <span className="text-white/30 text-xs">→</span>
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <span className="text-base">{SIGN_GLYPH[ing.sign] ?? ''}</span>
        <span className="text-white/80 text-xs font-medium">{SIGN_RU[ing.sign] ?? ing.sign}</span>
      </div>

      {/* Date + time */}
      <div className="flex-shrink-0 text-right">
        <div className="text-white/70 text-xs font-medium">{dateStr}</div>
        <div className="text-white/30 text-[10px]">{timeStr} UTC</div>
      </div>

      {/* Countdown or "next" badge */}
      {isNext && cd && (
        <span className="flex-shrink-0 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-full px-1.5 py-0.5">
          {cd}
        </span>
      )}
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────

export function IngressCalendarBlock() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedPlanets, setSelectedPlanets] = useState<Set<string>>(
    new Set(['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']),
  );
  const [includeMoon, setIncludeMoon] = useState(false);
  const [data, setData] = useState<IngressCalendarResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const planets = [...selectedPlanets].join(',');
      const result = await getIngressCalendar(year, planets, includeMoon);
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [year, selectedPlanets, includeMoon]);

  useEffect(() => { load(); }, [load]);

  const now = Date.now();

  // Find index of the "next" ingress
  const nextIdx = useMemo(() => {
    if (!data) return -1;
    return data.ingresses.findIndex(ing => {
      const d = parseDateTime(ing.datetime_utc);
      return d && d.getTime() > now;
    });
  }, [data, now]);

  // Group by month
  const grouped = useMemo(() => {
    if (!data) return {};
    const g: Record<number, PlanetaryIngress[]> = {};
    for (const ing of data.ingresses) {
      const d = parseDateTime(ing.datetime_utc);
      if (!d) continue;
      const mo = d.getMonth(); // 0-11
      if (!g[mo]) g[mo] = [];
      g[mo].push(ing);
    }
    return g;
  }, [data]);

  const months = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  const visibleMonths = filterMonth != null ? [filterMonth] : months;

  const togglePlanet = (p: string) => {
    setSelectedPlanets(prev => {
      const next = new Set(prev);
      if (next.has(p)) {
        if (next.size > 1) next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Year stepper */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setYear(y => y - 1)}
              className="px-2 py-1 bg-white/10 hover:bg-white/15 rounded text-white text-sm"
            >←</button>
            <span className="text-white font-bold text-sm px-2">{year}</span>
            <button
              onClick={() => setYear(y => y + 1)}
              className="px-2 py-1 bg-white/10 hover:bg-white/15 rounded text-white text-sm"
            >→</button>
          </div>

          {/* Moon toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-white/60">
            <input
              type="checkbox"
              checked={includeMoon}
              onChange={e => setIncludeMoon(e.target.checked)}
              className="accent-purple-500"
            />
            ☽ Луна
          </label>

          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs rounded-lg transition-colors"
          >
            {loading ? '…' : '🔄'}
          </button>
        </div>

        {/* Planet filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {ALL_SELECTABLE.map(p => {
            const colors = PLANET_COLOR[p] ?? '';
            const active = selectedPlanets.has(p);
            return (
              <button
                key={p}
                onClick={() => togglePlanet(p)}
                className={`px-2 py-0.5 rounded-full text-xs border transition-all ${
                  active
                    ? colors + ' bg-white/10'
                    : 'border-white/10 text-white/30 hover:text-white/50'
                }`}
              >
                {PLANET_GLYPH[p] ?? ''} {PLANET_RU[p] ?? p}
              </button>
            );
          })}
        </div>

        {/* Month filter */}
        {months.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilterMonth(null)}
              className={`px-2 py-0.5 rounded-full text-xs transition-all ${
                filterMonth == null ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/40 hover:text-white/60'
              }`}
            >
              Все
            </button>
            {months.map(mo => (
              <button
                key={mo}
                onClick={() => setFilterMonth(filterMonth === mo ? null : mo)}
                className={`px-2 py-0.5 rounded-full text-xs transition-all ${
                  filterMonth === mo ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/40 hover:text-white/60'
                }`}
              >
                {MONTHS_RU[mo]?.slice(0, 3)}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-red-300 text-sm">{error}</div>
      )}

      {loading && !data && (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />)}
        </div>
      )}

      {data && (
        <>
          {/* Stats */}
          <div className="text-xs text-white/40 px-1">
            {data.count} ингрессов за {year} · планеты: {data.planets.map(p => PLANET_GLYPH[p] ?? p).join(' ')}
          </div>

          {/* Timeline by month */}
          {visibleMonths.map(mo => (
            <div key={mo}>
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2 px-1">
                {MONTHS_RU[mo]}
              </h3>
              <div className="space-y-1.5">
                {(grouped[mo] ?? []).map((ing, i) => {
                  const globalIdx = data.ingresses.indexOf(ing);
                  return (
                    <IngressItem
                      key={`${ing.planet}-${ing.jd}`}
                      ing={ing}
                      isNext={globalIdx === nextIdx}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default IngressCalendarBlock;
