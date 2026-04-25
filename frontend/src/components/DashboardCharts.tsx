// ─── DashboardCharts — visual at-a-glance panel for the daily situation ──────
// Pure SVG, no external chart deps. Four compact diagrams:
//   1. Day score — semicircular gauge (0..100)
//   2. Sphere scores — radar of 5 life areas (love/work/finance/health/creative)
//   3. Moon — illuminated disc + phase + days to next full/new
//   4. Transit balance — donut of benefic vs malefic vs mixed
import { useMemo } from 'react';
import { Sparkles, Sun as SunIcon, Activity, Compass, Moon as MoonIcon } from 'lucide-react';
import type { DashboardData } from '../services/astrologyService';

interface ThemeLike {
  card: string; header: string; accent: string; text: string;
  btn: string; tabActive: string; tabInactive: string; symbol: string;
}

interface Props { data: DashboardData; theme: ThemeLike; }

// ── helpers ──────────────────────────────────────────────────────────────────
function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function scoreColor(score: number): string {
  if (score >= 75) return '#34d399'; // emerald
  if (score >= 55) return '#fbbf24'; // amber
  if (score >= 35) return '#fb923c'; // orange
  return '#f87171';                  // red
}

// ─── 1. Day score gauge ──────────────────────────────────────────────────────
function DayScoreGauge({ score }: { score: number }) {
  const s = clamp(score);
  // Semicircle from 180° to 0°. Radius 60, centred at 70,70.
  const radius = 56;
  const cx = 70, cy = 72;
  const arcLen = Math.PI * radius;
  const filled = (s / 100) * arcLen;
  const color = scoreColor(s);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg viewBox="0 0 140 88" className="w-full max-w-[170px]" role="img" aria-label={`Балл дня ${s} из 100`}>
        <defs>
          <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        {/* track */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round"
        />
        {/* progress */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none" stroke="url(#gauge-grad)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${filled} ${arcLen}`}
        />
        {/* needle */}
        <g transform={`rotate(${-180 + (s / 100) * 180} ${cx} ${cy})`}>
          <line x1={cx} y1={cy} x2={cx + radius - 6} y2={cy} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="4" fill={color} />
        </g>
        {/* value */}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="22" fontWeight="700" fill="#ffffff">{s}</text>
        <text x={cx} y={cy + 6} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.5)">из 100</text>
      </svg>
      <div className="text-[11px] text-white/60 text-center">
        {s >= 75 ? 'Сильный день' : s >= 55 ? 'Хороший день' : s >= 35 ? 'Сложный день' : 'Затратный день'}
      </div>
    </div>
  );
}

// ─── 2. Sphere radar ─────────────────────────────────────────────────────────
const SPHERES: { key: keyof NonNullable<DashboardData['sphere_scores']>; label: string }[] = [
  { key: 'love',     label: 'Любовь' },
  { key: 'work',     label: 'Работа' },
  { key: 'finance',  label: 'Финансы' },
  { key: 'health',   label: 'Здоровье' },
  { key: 'creative', label: 'Творчество' },
];

function SphereRadar({ scores }: { scores: NonNullable<DashboardData['sphere_scores']> }) {
  const cx = 90, cy = 90, R = 70;
  const n = SPHERES.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const point = (i: number, r: number) => {
    const a = angle(i);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };

  // grid rings at 25/50/75/100
  const rings = [0.25, 0.5, 0.75, 1].map((f) => {
    const pts = SPHERES.map((_, i) => point(i, R * f).join(',')).join(' ');
    return <polygon key={f} points={pts} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
  });
  // axes
  const axes = SPHERES.map((_, i) => {
    const [x, y] = point(i, R);
    return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
  });
  // data polygon
  const dataPts = SPHERES.map((s, i) => {
    const v = clamp(scores[s.key] ?? 0) / 100;
    return point(i, R * v).join(',');
  }).join(' ');
  // labels
  const labels = SPHERES.map((s, i) => {
    const [x, y] = point(i, R + 14);
    return (
      <text
        key={s.key}
        x={x} y={y}
        textAnchor={Math.abs(x - cx) < 4 ? 'middle' : x > cx ? 'start' : 'end'}
        dominantBaseline="middle"
        fontSize="9.5"
        fill="rgba(255,255,255,0.65)"
      >{s.label}</text>
    );
  });
  // value dots
  const dots = SPHERES.map((s, i) => {
    const v = clamp(scores[s.key] ?? 0) / 100;
    const [x, y] = point(i, R * v);
    return <circle key={s.key} cx={x} cy={y} r="2.5" fill="#a78bfa" />;
  });

  return (
    <svg viewBox="0 0 180 180" className="w-full max-w-[210px]" role="img" aria-label="Сферы жизни">
      {rings}
      {axes}
      <polygon points={dataPts} fill="rgba(167,139,250,0.25)" stroke="#a78bfa" strokeWidth="1.5" />
      {dots}
      {labels}
    </svg>
  );
}

// ─── 3. Moon disc ────────────────────────────────────────────────────────────
function MoonDisc({ moon, lunation }: { moon: DashboardData['moon']; lunation?: DashboardData['next_lunation'] }) {
  const illum = typeof moon.illumination === 'number' ? clamp(moon.illumination * 100) / 100 : 0.5;
  const phaseAngle = moon.phase_angle ?? 0;
  // waxing if 0..180, waning if 180..360
  const waxing = phaseAngle <= 180;
  const r = 26;
  const cx = 32, cy = 32;
  // The lit fraction is illumination. We render the dark side as an ellipse over the disc.
  // For waxing: dark on left; for waning: dark on right.
  // The terminator is an ellipse with rx based on (1 - 2*illum)*r, but we use clip path approach:
  // Simpler: overlay an ellipse with horizontal radius = |1-2*illum|*r centred on disc.
  const ex = Math.abs(1 - 2 * illum) * r;
  const showLeftDark = waxing; // when waxing, dark side is left

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 64 64" className="w-20 h-20" role="img" aria-label={`Луна — ${moon.phase}, освещение ${Math.round(illum * 100)}%`}>
        {/* full disc */}
        <circle cx={cx} cy={cy} r={r} fill="#fef3c7" />
        {/* shadow side: full half-circle */}
        <path
          d={showLeftDark
            ? `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`
            : `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`}
          fill="#1e293b"
        />
        {/* terminator ellipse: covers or reveals depending on illum */}
        {illum < 0.5 ? (
          <ellipse cx={cx} cy={cy} rx={ex} ry={r} fill="#1e293b" />
        ) : (
          <ellipse cx={cx} cy={cy} rx={ex} ry={r} fill="#fef3c7" />
        )}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.7" />
      </svg>
      <div className="text-[11px] text-white/75 text-center capitalize leading-tight">{moon.phase}</div>
      <div className="text-[10px] text-white/45 text-center">
        {Math.round(illum * 100)}% света
      </div>
      {lunation && (
        <div className="text-[10px] text-white/55 text-center mt-0.5">
          {lunation.days_to_full <= lunation.days_to_new
            ? <>Полнолуние через <b>{lunation.days_to_full}</b> дн.</>
            : <>Новолуние через <b>{lunation.days_to_new}</b> дн.</>}
        </div>
      )}
    </div>
  );
}

