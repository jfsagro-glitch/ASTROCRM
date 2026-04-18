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

const PROFECTION_HOUSE_NARRATIVE: Record<number, string> = {
  1:  'Год 1-го дома — год о вас. Буквально. Ваше тело, ваш образ, ваш старт. Энергия направлена внутрь и одновременно наружу — в мир. Люди замечают вас больше, чем обычно. Хорошее время для смены имиджа, начала нового проекта или просто — чтобы наконец поставить себя первым.',
  2:  'Год 2-го дома — год ресурсов и ценностей. Деньги, имущество, таланты — всё это в центре внимания. Финансовые вопросы требуют решения. Но главный вопрос года — что я по-настоящему ценю? Ответ на него важнее любых цифр на счету.',
  3:  'Год 3-го дома — год слов, связей и ближнего окружения. Учёба, курсы, переписка, поездки на короткие расстояния — всё это активно. Братья, сёстры, соседи, коллеги — кто-то из них сыграет важную роль. Пишите, говорите, думайте — мысль этого года материальна.',
  4:  'Год 4-го дома — год дома и корней. Недвижимость, переезды, ремонт, семья. Отношения с родителями выходят на новый уровень — иногда буквально через их уход. Год хочет, чтобы вы нашли своё место — внешнее и внутреннее.',
  5:  'Год 5-го дома — год радости, любви и творчества. Роман, вдохновение, дети — всё это живёт ярко. Не время для осторожности: жизнь зовёт играть и рисковать. Творческий проект, который откладывали — сейчас его время. Отношения с детьми становятся насыщеннее.',
  6:  'Год 6-го дома — год здоровья и ежедневного труда. Тело хочет внимания — дайте ему. Рабочая рутина меняется или перестраивается. Год полезнее всего провести в дисциплине: питание, режим, порядок в делах. Маленькие привычки дают большие результаты.',
  7:  'Год 7-го дома — год партнёрств. Важные союзы создаются или переосмысляются. Брак, деловое партнёрство, открытые враги — всё это активно. Вы смотрите на мир через зеркало другого человека. Год учит договариваться и видеть чужую правду.',
  8:  'Год 8-го дома — год трансформации. Глубокий, иногда тяжёлый, всегда меняющий. Чужие деньги, наследства, кредиты, психологические паттерны. Страхи выходят на поверхность — не чтобы навредить, а чтобы вы с ними разобрались. Год требует честности с собой.',
  9:  'Год 9-го дома — год расширения. Путешествия, образование, философия, вера. Мир становится больше — или вы сами становитесь больше. Иностранные связи, издательство, юридические дела. Убеждение, которое сдерживало, может рассыпаться — освобождая пространство для нового.',
  10: 'Год 10-го дома — год карьеры и репутации. Профессиональные достижения становятся публичными. Начальство, государство, общественное признание — всё это активно. Год амбиций: если вы готовы взять ответственность — жизнь это поощряет. Имя делается в этот год.',
  11: 'Год 11-го дома — год дружбы и мечты. Социальный круг расширяется, коллективные проекты набирают силу. Мечта, которую держали в голове — она реальнее, чем кажется. Год говорит: объединяйтесь с единомышленниками. Вместе получится то, что поодиночке — нет.',
  12: 'Год 12-го дома — год уединения и завершений. Что-то важное заканчивается — тихо, без фанфар. Это год сниженной видимости: лучше работать за кулисами, чем на сцене. Духовная практика, психотерапия, уединение — всё это даёт плоды. Доверяйте снам и интуиции.',
};

