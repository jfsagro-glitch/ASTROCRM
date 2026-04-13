/**
 * PAReportBlock.tsx
 * Unified block: Интерпретация + Сферы + Компенсаторика
 * Pavel Andreev method · Premium interactive UI
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { NatalChart } from '../types/astro';
import InterpretationPanel from './InterpretationPanel';
import LifeSphereReports from './LifeSphereReports';

// ─── CSS animations (injected once) ─────────────────────────────────────────
const PA_CSS = `
  @keyframes pa-in {
    from { opacity:0; transform:translateY(-10px) scale(0.99); }
    to   { opacity:1; transform:translateY(0)     scale(1);    }
  }
  @keyframes pa-badge-pop {
    0%   { transform:scale(0.7); opacity:0; }
    70%  { transform:scale(1.1); }
    100% { transform:scale(1);   opacity:1; }
  }
  .pa-in        { animation: pa-in 0.26s cubic-bezier(.4,0,.2,1) forwards; }
  .pa-badge-pop { animation: pa-badge-pop 0.3s cubic-bezier(.4,0,.2,1) forwards; }
  .pa-acc-body  {
    overflow:hidden;
    transition: max-height 0.38s cubic-bezier(.4,0,.2,1),
                opacity    0.28s ease;
  }
  .pa-acc-open { max-height:5000px; opacity:1; }
  .pa-acc-shut { max-height:0;      opacity:0; pointer-events:none; }
  .pa-hover-lift { transition: transform 0.18s ease, box-shadow 0.18s ease; }
  .pa-hover-lift:hover { transform:translateY(-2px); box-shadow:0 6px 24px rgba(0,0,0,0.18); }
  .pa-score-fill { transition: width 0.7s cubic-bezier(.4,0,.2,1); }
  .pa-tab-pill   {
    transition: color 0.18s, background 0.18s, outline 0.18s, box-shadow 0.18s;
  }
  .pa-tab-pill:hover { filter: brightness(1.15); }
`;

function injectCSS() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('pa-report-css')) return;
  const el = document.createElement('style');
  el.id = 'pa-report-css';
  el.textContent = PA_CSS;
  document.head.appendChild(el);
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  chart: NatalChart;
  name?: string;
  theme: 'dark' | 'light';
  birthDate?: string; // YYYY-MM-DD
}

// ─── House/planet helpers (standalone, no dep on other files) ────────────────
const SIGN_RU: Record<string,string> = {
  aries:'Овен', taurus:'Телец', gemini:'Близнецы', cancer:'Рак', leo:'Лев',
  virgo:'Дева', libra:'Весы', scorpio:'Скорпион', sagittarius:'Стрелец',
  capricorn:'Козерог', aquarius:'Водолей', pisces:'Рыбы',
};
const SIGN_ELEM: Record<string,string> = {
  aries:'fire', taurus:'earth', gemini:'air', cancer:'water', leo:'fire',
  virgo:'earth', libra:'air', scorpio:'water', sagittarius:'fire',
  capricorn:'earth', aquarius:'air', pisces:'water',
};
const SIGN_RULER: Record<string,string> = {
  aries:'mars', taurus:'venus', gemini:'mercury', cancer:'moon', leo:'sun',
  virgo:'mercury', libra:'venus', scorpio:'pluto', sagittarius:'jupiter',
  capricorn:'saturn', aquarius:'uranus', pisces:'neptune',
};
const GLYPH: Record<string,string> = {
  sun:'☉', moon:'☽', mercury:'☿', venus:'♀', mars:'♂', jupiter:'♃',
  saturn:'♄', uranus:'⛢', neptune:'♆', pluto:'♇', node:'☊', chiron:'⚷',
};
const PCOLOR: Record<string,string> = {
  sun:'#d4a853', moon:'#9ab5d4', mercury:'#88c4a8', venus:'#d48aaa', mars:'#d45b5b',
  jupiter:'#d4a04a', saturn:'#8899bb', uranus:'#5bbbcc', neptune:'#7788dd',
  pluto:'#bb77aa', node:'#ccaa44', chiron:'#66aabb',
};
const PRU: Record<string,string> = {
  sun:'Солнце', moon:'Луна', mercury:'Меркурий', venus:'Венера', mars:'Марс',
  jupiter:'Юпитер', saturn:'Сатурн', uranus:'Уран', neptune:'Нептун',
  pluto:'Плутон', node:'С.Узел', chiron:'Хирон',
};
const HRU: Record<number,string> = {
  1:'Личность', 2:'Ресурс', 3:'Коммуникации', 4:'Дом/Род', 5:'Творчество',
  6:'Труд/Тело', 7:'Партнёр', 8:'Трансформация', 9:'Экспансия', 10:'Карьера',
  11:'Сообщество', 12:'Скрытое',
};

function hSign(c: NatalChart, n: number): string | null {
  return (c.houses as Record<string,{sign?:string}>)[`h${n}`]?.sign ?? null;
}
function hRuler(c: NatalChart, n: number): string | null {
  const s = hSign(c, n); return s ? (SIGN_RULER[s] ?? null) : null;
}
function elemCount(c: NatalChart, el: string): number {
  return Object.values(c.planets).filter(p => p?.sign && SIGN_ELEM[p.sign] === el).length;
}
function dg(c: NatalChart, p: string): string | null {
  return c.dignities?.[p]?.dignity ?? null;
}
function isStrong(d: string|null): boolean { return d==='domicile'||d==='exaltation'; }
function isWeak(d: string|null): boolean   { return d==='detriment'||d==='fall'; }
function sRu(s: string|null|undefined): string { return s ? (SIGN_RU[s]??s) : '—'; }

function calcAge(birthDate?: string): number {
  if (!birthDate) return 35;
  const parts = birthDate.split('-');
  if (parts.length !== 3) return 35;
  const birth = new Date(+parts[0], +parts[1]-1, +parts[2]);
  if (isNaN(birth.getTime())) return 35;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() ||
     (now.getMonth()===birth.getMonth() && now.getDate()<birth.getDate())) age--;
  return age;
}

// ─── Financial archetype ──────────────────────────────────────────────────────
function getArchetype(chart: NatalChart): 'predator'|'farmer'|'universal' {
  const h2s = hSign(chart, 2);
  let p = 0, f = 0;
  const fire  = elemCount(chart,'fire');
  const earth = elemCount(chart,'earth');
  if (fire  >= 4) p += 2;
  if (earth >= 4) f += 2;
  if (isStrong(dg(chart,'mars')))   p += 2;
  if (isWeak(dg(chart,'mars')))     f += 1;
  if (isStrong(dg(chart,'venus')))  f += 2;
  if (isStrong(dg(chart,'moon')))   f += 1;
  if (chart.planets.mars?.house === 1)  p += 1;
  if (chart.planets.jupiter?.house === 2) f += 2;
  if (['scorpio','aries'].includes(h2s??''))              p += 2;
  if (['taurus','cancer','capricorn'].includes(h2s??''))  f += 2;
  if (p > f+1) return 'predator';
  if (f > p+1) return 'farmer';
  return 'universal';
}

// ─── Money generators ─────────────────────────────────────────────────────────
interface MoneyGen { label: string; desc: string; score: number; icon: string }

function getMoneyGenerators(chart: NatalChart): MoneyGen[] {
  const items: MoneyGen[] = [];
  const jup = chart.planets.jupiter;
  const ven = chart.planets.venus;
  const mars = chart.planets.mars;
  const sun = chart.planets.sun;
  const moon = chart.planets.moon;
  const mer = chart.planets.mercury;
  const h9s = hSign(chart, 9);
  const h2s = hSign(chart, 2);
  const h10s = hSign(chart, 10);

  // Foreign market / language
  let foreignScore = 0;
  if (jup?.house === 9) foreignScore += 2;
  if (isStrong(dg(chart,'jupiter'))) foreignScore += 1;
  if (['sagittarius','pisces'].includes(h2s??'')) foreignScore += 1;
  if (['sagittarius','pisces'].includes(h9s??'')) foreignScore += 1;
  const jupH9planets = Object.values(chart.planets).filter(p => p.house === 9).length;
  if (jupH9planets >= 2) foreignScore += 1;
  items.push({ icon:'🌍', score: Math.min(foreignScore,4),
    label: 'Иностранный рынок / язык',
    desc: 'Клиенты, партнёры или продукты за рубежом. Иностранный язык в позиционировании удваивает ценник.' });

  // Status visual markers
  let statusScore = 0;
  if (isStrong(dg(chart,'venus'))) statusScore += 2;
  if (['taurus','libra'].includes(h2s??'')) statusScore += 2;
  if (ven?.house === 1 || ven?.house === 2) statusScore += 1;
  items.push({ icon:'✨', score: Math.min(statusScore,4),
    label: 'Статусные символы и визуальная упаковка',
    desc: 'Красота обязательна. Офис, внешний вид, сайт, номер телефона — всё должно транслировать уровень.' });

  // Expert / teaching content
  let expertScore = 0;
  if (isStrong(dg(chart,'jupiter'))) expertScore += 2;
  if (['sagittarius','aquarius'].includes(h10s??'')) expertScore += 2;
  if (jup?.house === 9 || jup?.house === 3) expertScore += 1;
  items.push({ icon:'🎓', score: Math.min(expertScore,4),
    label: 'Экспертный контент / преподавание',
    desc: 'Курсы, книги, консультации, мастер-классы. Чем вы мудрее — тем дороже ваш час.' });

  // Sexual / provocative positioning
  let sexScore = 0;
  if (mars?.house === 2 || mars?.house === 8) sexScore += 2;
  if (isStrong(dg(chart,'mars'))) sexScore += 1;
  if (['scorpio'].includes(h2s??'')) sexScore += 2;
  const h8planets = Object.values(chart.planets).filter(p => p.house === 8).length;
  if (h8planets >= 2) sexScore += 1;
  items.push({ icon:'🔥', score: Math.min(sexScore,4),
    label: 'Сексуальность / дерзость в позиционировании',
    desc: 'Провокация и эротический подтекст в маркетинге. Работает там, где продаётся образ жизни.' });

  // Emotional hooks
  let emoScore = 0;
  if (moon?.house === 2) emoScore += 2;
  if (['cancer'].includes(h2s??'')) emoScore += 2;
  if (isStrong(dg(chart,'moon'))) emoScore += 1;
  items.push({ icon:'💬', score: Math.min(emoScore,3),
    label: 'Эмоциональные крючки в маркетинге',
    desc: 'Истории, боль аудитории, триггеры. Люди покупают чувства, не характеристики продукта.' });

  // Personal brand with face
  let brandScore = 0;
  if (sun?.house === 1 || sun?.house === 10) brandScore += 2;
  if (['leo'].includes(h10s??'')) brandScore += 2;
  if (isStrong(dg(chart,'sun'))) brandScore += 1;
  items.push({ icon:'👤', score: Math.min(brandScore,4),
    label: 'Личный бренд с лицом',
    desc: 'Ваша личность — главный актив. Продаёте не просто продукт, а себя как экспертный персонаж.' });

  // Digital / online products
  let digitalScore = 0;
  const ura = chart.planets.uranus;
  if (ura?.house === 2 || ura?.house === 10) digitalScore += 2;
  if (isStrong(dg(chart,'mercury'))) digitalScore += 1;
  if (['gemini','aquarius'].includes(h2s??'')) digitalScore += 2;
  items.push({ icon:'💻', score: Math.min(digitalScore,3),
    label: 'Цифровые продукты / онлайн-доход',
    desc: 'Подписки, курсы, SaaS, контент. Масштаб без найма людей.' });

  // Corporate B2B
  let b2bScore = 0;
  if (chart.planets.saturn?.house === 10) b2bScore += 2;
  if (['capricorn'].includes(h10s??'')) b2bScore += 2;
  if (isStrong(dg(chart,'saturn'))) b2bScore += 1;
  items.push({ icon:'🏢', score: Math.min(b2bScore,3),
    label: 'Корпоративный рынок (B2B)',
    desc: 'Крупные чеки, длинный цикл сделки, но стабильный поток. Презентации и договоры — ваша среда.' });

  // Partnerships / collaborations
  let partScore = 0;
  if (ven?.house === 7) partScore += 2;
  if (['libra'].includes(h10s??'')) partScore += 2;
  const h7planets = Object.values(chart.planets).filter(p => p.house === 7).length;
  if (h7planets >= 2) partScore += 1;
  items.push({ icon:'🤝', score: Math.min(partScore,3),
    label: 'Партнёрства и совместные проекты',
    desc: 'Коллаборации, аффилиатка, совместные продукты. Правильный партнёр = x2 к доходу.' });

  return items.filter(i => i.score > 0).sort((a,b) => b.score - a.score);
}

// ─── Career lights ────────────────────────────────────────────────────────────
type Light = 'green' | 'yellow' | 'red';
interface CareerLights { employment: Light; freelance: Light; business: Light }

function getCareerLights(chart: NatalChart): CareerLights {
  const h10s = hSign(chart, 10);
  const satP = chart.planets.saturn;
  const marP = chart.planets.mars;
  const jupP = chart.planets.jupiter;
  const uraP = chart.planets.uranus;

  // Employment
  let empScore = 0;
  if (isStrong(dg(chart,'saturn'))) empScore += 2;
  if (satP?.house === 10) empScore += 2;
  if (['capricorn','virgo'].includes(h10s??'')) empScore += 1;
  if (uraP?.house === 10) empScore -= 3;
  if (['aquarius'].includes(h10s??'')) empScore -= 2;
  const emp: Light = empScore >= 2 ? 'green' : empScore <= -1 ? 'red' : 'yellow';

  // Freelance
  let freeScore = 0;
  if (isStrong(dg(chart,'mercury'))) freeScore += 2;
  if (['gemini','virgo'].includes(hSign(chart,6)??'')) freeScore += 1;
  if (uraP?.house === 2 || uraP?.house === 6) freeScore += 2;
  const mutCount = Object.values(chart.planets).filter(p =>
    ['gemini','virgo','sagittarius','pisces'].includes(p?.sign??'')).length;
  if (mutCount >= 4) freeScore += 1;
  if (isStrong(dg(chart,'saturn')) && satP?.house === 10) freeScore -= 1;
  const free: Light = freeScore >= 2 ? 'green' : freeScore <= 0 ? 'red' : 'yellow';

  // Business
  let bizScore = 0;
  if (isStrong(dg(chart,'mars'))) bizScore += 2;
  if (jupP?.house === 1 || jupP?.house === 10) bizScore += 2;
  if (marP?.house === 1 || marP?.house === 10) bizScore += 1;
  if (['aries','leo','sagittarius'].includes(h10s??'')) bizScore += 1;
  if (isWeak(dg(chart,'mars')) && isWeak(dg(chart,'jupiter'))) bizScore -= 2;
  const biz: Light = bizScore >= 2 ? 'green' : bizScore <= 0 ? 'red' : 'yellow';

  return { employment: emp, freelance: free, business: biz };
}

// ─── Birth stage assessments ──────────────────────────────────────────────────
interface BirthAssessment {
  title: string; icon: string; accent: string;
  shadow: string;
  script: string;
  habits: string[];
  resource: string;
  timing?: string;
}

function getBirthStages(chart: NatalChart, age: number): BirthAssessment[] {
  const moonP  = chart.planets.moon;
  const sunP   = chart.planets.sun;
  const merP   = chart.planets.mercury;
  const satP   = chart.planets.saturn;
  const nodeP  = chart.planets.node;
  const nep    = chart.planets.neptune;
  const h12s   = hSign(chart,12);
  const h4s    = hSign(chart,4);

  // ── Предрождение ──
  const h12planets = Object.values(chart.planets).filter(p => p.house === 12).length;
  const preStrength = (h12planets >= 2 ? 'высокая' : h12planets === 1 ? 'средняя' : 'базовая');
  const pre: BirthAssessment = {
    title:'Предрождение', icon:'🌑', accent:'#7788dd',
    shadow:`Неосознанные программы прошлых жизней и семейного рода. Активируются через изоляцию, болезни, скрытый стресс. Актуальность: ${preStrength}.`,
    script:'«Ты должен искупить / ты несёшь чужой груз»',
    habits:[
      'Участвуйте в благотворительности или донорстве — минимум раз в месяц',
      'Регулярная медитация или духовная практика — 10+ минут ежедневно',
      'Творчество под псевдонимом: пишите, рисуйте, снимайте — анонимно',
      'Готовьте еду и кормите других / выращивайте растения',
      'Изучайте историю рода: составьте родословную или закажите семейную книгу',
      'Практики тела: аюрведа, массаж, флоатинг — один ритуал в неделю',
    ],
    resource:'Глубинная интуиция, способность работать в изоляции, мистические инсайты, выносливость.',
    timing: h12planets >= 1 ? `${h12planets} планет в 12-м доме — тема предрождения активна. Особенно при транзитах Нептуна или Сатурна через 12-й дом.` : undefined,
  };

  // ── Рождение 1 — Луна/Мать ──
  const moonDg = dg(chart,'moon');
  const moonHouse = moonP?.house ?? 0;
  const isFamily4H = moonHouse === 4 || moonHouse === 12;
  const moonStress = isWeak(moonDg) || isFamily4H || chart.aspects?.some(
    a => (a.p1==='moon'||a.p2==='moon') && ['square','opposition'].includes(a.aspect) && a.orb < 4
  );
  const b1: BirthAssessment = {
    title:'Рождение 1 — Луна · Мать · Безопасность', icon:'🌊', accent:'#9ab5d4',
    shadow:`«Мир опасен, я должен всё контролировать сам». Тревога, битва за ресурсы, трудность в принятии помощи. ${moonStress ? '⚠ Луна под нагрузкой — тема активна.' : 'Луна в рабочей позиции.'}`,
    script: moonP?.sign === 'capricorn' || moonP?.sign === 'scorpio' || moonP?.sign === 'aquarius'
      ? '«Лучше бы тебя не было / твои чувства — обуза»'
      : '«Не доверяй / мир не добрый»',
    habits:[
      'Волонтёрство В ГРУППЕ (не соло!) — еженедельно. Принципиальный момент: только коллективное',
      'Массовые мероприятия: матчи, концерты, открытые тренинги — раз в месяц минимум',
      'Ритмичные телесные практики: плавание, цигун, йога — 2-3 раза в неделю',
      'Ритуал очищения: генеральная уборка, сжигание ненужного, стрижка волос — раз в квартал',
      'Готовьте и кормите других, создавайте уют — это прямая компенсация',
      'Ведите эмоциональный дневник: записывайте ощущения, не рационализируя',
    ],
    resource:'Командная энергия, интуиция на рынок, инвестиционное чутьё, усиленная сексуальность, харизма организатора.',
    timing: moonStress ? 'Активировать практики особенно важно при эмоциональных спадах и бытовых конфликтах.' : undefined,
  };

  // ── Рождение 2 — Солнце·Меркурий / Отец·Идентичность ──
  const sunDg  = dg(chart,'sun');
  const merDg  = dg(chart,'mercury');
  const sunStress = isWeak(sunDg) || chart.aspects?.some(
    a => (a.p1==='sun'||a.p2==='sun') && ['square','opposition'].includes(a.aspect) && a.orb < 3
  );
  const b2: BirthAssessment = {
    title:'Рождение 2 — Солнце · Отец · Идентичность', icon:'☀', accent:'#d4a853',
    shadow:`«Я недостаточно умён / особенный / видимый». Стремление доказать через достижения. ${sunStress ? '⚠ Солнце под нагрузкой — нужна особая работа с образом и публичностью.' : 'Солнце в рабочей позиции.'}`,
    script: sunP?.sign === 'leo' || sunP?.house === 5
      ? '«Не выпячивайся / будь как все»'
      : '«Ты не такой как X / тебе не дано»',
    habits:[
      'Ежемесячный контакт с ментором или коучем — оплачиваемый, плановый',
      `Изучайте второй язык активно: ${sunP?.sign === 'sagittarius'||sunP?.sign === 'gemini' ? 'у вас высокий языковой потенциал' : 'приложение + 15 минут ежедневно'}`,
      'Публичные записи: блог, соцсети, видео — минимум раз в неделю что-то своё',
      'Стройте необычный персональный образ — стиль, который отличает вас визуально',
      'Собирайте сертификаты, дипломы, публичные отзывы — социальные доказательства экспертности',
      'Практика бунта: делайте то, что вам говорили "не надо" в детстве, но безопасно',
    ],
    resource:`Широкая популярность, авторитет, удача с учителями и зарубежом, роль инспиратора. ${merP?.house === 3 ? 'Меркурий в 3-м — особый дар публичной речи.' : ''}`,
    timing:'Активировать особенно в момент профессиональных сомнений и перед важными публичными шагами.',
  };

  // ── Рождение 3 — Сатурн / Социум ──
  const satDg = dg(chart,'saturn');
  const satHouse = satP?.house ?? 0;
  const satStress = isWeak(satDg) || chart.aspects?.some(
    a => (a.p1==='saturn'||a.p2==='saturn') && ['square','opposition'].includes(a.aspect) && a.orb < 4
  );
  const b3: BirthAssessment = {
    title:'Рождение 3 — Сатурн · Социум · Хребет', icon:'🏛', accent:'#8899bb',
    shadow:`«Правила — для слабых / я не вписываюсь в иерархии». Уход от ответственности, отношения с властью как с врагом. ${satStress ? '⚠ Сатурн под нагрузкой — тема блокирована.' : `Сатурн в ${sRu(satP?.sign)} ${satHouse}H.`}`,
    script:'«Не взрослей / ты не справишься с ответственностью»',
    habits:[
      'Напишите личный список ценностей — что делает жизнь стоящей (минимум 20 пунктов) — обновляйте ежегодно',
      `Получите профессиональный сертификат или диплом${satHouse===10 ? ' — это ключевое' : ' в своей главной теме'}`,
      'Изучите один управленческий или лидерский навык раз в квартал',
      'Составьте трёхлетний план с конкретными измеримыми вехами — письменно',
      'Работайте внутри иерархии и зарабатывайте статус легально — не обходя правила',
      'Решите вопрос с личным пространством: своя комната / офис / территория — принципиально',
    ],
    resource:`Профессиональный авторитет, долгосрочные достижения, сильная репутация. ${satHouse===10 ? 'Сатурн в 10-м — один из мощнейших карьерных индикаторов.' : ''}`,
    timing: age < 30 ? `До возврата Сатурна (~29 лет) — зафиксируйте профессиональную идентичность.` :
            age < 60 ? `2-й цикл Сатурна: тема мастерства на пике. Результаты уже есть — закрепляйте.` :
            'Третий цикл: время передавать знания и оформлять наследие.',
  };

  // ── Рождение 4 — Северный Узел / Карма ──
  const nordSign = nodeP?.sign ?? null;
  const nordHouse = nodeP?.house ?? 0;
  const signOrder = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
  const nIdx = nordSign ? signOrder.indexOf(nordSign) : -1;
  const southSign = nIdx >= 0 ? signOrder[(nIdx+6)%12] : null;
  const southHouse = nordHouse ? (nordHouse<=6 ? nordHouse+6 : nordHouse-6) : 0;

  // Qualities to develop based on North Node sign
  const nodeQualities: Record<string,string[]> = {
    aries:       ['Действуйте первым — без ожидания разрешения','Развивайте физическую смелость и инициативу','Откажитесь от постоянного согласования с партнёрами'],
    taurus:      ['Создавайте материальную базу — собственность, деньги, активы','Практикуйте терпение в многолетних проектах','Наслаждайтесь физическими удовольствиями без вины'],
    gemini:      ['Пишите, говорите, публикуйтесь — ваш голос нужен','Изучайте несколько тем одновременно без завершения','Развивайте близкие контакты в ближнем окружении'],
    cancer:      ['Создавайте своё гнездо и семью осознанно','Позвольте себе быть уязвимым перед близкими','Питайтесь по режиму, заботьтесь о своём теле'],
    leo:         ['Выходите на сцену — буквально и метафорически','Создавайте: творчество, дети, личные проекты','Примите своё желание быть замеченным и оценённым'],
    virgo:       ['Погружайтесь в детали и методологию','Служите конкретной пользе — не абстрактным идеям','Выстройте режим и дисциплину тела'],
    libra:       ['Инвестируйте в ключевые партнёрства','Развивайте дипломатию и умение видеть обе стороны','Создавайте красоту и гармонию в своей среде'],
    scorpio:     ['Погружайтесь в глубину — психология, инвестиции, трансформация','Работайте с чужими ресурсами и деньгами','Практикуйте отпускание контроля'],
    sagittarius: ['Путешествуйте, учитесь, расширяйтесь','Публично делитесь своей философией и мировоззрением','Дайте себе свободу движения'],
    capricorn:   ['Строите карьеру методично — шаг за шагом','Берите ответственность за результат, не за процесс','Стремитесь к общественному признанию — это ваша задача'],
    aquarius:    ['Присоединяйтесь к сообществам единомышленников','Реформируйте системы, а не адаптируйтесь к ним','Развивайте технологические компетенции'],
    pisces:      ['Практикуйте медитацию, искусство, духовный поиск','Доверяйте интуиции в ключевых решениях','Служите чему-то большему, чем личные интересы'],
  };

  const b4: BirthAssessment = {
    title:`Рождение 4 — Узел · Карма · ${nordSign ? sRu(nordSign) : ''}`, icon:'🔮', accent:'#c084fc',
    shadow:`Уход в комфорт Южного Узла (${sRu(southSign)}, ${southHouse}H). Повторение старых паттернов вместо роста. Кармическая расплата: кризисы в ~37 и ~57 лет при уклонении.`,
    script:'«Зачем рисковать? Я и так неплохо знаю как / мне это не дано»',
    habits: nodeQualities[nordSign ?? ''] ?? [
      'Изучите свой Северный Узел — это ваша главная кармическая задача',
      'Делайте шаги в сторону Северного Узла еженедельно, даже маленькие',
      'Структурируйте мечты в конкретные последовательности действий',
    ],
    resource:`Реализация на глубочайшем уровне жизни. ${nordHouse ? `Тема «${HRU[nordHouse]}» — главная сцена.` : ''}`,
    timing: age >= 34 && age <= 40 ? '⚠ Вы в зоне первой кармической расплаты (~37±6 мес). Уклонение от задачи Узла сейчас — самое дорогое.' :
            age >= 54 && age <= 60 ? '⚠ Вы в зоне второй кармической расплаты (~57±6 мес). Критический момент переосмысления.' :
            `Следить за кризисами в ~37 и ~57 лет — они сигнализируют о нереализованном Узле.`,
  };

  return [pre, b1, b2, b3, b4];
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

function AccordionSection({ title, icon, accent, badge, children, defaultOpen = false, isDark }: {
  title: string; icon: string; accent: string; badge?: string;
  children: React.ReactNode; defaultOpen?: boolean; isDark: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      marginBottom: 10, borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${open ? accent+'44' : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)')}`,
      transition: 'border-color 0.25s',
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', background: open ? `${accent}12` : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
        border: 'none', cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.2s',
      }}>
        <span style={{ fontSize: 17 }}>{icon}</span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 13, color: open ? accent : (isDark ? '#cbd5e1' : '#374151') }}>
          {title}
        </span>
        {badge && (
          <span style={{
            padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: `${accent}22`, color: accent,
          }}>{badge}</span>
        )}
        <span style={{
          fontSize: 11, color: isDark ? '#475569' : '#9ca3af',
          transform: open ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.3s cubic-bezier(.4,0,.2,1)',
          display: 'inline-block',
        }}>▼</span>
      </button>
      <div className={`pa-acc-body ${open ? 'pa-acc-open' : 'pa-acc-shut'}`}>
        <div style={{ padding: '14px 16px', background: isDark ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.02)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ score, max = 4, color, label, icon, desc, isDark }: {
  score: number; max?: number; color: string; label: string; icon: string; desc: string; isDark: boolean;
}) {
  const pct = Math.round((score / max) * 100);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.width = '0';
    const t = setTimeout(() => {
      if (ref.current) ref.current.style.width = `${pct}%`;
    }, 50);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10,
      padding: '10px 12px', borderRadius: 9,
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      border: `1px solid ${color}22`,
    }} className="pa-hover-lift">
      <span style={{ fontSize: 20, lineHeight: 1, marginTop: 2 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: isDark ? '#e2e8f0' : '#1e293b' }}>{label}</span>
          <span style={{ fontWeight: 700, fontSize: 13, color, marginLeft: 'auto' }}>
            {'+'.repeat(score)}
            <span style={{ color: isDark ? '#334155' : '#d1d5db' }}>{'·'.repeat(max - score)}</span>
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb', marginBottom: 5 }}>
          <div ref={ref} className="pa-score-fill"
            style={{ height: '100%', borderRadius: 2, background: color, width: 0 }} />
        </div>
        <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#6b7280', lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

function TrafficLight({ label, icon, light, reason, isDark }: {
  label: string; icon: string; light: Light; reason: string; isDark: boolean;
}) {
  const colors = { green: '#22c55e', yellow: '#f59e0b', red: '#f87171' };
  const texts  = { green: 'Зелёный свет', yellow: 'Нейтрально', red: 'Красный свет' };
  const c = colors[light];
  return (
    <div style={{
      flex: '1 1 160px', padding: '14px', borderRadius: 12,
      background: `${c}0d`, border: `1px solid ${c}33`,
    }} className="pa-hover-lift">
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 13, color: isDark ? '#e2e8f0' : '#1e293b', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%', background: c,
          boxShadow: `0 0 8px ${c}88`, flexShrink: 0,
        }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{texts[light]}</span>
      </div>
      <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#6b7280', lineHeight: 1.5 }}>{reason}</div>
    </div>
  );
}

// ─── Kompensatorika Tab ───────────────────────────────────────────────────────
function KompensatorikaTab({ chart, isDark, birthDate }: {
  chart: NatalChart; isDark: boolean; birthDate?: string;
}) {
  const age = useMemo(() => calcAge(birthDate ?? chart.metadata?.date), [birthDate, chart.metadata?.date]);
  const archetype = useMemo(() => getArchetype(chart), [chart]);
  const generators = useMemo(() => getMoneyGenerators(chart), [chart]);
  const lights = useMemo(() => getCareerLights(chart), [chart]);
  const stages = useMemo(() => getBirthStages(chart, age), [chart, age]);

  const archConfig = {
    predator: {
      icon:'⚔', label:'Финансовый хищник', color:'#d45b5b',
      desc:'Инвестируйте быстро и агрессивно. Держите страховой запас 2–3 месяца — остальное пускайте в рост. Лучше работаете соло или с минимальной командой. Внешнее финансирование и долги — избегайте. Один флагманский проект, а не десять маленьких.',
      do:['Быстрые решения без долгих согласований','Высокомаржинальные ниши, конкурентные рынки','Сделки с ограниченным сроком — это ваша среда'],
      dont:['Долгосрочные пассивные инвестиции (скучно — саботируете)','Партнёрства на равных — теряете эффективность','Накопительные стратегии с горизонтом 10+ лет'],
    },
    farmer: {
      icon:'🌾', label:'Финансовый фермер', color:'#34d399',
      desc:'Резерв — сначала. Откладывайте 10% от каждого поступления в низкорисковые активы. Внешние инвестиции и партнёрства — ваш усилитель, не угроза. Стабильные источники дохода предпочтительнее переменных. Сложные финансовые системы — ваша зона силы.',
      do:['Страховой фонд минимум 6 месяцев расходов','Партнёрства с дополняющими людьми','Недвижимость, дивидендные инструменты'],
      dont:['Спекулятивные ставки и быстрые схемы','Работа в одиночку без поддерживающей системы','Игнорирование финансового учёта'],
    },
    universal: {
      icon:'🌀', label:'Универсальный стратег', color:'#818cf8',
      desc:'Комбинируете стратегии под контекст. В период роста — режим хищника. В период стабилизации — режим фермера. Ключ: осознанно выбирайте режим, а не действуйте по настроению.',
      do:['Ситуативное переключение между стратегиями','Диверсификация: несколько потоков дохода','Пересмотр финансовой стратегии раз в год'],
      dont:['Смешивать режимы неосознанно','Жить без финансового плана — «само сложится»','Игнорировать циклы рынка и личные энергетические циклы'],
    },
  }[archetype];

  return (
    <div className="pa-in">
      {/* Financial archetype */}
      <div style={{
        borderRadius: 14, padding: '18px', marginBottom: 16,
        background: isDark
          ? `linear-gradient(135deg, rgba(15,15,35,0.9), rgba(${archetype==='predator'?'80,20,20':archetype==='farmer'?'20,60,40':'30,20,70'},0.4))`
          : `linear-gradient(135deg, #fafafa, ${archConfig.color}0d)`,
        border: `1px solid ${archConfig.color}44`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{
            fontSize: 28, width: 50, height: 50, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${archConfig.color}22`, border: `2px solid ${archConfig.color}55`,
          }}>{archConfig.icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: archConfig.color }}>{archConfig.label}</div>
            <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#6b7280' }}>Финансовый архетип карты</div>
          </div>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.7 }}>
          {archConfig.desc}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ borderRadius: 8, padding: '10px 12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', marginBottom: 6 }}>ДЕЛАТЬ</div>
            {archConfig.do.map((t,i) => (
              <div key={i} style={{ fontSize: 12, color: isDark?'#cbd5e1':'#374151', marginBottom: 4, paddingLeft: 12, position:'relative' }}>
                <span style={{ position:'absolute', left:0, color:'#22c55e' }}>→</span>{t}
              </div>
            ))}
          </div>
          <div style={{ borderRadius: 8, padding: '10px 12px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171', marginBottom: 6 }}>НЕ ДЕЛАТЬ</div>
            {archConfig.dont.map((t,i) => (
              <div key={i} style={{ fontSize: 12, color: isDark?'#cbd5e1':'#374151', marginBottom: 4, paddingLeft: 12, position:'relative' }}>
                <span style={{ position:'absolute', left:0, color:'#f87171' }}>×</span>{t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Career traffic lights */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: isDark?'#475569':'#9ca3af', letterSpacing:'0.07em', marginBottom: 10 }}>
          СВЕТОФОР КАРЬЕРЫ
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <TrafficLight icon="🏢" label="Найм / корпорат" light={lights.employment} isDark={isDark}
            reason={lights.employment==='green' ? 'Сатурн силён — иерархии работают на вас.' : lights.employment==='red' ? 'Уран/нестандартная карьерная ось — найм ограничивает.' : 'Нейтральная позиция — зависит от контекста.'} />
          <TrafficLight icon="🖥" label="Фриланс / ремесло" light={lights.freelance} isDark={isDark}
            reason={lights.freelance==='green' ? 'Меркурий / изменчивость — для вас свобода продуктивнее.' : lights.freelance==='red' ? 'Нет устойчивой структуры для нестабильного дохода.' : 'Возможно при наличии финансовой подушки.'} />
          <TrafficLight icon="🚀" label="Бизнес / запуск" light={lights.business} isDark={isDark}
            reason={lights.business==='green' ? 'Марс и Юпитер дают предпринимательский импульс.' : lights.business==='red' ? 'Слабый карьерный двигатель — сначала найм/ученичество.' : 'Бизнес возможен при сильном партнёре или чёткой нише.'} />
        </div>
      </div>

      {/* Money generators */}
      <AccordionSection title="Деньгогенераторы" icon="💰" accent="#d4a853" isDark={isDark}
        badge={`${generators.length} активных`} defaultOpen={true}>
        <div style={{ fontSize: 12, color: isDark?'#94a3b8':'#6b7280', marginBottom: 12, lineHeight: 1.5 }}>
          Инструменты, которые работают именно в вашей карте. Чем больше «+», тем сильнее природный канал.
        </div>
        {generators.map((g,i) => (
          <ScoreBar key={i} score={g.score} max={4} color="#d4a853"
            label={g.label} icon={g.icon} desc={g.desc} isDark={isDark} />
        ))}
      </AccordionSection>

      {/* Birth stages */}
      <div style={{ fontSize: 11, fontWeight: 700, color: isDark?'#475569':'#9ca3af', letterSpacing:'0.07em', margin: '18px 0 10px' }}>
        КОМПЕНСАТОРНЫЕ ПРАКТИКИ ПО РОЖДЕНИЯМ
      </div>
      <div style={{ fontSize: 12, color: isDark?'#64748b':'#9ca3af', marginBottom: 14, lineHeight: 1.5 }}>
        Каждое рождение — слой психологического программирования. Привычки ниже нейтрализуют тени и открывают ресурс.
      </div>
      {stages.map((s, i) => (
        <AccordionSection key={i} title={s.title} icon={s.icon} accent={s.accent}
          isDark={isDark} defaultOpen={i === 3}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 4, letterSpacing:'0.05em' }}>ТЕНЬ</div>
            <div style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 13,
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
              color: isDark ? '#fca5a5' : '#dc2626', lineHeight: 1.6,
            }}>{s.shadow}</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 4, letterSpacing:'0.05em' }}>СКРИПТ / ПРЕДПИСАНИЕ</div>
            <div style={{ fontSize: 13, color: isDark?'#94a3b8':'#6b7280', fontStyle:'italic', paddingLeft: 10, borderLeft:`2px solid ${s.accent}55` }}>
              {s.script}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: s.accent, marginBottom: 8, letterSpacing:'0.05em' }}>КОМПЕНСАТОРНЫЕ ПРИВЫЧКИ</div>
            {s.habits.map((h, j) => (
              <div key={j} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7,
                fontSize: 13, color: isDark?'#cbd5e1':'#374151', lineHeight: 1.5,
              }}>
                <span style={{
                  flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
                  background: `${s.accent}22`, border: `1px solid ${s.accent}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: s.accent, marginTop: 1,
                }}>{j+1}</span>
                <span>{h}</span>
              </div>
            ))}
          </div>
          <div style={{
            padding: '8px 12px', borderRadius: 8, fontSize: 12,
            background: `${s.accent}0d`, border: `1px solid ${s.accent}33`,
            color: s.accent, lineHeight: 1.5,
          }}>
            <span style={{ fontWeight: 700 }}>Ресурс: </span>{s.resource}
          </div>
          {s.timing && (
            <div style={{
              marginTop: 8, padding: '6px 10px', borderRadius: 6, fontSize: 11,
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
              color: '#fbbf24',
            }}>⏱ {s.timing}</div>
          )}
        </AccordionSection>
      ))}
    </div>
  );
}

