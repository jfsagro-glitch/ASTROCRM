/**
 * LifeSphereReports.tsx
 * Detailed life-sphere reports in the style of Pavel Andreev's school.
 * Spheres: Финансы · Здоровье · Профессия · Энергия · Жизненный план
 */

import React, { useState, useMemo } from 'react';
import type { NatalChart, PlanetData } from '../types/astro';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  chart: NatalChart;
  name?: string;
  theme: 'dark' | 'light';
  birthDate?: string; // YYYY-MM-DD for life-plan age calculations
}

type SphereKey = 'finance' | 'health' | 'career' | 'energy' | 'plan';

// ─── Sign metadata ────────────────────────────────────────────────────────────
const SIGNS: Record<string, {
  ru: string; element: string; mode: string; keyword: string;
  body_zone: string; body_desc: string;
}> = {
  aries:       { ru: 'Овен',      element: 'Огонь', mode: 'Кардинальный', keyword: 'Инициатива',
    body_zone: 'Голова, мозг, лицо', body_desc: 'склонность к головным болям, сосудистым реакциям, риск переутомления из-за импульсивности' },
  taurus:      { ru: 'Телец',     element: 'Земля', mode: 'Фиксированный', keyword: 'Ресурс',
    body_zone: 'Горло, шея, щитовидная железа', body_desc: 'уязвимость горла и голоса, гормональный баланс, важна умеренность в питании' },
  gemini:      { ru: 'Близнецы',  element: 'Воздух', mode: 'Мутабельный', keyword: 'Коммуникация',
    body_zone: 'Лёгкие, руки, нервная система', body_desc: 'склонность к нервному истощению, бронхиту, важна разгрузка информационного потока' },
  cancer:      { ru: 'Рак',       element: 'Вода', mode: 'Кардинальный', keyword: 'Защита',
    body_zone: 'Желудок, грудь, лимфатическая система', body_desc: 'психосоматика ЖКТ, иммунитет реагирует на эмоциональное состояние' },
  leo:         { ru: 'Лев',       element: 'Огонь', mode: 'Фиксированный', keyword: 'Творчество',
    body_zone: 'Сердце, позвоночник, спина', body_desc: 'нагрузка на сердечно-сосудистую систему, спину; важен режим и умеренная активность' },
  virgo:       { ru: 'Дева',      element: 'Земля', mode: 'Мутабельный', keyword: 'Анализ',
    body_zone: 'Кишечник, пищеварение, поджелудочная', body_desc: 'чувствительное пищеварение, склонность к тревожным расстройствам, помогают распорядок и диета' },
  libra:       { ru: 'Весы',      element: 'Воздух', mode: 'Кардинальный', keyword: 'Баланс',
    body_zone: 'Почки, поясница, кожа', body_desc: 'уязвимость почек и поясницы, важен водный баланс и равновесие в отношениях' },
  scorpio:     { ru: 'Скорпион',  element: 'Вода', mode: 'Фиксированный', keyword: 'Трансформация',
    body_zone: 'Репродуктивная система, детокс-органы', body_desc: 'гормональные циклы, детоксикация, важны практики выхода из стресса' },
  sagittarius: { ru: 'Стрелец',   element: 'Огонь', mode: 'Мутабельный', keyword: 'Расширение',
    body_zone: 'Бёдра, печень, седалищный нерв', body_desc: 'печень и ишиас, склонность к перееданию и излишествам, помогает движение' },
  capricorn:   { ru: 'Козерог',   element: 'Земля', mode: 'Кардинальный', keyword: 'Структура',
    body_zone: 'Кости, суставы, кожа, зубы', body_desc: 'суставы и скелет, склонность к хроническим заболеваниям от перегрузки, важен отдых' },
  aquarius:    { ru: 'Водолей',   element: 'Воздух', mode: 'Фиксированный', keyword: 'Инновация',
    body_zone: 'Голени, лодыжки, кровообращение', body_desc: 'кровеносная и нервная система, склонность к спазмам, важны прогулки и дыхательные практики' },
  pisces:      { ru: 'Рыбы',      element: 'Вода', mode: 'Мутабельный', keyword: 'Растворение',
    body_zone: 'Стопы, лимфатическая система, иммунитет', body_desc: 'психосоматика, чувствительность к токсинам и алкоголю, важна защита личных границ' },
};

// ─── Planet metadata ──────────────────────────────────────────────────────────
const PLANETS: Record<string, { ru: string; color: string; key: string }> = {
  sun:     { ru: 'Солнце',   color: '#d4a853', key: '☉' },
  moon:    { ru: 'Луна',     color: '#9ab5d4', key: '☽' },
  mercury: { ru: 'Меркурий', color: '#88c4a8', key: '☿' },
  venus:   { ru: 'Венера',   color: '#d48aaa', key: '♀' },
  mars:    { ru: 'Марс',     color: '#d45b5b', key: '♂' },
  jupiter: { ru: 'Юпитер',   color: '#d4a04a', key: '♃' },
  saturn:  { ru: 'Сатурн',   color: '#8899bb', key: '♄' },
  uranus:  { ru: 'Уран',     color: '#5bbbcc', key: '⛢' },
  neptune: { ru: 'Нептун',   color: '#7788dd', key: '♆' },
  pluto:   { ru: 'Плутон',   color: '#bb77aa', key: '♇' },
  node:    { ru: 'С.Узел',   color: '#ccaa44', key: '☊' },
  chiron:  { ru: 'Хирон',    color: '#66aabb', key: '⚷' },
};

const HOUSES: Record<number, { name: string; theme: string }> = {
  1:  { name: 'Дом Я',             theme: 'личность и тело' },
  2:  { name: 'Дом ресурса',       theme: 'деньги и ценности' },
  3:  { name: 'Дом ближнего',      theme: 'коммуникации' },
  4:  { name: 'Дом рода',          theme: 'семья и корни' },
  5:  { name: 'Дом творчества',    theme: 'самовыражение' },
  6:  { name: 'Дом службы',        theme: 'работа и здоровье' },
  7:  { name: 'Дом партнёра',      theme: 'партнёрства' },
  8:  { name: 'Дом трансформации', theme: 'чужие ресурсы' },
  9:  { name: 'Дом экспертизы',    theme: 'знание и смысл' },
  10: { name: 'Дом статуса',       theme: 'карьера и репутация' },
  11: { name: 'Дом аудитории',     theme: 'сообщество и цели' },
  12: { name: 'Дом тайного',       theme: 'скрытое и кармическое' },
};

// Ruler of a house by sign on its cusp (traditional + outer co-rulers)
const SIGN_RULER: Record<string, string> = {
  aries: 'mars', taurus: 'venus', gemini: 'mercury', cancer: 'moon',
  leo: 'sun', virgo: 'mercury', libra: 'venus', scorpio: 'pluto',
  sagittarius: 'jupiter', capricorn: 'saturn', aquarius: 'uranus', pisces: 'neptune',
};
const SIGN_TRAD_RULER: Record<string, string> = {
  aries: 'mars', taurus: 'venus', gemini: 'mercury', cancer: 'moon',
  leo: 'sun', virgo: 'mercury', libra: 'venus', scorpio: 'mars',
  sagittarius: 'jupiter', capricorn: 'saturn', aquarius: 'saturn', pisces: 'jupiter',
};

function getHouseSign(chart: NatalChart, houseNum: number): string | null {
  const key = String(houseNum);
  return chart.houses[key]?.sign ?? null;
}

function getHouseRuler(chart: NatalChart, houseNum: number): string | null {
  const sign = getHouseSign(chart, houseNum);
  return sign ? (SIGN_RULER[sign] ?? null) : null;
}

function getPlanetsInHouse(chart: NatalChart, houseNum: number): Array<[string, PlanetData]> {
  return Object.entries(chart.planets).filter(([, p]) => p.house === houseNum);
}

function getRulerData(chart: NatalChart, houseNum: number): PlanetData | null {
  const ruler = getHouseRuler(chart, houseNum);
  return ruler ? (chart.planets[ruler] ?? null) : null;
}

function signRu(sign: string | null | undefined): string {
  return sign ? (SIGNS[sign]?.ru ?? sign) : '—';
}

function planetRu(name: string): string {
  return PLANETS[name]?.ru ?? name;
}

function dignityBadge(d: string | null | undefined): string {
  if (!d) return '';
  if (d === 'domicile') return ' ⭐ в домициле';
  if (d === 'exaltation') return ' ⬆ в экзальтации';
  if (d === 'detriment') return ' ⬇ в изгнании';
  if (d === 'fall') return ' ⬇ в падении';
  return '';
}

function planetBadge(name: string, p: PlanetData, chart: NatalChart): string {
  const dg = chart.dignities?.[name]?.dignity;
  const retro = p.retrograde ? ' Rx' : '';
  return `${PLANETS[name]?.key ?? ''} ${planetRu(name)} в ${signRu(p.sign)} · ${p.house} дом${retro}${dignityBadge(dg)}`;
}

// ─── Aspect helpers ───────────────────────────────────────────────────────────
function getAspectsTo(chart: NatalChart, planetName: string): typeof chart.aspects {
  return (chart.aspects || []).filter(a => a.p1 === planetName || a.p2 === planetName);
}

function describeAspect(type: string): { tone: 'good' | 'tense' | 'neutral'; short: string } {
  const map: Record<string, { tone: 'good' | 'tense' | 'neutral'; short: string }> = {
    trine:       { tone: 'good',    short: 'трин — природная поддержка' },
    sextile:     { tone: 'good',    short: 'секстиль — возможности при усилии' },
    conjunction: { tone: 'neutral', short: 'соединение — слияние тем' },
    opposition:  { tone: 'tense',   short: 'оппозиция — напряжение и поляризация' },
    square:      { tone: 'tense',   short: 'квадрат — вызов, генератор энергии' },
    quincunx:    { tone: 'tense',   short: 'квинконс — хроническое напряжение' },
  };
  return map[type] ?? { tone: 'neutral', short: type };
}

