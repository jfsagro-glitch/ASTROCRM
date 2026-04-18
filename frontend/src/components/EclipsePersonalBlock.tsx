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

// ── house narratives ──────────────────────────────────────────────────────────

const ECLIPSE_HOUSE_NARRATIVE: Record<string, Record<number, string>> = {
  solar: {
    1:  'Солнечное затмение в 1-м доме — это мощный сброс идентичности. Жизнь как будто спрашивает: «Ты всё ещё тот, кем себя считаешь?» Внешность, поведение, то как вас воспринимают окружающие — всё может сдвинуться. Это шанс начать главу «новый я» — не изменить себя, а наконец-то стать собой.',
    2:  'Затмение в 2-м доме затрагивает ресурсы, деньги и то, чем вы по-настоящему дорожите. Один источник дохода может закрыться — другой откроется. Главный вопрос не «где взять денег», а «что мне реально нужно для счастья». Часто уходит что-то материальное, но приходит ясность ценностей.',
    3:  'Затмение в 3-м доме перезапускает вашу речь, мышление и ближний круг. Важный разговор, который давно откладывали? Он случится сам. Брат, сосед, коллега — кто-то из этих людей сыграет неожиданно важную роль. Слова приобретают вес — что скажете сейчас, отзовётся долго.',
    4:  'Затмение в 4-м доме затрагивает самое глубокое — дом, семью, корни. Переезд, ремонт, разговор с родителями о том, что давно молчало. Возможно, меняется сама «база» — то место внутри, которое вы называете домом. Это болезненно, но после — ощущение более прочного фундамента.',
    5:  'Затмение в 5-м доме касается творчества, любви и детей. Роман вспыхивает или гасится — иногда оба сразу. Творческий проект, который жил в голове, требует воплощения прямо сейчас. Если есть дети — что-то в отношениях с ними меняется качественно. Жить только головой в этот период не получится.',
    6:  'Затмение в 6-м доме — сигнал пересмотреть отношения с телом и работой. Здоровье может напомнить о себе — не для того чтобы напугать, а чтобы вы наконец услышали. Рабочая рутина трещит по швам: либо место работы меняется, либо сами процессы. Это хорошее время навести порядок в ежедневном.',
    7:  'Солнечное затмение в 7-м доме — что-то в партнёрских отношениях требует обнуления. Либо важный союз начинается, либо старый дышит на ладан. Не торопи события — они развернутся сами в течение полугода. Одиночки нередко встречают человека, который меняет всё. Партнёрские контракты и договоры тоже в зоне внимания.',
    8:  'Затмение в 8-м доме погружает в тему трансформации, чужих ресурсов и того, что скрыто. Может всплыть информация, которую вы не ожидали. Долги, наследства, совместные финансы — здесь что-то меняется. Это также время встречи с собственной тенью: страхи, которые избегали, выходят на свет.',
    9:  'Затмение в 9-м доме расширяет горизонты — буквально или метафорически. Путешествие, учёба, смена мировоззрения. Убеждение, которое держало вас в рамках, может рассыпаться — и это подарок. Иностранные связи, издательство, юридические вопросы — всё это активизируется.',
    10: 'Затмение в 10-м доме затрагивает карьеру и публичный образ. Должность, репутация, отношения с начальством — всё это может резко измениться. Звучит страшно, но чаще это шанс занять место, о котором давно мечтали. Ваши достижения выходят на свет — или наоборот, мир видит то, что хотелось скрыть.',
    11: 'Затмение в 11-м доме перетряхивает круг общения и цели на будущее. Кто-то из друзей отдаляется — зато появляются люди, которые вас по-настоящему понимают. Мечта, которую считали несерьёзной, вдруг обретает форму. Коллективные проекты, сообщества, социальные сети — всё это в фокусе.',
    12: 'Затмение в 12-м доме самое тихое и самое глубокое. Что-то важное завершается — не громко, а внутри. Возможно, вы отпускаете что-то, что держали годами. Уединение, сны, интуиция — всё обостряется. Это время не для действий, а для слушания того, что говорит ваша глубина.',
  },
  lunar: {
    1:  'Лунное затмение в 1-м доме завершает цикл самоопределения. Вы вдруг отчётливо видите, каким были — и каким хотите быть. Эмоциональное переполнение возможно: старый образ себя уходит, новый ещё не устоялся. Дайте себе эту паузу — она целительна.',
    2:  'Лунное затмение во 2-м доме — эмоциональный итог вокруг денег и самооценки. Часто люди понимают, что гонялись не за тем. Либо наоборот — признают собственную ценность, которую занижали. Финансовые итоги полугода, отношения с имуществом — всё приходит к точке завершения.',
    3:  'Лунное затмение в 3-м доме — важный разговор завершается или получает итог. Недосказанное между вами и близкими людьми выходит наружу. Слова, которые давно стоило произнести — теперь или никогда. Поездка или встреча с братом/сестрой/соседом может стать поворотной.',
    4:  'Лунное затмение в 4-м доме завершает семейную главу. Это может быть смерть кого-то в роду, рождение ребёнка, продажа родового дома — что-то, что переопределяет «семью». Глубокие чувства к прошлому выходят на поверхность. Плакать — нормально. Это очищение.',
    5:  'Лунное затмение в 5-м доме завершает историю любви или творческий цикл. Отношения подходят к важной точке — либо к новому уровню, либо к расставанию. Творческий проект, который тянулся, получает финал. Дети могут преподнести сюрприз — радостный или тревожный.',
    6:  'Лунное затмение в 6-м доме — здоровье или работа подводят итог. Хроническая усталость, которую игнорировали, требует ответа. Или работа, которая давно изжила себя, наконец отпускает. Это хорошее время уйти на больничный — буквально и метафорически. Тело знает правду.',
    7:  'Лунное затмение в 7-м доме — кульминация в партнёрских отношениях. Отношения, которые тянулись на честном слове, либо укрепляются через кризис, либо завершаются. Бывает, что именно сейчас люди делают предложение руки и сердца — или говорят «больше не могу». Честность важнее комфорта.',
    8:  'Лунное затмение в 8-м доме — интенсивное и трансформирующее. Страхи смерти, близости, зависимости — всё, что прятали — выходит. Совместные деньги, долги, психологические паттерны из детства. Это не конец, это линька: старая кожа сходит, под ней — новая.',
    9:  'Лунное затмение в 9-м доме завершает философский цикл. Вера, убеждения, картина мира — что-то перестаёт работать. Это тревожно, но честно: вы выросли из старых ответов. Диплом, судебное дело, заграничная история — что-то подходит к финалу.',
    10: 'Лунное затмение в 10-м доме — публичная кульминация. Карьерная история завершается или резко меняется. Репутация в центре внимания. Возможно публичное признание — или разоблачение. В любом случае это поворотный момент в профессиональной жизни.',
    11: 'Лунное затмение в 11-м доме завершает главу в дружбе и социальной принадлежности. Группа, которой вы дорожили, меняется. Мечта, к которой шли долго, наконец осуществляется — или выясняется, что она была не ваша. Переосмысление своей роли в сообществе.',
    12: 'Лунное затмение в 12-м доме — самое глубинное из всех. Что-то, что было скрыто — тайна, болезнь, старая боль — выходит на свет. Это может быть страшно, но именно это освобождает. Духовный цикл завершается. Время простить — себя прежде всего.',
  },
};

function getEclipseNarrative(ecl: PersonalEclipse): string {
  const typeKey = ecl.type === 'solar' ? 'solar' : 'lunar';
  return ECLIPSE_HOUSE_NARRATIVE[typeKey]?.[ecl.natal_house] ?? '';
}

// ── Eclipse Card ─────────────────────────────────────────────────────────────

function EclipseCard({ ecl, isNext }: { ecl: PersonalEclipse; isNext: boolean }) {
  const [expanded, setExpanded] = useState(false);
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

      {/* Narrative */}
      {getEclipseNarrative(ecl) && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-[10px] text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
          >
            {expanded ? '▲ свернуть' : '▼ читать интерпретацию'}
          </button>
          {expanded && (
            <p className="mt-2 text-xs text-white/60 leading-relaxed border-t border-white/8 pt-2">
              {getEclipseNarrative(ecl)}
            </p>
          )}
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
