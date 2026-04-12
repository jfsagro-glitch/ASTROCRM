/**
 * LifeSphereReports.tsx — v2
 * Отчёты по сферам в методе Павла Андреева.
 * Конкретика, факты, без воды.
 */

import React, { useState, useMemo } from 'react';
import type { NatalChart } from '../types/astro';

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  chart: NatalChart;
  name?: string;
  theme: 'dark' | 'light';
  birthDate?: string; // YYYY-MM-DD
}

type SphereKey = 'finance' | 'health' | 'career' | 'energy' | 'plan';

// ─── Constants ────────────────────────────────────────────────────────────────
const SRU: Record<string, string> = {
  aries:'Овен', taurus:'Телец', gemini:'Близнецы', cancer:'Рак', leo:'Лев',
  virgo:'Дева', libra:'Весы', scorpio:'Скорпион', sagittarius:'Стрелец',
  capricorn:'Козерог', aquarius:'Водолей', pisces:'Рыбы',
};
const PCOLOR: Record<string, string> = {
  sun:'#d4a853', moon:'#9ab5d4', mercury:'#88c4a8', venus:'#d48aaa', mars:'#d45b5b',
  jupiter:'#d4a04a', saturn:'#8899bb', uranus:'#5bbbcc', neptune:'#7788dd',
  pluto:'#bb77aa', node:'#ccaa44', chiron:'#66aabb', lilith:'#9966aa',
};
const PRU: Record<string, string> = {
  sun:'Солнце', moon:'Луна', mercury:'Меркурий', venus:'Венера', mars:'Марс',
  jupiter:'Юпитер', saturn:'Сатурн', uranus:'Уран', neptune:'Нептун',
  pluto:'Плутон', node:'С.Узел', chiron:'Хирон', lilith:'Лилит',
};
const PGLYPH: Record<string, string> = {
  sun:'☉', moon:'☽', mercury:'☿', venus:'♀', mars:'♂', jupiter:'♃',
  saturn:'♄', uranus:'⛢', neptune:'♆', pluto:'♇', node:'☊', chiron:'⚷', lilith:'⚸',
};
const HRU: Record<number, string> = {
  1:'Личность', 2:'Ресурс', 3:'Коммуникации', 4:'Дом/Род', 5:'Творчество',
  6:'Труд/Тело', 7:'Партнёр', 8:'Трансформация', 9:'Экспансия', 10:'Статус/Карьера',
  11:'Сообщество', 12:'Скрытое',
};
// Modern rulers
const RULER: Record<string, string> = {
  aries:'mars', taurus:'venus', gemini:'mercury', cancer:'moon', leo:'sun',
  virgo:'mercury', libra:'venus', scorpio:'pluto', sagittarius:'jupiter',
  capricorn:'saturn', aquarius:'uranus', pisces:'neptune',
};
const ELEMENT: Record<string, string> = {
  aries:'Огонь', taurus:'Земля', gemini:'Воздух', cancer:'Вода', leo:'Огонь',
  virgo:'Земля', libra:'Воздух', scorpio:'Вода', sagittarius:'Огонь',
  capricorn:'Земля', aquarius:'Воздух', pisces:'Вода',
};
const BODY: Record<string, { zones: string; note: string }> = {
  aries:       { zones: 'Голова, сосуды мозга', note: 'Мигрени, сосудистые реакции, риск перегрева. Избегайте перегрузок головы.' },
  taurus:      { zones: 'Горло, щитовидка, шея', note: 'Голос и гормональный баланс — чувствительные точки. Следите за щитовидной железой.' },
  gemini:      { zones: 'Лёгкие, нервная система, руки', note: 'Нервное истощение при информационной перегрузке. Бронхи, туннельный синдром запястья.' },
  cancer:      { zones: 'Желудок, грудная клетка, лимфа', note: 'ЖКТ реагирует на эмоциональный фон. Психосоматика — через стресс в желудок.' },
  leo:         { zones: 'Сердце, позвоночник, спина', note: 'Сердечно-сосудистая нагрузка при перенапряжении. Поясница — при сидячей работе.' },
  virgo:       { zones: 'Кишечник, поджелудочная', note: 'Чувствительное пищеварение, склонность к тревожным расстройствам. Режим питания критичен.' },
  libra:       { zones: 'Почки, поясница, кожа', note: 'Почечные реакции на дисбаланс и конфликты. Водный баланс важен.' },
  scorpio:     { zones: 'Репродуктивная система, детокс', note: 'Гормональные циклы, интоксикации. Регулярный детокс и работа со стрессом — необходимость.' },
  sagittarius: { zones: 'Печень, бёдра, седалищный нерв', note: 'Печень и ишиас — зоны контроля. Умеренность в еде и алкоголе.' },
  capricorn:   { zones: 'Кости, суставы, кожа, зубы', note: 'Хронические суставные и костные проблемы при перегрузке. Профилактика важнее лечения.' },
  aquarius:    { zones: 'Голени, кровообращение, нервы', note: 'Спазмы сосудов, нервные тики. Движение и дыхательные практики — ежедневно.' },
  pisces:      { zones: 'Стопы, иммунитет, лимфа', note: 'Чувствительность к токсинам и алкоголю. Открытые границы = накапливание чужого стресса.' },
};

// ─── House key helpers (API uses h1..h12) ─────────────────────────────────────
function hSign(chart: NatalChart, n: number): string | null {
  return (chart.houses as Record<string, { sign?: string }>)[`h${n}`]?.sign ?? null;
}
function hRuler(chart: NatalChart, n: number): string | null {
  const s = hSign(chart, n);
  return s ? (RULER[s] ?? null) : null;
}
function planetsIn(chart: NatalChart, n: number): Array<{ name: string; sign: string; house: number; retrograde: boolean }> {
  return Object.entries(chart.planets)
    .filter(([, p]) => p.house === n)
    .map(([name, p]) => ({ name, sign: p.sign, house: p.house, retrograde: p.retrograde }));
}
function dignity(chart: NatalChart, p: string): string | null {
  return chart.dignities?.[p]?.dignity ?? null;
}
function isStrong(dg: string | null): boolean { return dg === 'domicile' || dg === 'exaltation'; }
function isWeak(dg: string | null): boolean   { return dg === 'detriment' || dg === 'fall'; }
function dgBadge(dg: string | null): string {
  if (dg === 'domicile') return ' ⭐';
  if (dg === 'exaltation') return ' ↑';
  if (dg === 'detriment') return ' ↓';
  if (dg === 'fall') return ' ⬇';
  return '';
}
function sRu(s: string | null | undefined): string { return s ? (SRU[s] ?? s) : '—'; }
function pLabel(name: string, sign: string | null, house: number, retro: boolean, chart: NatalChart): string {
  const dg = dignity(chart, name);
  return `${PGLYPH[name] ?? ''} ${PRU[name] ?? name} ${sRu(sign)} · ${house}H${retro ? ' Rx' : ''}${dgBadge(dg)}`;
}
function tightAspects(chart: NatalChart, pName: string, maxOrb = 3) {
  return (chart.aspects ?? [])
    .filter(a => (a.p1 === pName || a.p2 === pName) && a.orb <= maxOrb)
    .slice(0, 3);
}
function aspectTone(type: string): 'good' | 'tense' | 'neutral' {
  if (['trine','sextile'].includes(type)) return 'good';
  if (['square','opposition','quincunx'].includes(type)) return 'tense';
  return 'neutral';
}
const ASPECT_RU: Record<string, string> = {
  conjunction:'☌ соед', trine:'△ трин', sextile:'⚹ секс', square:'□ кв',
  opposition:'☍ оппоз', quincunx:'⬡ квинк',
};

// ─── Age helpers ──────────────────────────────────────────────────────────────
function calcAge(birthDate?: string): number {
  if (!birthDate) return 35;
  const parts = birthDate.split('-');
  if (parts.length !== 3) return 35;
  const birth = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (isNaN(birth.getTime())) return 35;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--;
  return age;
}

