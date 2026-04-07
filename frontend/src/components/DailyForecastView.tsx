// ─── DailyForecastView — Подробный прогноз по дням с компенсаторикой Андреева ─
//
// Входные данные: один transit-ответ бэкенда на стартовую дату.
// Движок проецирует планеты на N дней вперёд по средним скоростям,
// рассчитывает аспекты Луны к натальным планетам, генерирует расписание
// дня по временны́м блокам и блок компенсаторики по П. Андрееву.

import React, { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronUp, Clock, CheckCircle,
  Pause, AlertTriangle, Zap, Moon, Sun,
  ArrowRight, Activity,
} from 'lucide-react';
import type { BirthInput } from '../types/astro';
import { PLANET_SYMBOLS, SIGN_COLORS } from '../types/astro';

// ══════════════════════════════════════════════════════════════════════════════
// ── ТИПЫ ─────────────────────────────────────────────────────────────────────

interface ThemeLike {
  card: string; header: string; accent: string; text: string;
  btn: string; tabActive: string; tabInactive: string; symbol: string;
  wheelTheme: 'dark' | 'light';
}

interface TransitPlanetData {
  lon: number; sign: string; deg_min: string; retrograde?: boolean;
}

interface TransitAspect {
  transit_planet: string; natal_planet: string;
  aspect: string; orb: number; applying?: boolean;
}

interface BaseTransits {
  transit_planets: Record<string, TransitPlanetData>;
  aspects: TransitAspect[];
}

interface TimeBlock {
  label: string;
  timeRange: string;
  emoji: string;
  energy: 'excellent' | 'good' | 'moderate' | 'tense' | 'void';
  headline: string;
  recommendation: string;
  aspects: string[];
  planetIcon?: string;
}

interface CompAction {
  triggerPlanet: string;
  triggerDesc: string;
  tension: string;
  compensator: string;
  compensatorDesc: string;
  action: string;
  practice: string;
  sphere: string;
}

interface DayForecast {
  date: string;
  dayLabel: string;
  weekday: string;
  moonSign: string;
  moonDeg: number;
  moonPhase: string;
  moonPhaseIcon: string;
  voidOfCourse: boolean;
  energyScore: number;
  energyLabel: string;
  energyColor: string;
  headline: string;
  subline: string;
  morning: TimeBlock;
  midday: TimeBlock;
  afternoon: TimeBlock;
  evening: TimeBlock;
  doNow: string[];
  postpone: string[];
  wait: string[];
  urgent: string[];
  compensatorics: CompAction[];
  keyAspects: Array<{ t: string; a: string; n: string; orb: number; harmony: boolean }>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── КОНСТАНТЫ ────────────────────────────────────────────────────────────────

const PLANET_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера', mars: 'Марс',
  jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран', neptune: 'Нептун',
  pluto: 'Плутон', node: 'Сев.Узел', chiron: 'Хирон', lilith: 'Лилит',
};

const ASPECT_RU: Record<string, string> = {
  conjunction: 'соединение', opposition: 'оппозиция', trine: 'трин',
  square: 'квадрат', sextile: 'секстиль', quincunx: 'квинкунс',
};

const SIGN_RU: Record<string, string> = {
  aries: 'Овен', taurus: 'Телец', gemini: 'Близнецы', cancer: 'Рак',
  leo: 'Лев', virgo: 'Дева', libra: 'Весы', scorpio: 'Скорпион',
  sagittarius: 'Стрелец', capricorn: 'Козерог', aquarius: 'Водолей', pisces: 'Рыбы',
};

const SIGNS_ORDER = [
  'aries','taurus','gemini','cancer','leo','virgo',
  'libra','scorpio','sagittarius','capricorn','aquarius','pisces',
];

// Средние скорости планет (градусов/сутки)
const PLANET_SPEEDS: Record<string, number> = {
  sun: 0.9856, moon: 13.176, mercury: 1.383, venus: 1.202, mars: 0.524,
  jupiter: 0.0831, saturn: 0.0339, uranus: 0.0119, neptune: 0.0061,
  pluto: 0.0040, node: -0.0529, chiron: 0.0196, lilith: 0.1111,
};

// Гармоничные/напряжённые аспекты
const HARMONY: Record<string, boolean> = {
  conjunction: true, trine: true, sextile: true,
  opposition: false, square: false, quincunx: false,
};

// ── Компенсаторика Павла Андреева ─────────────────────────────────────────────
// Принцип: каждая напряжённая планета имеет «компенсатор» —
// противоположный принцип, работа с которым снимает напряжение.

