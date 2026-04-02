// ─── Relationship Forecast Engine ────────────────────────────────────────────
// Client-side astrological forecast using planetary events + moon phases.
// Hardcoded events 2025-01-01 → 2027-06-30.

import type { SphereScore } from './synastryData';

// ──────────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────────

export type EventEffect = 'boost' | 'challenge' | 'warning' | 'neutral';

export interface PlanetaryEvent {
  date: string;        // YYYY-MM-DD (start)
  end?: string;        // YYYY-MM-DD (end, for periods)
  planet: string;
  type: 'rx_start' | 'rx_end' | 'ingress' | 'eclipse' | 'lunation' | 'aspect' | 'station';
  sign?: string;
  title: string;
  spheres: string[];
  effect: EventEffect;
  advice: string;
  avoid?: string;
  power: number;       // 1-3 (importance)
}

export interface MoonPhaseEvent {
  date: string;        // YYYY-MM-DD
  type: 'new' | 'full';
  sign: string;
  spheres: string[];
  title: string;
  ritual: string;
  energy: string;
}

export interface FortnightBlock {
  start: string;       // YYYY-MM-DD
  end: string;
  label: string;       // "1–14 апреля 2025"
  energyScore: number; // 0-100 (overall relational energy)
  energyLabel: string;
  energyColor: string; // tailwind text color
  keyEvents: PlanetaryEvent[];
  moonPhases: MoonPhaseEvent[];
  activeSpheres: string[];   // spheres most active this fortnight
  challengeSpheres: string[];
  mainAdvice: string;
  bestDate?: string;
  bestDateAction?: string;
  cautionDate?: string;
  cautionReason?: string;
}

export interface SphereDateRec {
  date: string;
  endDate?: string;
  action: string;
  power: number;
}

export interface SphereForecast {
  sphereId: string;
  bestDates: SphereDateRec[];
  cautionDates: SphereDateRec[];
  monthSummaries: Array<{ month: string; advice: string; action: string; energy: 'high' | 'mid' | 'low' }>;
}

export interface TopDate {
  date: string;
  spheres: string[];
  action: string;
  power: number;
  eventTitle: string;
}

export interface RelationshipForecast {
  periodLabel: string;
  overallScore: number;
  overallSummary: string;
  fortnights: FortnightBlock[];
  sphereForecasts: SphereForecast[];
  topDates: TopDate[];
  warningDates: Array<{ date: string; end?: string; reason: string; avoid: string }>;
}

// ──────────────────────────────────────────────────────────────────────────────
// MOON PHASES 2025 – 2027
// ──────────────────────────────────────────────────────────────────────────────

const SIGN_TO_SPHERES: Record<string, string[]> = {
  aries:       ['career','romance','partnership'],
  taurus:      ['finances','hobbies','sex'],
  gemini:      ['communication','hobbies','travel'],
  cancer:      ['family','children','trust'],
  leo:         ['romance','sex','children'],
  virgo:       ['communication','business','health'],
  libra:       ['romance','partnership','trust'],
  scorpio:     ['sex','trust','spiritual'],
  sagittarius: ['travel','spiritual','partnership'],
  capricorn:   ['career','business','finances'],
  aquarius:    ['communication','spiritual','partnership'],
  pisces:      ['spiritual','romance','family'],
};

const SIGN_RU: Record<string, string> = {
  aries:'Овне', taurus:'Тельце', gemini:'Близнецах', cancer:'Раке',
  leo:'Льве', virgo:'Деве', libra:'Весах', scorpio:'Скорпионе',
  sagittarius:'Стрельце', capricorn:'Козероге', aquarius:'Водолее', pisces:'Рыбах',
};

