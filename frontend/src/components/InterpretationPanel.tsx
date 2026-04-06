/**
 * InterpretationPanel.tsx
 * Astro interpretation module — Pavel Andreev school method
 * Generates structured reading from NatalChart data
 */

import React, { useMemo, useState } from 'react';
import type { NatalChart, PlanetData, AspectData } from '../types/astro';
import { PLANET_SYMBOLS } from '../types/astro';

// ─── Pavel Andreev Knowledge Base ────────────────────────────────────────────

const PA_PLANETS: Record<string, { name: string; ru: string; func: string; key: string; color: string }> = {
  sun:      { name: 'Sun',     ru: 'Солнце',    color: '#d4a853', key: '☉',
    func: '«Я» — ваш внутренний огонь и главная сцена жизни. Солнце показывает, где вы светите ярче всего, что даёт вам смысл и куда тянет всё сильнее.' },
  moon:     { name: 'Moon',    ru: 'Луна',       color: '#9ab5d4', key: '☽',
    func: '«Душа» — ваш эмоциональный мир и то, что вам нужно для настоящего покоя. Луна говорит о глубинных потребностях, инстинктах и о том, как вы заботитесь о себе и других.' },
  mercury:  { name: 'Mercury', ru: 'Меркурий',   color: '#88c4a8', key: '☿',
    func: '«Ум» — как вы думаете, говорите и воспринимаете мир вокруг. Меркурий управляет вашим стилем общения, скоростью мышления и тем, как вы учитесь и связываетесь с людьми.' },
  venus:    { name: 'Venus',   ru: 'Венера',     color: '#d48aaa', key: '♀',
    func: '«Сердце» — что вы любите, что притягиваете и что для вас красиво. Венера показывает вашу природу в любви, отношении к деньгам и способность получать удовольствие от жизни.' },
  mars:     { name: 'Mars',    ru: 'Марс',       color: '#d45b5b', key: '♂',
    func: '«Воля» — ваша энергия, смелость и двигатель. Марс говорит о том, как вы идёте к цели, отстаиваете себя и из чего черпаете силу действовать.' },
  jupiter:  { name: 'Jupiter', ru: 'Юпитер',    color: '#d4a04a', key: '♃',
    func: '«Рост» — где вас ждут удача, щедрость и расширение. Юпитер показывает ваш путь к изобилию, жизненную мудрость и то, во что вы искренне верите.' },
  saturn:   { name: 'Saturn',  ru: 'Сатурн',    color: '#8899bb', key: '♄',
    func: '«Мастер» — где вы взрослеете через труд, терпение и ответственность. Сатурн — строгий, но справедливый учитель: именно через него приходят настоящие результаты и зрелость.' },
  uranus:   { name: 'Uranus',  ru: 'Уран',      color: '#5bbbcc', key: '⛢',
    func: '«Революция» — где в вашей жизни случаются неожиданные прорывы и перевороты. Уран зовёт вас быть собой во всей своей странности и не бояться идти против течения.' },
  neptune:  { name: 'Neptune', ru: 'Нептун',    color: '#7788dd', key: '♆',
    func: '«Мечта» — ваши идеалы, интуиция и тонкая связь с чем-то большим. Нептун растворяет границы, ведёт к духовному поиску и иногда к прекрасным иллюзиям.' },
  pluto:    { name: 'Pluto',   ru: 'Плутон',    color: '#bb77aa', key: '♇',
    func: '«Трансформация» — где вы переживаете глубинные кризисы и рождаетесь заново. Плутон разрушает старое с силой стихии — и именно через него приходит настоящая власть над собой.' },
  node:     { name: 'N.Node',  ru: 'С.Узел',    color: '#ccaa44', key: '☊',
    func: 'Ваш компас в этой жизни. Северный Узел указывает на направление роста — туда немного страшно, но именно там ждут самые важные уроки и смысл.' },
  chiron:   { name: 'Chiron',  ru: 'Хирон',     color: '#66aabb', key: '⚷',
    func: '«Целитель» — ваша глубинная рана, которая при принятии становится источником мудрости и силы. Именно через боль Хирона вы учитесь помогать другим по-настоящему.' },
  lilith:   { name: 'Lilith',  ru: 'Лилит',     color: '#9966aa', key: '⚸',
    func: '«Тень» — то, что вы отвергаете в себе, но где живёт ваша настоящая сила. Принятие Лилит освобождает и даёт ту аутентичность, которую невозможно подделать.' },
};