const ANDREEV_COMP: Record<string, Omit<CompAction, 'triggerPlanet' | 'triggerDesc'>> = {
  mars: {
    tension: 'Агрессия, конфликты, нетерпение, импульсивные решения, риск травм',
    compensator: 'Венера',
    compensatorDesc: 'Принцип красоты, гармонии и принятия',
    action: 'Создайте что-то красивое или найдите точку согласия в конфликте. Дипломатия сильнее силы.',
    practice: '• Займитесь творчеством или декором · • Сделайте подарок · • Помиритесь с тем, с кем в ссоре · • Послушайте музыку',
    sphere: 'Отношения / Эстетика',
  },
  saturn: {
    tension: 'Страх неудачи, блокировка, ограничения, депрессия, чувство вины',
    compensator: 'Юпитер',
    compensatorDesc: 'Принцип расширения, веры и щедрости',
    action: 'Вспомните свои достижения и ресурсы. Расширьте горизонт — страх живёт только в ближней перспективе.',
    practice: '• Запишите 10 своих сильных сторон · • Проявите щедрость к кому-то · • Прочитайте вдохновляющее · • Составьте список возможностей',
    sphere: 'Вера / Рост',
  },
  neptune: {
    tension: 'Иллюзии, запутанность, ложь, уход от реальности, нечёткие границы',
    compensator: 'Меркурий',
    compensatorDesc: 'Принцип ясности, фактов и аналитики',
    action: 'Сфокусируйтесь на конкретных фактах. Разложите ситуацию на ясные пункты — туман рассеивается при свете логики.',
    practice: '• Составьте список фактов "как есть" · • Проверьте источники информации · • Напишите чёткий план · • Откажитесь от размытых обязательств',
    sphere: 'Ясность / Решения',
  },
  uranus: {
    tension: 'Хаос, неожиданные сбои, нервозность, непредсказуемость',
    compensator: 'Сатурн',
    compensatorDesc: 'Принцип структуры, порядка и заземления',
    action: 'Создайте точку опоры — план, расписание, ритуал. Хаос снаружи не должен разрушать порядок внутри.',
    practice: '• Составьте расписание на день · • Сделайте что-то привычное и заземляющее · • Уберитесь на рабочем месте · • Пообщайтесь с надёжным человеком',
    sphere: 'Порядок / Стабильность',
  },
  pluto: {
    tension: 'Контроль, одержимость, манипуляции, ощущение силового давления',
    compensator: 'Венера',
    compensatorDesc: 'Принцип принятия, красоты и мягкости',
    action: 'Отпустите контроль там, где он невозможен. Найдите красоту в ситуации — это снимает плутонианское напряжение.',
    practice: '• Примите одну ситуацию "как есть" · • Займитесь искусством · • Выразите благодарность · • Откажитесь от победы в споре',
    sphere: 'Принятие / Трансформация',
  },
  moon: {
    tension: 'Эмоциональный хаос, обидчивость, зависимость от настроения',
    compensator: 'Солнце',
    compensatorDesc: 'Принцип воли, ясности и центрированности',
    action: 'Примите одно чёткое решение вместо того, чтобы реагировать на волну эмоций. Воля успокаивает чувства.',
    practice: '• Запишите 3 приоритета дня · • Сделайте что-то физическое · • Откажитесь от одного токсичного контакта · • Установите чёткую границу',
    sphere: 'Воля / Центр',
  },
  mercury: {
    tension: 'Информационная перегрузка, нервозность, путаница в решениях',
    compensator: 'Луна',
    compensatorDesc: 'Принцип чувств, интуиции и отдыха',
    action: 'Остановите поток информации. Доверьтесь интуиции — часто она знает ответ, который разум запутывает.',
    practice: '• Отключитесь от новостей на 2 часа · • Задайте себе вопрос и прислушайтесь к ощущениям · • Побудьте в тишине · • Запишите чувства, не анализируя',
    sphere: 'Интуиция / Покой',
  },
  sun: {
    tension: 'Эго-конфликты, давление признания, самоутверждение через борьбу',
    compensator: 'Луна',
    compensatorDesc: 'Принцип принятия, мягкости и эмпатии',
    action: 'Уберите "я прав" из разговора. Признайте чужие чувства — это не слабость, это зрелость.',
    practice: '• Выслушайте кого-то без возражений · • Скажите "ты прав" там, где сопротивляетесь · • Позаботьтесь о ком-то · • Откажитесь от спора',
    sphere: 'Эмпатия / Гибкость',
  },
  jupiter: {
    tension: 'Перегрев, избыток, расточительность, потеря фокуса',
    compensator: 'Сатурн',
    compensatorDesc: 'Принцип ограничения, приоритетов и дисциплины',
    action: 'Скажите "нет" одному лишнему. Сила не в количестве, а в качестве и фокусе.',
    practice: '• Напишите список "лишнего" — откажитесь от 1 пункта · • Выберите один главный проект · • Укрепите уже начатое · • Откажитесь от нового до завершения текущего',
    sphere: 'Фокус / Дисциплина',
  },
  venus: {
    tension: 'Пассивность, ожидание, зависимость от одобрения, инертность',
    compensator: 'Марс',
    compensatorDesc: 'Принцип инициативы, действия и желания',
    action: 'Сделайте первый шаг сами. Перестаньте ждать — желание реализуется только через движение.',
    practice: '• Напишите первому · • Объявите о своём решении · • Сделайте один конкретный шаг · • Выскажите желание вслух',
    sphere: 'Инициатива / Действие',
  },
};

// ── Интерпретации Moon по знаку (для прогноза дня) ───────────────────────────

const MOON_SIGN_DAY: Record<string, { mood: string; best: string; avoid: string }> = {
  aries:       { mood: 'Импульсивный, энергичный, нетерпеливый', best: 'Новые начинания, физическая активность, быстрые решения', avoid: 'Ссоры, необдуманные траты, агрессия' },
  taurus:      { mood: 'Спокойный, чувственный, устойчивый', best: 'Финансы, контракты, материальные вопросы, кулинария, отдых', avoid: 'Резкие перемены, переедание, излишняя медлительность' },
  gemini:      { mood: 'Живой, любопытный, непостоянный', best: 'Переписка, переговоры, обучение, встречи, идеи', avoid: 'Принятие финансовых решений, глубокая работа' },
  cancer:      { mood: 'Чувствительный, домашний, интуитивный', best: 'Семейные вопросы, дом, забота, интуитивные решения', avoid: 'Публичные выступления, резкие переговоры' },
  leo:         { mood: 'Творческий, яркий, тщеславный', best: 'Презентации, творчество, романтика, лидерство', avoid: 'Скромная роль в тени, монотонный труд' },
  virgo:       { mood: 'Аналитический, деловитый, критичный', best: 'Детальная работа, анализ, здоровье, порядок', avoid: 'Импульсивные решения, беспорядок, развлечения без цели' },
  libra:       { mood: 'Дипломатичный, эстетичный, нерешительный', best: 'Партнёрства, переговоры, искусство, договоры', avoid: 'Одностороннее давление, эгоизм' },
  scorpio:     { mood: 'Интенсивный, проницательный, скрытный', best: 'Глубокий анализ, трансформации, сексуальность, психология', avoid: 'Поверхностность, недосказанность в важных вопросах' },
  sagittarius: { mood: 'Оптимистичный, свободолюбивый, разбросанный', best: 'Путешествия, обучение, философия, широкие планы', avoid: 'Детальная работа, бюрократия, обязательства' },
  capricorn:   { mood: 'Серьёзный, целеустремлённый, сдержанный', best: 'Карьера, долгосрочное планирование, ответственность', avoid: 'Веселье без дела, эмоциональные разговоры' },
  aquarius:    { mood: 'Нестандартный, социальный, отстранённый', best: 'Группы, инновации, нетворкинг, нестандартные решения', avoid: 'Традиционные форматы, эмоциональная близость' },
  pisces:      { mood: 'Мечтательный, интуитивный, чувствительный', best: 'Духовные практики, творчество, медитация, сочувствие', avoid: 'Чёткие договоры, жёсткие сроки, критика' },
};