const MOON_PHASES: MoonPhaseEvent[] = [
  // 2025
  { date:'2025-01-13', type:'full',  sign:'cancer',      spheres:['family','children','trust'],   title:'Полнолуние в Раке',         ritual:'Проведите вечер дома, поговорите об общих ценностях и семье', energy:'Эмоциональная кульминация — глубокие разговоры о доме и безопасности' },
  { date:'2025-01-29', type:'new',   sign:'aquarius',    spheres:['communication','spiritual'],   title:'Новолуние в Водолее',       ritual:'Запишите совместные цели и нестандартные планы', energy:'Время для свежих идей и нестандартных решений в паре' },
  { date:'2025-02-12', type:'full',  sign:'leo',         spheres:['romance','sex','children'],    title:'Полнолуние в Льве',         ritual:'Устройте романтическое свидание — наряды, ужин, танцы', energy:'Пик страсти и творческой энергии — отличное время для романтики' },
  { date:'2025-02-28', type:'new',   sign:'pisces',      spheres:['spiritual','romance','family'],title:'Новолуние в Рыбах',         ritual:'Медитируйте вместе, поделитесь мечтами', energy:'Тонкая, чувствительная энергия — время для духовной близости' },
  { date:'2025-03-14', type:'full',  sign:'virgo',       spheres:['communication','business'],    title:'Полнолуние + Лунное затмение в Деве', ritual:'Завершите незаконченные дела, разберите накопившееся', energy:'Мощный сдвиг — завершение важных глав' },
  { date:'2025-03-29', type:'new',   sign:'aries',       spheres:['career','partnership','romance'],title:'Новолуние + Солнечное затмение в Овне',ritual:'Начните совместный новый проект или традицию', energy:'Мощное новое начало — семена, посеянные сейчас, дадут большие плоды' },
  { date:'2025-04-13', type:'full',  sign:'libra',       spheres:['romance','partnership','trust'], title:'Полнолуние в Весах',       ritual:'Обсудите баланс в отношениях, что работает, что нет', energy:'Кульминация в сфере партнёрства и гармонии' },
  { date:'2025-04-27', type:'new',   sign:'taurus',      spheres:['finances','hobbies','sex'],    title:'Новолуние в Тельце',        ritual:'Создайте совместный финансовый или домашний план', energy:'Время для практических решений и чувственных удовольствий' },
  { date:'2025-05-12', type:'full',  sign:'scorpio',     spheres:['sex','trust','spiritual'],     title:'Полнолуние в Скорпионе',    ritual:'Глубокий честный разговор о желаниях и страхах', energy:'Интенсивная трансформирующая энергия — погружение в глубину' },
  { date:'2025-05-27', type:'new',   sign:'gemini',      spheres:['communication','hobbies'],     title:'Новолуние в Близнецах',     ritual:'Начните совместное обучение или творческий проект', energy:'Активизация интеллектуальной и коммуникативной сферы' },
  { date:'2025-06-11', type:'full',  sign:'sagittarius', spheres:['travel','spiritual','partnership'],title:'Полнолуние в Стрельце', ritual:'Спланируйте совместное путешествие или приключение', energy:'Тяга к свободе, приключениям и расширению горизонтов' },
  { date:'2025-06-25', type:'new',   sign:'cancer',      spheres:['family','children','trust'],   title:'Новолуние в Раке',          ritual:'Создайте новую домашнюю традицию или ритуал', energy:'Семенное время для всего, что связано с домом и семьёй' },
  { date:'2025-07-10', type:'full',  sign:'capricorn',   spheres:['career','business','finances'],title:'Полнолуние в Козероге',     ritual:'Оцените совместные достижения и поставьте новые цели', energy:'Кульминация в карьерной и финансовой сфере' },
  { date:'2025-07-24', type:'new',   sign:'leo',         spheres:['romance','sex','children'],    title:'Новолуние в Льве',          ritual:'Запланируйте яркое совместное событие или создайте что-то вместе', energy:'Начало нового творческого и романтического цикла' },
  { date:'2025-08-09', type:'full',  sign:'aquarius',    spheres:['communication','spiritual'],   title:'Полнолуние в Водолее',      ritual:'Обсудите нестандартные мечты и цели', energy:'Время переосмыслить ваши ценности и будущее' },
  { date:'2025-08-23', type:'new',   sign:'virgo',       spheres:['communication','business'],    title:'Новолуние в Деве',          ritual:'Разработайте совместный план или систему для общей жизни', energy:'Практическое обновление, время выстроить систему' },
  { date:'2025-09-07', type:'full',  sign:'pisces',      spheres:['spiritual','romance','family'],title:'Полнолуние в Рыбах',        ritual:'Творческий вечер: музыка, кино, искусство, медитация', energy:'Пик интуиции, чувственности и духовной связи' },
  { date:'2025-09-21', type:'new',   sign:'virgo',       spheres:['communication','business'],    title:'Новолуние + Солнечное затмение в Деве',ritual:'Начните новый режим здоровья или рабочий проект вместе', energy:'Сдвиг в сфере работы, здоровья и практического порядка' },
  { date:'2025-10-07', type:'full',  sign:'aries',       spheres:['career','romance','partnership'],title:'Полнолуние в Овне',       ritual:'Честный разговор о желаниях и направлении движения', energy:'Кульминация личных желаний — не подавляйте их' },
  { date:'2025-10-21', type:'new',   sign:'libra',       spheres:['romance','partnership','trust'],title:'Новолуние в Весах',        ritual:'Обновите договорённости, сделайте совместное обязательство', energy:'Идеальное время для новых соглашений и балансировки отношений' },
  { date:'2025-11-05', type:'full',  sign:'taurus',      spheres:['finances','hobbies','sex'],    title:'Полнолуние в Тельце',       ritual:'Оцените финансовое положение, порадуйте себя совместно', energy:'Кульминация в сфере удовольствий, материальных ценностей' },
  { date:'2025-11-20', type:'new',   sign:'scorpio',     spheres:['sex','trust','spiritual'],     title:'Новолуние в Скорпионе',     ritual:'Обсудите глубинные желания и страхи в безопасной обстановке', energy:'Семена глубокой трансформации и интимности' },
  { date:'2025-12-04', type:'full',  sign:'gemini',      spheres:['communication','hobbies'],     title:'Полнолуние в Близнецах',    ritual:'Финальный разговор года — что было, что стало', energy:'Завершение коммуникативного цикла года' },
  { date:'2025-12-20', type:'new',   sign:'sagittarius', spheres:['travel','spiritual','partnership'],title:'Новолуние в Стрельце',  ritual:'Поставьте совместные цели на следующий год', energy:'Семена нового большого пути и расширения' },
  // 2026
  { date:'2026-01-03', type:'full',  sign:'cancer',      spheres:['family','children','trust'],   title:'Полнолуние в Раке',         ritual:'Встреча нового года — акцент на семье и уюте', energy:'Эмоциональная кульминация начала года' },
  { date:'2026-01-18', type:'new',   sign:'capricorn',   spheres:['career','business','finances'],title:'Новолуние в Козероге',      ritual:'Составьте годовой план совместных целей', energy:'Практическое начало нового года' },
  { date:'2026-02-01', type:'full',  sign:'leo',         spheres:['romance','sex','children'],    title:'Полнолуние в Льве',         ritual:'Яркий романтический вечер, подарки, нежность', energy:'Пик страсти и радости в паре' },
  { date:'2026-02-17', type:'new',   sign:'aquarius',    spheres:['communication','spiritual'],   title:'Новолуние в Водолее',       ritual:'Запланируйте нестандартные совместные активности', energy:'Обновление на уровне дружбы и единения' },
  { date:'2026-03-03', type:'full',  sign:'virgo',       spheres:['communication','business'],    title:'Полнолуние + Лунное затмение в Деве',ritual:'Завершите важный совместный проект', energy:'Сдвиговое завершение в деловой и коммуникативной сфере' },
  { date:'2026-03-17', type:'new',   sign:'pisces',      spheres:['spiritual','romance','family'],title:'Новолуние + Солнечное затмение в Рыбах',ritual:'Ритуал прощения и обновления, медитация вместе', energy:'Мощный трансформирующий старт нового цикла' },
  { date:'2026-04-02', type:'full',  sign:'libra',       spheres:['romance','partnership','trust'],title:'Полнолуние в Весах',       ritual:'Торжество партнёрства — годовщина или особый ужин', energy:'Кульминация в сфере союза и баланса' },
  { date:'2026-04-17', type:'new',   sign:'aries',       spheres:['career','partnership','romance'],title:'Новолуние в Овне',         ritual:'Начните смелый совместный новый проект', energy:'Огонь нового начала — действуйте смело' },
  { date:'2026-05-01', type:'full',  sign:'scorpio',     spheres:['sex','trust','spiritual'],     title:'Полнолуние в Скорпионе',    ritual:'Интимный вечер, честность о самом важном', energy:'Пик трансформирующей близости' },
  { date:'2026-05-16', type:'new',   sign:'taurus',      spheres:['finances','hobbies','sex'],    title:'Новолуние в Тельце',        ritual:'Инвестируйте в совместный проект или красоту', energy:'Время для практических и чувственных решений' },
  { date:'2026-05-31', type:'full',  sign:'sagittarius', spheres:['travel','spiritual','partnership'],title:'Полнолуние в Стрельце',  ritual:'Путешествие или большое совместное приключение', energy:'Пик тяги к свободе и расширению' },
  { date:'2026-06-15', type:'new',   sign:'gemini',      spheres:['communication','hobbies'],     title:'Новолуние в Близнецах',     ritual:'Начните совместное обучение или ведение блога', energy:'Активизация общения и новых идей' },
];