function saturnPhase(age: number) {
  const P = 29.5;
  const cycleNum = Math.floor(age / P) + 1;
  const yr = age % P;
  const prev = Math.round(Math.floor(age / P) * P);
  const next = Math.round(prev + P);
  type Phase = { label: string; desc: string; color: string };
  const phases: Phase[] = cycleNum === 1
    ? [
        { label: 'Становление (0–7 цикла)', color: '#34d399',
          desc: 'Закладывается психологический и социальный фундамент. Паттерны этого периода определяют базовые стратегии.' },
        { label: 'Первое освоение (7–14)', color: '#60a5fa',
          desc: 'Первые серьёзные социальные роли, испытание своих сил реальностью.' },
        { label: 'Кризис выбора (14–21)', color: '#f59e0b',
          desc: 'Столкновение с ограничениями, первый серьёзный выбор направления жизни.' },
        { label: 'Строительство взрослости (21–29)', color: '#a78bfa',
          desc: 'Первое самостоятельное строительство карьеры, отношений, статуса. Подготовка к возврату Сатурна.' },
      ]
    : cycleNum === 2
    ? [
        { label: 'Перезапуск после 1-го возврата', color: '#34d399',
          desc: 'Жизнь перестроена с нуля на осознанном фундаменте. Период быстрого нового строительства.' },
        { label: 'Профессиональный расцвет (36–43)', color: '#60a5fa',
          desc: 'Максимальная продуктивность и влияние. Компетентность доказана, статус растёт.' },
        { label: 'Переоценка зрелости (43–51)', color: '#f59e0b',
          desc: 'Совпадает с оппозицией Урана (~42) и приближением Хирон-возврата (~50). Глубокий внутренний сдвиг: зачем и для кого я это делаю?' },
        { label: 'Итоги 2-го цикла (51–59)', color: '#a78bfa',
          desc: 'Оформление репутации, передача опыта, подготовка к 2-му возврату Сатурна.' },
      ]
    : [
        { label: 'После 2-го возврата', color: '#c084fc',
          desc: 'Освобождение от социальных масок. Аутентичная роль, мудрость, наследие.' },
        { label: 'Мудрость', color: '#c084fc', desc: 'Передача накопленного. Внутренняя свобода.' },
        { label: 'Мудрость', color: '#c084fc', desc: 'Передача накопленного. Внутренняя свобода.' },
        { label: 'Мудрость', color: '#c084fc', desc: 'Передача накопленного. Внутренняя свобода.' },
      ];
  const idx = yr < 7 ? 0 : yr < 14 ? 1 : yr < 21 ? 2 : 3;
  const ph = phases[idx];
  return { ...ph, cycleNum, yr: Math.floor(yr), prev, next };
}

function jupiterPhase(age: number) {
  const yr = age % 12;
  if (yr < 2)   return { label: 'Новый цикл (удача)', color: '#fbbf24', desc: 'Юпитер вернулся на ваш Юпитер. Открываются новые возможности и двери.' };
  if (yr < 4)   return { label: 'Рост', color: '#34d399', desc: 'Начала цикла приносят первые плоды. Хорошее время для расширения.' };
  if (yr < 6)   return { label: 'Коррекция', color: '#f59e0b', desc: 'Нужно скорректировать стратегию. Квадрат Юпитера ставит вопросы.' };
  if (yr < 8)   return { label: 'Кульминация', color: '#818cf8', desc: 'Оппозиция Юпитера — пик видимости и результатов. Максимум отдачи от начатого 6 лет назад.' };
  if (yr < 10)  return { label: 'Пожинание', color: '#60a5fa', desc: 'Собираете урожай. Период признания и получения заслуженного.' };
  return { label: 'Завершение цикла', color: '#94a3b8', desc: 'Отпустить отжившее, приготовиться к новому 12-летнему циклу.' };
}

// ─── Interpretation knowledge base ───────────────────────────────────────────

// 2H ruler by house — откуда деньги
const MONEY_FROM_HOUSE: Record<number, string> = {
  1:  'Личный бренд и прямые продажи себя. Деньги = ваша узнаваемость и энергия присутствия.',
  2:  'Собственные активы и инвестиции. Деньги делают деньги — пассивный доход реален.',
  3:  'Слово, информация, посредничество. Тексты, курсы, агентские схемы в ближнем окружении.',
  4:  'Недвижимость, семейный бизнес, работа из дома. Родина и корни как источник.',
  5:  'Творчество, развлечения, коучинг, смелые ставки на себя как продукт.',
  6:  'Наёмный труд и сервисный бизнес. Деньги — обмен рабочего времени на качество.',
  7:  'Партнёрства. Каждый значимый деловой партнёр прямо влияет на доход.',
  8:  'Инвестиции, чужие деньги, кризис-менеджмент, трансформационные услуги или наследство.',
  9:  'Экспертиза, преподавание, международный рынок, издательство и публичная философия.',
  10: 'Карьера и репутация — ваша главная финансовая валюта. Статус = доход.',
  11: 'Сети, платформы, подписки, коллективные проекты и технологии.',
  12: 'Скрытый труд: исследования, психологические или духовные услуги, работа за кулисами.',
};

// Planets in 2H — прямые модификаторы
const PLANET_IN_2H: Record<string, string> = {
  sun:     'Самооценка = зарплата напрямую. Получаете столько, сколько себя цените в моменте. Деньги через личный авторитет и узнаваемость.',
  moon:    'Доход циклически колышется. Интуиция на рынок и запросы аудитории — сильная. Работа с женской аудиторией или в сфере заботы/питания — денежный канал.',
  mercury: 'Несколько источников дохода одновременно — норма. Деньги через информацию, переговоры, посредничество.',
  venus:   'Деньги приходят с относительной лёгкостью через сферу красоты, удовольствия, эстетики. Склонность к импульсивным тратам.',
  mars:    'Агрессивное зарабатывание: быстро зарабатывает — быстро тратит. Конкурентная среда, предпринимательство, скорость.',
  jupiter: 'Один из самых сильных финансовых показателей. Деньги расширяются. Риск — переоценить возможности и перерасходовать.',
  saturn:  'Медленный, но надёжный финансовый рост. После 35–38 — финансовая стабилизация. До этого — ограничения и дисциплина.',
  uranus:  'Нестабильные, нестандартные источники: IT, стартапы, фриланс. Скачки вверх и вниз.',
  neptune: 'Деньги сквозь пальцы — не потому что мало зарабатывает, а потому что сложно удержать: идеализм в оценке своего труда, склонность к щедрости без расчёта, риск обмана. Поток открывается через творчество, духовные практики или работу с воображением.',
  pluto:   'Трансформации в деньгах: потеря и восстановление капитала — неоднократно. Потенциал крупных денег через кризисные отрасли или инвестиции.',
  chiron:  'Рана самоценности. Пока не принята — деньги уходят. После проработки — открывается мощный финансовый поток через помощь другим в этой же теме.',
};

// MC sign — профессиональный архетип
const MC_ARCHETYPE: Record<string, string> = {
  aries:       'Архетип первопроходца. Карьера через инициативу, запуск нового, конкуренцию. Предпринимательство, спорт, кризис-менеджмент, военное дело.',
  taurus:      'Архетип строителя ценностей. Репутация через надёжность и долгосрочное качество. Финансы, искусство, архитектура, сельское хозяйство, luxury.',
  gemini:      'Архетип коммуникатора. Незаменимы там, где нужно говорить, писать, координировать. Несколько ролей одновременно — норма. Медиа, IT, торговля, образование.',
  cancer:      'Архетип хранителя. Профессиональная сила — эмпатия и создание безопасной среды. Медицина, психология, недвижимость, кулинария, семейный бизнес.',
  leo:         'Архетип лидера и творца. Рождены быть видимыми. Карьера требует сцены. Шоу-бизнес, управление, политика, образование, медиа.',
  virgo:       'Архетип аналитика и мастера. Репутация строится на безупречной точности работы. Медицина, наука, финансовый анализ, редактура, здоровье.',
  libra:       'Архетип дипломата и эстета. Деньги и статус через партнёрства и баланс. Право, дизайн, PR, медиация, психология отношений.',
  scorpio:     'Архетип трансформатора. Работают там, куда другие боятся зайти: глубинная психология, хирургия, кризис-менеджмент, финансы, детективная работа.',
  sagittarius: 'Архетип эксперта с горизонтом. Международный масштаб, высшее образование, право, религия, туризм. Репутация через мудрость и экспансию.',
  capricorn:   'Архетип руководителя. Рождены для иерархии — и оказываются на её вершине со временем. Государственная служба, строительство, управление.',
  aquarius:    'Архетип реформатора. Меняют системы, создают будущее. IT, наука, НКО, электронные технологии, социальные инновации.',
  pisces:      'Архетип целителя и художника. Искусство, духовные практики, кино, психотерапия, социальная работа. Репутация через сострадание и вдохновение.',
};

// MC ruler by house — откуда приходит карьерный успех
const CAREER_FROM_HOUSE: Record<number, string> = {
  1:  'Успех через личный бренд — вы сами и есть бизнес. Всё строится вокруг вашей персоны.',
  2:  'Карьера через управление ресурсами — финансы, активы, собственное мастерство как капитал.',
  3:  'Успех через коммуникации, репутацию в ближнем кругу, тексты, обучение.',
  4:  'Карьера от корней — семейный бизнес, недвижимость, работа из дома или в родном городе.',
  5:  'Успех через творчество, шоу, коучинг, дети, смелость себя проявить.',
  6:  'Карьера через безупречное ежедневное исполнение. Репутация = качество работы.',
  7:  'Успех через партнёров. Правильный человек рядом — катализатор карьеры.',
  8:  'Карьера через трансформацию — чужих, ситуаций, финансовых потоков. Психология, инвестиции.',
  9:  'Успех через экспертизу и публичную мудрость. Преподавание, международная аудитория.',
  10: 'Карьера как основная тема жизни. Управитель MC в 10-м — сверхконцентрация на профессиональной реализации.',
  11: 'Успех через сети и аудиторию. Платформа, сообщество, технологии, коллективные цели.',
  12: 'Карьера через скрытый труд — исследование, духовная практика, работа за кулисами.',
};