// ── Лунные фазы ───────────────────────────────────────────────────────────────
function getMoonPhase(moonLon: number, sunLon: number): { name: string; icon: string } {
  const diff = ((moonLon - sunLon + 360) % 360);
  if (diff < 22.5)  return { name: 'Новолуние', icon: '🌑' };
  if (diff < 67.5)  return { name: 'Растущий серп', icon: '🌒' };
  if (diff < 112.5) return { name: 'Первая четверть', icon: '🌓' };
  if (diff < 157.5) return { name: 'Растущая луна', icon: '🌔' };
  if (diff < 202.5) return { name: 'Полнолуние', icon: '🌕' };
  if (diff < 247.5) return { name: 'Убывающая луна', icon: '🌖' };
  if (diff < 292.5) return { name: 'Последняя четверть', icon: '🌗' };
  return { name: 'Убывающий серп', icon: '🌘' };
}

// ── Расчёт аспекта между двумя долготами ────────────────────────────────────
function calcAspect(lon1: number, lon2: number): { aspect: string; orb: number } | null {
  const diff = Math.abs(((lon1 - lon2 + 180) % 360 + 360) % 360 - 180);
  const checks = [
    { aspect: 'conjunction', deg: 0, orb: 8 },
    { aspect: 'sextile',     deg: 60, orb: 6 },
    { aspect: 'square',      deg: 90, orb: 8 },
    { aspect: 'trine',       deg: 120, orb: 8 },
    { aspect: 'opposition',  deg: 180, orb: 8 },
    { aspect: 'quincunx',    deg: 150, orb: 4 },
  ];
  for (const c of checks) {
    if (Math.abs(diff - c.deg) <= c.orb) {
      return { aspect: c.aspect, orb: Math.round(Math.abs(diff - c.deg) * 10) / 10 };
    }
  }
  return null;
}

function normLon(lon: number): number { return ((lon % 360) + 360) % 360; }

function lonToSign(lon: number): string {
  return SIGNS_ORDER[Math.floor(normLon(lon) / 30)] ?? 'aries';
}

function lonToDegMin(lon: number): string {
  const inSign = normLon(lon) % 30;
  const d = Math.floor(inSign);
  const m = Math.floor((inSign - d) * 60);
  return `${d}°${String(m).padStart(2, '0')}'`;
}

// ── Проекция позиций планет вперёд на N дней ─────────────────────────────────
function projectPlanets(
  base: Record<string, TransitPlanetData>,
  days: number,
): Record<string, TransitPlanetData> {
  const out: Record<string, TransitPlanetData> = {};
  for (const [name, pd] of Object.entries(base)) {
    const speed = PLANET_SPEEDS[name] ?? 0;
    const newLon = normLon(pd.lon + speed * days);
    const sign = lonToSign(newLon);
    out[name] = {
      lon: newLon,
      sign,
      deg_min: lonToDegMin(newLon),
      retrograde: pd.retrograde,
    };
  }
  return out;
}