// ──────────────────────────────────────────────────────────────────────────────
// PLANETARY EVENTS 2025 – 2026
// ──────────────────────────────────────────────────────────────────────────────

export const PLANETARY_EVENTS: PlanetaryEvent[] = [
  // ── MERCURY RETROGRADES ────────────────────────────────────────────────────
  { date:'2025-01-18', end:'2025-02-11', planet:'mercury', type:'rx_start', sign:'aquarius',
    title:'Меркурий ретроградный (Водолей→Козерог)',
    spheres:['communication','business','partnership'], effect:'warning', power:2,
    advice:'Избегайте подписания договоров и важных переговоров. Пересматривайте старые договорённости.',
    avoid:'Начинать важные разговоры о будущем, подписывать документы' },
  { date:'2025-02-11', planet:'mercury', type:'rx_end', sign:'capricorn',
    title:'Меркурий прямой в Козероге',
    spheres:['communication','business'], effect:'boost', power:1,
    advice:'Возобновите отложенные переговоры. Отличное время для деловых договорённостей.' },
  { date:'2025-05-29', end:'2025-06-22', planet:'mercury', type:'rx_start', sign:'gemini',
    title:'Меркурий ретроградный в Близнецах',
    spheres:['communication','hobbies'], effect:'warning', power:2,
    advice:'Пересмотрите планы, доделайте незаконченные разговоры. Выслушивайте, не осуждайте.',
    avoid:'Новые соглашения, важные переговоры о совместном будущем' },
  { date:'2025-06-22', planet:'mercury', type:'rx_end', sign:'gemini',
    title:'Меркурий прямой в Близнецах',
    spheres:['communication'], effect:'boost', power:1,
    advice:'Коммуникация открывается — идеально для ясных разговоров о планах.' },
  { date:'2025-09-21', end:'2025-10-14', planet:'mercury', type:'rx_start', sign:'libra',
    title:'Меркурий ретроградный в Весах',
    spheres:['romance','partnership','communication'], effect:'warning', power:2,
    advice:'Пересмотрите договорённости в паре. Что не работает — обсудите спокойно.',
    avoid:'Принимать финальные решения об отношениях' },
  { date:'2025-10-14', planet:'mercury', type:'rx_end', sign:'libra',
    title:'Меркурий прямой в Весах',
    spheres:['romance','partnership'], effect:'boost', power:1,
    advice:'Время для финальных договорённостей и переоценки отношений.' },
  { date:'2026-01-16', end:'2026-02-07', planet:'mercury', type:'rx_start', sign:'aquarius',
    title:'Меркурий ретроградный (Водолей→Козерог)',
    spheres:['communication','business'], effect:'warning', power:2,
    advice:'Завершайте старые проекты, не начинайте новых переговоров.',
    avoid:'Новые соглашения и деловые переговоры' },
  { date:'2026-02-07', planet:'mercury', type:'rx_end', sign:'capricorn',
    title:'Меркурий прямой в Козероге',
    spheres:['business','communication'], effect:'boost', power:1,
    advice:'Возобновляйте деловое общение и деловые планы.' },
  { date:'2026-05-19', end:'2026-06-11', planet:'mercury', type:'rx_start', sign:'gemini',
    title:'Меркурий ретроградный в Близнецах',
    spheres:['communication','hobbies'], effect:'warning', power:2,
    advice:'Время для ревизии идей и проектов. Слушайте больше, говорите меньше.',
    avoid:'Важные переговоры и новые соглашения' },

  // ── VENUS EVENTS ───────────────────────────────────────────────────────────
  { date:'2025-03-01', end:'2025-04-12', planet:'venus', type:'rx_start', sign:'aries',
    title:'Венера ретроградная (Овен→Рыбы)',
    spheres:['romance','sex','finances','hobbies'], effect:'warning', power:3,
    advice:'Время переосмысления отношений — что ценно, а что нет. Старые паттерны выходят на поверхность.',
    avoid:'Крупные финансовые решения, начало новых романтических сцен, резких изменений в отношениях' },
  { date:'2025-04-12', planet:'venus', type:'rx_end', sign:'pisces',
    title:'Венера прямая — выход из ретроградности',
    spheres:['romance','sex','finances'], effect:'boost', power:3,
    advice:'Открывается мощный период для романтики, красоты и финансов. Начните то, что откладывали.' },
  { date:'2025-05-06', planet:'venus', type:'ingress', sign:'taurus',
    title:'Венера входит в Телец',
    spheres:['finances','sex','hobbies','romance'], effect:'boost', power:2,
    advice:'Период чувственных удовольствий, стабильности и финансовой уверенности. Инвестируйте в красоту.' },
  { date:'2025-06-06', planet:'venus', type:'ingress', sign:'gemini',
    title:'Венера входит в Близнецы',
    spheres:['communication','hobbies','romance'], effect:'boost', power:1,
    advice:'Флирт, игривость, интеллектуальная близость — освежите общение в паре.' },
  { date:'2025-07-04', planet:'venus', type:'ingress', sign:'cancer',
    title:'Венера входит в Рак',
    spheres:['family','children','romance'], effect:'boost', power:2,
    advice:'Уют, нежность, домашняя атмосфера — идеальное время для семейных решений.' },
  { date:'2025-07-31', planet:'venus', type:'ingress', sign:'leo',
    title:'Венера входит в Лев',
    spheres:['romance','sex','children'], effect:'boost', power:3,
    advice:'Пик романтической энергии года! Роскошь, праздники, страсть, яркие свидания.' },
  { date:'2025-08-25', planet:'venus', type:'ingress', sign:'virgo',
    title:'Венера входит в Деву',
    spheres:['communication','business','hobbies'], effect:'neutral', power:1,
    advice:'Практическая любовь: забота через действия, совместные ритуалы здоровья.' },
  { date:'2025-09-19', planet:'venus', type:'ingress', sign:'libra',
    title:'Венера входит в Весы',
    spheres:['romance','partnership','trust'], effect:'boost', power:3,
    advice:'Венера в своём знаке — гармония, красота, романтика на высшем уровне. Идеальное время для важных решений в паре.' },
  { date:'2025-10-13', planet:'venus', type:'ingress', sign:'scorpio',
    title:'Венера входит в Скорпион',
    spheres:['sex','trust','spiritual'], effect:'boost', power:2,
    advice:'Глубокая интимность, страсть, откровенность. Период для обнажения истинных чувств.' },
  { date:'2025-11-07', planet:'venus', type:'ingress', sign:'sagittarius',
    title:'Венера входит в Стрелец',
    spheres:['travel','spiritual','romance'], effect:'boost', power:1,
    advice:'Приключения в паре, путешествия, жизнерадостная любовь без ограничений.' },
  { date:'2025-12-01', planet:'venus', type:'ingress', sign:'capricorn',
    title:'Венера входит в Козерог',
    spheres:['business','finances','trust'], effect:'neutral', power:1,
    advice:'Серьёзность, обязательства, долгосрочное планирование. Время для деловых решений в паре.' },
  { date:'2025-12-25', planet:'venus', type:'ingress', sign:'aquarius',
    title:'Венера входит в Водолей',
    spheres:['communication','spiritual'], effect:'neutral', power:1,
    advice:'Нестандартная любовь, свобода и уважение к индивидуальности партнёра.' },
  { date:'2026-01-17', planet:'venus', type:'ingress', sign:'pisces',
    title:'Венера входит в Рыбы',
    spheres:['spiritual','romance','family'], effect:'boost', power:2,
    advice:'Мистическая, нежная романтика. Прощение, растворение в любви, творческое вдохновение.' },
  { date:'2026-02-11', planet:'venus', type:'ingress', sign:'aries',
    title:'Венера входит в Овен',
    spheres:['romance','career','partnership'], effect:'boost', power:2,
    advice:'Смелость в любви, новые начала, страсть без оглядки.' },
  { date:'2026-03-09', planet:'venus', type:'ingress', sign:'taurus',
    title:'Венера входит в Телец',
    spheres:['finances','sex','hobbies'], effect:'boost', power:2,
    advice:'Наслаждение, стабильность, чувственность. Идеально для финансовых и физических удовольствий.' },
  { date:'2026-04-05', planet:'venus', type:'ingress', sign:'gemini',
    title:'Венера входит в Близнецы',
    spheres:['communication','hobbies','romance'], effect:'boost', power:1,
    advice:'Игривость и разнообразие в паре. Находите новые общие интересы.' },
  { date:'2026-05-02', planet:'venus', type:'ingress', sign:'cancer',
    title:'Венера входит в Рак',
    spheres:['family','children','romance'], effect:'boost', power:2,
    advice:'Семейная нежность. Идеально для семейных событий и укрепления домашнего очага.' },
  { date:'2026-05-28', planet:'venus', type:'ingress', sign:'leo',
    title:'Венера входит в Лев',
    spheres:['romance','sex','children'], effect:'boost', power:3,
    advice:'Романтический максимум! Яркие свидания, страсть, творческая близость.' },

  // ── MARS EVENTS ────────────────────────────────────────────────────────────
  { date:'2025-02-23', planet:'mars', type:'rx_end', sign:'cancer',
    title:'Марс прямой — конец ретроградности в Раке',
    spheres:['sex','career','family'], effect:'boost', power:2,
    advice:'Энергия возвращается. Начинайте действовать: карьерные, физические, сексуальные планы.' },
  { date:'2025-04-18', planet:'mars', type:'ingress', sign:'leo',
    title:'Марс входит в Лев',
    spheres:['romance','sex','children','career'], effect:'boost', power:3,
    advice:'Огонь, страсть, уверенность. Прекрасный период для активных свиданий и физической близости.' },
  { date:'2025-06-16', planet:'mars', type:'ingress', sign:'virgo',
    title:'Марс входит в Деву',
    spheres:['business','communication','hobbies'], effect:'neutral', power:1,
    advice:'Точность, эффективность. Хорошее время для совместной работы над проектами.' },
  { date:'2025-08-06', planet:'mars', type:'ingress', sign:'libra',
    title:'Марс входит в Весы',
    spheres:['romance','partnership','trust'], effect:'boost', power:2,
    advice:'Борьба за справедливость в паре. Обсуждайте баланс сил открыто.' },
  { date:'2025-09-22', planet:'mars', type:'ingress', sign:'scorpio',
    title:'Марс входит в Скорпион',
    spheres:['sex','trust','spiritual'], effect:'boost', power:3,
    advice:'Пик сексуальной интенсивности — период самой глубокой физической близости.' },
  { date:'2025-11-04', planet:'mars', type:'ingress', sign:'sagittarius',
    title:'Марс входит в Стрелец',
    spheres:['travel','spiritual','partnership'], effect:'boost', power:1,
    advice:'Энергия для приключений и исследований. Планируйте совместные путешествия.' },
  { date:'2025-12-15', planet:'mars', type:'ingress', sign:'capricorn',
    title:'Марс входит в Козерог',
    spheres:['career','business','finances'], effect:'boost', power:2,
    advice:'Мощная деловая энергия. Время для совместных карьерных и финансовых решений.' },
  { date:'2026-01-26', planet:'mars', type:'ingress', sign:'aquarius',
    title:'Марс входит в Водолей',
    spheres:['communication','spiritual'], effect:'neutral', power:1,
    advice:'Нестандартные подходы к целям. Экспериментируйте в паре.' },
  { date:'2026-03-09', planet:'mars', type:'ingress', sign:'pisces',
    title:'Марс входит в Рыбы',
    spheres:['spiritual','romance','family'], effect:'neutral', power:1,
    advice:'Мягкая, духовная энергия. Время для исцеления и тонкой близости.' },
  { date:'2026-04-17', planet:'mars', type:'ingress', sign:'aries',
    title:'Марс входит в Овен (домициль)',
    spheres:['career','romance','partnership'], effect:'boost', power:3,
    advice:'Максимальная энергия и напор. Время для смелых решений и новых начал.' },
  { date:'2026-05-24', planet:'mars', type:'ingress', sign:'taurus',
    title:'Марс входит в Телец',
    spheres:['finances','sex','hobbies'], effect:'neutral', power:1,
    advice:'Устойчивость и настойчивость. Хорошо для долгосрочных финансовых решений.' },

  // ── JUPITER EVENTS ─────────────────────────────────────────────────────────
  { date:'2025-06-09', planet:'jupiter', type:'ingress', sign:'cancer',
    title:'Юпитер входит в Рак',
    spheres:['family','children','romance','trust'], effect:'boost', power:3,
    advice:'Год Юпитера в Раке — мощная экспансия в сфере семьи, дома и детей. Лучший период для совместных семейных решений следующего года.' },
  { date:'2025-11-11', end:'2026-03-11', planet:'jupiter', type:'rx_start', sign:'cancer',
    title:'Юпитер ретроградный в Раке',
    spheres:['family','children'], effect:'neutral', power:1,
    advice:'Переосмысление семейных ценностей и планов. Хорошее время для внутреннего роста.' },
  { date:'2026-03-11', planet:'jupiter', type:'rx_end', sign:'cancer',
    title:'Юпитер прямой в Раке',
    spheres:['family','children','romance'], effect:'boost', power:2,
    advice:'Семейная и эмоциональная экспансия возобновляется. Отличное время для важных семейных шагов.' },
  { date:'2026-06-30', planet:'jupiter', type:'ingress', sign:'leo',
    title:'Юпитер входит в Лев',
    spheres:['romance','children','sex','career'], effect:'boost', power:3,
    advice:'Год щедрости, творчества и романтического изобилия. Большие возможности для любовной жизни.' },

  // ── SATURN EVENTS ──────────────────────────────────────────────────────────
  { date:'2025-07-13', end:'2025-11-27', planet:'saturn', type:'rx_start', sign:'pisces',
    title:'Сатурн ретроградный в Рыбах',
    spheres:['spiritual','trust','business'], effect:'neutral', power:1,
    advice:'Период пересмотра ограничений и обязательств. Хорошее время для переоценки структур в паре.' },
  { date:'2025-11-27', planet:'saturn', type:'rx_end', sign:'pisces',
    title:'Сатурн прямой в Рыбах',
    spheres:['spiritual','trust'], effect:'boost', power:1,
    advice:'Структура возвращается. Завершите незаконченные дела в сфере обязательств.' },
  { date:'2026-02-13', planet:'saturn', type:'ingress', sign:'aries',
    title:'Сатурн входит в Овен',
    spheres:['career','partnership','business'], effect:'neutral', power:2,
    advice:'Новый цикл ответственности и строительства. Время создавать серьёзные структуры.' },

  // ── ECLIPSES ───────────────────────────────────────────────────────────────
  { date:'2025-03-14', planet:'moon', type:'eclipse', sign:'virgo',
    title:'Полное Лунное затмение в Деве',
    spheres:['communication','business','health'], effect:'challenge', power:3,
    advice:'Мощный сдвиг — завершение важных глав. Всё, что не работает, выходит на поверхность.',
    avoid:'Избегайте принятия импульсивных решений в следующие 2 недели' },
  { date:'2025-03-29', planet:'sun', type:'eclipse', sign:'aries',
    title:'Солнечное затмение в Овне',
    spheres:['career','romance','partnership'], effect:'boost', power:3,
    advice:'Мощное новое начало. Посейте семена важных совместных решений — они дадут большие плоды.' },
  { date:'2025-09-07', planet:'moon', type:'eclipse', sign:'pisces',
    title:'Лунное затмение в Рыбах',
    spheres:['spiritual','romance','family'], effect:'challenge', power:2,
    advice:'Эмоциональное завершение. Отпустите то, что больше не служит вашим отношениям.' },
  { date:'2025-09-21', planet:'sun', type:'eclipse', sign:'virgo',
    title:'Солнечное затмение в Деве',
    spheres:['business','communication','health'], effect:'boost', power:3,
    advice:'Новый практический цикл. Начните совместные проекты по улучшению качества жизни.' },
  { date:'2026-03-03', planet:'moon', type:'eclipse', sign:'virgo',
    title:'Лунное затмение в Деве',
    spheres:['business','communication'], effect:'challenge', power:2,
    advice:'Завершение деловых и практических циклов. Что не работает — пришло время признать это.' },
  { date:'2026-03-17', planet:'sun', type:'eclipse', sign:'pisces',
    title:'Полное Солнечное затмение в Рыбах',
    spheres:['spiritual','romance','family'], effect:'boost', power:3,
    advice:'Трансформирующий сдвиг — редкая возможность для глубокого обновления в паре.' },
  { date:'2026-08-28', planet:'moon', type:'eclipse', sign:'pisces',
    title:'Лунное затмение в Рыбах',
    spheres:['spiritual','romance'], effect:'challenge', power:2,
    advice:'Завершение духовного цикла. Что стало иллюзией — становится ясным.' },
  { date:'2026-09-12', planet:'sun', type:'eclipse', sign:'virgo',
    title:'Кольцеобразное Солнечное затмение в Деве',
    spheres:['business','communication','health'], effect:'boost', power:2,
    advice:'Новый практический цикл с фокусом на здоровье, работе и ежедневных ритуалах.' },

  // ── KEY ASPECTS ────────────────────────────────────────────────────────────
  { date:'2025-05-14', planet:'venus', type:'aspect', sign:'aries',
    title:'Венера соединение Сатурн (обязательство)',
    spheres:['finances','trust','partnership'], effect:'neutral', power:2,
    advice:'Прекрасный момент для серьёзных обязательств и финансовых договорённостей.' },
  { date:'2025-07-01', planet:'jupiter', type:'aspect', sign:'cancer',
    title:'Юпитер трин Сатурн (рост + структура)',
    spheres:['business','finances','family'], effect:'boost', power:3,
    advice:'Один из лучших аспектов года для деловых и финансовых решений в паре. Действуйте!' },
  { date:'2026-01-15', planet:'venus', type:'aspect', sign:'pisces',
    title:'Венера соединение Нептун в Рыбах',
    spheres:['romance','spiritual'], effect:'boost', power:2,
    advice:'Пик романтической мечтательности и духовной близости. Идеален для признаний и особых моментов.' },
];

