// ─── Interaction + Relocation Forecast Engine — Data Layer ───────────────────

// ── CITIES ────────────────────────────────────────────────────────────────────

export interface CityEntry {
  name: string;
  nameRu: string;
  country: string;
  lat: number;
  lon: number;
  utc: number;
  region: 'cis' | 'europe' | 'asia' | 'mena' | 'americas' | 'oceania';
}

export const CITIES: CityEntry[] = [
  // ─ CIS ─
  { name: 'Moscow',          nameRu: 'Москва',           country: 'RU', lat: 55.7558,  lon:  37.6173,  utc: 3,   region: 'cis' },
  { name: 'Saint Petersburg',nameRu: 'Санкт-Петербург',  country: 'RU', lat: 59.9343,  lon:  30.3351,  utc: 3,   region: 'cis' },
  { name: 'Novosibirsk',     nameRu: 'Новосибирск',      country: 'RU', lat: 54.9885,  lon:  82.9207,  utc: 7,   region: 'cis' },
  { name: 'Krasnodar',       nameRu: 'Краснодар',        country: 'RU', lat: 45.0448,  lon:  38.9762,  utc: 3,   region: 'cis' },
  { name: 'Sochi',           nameRu: 'Сочи',             country: 'RU', lat: 43.6028,  lon:  39.7342,  utc: 3,   region: 'cis' },
  { name: 'Kyiv',            nameRu: 'Киев',             country: 'UA', lat: 50.4501,  lon:  30.5234,  utc: 2,   region: 'cis' },
  { name: 'Tbilisi',         nameRu: 'Тбилиси',          country: 'GE', lat: 41.7151,  lon:  44.8271,  utc: 4,   region: 'cis' },
  { name: 'Batumi',          nameRu: 'Батуми',           country: 'GE', lat: 41.6409,  lon:  41.6361,  utc: 4,   region: 'cis' },
  { name: 'Almaty',          nameRu: 'Алматы',           country: 'KZ', lat: 43.2220,  lon:  76.8512,  utc: 5,   region: 'cis' },
  { name: 'Tashkent',        nameRu: 'Ташкент',          country: 'UZ', lat: 41.2995,  lon:  69.2401,  utc: 5,   region: 'cis' },
  { name: 'Baku',            nameRu: 'Баку',             country: 'AZ', lat: 40.4093,  lon:  49.8671,  utc: 4,   region: 'cis' },
  { name: 'Yerevan',         nameRu: 'Ереван',           country: 'AM', lat: 40.1872,  lon:  44.5152,  utc: 4,   region: 'cis' },
  { name: 'Minsk',           nameRu: 'Минск',            country: 'BY', lat: 53.9045,  lon:  27.5615,  utc: 3,   region: 'cis' },
  // ─ Europe ─
  { name: 'Belgrade',        nameRu: 'Белград',          country: 'RS', lat: 44.7866,  lon:  20.4489,  utc: 1,   region: 'europe' },
  { name: 'Berlin',          nameRu: 'Берлин',           country: 'DE', lat: 52.5200,  lon:  13.4050,  utc: 1,   region: 'europe' },
  { name: 'Vienna',          nameRu: 'Вена',             country: 'AT', lat: 48.2082,  lon:  16.3738,  utc: 1,   region: 'europe' },
  { name: 'Paris',           nameRu: 'Париж',            country: 'FR', lat: 48.8566,  lon:   2.3522,  utc: 1,   region: 'europe' },
  { name: 'Rome',            nameRu: 'Рим',              country: 'IT', lat: 41.9028,  lon:  12.4964,  utc: 1,   region: 'europe' },
  { name: 'Milan',           nameRu: 'Милан',            country: 'IT', lat: 45.4642,  lon:   9.1900,  utc: 1,   region: 'europe' },
  { name: 'Barcelona',       nameRu: 'Барселона',        country: 'ES', lat: 41.3851,  lon:   2.1734,  utc: 1,   region: 'europe' },
  { name: 'Madrid',          nameRu: 'Мадрид',           country: 'ES', lat: 40.4168,  lon:  -3.7038,  utc: 1,   region: 'europe' },
  { name: 'Lisbon',          nameRu: 'Лиссабон',         country: 'PT', lat: 38.7223,  lon:  -9.1393,  utc: 0,   region: 'europe' },
  { name: 'Amsterdam',       nameRu: 'Амстердам',        country: 'NL', lat: 52.3676,  lon:   4.9041,  utc: 1,   region: 'europe' },
  { name: 'Prague',          nameRu: 'Прага',            country: 'CZ', lat: 50.0755,  lon:  14.4378,  utc: 1,   region: 'europe' },
  { name: 'Warsaw',          nameRu: 'Варшава',          country: 'PL', lat: 52.2297,  lon:  21.0122,  utc: 1,   region: 'europe' },
  { name: 'Budapest',        nameRu: 'Будапешт',         country: 'HU', lat: 47.4979,  lon:  19.0402,  utc: 1,   region: 'europe' },
  { name: 'Istanbul',        nameRu: 'Стамбул',          country: 'TR', lat: 41.0082,  lon:  28.9784,  utc: 3,   region: 'europe' },
  { name: 'Antalya',         nameRu: 'Анталья',          country: 'TR', lat: 36.8969,  lon:  30.7133,  utc: 3,   region: 'europe' },
  { name: 'Limassol',        nameRu: 'Лимасол',          country: 'CY', lat: 34.6823,  lon:  33.0464,  utc: 2,   region: 'europe' },
  { name: 'Athens',          nameRu: 'Афины',            country: 'GR', lat: 37.9838,  lon:  23.7275,  utc: 2,   region: 'europe' },
  { name: 'Zurich',          nameRu: 'Цюрих',            country: 'CH', lat: 47.3769,  lon:   8.5417,  utc: 1,   region: 'europe' },
  { name: 'London',          nameRu: 'Лондон',           country: 'GB', lat: 51.5074,  lon:  -0.1278,  utc: 0,   region: 'europe' },
  { name: 'Stockholm',       nameRu: 'Стокгольм',        country: 'SE', lat: 59.3293,  lon:  18.0686,  utc: 1,   region: 'europe' },
  { name: 'Helsinki',        nameRu: 'Хельсинки',        country: 'FI', lat: 60.1699,  lon:  24.9384,  utc: 2,   region: 'europe' },
  { name: 'Tallinn',         nameRu: 'Таллин',           country: 'EE', lat: 59.4370,  lon:  24.7536,  utc: 2,   region: 'europe' },
  { name: 'Riga',            nameRu: 'Рига',             country: 'LV', lat: 56.9496,  lon:  24.1052,  utc: 2,   region: 'europe' },
  // ─ MENA / Asia ─
  { name: 'Dubai',           nameRu: 'Дубай',            country: 'AE', lat: 25.2048,  lon:  55.2708,  utc: 4,   region: 'mena' },
  { name: 'Abu Dhabi',       nameRu: 'Абу-Даби',         country: 'AE', lat: 24.4539,  lon:  54.3773,  utc: 4,   region: 'mena' },
  { name: 'Tel Aviv',        nameRu: 'Тель-Авив',        country: 'IL', lat: 32.0853,  lon:  34.7818,  utc: 2,   region: 'mena' },
  { name: 'Cairo',           nameRu: 'Каир',             country: 'EG', lat: 30.0444,  lon:  31.2357,  utc: 2,   region: 'mena' },
  { name: 'Bangkok',         nameRu: 'Бангкок',          country: 'TH', lat: 13.7563,  lon: 100.5018,  utc: 7,   region: 'asia' },
  { name: 'Bali',            nameRu: 'Бали (Денпасар)',  country: 'ID', lat: -8.3405,  lon: 115.0920,  utc: 8,   region: 'asia' },
  { name: 'Phuket',          nameRu: 'Пхукет',           country: 'TH', lat:  7.8804,  lon:  98.3923,  utc: 7,   region: 'asia' },
  { name: 'Singapore',       nameRu: 'Сингапур',         country: 'SG', lat:  1.3521,  lon: 103.8198,  utc: 8,   region: 'asia' },
  { name: 'Tokyo',           nameRu: 'Токио',            country: 'JP', lat: 35.6762,  lon: 139.6503,  utc: 9,   region: 'asia' },
  { name: 'Mumbai',          nameRu: 'Мумбай',           country: 'IN', lat: 19.0760,  lon:  72.8777,  utc: 5.5, region: 'asia' },
  { name: 'Delhi',           nameRu: 'Дели',             country: 'IN', lat: 28.6139,  lon:  77.2090,  utc: 5.5, region: 'asia' },
  { name: 'Chiang Mai',      nameRu: 'Чиангмай',         country: 'TH', lat: 18.7883,  lon:  98.9853,  utc: 7,   region: 'asia' },
  // ─ Americas ─
  { name: 'New York',        nameRu: 'Нью-Йорк',         country: 'US', lat: 40.7128,  lon: -74.0060,  utc: -5,  region: 'americas' },
  { name: 'Los Angeles',     nameRu: 'Лос-Анджелес',     country: 'US', lat: 34.0522,  lon:-118.2437,  utc: -8,  region: 'americas' },
  { name: 'Miami',           nameRu: 'Майами',           country: 'US', lat: 25.7617,  lon: -80.1918,  utc: -5,  region: 'americas' },
  { name: 'Toronto',         nameRu: 'Торонто',          country: 'CA', lat: 43.6532,  lon: -79.3832,  utc: -5,  region: 'americas' },
  { name: 'Vancouver',       nameRu: 'Ванкувер',         country: 'CA', lat: 49.2827,  lon:-123.1207,  utc: -8,  region: 'americas' },
  { name: 'Buenos Aires',    nameRu: 'Буэнос-Айрес',     country: 'AR', lat:-34.6037,  lon: -58.3816,  utc: -3,  region: 'americas' },
  { name: 'São Paulo',       nameRu: 'Сан-Паулу',        country: 'BR', lat:-23.5505,  lon: -46.6333,  utc: -3,  region: 'americas' },
  // ─ Oceania ─
  { name: 'Sydney',          nameRu: 'Сидней',           country: 'AU', lat:-33.8688,  lon: 151.2093,  utc: 10,  region: 'oceania' },
  { name: 'Melbourne',       nameRu: 'Мельбурн',         country: 'AU', lat:-37.8136,  lon: 144.9631,  utc: 10,  region: 'oceania' },
  { name: 'Cape Town',       nameRu: 'Кейптаун',         country: 'ZA', lat:-33.9249,  lon:  18.4241,  utc: 2,   region: 'oceania' },
];