// ── Генерация прогноза дня ────────────────────────────────────────────────────
function generateDayForecast(
  date: string,
  transitPlanets: Record<string, TransitPlanetData>,
  natalPlanets: Record<string, TransitPlanetData>,
  existingAspects: TransitAspect[],
): DayForecast {
  const d = new Date(`${date}T12:00:00`);
  const WEEKDAYS = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
  const weekday = WEEKDAYS[d.getDay()] ?? '';
  const dayLabel = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;

  const moon = transitPlanets.moon;
  const sun  = transitPlanets.sun;
  const moonSign = moon ? lonToSign(moon.lon) : 'aries';
  const moonDeg  = moon?.lon ?? 0;
  const phase = (moon && sun) ? getMoonPhase(moon.lon, sun.lon) : { name: 'Неизвестно', icon: '🌙' };

  // Moon aspects to natal planets for this day
  const moonAspects: Array<{ natalPlanet: string; aspect: string; orb: number; harmony: boolean }> = [];
  if (moon && natalPlanets) {
    for (const [nname, np] of Object.entries(natalPlanets)) {
      const asp = calcAspect(moon.lon, np.lon);
      if (asp) {
        moonAspects.push({ natalPlanet: nname, aspect: asp.aspect, orb: asp.orb, harmony: HARMONY[asp.aspect] ?? true });
      }
    }
  }
  moonAspects.sort((a, b) => a.orb - b.orb);

  // Key transit-to-natal aspects (use provided or recalculate)
  const keyAspects: DayForecast['keyAspects'] = existingAspects
    .filter(a => ['saturn','uranus','neptune','pluto','jupiter'].includes(a.transit_planet))
    .filter(a => ['conjunction','opposition','square','trine','sextile'].includes(a.aspect))
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 6)
    .map(a => ({
      t: a.transit_planet, a: a.aspect, n: a.natal_planet,
      orb: a.orb, harmony: HARMONY[a.aspect] ?? true,
    }));

  // Energy score: based on Moon aspects + key transits
  let energyScore = 55;
  for (const ma of moonAspects.slice(0, 4)) {
    energyScore += ma.harmony ? 6 : -5;
  }
  for (const ka of keyAspects) {
    const weight = ka.t === 'jupiter' ? 8 : ka.t === 'saturn' ? -6 : ka.t === 'pluto' ? -5 : ka.t === 'uranus' ? -4 : ka.t === 'neptune' ? -3 : 0;
    energyScore += ka.harmony ? Math.abs(weight) : weight;
  }
  // Void of course Moon (no aspects to next sign change)
  const moonInSignDeg = normLon(moonDeg) % 30;
  const degsLeft = 30 - moonInSignDeg;
  const hoursToSignChange = degsLeft / (PLANET_SPEEDS.moon / 24);
  const voidOfCourse = moonAspects.length === 0 && degsLeft < 5;
  if (voidOfCourse) energyScore -= 8;

  energyScore = Math.min(99, Math.max(10, Math.round(energyScore)));

  const energyLabel = energyScore >= 75 ? 'Отличный' : energyScore >= 62 ? 'Хороший' : energyScore >= 48 ? 'Умеренный' : energyScore >= 35 ? 'Напряжённый' : 'Сложный';
  const energyColor = energyScore >= 75 ? '#22c55e' : energyScore >= 62 ? '#84cc16' : energyScore >= 48 ? '#eab308' : energyScore >= 35 ? '#f97316' : '#ef4444';

  // Moon sign info
  const moonInfo = MOON_SIGN_DAY[moonSign] ?? { mood: '', best: '', avoid: '' };

  // Headline
  const harmAspects = moonAspects.filter(a => a.harmony).slice(0, 2).map(a => `Луна ${ASPECT_RU[a.aspect] ?? a.aspect} ${PLANET_RU[a.natalPlanet] ?? a.natalPlanet}`);
  const tensAspects = moonAspects.filter(a => !a.harmony).slice(0, 2).map(a => `Луна ${ASPECT_RU[a.aspect] ?? a.aspect} ${PLANET_RU[a.natalPlanet] ?? a.natalPlanet}`);
  const headline = voidOfCourse
    ? `Луна без курса — день для завершений и отдыха`
    : harmAspects.length > tensAspects.length
      ? `Луна в ${SIGN_RU[moonSign]} — гармоничный фон: ${harmAspects.join(', ')}`
      : tensAspects.length > 0
        ? `Луна в ${SIGN_RU[moonSign]} — напряжение: ${tensAspects.join(', ')}`
        : `Луна в ${SIGN_RU[moonSign]} — ${phase.name} ${phase.icon}`;

  const subline = `${moonInfo.mood}. ${voidOfCourse ? 'Луна без курса — не начинайте новых дел.' : `Лучшее: ${moonInfo.best}.`}`;

  // Time blocks
  const makeTimeBlock = (
    label: string, timeRange: string, emoji: string,
    hourOffset: number,
  ): TimeBlock => {
    // Moon moves ~0.55°/hour
    const moonAtTime = normLon(moonDeg + 0.55 * hourOffset);
    const moonSignAtTime = lonToSign(moonAtTime);
    const moonInTimeAspects: string[] = [];
    if (natalPlanets) {
      for (const [nname, np] of Object.entries(natalPlanets)) {
        const asp = calcAspect(moonAtTime, np.lon);
        if (asp && asp.orb <= 5) {
          moonInTimeAspects.push(`Луна ${ASPECT_RU[asp.aspect] ?? asp.aspect} н.${PLANET_RU[nname] ?? nname} (${asp.orb.toFixed(1)}°)`);
        }
      }
    }
    const posAsp = moonInTimeAspects.filter(s => ['трин','секстиль'].some(x => s.includes(x)));
    const negAsp = moonInTimeAspects.filter(s => ['квадрат','оппозиция'].some(x => s.includes(x)));
    const hasVoid = moonInTimeAspects.length === 0 && normLon(moonAtTime) % 30 > 25;

    let energy: TimeBlock['energy'] = 'moderate';
    let headline2 = '';
    let rec = '';
    if (hasVoid) {
      energy = 'void';
      headline2 = 'Луна без курса';
      rec = 'Завершайте начатое, не открывайте новое. Рутина, уборка, анализ прошлого.';
    } else if (posAsp.length > negAsp.length) {
      energy = 'good';
      headline2 = `Поддержка: ${posAsp[0] ?? ''}`;
      rec = getMoonSignRec(moonSignAtTime, label);
    } else if (negAsp.length > 0) {
      energy = 'tense';
      headline2 = `Напряжение: ${negAsp[0] ?? ''}`;
      rec = getTenseRec(negAsp[0] ?? '');
    } else {
      energy = 'moderate';
      headline2 = `Луна в ${SIGN_RU[moonSignAtTime] ?? moonSignAtTime}`;
      rec = getMoonSignRec(moonSignAtTime, label);
    }
    return { label, timeRange, emoji, energy, headline: headline2, recommendation: rec, aspects: moonInTimeAspects.slice(0, 3) };
  };

  const morning   = makeTimeBlock('Утро',   '06:00–10:00', '🌅', 0);
  const midday    = makeTimeBlock('День',   '10:00–14:00', '☀️', 4);
  const afternoon = makeTimeBlock('Вечер',  '14:00–19:00', '🌤', 8);
  const evening   = makeTimeBlock('Ночь',   '19:00–23:00', '🌙', 14);

  // Action lists
  const doNow: string[] = [];
  const postpone: string[] = [];
  const wait: string[] = [];
  const urgent: string[] = [];

  // Based on Moon sign
  if (['taurus','libra','pisces'].includes(moonSign)) {
    doNow.push('Переговоры и договорённости — сейчас лёгкий контакт');
    doNow.push('Финансовые вопросы и планирование бюджета');
  }
  if (['gemini','aquarius'].includes(moonSign)) {
    doNow.push('Переписка, звонки, встречи — коммуникация в потоке');
    doNow.push('Генерация идей и мозговой штурм');
  }
  if (['aries','leo','sagittarius'].includes(moonSign)) {
    doNow.push('Начинать активные проекты — энергия высокая');
    doNow.push('Публичные действия, презентации, заявления');
  }
  if (['cancer','scorpio','pisces'].includes(moonSign)) {
    doNow.push('Интуитивные решения — доверяйте первому ощущению');
    wait.push('Не спорьте — сейчас эмоции доминируют над логикой');
  }
  if (['capricorn','virgo'].includes(moonSign)) {
    doNow.push('Структурная работа: документы, системы, планирование');
  }
  if (voidOfCourse) {
    postpone.push('Любые новые начинания — подождите смены знака Луны');
    postpone.push('Подписание контрактов и важные договорённости');
    doNow.push('Завершение начатых дел');
    doNow.push('Уборка, систематизация, рутинные задачи');
  }
  // Based on key outer transits
  for (const ka of keyAspects) {
    if (!ka.harmony) {
      if (ka.t === 'saturn') {
        wait.push(`Сатурн ${ASPECT_RU[ka.a] ?? ka.a} ${PLANET_RU[ka.n] ?? ka.n}: не давите на себя сверх меры`);
        doNow.push(`Работа с ограничениями и долгосрочным планированием`);
      }
      if (ka.t === 'mars') {
        urgent.push(`Марс активен — разрешите конфликты пока орбис мал`);
      }
      if (ka.t === 'uranus') {
        wait.push(`Уран ${ASPECT_RU[ka.a] ?? ka.a}: нет резких необратимых решений`);
      }
      if (ka.t === 'neptune') {
        wait.push(`Нептун активен: не подписывайте документы без тщательной проверки`);
      }
      if (ka.t === 'pluto') {
        urgent.push(`Плутон активен: силовые вопросы требуют честного разрешения сейчас`);
      }
    } else {
      if (ka.t === 'jupiter') {
        doNow.push(`Юпитер гармоничен: расширение бизнеса, обучение, путешествия — зелёный свет`);
      }
    }
  }
  // Urgency by Moon aspects
  const closeMoonAsp = moonAspects.filter(a => a.orb < 2 && !a.harmony);
  if (closeMoonAsp.length > 0) {
    urgent.push(`Луна ${ASPECT_RU[closeMoonAsp[0].aspect] ?? closeMoonAsp[0].aspect} ${PLANET_RU[closeMoonAsp[0].natalPlanet] ?? closeMoonAsp[0].natalPlanet} точно — эмоциональный пик, действуйте осознанно`);
  }
  if (doNow.length === 0) doNow.push('Плановые задачи и поддержание текущего ритма');
  if (postpone.length === 0) postpone.push('Крупные необратимые решения — лучше не сегодня');
  if (wait.length === 0) wait.push('Спорные вопросы и конфронтации — дайте время');

  // Compensatorics: find dominant tension planets
  const tensionPlanets = new Set<string>();
  for (const ka of keyAspects.filter(k => !k.harmony)) {
    tensionPlanets.add(ka.t);
  }
  for (const ma of moonAspects.filter(a => !a.harmony && a.orb < 5)) {
    tensionPlanets.add('moon');
    break;
  }
  if (voidOfCourse) tensionPlanets.add('moon');

  const compensatorics: CompAction[] = [];
  for (const planet of Array.from(tensionPlanets).slice(0, 3)) {
    const comp = ANDREEV_COMP[planet];
    if (comp) {
      compensatorics.push({
        triggerPlanet: planet,
        triggerDesc: `${PLANET_RU[planet] ?? planet} ${keyAspects.find(k => k.t === planet)
          ? `${ASPECT_RU[keyAspects.find(k => k.t === planet)!.a] ?? ''} натальное ${PLANET_RU[keyAspects.find(k => k.t === planet)!.n] ?? ''}` : 'активен'}`,
        ...comp,
      });
    }
  }

  return {
    date, dayLabel, weekday,
    moonSign, moonDeg, moonPhase: phase.name, moonPhaseIcon: phase.icon,
    voidOfCourse, energyScore, energyLabel, energyColor,
    headline, subline,
    morning, midday, afternoon, evening,
    doNow, postpone, wait, urgent, compensatorics,
    keyAspects,
  };
}