// ─── UI helpers ──────────────────────────────────────────────────────────────
function useDark(theme: 'dark' | 'light') { return theme === 'dark'; }

function Card({ children, isDark, accent = '#818cf8' }: {
  children: React.ReactNode; isDark: boolean; accent?: string;
}) {
  return (
    <div style={{
      borderRadius: 14, border: `1px solid ${accent}33`,
      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      padding: '16px 18px', marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

function SectionHead({ icon, title, sub, accent = '#818cf8', isDark }: {
  icon: string; title: string; sub?: string; accent?: string; isDark: boolean;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 16, color: accent }}>{title}</span>
      </div>
      {sub && <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#6b7280', marginLeft: 32 }}>{sub}</div>}
    </div>
  );
}

function Tag({ label, color, isDark }: { label: string; color: string; isDark: boolean }) {
  void isDark;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, marginRight: 6, marginBottom: 4,
      background: color + '22', color, border: `1px solid ${color}44`,
    }}>{label}</span>
  );
}

function Callout({ children, color = '#818cf8', isDark }: {
  children: React.ReactNode; color?: string; isDark: boolean;
}) {
  return (
    <div style={{
      borderLeft: `3px solid ${color}`, paddingLeft: 12, margin: '10px 0',
      color: isDark ? '#cbd5e1' : '#374151', fontSize: 13, lineHeight: 1.7,
    }}>{children}</div>
  );
}

function Pill({ label, tone, isDark }: { label: string; tone: 'good' | 'tense' | 'neutral'; isDark: boolean }) {
  void isDark;
  const colors = { good: '#22c55e', tense: '#f87171', neutral: '#fbbf24' };
  const c = colors[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
      background: c + '22', color: c, border: `1px solid ${c}44`,
    }}>{label}</span>
  );
}

// ─── Finance planet keywords for 2nd house ────────────────────────────────────
const PLANET_MONEY_STYLE: Record<string, string> = {
  sun:     'Зарабатывает через личный авторитет, лидерство, узнаваемость. Финансы связаны с самооценкой и признанием. Важно делать то, что «зажигает» — иначе деньги не идут.',
  moon:    'Доход непостоянен, колышется как прилив — но интуиция на рынок отличная. Финансовое самочувствие зависит от эмоционального состояния. Хорошо зарабатывает на заботе, еде, недвижимости.',
  mercury: 'Деньги через слово, информацию, посредничество. Несколько потоков дохода одновременно. Умеет перераспределять ресурсы и находить выгодные сделки.',
  venus:   'Природный талант к созданию ценности и красоты. Привлекает деньги с лёгкостью, через удовольствие и эстетику. Риск — транжирство.',
  mars:    'Зарабатывает активно, быстро, напористо. Финансы требуют действия и конкуренции. Может импульсивно тратить. Хорошо в предпринимательстве.',
  jupiter: 'Щедрость Юпитера притягивает изобилие. Финансовая удача, но риск переоценить возможности. Хорошие деньги от образования, консалтинга, экспансии.',
  saturn:  'Деньги приходят медленно, но надёжно — через дисциплину и структуру. Сатурн во 2 доме — Мидас с задержкой. После 30 финансы укрепляются.',
  uranus:  'Нестандартные источники дохода, скачки и неожиданности. Финансовая независимость важнее стабильности. IT, стартапы, инновации.',
  neptune: 'Творчество, духовные практики, помогающие профессии. Границы размыты — важна финансовая грамотность. Риск обмана и идеализации.',
  pluto:   'Трансформационная сила в деньгах: теряет и восстанавливает капитал несколько раз. Интерес к инвестициям, кризис-менеджменту, чужим деньгам.',
  chiron:  'Рана вокруг самоценности и ресурса. Научившись ценить себя — открывает мощный финансовый поток. Консультирует других по деньгам лучше всех.',
};

const SIGN_MONEY_STYLE: Record<string, string> = {
  aries:       'Финансовая энергия напористая и быстрая. Деньги приходят через инициативу и первопроходство. Риск — импульсивные траты.',
  taurus:      'Финансовая зона усилена — Телец здесь как дома. Деньги через терпение, материальные ценности, чувственный опыт. Умеет копить.',
  gemini:      'Несколько источников, гибкость, торговля идеями. Доход через коммуникации, обучение, посредничество. Нужна финансовая систематизация.',
  cancer:      'Интуитивное чутьё на деньги. Хорошо инвестирует в недвижимость и семейный бизнес. Эмоциональная связь с ресурсом.',
  leo:         'Деньги любят этого человека — и он любит деньги. Щедрость и риск. Финансы связаны с признанием и статусом.',
  virgo:       'Аналитический подход к деньгам. Умеет оптимизировать расходы. Риск — недооценивать свои услуги.',
  libra:       'Деньги через партнёрства и сотрудничество. Красота и дипломатия как ресурс. Важно научиться говорить о деньгах прямо.',
  scorpio:     'Глубокое понимание финансовых потоков. Умеет работать с чужими ресурсами, инвестициями. Риск — всё или ничего.',
  sagittarius: 'Деньги через знание, международные связи, философию. Оптимизм притягивает финансовую удачу, но нужна дисциплина расходов.',
  capricorn:   'Деловая хватка и долгосрочное мышление. Финансы растут со временем. Иногда слишком осторожен — упускает возможности.',
  aquarius:    'Нестандартные финансовые стратегии. Деньги через инновации, сообщество, технологии. Независимость важнее богатства.',
  pisces:      'Творческий и духовный доход. Границы с деньгами размыты — важна финансовая структура. Интуиция на инвестиции развита.',
};

// ─── Career sign/house keywords ──────────────────────────────────────────────
const MC_SIGN_CAREER: Record<string, string> = {
  aries:       'Карьера первопроходца. Вы созданы начинать новое, вести за собой, конкурировать. Идеально: предпринимательство, спорт, военное дело, кризис-менеджмент. Публичный образ — решительный и энергичный.',
  taurus:      'Карьера строителя. Ваша репутация — надёжность и профессиональное мастерство. Сфера: финансы, искусство, архитектура, продовольствие, роскошь. Медленный, но устойчивый рост.',
  gemini:      'Карьера коммуникатора. Вы незаменимы там, где нужно говорить, писать, координировать. Журналистика, PR, торговля, образование, IT. Несколько ролей одновременно — норма.',
  cancer:      'Карьера хранителя. Ваша профессиональная сила — эмпатия и забота. Медицина, психология, недвижимость, семейный бизнес, кулинария. Репутация строится на доверии.',
  leo:         'Карьера лидера и творца. Вы рождены быть заметным — на сцене, в руководстве, в медиа. Шоу-бизнес, управление, политика, образование. Репутация = личная харизма.',
  virgo:       'Карьера аналитика и специалиста. Репутация строится на безупречном качестве работы. Медицина, наука, редактура, бухгалтерия, здоровый образ жизни. Детали решают всё.',
  libra:       'Карьера дипломата и эстета. Вы профессионально умеете находить баланс. Право, медиация, дизайн, PR, психология отношений. Репутация через партнёрства.',
  scorpio:     'Карьера трансформатора. Вы работаете с тем, что другие боятся. Психология, хирургия, детективная работа, финансы, исследования. Репутация через глубину и непреклонность.',
  sagittarius: 'Карьера эксперта и путешественника. Международный масштаб, философия, образование, туризм, право. Репутация через мудрость и экспансию.',
  capricorn:   'Карьера руководителя. Вы рождены для иерархии — и со временем оказываетесь на её вершине. Управление, государственная служба, строительство. Репутация через дисциплину.',
  aquarius:    'Карьера реформатора. Вы меняете системы и создаёте будущее. IT, наука, социальные инновации, НКО, электронные технологии. Репутация через независимость.',
  pisces:      'Карьера целителя и творца. Искусство, духовные практики, медицина, кино, социальная работа. Репутация через сострадание и вдохновение.',
};

// ─── Energy / Sun keywords ────────────────────────────────────────────────────
const SUN_ENERGY: Record<string, string> = {
  aries:       'Взрывной энергетический потенциал. Заряжаетесь от новых вызовов и быстрых старта. Риск выгорания при однообразии.',
  taurus:      'Мощная, устойчивая энергия. Долго «раскачиваетесь», но в ресурсе — неутомимы. Восстановление через природу, тело, удовольствия.',
  gemini:      'Нервная, рассеянная энергия. Быстро загораетесь и переключаетесь. Восстановление через смену деятельности, общение и чтение.',
  cancer:      'Цикличная, лунная энергия. Пики активности чередуются со спадами. Восстановление через дом, уединение, заботу о близких.',
  leo:         'Солнечная, щедрая энергия. Горите, когда вас видят и ценят. Нужны сцена и аплодисменты. Восстановление через творчество и игру.',
  virgo:       'Тихая, работающая энергия. Продуктивны в деталях, но устаёте от хаоса. Восстановление через режим, чистоту и уединение.',
  libra:       'Социальная энергия, зависящая от гармонии. Нужна красивая среда и приятные люди. Конфликты истощают быстро.',
  scorpio:     'Интенсивная, трансформационная энергия. Полное погружение или полная пустота. Восстановление через воду, тишину, глубокие практики.',
  sagittarius: 'Экспансивная, оптимистическая энергия. Заряжаетесь от движения, путешествий, новых идей. Риск перерасхода сил.',
  capricorn:   'Экономная, стратегическая энергия. Работаете долго и без шума. Восстановление через структуру, сон, природу.',
  aquarius:    'Нелинейная, вспышечная энергия. Озарения чередуются с отстранённостью. Восстановление через одиночество и нестандартные занятия.',
  pisces:      'Чуткая, впитывающая энергия. Легко перегружаетесь чужими эмоциями. Восстановление через воду, музыку, медитацию.',
};