const PROFECTION_LORD_NARRATIVE: Record<string, string> = {
  sun:     'Лорд года — Солнце. Это год солнечных тем: самовыражение, отцовская линия, власть и творчество. Вы в центре. Всё, что имеет отношение к вашей идентичности и достоинству — активно. Натальный Дом Солнца удвоит интенсивность.',
  moon:    'Лорд года — Луна. Эмоциональный, насыщенный, иногда нестабильный год. Семья, дом, женщины в вашей жизни — всё активизируется. Интуиция обострена. Тело реагирует на стресс острее обычного. Следуйте ритмам, не сопротивляйтесь волнам.',
  mercury: 'Лорд года — Меркурий. Год слов, документов, решений и переговоров. Обучение, поездки, братья и сёстры. Голова работает на полную мощность. Остерегайтесь информационной перегрузки. Пишите, записывайте, общайтесь — этот год щедр на полезные контакты.',
  venus:   'Лорд года — Венера. Год красоты, любви и удовольствия — если вы открыты. Отношения, деньги, искусство, эстетика. Год располагает к партнёрству — как романтическому, так и деловому. Натальный Дом Венеры покажет, где именно придёт радость.',
  mars:    'Лорд года — Марс. Год действий, конкуренции и воли. Вы деятельны, может быть вспыльчивы. Физическая активность необходима. Конфликты неизбежны — важно выбирать битвы. Натальный Дом Марса покажет, где придётся сражаться и побеждать.',
  jupiter: 'Лорд года — Юпитер. Один из лучших лордов года. Расширение, удача, обилие. Возможности приходят — нужно только не упустить. Путешествия, образование, оптимизм. Натальный Дом Юпитера — место, где год будет особенно щедрым.',
  saturn:  'Лорд года — Сатурн. Строгий, требовательный лорд. Год дисциплины, ответственности и долгосрочного строительства. Лёгких путей не будет, но всё, что построите — останется надолго. Натальный Дом Сатурна покажет, где придётся работать усерднее всего.',
  uranus:  'Лорд года — Уран. Год неожиданных поворотов и освобождения от старого. Нестабильность — это не враг, это инструмент перемен. Технологии, новаторство, разрыв с традицией. Готовьтесь к тому, что планы будут меняться — и это нормально.',
  neptune: 'Лорд года — Нептун. Год тонкий, мистический, иногда туманный. Интуиция на высоте, но реальность может ускользать. Искусство, духовность, психология — ваши союзники. Берегитесь иллюзий в финансовых и партнёрских делах.',
  pluto:   'Лорд года — Плутон. Год глубокой трансформации. Что-то умрёт — что-то родится. Власть, контроль, секреты — всё это выходит на поверхность. Интенсивно, иногда болезненно, но после — другой человек. Принимайте изменения, не цепляйтесь за старое.',
  node:    'Лорд года — Северный Узел. Год кармического движения вперёд. Жизнь подталкивает к росту, выходу из зоны комфорта. То, что страшно — именно туда и надо. Год указывает на ваш путь развития.',
  lilith:  'Лорд года — Лилит. Год встречи с тёмной стороной своей природы — и примирения с ней. Всё, что подавляли, выходит. Год требует честности с собой о своих желаниях и страхах. Мощный, освобождающий — если не бежать.',
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

          {/* Rich narrative */}
          <div className={`rounded-xl border ${theme.card} p-4 space-y-3`}>
            {PROFECTION_HOUSE_NARRATIVE[data.annual_house] && (
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-wider opacity-50 mb-1.5 ${theme.text}`}>
                  🏠 Тема года
                </p>
                <p className={`text-sm leading-relaxed ${theme.text}`}>
                  {PROFECTION_HOUSE_NARRATIVE[data.annual_house]}
                </p>
              </div>
            )}
            {PROFECTION_LORD_NARRATIVE[data.annual_lord] && (
              <div className="border-t border-white/8 pt-3">
                <p className={`text-[10px] font-semibold uppercase tracking-wider opacity-50 mb-1.5 ${theme.text}`}>
                  ⚡ Лорд года
                </p>
                <p className={`text-sm leading-relaxed ${theme.text}`}>
                  {PROFECTION_LORD_NARRATIVE[data.annual_lord]}
                </p>
              </div>
            )}
            {data.interpretation && (
              <div className="border-t border-white/8 pt-3">
                <p className={`text-[10px] font-semibold uppercase tracking-wider opacity-50 mb-1.5 ${theme.text}`}>
                  📋 Расчётная сводка
                </p>
                <p className={`text-sm leading-relaxed opacity-60 ${theme.text}`}>{data.interpretation}</p>
              </div>
            )}
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