// Sun in sign — энергетический профиль
const SUN_ENERGY_PROFILE: Record<string, { charge: string; drain: string; restore: string }> = {
  aries:       { charge:'Новые проекты, соревнование, первопроходство', drain:'Рутина и ожидание', restore:'Физическая нагрузка, новый вызов' },
  taurus:      { charge:'Сенсорное удовольствие, медленный созидательный труд', drain:'Форс-мажор и спешка', restore:'Природа, вкусная еда, тишина' },
  gemini:      { charge:'Новые идеи, разнообразие, общение', drain:'Монотонность и изоляция', restore:'Смена деятельности, чтение, разговоры' },
  cancer:      { charge:'Близкие, дом, эмоциональная безопасность', drain:'Конфликты, чужие проблемы', restore:'Уединение дома, вода, близкие люди' },
  leo:         { charge:'Признание, сцена, творческая самореализация', drain:'Игнорирование, рутинный труд без аплодисментов', restore:'Творчество, игра, восхищение' },
  virgo:       { charge:'Порядок, чёткая задача, ощутимый результат', drain:'Хаос, неопределённость, критика без конструктива', restore:'Режим, уединение, чистота' },
  libra:       { charge:'Гармоничная среда, красота, равноправный диалог', drain:'Конфликты, несправедливость', restore:'Красивое пространство, музыка, общение 1-на-1' },
  scorpio:     { charge:'Глубина, трансформация, власть над ситуацией', drain:'Поверхностность, ложь, потеря контроля', restore:'Уединение, вода, интенсивные практики' },
  sagittarius: { charge:'Путешествия, новые горизонты, большая идея', drain:'Клетка обязательств без смысла', restore:'Движение, природа, философия' },
  capricorn:   { charge:'Конкретная цель с измеримым результатом', drain:'Хаотичная трата времени и ресурсов', restore:'Структурированный отдых, природа, сон' },
  aquarius:    { charge:'Нестандартная задача, единомышленники, будущее', drain:'Принуждение к конформизму', restore:'Одиночество, необычные занятия, технологии' },
  pisces:      { charge:'Творчество, духовная практика, помощь', drain:'Чужой стресс, токсичная среда', restore:'Вода, музыка, медитация, тишина' },
};

// Mars in sign — физическая воля
const MARS_PROFILE: Record<string, string> = {
  aries:       'В домициле. Воля прямая, немедленная, без полутонов. Инициатива — рефлекс. Риск — сжигает себя быстрее, чем задуманное выполнено.',
  taurus:      'Медленный старт, но нерушимое упорство. Не отступит никогда. Эффективен в долгих кампаниях, слабее в спринте.',
  gemini:      'Воля через слово и скорость мысли. Несколько фронтов одновременно. Сильнее в переговорах, чем в прямом противостоянии.',
  cancer:      'Воля активируется через защиту близких и своей территории. Прямой конфликт — не ваш инструмент; косвенные стратегии работают лучше. Иммунная система реагирует на эмоциональный стресс физическими симптомами.',
  leo:         'Воля с достоинством и огнём. Конкуренция — топливо. Нужна сцена. Ослабевает без признания.',
  virgo:       'Точная, методичная, неустанная работа. Мощь в деталях и улучшении процессов. Критикует себя жёстче других.',
  libra:       'Воля через переговоры, эстетику и компромисс. Сильнее в дипломатии, чем в прямом противостоянии.',
  scorpio:     'В домициле. Стратегическая, терпеливая, неотвратимая воля. Умеет ждать нужного момента. Полное погружение или полный выход.',
  sagittarius: 'Воля через экспансию и веру в идею. Энергия мощная, но рассеивается при потере смысла.',
  capricorn:   'В экзальтации. Дисциплинированная, долгосрочная, строит. Умеет откладывать вознаграждение ради результата.',
  aquarius:    'Революционная воля. Эффективен в коллективных, нестандартных задачах. Личный конфликт — не его формат.',
  pisces:      'Воля тонкая, интуитивная, через образ и растворение. Сила — в творчестве, сострадании, духовной практике. Прямое давление — невыносимо.',
};

// ASC ruler by house — как тело связано с жизнедеятельностью
const ASC_RULER_HOUSE: Record<number, string> = {
  1:  'Управитель АСЦ в 1-м: конституция подчёркнута — тело — главный инструмент. Самочувствие = производительность.',
  2:  'Управитель АСЦ в 2-м: здоровье связано с финансовым состоянием и едой. Ресурс тела = ресурс денег.',
  3:  'Управитель АСЦ в 3-м: нервная система — главная уязвимость. Информационная перегрузка = физические симптомы.',
  4:  'Управитель АСЦ в 4-м: тело реагирует на домашнюю/семейную атмосферу. Уют дома = здоровье.',
  5:  'Управитель АСЦ в 5-м: тело расцветает при творчестве и радости. Депрессия физически проявляется.',
  6:  'Управитель АСЦ в 6-м: здоровье напрямую связано с рабочим режимом. Дисциплина тела = успех.',
  7:  'Управитель АСЦ в 7-м: партнёрские отношения влияют на здоровье сильнее всего. Конфликты — болезни.',
  8:  'Управитель АСЦ в 8-м: регенеративный потенциал высокий. Организм трансформируется через кризисы.',
  9:  'Управитель АСЦ в 9-м: здоровье поддерживается движением, путешествиями, философией жизни.',
  10: 'Управитель АСЦ в 10-м: статус и карьера напрямую влияют на самочувствие. Провалы в карьере = болезни.',
  11: 'Управитель АСЦ в 11-м: социальная среда влияет на здоровье. Единомышленники = иммунитет.',
  12: 'Управитель АСЦ в 12-м: скрытые хронические процессы. Симптомы появляются поздно — важна профилактика.',
};

// ─── UI components ────────────────────────────────────────────────────────────
function VerdictBanner({ text, tone, isDark }: {
  text: string; tone: 'strong' | 'mixed' | 'challenging'; isDark: boolean;
}) {
  const colors = { strong: '#22c55e', mixed: '#f59e0b', challenging: '#f87171' };
  const bgs = { strong: 'rgba(34,197,94,0.08)', mixed: 'rgba(245,158,11,0.08)', challenging: 'rgba(248,113,113,0.08)' };
  const c = colors[tone];
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 10, marginBottom: 18,
      background: bgs[tone], border: `1px solid ${c}44`,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <span style={{ fontSize: 16, marginTop: 1 }}>
        {tone === 'strong' ? '✦' : tone === 'mixed' ? '◈' : '⚠'}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: c, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function FactCard({ icon, title, text, accent = '#818cf8', isDark, highlight }: {
  icon: string; title: string; text: string; accent?: string;
  isDark: boolean; highlight?: string;
}) {
  return (
    <div style={{
      marginBottom: 12, borderRadius: 10, overflow: 'hidden',
      border: `1px solid ${accent}2a`,
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
        borderBottom: `1px solid ${accent}1a`,
        background: `${accent}0d`,
      }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: accent }}>{title}</span>
      </div>
      <div style={{ padding: '10px 14px' }}>
        <p style={{ margin: 0, fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.65 }}>{text}</p>
        {highlight && (
          <div style={{
            marginTop: 8, padding: '6px 10px', borderRadius: 6,
            background: `${accent}14`, borderLeft: `3px solid ${accent}`,
            fontSize: 12, color: accent, lineHeight: 1.5,
          }}>{highlight}</div>
        )}
      </div>
    </div>
  );
}

function AspectChips({ chart, planetName, isDark }: {
  chart: NatalChart; planetName: string; isDark: boolean;
}) {
  const aspects = tightAspects(chart, planetName, 3);
  if (!aspects.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {aspects.map((a, i) => {
        const other = a.p1 === planetName ? a.p2 : a.p1;
        const tone = aspectTone(a.aspect);
        const color = tone === 'good' ? '#22c55e' : tone === 'tense' ? '#f87171' : '#fbbf24';
        return (
          <span key={i} style={{
            padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
            background: `${color}1a`, color, border: `1px solid ${color}33`,
          }}>
            {ASPECT_RU[a.aspect] ?? a.aspect} {PGLYPH[other] ?? ''}{PRU[other] ?? other} {a.orb.toFixed(1)}°
          </span>
        );
      })}
    </div>
  );
}

