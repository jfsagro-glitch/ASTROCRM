/**
 * VoCWindowsPanel — Void-of-Course Moon windows.
 * Calls POST /natal/void-of-course and shows upcoming VoC periods as a timeline.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  getVoCWindows,
  VoCWindowsResult,
  VoCWindow,
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

const PLANET_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера',
  mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн',
  uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон',
};

const ASPECT_RU: Record<string, string> = {
  conjunction: 'соединение', opposition: 'оппозиция', trine: 'тригон',
  square: 'квадрат', sextile: 'секстиль', quincunx: 'квиконс',
};

// ── helpers ──────────────────────────────────────────────────────────────────

/** Convert Julian Day to approximate ISO date string */
function jdToDate(jd: number): Date {
  // Standard JD to calendar formula
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e) + f;
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  const dayF = day;
  const dayInt = Math.floor(dayF);
  const hourF = (dayF - dayInt) * 24;
  const hourInt = Math.floor(hourF);
  const minF = (hourF - hourInt) * 60;
  const minInt = Math.floor(minF);
  return new Date(Date.UTC(year, month - 1, dayInt, hourInt, minInt));
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
}

function durationText(hours?: number): string {
  if (!hours) return '';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
}

// ── VoC item ─────────────────────────────────────────────────────────────────

function VoCItem({ win, idx }: { win: VoCWindow; idx: number }) {
  const startDate = win.void_start_jd ? jdToDate(win.void_start_jd) : null;
  const endDate   = win.void_end_jd   ? jdToDate(win.void_end_jd)   : null;
  const isActive  = startDate && endDate
    ? startDate.getTime() <= Date.now() && Date.now() <= endDate.getTime()
    : false;

  return (
    <div className={`rounded-xl border p-3 transition-all ${
      isActive
        ? 'border-red-500/40 bg-red-500/8'
        : 'border-white/10 bg-white/3 hover:bg-white/5'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {SIGN_GLYPH[win.moon_sign] ?? '🌙'}
          </span>
          <div>
            <div className="text-sm font-medium text-white/90">
              Луна в {SIGN_RU[win.moon_sign] ?? win.moon_sign} — без курса
              {isActive && (
                <span className="ml-2 text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 rounded-full px-1.5 py-0.5">
                  СЕЙЧАС
                </span>
              )}
            </div>
            {win.last_aspect && (
              <div className="text-xs text-white/40 mt-0.5">
                Посл. аспект: {PLANET_RU[win.last_aspect.planet] ?? win.last_aspect.planet}{' '}
                {ASPECT_RU[win.last_aspect.aspect] ?? win.last_aspect.aspect}
              </div>
            )}
          </div>
        </div>

        {win.void_duration_hours != null && (
          <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
            win.void_duration_hours < 2
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : win.void_duration_hours < 8
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            {durationText(win.void_duration_hours)}
          </span>
        )}
      </div>

      {/* Time range */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        {startDate && (
          <div className="text-xs">
            <div className="text-white/30">Начало</div>
            <div className="text-white/70">{formatDate(startDate)}</div>
            <div className="text-white/40">{formatTime(startDate)}</div>
          </div>
        )}
        {endDate && win.void_end_sign && (
          <div className="text-xs">
            <div className="text-white/30">Конец → {SIGN_GLYPH[win.void_end_sign] ?? ''} {SIGN_RU[win.void_end_sign] ?? win.void_end_sign}</div>
            <div className="text-white/70">{formatDate(endDate)}</div>
            <div className="text-white/40">{formatTime(endDate)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────

interface Props {
  birthData: BirthInput;
}

export function VoCWindowsPanel({ birthData }: Props) {
  const [data, setData] = useState<VoCWindowsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(5);

  const load = useCallback(async () => {
    if (!birthData.date) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getVoCWindows(birthData, undefined, count);
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [birthData, count]);

  useEffect(() => { load(); }, [load]);

  if (!birthData.date) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
        <p className="text-white/40 text-sm">Введите данные для расчёта периодов без курса</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white/80">🌙 Луна без курса (VoC)</h3>
          <p className="text-xs text-white/40 mt-0.5">
            Периоды когда Луна не формирует мажорных аспектов до перехода в следующий знак
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-white/50">Показать:</label>
          <select
            value={count}
            onChange={e => setCount(Number(e.target.value))}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white"
          >
            {[3, 5, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Advice box */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/80 leading-relaxed">
        <strong>Во время VoC избегайте:</strong> важных решений, начала новых проектов, подписания контрактов,
        покупок, переговоров. <strong>Подходит для:</strong> медитации, завершения незавершённых дел,
        отдыха, рефлексии.
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-red-300 text-sm">{error}</div>
      )}

      {loading && !data && (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      )}

      {data && (
        <div className="space-y-2">
          {data.windows_returned === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">
              Нет периодов VoC в ближайшие 30 дней
            </div>
          ) : (
            data.windows.map((win, i) => (
              <VoCItem key={i} win={win} idx={i} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default VoCWindowsPanel;
