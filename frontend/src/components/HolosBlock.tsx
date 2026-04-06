import React, { useState, useMemo } from 'react';
import type { NatalChart } from '../types/astro';
import { SIGN_ELEMENTS } from '../types/astro';
import {
  PLANET_ARCHETYPES,
  ELEMENT_PROFILES,
  MODALITY_PROFILES,
  PROFECTION_THEMES,
  NORTH_NODE_IN_SIGN,
  NORTH_NODE_IN_HOUSE,
  PATTERN_GIFTS,
  SIGN_SUN_ESSENCE,
  SIGN_MOON_ESSENCE,
  SIGN_ASC_ESSENCE,
  LIFE_PHASE_BY_AGE,
} from '../data/holosData';

// ─── Sign helpers ─────────────────────────────────────────────────────────────

const SIGN_MODALITY: Record<string, string> = {
  aries: 'cardinal', cancer: 'cardinal', libra: 'cardinal', capricorn: 'cardinal',
  taurus: 'fixed', leo: 'fixed', scorpio: 'fixed', aquarius: 'fixed',
  gemini: 'mutable', virgo: 'mutable', sagittarius: 'mutable', pisces: 'mutable',
};

const SIGN_RULER: Record<string, string> = {
  aries: 'mars', taurus: 'venus', gemini: 'mercury', cancer: 'moon',
  leo: 'sun', virgo: 'mercury', libra: 'venus', scorpio: 'pluto',
  sagittarius: 'jupiter', capricorn: 'saturn', aquarius: 'uranus', pisces: 'neptune',
};

const SIGN_RU: Record<string, string> = {
  aries: 'Овен', taurus: 'Телец', gemini: 'Близнецы', cancer: 'Рак',
  leo: 'Лев', virgo: 'Дева', libra: 'Весы', scorpio: 'Скорпион',
  sagittarius: 'Стрелец', capricorn: 'Козерог', aquarius: 'Водолей', pisces: 'Рыбы',
};

const PLANET_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера', mars: 'Марс',
  jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон',
};

const ELEMENT_ICON: Record<string, string> = {
  fire: '🔥', earth: '🌱', air: '💨', water: '🌊',
};

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface HolosBlockProps {
  chart: NatalChart;
  birthDate: string; // e.g. "1986-08-13"
}

interface ForecastPeriod {
  label: string;
  dateRange: string;
  theme: string;
  opportunity: string;
  caution: string;
  actions: string[];
  intensity: number;
  colorName: string;
  affirmation: string;
}

// ─── Algorithms ───────────────────────────────────────────────────────────────

function findDominantPlanet(chart: NatalChart): string {
  const planets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const ascSign = chart.houses['h1']?.sign ?? '';
  const mcSign = chart.houses['h10']?.sign ?? '';

  const scores: Record<string, number> = {};

  for (const p of planets) {
    const pd = chart.planets[p];
    if (!pd) continue;
    let score = 0;

    // Dignity score
    const dignityScore = chart.dignities?.[p]?.score ?? 0;
    score += dignityScore * 2;

    // Angular house
    const h = pd.house;
    if (h === 1 || h === 10) score += 5;
    else if (h === 4 || h === 7) score += 2;

    // Aspect count
    const aspectCount = chart.aspects.filter(a => a.p1 === p || a.p2 === p).length;
    score += aspectCount * 0.5;

    // Rules ASC sign
    if (SIGN_RULER[ascSign] === p) score += 4;

    // Rules MC sign
    if (SIGN_RULER[mcSign] === p) score += 3;

    // Personal planet bonus
    if (['sun', 'moon', 'mercury', 'venus', 'mars'].includes(p)) score += 1;

    scores[p] = score;
  }

  return planets.reduce((best, p) => (scores[p] ?? 0) > (scores[best] ?? 0) ? p : best, 'sun');
}

function getDominantElement(chart: NatalChart): {
  element: string;
  counts: { fire: number; earth: number; air: number; water: number };
} {
  const core = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const counts = { fire: 0, earth: 0, air: 0, water: 0 };

  for (const p of core) {
    const pd = chart.planets[p];
    if (!pd) continue;
    const el = SIGN_ELEMENTS[pd.sign] as keyof typeof counts | undefined;
    if (el && el in counts) counts[el]++;
  }

  const element = (Object.keys(counts) as Array<keyof typeof counts>).reduce(
    (best, el) => counts[el] > counts[best as keyof typeof counts] ? el : best,
    'fire' as string
  );

  return { element, counts };
}

