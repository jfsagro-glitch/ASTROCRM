import React, { useState, useMemo } from 'react';
import type { NatalChart } from '../types/astro';
import { SIGN_ELEMENTS } from '../types/astro';
import {
  PLANET_ARCHETYPES,
  ELEMENT_PROFILES,
  MODALITY_PROFILES,
  PROFECTION_THEMES,
  NORTH_NODE_IN_SIGN,
  NORTH_NODE_IN_HOUSE,
  PATTERN_GIFTS,
  SIGN_SUN_ESSENCE,
  SIGN_MOON_ESSENCE,
  SIGN_ASC_ESSENCE,
  LIFE_PHASE_BY_AGE,
  TAU_PROFILES,
  TAU_ARCHETYPE_PROFILES,
  HOLOS_INSTRUMENTS_META,
} from '../data/holosData';

// ─── Sign helpers ─────────────────────────────────────────────────────────────

const SIGN_MODALITY: Record<string, string> = {
  aries: 'cardinal', cancer: 'cardinal', libra: 'cardinal', capricorn: 'cardinal',
  taurus: 'fixed', leo: 'fixed', scorpio: 'fixed', aquarius: 'fixed',
  gemini: 'mutable', virgo: 'mutable', sagittarius: 'mutable', pisces: 'mutable',
};

const SIGN_RULER: Record<string, string> = {
  aries: 'mars', taurus: 'venus', gemini: 'mercury', cancer: 'moon',
  leo: 'sun', virgo: 'mercury', libra: 'venus', scorpio: 'pluto',
  sagittarius: 'jupiter', capricorn: 'saturn', aquarius: 'uranus', pisces: 'neptune',
};

const SIGN_RU: Record<string, string> = {
  aries: 'Овен', taurus: 'Телец', gemini: 'Близнецы', cancer: 'Рак',
  leo: 'Лев', virgo: 'Дева', libra: 'Весы', scorpio: 'Скорпион',
  sagittarius: 'Стрелец', capricorn: 'Козерог', aquarius: 'Водолей', pisces: 'Рыбы',
};

const PLANET_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера', mars: 'Марс',
  jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон',
};

const ELEMENT_ICON: Record<string, string> = {
  fire: '🔥', earth: '🌱', air: '💨', water: '🌊',
};

// ─── HOLOS Biographical Mathematics Engine ────────────────────────────────────

const HOLOS_ALPHA = 137.035999084;
const HOLOS_PHI   = 1.6180339887498948;
const HOLOS_SAT   = 29.4701;
const HOLOS_JUP   = 11.8618;
const HOLOS_NODE  = 18.6134;
const HOLOS_LUNAR9  = 9.3;
const HOLOS_FIBO  = [5, 8, 13, 21, 34, 55, 89];

function birthToDecimal(birthDate: string): number {
  const d = new Date(birthDate);
  const year = d.getFullYear();
  const startOfYear = new Date(year, 0, 1).getTime();
  const startOfNext = new Date(year + 1, 0, 1).getTime();
  const seconds = d.getTime() - startOfYear;
  return year + seconds / (startOfNext - startOfYear);
}

function getNowDecimal(): number {
  return birthToDecimal(new Date().toISOString().slice(0, 10));
}

function cyclicPhase(ageNow: number, period: number): number {
  if (period <= 0) return 0;
  return Math.round(((ageNow % period) / period) * 1000) / 1000;
}

// Оценка TAU по стихии + модальности (когда профессия неизвестна)
function estimateTauFromElement(element: string, modality: string): number {
  const base: Record<string, number> = { fire: 3.7, earth: 4.8, air: 4.0, water: 4.7 };
  const mod: Record<string, number> = { cardinal: -0.3, fixed: 0.3, mutable: 0.0 };
  const tau = (base[element] ?? 4.0) + (mod[modality] ?? 0.0);
  return Math.round(tau * 100) / 100;
}

function getTauArchetypeCode(tau: number): string {
  if (tau < 2.0) return 'sprint';
  if (tau < 3.5) return 'dynamic';
  if (tau < 4.5) return 'balanced';
  if (tau < 6.0) return 'deep';
  return 'monumental';
}

// Найти профессии с близким TAU (±0.5)
function getSimilarProfessions(tau: number): string[] {
  const labels: Record<string, string> = {
    mathematician: 'Математик', activist: 'Активист', military_leader: 'Военный',
    architect: 'Архитектор', explorer: 'Исследователь', politician: 'Политик',
    painter: 'Художник', poet: 'Поэт', revolutionary: 'Революционер', writer: 'Писатель',
    biologist: 'Биолог', chemist: 'Химик', monarch: 'Монарх', physician: 'Врач',
    playwright: 'Драматург', entrepreneur: 'Предприниматель', composer: 'Композитор',
    geologist: 'Геолог', conductor: 'Дирижёр', director: 'Режиссёр', musician: 'Музыкант',
    sculptor: 'Скульптор', physicist: 'Физик', boxer: 'Боксёр', engineer: 'Инженер',
    novelist: 'Романист', singer: 'Певец', actor: 'Актёр', football_player: 'Футболист',
    swimmer: 'Пловец', tennis_player: 'Теннисист',
  };
  return Object.entries(TAU_PROFILES)
    .filter(([, p]) => Math.abs(p.tauMedian - tau) <= 0.5)
    .sort((a, b) => Math.abs(a[1].tauMedian - tau) - Math.abs(b[1].tauMedian - tau))
    .slice(0, 4)
    .map(([key]) => labels[key] ?? key);
}

// Следующие пики TAU (от текущей даты)
function getNextTauPeaks(birth: number, tau: number, now: number, count = 3): number[] {
  const age = now - birth;
  const peaks: number[] = [];
  let k = Math.floor(age / tau) + 1;
  while (peaks.length < count) {
    peaks.push(birth + tau * k);
    k++;
  }
  return peaks;
}

// Текущая фаза TAU (где мы в цикле)
function getTauPhaseName(phase: number): string {
  if (phase < 0.2) return 'Старт волны';
  if (phase < 0.45) return 'Нарастание';
  if (phase < 0.6) return 'Пик активности';
  if (phase < 0.8) return 'Интеграция';
  return 'Созревание перед пиком';
}

interface HolosWindow {
  label: string;
  age: number;
  year: number;
  type: string;
  eventTypes: string[];
  multiplier: string;
  pVal: string;
  color: string;
  icon: string;
  description: string;
  status: 'passed' | 'active' | 'upcoming_near' | 'upcoming';
}

