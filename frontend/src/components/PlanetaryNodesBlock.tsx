/**
 * PlanetaryNodesBlock — heliocentric ascending nodes (Ω) of planetary orbits.
 * Calls POST /natal/planetary-nodes.
 * Shows each planet's north/south node ecliptic position + aspects to natal chart.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { getPlanetaryNodes, PlanetaryNodesResult, PlanetaryNode } from '../services/astrologyService';
import type { BirthInput } from '../types/astro';

const PLANET_GLYPH: Record<string, string> = {
  mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃',
  saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
};

const SIGN_GLYPH: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌', virgo: '♍',
  libra: '♎', scorpio: '♏', sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

const SIGN_NAMES_RU: Record<string, string> = {
  aries: 'Овен', taurus: 'Телец', gemini: 'Близнецы', cancer: 'Рак',
  leo: 'Лев', virgo: 'Дева', libra: 'Весы', scorpio: 'Скорпион',
  sagittarius: 'Стрелец', capricorn: 'Козерог', aquarius: 'Водолей', pisces: 'Рыбы',
};

const PLANET_NAMES_RU: Record<string, string> = {
  mercury: 'Меркурий', venus: 'Венера', mars: 'Марс', jupiter: 'Юпитер',
  saturn: 'Сатурн', uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон',
};

const ASPECT_COLOR: Record<string, string> = {
  conjunction:  'text-amber-300',
  opposition:   'text-red-300',
  trine:        'text-blue-300',
  square:       'text-red-400',
  sextile:      'text-green-300',
  quincunx:     'text-orange-300',
  semisextile:  'text-white/50',
  semisquare:   'text-orange-400',
  sesquiquadrate: 'text-orange-400',
};

function NodeRow({ planet, node }: { planet: string; node: PlanetaryNode }) {
  const [expanded, setExpanded] = useState(false);
  const sigN = node.north_node_sign.toLowerCase();
  const sigS = node.south_node_sign.toLowerCase();
  const deg  = Math.floor(node.north_node_degree);
  const min  = Math.round((node.north_node_degree % 1) * 60);
  const hasAspects = node.aspects_to_natal.length > 0;

  return (
    <div>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/3 transition-colors text-left"
      >
        {/* Planet glyph */}
        <span className="text-2xl text-white/60 w-8 text-center shrink-0">
          {PLANET_GLYPH[planet] ?? '⊕'}
        </span>

        {/* Planet name + node */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white/80 capitalize">
              {PLANET_NAMES_RU[planet] ?? planet}
            </span>
            <span className="text-xs text-white/40">☊ Восх. узел</span>
          </div>
          <div className="text-xs text-white/55 mt-0.5 flex items-center gap-2">
            <span className="text-base">{SIGN_GLYPH[sigN] ?? sigN}</span>
            <span>{SIGN_NAMES_RU[sigN] ?? sigN} {deg}°{min.toString().padStart(2,'0')}′</span>
            {hasAspects && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/25 text-violet-300 text-[10px]">
                {node.aspects_to_natal.length} аспект{node.aspects_to_natal.length > 1 ? 'а' : ''}
              </span>
            )}
          </div>
        </div>

        {/* South node */}
        <div className="text-right shrink-0">
          <div className="text-[10px] text-white/25 uppercase tracking-widest">☋ Нисх.</div>
          <div className="text-xs text-white/40 flex items-center gap-1 justify-end">
            <span>{SIGN_GLYPH[sigS] ?? sigS}</span>
            <span>{SIGN_NAMES_RU[sigS] ?? sigS}</span>
          </div>
        </div>

        <span className="text-white/20 text-xs ml-2">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-1 bg-white/2 border-t border-white/5 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">Восходящий узел (☊)</div>
              <div className="text-white/65">
                {SIGN_GLYPH[sigN]} {SIGN_NAMES_RU[sigN]} {deg}°{min.toString().padStart(2,'0')}′
                <span className="text-white/35 ml-1">({node.north_node_lon.toFixed(2)}° экл.)</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">Нисходящий узел (☋)</div>
              <div className="text-white/65">
                {SIGN_GLYPH[sigS]} {SIGN_NAMES_RU[sigS]}
                <span className="text-white/35 ml-1">({node.south_node_lon.toFixed(2)}° экл.)</span>
              </div>
            </div>
          </div>

          {hasAspects && (
            <div>
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                Аспекты к натальным планетам
              </div>
              <div className="flex flex-wrap gap-1.5">
                {node.aspects_to_natal.map((a, i) => (
                  <span
                    key={i}
                    className={`text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 ${ASPECT_COLOR[a.aspect] ?? 'text-white/50'}`}
                  >
                    {a.glyph} {a.natal_planet} {a.orb.toFixed(1)}°
                  </span>
                ))}
              </div>
            </div>
          )}

          {!hasAspects && (
            <p className="text-xs text-white/30 italic">Значимых аспектов к натальным планетам не найдено (орб ≤ 2°)</p>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  birthData: BirthInput;
}

export function PlanetaryNodesBlock({ birthData }: Props) {
  const [data, setData]       = useState<PlanetaryNodesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!birthData.date) return;
    setLoading(true); setError(null);
    try {
      setData(await getPlanetaryNodes(birthData));
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
        <p className="text-white/40 text-sm">Введите данные рождения для планетарных узлов</p>
      </div>
    );
  }

  const planets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-white/10 bg-white/3 p-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">☊</span>
          <div>
            <h3 className="text-sm font-semibold text-white/80">Планетарные узлы</h3>
            <p className="text-xs text-white/40 mt-0.5">
              Гелиоцентрические восходящие узлы орбит планет (Мееус J2000, точность ~0.5°).
              Показывают, где орбита пересекает эклиптику.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-red-300 text-sm">{error}</div>
      )}

      {loading && !data && (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      )}

      {data && (
        <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
          <div className="divide-y divide-white/5">
            {planets.map(p => {
              const node = data.nodes[p];
              if (!node) return null;
              return <NodeRow key={p} planet={p} node={node} />;
            })}
          </div>
        </div>
      )}

      {data && (
        <p className="text-[10px] text-white/25 text-center">{data.note}</p>
      )}
    </div>
  );
}

export default PlanetaryNodesBlock;
