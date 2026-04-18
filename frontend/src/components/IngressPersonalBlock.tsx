/**
 * IngressPersonalBlock — 12 solar ingresses for the year mapped to natal houses.
 * Calls POST /predictive/ingress-personal.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  getIngressPersonal,
  IngressPersonalResult,
  PersonalIngress,
} from '../services/astrologyService';
import type { BirthInput } from '../types/astro';

// ── constants ────────────────────────────────────────────────────────────────

const SIGN_GLYPH: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌', virgo: '♍',
  libra: '♎', scorpio: '♏', sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

const HOUSE_COLOR: Record<number, string> = {
  1:  'text-red-300 border-red-500/30',
  2:  'text-orange-300 border-orange-500/30',
  3:  'text-yellow-300 border-yellow-500/30',
  4:  'text-lime-300 border-lime-500/30',
  5:  'text-green-300 border-green-500/30',
  6:  'text-teal-300 border-teal-500/30',
  7:  'text-cyan-300 border-cyan-500/30',
  8:  'text-sky-300 border-sky-500/30',
  9:  'text-blue-300 border-blue-500/30',
  10: 'text-indigo-300 border-indigo-500/30',
  11: 'text-violet-300 border-violet-500/30',
  12: 'text-purple-300 border-purple-500/30',
};

const INGRESS_HOUSE_NARRATIVE: Record<number, string> = {
  1:  'Солнце освещает вас лично — как вы выглядите, как держитесь, что думаете о себе. Около 30 дней жизнь фокусируется на вашей идентичности. Хорошее время начинать что-то новое с нуля, менять образ, заявлять о себе.',
  2:  'Солнце в доме денег и ценностей — финансовые вопросы выходят на первый план. Это не обязательно проблемы: часто именно сейчас приходят нужные деньги или появляется ясность, чего вы реально хотите от жизни.',
  3:  'Солнце в доме коммуникаций — 30 дней активной умственной работы, переговоров, поездок. Пишите письма, подписывайте договоры, звоните тем, кому давно хотели. Братья, сёстры, соседи — они сейчас ближе.',
  4:  'Солнце в доме семьи — время уделить внимание дому и близким. Семейные вопросы всплывают сами. Хорошее время для ремонта, переезда, разговоров с родителями о важном.',
  5:  'Солнце в доме радости — один из лучших периодов года. Романтика, творчество, дети, игра. Позвольте себе быть лёгким и счастливым — жизнь сейчас это поддерживает.',
  6:  'Солнце в доме здоровья и работы — время взять под контроль рутину. Запишитесь к врачу, наведите порядок в питании, оптимизируйте рабочие процессы. Небольшие усилия дают ощутимый результат.',
  7:  'Солнце в доме партнёрств — отношения выходят на первый план. Около 30 дней активных переговоров, встреч, совместных решений. Важный человек появляется или существующие отношения требуют внимания.',
  8:  'Солнце в доме трансформации — время для глубинной работы. Психология, финансы с партнёром, избавление от лишнего. Не самый лёгкий период, но зато — настоящий. Что готовы отпустить?',
  9:  'Солнце в доме путешествий и знаний — расширяйтесь. Поездка, курс, новая книга, разговор с мудрым человеком — всё это сейчас особенно питательно. Горизонты расширяются буквально и метафорически.',
  10: 'Солнце в доме карьеры — профессиональная видимость на пике. Просите о повышении, презентуйте проекты, знакомьтесь с нужными людьми. Жизнь смотрит на вашу работу — покажите лучшее.',
  11: 'Солнце в доме дружбы и целей — время единомышленников. Вступайте в сообщества, обсуждайте мечты, заводите новые контакты. Коллективная энергия сейчас работает на вас.',
  12: 'Солнце в доме уединения — время замедлиться. Ретрит, уединение, работа за кулисами. Именно сейчас полезнее всего: медитировать, вести дневник, завершать старые дела. Восстановите силы перед новым циклом.',
};

// ── helpers ──────────────────────────────────────────────────────────────────

function formatIngressDate(dateStr: string): string {
  if (!dateStr) return '—';
  const clean = dateStr.length > 10 ? dateStr.slice(0, 10) : dateStr;
  const d = new Date(clean + 'T12:00:00Z');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

function isCurrentSun(ing: PersonalIngress): boolean {
  if (!ing.ingress_date) return false;
  const d = new Date(ing.ingress_date.slice(0, 10));
  const today = new Date();
  const diff = today.getTime() - d.getTime();
  return diff >= 0 && diff <= 30 * 86400000; // within 30 days after ingress
}

function isNext(ing: PersonalIngress, current: PersonalIngress | null): boolean {
  if (!current) return false;
  if (!ing.ingress_date) return false;
  const d = new Date(ing.ingress_date.slice(0, 10));
  return d > new Date() && !isCurrentSun(ing);
}

// ── Row Component ─────────────────────────────────────────────────────────────

function IngressRow({
  ing,
  isCurrent,
  isNextRow,
}: {
  ing: PersonalIngress;
  isCurrent: boolean;
  isNextRow: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hc = HOUSE_COLOR[ing.natal_house] ?? 'text-white/50 border-white/20';
  const dateStr = formatIngressDate(ing.ingress_date);
  const narrative = INGRESS_HOUSE_NARRATIVE[ing.natal_house];

  return (
    <div className="space-y-0">
      <div
        className={`grid grid-cols-[2rem_3rem_1fr_3rem_1fr] items-center gap-2 px-3 py-2 text-sm transition-all ${
          narrative ? 'cursor-pointer' : ''
        } ${expanded ? 'rounded-t-lg' : 'rounded-lg'} ${
          isCurrent
            ? 'bg-amber-500/10 border border-amber-500/30'
            : isNextRow
            ? 'bg-sky-500/5 border border-sky-500/20'
            : 'border border-white/6 hover:bg-white/3'
        } ${expanded ? (isCurrent ? 'border-b-0' : isNextRow ? 'border-b-0' : 'border-b-0') : ''}`}
        onClick={() => narrative && setExpanded(v => !v)}
      >
        {/* Glyph */}
        <span className="text-base text-center">{SIGN_GLYPH[ing.sign] ?? '·'}</span>

        {/* Date */}
        <span className="text-white/50 text-xs text-center">{dateStr}</span>

        {/* Sign name */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-white/80 text-xs font-medium truncate">{ing.sign_ru}</span>
          {isCurrent && (
            <span className="text-[9px] text-amber-300 bg-amber-500/15 rounded-full px-1.5 py-px flex-shrink-0">
              сейчас
            </span>
          )}
          {isNextRow && (
            <span className="text-[9px] text-sky-300 bg-sky-500/15 rounded-full px-1.5 py-px flex-shrink-0">
              след.
            </span>
          )}
        </div>

        {/* House number */}
        <div className={`flex items-center justify-center text-xs font-bold border rounded-full w-7 h-7 flex-shrink-0 ${hc}`}>
          {ing.natal_house}
        </div>

        {/* Theme + expand hint */}
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[11px] text-white/35 truncate">{ing.activated_theme}</span>
          {narrative && (
            <span className="text-[9px] text-white/20 flex-shrink-0">{expanded ? '▲' : '▼'}</span>
          )}
        </div>
      </div>

      {expanded && narrative && (
        <div className={`px-3 py-2.5 rounded-b-lg border-x border-b text-xs text-white/65 leading-relaxed ${
          isCurrent
            ? 'border-amber-500/30 bg-amber-500/5'
            : isNextRow
            ? 'border-sky-500/20 bg-sky-500/5'
            : 'border-white/8 bg-white/3'
        }`}>
          {narrative}
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

export function IngressPersonalBlock({ birth, theme }: Props) {
  const [result, setResult] = useState<IngressPersonalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const load = useCallback(async () => {
    if (!birth.date) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await getIngressPersonal(birth, year));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [birth, year]);

  useEffect(() => { load(); }, [load]);

  const currentIngress = result?.ingresses.find(i => isCurrentSun(i)) ?? null;
  const firstFuture = result?.ingresses.find(
    i => i.ingress_date && new Date(i.ingress_date.slice(0, 10)) > new Date() && !isCurrentSun(i)
  ) ?? null;

  // Group by natal house for summary
  const houseGroups: Record<number, PersonalIngress[]> = {};
  result?.ingresses.forEach(ing => {
    houseGroups[ing.natal_house] ??= [];
    houseGroups[ing.natal_house].push(ing);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-xl border ${theme.card} p-4`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌠</span>
            <h2 className={`text-base font-bold font-serif ${theme.header}`}>
              Ингрессии Солнца в домах
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="text-xs bg-white/8 border border-white/15 rounded-lg px-2 py-1 text-white/70"
            >
              {[-1, 0, 1].map(delta => {
                const y = new Date().getFullYear() + delta;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
            <button
              onClick={load}
              disabled={loading}
              className={`text-xs px-3 py-1.5 rounded-lg ${theme.btn} disabled:opacity-50`}
            >
              {loading ? '…' : '↻'}
            </button>
          </div>
        </div>
        <p className={`text-xs ${theme.text} opacity-50 mt-2`}>
          Каждая ингрессия Солнца в знак активирует натальный дом примерно на 30 дней.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/8 p-4 text-red-300 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Loading */}
      {loading && !result && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-white/8 bg-white/3 h-10 animate-pulse" />
          ))}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Interpretation */}
          <div className={`rounded-xl border ${theme.card} p-3`}>
            <p className={`text-xs ${theme.text} opacity-55 leading-relaxed`}>
              {result.interpretation}
            </p>
          </div>

          {/* Header row */}
          <div className="grid grid-cols-[2rem_3rem_1fr_3rem_1fr] gap-2 px-3 text-[10px] text-white/25 uppercase tracking-wider">
            <span className="text-center">Знак</span>
            <span className="text-center">Дата</span>
            <span>Название</span>
            <span className="text-center">Дом</span>
            <span>Тема</span>
          </div>

          {/* Ingress rows */}
          <div className="space-y-1.5">
            {result.ingresses.map(ing => (
              <IngressRow
                key={ing.sign}
                ing={ing}
                isCurrent={isCurrentSun(ing)}
                isNextRow={ing === firstFuture && !isCurrentSun(ing)}
              />
            ))}
          </div>

          {/* House summary */}
          {Object.keys(houseGroups).length > 0 && (
            <div className={`rounded-xl border ${theme.card} p-3`}>
              <div className="text-[10px] text-white/30 mb-2 font-medium uppercase tracking-wider">
                Загруженность домов в {result.year} году
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(houseGroups)
                  .sort((a, b) => Number(b[1].length) - Number(a[1].length))
                  .map(([h, ings]) => {
                    const num = Number(h);
                    const hc = HOUSE_COLOR[num] ?? 'text-white/50 border-white/20';
                    return (
                      <div
                        key={h}
                        className={`flex items-center gap-1 text-[10px] border rounded-full px-2 py-0.5 ${hc}`}
                      >
                        <span className="font-bold">{h} дом</span>
                        <span className="text-white/35">×{ings.length}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !error && !result && (
        <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
          <span className="text-4xl block mb-3 opacity-40">🌠</span>
          <p className={`${theme.text} text-sm opacity-50`}>Введите данные рождения для анализа ингрессий</p>
        </div>
      )}
    </div>
  );
}

export default IngressPersonalBlock;
