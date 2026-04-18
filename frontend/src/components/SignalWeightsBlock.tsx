// SignalWeightsBlock.tsx — Sprint 7
// Visualises GET /calibration/signal-weights: planet reliability + aspect weights + orbs
import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, AlertTriangle, Zap, BarChart2, Info } from 'lucide-react';
import { getSignalWeights } from '../services/astrologyService';
import type { SignalWeightsResult } from '../services/astrologyService';

interface ThemeLike {
  card: string; header: string; text: string; accent: string;
  btn: string; symbol: string;
}

interface Props {
  theme: ThemeLike;
}

const PLANET_GLYPH: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '⛢', neptune: '♆', pluto: '♇',
  asc: '↑', mc: '↑',
};
const PLANET_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера',
  mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн',
  uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон', asc: 'ASC', mc: 'MC',
};
const ASP_RU: Record<string, string> = {
  conjunction: 'Соединение ☌', opposition: 'Оппозиция ☍', trine: 'Трин △',
  square: 'Квадрат □', sextile: 'Секстиль ⚹', quincunx: 'Квиникункс ⚻',
  semi_sextile: 'Полусекстиль', semi_square: 'Полуквадрат', sesquiquadrate: 'Сесквиквадрат',
};
const ASP_COLOR: Record<string, string> = {
  conjunction: 'bg-violet-500', opposition: 'bg-orange-500', trine: 'bg-blue-500',
  square: 'bg-red-500', sextile: 'bg-cyan-500',
};

const SIGNAL_WEIGHTS_EXPLAINER = `Каждый прогноз — это не магия, а сумма астрологических сигналов. Планеты разные по скорости: быстрый Меркурий даёт точные, кратковременные сигналы, медленный Плутон — долгосрочные фоновые влияния. «Надёжность» планеты показывает, насколько её положение в карте поддаётся точному расчёту и исторической проверке.

Аспекты (соединение, трин, квадрат...) имеют разный вес: соединение и оппозиция — самые мощные, они буквально «сталкивают» две планетарные энергии. Трин гармоничен и легко течёт, квадрат создаёт напряжение и действие.

Орбы — это допустимое расстояние для аспекта. Чем уже орб, тем точнее и острее сигнал. Медленные планеты (Уран, Нептун, Плутон) имеют широкие орбы — их влияние растянуто во времени.`;