function getDominantModality(chart: NatalChart): {
  modality: string;
  counts: { cardinal: number; fixed: number; mutable: number };
} {
  const core = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const counts = { cardinal: 0, fixed: 0, mutable: 0 };

  for (const p of core) {
    const pd = chart.planets[p];
    if (!pd) continue;
    const mod = SIGN_MODALITY[pd.sign] as keyof typeof counts | undefined;
    if (mod && mod in counts) counts[mod]++;
  }

  const modality = (Object.keys(counts) as Array<keyof typeof counts>).reduce(
    (best, mod) => counts[mod] > counts[best as keyof typeof counts] ? mod : best,
    'cardinal' as string
  );

  return { modality, counts };
}

function computeProfectionHouse(birthDate: string): number {
  if (!birthDate) return 1;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasBirthdayPassed) age--;
  return (age % 12) + 1;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${start.toLocaleDateString('ru-RU', opts)} – ${end.toLocaleDateString('ru-RU', opts)}`;
}

function computeLifePhase(birthDate: string): typeof LIFE_PHASE_BY_AGE[0] {
  if (!birthDate) return LIFE_PHASE_BY_AGE[3];
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--;
  return LIFE_PHASE_BY_AGE.find(p => age >= p.minAge && age < p.maxAge) ?? LIFE_PHASE_BY_AGE[LIFE_PHASE_BY_AGE.length - 1];
}

function buildForecastPeriods(chart: NatalChart, birthDate: string): ForecastPeriod[] {
  const today = new Date();
  const profHouse = computeProfectionHouse(birthDate);
  const nextProfHouse = (profHouse % 12) + 1;

  // Intensity based on house importance + patterns
  const patternBonus = Object.values(chart.patterns).filter(Boolean).length;
  const baseIntensity = [1, 10, 4, 7].includes(profHouse) ? 4 : 3;
  const intensity = Math.min(5, baseIntensity + Math.floor(patternBonus / 2));

  const periodColors = ['amber', 'sky', 'violet', 'indigo'];

  const ranges = [
    { label: 'Сейчас', offset: 0, duration: 3 },
    { label: '+3 месяца', offset: 3, duration: 3 },
    { label: '+6 месяцев', offset: 6, duration: 3 },
    { label: '+12 месяцев', offset: 11, duration: 3 },
  ];

  return ranges.map((r, i) => {
    const start = addMonths(today, r.offset);
    const end = addMonths(today, r.offset + r.duration);
    const house = i === 3 ? nextProfHouse : profHouse;
    const theme = PROFECTION_THEMES[house];

    return {
      label: r.label,
      dateRange: formatDateRange(start, end),
      theme: theme?.theme ?? `Год Дома ${house}`,
      opportunity: theme?.opportunity ?? 'Период активного роста и новых возможностей.',
      caution: theme?.caution ?? 'Сохраняйте баланс и осознанность.',
      actions: theme?.bestActions ?? ['Ставьте цели', 'Действуйте системно', 'Опирайтесь на сильные стороны', 'Принимайте поддержку'],
      intensity: i === 0 ? Math.min(5, intensity) : Math.max(1, intensity - (i % 2)),
      colorName: periodColors[i],
      affirmation: theme?.affirmation ?? 'Я иду своим путём.',
    };
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold text-white/80 uppercase tracking-wider mb-3">
      <span className="text-amber-400">✦</span>
      {children}
    </h3>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 ${className}`}>
      {children}
    </div>
  );
}

