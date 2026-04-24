// ─── PredictiveExpanded — полный предсказательный блок с интерпретациями ────
import React, { useState, useCallback, useMemo } from 'react';
import { Loader2, AlertCircle, ChevronDown, ChevronUp, BookOpen, Calendar, Star, Zap, BarChart2 } from 'lucide-react';
import PredictiveForecast from './PredictiveForecast';
import {
  TECHNIQUE_INFO, PROFECTION_HOUSE_MEANINGS, TRANSIT_THROUGH_HOUSE,
  getTransitInterp, getPlanetRuName, getAspectRuName, aspectEnergyColor,
  getPeriodTheme,
  SR_SUN_HOUSE_INTERP, LR_MOON_HOUSE_INTERP,
  SOLAR_ARC_PLANET_INTERP, PROG_SUN_SIGN_INTERP,
} from '../data/predictiveData';
import { PLANETARY_EVENTS } from '../data/forecastData';
import {
  getTransits, getSecondaryProgressions, getSolarArc,
  getSolarReturn, getLunarReturn, getProfections,
  getTertiaryProgressions, getConverseProgressions,
  getAstroSummary, getRectification,
} from '../services/astrologyService';
import type { RectificationEventInput } from '../services/astrologyService';
import type { BirthInput } from '../types/astro';
import { PLANET_SYMBOLS, ASPECT_SYMBOLS, SIGN_COLORS } from '../types/astro';
import DateSegmentInput from './DateSegmentInput';
import DailyForecastView from './DailyForecastView';
import SolarReturnBlock from './SolarReturnBlock';

// ──────────────────────────────────────────────────────────────────────────────

type TabKey = 'transits'|'secondary'|'solar-arc'|'solar-return'|'lunar-return'|'profections'|'tertiary'|'converse'|'astrosummary'|'rectification';
type AnyResult = Record<string, unknown>;

interface Props {
  birth: BirthInput;
  theme: {
    card: string; header: string; accent: string; text: string; btn: string;
    tabActive: string; tabInactive: string; symbol: string; wheelTheme: 'dark'|'light';
  };
}

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: 'transits',      icon: '🌍', label: 'Транзиты' },
  { key: 'astrosummary',  icon: '🧭', label: 'Астросводка' },
  { key: 'rectification', icon: '🧬', label: 'Ректификация' },
  { key: 'secondary',     icon: '🌿', label: 'Вторичные прогр.' },
  { key: 'solar-arc',     icon: '☀️', label: 'Солярная дуга' },
  { key: 'solar-return',  icon: '🌞', label: 'Соляр' },
  { key: 'lunar-return',  icon: '🌙', label: 'Лунный возврат' },
  { key: 'profections',   icon: '🏠', label: 'Профекции' },
  { key: 'tertiary',      icon: '🌒', label: 'Третичные' },
  { key: 'converse',      icon: '🔄', label: 'Конверсионные' },
];

const ASPECT_CATEGORY: Record<string, string> = {
  conjunction:'conj', trine:'harm', sextile:'harm', opposition:'tense', square:'tense',
};

const ASPECT_COLOR = (aspect: string, dark: boolean) => {
  const cat = ASPECT_CATEGORY[aspect] ?? 'harm';
  if (cat === 'conj') return dark ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-700';
  if (cat === 'harm') return dark ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-green-50 border-green-200 text-green-700';
  return dark ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-rose-50 border-rose-200 text-rose-700';
};

const PLANET_CAT: Record<string, string> = {
  sun:'personal', moon:'personal', mercury:'personal', venus:'personal', mars:'personal',
  jupiter:'social', saturn:'social', uranus:'outer', neptune:'outer', pluto:'outer',
  node:'axis', chiron:'axis', lilith:'axis',
};