export const REGION_LABELS: Record<string, string> = {
  cis: 'СНГ и Россия',
  europe: 'Европа и Турция',
  mena: 'Ближний Восток',
  asia: 'Азия и ЮВА',
  americas: 'Америка',
  oceania: 'Океания и Африка',
};

// ── GOALS ─────────────────────────────────────────────────────────────────────

export interface GoalDef {
  id: string;
  label: string;
  icon: string;
  description: string;
  hint: string;
  sphereColor: string;
}

export const GOALS: GoalDef[] = [
  {
    id: 'love',
    label: 'Любовь и отношения',
    icon: '❤️',
    description: 'Романтическое сближение, создание пары, брак',
    hint: 'Активирует 5-й и 7-й дома, Венеру, Луну, Марс',
    sphereColor: '#ec4899',
  },
  {
    id: 'career',
    label: 'Карьера и признание',
    icon: '🏆',
    description: 'Профессиональный рост, статус, публичность',
    hint: 'Активирует 10-й и 1-й дома, Солнце, Сатурн',
    sphereColor: '#3b82f6',
  },
  {
    id: 'money',
    label: 'Финансы и ресурсы',
    icon: '💰',
    description: 'Доход, накопления, инвестиции, материальная стабильность',
    hint: 'Активирует 2-й и 8-й дома, Юпитер, Венеру',
    sphereColor: '#f59e0b',
  },
  {
    id: 'health',
    label: 'Здоровье и восстановление',
    icon: '💚',
    description: 'Физический тонус, лечение, ритм жизни',
    hint: 'Активирует 1-й и 6-й дома, Солнце, Марс',
    sphereColor: '#22c55e',
  },
  {
    id: 'creativity',
    label: 'Творчество и самовыражение',
    icon: '🎨',
    description: 'Творческие проекты, вдохновение, публика',
    hint: 'Активирует 5-й и 3-й дома, Венеру, Нептун',
    sphereColor: '#8b5cf6',
  },
  {
    id: 'spirit',
    label: 'Духовный рост',
    icon: '✨',
    description: 'Внутренняя работа, медитация, смыслы, интуиция',
    hint: 'Активирует 9-й и 12-й дома, Нептун, Юпитер',
    sphereColor: '#6366f1',
  },
  {
    id: 'stability',
    label: 'Стабильность и дом',
    icon: '⚓',
    description: 'Постоянное место жизни, семья, безопасность',
    hint: 'Активирует 4-й и 7-й дома, Луну, Сатурн',
    sphereColor: '#64748b',
  },
  {
    id: 'social',
    label: 'Социальный круг',
    icon: '👥',
    description: 'Новые знакомства, группы, сообщества, связи',
    hint: 'Активирует 11-й и 3-й дома, Меркурий, Юпитер',
    sphereColor: '#06b6d4',
  },
];