// ──────────────────────────────────────────────────────────────────────────────
// FORECAST ENGINE
// ──────────────────────────────────────────────────────────────────────────────

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isInRange(eventDate: string, eventEnd: string | undefined, start: string, end: string): boolean {
  const ed = eventEnd ?? eventDate;
  return eventDate <= end && ed >= start;
}

function fortnightLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  const s = start.toLocaleDateString('ru-RU', opts);
  const e = end.toLocaleDateString('ru-RU', opts);
  const y = start.getFullYear();
  return `${s} — ${e} ${y}`;
}

function scoreFortnight(events: PlanetaryEvent[], moons: MoonPhaseEvent[]): number {
  let score = 55;
  for (const ev of events) {
    if (ev.effect === 'boost')     score += ev.power * 8;
    if (ev.effect === 'challenge') score -= ev.power * 5;
    if (ev.effect === 'warning')   score -= ev.power * 6;
  }
  for (const m of moons) {
    if (m.type === 'new')  score += 5;
    if (m.type === 'full') score += 3;
  }
  return Math.max(10, Math.min(95, Math.round(score)));
}

function energyLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Мощный подъём',        color: 'text-green-400' };
  if (score >= 65) return { label: 'Благоприятно',         color: 'text-lime-400'  };
  if (score >= 50) return { label: 'Умеренно активно',     color: 'text-yellow-400' };
  if (score >= 35) return { label: 'Осторожно',            color: 'text-orange-400' };
  return               { label: 'Требует внимания',     color: 'text-red-400'   };
}

