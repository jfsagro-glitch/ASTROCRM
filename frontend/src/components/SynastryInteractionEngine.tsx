import React, { useMemo, useState, useRef } from 'react';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import type { BirthInput, NatalChart, SynastryResult } from '../types/astro';

type ThemeLike = {
  card: string;
  header: string;
  accent: string;
  text: string;
  tabActive: string;
  tabInactive: string;
};

type AnyResult = Record<string, unknown>;

type SynNodeType = 'aspect_link' | 'house_overlay' | 'angle_activation';

type SynNode = {
  id: string;
  type: SynNodeType;
  category: 'romantic' | 'business' | 'emotional' | 'karmic' | 'conflict';
  pointA: string;
  pointB: string;
  midpoint: number;
  strength: number;
  volatility: number;
  longevityFactor: number;
  meaningTags: string[];
  aspect: string;
  orb: number;
};

type TransitActivation = {
  transitPoint: string;
  targetLayer: 'natal_a' | 'natal_b' | 'synastry' | 'composite';
  targetRef: string;
  aspect: string;
  orb: number;
  dateExact: string;
  windowStart: string;
  windowEnd: string;
  phase: 'applying' | 'exact' | 'separating';
};

type InteractionSignal = {
  signalType: 'relationship_test' | 'bonding_window' | 'growth_window' | 'stability_window' | 'conflict_window';
  participants: ['A', 'B'];
  strength: number;
  window: { start: string; peak: string; end: string };
  activatedTopics: string[];
  initiator: 'A' | 'B' | 'both';
  receiver: 'A' | 'B' | 'both';
  recommendations: {
    goodFor: string[];
    badFor: string[];
  };
  confidence: number;
};

type RouteInsight = {
  through: 'A' | 'B';
  topic: string;
  confidence: number;
  windowStart: string;
  windowPeak: string;
  windowEnd: string;
  whatMayArrive: string[];
  whatMayLeave: string[];
  rationale: string;
};

type PersonalImpact = {
  id: string;
  natalPoint: string;
  transitPlanet: string;
  transitAspect: string;
  transitOrb: number;
  transitPhase: 'applying' | 'exact' | 'separating';
  synastrModifiers: Array<{
    bPoint: string;
    aspect: string;
    modifier: 'amplifies' | 'softens' | 'redirects';
    strength: number;
  }>;
  netScore: number;
  netVector: 'expanding' | 'contracting' | 'transforming' | 'stabilizing' | 'testing';
  lifeAreas: string[];
  windowStart: string;
  windowEnd: string;
};

const ASPECT_WEIGHTS: Record<string, number> = {
  conjunction: 10,
  opposition: 8,
  square: 7,
  trine: 6,
  sextile: 4,
  quincunx: 5,
};

const ASPECT_ANGLES: Record<string, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};

const DAILY_MOTION: Record<string, number> = {
  moon: 13.2,
  sun: 1.0,
  mercury: 1.4,
  venus: 1.2,
  mars: 0.52,
  jupiter: 0.083,
  saturn: 0.033,
  uranus: 0.012,
  neptune: 0.006,
  pluto: 0.004,
  chiron: 0.018,
  node: 0.053,
};

const KEY_HOUSES = new Set([1, 4, 5, 7, 8, 10, 11]);

function normalizeLon(v: number): number {
  let out = v % 360;
  if (out < 0) out += 360;
  return out;
}

function angleDiff(a: number, b: number): number {
  const d = Math.abs(normalizeLon(a) - normalizeLon(b));
  return Math.min(d, 360 - d);
}

function aspectFromDiff(diff: number): { aspect: string; orb: number } | null {
  let best: { aspect: string; orb: number } | null = null;
  for (const [aspect, angle] of Object.entries(ASPECT_ANGLES)) {
    const orb = Math.abs(diff - angle);
    if (orb > 3) continue;
    if (!best || orb < best.orb) best = { aspect, orb };
  }
  return best;
}

function tagTopics(pointA: string, pointB: string, aspect: string): string[] {
  const pair = `${pointA.toLowerCase()}_${pointB.toLowerCase()}`;
  if (pair.includes('venus') && pair.includes('moon')) return ['love', 'closeness', 'trust'];
  if (pair.includes('mars') && pair.includes('venus')) return ['sex', 'attraction', 'impulse'];
  if (pair.includes('saturn') && pair.includes('moon')) return ['obligations', 'cooling', 'distance'];
  if (pair.includes('jupiter') && (pair.includes('mc') || pair.includes('sun'))) return ['status', 'growth', 'project'];
  if (pair.includes('node') || pair.includes('vertex')) return ['fate', 'karmic', 'meeting'];
  if (aspect === 'square' || aspect === 'opposition') return ['conflict', 'decision', 'stress'];
  return ['trust', 'project', 'stabilization'];
}

function tagsByHouse(house: number): string[] {
  if (house === 5 || house === 7) return ['love', 'closeness', 'attraction'];
  if (house === 8) return ['sex', 'bonding', 'crisis'];
  if (house === 10 || house === 11) return ['project', 'status', 'growth'];
  if (house === 4) return ['trust', 'home', 'emotional'];
  if (house === 1) return ['identity', 'impact', 'visibility'];
  return ['interaction'];
}

function nodeCategoryFromTags(tags: string[]): SynNode['category'] {
  if (tags.includes('love') || tags.includes('sex')) return 'romantic';
  if (tags.includes('project') || tags.includes('status') || tags.includes('growth')) return 'business';
  if (tags.includes('conflict') || tags.includes('crisis')) return 'conflict';
  if (tags.includes('trust') || tags.includes('closeness') || tags.includes('emotional')) return 'emotional';
  return 'karmic';
}

function signalTypeFromTags(tags: string[], aspect: string): InteractionSignal['signalType'] {
  if (tags.includes('conflict') || aspect === 'square' || aspect === 'opposition') return 'relationship_test';
  if (tags.includes('love') || tags.includes('closeness') || tags.includes('sex')) return 'bonding_window';
  if (tags.includes('project') || tags.includes('status') || tags.includes('growth')) return 'growth_window';
  return 'stability_window';
}

function scoreNode(aspect: string, orb: number, isAngleHit: boolean, isNodeHit: boolean): number {
  const base = ASPECT_WEIGHTS[aspect] ?? 5;
  const orbFactor = Math.max(0.25, 1 - Math.min(orb, 8) / 8);
  const angleMult = isAngleHit ? 1.4 : 1;
  const nodeMult = isNodeHit ? 1.25 : 1;
  return Math.round(Math.min(100, base * 8 * orbFactor * angleMult * nodeMult));
}