const MARS_ENERGY: Record<string, string> = {
  aries:       'Марс дома — максимальная боевая готовность. Действуете первым и напористо.',
  taurus:      'Энергия упорная и медленная, но нерушимая. Не спешите, но и не сдаётесь.',
  gemini:      'Энергия разлетается в стороны. Сильны в коротких спринтах и переговорах.',
  cancer:      'Защитная энергия. Сила активируется ради близких. Косвенные действия эффективнее лобовых.',
  leo:         'Энергия лидера. Действуете с огнём и достоинством. Конкуренция — топливо.',
  virgo:       'Точная, методичная энергия. Мощь в деталях и совершенствовании процессов.',
  libra:       'Энергия в балансировании — сильны в переговорах, слабее в открытом противостоянии.',
  scorpio:     'Марс в силе. Стратегическая, неотвратимая энергия. Умеете ждать нужного момента.',
  sagittarius: 'Энергия приключений и расширения. Мощь через целеустремлённость и веру.',
  capricorn:   'Дисциплинированная, долгосрочная энергия. Марс строит карьеру шаг за шагом.',
  aquarius:    'Революционная энергия. Лучшие результаты — в нестандартных, коллективных задачах.',
  pisces:      'Тонкая, интуитивная энергия. Сила через творчество, сострадание, духовные практики.',
};

// ─── Saturn life plan phases ──────────────────────────────────────────────────
function getSaturnPhase(ageNow: number): {
  phase: string; desc: string; keywords: string; nextReturn: number; color: string;
} {
  const cycle = ageNow % 29.5;
  const saturnReturn = Math.floor(ageNow / 29.5) * 29.5 + 29.5;
  const nextReturn = Math.round(saturnReturn - ageNow);

  if (cycle < 7)   return { phase: 'Посев (0–7)',     color: '#34d399',
    desc: 'Период формирования фундамента. Идёт закладка базовых структур — физических, психологических, социальных.',
    keywords: 'начало, потенциал, обучение', nextReturn };
  if (cycle < 14)  return { phase: 'Рост (7–14)',     color: '#60a5fa',
    desc: 'Активное освоение мира. Испытание первых принципов реальностью, поиск своего пути.',
    keywords: 'расширение, эксперименты, рост', nextReturn };
  if (cycle < 21)  return { phase: 'Кризис (14–21)',  color: '#f59e0b',
    desc: 'Столкновение с ограничениями и необходимостью выбора. Первый серьёзный кризис идентичности.',
    keywords: 'выбор, трудности, взросление', nextReturn };
  if (cycle < 29.5) return { phase: 'Зрелость (21–29)', color: '#a78bfa',
    desc: 'Период строительства реальной взрослой жизни. Подготовка к первому возврату Сатурна.',
    keywords: 'ответственность, карьера, самостоятельность', nextReturn };
  return { phase: 'Возврат Сатурна', color: '#f87171',
    desc: 'Ключевая точка переосмысления. Сатурн требует итогов и начала нового цикла.',
    keywords: 'итоги, перестройка, новый уровень', nextReturn };
}

function getJupiterPhase(ageNow: number): { phase: string; desc: string; color: string } {
  const cycle = ageNow % 12;
  if (cycle < 2)   return { phase: 'Юпитерианский Новый год', color: '#fbbf24',
    desc: 'Посев намерений и новые возможности открываются. Период удачи и расширения.', };
  if (cycle < 4)   return { phase: 'Рост удачи', color: '#34d399',
    desc: 'Инициативы 2 года назад приносят первые плоды. Хорошее время для экспансии.' };
  if (cycle < 6)   return { phase: 'Первый квадрат', color: '#f59e0b',
    desc: 'Необходимо скорректировать курс. Вызовы, требующие адаптации стратегии.' };
  if (cycle < 9)   return { phase: 'Юпитерианская кульминация', color: '#818cf8',
    desc: 'Пик цикла. Максимум видимости и результатов. Всё посеянное в начале цикла созревает.' };
  if (cycle < 11)  return { phase: 'Подведение итогов', color: '#94a3b8',
    desc: 'Завершение цикла. Время отпустить то, что отжило, и готовиться к новому началу.' };
  return { phase: 'Предновогодний период', color: '#c084fc',
    desc: 'Глубокая рефлексия перед новым юпитерианским циклом. Внутренний поворот.' };
}