// ─── Main tabs ────────────────────────────────────────────────────────────────
const MAIN_TABS = [
  { key: 'natal',   icon: '🔮', label: 'Интерпретация',  color: '#818cf8' },
  { key: 'spheres', icon: '📋', label: 'Сферы жизни',    color: '#34d399' },
  { key: 'kompens', icon: '⚡', label: 'Компенсаторика', color: '#f59e0b' },
] as const;
type MainTabKey = typeof MAIN_TABS[number]['key'];

// ─── Export ───────────────────────────────────────────────────────────────────
export default function PAReportBlock({ chart, name, theme, birthDate }: Props) {
  const [tab, setTab] = useState<MainTabKey>('natal');
  const [tabKey, setTabKey] = useState(0);
  const isDark = theme === 'dark';

  useEffect(() => { injectCSS(); }, []);

  function switchTab(k: MainTabKey) {
    setTab(k);
    setTabKey(n => n + 1);
  }

  const activeConf = MAIN_TABS.find(t => t.key === tab)!;

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: isDark ? '#e2e8f0' : '#1e293b',
    }}>
      {/* ── Top navigation ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20,
        padding: '5px 6px', borderRadius: 14,
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        flexWrap: 'wrap',
      }}>
        {name && (
          <span style={{
            fontSize: 12, color: isDark ? '#64748b' : '#9ca3af',
            paddingLeft: 8, marginRight: 4,
          }}>
            {name} ·
          </span>
        )}
        {MAIN_TABS.map(t => (
          <button key={t.key} className="pa-tab-pill" onClick={() => switchTab(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: tab === t.key ? 700 : 500, fontSize: 13,
            background: tab === t.key ? `${t.color}1e` : 'transparent',
            color: tab === t.key ? t.color : (isDark ? '#94a3b8' : '#6b7280'),
            outline: tab === t.key ? `2px solid ${t.color}44` : '2px solid transparent',
            boxShadow: tab === t.key ? `0 2px 16px ${t.color}22` : 'none',
          }}>
            <span style={{ fontSize: 15 }}>{t.icon}</span>
            <span>{t.label}</span>
            {tab === t.key && (
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: t.color, marginLeft: 2,
                boxShadow: `0 0 6px ${t.color}`,
              }} className="pa-badge-pop" />
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div key={tabKey} className="pa-in">
        {tab === 'natal' && (
          <InterpretationPanel chart={chart} name={name} theme={theme} />
        )}
        {tab === 'spheres' && (
          <LifeSphereReports chart={chart} name={name} theme={theme} birthDate={birthDate} />
        )}
        {tab === 'kompens' && (
          <KompensatorikaTab chart={chart} isDark={isDark} birthDate={birthDate} />
        )}
      </div>
    </div>
  );
}