const PA_HOUSES: Record<number, { name: string; theme: string; detail: string }> = {
  1:  { name: 'Дом Я',             theme: 'Тело, маска, бренд личности',
        detail: 'Ваша маска и первое впечатление. Именно здесь записано, какую энергию вы транслируете в мир ещё до того, как успели что-то сказать.' },
  2:  { name: 'Дом ресурса',       theme: 'Личные деньги, имущество, иммунитет',
        detail: 'Ваш личный ресурс — деньги, таланты и самоценность. Здесь ответ на вопрос «что я умею создавать» и «что для меня по-настоящему ценно».' },
  3:  { name: 'Дом ближнего',      theme: 'Братья, соседи, транспорт, соцсети',
        detail: 'Ваш ближний мир — общение, мышление, ближнее окружение. Братья, соседи, короткие поездки, соцсети и то, как вы перерабатываете информацию каждый день.' },
  4:  { name: 'Дом рода',          theme: 'Семья, корни, родина, недвижимость',
        detail: 'Ваши корни и тот «дом», который живёт внутри. Семейная история, отношения с матерью и психологический фундамент, на котором стоит вся жизнь.' },
  5:  { name: 'Дом творчества',    theme: 'Дети, романы, риск, самопроявление',
        detail: 'Ваше самовыражение и радость бытия. Дети, романтические истории, творчество и всё, что вы создаёте чисто для удовольствия и игры.' },
  6:  { name: 'Дом службы',        theme: 'Наёмный труд, здоровье, коллеги, рутина',
        detail: 'Ваша ежедневная реальность. Работа по найму, здоровье, режим и маленькие привычки, которые либо держат вас в тонусе, либо медленно изматывают.' },
  7:  { name: 'Дом партнёра',      theme: 'Брак, договоры, суды, открытые враги',
        detail: 'Ваши партнёры и зеркало. Брак, деловые союзы, открытые противники — всё, что отражает вас через «другого» и учит видеть себя со стороны.' },
  8:  { name: 'Дом трансформации', theme: 'Чужие ресурсы, кризисы, эрос, налоги',
        detail: 'Глубинные трансформации. Кризисы, сексуальность, наследство, чужие ресурсы — здесь старое умирает, чтобы родилось что-то принципиально новое.' },
  9:  { name: 'Дом экспертизы',    theme: 'Высшее знание, заграница, мировоззрение',
        detail: 'Ваш большой горизонт. Высшее образование, философия, дальние путешествия, издательство и бесконечный поиск смысла через опыт и знание.' },
  10: { name: 'Дом статуса',       theme: 'Карьера, репутация, иерархия, государство',
        detail: 'Ваше предназначение в глазах мира. Карьера, репутация, публичный образ и то, как вы хотите быть remembered через годы.' },
  11: { name: 'Дом аудитории',     theme: 'Единомышленники, IT, планы, будущее',
        detail: 'Ваше племя и большая мечта. Единомышленники, сообщества, цели, которые больше вас, и желание изменить хоть что-то в этом мире.' },
  12: { name: 'Дом тайного',       theme: 'Изоляция, хронические темы, творчество в тиши',
        detail: 'Ваша тихая гавань и скрытое богатство. Уединение, тайные таланты, работа «за кулисами» и кармические темы, которые не всегда видны даже вам самим.' },
};