// ── PARTNER TYPES ─────────────────────────────────────────────────────────────

export interface PartnerTypeDef {
  id: string;
  label: string;
  icon: string;
  description: string;
  sphereEmphasis: string[]; // which spheres are most impacted
  channelWeight: number;   // 0.5–1.5, how strongly this partner type amplifies channels
}

export const PARTNER_TYPES: PartnerTypeDef[] = [
  {
    id: 'romantic',
    label: 'Романтический партнёр',
    icon: '💕',
    description: 'Влюблённость, пара, отношения, страсть',
    sphereEmphasis: ['love', 'stability', 'creativity'],
    channelWeight: 1.15,
  },
  {
    id: 'spouse',
    label: 'Супруг / близкий',
    icon: '💍',
    description: 'Брак, глубокая привязанность, совместный быт',
    sphereEmphasis: ['stability', 'love', 'money', 'health'],
    channelWeight: 1.2,
  },
  {
    id: 'business',
    label: 'Бизнес-партнёр',
    icon: '🤝',
    description: 'Совместный проект, инвестиции, деловой союз',
    sphereEmphasis: ['career', 'money', 'social'],
    channelWeight: 0.9,
  },
  {
    id: 'friend',
    label: 'Близкий друг',
    icon: '👫',
    description: 'Дружба, поддержка, общий контекст жизни',
    sphereEmphasis: ['social', 'creativity', 'spirit'],
    channelWeight: 0.85,
  },
  {
    id: 'family',
    label: 'Родственник',
    icon: '👨‍👩‍👧',
    description: 'Семейные связи — родители, дети, братья/сёстры',
    sphereEmphasis: ['stability', 'health', 'spirit'],
    channelWeight: 0.9,
  },
  {
    id: 'mentor',
    label: 'Наставник / учитель',
    icon: '🦉',
    description: 'Передача опыта, развитие, авторитет',
    sphereEmphasis: ['career', 'spirit', 'creativity'],
    channelWeight: 0.8,
  },
];