function ActionList({ items, accent, isDark }: {
  items: string[]; accent: string; isDark: boolean;
}) {
  return (
    <div style={{
      marginTop: 4, borderRadius: 10,
      border: `1px solid ${accent}2a`,
      background: `${accent}0a`,
      padding: '12px 14px',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: accent, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Что делать
      </div>
      {items.map((it, i) => (
        <div key={i} style={{
          display: 'flex', gap: 8, marginBottom: 8, fontSize: 13,
          color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.5,
          alignItems: 'flex-start',
        }}>
          <span style={{ color: accent, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>→</span>
          <span>{it}</span>
        </div>
      ))}
    </div>
  );
}

function PlanetBadge({ name, sign, house, retro, chart }: {
  name: string; sign: string; house: number; retro: boolean; chart: NatalChart;
}) {
  const dg = dignity(chart, name);
  const c = PCOLOR[name] ?? '#94a3b8';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: `${c}1a`, color: c, border: `1px solid ${c}33`,
    }}>
      {PGLYPH[name]} {PRU[name]} {sRu(sign)} · {house}H{retro ? ' Rx' : ''}{dgBadge(dg)}
    </span>
  );
}

// ─── FINANCE ─────────────────────────────────────────────────────────────────
function FinanceSphere({ chart, isDark }: { chart: NatalChart; isDark: boolean }) {
  const ac = '#d4a853';
  const h2s = hSign(chart, 2);
  const h2r = hRuler(chart, 2);
  const h2rP = h2r ? chart.planets[h2r] : null;
  const h8s = hSign(chart, 8);
  const h8r = hRuler(chart, 8);
  const h8rP = h8r ? chart.planets[h8r] : null;
  const inH2 = planetsIn(chart, 2);
  const inH8 = planetsIn(chart, 8);
  const jup = chart.planets.jupiter;
  const ven = chart.planets.venus;
  const pof = chart.arabic_parts?.fortune;

  const h2rDg = h2r ? dignity(chart, h2r) : null;
  const tone: 'strong' | 'mixed' | 'challenging' =
    isStrong(h2rDg) ? 'strong' : isWeak(h2rDg) ? 'challenging' : 'mixed';

  const verdictText = h2r && h2rP
    ? `Финансовый поток — через тему ${HRU[h2rP.house] ?? `${h2rP.house}H`} (управитель 2-го дома ${PRU[h2r]} в ${h2rP.house}-м). ${isStrong(h2rDg) ? 'Управитель в силе — деньги идут с меньшим трением.' : isWeak(h2rDg) ? 'Управитель ослаблен — требует осознанной стратегии.' : 'Управитель в нейтральной позиции.'}`
    : `2-й дом в ${sRu(h2s)} — стиль дохода формируется через ${ELEMENT[h2s ?? ''] ?? '...'}.`;

  return (
    <div>
      <VerdictBanner text={verdictText} tone={tone} isDark={isDark} />

      {h2s && (
        <FactCard icon="🏦" title={`2-й дом — ${sRu(h2s)}: стиль обращения с деньгами`} accent={ac} isDark={isDark}
          text={
            h2s === 'aries'       ? 'Деньги через инициативу и скорость. Зарабатывает быстро — и тратит быстро. Лучший сценарий: предпринимательство и самостоятельные решения.' :
            h2s === 'taurus'      ? 'Деньги через терпение и материальное мастерство. Умеет копить и строить капитал. Расстаётся с деньгами тяжело — это работает в плюс.' :
            h2s === 'gemini'      ? 'Несколько потоков дохода — норма. Деньги через информацию и посредничество. Нужна финансовая систематизация, иначе много всего и ничего конкретного.' :
            h2s === 'cancer'      ? 'Доход интуитивный, связан с семьёй или женской аудиторией. Финансовое самочувствие зависит от эмоционального состояния напрямую.' :
            h2s === 'leo'         ? 'Деньги через признание и творческую смелость. Умеет зарабатывать на публику. Риск — тратить на статусность больше, чем нужно.' :
            h2s === 'virgo'       ? 'Аналитический подход к деньгам. Умеет оптимизировать расходы. Главный враг — недооценивать стоимость своих услуг.' :
            h2s === 'libra'       ? 'Деньги через партнёрства и сотрудничество. Умеет привлекать ресурсы через договорённости. Сложно говорить о деньгах прямо.' :
            h2s === 'scorpio'     ? 'Глубокое понимание финансовых потоков. Деньги через трансформацию или чужие ресурсы. Мышление инвестора — естественное.' :
            h2s === 'sagittarius' ? 'Доход через знание и международные связи. Оптимизм притягивает деньги, но дисциплина расходов — слабое место.' :
            h2s === 'capricorn'   ? 'Медленный и надёжный капитал. Финансовая деловая хватка усиливается с возрастом. Осторожен до такой степени, что иногда упускает возможности.' :
            h2s === 'aquarius'    ? 'Нестандартные финансовые стратегии: IT, технологии, платформы. Независимость важнее богатства — что иногда дорого обходится.' :
            'Творческий и интуитивный доход. Реальные цифры — не сильная сторона. Нужна финансовая структура и доверенный специалист.'
          }
        />
      )}

      {inH2.length > 0 && inH2.map(p => (
        <FactCard key={p.name} icon={PGLYPH[p.name] ?? '○'}
          title={`${PRU[p.name] ?? p.name} во 2-м доме — прямой модификатор дохода`}
          accent={PCOLOR[p.name] ?? ac} isDark={isDark}
          text={PLANET_IN_2H[p.name] ?? `${PRU[p.name]} усиливает тему 2-го дома через стиль ${sRu(p.sign)}.`}
          highlight={p.retrograde ? `Ретроградность: механизм доходности обращён вовнутрь. Деньги приходят через внутреннюю ценностную работу, а не внешнюю активность.` : undefined}
        />
      ))}

      {h2r && h2rP && (
        <FactCard icon="🔑" title={`Управитель 2-го — ${pLabel(h2r, h2rP.sign, h2rP.house, h2rP.retrograde, chart)}`}
          accent={PCOLOR[h2r] ?? ac} isDark={isDark}
          text={`${PRU[h2r]} в ${h2rP.house}-м доме: ${MONEY_FROM_HOUSE[h2rP.house] ?? 'специфический источник дохода.'} Знак ${sRu(h2rP.sign)} определяет стиль реализации.`}
          highlight={
            isStrong(h2rDg) ? `${PRU[h2r]} в силе${dgBadge(h2rDg)} — поток даётся с меньшим трением. Используйте это.` :
            isWeak(h2rDg)   ? `${PRU[h2r]} ослаблен${dgBadge(h2rDg)} — деньги есть, но требуют больше усилий. Стратегия важна.` :
            undefined
          }
        />
      )}
      {h2r && h2rP && <AspectChips chart={chart} planetName={h2r} isDark={isDark} />}

      {(inH8.length > 0 || h8s) && (
        <FactCard icon="♟" title={`8-й дом — ${sRu(h8s)}: чужие деньги и инвестиции`}
          accent="#bb77aa" isDark={isDark}
          text={
            inH8.length > 0
              ? `${inH8.map(p => `${PGLYPH[p.name]} ${PRU[p.name]}`).join(', ')} в 8-м доме — прямой доступ к внешним финансовым потокам: инвестиции, партнёрские деньги, трансформационные услуги.`
              : h8r && h8rP
              ? `Управитель 8-го (${PRU[h8r]}) в ${h8rP.house}-м доме — внешние ресурсы приходят через тему «${HRU[h8rP.house] ?? h8rP.house}».`
              : `8-й дом в ${sRu(h8s)} — стиль работы с чужими деньгами.`
          }
        />
      )}

      {jup && ven && (
        <FactCard icon="✦" title="Юпитер и Венера — усилители дохода"
          accent="#d4a04a" isDark={isDark}
          text={`♃ Юпитер в ${sRu(jup.sign)}, ${jup.house}H${dgBadge(dignity(chart,'jupiter'))} — расширение дохода через «${HRU[jup.house] ?? jup.house}». ♀ Венера в ${sRu(ven.sign)}, ${ven.house}H${dgBadge(dignity(chart,'venus'))} — магнит для денег через «${HRU[ven.house] ?? ven.house}».`}
        />
      )}

      {pof && (
        <FactCard icon="⊕" title={`Жребий Судьбы — ${sRu(pof.sign)}`}
          accent="#fbbf24" isDark={isDark}
          text={`Арабская точка процветания. Стиль ${sRu(pof.sign)} — тот принцип, через который фортуна открывается максимально. Не форсируйте другие пути, если этот ещё не задействован.`}
        />
      )}

      <ActionList accent={ac} isDark={isDark} items={[
        h2rP ? `Основной поток — ${MONEY_FROM_HOUSE[h2rP.house] ?? `тема ${h2rP.house}H`} Концентрируйте монетизацию там.` : `Развивайте тему 2-го дома (${sRu(h2s)}).`,
        isWeak(h2rDg) && h2r ? `${PRU[h2r]} ослаблен — работайте с финансовым консультантом, не принимайте крупных денежных решений единолично.` : `Ежеквартальный финансовый отчёт: доходы по источникам — какой из них растёт?`,
        inH2.some(p => ['neptune','moon','pisces'].includes(p.name)) ? 'Neptune/water в 2H: ведите учёт всех расходов. Деньги утекают незаметно.' : 'Установите автоматическое резервирование 15–20% от каждого поступления.',
        jup ? `Юпитер в ${sRu(jup.sign)} ${jup.house}H: расширяйтесь через «${HRU[jup.house] ?? jup.house}» — это ваш катализатор изобилия.` : 'Изучите инвестиционные инструменты своей ниши.',
      ].filter(Boolean)} />
    </div>
  );
}

// ─── HEALTH ──────────────────────────────────────────────────────────────────
function HealthSphere({ chart, isDark }: { chart: NatalChart; isDark: boolean }) {
  const ac = '#34d399';
  const h1s = hSign(chart, 1);
  const h1r = hRuler(chart, 1);
  const h1rP = h1r ? chart.planets[h1r] : null;
  const h6s = hSign(chart, 6);
  const h6r = hRuler(chart, 6);
  const h6rP = h6r ? chart.planets[h6r] : null;
  const inH1 = planetsIn(chart, 1);
  const inH6 = planetsIn(chart, 6);
  const inH12 = planetsIn(chart, 12);
  const sunP = chart.planets.sun;
  const marsP = chart.planets.mars;
  const satP = chart.planets.saturn;
  const sunDg = dignity(chart, 'sun');

  const tone: 'strong' | 'mixed' | 'challenging' =
    isStrong(sunDg) && !inH12.some(p => ['saturn','mars','pluto'].includes(p.name)) ? 'strong' :
    isWeak(sunDg) || satP?.house === 6 || satP?.house === 12 ? 'challenging' : 'mixed';

  const verdictText = h1s
    ? `Конституция: ${sRu(h1s)} — ${BODY[h1s]?.zones ?? '—'}. ${isStrong(sunDg) ? 'Жизненная сила мощная.' : isWeak(sunDg) ? 'Витальность требует активной поддержки.' : 'Витальность стабильна при соблюдении режима.'}`
    : 'Рассчитайте дом 1 (АСЦ) для полного анализа конституции.';

  return (
    <div>
      <VerdictBanner text={verdictText} tone={tone} isDark={isDark} />

      {h1s && (
        <FactCard icon="🧬" title={`Конституция — ${sRu(h1s)} АСЦ`} accent={ac} isDark={isDark}
          text={`Уязвимые зоны: ${BODY[h1s]?.zones ?? '—'}. ${BODY[h1s]?.note ?? ''}`}
          highlight={h1r && h1rP ? ASC_RULER_HOUSE[h1rP.house] ?? undefined : undefined}
        />
      )}

      {inH1.length > 0 && inH1.map(p => (
        <FactCard key={p.name} icon={PGLYPH[p.name] ?? '○'}
          title={`${PRU[p.name] ?? p.name} в 1-м доме — влияние на тело`}
          accent={PCOLOR[p.name] ?? ac} isDark={isDark}
          text={
            p.name === 'saturn'  ? 'Сдержанная, жилистая конституция. Риск хронических костно-суставных проблем при длительном перенапряжении. Регулярность важнее интенсивности.' :
            p.name === 'mars'    ? 'Высокий физический тонус, быстрая реакция. Риск воспалений, травм, перегрева при игнорировании сигналов усталости.' :
            p.name === 'jupiter' ? 'Крепкая конституция, быстрое восстановление. Риск набора веса и излишеств — умеренность во всём.' :
            p.name === 'uranus'  ? 'Нестандартная, нервная конституция. Реагирует на электромагнитные поля и стресс нестандартно. Возможны внезапные состояния.' :
            p.name === 'neptune' ? 'Чувствительный организм, реагирует на тонкие факторы среды: химия, алкоголь, токсины. Аллергии и психосоматика.' :
            p.name === 'pluto'   ? 'Высокий регенеративный потенциал. Тело способно полностью восстанавливаться после тяжёлых состояний.' :
            `${PRU[p.name]} окрашивает физическую конституцию через стиль ${sRu(p.sign)}.`
          }
        />
      ))}

      {sunP && (
        <FactCard icon="☉" title={`Солнце — жизненная сила: ${sRu(sunP.sign)}, ${sunP.house}H${dgBadge(sunDg)}`}
          accent="#d4a853" isDark={isDark}
          text={
            isStrong(sunDg) ? `Солнце в силе ${dgBadge(sunDg)}: высокая витальность, иммунитет крепкий, восстановление быстрое. Это ресурс, который нужно использовать, а не беречь.` :
            isWeak(sunDg)   ? `Солнце ослаблено ${dgBadge(sunDg)}: жизненный огонь требует поддержки. Режим сна, световой день и регулярная физическая нагрузка — не опции, а необходимость.` :
            `Солнце в нейтральной позиции: витальность стабильна. Ключ — режим и устранение хронических стрессоров.`
          }
        />
      )}

      {marsP && (
        <FactCard icon="♂" title={`Марс — иммунитет и физическая энергия: ${sRu(marsP.sign)}, ${marsP.house}H${dgBadge(dignity(chart,'mars'))}${marsP.retrograde?' Rx':''}`}
          accent="#d45b5b" isDark={isDark}
          text={MARS_PROFILE[marsP.sign ?? ''] ?? 'Марс управляет иммунным ответом и физической активностью.'}
          highlight={marsP.retrograde ? 'Rx: физическая энергия обращена вовнутрь. Статические нагрузки, йога, плавание работают лучше динамических.' : undefined}
        />
      )}
      {marsP && <AspectChips chart={chart} planetName="mars" isDark={isDark} />}

      {h6s && (
        <FactCard icon="⚕" title={`6-й дом — ${sRu(h6s)}: режим и профилактика`} accent="#60a5fa" isDark={isDark}
          text={
            h6r && h6rP
              ? `Управитель 6-го (${PRU[h6r] ?? h6r}) в ${h6rP.house}-м доме: режим здоровья лучше всего работает через «${HRU[h6rP.house] ?? h6rP.house}». ${inH6.length > 0 ? `Планеты в 6-м: ${inH6.map(p => `${PGLYPH[p.name]}${PRU[p.name]}`).join(', ')} — активные участники темы здоровья.` : ''}`
              : `6-й дом в ${sRu(h6s)}: режим строится через принцип ${sRu(h6s)}.`
          }
        />
      )}

      {satP && (satP.house === 6 || satP.house === 12) && (
        <FactCard icon="♄" title={`Сатурн в ${satP.house}-м — хронические темы`} accent="#f87171" isDark={isDark}
          text={`Сатурн в ${satP.house === 6 ? '6-м' : '12-м'} доме — маркер накопительных, хронических процессов. Профилактика за 2–3 года предотвращает то, что потом лечится годами. Диспансеризация ежегодно.`}
        />
      )}

      {inH12.length > 0 && (
        <FactCard icon="🔮" title={`12-й дом: скрытые процессы (${inH12.map(p => PRU[p.name]).join(', ')})`} accent="#c084fc" isDark={isDark}
          text={`Планеты в 12-м доме — сигналы, которые организм посылает тихо и долго, пока не станет громко. Не игнорируйте субклинические симптомы. ${inH12.some(p => p.name === 'neptune') ? 'Нептун в 12-м: особая чувствительность к токсинам, медикаментам и алкоголю.' : ''}`}
        />
      )}

      <ActionList accent={ac} isDark={isDark} items={[
        h1s ? `Контроль зон ${sRu(h1s)}: ${BODY[h1s]?.zones ?? '—'} — осмотр раз в год.` : 'Определите АСЦ для точного анализа конституции.',
        isWeak(sunDg) ? 'Витальность под угрозой: 8 часов сна, дневной свет утром, физическая нагрузка 3+ раза в неделю.' : 'Используйте естественный пик энергии — не бороться с природным ритмом.',
        marsP?.retrograde ? 'Марс Rx: статические нагрузки, йога, плавание. Взрывной спорт — не ваш.' : marsP ? `Марс в ${sRu(marsP.sign)}: ${MARS_PROFILE[marsP.sign ?? '']?.split('.')[0]}.` : '',
        satP && (satP.house === 6 || satP.house === 12) ? 'Сатурн в 6/12: ежегодная диспансеризация — обязательна, не опционально.' : 'Ключ здоровья — режим 6-го дома, а не эпизодические практики.',
        inH12.length > 0 ? 'Не игнорируйте тихие хронические сигналы: усталость, апатия, повторяющиеся симптомы — это 12-й дом.' : '',
      ].filter(Boolean)} />
    </div>
  );
}

// ─── CAREER ──────────────────────────────────────────────────────────────────
function CareerSphere({ chart, isDark }: { chart: NatalChart; isDark: boolean }) {
  const ac = '#818cf8';
  const h10s = hSign(chart, 10);
  const h10r = hRuler(chart, 10);
  const h10rP = h10r ? chart.planets[h10r] : null;
  const inH10 = planetsIn(chart, 10);
  const h6s = hSign(chart, 6);
  const satP = chart.planets.saturn;
  const sunP = chart.planets.sun;

  const h10rDg = h10r ? dignity(chart, h10r) : null;
  const tone: 'strong' | 'mixed' | 'challenging' =
    (isStrong(h10rDg) || satP?.house === 10 || inH10.length >= 2) ? 'strong' :
    isWeak(h10rDg) ? 'challenging' : 'mixed';

  const verdictText = h10s && h10rP
    ? `MC ${sRu(h10s)}: ${MC_ARCHETYPE[h10s]?.split('.')[0] ?? 'профессиональный путь'}. Управитель в ${h10rP.house}H — успех через «${HRU[h10rP.house] ?? h10rP.house}».`
    : `MC в ${sRu(h10s)}: ${h10s ? (MC_ARCHETYPE[h10s]?.split('.')[0] ?? '—') : '—'}.`;

  return (
    <div>
      <VerdictBanner text={verdictText} tone={tone} isDark={isDark} />

      {h10s && (
        <FactCard icon="🏆" title={`MC ${sRu(h10s)} — профессиональный архетип`} accent={ac} isDark={isDark}
          text={MC_ARCHETYPE[h10s] ?? `MC в ${sRu(h10s)}: особый профессиональный путь.`}
        />
      )}

      {h10r && h10rP && (
        <FactCard icon="🔑" title={`Управитель MC — ${pLabel(h10r, h10rP.sign, h10rP.house, h10rP.retrograde, chart)}`}
          accent={PCOLOR[h10r] ?? ac} isDark={isDark}
          text={`${PRU[h10r]} в ${h10rP.house}-м доме: ${CAREER_FROM_HOUSE[h10rP.house] ?? 'нестандартный карьерный путь.'} Стиль реализации — ${sRu(h10rP.sign)}.`}
          highlight={
            isStrong(h10rDg) ? `В силе ${dgBadge(h10rDg)}: карьерный двигатель мощный — используйте без оглядки.` :
            isWeak(h10rDg)   ? `Ослаблен ${dgBadge(h10rDg)}: профессиональный рост требует дополнительных усилий и наставника/ментора.` :
            h10rP.retrograde ? `Rx: карьера строится изнутри наружу. Нестандартный путь, нелинейный рост.` :
            undefined
          }
        />
      )}
      {h10r && <AspectChips chart={chart} planetName={h10r} isDark={isDark} />}

      {inH10.length > 0 && (
        <FactCard icon="🌐" title={`Планеты в 10-м доме: ${inH10.map(p => `${PGLYPH[p.name]}${PRU[p.name]}`).join(' · ')}`}
          accent={ac} isDark={isDark}
          text={inH10.map(p =>
            `${PGLYPH[p.name]} ${PRU[p.name]} ${sRu(p.sign)}${p.retrograde ? ' Rx' : ''}: ${
              p.name === 'sun'     ? 'Карьера неотделима от личной идентичности. Нужна публичная роль.' :
              p.name === 'moon'    ? 'Профессиональный успех через эмоциональный контакт с аудиторией.' :
              p.name === 'saturn'  ? 'Сатурн в MC — серьёзная, долгосрочная репутация. Строится медленно, стоит десятилетиями.' :
              p.name === 'jupiter' ? 'Карьерная удача. Масштаб, экспансия, международный потенциал.' :
              p.name === 'mars'    ? 'Энергичная, конкурентная карьера. Нужны вызовы и действие.' :
              p.name === 'venus'   ? 'Карьера в эстетике, дипломатии, красоте или отношениях.' :
              p.name === 'mercury' ? 'Карьера через коммуникации, данные, обучение.' :
              p.name === 'uranus'  ? 'Нестандартная карьера, неоднократная смена профессии — это план, не сбой.' :
              p.name === 'neptune' ? 'Карьера в творчестве, духовности или помощи. Размытые границы роли.' :
              p.name === 'pluto'   ? 'Трансформирует свою профессиональную сферу. Власть и кризисы — рабочий контекст.' :
              `${PRU[p.name]} усиливает профессиональный путь.`
            }`
          ).join(' | ')}
        />
      )}

      {satP && (
        <FactCard icon="♄" title={`Сатурн — зона профессионального мастерства: ${sRu(satP.sign)}, ${satP.house}H${dgBadge(dignity(chart,'saturn'))}${satP.retrograde?' Rx':''}`}
          accent="#8899bb" isDark={isDark}
          text={satP.house === 10
            ? `Сатурн в 10-м — самый мощный карьерный индикатор карты. Репутация строится через компетентность и дисциплину. Долго, но нерушимо. Признание — после 35.`
            : `Сатурн в ${satP.house}H (${HRU[satP.house] ?? satP.house}): профессиональный результат приходит через эту тему — медленно, но фундаментально. Это ваша зона долгосрочного мастерства.`
          }
          highlight={satP.retrograde ? 'Rx: мастерство строится через внутреннюю дисциплину и нестандартные методы.' : undefined}
        />
      )}

      {h6s && (
        <FactCard icon="⚙" title={`6-й дом — ${sRu(h6s)}: ежедневная рабочая среда`} accent="#60a5fa" isDark={isDark}
          text={`Повседневный режим труда, коллеги, рабочий стиль. В ${sRu(h6s)}: продуктивны в атмосфере ${
            h6s === 'aries'||h6s==='leo'||h6s==='sagittarius' ? 'динамики, конкуренции и новых вызовов' :
            h6s === 'taurus'||h6s==='virgo'||h6s==='capricorn' ? 'порядка, конкретики и измеримых результатов' :
            h6s === 'gemini'||h6s==='libra'||h6s==='aquarius' ? 'разнообразия, диалога и интеллектуальной свободы' :
            'безопасности, доверия и эмоционального комфорта'
          }.`}
        />
      )}

      <ActionList accent={ac} isDark={isDark} items={[
        h10s ? `${MC_ARCHETYPE[h10s]?.split('.')[0] ?? sRu(h10s)}: сфокусируйтесь на этом архетипе — он работает.` : 'Определите MC для точного карьерного вектора.',
        h10rP ? `Ключевой канал успеха — «${HRU[h10rP.house] ?? h10rP.house}» (${PRU[h10r ?? ''] ?? h10r} в ${h10rP.house}H). Инвестируйте время именно туда.` : '',
        isWeak(h10rDg) && h10r ? `${PRU[h10r]} ослаблен: работайте с ментором в этой области, не действуйте в одиночку.` : satP?.house === 10 ? 'Сатурн в 10H: долгосрочная стратегия > краткосрочные победы. Репутация строится годами.' : '',
        `Раз в 90 дней: оцените, сколько % рабочего времени идёт на тему ${HRU[h10rP?.house ?? 10] ?? '10H'}. Если меньше 50% — перераспределите.`,
        inH10.length > 0 ? `Планеты в 10H: ${inH10.map(p => PRU[p.name]).join(', ')} — используйте их качества осознанно в публичной роли.` : '',
      ].filter(Boolean)} />
    </div>
  );
}

// ─── ENERGY ──────────────────────────────────────────────────────────────────
function EnergySphere({ chart, isDark }: { chart: NatalChart; isDark: boolean }) {
  const ac = '#f59e0b';
  const sunP = chart.planets.sun;
  const moonP = chart.planets.moon;
  const marsP = chart.planets.mars;
  const plutP = chart.planets.pluto;
  const sect = chart.sect;
  const sunDg = dignity(chart, 'sun');
  const marsDg = dignity(chart, 'mars');

  const elems: Record<string, number> = { Огонь:0, Земля:0, Воздух:0, Вода:0 };
  for (const [, p] of Object.entries(chart.planets)) {
    if (!p?.sign) continue;
    const el = ELEMENT[p.sign];
    if (el) elems[el] = (elems[el] ?? 0) + 1;
  }
  const topEl = Object.entries(elems).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? 'Огонь';
  const total = Object.values(elems).reduce((a,b)=>a+b,0);

  let score = 5;
  if (isStrong(sunDg)) score += 1;
  if (isStrong(marsDg)) score += 2;
  if (isWeak(marsDg)) score -= 1;
  if (elems['Огонь'] >= 4) score += 1;
  if (sect === 'day') score += 1;
  if (plutP && plutP.house === 1) score += 1;
  score = Math.max(2, Math.min(10, score));

  const tone: 'strong' | 'mixed' | 'challenging' = score >= 8 ? 'strong' : score >= 5 ? 'mixed' : 'challenging';

  const verdictText = sunP
    ? `Природный уровень энергии ${score}/10. Солнце ${sRu(sunP.sign)} (${sunP.house}H)${isStrong(sunDg) ? ' — в силе, высокий потенциал' : isWeak(sunDg) ? ' — ослаблено, требует режима' : ''}. Марс ${marsP ? `${sRu(marsP.sign)} (${marsP.house}H)${isWeak(marsDg)?' ослаблен':''}` : '—'}.`
    : `Доминирующая стихия: ${topEl}.`;

  return (
    <div>
      <VerdictBanner text={verdictText} tone={tone} isDark={isDark} />

      {/* Elements bar */}
      <div style={{
        borderRadius: 10, padding: '12px 14px', marginBottom: 12,
        border: `1px solid ${ac}2a`,
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: ac, marginBottom: 10, letterSpacing:'0.05em' }}>СТИХИИ КАРТЫ</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8 }}>
          {[['Огонь','#d45b5b'],['Земля','#d4a853'],['Воздух','#60a5fa'],['Вода','#9ab5d4']].map(([el, c]) => (
            <div key={el} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, minWidth:55, color: el===topEl ? (c as string) : (isDark?'#64748b':'#9ca3af'), fontWeight: el===topEl?700:400 }}>
                {el===topEl ? '★ ':''}{el}
              </span>
              <div style={{ flex:1, height:5, borderRadius:3, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
                <div style={{ width:`${((elems[el]??0)/total)*100}%`, height:'100%', background: el===topEl?(c as string):'#334155', borderRadius:3 }} />
              </div>
              <span style={{ fontSize:11, color:'#64748b', minWidth:12 }}>{elems[el]??0}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop:10, fontSize:12, color:isDark?'#94a3b8':'#6b7280' }}>
          {topEl === 'Огонь' ? 'Огненная натура: энергия экстравертная, взрывная, требует действия и выхода.' :
           topEl === 'Земля' ? 'Земная натура: энергия стабильная, накопительная, требует ощутимого результата.' :
           topEl === 'Воздух' ? 'Воздушная натура: энергия ментальная, социальная, требует общения и идей.' :
           'Водная натура: энергия глубинная, эмоциональная, требует безопасной среды для восстановления.'}
          {sect === 'day' ? ' Дневное рождение — пик активности: утро/день.' : sect === 'night' ? ' Ночное рождение — пик активности: вечер/ночь.' : ''}
        </div>
      </div>

      {sunP && (
        <FactCard icon="☉" title={`Солнце — источник заряда: ${sRu(sunP.sign)}, ${sunP.house}H${dgBadge(sunDg)}`}
          accent="#d4a853" isDark={isDark}
          text={sunP.sign ? `Заряд: ${SUN_ENERGY_PROFILE[sunP.sign]?.charge ?? '—'}. Слив: ${SUN_ENERGY_PROFILE[sunP.sign]?.drain ?? '—'}. Восстановление: ${SUN_ENERGY_PROFILE[sunP.sign]?.restore ?? '—'}.` : 'Данные Солнца отсутствуют.'}
          highlight={sunP.house ? `Солнце в ${sunP.house}H: максимальная отдача — когда занимаетесь темой «${HRU[sunP.house] ?? sunP.house}». Именно там заряжаетесь, а не тратитесь.` : undefined}
        />
      )}
      {sunP && <AspectChips chart={chart} planetName="sun" isDark={isDark} />}

      {marsP && (
        <FactCard icon="♂" title={`Марс — двигатель воли: ${sRu(marsP.sign)}, ${marsP.house}H${dgBadge(marsDg)}${marsP.retrograde?' Rx':''}`}
          accent="#d45b5b" isDark={isDark}
          text={MARS_PROFILE[marsP.sign ?? ''] ?? 'Марс — двигатель вашей активности.'}
          highlight={
            isStrong(marsDg) ? 'В силе: высокий природный мотор. Риск — сжечь других своей интенсивностью.' :
            isWeak(marsDg)   ? 'Ослаблен: физическая энергия требует грамотного управления. Перегруз → долгое восстановление.' :
            marsP.retrograde ? 'Rx: энергия вовнутрь. Работает через накопление, а не прорыв.' :
            undefined
          }
        />
      )}
      {marsP && <AspectChips chart={chart} planetName="mars" isDark={isDark} />}

      {moonP && (
        <FactCard icon="☽" title={`Луна — ритм восстановления: ${sRu(moonP.sign)}, ${moonP.house}H`}
          accent="#9ab5d4" isDark={isDark}
          text={
            moonP.sign === 'aries'||moonP.sign==='leo'||moonP.sign==='sagittarius'
              ? 'Восстановление через активность: пассивный отдых не работает. Нужны движение, игра, творчество.' :
            moonP.sign === 'taurus'||moonP.sign==='virgo'||moonP.sign==='capricorn'
              ? 'Восстановление через тело и режим: сон, природа, еда, структура. Хаос истощает.' :
            moonP.sign === 'gemini'||moonP.sign==='libra'||moonP.sign==='aquarius'
              ? 'Восстановление через общение и смену обстановки. Изоляция — не отдых.' :
            'Восстановление через уединение, тишину, воду, близкие люди. Чужая интенсивность истощает.'
          }
        />
      )}

      {plutP && plutP.house === 1 && (
        <FactCard icon="♇" title={`Плутон в 1-м — трансформационная энергия`}
          accent="#bb77aa" isDark={isDark}
          text="Плутон в 1-м доме: интенсивная, regenerative конституция. После полного истощения — полное возрождение. Энергия работает через крайности."
        />
      )}

      <ActionList accent={ac} isDark={isDark} items={[
        sunP?.sign ? `Ключевой заряжальщик: ${SUN_ENERGY_PROFILE[sunP.sign]?.restore ?? '—'}. Делайте это регулярно, не как награду.` : '',
        isWeak(marsDg) && marsP ? `Марс ослаблен: планируйте 2 дня восстановления после каждого высокоинтенсивного периода. Не форсируйте.` : marsP ? `Марс в ${sRu(marsP.sign)}: используйте свой стиль воли — не чужой.` : '',
        sect === 'night' ? 'Ночное рождение: не ломайте себя ранними подъёмами — найдите режим, совпадающий с биологическим пиком.' : 'Дневное рождение: утренние ритуалы и ранние задачи — ваша суперсила.',
        topEl === 'Огонь' ? 'Огневая стихия: нужен выход для энергии. Спорт, проекты, соревнование — без этого накапливается агрессия.' :
        topEl === 'Вода'  ? 'Водная стихия: защищайте личные границы. Без барьеров — накапливаете чужой стресс физически.' :
        'Восстанавливайте баланс стихий: если всё — земля и огонь, добавьте воздуха (общение) и воды (тишина).',
        moonP ? `Луна в ${sRu(moonP.sign)}: ваш аккумулятор заряжается через ${ELEMENT[moonP.sign??'']?.toLowerCase() ?? '...'} — не игнорируйте это.` : '',
      ].filter(Boolean)} />
    </div>
  );
}