function getActiveSpheres(events: PlanetaryEvent[], moons: MoonPhaseEvent[], boost = true): string[] {
  const m = new Map<string, number>();
  for (const ev of events) {
    if (boost ? ev.effect === 'boost' || ev.effect === 'neutral' : ev.effect === 'warning' || ev.effect === 'challenge') {
      for (const s of ev.spheres) m.set(s, (m.get(s) ?? 0) + ev.power);
    }
  }
  for (const mn of moons) {
    for (const s of mn.spheres) m.set(s, (m.get(s) ?? 0) + 1);
  }
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
}

function buildMainAdvice(events: PlanetaryEvent[], moons: MoonPhaseEvent[], score: number): string {
  // Pick most powerful event
  const sorted = [...events].sort((a, b) => b.power - a.power);
  const top = sorted[0];
  if (!top) {
    if (score > 60) return 'Спокойный период с умеренной энергией. Поддерживайте ежедневные ритуалы близости.';
    return 'Период без ярких транзитов. Фокус на стабильности и внутренней работе.';
  }
  let base = top.advice;
  // Add moon context
  const newMoon = moons.find(m => m.type === 'new');
  const fullMoon = moons.find(m => m.type === 'full');
  if (newMoon) base += ` ${newMoon.title} усиливает сферу ${newMoon.spheres[0]}.`;
  else if (fullMoon) base += ` ${fullMoon.title} — момент для кульминации и завершений.`;
  return base;
}

