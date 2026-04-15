/**
 * CompensatoryPracticesCard — Full-page compensatory engine UI.
 * Three-layer display: background narratives → active transit planets → aspect pairs.
 * Data source: POST /compensatory/practices
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  getCompensatoryPractices,
  CompensatoryReport,
  CompensatoryTransit,
  CompensatoryAspectPair,
  CompensatoryBackground,
} from '../services/astrologyService';
import type { BirthInput } from '../types/astro';

// ── constants ─────────────────────────────────────────────────────────────────

const PLANET_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера', mars: 'Марс',
  jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон',
};
const PLANET_GLYPH: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
};
const PLANET_COLOR: Record<string, string> = {
  sun: 'text-amber-400', moon: 'text-slate-300', mercury: 'text-cyan-400',
  venus: 'text-pink-400', mars: 'text-red-400', jupiter: 'text-indigo-400',
  saturn: 'text-stone-400', uranus: 'text-teal-400', neptune: 'text-violet-400',
  pluto: 'text-rose-400',
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

const INTENSITY_LABELS: Record<string, string> = {
  light: '🕊 Лёгкий', medium: '⚡ Средний', deep: '🌊 Глубокий',
};
const CONTEXT_LABELS: Record<string, string> = {
  travel: '✈️ Путешествие', work: '💼 Работа', home: '🏡 Дом',
  crisis: '🆘 Кризис', creative: '🎨 Творчество',
};

// ── helpers ───────────────────────────────────────────────────────────────────

function extractText(p: unknown): string {
  if (typeof p === 'string') return p;
  if (p && typeof p === 'object') {
    const obj = p as Record<string, string>;
    return obj.text ?? obj.emoji ?? JSON.stringify(p);
  }
  return String(p);
}

function extractEmoji(p: unknown): string {
  if (p && typeof p === 'object') {
    const obj = p as Record<string, string>;
    return obj.emoji ?? '';
  }
  return '';
}

// ── Practice pill ─────────────────────────────────────────────────────────────

function PracticePill({ practice, index }: { practice: unknown; index: number }) {
  const emoji = extractEmoji(practice);
  const text  = extractText(practice).replace(/^[^\w]+/, '');  // strip leading emoji if any
  return (
    <li className="flex items-start gap-2 py-1">
      <span className="text-base leading-snug shrink-0 mt-0.5">{emoji || '•'}</span>
      <span className="text-xs text-white/70 leading-snug">{text}</span>
    </li>
  );
}

// ── Background card ───────────────────────────────────────────────────────────

function BackgroundCard({ bg }: { bg: CompensatoryBackground }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-violet-500/25 bg-violet-500/5 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 text-left flex items-start justify-between gap-2 hover:bg-violet-500/8 transition-colors"
      >
        <div>
          <div className="text-sm font-semibold text-violet-300">{bg.title}</div>
          <div className="text-xs text-white/40 mt-0.5">{bg.theme}</div>
        </div>
        <span className="text-violet-400/50 text-xs shrink-0 mt-0.5">{open ? '▲' : '▼'}</span>
      </button>
      {open && bg.practice && (
        <div className="px-4 pb-3 border-t border-violet-500/15">
          <p className="text-xs text-white/60 leading-relaxed mt-2">{bg.practice}</p>
        </div>
      )}
    </div>
  );
}

// ── Transit card ──────────────────────────────────────────────────────────────

function TransitCard({ t }: { t: CompensatoryTransit }) {
  const [open, setOpen] = useState(false);
  const color = PLANET_COLOR[t.planet] ?? 'text-white/60';
  const practices = Array.isArray(t.practices) ? t.practices : [];
  return (
    <div className="rounded-lg border border-white/8 bg-white/3 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-white/3 transition-colors text-left"
      >
        <span className={`text-xl leading-none ${color}`}>
          {PLANET_GLYPH[t.planet] ?? '?'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-sm font-medium ${color}`}>
              {PLANET_RU[t.planet] ?? t.planet}
            </span>
            <span className="text-xs text-white/30">в</span>
            <span className="text-xs text-white/60">
              {SIGN_GLYPH[t.sign] ?? ''} {SIGN_RU[t.sign] ?? t.sign}
            </span>
          </div>
          {t.tension_signal && (
            <div className="text-[10px] text-amber-400/70 mt-0.5 truncate">{t.tension_signal}</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-white/25">{practices.length} практик</span>
          <span className="text-white/20 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-white/5 px-3 pb-2 pt-1">
          {t.function && (
            <p className="text-[11px] text-white/40 italic mb-1.5">{t.function}</p>
          )}
          {practices.length > 0 ? (
            <ul className="space-y-0.5">
              {practices.map((p, i) => <PracticePill key={i} practice={p} index={i} />)}
            </ul>
          ) : (
            <p className="text-xs text-white/30">Нет практик для выбранного контекста.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Aspect pair card ──────────────────────────────────────────────────────────

function AspectPairCard({ pair }: { pair: CompensatoryAspectPair }) {
  const [open, setOpen] = useState(false);
  const parts = pair.pair.split('_');
  const p1 = parts[0] ?? '';
  const p2 = parts[1] ?? '';
  const aspect = parts[2] ?? '';
  const ASPECT_COLOR: Record<string, string> = {
    conjunction: 'text-violet-300', opposition: 'text-red-300',
    square: 'text-red-300', trine: 'text-blue-300', sextile: 'text-sky-300',
  };
  const ASPECT_GLYPH: Record<string, string> = {
    conjunction: '☌', opposition: '☍', square: '□', trine: '△', sextile: '✶',
  };
  const practices = Array.isArray(pair.practices) ? pair.practices : [];
  return (
    <div className="rounded-lg border border-white/8 bg-white/3 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-white/3 transition-colors text-left"
      >
        <div className="flex items-center gap-1 text-base">
          <span className={PLANET_COLOR[p1] ?? 'text-white/60'}>{PLANET_GLYPH[p1] ?? ''}</span>
          <span className={`${ASPECT_COLOR[aspect] ?? 'text-white/40'} font-bold`}>
            {ASPECT_GLYPH[aspect] ?? aspect}
          </span>
          <span className={PLANET_COLOR[p2] ?? 'text-white/60'}>{PLANET_GLYPH[p2] ?? ''}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-white/75 truncate">{pair.name || `${PLANET_RU[p1] ?? p1} ${aspect} ${PLANET_RU[p2] ?? p2}`}</div>
          {pair.image && <div className="text-[10px] text-white/35 truncate">{pair.image}</div>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-white/25">{practices.length}п</span>
          <span className="text-white/20 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-white/5 px-3 pb-2 pt-1">
          {pair.tension && <p className="text-[11px] text-amber-400/60 mb-1">{pair.tension}</p>}
          {pair.context && <p className="text-[11px] text-white/40 italic mb-1.5">{pair.context}</p>}
          {practices.length > 0 ? (
            <ul className="space-y-0.5">
              {practices.map((p, i) => <PracticePill key={i} practice={p} index={i} />)}
            </ul>
          ) : (
            <p className="text-xs text-white/30">Нет практик для этой пары.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  birthData: BirthInput;
  targetDate?: string;
}

export function CompensatoryPracticesCard({ birthData, targetDate }: Props) {
  const [data, setData]         = useState<CompensatoryReport | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [intensity, setIntensity] = useState<'light' | 'medium' | 'deep'>('medium');
  const [context, setContext]   = useState<string | undefined>(undefined);
  const today = new Date().toISOString().split('T')[0];
  const effectiveDate = targetDate ?? today;

  const load = useCallback(async () => {
    if (!birthData.date) return;
    setLoading(true); setError(null);
    try {
      const res = await getCompensatoryPractices(birthData, effectiveDate, intensity, context);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [birthData, effectiveDate, intensity, context]);

  useEffect(() => { load(); }, [load]);

  if (!birthData.date) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
        <p className="text-white/40 text-sm">Введите данные рождения для компенсаторных практик</p>
      </div>
    );
  }

  const backgrounds   = data?.background?.active ?? [];
  const transits      = data?.active_transits ?? [];
  const pairs         = data?.aspect_pairs ?? [];
  const sunNote       = data?.sun_sign_note;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="rounded-xl border border-white/10 bg-white/3 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Интенсивность</div>
            <div className="flex gap-1">
              {(['light','medium','deep'] as const).map(i => (
                <button
                  key={i}
                  onClick={() => setIntensity(i)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    intensity === i
                      ? 'bg-violet-500/30 border border-violet-500/40 text-violet-200'
                      : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/60'
                  }`}
                >
                  {INTENSITY_LABELS[i]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Контекст</div>
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setContext(undefined)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  !context ? 'bg-white/15 border border-white/20 text-white/70' : 'bg-white/5 border border-white/8 text-white/30 hover:text-white/50'
                }`}
              >
                Все
              </button>
              {Object.entries(CONTEXT_LABELS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setContext(k)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    context === k ? 'bg-violet-500/20 border border-violet-500/30 text-violet-300' : 'bg-white/5 border border-white/8 text-white/30 hover:text-white/50'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-red-300 text-sm">{error}</div>
      )}

      {loading && !data && (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      )}

      {data && (
        <>
          {/* Opening phrase */}
          {data.opening && (
            <div className="rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-900/20 to-transparent p-4">
              <p className="text-sm text-violet-200/80 italic leading-relaxed">«{data.opening}»</p>
              <div className="mt-2 text-[10px] text-white/25">
                {effectiveDate} · {INTENSITY_LABELS[intensity]}
                {context && ` · ${CONTEXT_LABELS[context] ?? context}`}
              </div>
            </div>
          )}

          {/* Sun sign note */}
          {sunNote?.sign && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">☉</span>
                <span className="text-xs font-semibold text-amber-300 uppercase tracking-wide">
                  Натальное Солнце — {SIGN_RU[sunNote.sign] ?? sunNote.sign}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {sunNote.strength && (
                  <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-lg p-2">
                    <div className="text-[10px] text-emerald-400/70 uppercase tracking-wide mb-0.5">Сила</div>
                    <p className="text-white/60">{sunNote.strength}</p>
                  </div>
                )}
                {sunNote.challenge && (
                  <div className="bg-orange-500/8 border border-orange-500/15 rounded-lg p-2">
                    <div className="text-[10px] text-orange-400/70 uppercase tracking-wide mb-0.5">Вызов</div>
                    <p className="text-white/60">{sunNote.challenge}</p>
                  </div>
                )}
                {sunNote.daily && (
                  <div className="bg-blue-500/8 border border-blue-500/15 rounded-lg p-2">
                    <div className="text-[10px] text-blue-400/70 uppercase tracking-wide mb-0.5">Ежедневно</div>
                    <p className="text-white/60">{sunNote.daily}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Layer 1: Background narratives */}
          {backgrounds.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🌐</span>
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">
                  Фоновые нарративы ({backgrounds.length})
                </h3>
                <span className="text-[10px] text-white/25">Долгосрочные тренды</span>
              </div>
              <div className="space-y-2">
                {backgrounds.map((bg, i) => <BackgroundCard key={i} bg={bg} />)}
              </div>
            </section>
          )}

          {/* Layer 2: Transit planets */}
          {transits.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">⚡</span>
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">
                  Транзитные планеты ({transits.length})
                </h3>
                <span className="text-[10px] text-white/25">Текущие активации</span>
              </div>
              <div className="space-y-1.5">
                {transits.map((t, i) => <TransitCard key={i} t={t} />)}
              </div>
            </section>
          )}

          {/* Layer 3: Aspect pairs */}
          {pairs.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🔗</span>
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">
                  Аспектные пары ({pairs.length})
                </h3>
                <span className="text-[10px] text-white/25">Комбинированные паттерны</span>
              </div>
              <div className="space-y-1.5">
                {pairs.map((pair, i) => <AspectPairCard key={i} pair={pair} />)}
              </div>
            </section>
          )}

          {backgrounds.length === 0 && transits.length === 0 && pairs.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/3 p-8 text-center">
              <p className="text-white/40 text-sm">Нет активных практик для выбранных параметров.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CompensatoryPracticesCard;
