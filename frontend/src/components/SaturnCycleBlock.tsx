/**
 * SaturnCycleBlock — Saturn cycle milestones timeline.
 * Calls POST /predictive/saturn-cycle and shows all returns, squares, oppositions.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  getSaturnCycle,
  SaturnCycleResult,
  SaturnMilestone,
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

const MILESTONE_STYLE: Record<string, { icon: string; border: string; bg: string; text: string }> = {
  conjunction: {
    icon: '♄',
    border: 'border-amber-500/50',
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
  },
  square_1: {
    icon: '□',
    border: 'border-sky-500/40',
    bg: 'bg-sky-500/8',
    text: 'text-sky-300',
  },
  opposition: {
    icon: '☍',
    border: 'border-rose-500/40',
    bg: 'bg-rose-500/8',
    text: 'text-rose-300',
  },
  square_2: {
    icon: '□',
    border: 'border-violet-500/40',
    bg: 'bg-violet-500/8',
    text: 'text-violet-300',
  },
};

// ── helpers ──────────────────────────────────────────────────────────────────

function isInPast(dateUtc: string): boolean {
  return dateUtc.slice(0, 10) < new Date().toISOString().slice(0, 10);
}

function isNearNow(dateUtc: string, windowDays = 365): boolean {
  const d = new Date(dateUtc.slice(0, 10));
  const diff = d.getTime() - Date.now();
  return diff >= -windowDays * 86400000 && diff <= windowDays * 86400000;
}

// ── milestone card ────────────────────────────────────────────────────────────

function MilestoneCard({ m, isCurrent }: { m: SaturnMilestone; isCurrent: boolean }) {
  const style = MILESTONE_STYLE[m.type] ?? MILESTONE_STYLE.conjunction;
  const past  = isInPast(m.date_utc);
  const near  = isNearNow(m.date_utc);
  const date  = m.date_utc.slice(0, 10);
  const year  = date.slice(0, 4);

  return (
    <div className={`rounded-xl border p-3 transition-all ${
      isCurrent
        ? `${style.border} ${style.bg} ring-1 ring-amber-400/30`
        : past
        ? 'border-white/8 bg-white/2 opacity-60'
        : near
        ? `${style.border} ${style.bg}`
        : 'border-white/8 bg-white/3 hover:bg-white/5'
    }`}>
      <div className="flex items-start gap-3">
        {/* Icon + age */}
        <div className="flex-shrink-0 flex flex-col items-center w-12 text-center">
          <span className={`text-2xl ${style.text}`}>{style.icon}</span>
          <span className="text-[10px] text-white/30 mt-0.5">{Math.floor(m.age_years)} лет</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${past ? 'text-white/50' : 'text-white/90'}`}>
              {m.label}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full border ${style.border} ${style.text} text-[10px]`}>
              Цикл {m.cycle_number}
            </span>
            {isCurrent && (
              <span className="text-[10px] text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-full px-1.5 py-0.5">
                СЕЙЧАС
              </span>
            )}
          </div>

          <div className="text-xs text-white/40 mt-0.5">
            {year} · ♄ в {SIGN_GLYPH[m.saturn_sign] ?? ''} {SIGN_RU[m.saturn_sign] ?? m.saturn_sign}
          </div>

          <p className="text-xs text-white/55 mt-1.5 leading-relaxed">{m.description}</p>
        </div>

        {/* Date */}
        <div className="flex-shrink-0 text-right">
          <div className={`text-xs font-medium ${past ? 'text-white/30' : style.text}`}>{date}</div>
          <div className="text-[10px] text-white/20">{m.age_display}</div>
        </div>
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

interface Props {
  birthData: BirthInput;
}