function findBestDate(events: PlanetaryEvent[], moons: MoonPhaseEvent[]): { date: string; action: string } | null {
  // Prefer boost events over moons
  const boost = events.filter(e => e.effect === 'boost').sort((a, b) => b.power - a.power)[0];
  if (boost) return { date: boost.date, action: boost.advice };
  const newMoon = moons.find(m => m.type === 'new');
  if (newMoon) return { date: newMoon.date, action: newMoon.ritual };
  const fullMoon = moons.find(m => m.type === 'full');
  if (fullMoon) return { date: fullMoon.date, action: fullMoon.ritual };
  return null;
}

function findCautionDate(events: PlanetaryEvent[]): { date: string; reason: string } | null {
  const warn = events.filter(e => e.effect === 'warning' || e.effect === 'challenge')
    .sort((a, b) => b.power - a.power)[0];
  if (!warn) return null;
  return { date: warn.date, reason: warn.avoid ?? warn.advice };
}

export function generateForecast(
  startStr: string,
  endStr: string,
  sphereScores: SphereScore[],
): RelationshipForecast {
  const start = parseDate(startStr);
  const end   = parseDate(endStr);

  // Split period into fortnights (~14-day blocks)
  const fortnights: FortnightBlock[] = [];
  let cur = new Date(start);
  while (cur < end) {
    const fEnd = new Date(Math.min(addDays(cur, 13).getTime(), end.getTime()));
    const fStartStr = dateStr(cur);
    const fEndStr   = dateStr(fEnd);

    const keyEvents = PLANETARY_EVENTS.filter(e =>
      isInRange(e.date, e.end, fStartStr, fEndStr)
    );
    const moonPhases = MOON_PHASES.filter(m =>
      m.date >= fStartStr && m.date <= fEndStr
    );

    const score = scoreFortnight(keyEvents, moonPhases);
    const { label: eLabel, color: eColor } = energyLabel(score);
    const activeSpheres   = getActiveSpheres(keyEvents, moonPhases, true);
    const challengeSpheres = getActiveSpheres(keyEvents, moonPhases, false);
    const mainAdvice = buildMainAdvice(keyEvents, moonPhases, score);
    const best = findBestDate(keyEvents, moonPhases);
    const caution = findCautionDate(keyEvents);

    fortnights.push({
      start: fStartStr,
      end:   fEndStr,
      label: fortnightLabel(cur, fEnd),
      energyScore: score,
      energyLabel: eLabel,
      energyColor: eColor,
      keyEvents,
      moonPhases,
      activeSpheres,
      challengeSpheres,
      mainAdvice,
      bestDate: best?.date,
      bestDateAction: best?.action,
      cautionDate: caution?.date,
      cautionReason: caution?.reason,
    });

    cur = addDays(fEnd, 1);
  }

  // Overall period score
  const overallScore = fortnights.length
    ? Math.round(fortnights.reduce((s, f) => s + f.energyScore, 0) / fortnights.length)
    : 50;

  // Sphere forecasts — per sphere, find best/worst months
  const sphereForecasts: SphereForecast[] = sphereScores.map(ss => {
    const sid = ss.sphere.id;

    // Best dates: events that boost this sphere
    const bestDates: SphereDateRec[] = PLANETARY_EVENTS
      .filter(e => e.effect === 'boost' && e.spheres.includes(sid) &&
        e.date >= startStr && e.date <= endStr)
      .sort((a, b) => b.power - a.power)
      .slice(0, 3)
      .map(e => ({ date: e.date, endDate: e.end, action: e.advice, power: e.power }));

    // Also add relevant moon phases
    MOON_PHASES
      .filter(m => m.spheres.includes(sid) && m.date >= startStr && m.date <= endStr)
      .slice(0, 2)
      .forEach(m => bestDates.push({ date: m.date, action: m.ritual, power: 1 }));

    bestDates.sort((a, b) => b.power - a.power);

    // Caution dates: events that warn/challenge this sphere
    const cautionDates: SphereDateRec[] = PLANETARY_EVENTS
      .filter(e => (e.effect === 'warning' || e.effect === 'challenge') &&
        e.spheres.includes(sid) && e.date >= startStr && e.date <= endStr)
      .sort((a, b) => b.power - a.power)
      .slice(0, 2)
      .map(e => ({ date: e.date, endDate: e.end, action: e.avoid ?? e.advice, power: e.power }));

    // Monthly summaries — group by month
    const months = new Map<string, { boosts: PlanetaryEvent[]; warns: PlanetaryEvent[] }>();
    PLANETARY_EVENTS
      .filter(e => e.spheres.includes(sid) && e.date >= startStr && e.date <= endStr)
      .forEach(e => {
        const mk = e.date.substring(0, 7);
        if (!months.has(mk)) months.set(mk, { boosts: [], warns: [] });
        if (e.effect === 'boost' || e.effect === 'neutral') months.get(mk)!.boosts.push(e);
        else months.get(mk)!.warns.push(e);
      });

    const monthSummaries = Array.from(months.entries()).map(([mk, v]) => {
      const [yr, mo] = mk.split('-');
      const monthName = new Date(Number(yr), Number(mo) - 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
      const hasBoost = v.boosts.length > 0;
      const hasWarn  = v.warns.length > 0;
      const energy: 'high' | 'mid' | 'low' = hasBoost && !hasWarn ? 'high' : hasWarn && !hasBoost ? 'low' : 'mid';
      const topBoost = v.boosts.sort((a, b) => b.power - a.power)[0];
      const topWarn  = v.warns.sort((a, b) => b.power - a.power)[0];
      const advice = hasBoost ? topBoost.advice : (topWarn ? topWarn.advice : 'Умеренная активность.');
      const action = hasBoost ? topBoost.advice : (ss.score < 45 ? ss.sphere.lowActions[0] : ss.sphere.midActions[0] ?? '');
      return { month: monthName, advice, action, energy };
    });

    return { sphereId: sid, bestDates, cautionDates, monthSummaries };
  });

  // Top dates — most powerful boost events in period
  const topDates: TopDate[] = PLANETARY_EVENTS
    .filter(e => e.effect === 'boost' && e.date >= startStr && e.date <= endStr)
    .sort((a, b) => b.power - a.power)
    .slice(0, 8)
    .map(e => ({
      date: e.date,
      spheres: e.spheres,
      action: e.advice,
      power: e.power,
      eventTitle: e.title,
    }));

  // Warning dates
  const warningDates = PLANETARY_EVENTS
    .filter(e => (e.effect === 'warning' || e.effect === 'challenge') &&
      e.date >= startStr && e.date <= endStr)
    .sort((a, b) => b.power - a.power)
    .map(e => ({ date: e.date, end: e.end, reason: e.title, avoid: e.avoid ?? '' }));

  // Period label
  const s = parseDate(startStr).toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' });
  const en = parseDate(endStr).toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' });
  const periodLabel = `${s} — ${en}`;

  // Overall summary
  const summaries = [
    overallScore >= 75 ? 'Период насыщен благоприятными транзитами — хорошее время для активных шагов в отношениях, важных решений и совместных начинаний.' : '',
    overallScore >= 55 && overallScore < 75 ? 'Смешанный период: есть сильные возможности, но и зоны напряжения. Используйте благоприятные окна и будьте осторожны в сложные периоды.' : '',
    overallScore < 55 ? 'Период требует осознанности — больше ретроградных и напряжённых транзитов. Фокус на внутренней работе, терпении и поддержке друг друга.' : '',
  ].filter(Boolean)[0] ?? '';

  return {
    periodLabel,
    overallScore,
    overallSummary: summaries,
    fortnights,
    sphereForecasts,
    topDates,
    warningDates,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS FOR UI
// ──────────────────────────────────────────────────────────────────────────────

export function formatEventDate(dateStr: string, endStr?: string): string {
  const d = parseDate(dateStr);
  const start = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  if (!endStr) return start;
  const e = parseDate(endStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  return `${start} — ${e}`;
}

export function getSphereIcon(sphereId: string): string {
  const SPHERE_ICONS: Record<string, string> = {
    romance:'💕', sex:'🔥', family:'🏡', children:'👶',
    business:'💼', finances:'💰', communication:'💬', travel:'✈️',
    hobbies:'🎨', trust:'🤝', spiritual:'🌟', career:'🚀', partnership:'⚖️',
  };
  return SPHERE_ICONS[sphereId] ?? '🔮';
}

export function getSphereRuName(sphereId: string): string {
  const NAMES: Record<string, string> = {
    romance:'Романтика', sex:'Секс', family:'Семья', children:'Дети',
    business:'Бизнес', finances:'Финансы', communication:'Коммуникация', travel:'Путешествия',
    hobbies:'Хобби', trust:'Доверие', spiritual:'Духовность', career:'Карьера', partnership:'Партнёрство',
  };
  return NAMES[sphereId] ?? sphereId;
}

export function getForecastScoreBarColor(score: number): string {
  if (score >= 75) return 'bg-green-500';
  if (score >= 60) return 'bg-lime-500';
  if (score >= 45) return 'bg-yellow-500';
  if (score >= 30) return 'bg-orange-500';
  return 'bg-red-500';
}

// ──────────────────────────────────────────────────────────────────────────────
// SPHERE COLORS (for charts)
// ──────────────────────────────────────────────────────────────────────────────

export const SPHERE_COLORS: Record<string, string> = {
  romance:       '#f43f5e',
  sex:           '#f97316',
  family:        '#f59e0b',
  children:      '#84cc16',
  business:      '#3b82f6',
  finances:      '#10b981',
  communication: '#0ea5e9',
  travel:        '#06b6d4',
  hobbies:       '#a855f7',
  trust:         '#94a3b8',
  spiritual:     '#7c3aed',
  career:        '#ef4444',
  partnership:   '#6366f1',
};

// ──────────────────────────────────────────────────────────────────────────────
// MOON ASTRONOMY  (no external deps — pure arithmetic)
// ──────────────────────────────────────────────────────────────────────────────

// Reference: New Moon  2025-01-29  Moon lon ≈ 310.5°
const MOON_REF_DATE     = new Date(2025, 0, 29);   // Jan 29 2025
const MOON_REF_LON      = 310.5;
const MOON_DAILY_MOTION = 13.176;  // °/day
const SYNODIC_MONTH     = 29.530589;

const SIGN_NAMES_EN = [
  'aries','taurus','gemini','cancer','leo','virgo',
  'libra','scorpio','sagittarius','capricorn','aquarius','pisces',
];

function daysSinceRef(d: Date): number {
  return (d.getTime() - MOON_REF_DATE.getTime()) / 86_400_000;
}

function getMoonLon(d: Date): number {
  return ((MOON_REF_LON + daysSinceRef(d) * MOON_DAILY_MOTION) % 360 + 360) % 360;
}

function getMoonSign(d: Date): string {
  return SIGN_NAMES_EN[Math.floor(getMoonLon(d) / 30)];
}

function getMoonPhaseDay(d: Date): number {
  return ((daysSinceRef(d) % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
}

function getMoonPhaseLabel(phaseDay: number): string {
  if (phaseDay < 1.5) return 'Новолуние';
  if (phaseDay < 7)   return 'Растущий серп';
  if (phaseDay < 8.5) return 'Первая четверть';
  if (phaseDay < 14)  return 'Растущая луна';
  if (phaseDay < 16)  return 'Полнолуние';
  if (phaseDay < 22)  return 'Убывающая луна';
  if (phaseDay < 23)  return 'Последняя четверть';
  return 'Убывающий серп';
}

// ──────────────────────────────────────────────────────────────────────────────
// DAILY SCORING ENGINE
// ──────────────────────────────────────────────────────────────────────────────

// Day-of-week bonuses  (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)
const DOW_BONUS: Record<number, Partial<Record<string, number>>> = {
  0: { spiritual:12, hobbies:10, romance:8 },                     // Sun
  1: { family:15, trust:10, children:8 },                         // Mon
  2: { career:12, business:10, partnership:8 },                   // Tue
  3: { communication:15, business:10, travel:8 },                 // Wed
  4: { finances:12, partnership:10, career:8 },                   // Thu
  5: { romance:15, sex:10, hobbies:8 },                           // Fri
  6: { travel:12, hobbies:12, family:10, sex:8 },                 // Sat
};

// Moon sign bonuses
const MOON_SIGN_BONUS: Record<string, Partial<Record<string, number>>> = {
  aries:       { career:15, romance:12, partnership:10 },
  taurus:      { finances:18, sex:12, hobbies:10 },
  gemini:      { communication:18, travel:12, hobbies:10 },
  cancer:      { family:20, children:15, trust:12 },
  leo:         { romance:18, sex:12, children:10, career:8 },
  virgo:       { business:15, communication:12, finances:10 },
  libra:       { romance:15, partnership:18, trust:12 },
  scorpio:     { sex:20, trust:12, spiritual:10, finances:8 },
  sagittarius: { travel:18, spiritual:15, partnership:10 },
  capricorn:   { career:18, business:15, finances:12 },
  aquarius:    { hobbies:15, communication:12, spiritual:10 },
  pisces:      { spiritual:20, romance:15, hobbies:12 },
};

// Moon phase bonuses
function moonPhaseBonus(phaseDay: number): Partial<Record<string, number>> {
  if (phaseDay < 1.5)       return { spiritual:12, romance:8, trust:8 };    // New Moon
  if (phaseDay < 7)         return { romance:8, career:6, hobbies:5 };      // Waxing crescent
  if (phaseDay < 8.5)       return { business:10, career:10, finances:8 };  // First quarter
  if (phaseDay < 14)        return { romance:10, partnership:8, sex:8 };    // Waxing gibbous
  if (phaseDay < 16)        return { romance:18, sex:15, trust:10, spiritual:8 }; // Full Moon
  if (phaseDay < 22)        return { trust:10, family:10, spiritual:8 };    // Waning
  return                           { spiritual:10, trust:8 };               // Waning crescent
}

export interface DailyScore {
  date: string;          // YYYY-MM-DD
  moonSign: string;
  moonPhaseDay: number;
  moonPhaseLabel: string;
  sphereScores: Record<string, number>;   // 0-100 per sphere
  topSpheres: string[];                   // top-3
  moonPhaseIcon: string;
  events: string[];      // event titles active this day
}

export function generateDailyScores(
  startStr: string,
  endStr: string,
  synastryScores: SphereScore[],
): DailyScore[] {
  const results: DailyScore[] = [];

  // Build synastry base per sphere (25-55 range based on synastry score 0-100)
  const synBase: Record<string, number> = {};
  for (const ss of synastryScores) {
    synBase[ss.sphere.id] = 25 + Math.round(ss.score * 0.30);
  }

  const start = parseDate(startStr);
  const end   = parseDate(endStr);

  // Pre-index events by date for fast lookup
  const eventsByDate = new Map<string, PlanetaryEvent[]>();
  for (const ev of PLANETARY_EVENTS) {
    // Expand period events over each day they cover
    const evStart = parseDate(ev.date);
    const evEnd   = ev.end ? parseDate(ev.end) : evStart;
    let d = new Date(evStart);
    while (d <= evEnd) {
      const ds = dateStr(d);
      if (ds >= startStr && ds <= endStr) {
        if (!eventsByDate.has(ds)) eventsByDate.set(ds, []);
        eventsByDate.get(ds)!.push(ev);
      }
      d = addDays(d, 1);
    }
  }

  let cur = new Date(start);
  while (cur <= end) {
    const ds = dateStr(cur);
    const moonSign   = getMoonSign(cur);
    const phaseDay   = getMoonPhaseDay(cur);
    const phaseLabel = getMoonPhaseLabel(phaseDay);
    const dow        = cur.getDay();

    const sphereScores: Record<string, number> = {};

    const dowBonuses   = DOW_BONUS[dow] ?? {};
    const moonSBonuses = MOON_SIGN_BONUS[moonSign] ?? {};
    const moonPBonuses = moonPhaseBonus(phaseDay);

    const activeEvents = eventsByDate.get(ds) ?? [];

    for (const sphereId of Object.keys(SPHERE_COLORS)) {
      let score = synBase[sphereId] ?? 35;

      // Day-of-week bonus
      score += dowBonuses[sphereId] ?? 0;

      // Moon sign bonus
      score += moonSBonuses[sphereId] ?? 0;

      // Moon phase bonus
      score += (moonPBonuses as Record<string, number>)[sphereId] ?? 0;

      // Planetary event bonuses/penalties
      for (const ev of activeEvents) {
        if (ev.spheres.includes(sphereId)) {
          if (ev.effect === 'boost')     score += ev.power * 12;
          if (ev.effect === 'neutral')   score += ev.power * 5;
          if (ev.effect === 'challenge') score -= ev.power * 8;
          if (ev.effect === 'warning')   score -= ev.power * 10;
        }
      }

      sphereScores[sphereId] = Math.max(5, Math.min(98, Math.round(score)));
    }

    // Top spheres for this day
    const topSpheres = Object.entries(sphereScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(e => e[0]);

    // Moon phase icon
    let moonPhaseIcon = '🌑';
    if (phaseDay < 1.5)  moonPhaseIcon = '🌑';
    else if (phaseDay < 7)  moonPhaseIcon = '🌒';
    else if (phaseDay < 8.5) moonPhaseIcon = '🌓';
    else if (phaseDay < 14)  moonPhaseIcon = '🌔';
    else if (phaseDay < 16)  moonPhaseIcon = '🌕';
    else if (phaseDay < 22)  moonPhaseIcon = '🌖';
    else if (phaseDay < 23)  moonPhaseIcon = '🌗';
    else moonPhaseIcon = '🌘';

    results.push({
      date: ds,
      moonSign,
      moonPhaseDay: phaseDay,
      moonPhaseLabel: phaseLabel,
      sphereScores,
      topSpheres,
      moonPhaseIcon,
      events: activeEvents.map(e => e.title),
    });

    cur = addDays(cur, 1);
  }

  return results;
}