// ─── LIFE PLAN ────────────────────────────────────────────────────────────────
function PlanSphere({ chart, isDark, birthDate }: {
  chart: NatalChart; isDark: boolean; birthDate?: string;
}) {
  const ac = '#60a5fa';
  const age = useMemo(() => calcAge(birthDate ?? chart.metadata?.date), [birthDate, chart.metadata?.date]);
  const sat = saturnPhase(age);
  const jup = jupiterPhase(age);
  const nodeP = chart.planets.node;
  const satP  = chart.planets.saturn;
  const chirP = chart.planets.chiron;
  const nordSign = nodeP?.sign ?? null;
  const nordHouse = nodeP?.house ?? null;

  // South node sign = opposite
  const signOrder = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
  const nordIdx = nordSign ? signOrder.indexOf(nordSign) : -1;
  const southSign = nordIdx >= 0 ? signOrder[(nordIdx + 6) % 12] : null;
  const southHouse = nordHouse ? (nordHouse <= 6 ? nordHouse + 6 : nordHouse - 6) : null;

  const tone: 'strong' | 'mixed' | 'challenging' =
    sat.cycleNum === 2 && sat.yr >= 7 && sat.yr < 21 ? 'mixed' : 'mixed';

  return (
    <div>
      <VerdictBanner
        text={`${age} лет · Сатурн: цикл ${sat.cycleNum}, год ${sat.yr} (${sat.label}). Следующий возврат ♄ ~${sat.next} лет.`}
        tone={tone} isDark={isDark}
      />

      {/* Saturn cycle */}
      <FactCard icon="♄" title={`Сатурн: ${sat.label}`} accent="#8899bb" isDark={isDark}
        text={sat.desc}
        highlight={`Прошлый возврат Сатурна: ~${sat.prev} лет. Следующий: ~${sat.next} лет. До него — ${sat.next - age} лет.`}
      />

      {/* Jupiter cycle */}
      <FactCard icon="♃" title={`Юпитер: ${jup.label}`} accent="#d4a04a" isDark={isDark}
        text={jup.desc}
      />

      {/* North Node */}
      {nodeP && (
        <FactCard icon="☊" title={`Кармическая ось: куда расти`} accent="#c084fc" isDark={isDark}
          text={`Северный Узел ☊ ${sRu(nordSign)}, ${nordHouse}H (${HRU[nordHouse??1]??nordHouse}) — направление роста в этой жизни. Именно здесь страшно и именно здесь — суть. Южный Узел ☋ ${sRu(southSign)}, ${southHouse}H (${HRU[southHouse??7]??southHouse}) — накопленный ресурс прошлого. Опирайтесь, но не живите там.`}
          highlight={nordHouse && nordSign ? `Ключевая задача: освоить качества «${sRu(nordSign)}» в сфере «${HRU[nordHouse]??nordHouse}». Каждый шаг туда — против комфорта и в сторону реализации.` : undefined}
        />
      )}

      {/* Saturn natal mastery */}
      {satP && (
        <FactCard icon="♄" title={`Сатурн в натале — зона мастерства: ${sRu(satP.sign)}, ${satP.house}H${satP.retrograde?' Rx':''}`}
          accent="#8899bb" isDark={isDark}
          text={`Сфера «${HRU[satP.house]??satP.house}» — ваш главный урок. Здесь не даётся легко, но здесь строится нерушимое мастерство. Результаты в этой теме приходят позже среднего, но остаются навсегда. Стиль ${sRu(satP.sign)} — через него и только.`}
          highlight={satP.retrograde ? 'Rx: мастерство строится изнутри — переосмысление структур, нестандартный путь к компетентности.' : undefined}
        />
      )}

      {/* Chiron */}
      {chirP && (
        <FactCard icon="⚷" title={`Хирон — рана и дар: ${sRu(chirP.sign)}, ${chirP.house}H`}
          accent="#66aabb" isDark={isDark}
          text={`Глубинная уязвимость в теме «${HRU[chirP.house]??chirP.house}». До принятия — источник боли. После — главный дар и способность помогать другим именно здесь глубже любого «специалиста». Хирон-возврат ~50 лет — ключевая точка интеграции.`}
          highlight={age >= 48 && age <= 53 ? '⚡ Вы вблизи Хирон-возврата (~50 лет). Сейчас рана либо исцеляется, либо обостряется — оба варианта нормальны.' : undefined}
        />
      )}

      {/* Mini timeline */}
      <div style={{ marginBottom: 12, borderRadius: 10, border:`1px solid ${ac}2a`,
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding:'12px 14px' }}>
        <div style={{ fontSize:12, fontWeight:700, color:ac, marginBottom:10, letterSpacing:'0.05em' }}>КЛЮЧЕВЫЕ ТОЧКИ ВПЕРЕДИ</div>
        {[
          age < 29  && { yr:29,  label:'1-й возврат Сатурна', desc:'Переосмысление фундамента. Сатурн требует итогов и взятия ответственности.', c:'#8899bb' },
          age < 42  && { yr:42,  label:'Оппозиция Урана', desc:'Неожиданный внутренний переворот. Что из навязанного — не ваше?', c:'#5bbbcc' },
          age < 50  && { yr:50,  label:'Хирон-возврат', desc:'Интеграция главной раны. Дар целителя открывается полностью.', c:'#66aabb' },
          age < 59  && { yr:59,  label:'2-й возврат Сатурна', desc:'Итог зрелости. Готовность передавать опыт.', c:'#8899bb' },
          age < 84  && { yr:84,  label:'Возврат Урана', desc:'Освобождение от всех внешних масок. Абсолютная аутентичность.', c:'#5bbbcc' },
        ].filter(Boolean).map((pt, i) => {
          if (!pt) return null;
          const yrsLeft = (pt as {yr:number}).yr - age;
          return (
            <div key={i} style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}>
              <div style={{
                width:36, height:36, borderRadius:'50%', flexShrink:0,
                background:`${(pt as {c:string}).c}1a`, border:`1px solid ${(pt as {c:string}).c}44`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:12, fontWeight:700, color:(pt as {c:string}).c,
              }}>{(pt as {yr:number}).yr}</div>
              <div>
                <div style={{ fontWeight:600, fontSize:13, color: isDark?'#e2e8f0':'#1e293b' }}>
                  {(pt as {label:string}).label} <span style={{ color:'#94a3b8', fontWeight:400 }}>— через {yrsLeft} лет</span>
                </div>
                <div style={{ fontSize:12, color:isDark?'#94a3b8':'#6b7280', marginTop:2 }}>{(pt as {desc:string}).desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <ActionList accent={ac} isDark={isDark} items={[
        `Сатурн: сейчас фаза "${sat.label}" — ${sat.desc.split('.')[0]}.`,
        nodeP && nordHouse ? `Кармическая задача: делайте шаги в «${HRU[nordHouse]??nordHouse}» (${sRu(nordSign)}) — даже если некомфортно. Комфорт = Южный Узел = прошлое.` : '',
        satP ? `Мастерство в «${HRU[satP.house]??satP.house}»: системная работа здесь раз в неделю — важнее эпизодических прорывов.` : '',
        chirP && age < 50 ? `Хирон в ${sRu(chirP.sign)} (${chirP.house}H): примите уязвимость в этой теме — она станет вашим главным даром к 50.` : '',
        `Юпитер: фаза "${jup.label}" — ${jup.desc.split('.')[0]}. Действуйте в рамках этого цикла.`,
      ].filter(Boolean)} />
    </div>
  );
}

// ─── Sphere config ─────────────────────────────────────────────────────────────
const SPHERES: Array<{ key: SphereKey; icon: string; label: string; color: string }> = [
  { key:'finance', icon:'💰', label:'Финансы',        color:'#d4a853' },
  { key:'health',  icon:'🌿', label:'Здоровье',       color:'#34d399' },
  { key:'career',  icon:'🏆', label:'Профессия',      color:'#818cf8' },
  { key:'energy',  icon:'⚡', label:'Энергия',        color:'#f59e0b' },
  { key:'plan',    icon:'🗺️', label:'Жизненный план', color:'#60a5fa' },
];

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function LifeSphereReports({ chart, name, theme, birthDate }: Props) {
  const [active, setActive] = useState<SphereKey>('finance');
  const isDark = theme === 'dark';

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', color: isDark?'#e2e8f0':'#1e293b' }}>
      {/* Header */}
      <div style={{ marginBottom:16, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <span style={{ fontWeight:700, fontSize:16, color:isDark?'#e2e8f0':'#0f172a', fontFamily:'Georgia,serif' }}>
          Сферы жизни
        </span>
        {name && <span style={{ fontSize:13, color:'#94a3b8' }}>— {name}</span>}
        <span style={{ fontSize:11, color:'#475569', marginLeft:'auto' }}>Метод Павла Андреева</span>
      </div>

      {/* Tabs */}
      <div style={{
        display:'flex', gap:4, flexWrap:'wrap', marginBottom:18,
        padding:4, borderRadius:12,
        background: isDark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)',
      }}>
        {SPHERES.map(s => (
          <button key={s.key} onClick={() => setActive(s.key)} style={{
            display:'flex', alignItems:'center', gap:5,
            padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer',
            fontWeight: active===s.key ? 700 : 500,
            fontSize:13,
            background: active===s.key ? `${s.color}1e` : 'transparent',
            color: active===s.key ? s.color : (isDark?'#94a3b8':'#6b7280'),
            outline: active===s.key ? `1.5px solid ${s.color}55` : '1px solid transparent',
            transition:'all 0.15s',
          }}>
            <span style={{ fontSize:14 }}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        borderRadius:12,
        border:`1px solid ${isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.07)'}`,
        background: isDark?'rgba(255,255,255,0.02)':'#fff',
        padding:'16px',
      }}>
        {active==='finance' && <FinanceSphere chart={chart} isDark={isDark} />}
        {active==='health'  && <HealthSphere  chart={chart} isDark={isDark} />}
        {active==='career'  && <CareerSphere  chart={chart} isDark={isDark} />}
        {active==='energy'  && <EnergySphere  chart={chart} isDark={isDark} />}
        {active==='plan'    && <PlanSphere    chart={chart} isDark={isDark} birthDate={birthDate} />}
      </div>
    </div>
  );
}