function getMoonSignRec(sign: string, timeLabel: string): string {
  const recs: Record<string, string> = {
    aries: 'Принимайте решения быстро. Инициируйте. Физическая активность.',
    taurus: 'Стабилизируйте, закрепляйте, наслаждайтесь. Тело и материя.',
    gemini: 'Общайтесь, читайте, пишите. Несколько задач параллельно.',
    cancer: 'Семья, дом, еда. Доверяйте ощущениям.',
    leo: 'Будьте видимы. Творчество, лидерство, комплименты.',
    virgo: 'Детали, аналитика, здоровье. Систематизируйте.',
    libra: 'Переговоры, эстетика, партнёрства. Ищите компромисс.',
    scorpio: 'Глубина, трансформация, стратегия. Не тратьте впустую.',
    sagittarius: 'Большие планы, философия, движение. Расширяйтесь.',
    capricorn: 'Карьера, серьёзность, ответственность. Долгий горизонт.',
    aquarius: 'Сообщества, инновации, нестандарт. Социальный контекст.',
    pisces: 'Медитация, интуиция, искусство. Тишина и принятие.',
  };
  return recs[sign] ?? `${SIGN_RU[sign] ?? sign}: следуйте настроению ${timeLabel.toLowerCase()}.`;
}

function getTenseRec(aspectStr: string): string {
  if (aspectStr.includes('квадрат')) return 'Напряжение — сфокусируйтесь на одном. Не форсируйте.';
  if (aspectStr.includes('оппозиция')) return 'Противоречие — выслушайте другую сторону прежде чем действовать.';
  return 'Сложный аспект — сохраняйте спокойствие, откладывайте необязательное.';
}