const PA_SIGNS: Record<string, { ru: string; element: string; mode: string; keyword: string; desc: string }> = {
  aries:       { ru: 'Овен',        element: 'Огонь', mode: 'Кардинальный', keyword: 'Инициатива',
    desc: 'Первый и бесстрашный. Овен не ждёт разрешения — он просто идёт вперёд, нарушает правила и прокладывает тропу для остальных. Иногда обжигается, но именно это делает его живым. Планеты в Овне действуют быстро, импульсивно и напрямую — без лишних раздумий.' },
  taurus:      { ru: 'Телец',       element: 'Земля', mode: 'Фиксированный', keyword: 'Ресурс',
    desc: 'Терпеливый строитель и ценитель настоящего. Телец строит медленно, но то, что он создаёт, стоит на века. Обладает острым чувством удовольствия, красоты и материальной ценности. Планеты в Тельце действуют методично, надёжно и через сенсорный контакт с реальностью.' },
  gemini:      { ru: 'Близнецы',    element: 'Воздух', mode: 'Мутабельный', keyword: 'Коммуникация',
    desc: 'Вечно любопытный исследователь идей. Близнецы живут в потоке информации: читают, говорят, переключаются, задают вопросы. Умеют видеть несколько точек зрения одновременно — это дар и ловушка. Планеты в Близнецах работают через слово, связи, мобильность и интеллектуальную гибкость.' },
  cancer:      { ru: 'Рак',         element: 'Вода', mode: 'Кардинальный', keyword: 'Защита',
    desc: 'Хранитель и защитник того, что дорого. Рак живёт через память, интуицию и эмоциональные связи. Панцирь снаружи, нежность внутри. Глубоко чувствует, долго помнит обиды и ещё дольше — любовь. Планеты в Раке действуют через заботу, привязанность и защиту своих людей.' },
  leo:         { ru: 'Лев',         element: 'Огонь', mode: 'Фиксированный', keyword: 'Творчество',
    desc: 'Щедрый и яркий. Лев рождён светить — через творчество, любовь, лидерство. Ему важно быть увиденным и оценённым, и в ответ он отдаёт тепло целыми горстями. Без признания увядает. Планеты в Льве действуют через самовыражение, щедрость и желание оставить след.' },
  virgo:       { ru: 'Дева',        element: 'Земля', mode: 'Мутабельный', keyword: 'Анализ',
    desc: 'Мастер деталей и совершенствования. Дева видит то, что другие не замечают — маленький дефект, неточность, лучший способ. Её критический ум — инструмент заботы, а не осуждения. Планеты в Деве работают через анализ, улучшение процессов и служение конкретной пользе.' },
  libra:       { ru: 'Весы',        element: 'Воздух', mode: 'Кардинальный', keyword: 'Баланс',
    desc: 'Дипломат, эстет и вечный переговорщик. Весы ищут гармонию — в отношениях, пространстве, идеях. Умеют видеть обе стороны настолько хорошо, что порой не могут выбрать ни одну. Планеты в Весах действуют через партнёрство, компромисс и стремление к красоте.' },
  scorpio:     { ru: 'Скорпион',    element: 'Вода', mode: 'Фиксированный', keyword: 'Трансформация',
    desc: 'Исследователь глубин — тайн, власти и возрождения. Скорпион не боится смотреть в темноту — ни в своей душе, ни в чужой. Умеет трансформировать кризисы в силу, потери — в прозрение. Планеты в Скорпионе работают через интенсивность, психологическую глубину и необратимые перемены.' },
  sagittarius: { ru: 'Стрелец',     element: 'Огонь', mode: 'Мутабельный', keyword: 'Расширение',
    desc: 'Искатель смысла и горизонтов. Стрелец не может долго сидеть на месте — он стремится узнать больше, увидеть дальше, понять глубже. Оптимист по природе, философ по призванию, искатель приключений по сути. Планеты в Стрельце работают через экспансию, веру и поиск большой правды.' },
  capricorn:   { ru: 'Козерог',     element: 'Земля', mode: 'Кардинальный', keyword: 'Структура',
    desc: 'Терпеливый строитель высот. Козерог знает, что настоящие достижения требуют времени, дисциплины и ответственности. Карабкается к вершине методично — и добирается. Иногда ценой радости здесь и сейчас. Планеты в Козероге работают через долгосрочные структуры, профессионализм и власть через мастерство.' },
  aquarius:    { ru: 'Водолей',     element: 'Воздух', mode: 'Фиксированный', keyword: 'Инновация',
    desc: 'Революционер-гуманист из будущего. Водолей видит мир системно и уже знает, что нужно изменить. Ценит независимость превыше всего — в мышлении, в жизни, в отношениях. Иногда настолько устремлён вперёд, что теряет связь с настоящим. Планеты в Водолее действуют через инновации, коллективный разум и отрыв от условностей.' },
  pisces:      { ru: 'Рыбы',        element: 'Вода', mode: 'Мутабельный', keyword: 'Растворение',
    desc: 'Мечтатель, медиум, поэт. Рыбы не столько живут в мире, сколько впитывают его всеми порами. Границы размыты — между собой и другими, реальным и воображаемым. Это даёт огромную эмпатию и творческий дар, но требует учиться держать себя. Планеты в Рыбах действуют через интуицию, сострадание и растворение в чём-то большем, чем ego.' },
};

