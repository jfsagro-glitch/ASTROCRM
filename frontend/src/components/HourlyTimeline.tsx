// ─── HourlyTimeline — 24-hour energy curve with current-hour marker ───────────
import { useEffect, useRef, useState } from 'react';
import { Clock, TrendingUp } from 'lucide-react';
import type { DashboardData } from '../services/astrologyService';

interface ThemeLike {
  card: string; header: string; accent: string; text: string; symbol: string;
}

interface Props { data: DashboardData; theme: ThemeLike; }

const PLANET_GL: Record<string, string> = {
  sun: '☉', moon: '☾', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  asc: 'ASC', mc: 'MC',
};

function bandColor(score: number): string {
  if (score >= 75) return '#22c55e'; // green
  if (score >= 60) return '#84cc16'; // lime
  if (score >= 45) return '#eab308'; // amber
  if (score >= 30) return '#f97316'; // orange
  return '#ef4444';                   // red
}

function fmtHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

export default function HourlyTimeline({ data, theme }: Props) {
  const [now, setNow] = useState(new Date());
  const [hoverHour, setHoverHour] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const tl = data.hourly_timeline ?? [];
  const bw = data.best_window ?? null;
  if (tl.length === 0) return null;

  const currentHour = now.getHours();
  const W = 720;
  const H = 140;
  const padX = 28;
  const padTop = 20;
  const padBot = 28;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBot;
  const stepX = innerW / 23;
  const minS = 10;
  const maxS = 95;

  const points = tl.map((p, i) => {
    const x = padX + stepX * i;
    const y = padTop + innerH - ((p.score - minS) / (maxS - minS)) * innerH;
    return { ...p, x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${(padX + stepX * 23).toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${padX.toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`;

  const currentPoint = points[currentHour];
  const peakHour = bw?.peak_hour ?? points.reduce((acc, p) => (p.score > acc.score ? p : acc), points[0]).hour;
  const peakPoint = points[peakHour];

  // Best window band
  const bandX1 = bw ? padX + stepX * bw.start_hour - stepX / 2 : 0;
  const bandX2 = bw ? padX + stepX * bw.end_hour + stepX / 2 : 0;

  // Hits at peak (for explanation)
  const peakHits = peakPoint?.hits ?? [];
  const currentHits = currentPoint?.hits ?? [];

  return (
    <div className={`rounded-2xl border ${theme.card} p-4 sm:p-5 space-y-3`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className={`h-4 w-4 ${theme.symbol}`} />
          <h3 className={`text-sm font-semibold ${theme.header}`}>Энергия дня по часам</h3>
        </div>
        {bw && (
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className={`h-3.5 w-3.5 ${theme.symbol} opacity-60`} />
            <span className={`${theme.text} opacity-70`}>Лучшее окно:</span>
            <span className={`font-semibold ${theme.header}`}>
              {fmtHour(bw.start_hour)}–{fmtHour(bw.end_hour + 1)}
            </span>
            <span className={`${theme.text} opacity-50`}>пик {fmtHour(bw.peak_hour)}</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto -mx-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full cursor-crosshair"
          style={{ minWidth: 320, height: H }}
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverHour(null)}
          onMouseMove={(e) => {
            const svg = svgRef.current;
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            const xRatio = (e.clientX - rect.left) / rect.width;
            const xVB = xRatio * W;
            const hr = Math.round((xVB - padX) / stepX);
            if (hr >= 0 && hr < 24) setHoverHour(hr);
          }}
          onTouchStart={(e) => {
            const svg = svgRef.current;
            if (!svg || e.touches.length === 0) return;
            const rect = svg.getBoundingClientRect();
            const xRatio = (e.touches[0].clientX - rect.left) / rect.width;
            const xVB = xRatio * W;
            const hr = Math.round((xVB - padX) / stepX);
            if (hr >= 0 && hr < 24) setHoverHour(hr);
          }}>
          {/* grid */}
          {[25, 50, 75].map((g) => {
            const y = padTop + innerH - ((g - minS) / (maxS - minS)) * innerH;
            return (
              <line
                key={g}
                x1={padX}
                x2={W - padX}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeDasharray="2 4"
              />
            );
          })}

          {/* best window band */}
          {bw && (
            <rect
              x={bandX1}
              y={padTop}
              width={Math.max(stepX, bandX2 - bandX1)}
              height={innerH}
              fill="#10b981"
              fillOpacity={0.07}
            />
          )}

          {/* gradient fill */}
          <defs>
            <linearGradient id="ht-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#ht-grad)" />
          <path d={pathD} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {/* hour ticks (every 3h) */}
          {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
            <g key={h}>
              <line
                x1={padX + stepX * h}
                x2={padX + stepX * h}
                y1={padTop + innerH}
                y2={padTop + innerH + 4}
                stroke="currentColor"
                strokeOpacity={0.3}
              />
              <text
                x={padX + stepX * h}
                y={padTop + innerH + 18}
                fontSize="10"
                textAnchor="middle"
                fill="currentColor"
                fillOpacity={0.55}
              >
                {String(h).padStart(2, '0')}
              </text>
            </g>
          ))}

          {/* points colored by band */}
          {points.map((p) => (
            <circle key={p.hour} cx={p.x} cy={p.y} r={p.hour === currentHour ? 4 : 2.2} fill={bandColor(p.score)} />
          ))}

          {/* hover indicator */}
          {hoverHour !== null && points[hoverHour] && (
            <g>
              <line
                x1={points[hoverHour].x}
                x2={points[hoverHour].x}
                y1={padTop}
                y2={padTop + innerH}
                stroke="#a78bfa"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.7"
              />
              <circle
                cx={points[hoverHour].x}
                cy={points[hoverHour].y}
                r="5"
                fill="none"
                stroke="#a78bfa"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* peak marker */}
          {peakPoint && (
            <g>
              <circle cx={peakPoint.x} cy={peakPoint.y} r="6" fill="none" stroke="#10b981" strokeWidth="1.5" />
              <text
                x={peakPoint.x}
                y={peakPoint.y - 10}
                fontSize="9"
                textAnchor="middle"
                fill="#10b981"
                fontWeight="600"
              >
                пик
              </text>
            </g>
          )}

          {/* now marker — vertical line */}
          {currentPoint && (
            <g>
              <line
                x1={currentPoint.x}
                x2={currentPoint.x}
                y1={padTop}
                y2={padTop + innerH}
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />
              <circle cx={currentPoint.x} cy={currentPoint.y} r="5" fill="#f43f5e" stroke="white" strokeWidth="1.5" />
              <text
                x={currentPoint.x}
                y={padTop - 6}
                fontSize="9"
                textAnchor="middle"
                fill="#f43f5e"
                fontWeight="600"
              >
                сейчас
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* hover/now detail */}
      {(() => {
        const focused = hoverHour !== null ? points[hoverHour] : currentPoint;
        const isHover = hoverHour !== null;
        if (!focused) return null;
        const hits = focused.hits ?? [];
        return (
          <div className={`flex items-center justify-between flex-wrap gap-2 text-xs rounded-lg px-3 py-2 transition-colors ${isHover ? 'bg-violet-500/8 border border-violet-500/20' : 'bg-white/3 border border-white/8'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase tracking-wider ${isHover ? 'text-violet-300' : 'opacity-50'}`}>
                {isHover ? 'наводка' : 'сейчас'}
              </span>
              <span className={`font-semibold tabular-nums ${theme.header}`}>{fmtHour(focused.hour)}</span>
              <span className="opacity-50">·</span>
              <span className="font-bold tabular-nums" style={{ color: bandColor(focused.score) }}>
                {focused.score}
              </span>
              {hits.length > 0 ? (
                <>
                  <span className="opacity-50">·</span>
                  <span className={`${theme.text} opacity-75`}>
                    Луна {hits.map((h) => PLANET_GL[h.planet] ?? h.planet).join(' ')}
                  </span>
                </>
              ) : (
                <span className={`${theme.text} opacity-50`}>фон без острых аспектов</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] opacity-60">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />сила</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#eab308' }} />средне</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />тихо</span>
            </div>
          </div>
        );
      })()}

      {peakHits.length > 0 && (
        <div className={`text-xs ${theme.text} opacity-70 italic border-l-2 pl-2 ${theme.accent}`} style={{ borderColor: '#10b981' }}>
          В пике {fmtHour(peakHour)}: Луна задевает{' '}
          {peakHits.map((h) => PLANET_GL[h.planet] ?? h.planet).join(', ')} — самые яркие 1–2 часа дня.
        </div>
      )}
    </div>
  );
}