// ─── 4. Transit balance donut ────────────────────────────────────────────────
function TransitBalance({ transits }: { transits: DashboardData['top_transits'] }) {
  const counts = useMemo(() => {
    let benefic = 0, malefic = 0, mixed = 0;
    for (const t of transits) {
      if (t.nature === 'benefic') benefic++;
      else if (t.nature === 'malefic') malefic++;
      else mixed++;
    }
    return { benefic, malefic, mixed, total: benefic + malefic + mixed };
  }, [transits]);

  const total = counts.total || 1;
  const segs = [
    { label: 'Поддержка', value: counts.benefic, color: '#34d399' },
    { label: 'Смешанные', value: counts.mixed,   color: '#fbbf24' },
    { label: 'Напряжение', value: counts.malefic, color: '#f87171' },
  ];
  const cx = 50, cy = 50, R = 38, sw = 12;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90" role="img" aria-label="Баланс транзитов">
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw} />
          {segs.map((s) => {
            if (s.value === 0) return null;
            const len = (s.value / total) * C;
            const dash = `${len} ${C - len}`;
            const el = (
              <circle
                key={s.label}
                cx={cx} cy={cy} r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={sw}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-lg font-bold text-white leading-none">{counts.total}</div>
          <div className="text-[9px] text-white/50 mt-0.5 uppercase tracking-wide">транзит{counts.total === 1 ? '' : counts.total < 5 ? 'а' : 'ов'}</div>
        </div>
      </div>
      <div className="flex flex-col gap-0.5 text-[10px] w-full">
        {segs.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
              <span className="text-white/65">{s.label}</span>
            </span>
            <span className="text-white/85 tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── main panel ──────────────────────────────────────────────────────────────
export default function DashboardCharts({ data, theme }: Props) {
  const score   = typeof data.day_score === 'number' ? data.day_score : 50;
  const spheres = data.sphere_scores;

  return (
    <section
      aria-label="Текущая ситуация — визуально"
      className={`rounded-2xl border ${theme.card} card-lift overflow-hidden`}
    >
      <header className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <Sparkles size={16} className="text-violet-300" aria-hidden="true" />
        <h3 className={`m-0 text-sm font-semibold ${theme.header}`}>Текущая ситуация — визуально</h3>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
        {/* 1. Day score */}
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.03] border border-white/5 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/45">
            <Activity size={11} className="text-violet-300" aria-hidden="true" />
            Балл дня
          </div>
          <DayScoreGauge score={score} />
        </div>

        {/* 2. Sphere radar */}
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.03] border border-white/5 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/45">
            <Compass size={11} className="text-violet-300" aria-hidden="true" />
            Сферы жизни
          </div>
          {spheres
            ? <SphereRadar scores={spheres} />
            : <p className="text-[11px] text-white/45 my-6">Нет данных</p>}
        </div>

        {/* 3. Moon */}
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.03] border border-white/5 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/45">
            <MoonIcon size={11} className="text-sky-300" aria-hidden="true" />
            Фаза Луны
          </div>
          <MoonDisc moon={data.moon} lunation={data.next_lunation} />
        </div>

        {/* 4. Transit balance */}
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.03] border border-white/5 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/45">
            <SunIcon size={11} className="text-amber-300" aria-hidden="true" />
            Баланс транзитов
          </div>
          <TransitBalance transits={data.top_transits ?? []} />
        </div>
      </div>
    </section>
  );
}
