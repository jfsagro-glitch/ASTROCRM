// SynastryProgressedBlock.tsx — Sprint 7
// UI for POST /synastry/progressed — secondary progressions cross-aspects
import React, { useState, useCallback } from 'react';
import { RefreshCw, AlertTriangle, Heart, Star } from 'lucide-react';
import { getSynastryProgressed } from '../services/astrologyService';
import type { SynastryProgressedResult, ProgressedAspect } from '../services/astrologyService';
import type { BirthInput } from '../types/astro';

interface ThemeLike {
  card: string; header: string; text: string; accent: string;
  btn: string; symbol: string;
}

interface Props {
  birth1: BirthInput;
  birth2: BirthInput;
  theme: ThemeLike;
}

const PLANET_GLYPH: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '⛢', neptune: '♆', pluto: '♇',
  asc: '↑', mc: '↑ mc',
};
const PLANET_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера',
  mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн',
  uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон', asc: 'ASC', mc: 'MC',
};
const ASP_SYMBOL: Record<string, string> = {
  conjunction: '☌', opposition: '☍', trine: '△', square: '□', sextile: '⚹',
  quincunx: '⚻', semi_sextile: '⊻', semi_square: '∠', sesquiquadrate: '⊼',
};
const ASP_COLOR: Record<string, string> = {
  conjunction: 'text-violet-400', opposition: 'text-orange-400',
  trine: 'text-blue-400', square: 'text-red-400', sextile: 'text-cyan-400',
  quincunx: 'text-yellow-400',
};

type TabKey = 'all' | 'prog_x_prog' | 'prog1_x_natal2' | 'prog2_x_natal1';

const TAB_LABELS: Array<[TabKey, string]> = [
  ['all',           'Все аспекты'],
  ['prog_x_prog',   'Прогр × Прогр'],
  ['prog1_x_natal2', 'Прогр₁ → Натал₂'],
  ['prog2_x_natal1', 'Прогр₂ → Натал₁'],
];

function AspectRow({ a, theme }: { a: ProgressedAspect; theme: ThemeLike }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${theme.card} text-xs`}>
      <span className={`font-bold text-base w-5 text-center ${ASP_COLOR[a.aspect] ?? 'text-white/50'}`}>
        {ASP_SYMBOL[a.aspect] ?? a.aspect}
      </span>
      <span className={`${theme.header} font-medium`}>
        {PLANET_GLYPH[a.planet1] ?? ''} {PLANET_RU[a.planet1] ?? a.planet1}
      </span>
      <span className={`${theme.text} opacity-40`}>×</span>
      <span className={`${theme.header} font-medium`}>
        {PLANET_GLYPH[a.planet2] ?? ''} {PLANET_RU[a.planet2] ?? a.planet2}
      </span>
      <span className={`ml-auto ${theme.text} opacity-40`}>орб {a.orb.toFixed(2)}°</span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border border-white/12 ${
        a.type === 'applying' ? 'text-amber-300 border-amber-500/30' : 'text-slate-400 border-slate-500/30'
      }`}>
        {a.type === 'applying' ? '↗' : '↘'}
      </span>
    </div>
  );
}

export default function SynastryProgressedBlock({ birth1, birth2, theme }: Props) {
  const [data, setData] = useState<SynastryProgressedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('all');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setData(await getSynastryProgressed(birth1, birth2));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [birth1, birth2]);

  const aspects = data
    ? (tab === 'all' ? (data.aspects.all_sorted ?? []) : (data.aspects[tab as keyof typeof data.aspects] as ProgressedAspect[] ?? []))
    : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className={`text-base font-semibold ${theme.header}`}>
          <Heart size={16} className="inline mr-1.5 text-rose-400" />
          Прогрессивная синастрия
          {data && (
            <span className={`ml-2 text-xs font-normal ${theme.text} opacity-50`}>
              {data.name1} × {data.name2} · {data.target_date}
            </span>
          )}
        </h2>
        <button
          onClick={load}
          disabled={loading}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${theme.btn} disabled:opacity-50`}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {data ? 'Обновить' : 'Рассчитать'}
        </button>
      </div>

      {/* Description */}
      <p className={`text-xs ${theme.text} opacity-50 leading-relaxed`}>
        Вторичные прогрессии обоих партнёров на текущую дату, взаимные аспекты между
        прогрессированными картами и к натальным. Отражает зрелость отношений и текущие темы роста.
      </p>

      {error && (
        <div className={`rounded-xl border ${theme.card} p-6 text-center`}>
          <AlertTriangle size={24} className="text-red-400 mx-auto mb-2" />
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button onClick={load} className={`text-xs px-4 py-2 rounded-lg ${theme.btn}`}>Повторить</button>
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center gap-3 py-10 justify-center">
          <RefreshCw size={20} className={`${theme.accent} animate-spin`} />
          <span className={`text-sm ${theme.text}`}>Расчёт прогрессий…</span>
        </div>
      )}

      {data && (
        <>
          {/* Summary chips */}
          <div className="flex flex-wrap gap-2">
            {([
              ['prog_x_prog', 'Прогр×Прогр', (data.aspects.prog_x_prog ?? []).length],
              ['prog1_x_natal2', `Прогр${data.name1}→Нат${data.name2}`, (data.aspects.prog1_x_natal2 ?? []).length],
              ['prog2_x_natal1', `Прогр${data.name2}→Нат${data.name1}`, (data.aspects.prog2_x_natal1 ?? []).length],
            ] as Array<[TabKey, string, number]>).map(([key, label, count]) => (
              <div key={key} className={`flex items-center gap-1.5 text-[11px] border rounded-full px-2.5 py-1 ${theme.card} border-white/12`}>
                <Star size={9} className={theme.accent} />
                <span className={theme.text}>{label}</span>
                <span className={`${theme.accent} font-semibold`}>{count}</span>
              </div>
            ))}
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 overflow-x-auto pb-1 border-b border-white/10">
            {TAB_LABELS.map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`flex-shrink-0 px-3 py-2 text-xs rounded-t-lg transition-colors ${
                  tab === k
                    ? `${theme.header} bg-white/10 border-b-2 border-rose-400`
                    : `${theme.text} opacity-50 hover:opacity-80`
                }`}
              >
                {label}
                <span className={`ml-1 ${tab === k ? theme.accent : 'text-white/20'}`}>
                  ({tab === k ? aspects.length : (k === 'all'
                    ? (data.aspects.all_sorted ?? []).length
                    : (data.aspects[k as keyof typeof data.aspects] as ProgressedAspect[] ?? []).length)})
                </span>
              </button>
            ))}
          </div>

          {/* Aspect list */}
          {aspects.length > 0 ? (
            <div className="space-y-1.5">
              {aspects.map((a, i) => <AspectRow key={i} a={a} theme={theme} />)}
            </div>
          ) : (
            <p className={`text-xs ${theme.text} opacity-40 text-center py-8`}>
              Аспектов не найдено в этой группе
            </p>
          )}

          {/* Interpretation */}
          {data.interpretation && (
            <div className={`rounded-xl border ${theme.card} p-3 mt-2`}>
              <p className={`text-xs ${theme.text} opacity-60 leading-relaxed`}>
                {data.interpretation}
              </p>
            </div>
          )}
        </>
      )}

      {!data && !loading && !error && (
        <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
          <Heart size={32} className={`mx-auto mb-3 ${theme.symbol} opacity-30`} />
          <p className={`${theme.text} text-sm opacity-50`}>
            Нажмите «Рассчитать» для анализа прогрессивной синастрии
          </p>
        </div>
      )}
    </div>
  );
}