// ── STAY MODES ────────────────────────────────────────────────────────────────

export interface StayMode {
  id: string;
  label: string;
  icon: string;
  days: number;
  description: string;
  effect: string;
}

export const STAY_MODES: StayMode[] = [
  {
    id: 'short',
    label: '1–3 недели',
    icon: '✈️',
    days: 14,
    description: 'Поездка, тест-визит, отпуск',
    effect: 'Активирует внешний слой: знакомства, события, первое впечатление. Натальный потенциал раскрывается лишь частично (~35%).',
  },
  {
    id: 'medium',
    label: '1–6 месяцев',
    icon: '🏡',
    days: 90,
    description: 'Среднесрочный переезд, аренда, проект',
    effect: 'Начинают перестраиваться ритм, связи, рабочая сфера. Потенциал локации раскрывается на ~65–70%.',
  },
  {
    id: 'long',
    label: '6–18 месяцев',
    icon: '🌍',
    days: 240,
    description: 'Долгосрочная аренда, серьёзная релокация',
    effect: 'Карта начинает "жить" в полную силу: отношения, карьера, дом, здоровье. Потенциал ~85–90%.',
  },
  {
    id: 'permanent',
    label: 'Постоянно',
    icon: '⚓',
    days: 365,
    description: 'Покупка жилья, смена ПМЖ',
    effect: 'Полное включение релокационной карты. Все сферы перестраиваются. Потенциал 100%.',
  },
];

// ── SPHERE LABELS ─────────────────────────────────────────────────────────────

export const SPHERE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  love:       { label: 'Любовь',      icon: '❤️', color: '#ec4899' },
  career:     { label: 'Карьера',     icon: '💼', color: '#3b82f6' },
  money:      { label: 'Финансы',     icon: '💰', color: '#f59e0b' },
  health:     { label: 'Здоровье',    icon: '💚', color: '#22c55e' },
  creativity: { label: 'Творчество',  icon: '🎨', color: '#8b5cf6' },
  spirit:     { label: 'Дух',         icon: '✨', color: '#6366f1' },
  stability:  { label: 'Стабильность',icon: '⚓', color: '#64748b' },
};