export default function SignalWeightsBlock({ theme }: Props) {
  const [data, setData] = useState<SignalWeightsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'planets' | 'aspects' | 'orbs'>('planets');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setData(await getSignalWeights());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex flex-col items-center gap-3 py-16">
      <RefreshCw size={24} className={`${theme.accent} animate-spin`} />
      <span className={`text-sm ${theme.text}`}>Загрузка весов…</span>
    </div>
  );
  if (error) return (
    <div className={`rounded-2xl border ${theme.card} p-8 text-center`}>
      <AlertTriangle size={28} className="text-red-400 mx-auto mb-2" />
      <p className="text-red-400 text-sm mb-3">{error}</p>
      <button onClick={load} className={`text-xs px-4 py-2 rounded-lg ${theme.btn}`}>Повторить</button>
    </div>
  );
  if (!data) return null;

  const ds = data.calibration_dataset;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className={`text-base font-semibold ${theme.header}`}>
            <Zap size={16} className="inline mr-1.5 text-yellow-400" />
            ML-калибровка весов сигналов
          </h2>
          <p className={`text-xs ${theme.text} opacity-50 mt-0.5`}>
            {ds.total_charts.toLocaleString('ru-RU')} чартов · {ds.source} · v{data.version}
          </p>
        </div>
        <button onClick={load} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${theme.btn}`}>
          <RefreshCw size={12} /> Обновить
        </button>
      </div>

      {/* Dataset info */}
      <div className={`rounded-xl border ${theme.card} p-3 flex flex-wrap gap-4 text-xs`}>
        <div className="flex flex-col">
          <span className={`${theme.text} opacity-40 text-[10px] uppercase tracking-wide`}>Датасет</span>
          <span className={`${theme.header} font-semibold`}>{ds.total_charts.toLocaleString('ru-RU')} чартов</span>
        </div>
        <div className="flex flex-col">
          <span className={`${theme.text} opacity-40 text-[10px] uppercase tracking-wide`}>Рассчитано</span>
          <span className={`${theme.header} font-semibold`}>{ds.computed_charts.toLocaleString('ru-RU')}</span>
        </div>
        <div className="flex flex-col flex-1">
          <span className={`${theme.text} opacity-40 text-[10px] uppercase tracking-wide`}>Методология</span>
          <span className={`${theme.text} opacity-70`}>{data.methodology}</span>
        </div>
      </div>

      {/* Plain-language explainer */}
      <div className={`rounded-xl border ${theme.card} p-4`}>
        <p className={`text-[10px] font-semibold uppercase tracking-wider opacity-50 mb-2 ${theme.text}`}>
          💡 Что это такое и зачем нужно
        </p>
        {SIGNAL_WEIGHTS_EXPLAINER.split('\n\n').map((para, i) => (
          <p key={i} className={`text-xs leading-relaxed ${theme.text} opacity-70 ${i > 0 ? 'mt-2' : ''}`}>
            {para}
          </p>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-white/10 pb-0">
        {([['planets', '🪐 Планеты'], ['aspects', '⚹ Аспекты'], ['orbs', '◎ Орбы']] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-2 text-xs rounded-t-lg transition-colors ${
              tab === k
                ? `${theme.header} bg-white/10 border-b-2 border-violet-400`
                : `${theme.text} opacity-50 hover:opacity-80`
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* PLANETS tab */}
      {tab === 'planets' && (
        <div className="space-y-2">
          <p className={`text-[10px] ${theme.text} opacity-40 flex items-center gap-1`}>
            <Info size={10} />
            Надёжность планеты: 60% данные калибровки + 40% орбитальная скорость.
            Чем выше — тем точнее сигнал.
          </p>
          {[...data.planet_reliability_weights]
            .sort((a, b) => b.reliability_weight - a.reliability_weight)
            .map(p => {
              const pct = Math.round(p.reliability_weight * 100);
              return (
                <div key={p.planet} className={`rounded-xl border ${theme.card} px-3 py-2.5`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg w-6 text-center">{PLANET_GLYPH[p.planet] ?? ''}</span>
                    <span className={`text-sm font-medium ${theme.header}`}>{PLANET_RU[p.planet] ?? p.planet}</span>
                    <span className={`ml-auto text-xs font-semibold ${pct >= 90 ? 'text-emerald-400' : pct >= 80 ? 'text-yellow-400' : 'text-orange-400'}`}>
                      {pct}%
                    </span>
                  </div>
                  {/* Bar */}
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-emerald-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {p.calibration_data && (
                    <p className={`text-[10px] ${theme.text} opacity-40 mt-1`}>
                      n={p.calibration_data.n.toLocaleString('ru-RU')} · MAE {p.calibration_data.mae_arcmin.toFixed(1)}' · знак {p.calibration_data.sign_accuracy_pct.toFixed(1)}%
                    </p>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* ASPECTS tab */}
      {tab === 'aspects' && (
        <div className="space-y-2">
          <p className={`text-[10px] ${theme.text} opacity-40 flex items-center gap-1`}>
            <Info size={10} />
            Базовый вес × (1 + поправка). Поправки получены из статистики 64 978 чартов.
          </p>
          {[...data.aspect_weights]
            .sort((a, b) => b.calibrated_weight - a.calibrated_weight)
            .map(a => {
              const barW = Math.min(100, Math.round(a.calibrated_weight * 100));
              const corrSign = a.correction >= 0 ? '+' : '';
              return (
                <div key={a.aspect} className={`rounded-xl border ${theme.card} px-3 py-2.5`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ASP_COLOR[a.aspect] ?? 'bg-white/30'}`} />
                    <span className={`text-sm font-medium ${theme.header}`}>{ASP_RU[a.aspect] ?? a.aspect}</span>
                    <span className={`ml-auto text-xs font-semibold ${theme.accent}`}>
                      {a.calibrated_weight.toFixed(2)}
                    </span>
                    {a.correction !== 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${a.correction > 0 ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'}`}>
                        {corrSign}{a.correction.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${ASP_COLOR[a.aspect] ?? 'bg-white/40'}`}
                      style={{ width: `${barW}%` }}
                    />
                  </div>
                  <div className={`text-[10px] ${theme.text} opacity-30 mt-1`}>
                    база {a.base_weight.toFixed(2)} · поправка {corrSign}{a.correction.toFixed(2)}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ORBS tab */}
      {tab === 'orbs' && (
        <div className="space-y-2">
          <p className={`text-[10px] ${theme.text} opacity-40 flex items-center gap-1`}>
            <Info size={10} />
            Максимальный орб транзита. Рассчитан из орбитальной скорости: быстрые планеты — уже.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(data.planet_transit_max_orbs)
              .sort(([, a], [, b]) => a - b)
              .map(([planet, orb]) => (
                <div key={planet} className={`rounded-xl border ${theme.card} p-3 flex items-center gap-2`}>
                  <span className="text-lg">{PLANET_GLYPH[planet] ?? ''}</span>
                  <div>
                    <div className={`text-xs font-medium ${theme.header}`}>{PLANET_RU[planet] ?? planet}</div>
                    <div className={`text-sm font-semibold ${theme.accent}`}>{orb}°</div>
                  </div>
                  {/* mini bar (relative to 10°) */}
                  <div className="ml-auto w-12 h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${(orb / 10) * 100}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* BarChart2 icon area — placeholder for future chart */}
      <div className={`rounded-xl border ${theme.card} p-3 flex items-center gap-2 opacity-40`}>
        <BarChart2 size={14} />
        <span className="text-xs">Детальный график калибровки — в следующем спринте</span>
      </div>
    </div>
  );
}