const PA_ASPECT_TYPES: Record<string, { ru: string; color: string; desc: string }> = {
  conjunction:    { ru: 'Соединение',    color: '#f59e0b',
    desc: 'Слияние функций. Планеты «перепутывают педали», рождая новый синтетический талант.' },
  opposition:     { ru: 'Оппозиция',     color: '#ef4444',
    desc: 'Маятник между двумя крайностями. Ключ — осознанный выбор между полюсами.' },
  trine:          { ru: 'Трин',          color: '#22c55e',
    desc: 'Врождённый талант. Функции поддерживают друг друга автоматически — дар без усилий.' },
  square:         { ru: 'Квадратура',    color: '#f87171',
    desc: 'Конфликт-генератор энергии. Куёт мечи и зарабатывает миллиарды через трение.' },
  sextile:        { ru: 'Секстиль',      color: '#60a5fa',
    desc: 'Возможности при сознательном усилии. Мягкое сотрудничество, нужна инициатива.' },
  quincunx:       { ru: 'Квинконс',      color: '#c084fc',
    desc: 'Хроническое напряжение без разрешения. Сублимируется в творчество или философию.' },
  semisextile:    { ru: 'Полусекстиль',  color: '#84cc16', desc: 'Фоновое взаимодействие, требующее адаптации.' },
  semisquare:     { ru: 'Полуквадрат',   color: '#fb923c', desc: 'Раздражитель, стимулирующий к действию.' },
  sesquisquare:   { ru: 'Сесквиквадрат', color: '#fb923c', desc: 'Напряжение, ищущее выход через активность.' },
};

const PA_PATTERNS: Record<string, { ru: string; desc: string }> = {
  has_grand_trine:       { ru: 'Большой трин',       desc: 'Три планеты образуют равносторонний треугольник. Огромный природный дар одной стихии. Риск — самодовольство без усилий.' },
  has_t_square:          { ru: 'Т-квадрат',           desc: 'Два противостояния с общим «фокусом» конфликта. Мощный генератор энергии и достижений через преодоление.' },
  has_grand_cross:       { ru: 'Большой крест',       desc: 'Четыре планеты в крестообразной конфигурации. Жизнь в постоянном напряжении, зато колоссальная сила воли.' },
  has_yod:               { ru: 'Йод (Перст Бога)',    desc: 'Два квинконса к одной планете. Карма, особая миссия, нестандартный судьбоносный выбор. Точка напряжения — ключ.' },
  has_stellium:          { ru: 'Стеллиум',             desc: 'Три и более планеты в одном знаке или доме. Сверхконцентрация энергии в этой теме — главная ось жизни.' },
  has_kite:              { ru: 'Воздушный змей',      desc: 'Большой трин с оппозицией. Трин даёт талант, оппозиция — двигатель. Самая продуктивная конфигурация.' },
  has_mystic_rectangle:  { ru: 'Мистический прямоугольник', desc: 'Два трина и два секстиля. Баланс между вдохновением и практическим действием.' },
};

// ─── Dignity labels ───────────────────────────────────────────────────────────
function dignityLabel(d: string | null | undefined): string {
  if (!d) return '';
  const map: Record<string, string> = {
    domicile: '⭐ Домициль', exaltation: '⬆ Экзальтация',
    detriment: '⬇ Изгнание', fall: '⬇ Падение',
    peregrine: '∅ Перегрин',
  };
  return map[d] || d;
}