function IntensityDots({ value }: { value: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${i <= value ? 'bg-amber-400' : 'bg-white/15'}`}
        />
      ))}
    </div>
  );
}

const COLOR_MAP: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  amber:  { text: 'text-amber-300',  bg: 'bg-amber-500/10',  border: 'border-amber-400/30',  dot: 'bg-amber-400' },
  sky:    { text: 'text-sky-300',    bg: 'bg-sky-500/10',    border: 'border-sky-400/30',    dot: 'bg-sky-400' },
  violet: { text: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-400/30', dot: 'bg-violet-400' },
  indigo: { text: 'text-indigo-300', bg: 'bg-indigo-500/10', border: 'border-indigo-400/30', dot: 'bg-indigo-400' },
  pink:   { text: 'text-pink-300',   bg: 'bg-pink-500/10',   border: 'border-pink-400/30',   dot: 'bg-pink-400' },
  red:    { text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-400/30',    dot: 'bg-red-400' },
  green:  { text: 'text-green-300',  bg: 'bg-green-500/10',  border: 'border-green-400/30',  dot: 'bg-green-400' },
  teal:   { text: 'text-teal-300',   bg: 'bg-teal-500/10',   border: 'border-teal-400/30',   dot: 'bg-teal-400' },
  yellow: { text: 'text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-400/30', dot: 'bg-yellow-400' },
  cyan:   { text: 'text-cyan-300',   bg: 'bg-cyan-500/10',   border: 'border-cyan-400/30',   dot: 'bg-cyan-400' },
  purple: { text: 'text-purple-300', bg: 'bg-purple-500/10', border: 'border-purple-400/30', dot: 'bg-purple-400' },
  slate:  { text: 'text-slate-300',  bg: 'bg-slate-500/10',  border: 'border-slate-400/30',  dot: 'bg-slate-400' },
  orange: { text: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-400/30', dot: 'bg-orange-400' },
  blue:   { text: 'text-blue-300',   bg: 'bg-blue-500/10',   border: 'border-blue-400/30',   dot: 'bg-blue-400' },
};

const PLANET_COLOR: Record<string, string> = {
  sun: 'amber', moon: 'sky', mercury: 'yellow', venus: 'pink',
  mars: 'red', jupiter: 'indigo', saturn: 'slate', uranus: 'cyan',
  neptune: 'violet', pluto: 'purple',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HolosBlock({ chart, birthDate }: HolosBlockProps) {
  const [activeTab, setActiveTab] = useState<'essence' | 'gifts' | 'forecast' | 'path'>('essence');
  const [selectedPeriod, setSelectedPeriod] = useState(0);

  // ─── Computed values ───────────────────────────────────────────────────────

  const dominantPlanet = useMemo(() => findDominantPlanet(chart), [chart]);
  const { element: dominantElement, counts: elementCounts } = useMemo(() => getDominantElement(chart), [chart]);
  const { modality: dominantModality, counts: modalityCounts } = useMemo(() => getDominantModality(chart), [chart]);
  const profectionHouse = useMemo(() => computeProfectionHouse(birthDate), [birthDate]);
  const forecastPeriods = useMemo(() => buildForecastPeriods(chart, birthDate), [chart, birthDate]);
  const lifePhase = useMemo(() => computeLifePhase(birthDate), [birthDate]);

  const archetype = PLANET_ARCHETYPES[dominantPlanet] ?? PLANET_ARCHETYPES.sun;
  const elementProfile = ELEMENT_PROFILES[dominantElement] ?? ELEMENT_PROFILES.fire;
  const modalityProfile = MODALITY_PROFILES[dominantModality] ?? MODALITY_PROFILES.cardinal;
  const profectionTheme = PROFECTION_THEMES[profectionHouse];

  const sunSign = chart.planets.sun?.sign ?? '';
  const moonSign = chart.planets.moon?.sign ?? '';
  const ascSign = chart.houses.h1?.sign ?? '';

  const nodeSign = chart.planets.node?.sign ?? '';
  const nodeHouse = chart.planets.node?.house ?? 1;

  const domColor = PLANET_COLOR[dominantPlanet] ?? 'amber';
  const domColors = COLOR_MAP[domColor] ?? COLOR_MAP.amber;

  // Top 3 dignified planets
  const topPlanets = useMemo(() => {
    const core = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
    return core
      .map(p => ({ key: p, score: chart.dignities?.[p]?.score ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter(p => p.score > 0);
  }, [chart]);

  // Active patterns
  const activePatterns = useMemo(() =>
    Object.entries(chart.patterns).filter(([, v]) => v).map(([k]) => k),
    [chart]
  );

  // ─── Render helpers ────────────────────────────────────────────────────────

  const tabs = [
    { key: 'essence' as const, label: 'Суть' },
    { key: 'gifts' as const, label: 'Дары' },
    { key: 'forecast' as const, label: 'Прогноз' },
    { key: 'path' as const, label: 'Путь' },
  ];

  const totalPlanets = elementCounts.fire + elementCounts.earth + elementCounts.air + elementCounts.water;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/80 via-indigo-950/30 to-slate-950/80 backdrop-blur-xl overflow-hidden">

      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <div className={`relative p-6 border-b border-white/10 ${domColors.bg}`}>
        <div className="flex items-start gap-5">
          <div className={`text-5xl ${domColors.text} shrink-0 leading-none`}>
            {archetype.symbol}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-widest text-white/40 font-medium">
                Доминирующий архетип
              </span>
            </div>
            <h2 className={`text-xl font-bold font-serif ${domColors.text} leading-tight mb-1`}>
              {archetype.name}
            </h2>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">{ELEMENT_ICON[archetype.element]}</span>
              <span className="text-sm text-white/60">
                {elementProfile.title.replace(/^[^ ]+ /, '')}
              </span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed line-clamp-3">
              {archetype.essence}
            </p>
          </div>
        </div>

        {/* Quick-stat chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          {sunSign && (
            <span className="px-3 py-1 rounded-full text-xs bg-amber-500/15 border border-amber-400/25 text-amber-300 font-medium">
              ☉ {SIGN_RU[sunSign] ?? sunSign}
            </span>
          )}
          {moonSign && (
            <span className="px-3 py-1 rounded-full text-xs bg-sky-500/15 border border-sky-400/25 text-sky-300 font-medium">
              ☽ {SIGN_RU[moonSign] ?? moonSign}
            </span>
          )}
          {ascSign && (
            <span className="px-3 py-1 rounded-full text-xs bg-violet-500/15 border border-violet-400/25 text-violet-300 font-medium">
              ↑ {SIGN_RU[ascSign] ?? ascSign}
            </span>
          )}
          {/* Life phase badge */}
          <span className="px-3 py-1 rounded-full text-xs bg-white/8 border border-white/15 text-white/60 font-medium">
            {lifePhase.title}
          </span>
        </div>
      </div>

      {/* ── Tab Navigation ──────────────────────────────────────────── */}
      <div className="flex border-b border-white/10 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap
              ${activeTab === tab.key
                ? `${domColors.text} border-b-2 ${domColors.border.replace('border-', 'border-b-')} bg-white/5`
                : 'text-white/40 hover:text-white/70 border-b-2 border-transparent'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────── */}
      <div className="p-5 space-y-5">

        {/* ════ TAB: СУТЬ ════ */}
        {activeTab === 'essence' && (
          <div className="space-y-5">
            {/* Big-3 cards */}
            <div>
              <SectionTitle>Три столпа личности</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Sun */}
                <Card>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl text-amber-300">☉</span>
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                      Солнце в {SIGN_RU[sunSign] ?? sunSign}
                    </span>
                  </div>
                  <p className="text-xs text-white/65 leading-relaxed">
                    {SIGN_SUN_ESSENCE[sunSign] ?? 'Солнце определяет вашу жизненную силу и путь самовыражения.'}
                  </p>
                </Card>
                {/* Moon */}
                <Card>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl text-sky-300">☽</span>
                    <span className="text-xs font-bold text-sky-300 uppercase tracking-wide">
                      Луна в {SIGN_RU[moonSign] ?? moonSign}
                    </span>
                  </div>
                  <p className="text-xs text-white/65 leading-relaxed">
                    {SIGN_MOON_ESSENCE[moonSign] ?? 'Луна отражает вашу эмоциональную природу и внутренний мир.'}
                  </p>
                </Card>
                {/* ASC */}
                <Card>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl text-violet-300">↑</span>
                    <span className="text-xs font-bold text-violet-300 uppercase tracking-wide">
                      Асцендент в {SIGN_RU[ascSign] ?? ascSign}
                    </span>
                  </div>
                  <p className="text-xs text-white/65 leading-relaxed">
                    {SIGN_ASC_ESSENCE[ascSign] ?? 'Асцендент — ваша социальная маска и первое впечатление, которое вы производите.'}
                  </p>
                </Card>
              </div>
            </div>

            {/* Element Profile */}
            <div>
              <SectionTitle>Доминирующая стихия</SectionTitle>
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{ELEMENT_ICON[dominantElement]}</span>
                  <span className={`font-bold text-sm ${elementProfile.colorClass}`}>
                    {elementProfile.title}
                  </span>
                </div>

                {/* Element dots bar */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-3">
                  {(['fire', 'earth', 'air', 'water'] as const).map(el => (
                    <div key={el} className="flex items-center gap-2">
                      <span className="text-xs w-16 text-white/45">
                        {el === 'fire' ? '🔥 Огонь' : el === 'earth' ? '🌱 Земля' : el === 'air' ? '💨 Воздух' : '🌊 Вода'}
                      </span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i < elementCounts[el]
                                ? el === 'fire' ? 'bg-orange-400' : el === 'earth' ? 'bg-green-400' : el === 'air' ? 'bg-blue-400' : 'bg-teal-400'
                                : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-white/30">{totalPlanets > 0 ? elementCounts[el] : '-'}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-white/65 leading-relaxed mb-2">{elementProfile.essence}</p>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="text-xs">
                    <span className="text-white/40 uppercase tracking-wide text-[10px]">Сила</span>
                    <p className="text-white/70 mt-0.5">{elementProfile.strength}</p>
                  </div>
                  <div className="text-xs">
                    <span className="text-white/40 uppercase tracking-wide text-[10px]">Развитие</span>
                    <p className="text-white/70 mt-0.5">{elementProfile.growth}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Modality Profile */}
            <div>
              <SectionTitle>Модус действия</SectionTitle>
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white/85">{modalityProfile.title}</span>
                  <div className="flex gap-3 text-xs text-white/40">
                    <span>Кард: {modalityCounts.cardinal}</span>
                    <span>Фикс: {modalityCounts.fixed}</span>
                    <span>Мут: {modalityCounts.mutable}</span>
                  </div>
                </div>
                <p className="text-xs text-white/65 leading-relaxed mb-2">{modalityProfile.essence}</p>
                <div className={`rounded-lg px-3 py-2 ${domColors.bg} border ${domColors.border}`}>
                  <p className={`text-xs ${domColors.text}`}>{modalityProfile.actionStyle}</p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ════ TAB: ДАРЫ ════ */}
        {activeTab === 'gifts' && (
          <div className="space-y-5">
            {/* Top dignified planets */}
            {topPlanets.length > 0 && (
              <div>
                <SectionTitle>Планетарные таланты</SectionTitle>
                <div className="space-y-3">
                  {topPlanets.map(({ key: p, score }) => {
                    const arc = PLANET_ARCHETYPES[p];
                    if (!arc) return null;
                    const pSign = chart.planets[p]?.sign ?? '';
                    const pHouse = chart.planets[p]?.house;
                    const pColors = COLOR_MAP[PLANET_COLOR[p] ?? 'amber'] ?? COLOR_MAP.amber;
                    return (
                      <Card key={p}>
                        <div className="flex items-start gap-3">
                          <div className={`text-3xl ${pColors.text} leading-none pt-0.5 shrink-0`}>
                            {arc.symbol}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-bold ${pColors.text}`}>
                                {PLANET_RU[p] ?? p} в {SIGN_RU[pSign] ?? pSign}
                                {pHouse ? ` (Дом ${pHouse})` : ''}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${pColors.bg} ${pColors.text}`}>
                                Достоинство: {score > 0 ? '+' : ''}{score}
                              </span>
                            </div>
                            <p className="text-xs text-white/65 leading-relaxed mb-1">{arc.gift}</p>
                            <p className={`text-xs ${pColors.text} opacity-80`}>{arc.mission}</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chart patterns */}
            {activePatterns.length > 0 && (
              <div>
                <SectionTitle>Особые конфигурации карты</SectionTitle>
                <div className="space-y-3">
                  {activePatterns.map(pattern => {
                    const pg = PATTERN_GIFTS[pattern];
                    if (!pg) return null;
                    return (
                      <Card key={pattern}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-amber-400">✦</span>
                          <span className="text-sm font-bold text-amber-300">{pg.title}</span>
                        </div>
                        <p className="text-xs text-white/50 mb-2 italic">{pg.meaning}</p>
                        <p className="text-xs text-white/70 leading-relaxed mb-2">{pg.gift}</p>
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/8 border border-amber-400/20">
                          <span className="text-amber-400 text-xs mt-0.5">→</span>
                          <p className="text-xs text-amber-300/80">{pg.advice}</p>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Shadow / Challenge */}
            <div>
              <SectionTitle>Зона роста</SectionTitle>
              <Card className={`border ${domColors.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white/40">🌑</span>
                  <span className="text-sm font-bold text-white/70">Вызов архетипа</span>
                </div>
                <p className="text-xs text-white/65 leading-relaxed">{archetype.challenge}</p>
              </Card>
            </div>

            {/* HOLOS advice */}
            <div>
              <SectionTitle>Совет от HOLOS</SectionTitle>
              <Card className={`${domColors.bg} border ${domColors.border}`}>
                <p className={`text-sm ${domColors.text} leading-relaxed font-medium`}>
                  {archetype.mission}
                </p>
                {elementProfile.timing && (
                  <p className="text-xs text-white/55 mt-2 leading-relaxed">
                    {elementProfile.timing}
                  </p>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ════ TAB: ПРОГНОЗ ════ */}
        {activeTab === 'forecast' && (
          <div className="space-y-5">
            {/* Life phase */}
            <div>
              <SectionTitle>Жизненная фаза</SectionTitle>
              <Card>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🪐</span>
                  <span className="text-sm font-bold text-white/85">{lifePhase.title}</span>
                </div>
                <p className="text-xs text-white/65 leading-relaxed mb-2">{lifePhase.description}</p>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-amber-400 text-xs mt-0.5">→</span>
                  <p className="text-xs text-white/60">{lifePhase.advice}</p>
                </div>
              </Card>
            </div>

            {/* Profection year banner */}
            {profectionTheme && (
              <Card className={`${domColors.bg} border ${domColors.border}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase tracking-widest text-white/40">Год профекции</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${domColors.bg} ${domColors.text} border ${domColors.border}`}>
                    Дом {profectionHouse}
                  </span>
                </div>
                <p className={`text-base font-bold ${domColors.text}`}>{profectionTheme.theme}</p>
                <p className="text-xs text-white/50 mt-1">{profectionTheme.area}</p>
              </Card>
            )}

            {/* Period cards */}
            <div>
              <SectionTitle>Временны́е окна</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {forecastPeriods.map((period, idx) => {
                  const pc = COLOR_MAP[period.colorName] ?? COLOR_MAP.amber;
                  const isSelected = idx === selectedPeriod;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedPeriod(idx)}
                      className={`rounded-lg border p-3 text-left transition-all duration-200 ${
                        isSelected
                          ? `${pc.bg} ${pc.border} shadow-lg scale-[1.02]`
                          : 'bg-white/4 border-white/10 hover:bg-white/8'
                      }`}
                    >
                      <div className={`text-xs font-bold mb-1 ${isSelected ? pc.text : 'text-white/60'}`}>
                        {period.label}
                      </div>
                      <div className="text-[10px] text-white/35 mb-2">{period.dateRange}</div>
                      <IntensityDots value={period.intensity} />
                    </button>
                  );
                })}
              </div>

              {/* Expanded period card */}
              {forecastPeriods[selectedPeriod] && (() => {
                const period = forecastPeriods[selectedPeriod];
                const pc = COLOR_MAP[period.colorName] ?? COLOR_MAP.amber;
                return (
                  <Card className={`${pc.bg} border ${pc.border}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className={`text-sm font-bold ${pc.text} mb-1`}>{period.theme}</h4>
                        <span className="text-xs text-white/40">{period.dateRange}</span>
                      </div>
                      <IntensityDots value={period.intensity} />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-white/40">Возможность</span>
                        <p className="text-xs text-white/70 mt-1 leading-relaxed">{period.opportunity}</p>
                      </div>

                      <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/8 border border-red-400/15">
                        <span className="text-red-400 text-xs mt-0.5">⚠</span>
                        <p className="text-xs text-red-300/80">{period.caution}</p>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-white/40">Лучшие действия</span>
                        <div className="mt-2 space-y-1.5">
                          {period.actions.map((action, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded border ${pc.border} shrink-0 flex items-center justify-center`}>
                                <div className={`w-2 h-2 rounded-sm ${pc.dot}`} />
                              </div>
                              <span className="text-xs text-white/65">{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className={`rounded-lg px-3 py-2 bg-white/5 border border-white/10 text-center`}>
                        <p className={`text-xs italic ${pc.text} opacity-90`}>
                          «{period.affirmation}»
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })()}
            </div>
          </div>
        )}

        {/* ════ TAB: ПУТЬ ════ */}
        {activeTab === 'path' && (
          <div className="space-y-5">
            {/* North Node */}
            <div>
              <SectionTitle>Северный Узел — Ваша миссия</SectionTitle>
              {(() => {
                const nodeMission = NORTH_NODE_IN_SIGN[nodeSign];
                const nodeHouseMission = NORTH_NODE_IN_HOUSE[nodeHouse];
                if (!nodeMission) return (
                  <Card>
                    <p className="text-xs text-white/50">Данные о Северном Узле недоступны.</p>
                  </Card>
                );
                return (
                  <div className="space-y-3">
                    <Card>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg text-amber-300">☊</span>
                        <div>
                          <span className="text-sm font-bold text-amber-300">{nodeMission.title}</span>
                          <span className="text-xs text-white/40 ml-2">в {SIGN_RU[nodeSign] ?? nodeSign}</span>
                        </div>
                      </div>
                      <p className="text-xs text-white/65 leading-relaxed mb-2">{nodeMission.essence}</p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {nodeMission.theme.split(' · ').map(kw => (
                          <span key={kw} className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/12 border border-amber-400/20 text-amber-300/80">
                            {kw}
                          </span>
                        ))}
                      </div>
                      <div className={`rounded-lg px-3 py-2 ${domColors.bg} border ${domColors.border}`}>
                        <p className={`text-xs font-medium ${domColors.text}`}>{nodeMission.mission}</p>
                      </div>
                    </Card>

                    {nodeHouseMission && (
                      <Card>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-white/40 uppercase tracking-wide">Дом {nodeHouse}</span>
                          <span className="text-sm font-bold text-white/80">{nodeHouseMission.title}</span>
                        </div>
                        <p className="text-xs text-white/50 mb-2">{nodeHouseMission.area}</p>
                        <p className="text-xs text-white/70 leading-relaxed">{nodeHouseMission.mission}</p>
                      </Card>
                    )}

                    {/* Practices */}
                    <div>
                      <SectionTitle>Практики реализации</SectionTitle>
                      <Card>
                        <div className="space-y-2">
                          {nodeMission.practices.map((practice, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <span className={`text-xs font-bold ${domColors.text} shrink-0 w-4 mt-0.5`}>{i + 1}.</span>
                              <p className="text-xs text-white/70 leading-relaxed">{practice}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>

                    {/* South Node trap */}
                    <div>
                      <SectionTitle>Ловушка прошлого</SectionTitle>
                      <Card className="border border-red-400/20 bg-red-500/5">
                        <div className="flex items-start gap-2">
                          <span className="text-red-400 text-sm shrink-0">☋</span>
                          <p className="text-xs text-red-300/80 leading-relaxed">{nodeMission.southNodeTrap}</p>
                        </div>
                      </Card>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Mission synthesis */}
            <div>
              <SectionTitle>Синтез миссии</SectionTitle>
              <Card className={`${domColors.bg} border ${domColors.border}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-2xl ${domColors.text}`}>{archetype.symbol}</span>
                  <span className={`text-sm font-bold ${domColors.text}`}>{archetype.name}</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed mb-2">{archetype.mission}</p>
                {NORTH_NODE_IN_SIGN[nodeSign] && (
                  <p className="text-xs text-white/60 leading-relaxed border-t border-white/10 pt-2 mt-2">
                    {NORTH_NODE_IN_SIGN[nodeSign].mission}
                  </p>
                )}
              </Card>
            </div>

            {/* Best timing */}
            <div>
              <SectionTitle>Лучшее время для действия</SectionTitle>
              <Card>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{ELEMENT_ICON[dominantElement]}</span>
                  <span className={`text-sm font-medium ${elementProfile.colorClass}`}>
                    Стихия {elementProfile.title.replace(/^[^ ]+ /, '')}
                  </span>
                </div>
                <p className="text-xs text-white/65 leading-relaxed">{elementProfile.timing}</p>
              </Card>
            </div>

            {/* Final affirmation */}
            {profectionTheme && (
              <div className={`rounded-xl ${domColors.bg} border ${domColors.border} p-5 text-center`}>
                <div className="text-xs uppercase tracking-widest text-white/35 mb-2">Аффирмация года</div>
                <p className={`text-base font-serif ${domColors.text} italic`}>
                  «{profectionTheme.affirmation}»
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