function formatDateShift(baseDate: string, days: number): string {
  const dt = new Date(`${baseDate}T12:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString();
}

function firstHouseCusps(chart: NatalChart): Record<string, number> {
  return {
    asc: chart.houses?.h1?.lon ?? 0,
    ic: chart.houses?.h4?.lon ?? 0,
    desc: chart.houses?.h7?.lon ?? 0,
    mc: chart.houses?.h10?.lon ?? 0,
  };
}

function getAspectList(data: AnyResult | null): Array<Record<string, unknown>> {
  if (!data) return [];
  const list = data.aspects;
  return Array.isArray(list) ? (list as Array<Record<string, unknown>>) : [];
}

function getTransitPlanetMap(data: AnyResult | null): Record<string, { lon: number }> {
  const raw = (data?.transit_planets ?? null) as Record<string, { lon?: number }> | null;
  if (!raw) return {};
  const out: Record<string, { lon: number }> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v?.lon === 'number') out[k.toLowerCase()] = { lon: v.lon };
  }
  return out;
}

function getHouseByLongitude(chart: NatalChart, lon: number): number | null {
  const cusps = Array.from({ length: 12 }, (_, i) => chart.houses?.[`h${i + 1}`]?.lon ?? null);
  if (cusps.some(v => v === null)) return null;
  const v = normalizeLon(lon);
  for (let i = 0; i < 12; i += 1) {
    const start = normalizeLon(cusps[i] as number);
    const end = normalizeLon(cusps[(i + 1) % 12] as number);
    const inRange = start < end ? (v >= start && v < end) : (v >= start || v < end);
    if (inRange) return i + 1;
  }
  return null;
}

const PLANET_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера', mars: 'Марс',
  jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон',
  chiron: 'Хирон', node: 'Сев. узел', asc: 'Асцендент', mc: 'Мидхевен',
  ic: 'Надир', desc: 'Десцендент',
};
const ASPECT_RU: Record<string, string> = {
  conjunction: 'соединение', square: 'квадрат', opposition: 'оппозиция',
  trine: 'трин', sextile: 'секстиль', quincunx: 'квинконс', overlay: 'наложение',
};
function pRU(p: string): string { return PLANET_RU[p.toLowerCase()] ?? p; }
function aRU(a: string): string { return ASPECT_RU[a.toLowerCase()] ?? a; }

function natalPointToLifeAreas(point: string): string[] {
  const p = point.toLowerCase();
  if (p.includes('sun')) return ['идентичность', 'жизненная сила', 'самовыражение'];
  if (p.includes('moon')) return ['эмоции', 'дом', 'привычки'];
  if (p.includes('mercury')) return ['коммуникации', 'обучение', 'решения'];
  if (p.includes('venus')) return ['любовь', 'финансы', 'эстетика'];
  if (p.includes('mars')) return ['энергия', 'инициатива', 'конфликты'];
  if (p.includes('jupiter')) return ['рост', 'возможности', 'удача'];
  if (p.includes('saturn')) return ['карьера', 'структура', 'обязательства'];
  if (p.includes('uranus')) return ['перемены', 'инновации'];
  if (p.includes('neptune')) return ['духовность', 'интуиция'];
  if (p.includes('pluto')) return ['трансформация', 'власть'];
  if (p.includes('node')) return ['судьба', 'развитие'];
  if (p.includes('chiron')) return ['исцеление', 'уязвимость'];
  if (p === 'asc' || p.includes('h1')) return ['имидж', 'здоровье'];
  if (p === 'mc' || p.includes('h10')) return ['карьера', 'репутация'];
  return ['общий тонус'];
}

function transitNetVector(
  tp: string,
  aspect: string,
  mods: Array<{ modifier: 'amplifies' | 'softens' | 'redirects' }>,
): 'expanding' | 'contracting' | 'transforming' | 'stabilizing' | 'testing' {
  const hard = aspect === 'square' || aspect === 'opposition';
  const soft = aspect === 'trine' || aspect === 'sextile';
  const p = tp.toLowerCase();
  const isTransform = ['pluto', 'uranus', 'neptune'].includes(p);
  const isConstrict = ['saturn', 'pluto'].includes(p);
  const isExpand = ['jupiter', 'venus'].includes(p);
  const ampCount = mods.filter(m => m.modifier === 'amplifies').length;
  const softCount = mods.filter(m => m.modifier === 'softens').length;
  if (isTransform && hard) return 'transforming';
  if (isConstrict && hard && softCount === 0) return 'contracting';
  if (isExpand && soft) return 'expanding';
  if (hard && ampCount > 0) return 'testing';
  if (soft || (aspect === 'conjunction' && !isConstrict)) return 'expanding';
  return 'stabilizing';
}

function synModifierType(bPoint: string, bAspect: string): 'amplifies' | 'softens' | 'redirects' {
  const bp = bPoint.toLowerCase();
  const soft = bAspect === 'trine' || bAspect === 'sextile';
  const hard = bAspect === 'square' || bAspect === 'opposition';
  const isExpansive = ['jupiter', 'venus', 'sun', 'moon'].some(x => bp.includes(x));
  const isConstrict = ['saturn', 'pluto', 'mars'].some(x => bp.includes(x));
  if (isExpansive && soft) return 'softens';
  if (isConstrict && hard) return 'amplifies';
  if (bp.includes('uranus') || bp.includes('neptune')) return 'redirects';
  if (soft) return 'softens';
  return 'amplifies';
}

function vectorLabel(v: 'expanding' | 'contracting' | 'transforming' | 'stabilizing' | 'testing'): string {
  const m: Record<string, string> = {
    expanding: '↑ рост', contracting: '↓ сжатие',
    transforming: '⟳ трансформация', stabilizing: '= стабилизация', testing: '⚡ испытание',
  };
  return m[v] ?? v;
}

function vectorColorClass(v: 'expanding' | 'contracting' | 'transforming' | 'stabilizing' | 'testing'): string {
  const m: Record<string, string> = {
    expanding: 'text-emerald-400', contracting: 'text-rose-400',
    transforming: 'text-purple-400', stabilizing: 'text-blue-400', testing: 'text-orange-400',
  };
  return m[v] ?? 'text-gray-400';
}

type TopicFilter = 'all' | 'love' | 'project' | 'conflict';

function matchesTopic(topic: string, filter: TopicFilter): boolean {
  if (filter === 'all') return true;
  const loveWords = ['love', 'sex', 'attraction', 'closeness', 'trust'];
  const projectWords = ['project', 'status', 'growth'];
  const conflictWords = ['conflict', 'crisis', 'decision', 'stress'];
  if (filter === 'love') return loveWords.some(w => topic.includes(w));
  if (filter === 'project') return projectWords.some(w => topic.includes(w));
  if (filter === 'conflict') return conflictWords.some(w => topic.includes(w));
  return false;
}

function computeWeekHeatmap(
  route: { windowStart: string; windowEnd: string; confidence: number },
  baseDate: string,
): Array<{ label: string; intensity: number }> {
  const base = new Date(`${baseDate}T12:00:00Z`);
  const wStart = new Date(`${route.windowStart}T00:00:00Z`);
  const wEnd = new Date(`${route.windowEnd}T23:59:59Z`);
  return Array.from({ length: 8 }, (_, i) => {
    const cellStart = new Date(base.getTime() + (i - 3) * 7 * 86_400_000);
    const cellEnd = new Date(cellStart.getTime() + 7 * 86_400_000);
    const overlapMs = Math.max(0, Math.min(cellEnd.getTime(), wEnd.getTime()) - Math.max(cellStart.getTime(), wStart.getTime()));
    const overlapFraction = overlapMs / (7 * 86_400_000);
    const intensity = Math.max(0, Math.min(1, route.confidence * overlapFraction));
    const label = `${String(cellStart.getUTCMonth() + 1).padStart(2, '0')}/${String(cellStart.getUTCDate()).padStart(2, '0')}`;
    return { label, intensity };
  });
}

function heatmapColor(topic: string, intensity: number): string {
  if (intensity < 0.04) return 'rgba(255,255,255,0.06)';
  const a = 0.15 + intensity * 0.75;
  if (['love', 'sex', 'attraction', 'closeness'].some(w => topic.includes(w)))
    return `rgba(244,63,94,${a.toFixed(2)})`;
  if (['project', 'status', 'growth'].some(w => topic.includes(w)))
    return `rgba(52,211,153,${a.toFixed(2)})`;
  if (['conflict', 'crisis', 'decision', 'stress'].some(w => topic.includes(w)))
    return `rgba(251,146,60,${a.toFixed(2)})`;
  return `rgba(167,139,250,${a.toFixed(2)})`;
}

export default function SynastryInteractionEngine({
  birthA,
  birthB,
  synastry,
  advancedDate,
  selfTransits,
  partnerTransits,
  compositeChart,
  theme,
}: {
  birthA: BirthInput;
  birthB: BirthInput & { name?: string };
  synastry: SynastryResult;
  advancedDate: string;
  selfTransits: AnyResult | null;
  partnerTransits: AnyResult | null;
  compositeChart: NatalChart | null;
  theme: ThemeLike;
}) {
  const [view, setView] = useState<'engine' | 'routes' | 'personal'>('engine');
  const [topicFilter, setTopicFilter] = useState<TopicFilter>('all');
  const routesPanelRef = useRef<HTMLDivElement>(null);

  const layerA = useMemo(() => {
    const p = synastry.chart1.planets;
    const c = firstHouseCusps(synastry.chart1);
    const must = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'node', 'chiron'];
    return {
      pointsCount: must.filter(k => p[k]).length,
      keyHouses: [1, 4, 5, 7, 8, 10, 11],
      angles: c,
    };
  }, [synastry]);

  const layerBNodes = useMemo(() => {
    const cA = firstHouseCusps(synastry.chart1);
    const cB = firstHouseCusps(synastry.chart2);
    const nodes: SynNode[] = [];

    synastry.aspects.slice(0, 36).forEach((a, i) => {
      const p1Lon = synastry.chart1.planets[a.p1]?.lon ?? 0;
      const p2Lon = synastry.chart2.planets[a.p2]?.lon ?? 0;
      const tags = tagTopics(a.p1, a.p2, a.aspect);
      const angleHit =
        angleDiff(p1Lon, cB.asc) < 3 || angleDiff(p1Lon, cB.desc) < 3 || angleDiff(p1Lon, cB.mc) < 3 || angleDiff(p1Lon, cB.ic) < 3 ||
        angleDiff(p2Lon, cA.asc) < 3 || angleDiff(p2Lon, cA.desc) < 3 || angleDiff(p2Lon, cA.mc) < 3 || angleDiff(p2Lon, cA.ic) < 3;
      const nodeHit = a.p1 === 'node' || a.p2 === 'node';
      const strength = scoreNode(a.aspect, a.orb, angleHit, nodeHit);
      const volatility = Math.round((a.aspect === 'square' || a.aspect === 'opposition' ? 70 : 35) + a.orb * 2);
      const longevity = Math.max(20, 100 - volatility + (a.aspect === 'trine' ? 10 : 0) + (a.aspect === 'conjunction' ? 8 : 0));
      nodes.push({
        id: `syn_node_aspect_${String(a.p1).toLowerCase()}_${String(a.p2).toLowerCase()}_${i + 1}`,
        type: 'aspect_link',
        category: nodeCategoryFromTags(tags),
        pointA: `A.${a.p1}`,
        pointB: `B.${a.p2}`,
        midpoint: normalizeLon((p1Lon + p2Lon) / 2),
        strength,
        volatility: Math.min(99, volatility),
        longevityFactor: Math.min(99, longevity),
        meaningTags: tags,
        aspect: a.aspect,
        orb: a.orb,
      });
    });

    const angleTargetsB: Array<['asc' | 'desc' | 'mc' | 'ic', number]> = [
      ['asc', cB.asc], ['desc', cB.desc], ['mc', cB.mc], ['ic', cB.ic],
    ];
    const angleTargetsA: Array<['asc' | 'desc' | 'mc' | 'ic', number]> = [
      ['asc', cA.asc], ['desc', cA.desc], ['mc', cA.mc], ['ic', cA.ic],
    ];

    Object.entries(synastry.chart1.planets).forEach(([planet, p], idx) => {
      for (const [angleName, angleLon] of angleTargetsB) {
        const orb = angleDiff(p.lon, angleLon);
        if (orb > 3) continue;
        const tags = tagTopics(planet, angleName, 'conjunction');
        nodes.push({
          id: `syn_node_angle_a_${planet}_${angleName}_${idx}`,
          type: 'angle_activation',
          category: nodeCategoryFromTags(tags),
          pointA: `A.${planet}`,
          pointB: `B.${angleName.toUpperCase()}`,
          midpoint: normalizeLon((p.lon + angleLon) / 2),
          strength: scoreNode('conjunction', orb, true, planet === 'node'),
          volatility: 44,
          longevityFactor: 68,
          meaningTags: tags,
          aspect: 'conjunction',
          orb,
        });
      }
    });

    Object.entries(synastry.chart2.planets).forEach(([planet, p], idx) => {
      for (const [angleName, angleLon] of angleTargetsA) {
        const orb = angleDiff(p.lon, angleLon);
        if (orb > 3) continue;
        const tags = tagTopics(planet, angleName, 'conjunction');
        nodes.push({
          id: `syn_node_angle_b_${planet}_${angleName}_${idx}`,
          type: 'angle_activation',
          category: nodeCategoryFromTags(tags),
          pointA: `B.${planet}`,
          pointB: `A.${angleName.toUpperCase()}`,
          midpoint: normalizeLon((p.lon + angleLon) / 2),
          strength: scoreNode('conjunction', orb, true, planet === 'node'),
          volatility: 44,
          longevityFactor: 68,
          meaningTags: tags,
          aspect: 'conjunction',
          orb,
        });
      }
    });

    Object.entries(synastry.chart1.planets).forEach(([planet, p], idx) => {
      const houseInB = getHouseByLongitude(synastry.chart2, p.lon);
      if (!houseInB || !KEY_HOUSES.has(houseInB)) return;
      const tags = tagsByHouse(houseInB);
      const strength = Math.min(96, 58 + (houseInB === 7 || houseInB === 10 ? 18 : 10) + (planet === 'venus' || planet === 'sun' ? 8 : 0));
      nodes.push({
        id: `syn_node_house_a_${planet}_h${houseInB}_${idx}`,
        type: 'house_overlay',
        category: nodeCategoryFromTags(tags),
        pointA: `A.${planet}`,
        pointB: `B.H${houseInB}`,
        midpoint: normalizeLon(p.lon),
        strength,
        volatility: houseInB === 8 ? 72 : 48,
        longevityFactor: houseInB === 10 || houseInB === 11 ? 74 : 62,
        meaningTags: tags,
        aspect: 'overlay',
        orb: 0,
      });
    });

    Object.entries(synastry.chart2.planets).forEach(([planet, p], idx) => {
      const houseInA = getHouseByLongitude(synastry.chart1, p.lon);
      if (!houseInA || !KEY_HOUSES.has(houseInA)) return;
      const tags = tagsByHouse(houseInA);
      const strength = Math.min(96, 58 + (houseInA === 7 || houseInA === 10 ? 18 : 10) + (planet === 'venus' || planet === 'sun' ? 8 : 0));
      nodes.push({
        id: `syn_node_house_b_${planet}_h${houseInA}_${idx}`,
        type: 'house_overlay',
        category: nodeCategoryFromTags(tags),
        pointA: `B.${planet}`,
        pointB: `A.H${houseInA}`,
        midpoint: normalizeLon(p.lon),
        strength,
        volatility: houseInA === 8 ? 72 : 48,
        longevityFactor: houseInA === 10 || houseInA === 11 ? 74 : 62,
        meaningTags: tags,
        aspect: 'overlay',
        orb: 0,
      });
    });

    return nodes.sort((x, y) => y.strength - x.strength).slice(0, 30);
  }, [synastry]);

  const transitMap = useMemo(() => {
    const self = getTransitPlanetMap(selfTransits);
    const partner = getTransitPlanetMap(partnerTransits);
    return Object.keys(self).length ? self : partner;
  }, [selfTransits, partnerTransits]);

  const layerCActivations = useMemo(() => {
    const self = getAspectList(selfTransits);
    const partner = getAspectList(partnerTransits);
    const out: TransitActivation[] = [];

    for (const n of layerBNodes) {
      const targetA = n.pointA.split('.')[1].toLowerCase();
      const targetB = n.pointB.split('.')[1].toLowerCase();

      for (const item of self) {
        const natal = String(item.natal_planet || '').toLowerCase();
        if (n.type === 'aspect_link' && natal !== targetA) continue;
        const transit = String(item.transit_planet || 'unknown').toLowerCase();
        const orb = typeof item.orb === 'number' ? item.orb : 6;
        const speed = DAILY_MOTION[transit] ?? 0.5;
        const days = Math.max(1, Math.round(Math.min(16, orb / Math.max(speed, 0.05))));
        const phase = orb < 0.35 ? 'exact' : ((item.applying ? 'applying' : 'separating') as 'applying' | 'separating');
        out.push({
          transitPoint: transit,
          targetLayer: 'synastry',
          targetRef: n.id,
          aspect: String(item.aspect || ''),
          orb,
          dateExact: formatDateShift(advancedDate, 0),
          windowStart: formatDateShift(advancedDate, -days),
          windowEnd: formatDateShift(advancedDate, days),
          phase,
        });
      }

      for (const item of partner) {
        const natal = String(item.natal_planet || '').toLowerCase();
        if (n.type === 'aspect_link' && natal !== targetB) continue;
        const transit = String(item.transit_planet || 'unknown').toLowerCase();
        const orb = typeof item.orb === 'number' ? item.orb : 6;
        const speed = DAILY_MOTION[transit] ?? 0.5;
        const days = Math.max(1, Math.round(Math.min(16, orb / Math.max(speed, 0.05))));
        const phase = orb < 0.35 ? 'exact' : ((item.applying ? 'applying' : 'separating') as 'applying' | 'separating');
        out.push({
          transitPoint: transit,
          targetLayer: 'synastry',
          targetRef: n.id,
          aspect: String(item.aspect || ''),
          orb,
          dateExact: formatDateShift(advancedDate, 0),
          windowStart: formatDateShift(advancedDate, -days),
          windowEnd: formatDateShift(advancedDate, days),
          phase,
        });
      }

      for (const [tp, p] of Object.entries(transitMap)) {
        const diff = angleDiff(p.lon, n.midpoint);
        const a = aspectFromDiff(diff);
        if (!a) continue;
        const days = Math.max(1, Math.round(Math.min(14, a.orb / Math.max(DAILY_MOTION[tp] ?? 0.5, 0.05))));
        out.push({
          transitPoint: tp,
          targetLayer: 'synastry',
          targetRef: n.id,
          aspect: a.aspect,
          orb: a.orb,
          dateExact: formatDateShift(advancedDate, 0),
          windowStart: formatDateShift(advancedDate, -days),
          windowEnd: formatDateShift(advancedDate, days),
          phase: a.orb < 0.3 ? 'exact' : 'applying',
        });
      }
    }

    return out.sort((a, b) => a.orb - b.orb).slice(0, 80);
  }, [layerBNodes, selfTransits, partnerTransits, advancedDate, transitMap]);

  const compositeActivations = useMemo(() => {
    if (!compositeChart) return [] as TransitActivation[];
    const points: Array<[string, number]> = [];
    for (const [name, p] of Object.entries(compositeChart.planets)) {
      if (['sun', 'moon', 'venus', 'mars', 'jupiter', 'saturn'].includes(name)) points.push([name, p.lon]);
    }
    const c = firstHouseCusps(compositeChart);
    points.push(['asc', c.asc], ['desc', c.desc], ['mc', c.mc], ['ic', c.ic]);

    const out: TransitActivation[] = [];
    for (const [tp, p] of Object.entries(transitMap)) {
      for (const [target, targetLon] of points) {
        const diff = angleDiff(p.lon, targetLon);
        const a = aspectFromDiff(diff);
        if (!a) continue;
        const days = Math.max(1, Math.round(Math.min(14, a.orb / Math.max(DAILY_MOTION[tp] ?? 0.5, 0.05))));
        out.push({
          transitPoint: tp,
          targetLayer: 'composite',
          targetRef: `composite.${target}`,
          aspect: a.aspect,
          orb: a.orb,
          dateExact: formatDateShift(advancedDate, 0),
          windowStart: formatDateShift(advancedDate, -days),
          windowEnd: formatDateShift(advancedDate, days),
          phase: a.orb < 0.3 ? 'exact' : 'applying',
        });
      }
    }
    return out.sort((a, b) => a.orb - b.orb).slice(0, 30);
  }, [compositeChart, transitMap, advancedDate]);

  const layerDSignals = useMemo(() => {
    const byNode = new Map<string, TransitActivation[]>();
    for (const a of layerCActivations) {
      const arr = byNode.get(a.targetRef) ?? [];
      arr.push(a);
      byNode.set(a.targetRef, arr);
    }

    const signals: InteractionSignal[] = [];
    for (const node of layerBNodes) {
      const acts = byNode.get(node.id) ?? [];
      const bestAct = acts[0];
      const base = Math.round(node.strength * 0.55 + (bestAct ? (100 - Math.min(80, bestAct.orb * 12)) * 0.35 : 20) + (node.longevityFactor * 0.1));
      const strength = Math.max(20, Math.min(99, base));
      const type = signalTypeFromTags(node.meaningTags, node.aspect);
      const goodFor = type === 'relationship_test'
        ? ['короткий честный разговор', 'фиксировать границы', 'пауза перед ответом']
        : ['сближение', 'прояснение формата', 'совместное решение'];
      const badFor = type === 'relationship_test'
        ? ['ультиматумы', 'драматизация', 'поспешные обязательства']
        : ['давление', 'манипуляция', 'перегрев ожиданий'];
      const peak = bestAct ? bestAct.dateExact.slice(0, 10) : advancedDate;
      const start = bestAct ? bestAct.windowStart.slice(0, 10) : formatDateShift(advancedDate, -4).slice(0, 10);
      const end = bestAct ? bestAct.windowEnd.slice(0, 10) : formatDateShift(advancedDate, 4).slice(0, 10);
      const initiator: 'A' | 'B' | 'both' = node.pointA.startsWith('A.') ? 'A' : 'B';
      const receiver: 'A' | 'B' | 'both' = initiator === 'A' ? 'B' : 'A';
      signals.push({
        signalType: type,
        participants: ['A', 'B'],
        strength,
        window: { start, peak, end },
        activatedTopics: node.meaningTags,
        initiator,
        receiver,
        recommendations: { goodFor, badFor },
        confidence: Math.max(0.45, Math.min(0.96, strength / 100)),
      });
    }

    return signals.sort((a, b) => b.strength - a.strength).slice(0, 12);
  }, [layerBNodes, layerCActivations, advancedDate]);

  const compositeTriggerScore = useMemo(() => {
    if (!compositeActivations.length) return 0;
    const v = compositeActivations.map(a => {
      const base = ASPECT_WEIGHTS[a.aspect] ?? 4;
      const orbFactor = Math.max(0.25, 1 - Math.min(a.orb, 3) / 3);
      return Math.min(100, base * 10 * orbFactor);
    });
    return Math.round(v.reduce((s, x) => s + x, 0) / v.length);
  }, [compositeActivations]);

  const scoreBoard = useMemo(() => {
    const avg = (v: number[]) => v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : 0;
    const strength = layerDSignals.map(s => s.strength);
    const conflict = layerDSignals.filter(s => s.signalType === 'relationship_test').map(s => s.strength);
    const growth = layerDSignals.filter(s => s.signalType === 'growth_window' || s.signalType === 'bonding_window').map(s => s.strength);
    const baseEvent = avg(strength);
    const eventScore = Math.round(baseEvent * 0.75 + compositeTriggerScore * 0.25);
    return {
      bondScore: avg(strength),
      eventScore,
      conflictScore: avg(conflict),
      growthScore: avg(growth),
      stabilityScore: Math.max(0, 100 - avg(conflict)),
      departureScore: Math.min(100, Math.round(avg(conflict) * 0.75)),
      arrivalScore: Math.min(100, Math.round(avg(growth) * 0.85)),
      compositeTriggerScore,
    };
  }, [layerDSignals, compositeTriggerScore]);

  const routes = useMemo(() => {
    const out: RouteInsight[] = [];
    for (const s of layerDSignals) {
      const through = s.initiator === 'A' ? 'A' : 'B';
      const topic = s.activatedTopics[0] ?? 'interaction';
      const compositeBoost = scoreBoard.compositeTriggerScore > 0 ? (scoreBoard.compositeTriggerScore / 100) * 0.18 : 0;
      const confidence = Math.max(0.35, Math.min(0.98, s.confidence + compositeBoost));
      const whatMayArrive = topic === 'love'
        ? ['сближение', 'важный диалог', 'эмоциональная ясность']
        : topic === 'project' || topic === 'status'
        ? ['совместный проект', 'рост через партнера', 'решение по стратегии']
        : topic === 'conflict'
        ? ['проверка связи', 'неудобный разговор', 'уточнение границ']
        : ['новый этап взаимодействия', 'коррекция ожиданий'];
      const whatMayLeave = topic === 'conflict'
        ? ['иллюзии', 'замалчивание', 'подвешенность']
        : ['хаос', 'неопределенность', 'старые паттерны'];
      out.push({
        through,
        topic,
        confidence,
        windowStart: s.window.start,
        windowPeak: s.window.peak,
        windowEnd: s.window.end,
        whatMayArrive,
        whatMayLeave,
        rationale: `Сигнал ${s.signalType} с силой ${s.strength} активируется через ${through} и поддержан транзитным контуром.`,
      });
    }
    return out.sort((a, b) => b.confidence - a.confidence);
  }, [layerDSignals, scoreBoard.compositeTriggerScore]);

  const personalImpacts = useMemo(() => {
    const aspects = getAspectList(selfTransits);
    if (!aspects.length) return [] as PersonalImpact[];

    // Build lookup: A's natal point → synastry nodes involving it
    const synastrByNatal = new Map<string, SynNode[]>();
    for (const node of layerBNodes) {
      if (!node.pointA.startsWith('A.')) continue;
      const natalPt = node.pointA.slice(2).toLowerCase();
      const arr = synastrByNatal.get(natalPt) ?? [];
      arr.push(node);
      synastrByNatal.set(natalPt, arr);
    }

    const out: PersonalImpact[] = [];
    const seen = new Set<string>();
    aspects.forEach((item, idx) => {
      const natalPt = String(item.natal_planet ?? '').toLowerCase();
      const transitPt = String(item.transit_planet ?? '').toLowerCase();
      const aspect = String(item.aspect ?? '');
      const orb = typeof item.orb === 'number' ? item.orb : 3;
      if (!natalPt || !transitPt || !aspect) return;
      const key = `${transitPt}_${aspect}_${natalPt}`;
      if (seen.has(key)) return;
      seen.add(key);

      const relatedNodes = synastrByNatal.get(natalPt) ?? [];
      const synMods: PersonalImpact['synastrModifiers'] = relatedNodes.map(node => ({
        bPoint: node.pointB,
        aspect: node.aspect,
        modifier: synModifierType(node.pointB, node.aspect),
        strength: node.strength,
      }));

      const transitWeight = ASPECT_WEIGHTS[aspect] ?? 3;
      const orbFactor = Math.max(0.25, 1 - orb / 8);
      const baseScore = Math.round(transitWeight * 10 * orbFactor);
      const modBoost = synMods.reduce((s, m) =>
        s + (m.modifier === 'amplifies' ? m.strength * 0.15 : m.modifier === 'softens' ? -m.strength * 0.05 : 0), 0);
      const netScore = Math.max(10, Math.min(99, Math.round(baseScore + modBoost)));

      const applying = Boolean((item as Record<string, unknown>).applying);
      const phase: PersonalImpact['transitPhase'] = orb < 0.35 ? 'exact' : (applying ? 'applying' : 'separating');
      const speed = DAILY_MOTION[transitPt] ?? 0.5;
      const days = Math.max(1, Math.round(Math.min(16, orb / Math.max(speed, 0.05))));
      out.push({
        id: `pi_${transitPt}_${aspect}_${natalPt}_${idx}`,
        natalPoint: natalPt,
        transitPlanet: transitPt,
        transitAspect: aspect,
        transitOrb: orb,
        transitPhase: phase,
        synastrModifiers: synMods,
        netScore,
        netVector: transitNetVector(transitPt, aspect, synMods),
        lifeAreas: natalPointToLifeAreas(natalPt),
        windowStart: formatDateShift(advancedDate, -days).slice(0, 10),
        windowEnd: formatDateShift(advancedDate, days).slice(0, 10),
      });
    });
    return out.sort((a, b) => b.netScore - a.netScore).slice(0, 14);
  }, [selfTransits, layerBNodes, advancedDate]);

  const filteredRoutes = routes.filter(r => matchesTopic(r.topic, topicFilter));
  const routesThroughA = filteredRoutes.filter(r => r.through === 'A').slice(0, 4);
  const routesThroughB = filteredRoutes.filter(r => r.through === 'B').slice(0, 4);

  const handleExportRoutesPDF = async () => {
    const el = routesPanelRef.current;
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        scale: 2, useCORS: true, allowTaint: false, logging: false,
        backgroundColor: '#07090f',
        windowWidth: Math.max(el.scrollWidth, 960),
      });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const iw = pw - 20;
      const ih = iw / (canvas.width / canvas.height);
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text('HOLO · Routes — What comes through A / B', pw / 2, 10, { align: 'center' });
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      const filterLabel = topicFilter === 'all' ? 'все темы' : topicFilter;
      pdf.text(`${new Date().toLocaleString()} · фильтр: ${filterLabel}`, pw / 2, 15, { align: 'center' });
      pdf.addImage(img, 'PNG', 10, 19, iw, Math.min(ih, ph - 24));
      pdf.save(`routes_${advancedDate}.pdf`);
    } catch (e) {
      console.error('[routes-export]', e);
    }
  };

  const participantA = birthA.name?.trim() || 'A';
  const participantB = birthB.name?.trim() || 'B';

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border ${theme.card} p-4`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className={`text-sm font-semibold ${theme.header}`}>Dynamic Interaction Engine (A-B-Transit-Time)</h4>
            <p className={`mt-1 text-xs ${theme.text}`}>
              Формула: восприимчивость натала x синастрический узел x транзитный триггер x временная фаза.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setView('engine')}
              className={`px-3 py-1.5 text-xs rounded-full border ${view === 'engine' ? theme.tabActive : theme.tabInactive}`}
            >
              Engine
            </button>
            <button
              type="button"
              onClick={() => setView('routes')}
              className={`px-3 py-1.5 text-xs rounded-full border ${view === 'routes' ? theme.tabActive : theme.tabInactive}`}
            >
              What comes through A/B
            </button>
            <button
              type="button"
              onClick={() => setView('personal')}
              className={`px-3 py-1.5 text-xs rounded-full border ${view === 'personal' ? theme.tabActive : theme.tabInactive}`}
            >
              Личная ситуация
            </button>
          </div>
        </div>
      </div>

      {view === 'engine' && (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className={`rounded-xl border ${theme.card} p-3`}>
              <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Layer A</div>
              <div className={`mt-2 text-sm ${theme.header}`}>Натал каждого</div>
              <div className={`mt-2 text-xs ${theme.text}`}>{participantA}/{participantB}: планеты, углы, узлы, дома 1-4-5-7-8-10-11.</div>
              <div className={`mt-2 text-xs ${theme.accent}`}>Точек у A: {layerA.pointsCount}</div>
            </div>
            <div className={`rounded-xl border ${theme.card} p-3`}>
              <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Layer B</div>
              <div className={`mt-2 text-sm ${theme.header}`}>Узлы взаимодействия</div>
              <div className={`mt-2 text-xs ${theme.text}`}>Типы: aspect_link, house_overlay, angle_activation.</div>
              <div className={`mt-2 text-xs ${theme.accent}`}>Узлов: {layerBNodes.length}</div>
            </div>
            <div className={`rounded-xl border ${theme.card} p-3`}>
              <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Layer C</div>
              <div className={`mt-2 text-sm ${theme.header}`}>Транзитные активации</div>
              <div className={`mt-2 text-xs ${theme.text}`}>К наталам, узлам и composite-карте.</div>
              <div className={`mt-2 text-xs ${theme.accent}`}>Активаций: {layerCActivations.length} + composite {compositeActivations.length}</div>
            </div>
            <div className={`rounded-xl border ${theme.card} p-3`}>
              <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Layer D</div>
              <div className={`mt-2 text-sm ${theme.header}`}>Сигналы и решения</div>
              <div className={`mt-2 text-xs ${theme.text}`}>Что включается, через кого, что делать/не делать.</div>
              <div className={`mt-2 text-xs ${theme.accent}`}>Сигналов: {layerDSignals.length}</div>
            </div>
          </div>

          <div className={`rounded-xl border ${theme.card} p-4`}>
            <h5 className={`text-sm font-semibold ${theme.accent} mb-2`}>Кто кого включает (ядро узлов)</h5>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className={theme.text}>
                    <th className="px-2 py-1 text-left">Тип</th>
                    <th className="px-2 py-1 text-left">Узел</th>
                    <th className="px-2 py-1 text-left">Сила</th>
                    <th className="px-2 py-1 text-left">Темы</th>
                  </tr>
                </thead>
                <tbody>
                  {layerBNodes.slice(0, 10).map((n) => (
                    <tr key={n.id} className="border-t border-white/10">
                      <td className="px-2 py-1">{n.type}</td>
                      <td className="px-2 py-1">{n.pointA} ↔ {n.pointB}</td>
                      <td className="px-2 py-1">{n.strength}</td>
                      <td className="px-2 py-1">{n.meaningTags.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`rounded-xl border ${theme.card} p-4`}>
            <h5 className={`text-sm font-semibold ${theme.accent} mb-2`}>Таймлайн активаций</h5>
            <div className="space-y-2">
              {layerCActivations.slice(0, 10).map((a, idx) => (
                <div key={`${a.targetRef}-${idx}`} className={`rounded-lg border ${theme.card} p-2 text-xs`}>
                  <div className={theme.header}>{a.transitPoint} {a.aspect} {a.targetRef}</div>
                  <div className={`${theme.text} opacity-80`}>
                    окно {a.windowStart.slice(0, 10)} - {a.windowEnd.slice(0, 10)} | пик {a.dateExact.slice(0, 10)} | фаза {a.phase} | orb {a.orb.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className={`rounded-xl border ${theme.card} p-4`}>
              <h5 className={`text-sm font-semibold ${theme.accent} mb-2`}>Decision Panel</h5>
              {layerDSignals[0] ? (
                <>
                  <p className={`text-xs ${theme.text}`}>Окно: {layerDSignals[0].window.start} - {layerDSignals[0].window.end} (пик: {layerDSignals[0].window.peak})</p>
                  <p className={`mt-1 text-xs ${theme.text}`}>Главный сигнал: {layerDSignals[0].signalType} | confidence {layerDSignals[0].confidence.toFixed(2)}</p>
                  <p className={`mt-1 text-xs ${theme.text}`}>Через кого: {layerDSignals[0].initiator} {'->'} {layerDSignals[0].receiver}</p>
                  <div className="mt-2">
                    <div className={`text-xs font-semibold ${theme.header}`}>Что можно</div>
                    {layerDSignals[0].recommendations.goodFor.map((x, i) => (
                      <div key={i} className={`text-xs ${theme.text}`}>• {x}</div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <div className={`text-xs font-semibold ${theme.header}`}>Что нежелательно</div>
                    {layerDSignals[0].recommendations.badFor.map((x, i) => (
                      <div key={i} className={`text-xs ${theme.text}`}>• {x}</div>
                    ))}
                  </div>
                </>
              ) : (
                <p className={`text-xs ${theme.text} opacity-70`}>После расчета транзитов здесь появятся actionable-рекомендации.</p>
              )}
            </div>

            <div className={`rounded-xl border ${theme.card} p-4`}>
              <h5 className={`text-sm font-semibold ${theme.accent} mb-2`}>Scoring</h5>
              <div className="space-y-1 text-xs">
                <div className={theme.text}>bond_score: <span className={theme.header}>{scoreBoard.bondScore}</span></div>
                <div className={theme.text}>event_score: <span className={theme.header}>{scoreBoard.eventScore}</span></div>
                <div className={theme.text}>composite_trigger_score: <span className={theme.header}>{scoreBoard.compositeTriggerScore}</span></div>
                <div className={theme.text}>growth_score: <span className={theme.header}>{scoreBoard.growthScore}</span></div>
                <div className={theme.text}>conflict_score: <span className={theme.header}>{scoreBoard.conflictScore}</span></div>
                <div className={theme.text}>stability_score: <span className={theme.header}>{scoreBoard.stabilityScore}</span></div>
                <div className={theme.text}>departure_score: <span className={theme.header}>{scoreBoard.departureScore}</span></div>
                <div className={theme.text}>arrival_score: <span className={theme.header}>{scoreBoard.arrivalScore}</span></div>
              </div>
            </div>
          </div>
        </>
      )}

      {view === 'routes' && (
        <div className="space-y-3">
          {/* Filter bar + PDF export */}
          <div className={`rounded-xl border ${theme.card} p-3 flex items-center justify-between flex-wrap gap-2`}>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'love', 'project', 'conflict'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTopicFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    topicFilter === f
                      ? f === 'love' ? 'bg-rose-500/30 border-rose-400 text-rose-200'
                        : f === 'project' ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                        : f === 'conflict' ? 'bg-orange-500/30 border-orange-400 text-orange-200'
                        : theme.tabActive
                      : theme.tabInactive
                  }`}
                >
                  {f === 'all' ? 'Все темы' : f === 'love' ? '♥ love' : f === 'project' ? '◈ project' : '⚡ conflict'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { void handleExportRoutesPDF(); }}
              className={`px-3 py-1 text-xs rounded-full border ${theme.tabInactive} hover:opacity-90 transition-opacity`}
            >
              ↓ PDF
            </button>
          </div>

          {/* Routes grid (captured for PDF) */}
          <div ref={routesPanelRef} className="grid gap-3 md:grid-cols-2">
            <div className={`rounded-xl border ${theme.card} p-4`}>
              <h5 className={`text-sm font-semibold ${theme.accent}`}>What comes through {participantA}</h5>
              <div className="mt-3 space-y-3">
                {routesThroughA.length === 0 && (
                  <p className={`text-xs ${theme.text} opacity-70`}>
                    {topicFilter === 'all' ? 'Маршруты пока не активны.' : `Нет маршрутов по теме «${topicFilter}».`}
                  </p>
                )}
                {routesThroughA.map((r, i) => {
                  const cells = computeWeekHeatmap(r, advancedDate);
                  return (
                    <div key={i} className={`rounded-lg border ${theme.card} p-2 text-xs`}>
                      <div className={`${theme.header} font-semibold`}>{r.topic} — {(r.confidence * 100).toFixed(0)}% confidence</div>
                      <div className={`${theme.text} opacity-80`}>Окно: {r.windowStart} – {r.windowEnd} · пик {r.windowPeak}</div>
                      <div className={`mt-1 ${theme.text}`}>Приходит: {r.whatMayArrive.join(', ')}</div>
                      <div className={theme.text}>Уходит: {r.whatMayLeave.join(', ')}</div>
                      <div className="mt-2">
                        <div className={`text-[10px] ${theme.text} opacity-50 mb-1`}>route confidence · 8 weeks</div>
                        <div className="flex gap-px">
                          {cells.map((c, wi) => (
                            <div
                              key={wi}
                              className="flex-1 rounded-sm"
                              style={{ backgroundColor: heatmapColor(r.topic, c.intensity), height: '12px' }}
                              title={`${c.label}: ${(c.intensity * 100).toFixed(0)}%`}
                            />
                          ))}
                        </div>
                        <div className="flex mt-px">
                          {cells.map((c, wi) => (
                            <div key={wi} className={`flex-1 text-center ${theme.text} opacity-30`} style={{ fontSize: '7px' }}>{c.label}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`rounded-xl border ${theme.card} p-4`}>
              <h5 className={`text-sm font-semibold ${theme.accent}`}>What comes through {participantB}</h5>
              <div className="mt-3 space-y-3">
                {routesThroughB.length === 0 && (
                  <p className={`text-xs ${theme.text} opacity-70`}>
                    {topicFilter === 'all' ? 'Маршруты пока не активны.' : `Нет маршрутов по теме «${topicFilter}».`}
                  </p>
                )}
                {routesThroughB.map((r, i) => {
                  const cells = computeWeekHeatmap(r, advancedDate);
                  return (
                    <div key={i} className={`rounded-lg border ${theme.card} p-2 text-xs`}>
                      <div className={`${theme.header} font-semibold`}>{r.topic} — {(r.confidence * 100).toFixed(0)}% confidence</div>
                      <div className={`${theme.text} opacity-80`}>Окно: {r.windowStart} – {r.windowEnd} · пик {r.windowPeak}</div>
                      <div className={`mt-1 ${theme.text}`}>Приходит: {r.whatMayArrive.join(', ')}</div>
                      <div className={theme.text}>Уходит: {r.whatMayLeave.join(', ')}</div>
                      <div className="mt-2">
                        <div className={`text-[10px] ${theme.text} opacity-50 mb-1`}>route confidence · 8 weeks</div>
                        <div className="flex gap-px">
                          {cells.map((c, wi) => (
                            <div
                              key={wi}
                              className="flex-1 rounded-sm"
                              style={{ backgroundColor: heatmapColor(r.topic, c.intensity), height: '12px' }}
                              title={`${c.label}: ${(c.intensity * 100).toFixed(0)}%`}
                            />
                          ))}
                        </div>
                        <div className="flex mt-px">
                          {cells.map((c, wi) => (
                            <div key={wi} className={`flex-1 text-center ${theme.text} opacity-30`} style={{ fontSize: '7px' }}>{c.label}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'personal' && (
        <div className="space-y-4">
          {personalImpacts.length === 0 ? (
            <div className={`rounded-xl border ${theme.card} p-6 text-center`}>
              <p className={`text-sm ${theme.text} opacity-60`}>
                Добавьте дату расчёта транзитов для {participantA}, чтобы увидеть личный прогноз
                через взаимодействие с {participantB}.
              </p>
            </div>
          ) : (
            <>
              {/* Summary banner */}
              <div className={`rounded-xl border ${theme.card} p-4`}>
                <h5 className={`text-sm font-semibold ${theme.accent} mb-1`}>
                  Личная ситуация {participantA} с учётом взаимодействия с {participantB}
                </h5>
                <p className={`text-xs ${theme.text} opacity-60 mb-3`}>
                  Транзиты к натальной карте {participantA}, скорректированные через синастрические узлы с {participantB}.
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['expanding', 'stabilizing', 'testing', 'contracting', 'transforming'] as const).map(v => {
                    const cnt = personalImpacts.filter(p => p.netVector === v).length;
                    return cnt > 0 ? (
                      <span key={v} className={`px-2 py-1 rounded-full text-xs border border-white/15 ${vectorColorClass(v)}`}>
                        {vectorLabel(v)}: {cnt}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Impact cards */}
              {personalImpacts.map(impact => (
                <div key={impact.id} className={`rounded-xl border ${theme.card} p-4`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className={`text-sm font-semibold ${theme.header}`}>
                          {pRU(impact.transitPlanet)} {aRU(impact.transitAspect)} {pRU(impact.natalPoint)}
                        </span>
                        <span className={`text-xs font-medium ${vectorColorClass(impact.netVector)}`}>
                          {vectorLabel(impact.netVector)}
                        </span>
                        <span className={`text-xs ${theme.text} opacity-50`}>
                          {impact.transitPhase} · orb {impact.transitOrb.toFixed(1)}°
                        </span>
                      </div>
                      <div className={`mt-1 text-xs ${theme.text} opacity-80`}>
                        {impact.lifeAreas.join(' · ')}
                      </div>
                      <div className={`text-xs ${theme.text} opacity-50`}>
                        {impact.windowStart} — {impact.windowEnd}
                      </div>
                    </div>
                    <div className={`text-xl font-bold ${vectorColorClass(impact.netVector)} opacity-70 flex-shrink-0`}>
                      {impact.netScore}
                    </div>
                  </div>

                  {impact.synastrModifiers.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <div className={`text-xs font-semibold ${theme.accent} mb-1.5`}>
                        Влияние {participantB} на этот транзит:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {impact.synastrModifiers.slice(0, 3).map((m, j) => (
                          <span
                            key={j}
                            className={`text-xs px-2 py-0.5 rounded-full border border-white/10 ${
                              m.modifier === 'amplifies' ? 'text-orange-300' :
                              m.modifier === 'softens' ? 'text-emerald-300' : 'text-purple-300'
                            }`}
                          >
                            {m.bPoint.split('.')[1]?.toUpperCase() ?? m.bPoint}{' '}
                            {m.modifier === 'amplifies' ? '⬆ усиливает' :
                             m.modifier === 'softens' ? '⬇ смягчает' : '↺ перенаправляет'}
                            {' '}(сила {m.strength})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
