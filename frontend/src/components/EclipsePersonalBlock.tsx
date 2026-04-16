/**
 * EclipsePersonalBlock — upcoming eclipses mapped to the native's natal houses.
 * Calls POST /predictive/eclipse-personal.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  getEclipsePersonal,
  EclipsePersonalResult,
  PersonalEclipse,
} from '../services/astrologyService';
import type { BirthInput } from '../types/astro';

// ── constants ────────────────────────────────────────────────────────────────

const SIGN_RU: Record<string, string> = {
  aries: 'Овен', taurus: 'Телец', gemini: 'Близнецы', cancer: 'Рак',
  leo: 'Лев', virgo: 'Дева', libra: 'Весы', scorpio: 'Скорпион',
  sagittarius: 'Стрелец', capricorn: 'Козерог', aquarius: 'Водолей', pisces: 'Рыбы',
};

const SIGN_GLYPH: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌', virgo: '♍',
  libra: '♎', scorpio: '♏', sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

const ECLIPSE_CLASS_RU: Record<string, string> = {
  total: 'Полное', partial: 'Частичное', annular: 'Кольцеобразное',
  penumbral: 'Полутеневое', hybrid: 'Гибридное',
};

// ── helpers ──────────────────────────────────────────────────────────────────

function daysFromNow(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.round((d.getTime() - Date.now()) / 86400000);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ── Eclipse Card ─────────────────────────────────────────────────────────────

function EclipseCard({ ecl, isNext }: { ecl: PersonalEclipse; isNext: boolean }) {
  const isSolar = ecl.type === 'solar';
  const daysAway = daysFromNow(ecl.date_str);
  const isPast = daysAway < 0;

  const borderColor = isSolar
    ? 'border-amber-500/40'
    : 'border-violet-500/40';
  const badgeBg = isSolar
    ? 'bg-amber-500/15 text-amber-300'
    : 'bg-violet-500/15 text-violet-300';
  const houseColor = 'text-cyan-300';

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      isNext
        ? `${borderColor} ring-1 ring-amber-400/20 bg-white/5`
        : isPast
        ? 'border-white/8 bg-white/2 opacity-50'
        : `${borderColor} bg-white/3 hover:bg-white/5`
    }`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeBg}`}>
            {isSolar ? '☉ Солнечное' : '☽ Лунное'}
          </span>
          {ecl.eclipse_class && (
            <span className="text-[10px] text-white/40 border border-white/15 rounded-full px-2 py-0.5">
              {ECLIPSE_CLASS_RU[ecl.eclipse_class] ?? ecl.eclipse_class}
            </span>
          )}
          {isNext && (
            <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-full px-2 py-0.5">
              следующее
            </span>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-white/70 text-xs font-medium">{formatDate(ecl.date_str)}</div>
          {!isPast && daysAway <= 180 && (
            <div className="text-white/35 text-[10px]">через {daysAway} д.</div>
          )}
          {isPast && <div className="text-white/25 text-[10px]">прошло</div>}
        </div>
      </div>

      {/* Sign + house */}
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-1 text-sm">
          <span>{SIGN_GLYPH[ecl.sign] ?? ''}</span>
          <span className="text-white/60 text-xs">{SIGN_RU[ecl.sign] ?? ecl.sign}</span>
        </div>
        <span className="text-white/20">·</span>
        <div className="flex items-center gap-1">
          <span className={`text-sm font-bold ${houseColor}`}>{ecl.natal_house} дом</span>
        </div>
      </div>

      {/* Theme */}
      {ecl.activated_theme && (
        <div className="mt-2 text-[11px] text-white/50 leading-relaxed">
          <span className="text-white/30">Тема: </span>
          {ecl.activated_theme}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  birth: BirthInput;
  theme: {
    card: string; header: string; text: string; accent: string;
    btn: string; symbol: string;
  };
}

export function EclipsePersonalBlock({ birth, theme }: Props) {
  const [result, setResult] = useState<EclipsePersonalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(6);

  const load = useCallback(async () => {
    if (!birth.date) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await getEclipsePersonal(birth, count));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [birth, count]);

  useEffect(() => { load(); }, [load]);

  const nextIndex = result?.eclipses.findIndex(
    e => daysFromNow(e.date_str) >= 0
  ) ?? -1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-xl border ${theme.card} p-4`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌑</span>
            <h2 className={`text-base font-bold font-serif ${theme.header}`}>
              Затмения в натальных домах
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="text-xs bg-white/8 border border-white/15 rounded-lg px-2 py-1 text-white/70"
            >
              {[4, 6, 8, 10, 12].map(n => (
                <option key={n} value={n}>{n} затмений</option>
              ))}
            </select>
            <button
              onClick={load}
              disabled={loading}
              className={`text-xs px-3 py-1.5 rounded-lg ${theme.btn} disabled:opacity-50`}
            >
              {loading ? '…' : '↻ Обновить'}
            </button>
          </div>
        </div>

        <p className={`text-xs ${theme.text} opacity-50 mt-2`}>
          Затмения активируют натальные дома на 6–18 месяцев.
          Солнечные (новолуние) — начинают цикл, лунные (полнолуние) — завершают.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/8 p-4 text-red-300 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !result && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/3 p-4 h-24 animate-pulse" />
          ))}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Interpretation */}
          <div className={`rounded-xl border ${theme.card} p-3`}>
            <p className={`text-xs ${theme.text} opacity-60 leading-relaxed`}>
              {result.interpretation}
            </p>
          </div>

          {/* Eclipse cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.eclipses.map((ecl, i) => (
              <EclipseCard
                key={`${ecl.date_str}-${ecl.type}`}
                ecl={ecl}
                isNext={i === nextIndex}
              />
            ))}
          </div>

          {/* House legend */}
          <div className={`rounded-xl border ${theme.card} p-3`}>
            <div className="text-[10px] text-white/30 mb-2 font-medium uppercase tracking-wider">
              Задействованные дома
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(result.eclipses.map(e => e.natal_house)))
                .sort((a, b) => a - b)
                .map(h => {
                  const ecl = result.eclipses.find(e => e.natal_house === h)!;
                  return (
                    <div
                      key={h}
                      className="flex items-center gap-1 text-[10px] border border-cyan-500/25 bg-cyan-500/8 rounded-full px-2 py-0.5"
                    >
                      <span className="text-cyan-300 font-bold">{h}</span>
                      <span className="text-white/40">{ecl.activated_theme.split(',')[0]}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !error && !result && (
        <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
          <span className="text-4xl block mb-3 opacity-40">🌑</span>
          <p className={`${theme.text} text-sm opacity-50`}>Введите данные рождения для анализа затмений</p>
        </div>
      )}
    </div>
  );
}

export default EclipsePersonalBlock;
