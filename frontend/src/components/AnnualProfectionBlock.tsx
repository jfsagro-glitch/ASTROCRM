/**
 * AnnualProfectionBlock — Full 12-year profection cycle + activated planets.
 * Calls POST /predictive/annual-profection.
 */
import React, { useCallback, useState } from 'react';
import { RefreshCw, AlertTriangle, Calendar } from 'lucide-react';
import {
  getAnnualProfection,
  AnnualProfectionResult,
  ProfectionCycleYear,
} from '../services/astrologyService';
import type { BirthInput } from '../types/astro';

// ── constants ────────────────────────────────────────────────────────────────

const SIGN_GLYPH: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌', virgo: '♍',
  libra: '♎', scorpio: '♏', sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

const PLANET_GLYPH: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '⛢', neptune: '♆', pluto: '♇',
  node: '☊', lilith: '⚸',
};

const PLANET_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера',
  mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн',
  uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон', node: 'Сев. Узел', lilith: 'Лилит',
};

const SIGN_RU: Record<string, string> = {
  aries: 'Овен', taurus: 'Телец', gemini: 'Близнецы', cancer: 'Рак',
  leo: 'Лев', virgo: 'Дева', libra: 'Весы', scorpio: 'Скорпион',
  sagittarius: 'Стрелец', capricorn: 'Козерог', aquarius: 'Водолей', pisces: 'Рыбы',
};

const HOUSE_COLOR: Record<number, string> = {
  1: 'bg-red-900/30 border-red-500/40 text-red-200',
  2: 'bg-orange-900/30 border-orange-500/40 text-orange-200',
  3: 'bg-yellow-900/30 border-yellow-500/40 text-yellow-200',
  4: 'bg-lime-900/30 border-lime-500/40 text-lime-200',
  5: 'bg-green-900/30 border-green-500/40 text-green-200',
  6: 'bg-teal-900/30 border-teal-500/40 text-teal-200',
  7: 'bg-cyan-900/30 border-cyan-500/40 text-cyan-200',
  8: 'bg-sky-900/30 border-sky-500/40 text-sky-200',
  9: 'bg-blue-900/30 border-blue-500/40 text-blue-200',
  10: 'bg-indigo-900/30 border-indigo-500/40 text-indigo-200',
  11: 'bg-violet-900/30 border-violet-500/40 text-violet-200',
  12: 'bg-purple-900/30 border-purple-500/40 text-purple-200',
};

const HOUSE_THEMES_SHORT: Record<number, string> = {
  1: 'Личность',     2: 'Ресурсы',    3: 'Коммуникации', 4: 'Дом/семья',
  5: 'Творчество',   6: 'Здоровье',   7: 'Партнёрство',  8: 'Трансформация',
  9: 'Философия',   10: 'Карьера',   11: 'Друзья',       12: 'Тайны',
};

// ── helpers ──────────────────────────────────────────────────────────────────

function pname(k: string) { return PLANET_RU[k] ?? k; }
function pgl(k: string)   { return PLANET_GLYPH[k] ?? '●'; }
function sname(k: string) { return SIGN_RU[k] ?? k; }
function sgl(k: string)   { return SIGN_GLYPH[k] ?? ''; }

// ── component ────────────────────────────────────────────────────────────────

interface ThemeLike {
  card: string; header: string; text: string; accent: string;
  btn: string; symbol: string;
}

interface Props {
  birth: BirthInput;
  theme: ThemeLike;
}