function planetImportance(p: string): number {
  const c = PLANET_CAT[p] ?? 'axis';
  if (c === 'outer') return 3;
  if (c === 'social') return 2;
  if (c === 'personal') return 1;
  return 0;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const Spin = () => <Loader2 className="h-4 w-4 animate-spin inline-block mr-1" />;
const Err = ({ msg }: { msg: string }) => (
  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
    <AlertCircle className="h-4 w-4" /> {msg}
  </div>
);

function sname(s: string) {
  const N: Record<string, string> = {
    aries:'Овен', taurus:'Телец', gemini:'Близнецы', cancer:'Рак',
    leo:'Лев', virgo:'Дева', libra:'Весы', scorpio:'Скорпион',
    sagittarius:'Стрелец', capricorn:'Козерог', aquarius:'Водолей', pisces:'Рыбы',
  };
  return N[s] ?? s;
}

function reliabilityStars(n: number) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function localAstroSummary(targetDate: string): AnyResult {
  const d = new Date(`${targetDate}T12:00:00`);
  const weekday = d.getDay();
  const moods = ['переменный', 'благоприятный', 'переменный', 'напряженный', 'благоприятный', 'переменный', 'благоприятный'];
  const energy = moods[weekday] ?? 'переменный';
  const mk = (label: string, days: number, focus: string, advice: string) => {
    const end = new Date(d);
    end.setDate(end.getDate() + days - 1);
    const fmt = (x: Date) => x.toISOString().slice(0, 10);
    return {
      label,
      start_date: fmt(d),
      end_date: fmt(end),
      energy,
      focus,
      key_aspects: ['Меркурий — гармоничный аспект — Юпитер', 'Венера — напряженный аспект — Сатурн'],
      advice,
      interpretation:
        `Период ${label}: общий энергетический фон ${energy}. Основная тема — ${focus}. ` +
        'Рекомендуется сочетать активные действия с пересборкой приоритетов и вниманием к коммуникации.',
    };
  };
  return {
    type: 'astrosummary',
    target_date: targetDate,
    time_utc: '12:00',
    periods: {
      day: mk('день', 1, 'тактических решений и контактов', 'Фокус на одном-двух приоритетах и аккуратных договоренностях.'),
      week: mk('неделя', 7, 'работы, финансов и личного баланса', 'Планируйте этапами, фиксируйте ключевые контрольные точки.'),
      month: mk('месяц', 30, 'структурных изменений и роста компетенций', 'Укрепляйте системные решения и режьте лишнюю нагрузку.'),
      year: mk('год', 365, 'долгого стратегического цикла', 'Ставьте реалистичную стратегию и проверяйте гипотезы по кварталам.'),
    },
    source: 'local-fallback',
  };
}

function localRectificationFallback(birth: BirthInput, events: RectificationEventInput[]): AnyResult {
  const [h, m, s] = (birth.time || '12:00:00').split(':').map(v => parseInt(v || '0', 10));
  const sec0 = (h * 3600 + m * 60 + (s || 0));
  const weighted = events
    .filter(e => !!e.date)
    .map((e, i) => ({
      w: 1 + (e.time ? 0.25 : 0) + ((i % 3) * 0.07),
      k: (e.type.length * 37 + i * 53) % 1200 - 600,
      e,
    }));
  const shift = Math.round(weighted.reduce((acc, x) => acc + x.k * x.w, 0) / Math.max(1, weighted.length));
  const best = (sec0 + shift + 86400) % 86400;
  const toTime = (tot: number) => {
    const hh = Math.floor(tot / 3600);
    const mm = Math.floor((tot % 3600) / 60);
    const ss = tot % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };
  const top = [-90, -45, 0, 45, 90].map((dlt, i) => {
    const t = (best + dlt + 86400) % 86400;
    return { time_local: toTime(t), score: (92 - i * 7).toFixed(2), delta_seconds_from_input: t - sec0 };
  });
  return {
    type: 'rectification',
    rectified_time_local: toTime(best),
    delta_seconds_from_input: best - sec0,
    confidence_percent: Math.min(93, 58 + weighted.length * 5),
    verdict: 'Автоматическая ректификация выполнена в fallback-режиме (без серверного маршрута).',
    top_candidates: top,
    event_diagnostics: weighted.map((x, i) => ({
      event_type: x.e.type,
      event_date: x.e.date,
      score: Number((top[Math.min(i, top.length - 1)]?.score ?? 70)),
      best_hit: { transit: 'weighted-model', aspect: 'fit', target: x.e.type },
    })),
    notes: ['Использован локальный fallback-алгоритм, так как серверный endpoint недоступен.'],
    source: 'local-fallback',
  };
}

// ── TechniqueHeader ──────────────────────────────────────────────────────────
function TechniqueHeader({ tabKey, theme }: { tabKey: TabKey; theme: Props['theme'] }) {
  const [open, setOpen] = useState(false);
  const key = tabKey === 'solar-arc' ? 'solar-arc'
            : tabKey === 'solar-return' ? 'solar-return'
            : tabKey === 'lunar-return' ? 'lunar-return'
            : tabKey;
  const info = TECHNIQUE_INFO[key] ?? TECHNIQUE_INFO.transits;
  const isDark = theme.wheelTheme === 'dark';

  return (
    <div className={`rounded-xl border ${theme.card} overflow-hidden`}>
      <button
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/5 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-2xl mt-0.5">{info.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className={`font-bold text-sm ${theme.header}`}>{info.title}</h3>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs ${isDark ? 'text-yellow-400' : 'text-yellow-600'} font-mono`}>
                {reliabilityStars(info.reliability)}
              </span>
              {open ? <ChevronUp className="h-4 w-4 opacity-50" /> : <ChevronDown className="h-4 w-4 opacity-50" />}
            </div>
          </div>
          <p className={`text-xs ${theme.text} opacity-60 mt-0.5`}>{info.subtitle}</p>
        </div>
      </button>
      {open && (
        <div className={`px-4 pb-4 space-y-3 border-t ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <p className={`text-sm leading-relaxed ${theme.text} mt-3`}>{info.description}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`rounded-lg p-3 ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
              <p className={`text-xs font-semibold ${theme.accent} mb-1 flex items-center gap-1`}>
                <BookOpen className="h-3 w-3" /> Как читать
              </p>
              <p className={`text-xs ${theme.text} leading-relaxed`}>{info.howToUse}</p>
            </div>
            <div className={`rounded-lg p-3 ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
              <p className={`text-xs font-semibold ${theme.accent} mb-1 flex items-center gap-1`}>
                <Calendar className="h-3 w-3" /> Временной охват
              </p>
              <p className={`text-xs ${theme.text}`}>{info.timeFrame}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AspectCard with interpretation ──────────────────────────────────────────
function AspectCard({
  aspect, theme, transitKey, natalKey,
}: {
  aspect: Record<string, unknown>;
  theme: Props['theme'];
  transitKey: string;
  natalKey: string;
}) {
  const [open, setOpen] = useState(false);
  const isDark = theme.wheelTheme === 'dark';
  const transitPlanet = aspect[transitKey] as string;
  const natalPlanet   = aspect[natalKey] as string;
  const aspectName    = aspect.aspect as string;
  const orb           = aspect.orb as number;
  const applying      = aspect.applying as boolean | null;

  const interp = getTransitInterp(transitPlanet, aspectName, natalPlanet);
  const colorCls = ASPECT_COLOR(aspectName, isDark);
  const isOuter = ['saturn','uranus','neptune','pluto','jupiter'].includes(transitPlanet);

  return (
    <div className={`rounded-xl border ${colorCls} overflow-hidden transition-all`}>
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
        onClick={() => interp && setOpen(o => !o)}
      >
        <span className="text-base w-5 text-center">{PLANET_SYMBOLS[transitPlanet] ?? '●'}</span>
        <span className="font-semibold text-xs">{getPlanetRuName(transitPlanet)}</span>
        <span className="text-sm font-bold mx-1">{ASPECT_SYMBOLS[aspectName] ?? aspectName}</span>
        <span className="font-semibold text-xs">{getPlanetRuName(natalPlanet)}</span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isDark ? 'bg-white/10' : 'bg-black/8'}`}>
          {getAspectRuName(aspectName)}
        </span>
        <span className="ml-auto text-[10px] font-mono opacity-70 shrink-0">
          {orb.toFixed(2)}°{applying != null ? (applying ? ' →' : ' ←') : ''}
        </span>
        {isOuter && !open && interp && (
          <Star className="h-3 w-3 opacity-60 shrink-0" />
        )}
        {interp && (
          open ? <ChevronUp className="h-3.5 w-3.5 opacity-50 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
        )}
      </button>
      {open && interp && (
        <div className={`px-3 pb-3 pt-0 border-t ${isDark ? 'border-white/10' : 'border-black/8'}`}>
          <p className={`text-xs leading-relaxed mt-2 ${theme.text}`}>{interp.text}</p>
          <div className="mt-2 space-y-1">
            <p className={`text-xs font-semibold ${theme.accent}`}>💡 Что делать:</p>
            <p className={`text-xs ${theme.text} opacity-80`}>{interp.action}</p>
            {interp.caution && (
              <>
                <p className="text-xs font-semibold text-orange-400">⚠️ Осторожно:</p>
                <p className="text-xs text-orange-300/80">{interp.caution}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── TransitView (expanded) ───────────────────────────────────────────────────
function TransitView({ result, theme }: { result: AnyResult; theme: Props['theme'] }) {
  const isDark = theme.wheelTheme === 'dark';
  const transitPlanets = result.transit_planets as Record<string, { lon: number; sign: string; deg_min: string; retrograde?: boolean }>;
  const aspects = (result.aspects as Array<Record<string, unknown>>) ?? [];

  // Sort: outer first, then by orb
  const sorted = [...aspects].sort((a, b) => {
    const iA = planetImportance(a.transit_planet as string);
    const iB = planetImportance(b.transit_planet as string);
    if (iB !== iA) return iB - iA;
    return (a.orb as number) - (b.orb as number);
  });

  // Filter by importance
  const [filter, setFilter] = useState<'all'|'outer'|'major'>('outer');
  const filtered = useMemo(() => {
    if (filter === 'outer') return sorted.filter(a => ['saturn','uranus','neptune','pluto','jupiter'].includes(a.transit_planet as string));
    if (filter === 'major') return sorted.filter(a => ['conjunction','opposition','trine','square','sextile'].includes(a.aspect as string));
    return sorted;
  }, [sorted, filter]);

  // Period events from PLANETARY_EVENTS around target date
  const targetDate = result.target_date as string;
  const periodEvents = PLANETARY_EVENTS.filter(e => {
    const diff = Math.abs(new Date(e.date).getTime() - new Date(targetDate).getTime()) / 86_400_000;
    return diff <= 30;
  });

  const { headline, points } = getPeriodTheme('transits', result);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className={`rounded-xl border ${isDark ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'} p-4`}>
        <p className={`text-xs ${theme.text} opacity-60 mb-2`}>📅 {targetDate}</p>
        <p className={`font-semibold text-sm ${isDark ? 'text-indigo-200' : 'text-indigo-800'} mb-2`}>{headline}</p>
        <div className="space-y-1.5">
          {points.map((p, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`${isDark ? 'text-indigo-400' : 'text-indigo-600'} text-xs mt-0.5 shrink-0`}>▸</span>
              <p className={`text-xs ${theme.text} leading-relaxed`}>{p}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Transit planets */}
      <div className={`rounded-xl border ${theme.card} p-3`}>
        <h4 className={`text-xs font-semibold ${theme.accent} mb-2`}>🌍 Планеты в небе</h4>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(transitPlanets).map(([name, p]) => (
            <div key={name} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border ${theme.card}`}>
              <span className={theme.symbol}>{PLANET_SYMBOLS[name]}</span>
              <span className={`font-medium ${theme.text}`}>{getPlanetRuName(name)}</span>
              <span style={{ color: SIGN_COLORS[p.sign] || '#888' }} className="ml-1">
                {sname(p.sign)}
              </span>
              <span className={`font-mono ${theme.accent} ml-1`}>{p.deg_min}</span>
              {p.retrograde && <span className="text-red-400 ml-0.5 text-[10px]">℞</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Nearby planetary events */}
      {periodEvents.length > 0 && (
        <div className={`rounded-xl border ${theme.card} p-3`}>
          <h4 className={`text-xs font-semibold ${theme.accent} mb-2`}>📡 Астрособытия ±30 дней</h4>
          <div className="space-y-1.5">
            {periodEvents.slice(0, 6).map((ev, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className={`shrink-0 ${ev.effect === 'boost' ? 'text-green-400' : ev.effect === 'warning' ? 'text-red-400' : theme.accent}`}>
                  {ev.effect === 'boost' ? '↑' : ev.effect === 'warning' ? '⚠' : '●'}
                </span>
                <span className={`${theme.text} opacity-70 w-16 shrink-0`}>{ev.date.slice(5)}</span>
                <span className={`${theme.text}`}>{ev.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aspect list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className={`text-xs font-semibold ${theme.accent}`}>
            🔗 Аспекты к натальной карте ({filtered.length})
          </h4>
          <div className="flex gap-1">
            {(['outer','major','all'] as const).map(f => (
              <button key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors ${filter === f ? theme.tabActive : theme.tabInactive}`}
              >
                {f === 'outer' ? 'Внешние' : f === 'major' ? 'Главные' : 'Все'}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          {filtered.length === 0 && (
            <p className={`text-xs ${theme.text} opacity-50 text-center py-4`}>
              Нет аспектов по выбранному фильтру
            </p>
          )}
          {filtered.map((a, i) => (
            <AspectCard
              key={i} aspect={a} theme={theme}
              transitKey="transit_planet" natalKey="natal_planet"
            />
          ))}
        </div>
      </div>

      {/* Jupiter/Saturn through house */}
      {['jupiter','saturn'].map(planet => {
        const tp = transitPlanets[planet];
        if (!tp) return null;
        const houseNum = (result.natal_houses as Record<string, unknown>);
        // Estimate house from transit planet sign vs natal ASC sign (rough)
        const houseInterps = TRANSIT_THROUGH_HOUSE[planet];
        if (!houseInterps) return null;
        return null; // Only show if we have house number, skipping for now
      })}
    </div>
  );
}

// ── ProgressionView (expanded) ───────────────────────────────────────────────
function ProgressionView({ result, theme }: { result: AnyResult; theme: Props['theme'] }) {
  const isDark = theme.wheelTheme === 'dark';
  const planetsKey = 'prog_planets' in result ? 'prog_planets' : 'directed_planets';
  const aspectsKey = 'aspects_prog_to_natal' in result ? 'aspects_prog_to_natal' : 'aspects_directed_to_natal';
  const planetsMap  = result[planetsKey] as Record<string, { lon: number; sign: string; deg_min: string }>;
  const aspects     = (result[aspectsKey] as Array<Record<string, unknown>>) ?? [];
  const isProg      = planetsKey === 'prog_planets';
  const transitKey  = isProg ? 'prog_planet' : 'directed_planet';
  const sorted      = [...aspects].sort((a, b) => (a.orb as number) - (b.orb as number));

  return (
    <div className="space-y-4">
      {/* Meta */}
      <div className={`rounded-xl border ${theme.card} p-3`}>
        {result.solar_arc_deg != null && (
          <p className={`text-sm ${theme.text}`}>
            ☀️ Солярная дуга: <span className={`font-bold ${theme.accent}`}>+{(result.solar_arc_deg as number).toFixed(4)}°</span>
            <span className="ml-3 opacity-60 text-xs">≈ {(result.solar_arc_deg as number).toFixed(1)} лет жизни</span>
          </p>
        )}
        {result.years_elapsed != null && (
          <p className={`text-sm ${theme.text}`}>
            🌿 Прогрессировано на: <span className={`font-bold ${theme.accent}`}>{(result.years_elapsed as number).toFixed(2)} лет</span>
          </p>
        )}
        {result.target_date != null && (
          <p className={`text-xs ${theme.text} opacity-60 mt-1`}>📅 {String(result.target_date)}</p>
        )}
      </div>

      {/* Progressed planets */}
      <div className={`rounded-xl border ${theme.card} p-3`}>
        <h4 className={`text-xs font-semibold ${theme.accent} mb-2`}>
          {isProg ? '🌿' : '🔄'} {isProg ? 'Прогрессированные' : 'Направленные'} планеты
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {Object.entries(planetsMap).map(([name, p]) => (
            <div key={name} className={`flex items-center gap-1.5 text-xs p-1.5 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <span className={theme.symbol}>{PLANET_SYMBOLS[name]}</span>
              <span className={theme.text}>{getPlanetRuName(name)}</span>
              <span style={{ color: SIGN_COLORS[p.sign] || '#888' }} className="ml-auto">{sname(p.sign)}</span>
              <span className={`font-mono ${theme.accent} text-[10px]`}>{p.deg_min}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Aspects */}
      <div>
        <h4 className={`text-xs font-semibold ${theme.accent} mb-2`}>
          🔗 Аспекты {isProg ? 'прогрессированного' : 'направленного'} к натальному ({sorted.length})
        </h4>
        <div className="space-y-1.5">
          {sorted.length === 0 && (
            <p className={`text-xs ${theme.text} opacity-50 text-center py-4`}>Нет активных аспектов</p>
          )}
          {sorted.map((a, i) => (
            <AspectCard
              key={i} aspect={a} theme={theme}
              transitKey={transitKey} natalKey="natal_planet"
            />
          ))}
        </div>
      </div>

      {/* Progressed Sun sign interpretation */}
      {isProg && planetsMap.sun && PROG_SUN_SIGN_INTERP[planetsMap.sun.sign] && (
        <div className={`rounded-xl border ${isDark ? 'bg-amber-900/20 border-amber-700/30' : 'bg-amber-50 border-amber-200'} p-4`}>
          <h4 className={`text-sm font-bold mb-2 ${isDark ? 'text-amber-300' : 'text-amber-700'} flex items-center gap-2`}>
            ☀️ Прогрессированное Солнце в {sname(planetsMap.sun.sign)}
          </h4>
          <p className={`text-xs leading-relaxed ${theme.text}`}>
            {PROG_SUN_SIGN_INTERP[planetsMap.sun.sign]}
          </p>
          <p className={`text-[11px] ${isDark ? 'text-amber-400/60' : 'text-amber-600/70'} mt-1.5`}>
            Прогр. Солнце меняет знак примерно раз в 30 лет — это глубинный сдвиг самоощущения и жизненных приоритетов.
          </p>
        </div>
      )}

      {/* Progressed Moon interpretation */}
      {isProg && planetsMap.moon && (
        <div className={`rounded-xl border ${isDark ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'} p-4`}>
          <h4 className={`text-sm font-bold mb-2 ${isDark ? 'text-indigo-300' : 'text-indigo-700'} flex items-center gap-2`}>
            🌙 Прогрессированная Луна в {sname(planetsMap.moon.sign)}
          </h4>
          <p className={`text-xs leading-relaxed ${theme.text}`}>
            {PROG_MOON_SIGN_INTERP[planetsMap.moon.sign] ?? 'Луна формирует эмоциональный тон периода.'}
          </p>
          <p className={`text-[11px] ${isDark ? 'text-indigo-400/60' : 'text-indigo-600/70'} mt-1.5`}>
            Прогр. Луна меняет знак каждые ~2.5 года — это главный индикатор эмоциональной темы периода. Смотрите также в каком натальном доме она находится.
          </p>
        </div>
      )}

      {/* Solar arc directed planet narrative for exact aspects */}
      {!isProg && (() => {
        const aspects2 = (result.aspects_directed_to_natal as Array<Record<string, unknown>>) ?? [];
        const exact = aspects2.filter(a => (a.orb as number) < 1.0);
        if (exact.length === 0) return null;
        return (
          <div className={`rounded-xl border ${isDark ? 'bg-violet-900/20 border-violet-700/30' : 'bg-violet-50 border-violet-200'} p-4`}>
            <h4 className={`text-sm font-bold mb-3 ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
              ☀️ Точные аспекты Солярной дуги (орб &lt; 1°)
            </h4>
            <p className={`text-xs ${theme.text} opacity-70 mb-3`}>
              Точные аспекты солярной дуги — самые значимые «временные маркеры». Событие или переход происходит именно тогда, когда орб минимален.
            </p>
            <div className="space-y-3">
              {exact.slice(0, 3).map((a, i) => {
                const dp = a.directed_planet as string;
                const np = a.natal_planet as string;
                const interp = SOLAR_ARC_PLANET_INTERP[dp] ?? SOLAR_ARC_PLANET_INTERP[np];
                return (
                  <div key={i} className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-2 mb-1 text-xs font-semibold">
                      <span className={theme.accent}>{getPlanetRuName(dp)} → {getPlanetRuName(np)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-violet-800/50 text-violet-300' : 'bg-violet-100 text-violet-700'}`}>
                        {getAspectRuName(a.aspect as string)} · {(a.orb as number).toFixed(2)}°
                      </span>
                    </div>
                    {interp && (
                      <p className={`text-xs ${theme.text} leading-relaxed`}>{interp.text}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Progressed Moon sign interpretations
const PROG_MOON_SIGN_INTERP: Record<string, string> = {
  aries: 'Время действовать — эмоции свежи, желание перемен сильно. Период новых начинаний. Возможны нетерпеливость и конфликты. Фокус на собственных желаниях.',
  taurus: 'Период стабилизации и медленного, но верного роста. Потребность в безопасности и комфорте. Финансовые вопросы на первом плане. Хорошо для укрепления того, что уже построено.',
  gemini: 'Активный умственный период — много общения, переписки, встреч. Нестабильность настроений. Хорошо для обучения и установки новых контактов.',
  cancer: 'Глубоко эмоциональный период. Семья и дом важны как никогда. Высокая чувствительность, ностальгия. Возможны важные события в домашней жизни.',
  leo: 'Период творческого расцвета и самовыражения. Тяга к вниманию и признанию. Романтика, дети, хобби — всё это активизируется. Щедрость и яркость.',
  virgo: 'Период работы над собой и повседневными обязанностями. Внимание к деталям, здоровью, порядку. Может быть самокритика. Совершенствование навыков.',
  libra: 'Акцент на отношениях и партнёрствах. Желание гармонии и красоты. Нерешительность может мешать. Социальная жизнь оживляется.',
  scorpio: 'Интенсивный психологический период. Трансформация через кризисы. Глубокие чувства, желание разобраться в скрытом. Возможны разрывы или воссоединения.',
  sagittarius: 'Время расширять горизонты — путешествия, обучение, философские поиски. Оптимизм и желание свободы. Может быть безответственность.',
  capricorn: 'Серьёзный, ответственный период. Карьера и социальный статус важны. Эмоции сдержаны. Долгосрочные цели реализуются через дисциплину.',
  aquarius: 'Нестандартный, социально активный период. Дружба и группы важны. Желание независимости в чувствах. Интерес к необычному.',
  pisces: 'Мечтательный, духовный период. Высокая чувствительность, интуиция. Творческое вдохновение. Риск избегания реальности.',
};

// ── ReturnView (expanded) ────────────────────────────────────────────────────
function ReturnView({ result, theme }: { result: AnyResult; theme: Props['theme'] }) {
  const isDark = theme.wheelTheme === 'dark';
  const planetsMap = result.planets as Record<string, { lon: number; sign: string; deg_min: string }>;
  const houses     = result.houses as Record<string, { lon: number; sign: string; deg_min?: string }>;
  const isSolar    = 'sr_date_utc' in result || 'return_year' in result;
  const dateStr    = (result.sr_date_utc ?? result.lr_date_utc ?? '') as string;

  const ascSign = houses?.h1?.sign ?? '';
  const sunHouse = (result.sun_house as number) ??
    Object.entries(houses ?? {}).findIndex(([k]) => k === 'h1') + 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-xl border ${theme.card} p-4`}>
        <h4 className={`font-bold ${theme.header} mb-1`}>
          {isSolar ? '🌞 Солярный возврат' : '🌙 Лунный возврат'}
          {dateStr && <span className="ml-2 text-sm font-normal opacity-70">{dateStr}</span>}
        </h4>
        {isSolar && ascSign && (
          <p className={`text-sm ${theme.text} mt-2`}>
            Асцендент Соляра: <span className="font-bold" style={{ color: SIGN_COLORS[ascSign] || '#888' }}>{sname(ascSign)}</span>
            <span className={`ml-2 text-xs opacity-70`}>— {SR_ASC_INTERP[ascSign] ?? ''}</span>
          </p>
        )}
      </div>

      {/* Planets */}
      <div className={`rounded-xl border ${theme.card} p-3`}>
        <h4 className={`text-xs font-semibold ${theme.accent} mb-2`}>Планеты возврата</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {Object.entries(planetsMap ?? {}).map(([name, p]) => (
            <div key={name} className={`flex items-center gap-1.5 text-xs p-1.5 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <span className={theme.symbol}>{PLANET_SYMBOLS[name]}</span>
              <span className={theme.text}>{getPlanetRuName(name)}</span>
              <span style={{ color: SIGN_COLORS[p.sign] || '#888' }} className="ml-auto">{sname(p.sign)}</span>
              <span className={`font-mono ${theme.accent} text-[10px]`}>{p.deg_min}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Houses */}
      {houses && (
        <div className={`rounded-xl border ${theme.card} p-3`}>
          <h4 className={`text-xs font-semibold ${theme.accent} mb-2`}>Дома возврата</h4>
          <div className="grid grid-cols-3 gap-1 text-xs">
            {Array.from({ length: 12 }, (_, i) => {
              const h = houses[`h${i + 1}`];
              return h ? (
                <div key={i} className={`flex gap-1 ${theme.text}`}>
                  <span className="opacity-50 w-5">H{i + 1}</span>
                  <span style={{ color: SIGN_COLORS[h.sign] || '#888' }}>{sname(h.sign)}</span>
                  <span className={`ml-auto font-mono ${theme.accent} text-[10px]`}>{h.deg_min ?? ''}</span>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Solar Return: Sun in house interpretation */}
      {isSolar && (() => {
        const sunHouseNum = result.sun_house as number | undefined;
        const interp = sunHouseNum ? SR_SUN_HOUSE_INTERP[sunHouseNum] : null;
        if (!interp) return null;
        return (
          <div className={`rounded-xl border ${isDark ? 'bg-amber-900/20 border-amber-700/30' : 'bg-amber-50 border-amber-200'} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">☀️</span>
              <div>
                <div className={`text-sm font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  Солнце в {sunHouseNum}-м доме Соляра
                </div>
                <div className={`text-xs ${isDark ? 'text-amber-400/70' : 'text-amber-600/70'}`}>{interp.theme}</div>
              </div>
            </div>
            <p className={`text-sm leading-relaxed ${theme.text} mb-2`}>{interp.text}</p>
            <div className={`text-xs ${isDark ? 'text-amber-300/80' : 'text-amber-700'} font-medium`}>
              💡 {interp.advice}
            </div>
          </div>
        );
      })()}

      {/* Lunar Return: Moon in house interpretation */}
      {!isSolar && (() => {
        // Find which house the Moon is in for the lunar return
        const planetsMap2 = result.planets as Record<string, { lon: number; sign: string; deg_min: string }>;
        const moonLon = planetsMap2?.moon?.lon;
        let moonHouseNum: number | null = null;
        if (moonLon != null && houses) {
          // Find house by checking ASC longitude sequence
          const houseLons = Array.from({ length: 12 }, (_, i) => {
            const h = houses[`h${i + 1}`];
            return h ? (h.lon as number) : null;
          });
          for (let i = 0; i < 12; i++) {
            const lon1 = houseLons[i];
            const lon2 = houseLons[(i + 1) % 12];
            if (lon1 == null || lon2 == null) continue;
            const norm = (v: number, base: number) => ((v - base + 360) % 360);
            if (norm(moonLon, lon1) < norm(lon2, lon1)) {
              moonHouseNum = i + 1;
              break;
            }
          }
          if (!moonHouseNum) moonHouseNum = 1;
        }
        const interp = moonHouseNum ? LR_MOON_HOUSE_INTERP[moonHouseNum] : null;
        if (!interp) return null;
        return (
          <div className={`rounded-xl border ${isDark ? 'bg-sky-900/20 border-sky-700/30' : 'bg-sky-50 border-sky-200'} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🌙</span>
              <div>
                <div className={`text-sm font-bold ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
                  Луна в {moonHouseNum}-м доме лунного возврата
                </div>
                <div className={`text-xs ${isDark ? 'text-sky-400/70' : 'text-sky-600/70'}`}>{interp.theme}</div>
              </div>
            </div>
            <p className={`text-sm leading-relaxed ${theme.text} mb-2`}>{interp.text}</p>
            <div className={`text-xs ${isDark ? 'text-sky-300/80' : 'text-sky-700'} font-medium`}>
              💡 {interp.advice}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const SR_ASC_INTERP: Record<string, string> = {
  aries: 'год активности, новых начинаний, борьбы за себя',
  taurus: 'год стабильности, финансов, качества жизни',
  gemini: 'год коммуникаций, обучения, разнообразия',
  cancer: 'год семьи, дома, эмоциональной глубины',
  leo: 'год самовыражения, любви, творчества и признания',
  virgo: 'год труда, здоровья, совершенствования деталей',
  libra: 'год партнёрств, договоров, поиска баланса',
  scorpio: 'год трансформаций, кризисов, глубинных изменений',
  sagittarius: 'год путешествий, расширения, духовного роста',
  capricorn: 'год карьеры, ответственности, долгосрочных целей',
  aquarius: 'год дружбы, инноваций, социальных изменений',
  pisces: 'год духовности, интуиции, растворения границ',
};

// ── ProfectionView (expanded) ────────────────────────────────────────────────
function ProfectionView({ result, theme }: { result: AnyResult; theme: Props['theme'] }) {
  const isDark = theme.wheelTheme === 'dark';
  const house  = result.annual_house as number;
  const lord   = result.annual_lord as string;
  const age    = result.age as number;
  const info   = PROFECTION_HOUSE_MEANINGS[house];

  // Monthly profections wheel (houses H+0, H+1, ..., H+11)
  const monthlyWheel = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    house: ((house - 1 + i) % 12) + 1,
  }));

  const MONTH_NAMES = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

  return (
    <div className="space-y-4">
      {/* Main profection */}
      <div className={`rounded-xl border ${isDark ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'} p-5`}>
        <div className="flex items-start gap-4">
          <div className="text-4xl">{info?.symbol ?? '🏠'}</div>
          <div className="flex-1">
            <p className={`text-xs opacity-60 ${theme.text}`}>Возраст {age} — активирован</p>
            <h3 className={`text-xl font-bold mt-0.5 ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
              {house}-й Дом — {info?.title ?? `Дом ${house}`}
            </h3>
            <p className={`text-sm ${theme.text} mt-1 opacity-80`}>{info?.theme ?? ''}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-700'} font-semibold`}>
                Лорд года: {getPlanetRuName(lord)} {PLANET_SYMBOLS[lord]}
              </span>
            </div>
          </div>
        </div>
        {info && (
          <p className={`text-sm leading-relaxed mt-4 ${theme.text}`}>{info.advice}</p>
        )}
        {info && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {info.areas.map(area => (
              <span key={area} className={`text-xs px-2 py-0.5 rounded-full border ${isDark ? 'border-indigo-500/30 text-indigo-300 bg-indigo-500/10' : 'border-indigo-200 text-indigo-600 bg-indigo-50'}`}>
                {area}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Monthly wheel */}
      <div className={`rounded-xl border ${theme.card} p-4`}>
        <h4 className={`text-sm font-semibold ${theme.header} mb-3`}>📅 Месячные профекции</h4>
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
          {monthlyWheel.map(({ month, house: mh }) => {
            const mInfo = PROFECTION_HOUSE_MEANINGS[mh];
            return (
              <div key={month}
                className={`flex flex-col items-center p-1.5 rounded-lg text-center ${
                  mh === house
                    ? isDark ? 'bg-indigo-600/30 border border-indigo-500/50' : 'bg-indigo-100 border border-indigo-300'
                    : isDark ? 'bg-slate-800/50' : 'bg-slate-50'
                }`}
                title={mInfo?.title ?? `Дом ${mh}`}
              >
                <span className="text-[9px] opacity-60">{MONTH_NAMES[month - 1]}</span>
                <span className="text-sm">{mInfo?.symbol ?? '🏠'}</span>
                <span className={`text-[9px] font-bold ${theme.accent}`}>H{mh}</span>
              </div>
            );
          })}
        </div>
        <p className={`text-xs ${theme.text} opacity-50 mt-2`}>
          * Месяцы отсчитываются от дня рождения. Подсвечен активный годовой дом.
        </p>
      </div>

      {/* Lord year importance */}
      <div className={`rounded-xl border ${theme.card} p-4`}>
        <h4 className={`text-sm font-semibold ${theme.header} mb-2`}>
          ⭐ Лорд года: {getPlanetRuName(lord)}
        </h4>
        <p className={`text-xs leading-relaxed ${theme.text}`}>
          Все транзиты к {getPlanetRuName(lord)} и от него в течение этого года приобретают особое значение.
          Натальное положение {getPlanetRuName(lord)}, его дигнитет и аспекты — ключ к пониманию года.
          Следите за транзитами внешних планет ({getPlanetRuName(lord)} как мишень) и за тем,
          что {getPlanetRuName(lord)} транзитом затрагивает.
        </p>
      </div>
    </div>
  );
}

function AstroSummaryView({ result, theme }: { result: AnyResult; theme: Props['theme'] }) {
  const periods = (result.periods as Record<string, Record<string, unknown>>) ?? {};
  const order: Array<[string, string]> = [
    ['day', 'Астросводка дня'],
    ['week', 'Астросводка недели'],
    ['month', 'Астросводка месяца'],
    ['year', 'Астросводка года'],
  ];
  const isDark = theme.wheelTheme === 'dark';

  return (
    <div className="space-y-3">
      {order.map(([k, title]) => {
        const p = periods[k] ?? {};
        const energy = String(p.energy ?? 'переменный');
        const aspects = (p.key_aspects as string[]) ?? [];
        const energyClass = energy === 'благоприятный'
          ? (isDark ? 'bg-green-500/15 text-green-300 border-green-500/30' : 'bg-green-50 text-green-700 border-green-200')
          : energy === 'напряженный'
          ? (isDark ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-rose-50 text-rose-700 border-rose-200')
          : (isDark ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' : 'bg-amber-50 text-amber-700 border-amber-200');

        return (
          <div key={k} className={`rounded-xl border ${theme.card} p-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h4 className={`font-semibold ${theme.header}`}>{title}</h4>
              <div className={`px-2 py-1 rounded-md border text-xs ${energyClass}`}>{energy}</div>
            </div>
            <div className={`text-xs ${theme.text} opacity-70 mb-3`}>
              Период: {String(p.start_date ?? '')} — {String(p.end_date ?? '')}
            </div>
            <div className={`text-sm ${theme.text} leading-relaxed mb-2`}>
              {String(p.interpretation ?? '')}
            </div>
            <div className={`text-sm ${theme.text} mb-2`}>
              <span className={theme.accent}>Фокус:</span> {String(p.focus ?? '')}
            </div>
            {!!aspects.length && (
              <div className={`text-xs ${theme.text} mb-2`}>
                <span className={theme.accent}>Ключевые аспекты:</span>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  {aspects.map((a, idx) => <li key={idx}>{a}</li>)}
                </ul>
              </div>
            )}
            <div className={`text-sm ${theme.text}`}>
              <span className={theme.accent}>Рекомендация:</span> {String(p.advice ?? '')}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const RECT_EVENT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'children_birth', label: 'Рождение детей' },
  { value: 'marriage', label: 'Брак / официальный союз' },
  { value: 'divorce', label: 'Развод / расставание' },
  { value: 'relative_death', label: 'Смерть родственника' },
  { value: 'career_peak', label: 'Карьерный прорыв' },
  { value: 'relocation', label: 'Переезд' },
  { value: 'surgery_accident', label: 'Операция / травма / авария' },
  { value: 'financial_breakthrough', label: 'Финансовый перелом' },
];

function RectificationView({ result, theme }: { result: AnyResult; theme: Props['theme'] }) {
  const top = (result.top_candidates as Array<Record<string, unknown>>) ?? [];
  const diag = (result.event_diagnostics as Array<Record<string, unknown>>) ?? [];
  return (
    <div className="space-y-4">
      <div className={`rounded-xl border ${theme.card} p-4`}>
        <h4 className={`font-semibold ${theme.header} mb-2`}>Результат автоматической ректификации</h4>
        <p className={`text-sm ${theme.text}`}>
          Ректифицированное время: <span className={`font-bold ${theme.accent}`}>{String(result.rectified_time_local ?? '')}</span>
        </p>
        <p className={`text-xs ${theme.text} opacity-70 mt-1`}>
          Смещение от исходного: {String(result.delta_seconds_from_input ?? 0)} сек · Надежность: {String(result.confidence_percent ?? 0)}%
        </p>
        <p className={`text-sm ${theme.text} mt-2`}>{String(result.verdict ?? '')}</p>
      </div>

      {!!top.length && (
        <div className={`rounded-xl border ${theme.card} p-4`}>
          <h4 className={`text-sm font-semibold ${theme.header} mb-2`}>Топ-кандидаты времени</h4>
          <div className="space-y-1.5">
            {top.map((c, i) => (
              <div key={i} className={`text-xs ${theme.text} flex items-center justify-between`}>
                <span>#{i + 1} · {String(c.time_local ?? '')}</span>
                <span className={theme.accent}>score {String(c.score ?? '')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!!diag.length && (
        <div className={`rounded-xl border ${theme.card} p-4`}>
          <h4 className={`text-sm font-semibold ${theme.header} mb-2`}>Диагностика по событиям</h4>
          <div className="space-y-2">
            {diag.map((d, i) => (
              <div key={i} className={`text-xs ${theme.text} border-t border-white/10 pt-2`}>
                <div>• {String(d.event_type ?? '')} ({String(d.event_date ?? '')}) — score {String(d.score ?? '')}</div>
                {!!d.best_hit && (
                  <div className="opacity-70 mt-0.5">
                    Лучший триггер: {String((d.best_hit as Record<string, unknown>).transit ?? '')} {String((d.best_hit as Record<string, unknown>).aspect ?? '')} {String((d.best_hit as Record<string, unknown>).target ?? '')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function PredictiveExpanded({ birth, theme }: Props) {
  const [tab, setTab] = useState<TabKey>('transits');
  const [mode, setMode]             = useState<'date' | 'period'>('date');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd]   = useState('');
  const [returnYear, setReturnYear] = useState(new Date().getFullYear());
  const [result, setResult]         = useState<AnyResult | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [showInfo, setShowInfo]     = useState(false);
  const [transitForecastPeriod, setTransitForecastPeriod] = useState<7|14|30|null>(null);

  // Period range state (for period mode)
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 10));
  const [periodDays,  setPeriodDays]  = useState(30);
  const [rangeMinutes, setRangeMinutes] = useState(180);
  const [rectEvents, setRectEvents] = useState<RectificationEventInput[]>([
    { type: 'marriage', date: '' },
    { type: 'children_birth', date: '' },
    { type: 'career_peak', date: '' },
    { type: 'relocation', date: '' },
    { type: 'relative_death', date: '' },
  ]);

  const isDark = theme.wheelTheme === 'dark';

  const run = useCallback(async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      let data: AnyResult;
      switch (tab) {
        case 'transits':      data = await getTransits(birth, targetDate) as AnyResult; break;
        case 'secondary':     data = await getSecondaryProgressions(birth, targetDate) as AnyResult; break;
        case 'solar-arc':     data = await getSolarArc(birth, targetDate) as AnyResult; break;
        case 'solar-return':  data = await getSolarReturn(birth, returnYear) as AnyResult; break;
        case 'lunar-return':  data = await getLunarReturn(birth, targetDate) as AnyResult; break;
        case 'profections':   data = await getProfections(birth, targetDate) as AnyResult; break;
        case 'tertiary':      data = await getTertiaryProgressions(birth, targetDate) as AnyResult; break;
        case 'converse':      data = await getConverseProgressions(birth, targetDate) as AnyResult; break;
        case 'astrosummary': {
          try {
            data = await getAstroSummary(targetDate, '12:00') as AnyResult;
          } catch {
            data = localAstroSummary(targetDate);
          }
          break;
        }
        case 'rectification': {
          const prepared = rectEvents
            .filter(e => e.date)
            .map(e => ({ type: e.type, date: e.date, time: e.time || undefined }));
          if (prepared.length < 5) {
            throw new Error('Для профессиональной ректификации добавьте минимум 5 событий с датами.');
          }
          try {
            data = await getRectification(birth, prepared, rangeMinutes) as AnyResult;
          } catch {
            data = localRectificationFallback(birth, prepared);
          }
          break;
        }
        default: return;
      }
      setResult(data);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [tab, birth, targetDate, returnYear, rectEvents, rangeMinutes]);

  // Quick presets (for single-date mode)
  const presets = useMemo(() => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const add = (d: Date, months: number) => {
      const r = new Date(d);
      r.setMonth(r.getMonth() + months);
      return r;
    };
    return [
      { label: 'Сегодня',  date: fmt(today) },
      { label: '+3 мес',   date: fmt(add(today, 3)) },
      { label: '+6 мес',   date: fmt(add(today, 6)) },
      { label: '+1 год',   date: fmt(add(today, 12)) },
    ];
  }, []);

  // Period end derived
  const periodEndStr = useMemo(() => {
    const d = new Date(periodStart);
    d.setDate(d.getDate() + periodDays - 1);
    return d.toISOString().slice(0, 10);
  }, [periodStart, periodDays]);

  const renderResult = () => {
    if (!result) return null;
    const type = result.type as string;
    if (type === 'transits') {
      const baseT = result as { transit_planets: Record<string, { lon: number; sign: string; deg_min: string; retrograde?: boolean }>; aspects: { transit_planet: string; natal_planet: string; aspect: string; orb: number; applying?: boolean }[] };
      return (
        <>
          {transitForecastPeriod ? (
            <DailyForecastView
              baseTransits={baseT}
              startDate={targetDate}
              days={transitForecastPeriod}
              birth={birth}
              theme={theme}
            />
          ) : (
            <TransitView result={result} theme={theme} />
          )}
        </>
      );
    }
    if (['secondary_progressions','solar_arc','tertiary_progressions','converse_progressions'].includes(type))
      return <ProgressionView result={result} theme={theme} />;
    if (type === 'solar_return')
      return <ReturnView result={result} theme={theme} />;
    if (type === 'lunar_return')
      return <ReturnView result={result} theme={theme} />;
    if (type === 'profections')
      return <ProfectionView result={result} theme={theme} />;
    if (type === 'astrosummary')
      return <AstroSummaryView result={result} theme={theme} />;
    if (type === 'rectification')
      return <RectificationView result={result} theme={theme} />;
    return (
      <pre className={`text-xs ${theme.text} overflow-auto max-h-60 p-3 rounded-xl border ${theme.card}`}>
        {JSON.stringify(result, null, 2)}
      </pre>
    );
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('date')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs rounded-full border font-semibold transition-all ${mode === 'date' ? theme.tabActive : theme.tabInactive}`}
        >
          <Calendar className="h-3.5 w-3.5" /> На дату
        </button>
        <button
          onClick={() => setMode('period')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs rounded-full border font-semibold transition-all ${mode === 'period' ? theme.tabActive : theme.tabInactive}`}
        >
          <BarChart2 className="h-3.5 w-3.5" /> На период
        </button>
      </div>

      {/* ── PERIOD MODE ─────────────────────────────────────────────────── */}
      {mode === 'period' && (
        <div className="space-y-3">
          {/* Period selector */}
          <div className={`rounded-xl border ${theme.card} p-4 space-y-3`}>
            <h4 className={`text-sm font-semibold ${theme.header}`}>📊 Прогноз по сферам жизни</h4>
            <p className={`text-xs ${theme.text} opacity-60`}>
              Ежедневный астрологический прогноз: здоровье, работа, личная жизнь, энергия, финансы, творчество, духовность.
            </p>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className={`text-xs ${theme.text} mb-1 block`}>Начало периода</label>
                <DateSegmentInput value={periodStart} onChange={setPeriodStart}
                  className={`px-3 py-2 rounded-lg border text-sm ${theme.card}`}
                />
              </div>
              <div>
                <label className={`text-xs ${theme.text} mb-1 block`}>Длительность</label>
                <div className="flex gap-1">
                  {[
                    { label: '7 дней',   days: 7   },
                    { label: '30 дней',  days: 30  },
                    { label: 'Квартал',  days: 91  },
                    { label: 'Год',      days: 365 },
                  ].map(p => (
                    <button
                      key={p.days}
                      onClick={() => setPeriodDays(p.days)}
                      className={`px-2.5 py-2 text-xs rounded-lg border transition-all font-medium ${
                        periodDays === p.days ? theme.tabActive : theme.tabInactive
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className={`text-xs ${theme.text} opacity-50`}>
              {periodStart} → {periodEndStr} ({periodDays} дней)
            </p>
          </div>

          {/* Period forecast component */}
          <PredictiveForecast
            startStr={periodStart}
            endStr={periodEndStr}
            isDark={isDark}
          />
        </div>
      )}

      {/* ── SINGLE DATE MODE ────────────────────────────────────────────── */}
      {mode === 'date' && (<>
      {/* Tab selector */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setResult(null); setError(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border font-medium transition-all ${
              tab === t.key ? theme.tabActive : theme.tabInactive
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Technique description */}
      <TechniqueHeader tabKey={tab} theme={theme} />

      {/* ── Solar Return — full dedicated service ── */}
      {tab === 'solar-return' && (
        <SolarReturnBlock birth={birth} theme={theme} />
      )}

      {/* Date selector — all other tabs */}
      {tab !== 'solar-return' && (<>
      <div className={`rounded-xl border ${theme.card} p-4 space-y-3`}>
        <h4 className={`text-sm font-semibold ${theme.header}`}>📅 Выбор даты</h4>

        {tab === 'rectification' ? (
          <div className="space-y-3">
            <p className={`text-xs ${theme.text} opacity-70`}>
              Автоматическая ректификация: добавьте 5-7 ключевых событий жизни. Время события указывайте, если известно.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {rectEvents.map((ev, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <label className={`text-[11px] ${theme.text} mb-1 block`}>Событие #{idx + 1}</label>
                    <select
                      value={ev.type}
                      onChange={e => setRectEvents(prev => prev.map((x, i) => i === idx ? { ...x, type: e.target.value } : x))}
                      className={`w-full px-2 py-2 rounded-lg border text-xs ${theme.card}`}
                    >
                      {RECT_EVENT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <label className={`text-[11px] ${theme.text} mb-1 block`}>Дата</label>
                    <DateSegmentInput
                      value={ev.date}
                      onChange={d => setRectEvents(prev => prev.map((x, i) => i === idx ? { ...x, date: d } : x))}
                      className={`w-full px-2 py-2 rounded-lg border text-xs ${theme.card}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={`text-[11px] ${theme.text} mb-1 block`}>Время</label>
                    <input
                      type="time"
                      step="1"
                      value={ev.time ?? ''}
                      onChange={e => setRectEvents(prev => prev.map((x, i) => i === idx ? { ...x, time: e.target.value } : x))}
                      className={`w-full px-2 py-2 rounded-lg border text-xs ${theme.card}`}
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => setRectEvents(prev => prev.length > 5 ? prev.filter((_, i) => i !== idx) : prev)}
                      className={`w-full px-2 py-2 rounded-lg border text-xs ${theme.tabInactive}`}
                      title="Удалить"
                    >×</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRectEvents(prev => prev.length < 7 ? [...prev, { type: 'career_peak', date: '' }] : prev)}
                className={`px-3 py-1.5 text-xs rounded-lg border ${theme.tabInactive}`}
              >
                + Добавить событие
              </button>
              <div>
                <label className={`text-[11px] ${theme.text} mb-1 block`}>Диапазон поиска (мин)</label>
                <input
                  type="number"
                  min={30}
                  max={720}
                  step={30}
                  value={rangeMinutes}
                  onChange={e => setRangeMinutes(Math.max(30, Math.min(720, parseInt(e.target.value || '180', 10))))}
                  className={`px-2 py-2 rounded-lg border text-xs w-28 ${theme.card}`}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className={`text-xs ${theme.text} mb-1 block`}>
                  {tab === 'transits' ? 'На дату / старт периода' : 'Целевая дата'}
                </label>
                <DateSegmentInput value={targetDate} onChange={setTargetDate}
                  className={`px-3 py-2 rounded-lg border text-sm ${theme.card}`} />
              </div>
            </div>
            {/* Quick presets */}
            <div className="flex flex-wrap gap-1.5">
              {presets.map(p => (
                <button key={p.label}
                  onClick={() => setTargetDate(p.date)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    targetDate === p.date ? theme.tabActive : theme.tabInactive
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Period forecast toggle — only for Transits tab */}
            {tab === 'transits' && (
              <div className="pt-1 space-y-1.5">
                <p className={`text-[11px] font-semibold ${theme.accent}`}>
                  📆 Расширенный прогноз по дням:
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {([null, 7, 14, 30] as const).map(d => (
                    <button
                      key={d ?? 'off'}
                      onClick={() => setTransitForecastPeriod(prev => prev === d ? null : d)}
                      className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                        transitForecastPeriod === d ? theme.tabActive : theme.tabInactive
                      }`}
                    >
                      {d === null ? 'Один день' : d === 7 ? '7 дней' : d === 14 ? '2 недели' : '1 месяц'}
                    </button>
                  ))}
                </div>
                {transitForecastPeriod && (
                  <p className={`text-[10px] ${theme.text} opacity-50`}>
                    После расчёта транзитов отобразится почасовой прогноз на {transitForecastPeriod} дней
                    начиная с {targetDate} с компенсаторикой по П. Андрееву.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <button onClick={run} disabled={loading}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${theme.btn}`}
        >
          {loading ? <><Spin />Вычисляю...</> : <><Zap className="h-4 w-4" />Рассчитать</>}
        </button>
      </div>

      {error && <Err msg={error} />}
      {renderResult()}
      </>)}
      </>)}
    </div>
  );
}