function computeHolosWindows(birth: number, now: number): HolosWindow[] {
  const age = now - birth;
  const windows: HolosWindow[] = [];

  function status(nodeAge: number): HolosWindow['status'] {
    const diff = nodeAge - age;
    if (diff < -1.5) return 'passed';
    if (diff <= 1.5) return 'active';
    if (diff <= 5) return 'upcoming_near';
    return 'upcoming';
  }

  // Alpha резонансы (n=2..9 — подтверждённые инструменты)
  const alphaData: Record<number, { eventTypes: string[]; mult: string; pVal: string; color: string; icon: string; desc: string }> = {
    2: { eventTypes: ['Сильный резонанс'], mult: '34×', pVal: '0', color: 'red', icon: '⚡', desc: 'α/2 ≈ 68.5л — мощнейший резонанс всей жизни' },
    3: { eventTypes: ['Кризис', 'Трансформация'], mult: '22.8×', pVal: '0', color: 'red', icon: '⚡', desc: 'α/3 ≈ 45.7л — радикальный кризис идентичности' },
    4: { eventTypes: ['Карьерный прорыв'], mult: '1.28×', pVal: '1.25e-103', color: 'amber', icon: '🚀', desc: 'α/4 ≈ 34.3л — второй мощный карьерный импульс' },
    5: { eventTypes: ['Брак', 'Карьера'], mult: '1.47×', pVal: '4.2e-66', color: 'pink', icon: '💑', desc: 'α/5 ≈ 27.4л — сильнейший предиктор брака' },
    6: { eventTypes: ['Карьерный старт', 'Рост'], mult: '1.30×', pVal: '0', color: 'yellow', icon: '🎓', desc: 'α/6 ≈ 22.8л — активизация первого карьерного вектора' },
    7: { eventTypes: ['Карьерный рост'], mult: '1.08×', pVal: '2.2e-4', color: 'teal', icon: '📈', desc: 'α/7 ≈ 19.6л — первый взрослый карьерный шаг' },
    8: { eventTypes: ['Развитие', 'Первые успехи'], mult: '1.05×', pVal: '0.01', color: 'cyan', icon: '🌱', desc: 'α/8 ≈ 17.1л — начало профессионального формирования' },
    9: { eventTypes: ['Старт', 'Юность'], mult: '1.03×', pVal: '0.05', color: 'blue', icon: '✨', desc: 'α/9 ≈ 15.2л — самоопределение' },
  };
  for (const [nStr, info] of Object.entries(alphaData)) {
    const n = parseInt(nStr);
    const nodeAge = HOLOS_ALPHA / n;
    if (nodeAge <= 100) {
      windows.push({
        label: `α/${n}`,
        age: Math.round(nodeAge * 10) / 10,
        year: Math.round((birth + nodeAge) * 10) / 10,
        type: 'alpha',
        eventTypes: info.eventTypes,
        multiplier: info.mult,
        pVal: info.pVal,
        color: info.color,
        icon: info.icon,
        description: info.desc,
        status: status(nodeAge),
      });
    }
  }

  // Phi ворота (φ^n — подтверждённые)
  const phiData: Record<number, { eventTypes: string[]; mult: string; pVal: string; color: string; icon: string; desc: string }> = {
    7: { eventTypes: ['Брак', 'Карьерный прорыв'], mult: '1.40×', pVal: '1.96e-46', color: 'amber', icon: '🌟', desc: 'φ⁷ ≈ 29.0л — золотые ворота взрослой реализации' },
    8: { eventTypes: ['Кризис', 'Карьерный разворот'], mult: '2.46×', pVal: '0', color: 'orange', icon: '🌀', desc: 'φ⁸ ≈ 47.0л — ворота среднего кризиса и перерождения' },
    9: { eventTypes: ['Итог жизни', 'Наследие'], mult: '2.65×', pVal: '0', color: 'violet', icon: '🔮', desc: 'φ⁹ ≈ 76.0л — ворота мудрости и итогов (продолжительность жизни)' },
  };
  const superscripts: Record<string, string> = { '7': '⁷', '8': '⁸', '9': '⁹' };
  for (const [nStr, info] of Object.entries(phiData)) {
    const n = parseInt(nStr);
    const nodeAge = Math.pow(HOLOS_PHI, n);
    if (nodeAge <= 100) {
      windows.push({
        label: `φ${superscripts[nStr] ?? nStr}`,
        age: Math.round(nodeAge * 10) / 10,
        year: Math.round((birth + nodeAge) * 10) / 10,
        type: 'phi',
        eventTypes: info.eventTypes,
        multiplier: info.mult,
        pVal: info.pVal,
        color: info.color,
        icon: info.icon,
        description: info.desc,
        status: status(nodeAge),
      });
    }
  }

  // Saturn returns
  const satData = [
    { k: 1, eventTypes: ['Брак', 'Кризис идентичности'], mult: '1.40×', pVal: '4.04e-46', color: 'slate', icon: '🪐', desc: 'Первый возврат Сатурна — принятие взрослой жизни' },
    { k: 2, eventTypes: ['Итог жизни', 'Мудрость', 'Кризис'], mult: '2.44×', pVal: '0', color: 'purple', icon: '⏳', desc: 'Второй возврат Сатурна — эпохальная переоценка всего пройденного' },
    { k: 3, eventTypes: ['Итог', 'Освобождение'], mult: '1.5×', pVal: '0.01', color: 'violet', icon: '🌌', desc: 'Третий возврат Сатурна — освобождение от кармы' },
  ];
  for (const { k, eventTypes, mult, pVal, color, icon, desc } of satData) {
    const nodeAge = HOLOS_SAT * k;
    if (nodeAge <= 100) {
      windows.push({
        label: `♄ ×${k}`,
        age: Math.round(nodeAge * 10) / 10,
        year: Math.round((birth + nodeAge) * 10) / 10,
        type: 'saturn',
        eventTypes,
        multiplier: mult,
        pVal,
        color,
        icon,
        description: desc,
        status: status(nodeAge),
      });
    }
  }

  // Hamming cycles
  const hammingData = [
    { period: 31, label: 'H31', eventTypes: ['Брак', 'Карьера', 'Реорганизация'], mult: '1.36×', pVal: '1.12e-35', color: 'cyan', icon: '🔄', desc: 'Хэмминг 31 — цикл перезагрузки жизненной стратегии' },
    { period: 63, label: 'H63', eventTypes: ['Кризис', 'Трансформация', 'Наследие'], mult: '2.40×', pVal: '0', color: 'red', icon: '🔥', desc: 'Хэмминг 63 — время переосмысления всей прожитой жизни' },
  ];
  for (const { period, label, eventTypes, mult, pVal, color, icon, desc } of hammingData) {
    for (let k = 1; k * period <= 100; k++) {
      const nodeAge = period * k;
      windows.push({
        label: `${label}×${k}`,
        age: nodeAge,
        year: birth + nodeAge,
        type: 'hamming',
        eventTypes,
        multiplier: mult,
        pVal,
        color,
        icon,
        description: `${desc} (${nodeAge}л)`,
        status: status(nodeAge),
      });
    }
  }

  // Fibonacci ages
  for (const fib of HOLOS_FIBO) {
    if (fib <= 100) {
      const isMajor = fib === 21 || fib === 34 || fib === 55;
      windows.push({
        label: `Фиб ${fib}`,
        age: fib,
        year: birth + fib,
        type: 'fibonacci',
        eventTypes: fib === 34 ? ['Карьера', 'Кризис 1/3 жизни'] : fib === 21 ? ['Старт', 'Первые достижения'] : ['Развитие', 'Рост'],
        multiplier: fib === 34 ? '1.74×' : isMajor ? '1.2×' : '1.0×',
        pVal: fib === 34 ? '2.67e-63' : '—',
        color: 'teal',
        icon: '🌀',
        description: `Число Фибоначчи ${fib} — природный ритм жизни`,
        status: status(fib),
      });
    }
  }

  // Jupiter cycle (менее значимый но показательный)
  for (let k = 1; k * HOLOS_JUP <= 100; k++) {
    const nodeAge = HOLOS_JUP * k;
    windows.push({
      label: `♃ ×${k}`,
      age: Math.round(nodeAge * 10) / 10,
      year: Math.round((birth + nodeAge) * 10) / 10,
      type: 'jupiter',
      eventTypes: ['Удача', 'Расширение'],
      multiplier: '1.0×',
      pVal: '—',
      color: 'indigo',
      icon: '🎯',
      description: `Юпитер ×${k} (${nodeAge.toFixed(1)}л) — расширение возможностей`,
      status: status(nodeAge),
    });
  }

  return windows.sort((a, b) => a.age - b.age);
}

