/**
 * KabbalahTreeBlock — Kabbalah multi-tab panel.
 * Tab 1: Tree of Life (POST /kabbalah/tree-mapping)
 * Tab 2: 72 Angels of the Shemhamphorash (POST /kabbalah/72-angels)
 * Tab 3: Four Worlds / Arba Olamot (POST /kabbalah/four-worlds)
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  getTreeOfLife, TreeOfLifeResult,
  getAngels72, Angels72Result, ShemAngel,
  getFourWorlds, FourWorldsResult,
} from '../services/astrologyService';
import type { BirthInput } from '../types/astro';

// ── Sephiroth definitions ─────────────────────────────────────────────────────

interface SephirahDef {
  number: number;
  name: string;
  nameRu: string;
  planet: string;
  pillar: 'left' | 'middle' | 'right';
  title: string;       // Kabbalistic title
  keywords: string;
}

const SEPHIROTH: SephirahDef[] = [
  { number: 1,  name: 'Kether',   nameRu: 'Кетер',   planet: 'Neptune', pillar: 'middle', title: 'Корона',       keywords: 'единство, источник, чистое сознание' },
  { number: 2,  name: 'Chokmah',  nameRu: 'Хокма',   planet: 'Uranus',  pillar: 'right',  title: 'Мудрость',     keywords: 'творческий импульс, мужское начало' },
  { number: 3,  name: 'Binah',    nameRu: 'Бина',    planet: 'Saturn',  pillar: 'left',   title: 'Понимание',    keywords: 'форма, ограничение, великая мать' },
  { number: 4,  name: 'Chesed',   nameRu: 'Хесед',   planet: 'Jupiter', pillar: 'right',  title: 'Милосердие',   keywords: 'рост, щедрость, экспансия' },
  { number: 5,  name: 'Geburah',  nameRu: 'Гебура',  planet: 'Mars',    pillar: 'left',   title: 'Суровость',    keywords: 'сила, дисциплина, справедливость' },
  { number: 6,  name: 'Tiphareth',nameRu: 'Тиферет', planet: 'Sun',     pillar: 'middle', title: 'Красота',      keywords: 'гармония, центр, высшее я' },
  { number: 7,  name: 'Netzach',  nameRu: 'Нецах',   planet: 'Venus',   pillar: 'right',  title: 'Победа',       keywords: 'эмоции, желания, природные силы' },
  { number: 8,  name: 'Hod',      nameRu: 'Ход',     planet: 'Mercury', pillar: 'left',   title: 'Великолепие',  keywords: 'разум, коммуникация, адаптация' },
  { number: 9,  name: 'Yesod',    nameRu: 'Йесод',   planet: 'Moon',    pillar: 'middle', title: 'Основание',    keywords: 'подсознание, ритм, чувства' },
  { number: 10, name: 'Malkuth',  nameRu: 'Малхут',  planet: 'Earth',   pillar: 'middle', title: 'Царство',      keywords: 'материя, воплощение, земной мир' },
];

const PILLAR_COLORS = {
  left:   { bg: 'bg-red-500/10',    border: 'border-red-500/25',   text: 'text-red-300',   label: 'Столп Суровости' },
  middle: { bg: 'bg-white/5',       border: 'border-white/15',     text: 'text-white/70',  label: 'Столп Равновесия' },
  right:  { bg: 'bg-blue-500/10',   border: 'border-blue-500/25',  text: 'text-blue-300',  label: 'Столп Милосердия' },
};

const PLANET_GLYPH: Record<string, string> = {
  Neptune: '♆', Uranus: '♅', Saturn: '♄', Jupiter: '♃', Mars: '♂',
  Sun: '☉', Venus: '♀', Mercury: '☿', Moon: '☽', Earth: '⊕',
};

// ── Tree SVG visualisation ───────────────────────────────────────────────────

interface TreeNode {
  id: number;
  x: number;
  y: number;
  active: boolean;
  sign?: string;
}

const SEPH_PATHS = [
  [1,2],[1,3],[1,6],[2,3],[2,4],[2,6],[3,5],[3,6],[4,5],[4,6],[4,7],
  [5,6],[5,8],[6,7],[6,8],[6,9],[7,8],[7,9],[7,10],[8,9],[8,10],[9,10],
];

const NODE_POSITIONS: Record<number, [number, number]> = {
  1: [150, 20], 2: [230, 70], 3: [70, 70],
  4: [230, 150], 5: [70, 150], 6: [150, 150],
  7: [230, 220], 8: [70, 220], 9: [150, 230], 10: [150, 300],
};

const SIGN_GLYPH: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌', virgo: '♍',
  libra: '♎', scorpio: '♏', sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

function TreeSVG({ activeSephiroth }: { activeSephiroth: Set<number> }) {
  const nodes: TreeNode[] = SEPHIROTH.map(s => ({
    id: s.number,
    x: NODE_POSITIONS[s.number][0],
    y: NODE_POSITIONS[s.number][1],
    active: activeSephiroth.has(s.number),
  }));

  return (
    <svg viewBox="0 0 300 330" className="w-full max-w-[280px] mx-auto select-none">
      {/* Paths */}
      {SEPH_PATHS.map(([a, b]) => {
        const na = NODE_POSITIONS[a], nb = NODE_POSITIONS[b];
        const active = activeSephiroth.has(a) && activeSephiroth.has(b);
        return (
          <line
            key={`${a}-${b}`}
            x1={na[0]} y1={na[1]} x2={nb[0]} y2={nb[1]}
            stroke={active ? '#a78bfa' : 'rgba(255,255,255,0.08)'}
            strokeWidth={active ? 1.5 : 0.8}
          />
        );
      })}
      {/* Nodes */}
      {nodes.map(n => {
        const s = SEPHIROTH.find(x => x.number === n.id)!;
        const pc = PILLAR_COLORS[s.pillar];
        return (
          <g key={n.id} transform={`translate(${n.x},${n.y})`}>
            <circle
              r={n.active ? 14 : 11}
              fill={n.active ? (s.pillar === 'left' ? '#ef44441a' : s.pillar === 'right' ? '#3b82f61a' : '#ffffff0f') : 'rgba(0,0,0,0.3)'}
              stroke={n.active ? (s.pillar === 'left' ? '#f87171' : s.pillar === 'right' ? '#60a5fa' : '#a78bfa') : 'rgba(255,255,255,0.12)'}
              strokeWidth={n.active ? 1.5 : 0.8}
            />
            <text x={0} y={4} textAnchor="middle" fontSize={n.active ? 11 : 9}
              fill={n.active ? '#fff' : 'rgba(255,255,255,0.3)'}>
              {PLANET_GLYPH[s.planet] ?? s.number}
            </text>
            <text x={0} y={22} textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.4)">
              {s.nameRu}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── pillar bar ────────────────────────────────────────────────────────────────

function PillarBar({ data }: { data: { left: number; middle: number; right: number } }) {
  const total = data.left + data.middle + data.right || 1;
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Баланс Столпов</div>
      {(['right', 'middle', 'left'] as const).map(pillar => {
        const val   = data[pillar];
        const pct   = Math.round((val / total) * 100);
        const pc    = PILLAR_COLORS[pillar];
        return (
          <div key={pillar}>
            <div className="flex justify-between items-center mb-0.5">
              <span className={`text-xs ${pc.text}`}>{pc.label}</span>
              <span className={`text-xs font-mono ${pc.text}`}>{val} планет ({pct}%)</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full rounded-full ${pillar === 'right' ? 'bg-blue-400' : pillar === 'left' ? 'bg-red-400' : 'bg-violet-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

type KabTab = 'tree' | 'angels' | 'worlds';

interface Props {
  birthData: BirthInput;
}

// ── 72 Angels panel ──────────────────────────────────────────────────────────

const PLANET_GLYPH_LC: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  north_node: '☊', chiron: '⚷',
};

function Angels72Panel({ data }: { data: Angels72Result }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { tikkun_angel, natal_angels } = data;
  return (
    <div className="space-y-4">
      {/* Tikkun angel */}
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
        <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Ангел Тиккуна (миссия души)</div>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-amber-300">#{tikkun_angel.tikkun_number}</span>
          <span className="text-base font-semibold text-white/80">{tikkun_angel.angel}</span>
          <span className="text-xs text-white/40 font-hebrew ml-auto">{tikkun_angel.sign} {Math.round(tikkun_angel.degree_in_sign)}°</span>
        </div>
        <p className="text-xs text-white/50 mt-1 leading-relaxed">{tikkun_angel.description}</p>
      </div>

      {/* Per-planet angels */}
      <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
        <div className="px-4 py-2 border-b border-white/8">
          <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">
            Ангелы натальных планет
          </span>
        </div>
        <div className="divide-y divide-white/5">
          {Object.entries(natal_angels).map(([pname, angel]) => (
            <div key={pname}>
              <button
                onClick={() => setExpanded(expanded === pname ? null : pname)}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/3 transition-colors text-left"
              >
                <span className="text-xl text-white/60 w-6 text-center">
                  {PLANET_GLYPH_LC[pname] ?? '⊕'}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white/80 capitalize">{pname}</span>
                    <span className="text-xs text-white/40">{angel.sign} {Math.round(angel.lon % 30)}°</span>
                  </div>
                  <div className="text-[10px] text-amber-300/70 mt-0.5">
                    #{angel.angel_number} {angel.angel_name} · {angel.tarot_card}
                  </div>
                </div>
                <span className="text-white/20 text-xs">{expanded === pname ? '▲' : '▼'}</span>
              </button>
              {expanded === pname && (
                <div className="px-4 pb-3 pt-1 bg-white/2 border-t border-white/5 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">Иврит</div>
                    <div className="text-base text-amber-200/70 font-serif">{angel.hebrew}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">Декан-планета</div>
                    <div className="text-sm text-white/60 capitalize">{angel.decan_planet}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">Тема</div>
                    <div className="text-xs text-white/55 leading-relaxed">{angel.theme}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Four Worlds panel ─────────────────────────────────────────────────────────

const WORLD_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  atziluth: { bg: 'bg-orange-500/10', border: 'border-orange-500/25', text: 'text-orange-300', dot: 'bg-orange-400' },
  briah:    { bg: 'bg-blue-500/10',   border: 'border-blue-500/25',   text: 'text-blue-300',   dot: 'bg-blue-400'   },
  yetzirah: { bg: 'bg-violet-500/10', border: 'border-violet-500/25', text: 'text-violet-300', dot: 'bg-violet-400' },
  assiah:   { bg: 'bg-green-500/10',  border: 'border-green-500/25',  text: 'text-green-300',  dot: 'bg-green-400'  },
};

function FourWorldsPanel({ data }: { data: FourWorldsResult }) {
  const [expanded, setExpanded] = useState<string | null>(data.dominant_world);
  const worlds = ['atziluth', 'briah', 'yetzirah', 'assiah'];
  const total  = Object.values(data.worlds_balance).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-4">
      {/* Dominant world callout */}
      <div className={`rounded-xl border ${WORLD_COLORS[data.dominant_world]?.border} ${WORLD_COLORS[data.dominant_world]?.bg} p-4`}>
        <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Доминирующий мир</div>
        <div className={`text-base font-bold ${WORLD_COLORS[data.dominant_world]?.text}`}>
          {data.dominant_world_data.name_ru}
        </div>
        <div className="text-xs text-white/50 mt-0.5">
          {data.dominant_world_data.element_ru} · {data.dominant_world_data.soul_level}
        </div>
        <p className="text-xs text-white/55 mt-2 leading-relaxed">{data.interpretation}</p>
      </div>

      {/* Balance bar */}
      <div className="rounded-xl border border-white/10 bg-white/3 p-4">
        <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Баланс Четырёх Миров</div>
        <div className="space-y-2">
          {worlds.map(w => {
            const cnt = data.worlds_balance[w] ?? 0;
            const pct = Math.round((cnt / total) * 100);
            const c   = WORLD_COLORS[w];
            return (
              <div key={w}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className={`text-xs ${c.text}`}>{data.world_descriptions[w]?.name_ru ?? w}</span>
                  <span className={`text-xs font-mono ${c.text}`}>{cnt} планет ({pct}%)</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full rounded-full ${c.dot}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* World accordion */}
      <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
        <div className="px-4 py-2 border-b border-white/8">
          <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">Описание Миров</span>
        </div>
        <div className="divide-y divide-white/5">
          {worlds.map(w => {
            const wd   = data.world_descriptions[w];
            const cnt  = data.worlds_balance[w] ?? 0;
            const c    = WORLD_COLORS[w];
            const pls  = data.planets_by_world[w] ?? [];
            return (
              <div key={w}>
                <button
                  onClick={() => setExpanded(expanded === w ? null : w)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/3 transition-colors text-left"
                >
                  <span className={`w-2 h-2 rounded-full ${c.dot} shrink-0`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${c.text}`}>{wd?.name_ru ?? w}</span>
                      <span className="text-[10px] text-white/30">{wd?.element_ru} · {cnt} планет</span>
                    </div>
                    <div className="text-[10px] text-white/30 mt-0.5">{wd?.hebrew_letter}</div>
                  </div>
                  <span className="text-white/20 text-xs">{expanded === w ? '▲' : '▼'}</span>
                </button>
                {expanded === w && wd && (
                  <div className="px-4 pb-3 pt-1 bg-white/2 border-t border-white/5 space-y-3">
                    <p className="text-xs text-white/55 leading-relaxed">{wd.theme}</p>
                    <div>
                      <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Ключевые вопросы</div>
                      <ul className="space-y-0.5">
                        {wd.questions.map((q, i) => (
                          <li key={i} className="text-xs text-white/50 flex gap-1.5">
                            <span className={c.text}>›</span>{q}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">Практика</div>
                      <p className="text-xs text-white/50 italic">{wd.practice}</p>
                    </div>
                    {pls.length > 0 && (
                      <div>
                        <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Планеты в этом мире</div>
                        <div className="flex flex-wrap gap-1.5">
                          {pls.map(p => (
                            <span key={p.planet} className={`text-[10px] px-1.5 py-0.5 rounded border ${c.bg} ${c.border} ${c.text}`}>
                              {PLANET_GLYPH_LC[p.planet] ?? '⊕'} {p.planet} ({p.sign})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-[10px] text-white/25 uppercase tracking-widest">
                      Уровень души: {wd.soul_level}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function KabbalahTreeBlock({ birthData }: Props) {
  const [tab, setTab]           = useState<KabTab>('tree');
  const [data, setData]         = useState<TreeOfLifeResult | null>(null);
  const [angelsData, setAngels] = useState<Angels72Result | null>(null);
  const [worldsData, setWorlds] = useState<FourWorldsResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!birthData.date) return;
    setLoading(true); setError(null);
    try {
      const [tree, angels, worlds] = await Promise.all([
        getTreeOfLife(birthData),
        getAngels72(birthData),
        getFourWorlds(birthData),
      ]);
      setData(tree);
      setAngels(angels);
      setWorlds(worlds);
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
        <p className="text-white/40 text-sm">Введите данные рождения для Каббалы</p>
      </div>
    );
  }

  const tree = data?.tree;
  const activeSephirothSet = new Set<number>(
    (tree?.active_sephiroth ?? []).map(s => s.number)
  );
  const planetSigns = tree?.planet_sephirah ?? {};

  const TABS: { key: KabTab; label: string }[] = [
    { key: 'tree',   label: '✡ Древо Жизни' },
    { key: 'angels', label: '👼 72 Ангела' },
    { key: 'worlds', label: '🌍 4 Мира' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-white/10 bg-white/3 p-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✡</span>
          <div>
            <h3 className="text-sm font-semibold text-white/80">Каббала</h3>
            <p className="text-xs text-white/40 mt-0.5">
              Древо Жизни · 72 Ангела Шем · Четыре Мира (Арба Оламот)
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mt-3 border border-white/10 rounded-lg p-0.5 bg-white/3">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 text-xs py-1.5 rounded-md transition-colors font-medium ${
                tab === t.key
                  ? 'bg-violet-500/25 text-violet-200 border border-violet-500/30'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-red-300 text-sm">{error}</div>
      )}

      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {[1,2].map(i => <div key={i} className="h-48 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      )}

      {/* Tab: Tree of Life */}
      {!loading && tab === 'tree' && tree && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SVG Diagram */}
            <div className="rounded-xl border border-white/10 bg-white/3 p-4 flex flex-col items-center">
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3">
                Схема Древа Жизни
              </div>
              <TreeSVG activeSephiroth={activeSephirothSet} />
              <div className="mt-2 flex gap-4 text-[10px] text-white/30">
                <span><span className="text-violet-400">●</span> Активная Сефира</span>
                <span><span className="text-white/20">●</span> Пустая Сефира</span>
              </div>
            </div>

            {/* Pillar balance + dominant */}
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/3 p-4">
                {tree.pillar_balance && <PillarBar data={tree.pillar_balance} />}
                <div className="mt-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">Доминирующий столп</div>
                  <div className="text-sm font-semibold text-violet-300">
                    {PILLAR_COLORS[(tree.dominant_pillar as 'left'|'middle'|'right')]?.label ?? tree.dominant_pillar}
                  </div>
                  {tree.balance_comment && (
                    <p className="text-xs text-white/50 mt-1">{tree.balance_comment}</p>
                  )}
                </div>
              </div>

              {/* Planet → Sephirah mapping */}
              {Object.keys(planetSigns).length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/3 p-4">
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Планеты → Сефирот</div>
                  <div className="space-y-1.5">
                    {Object.entries(planetSigns).map(([planet, info]) => {
                      const seph = SEPHIROTH.find(s => s.name === info.sephirah || s.number === info.number);
                      const pillarColor = PILLAR_COLORS[seph?.pillar ?? 'middle'];
                      return (
                        <div key={planet} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white/60 text-base">{PLANET_GLYPH[planet] ?? '?'}</span>
                            <span className="text-white/60">{planet}</span>
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${pillarColor.bg} ${pillarColor.border} border ${pillarColor.text}`}>
                            {seph?.nameRu ?? info.sephirah}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sephiroth accordion */}
          <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
            <div className="px-4 py-2 border-b border-white/8">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">
                10 Сефирот — детальное описание
              </span>
            </div>
            <div className="divide-y divide-white/5">
              {SEPHIROTH.map(s => {
                const isActive = activeSephirothSet.has(s.number);
                const pc = PILLAR_COLORS[s.pillar];
                return (
                  <div key={s.number}>
                    <button
                      onClick={() => setExpanded(expanded === s.number ? null : s.number)}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/3 transition-colors text-left"
                    >
                      <span className="text-lg text-white/50">{PLANET_GLYPH[s.planet] ?? s.number}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isActive ? 'text-white/90' : 'text-white/35'}`}>
                            {s.nameRu}
                          </span>
                          <span className={`text-[10px] ${pc.text}`}>{pc.label}</span>
                          {isActive
                            ? <span className="ml-auto text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/25 rounded px-1">Активна</span>
                            : <span className="ml-auto text-[10px] text-white/20">Пустая</span>
                          }
                        </div>
                        <div className="text-[10px] text-white/30 mt-0.5">{s.title} · {s.planet}</div>
                      </div>
                      <span className="text-white/20 text-xs">{expanded === s.number ? '▲' : '▼'}</span>
                    </button>
                    {expanded === s.number && (
                      <div className="px-4 pb-3 pt-1 bg-white/2 border-t border-white/5">
                        <p className="text-xs text-white/50 leading-relaxed">{s.keywords}</p>
                        {!isActive && (
                          <p className="mt-1.5 text-xs text-amber-300/70 italic">
                            Незанятая Сефира — рекомендована для сознательного развития.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Tab: 72 Angels */}
      {!loading && tab === 'angels' && angelsData && (
        <Angels72Panel data={angelsData} />
      )}

      {/* Tab: Four Worlds */}
      {!loading && tab === 'worlds' && worldsData && (
        <FourWorldsPanel data={worldsData} />
      )}
    </div>
  );
}

export default KabbalahTreeBlock;
