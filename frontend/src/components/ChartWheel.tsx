import React, { useMemo } from 'react';
import type { NatalChart } from '../types/astro';
import { PLANET_SYMBOLS, SIGN_COLORS } from '../types/astro';

interface ChartWheelProps {
  chart: NatalChart;
  size?: number;
  theme?: 'dark' | 'light';
}

const SIGN_GLYPHS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const SIGN_NAMES_ORD = [
  'aries','taurus','gemini','cancer','leo','virgo',
  'libra','scorpio','sagittarius','capricorn','aquarius','pisces',
];

// Aspect config: [color, strokeWidth, dashArray, isMajor]
const ASPECT_CFG: Record<string, [string, number, string, boolean]> = {
  conjunction:  ['#fcd34d', 1.6, '',     true],
  opposition:   ['#f43f5e', 1.6, '',     true],
  trine:        ['#4ade80', 1.4, '',     true],
  square:       ['#fb7185', 1.3, '5,3',  true],
  sextile:      ['#38bdf8', 1.2, '',     true],
  quincunx:     ['#a78bfa', 0.8, '4,2',  false],
  semisextile:  ['#86efac', 0.7, '2,3',  false],
  semisquare:   ['#fdba74', 0.7, '3,3',  false],
  sesquisquare: ['#fdba74', 0.7, '4,2',  false],
  quintile:     ['#f0abfc', 0.7, '3,2',  false],
  biquintile:   ['#f0abfc', 0.7, '3,2',  false],
};

// House element index: fire(0)/earth(1)/air(2)/water(3) cycle
const HOUSE_ELEM = [0,1,2,3, 0,1,2,3, 0,1,2,3]; // houses 1-12

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const a = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function degToStr(lon: number): string {
  const s = ((lon % 30) + 30) % 30;
  const d = Math.floor(s);
  const m = Math.floor((s - d) * 60);
  return `${d}°${m.toString().padStart(2, '0')}'`;
}

// ── Detect pattern shapes from aspects ────────────────────────────────────
interface PatternShape { name: string; planets: string[]; fill: string; stroke: string }

function detectPatterns(aspects: NatalChart['aspects']): PatternShape[] {
  if (!aspects?.length) return [];

  const buildAdj = (type: string, maxOrb: number) => {
    const m = new Map<string, Set<string>>();
    aspects.filter(a => a.aspect === type && a.orb <= maxOrb).forEach(a => {
      (m.get(a.p1) ?? (m.set(a.p1, new Set()), m.get(a.p1)!)).add(a.p2);
      (m.get(a.p2) ?? (m.set(a.p2, new Set()), m.get(a.p2)!)).add(a.p1);
    });
    return m;
  };

  const trines    = buildAdj('trine',      8);
  const squares   = buildAdj('square',     7);
  const sextiles  = buildAdj('sextile',    6);
  const quincunxes= buildAdj('quincunx',   3);
  const oppList   = aspects.filter(a => a.aspect === 'opposition' && a.orb <= 8);

  const results: PatternShape[] = [];
  const seen = new Set<string>();
  const key = (...ps: string[]) => [...ps].sort().join(',');

  // Grand Trine
  const tn = Array.from(trines.keys());
  for (let i = 0; i < tn.length; i++)
    for (let j = i+1; j < tn.length; j++) {
      if (!trines.get(tn[i])?.has(tn[j])) continue;
      for (let k = j+1; k < tn.length; k++) {
        if (trines.get(tn[i])?.has(tn[k]) && trines.get(tn[j])?.has(tn[k])) {
          const k_ = key(tn[i],tn[j],tn[k]);
          if (!seen.has(k_)) { seen.add(k_); results.push({name:'Большой Трин',planets:[tn[i],tn[j],tn[k]],fill:'#4ade8022',stroke:'#4ade80'}); }
        }
      }
    }

  // T-Square
  oppList.forEach(opp => {
    const aS = squares.get(opp.p1) ?? new Set<string>();
    const bS = squares.get(opp.p2) ?? new Set<string>();
    for (const apex of aS) {
      if (bS.has(apex)) {
        const k_ = key(opp.p1, opp.p2, apex);
        if (!seen.has(k_)) { seen.add(k_); results.push({name:'Т-Квадрат',planets:[opp.p1,opp.p2,apex],fill:'#f43f5e1a',stroke:'#f43f5e'}); }
      }
    }
  });

  // Grand Cross
  for (let i = 0; i < oppList.length; i++) {
    for (let j = i+1; j < oppList.length; j++) {
      const [a,b] = [oppList[i].p1, oppList[i].p2];
      const [c,d] = [oppList[j].p1, oppList[j].p2];
      if (new Set([a,b,c,d]).size === 4 &&
          squares.get(a)?.has(c) && squares.get(a)?.has(d) &&
          squares.get(b)?.has(c) && squares.get(b)?.has(d)) {
        const k_ = key(a,b,c,d);
        if (!seen.has(k_)) { seen.add(k_); results.push({name:'Большой Крест',planets:[a,b,c,d],fill:'#fb71851a',stroke:'#fb7185'}); }
      }
    }
  }

  // Yod (sextile + 2 quincunxes to apex)
  aspects.filter(a => a.aspect==='sextile' && a.orb<=6).forEach(sx => {
    const aQ = quincunxes.get(sx.p1) ?? new Set<string>();
    const bQ = quincunxes.get(sx.p2) ?? new Set<string>();
    for (const apex of aQ) {
      if (bQ.has(apex)) {
        const k_ = key(sx.p1, sx.p2, apex);
        if (!seen.has(k_)) { seen.add(k_); results.push({name:'Йод',planets:[sx.p1,sx.p2,apex],fill:'#fcd34d1a',stroke:'#fcd34d'}); }
      }
    }
  });

  // Kite (Grand Trine + opposition)
  results.filter(r => r.name==='Большой Трин').forEach(gt => {
    gt.planets.forEach(p => {
      const oppPlanets = oppList.filter(o => o.p1===p||o.p2===p).map(o => o.p1===p?o.p2:o.p1);
      oppPlanets.forEach(op => {
        const others = gt.planets.filter(x => x!==p);
        if (sextiles.get(op)?.has(others[0]) && sextiles.get(op)?.has(others[1])) {
          const k_ = key(p, op, others[0], others[1]);
          if (!seen.has(k_)) { seen.add(k_); results.push({name:'Воздушный Змей',planets:[...gt.planets,op],fill:'#38bdf81a',stroke:'#38bdf8'}); }
        }
      });
    });
  });

  return results;
}

