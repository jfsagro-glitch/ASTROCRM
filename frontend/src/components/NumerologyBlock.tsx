import React, { useState, useEffect, useCallback } from 'react';
import { Star, Loader2, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import type { BirthInput } from '../types/astro';
import { getNumerologyProfile } from '../services/astrologyService';
import type { NumerologyProfile } from '../services/astrologyService';

interface Props {
  birthData: BirthInput;
  theme: Record<string, string>;
  name?: string;
  natalChart?: object;
}

const PILLAR_LABELS: Record<string, string> = {
  right:  'Милосердия',
  left:   'Суровости',
  middle: 'Равновесия',
};

const PILLAR_COLORS: Record<string, string> = {
  right:  'text-blue-400',
  left:   'text-red-400',
  middle: 'text-amber-400',
};

export default function NumerologyBlock({ birthData, theme, name = '', natalChart }: Props) {
  const [data, setData]       = useState<NumerologyProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [inputName, setInputName] = useState(name);
  const [showTree, setShowTree]   = useState(false);
  const [show9yr, setShow9yr]     = useState(false);

  const load = useCallback(async () => {
    if (!birthData.date) return;
    setLoading(true); setError(null);
    try {
      const result = await getNumerologyProfile(birthData, inputName, natalChart);
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [birthData, inputName, natalChart]);

  useEffect(() => { load(); }, [birthData.date]);

  const masterBadge = (n: number) => n >= 11
    ? <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-300 font-bold">Мастер</span>
    : null;

  return (
    <div className="space-y-4">
      {/* Header + name input */}
      <div className={`rounded-xl border ${theme.card} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <Star className={`h-5 w-5 ${theme.symbol}`} />
          <h2 className={`font-bold ${theme.text}`}>Нумерология & Каббала</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputName}
            onChange={e => setInputName(e.target.value)}
            placeholder="Имя (для числа Каббалы)"
            className={`flex-1 px-3 py-2 rounded-lg text-sm border ${theme.input ?? 'bg-white/10 border-white/20 text-white placeholder-white/40'}`}
          />
          <button
            onClick={load}
            disabled={loading}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${theme.button ?? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'} transition-colors`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className={`rounded-xl border ${theme.card} p-4 flex items-center gap-2`}>
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {loading && !data && (
        <div className={`rounded-xl border ${theme.card} p-8 flex justify-center`}>
          <Loader2 className={`h-8 w-8 animate-spin ${theme.symbol}`} />
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Life Path */}
          <div className={`rounded-xl border ${theme.card} p-4`}>
            <p className={`text-xs uppercase tracking-wider mb-1 ${theme.muted ?? 'text-white/50'}`}>Путь Жизни</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl font-bold ${theme.symbol}`}>{data.life_path.number}</span>
              {masterBadge(data.life_path.number)}
            </div>
            <p className={`mt-2 text-sm ${theme.text} opacity-80`}>{data.life_path.meaning}</p>
            <div className={`mt-3 text-xs ${theme.muted ?? 'text-white/50'} space-y-0.5`}>
              <p>День: {data.life_path.day_reduced} · Месяц: {data.life_path.month_reduced} · Год: {data.life_path.year_reduced}</p>
            </div>
          </div>

          {/* Personal Year */}
          <div className={`rounded-xl border ${theme.card} p-4`}>
            <p className={`text-xs uppercase tracking-wider mb-1 ${theme.muted ?? 'text-white/50'}`}>Личный Год {data.personal_year.current_year}</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl font-bold ${theme.symbol}`}>{data.personal_year.personal_year}</span>
            </div>
            <p className={`mt-2 text-sm ${theme.text} opacity-80`}>{data.personal_year.theme}</p>
            <p className={`mt-1 text-xs ${theme.muted ?? 'text-white/50'}`}>
              {data.personal_year.current_year + 1}: личный год {data.personal_year.next_year} — {data.personal_year.next_theme}
            </p>
            {/* 9-year cycle toggle */}
            <button
              onClick={() => setShow9yr(v => !v)}
              className={`mt-2 flex items-center gap-1 text-xs ${theme.symbol} hover:opacity-80`}
            >
              {show9yr ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              9-летний цикл
            </button>
            {show9yr && (
              <div className="mt-2 grid grid-cols-3 gap-1">
                {data.personal_year['9year_cycle'].map(item => (
                  <div
                    key={item.year}
                    className={`rounded p-1.5 text-center ${
                      item.year === data.personal_year.current_year
                        ? 'bg-amber-500/20 border border-amber-400/30'
                        : 'bg-white/5'
                    }`}
                  >
                    <p className={`text-xs ${theme.muted ?? 'text-white/50'}`}>{item.year}</p>
                    <p className={`text-lg font-bold ${theme.symbol}`}>{item.py}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tikkun */}
          <div className={`rounded-xl border ${theme.card} p-4`}>
            <p className={`text-xs uppercase tracking-wider mb-1 ${theme.muted ?? 'text-white/50'}`}>Тиккун (72 ангела)</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${theme.symbol}`}>#{data.tikkun.tikkun_number}</span>
              <span className={`text-lg font-semibold ${theme.text}`}>{data.tikkun.angel}</span>
            </div>
            <p className={`mt-1 text-sm ${theme.text} opacity-70`}>
              {data.tikkun.sign} {data.tikkun.degree_in_sign.toFixed(0)}°
            </p>
            <p className={`mt-2 text-xs ${theme.muted ?? 'text-white/50'} leading-relaxed`}>{data.tikkun.description}</p>
          </div>

          {/* Kabbalah Number */}
          {data.kabbalah && (
            <div className={`rounded-xl border ${theme.card} p-4`}>
              <p className={`text-xs uppercase tracking-wider mb-1 ${theme.muted ?? 'text-white/50'}`}>Число Каббалы</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-bold ${theme.symbol}`}>{data.kabbalah.number}</span>
              </div>
              <p className={`mt-2 text-sm ${theme.text} opacity-80`}>{data.kabbalah.meaning}</p>
              <p className={`mt-1 text-xs ${theme.muted ?? 'text-white/50'}`}>Имя: {data.kabbalah.letters}</p>
            </div>
          )}

          {/* Tree of Life */}
          {data.tree_of_life && (
            <div className={`rounded-xl border ${theme.card} p-4 md:col-span-2`}>
              <button
                onClick={() => setShowTree(v => !v)}
                className="w-full flex items-center justify-between"
              >
                <p className={`text-xs uppercase tracking-wider ${theme.muted ?? 'text-white/50'}`}>Древо Жизни</p>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${PILLAR_COLORS[data.tree_of_life.dominant_pillar]}`}>
                    Столп {PILLAR_LABELS[data.tree_of_life.dominant_pillar]}
                  </span>
                  {showTree ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
                </div>
              </button>

              <p className={`mt-1 text-xs ${theme.muted ?? 'text-white/50'}`}>{data.tree_of_life.balance_comment}</p>

              {showTree && (
                <div className="mt-3 space-y-2">
                  {/* Pillar balance bar */}
                  <div className="flex gap-2 text-xs mb-3">
                    {(['right', 'middle', 'left'] as const).map(p => (
                      <div key={p} className="flex-1 text-center">
                        <div className={`h-2 rounded-full mb-1 ${
                          p === 'right' ? 'bg-blue-500/40' : p === 'middle' ? 'bg-amber-500/40' : 'bg-red-500/40'
                        }`} style={{ opacity: 0.4 + data.tree_of_life!.pillar_counts[p] * 0.15 }} />
                        <span className={PILLAR_COLORS[p]}>{data.tree_of_life!.pillar_counts[p]} / {PILLAR_LABELS[p]}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(data.tree_of_life.active_sephiroth).map(([key, s]) => (
                      <div key={key} className={`rounded-lg p-2 bg-white/5 border border-white/10`}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-sm font-bold ${theme.symbol}`}>{s.number}. {s.sephirah}</span>
                          <span className={`text-xs ${PILLAR_COLORS[s.pillar]}`}>▪</span>
                        </div>
                        <p className={`text-xs ${theme.muted ?? 'text-white/50'}`}>{s.planet} · {s.sign}</p>
                      </div>
                    ))}
                    {data.tree_of_life.vacant_sephiroth.length > 0 && (
                      <div className={`rounded-lg p-2 bg-white/5 border border-white/5 col-span-full`}>
                        <p className={`text-xs ${theme.muted ?? 'text-white/50'}`}>
                          Незаполнены: {data.tree_of_life.vacant_sephiroth.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
