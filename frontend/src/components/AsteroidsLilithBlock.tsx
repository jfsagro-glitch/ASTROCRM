import React, { useState, useEffect } from 'react';
import { Circle, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { BirthInput } from '../types/astro';
import { getAsteroids, getLilithExtended } from '../services/astrologyService';
import type { AsteroidsData, LilithExtendedData } from '../services/astrologyService';

interface Props {
  birthData: BirthInput;
  theme: Record<string, string>;
}

const SIGN_GLYPHS: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌', virgo: '♍',
  libra: '♎', scorpio: '♏', sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

const ASTEROID_GLYPHS: Record<string, string> = {
  ceres: '⚳', pallas: '⚴', juno: '⚵', vesta: '⚶', eros: '🔴', psyche: '🔵',
};

const ASTEROID_NAME_RU: Record<string, string> = {
  ceres: 'Церера', pallas: 'Паллада', juno: 'Юнона',
  vesta: 'Веста', eros: 'Эрос', psyche: 'Психея',
};

const ASTEROID_KEYWORDS: Record<string, string> = {
  ceres: 'Питание, циклы потерь',
  pallas: 'Стратегия, мудрость',
  juno: 'Идеальный партнёр',
  vesta: 'Посвящение, фокус',
  eros: 'Влечение, страсть',
  psyche: 'Душа, трансформация',
};

const LILITH_LABELS: Record<string, string> = {
  mean: 'Средняя Лилит',
  true: 'Истинная Лилит',
  interpolated: 'Интерп. Лилит',
};

export default function AsteroidsLilithBlock({ birthData, theme }: Props) {
  const [asteroids, setAsteroids] = useState<AsteroidsData | null>(null);
  const [lilith, setLilith]       = useState<LilithExtendedData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [showDesc, setShowDesc]   = useState(false);

  useEffect(() => {
    if (!birthData.date || !birthData.time) return;
    setLoading(true); setError(null);
    Promise.all([
      getAsteroids(birthData),
      getLilithExtended(birthData),
    ])
      .then(([ast, lil]) => { setAsteroids(ast); setLilith(lil); })
      .catch(e => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [birthData.date, birthData.time, birthData.lat, birthData.lon]);

  if (loading && !asteroids) {
    return (
      <div className={`rounded-xl border ${theme.card} p-8 flex justify-center`}>
        <Loader2 className={`h-8 w-8 animate-spin ${theme.symbol}`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl border ${theme.card} p-4 flex items-center gap-2`}>
        <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Asteroids */}
      {asteroids && (
        <div className={`rounded-xl border ${theme.card} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <Circle className={`h-4 w-4 ${theme.symbol}`} />
            <h3 className={`font-semibold ${theme.text}`}>Астероиды</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(asteroids.asteroids).map(([name, data]) => (
              <div key={name} className="rounded-lg p-3 bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg">{ASTEROID_GLYPHS[name] ?? '●'}</span>
                  <span className={`text-xs font-medium ${theme.text}`}>{ASTEROID_NAME_RU[name] ?? name}</span>
                </div>
                <p className={`text-sm font-bold ${theme.symbol}`}>
                  {SIGN_GLYPHS[data.sign] ?? ''} {data.deg_min}
                </p>
                <p className={`text-xs capitalize ${theme.muted ?? 'text-white/50'}`}>{data.sign}</p>
                {data.retrograde && (
                  <span className="text-xs text-amber-400 font-semibold">℞</span>
                )}
                <p className={`mt-1 text-xs ${theme.muted ?? 'text-white/50'} leading-tight`}>
                  {ASTEROID_KEYWORDS[name] ?? ''}
                </p>
              </div>
            ))}
          </div>
          {asteroids.unavailable.length > 0 && (
            <p className={`mt-2 text-xs ${theme.muted ?? 'text-white/50'}`}>
              ⚠ Недоступно (нужен seas_18.se1): {asteroids.unavailable.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Lilith Extended */}
      {lilith && (
        <div className={`rounded-xl border ${theme.card} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`text-lg ${theme.symbol}`}>⚸</span>
              <h3 className={`font-semibold ${theme.text}`}>Лилит (три вида)</h3>
            </div>
            <button
              onClick={() => setShowDesc(v => !v)}
              className={`text-xs ${theme.symbol} flex items-center gap-1`}
            >
              {showDesc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Описание
            </button>
          </div>

          <div className="space-y-2">
            {(['mean', 'true', 'interpolated'] as const).map(type => {
              const entry = lilith.lilith[type];
              return (
                <div key={type} className="flex items-center justify-between rounded-lg p-2.5 bg-white/5">
                  <div>
                    <p className={`text-xs ${theme.muted ?? 'text-white/50'}`}>{LILITH_LABELS[type]}</p>
                    {showDesc && (
                      <p className={`text-xs mt-0.5 ${theme.muted ?? 'text-white/50'} opacity-70 max-w-xs`}>
                        {entry.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${theme.symbol}`}>
                      {SIGN_GLYPHS[entry.sign] ?? ''} {entry.deg_min}
                    </p>
                    <p className={`text-xs capitalize ${theme.muted ?? 'text-white/50'}`}>{entry.sign}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className={`mt-3 text-xs ${theme.muted ?? 'text-white/50'} leading-relaxed`}>
            Лилит символизирует вытесненную тень, дикую первозданную энергию и табуированные желания.
            Позиция Лилит в карте показывает область, где человек испытывает сильнейшее притяжение и отторжение одновременно.
          </p>
        </div>
      )}
    </div>
  );
}