export const SPHERE_KEYS = Object.keys(SPHERE_LABELS) as Array<keyof typeof SPHERE_LABELS>;

// ── SCORE HELPERS ─────────────────────────────────────────────────────────────

export function scoreColor(score: number, isDark: boolean): string {
  if (score >= 75) return isDark ? 'bg-green-500/25 border-green-500/40 text-green-300' : 'bg-green-100 border-green-300 text-green-700';
  if (score >= 62) return isDark ? 'bg-lime-500/20 border-lime-500/30 text-lime-300'   : 'bg-lime-50 border-lime-300 text-lime-700';
  if (score >= 50) return isDark ? 'bg-yellow-500/15 border-yellow-500/25 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-700';
  if (score >= 38) return isDark ? 'bg-orange-500/15 border-orange-500/25 text-orange-300' : 'bg-orange-50 border-orange-200 text-orange-700';
  return isDark ? 'bg-red-500/15 border-red-500/25 text-red-300' : 'bg-red-50 border-red-200 text-red-700';
}

export function scoreBg(score: number): string {
  if (score >= 75) return '#22c55e';
  if (score >= 62) return '#84cc16';
  if (score >= 50) return '#eab308';
  if (score >= 38) return '#f97316';
  return '#ef4444';
}

export function scoreLabel(score: number): string {
  if (score >= 80) return 'Отлично';
  if (score >= 68) return 'Хорошо';
  if (score >= 55) return 'Умеренно';
  if (score >= 42) return 'Осторожно';
  return 'Сложно';
}

// ── PARTNER TYPE FACTOR MAP ───────────────────────────────────────────────────

export const PARTNER_TYPE_FACTOR: Record<string, number> = {
  romantic: 1.15,
  spouse: 1.2,
  business: 0.9,
  friend: 0.85,
  family: 0.9,
  mentor: 0.8,
};

// ── INTERPRETATIONS ───────────────────────────────────────────────────────────

export const STAY_EFFECT_TEXT: Record<string, string> = {
  short: 'Короткое пребывание активирует внешний контекст: первые встречи, события, эмоциональные триггеры. Место "тестируется", но глубинные темы ещё не раскрылись.',
  medium: 'За 1–6 месяцев начинают перестраиваться реальные сферы: ритм, круг общения, рабочие возможности. Карта показывает около 65% своего потенциала.',
  long: 'Долгосрочная жизнь в новом месте запускает полную перестройку: отношения, карьера, самоощущение. Потенциал карты раскрывается на 85%+.',
  permanent: 'Постоянная локация — это полное включение релокационной карты. Именно здесь жизнь будет разворачиваться по тем сценариям, которые записаны в новых домах.',
};

export const SCENARIO_LABELS: Record<string, { icon: string; label: string; desc: string }> = {
  alone: {
    icon: '🧍',
    label: 'Один',
    desc: 'Как место работает на вас лично, без партнёра',
  },
  with_partner: {
    icon: '👫',
    label: 'С партнёром',
    desc: 'Обе стороны переезжают в эту локацию',
  },
  partner_distance: {
    icon: '📡',
    label: 'Партнёр на расстоянии',
    desc: 'Вы переезжаете, партнёр остаётся в своём городе',
  },
};

export const PARTNER_TYPE_INTERPS: Record<string, { arrive: string; leave: string }> = {
  romantic: {
    arrive: 'Через этого человека в этом месте может прийти: романтическое сближение, страсть, совместный быт, готовность к серьёзному выбору.',
    leave: 'Через него/неё может уйти: одиночество, эмоциональная закрытость, старый сценарий ожиданий.',
  },
  spouse: {
    arrive: 'Через партнёра в этой локации может прийти: глубокая стабильность, совместное обустройство жизни, поддержка.',
    leave: 'Может уйти: независимость привычного уклада, старые личные границы.',
  },
  business: {
    arrive: 'Через этого партнёра в локации может прийти: деловой союз, проект, финансовые возможности, рост статуса.',
    leave: 'Может уйти: застой и профессиональная изоляция.',
  },
  friend: {
    arrive: 'Через эту дружбу в локации может прийти: социальная поддержка, новый круг, творческое взаимодействие.',
    leave: 'Может уйти: ощущение одиночества и оторванности от привычного.',
  },
  family: {
    arrive: 'Через близкого в этом месте может прийти: семейное тепло, ощущение почвы под ногами, поддержка.',
    leave: 'Может уйти: излишняя автономия и дистанция от корней.',
  },
  mentor: {
    arrive: 'Через наставника в этой локации может прийти: рост мастерства, карьерные двери, профессиональная идентичность.',
    leave: 'Может уйти: самосаботаж и профессиональный тупик.',
  },
};

