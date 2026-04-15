/**
 * HeliocentricBlock — Heliocentric (Sun-centred) natal chart.
 * Calls POST /heliocentric and renders planet positions + aspects table.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  getHeliocentricChart,
  HeliocentricResult,
  HeliocentricPlanet,
} from '../services/astrologyService';
import type { BirthInput } from '../types/astro';

// ── constants ────────────────────────────────────────────────────────────────

const PLANET_RU: Record<string, string> = {
  earth: 'Земля', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера',
  mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран',
  neptune: 'Нептун', pluto: 'Плутон', node: 'Сев.Узел', true_node: 'Ист.Узел',
  chiron: 'Хирон',
};

const PLANET_GLYPH: Record<string, string> = {
  earth: '⊕', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  node: '☊', true_node: '☊', chiron: '⚷',
};

const PLANET_COLOR: Record<string, string> = {
  earth: 'text-emerald-400', moon: 'text-slate-300', mercury: 'text-cyan-400',
  venus: 'text-pink-400', mars: 'text-red-400', jupiter: 'text-indigo-400',
  saturn: 'text-stone-400', uranus: 'text-teal-400', neptune: 'text-violet-400',
  pluto: 'text-rose-400', node: 'text-amber-400', true_node: 'text-amber-400',
  chiron: 'text-orange-400',
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

const ASPECT_STYLE: Record<string, { color: string; label: string }> = {
  conjunction:  { color: 'text-violet-300', label: '☌' },
  opposition:   { color: 'text-red-300',    label: '☍' },
  trine:        { color: 'text-blue-300',   label: '△' },
  square:       { color: 'text-red-300',    label: '□' },
  sextile:      { color: 'text-sky-300',    label: '✶' },
  quincunx:     { color: 'text-amber-300',  label: '⚻' },
  semisextile:  { color: 'text-white/40',   label: '⚺' },
  semisquare:   { color: 'text-orange-300', label: '∠' },
  sesquiquadrate: { color: 'text-orange-300', label: '⚼' },
};

const PLANET_ORDER = [
  'earth', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  'node', 'true_node', 'chiron',
];

// ── helpers ──────────────────────────────────────────────────────────────────

function lonToDisplay(lon: number): string {
  const sign = Math.floor(lon / 30);
  const SIGNS = ['Ар','Тл','Бл','Рк','Лв','Дв','Вс','Ск','Ст','Кз','Вд','Рб'];
  const deg   = Math.floor(lon % 30);
  const min   = Math.floor((lon % 1) * 60);
  return `${SIGNS[sign] ?? '?'} ${deg}°${String(min).padStart(2,'0')}'`;
}

// ── planet row ────────────────────────────────────────────────────────────────

function PlanetRow({ name, p }: { name: string; p: HeliocentricPlanet }) {
  const color = PLANET_COLOR[name] ?? 'text-white/60';
  return (
    <tr className="border-b border-white/5 hover:bg-white/3 transition-colors">
      <td className="py-1.5 px-2">
        <div className={`flex items-center gap-1.5 ${color}`}>
          <span className="text-base">{PLANET_GLYPH[name] ?? '?'}</span>
          <span className="text-xs font-medium">{PLANET_RU[name] ?? name}</span>
        </div>
      </td>
      <td className="py-1.5 px-2 text-xs text-white/80">
        <span className="text-base mr-1">{SIGN_GLYPH[p.sign] ?? ''}</span>
        {SIGN_RU[p.sign] ?? p.sign}
      </td>
      <td className="py-1.5 px-2 text-xs text-white/60 font-mono">{p.deg_min}</td>
      <td className="py-1.5 px-2 text-xs text-white/40 font-mono">{p.lon.toFixed(3)}°</td>
      {p.dist_au != null && (
        <td className="py-1.5 px-2 text-xs text-white/30 font-mono hidden md:table-cell">
          {p.dist_au.toFixed(3)} AU
        </td>
      )}
      <td className="py-1.5 px-2">
        {p.retrograde && (
          <span className="text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 rounded px-1">℞</span>
        )}
      </td>
    </tr>
  );
}

// ── main component ────────────────────────────────────────────────────────────

interface Props {
  birthData: BirthInput;
}

export function HeliocentricBlock({ birthData }: Props) {
  const [data, setData]       = useState<HeliocentricResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [showAspects, setShowAspects] = useState(false);

  const load = useCallback(async () => {
    if (!birthData.date) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getHeliocentricChart(birthData);
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [birthData]);

  useEffect(() => { load(); }, [load]);

  if (!birthData.date) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
        <p className="text-white/40 text-sm">Введите данные рождения для гелиоцентрической карты</p>
      </div>
    );
  }

  // Sort planets by orbital order
  const sortedPlanets = data
    ? PLANET_ORDER.filter(p => p in data.planets).map(p => [p, data.planets[p]] as [string, HeliocentricPlanet])
    : [];

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="rounded-xl border border-white/10 bg-white/3 p-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl">☀</span>
          <div>
            <h3 className="text-sm font-semibold text-white/80">Гелиоцентрическая карта</h3>
            <p className="text-xs text-white/40 mt-0.5 leading-relaxed max-w-lg">
              Вид из центра Солнца. <span className="text-emerald-400">⊕ Земля</span> занимает
              позицию напротив Солнца в геоцентрической карте. Показывает «истинные» орбитальные
              позиции планет без искажений земной перспективы.
            </p>
            {data && (
              <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                <span className={`px-2 py-0.5 rounded-full border ${
                  data.method === 'swiss_ephemeris'
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                }`}>
                  {data.method === 'swiss_ephemeris' ? '✓ Swiss Ephemeris' : '~ Приближение'}
                </span>
                <span className="text-white/30">{data.metadata.note}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-red-300 text-sm">{error}</div>
      )}

      {loading && !data && (
        <div className="space-y-1">
          {[1,2,3,4,5].map(i => <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />)}
        </div>
      )}

      {data && (
        <>
          {/* Planet table */}
          <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
            <div className="px-4 py-2 border-b border-white/8">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">
                Гелиоцентрические позиции ({sortedPlanets.length} тел)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="py-1.5 px-2 text-left text-[10px] text-white/30 font-medium uppercase">Тело</th>
                    <th className="py-1.5 px-2 text-left text-[10px] text-white/30 font-medium uppercase">Знак</th>
                    <th className="py-1.5 px-2 text-left text-[10px] text-white/30 font-medium uppercase">Позиция</th>
                    <th className="py-1.5 px-2 text-left text-[10px] text-white/30 font-medium uppercase">Лонг.</th>
                    {sortedPlanets.some(([,p]) => p.dist_au != null) && (
                      <th className="py-1.5 px-2 text-left text-[10px] text-white/30 font-medium uppercase hidden md:table-cell">Дист.</th>
                    )}
                    <th className="py-1.5 px-2 text-left text-[10px] text-white/30 font-medium uppercase">R</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlanets.map(([name, planet]) => (
                    <PlanetRow key={name} name={name} p={planet} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Aspects */}
          {data.aspects && data.aspects.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/3">
              <button
                onClick={() => setShowAspects(!showAspects)}
                className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/3 transition-colors"
              >
                <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">
                  Аспекты между гелиоцентрическими телами ({data.aspects.length})
                </span>
                <span className="text-white/30 text-xs">{showAspects ? '▲' : '▼'}</span>
              </button>
              {showAspects && (
                <div className="border-t border-white/8 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/8">
                        <th className="py-1 px-3 text-left text-[10px] text-white/30 font-medium">Тело 1</th>
                        <th className="py-1 px-1 text-center text-[10px] text-white/30 font-medium">Асп.</th>
                        <th className="py-1 px-3 text-left text-[10px] text-white/30 font-medium">Тело 2</th>
                        <th className="py-1 px-2 text-right text-[10px] text-white/30 font-medium">Орб</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.aspects.map((asp, i) => {
                        const style = ASPECT_STYLE[asp.aspect] ?? { color: 'text-white/50', label: asp.glyph };
                        return (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/3">
                            <td className="py-1 px-3">
                              <span className={PLANET_COLOR[asp.planet1] ?? 'text-white/60'}>
                                {PLANET_GLYPH[asp.planet1] ?? ''} {PLANET_RU[asp.planet1] ?? asp.planet1}
                              </span>
                            </td>
                            <td className={`py-1 px-1 text-center text-base font-bold ${style.color}`}>
                              {style.label}
                            </td>
                            <td className="py-1 px-3">
                              <span className={PLANET_COLOR[asp.planet2] ?? 'text-white/60'}>
                                {PLANET_GLYPH[asp.planet2] ?? ''} {PLANET_RU[asp.planet2] ?? asp.planet2}
                              </span>
                            </td>
                            <td className={`py-1 px-2 text-right font-mono ${style.color}`}>
                              {asp.orb.toFixed(2)}°
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-white/20 px-1">
            Гелиоцентрическая карта не имеет домов и Асцендента — только орбитальные позиции.
            Используется в работах Пт. Ланскоринга, Виктории Стоун и ведической джйотиш-астрологии.
          </p>
        </>
      )}
    </div>
  );
}

export default HeliocentricBlock;
