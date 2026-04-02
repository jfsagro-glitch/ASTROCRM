// ─── SynastryForecast — SVG line chart + monthly calendar + best-days ────────
import React, { useState, useMemo, useRef, useCallback } from 'react';
import type { SphereScore } from '../data/synastryData';
import {
  SPHERE_COLORS, DailyScore, generateDailyScores,
  getSphereIcon, getSphereRuName,
} from '../data/forecastData';

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// Build an SVG smooth cubic bezier path from an array of [x, y] points
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const dx = (curr[0] - prev[0]) / 3;
    const cp1x = prev[0] + dx;
    const cp1y = prev[1];
    const cp2x = curr[0] - dx;
    const cp2y = curr[1];
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${curr[0]} ${curr[1]}`;
  }
  return d;
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────────

const ALL_SPHERES = Object.keys(SPHERE_COLORS);
const DEFAULT_VISIBLE = ['romance', 'sex', 'finances', 'trust'];

interface Props {
  startStr: string;
  endStr:   string;
  synastryScores: SphereScore[];
  isDark?: boolean;
}

type SubTab = 'chart' | 'calendar' | 'bestdays';

export default function SynastryForecast({ startStr, endStr, synastryScores, isDark = true }: Props) {
  const [subTab, setSubTab]         = useState<SubTab>('chart');
  const [visible, setVisible]       = useState<Set<string>>(new Set(DEFAULT_VISIBLE));
  const [hoveredDay, setHoveredDay] = useState<DailyScore | null>(null);
  const [hoverX, setHoverX]         = useState(0);
  const [hoverY, setHoverY]         = useState(0);
  const [calMonth, setCalMonth]     = useState<string>(startStr.substring(0, 7));  // YYYY-MM
  const [selectedSphere, setSelectedSphere] = useState<string>('romance');
  const svgRef = useRef<SVGSVGElement>(null);

  // Generate all daily scores (memoized)
  const daily = useMemo(
    () => generateDailyScores(startStr, endStr, synastryScores),
    [startStr, endStr, synastryScores],
  );

  // Toggle sphere visibility
  const toggleSphere = useCallback((id: string) => {
    setVisible(prev => {
      const n = new Set(prev);
      if (n.has(id)) { if (n.size > 1) n.delete(id); }
      else n.add(id);
      return n;
    });
  }, []);

  // ── SUB-TAB: Chart ────────────────────────────────────────────────────────
  const ChartTab = () => {
    const W = 820, H = 280;
    const PAD = { top: 14, right: 14, bottom: 32, left: 38 };
    const cw = W - PAD.left - PAD.right;
    const ch = H - PAD.top  - PAD.bottom;
    const n  = daily.length;

    function xOf(i: number) { return PAD.left + (i / Math.max(n - 1, 1)) * cw; }
    function yOf(v: number) { return PAD.top  + (1 - (v - 5) / 93) * ch; }

    // Build SVG path per visible sphere
    const paths = useMemo(() => {
      return ALL_SPHERES
        .filter(s => visible.has(s))
        .map(s => ({
          id: s,
          color: SPHERE_COLORS[s],
          d: smoothPath(daily.map((day, i) => [xOf(i), yOf(day.sphereScores[s] ?? 50)] as [number, number])),
        }));
    }, [visible, daily]);

    // X-axis tick marks (monthly)
    const xTicks: { x: number; label: string }[] = [];
    let lastMonth = '';
    daily.forEach((day, i) => {
      const mo = day.date.substring(0, 7);
      if (mo !== lastMonth) {
        lastMonth = mo;
        const d = parseDate(day.date);
        xTicks.push({
          x: xOf(i),
          label: d.toLocaleDateString('ru-RU', { month: 'short' }),
        });
      }
    });

    // Y-axis labels
    const yLabels = [10, 25, 50, 75, 90];

    // Hover handler
    function onSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const relX = e.clientX - rect.left;
      const chartX = relX - PAD.left;
      const idx = clamp(Math.round((chartX / cw) * (n - 1)), 0, n - 1);
      const day = daily[idx];
      if (day) {
        setHoveredDay(day);
        setHoverX(xOf(idx));
        setHoverY(PAD.top + ch / 2);
      }
    }

    const bg = isDark ? '#0f172a' : '#f8fafc';
    const gridClr = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    const axisClr = isDark ? '#475569' : '#94a3b8';
    const textClr = isDark ? '#94a3b8' : '#475569';

    return (
      <div className="space-y-4">
        {/* Sphere toggles */}
        <div className="flex flex-wrap gap-2">
          {ALL_SPHERES.map(s => (
            <button
              key={s}
              onClick={() => toggleSphere(s)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                visible.has(s)
                  ? 'border-transparent text-white opacity-100'
                  : 'bg-transparent opacity-40 border-slate-600 text-slate-400'
              }`}
              style={visible.has(s) ? { backgroundColor: SPHERE_COLORS[s] } : {}}
            >
              <span>{getSphereIcon(s)}</span>
              <span>{getSphereRuName(s)}</span>
            </button>
          ))}
        </div>

        {/* SVG chart */}
        <div className="relative rounded-xl overflow-hidden border border-slate-700/50">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            style={{ background: bg, display: 'block', userSelect: 'none' }}
            onMouseMove={onSvgMouseMove}
            onMouseLeave={() => setHoveredDay(null)}
          >
            {/* Grid lines */}
            {yLabels.map(v => (
              <g key={v}>
                <line
                  x1={PAD.left} x2={W - PAD.right}
                  y1={yOf(v)}   y2={yOf(v)}
                  stroke={gridClr} strokeWidth={1}
                />
                <text x={PAD.left - 4} y={yOf(v) + 4} fill={textClr} fontSize={9} textAnchor="end">{v}</text>
              </g>
            ))}

            {/* X-axis ticks */}
            {xTicks.map(t => (
              <g key={t.x}>
                <line x1={t.x} x2={t.x} y1={PAD.top} y2={H - PAD.bottom + 4} stroke={axisClr} strokeWidth={0.5} />
                <text x={t.x} y={H - PAD.bottom + 14} fill={textClr} fontSize={9} textAnchor="middle">{t.label}</text>
              </g>
            ))}

            {/* Sphere lines */}
            {paths.map(p => (
              <path
                key={p.id}
                d={p.d}
                stroke={p.color}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.9}
              />
            ))}

            {/* Hover vertical line */}
            {hoveredDay && (
              <line
                x1={hoverX} x2={hoverX}
                y1={PAD.top} y2={H - PAD.bottom}
                stroke="white" strokeWidth={1} strokeDasharray="3 3" opacity={0.4}
              />
            )}

            {/* Hover dots */}
            {hoveredDay && ALL_SPHERES.filter(s => visible.has(s)).map(s => (
              <circle
                key={s}
                cx={hoverX}
                cy={yOf(hoveredDay.sphereScores[s] ?? 50)}
                r={3.5}
                fill={SPHERE_COLORS[s]}
                stroke="white"
                strokeWidth={1}
              />
            ))}
          </svg>

          {/* Hover tooltip */}
          {hoveredDay && (
            <div
              className={`absolute top-2 pointer-events-none rounded-xl border shadow-xl px-3 py-2.5 text-xs z-20 ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
              }`}
              style={{
                left: hoverX > W * 0.6 ? 'auto' : `${(hoverX / W) * 100 + 1}%`,
                right: hoverX > W * 0.6 ? '1%' : 'auto',
                minWidth: 180,
              }}
            >
              <div className="font-semibold mb-1.5">
                {parseDate(hoveredDay.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                <span className="ml-2 opacity-60">{hoveredDay.moonPhaseIcon} {hoveredDay.moonPhaseLabel}</span>
              </div>
              <div className="space-y-0.5">
                {ALL_SPHERES
                  .filter(s => visible.has(s))
                  .sort((a, b) => (hoveredDay.sphereScores[b] ?? 0) - (hoveredDay.sphereScores[a] ?? 0))
                  .map(s => (
                    <div key={s} className="flex items-center gap-2">
                      <span style={{ color: SPHERE_COLORS[s] }}>●</span>
                      <span className="opacity-80">{getSphereRuName(s)}</span>
                      <span className="ml-auto font-semibold" style={{ color: SPHERE_COLORS[s] }}>
                        {hoveredDay.sphereScores[s]}
                      </span>
                    </div>
                  ))}
              </div>
              {hoveredDay.events.length > 0 && (
                <div className="mt-1.5 pt-1.5 border-t border-slate-700/40 opacity-70 text-[10px]">
                  {hoveredDay.events.slice(0, 2).join(' · ')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Legend hint */}
        <p className="text-xs text-slate-500 text-center">
          Наведите курсор на график для детальной информации · нажмите на сферу чтобы скрыть/показать линию
        </p>
      </div>
    );
  };

  // ── SUB-TAB: Calendar ────────────────────────────────────────────────────
  const CalendarTab = () => {
    const [calSphere, setCalSphere] = useState(selectedSphere);

    // All months in the range
    const months: string[] = useMemo(() => {
      const set = new Set<string>();
      for (const d of daily) set.add(d.date.substring(0, 7));
      return Array.from(set).sort();
    }, []);

    const curMonthStr = calMonth;
    const [yr, mo] = curMonthStr.split('-').map(Number);
    const firstDay = new Date(yr, mo - 1, 1);
    const lastDay  = new Date(yr, mo, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Mon=0

    // Daily scores for this month
    const monthScores = useMemo(() => {
      const m = new Map<string, DailyScore>();
      for (const d of daily) {
        if (d.date.startsWith(curMonthStr)) m.set(d.date, d);
      }
      return m;
    }, [curMonthStr, daily]);

    // Calendar cells
    const cells: (DailyScore | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const ds = `${yr}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      cells.push(monthScores.get(ds) ?? null);
    }

    function cellColor(score: number): string {
      if (score >= 80) return isDark ? 'bg-green-500/70'  : 'bg-green-400/70';
      if (score >= 65) return isDark ? 'bg-lime-500/60'   : 'bg-lime-400/60';
      if (score >= 50) return isDark ? 'bg-yellow-500/50' : 'bg-yellow-400/50';
      if (score >= 35) return isDark ? 'bg-orange-500/50' : 'bg-orange-400/50';
      return isDark ? 'bg-red-500/40' : 'bg-red-400/40';
    }

    const [detailDay, setDetailDay] = useState<DailyScore | null>(null);

    const monthLabel = firstDay.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    const prevMonth = months[months.indexOf(curMonthStr) - 1];
    const nextMonth = months[months.indexOf(curMonthStr) + 1];

    return (
      <div className="space-y-4">
        {/* Sphere selector */}
        <div className="flex flex-wrap gap-1.5">
          {ALL_SPHERES.map(s => (
            <button
              key={s}
              onClick={() => setCalSphere(s)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
                calSphere === s
                  ? 'text-white border-transparent'
                  : isDark ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-500'
              }`}
              style={calSphere === s ? { backgroundColor: SPHERE_COLORS[s] } : {}}
            >
              {getSphereIcon(s)} {getSphereRuName(s)}
            </button>
          ))}
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button
            disabled={!prevMonth}
            onClick={() => prevMonth && setCalMonth(prevMonth)}
            className="px-3 py-1 rounded-lg text-sm disabled:opacity-30 hover:bg-slate-700/40 transition-colors"
          >
            ← Пред.
          </button>
          <h3 className="text-base font-semibold capitalize">{monthLabel}</h3>
          <button
            disabled={!nextMonth}
            onClick={() => nextMonth && setCalMonth(nextMonth)}
            className="px-3 py-1 rounded-lg text-sm disabled:opacity-30 hover:bg-slate-700/40 transition-colors"
          >
            След. →
          </button>
        </div>

        {/* Legend */}
        <div className="flex gap-3 text-xs justify-center">
          {[
            { label: 'Отлично', cls: 'bg-green-500/70' },
            { label: 'Хорошо',  cls: 'bg-lime-500/60'  },
            { label: 'Средне',  cls: 'bg-yellow-500/50' },
            { label: 'Осторожно', cls: 'bg-orange-500/50' },
            { label: 'Сложно', cls: 'bg-red-500/40'  },
          ].map(i => (
            <div key={i.label} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded-sm ${i.cls}`} />
              <span className="opacity-60">{i.label}</span>
            </div>
          ))}
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 mb-1">
          {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
            <div key={d} className="py-0.5">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const score = day.sphereScores[calSphere] ?? 50;
            return (
              <button
                key={day.date}
                onClick={() => setDetailDay(detailDay?.date === day.date ? null : day)}
                className={`relative rounded-lg p-1 text-center transition-all hover:opacity-90 hover:ring-1 ring-white/30 ${cellColor(score)} ${
                  detailDay?.date === day.date ? 'ring-2 ring-white/60' : ''
                }`}
              >
                <div className="text-xs font-semibold">{parseDate(day.date).getDate()}</div>
                <div className="text-[9px] mt-0.5 font-medium">{score}</div>
                <div className="text-[9px]">{day.moonPhaseIcon}</div>
              </button>
            );
          })}
        </div>

        {/* Day detail */}
        {detailDay && (
          <div className={`rounded-xl border p-4 space-y-3 ${
            isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">
                {parseDate(detailDay.date).toLocaleDateString('ru-RU', { weekday:'long', day:'numeric', month:'long' })}
              </h4>
              <span className="text-sm">
                {detailDay.moonPhaseIcon} {detailDay.moonPhaseLabel}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Луна в {SIGN_LABEL[detailDay.moonSign] ?? detailDay.moonSign}
            </p>

            {/* Sphere bars */}
            <div className="space-y-2">
              {Object.entries(detailDay.sphereScores)
                .sort((a, b) => b[1] - a[1])
                .map(([sid, sc]) => (
                  <div key={sid} className="flex items-center gap-2 text-xs">
                    <span className="w-4">{getSphereIcon(sid)}</span>
                    <span className="w-24 text-slate-400">{getSphereRuName(sid)}</span>
                    <div className="flex-1 bg-slate-700/40 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${sc}%`, backgroundColor: SPHERE_COLORS[sid] }}
                      />
                    </div>
                    <span className="w-6 text-right font-semibold" style={{ color: SPHERE_COLORS[sid] }}>
                      {sc}
                    </span>
                  </div>
                ))}
            </div>

            {detailDay.events.length > 0 && (
              <div className="text-xs text-slate-400 pt-1 border-t border-slate-700/30">
                📡 {detailDay.events.join(' · ')}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── SUB-TAB: Best Days ───────────────────────────────────────────────────
  const BestDaysTab = () => {
    const [sphere, setSphere] = useState(selectedSphere);
    const [viewMonth, setViewMonth] = useState(startStr.substring(0, 7));

    const months: string[] = useMemo(() => {
      const s = new Set<string>();
      for (const d of daily) s.add(d.date.substring(0, 7));
      return Array.from(s).sort();
    }, []);

    const monthData = useMemo(() => {
      return daily.filter(d => d.date.startsWith(viewMonth));
    }, [viewMonth, daily]);

    const sorted = useMemo(
      () => [...monthData].sort((a, b) =>
        (b.sphereScores[sphere] ?? 0) - (a.sphereScores[sphere] ?? 0)
      ),
      [monthData, sphere],
    );

    const top5    = sorted.slice(0, 5);
    const worst5  = sorted.slice(-5).reverse();

    function dayCard(d: DailyScore, rank: number, good: boolean) {
      const score = d.sphereScores[sphere] ?? 50;
      const date  = parseDate(d.date);
      const dow   = date.toLocaleDateString('ru-RU', { weekday: 'long' });
      const day   = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      const bar   = good
        ? score >= 75 ? 'bg-green-500' : score >= 60 ? 'bg-lime-500' : 'bg-yellow-500'
        : score < 30 ? 'bg-red-500' : score < 45 ? 'bg-orange-500' : 'bg-yellow-500';

      return (
        <div
          key={d.date}
          className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
            isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            good ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="font-semibold text-sm">{day}</span>
                <span className="ml-2 text-xs opacity-60 capitalize">{dow}</span>
              </div>
              <span className={`text-sm font-bold ${good ? 'text-green-400' : 'text-red-400'}`}>{score}</span>
            </div>
            {/* Mini bar */}
            <div className="w-full bg-slate-700/30 rounded-full h-1.5 mb-1.5">
              <div className={`h-1.5 rounded-full ${bar}`} style={{ width: `${score}%` }} />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span>{d.moonPhaseIcon} {d.moonPhaseLabel}</span>
              <span>·</span>
              <span>Луна в {SIGN_LABEL[d.moonSign] ?? d.moonSign}</span>
            </div>
            {d.events.length > 0 && (
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                📡 {d.events[0]}
              </div>
            )}
          </div>
        </div>
      );
    }

    const prevMonth = months[months.indexOf(viewMonth) - 1];
    const nextMonth = months[months.indexOf(viewMonth) + 1];
    const [yr, mo] = viewMonth.split('-').map(Number);
    const monthLabel = new Date(yr, mo - 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

    return (
      <div className="space-y-4">
        {/* Sphere selector */}
        <div className="flex flex-wrap gap-1.5">
          {ALL_SPHERES.map(s => (
            <button
              key={s}
              onClick={() => setSphere(s)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
                sphere === s
                  ? 'text-white border-transparent'
                  : isDark ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-500'
              }`}
              style={sphere === s ? { backgroundColor: SPHERE_COLORS[s] } : {}}
            >
              {getSphereIcon(s)} {getSphereRuName(s)}
            </button>
          ))}
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between">
          <button
            disabled={!prevMonth}
            onClick={() => prevMonth && setViewMonth(prevMonth)}
            className="px-3 py-1 rounded-lg text-sm disabled:opacity-30 hover:bg-slate-700/40 transition-colors"
          >← Пред.</button>
          <h3 className="text-base font-semibold capitalize">{monthLabel}</h3>
          <button
            disabled={!nextMonth}
            onClick={() => nextMonth && setViewMonth(nextMonth)}
            className="px-3 py-1 rounded-lg text-sm disabled:opacity-30 hover:bg-slate-700/40 transition-colors"
          >След. →</button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Best days */}
          <div>
            <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
              ✨ Лучшие дни для «{getSphereRuName(sphere)}»
            </h4>
            <div className="space-y-2">
              {top5.map((d, i) => dayCard(d, i + 1, true))}
            </div>
          </div>

          {/* Worst days */}
          <div>
            <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
              ⚠️ Дни, требующие осторожности
            </h4>
            <div className="space-y-2">
              {worst5.map((d, i) => dayCard(d, i + 1, false))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  const tabs: { id: SubTab; label: string }[] = [
    { id: 'chart',    label: '📊 График' },
    { id: 'calendar', label: '📅 Календарь' },
    { id: 'bestdays', label: '🏆 По дням' },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tab row */}
      <div className={`flex gap-1 rounded-xl p-1 ${isDark ? 'bg-slate-800/60' : 'bg-slate-100'}`}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-all ${
              subTab === t.id
                ? isDark ? 'bg-indigo-600 text-white shadow' : 'bg-white shadow text-indigo-700'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'chart'    && <ChartTab />}
      {subTab === 'calendar' && <CalendarTab />}
      {subTab === 'bestdays' && <BestDaysTab />}
    </div>
  );
}

// Moon sign Russian names
const SIGN_LABEL: Record<string, string> = {
  aries:'Овне', taurus:'Тельце', gemini:'Близнецах', cancer:'Раке',
  leo:'Льве', virgo:'Деве', libra:'Весах', scorpio:'Скорпионе',
  sagittarius:'Стрельце', capricorn:'Козероге', aquarius:'Водолее', pisces:'Рыбах',
};