// Core Hash — биографический отпечаток
function computeCoreHash(birth: number, tau: number, now: number): string {
  const age = now - birth;
  const tauCode = `τ${tau.toFixed(1)}`;

  let phiCode = 'φ?';
  for (let n = 1; n <= 12; n++) {
    if (Math.pow(HOLOS_PHI, n) > age) { phiCode = `φ${n}`; break; }
  }

  let alphaCode = 'α?';
  let minDiff = Infinity;
  for (let n = 2; n <= 12; n++) {
    const diff = Math.abs(HOLOS_ALPHA / n - age);
    if (diff < minDiff) { minDiff = diff; alphaCode = `α${n}`; }
  }

  const satN = Math.floor(age / HOLOS_SAT);
  const satCode = `S${satN}`;
  const nextFib = HOLOS_FIBO.find(f => f > age) ?? 89;
  const fibCode = `F${nextFib}`;

  return `${tauCode} · ${phiCode} · ${alphaCode} · ${satCode} · ${fibCode}`;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MONTHS_RU = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

function decimalToMonthYear(decYear: number): string {
  const year = Math.floor(decYear);
  const monthIdx = Math.round((decYear - year) * 12);
  if (monthIdx >= 12) return `Янв ${year + 1}`;
  return `${MONTHS_RU[monthIdx]} ${year}`;
}

function windowDates(birth: number, windowAge: number): { start: string; peak: string; end: string } {
  const peakDec = birth + windowAge;
  return {
    start: decimalToMonthYear(peakDec - 1.5),
    peak:  decimalToMonthYear(peakDec),
    end:   decimalToMonthYear(peakDec + 1.5),
  };
}

// ─── Per-window interpretation ────────────────────────────────────────────────

const WINDOW_INTERP: Record<string, { what: string; focus: string; tip: string }> = {
  'alpha_3': {
    what: 'α/3 — один из мощнейших биографических предикторов. Время кардинального пересмотра идентичности: кто вы есть вне чужих ожиданий?',
    focus: 'Освобождение от ролей, которые больше не ваши. Переосмысление направления жизни на следующие 20 лет.',
    tip: 'Действуйте после осмысления, не в аффекте. Опасность — импульсивные разрывы, о которых потом жалеют.',
  },
  'alpha_4': {
    what: 'α/4 ≈ 34.3л — второй по силе альфа-узел. Карьерный прорыв и переход в лидерскую фазу.',
    focus: 'Инвестируйте в профессиональный рост, публичность, расширение зоны ответственности.',
    tip: 'Это окно открывается редко — не упустите момент для решительного шага вверх.',
  },
  'alpha_5': {
    what: 'α/5 ≈ 27.4л — сильнейший предиктор брака и первых серьёзных карьерных обязательств.',
    focus: 'Выбор спутника жизни и базового профессионального пути. Решения этого периода определяют следующие 15 лет.',
    tip: 'Не торопитесь и не медлите. Ясность намерений здесь критически важна.',
  },
  'alpha_6': {
    what: 'α/6 ≈ 22.8л — первый карьерный вектор. Стартовая позиция в профессии.',
    focus: 'Определение поля деятельности, первые серьёзные профессиональные шаги.',
    tip: 'Широко пробуйте — это время познания, а не окончательных обязательств.',
  },
  'alpha_2': {
    what: 'α/2 ≈ 68.5л — мощнейший резонанс всей биографии. Время итогов, наследия и глубочайшей трансформации.',
    focus: 'Что вы хотите оставить миру? Кристаллизация жизненного смысла и передача опыта.',
    tip: 'Это редкий дар — отнеситесь к нему как к финальному шедевру.',
  },
  'phi_7': {
    what: 'φ⁷ ≈ 29.0л — "золотые ворота" взрослой реализации. Время первого серьёзного брака и/или карьерного становления.',
    focus: 'Вход в полноценную взрослую жизнь. Принятие ответственности за своё будущее.',
    tip: 'Доверяйте структуре — что заложено здесь, прорастёт через 10-15 лет.',
  },
  'phi_8': {
    what: 'φ⁸ ≈ 47.0л — "ворота перерождения". Средний кризис с максимальной статистической плотностью карьерных разворотов.',
    focus: 'Это не кризис — это линька. Готовьтесь к новой профессиональной и личной идентичности.',
    tip: 'Не форсируйте выход. Дайте 1-2 года на осознание нового направления прежде чем действовать.',
  },
  'phi_9': {
    what: 'φ⁹ ≈ 76.0л — "ворота мудрости". Время подведения итогов и передачи наследия.',
    focus: 'Кристаллизация жизненного смысла. Ваш опыт — дар для следующих поколений.',
    tip: 'Скажите главное. Напишите, запишите, передайте — то, что вы знаете.',
  },
  'saturn_1': {
    what: 'Первый возврат Сатурна (≈29.5л) — вход в подлинную взрослость. Отброс ненастоящего.',
    focus: 'Пересмотр всего, что было взято «по умолчанию» — отношений, работы, ценностей.',
    tip: 'Это больно, но необходимо. Дальше строите только своё — не чужое.',
  },
  'saturn_2': {
    what: 'Второй возврат Сатурна (≈59.0л) — эпохальная переоценка прожитого. Время мастерства.',
    focus: 'Что осталось важным? Что пора отпустить? Начало нового 30-летнего цикла.',
    tip: 'Ваш опыт уникален. Передавайте его — это ваш главный ресурс в этот период.',
  },
  'fibonacci_34': {
    what: 'Фибоначчи-34 — природный кризис "одной трети жизни". Переход к зрелой идентичности.',
    focus: 'Первое серьёзное переосмысление выбранного пути. Проверка подлинности.',
    tip: 'Задайте себе честный вопрос: "Это моя жизнь или жизнь, которую от меня ждут?"',
  },
  'fibonacci_55': {
    what: 'Фибоначчи-55 — рубеж мудрости. Накопленный опыт начинает работать на вас.',
    focus: 'Синтез всего пережитого в систему знаний. Наставничество, преподавание, творческий итог.',
    tip: 'Ваши "шрамы" — ваша ценность. Не скрывайте, а делитесь.',
  },
  'hamming_31': {
    what: 'Хэмминг-31 — цикл перезагрузки стратегии. Глубокий разворот жизненного курса.',
    focus: 'Перестройка ключевых жизненных систем: карьеры, отношений, места жительства.',
    tip: 'Пришло время закрыть незакрытые главы и начать новую.',
  },
};

function getWindowInterp(w: HolosWindow): { what: string; focus: string; tip: string } | null {
  const key = w.type === 'alpha' ? `alpha_${w.label.replace('α/', '')}` :
              w.type === 'phi' ? `phi_${w.label.replace('φ', '').replace(/[⁷⁸⁹]/, n => ({'⁷':'7','⁸':'8','⁹':'9'}[n]??n))}` :
              w.type === 'saturn' ? `saturn_${w.label.replace('♄ ×', '')}` :
              w.type === 'fibonacci' && w.age === 34 ? 'fibonacci_34' :
              w.type === 'fibonacci' && w.age === 55 ? 'fibonacci_55' :
              w.type === 'hamming' && w.label.startsWith('H31') ? 'hamming_31' : null;
  return key ? WINDOW_INTERP[key] ?? null : null;
}

const TAU_PHASE_INTERP: Record<string, string> = {
  'Старт волны':        'Новый цикл только открылся. Энергия нарастает. Время закладывать фундамент и делать первые решительные шаги.',
  'Нарастание':         'Цикл набирает силу. Запущенные проекты начинают отдавать. Наращивайте темп — сейчас это работает.',
  'Пик активности':     'Вы на пике своего биоритма. Максимальная эффективность и видимость. Действуйте смело — это ваше окно.',
  'Интеграция':         'Пик позади. Время осмыслить пройденное, интегрировать опыт и передать наработанное. Не форсируйте новое.',
  'Созревание перед пиком': 'Цикл завершается. Закрывайте незавершённое и готовьтесь к новому витку — он уже близко.',
};

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface HolosBlockProps {
  chart: NatalChart;
  birthDate: string; // e.g. "1986-08-13"
}

interface ForecastPeriod {
  label: string;
  dateRange: string;
  theme: string;
  opportunity: string;
  caution: string;
  actions: string[];
  intensity: number;
  colorName: string;
  affirmation: string;
}

// ─── Algorithms ───────────────────────────────────────────────────────────────

function findDominantPlanet(chart: NatalChart): string {
  const planets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const ascSign = chart.houses['h1']?.sign ?? '';
  const mcSign = chart.houses['h10']?.sign ?? '';

  const scores: Record<string, number> = {};

  for (const p of planets) {
    const pd = chart.planets[p];
    if (!pd) continue;
    let score = 0;

    // Dignity score
    const dignityScore = chart.dignities?.[p]?.score ?? 0;
    score += dignityScore * 2;

    // Angular house
    const h = pd.house;
    if (h === 1 || h === 10) score += 5;
    else if (h === 4 || h === 7) score += 2;

    // Aspect count
    const aspectCount = chart.aspects.filter(a => a.p1 === p || a.p2 === p).length;
    score += aspectCount * 0.5;

    // Rules ASC sign
    if (SIGN_RULER[ascSign] === p) score += 4;

    // Rules MC sign
    if (SIGN_RULER[mcSign] === p) score += 3;

    // Personal planet bonus
    if (['sun', 'moon', 'mercury', 'venus', 'mars'].includes(p)) score += 1;

    scores[p] = score;
  }

  return planets.reduce((best, p) => (scores[p] ?? 0) > (scores[best] ?? 0) ? p : best, 'sun');
}

function getDominantElement(chart: NatalChart): {
  element: string;
  counts: { fire: number; earth: number; air: number; water: number };
} {
  const core = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const counts = { fire: 0, earth: 0, air: 0, water: 0 };

  for (const p of core) {
    const pd = chart.planets[p];
    if (!pd) continue;
    const el = SIGN_ELEMENTS[pd.sign] as keyof typeof counts | undefined;
    if (el && el in counts) counts[el]++;
  }

  const element = (Object.keys(counts) as Array<keyof typeof counts>).reduce(
    (best, el) => counts[el] > counts[best as keyof typeof counts] ? el : best,
    'fire' as string
  );

  return { element, counts };
}

function getDominantModality(chart: NatalChart): {
  modality: string;
  counts: { cardinal: number; fixed: number; mutable: number };
} {
  const core = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const counts = { cardinal: 0, fixed: 0, mutable: 0 };

  for (const p of core) {
    const pd = chart.planets[p];
    if (!pd) continue;
    const mod = SIGN_MODALITY[pd.sign] as keyof typeof counts | undefined;
    if (mod && mod in counts) counts[mod]++;
  }

  const modality = (Object.keys(counts) as Array<keyof typeof counts>).reduce(
    (best, mod) => counts[mod] > counts[best as keyof typeof counts] ? mod : best,
    'cardinal' as string
  );

  return { modality, counts };
}

function computeProfectionHouse(birthDate: string): number {
  if (!birthDate) return 1;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasBirthdayPassed) age--;
  return (age % 12) + 1;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${start.toLocaleDateString('ru-RU', opts)} – ${end.toLocaleDateString('ru-RU', opts)}`;
}

function computeLifePhase(birthDate: string): typeof LIFE_PHASE_BY_AGE[0] {
  if (!birthDate) return LIFE_PHASE_BY_AGE[3];
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--;
  return LIFE_PHASE_BY_AGE.find(p => age >= p.minAge && age < p.maxAge) ?? LIFE_PHASE_BY_AGE[LIFE_PHASE_BY_AGE.length - 1];
}

function buildForecastPeriods(chart: NatalChart, birthDate: string): ForecastPeriod[] {
  const today = new Date();
  const profHouse = computeProfectionHouse(birthDate);
  const nextProfHouse = (profHouse % 12) + 1;

  // Intensity based on house importance + patterns
  const patternBonus = Object.values(chart.patterns).filter(Boolean).length;
  const baseIntensity = [1, 10, 4, 7].includes(profHouse) ? 4 : 3;
  const intensity = Math.min(5, baseIntensity + Math.floor(patternBonus / 2));

  const periodColors = ['amber', 'sky', 'violet', 'indigo'];

  const ranges = [
    { label: 'Сейчас', offset: 0, duration: 3 },
    { label: '+3 месяца', offset: 3, duration: 3 },
    { label: '+6 месяцев', offset: 6, duration: 3 },
    { label: '+12 месяцев', offset: 11, duration: 3 },
  ];

  return ranges.map((r, i) => {
    const start = addMonths(today, r.offset);
    const end = addMonths(today, r.offset + r.duration);
    const house = i === 3 ? nextProfHouse : profHouse;
    const theme = PROFECTION_THEMES[house];

    return {
      label: r.label,
      dateRange: formatDateRange(start, end),
      theme: theme?.theme ?? `Год Дома ${house}`,
      opportunity: theme?.opportunity ?? 'Период активного роста и новых возможностей.',
      caution: theme?.caution ?? 'Сохраняйте баланс и осознанность.',
      actions: theme?.bestActions ?? ['Ставьте цели', 'Действуйте системно', 'Опирайтесь на сильные стороны', 'Принимайте поддержку'],
      intensity: i === 0 ? Math.min(5, intensity) : Math.max(1, intensity - (i % 2)),
      colorName: periodColors[i],
      affirmation: theme?.affirmation ?? 'Я иду своим путём.',
    };
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold text-white/80 uppercase tracking-wider mb-3">
      <span className="text-amber-400">✦</span>
      {children}
    </h3>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 ${className}`}>
      {children}
    </div>
  );
}