export function SaturnCycleBlock({ birthData }: Props) {
  const [data, setData]       = useState<SaturnCycleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [filter, setFilter]   = useState<'all' | 'future' | 'key'>('all');
  const [maxAge, setMaxAge]   = useState(90);

  const load = useCallback(async () => {
    if (!birthData.date) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getSaturnCycle(birthData, maxAge);
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [birthData, maxAge]);

  useEffect(() => { load(); }, [load]);

  if (!birthData.date) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
        <p className="text-white/40 text-sm">Введите данные рождения для расчёта цикла Сатурна</p>
      </div>
    );
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  const filtered = data?.milestones.filter(m => {
    if (filter === 'future') return m.date_utc.slice(0, 10) >= todayStr;
    if (filter === 'key')    return m.type === 'conjunction' || m.type === 'opposition';
    return true;
  }) ?? [];

  // Find "current" milestone (closest past or within ±1yr window)
  const currentIdx = data?.milestones.findIndex(m => isNearNow(m.date_utc, 365)) ?? -1;
  const currentMilestone = currentIdx >= 0 ? data?.milestones[currentIdx] : undefined;

  return (
    <div className="space-y-4">
      {/* Natal Saturn info */}
      {data && (
        <div className="rounded-xl border border-stone-500/30 bg-stone-500/8 p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-3xl">♄</span>
            <div>
              <div className="text-sm font-semibold text-white/80">
                Натальный Сатурн — {SIGN_GLYPH[data.natal_saturn_sign] ?? ''}{' '}
                {SIGN_RU[data.natal_saturn_sign] ?? data.natal_saturn_sign}{' '}
                {data.natal_saturn_deg}
              </div>
              <div className="text-xs text-white/40 mt-0.5">
                Прожито {Math.floor(data.years_lived)} лет ·
                Цикл {data.cycle_number} ·
                {' '}{Math.floor(data.cycle_age_years)} лет {Math.round((data.cycle_age_years % 1) * 12)} мес. в цикле
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs text-white/40">Сатурн сейчас</div>
              <div className="text-sm text-stone-300">
                {SIGN_GLYPH[data.current_saturn_sign] ?? ''}{' '}
                {SIGN_RU[data.current_saturn_sign] ?? data.current_saturn_sign}
              </div>
            </div>
          </div>

          {/* Current phase pill */}
          {currentMilestone && (
            <div className="mt-2 pt-2 border-t border-white/8">
              <div className="text-xs text-white/50">
                Активная фаза: <span className="text-amber-300 font-medium">{currentMilestone.label}</span>
                {' '}({currentMilestone.date_utc.slice(0, 7)})
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'future', 'key'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs transition-all ${
              filter === f ? 'bg-stone-500 text-white' : 'bg-white/5 text-white/40 hover:text-white/60'
            }`}
          >
            {f === 'all' ? 'Все' : f === 'future' ? 'Будущее' : 'Ключевые'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-white/40">
          <span>До</span>
          <select
            value={maxAge}
            onChange={e => setMaxAge(Number(e.target.value))}
            className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-xs text-white/60"
          >
            {[60, 75, 90].map(n => <option key={n} value={n}>{n} лет</option>)}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-white/40 px-1">
        {Object.entries(MILESTONE_STYLE).map(([k, v]) => (
          <span key={k} className={`flex items-center gap-1 ${v.text}`}>
            <span className="text-base">{v.icon}</span>
            {k === 'conjunction' ? 'Возврат (~29.5л)' : k === 'square_1' ? 'Квадрат (~7.4л)' : k === 'opposition' ? 'Оппозиция (~14.75л)' : '3-й Квадрат (~22л)'}
          </span>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-red-300 text-sm">{error}</div>
      )}

      {loading && !data && (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      )}

      {data && filtered.length === 0 && (
        <div className="text-center py-8 text-white/30 text-sm">Нет милстоунов в выбранном диапазоне</div>
      )}

      {data && (
        <div className="space-y-2">
          {filtered.map((m, i) => (
            <MilestoneCard
              key={`${m.type}-${m.date_utc}`}
              m={m}
              isCurrent={currentMilestone?.date_utc === m.date_utc}
            />
          ))}
        </div>
      )}

      {data && (
        <p className="text-[10px] text-white/20 px-1">
          Сатурн возвращается к натальной позиции каждые ~29.5 лет. Квадратуры — каждые ~7.4 года.
          Исследования Гоклена (20 000+ карт): позиция Сатурна у углов коррелирует с профессией.
        </p>
      )}
    </div>
  );
}

export default SaturnCycleBlock;