// ─── Section card component ───────────────────────────────────────────────────
function Section({ title, icon, children, accent = '#818cf8' }: {
  title: string; icon: string; children: React.ReactNode; accent?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 20, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', background: 'rgba(255,255,255,0.04)',
          border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: accent }}>{title}</span>
        <span style={{ color: '#64748b', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '14px 16px', background: 'rgba(0,0,0,0.15)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Planet row ───────────────────────────────────────────────────────────────
function PlanetRow({ name, p, dignityStr, isDark }: {
  name: string; p: PlanetData; dignityStr?: string | null; isDark: boolean;
}) {
  const meta = PA_PLANETS[name];
  const sign = PA_SIGNS[p.sign];
  const house = PA_HOUSES[p.house];
  if (!meta || !sign || !house) return null;

  const dg = dignityStr ?? null;
  const dgLabel = dignityLabel(dg);

  return (
    <div style={{
      marginBottom: 14, padding: '12px 14px',
      borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(255,255,255,0.03)',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 20, color: meta.color }}>{meta.key}</span>
        <span style={{ fontWeight: 700, color: meta.color, fontSize: 14 }}>{meta.ru}</span>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>
          {p.deg}°{String(p.min).padStart(2,'0')}′ {sign.ru}
        </span>
        <span style={{
          padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
          background: meta.color + '22', color: meta.color,
        }}>
          {p.house} дом — {house.name}
        </span>
        {p.retrograde && (
          <span style={{ padding: '1px 6px', borderRadius: 10, fontSize: 11,
            background: '#ef444422', color: '#f87171' }}>R</span>
        )}
        {dgLabel && (
          <span style={{ fontSize: 11, color: '#fbbf24', marginLeft: 2 }}>{dgLabel}</span>
        )}
      </div>
      {/* Interpretation */}
      <div style={{ margin: 0, fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.6 }}>
        <b style={{ color: meta.color }}>{meta.ru}</b> в <b>{sign.ru}</b> ({sign.element}) →{' '}
        {meta.func.split('—')[0].trim()}{' '}
        выражается через <b>{sign.keyword.toLowerCase()}</b>.{' '}
        Активирует тему <b>«{house.theme}»</b>.
        {p.retrograde ? ' Ретроградность переориентирует эту функцию вовнутрь — интроспекция и переработка прошлого опыта.' : ''}
        {dg === 'domicile' || dg === 'exaltation' ? ' Планета в силе — функция работает мощно и легко.' : ''}
        {dg === 'detriment' || dg === 'fall' ? ' Планета ослаблена — функция требует сознательных усилий.' : ''}
      </div>
    </div>
  );
}

// ─── Aspects summary ──────────────────────────────────────────────────────────
function AspectsBlock({ aspects, isDark }: { aspects: AspectData[]; isDark: boolean }) {
  const byType = useMemo(() => {
    const map: Record<string, AspectData[]> = {};
    for (const a of aspects) {
      if (!map[a.aspect]) map[a.aspect] = [];
      map[a.aspect].push(a);
    }
    return map;
  }, [aspects]);

  const order = ['conjunction','opposition','trine','square','sextile','quincunx','semisquare','sesquisquare','semisextile'];
  const tightAspects = aspects.filter(a => a.orb < 2).slice(0, 8);

  return (
    <div>
      {/* Aspect type counts */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {order.map(type => {
          const list = byType[type];
          if (!list?.length) return null;
          const meta = PA_ASPECT_TYPES[type];
          return (
            <span key={type} style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 12,
              background: (meta?.color || '#888') + '22',
              color: meta?.color || '#888',
              border: `1px solid ${(meta?.color || '#888')}44`,
            }}>
              {meta?.ru || type}: {list.length}
            </span>
          );
        })}
      </div>

      {/* Tight aspects (orb < 2°) */}
      {tightAspects.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 8px' }}>
            🎯 Точные аспекты (орб {'<'} 2°):
          </div>
          {tightAspects.map((a, i) => {
            const meta = PA_ASPECT_TYPES[a.aspect];
            const p1 = PA_PLANETS[a.p1];
            const p2 = PA_PLANETS[a.p2];
            if (!p1 || !p2) return null;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                marginBottom: 8, padding: '8px 10px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
              }}>
                <span style={{ color: meta?.color || '#888', fontSize: 13, minWidth: 90, fontWeight: 600 }}>
                  {p1.key} {meta?.ru || a.aspect} {p2.key}
                </span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{a.orb.toFixed(1)}°</span>
                <span style={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#374151', flex: 1 }}>
                  {p1.func.split('—')[0].trim()} {meta?.desc || ''}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Aspect type descriptions */}
      {order.map(type => {
        const list = byType[type];
        if (!list?.length) return null;
        const meta = PA_ASPECT_TYPES[type];
        return (
          <div key={type} style={{ marginBottom: 6 }}>
            <span style={{ color: meta?.color || '#888', fontWeight: 600, fontSize: 12 }}>
              {meta?.ru || type} ({list.length}):
            </span>{' '}
            <span style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#6b7280' }}>{meta?.desc}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Patterns block ───────────────────────────────────────────────────────────
function PatternsBlock({ patterns }: { patterns: Record<string, boolean> }) {
  const active = Object.entries(patterns).filter(([, v]) => v);
  if (!active.length) return <div style={{ color: '#64748b', fontSize: 13 }}>Значимые конфигурации не обнаружены.</div>;
  return (
    <div>
      {active.map(([key]) => {
        const meta = PA_PATTERNS[key];
        if (!meta) return null;
        return (
          <div key={key} style={{
            marginBottom: 10, padding: '10px 12px', borderRadius: 10,
            background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)',
          }}>
            <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: 13, marginBottom: 4 }}>
              ✦ {meta.ru}
            </div>
            <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>{meta.desc}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Dominant analysis ────────────────────────────────────────────────────────
function dominantAnalysis(chart: NatalChart) {
  const elements: Record<string, number> = { Огонь: 0, Земля: 0, Воздух: 0, Вода: 0 };
  const modes: Record<string, number> = { Кардинальный: 0, Фиксированный: 0, Мутабельный: 0 };
  const houses: Record<string, number> = { angular: 0, succeedent: 0, cadent: 0 };

  for (const p of Object.values(chart.planets)) {
    const s = PA_SIGNS[p.sign];
    if (!s) continue;
    elements[s.element] = (elements[s.element] || 0) + 1;
    modes[s.mode] = (modes[s.mode] || 0) + 1;
    const h = p.house;
    if ([1, 4, 7, 10].includes(h)) houses.angular++;
    else if ([2, 5, 8, 11].includes(h)) houses.succeedent++;
    else houses.cadent++;
  }

  const topElement = Object.entries(elements).sort((a, b) => b[1] - a[1])[0];
  const topMode = Object.entries(modes).sort((a, b) => b[1] - a[1])[0];

  return { elements, modes, houses, topElement: topElement[0], topMode: topMode[0] };
}

const ELEMENT_DESC: Record<string, string> = {
  Огонь: 'Активная натура — энтузиазм, инициатива, творческий огонь. Жаждет признания и действия.',
  Земля: 'Практическая натура — надёжность, результат, материальная база. Строит и накапливает.',
  Воздух: 'Ментальная натура — коммуникации, идеи, социальность. Живёт в мире концепций.',
  Вода: 'Эмоциональная натура — чувствительность, интуиция, глубина. Живёт ощущениями.',
};
const MODE_DESC: Record<string, string> = {
  Кардинальный: 'Инициирует и начинает. Лидер перемен, стартер проектов.',
  Фиксированный: 'Удерживает и углубляет. Великая настойчивость и сила воли.',
  Мутабельный: 'Адаптируется и разнообразит. Гибкость, многозадачность, переходы.',
};

// ─── Main component ───────────────────────────────────────────────────────────

interface InterpretationPanelProps {
  chart: NatalChart;
  name?: string;
  theme?: 'dark' | 'light';
}

export default function InterpretationPanel({ chart, name, theme = 'dark' }: InterpretationPanelProps) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#0c0c1e' : '#fafaf7';
  const textColor = isDark ? '#e2e8f0' : '#1e293b';

  const asc = chart.houses.h1;
  const mc  = chart.houses.h10;
  const sun = chart.planets.sun;
  const moon = chart.planets.moon;
  const ascSign = asc ? PA_SIGNS[asc.sign] : null;
  const mcSign  = mc  ? PA_SIGNS[mc.sign]  : null;
  const sunSign = sun ? PA_SIGNS[sun.sign] : null;
  const moonSign = moon ? PA_SIGNS[moon.sign] : null;

  const dom = useMemo(() => dominantAnalysis(chart), [chart]);

  const PLANET_ORDER = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','node','chiron','lilith'];

  return (
    <div style={{ color: textColor, fontFamily: 'system-ui, sans-serif', maxWidth: 860, margin: '0 auto' }}>

      {/* ── SUMMARY HEADER ── */}
      <div style={{
        padding: '20px 22px', borderRadius: 16, marginBottom: 20,
        background: isDark ? 'linear-gradient(135deg,#13133a,#0f0f28)' : 'linear-gradient(135deg,#fdfbf5,#f0ead8)',
        border: '1px solid rgba(200,168,75,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 28 }}>✦</span>
          <div>
            <h2 style={{ margin: 0, color: '#c8a84b', fontWeight: 700, fontSize: 18 }}>
              Интерпретация карты{name ? ` — ${name}` : ''}
            </h2>
            <div style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>
              Метод школы Павла Андреева · {chart.metadata?.date} · {chart.metadata?.time}
            </div>
          </div>
        </div>

        {/* 4 pillars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          {[
            { label: '☉ Солнце', value: sunSign ? `${sunSign.ru} · ${sun!.house} дом` : '—', color: '#d4a853' },
            { label: '☽ Луна',   value: moonSign ? `${moonSign.ru} · ${moon!.house} дом` : '—', color: '#9ab5d4' },
            { label: '↑ АСЦ',   value: ascSign  ? ascSign.ru  : '—', color: '#fbbf24' },
            { label: '↑ MC',    value: mcSign   ? mcSign.ru   : '—', color: '#4ade80' },
          ].map(item => (
            <div key={item.label} style={{
              padding: '10px 14px', borderRadius: 10,
              background: item.color + '15', border: `1px solid ${item.color}33`,
            }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontWeight: 700, color: item.color, fontSize: 14 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DOMINANT ANALYSIS ── */}
      <Section title="Доминанты карты" icon="🌿" accent="#34d399">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Elements */}
          <div>
            <div style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>СТИХИИ</div>
            {Object.entries(dom.elements).map(([el, n]) => (
              <div key={el} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 12, minWidth: 60, color: el === dom.topElement ? '#fbbf24' : textColor }}>
                  {el === dom.topElement ? '★ ' : ''}{el}
                </span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
                  <div style={{ width: `${(n / 13) * 100}%`, height: '100%', borderRadius: 3,
                    background: el === dom.topElement ? '#fbbf24' : '#4f46e5' }} />
                </div>
                <span style={{ fontSize: 12, color: '#64748b', minWidth: 14 }}>{n}</span>
              </div>
            ))}
            <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#6b7280', marginTop: 8, lineHeight: 1.5 }}>
              {ELEMENT_DESC[dom.topElement]}
            </div>
          </div>
          {/* Modes + house types */}
          <div>
            <div style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>МОДУСЫ</div>
            {Object.entries(dom.modes).map(([m, n]) => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 12, minWidth: 80, color: m === dom.topMode ? '#fbbf24' : textColor }}>
                  {m === dom.topMode ? '★ ' : ''}{m.replace('Кардинальный','Кард.').replace('Фиксированный','Фикс.').replace('Мутабельный','Мут.')}
                </span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
                  <div style={{ width: `${(n / 13) * 100}%`, height: '100%', borderRadius: 3,
                    background: m === dom.topMode ? '#fbbf24' : '#6366f1' }} />
                </div>
                <span style={{ fontSize: 12, color: '#64748b', minWidth: 14 }}>{n}</span>
              </div>
            ))}
            <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#6b7280', marginTop: 8, lineHeight: 1.5 }}>
              {MODE_DESC[dom.topMode]}
            </div>
            <div style={{ margin: '10px 0 4px', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>ДОМА</div>
            <div style={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.5 }}>
              Угловые: <b style={{ color: '#fbbf24' }}>{dom.houses.angular}</b> ·
              Последующие: <b style={{ color: '#60a5fa' }}>{dom.houses.succeedent}</b> ·
              Кадентные: <b style={{ color: '#94a3b8' }}>{dom.houses.cadent}</b>
            </div>
            {dom.houses.angular >= 5 && <div style={{ fontSize: 11, color: '#fbbf24', margin: '4px 0 0' }}>
              Акцент на угловых домах — активная, публичная жизнь.
            </div>}
          </div>
        </div>
      </Section>

      {/* ── PLANETS INTERPRETATION ── */}
      <Section title="Планеты — функции и дома" icon="🪐" accent="#818cf8">
        {PLANET_ORDER.map(pname => {
          const p = chart.planets[pname];
          if (!p) return null;
          const dg = chart.dignities?.[pname]?.dignity ?? null;
          return <PlanetRow key={pname} name={pname} p={p} dignityStr={dg} isDark={isDark} />;
        })}
      </Section>

      {/* ── ASPECTS ── */}
      <Section title="Аспекты — конфигурации" icon="⬡" accent="#60a5fa">
        <AspectsBlock aspects={chart.aspects || []} isDark={isDark} />
      </Section>

      {/* ── PATTERNS ── */}
      {chart.patterns && Object.values(chart.patterns).some(Boolean) && (
        <Section title="Фигуры карты" icon="🔷" accent="#fbbf24">
          <PatternsBlock patterns={chart.patterns as unknown as Record<string, boolean>} />
        </Section>
      )}

      {/* ── KARMIC AXIS ── */}
      <Section title="Кармическая ось (Узлы)" icon="🔮" accent="#c084fc">
        {(() => {
          const node = chart.planets.node;
          if (!node) return <div style={{ color: '#64748b', fontSize: 13 }}>Данные узлов отсутствуют.</div>;
          const nodeSign = PA_SIGNS[node.sign];
          const southLon = (node.lon + 180) % 360;
          const southSignIdx = Math.floor(southLon / 30);
          const southSignKeys = Object.keys(PA_SIGNS);
          const southSign = PA_SIGNS[southSignKeys[southSignIdx]] || null;
          const northHouse = PA_HOUSES[node.house];
          const southHouseNum = node.house <= 6 ? node.house + 6 : node.house - 6;
          const southHouse = PA_HOUSES[southHouseNum];

          return (
            <div style={{ fontSize: 13, lineHeight: 1.8, color: isDark ? '#cbd5e1' : '#374151' }}>
              <div>
                <b style={{ color: '#c084fc' }}>Северный Узел</b> в{' '}
                <b>{nodeSign?.ru}</b> · <b>{node.house} дом</b> ({northHouse?.name}) —
                направление эволюции и кармического роста в этой жизни.
              </div>
              <div>
                <b style={{ color: '#94a3b8' }}>Южный Узел</b> в{' '}
                <b>{southSign?.ru}</b> · <b>{southHouseNum} дом</b> ({southHouse?.name}) —
                накопленный прошлый опыт. Зона комфорта, от которой нужно двигаться вперёд.
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                По методу Андреева: Южный Узел — «откуда», Северный — «куда». Задача —
                освоить качества Северного Узла, опираясь на ресурс Южного.
              </div>
            </div>
          );
        })()}
      </Section>

      {/* ── LUNAR PHASE ── */}
      {chart.lunar_phase && (
        <Section title="Лунная фаза рождения" icon="🌙" accent="#9ab5d4">
          <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.7 }}>
            <div>
              {/* API returns "phase" key, fallback to "name" */}
              <b style={{ color: '#9ab5d4' }}>
                {chart.lunar_phase.phase || chart.lunar_phase.name}
              </b>{' '}·{' '}
              угол {Math.round(chart.lunar_phase.angle)}°
            </div>
            {(() => {
              const angle = chart.lunar_phase.angle;
              if (angle < 45)  return <div>Новолуние — «семя»: врождённый инстинкт начинать, инициировать, творить с нуля.</div>;
              if (angle < 90)  return <div>Молодая Луна — «росток»: импульс к проявлению, первые шаги, энтузиазм без полного опыта.</div>;
              if (angle < 135) return <div>Первая четверть — «кризис действия»: натура, реализующая себя через преодоление препятствий.</div>;
              if (angle < 180) return <div>Горбатая Луна — «совершенствование»: аналитический ум, стремление к мастерству и завершённости.</div>;
              if (angle < 225) return <div>Полнолуние — «плод»: объективность, осознанность, жизнь ради других, публичность.</div>;
              if (angle < 270) return <div>Убывающая горбатая Луна — «дистилляция»: философ-учитель, распространяет знание и опыт.</div>;
              if (angle < 315) return <div>Последняя четверть — «переоценка»: переосмысляет прошлое, реформирует структуры.</div>;
              return <div>Бальзамическая Луна — «семя будущего»: медиум, пророк, завершает циклы, несёт карму прошлого поколения.</div>;
            })()}
          </div>
        </Section>
      )}

      {/* ── FOOTER NOTE ── */}
      <div style={{
        padding: '12px 16px', borderRadius: 10, marginTop: 8,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
        fontSize: 11, color: '#475569', lineHeight: 1.6,
      }}>
        ✦ Интерпретация построена по методологии школы Павла Андреева.
        Функциональный подход: каждая планета — отдельная «функция» психики;
        знак — стиль её выражения; дом — жизненная сфера применения.
      </div>
    </div>
  );
}