export default function AnnualProfectionBlock({ birth, theme }: Props) {
  const [data, setData]         = useState<AnnualProfectionResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [targetDate, setTarget] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    if (!birth.date || !birth.time) return;
    setLoading(true); setError(null);
    try {
      const res = await getAnnualProfection(birth, targetDate);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [birth, targetDate]);

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className={`rounded-xl border ${theme.card} p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className={`h-5 w-5 ${theme.symbol}`} />
            <span className={`font-semibold ${theme.header}`}>Профекции года</span>
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <input
              type="date"
              value={targetDate}
              onChange={e => setTarget(e.target.value)}
              className={`text-sm px-2 py-1 rounded border ${theme.card} ${theme.text} border-white/10`}
            />
            <button
              onClick={load}
              disabled={loading || !birth.date}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${theme.btn} disabled:opacity-40`}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Рассчитать
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-4 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {data && (
        <>
          {/* Current year summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Annual house */}
            <div className={`rounded-xl border p-4 ${HOUSE_COLOR[data.annual_house] ?? theme.card}`}>
              <p className="text-xs opacity-60 mb-1">Дом года</p>
              <p className="text-3xl font-bold">H{data.annual_house}</p>
              <p className="text-sm font-medium mt-1">
                {sgl(data.annual_sign)} {sname(data.annual_sign)}
              </p>
              <p className="text-xs opacity-70 mt-1">{HOUSE_THEMES_SHORT[data.annual_house]}</p>
            </div>

            {/* Lord of the year */}
            <div className={`rounded-xl border ${theme.card} p-4`}>
              <p className={`text-xs opacity-60 mb-1 ${theme.text}`}>Лорд года</p>
              <p className={`text-3xl font-bold ${theme.symbol}`}>{pgl(data.annual_lord)}</p>
              <p className={`text-sm font-medium mt-1 ${theme.header}`}>{pname(data.annual_lord)}</p>
              {data.annual_lord_sign && (
                <p className={`text-xs opacity-70 mt-1 ${theme.text}`}>
                  Натально в {sname(data.annual_lord_sign)}
                </p>
              )}
            </div>

            {/* Monthly house */}
            <div className={`rounded-xl border ${theme.card} p-4`}>
              <p className={`text-xs opacity-60 mb-1 ${theme.text}`}>Дом месяца</p>
              <p className={`text-3xl font-bold ${theme.accent}`}>H{data.monthly_house}</p>
              <p className={`text-sm font-medium mt-1 ${theme.header}`}>
                {sgl(data.monthly_sign)} {sname(data.monthly_sign)}
              </p>
              <p className={`text-xs opacity-70 mt-1 ${theme.text}`}>
                Лорд: {pgl(data.monthly_lord)} {pname(data.monthly_lord)}
              </p>
            </div>
          </div>

          {/* Activated natal planets */}
          {data.activated_natal_planets.length > 0 && (
            <div className={`rounded-xl border ${theme.card} p-4`}>
              <p className={`text-xs font-semibold uppercase tracking-wider opacity-60 mb-2 ${theme.text}`}>
                Натальные планеты в активированном доме
              </p>
              <div className="flex flex-wrap gap-2">
                {data.activated_natal_planets.map(p => (
                  <span
                    key={p.planet}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm ${HOUSE_COLOR[data.annual_house] ?? 'border-white/20'}`}
                  >
                    <span className="text-base">{pgl(p.planet)}</span>
                    <span>{pname(p.planet)}</span>
                    <span className="opacity-60 text-xs">{sgl(p.sign)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Interpretation */}
          <div className={`rounded-xl border ${theme.card} p-4`}>
            <p className={`text-sm leading-relaxed ${theme.text}`}>{data.interpretation}</p>
          </div>

          {/* 12-year cycle table */}
          <div className={`rounded-xl border ${theme.card} overflow-hidden`}>
            <div className="px-4 pt-4 pb-2">
              <p className={`text-sm font-semibold ${theme.header}`}>Цикл профекций — 12 лет</p>
              <p className={`text-xs opacity-50 ${theme.text}`}>Начиная с текущего года</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-white/5">
                    <th className={`px-3 py-2 text-left text-xs uppercase opacity-50 ${theme.text}`}>+год</th>
                    <th className={`px-3 py-2 text-left text-xs uppercase opacity-50 ${theme.text}`}>Возраст</th>
                    <th className={`px-3 py-2 text-left text-xs uppercase opacity-50 ${theme.text}`}>Дом</th>
                    <th className={`px-3 py-2 text-left text-xs uppercase opacity-50 ${theme.text}`}>Знак</th>
                    <th className={`px-3 py-2 text-left text-xs uppercase opacity-50 ${theme.text}`}>Лорд</th>
                    <th className={`px-3 py-2 text-left text-xs uppercase opacity-50 ${theme.text}`}>Тема</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cycle_12.map((row: ProfectionCycleYear) => (
                    <tr
                      key={row.year_offset}
                      className={`border-t border-white/5 transition-colors ${
                        row.is_current
                          ? 'bg-white/10 font-semibold'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <td className={`px-3 py-2 ${theme.text} opacity-60`}>
                        {row.is_current ? '→' : `+${row.year_offset}`}
                      </td>
                      <td className={`px-3 py-2 font-mono ${row.is_current ? theme.accent : theme.text}`}>
                        {row.age}
                      </td>
                      <td className={`px-3 py-2`}>
                        <span className={`px-1.5 py-0.5 rounded border text-xs ${HOUSE_COLOR[row.house] ?? ''}`}>
                          H{row.house}
                        </span>
                      </td>
                      <td className={`px-3 py-2 ${theme.text}`}>
                        <span className="mr-1 opacity-70">{sgl(row.sign)}</span>
                        {sname(row.sign)}
                      </td>
                      <td className={`px-3 py-2 ${theme.symbol}`}>
                        <span className="mr-1">{pgl(row.lord)}</span>
                        <span className="text-xs">{pname(row.lord)}</span>
                      </td>
                      <td className={`px-3 py-2 text-xs opacity-60 ${theme.text}`}>
                        {HOUSE_THEMES_SHORT[row.house]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!data && !loading && !error && (
        <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
          <Calendar className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-30`} />
          <p className={`${theme.text} text-sm opacity-60`}>Выберите дату и нажмите «Рассчитать»</p>
        </div>
      )}
    </div>
  );
}