// ── GOAL INTERPRETATIONS ──────────────────────────────────────────────────────

export function getGoalInterpretation(goal: string, score: number, scenario: 'alone' | 'with_partner' | 'partner_distance'): string {
  const level = score >= 70 ? 'high' : score >= 50 ? 'mid' : 'low';
  const key = `${goal}_${scenario}_${level}`;
  const fallbacks: Record<string, string> = {
    'love_alone_high': 'Отличное место для личного магнетизма — вы привлекаете нужных людей. Хорошо для знакомств и первых шагов в отношениях.',
    'love_alone_mid':  'Место нейтральное для романтики — всё зависит от ваших действий и времени.',
    'love_alone_low':  'Место может усиливать изоляцию или старые паттерны. Обратите внимание на 5-й и 7-й дома в релокации.',
    'love_with_partner_high': 'Локация усиливает связь между вами — здесь есть шанс на глубокое сближение, совместные решения, стабилизацию отношений.',
    'love_with_partner_mid':  'Смешанная динамика — место не вредит, но и не является катализатором. Ключевыми будут ваши совместные намерения.',
    'love_with_partner_low':  'Возможно усиление сложных тем в отношениях. Рекомендуется сначала разобраться с незакрытыми вопросами.',
    'love_partner_distance_high': 'Несмотря на расстояние, ваша связь может усилиться — каждая встреча будет ощущаться ярко.',
    'love_partner_distance_mid':  'На расстоянии связь сохраняется, но требует регулярного внимания.',
    'love_partner_distance_low':  'Расстояние и локация вместе создают риск охлаждения — нужна чёткая договорённость о формате.',
    'career_alone_high': 'Место усиливает вашу профессиональную видимость и возможности. Отличный старт для карьерного скачка.',
    'career_with_partner_high': 'Совместный переезд открывает карьерные двери — локация поддерживает вас обоих профессионально.',
    'money_alone_high': 'Финансовый потенциал места высок — здесь легче выстраивать источники дохода и ресурсную базу.',
    'money_with_partner_high': 'Совместные финансовые решения в этой локации могут принести стабильный результат.',
    'health_alone_high': 'Место поддерживает физический тонус и способность к восстановлению.',
    'creativity_alone_high': 'Локация стимулирует творческое самовыражение и вдохновение.',
    'spirit_alone_high': 'Место поддерживает внутреннюю работу, медитацию и духовный рост.',
    'stability_alone_high': 'Хорошее место для долгосрочного обустройства — ощущение почвы.',
    'social_alone_high': 'Место активно для нетворкинга и расширения социального круга.',
  };
  return fallbacks[`${goal}_${scenario}_${level}`]
    ?? fallbacks[`${goal}_alone_${level}`]
    ?? `Потенциал места для сферы "${goal}": ${scoreLabel(score)}.`;
}

export type ScenarioResult = {
  location: string;
  lat: number;
  lon: number;
  distance_km: number;
  asc_shift: number;
  mc_shift: number;
  synastry_percent: number;
  scores: { alone: number; with_partner: number; partner_distance: number };
  sphere_alone: Record<string, number>;
  sphere_with: Record<string, number>;
  sphere_distance: Record<string, number>;
  through_alone: { comes: string[]; leaves: string[] };
  through_with: { comes: string[]; leaves: string[] };
  through_distance: { comes: string[]; leaves: string[] };
  key_planet_activations: Array<{ planet: string; angle: string; orb: number }>;
};

export type CompareResponse = {
  goal: string;
  partner_type: string;
  stay_days: number;
  baseline: ScenarioResult;
  locations: ScenarioResult[];
  all_locations: ScenarioResult[];
  recommendation: string | null;
};