export default function ChartWheel({ chart, size = 580, theme = 'dark' }: ChartWheelProps) {
  const cx = size / 2, cy = size / 2;

  // ── Radius layout ─────────────────────────────────────────────────────────
  const R       = size * 0.455;
  const rZIn    = R * 0.858;   // zodiac inner / house band outer
  const rHBIn   = R * 0.798;   // house band inner / planet zone outer
  const rHNum   = R * 0.828;   // house numbers (in house band)
  const rP1     = R * 0.748;   // outer planet ring centre
  const rD1     = R * 0.670;   // outer degree label
  const rP2     = R * 0.620;   // inner planet ring centre
  const rD2     = R * 0.547;   // inner degree label
  const pCircR  = size * 0.023;// planet circle radius

  // ── Palette ───────────────────────────────────────────────────────────────
  const isDark = theme === 'dark';
  const bg         = isDark ? '#0c0c1e' : '#faf8f0';
  const ringStroke = isDark ? '#2a2a5a' : '#b8a070';
  const axisClr    = isDark ? '#e8edf5' : '#0f172a';
  const dimColor   = isDark ? '#475569' : '#94a3b8';
  const planetCirc = isDark ? '#11112b' : '#ffffff';
  const plStroke   = isDark ? '#6366f1' : '#4f46e5';
  const plText     = isDark ? '#a5b4fc' : '#4338ca';
  const ascClr     = isDark ? '#fbbf24' : '#92400e';
  const mcClr      = isDark ? '#4ade80' : '#166534';

  // House element fills: fire / earth / air / water
  const ELEM_FILLS = isDark
    ? ['#f59e0b26', '#22c55e1e', '#38bdf81e', '#a855f726']
    : ['#fef9e726', '#f0fdf426', '#e0f7fa26', '#f3e8ff26'];

  // ── Coordinate transforms ─────────────────────────────────────────────────
  const ascLon     = chart.houses.h1?.lon ?? 0;
  const lonToAngle = (lon: number) => ((ascLon + 270 - lon) % 360 + 360) % 360;
  const mcLon  = chart.houses.h10?.lon ?? 0;
  const icLon  = chart.houses.h4?.lon  ?? 0;
  const dscLon = (ascLon + 180) % 360;

  const houseCusps = useMemo(
    () => Array.from({ length: 12 }, (_, i) => chart.houses[`h${i + 1}`]?.lon ?? 0),
    [chart.houses],
  );

  // ── Planet layout (two-ring) ───────────────────────────────────────────────
  const planetEntries = useMemo(() => {
    const raw = Object.entries(chart.planets).map(([name, p]) => ({
      name, lon: p.lon,
      symbol: PLANET_SYMBOLS[name] || name[0].toUpperCase(),
      retrograde: p.retrograde,
      origAngle: lonToAngle(p.lon),
      displayAngle: lonToAngle(p.lon),
      ring: 0 as 0 | 1,
    }));
    raw.sort((a, b) => a.origAngle - b.origAngle);

    // Assign alternating rings within tight clusters
    let cnt = 0;
    raw.forEach((p, i) => {
      const next = raw[(i + 1) % raw.length];
      const gap  = ((next.origAngle - p.origAngle) % 360 + 360) % 360;
      p.ring = (cnt % 2) as 0 | 1;
      cnt    = gap < 14 ? cnt + 1 : 0;
    });

    // Spread each ring
    const spreadRing = (grp: typeof raw) => {
      if (grp.length < 2) return;
      for (let pass = 0; pass < 14; pass++) {
        let changed = false;
        grp.sort((a, b) => a.displayAngle - b.displayAngle);
        for (let i = 0; i < grp.length; i++) {
          const prev = grp[(i - 1 + grp.length) % grp.length];
          const curr = grp[i];
          const gap  = ((curr.displayAngle - prev.displayAngle) % 360 + 360) % 360;
          if (gap < 8 && gap > 0) {
            const push = (8 - gap) / 2;
            curr.displayAngle = (curr.displayAngle + push) % 360;
            prev.displayAngle = ((prev.displayAngle - push) % 360 + 360) % 360;
            changed = true;
          }
        }
        if (!changed) break;
      }
    };
    spreadRing(raw.filter(p => p.ring === 0));
    spreadRing(raw.filter(p => p.ring === 1));
    return raw;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart.planets, ascLon]);

  // Planet display-position map (for aspect line endpoints)
  const planetPos = useMemo(() => {
    const m = new Map<string, { displayAngle: number; rP: number }>();
    planetEntries.forEach(p => m.set(p.name, {
      displayAngle: p.displayAngle,
      rP: p.ring === 0 ? rP1 : rP2,
    }));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planetEntries]);

  // Aspects
  const allAspects = useMemo(() => {
    const SKIP = ['parallel', 'contra_parallel'];
    return (chart.aspects || [])
      .filter(a => !SKIP.includes(a.aspect))
      .map(a => ({ ...a,
        lon1: a.lon1 ?? chart.planets[a.p1]?.lon,
        lon2: a.lon2 ?? chart.planets[a.p2]?.lon,
      }))
      .filter(a => a.lon1 != null && a.lon2 != null)
      .sort((a, b) => b.orb - a.orb); // wide (minor) first → major drawn on top
  }, [chart.aspects, chart.planets]);

  // Pattern shapes
  const patternShapes = useMemo(
    () => detectPatterns(chart.aspects),
    [chart.aspects],
  );

  // Angular axis endpoints
  const axPts = [
    polarToCartesian(cx, cy, rZIn, lonToAngle(ascLon)),
    polarToCartesian(cx, cy, rZIn, lonToAngle(dscLon)),
    polarToCartesian(cx, cy, rZIn, lonToAngle(mcLon)),
    polarToCartesian(cx, cy, rZIn, lonToAngle(icLon)),
  ];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ userSelect: 'none', background: bg, borderRadius: '50%', overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="zodG" cx="50%" cy="50%" r="50%">
          <stop offset="80%" stopColor={isDark ? '#13133a' : '#f0ead8'} />
          <stop offset="100%" stopColor={isDark ? '#1c1c4e' : '#ece3c5'} />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Outer halo */}
      <circle cx={cx} cy={cy} r={R + 14} fill={isDark ? '#08081a' : '#e2d7bc'} />

      {/* ── Zodiac ring ── */}
      <circle cx={cx} cy={cy} r={R} fill="url(#zodG)" stroke={ringStroke} strokeWidth={1.5} />

      {SIGN_NAMES_ORD.map((sign, i) => {
        const sA = lonToAngle(i * 30), eA = lonToAngle((i+1)*30), mA = lonToAngle(i*30+15);
        const clr = SIGN_COLORS[sign] || '#888';
        const mp  = polarToCartesian(cx, cy, (R + rZIn) / 2, mA);
        const os  = polarToCartesian(cx, cy, R,   sA), oe = polarToCartesian(cx, cy, R,   eA);
        const is  = polarToCartesian(cx, cy, rZIn, sA), ie = polarToCartesian(cx, cy, rZIn, eA);
        const sp  = ((sA - eA) % 360 + 360) % 360, lg = sp > 180 ? 1 : 0;
        const seg = `M${os.x} ${os.y} A${R} ${R} 0 ${lg} 0 ${oe.x} ${oe.y} L${ie.x} ${ie.y} A${rZIn} ${rZIn} 0 ${lg} 1 ${is.x} ${is.y}Z`;
        return (
          <g key={sign}>
            <path d={seg} fill={clr + (isDark ? '26' : '1e')} stroke="none" />
            <line x1={is.x} y1={is.y} x2={os.x} y2={os.y} stroke={clr} strokeWidth={1.2} opacity={0.6} />
            {[5,10,15,20,25].map(deg => {
              const ta = lonToAngle(i*30+deg), tl = deg%10===0?5:3;
              const t1 = polarToCartesian(cx, cy, R-1, ta), t2 = polarToCartesian(cx, cy, R-tl-1, ta);
              return <line key={deg} x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y} stroke={clr} strokeWidth={0.6} opacity={0.38} />;
            })}
            <text x={mp.x} y={mp.y} textAnchor="middle" dominantBaseline="central"
              fontSize={size * 0.036} fill={clr} fontFamily="serif" opacity={0.93}
            >{SIGN_GLYPHS[i]}</text>
          </g>
        );
      })}

      {/* Zodiac inner boundary */}
      <circle cx={cx} cy={cy} r={rZIn}
        fill={isDark ? '#0b0b22' : '#fdfaf0'} stroke={ringStroke} strokeWidth={1.3}
      />

      {/* ════════════════════════════════════════
          HOUSE BAND — colored sectors + numbers
          ════════════════════════════════════════ */}
      {houseCusps.map((lon, i) => {
        const nextLon = houseCusps[(i + 1) % 12];
        const fwd     = ((nextLon - lon) % 360 + 360) % 360;
        const sA      = lonToAngle(lon), eA = lonToAngle(nextLon);
        const fill    = ELEM_FILLS[HOUSE_ELEM[i]];
        const os = polarToCartesian(cx, cy, rZIn - 1, sA),  oe = polarToCartesian(cx, cy, rZIn - 1, eA);
        const is = polarToCartesian(cx, cy, rHBIn,    sA),  ie = polarToCartesian(cx, cy, rHBIn,    eA);
        const sp = ((sA - eA) % 360 + 360) % 360, lg = sp > 180 ? 1 : 0;
        const path = `M${os.x} ${os.y} A${rZIn} ${rZIn} 0 ${lg} 0 ${oe.x} ${oe.y} L${ie.x} ${ie.y} A${rHBIn} ${rHBIn} 0 ${lg} 1 ${is.x} ${is.y}Z`;
        const midA  = lonToAngle(lon + fwd / 2);
        const np    = polarToCartesian(cx, cy, rHNum, midA);
        const isAng  = [0,3,6,9].includes(i);
        const isSucc = [1,4,7,10].includes(i);
        return (
          <g key={`hb${i}`}>
            <path d={path} fill={fill} stroke="none" />
            <text x={np.x} y={np.y} textAnchor="middle" dominantBaseline="central"
              fontSize={size * 0.019}
              fill={isAng ? (isDark ? '#c4b5fd' : '#7c3aed') : isSucc ? (isDark ? '#94a3b8' : '#64748b') : dimColor}
              fontWeight={isAng ? 'bold' : 'normal'}
              opacity={isAng ? 1 : isSucc ? 0.78 : 0.50}
            >{i + 1}</text>
          </g>
        );
      })}

      {/* House cusp dividers in band */}
      {houseCusps.map((lon, i) => {
        const angle = lonToAngle(lon);
        const isAng = [0,3,6,9].includes(i);
        const p1 = polarToCartesian(cx, cy, rZIn - 1, angle);
        const p2 = polarToCartesian(cx, cy, rHBIn,    angle);
        return (
          <line key={`hd${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke={isDark ? (isAng ? '#6366f160' : '#33335066') : (isAng ? '#6366f150' : '#ccc')}
            strokeWidth={isAng ? 1.1 : 0.6}
          />
        );
      })}

      {/* House band inner ring */}
      <circle cx={cx} cy={cy} r={rHBIn} fill="none" stroke={ringStroke} strokeWidth={0.8} />

      {/* ── Non-angular cusp lines into inner area (dashed) ── */}
      {houseCusps.map((lon, i) => {
        if ([0,3,6,9].includes(i)) return null;
        const isSucc = [1,4,7,10].includes(i);
        const angle  = lonToAngle(lon);
        const p1 = polarToCartesian(cx, cy, rHBIn, angle);
        const p2 = polarToCartesian(cx, cy, size * 0.065, angle);
        return (
          <line key={`cl${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke={isDark ? (isSucc ? '#2a3a5a' : '#1a2030') : (isSucc ? '#cdd5df' : '#e2e8f0')}
            strokeWidth={isSucc ? 0.7 : 0.45}
            strokeDasharray={isSucc ? '3,4' : '1,5'}
            opacity={isSucc ? 0.6 : 0.35}
          />
        );
      })}

      {/* ════════════════════════════════════════
          PATTERN POLYGONS (grand trine = green triangle, etc.)
          ════════════════════════════════════════ */}
      {patternShapes.map((pat, idx) => {
        const pts = pat.planets
          .map(n => {
            const pos = planetPos.get(n);
            if (!pos) return null;
            return polarToCartesian(cx, cy, pos.rP, pos.displayAngle);
          })
          .filter((p): p is {x:number;y:number} => p !== null);
        if (pts.length < 3) return null;
        const ptStr = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        return (
          <polygon key={`pat${idx}`}
            points={ptStr}
            fill={pat.fill}
            stroke={pat.stroke}
            strokeWidth={1.3}
            strokeDasharray="5,3"
            opacity={0.80}
          />
        );
      })}

      {/* ════════════════════════════════════════
          ASPECT LINES — from planet display positions
          Thin but bright; minor aspects under major
          ════════════════════════════════════════ */}
      {allAspects.map((asp, idx) => {
        const pos1 = planetPos.get(asp.p1);
        const pos2 = planetPos.get(asp.p2);
        if (!pos1 || !pos2) return null;
        const pt1 = polarToCartesian(cx, cy, pos1.rP, pos1.displayAngle);
        const pt2 = polarToCartesian(cx, cy, pos2.rP, pos2.displayAngle);
        const [clr, bw, dash, major] = ASPECT_CFG[asp.aspect] || ['#888', 0.6, '3,3', false];
        const opa = Math.max(major ? 0.25 : 0.08, (major ? 0.95 : 0.58) - asp.orb * 0.10);
        const sw  = major ? bw : bw * 0.6;
        return (
          <line key={`a${idx}`}
            x1={pt1.x} y1={pt1.y} x2={pt2.x} y2={pt2.y}
            stroke={clr} strokeWidth={sw}
            strokeDasharray={dash} opacity={opa}
            strokeLinecap="round"
          />
        );
      })}

      {/* ════════════════════════════════════════
          ANGULAR AXIS LINES — bold, glowing
          ════════════════════════════════════════ */}
      <line x1={axPts[0].x} y1={axPts[0].y} x2={axPts[1].x} y2={axPts[1].y}
        stroke={ascClr} strokeWidth={2.8}
        filter={isDark ? 'url(#glow)' : undefined} opacity={0.95}
      />
      <line x1={axPts[2].x} y1={axPts[2].y} x2={axPts[3].x} y2={axPts[3].y}
        stroke={mcClr} strokeWidth={2.8}
        filter={isDark ? 'url(#glow)' : undefined} opacity={0.95}
      />
      {/* Axis endpoint markers */}
      {[
        [ascLon, ascClr], [dscLon, ascClr], [mcLon, mcClr], [icLon, mcClr],
      ].map(([lon, clr]) => {
        const pt = polarToCartesian(cx, cy, rZIn - 3, lonToAngle(lon as number));
        return (
          <circle key={`ep${lon}`} cx={pt.x} cy={pt.y} r={5.5}
            fill={clr as string} stroke={bg} strokeWidth={1.4} opacity={0.97}
          />
        );
      })}

      {/* ════════════════════════════════════════
          PLANETS — two-ring layout
          ════════════════════════════════════════ */}
      {planetEntries.map(({ name, lon, symbol, retrograde, displayAngle, ring, origAngle }) => {
        const rP    = ring === 0 ? rP1   : rP2;
        const rD    = ring === 0 ? rD1   : rD2;
        const pt    = polarToCartesian(cx, cy, rP,  displayAngle);
        const degPt = polarToCartesian(cx, cy, rD,  displayAngle);
        const tickO = polarToCartesian(cx, cy, rZIn - 1,  origAngle);
        const tickI = polarToCartesian(cx, cy, rZIn - 11, origAngle);
        const pClr  = retrograde ? '#fca5a5' : plText;
        const pStr  = retrograde ? '#f87171' : plStroke;
        const gapRaw  = ((displayAngle - origAngle) % 360 + 360) % 360;
        const gapNorm = gapRaw > 180 ? 360 - gapRaw : gapRaw;
        return (
          <g key={name}>
            {/* Tick at actual ecliptic position */}
            <line x1={tickO.x} y1={tickO.y} x2={tickI.x} y2={tickI.y}
              stroke={pClr} strokeWidth={1.8} opacity={0.75}
            />
            {/* Dashed connector when spread */}
            {gapNorm > 3 && (
              <line
                x1={polarToCartesian(cx, cy, rZIn - 13, origAngle).x}
                y1={polarToCartesian(cx, cy, rZIn - 13, origAngle).y}
                x2={polarToCartesian(cx, cy, rP + pCircR + 2, displayAngle).x}
                y2={polarToCartesian(cx, cy, rP + pCircR + 2, displayAngle).y}
                stroke={pClr} strokeWidth={0.6} strokeDasharray="2,3" opacity={0.35}
              />
            )}
            {/* Planet circle */}
            <circle cx={pt.x} cy={pt.y} r={pCircR}
              fill={planetCirc} stroke={pStr}
              strokeWidth={retrograde ? 1.5 : 1.0}
            />
            {/* Symbol */}
            <text x={pt.x} y={pt.y}
              textAnchor="middle" dominantBaseline="central"
              fontSize={size * 0.029} fill={pClr}
              fontFamily="serif" fontWeight="bold"
            >{symbol}</text>
            {/* Degree */}
            <text x={degPt.x} y={degPt.y}
              textAnchor="middle" dominantBaseline="central"
              fontSize={size * 0.0135} fill={dimColor} fontFamily="monospace"
            >{degToStr(lon)}{retrograde ? 'ℛ' : ''}</text>
          </g>
        );
      })}

      {/* ── ASC / DSC / MC / IC labels ── */}
      {([
        { label: 'ASC', lon: ascLon, clr: ascClr },
        { label: 'DSC', lon: dscLon, clr: ascClr },
        { label: 'MC',  lon: mcLon,  clr: mcClr  },
        { label: 'IC',  lon: icLon,  clr: mcClr  },
      ] as { label: string; lon: number; clr: string }[]).map(({ label, lon, clr }) => {
        const pt = polarToCartesian(cx, cy, R + 24, lonToAngle(lon));
        return (
          <text key={label} x={pt.x} y={pt.y}
            textAnchor="middle" dominantBaseline="central"
            fontSize={size * 0.025} fill={clr}
            fontWeight="bold" fontFamily="sans-serif"
          >{label}</text>
        );
      })}

      {/* ── Vertex ── */}
      {chart.houses.vtx && (() => {
        const a  = lonToAngle(chart.houses.vtx.lon);
        const pt = polarToCartesian(cx, cy, R + 22, a);
        const b1 = polarToCartesian(cx, cy, R + 3,  a);
        const b2 = polarToCartesian(cx, cy, R + 11, a);
        return (
          <g>
            <line x1={b1.x} y1={b1.y} x2={b2.x} y2={b2.y}
              stroke={isDark ? '#38bdf8' : '#0369a1'} strokeWidth={1.3} strokeDasharray="2,2" />
            <text x={pt.x} y={pt.y} textAnchor="middle" dominantBaseline="central"
              fontSize={size * 0.016} fill={isDark ? '#38bdf8' : '#0369a1'} fontFamily="sans-serif"
            >Vtx</text>
          </g>
        );
      })()}
    </svg>
  );
}
