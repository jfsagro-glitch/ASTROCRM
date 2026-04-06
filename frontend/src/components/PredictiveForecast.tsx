// ─── PredictiveForecast — period forecast: calendar, chart, best days, summary ─
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  PERSONAL_SPHERES, generatePersonalDailyScores,
  type PersonalDailyScore,
} from '../data/predictiveData';

// ──────────────────────────────────────────────────────────────────────────────

const SIGN_RU: Record<string, string> = {
  aries: 'Овен', taurus: 'Телец', gemini: 'Близнецы', cancer: 'Рак',
  leo: 'Лев', virgo: 'Дева', libra: 'Весы', scorpio: 'Скорпион',
  sagittarius: 'Стрелец', capricorn: 'Козерог', aquarius: 'Водолей', pisces: 'Рыбы',
};

const DOW_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i];
    const dx = (c.x - p.x) / 3;
    d += ` C ${(p.x + dx).toFixed(1)} ${p.y.toFixed(1)} ${(c.x - dx).toFixed(1)} ${c.y.toFixed(1)} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
  }
  return d;
}

interface Props {
  startStr: string;
  endStr: string;
  isDark: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────

export default function PredictiveForecast({ startStr, endStr, isDark }: Props) {
  const days = useMemo(
    () => generatePersonalDailyScores(startStr, endStr),
    [startStr, endStr],
  );

  const [subTab, setSubTab]         = useState<'calendar' | 'chart' | 'best' | 'summary'>('summary');
  const [selectedSphere, setSelectedSphere] = useState<string>('work');
  const [visible, setVisible]       = useState<Set<string>>(new Set(PERSONAL_SPHERES.map(s => s.id)));
  const [calMonth, setCalMonth]     = useState<string>(startStr.slice(0, 7));

  // ── Theme shortcuts ──────────────────────────────────────────────────────────
  const card     = isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200';
  const text     = isDark ? 'text-slate-300' : 'text-slate-600';
  const header   = isDark ? 'text-slate-100' : 'text-slate-800';
  const accent   = isDark ? 'text-indigo-400' : 'text-indigo-600';
  const btnBase  = isDark
    ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
    : 'border-slate-200 text-slate-600 hover:bg-slate-50';
  const btnActive = isDark
    ? 'bg-indigo-600 border-indigo-500 text-white'
    : 'bg-indigo-600 border-indigo-600 text-white';

  const dayAvg = (d: PersonalDailyScore) =>
    Math.round(Object.values(d.sphereScores).reduce((a, b) => a + b, 0) / PERSONAL_SPHERES.length);

  const sphereVal = (d: PersonalDailyScore) =>
    selectedSphere === 'all' ? dayAvg(d) : (d.sphereScores[selectedSphere] ?? 50);

  function cellColor(score: number) {
    if (score >= 78) return isDark ? 'bg-green-500/25 border-green-400/40 text-green-300' : 'bg-green-100 border-green-300 text-green-700';
    if (score >= 65) return isDark ? 'bg-lime-500/20 border-lime-400/30 text-lime-300'   : 'bg-lime-50 border-lime-200 text-lime-700';
    if (score >= 50) return isDark ? 'bg-yellow-500/15 border-yellow-400/20 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-700';
    if (score >= 38) return isDark ? 'bg-orange-500/15 border-orange-400/20 text-orange-300' : 'bg-orange-50 border-orange-200 text-orange-600';
    return isDark ? 'bg-red-500/15 border-red-400/20 text-red-300' : 'bg-red-50 border-red-200 text-red-600';
  }

  const allMonths = useMemo(
    () => [...new Set(days.map(d => d.date.slice(0, 7)))].sort(),
    [days],
  );

  // ── Sphere toggle row ────────────────────────────────────────────────────────
  const SphereFilterRow = ({ withAll = false }: { withAll?: boolean }) => (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {withAll && (
        <button
          onClick={() => setSelectedSphere('all')}
          className={`px-2.5 py-1 text-xs rounded-full border transition-all ${selectedSphere === 'all' ? btnActive : btnBase}`}
        >Все сферы</button>
      )}
      {PERSONAL_SPHERES.map(s => (
        <button
          key={s.id}
          onClick={() => setSelectedSphere(s.id)}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all ${selectedSphere === s.id ? 'text-white' : `${text} border-slate-600`}`}
          style={selectedSphere === s.id ? { background: s.color, borderColor: s.color } : {}}
        >
          {s.icon} {s.label}
        </button>
      ))}
    </div>
  );

  // ── Chart Tab ────────────────────────────────────────────────────────────────
  const ChartTab = () => {
    const W = 820, H = 240;
    const PAD = { top: 14, right: 16, bottom: 32, left: 38 };
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top - PAD.bottom;

    const [hoverDay, setHoverDay] = useState<PersonalDailyScore | null>(null);
    const [hoverX,   setHoverX]   = useState(0);

    const toggle = (id: string) => setVisible(v => {
      const n = new Set(v);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

    const xPos = (i: number) => PAD.left + (days.length > 1 ? (i / (days.length - 1)) * cW : cW / 2);
    const yPos = (s: number) => PAD.top + cH - (s / 100) * cH;

    return (
      <div>
        {/* Toggles */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {PERSONAL_SPHERES.map(s => (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all ${visible.has(s.id) ? 'text-white' : `${text} opacity-40 border-slate-600`}`}
              style={visible.has(s.id) ? { background: s.color, borderColor: s.color } : {}}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        <div className="relative overflow-hidden">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            onMouseLeave={() => setHoverDay(null)}
            onMouseMove={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const svgX = ((e.clientX - rect.left) / rect.width) * W;
              const i = Math.max(0, Math.min(days.length - 1,
                Math.round((svgX - PAD.left) / cW * (days.length - 1)),
              ));
              setHoverDay(days[i]);
              setHoverX(xPos(i));
            }}
          >
            {/* Horizontal grid lines */}
            {[25, 50, 75].map(v => (
              <g key={v}>
                <line
                  x1={PAD.left} y1={yPos(v)} x2={W - PAD.right} y2={yPos(v)}
                  stroke={isDark ? '#334155' : '#e2e8f0'} strokeWidth="1" strokeDasharray="4 3"
                />
                <text x={PAD.left - 4} y={yPos(v) + 4} textAnchor="end" fontSize="9"
                  fill={isDark ? '#64748b' : '#94a3b8'}>{v}</text>
              </g>
            ))}

            {/* Sphere lines */}
            {PERSONAL_SPHERES.filter(s => visible.has(s.id)).map(s => {
              const pts = days.map((d, i) => ({ x: xPos(i), y: yPos(d.sphereScores[s.id] ?? 50) }));
              return <path key={s.id} d={smoothPath(pts)} fill="none" stroke={s.color} strokeWidth="2" opacity="0.85" />;
            })}

            {/* Hover line */}
            {hoverDay && (
              <line
                x1={hoverX} y1={PAD.top} x2={hoverX} y2={H - PAD.bottom}
                stroke={isDark ? '#94a3b8' : '#475569'} strokeWidth="1" strokeDasharray="3 2"
              />
            )}

            {/* X-axis labels */}
            {days.map((d, i) => {
              const step = days.length <= 14 ? 1 : days.length <= 31 ? 7 : days.length <= 95 ? 14 : 30;
              if (i % step !== 0) return null;
              return (
                <text key={d.date} x={xPos(i)} y={H - 4} textAnchor="middle" fontSize="9"
                  fill={isDark ? '#64748b' : '#94a3b8'}>{d.date.slice(5)}</text>
              );
            })}
          </svg>

          {/* Tooltip */}
          {hoverDay && (
            <div
              className={`absolute top-2 z-10 p-2 rounded-lg border shadow-lg text-xs pointer-events-none ${isDark ? 'bg-slate-900 border-slate-600 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
              style={{
                left:  hoverX / W * 100 > 60 ? 'auto' : `${(hoverX / W * 100).toFixed(1)}%`,
                right: hoverX / W * 100 > 60 ? '2%'   : 'auto',
              }}
            >
              <p className="font-semibold">{hoverDay.date}</p>
              <p className="opacity-60">{hoverDay.moonPhaseIcon} {SIGN_RU[hoverDay.moonSign]}</p>
              {PERSONAL_SPHERES.filter(s => visible.has(s.id)).map(s => (
                <p key={s.id} style={{ color: s.color }}>
                  {s.icon} {s.label}: {hoverDay.sphereScores[s.id]}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Calendar Tab ─────────────────────────────────────────────────────────────
  const CalendarTab = () => {
    const [clickedDay, setClickedDay] = useState<PersonalDailyScore | null>(null);
    const mIdx   = allMonths.indexOf(calMonth);
    const hasPrev = mIdx > 0;
    const hasNext = mIdx < allMonths.length - 1;

    const [calY, calM] = calMonth.split('-').map(Number);
    const firstDay = new Date(calY, calM - 1, 1);
    const lastDate = new Date(calY, calM, 0).getDate();
    const firstDow = (firstDay.getDay() + 6) % 7; // Mon=0

    const dayMap = new Map(days.filter(d => d.date.startsWith(calMonth)).map(d => [d.date, d]));

    return (
      <div>
        <SphereFilterRow withAll />

        {/* Month nav */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => hasPrev && setCalMonth(allMonths[mIdx - 1])}
            disabled={!hasPrev}
            className={`p-1 rounded border ${hasPrev ? `${btnBase}` : 'opacity-20 border-transparent'}`}
          ><ChevronLeft className="h-4 w-4" /></button>
          <span className={`text-sm font-semibold ${header}`}>
            {new Date(calY, calM - 1).toLocaleDateString('ru', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => hasNext && setCalMonth(allMonths[mIdx + 1])}
            disabled={!hasNext}
            className={`p-1 rounded border ${hasNext ? `${btnBase}` : 'opacity-20 border-transparent'}`}
          ><ChevronRight className="h-4 w-4" /></button>
        </div>

        {/* DOW headers */}
        <div className="grid grid-cols-7 mb-1">
          {DOW_LABELS.map(l => (
            <div key={l} className={`text-center text-[10px] font-medium py-1 ${text} opacity-60`}>{l}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDow }, (_, i) => <div key={`pad${i}`} />)}
          {Array.from({ length: lastDate }, (_, i) => {
            const dn  = i + 1;
            const ds  = `${calMonth}-${String(dn).padStart(2, '0')}`;
            const d   = dayMap.get(ds);
            if (!d) return (
              <div key={dn} className={`aspect-square rounded-lg border ${isDark ? 'border-slate-700/30 bg-slate-800/20' : 'border-slate-100 bg-slate-50'} flex items-center justify-center`}>
                <span className={`text-xs ${text} opacity-30`}>{dn}</span>
              </div>
            );
            const sc = sphereVal(d);
            const cc = cellColor(sc);
            return (
              <button
                key={dn}
                onClick={() => setClickedDay(clickedDay?.date === ds ? null : d)}
                className={`aspect-square rounded-lg border ${cc} flex flex-col items-center justify-center gap-0 hover:scale-105 transition-transform p-0.5`}
              >
                <span className="text-[10px] font-semibold">{dn}</span>
                <span className="text-[8px] opacity-70">{sc}</span>
                <span className="text-[9px]">{d.moonPhaseIcon}</span>
              </button>
            );
          })}
        </div>

        {/* Clicked day detail */}
        {clickedDay && (
          <div className={`mt-3 rounded-xl border ${card} p-3`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className={`font-semibold text-sm ${header}`}>
                  {new Date(clickedDay.date + 'T12:00:00').toLocaleDateString('ru', { day: 'numeric', month: 'long', weekday: 'short' })}
                </p>
                <p className={`text-xs ${text} opacity-70 mt-0.5`}>
                  {clickedDay.moonPhaseIcon} {SIGN_RU[clickedDay.moonSign]} · {clickedDay.moonPhaseLabel}
                </p>
                {clickedDay.events.length > 0 && (
                  <p className={`text-xs mt-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    ⚡ {clickedDay.events.slice(0, 2).join('; ')}
                  </p>
                )}
              </div>
              <span className="text-2xl">
                {dayAvg(clickedDay) >= 70 ? '🌟' : dayAvg(clickedDay) >= 55 ? '✨' : dayAvg(clickedDay) >= 40 ? '⚪' : '⚠️'}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {PERSONAL_SPHERES.map(s => {
                const score = clickedDay.sphereScores[s.id];
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className="text-sm w-4">{s.icon}</span>
                    <span className={`text-[11px] w-24 ${text}`}>{s.label}</span>
                    <div className={`flex-1 h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div className="h-full rounded-full" style={{ width: `${score}%`, background: s.color }} />
                    </div>
                    <span className={`text-xs font-mono w-6 text-right ${text}`}>{score}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Best Days Tab ─────────────────────────────────────────────────────────────
  const BestDaysTab = () => {
    const sorted = useMemo(
      () => [...days].sort((a, b) => sphereVal(b) - sphereVal(a)),
      [days, selectedSphere],
    );
    const best5  = sorted.slice(0, 5);
    const worst5 = sorted.slice(-5).reverse();
    const sph    = PERSONAL_SPHERES.find(s => s.id === selectedSphere);

    const DayRow = ({ d, rank, isBest }: { d: PersonalDailyScore; rank: number; isBest: boolean }) => {
      const score = sphereVal(d);
      const label = new Date(d.date + 'T12:00:00').toLocaleDateString('ru', { day: 'numeric', month: 'short', weekday: 'short' });
      return (
        <div className={`flex items-center gap-3 p-2.5 rounded-xl border ${card}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            isBest
              ? (isDark ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-300')
              : (isDark ? 'bg-red-500/15 text-red-400 border border-red-500/20'   : 'bg-red-50 text-red-600 border border-red-200')
          }`}>{rank}</div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${header}`}>{label}</p>
            <p className={`text-[10px] ${text} opacity-70`}>{d.moonPhaseIcon} {SIGN_RU[d.moonSign]}</p>
            {d.events.length > 0 && (
              <p className={`text-[10px] ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>⚡ {d.events[0]}</p>
            )}
          </div>
          <div className="w-20">
            <div className={`h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
              <div className="h-full rounded-full" style={{ width: `${score}%`, background: isBest ? '#22c55e' : '#ef4444' }} />
            </div>
          </div>
          <span className={`text-sm font-bold w-8 text-right shrink-0 ${
            isBest ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-500')
          }`}>{score}</span>
        </div>
      );
    };

    return (
      <div className="space-y-3">
        <SphereFilterRow withAll />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h4 className={`text-xs font-semibold mb-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              ⭐ Лучшие дни{sph ? ` — ${sph.label}` : ''}
            </h4>
            <div className="space-y-1.5">
              {best5.map((d, i) => <DayRow key={d.date} d={d} rank={i + 1} isBest />)}
            </div>
          </div>
          <div>
            <h4 className={`text-xs font-semibold mb-2 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
              ⚠️ Дни напряжения
            </h4>
            <div className="space-y-1.5">
              {worst5.map((d, i) => <DayRow key={d.date} d={d} rank={i + 1} isBest={false} />)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Summary Tab ──────────────────────────────────────────────────────────────
  const SummaryTab = () => {
    // Average per sphere
    const avgs: Record<string, number> = {};
    for (const s of PERSONAL_SPHERES) {
      avgs[s.id] = Math.round(days.reduce((sum, d) => sum + d.sphereScores[s.id], 0) / days.length);
    }
    const sorted     = [...PERSONAL_SPHERES].sort((a, b) => avgs[b.id] - avgs[a.id]);
    const bestSph    = sorted[0];
    const weakSph    = sorted[sorted.length - 1];

    // Trend: first half vs second half average
    const mid = Math.floor(days.length / 2);
    const avgF = Math.round(days.slice(0, mid).reduce((s, d) => s + dayAvg(d), 0) / Math.max(mid, 1));
    const avgS = Math.round(days.slice(mid).reduce((s, d) => s + dayAvg(d), 0) / Math.max(days.length - mid, 1));
    const trend = avgS > avgF + 2 ? 'up' : avgS < avgF - 2 ? 'down' : 'flat';

    // Moon sign distribution
    const moonDist: Record<string, number> = {};
    for (const d of days) moonDist[d.moonSign] = (moonDist[d.moonSign] ?? 0) + 1;
    const topMoon = Object.entries(moonDist).sort(([, a], [, b]) => b - a).slice(0, 4);

    // Best 7-day rolling window
    let bestWkStart = 0, bestWkScore = 0;
    for (let i = 0; i <= days.length - 7; i++) {
      const sc = days.slice(i, i + 7).reduce((s, d) => s + dayAvg(d), 0) / 7;
      if (sc > bestWkScore) { bestWkScore = sc; bestWkStart = i; }
    }

    // Key events
    const allEvents = [...new Set(days.flatMap(d => d.events))];

    // Sphere narratives
    const SPHERE_ADVICE: Record<string, [string, string, string]> = {
      health:     ['💚 Здоровье', 'Звёздный фон поддерживает физическую активность и восстановление. Тело отзывается хорошо на регулярность: сон, движение, питание.', 'Не откладывайте профилактику — небольшие вложения в здоровье сейчас дадут результат позже.'],
      work:       ['💼 Работа', 'Период благоприятен для карьерных инициатив, переговоров о повышении и запуска новых проектов. Ваши усилия замечают.', 'Не распыляйтесь — выберите 1-2 главных направления и двигайтесь системно.'],
      love:       ['❤️ Личная жизнь', 'Эмоциональный фон открыт для близости и диалога. Хорошее время для важных разговоров, романтики и восстановления связи.', 'Говорите о чувствах — партнёр сейчас готов слушать больше, чем обычно.'],
      energy:     ['⚡ Энергия', 'Витальный потенциал на подъёме. Тело и дух работают в одном ритме — используйте это для старта важных дел.', 'Не тратьте этот ресурс на мелочи. Сфокусируйтесь на том, что реально важно.'],
      finance:    ['💰 Финансы', 'Период подходит для финансового планирования, переговоров об условиях, долгосрочных вложений. Деньги любят системность.', 'Не принимайте импульсивных финансовых решений — обдумывайте хотя бы 24 часа.'],
      creativity: ['🎨 Творчество', 'Вдохновение сильно и доступно. Создавайте, экспериментируйте, выражайте то, что давно просилось наружу.', 'Не ждите идеального момента — начните сейчас, даже если кажется сыро.'],
      spirit:     ['✨ Духовность', 'Тонкий слой реальности доступен отчётливее обычного. Медитация, рефлексия, природа и тишина дают глубокий отклик.', 'Послушайте интуицию — в этот период она точнее логики.'],
    };

    return (
      <div className="space-y-3">
        {/* Trend banner */}
        <div className={`rounded-xl border p-4 ${
          trend === 'up'   ? (isDark ? 'bg-green-500/15 border-green-500/30'  : 'bg-green-50 border-green-200')  :
          trend === 'down' ? (isDark ? 'bg-orange-500/15 border-orange-500/30': 'bg-orange-50 border-orange-200') :
                             (isDark ? 'bg-indigo-500/15 border-indigo-500/30': 'bg-indigo-50 border-indigo-200')
        }`}>
          <p className={`text-base font-bold ${
            trend === 'up'   ? (isDark ? 'text-green-400'  : 'text-green-600')  :
            trend === 'down' ? (isDark ? 'text-orange-400' : 'text-orange-600') :
                               (isDark ? 'text-indigo-400' : 'text-indigo-600')
          }`}>
            {trend === 'up' ? '📈 Энергия периода нарастает' : trend === 'down' ? '📉 Энергия периода снижается' : '〰️ Стабильный период'}
          </p>
          <p className={`text-xs mt-1 ${text}`}>
            Первая половина: <strong>{avgF}</strong> → Вторая половина: <strong>{avgS}</strong>
            <span className="ml-2 opacity-60">·</span>
            <span className={`ml-2 font-semibold ${trend === 'up' ? (isDark ? 'text-green-400' : 'text-green-600') : trend === 'down' ? (isDark ? 'text-orange-400' : 'text-orange-500') : ''}`}>
              {avgS > avgF ? '+' : ''}{avgS - avgF} пунктов
            </span>
          </p>
        </div>

        {/* Sphere averages bar chart */}
        <div className={`rounded-xl border ${card} p-4`}>
          <h4 className={`text-xs font-semibold ${accent} mb-3`}>📊 Средние показатели сфер</h4>
          <div className="space-y-2">
            {sorted.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="text-sm w-5 shrink-0">{s.icon}</span>
                <span className={`text-xs w-24 shrink-0 ${text}`}>{s.label}</span>
                <div className={`flex-1 h-2.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'} relative`}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${avgs[s.id]}%`, background: s.color }}
                  />
                </div>
                <span className={`text-xs font-bold w-7 text-right shrink-0 ${text}`}>{avgs[s.id]}</span>
                {idx === 0 && <span className={`text-[10px] ${isDark ? 'text-green-400' : 'text-green-600'} shrink-0`}>▲</span>}
                {idx === sorted.length - 1 && <span className={`text-[10px] ${isDark ? 'text-orange-400' : 'text-orange-500'} shrink-0`}>▼</span>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className={`p-2.5 rounded-lg ${isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
              <p className={`text-[10px] font-semibold ${isDark ? 'text-green-400' : 'text-green-600'} mb-0.5`}>Сильная сфера периода</p>
              <p className={`text-xs font-bold ${header}`}>{bestSph.icon} {bestSph.label}</p>
              <p className={`text-[10px] ${text} mt-0.5 leading-relaxed`}>{SPHERE_ADVICE[bestSph.id]?.[1]} {SPHERE_ADVICE[bestSph.id]?.[2]}</p>
            </div>
            <div className={`p-2.5 rounded-lg ${isDark ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'}`}>
              <p className={`text-[10px] font-semibold ${isDark ? 'text-orange-400' : 'text-orange-600'} mb-0.5`}>Требует внимания</p>
              <p className={`text-xs font-bold ${header}`}>{weakSph.icon} {weakSph.label}</p>
              <p className={`text-[10px] ${text} mt-0.5 leading-relaxed`}>{SPHERE_ADVICE[weakSph.id]?.[2] ?? 'Уделите особое внимание этой сфере в период.'}</p>
            </div>
          </div>
        </div>

        {/* Best week */}
        {days.length >= 7 && (
          <div className={`rounded-xl border ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'} p-3`}>
            <p className={`text-xs font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'} mb-0.5`}>⭐ Лучшая неделя периода</p>
            <p className={`text-sm font-bold ${header}`}>
              С {new Date(days[bestWkStart].date + 'T12:00:00').toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
              {' '}— средний балл: <span className={isDark ? 'text-amber-300' : 'text-amber-700'}>{Math.round(bestWkScore)}</span>
            </p>
          </div>
        )}

        {/* Moon sign distribution */}
        <div className={`rounded-xl border ${card} p-4`}>
          <h4 className={`text-xs font-semibold ${accent} mb-2`}>🌙 Лунные акценты периода</h4>
          <div className="flex flex-wrap gap-2">
            {topMoon.map(([sign, count]) => (
              <div key={sign} className={`px-2.5 py-1.5 rounded-lg border ${card} text-center min-w-[70px]`}>
                <p className={`text-xs font-semibold ${header}`}>{SIGN_RU[sign]}</p>
                <p className={`text-[10px] ${text} opacity-60`}>{count} дн.</p>
              </div>
            ))}
          </div>
        </div>

        {/* Planetary events */}
        {allEvents.length > 0 && (
          <div className={`rounded-xl border ${card} p-4`}>
            <h4 className={`text-xs font-semibold ${accent} mb-2`}>⚡ Астрособытия периода</h4>
            <div className="space-y-1">
              {allEvents.slice(0, 10).map((e, i) => (
                <p key={i} className={`text-xs ${text}`}>• {e}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Tab selector & render ────────────────────────────────────────────────────
  const TABS = [
    { id: 'summary'  as const, label: '📊 Сводка' },
    { id: 'calendar' as const, label: '📅 Календарь' },
    { id: 'chart'    as const, label: '📈 График' },
    { id: 'best'     as const, label: '⭐ Лучшие дни' },
  ];

  if (days.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all ${subTab === t.id ? btnActive : btnBase}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content panel */}
      <div className={`rounded-xl border ${card} p-4`}>
        {subTab === 'summary'  && <SummaryTab />}
        {subTab === 'calendar' && <CalendarTab />}
        {subTab === 'chart'    && <ChartTab />}
        {subTab === 'best'     && <BestDaysTab />}
      </div>
    </div>
  );
}