function IntensityDots({ value }: { value: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${i <= value ? 'bg-amber-400' : 'bg-white/15'}`}
        />
      ))}
    </div>
  );
}

const COLOR_MAP: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  amber:  { text: 'text-amber-300',  bg: 'bg-amber-500/10',  border: 'border-amber-400/30',  dot: 'bg-amber-400' },
  sky:    { text: 'text-sky-300',    bg: 'bg-sky-500/10',    border: 'border-sky-400/30',    dot: 'bg-sky-400' },
  violet: { text: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-400/30', dot: 'bg-violet-400' },
  indigo: { text: 'text-indigo-300', bg: 'bg-indigo-500/10', border: 'border-indigo-400/30', dot: 'bg-indigo-400' },
  pink:   { text: 'text-pink-300',   bg: 'bg-pink-500/10',   border: 'border-pink-400/30',   dot: 'bg-pink-400' },
  red:    { text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-400/30',    dot: 'bg-red-400' },
  green:  { text: 'text-green-300',  bg: 'bg-green-500/10',  border: 'border-green-400/30',  dot: 'bg-green-400' },
  teal:   { text: 'text-teal-300',   bg: 'bg-teal-500/10',   border: 'border-teal-400/30',   dot: 'bg-teal-400' },
  yellow: { text: 'text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-400/30', dot: 'bg-yellow-400' },
  cyan:   { text: 'text-cyan-300',   bg: 'bg-cyan-500/10',   border: 'border-cyan-400/30',   dot: 'bg-cyan-400' },
  purple: { text: 'text-purple-300', bg: 'bg-purple-500/10', border: 'border-purple-400/30', dot: 'bg-purple-400' },
  slate:  { text: 'text-slate-300',  bg: 'bg-slate-500/10',  border: 'border-slate-400/30',  dot: 'bg-slate-400' },
  orange: { text: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-400/30', dot: 'bg-orange-400' },
  blue:   { text: 'text-blue-300',   bg: 'bg-blue-500/10',   border: 'border-blue-400/30',   dot: 'bg-blue-400' },
};

const PLANET_COLOR: Record<string, string> = {
  sun: 'amber', moon: 'sky', mercury: 'yellow', venus: 'pink',
  mars: 'red', jupiter: 'indigo', saturn: 'slate', uranus: 'cyan',
  neptune: 'violet', pluto: 'purple',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HolosBlock({ chart, birthDate }: HolosBlockProps) {
  const [activeTab, setActiveTab] = useState<'essence' | 'gifts' | 'forecast' | 'path' | 'rhythms'>('essence');
  const [selectedPeriod, setSelectedPeriod] = useState(0);

  // ─── Computed values ───────────────────────────────────────────────────────

  const dominantPlanet = useMemo(() => findDominantPlanet(chart), [chart]);
  const { element: dominantElement, counts: elementCounts } = useMemo(() => getDominantElement(chart), [chart]);
  const { modality: dominantModality, counts: modalityCounts } = useMemo(() => getDominantModality(chart), [chart]);
  const profectionHouse = useMemo(() => computeProfectionHouse(birthDate), [birthDate]);
  const forecastPeriods = useMemo(() => buildForecastPeriods(chart, birthDate), [chart, birthDate]);
  const lifePhase = useMemo(() => computeLifePhase(birthDate), [birthDate]);

  const archetype = PLANET_ARCHETYPES[dominantPlanet] ?? PLANET_ARCHETYPES.sun;
  const elementProfile = ELEMENT_PROFILES[dominantElement] ?? ELEMENT_PROFILES.fire;
  const modalityProfile = MODALITY_PROFILES[dominantModality] ?? MODALITY_PROFILES.cardinal;
  const profectionTheme = PROFECTION_THEMES[profectionHouse];

  const sunSign = chart.planets.sun?.sign ?? '';
  const moonSign = chart.planets.moon?.sign ?? '';
  const ascSign = chart.houses.h1?.sign ?? '';

  const nodeSign = chart.planets.node?.sign ?? '';
  const nodeHouse = chart.planets.node?.house ?? 1;

  const domColor = PLANET_COLOR[dominantPlanet] ?? 'amber';
  const domColors = COLOR_MAP[domColor] ?? COLOR_MAP.amber;

  // Top 3 dignified planets
  const topPlanets = useMemo(() => {
    const core = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
    return core
      .map(p => ({ key: p, score: chart.dignities?.[p]?.score ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter(p => p.score > 0);
  }, [chart]);

  // Active patterns
  const activePatterns = useMemo(() =>
    Object.entries(chart.patterns).filter(([, v]) => v).map(([k]) => k),
    [chart]
  );

  // ─── HOLOS Biographical Mathematics ────────────────────────────────────────

  const holosData = useMemo(() => {
    const now = getNowDecimal();
    const birth = birthDate ? birthToDecimal(birthDate) : now - 35;
    const age = now - birth;

    // TAU — оценка от стихии/модальности
    const tau = estimateTauFromElement(dominantElement, dominantModality);
    const archetypeCode = getTauArchetypeCode(tau);
    const archetypeProfile = TAU_ARCHETYPE_PROFILES[archetypeCode] ?? TAU_ARCHETYPE_PROFILES.balanced;
    const tauPhase = cyclicPhase(age, tau);
    const tauPeaks = getNextTauPeaks(birth, tau, now, 4);
    const similarProfs = getSimilarProfessions(tau);

    // Средний hit_rate для данного tau
    const avgHitRate = Object.values(TAU_PROFILES)
      .filter(p => Math.abs(p.tauMedian - tau) <= 0.5)
      .reduce((acc, p, _, arr) => acc + p.hitRate / arr.length, 0);

    // Все окна событий
    const allWindows = computeHolosWindows(birth, now);
    const activeWindows = allWindows.filter(w => w.status === 'active');
    const nearWindows = allWindows.filter(w => w.status === 'upcoming_near').slice(0, 8);
    const recentPast = allWindows.filter(w => w.status === 'passed' && age - w.age <= 3).slice(-3);

    // Core Hash
    const coreHash = computeCoreHash(birth, tau, now);

    // Текущие фазы циклов
    const satPhase = cyclicPhase(age, HOLOS_SAT);
    const jupPhase = cyclicPhase(age, HOLOS_JUP);
    const lunar9Phase = cyclicPhase(age, HOLOS_LUNAR9);
    const nodePhase = cyclicPhase(age, HOLOS_NODE);

    // Saturn return status
    const satReturnN = Math.floor(age / HOLOS_SAT);
    const nextSatYear = birth + HOLOS_SAT * (satReturnN + 1);
    const nextJupYear = birth + HOLOS_JUP * (Math.floor(age / HOLOS_JUP) + 1);

    return {
      birth, age, now, tau, archetypeCode, archetypeProfile, tauPhase,
      tauPeaks, similarProfs, avgHitRate,
      allWindows, activeWindows, nearWindows, recentPast,
      coreHash, satPhase, jupPhase, lunar9Phase, nodePhase,
      satReturnN, nextSatYear, nextJupYear,
      tauPhaseName: getTauPhaseName(tauPhase),
    };
  }, [birthDate, dominantElement, dominantModality]);

  // ─── Render helpers ────────────────────────────────────────────────────────

  const tabs = [
    { key: 'essence' as const, label: 'Суть' },
    { key: 'gifts' as const, label: 'Дары' },
    { key: 'forecast' as const, label: 'Прогноз' },
    { key: 'path' as const, label: 'Путь' },
    { key: 'rhythms' as const, label: 'Ритмы' },
  ];

  const totalPlanets = elementCounts.fire + elementCounts.earth + elementCounts.air + elementCounts.water;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/80 via-indigo-950/30 to-slate-950/80 backdrop-blur-xl overflow-hidden">

      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <div className={`relative p-6 border-b border-white/10 ${domColors.bg}`}>
        <div className="flex items-start gap-5">
          <div className={`text-5xl ${domColors.text} shrink-0 leading-none`}>
            {archetype.symbol}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-widest text-white/40 font-medium">
                Доминирующий архетип
              </span>
            </div>
            <h2 className={`text-xl font-bold font-serif ${domColors.text} leading-tight mb-1`}>
              {archetype.name}
            </h2>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">{ELEMENT_ICON[archetype.element]}</span>
              <span className="text-sm text-white/60">
                {elementProfile.title.replace(/^[^ ]+ /, '')}
              </span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed line-clamp-3">
              {archetype.essence}
            </p>
          </div>
        </div>

        {/* Quick-stat chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          {sunSign && (
            <span className="px-3 py-1 rounded-full text-xs bg-amber-500/15 border border-amber-400/25 text-amber-300 font-medium">
              ☉ {SIGN_RU[sunSign] ?? sunSign}
            </span>
          )}
          {moonSign && (
            <span className="px-3 py-1 rounded-full text-xs bg-sky-500/15 border border-sky-400/25 text-sky-300 font-medium">
              ☽ {SIGN_RU[moonSign] ?? moonSign}
            </span>
          )}
          {ascSign && (
            <span className="px-3 py-1 rounded-full text-xs bg-violet-500/15 border border-violet-400/25 text-violet-300 font-medium">
              ↑ {SIGN_RU[ascSign] ?? ascSign}
            </span>
          )}
          {/* Life phase badge */}
          <span className="px-3 py-1 rounded-full text-xs bg-white/8 border border-white/15 text-white/60 font-medium">
            {lifePhase.title}
          </span>
        </div>
      </div>

      {/* ── Tab Navigation ──────────────────────────────────────────── */}
      <div className="flex border-b border-white/10 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap
              ${activeTab === tab.key
                ? `${domColors.text} border-b-2 ${domColors.border.replace('border-', 'border-b-')} bg-white/5`
                : 'text-white/40 hover:text-white/70 border-b-2 border-transparent'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────── */}
      <div className="p-5 space-y-5">

        {/* ════ TAB: СУТЬ ════ */}
        {activeTab === 'essence' && (
          <div className="space-y-5">
            {/* Big-3 cards */}
            <div>
              <SectionTitle>Три столпа личности</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Sun */}
                <Card>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl text-amber-300">☉</span>
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                      Солнце в {SIGN_RU[sunSign] ?? sunSign}
                    </span>
                  </div>
                  <p className="text-xs text-white/65 leading-relaxed">
                    {SIGN_SUN_ESSENCE[sunSign] ?? 'Солнце определяет вашу жизненную силу и путь самовыражения.'}
                  </p>
                </Card>
                {/* Moon */}
                <Card>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl text-sky-300">☽</span>
                    <span className="text-xs font-bold text-sky-300 uppercase tracking-wide">
                      Луна в {SIGN_RU[moonSign] ?? moonSign}
                    </span>
                  </div>
                  <p className="text-xs text-white/65 leading-relaxed">
                    {SIGN_MOON_ESSENCE[moonSign] ?? 'Луна отражает вашу эмоциональную природу и внутренний мир.'}
                  </p>
                </Card>
                {/* ASC */}
                <Card>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl text-violet-300">↑</span>
                    <span className="text-xs font-bold text-violet-300 uppercase tracking-wide">
                      Асцендент в {SIGN_RU[ascSign] ?? ascSign}
                    </span>
                  </div>
                  <p className="text-xs text-white/65 leading-relaxed">
                    {SIGN_ASC_ESSENCE[ascSign] ?? 'Асцендент — ваша социальная маска и первое впечатление, которое вы производите.'}
                  </p>
                </Card>
              </div>
            </div>

            {/* Element Profile */}
            <div>
              <SectionTitle>Доминирующая стихия</SectionTitle>
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{ELEMENT_ICON[dominantElement]}</span>
                  <span className={`font-bold text-sm ${elementProfile.colorClass}`}>
                    {elementProfile.title}
                  </span>
                </div>

                {/* Element dots bar */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-3">
                  {(['fire', 'earth', 'air', 'water'] as const).map(el => (
                    <div key={el} className="flex items-center gap-2">
                      <span className="text-xs w-16 text-white/45">
                        {el === 'fire' ? '🔥 Огонь' : el === 'earth' ? '🌱 Земля' : el === 'air' ? '💨 Воздух' : '🌊 Вода'}
                      </span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i < elementCounts[el]
                                ? el === 'fire' ? 'bg-orange-400' : el === 'earth' ? 'bg-green-400' : el === 'air' ? 'bg-blue-400' : 'bg-teal-400'
                                : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-white/30">{totalPlanets > 0 ? elementCounts[el] : '-'}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-white/65 leading-relaxed mb-2">{elementProfile.essence}</p>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="text-xs">
                    <span className="text-white/40 uppercase tracking-wide text-[10px]">Сила</span>
                    <p className="text-white/70 mt-0.5">{elementProfile.strength}</p>
                  </div>
                  <div className="text-xs">
                    <span className="text-white/40 uppercase tracking-wide text-[10px]">Развитие</span>
                    <p className="text-white/70 mt-0.5">{elementProfile.growth}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Modality Profile */}
            <div>
              <SectionTitle>Модус действия</SectionTitle>
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white/85">{modalityProfile.title}</span>
                  <div className="flex gap-3 text-xs text-white/40">
                    <span>Кард: {modalityCounts.cardinal}</span>
                    <span>Фикс: {modalityCounts.fixed}</span>
                    <span>Мут: {modalityCounts.mutable}</span>
                  </div>
                </div>
                <p className="text-xs text-white/65 leading-relaxed mb-2">{modalityProfile.essence}</p>
                <div className={`rounded-lg px-3 py-2 ${domColors.bg} border ${domColors.border}`}>
                  <p className={`text-xs ${domColors.text}`}>{modalityProfile.actionStyle}</p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ════ TAB: ДАРЫ ════ */}
        {activeTab === 'gifts' && (
          <div className="space-y-5">
            {/* Top dignified planets */}
            {topPlanets.length > 0 && (
              <div>
                <SectionTitle>Планетарные таланты</SectionTitle>
                <div className="space-y-3">
                  {topPlanets.map(({ key: p, score }) => {
                    const arc = PLANET_ARCHETYPES[p];
                    if (!arc) return null;
                    const pSign = chart.planets[p]?.sign ?? '';
                    const pHouse = chart.planets[p]?.house;
                    const pColors = COLOR_MAP[PLANET_COLOR[p] ?? 'amber'] ?? COLOR_MAP.amber;
                    return (
                      <Card key={p}>
                        <div className="flex items-start gap-3">
                          <div className={`text-3xl ${pColors.text} leading-none pt-0.5 shrink-0`}>
                            {arc.symbol}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-bold ${pColors.text}`}>
                                {PLANET_RU[p] ?? p} в {SIGN_RU[pSign] ?? pSign}
                                {pHouse ? ` (Дом ${pHouse})` : ''}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${pColors.bg} ${pColors.text}`}>
                                Достоинство: {score > 0 ? '+' : ''}{score}
                              </span>
                            </div>
                            <p className="text-xs text-white/65 leading-relaxed mb-1">{arc.gift}</p>
                            <p className={`text-xs ${pColors.text} opacity-80`}>{arc.mission}</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chart patterns */}
            {activePatterns.length > 0 && (
              <div>
                <SectionTitle>Особые конфигурации карты</SectionTitle>
                <div className="space-y-3">
                  {activePatterns.map(pattern => {
                    const pg = PATTERN_GIFTS[pattern];
                    if (!pg) return null;
                    return (
                      <Card key={pattern}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-amber-400">✦</span>
                          <span className="text-sm font-bold text-amber-300">{pg.title}</span>
                        </div>
                        <p className="text-xs text-white/50 mb-2 italic">{pg.meaning}</p>
                        <p className="text-xs text-white/70 leading-relaxed mb-2">{pg.gift}</p>
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/8 border border-amber-400/20">
                          <span className="text-amber-400 text-xs mt-0.5">→</span>
                          <p className="text-xs text-amber-300/80">{pg.advice}</p>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Shadow / Challenge */}
            <div>
              <SectionTitle>Зона роста</SectionTitle>
              <Card className={`border ${domColors.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white/40">🌑</span>
                  <span className="text-sm font-bold text-white/70">Вызов архетипа</span>
                </div>
                <p className="text-xs text-white/65 leading-relaxed">{archetype.challenge}</p>
              </Card>
            </div>

            {/* HOLOS advice */}
            <div>
              <SectionTitle>Совет от HOLOS</SectionTitle>
              <Card className={`${domColors.bg} border ${domColors.border}`}>
                <p className={`text-sm ${domColors.text} leading-relaxed font-medium`}>
                  {archetype.mission}
                </p>
                {elementProfile.timing && (
                  <p className="text-xs text-white/55 mt-2 leading-relaxed">
                    {elementProfile.timing}
                  </p>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ════ TAB: ПРОГНОЗ ════ */}
        {activeTab === 'forecast' && (
          <div className="space-y-5">
            {/* Life phase */}
            <div>
              <SectionTitle>Жизненная фаза</SectionTitle>
              <Card>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🪐</span>
                  <span className="text-sm font-bold text-white/85">{lifePhase.title}</span>
                </div>
                <p className="text-xs text-white/65 leading-relaxed mb-2">{lifePhase.description}</p>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-amber-400 text-xs mt-0.5">→</span>
                  <p className="text-xs text-white/60">{lifePhase.advice}</p>
                </div>
              </Card>
            </div>

            {/* Profection year banner */}
            {profectionTheme && (
              <Card className={`${domColors.bg} border ${domColors.border}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase tracking-widest text-white/40">Год профекции</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${domColors.bg} ${domColors.text} border ${domColors.border}`}>
                    Дом {profectionHouse}
                  </span>
                </div>
                <p className={`text-base font-bold ${domColors.text}`}>{profectionTheme.theme}</p>
                <p className="text-xs text-white/50 mt-1">{profectionTheme.area}</p>
              </Card>
            )}

            {/* Period cards */}
            <div>
              <SectionTitle>Временны́е окна</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {forecastPeriods.map((period, idx) => {
                  const pc = COLOR_MAP[period.colorName] ?? COLOR_MAP.amber;
                  const isSelected = idx === selectedPeriod;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedPeriod(idx)}
                      className={`rounded-lg border p-3 text-left transition-all duration-200 ${
                        isSelected
                          ? `${pc.bg} ${pc.border} shadow-lg scale-[1.02]`
                          : 'bg-white/4 border-white/10 hover:bg-white/8'
                      }`}
                    >
                      <div className={`text-xs font-bold mb-1 ${isSelected ? pc.text : 'text-white/60'}`}>
                        {period.label}
                      </div>
                      <div className="text-[10px] text-white/35 mb-2">{period.dateRange}</div>
                      <IntensityDots value={period.intensity} />
                    </button>
                  );
                })}
              </div>

              {/* Expanded period card */}
              {forecastPeriods[selectedPeriod] && (() => {
                const period = forecastPeriods[selectedPeriod];
                const pc = COLOR_MAP[period.colorName] ?? COLOR_MAP.amber;
                return (
                  <Card className={`${pc.bg} border ${pc.border}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className={`text-sm font-bold ${pc.text} mb-1`}>{period.theme}</h4>
                        <span className="text-xs text-white/40">{period.dateRange}</span>
                      </div>
                      <IntensityDots value={period.intensity} />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-white/40">Возможность</span>
                        <p className="text-xs text-white/70 mt-1 leading-relaxed">{period.opportunity}</p>
                      </div>

                      <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/8 border border-red-400/15">
                        <span className="text-red-400 text-xs mt-0.5">⚠</span>
                        <p className="text-xs text-red-300/80">{period.caution}</p>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-white/40">Лучшие действия</span>
                        <div className="mt-2 space-y-1.5">
                          {period.actions.map((action, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded border ${pc.border} shrink-0 flex items-center justify-center`}>
                                <div className={`w-2 h-2 rounded-sm ${pc.dot}`} />
                              </div>
                              <span className="text-xs text-white/65">{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className={`rounded-lg px-3 py-2 bg-white/5 border border-white/10 text-center`}>
                        <p className={`text-xs italic ${pc.text} opacity-90`}>
                          «{period.affirmation}»
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })()}
            </div>
          </div>
        )}

        {/* ════ TAB: ПУТЬ ════ */}
        {activeTab === 'path' && (
          <div className="space-y-5">
            {/* North Node */}
            <div>
              <SectionTitle>Северный Узел — Ваша миссия</SectionTitle>
              {(() => {
                const nodeMission = NORTH_NODE_IN_SIGN[nodeSign];
                const nodeHouseMission = NORTH_NODE_IN_HOUSE[nodeHouse];
                if (!nodeMission) return (
                  <Card>
                    <p className="text-xs text-white/50">Данные о Северном Узле недоступны.</p>
                  </Card>
                );
                return (
                  <div className="space-y-3">
                    <Card>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg text-amber-300">☊</span>
                        <div>
                          <span className="text-sm font-bold text-amber-300">{nodeMission.title}</span>
                          <span className="text-xs text-white/40 ml-2">в {SIGN_RU[nodeSign] ?? nodeSign}</span>
                        </div>
                      </div>
                      <p className="text-xs text-white/65 leading-relaxed mb-2">{nodeMission.essence}</p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {nodeMission.theme.split(' · ').map(kw => (
                          <span key={kw} className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/12 border border-amber-400/20 text-amber-300/80">
                            {kw}
                          </span>
                        ))}
                      </div>
                      <div className={`rounded-lg px-3 py-2 ${domColors.bg} border ${domColors.border}`}>
                        <p className={`text-xs font-medium ${domColors.text}`}>{nodeMission.mission}</p>
                      </div>
                    </Card>

                    {nodeHouseMission && (
                      <Card>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-white/40 uppercase tracking-wide">Дом {nodeHouse}</span>
                          <span className="text-sm font-bold text-white/80">{nodeHouseMission.title}</span>
                        </div>
                        <p className="text-xs text-white/50 mb-2">{nodeHouseMission.area}</p>
                        <p className="text-xs text-white/70 leading-relaxed">{nodeHouseMission.mission}</p>
                      </Card>
                    )}

                    {/* Practices */}
                    <div>
                      <SectionTitle>Практики реализации</SectionTitle>
                      <Card>
                        <div className="space-y-2">
                          {nodeMission.practices.map((practice, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <span className={`text-xs font-bold ${domColors.text} shrink-0 w-4 mt-0.5`}>{i + 1}.</span>
                              <p className="text-xs text-white/70 leading-relaxed">{practice}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>

                    {/* South Node trap */}
                    <div>
                      <SectionTitle>Ловушка прошлого</SectionTitle>
                      <Card className="border border-red-400/20 bg-red-500/5">
                        <div className="flex items-start gap-2">
                          <span className="text-red-400 text-sm shrink-0">☋</span>
                          <p className="text-xs text-red-300/80 leading-relaxed">{nodeMission.southNodeTrap}</p>
                        </div>
                      </Card>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Mission synthesis */}
            <div>
              <SectionTitle>Синтез миссии</SectionTitle>
              <Card className={`${domColors.bg} border ${domColors.border}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-2xl ${domColors.text}`}>{archetype.symbol}</span>
                  <span className={`text-sm font-bold ${domColors.text}`}>{archetype.name}</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed mb-2">{archetype.mission}</p>
                {NORTH_NODE_IN_SIGN[nodeSign] && (
                  <p className="text-xs text-white/60 leading-relaxed border-t border-white/10 pt-2 mt-2">
                    {NORTH_NODE_IN_SIGN[nodeSign].mission}
                  </p>
                )}
              </Card>
            </div>

            {/* Best timing */}
            <div>
              <SectionTitle>Лучшее время для действия</SectionTitle>
              <Card>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{ELEMENT_ICON[dominantElement]}</span>
                  <span className={`text-sm font-medium ${elementProfile.colorClass}`}>
                    Стихия {elementProfile.title.replace(/^[^ ]+ /, '')}
                  </span>
                </div>
                <p className="text-xs text-white/65 leading-relaxed">{elementProfile.timing}</p>
              </Card>
            </div>

            {/* Final affirmation */}
            {profectionTheme && (
              <div className={`rounded-xl ${domColors.bg} border ${domColors.border} p-5 text-center`}>
                <div className="text-xs uppercase tracking-widest text-white/35 mb-2">Аффирмация года</div>
                <p className={`text-base font-serif ${domColors.text} italic`}>
                  «{profectionTheme.affirmation}»
                </p>
              </div>
            )}
          </div>
        )}

        {/* ════ TAB: РИТМЫ ════ */}
        {activeTab === 'rhythms' && (
          <div className="space-y-5">

            {/* ── TAU Архетип ── */}
            <div>
              <SectionTitle>TAU — Личный биографический ритм</SectionTitle>
              <Card className={`${holosData.archetypeProfile.bgClass} border ${holosData.archetypeProfile.borderClass}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold uppercase tracking-widest ${holosData.archetypeProfile.colorClass}`}>
                        {holosData.archetypeProfile.labelRu}
                      </span>
                      <span className={`text-lg font-mono font-bold ${holosData.archetypeProfile.colorClass}`}>
                        τ = {holosData.tau.toFixed(2)} лет
                      </span>
                    </div>
                    <p className={`text-[10px] ${holosData.archetypeProfile.colorClass} opacity-70`}>
                      {holosData.archetypeProfile.rhythm}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-xs text-white/40 mb-0.5">Точность</div>
                    <div className={`text-sm font-bold ${holosData.archetypeProfile.colorClass}`}>
                      {Math.round((holosData.avgHitRate || 0.387) * 100)}%
                    </div>
                    <div className="text-[10px] text-white/30">по Wikipedia</div>
                  </div>
                </div>

                <p className="text-xs text-white/65 leading-relaxed mb-3">
                  {holosData.archetypeProfile.description}
                </p>

                {/* TAU phase bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-white/40 uppercase tracking-wide">Фаза цикла</span>
                    <span className={`text-xs font-medium ${holosData.archetypeProfile.colorClass}`}>
                      {holosData.tauPhaseName} — {Math.round(holosData.tauPhase * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${holosData.archetypeProfile.colorClass.replace('text-', 'bg-')}`}
                      style={{ width: `${Math.round(holosData.tauPhase * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Phase interpretation */}
                {TAU_PHASE_INTERP[holosData.tauPhaseName] && (
                  <div className="mb-3 p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-[10px] text-white/35 uppercase tracking-wide mb-1">Что это значит сейчас</p>
                    <p className="text-xs text-white/70 leading-relaxed">
                      {TAU_PHASE_INTERP[holosData.tauPhaseName]}
                    </p>
                  </div>
                )}

                {/* Next peaks */}
                <div className="mb-3">
                  <div className="text-[10px] text-white/40 uppercase tracking-wide mb-1.5">Следующие пики</div>
                  <div className="flex flex-wrap gap-2">
                    {holosData.tauPeaks.map((yr, i) => (
                      <div key={i} className={`px-2.5 py-1.5 rounded-lg text-center ${holosData.archetypeProfile.bgClass} border ${holosData.archetypeProfile.borderClass}`}>
                        <div className={`text-xs font-mono font-bold ${holosData.archetypeProfile.colorClass}`}>
                          {decimalToMonthYear(yr)}
                        </div>
                        <div className="text-[9px] text-white/30">{yr.toFixed(1)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Insight */}
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-white/60 leading-relaxed italic">
                    {holosData.archetypeProfile.insight}
                  </p>
                </div>

                {/* Similar professions */}
                {holosData.similarProfs.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[10px] text-white/35 uppercase tracking-wide mb-1.5">Схожий ритм: профессии из базы (N=480K+)</div>
                    <div className="flex flex-wrap gap-1.5">
                      {holosData.similarProfs.map((p, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 border border-white/12 text-white/50">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* ── Активные окна ── */}
            {holosData.activeWindows.length > 0 && (
              <div>
                <SectionTitle>Активные окна прямо сейчас</SectionTitle>
                <div className="space-y-2">
                  {holosData.activeWindows.map((w, i) => {
                    const wc = COLOR_MAP[w.color] ?? COLOR_MAP.amber;
                    const dates = windowDates(holosData.birth, w.age);
                    const interp = getWindowInterp(w);
                    return (
                      <Card key={i} className={`border ${wc.border} ${wc.bg}`}>
                        <div className="flex items-start gap-3">
                          <span className="text-xl shrink-0 mt-0.5">{w.icon}</span>
                          <div className="flex-1 min-w-0">
                            {/* Header row */}
                            <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${wc.text}`}>{w.label} — {w.age}л</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${wc.bg} ${wc.text} border ${wc.border} animate-pulse`}>АКТИВНО</span>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${wc.bg} ${wc.text} border ${wc.border} font-mono font-bold`}>
                                {w.multiplier}
                              </span>
                            </div>

                            {/* Date range */}
                            <div className={`text-[10px] ${wc.text} opacity-70 mb-1.5 flex items-center gap-1.5`}>
                              <span>📅 Период окна:</span>
                              <span className="font-medium">{dates.start} → {dates.peak} → {dates.end}</span>
                            </div>

                            {/* Base description */}
                            <p className="text-xs text-white/65 mb-2 leading-relaxed">{w.description}</p>

                            {/* Extended interpretation */}
                            {interp && (
                              <div className="space-y-1.5 mb-2">
                                <div className="rounded-lg bg-white/6 border border-white/10 p-2">
                                  <span className="text-[9px] uppercase tracking-wide text-white/35 block mb-0.5">Что происходит</span>
                                  <p className="text-[11px] text-white/75 leading-relaxed">{interp.what}</p>
                                </div>
                                <div className="rounded-lg bg-white/6 border border-white/10 p-2">
                                  <span className="text-[9px] uppercase tracking-wide text-white/35 block mb-0.5">Фокус действий</span>
                                  <p className="text-[11px] text-white/75 leading-relaxed">{interp.focus}</p>
                                </div>
                                <div className={`rounded-lg p-2 ${wc.bg} border ${wc.border}`}>
                                  <span className="text-[9px] uppercase tracking-wide text-white/35 block mb-0.5">⚡ HOLOS совет</span>
                                  <p className={`text-[11px] ${wc.text} leading-relaxed font-medium`}>{interp.tip}</p>
                                </div>
                              </div>
                            )}

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1">
                              {w.eventTypes.map((et, j) => (
                                <span key={j} className={`px-2 py-0.5 rounded-full text-[10px] ${wc.bg} border ${wc.border} ${wc.text}`}>
                                  {et}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Ближайшие окна ── */}
            {holosData.nearWindows.length > 0 && (
              <div>
                <SectionTitle>Ближайшие окна событий (до 5 лет)</SectionTitle>
                <div className="space-y-2">
                  {holosData.nearWindows.slice(0, 6).map((w, i) => {
                    const wc = COLOR_MAP[w.color] ?? COLOR_MAP.amber;
                    const yearsLeft = w.year - holosData.now;
                    const dates = windowDates(holosData.birth, w.age);
                    const interp = getWindowInterp(w);
                    return (
                      <div key={i} className="rounded-lg border border-white/8 bg-white/3 px-3 py-2.5">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="text-base shrink-0">{w.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className={`text-xs font-bold ${wc.text}`}>{w.label}</span>
                              <span className="text-[10px] text-white/35">{w.age}л · пик {dates.peak}</span>
                            </div>
                            <div className="text-[9px] text-white/30">
                              📅 {dates.start} → {dates.end}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className={`text-sm font-mono font-bold ${wc.text}`}>{w.multiplier}</div>
                            <div className="text-[10px] text-white/30">через {yearsLeft.toFixed(1)}л</div>
                          </div>
                        </div>
                        {interp && (
                          <p className="text-[10px] text-white/50 leading-relaxed pl-7 border-t border-white/6 pt-1.5">
                            {interp.what}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 pl-7 mt-1">
                          {w.eventTypes.slice(0, 2).map((et, j) => (
                            <span key={j} className="text-[10px] text-white/35">{et}{j < Math.min(w.eventTypes.length, 2) - 1 ? ' ·' : ''}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Полная ось жизни ── */}
            <div>
              <SectionTitle>Ось биографической математики</SectionTitle>
              <div className="space-y-1.5">
                {holosData.allWindows
                  .filter(w => w.status !== 'upcoming' || (w.age - holosData.age) <= 15)
                  .filter(w => w.type !== 'jupiter' || w.status === 'active' || (w.age - holosData.age) <= 3)
                  .map((w, i) => {
                    const wc = COLOR_MAP[w.color] ?? COLOR_MAP.slate;
                    const isPassed = w.status === 'passed';
                    const isActive = w.status === 'active';
                    const calYear = decimalToMonthYear(holosData.birth + w.age);
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all ${
                          isActive
                            ? `${wc.bg} border ${wc.border} shadow-md`
                            : isPassed
                            ? 'bg-white/2 border border-white/6 opacity-45'
                            : 'bg-white/3 border border-white/8'
                        }`}
                      >
                        {/* Status indicator */}
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? wc.dot : isPassed ? 'bg-white/20' : `${wc.dot} opacity-50`}`} />

                        {/* Age + calendar year */}
                        <div className="shrink-0 w-16 text-right">
                          <div className={`text-xs font-mono font-bold leading-none ${isActive ? wc.text : isPassed ? 'text-white/30' : 'text-white/55'}`}>
                            {w.age.toFixed(0)}л
                          </div>
                          <div className={`text-[9px] mt-0.5 ${isActive ? wc.text + ' opacity-60' : 'text-white/20'}`}>
                            {calYear}
                          </div>
                        </div>

                        {/* Icon + label */}
                        <span className="text-sm shrink-0">{w.icon}</span>
                        <span className={`text-xs font-medium flex-1 min-w-0 truncate ${isActive ? wc.text : isPassed ? 'text-white/35' : 'text-white/65'}`}>
                          {w.label}
                        </span>

                        {/* Event types */}
                        <span className={`text-[10px] shrink-0 hidden sm:inline ${isActive ? wc.text + ' opacity-80' : 'text-white/30'}`}>
                          {w.eventTypes[0]}
                        </span>

                        {/* Multiplier */}
                        <span className={`text-xs font-mono shrink-0 w-10 text-right ${isActive ? wc.text : isPassed ? 'text-white/20' : 'text-white/40'}`}>
                          {w.multiplier}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* ── Планетарные фазы ── */}
            {(() => {
              const { birth, age, satPhase, jupPhase, lunar9Phase, nodePhase, satReturnN, nextSatYear, nextJupYear } = holosData;
              const nextLunar9Year = birth + HOLOS_LUNAR9 * (Math.floor(age / HOLOS_LUNAR9) + 1);
              const nextNodeYear   = birth + HOLOS_NODE   * (Math.floor(age / HOLOS_NODE)   + 1);

              const PLANET_PHASE_INTERP: Record<string, { start: string; growth: string; peak: string; end: string }> = {
                saturn: {
                  start:  'Новый 29-летний цикл. Время закладывать фундамент, брать новые обязательства.',
                  growth: 'Сатурн набирает силу. Структурируйте жизнь, стройте долгосрочное.',
                  peak:   'Оппозиция Сатурна — кризис середины цикла. Оценка: правильно ли вы идёте?',
                  end:    'Цикл завершается. Закрывайте незаконченное, отпускайте отжившее.',
                },
                jupiter: {
                  start:  'Новый 12-летний цикл расширения. Удача открывается там, где вы искренни.',
                  growth: 'Юпитер растёт — возможности множатся. Принимайте их, не откладывайте.',
                  peak:   'Пик Юпитера — максимум удачи и расширения. Самое время для больших шагов.',
                  end:    'Юпитер завершает цикл. Собирайте урожай, готовьтесь к следующему витку.',
                },
                lunar9: {
                  start:  'Лунный ритм обновляется. Эмоциональная перезагрузка, новые привязанности.',
                  growth: 'Внутренний мир стабилизируется. Ощущение безопасности растёт.',
                  peak:   'Пик лунного цикла — максимальная эмоциональная насыщенность.',
                  end:    'Лунный цикл на спаде. Отпускайте то, что перестало питать.',
                },
                node: {
                  start:  'Новый узловой цикл. Кармические темы обновляются, судьбоносные встречи.',
                  growth: 'Северный Узел набирает силу — двигайтесь в его направлении, это путь роста.',
                  peak:   'Узловая оппозиция. Прошлое и будущее встречаются лицом к лицу.',
                  end:    'Узловой цикл на финише. Что вы приняли? Что пора отпустить?',
                },
              };

              const planets = [
                { key: 'saturn', label: '♄ Сатурн', period: HOLOS_SAT, phase: satPhase, color: 'slate', cycleN: satReturnN + 1, nextYear: nextSatYear },
                { key: 'jupiter', label: '♃ Юпитер', period: HOLOS_JUP, phase: jupPhase, color: 'indigo', cycleN: null, nextYear: nextJupYear },
                { key: 'lunar9', label: '☽ Лунный 9.3л', period: HOLOS_LUNAR9, phase: lunar9Phase, color: 'sky', cycleN: null, nextYear: nextLunar9Year },
                { key: 'node', label: '☊ Узловой 18.6л', period: HOLOS_NODE, phase: nodePhase, color: 'violet', cycleN: null, nextYear: nextNodeYear },
              ];

              return (
                <div>
                  <SectionTitle>Планетарные фазы сейчас</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {planets.map(item => {
                      const pc = COLOR_MAP[item.color] ?? COLOR_MAP.slate;
                      const pct = Math.round(item.phase * 100);
                      const phaseKey = pct < 25 ? 'start' : pct < 50 ? 'growth' : pct < 75 ? 'peak' : 'end';
                      const phaseLabel = pct < 25 ? 'Начало цикла' : pct < 50 ? 'Нарастание' : pct < 75 ? 'Пик / Оппозиция' : 'Завершение';
                      const interp = PLANET_PHASE_INTERP[item.key][phaseKey];
                      const cycleStart = decimalToMonthYear(item.nextYear - item.period);
                      const cycleEnd   = decimalToMonthYear(item.nextYear);
                      return (
                        <div key={item.key} className={`rounded-xl border p-3 ${pc.bg} ${pc.border}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-bold ${pc.text}`}>{item.label}</span>
                            {item.cycleN && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${pc.bg} ${pc.text} border ${pc.border}`}>
                                Цикл {item.cycleN}
                              </span>
                            )}
                          </div>

                          {/* Phase bar */}
                          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1.5">
                            <div className={`h-full rounded-full ${pc.dot} transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-semibold ${pc.text}`}>{phaseLabel}</span>
                            <span className={`text-[10px] font-mono ${pc.text}`}>{pct}%</span>
                          </div>

                          {/* Interpretation */}
                          <p className="text-[11px] text-white/65 leading-relaxed mb-2">{interp}</p>

                          {/* Cycle dates */}
                          <div className="flex items-center gap-1 text-[9px] text-white/30">
                            <span>📅 Цикл:</span>
                            <span>{cycleStart}</span>
                            <span>→</span>
                            <span className={`font-medium ${pc.text} opacity-70`}>{cycleEnd}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ── Core Hash ── */}
            {(() => {
              const parts = holosData.coreHash.split(' · ');
              const hashLabels = ['TAU ритм', 'φ-ворота', 'α-узел', 'Сатурн', 'Фиб-возраст'];
              const hashDescriptions = [
                `Личный биоритм τ=${holosData.tau.toFixed(1)}л — ${holosData.archetypeProfile.labelRu.toLowerCase()}. Пик каждые ${holosData.tau.toFixed(1)} лет.`,
                `Вы ${holosData.age < Math.pow(HOLOS_PHI, 8) ? 'ещё не достигли φ⁸' : 'прошли φ⁸ (ворота перерождения)'}. Текущий φ-цикл определяет масштаб вашего горизонта.`,
                `Ближайший α-узел — точка ${holosData.activeWindows.find(w => w.type === 'alpha') ? 'максимального биографического резонанса (АКТИВНО)' : 'следующего мощного биографического импульса'}.`,
                `Завершено ${holosData.satReturnN} полных оборота Сатурна — ${holosData.satReturnN === 0 ? 'ещё до первого возврата, период формирования' : holosData.satReturnN === 1 ? 'опыт взрослости получен, строите зрелую жизнь' : 'мастер прошедший все испытания цикла'}.`,
                `Следующий Фибоначчи-возраст — природный рубеж ${parts[4] ?? 'F55'}. Органический переход биографического ритма.`,
              ];
              const activeInterps = holosData.activeWindows
                .map(w => getWindowInterp(w))
                .filter(Boolean);
              const holosAdvice = activeInterps.length > 0
                ? activeInterps[0]!.tip
                : holosData.nearWindows.length > 0
                  ? `До ближайшего биографического окна (${holosData.nearWindows[0].label}) осталось ${(holosData.nearWindows[0].year - holosData.now).toFixed(1)} лет. ${getWindowInterp(holosData.nearWindows[0])?.focus ?? 'Готовьтесь заранее.'}`
                  : 'Вы находитесь в стабильной фазе между крупными окнами. Время планомерного роста и укрепления позиций.';

              return (
                <div>
                  <SectionTitle>Core Hash — Биографический отпечаток</SectionTitle>
                  <Card className={`${domColors.bg} border ${domColors.border}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] uppercase tracking-widest text-white/40">HOLOS Mathematical Identity</div>
                      <span className="text-[10px] text-white/25">N=480,000+ биографий</span>
                    </div>

                    {/* Hash string */}
                    <div className={`font-mono text-sm font-bold ${domColors.text} tracking-wide mb-3 break-all`}>
                      {holosData.coreHash}
                    </div>

                    {/* Component breakdown */}
                    <div className="grid grid-cols-1 gap-1.5 mb-3">
                      {parts.map((part, i) => (
                        <div key={i} className="flex items-start gap-2.5 rounded-lg bg-white/4 border border-white/8 px-2.5 py-2">
                          <div className={`font-mono text-xs font-bold ${domColors.text} shrink-0 w-16`}>{part}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[9px] text-white/35 uppercase tracking-wide mb-0.5">{hashLabels[i]}</div>
                            <p className="text-[11px] text-white/60 leading-relaxed">{hashDescriptions[i]}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* HOLOS Advice */}
                    <div className={`rounded-xl p-3 ${domColors.bg} border ${domColors.border}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-base shrink-0">🔮</span>
                        <div>
                          <div className={`text-[10px] font-bold uppercase tracking-wide ${domColors.text} mb-1`}>
                            Совет HOLOS для вашего паттерна
                          </div>
                          <p className={`text-xs ${domColors.text} opacity-85 leading-relaxed`}>
                            {holosAdvice}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })()}

            {/* ── Топ инструментов HOLOS ── */}
            <div>
              <SectionTitle>Подтверждённые инструменты системы</SectionTitle>
              <div className="space-y-2">
                {HOLOS_INSTRUMENTS_META.map((inst, i) => {
                  const ic = COLOR_MAP[inst.color] ?? COLOR_MAP.amber;
                  const nodeAge = inst.age;
                  const yearsLeft = nodeAge - holosData.age;
                  const isPast = yearsLeft < -1.5;
                  const isActive = Math.abs(yearsLeft) <= 1.5;
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-3 rounded-lg px-3 py-2.5 border transition-all ${
                        isActive ? `${ic.bg} ${ic.border}` : isPast ? 'bg-white/2 border-white/6 opacity-50' : 'bg-white/3 border-white/8'
                      }`}
                    >
                      <span className="text-lg shrink-0 mt-0.5">{inst.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-xs font-bold ${isActive ? ic.text : isPast ? 'text-white/35' : 'text-white/75'}`}>
                            {inst.name}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${ic.bg} ${ic.text} border ${ic.border}`}>
                            {inst.multiplier}
                          </span>
                          {isActive && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ic.bg} ${ic.text} border ${ic.border} animate-pulse`}>
                              АКТИВНО
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/45 leading-relaxed">{inst.description}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {inst.eventTypes.map((et, j) => (
                            <span key={j} className="text-[10px] text-white/35 border border-white/10 rounded px-1.5 py-0.5">{et}</span>
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0 text-right ml-2">
                        <div className={`text-xs font-mono font-bold ${isActive ? ic.text : isPast ? 'text-white/25' : 'text-white/50'}`}>
                          {nodeAge.toFixed(1)}л
                        </div>
                        <div className={`text-[10px] ${isActive ? ic.text + ' opacity-70' : 'text-white/25'}`}>
                          {decimalToMonthYear(holosData.birth + nodeAge)}
                        </div>
                        <div className="text-[9px] text-white/20 mt-0.5">
                          {isPast ? 'прошло' : isActive ? '≈сейчас' : `через ${yearsLeft.toFixed(1)}л`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
