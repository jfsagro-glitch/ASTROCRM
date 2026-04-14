// ─── DashboardView — Bento-grid daily dashboard ───────────────────────────────
// Shows: Moon card, top 3 transits w/ compensatory, firdaria, profections,
// fortune lot, 7-day lunar mini-calendar.
import React, { useEffect, useState, useCallback } from 'react';
import {
  Moon, Star, Zap, Clock, TrendingUp, Sparkles,
  AlertTriangle, CheckCircle, RefreshCw, Info,
} from 'lucide-react';
import { getDashboard } from '../services/astrologyService';
import type { DashboardData } from '../services/astrologyService';
import type { BirthInput } from '../types/astro';
import LunarCalendarCard from './LunarCalendarCard';

// ─── Theme type ───────────────────────────────────────────────────────────────
interface ThemeLike {
  card: string; header: string; accent: string; text: string;
  btn: string; tabActive: string; tabInactive: string; symbol: string;
}

interface Props {
  birthData: BirthInput;
  theme: ThemeLike;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PHASE_EMOJI: Record<string, string> = {
  new_moon: '🌑', waxing_crescent: '🌒', first_quarter: '🌓',
  waxing_gibbous: '🌔', full_moon: '🌕', waning_gibbous: '🌖',
  last_quarter: '🌗', waning_crescent: '🌘',
};

const PHASE_RU: Record<string, string> = {
  new_moon: 'Новолуние', waxing_crescent: 'Растущий серп',
  first_quarter: 'Первая четверть', waxing_gibbous: 'Растущая луна',
  full_moon: 'Полнолуние', waning_gibbous: 'Убывающая луна',
  last_quarter: 'Последняя четверть', waning_crescent: 'Убывающий серп',
};

const SIGN_RU: Record<string, string> = {
  aries: 'Овен', taurus: 'Телец', gemini: 'Близнецы', cancer: 'Рак',
  leo: 'Лев', virgo: 'Дева', libra: 'Весы', scorpio: 'Скорпион',
  sagittarius: 'Стрелец', capricorn: 'Козерог', aquarius: 'Водолей', pisces: 'Рыбы',
};

const PLANET_RU: Record<string, string> = {
  sun: '☀ Солнце', moon: '☽ Луна', mercury: '☿ Меркурий', venus: '♀ Венера',
  mars: '♂ Марс', jupiter: '♃ Юпитер', saturn: '♄ Сатурн', uranus: '⛢ Уран',
  neptune: '♆ Нептун', pluto: '♇ Плутон', node: '☊ Узел', chiron: '⚷ Хирон',
};

const ASPECT_RU: Record<string, string> = {
  conjunction: 'соединение (0°)', opposition: 'оппозиция (180°)',
  trine: 'трин (120°)', square: 'квадрат (90°)', sextile: 'секстиль (60°)',
  quincunx: 'квинкунс (150°)', semisextile: 'полусекстиль (30°)',
};

const ASPECT_COLOR: Record<string, string> = {
  trine: 'text-blue-400', sextile: 'text-cyan-400',
  conjunction: 'text-violet-400',
  square: 'text-red-400', opposition: 'text-orange-400',
  quincunx: 'text-amber-400',
};

const NATURE_COLOR: Record<string, string> = {
  benefic: 'text-emerald-400', malefic: 'text-red-400', mixed: 'text-amber-400',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ title, icon: Icon, children, className = '', theme }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
  className?: string; theme: ThemeLike;
}) {
  return (
    <div className={`rounded-2xl border ${theme.card} overflow-hidden ${className}`}>
      <div className="px-4 py-3 flex items-center gap-2 border-b border-white/10">
        <Icon size={14} className={theme.accent} />
        <span className={`text-sm font-medium ${theme.header}`}>{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DashboardView({ birthData, theme }: Props) {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const result = await getDashboard(birthData, today);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [birthData]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex flex-col items-center gap-3 py-12">
      <RefreshCw size={24} className={`${theme.accent} animate-spin`} />
      <span className={`text-sm ${theme.text}`}>Загрузка дашборда…</span>
    </div>
  );

  if (error) return (
    <div className={`rounded-2xl border ${theme.card} p-6 text-center`}>
      <AlertTriangle size={32} className="text-red-400 mx-auto mb-2" />
      <p className="text-red-400 text-sm mb-3">{error}</p>
      <button onClick={load} className={`text-xs px-4 py-2 rounded-lg ${theme.btn}`}>
        Повторить
      </button>
    </div>
  );

  if (!data) return null;

  const { moon, top_transits, compensatory, firdaria, profections, fortune_today } = data;
  const mansion = moon.mansion;

  // Extract firdaria info
  const firPeriod  = (firdaria as Record<string, Record<string,string>>)?.main_period;
  const firSub     = (firdaria as Record<string, Record<string,string>>)?.sub_period;

  // Extract profections
  const profYear  = (profections as Record<string, number>)?.profected_house;
  const profLord  = (profections as Record<string, string>)?.lord_of_year;

  // Compensatory practices
  const compPractices = (compensatory as Record<string, unknown[]>)?.practices ?? [];
  const compAspects   = (compensatory as Record<string, unknown[]>)?.aspect_recommendations ?? [];

  const today = new Date().toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className={`text-base font-semibold ${theme.header}`}>
          Дашборд · {today}
        </h2>
        <button
          onClick={load}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${theme.btn}`}
        >
          <RefreshCw size={12} /> Обновить
        </button>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* ── MOON CARD ──────────────────────────────────────────────────────── */}
        <Card title="Луна сегодня" icon={Moon} theme={theme}>
          <div className="space-y-3">
            {/* Phase + sign */}
            <div className="flex items-center gap-3">
              <span className="text-4xl leading-none">{PHASE_EMOJI[moon.phase] ?? '🌙'}</span>
              <div>
                <div className={`text-base font-semibold ${theme.header}`}>
                  {SIGN_RU[moon.sign] ?? moon.sign} · {moon.degree.toFixed(1)}°
                </div>
                <div className={`text-xs ${theme.text} opacity-70`}>
                  {PHASE_RU[moon.phase] ?? moon.phase}
                </div>
              </div>
            </div>

            {/* VoC status */}
            {moon.is_void && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                <span className="text-xs text-amber-300">
                  Луна Пустого Хода
                  {moon.void_end_sign ? ` → до входа в ${SIGN_RU[moon.void_end_sign] ?? moon.void_end_sign}` : ''}
                </span>
              </div>
            )}

            {/* Mansion */}
            {mansion && (
              <div className="border-t border-white/10 pt-3">
                <div className={`text-xs font-medium ${theme.accent} mb-1`}>
                  Мансия #{mansion.number} · {mansion.name_ru}
                </div>
                <div className={`text-xs ${theme.text} opacity-60 italic mb-2`}>
                  {mansion.theme}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] text-emerald-400 mb-0.5">Сегодня хорошо:</div>
                    {mansion.do.slice(0, 2).map((a, i) => (
                      <div key={i} className={`text-[11px] ${theme.text} opacity-70 flex gap-1`}>
                        <span className="text-emerald-400">›</span>{a}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-[10px] text-red-400 mb-0.5">Избегать:</div>
                    {mansion.avoid.slice(0, 2).map((a, i) => (
                      <div key={i} className={`text-[11px] ${theme.text} opacity-70 flex gap-1`}>
                        <span className="text-red-400">›</span>{a}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ── TOP TRANSITS ───────────────────────────────────────────────────── */}
        <Card title="Ключевые транзиты дня" icon={Zap} theme={theme}>
          {top_transits.length === 0 ? (
            <p className={`text-xs ${theme.text} opacity-50`}>Нет активных транзитов</p>
          ) : (
            <div className="space-y-2.5">
              {top_transits.slice(0, 4).map((t, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-medium ${theme.header}`}>
                        {PLANET_RU[t.transit_planet] ?? t.transit_planet}
                      </span>
                      <span className={`text-xs ${ASPECT_COLOR[t.aspect] ?? 'text-gray-400'}`}>
                        {ASPECT_RU[t.aspect] ?? t.aspect}
                      </span>
                      <span className={`text-xs ${theme.text} opacity-70`}>
                        {PLANET_RU[t.natal_planet]?.replace(/^[☀☽☿♀♂♃♄⛢♆♇☊⚷]\s/, '') ?? t.natal_planet}
                      </span>
                    </div>
                    <div className={`text-[10px] ${theme.text} opacity-50 mt-0.5`}>
                      орб {t.orb.toFixed(2)}° · {t.applying ? '↗ применяющийся' : '↘ разделяющийся'}
                    </div>
                  </div>
                  <div className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border
                    ${t.applying
                      ? 'border-amber-400/40 text-amber-300'
                      : 'border-slate-500/40 text-slate-400'}`}
                  >
                    {t.applying ? '↗' : '↘'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── COMPENSATORY PRACTICES ─────────────────────────────────────────── */}
        <Card title="Компенсаторные практики" icon={Sparkles} theme={theme}>
          {compPractices.length === 0 && compAspects.length === 0 ? (
            <p className={`text-xs ${theme.text} opacity-50`}>Нет рекомендаций</p>
          ) : (
            <div className="space-y-2">
              {/* Aspect-based recommendations */}
              {(compAspects as Array<Record<string,unknown>>).slice(0, 3).map((a, i) => (
                <div key={i} className="rounded-lg bg-white/5 p-2.5 space-y-1">
                  <div className={`text-xs font-medium ${theme.accent}`}>
                    {String(a.planet ?? '')} {String(a.aspect ?? '')} → {String(a.compensation ?? '')}
                  </div>
                  {Array.isArray(a.actions) && (
                    <ul className={`text-[11px] ${theme.text} opacity-70 space-y-0.5`}>
                      {(a.actions as string[]).slice(0, 3).map((act, j) => (
                        <li key={j} className="flex gap-1.5 items-start">
                          <CheckCircle size={9} className="text-emerald-400 mt-0.5 shrink-0" />
                          {act}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              {/* Planet practices */}
              {(compPractices as Array<Record<string,unknown>>).slice(0, 2).map((p, i) => (
                <div key={i} className="rounded-lg bg-white/5 p-2.5">
                  <div className={`text-[11px] font-medium ${theme.header} mb-1`}>
                    {PLANET_RU[String(p.planet ?? '')] ?? String(p.planet ?? '')}
                    {' '}в {SIGN_RU[String(p.sign ?? '')] ?? String(p.sign ?? '')}
                  </div>
                  {Array.isArray(p.practices) && (
                    <ul className={`text-[10px] ${theme.text} opacity-60 space-y-0.5`}>
                      {(p.practices as string[]).slice(0, 2).map((pr, j) => (
                        <li key={j} className="flex gap-1.5">
                          <span className={theme.accent}>›</span>{pr}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── FIRDARIA + PROFECTIONS ─────────────────────────────────────────── */}
        <Card title="Периоды · Профекции" icon={TrendingUp} theme={theme}>
          <div className="space-y-3">
            {/* Firdaria */}
            {firPeriod ? (
              <div>
                <div className="text-[10px] text-violet-400 font-medium uppercase tracking-wide mb-1">
                  Фирдарий
                </div>
                <div className={`text-sm font-semibold ${theme.header}`}>
                  {PLANET_RU[firPeriod.planet ?? ''] ?? firPeriod.planet ?? '—'}
                </div>
                {firPeriod.start && firPeriod.end && (
                  <div className={`text-[11px] ${theme.text} opacity-60`}>
                    {firPeriod.start} — {firPeriod.end}
                  </div>
                )}
                {firSub && (
                  <div className={`text-[11px] ${theme.accent} mt-1`}>
                    Суб-период: {PLANET_RU[firSub.planet ?? ''] ?? firSub.planet}
                  </div>
                )}
              </div>
            ) : (
              <p className={`text-xs ${theme.text} opacity-40`}>Фирдарий не определён</p>
            )}

            {/* Profections */}
            {profYear ? (
              <div className="border-t border-white/10 pt-3">
                <div className="text-[10px] text-amber-400 font-medium uppercase tracking-wide mb-1">
                  Профекция
                </div>
                <div className={`text-sm font-semibold ${theme.header}`}>
                  {profYear}-й дом
                </div>
                {profLord && (
                  <div className={`text-xs ${theme.accent}`}>
                    Лорд года: {PLANET_RU[profLord] ?? profLord}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </Card>

        {/* ── FORTUNE LOT ────────────────────────────────────────────────────── */}
        {fortune_today?.sign && (
          <Card title="Жребий Фортуны сегодня" icon={Star} theme={theme}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎯</span>
              <div>
                <div className={`text-base font-semibold ${theme.header}`}>
                  {SIGN_RU[fortune_today.sign] ?? fortune_today.sign}
                  {fortune_today.deg_min ? ` · ${fortune_today.deg_min}` : ''}
                </div>
                <div className={`text-xs ${theme.text} opacity-60 mt-0.5`}>
                  Фокус удачи на сегодня
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ── LUNAR MINI-CALENDAR ────────────────────────────────────────────── */}
        <div className="md:col-span-2 xl:col-span-1">
          <LunarCalendarCard
            theme={theme}
            utc={birthData.utc}
            lat={birthData.lat}
            lon={birthData.lon}
            days={7}
          />
        </div>

      </div>
    </div>
  );
}