// ─── Sphere tabs config ────────────────────────────────────────────────────────
const SPHERES: Array<{ key: SphereKey; icon: string; label: string; color: string }> = [
  { key: 'finance', icon: '💰', label: 'Финансы',        color: '#d4a853' },
  { key: 'health',  icon: '🌿', label: 'Здоровье',       color: '#34d399' },
  { key: 'career',  icon: '🏆', label: 'Профессия',      color: '#818cf8' },
  { key: 'energy',  icon: '⚡', label: 'Энергия',        color: '#f59e0b' },
  { key: 'plan',    icon: '🗺️', label: 'Жизненный план', color: '#60a5fa' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ─── FINANCE SPHERE ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function FinanceSphere({ chart, isDark }: { chart: NatalChart; isDark: boolean }) {
  const c = '#d4a853';
  const house2Sign = getHouseSign(chart, 2);
  const house2Ruler = getHouseRuler(chart, 2);
  const house2RulerData = getRulerData(chart, 2);
  const house8Sign = getHouseSign(chart, 8);
  const planetsIn2 = getPlanetsInHouse(chart, 2);
  const planetsIn8 = getPlanetsInHouse(chart, 8);
  const venus = chart.planets.venus;
  const jupiter = chart.planets.jupiter;
  const arabicFort = chart.arabic_parts?.fortune;

  // Assess financial power
  const rulerDignity = house2Ruler ? chart.dignities?.[house2Ruler]?.dignity : null;
  const isRulerStrong = rulerDignity === 'domicile' || rulerDignity === 'exaltation';
  const isRulerWeak   = rulerDignity === 'detriment' || rulerDignity === 'fall';

  const jupDignity = chart.dignities?.jupiter?.dignity;
  const jupStrong = jupDignity === 'domicile' || jupDignity === 'exaltation';

  const venDignity = chart.dignities?.venus?.dignity;
  const venStrong = venDignity === 'domicile' || venDignity === 'exaltation';

  // Score
  let score = 5;
  if (isRulerStrong) score += 2;
  if (isRulerWeak) score -= 2;
  if (jupStrong) score += 1;
  if (venStrong) score += 1;
  if (planetsIn2.length > 0) score += 1;
  score = Math.max(1, Math.min(10, score));

  const rulerAspects = house2Ruler ? getAspectsTo(chart, house2Ruler).slice(0, 4) : [];

  return (
    <div>
      <SectionHead icon="💰" title="Финансовый потенциал" isDark={isDark} accent={c}
        sub="Анализ 2-го дома, его управителя, 8-го дома и значимых денежных точек" />

      {/* Score bar */}
      <Card isDark={isDark} accent={c}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#6b7280' }}>Финансовый потенциал карты:</span>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.1)' }}>
            <div style={{ width: `${score * 10}%`, height: '100%', borderRadius: 4, background: c }} />
          </div>
          <span style={{ fontWeight: 700, color: c, fontSize: 15 }}>{score}/10</span>
        </div>
        <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#6b7280' }}>
          {score >= 8 ? 'Карта показывает высокую природную способность к накоплению и росту материального благополучия.' :
           score >= 5 ? 'Средний потенциал: деньги приходят через усилия, дисциплину и осознанность.' :
           'Финансовая сфера требует особого внимания и выработки стратегии — это зона роста.'}
        </div>
      </Card>

      {/* 2nd house */}
      <Card isDark={isDark} accent={c}>
        <div style={{ fontWeight: 700, color: c, fontSize: 14, marginBottom: 10 }}>
          2-й дом (Личные деньги и ценности) — {signRu(house2Sign)}
        </div>
        {house2Sign && (
          <Callout color={c} isDark={isDark}>
            {SIGN_MONEY_STYLE[house2Sign] ?? `Куспид 2-го дома в ${signRu(house2Sign)} — особый стиль обращения с ресурсами.`}
          </Callout>
        )}
        {planetsIn2.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Планеты во 2-м доме:</div>
            {planetsIn2.map(([name, p]) => (
              <div key={name} style={{ marginBottom: 8, padding: '8px 10px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)', fontSize: 13,
                color: isDark ? '#cbd5e1' : '#374151' }}>
                <span style={{ color: PLANETS[name]?.color ?? '#fff', fontWeight: 600, marginRight: 6 }}>
                  {PLANETS[name]?.key} {planetRu(name)}
                </span>
                в {signRu(p.sign)}{p.retrograde ? ' Rx' : ''} —{' '}
                {PLANET_MONEY_STYLE[name] ?? `Планета усиливает тему 2-го дома.`}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Ruler of 2nd */}
      {house2Ruler && house2RulerData && (
        <Card isDark={isDark} accent={c}>
          <div style={{ fontWeight: 700, color: c, fontSize: 14, marginBottom: 10 }}>
            Управитель 2-го дома — {planetBadge(house2Ruler, house2RulerData, chart)}
          </div>
          <Callout color={isRulerStrong ? '#22c55e' : isRulerWeak ? '#f87171' : '#d4a853'} isDark={isDark}>
            {isRulerStrong
              ? `${planetRu(house2Ruler)} в силе — финансовый управитель работает мощно. Деньги приходят с меньшими усилиями.`
              : isRulerWeak
              ? `${planetRu(house2Ruler)} ослаблен — финансовый управитель требует сознательной работы. Деньги есть, но дорогой ценой.`
              : `${planetRu(house2Ruler)} в нейтральной позиции — финансы стабильны при грамотном управлении.`
            }
          </Callout>
          {house2RulerData.house !== 2 && (
            <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', marginTop: 6 }}>
              Управитель 2-го дома находится в <b>{house2RulerData.house}-м доме</b> ({HOUSES[house2RulerData.house]?.name}) —
              деньги тесно связаны с темой «{HOUSES[house2RulerData.house]?.theme}».
            </div>
          )}
          {rulerAspects.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Аспекты управителя:</div>
              {rulerAspects.map((a, i) => {
                const other = a.p1 === house2Ruler ? a.p2 : a.p1;
                const info = describeAspect(a.aspect);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <Pill label={info.short} tone={info.tone} isDark={isDark} />
                    <span style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#6b7280' }}>
                      с {PLANETS[other]?.key} {planetRu(other)} · орб {a.orb.toFixed(1)}°
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* 8th house */}
      <Card isDark={isDark} accent="#bb77aa">
        <div style={{ fontWeight: 700, color: '#bb77aa', fontSize: 14, marginBottom: 10 }}>
          8-й дом (Чужие ресурсы, инвестиции) — {signRu(house8Sign)}
        </div>
        <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.7 }}>
          {house8Sign === 'scorpio' || house8Sign === 'capricorn'
            ? 'Сильный 8-й дом — природный дар управления чужими деньгами, инвестициями, кризисными финансами.'
            : house8Sign === 'pisces' || house8Sign === 'libra'
            ? 'Мягкий 8-й дом — деньги партнёров, наследство, совместные финансы требуют чёткого разграничения.'
            : `8-й дом в ${signRu(house8Sign)} — доступ к внешним ресурсам через тему «${SIGNS[house8Sign ?? '']?.keyword ?? '...'}».`}
        </div>
        {planetsIn8.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {planetsIn8.map(([name]) => (
              <Tag key={name} label={`${PLANETS[name]?.key} ${planetRu(name)} в 8-м`} color="#bb77aa" isDark={isDark} />
            ))}
            <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#6b7280', marginTop: 6 }}>
              Планеты в 8-м доме усиливают работу с внешними финансовыми потоками.
            </div>
          </div>
        )}
      </Card>

      {/* Jupiter and Venus */}
      <Card isDark={isDark} accent="#d4a04a">
        <div style={{ fontWeight: 700, color: '#d4a04a', fontSize: 14, marginBottom: 10 }}>
          Юпитер и Венера — катализаторы изобилия
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {jupiter && (
            <div style={{ padding: '10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: '#d4a04a', marginBottom: 4 }}>
                ♃ Юпитер в {signRu(jupiter.sign)} · {jupiter.house} дом
                {jupStrong ? ' ⭐' : ''}
              </div>
              <div style={{ color: isDark ? '#94a3b8' : '#6b7280', lineHeight: 1.5 }}>
                {jupiter.house === 2 || jupiter.house === 8 || jupiter.house === 11
                  ? 'Юпитер в финансовом доме — удача с деньгами встроена в карту.'
                  : `Финансовая удача приходит через тему «${HOUSES[jupiter.house]?.theme ?? '...'}».`}
              </div>
            </div>
          )}
          {venus && (
            <div style={{ padding: '10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: '#d48aaa', marginBottom: 4 }}>
                ♀ Венера в {signRu(venus.sign)} · {venus.house} дом
                {venStrong ? ' ⭐' : ''}
              </div>
              <div style={{ color: isDark ? '#94a3b8' : '#6b7280', lineHeight: 1.5 }}>
                {venus.house === 2
                  ? 'Венера в 2-м доме — деньги приходят легко, через красоту и удовольствие.'
                  : `Венера в ${venus.house}-м доме — привлекает деньги через тему «${HOUSES[venus.house]?.theme ?? '...'}».`}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Part of Fortune */}
      {arabicFort && (
        <Card isDark={isDark} accent="#fbbf24">
          <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: 14, marginBottom: 6 }}>
            ⊕ Жребий Судьбы в {signRu(arabicFort.sign)}
          </div>
          <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.6 }}>
            Арабская точка удачи и материального процветания. Знак показывает стиль, через который вы естественно привлекаете фортуну.
            <b style={{ color: '#fbbf24' }}> {SIGNS[arabicFort.sign]?.keyword ?? signRu(arabicFort.sign)}</b> —
            именно через это качество открывается наибольший поток.
          </div>
        </Card>
      )}

      {/* Recommendations */}
      <Card isDark={isDark} accent="#22c55e">
        <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 14, marginBottom: 10 }}>
          ✅ Практические рекомендации
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 2 }}>
          <li>Основной доход — через тему <b>{HOUSES[house2RulerData?.house ?? 2]?.theme ?? 'ресурса'}</b>, сферу управителя 2-го дома.</li>
          {isRulerWeak && <li>Укрепите управителя: дайте ему "работу" — сознательно развивайте связанную с ним тему.</li>}
          {planetsIn8.length > 0 && <li>Инвестиции и партнёрские деньги — сильный канал. Изучайте финансовые инструменты.</li>}
          {venus && venus.house !== 2 && <li>Венера в {venus.house}-м доме: красота и эстетика в этой сфере — ваш магнит для денег.</li>}
          {jupiter && <li>Юпитер в {signRu(jupiter.sign)}: расширение и обучение в стиле {SIGNS[jupiter.sign ?? '']?.keyword?.toLowerCase() ?? '...'} притягивает изобилие.</li>}
        </ul>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── HEALTH SPHERE ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function HealthSphere({ chart, isDark }: { chart: NatalChart; isDark: boolean }) {
  const c = '#34d399';
  const asc = chart.houses['1'];
  const ascSign = asc?.sign ?? null;
  const house6Sign = getHouseSign(chart, 6);
  const house12Sign = getHouseSign(chart, 12);
  const house6Ruler = getHouseRuler(chart, 6);
  const house6RulerData = house6Ruler ? chart.planets[house6Ruler] : null;
  const planetsIn1 = getPlanetsInHouse(chart, 1);
  const planetsIn6 = getPlanetsInHouse(chart, 6);
  const planetsIn12 = getPlanetsInHouse(chart, 12);
  const sun = chart.planets.sun;
  const mars = chart.planets.mars;
  const saturn = chart.planets.saturn;

  // Saturn in 6th or 12th = extra health challenges
  const saturnIn6or12 = saturn && (saturn.house === 6 || saturn.house === 12);

  const sunDig = chart.dignities?.sun?.dignity;
  const sunStrong = sunDig === 'domicile' || sunDig === 'exaltation';
  const sunWeak = sunDig === 'detriment' || sunDig === 'fall';

  return (
    <div>
      <SectionHead icon="🌿" title="Здоровье и жизненный тонус" isDark={isDark} accent={c}
        sub="Анализ АСЦ, 1-го, 6-го и 12-го домов, Солнца и Марса" />

      {/* Constitution */}
      <Card isDark={isDark} accent={c}>
        <div style={{ fontWeight: 700, color: c, fontSize: 14, marginBottom: 10 }}>
          Конституция — {signRu(ascSign)} Асцендент
        </div>
        {ascSign && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              <Tag label={SIGNS[ascSign]?.element ?? ''} color={c} isDark={isDark} />
              <Tag label={SIGNS[ascSign]?.mode ?? ''} color="#60a5fa" isDark={isDark} />
              <Tag label={SIGNS[ascSign]?.body_zone ?? ''} color="#f59e0b" isDark={isDark} />
            </div>
            <Callout color={c} isDark={isDark}>
              <b>Уязвимые зоны:</b> {SIGNS[ascSign]?.body_zone ?? '—'}.{' '}
              {SIGNS[ascSign]?.body_desc ?? ''}
            </Callout>
          </>
        )}
        {planetsIn1.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Планеты в 1-м доме (влияние на тело):</div>
            {planetsIn1.map(([name, p]) => (
              <div key={name} style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', marginBottom: 4 }}>
                <span style={{ color: PLANETS[name]?.color ?? '#fff', fontWeight: 600 }}>
                  {PLANETS[name]?.key} {planetRu(name)}
                </span> в {signRu(p.sign)} —{' '}
                {name === 'saturn' ? 'Сатурн в 1-м: сдержанная конституция, риск хронических проблем, важны режим и профилактика.' :
                 name === 'mars'   ? 'Марс в 1-м: высокий физический тонус, но риск воспалений и травм.' :
                 name === 'jupiter'? 'Юпитер в 1-м: крепкое здоровье, тенденция к полноте, важна умеренность.' :
                 name === 'pluto'  ? 'Плутон в 1-м: трансформативная конституция, способность к регенерации.' :
                 name === 'neptune'? 'Нептун в 1-м: чувствительный организм, реакция на тонкие факторы среды.' :
                 `${planetRu(name)} окрашивает физическую конституцию.`}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Sun vitality */}
      <Card isDark={isDark} accent="#d4a853">
        <div style={{ fontWeight: 700, color: '#d4a853', fontSize: 14, marginBottom: 10 }}>
          ☉ Солнце — жизненная сила
        </div>
        {sun && (
          <>
            <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', marginBottom: 8 }}>
              <b style={{ color: '#d4a853' }}>☉ Солнце в {signRu(sun.sign)}</b> · {sun.house}-й дом
              {sunStrong ? <span style={{ color: '#22c55e' }}> ⭐ в силе</span> :
               sunWeak   ? <span style={{ color: '#f87171' }}> ⬇ ослаблено</span> : null}
            </div>
            <Callout color="#d4a853" isDark={isDark}>
              {sunStrong
                ? 'Солнце в силе — жизненная энергия мощная, восстановление идёт быстро. Высокий иммунитет.'
                : sunWeak
                ? 'Солнце ослаблено — жизненная сила требует поддержки. Важны режим сна, солнечный свет и физическая активность.'
                : 'Солнце в нейтральной позиции — жизненная сила стабильна при правильном образе жизни.'}
            </Callout>
            {sun.retrograde && (
              <div style={{ fontSize: 12, color: '#fbbf24', marginTop: 6 }}>
                ⚠ Солнце не бывает ретроградным — если вы видите это, проверьте данные карты.
              </div>
            )}
          </>
        )}
      </Card>

      {/* Mars immune */}
      <Card isDark={isDark} accent="#d45b5b">
        <div style={{ fontWeight: 700, color: '#d45b5b', fontSize: 14, marginBottom: 10 }}>
          ♂ Марс — иммунитет и физическая энергия
        </div>
        {mars && (
          <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.7 }}>
            <b style={{ color: '#d45b5b' }}>♂ Марс в {signRu(mars.sign)}</b> · {mars.house}-й дом{mars.retrograde ? ' Rx' : ''}
            <br />
            {MARS_ENERGY[mars.sign ?? ''] ?? 'Марс управляет физической активностью и иммунной системой.'}
            {mars.retrograde && (
              <><br /><span style={{ color: '#fbbf24' }}>Ретроградный Марс: сила обращена вовнутрь. Активность через осознанность, а не напор.</span></>
            )}
          </div>
        )}
      </Card>

      {/* 6th house */}
      <Card isDark={isDark} accent="#60a5fa">
        <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: 14, marginBottom: 10 }}>
          6-й дом (Здоровье и режим) — {signRu(house6Sign)}
        </div>
        <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.7 }}>
          6-й дом отвечает за ежедневный режим, рутину здоровья, связь работы и самочувствия.
          Куспид в <b>{signRu(house6Sign)}</b> говорит о стиле поддержания здоровья — через{' '}
          <b>{SIGNS[house6Sign ?? '']?.keyword?.toLowerCase() ?? '...'}</b>.
        </div>
        {house6RulerData && house6Ruler && (
          <div style={{ marginTop: 8, fontSize: 13, color: isDark ? '#94a3b8' : '#6b7280' }}>
            Управитель 6-го дома ({planetRu(house6Ruler)}) в {signRu(house6RulerData.sign)} ·{' '}
            {house6RulerData.house}-й дом —
            {house6RulerData.house === 6
              ? ' управитель в своём доме, режим здоровья даётся легко.'
              : ` режим здоровья тесно связан с темой «${HOUSES[house6RulerData.house]?.theme ?? '...'}».`}
          </div>
        )}
        {planetsIn6.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {planetsIn6.map(([name]) => (
              <Tag key={name} label={`${PLANETS[name]?.key} ${planetRu(name)}`} color="#60a5fa" isDark={isDark} />
            ))}
            <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#6b7280', marginTop: 6 }}>
              Планеты в 6-м доме — активные участники темы здоровья.
            </div>
          </div>
        )}
        {saturnIn6or12 && (
          <Callout color="#f87171" isDark={isDark}>
            ⚠ Сатурн в {saturn!.house}-м доме — тема хронических, накопительных проблем. Профилактика важнее лечения.
          </Callout>
        )}
      </Card>

      {/* 12th house */}
      {(planetsIn12.length > 0 || house12Sign) && (
        <Card isDark={isDark} accent="#c084fc">
          <div style={{ fontWeight: 700, color: '#c084fc', fontSize: 14, marginBottom: 10 }}>
            12-й дом (Скрытые, хронические темы) — {signRu(house12Sign)}
          </div>
          <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.7 }}>
            12-й дом — зона невидимых болезней, накопленного стресса, психосоматики.
            {planetsIn12.length === 0
              ? ' Без планет — хронические риски минимальны, если нет других указаний.'
              : ' Планеты здесь указывают на скрытые уязвимости, которые важно не игнорировать.'}
          </div>
          {planetsIn12.map(([name, p]) => (
            <div key={name} style={{ marginTop: 6, fontSize: 13, color: isDark ? '#94a3b8' : '#6b7280' }}>
              <span style={{ color: PLANETS[name]?.color }}>{PLANETS[name]?.key} {planetRu(name)}</span> в {signRu(p.sign)} в 12-м —
              {name === 'saturn' ? ' хронические структурные проблемы, важна профилактика суставов/костей.' :
               name === 'mars'   ? ' скрытые воспаления, важны регулярные обследования.' :
               name === 'neptune'? ' чувствительность к токсинам, аллергии, важна детоксикация.' :
               name === 'pluto'  ? ' глубинные трансформационные процессы в теле, риск игнорирования сигналов.' :
               ` ${planetRu(name)} в 12-м — скрытая работа этой функции, стоит исследовать.`}
            </div>
          ))}
        </Card>
      )}

      {/* Recommendations */}
      <Card isDark={isDark} accent="#22c55e">
        <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 14, marginBottom: 10 }}>
          ✅ Рекомендации по здоровью
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 2 }}>
          <li>Уязвимые зоны АСЦ: <b>{ascSign ? SIGNS[ascSign]?.body_zone : '—'}</b> — регулярная профилактика.</li>
          {sunWeak && <li>Укрепляйте жизненную силу: режим сна, солнечные ванны, спорт по конституции.</li>}
          {mars && mars.retrograde && <li>Ретроградный Марс: йога, плавание, медитация — лучше агрессивных нагрузок.</li>}
          {saturnIn6or12 && <li>Сатурн в 6/12: диспансеризация раз в год, внимание к суставам и опорно-двигательной системе.</li>}
          <li>Режим 6-го дома: <b>{house6Sign ? SIGNS[house6Sign]?.keyword : '...'}</b> — именно через этот принцип строится ваша рутина здоровья.</li>
          {planetsIn12.length > 0 && <li>Регулярные медицинские проверки — особенно при стрессе.</li>}
        </ul>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CAREER SPHERE ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function CareerSphere({ chart, isDark }: { chart: NatalChart; isDark: boolean }) {
  const c = '#818cf8';
  const mc = chart.houses['10'];
  const mcSign = mc?.sign ?? null;
  const house10Ruler = getHouseRuler(chart, 10);
  const house10RulerData = house10Ruler ? chart.planets[house10Ruler] : null;
  const planetsIn10 = getPlanetsInHouse(chart, 10);
  const house6Sign = getHouseSign(chart, 6);
  const sun = chart.planets.sun;
  const saturn = chart.planets.saturn;
  const mars = chart.planets.mars;

  const saturnDig = chart.dignities?.saturn?.dignity;
  const saturnStrong = saturnDig === 'domicile' || saturnDig === 'exaltation';
  const rulerDig = house10Ruler ? chart.dignities?.[house10Ruler]?.dignity : null;
  const rulerStrong = rulerDig === 'domicile' || rulerDig === 'exaltation';
  const rulerWeak = rulerDig === 'detriment' || rulerDig === 'fall';

  const rulerAspects = house10Ruler ? getAspectsTo(chart, house10Ruler).slice(0, 4) : [];

  return (
    <div>
      <SectionHead icon="🏆" title="Профессия и призвание" isDark={isDark} accent={c}
        sub="Анализ MC (10-го дома), его управителя, Сатурна и профессиональных индикаторов" />

      {/* MC card */}
      <Card isDark={isDark} accent={c}>
        <div style={{ fontWeight: 700, color: c, fontSize: 14, marginBottom: 10 }}>
          MC (Середина Неба) — {signRu(mcSign)}
        </div>
        {mcSign && (
          <>
            <Callout color={c} isDark={isDark}>
              {MC_SIGN_CAREER[mcSign] ?? `MC в ${signRu(mcSign)} — особый профессиональный путь.`}
            </Callout>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              <Tag label={SIGNS[mcSign]?.element ?? ''} color={c} isDark={isDark} />
              <Tag label={SIGNS[mcSign]?.mode ?? ''} color="#60a5fa" isDark={isDark} />
              <Tag label={SIGNS[mcSign]?.keyword ?? ''} color="#f59e0b" isDark={isDark} />
            </div>
          </>
        )}
        {planetsIn10.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Планеты в 10-м доме:</div>
            {planetsIn10.map(([name, p]) => (
              <div key={name} style={{
                marginBottom: 8, padding: '8px 10px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)', fontSize: 13,
                color: isDark ? '#cbd5e1' : '#374151',
              }}>
                <span style={{ color: PLANETS[name]?.color ?? '#fff', fontWeight: 600 }}>
                  {PLANETS[name]?.key} {planetRu(name)}
                </span> в {signRu(p.sign)} —{' '}
                {name === 'sun'     ? 'Солнце в MC — рождены для публичной роли. Карьера и самопроявление неразделимы.' :
                 name === 'moon'    ? 'Луна в MC — профессия связана с заботой, публичными эмоциями, работой с людьми.' :
                 name === 'saturn'  ? 'Сатурн в MC — серьёзная профессиональная репутация. Строится долго, но держится крепко.' :
                 name === 'jupiter' ? 'Юпитер в MC — карьерная удача и экспансия. Успех через обучение и мировоззрение.' :
                 name === 'mars'    ? 'Марс в MC — карьера требует энергии, лидерства, соревновательности.' :
                 name === 'venus'   ? 'Венера в MC — карьера в сфере красоты, дипломатии, искусства, отношений.' :
                 name === 'mercury' ? 'Меркурий в MC — профессия через слово, данные, коммуникации.' :
                 name === 'uranus'  ? 'Уран в MC — нестандартная карьера, новаторство, смена профессий.' :
                 name === 'neptune' ? 'Нептун в MC — карьера в творчестве, духовности, кино, помощи.' :
                 name === 'pluto'   ? 'Плутон в MC — трансформирует свою отрасль. Власть и кризисы в карьере.' :
                 `${planetRu(name)} окрашивает профессиональный путь.`}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Ruler of 10th */}
      {house10Ruler && house10RulerData && (
        <Card isDark={isDark} accent={c}>
          <div style={{ fontWeight: 700, color: c, fontSize: 14, marginBottom: 10 }}>
            Управитель MC — {planetBadge(house10Ruler, house10RulerData, chart)}
          </div>
          <Callout color={rulerStrong ? '#22c55e' : rulerWeak ? '#f87171' : c} isDark={isDark}>
            {rulerStrong
              ? `${planetRu(house10Ruler)} в силе — карьерный управитель работает мощно. Профессиональный рост приходит с меньшим трением.`
              : rulerWeak
              ? `${planetRu(house10Ruler)} ослаблен — карьера требует дополнительных усилий, но возможна при сознательной работе над собой.`
              : `${planetRu(house10Ruler)} в нейтральной позиции — стабильный, рабочий карьерный путь.`}
          </Callout>
          <div style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#6b7280', marginTop: 6 }}>
            Управитель MC в <b>{house10RulerData.house}-м доме</b> ({HOUSES[house10RulerData.house]?.name}) —
            профессиональный успех тесно связан с темой «{HOUSES[house10RulerData.house]?.theme ?? '...'}».
          </div>
          {rulerAspects.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Аспекты управителя MC:</div>
              {rulerAspects.map((a, i) => {
                const other = a.p1 === house10Ruler ? a.p2 : a.p1;
                const info = describeAspect(a.aspect);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <Pill label={info.short} tone={info.tone} isDark={isDark} />
                    <span style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#6b7280' }}>
                      с {PLANETS[other]?.key} {planetRu(other)} · орб {a.orb.toFixed(1)}°
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Saturn */}
      <Card isDark={isDark} accent="#8899bb">
        <div style={{ fontWeight: 700, color: '#8899bb', fontSize: 14, marginBottom: 10 }}>
          ♄ Сатурн — дисциплина и мастерство
        </div>
        {saturn && (
          <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.7 }}>
            <b style={{ color: '#8899bb' }}>♄ Сатурн в {signRu(saturn.sign)}</b> · {saturn.house}-й дом{saturn.retrograde ? ' Rx' : ''}
            {saturnStrong && <span style={{ color: '#22c55e' }}> ⭐ в силе</span>}
            <br />
            {saturn.house === 10
              ? 'Сатурн в 10-м — мощный карьерный индикатор. Серьёзная репутация, долгосрочные достижения, лидерство через компетентность.'
              : `Сатурн в ${saturn.house}-м доме — дисциплина и мастерство через тему «${HOUSES[saturn.house]?.theme ?? '...'}». Успех приходит позже, но стоит прочнее.`}
            {saturn.retrograde && (
              <><br /><span style={{ color: '#fbbf24' }}>Ретроградный Сатурн: внутренняя работа над структурой и ответственностью. Карьера строится изнутри наружу.</span></>
            )}
          </div>
        )}
      </Card>

      {/* Sun and Mars as career drivers */}
      <Card isDark={isDark} accent="#d4a853">
        <div style={{ fontWeight: 700, color: '#d4a853', fontSize: 14, marginBottom: 10 }}>
          ☉ Солнце и ♂ Марс — профессиональная воля
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {sun && (
            <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)', fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: '#d4a853', marginBottom: 4 }}>
                ☉ Солнце в {signRu(sun.sign)} · {sun.house} дом
              </div>
              <div style={{ color: isDark ? '#94a3b8' : '#6b7280', lineHeight: 1.5 }}>
                Солнце показывает профессиональную идентичность — чем «светите» в работе.
                Лучшие результаты там, где реализуется {SIGNS[sun.sign ?? '']?.keyword?.toLowerCase() ?? 'потенциал'}.
              </div>
            </div>
          )}
          {mars && (
            <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)', fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: '#d45b5b', marginBottom: 4 }}>
                ♂ Марс в {signRu(mars.sign)} · {mars.house} дом
              </div>
              <div style={{ color: isDark ? '#94a3b8' : '#6b7280', lineHeight: 1.5 }}>
                Марс — карьерный двигатель. Профессиональная энергия и стиль борьбы за место:
                через {SIGNS[mars.sign ?? '']?.keyword?.toLowerCase() ?? '...'}.
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 6th house work routine */}
      <Card isDark={isDark} accent="#60a5fa">
        <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: 14, marginBottom: 8 }}>
          6-й дом (Ежедневная работа) — {signRu(house6Sign)}
        </div>
        <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.6 }}>
          6-й дом описывает рабочую среду, коллег и ежедневный режим труда.
          Куспид в <b>{signRu(house6Sign)}</b> — работа наиболее продуктивна в атмосфере{' '}
          <b>{SIGNS[house6Sign ?? '']?.keyword?.toLowerCase() ?? '...'}</b>.
        </div>
      </Card>

      {/* Recommendations */}
      <Card isDark={isDark} accent="#22c55e">
        <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 14, marginBottom: 10 }}>
          ✅ Профессиональные рекомендации
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 2 }}>
          <li>Ключевая карьерная сфера: <b>{mcSign ? signRu(mcSign) : '—'}</b> MC — следуйте этому вектору.</li>
          {rulerWeak && <li>Развивайте качества управителя MC — это ваш профессиональный ключ.</li>}
          {planetsIn10.length > 0 && <li>Планеты в 10-м доме — используйте их энергию сознательно для карьерного роста.</li>}
          <li>Управитель MC в {house10RulerData?.house}-м доме: профессиональный успех через «{HOUSES[house10RulerData?.house ?? 10]?.theme}».</li>
          {saturn && saturn.retrograde && <li>Сатурн Rx: строите карьеру через внутреннюю проработку и нестандартные методы.</li>}
        </ul>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ENERGY SPHERE ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function EnergySphere({ chart, isDark }: { chart: NatalChart; isDark: boolean }) {
  const c = '#f59e0b';
  const sun = chart.planets.sun;
  const moon = chart.planets.moon;
  const mars = chart.planets.mars;
  const pluto = chart.planets.pluto;
  const sect = chart.sect;

  // Count fire/earth/air/water
  const elements: Record<string, number> = { Огонь: 0, Земля: 0, Воздух: 0, Вода: 0 };
  for (const [, p] of Object.entries(chart.planets)) {
    if (!p?.sign) continue;
    const el = SIGNS[p.sign]?.element;
    if (el && el in elements) elements[el]++;
  }
  const topElement = Object.entries(elements).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Огонь';

  const marsDig = chart.dignities?.mars?.dignity;
  const marsStrong = marsDig === 'domicile' || marsDig === 'exaltation';
  const marsWeak = marsDig === 'detriment' || marsDig === 'fall';

  const sunDig = chart.dignities?.sun?.dignity;
  const sunStrong = sunDig === 'domicile' || sunDig === 'exaltation';

  // Energy level score
  let energy = 5;
  if (sunStrong) energy += 1;
  if (marsStrong) energy += 2;
  if (marsWeak) energy -= 1;
  if (elements['Огонь'] >= 4) energy += 1;
  if (sect === 'day') energy += 1;
  if (pluto && (pluto.house === 1 || pluto.house === 10)) energy += 1;
  energy = Math.max(1, Math.min(10, energy));

  return (
    <div>
      <SectionHead icon="⚡" title="Энергия и жизненный ресурс" isDark={isDark} accent={c}
        sub="Анализ Солнца, Марса, стихий и природного ритма" />

      {/* Energy meter */}
      <Card isDark={isDark} accent={c}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#6b7280' }}>Природный уровень энергии:</span>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.1)' }}>
            <div style={{ width: `${energy * 10}%`, height: '100%', borderRadius: 4, background: c }} />
          </div>
          <span style={{ fontWeight: 700, color: c, fontSize: 15 }}>{energy}/10</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(elements).map(([el, n]) => (
            <Tag key={el} label={`${el}: ${n}`} color={el === topElement ? c : '#94a3b8'} isDark={isDark} />
          ))}
          {sect && (
            <Tag label={sect === 'day' ? '☀ Дневное рождение' : '☾ Ночное рождение'} color="#818cf8" isDark={isDark} />
          )}
        </div>
      </Card>

      {/* Sun energy */}
      <Card isDark={isDark} accent="#d4a853">
        <div style={{ fontWeight: 700, color: '#d4a853', fontSize: 14, marginBottom: 10 }}>
          ☉ Солнце — источник жизненной энергии
        </div>
        {sun && (
          <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.7 }}>
            <b style={{ color: '#d4a853' }}>☉ Солнце в {signRu(sun.sign)}</b> · {sun.house}-й дом
            {sunStrong ? <span style={{ color: '#22c55e' }}> ⭐</span> : null}
            <br />
            <Callout color="#d4a853" isDark={isDark}>
              {SUN_ENERGY[sun.sign ?? ''] ?? 'Солнце — источник вашей центральной энергии.'}
            </Callout>
            <div style={{ marginTop: 6, fontSize: 12, color: isDark ? '#94a3b8' : '#6b7280' }}>
              Солнце в {sun.house}-м доме: энергия наиболее мощна в теме «{HOUSES[sun.house]?.theme ?? '...'}».
              Именно там вы «заряжаетесь» и находите смысл.
            </div>
          </div>
        )}
      </Card>

      {/* Mars */}
      <Card isDark={isDark} accent="#d45b5b">
        <div style={{ fontWeight: 700, color: '#d45b5b', fontSize: 14, marginBottom: 10 }}>
          ♂ Марс — двигатель и воля
        </div>
        {mars && (
          <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.7 }}>
            <b style={{ color: '#d45b5b' }}>♂ Марс в {signRu(mars.sign)}</b> · {mars.house}-й дом
            {marsStrong ? <span style={{ color: '#22c55e' }}> ⭐ в силе</span>
              : marsWeak ? <span style={{ color: '#f87171' }}> ⬇ ослаблен</span> : null}
            {mars.retrograde ? <span style={{ color: '#fbbf24' }}> Rx</span> : null}
            <Callout color="#d45b5b" isDark={isDark}>
              {MARS_ENERGY[mars.sign ?? ''] ?? 'Марс — двигатель вашей активности.'}
            </Callout>
            {marsStrong && (
              <div style={{ fontSize: 12, color: '#22c55e', marginTop: 4 }}>
                Марс в силе — высокая природная активность, быстрое восстановление.
              </div>
            )}
            {marsWeak && (
              <div style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>
                Марс ослаблен — физическая энергия требует бережного отношения. Избегайте перегрузок.
              </div>
            )}
            {mars.retrograde && (
              <div style={{ fontSize: 12, color: '#fbbf24', marginTop: 4 }}>
                Ретроградный Марс: энергия обращена вовнутрь. Медленный старт, но выносливость.
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Moon recovery */}
      <Card isDark={isDark} accent="#9ab5d4">
        <div style={{ fontWeight: 700, color: '#9ab5d4', fontSize: 14, marginBottom: 10 }}>
          ☽ Луна — ритм восстановления
        </div>
        {moon && (
          <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.7 }}>
            <b style={{ color: '#9ab5d4' }}>☽ Луна в {signRu(moon.sign)}</b> · {moon.house}-й дом
            <br />
            {moon.sign === 'aries' || moon.sign === 'leo' || moon.sign === 'sagittarius'
              ? 'Восстанавливаетесь через активность, движение, игру. Пассивный отдых не работает — нужно действие.'
              : moon.sign === 'taurus' || moon.sign === 'virgo' || moon.sign === 'capricorn'
              ? 'Восстанавливаетесь через тело: сон, природу, вкусную еду, режим. Стабильность — ваша батарейка.'
              : moon.sign === 'gemini' || moon.sign === 'libra' || moon.sign === 'aquarius'
              ? 'Восстанавливаетесь через общение, смену обстановки, интеллектуальные занятия. Изоляция утомляет.'
              : 'Восстанавливаетесь через уединение, воду, эмоциональный контакт с близкими. Нужна тишина и безопасность.'}
          </div>
        )}
      </Card>

      {/* Pluto */}
      {pluto && (
        <Card isDark={isDark} accent="#bb77aa">
          <div style={{ fontWeight: 700, color: '#bb77aa', fontSize: 14, marginBottom: 8 }}>
            ♇ Плутон — глубинная трансформационная сила
          </div>
          <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.6 }}>
            <b style={{ color: '#bb77aa' }}>♇ Плутон в {signRu(pluto.sign)}</b> · {pluto.house}-й дом
            <br />
            {pluto.house === 1
              ? 'Плутон в 1-м доме — трансформативная, интенсивная энергия. Буквально перерождаетесь после кризисов.'
              : pluto.house === 8
              ? 'Плутон в 8-м — мощный ресурс через трансформации. Кризисы — двигатель роста.'
              : `Плутон в ${pluto.house}-м доме — глубинная сила сосредоточена в теме «${HOUSES[pluto.house]?.theme ?? '...'}».`}
          </div>
        </Card>
      )}

      {/* Sect */}
      <Card isDark={isDark} accent="#818cf8">
        <div style={{ fontWeight: 700, color: '#818cf8', fontSize: 14, marginBottom: 8 }}>
          {sect === 'day' ? '☀ Дневное рождение' : '☾ Ночное рождение'}
        </div>
        <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.6 }}>
          {sect === 'day'
            ? 'Рождены днём — Солнце и Юпитер работают в своей стихии. Энергия более экстравертная, социальная. Лучшие часы продуктивности — утро и день.'
            : sect === 'night'
            ? 'Рождены ночью — Луна и Венера сильнее. Энергия более интровертная, интуитивная. Пик продуктивности — вечер или ночь.'
            : 'Рождение на границе дня и ночи — совмещаете оба ритма.'}
        </div>
      </Card>

      {/* Recommendations */}
      <Card isDark={isDark} accent="#22c55e">
        <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 14, marginBottom: 10 }}>
          ✅ Практики восстановления энергии
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 2 }}>
          <li>Доминирующая стихия: <b>{topElement}</b> — строите энергоресурс через её принципы.</li>
          {sun && <li>Солнечная зарядка: занятия, связанные с {sun.house}-м домом («{HOUSES[sun.house]?.theme}»), заряжают сильнее всего.</li>}
          {mars && marsWeak && <li>Марс ослаблен: регулярные, но умеренные физические нагрузки — без фанатизма.</li>}
          {sect === 'night' && <li>Ночное рождение: не насилуйте себя утренними ритуалами — найдите свой пик активности.</li>}
          {moon && <li>Луна в {signRu(moon.sign)}: восстанавливайтесь через стихию {SIGNS[moon.sign ?? '']?.element ?? '...'} — это ваша природная батарейка.</li>}
        </ul>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── LIFE PLAN SPHERE ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function LifePlanSphere({ chart, isDark, birthDate }: {
  chart: NatalChart; isDark: boolean; birthDate?: string;
}) {
  const c = '#60a5fa';

  // Calculate age
  const ageNow = useMemo(() => {
    const bd = birthDate ?? chart.metadata?.date;
    if (!bd) return 35;
    const birth = new Date(bd.replace(/\./g, '-').split('-').reverse().join('-'));
    if (isNaN(birth.getTime())) return 35;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }, [birthDate, chart.metadata?.date]);

  const satPhase = getSaturnPhase(ageNow);
  const jupPhase = getJupiterPhase(ageNow);

  const node = chart.planets.node;
  const saturn = chart.planets.saturn;
  const chiron = chart.planets.chiron;

  // Saturn return years
  const sr1 = 29; const sr2 = 59; const sr3 = 88;
  const chironReturn = 50;

  // Key life stages description
  const stages = [
    { age: '0–7',   title: 'Корни',        icon: '🌱', desc: 'Формирование базовых программ, семейные паттерны. Основа для всей жизни.' },
    { age: '7–14',  title: 'Открытие мира', icon: '🌍', desc: 'Первые социальные контакты, образование, формирование личности.' },
    { age: '14–21', title: 'Идентичность',  icon: '🔥', desc: 'Первый кризис выбора, формирование ценностей, юношеский максимализм.' },
    { age: '21–29', title: 'Взросление',    icon: '🏗', desc: 'Строительство взрослой жизни: карьера, отношения, самостоятельность.' },
    { age: '29–30', title: '1-й возврат ♄', icon: '♄', desc: 'Кризис переоценки. Сатурн требует итогов и ответственных решений.' },
    { age: '30–42', title: 'Мастерство',    icon: '🌟', desc: 'Расцвет компетентности. Карьера, семья, социальная роль оформляются.' },
    { age: '42–49', title: 'Кризис среднего', icon: '🔮', desc: 'Юпитерианский оппозит + Уран оппозит — время глубокой переоценки смысла.' },
    { age: '50',    title: 'Хирон-возврат', icon: '⚷', desc: 'Рана становится мудростью. Целительский потенциал достигает пика.' },
    { age: '59–60', title: '2-й возврат ♄', icon: '♄', desc: 'Второй сатурнов цикл завершён. Подведение итогов зрелости.' },
    { age: '60+',   title: 'Мудрость',      icon: '🌙', desc: 'Передача опыта, духовный рост, лёгкость бытия.' },
  ];

  const northNodeSign = node?.sign ?? null;
  const northNodeHouse = node?.house ?? null;
  const southHouseNum = northNodeHouse ? (northNodeHouse <= 6 ? northNodeHouse + 6 : northNodeHouse - 6) : null;

  return (
    <div>
      <SectionHead icon="🗺️" title="Жизненный план и развитие" isDark={isDark} accent={c}
        sub="Циклы Сатурна и Юпитера · Кармическая ось · Ключевые точки роста" />

      {/* Current age + phase */}
      <Card isDark={isDark} accent={c}>
        <div style={{ fontWeight: 700, color: c, fontSize: 15, marginBottom: 10 }}>
          Сейчас вам {ageNow} лет — {satPhase.phase}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <Tag label={satPhase.keywords} color={satPhase.color} isDark={isDark} />
          {satPhase.nextReturn > 0 && satPhase.nextReturn < 30 && (
            <Tag label={`До следующего возврата Сатурна: ~${satPhase.nextReturn} лет`} color="#8899bb" isDark={isDark} />
          )}
        </div>
        <Callout color={satPhase.color} isDark={isDark}>
          <b style={{ color: satPhase.color }}>Цикл Сатурна:</b> {satPhase.desc}
        </Callout>
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Цикл Юпитера (12 лет):</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag label={jupPhase.phase} color={jupPhase.color} isDark={isDark} />
          </div>
          <Callout color={jupPhase.color} isDark={isDark}>
            {jupPhase.desc}
          </Callout>
        </div>
      </Card>

      {/* Life stages timeline */}
      <Card isDark={isDark} accent={c}>
        <div style={{ fontWeight: 700, color: c, fontSize: 14, marginBottom: 14 }}>
          Ключевые точки развития
        </div>
        <div style={{ position: 'relative' }}>
          {stages.map((stage, i) => {
            const isNow = (() => {
              const [start, end] = stage.age.includes('–')
                ? stage.age.split('–').map(Number)
                : [Number(stage.age.replace(/\D/g, '')), Number(stage.age.replace(/\D/g, '')) + 1];
              return ageNow >= (start || 0) && ageNow < (end || start + 1);
            })();

            return (
              <div key={i} style={{
                display: 'flex', gap: 12, marginBottom: 12, opacity: isNow ? 1 : 0.65,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 12,
                    background: isNow ? c + '33' : 'rgba(255,255,255,0.05)',
                    border: isNow ? `2px solid ${c}` : '1px solid rgba(255,255,255,0.1)',
                  }}>
                    {stage.icon}
                  </div>
                  {i < stages.length - 1 && (
                    <div style={{ width: 1, flex: 1, minHeight: 10, background: 'rgba(255,255,255,0.08)', margin: '2px 0' }} />
                  )}
                </div>
                <div style={{ flex: 1, paddingBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 55 }}>{stage.age}</span>
                    <span style={{ fontWeight: isNow ? 700 : 500, fontSize: 13, color: isNow ? c : (isDark ? '#e2e8f0' : '#1e293b') }}>
                      {stage.title}
                    </span>
                    {isNow && <span style={{ fontSize: 10, color: c, fontWeight: 700, padding: '1px 6px',
                      borderRadius: 10, background: c + '22', border: `1px solid ${c}44` }}>◉ СЕЙЧАС</span>}
                  </div>
                  <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#6b7280', marginTop: 2 }}>
                    {stage.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Karmic axis */}
      {node && (
        <Card isDark={isDark} accent="#c084fc">
          <div style={{ fontWeight: 700, color: '#c084fc', fontSize: 14, marginBottom: 10 }}>
            🔮 Кармическая ось — направление развития
          </div>
          <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.8 }}>
            <div style={{ marginBottom: 8 }}>
              <b style={{ color: '#c084fc' }}>Северный Узел ☊</b> в <b>{signRu(northNodeSign)}</b>
              {northNodeHouse ? ` · ${northNodeHouse}-й дом (${HOUSES[northNodeHouse]?.name})` : ''}
              {' '}— <b>куда идёте</b>.
              <br />
              <span style={{ color: isDark ? '#94a3b8' : '#6b7280', fontSize: 12 }}>
                Освоить качества <b>{signRu(northNodeSign)}</b> через тему «{HOUSES[northNodeHouse ?? 1]?.theme ?? '...'}».
                Это страшно — но именно там настоящий рост.
              </span>
            </div>
            <div>
              <b style={{ color: '#94a3b8' }}>Южный Узел ☋</b> в{' '}
              {(() => {
                if (!northNodeSign) return '—';
                const signs = Object.keys(SIGNS);
                const idx = signs.indexOf(northNodeSign);
                const southIdx = (idx + 6) % 12;
                return signRu(signs[southIdx] ?? '');
              })()}
              {southHouseNum ? ` · ${southHouseNum}-й дом (${HOUSES[southHouseNum]?.name})` : ''}
              {' '}— <b>откуда пришли</b>.
              <br />
              <span style={{ color: isDark ? '#94a3b8' : '#6b7280', fontSize: 12 }}>
                Накопленный ресурс прошлого — ваша точка опоры. Но не точка назначения.
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Saturn natal */}
      {saturn && (
        <Card isDark={isDark} accent="#8899bb">
          <div style={{ fontWeight: 700, color: '#8899bb', fontSize: 14, marginBottom: 8 }}>
            ♄ Сатурн в натале — зона мастерства
          </div>
          <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.6 }}>
            <b style={{ color: '#8899bb' }}>♄ Сатурн в {signRu(saturn.sign)}</b> · {saturn.house}-й дом
            {saturn.retrograde ? ' Rx' : ''}
            <br />
            Эта область жизни — ваш главный урок. Здесь не получается легко, но именно здесь строится
            настоящее мастерство и долгосрочные результаты.
            Тема <b>«{HOUSES[saturn.house]?.theme ?? '...'}»</b> — ваш профессиональный и личностный приоритет.
          </div>
        </Card>
      )}

      {/* Chiron */}
      {chiron && (
        <Card isDark={isDark} accent="#66aabb">
          <div style={{ fontWeight: 700, color: '#66aabb', fontSize: 14, marginBottom: 8 }}>
            ⚷ Хирон — рана и дар целителя
          </div>
          <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.6 }}>
            <b style={{ color: '#66aabb' }}>⚷ Хирон в {signRu(chiron.sign)}</b> · {chiron.house}-й дом
            <br />
            Глубинная рана в теме «{HOUSES[chiron.house]?.theme ?? '...'}» — после принятия становится
            главным источником мудрости и способности помогать другим в этой же теме.
            {ageNow >= 48 && ageNow <= 53 && (
              <><br /><span style={{ color: '#66aabb', fontWeight: 600 }}>
                ⚡ Вы сейчас вблизи возврата Хирона (~{chironReturn} лет) — ключевой период исцеления и интеграции.
              </span></>
            )}
          </div>
        </Card>
      )}

      {/* Saturn returns guide */}
      <Card isDark={isDark} accent="#8899bb">
        <div style={{ fontWeight: 700, color: '#8899bb', fontSize: 14, marginBottom: 10 }}>
          Ключевые точки возвратов Сатурна
        </div>
        {[sr1, sr2, sr3].map(yr => {
          const passed = ageNow > yr + 1;
          const current = Math.abs(ageNow - yr) <= 1;
          return (
            <div key={yr} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10,
              opacity: passed && !current ? 0.5 : 1,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: current ? '#8899bb33' : 'rgba(255,255,255,0.04)',
                border: current ? '2px solid #8899bb' : '1px solid rgba(255,255,255,0.1)',
                fontSize: 12, color: '#8899bb', fontWeight: 700,
              }}>{yr}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: current ? '#8899bb' : (isDark ? '#e2e8f0' : '#1e293b') }}>
                  {yr === 29 ? 'Первый возврат Сатурна' : yr === 59 ? 'Второй возврат Сатурна' : 'Третий возврат Сатурна'}
                  {current && <span style={{ color: '#8899bb' }}> ← вы здесь</span>}
                </div>
                <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#6b7280', marginTop: 2 }}>
                  {yr === 29
                    ? 'Переход во взрослость. Сатурн требует взять ответственность за свою жизнь. Важны честные итоги.'
                    : yr === 59
                    ? 'Кризис зрелости. Переосмысление достижений. Готовность передавать опыт.'
                    : 'Мудрость старчества. Освобождение от социальных масок.'}
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Recommendations */}
      <Card isDark={isDark} accent="#22c55e">
        <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 14, marginBottom: 10 }}>
          ✅ Рекомендации по развитию
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 2 }}>
          <li>Сейчас — фаза <b>{satPhase.phase}</b>. {satPhase.desc}</li>
          {northNodeHouse && <li>Направление роста: тема <b>«{HOUSES[northNodeHouse]?.theme}»</b> ({signRu(northNodeSign)}) — инвестируйте туда энергию.</li>}
          {saturn && <li>Сатурн в {saturn.house}-м доме: систематически работайте над темой «{HOUSES[saturn.house]?.theme}».</li>}
          {chiron && ageNow < 50 && <li>Хирон в {chiron.house}-м доме: примите уязвимость в теме «{HOUSES[chiron.house]?.theme}» — там ваш главный дар.</li>}
          {satPhase.nextReturn <= 5 && <li>⚠ До следующего возврата Сатурна {satPhase.nextReturn} лет — время подвести итоги и выстроить новый фундамент.</li>}
          <li>Цикл Юпитера: <b>{jupPhase.phase}</b> — {jupPhase.desc}</li>
        </ul>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function LifeSphereReports({ chart, name, theme, birthDate }: Props) {
  const [active, setActive] = useState<SphereKey>('finance');
  const isDark = useDark(theme);

  const bg = isDark ? '#0f1117' : '#f8fafc';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : '#ffffff';
  const textColor = isDark ? '#e2e8f0' : '#1e293b';

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: textColor, background: bg }}>
      {/* Header */}
      <div style={{ marginBottom: 20, padding: '0 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>📋</span>
          <span style={{ fontWeight: 700, fontSize: 17, color: isDark ? '#e2e8f0' : '#0f172a', fontFamily: 'Georgia, serif' }}>
            Отчёты по сферам жизни
          </span>
          {name && (
            <span style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#6b7280' }}>— {name}</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: isDark ? '#64748b' : '#9ca3af' }}>
          Метод школы Павла Андреева · Финансы, Здоровье, Профессия, Энергия, Жизненный план
        </div>
      </div>

      {/* Sphere tabs */}
      <div style={{
        display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20,
        padding: '4px', borderRadius: 12,
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
      }}>
        {SPHERES.map(s => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: active === s.key ? 700 : 500,
              fontSize: 13,
              background: active === s.key ? s.color + '22' : 'transparent',
              color: active === s.key ? s.color : (isDark ? '#94a3b8' : '#6b7280'),
              outline: active === s.key ? `1.5px solid ${s.color}66` : '1px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 15 }}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Active sphere content */}
      <div style={{
        borderRadius: 14, border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        background: cardBg, padding: '18px 16px',
      }}>
        {active === 'finance' && <FinanceSphere chart={chart} isDark={isDark} />}
        {active === 'health'  && <HealthSphere  chart={chart} isDark={isDark} />}
        {active === 'career'  && <CareerSphere  chart={chart} isDark={isDark} />}
        {active === 'energy'  && <EnergySphere  chart={chart} isDark={isDark} />}
        {active === 'plan'    && <LifePlanSphere chart={chart} isDark={isDark} birthDate={birthDate} />}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 12, padding: '10px 14px', borderRadius: 10,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
        fontSize: 11, color: '#475569', lineHeight: 1.6,
      }}>
        ✦ Отчёты построены по методологии школы Павла Андреева. Анализ основан на данных натальной карты — планетах, домах и аспектах.
      </div>
    </div>
  );
}