// ══════════════════════════════════════════════════════════════════════════════
// ── КОМПОНЕНТЫ ────────────────────────────────────────────────────────────────

function EnergyBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-700/40 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-bold font-mono w-6 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

const TIME_ENERGY_COLOR: Record<TimeBlock['energy'], string> = {
  excellent: '#22c55e', good: '#84cc16', moderate: '#eab308', tense: '#f97316', void: '#94a3b8',
};
const TIME_ENERGY_LABEL: Record<TimeBlock['energy'], string> = {
  excellent: 'Отлично', good: 'Хорошо', moderate: 'Умеренно', tense: 'Напряжённо', void: 'Без курса',
};
const TIME_ENERGY_ICON: Record<TimeBlock['energy'], string> = {
  excellent: '🟢', good: '🟡', moderate: '🟠', tense: '🔴', void: '⚫',
};

function TimeBlockCard({ block, isDark, theme }: { block: TimeBlock; isDark: boolean; theme: ThemeLike }) {
  const color = TIME_ENERGY_COLOR[block.energy];
  return (
    <div className={`rounded-xl p-3 border ${isDark ? 'bg-slate-800/50 border-slate-700/40' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{block.emoji}</span>
        <span className={`text-xs font-bold ${theme.header}`}>{block.label}</span>
        <span className={`text-[10px] opacity-50 ${theme.text}`}>{block.timeRange}</span>
        <span className="ml-auto text-[10px]">{TIME_ENERGY_ICON[block.energy]}</span>
        <span className="text-[10px] font-semibold" style={{ color }}>{TIME_ENERGY_LABEL[block.energy]}</span>
      </div>
      <p className={`text-[11px] font-medium ${theme.header} mb-1`}>{block.headline}</p>
      <p className={`text-[11px] ${theme.text} opacity-75 leading-relaxed`}>{block.recommendation}</p>
      {block.aspects.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {block.aspects.map((a, i) => (
            <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${isDark ? 'bg-indigo-900/20 border-indigo-500/25 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-600'}`}>
              {a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CompensatoryCard({ comp, isDark, theme }: { comp: CompAction; isDark: boolean; theme: ThemeLike }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-orange-900/15 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-start gap-3 p-3 text-left hover:bg-white/5">
        <div className="text-xl shrink-0">⚡</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
              {PLANET_RU[comp.triggerPlanet] ?? comp.triggerPlanet} → {comp.compensator}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${isDark ? 'bg-orange-500/20 border-orange-500/30 text-orange-300' : 'bg-orange-100 border-orange-200 text-orange-700'}`}>
              {comp.sphere}
            </span>
          </div>
          <p className={`text-[11px] ${theme.text} opacity-70 mt-0.5`}>{comp.triggerDesc}</p>
        </div>
        <ArrowRight className={`h-4 w-4 shrink-0 mt-0.5 transition-transform ${open ? 'rotate-90' : ''} ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
      </button>
      {open && (
        <div className={`px-4 pb-4 space-y-3 border-t ${isDark ? 'border-orange-500/20' : 'border-orange-100'}`}>
          <div className="pt-3 space-y-2">
            <div className={`rounded-lg p-2.5 ${isDark ? 'bg-red-900/20' : 'bg-red-50 border border-red-100'}`}>
              <p className={`text-[11px] font-semibold mb-1 ${isDark ? 'text-red-300' : 'text-red-700'}`}>🔥 Что происходит:</p>
              <p className={`text-xs ${theme.text} opacity-75`}>{comp.tension}</p>
            </div>
            <div className={`rounded-lg p-2.5 ${isDark ? 'bg-green-900/20' : 'bg-green-50 border border-green-100'}`}>
              <p className={`text-[11px] font-semibold mb-1 ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                ✅ Компенсатор: {comp.compensator} — {comp.compensatorDesc}
              </p>
              <p className={`text-xs ${theme.text} opacity-75`}>{comp.action}</p>
            </div>
            <div className={`rounded-lg p-2.5 ${isDark ? 'bg-indigo-900/20' : 'bg-indigo-50 border border-indigo-100'}`}>
              <p className={`text-[11px] font-semibold mb-1.5 ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>🛠 Практики:</p>
              <p className={`text-xs ${theme.text} opacity-80 leading-relaxed`}>{comp.practice}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DayCard({ day, isDark, theme, defaultOpen }: { day: DayForecast; isDark: boolean; theme: ThemeLike; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${isDark ? 'bg-slate-900/70 border-slate-700/60' : 'bg-white border-slate-200'}`}>
      {/* Header */}
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 text-left">
        <div className={`w-12 text-center shrink-0 rounded-lg py-1 ${isDark ? 'bg-slate-800/60' : 'bg-slate-100'}`}>
          <div className={`text-base font-black ${theme.header}`}>{day.dayLabel.split('.')[0]}</div>
          <div className={`text-[9px] opacity-50 ${theme.text}`}>{day.dayLabel.split('.')[1]}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[11px] opacity-50 ${theme.text}`}>{day.weekday}</span>
            <span className="text-sm">{day.moonPhaseIcon}</span>
            <span className={`text-[11px] font-medium`} style={{ color: SIGN_COLORS[day.moonSign] || '#888' }}>
              ☽ {SIGN_RU[day.moonSign]}
            </span>
            {day.voidOfCourse && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isDark ? 'bg-slate-600/50 text-slate-400 border border-slate-500/30' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                без курса
              </span>
            )}
          </div>
          <EnergyBar score={day.energyScore} color={day.energyColor} />
        </div>
        <div className="text-right shrink-0 ml-2">
          <div className="text-sm font-bold" style={{ color: day.energyColor }}>{day.energyLabel}</div>
          {day.compensatorics.length > 0 && (
            <div className={`text-[9px] mt-0.5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
              ⚡ компенсаторика
            </div>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 opacity-40 shrink-0" /> : <ChevronDown className="h-4 w-4 opacity-40 shrink-0" />}
      </button>

      {open && (
        <div className={`border-t ${isDark ? 'border-slate-700/50' : 'border-slate-100'} space-y-4 p-4`}>
          {/* Headline */}
          <div className={`rounded-xl p-3.5 ${isDark ? 'bg-indigo-900/20 border border-indigo-500/25' : 'bg-indigo-50 border border-indigo-200'}`}>
            <p className={`text-sm font-semibold ${isDark ? 'text-indigo-200' : 'text-indigo-800'} mb-1`}>{day.headline}</p>
            <p className={`text-xs ${theme.text} opacity-70 leading-relaxed`}>{day.subline}</p>
          </div>

          {/* Key outer transits */}
          {day.keyAspects.length > 0 && (
            <div>
              <p className={`text-xs font-semibold ${theme.accent} mb-2`}>🌌 Ключевые транзиты дня:</p>
              <div className="flex flex-wrap gap-1.5">
                {day.keyAspects.map((ka, i) => (
                  <span key={i} className={`text-[11px] px-2 py-0.5 rounded-lg border ${
                    ka.harmony
                      ? (isDark ? 'bg-green-900/20 border-green-500/25 text-green-300' : 'bg-green-50 border-green-200 text-green-700')
                      : (isDark ? 'bg-red-900/20 border-red-500/25 text-red-300' : 'bg-red-50 border-red-200 text-red-700')
                  }`}>
                    {PLANET_SYMBOLS[ka.t] ?? '●'} {PLANET_RU[ka.t]} {ASPECT_RU[ka.a] ?? ka.a} н.{PLANET_RU[ka.n]} ({ka.orb.toFixed(1)}°)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Time breakdown */}
          <div>
            <p className={`text-xs font-semibold ${theme.accent} mb-2 flex items-center gap-1.5`}>
              <Clock className="h-3.5 w-3.5" /> Расписание дня:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <TimeBlockCard block={day.morning}   isDark={isDark} theme={theme} />
              <TimeBlockCard block={day.midday}    isDark={isDark} theme={theme} />
              <TimeBlockCard block={day.afternoon} isDark={isDark} theme={theme} />
              <TimeBlockCard block={day.evening}   isDark={isDark} theme={theme} />
            </div>
          </div>

          {/* Action panels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Do now */}
            {day.doNow.length > 0 && (
              <div className={`rounded-xl p-3 ${isDark ? 'bg-green-900/15 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
                <p className={`text-xs font-bold flex items-center gap-1.5 mb-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                  <CheckCircle className="h-3.5 w-3.5" /> Делать сейчас:
                </p>
                {day.doNow.map((s, i) => <p key={i} className={`text-[11px] ${theme.text} mb-1`}>• {s}</p>)}
              </div>
            )}
            {/* Urgent */}
            {day.urgent.length > 0 && (
              <div className={`rounded-xl p-3 ${isDark ? 'bg-red-900/15 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-xs font-bold flex items-center gap-1.5 mb-2 ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                  <Zap className="h-3.5 w-3.5" /> Срочно решить:
                </p>
                {day.urgent.map((s, i) => <p key={i} className={`text-[11px] ${theme.text} mb-1`}>• {s}</p>)}
              </div>
            )}
            {/* Postpone */}
            {day.postpone.length > 0 && (
              <div className={`rounded-xl p-3 ${isDark ? 'bg-orange-900/15 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'}`}>
                <p className={`text-xs font-bold flex items-center gap-1.5 mb-2 ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                  <Pause className="h-3.5 w-3.5" /> Отложить:
                </p>
                {day.postpone.map((s, i) => <p key={i} className={`text-[11px] ${theme.text} mb-1`}>• {s}</p>)}
              </div>
            )}
            {/* Wait */}
            {day.wait.length > 0 && (
              <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-800/60 border border-slate-600/40' : 'bg-slate-50 border border-slate-200'}`}>
                <p className={`text-xs font-bold flex items-center gap-1.5 mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  <AlertTriangle className="h-3.5 w-3.5" /> Подождать:
                </p>
                {day.wait.map((s, i) => <p key={i} className={`text-[11px] ${theme.text} mb-1`}>• {s}</p>)}
              </div>
            )}
          </div>

          {/* Compensatorics */}
          {day.compensatorics.length > 0 && (
            <div>
              <p className={`text-xs font-semibold ${theme.accent} mb-2 flex items-center gap-1.5`}>
                <Activity className="h-3.5 w-3.5" /> Компенсаторика (метод Андреева):
              </p>
              <p className={`text-[11px] ${theme.text} opacity-50 mb-2`}>
                Чтобы снять напряжение одной планеты — работайте с принципом её компенсатора.
              </p>
              <div className="space-y-2">
                {day.compensatorics.map((c, i) => (
                  <CompensatoryCard key={i} comp={c} isDark={isDark} theme={theme} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── ГЛАВНЫЙ КОМПОНЕНТ ─────────────────────────────────────────────────────────

interface DailyForecastViewProps {
  baseTransits: BaseTransits;
  startDate: string;
  days: 7 | 14 | 30;
  birth: BirthInput;
  theme: ThemeLike;
  natalPlanets?: Record<string, TransitPlanetData>;
}

export default function DailyForecastView({
  baseTransits, startDate, days, birth, theme, natalPlanets,
}: DailyForecastViewProps) {
  const isDark = theme.wheelTheme === 'dark';

  // Natal planet positions from birth data (approximated or from result)
  const natalMap = useMemo<Record<string, TransitPlanetData>>(() => {
    if (natalPlanets && Object.keys(natalPlanets).length > 0) return natalPlanets;
    // Fallback: use the natal aspects targets from baseTransits to approximate natal planets
    const approx: Record<string, TransitPlanetData> = {};
    for (const asp of baseTransits.aspects) {
      const np = asp.natal_planet;
      if (!approx[np]) {
        // We don't have the exact natal longitude from aspects alone — use 0 as placeholder
        // The aspects themselves will be used for scoring
        approx[np] = { lon: 0, sign: 'aries', deg_min: "0\u00b000'" };
      }
    }
    return approx;
  }, [natalPlanets, baseTransits.aspects]);

  // Generate forecasts for each day
  const forecasts = useMemo<DayForecast[]>(() => {
    const result: DayForecast[] = [];
    const baseDate = new Date(`${startDate}T12:00:00`);

    for (let i = 0; i < days; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);

      // Project all transit planets
      const projectedPlanets = projectPlanets(baseTransits.transit_planets, i);

      // Project aspects: slow outer planets barely move, so orbs stay similar
      // We apply a small drift based on planet speeds
      const projectedAspects: TransitAspect[] = baseTransits.aspects.map(asp => {
        const speed = PLANET_SPEEDS[asp.transit_planet] ?? 0;
        // Rough approximation: orb changes by ~speed * days for the aspect
        const orbDrift = Math.abs(speed * i * 0.1); // small perturbation
        return { ...asp, orb: Math.max(0, asp.orb - orbDrift) };
      }).filter(asp => asp.orb <= 10);

      result.push(generateDayForecast(dateStr, projectedPlanets, natalMap, projectedAspects));
    }
    return result;
  }, [baseTransits, startDate, days, natalMap]);

  // Summary stats
  const goodDays = forecasts.filter(d => d.energyScore >= 62).length;
  const toughDays = forecasts.filter(d => d.energyScore < 48).length;
  const bestDay = forecasts.reduce((best, d) => d.energyScore > best.energyScore ? d : best, forecasts[0]);
  const worstDay = forecasts.reduce((worst, d) => d.energyScore < worst.energyScore ? d : worst, forecasts[0]);
  const voidDays = forecasts.filter(d => d.voidOfCourse).length;
  const compDays = forecasts.filter(d => d.compensatorics.length > 0).length;
  // Top 3 days for "best windows"
  const topDays = [...forecasts].sort((a, b) => b.energyScore - a.energyScore).slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className={`rounded-2xl border p-4 ${isDark ? 'bg-gradient-to-br from-indigo-900/25 to-slate-900/40 border-indigo-500/25' : 'bg-gradient-to-br from-indigo-50 to-slate-50 border-indigo-200'}`}>
        <h3 className={`font-bold text-sm ${theme.header} mb-3 flex items-center gap-2`}>
          <Activity className="h-4 w-4" /> Обзор периода: {days} дней
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Благоприятных', value: goodDays, icon: '🟢', color: '#22c55e' },
            { label: 'Сложных', value: toughDays, icon: '🔴', color: '#ef4444' },
            { label: 'Без курса Луны', value: voidDays, icon: '⚫', color: '#94a3b8' },
            { label: 'Компенсаторика', value: compDays, icon: '⚡', color: '#f97316' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${isDark ? 'bg-slate-800/60' : 'bg-white border border-slate-100'}`}>
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-lg font-black" style={{ color: s.color }}>{s.value}</div>
              <div className={`text-[10px] ${theme.text} opacity-60 mt-0.5`}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Best windows highlight */}
        {topDays.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className={`text-[11px] font-semibold ${theme.accent} mb-1`}>⭐ Лучшие дни периода:</p>
            {topDays.map((d, i) => (
              <div key={d.date} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${isDark ? 'bg-slate-800/50' : 'bg-white border border-slate-100'}`}>
                <span className={`text-xs font-bold w-4 text-center ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{i + 1}</span>
                <span className={`text-[11px] font-semibold ${theme.header} w-16 shrink-0`}>{d.dayLabel} {d.weekday.slice(0,2)}</span>
                <div className="w-8 h-1.5 rounded-full" style={{ backgroundColor: d.energyColor }} />
                <span className={`text-[10px] font-semibold`} style={{ color: d.energyColor }}>{d.energyLabel}</span>
                <span className={`text-[10px] ${theme.text} opacity-55 flex-1 min-w-0 truncate`}>{d.headline}</span>
              </div>
            ))}
          </div>
        )}

        {worstDay && worstDay.date !== bestDay?.date && (
          <p className={`text-[11px] mt-1 ${theme.text} opacity-50`}>
            ⚠ Осторожно: <b>{worstDay.dayLabel} ({worstDay.weekday})</b> — {worstDay.energyLabel} ({worstDay.energyScore}/100)
          </p>
        )}
        <p className={`text-[10px] mt-1.5 ${theme.text} opacity-40`}>
          * Расчёт на основе транзитов — один API-вызов + локальная проекция по скоростям планет.
          Для абсолютной точности сравнивайте с вкладкой «Транзиты» по каждой дате.
        </p>
      </div>

      {/* Energy calendar bar */}
      <div className={`rounded-2xl border p-4 ${theme.card}`}>
        <p className={`text-xs font-semibold ${theme.accent} mb-3`}>📊 Энергетическая карта периода:</p>
        <div className="flex gap-1 flex-wrap">
          {forecasts.map(d => (
            <div key={d.date} className="flex flex-col items-center gap-0.5 cursor-default" title={`${d.dayLabel} ${d.weekday}: ${d.energyLabel}`}>
              <div className="w-5 rounded-t-sm" style={{ height: `${Math.round(d.energyScore * 0.3)}px`, backgroundColor: d.energyColor, minHeight: '4px' }} />
              <span className={`text-[8px] ${theme.text} opacity-40`}>{d.dayLabel.split('.')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day cards */}
      <div className="space-y-3">
        {forecasts.map((day, idx) => (
          <DayCard
            key={day.date}
            day={day}
            isDark={isDark}
            theme={theme}
            defaultOpen={idx === 0}
          />
        ))}
      </div>
    </div>
  );
}
