/**
 * DailyPersonalBlock — personalised daily astrology summary.
 * Calls POST /daily/personal and shows: Moon, top transits, profection,
 * firdaria period, and compensatory advice.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  getDailyPersonal,
  DailyPersonalResult,
  DailyTransitAspect,
} from '../services/astrologyService';
import type { BirthInput } from '../types/astro';

// ── constants ────────────────────────────────────────────────────────────────

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

const SIGN_GLYPH: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌', virgo: '♍',
  libra: '♎', scorpio: '♏', sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

const PLANET_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера',
  mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн',
  uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон',
  node: 'Сев.Узел', lilith: 'Лилит', chiron: 'Хирон',
};

const PLANET_GLYPH: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  node: '☊', lilith: '⚸', chiron: '⚷',
};

const ASPECT_GLYPH: Record<string, string> = {
  conjunction: '☌', opposition: '☍', trine: '△', square: '□',
  sextile: '⚹', quincunx: '⚻', semisextile: '⚺',
};

const ASPECT_COLOR: Record<string, string> = {
  conjunction: 'text-purple-400', trine: 'text-blue-400', sextile: 'text-sky-400',
  opposition: 'text-red-400', square: 'text-orange-400', quincunx: 'text-amber-400',
};

const CATEGORY_EMOJI: Record<string, string> = {
  health: '💚', finance: '💰', relationships: '💜', career: '🎯',
  spirit: '✨', general: '🌟', creativity: '🎨', communication: '📢',
};

const HOUSE_RU: Record<number, string> = {
  1: 'Дом личности', 2: 'Дом ресурсов', 3: 'Дом коммуникаций',
  4: 'Дом дома', 5: 'Дом творчества', 6: 'Дом здоровья',
  7: 'Дом партнёрства', 8: 'Дом трансформации', 9: 'Дом философии',
  10: 'Дом карьеры', 11: 'Дом сообщества', 12: 'Дом тайн',
};

// ── sub-components ───────────────────────────────────────────────────────────

function MoonCard({ moon }: { moon: DailyPersonalResult['moon'] }) {
  const voc = moon.void_of_course;
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-indigo-950/40 to-blue-950/20 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{PHASE_EMOJI[moon.phase] ?? '🌙'}</span>
          <div>
            <div className="text-base font-semibold text-white">
              {SIGN_GLYPH[moon.sign] ?? ''} Луна в {SIGN_RU[moon.sign] ?? moon.sign}
            </div>
            <div className="text-xs text-white/50">
              {PHASE_RU[moon.phase] ?? moon.phase} · {moon.degree.toFixed(1)}° · фаза {moon.phase_angle.toFixed(0)}°
            </div>
          </div>
        </div>
        {voc && (
          <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
            voc.is_void
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            {voc.is_void ? '⚠️ VoC — без курса' : '✓ Луна в знаке'}
          </div>
        )}
      </div>

      {voc?.is_void && voc.void_duration_hours != null && (
        <div className="mt-2 text-xs text-amber-300/80 bg-amber-500/5 rounded-lg px-3 py-2 border border-amber-500/20">
          🕐 Без курса {voc.void_duration_hours.toFixed(1)} ч → {SIGN_RU[voc.void_end_sign ?? ''] ?? voc.void_end_sign}
          <br/>
          <span className="text-white/50">Избегайте важных решений, подписания договоров, начала новых дел.</span>
        </div>
      )}
    </div>
  );
}

function TransitCard({ t, idx }: { t: DailyTransitAspect; idx: number }) {
  const isTense = ['square', 'opposition'].includes(t.aspect);
  const isHarm  = ['trine', 'sextile'].includes(t.aspect);
  return (
    <div className={`rounded-lg border p-2.5 text-sm flex items-center gap-2 ${
      isTense ? 'border-red-500/25 bg-red-500/5' :
      isHarm  ? 'border-blue-500/25 bg-blue-500/5' :
                'border-white/10 bg-white/5'
    }`}>
      <span className="text-white/30 text-xs w-4 text-center">{idx + 1}</span>
      <span className="font-medium">
        {PLANET_GLYPH[t.transit_planet] ?? ''}{' '}
        <span className="text-white/70 text-xs">{PLANET_RU[t.transit_planet] ?? t.transit_planet}</span>
      </span>
      <span className={`font-bold text-base ${ASPECT_COLOR[t.aspect] ?? 'text-white/70'}`}>
        {ASPECT_GLYPH[t.aspect] ?? t.aspect}
      </span>
      <span className="text-white/50 text-xs">
        нат. {PLANET_GLYPH[t.natal_planet] ?? ''} {PLANET_RU[t.natal_planet] ?? t.natal_planet}
      </span>
      <span className="ml-auto text-xs text-white/30">{t.orb.toFixed(1)}°</span>
      <span className={`text-[10px] px-1 py-0.5 rounded ${t.applying ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-white/40'}`}>
        {t.applying ? '→' : '←'}
      </span>
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────

interface Props {
  birthData: BirthInput;
}

export function DailyPersonalBlock({ birthData }: Props) {
  const [data, setData] = useState<DailyPersonalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    if (!birthData.date || !birthData.time) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getDailyPersonal(birthData, targetDate);
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [birthData, targetDate]);

  useEffect(() => { load(); }, [load]);

  if (!birthData.date || !birthData.time) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
        <p className="text-white/40 text-sm">Введите дату рождения для персонального дня</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-white/50">Дата:</label>
        <input
          type="date"
          value={targetDate}
          onChange={e => setTargetDate(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
        />
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs rounded-lg transition-colors"
        >
          {loading ? '…' : '🔄 Обновить'}
        </button>
        <button
          onClick={() => { setTargetDate(new Date().toISOString().slice(0, 10)); }}
          className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white/60 text-xs rounded-lg border border-white/10 transition-colors"
        >
          Сегодня
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-red-300 text-sm">{error}</div>
      )}

      {loading && !data && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Moon */}
          <MoonCard moon={data.moon} />

          {/* Profection + Firdaria row */}
          <div className="grid grid-cols-2 gap-3">
            {Object.keys(data.profection).length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/50 mb-1">⏳ Профекция {data.profection.age}л</div>
                <div className="text-sm font-semibold text-white">
                  Дом {data.profection.profected_house}
                </div>
                {data.profection.profected_house && (
                  <div className="text-xs text-white/40 mt-0.5">
                    {HOUSE_RU[data.profection.profected_house]}
                  </div>
                )}
                {data.profection.lord_of_year && (
                  <div className="text-xs text-purple-300 mt-1">
                    Владыка: {PLANET_GLYPH[data.profection.lord_of_year] ?? ''}{' '}
                    {PLANET_RU[data.profection.lord_of_year] ?? data.profection.lord_of_year}
                  </div>
                )}
              </div>
            )}

            {Object.keys(data.firdaria).length > 0 && data.firdaria.current_period && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/50 mb-1">🌀 Фирдарий</div>
                <div className="text-sm font-semibold text-white">
                  {PLANET_GLYPH[data.firdaria.current_period.planet] ?? ''}{' '}
                  {PLANET_RU[data.firdaria.current_period.planet] ?? data.firdaria.current_period.planet}
                </div>
                {data.firdaria.current_sub && (
                  <div className="text-xs text-white/50 mt-0.5">
                    Субпериод: {PLANET_GLYPH[data.firdaria.current_sub.planet] ?? ''}{' '}
                    {PLANET_RU[data.firdaria.current_sub.planet] ?? data.firdaria.current_sub.planet}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top transits */}
          {data.top_transits.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-white/50 mb-2 uppercase tracking-wide">
                Топ транзиты дня
              </h3>
              <div className="space-y-1.5">
                {data.top_transits.map((t, i) => (
                  <TransitCard key={i} t={t} idx={i} />
                ))}
              </div>
            </div>
          )}

          {/* Compensatory advice */}
          {data.advice.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-white/50 mb-2 uppercase tracking-wide">
                💡 Рекомендации
              </h3>
              <div className="space-y-2">
                {data.advice.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span>{CATEGORY_EMOJI[a.category] ?? '✨'}</span>
                      <span className="text-white/40 text-xs capitalize">{a.category}</span>
                    </div>
                    <p className="text-white/80 leading-relaxed text-xs">{a.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DailyPersonalBlock;
