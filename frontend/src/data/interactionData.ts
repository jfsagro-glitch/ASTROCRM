// ─── Interaction + Relocation Forecast Engine — Data Layer ───────────────────

// ── CITIES ────────────────────────────────────────────────────────────────────

export interface CityEntry {
  name: string;
  nameRu: string;
  country: string;
  lat: number;
  lon: number;
  utc: number;
  region: 'cis' | 'europe' | 'asia' | 'mena' | 'americas' | 'oceania' | 'africa';
}

export const CITIES: CityEntry[] = [
  // ─ CIS / Russia ─
  { name: 'Moscow',           nameRu: 'Москва',              country: 'RU', lat:  55.7558,  lon:  37.6173,  utc:  3,   region: 'cis' },
  { name: 'Saint Petersburg', nameRu: 'Санкт-Петербург',     country: 'RU', lat:  59.9343,  lon:  30.3351,  utc:  3,   region: 'cis' },
  { name: 'Novosibirsk',      nameRu: 'Новосибирск',         country: 'RU', lat:  54.9885,  lon:  82.9207,  utc:  7,   region: 'cis' },
  { name: 'Krasnodar',        nameRu: 'Краснодар',           country: 'RU', lat:  45.0448,  lon:  38.9762,  utc:  3,   region: 'cis' },
  { name: 'Sochi',            nameRu: 'Сочи',                country: 'RU', lat:  43.6028,  lon:  39.7342,  utc:  3,   region: 'cis' },
  { name: 'Ekaterinburg',     nameRu: 'Екатеринбург',        country: 'RU', lat:  56.8389,  lon:  60.6057,  utc:  5,   region: 'cis' },
  { name: 'Kazan',            nameRu: 'Казань',              country: 'RU', lat:  55.7887,  lon:  49.1221,  utc:  3,   region: 'cis' },
  { name: 'Rostov-on-Don',    nameRu: 'Ростов-на-Дону',      country: 'RU', lat:  47.2357,  lon:  39.7015,  utc:  3,   region: 'cis' },
  { name: 'Vladivostok',      nameRu: 'Владивосток',         country: 'RU', lat:  43.1155,  lon: 131.8855,  utc: 10,   region: 'cis' },
  { name: 'Kaliningrad',      nameRu: 'Калининград',         country: 'RU', lat:  54.7104,  lon:  20.4522,  utc:  2,   region: 'cis' },
  { name: 'Ufa',              nameRu: 'Уфа',                 country: 'RU', lat:  54.7388,  lon:  55.9721,  utc:  5,   region: 'cis' },
  { name: 'Samara',           nameRu: 'Самара',              country: 'RU', lat:  53.2038,  lon:  50.1606,  utc:  4,   region: 'cis' },
  { name: 'Kyiv',             nameRu: 'Киев',                country: 'UA', lat:  50.4501,  lon:  30.5234,  utc:  2,   region: 'cis' },
  { name: 'Odessa',           nameRu: 'Одесса',              country: 'UA', lat:  46.4825,  lon:  30.7233,  utc:  2,   region: 'cis' },
  { name: 'Lviv',             nameRu: 'Львов',               country: 'UA', lat:  49.8397,  lon:  24.0297,  utc:  2,   region: 'cis' },
  { name: 'Tbilisi',          nameRu: 'Тбилиси',             country: 'GE', lat:  41.7151,  lon:  44.8271,  utc:  4,   region: 'cis' },
  { name: 'Batumi',           nameRu: 'Батуми',              country: 'GE', lat:  41.6409,  lon:  41.6361,  utc:  4,   region: 'cis' },
  { name: 'Kutaisi',          nameRu: 'Кутаиси',             country: 'GE', lat:  42.2679,  lon:  42.6955,  utc:  4,   region: 'cis' },
  { name: 'Almaty',           nameRu: 'Алматы',              country: 'KZ', lat:  43.2220,  lon:  76.8512,  utc:  5,   region: 'cis' },
  { name: 'Astana',           nameRu: 'Астана',              country: 'KZ', lat:  51.1801,  lon:  71.4460,  utc:  5,   region: 'cis' },
  { name: 'Tashkent',         nameRu: 'Ташкент',             country: 'UZ', lat:  41.2995,  lon:  69.2401,  utc:  5,   region: 'cis' },
  { name: 'Samarkand',        nameRu: 'Самарканд',           country: 'UZ', lat:  39.6542,  lon:  66.9597,  utc:  5,   region: 'cis' },
  { name: 'Baku',             nameRu: 'Баку',                country: 'AZ', lat:  40.4093,  lon:  49.8671,  utc:  4,   region: 'cis' },
  { name: 'Yerevan',          nameRu: 'Ереван',              country: 'AM', lat:  40.1872,  lon:  44.5152,  utc:  4,   region: 'cis' },
  { name: 'Minsk',            nameRu: 'Минск',               country: 'BY', lat:  53.9045,  lon:  27.5615,  utc:  3,   region: 'cis' },
  { name: 'Bishkek',          nameRu: 'Бишкек',              country: 'KG', lat:  42.8746,  lon:  74.5698,  utc:  6,   region: 'cis' },
  { name: 'Dushanbe',         nameRu: 'Душанбе',             country: 'TJ', lat:  38.5598,  lon:  68.7870,  utc:  5,   region: 'cis' },
  { name: 'Ashgabat',         nameRu: 'Ашхабад',             country: 'TM', lat:  37.9601,  lon:  58.3261,  utc:  5,   region: 'cis' },
  { name: 'Chisinau',         nameRu: 'Кишинёв',             country: 'MD', lat:  47.0105,  lon:  28.8638,  utc:  2,   region: 'cis' },

  // ─ Western Europe ─
  { name: 'London',           nameRu: 'Лондон',              country: 'GB', lat:  51.5074,  lon:  -0.1278,  utc:  0,   region: 'europe' },
  { name: 'Paris',            nameRu: 'Париж',               country: 'FR', lat:  48.8566,  lon:   2.3522,  utc:  1,   region: 'europe' },
  { name: 'Berlin',           nameRu: 'Берлин',              country: 'DE', lat:  52.5200,  lon:  13.4050,  utc:  1,   region: 'europe' },
  { name: 'Munich',           nameRu: 'Мюнхен',              country: 'DE', lat:  48.1351,  lon:  11.5820,  utc:  1,   region: 'europe' },
  { name: 'Hamburg',          nameRu: 'Гамбург',             country: 'DE', lat:  53.5753,  lon:   9.9929,  utc:  1,   region: 'europe' },
  { name: 'Frankfurt',        nameRu: 'Франкфурт',           country: 'DE', lat:  50.1109,  lon:   8.6821,  utc:  1,   region: 'europe' },
  { name: 'Amsterdam',        nameRu: 'Амстердам',           country: 'NL', lat:  52.3676,  lon:   4.9041,  utc:  1,   region: 'europe' },
  { name: 'Brussels',         nameRu: 'Брюссель',            country: 'BE', lat:  50.8503,  lon:   4.3517,  utc:  1,   region: 'europe' },
  { name: 'Vienna',           nameRu: 'Вена',                country: 'AT', lat:  48.2082,  lon:  16.3738,  utc:  1,   region: 'europe' },
  { name: 'Zurich',           nameRu: 'Цюрих',               country: 'CH', lat:  47.3769,  lon:   8.5417,  utc:  1,   region: 'europe' },
  { name: 'Geneva',           nameRu: 'Женева',              country: 'CH', lat:  46.2044,  lon:   6.1432,  utc:  1,   region: 'europe' },
  { name: 'Lisbon',           nameRu: 'Лиссабон',            country: 'PT', lat:  38.7223,  lon:  -9.1393,  utc:  0,   region: 'europe' },
  { name: 'Porto',            nameRu: 'Порту',               country: 'PT', lat:  41.1579,  lon:  -8.6291,  utc:  0,   region: 'europe' },
  { name: 'Madrid',           nameRu: 'Мадрид',              country: 'ES', lat:  40.4168,  lon:  -3.7038,  utc:  1,   region: 'europe' },
  { name: 'Barcelona',        nameRu: 'Барселона',           country: 'ES', lat:  41.3851,  lon:   2.1734,  utc:  1,   region: 'europe' },
  { name: 'Valencia',         nameRu: 'Валенсия',            country: 'ES', lat:  39.4699,  lon:  -0.3763,  utc:  1,   region: 'europe' },
  { name: 'Malaga',           nameRu: 'Малага',              country: 'ES', lat:  36.7213,  lon:  -4.4214,  utc:  1,   region: 'europe' },
  { name: 'Rome',             nameRu: 'Рим',                 country: 'IT', lat:  41.9028,  lon:  12.4964,  utc:  1,   region: 'europe' },
  { name: 'Milan',            nameRu: 'Милан',               country: 'IT', lat:  45.4642,  lon:   9.1900,  utc:  1,   region: 'europe' },
  { name: 'Florence',         nameRu: 'Флоренция',           country: 'IT', lat:  43.7696,  lon:  11.2558,  utc:  1,   region: 'europe' },
  { name: 'Venice',           nameRu: 'Венеция',             country: 'IT', lat:  45.4408,  lon:  12.3155,  utc:  1,   region: 'europe' },
  { name: 'Naples',           nameRu: 'Неаполь',             country: 'IT', lat:  40.8518,  lon:  14.2681,  utc:  1,   region: 'europe' },
  { name: 'Athens',           nameRu: 'Афины',               country: 'GR', lat:  37.9838,  lon:  23.7275,  utc:  2,   region: 'europe' },
  { name: 'Thessaloniki',     nameRu: 'Салоники',            country: 'GR', lat:  40.6401,  lon:  22.9444,  utc:  2,   region: 'europe' },
  { name: 'Stockholm',        nameRu: 'Стокгольм',           country: 'SE', lat:  59.3293,  lon:  18.0686,  utc:  1,   region: 'europe' },
  { name: 'Oslo',             nameRu: 'Осло',                country: 'NO', lat:  59.9139,  lon:  10.7522,  utc:  1,   region: 'europe' },
  { name: 'Copenhagen',       nameRu: 'Копенгаген',          country: 'DK', lat:  55.6761,  lon:  12.5683,  utc:  1,   region: 'europe' },
  { name: 'Helsinki',         nameRu: 'Хельсинки',           country: 'FI', lat:  60.1699,  lon:  24.9384,  utc:  2,   region: 'europe' },
  { name: 'Dublin',           nameRu: 'Дублин',              country: 'IE', lat:  53.3498,  lon:  -6.2603,  utc:  0,   region: 'europe' },
  { name: 'Edinburgh',        nameRu: 'Эдинбург',            country: 'GB', lat:  55.9533,  lon:  -3.1883,  utc:  0,   region: 'europe' },

  // ─ Central & Eastern Europe ─
  { name: 'Prague',           nameRu: 'Прага',               country: 'CZ', lat:  50.0755,  lon:  14.4378,  utc:  1,   region: 'europe' },
  { name: 'Warsaw',           nameRu: 'Варшава',             country: 'PL', lat:  52.2297,  lon:  21.0122,  utc:  1,   region: 'europe' },
  { name: 'Krakow',           nameRu: 'Краков',              country: 'PL', lat:  50.0647,  lon:  19.9450,  utc:  1,   region: 'europe' },
  { name: 'Budapest',         nameRu: 'Будапешт',            country: 'HU', lat:  47.4979,  lon:  19.0402,  utc:  1,   region: 'europe' },
  { name: 'Bratislava',       nameRu: 'Братислава',          country: 'SK', lat:  48.1486,  lon:  17.1077,  utc:  1,   region: 'europe' },
  { name: 'Ljubljana',        nameRu: 'Любляна',             country: 'SI', lat:  46.0569,  lon:  14.5058,  utc:  1,   region: 'europe' },
  { name: 'Zagreb',           nameRu: 'Загреб',              country: 'HR', lat:  45.8150,  lon:  15.9819,  utc:  1,   region: 'europe' },
  { name: 'Split',            nameRu: 'Сплит',               country: 'HR', lat:  43.5081,  lon:  16.4402,  utc:  1,   region: 'europe' },
  { name: 'Dubrovnik',        nameRu: 'Дубровник',           country: 'HR', lat:  42.6507,  lon:  18.0944,  utc:  1,   region: 'europe' },
  { name: 'Belgrade',         nameRu: 'Белград',             country: 'RS', lat:  44.7866,  lon:  20.4489,  utc:  1,   region: 'europe' },
  { name: 'Novi Sad',         nameRu: 'Нови-Сад',            country: 'RS', lat:  45.2671,  lon:  19.8335,  utc:  1,   region: 'europe' },
  { name: 'Sofia',            nameRu: 'София',               country: 'BG', lat:  42.6977,  lon:  23.3219,  utc:  2,   region: 'europe' },
  { name: 'Bucharest',        nameRu: 'Бухарест',            country: 'RO', lat:  44.4268,  lon:  26.1025,  utc:  2,   region: 'europe' },
  { name: 'Riga',             nameRu: 'Рига',                country: 'LV', lat:  56.9496,  lon:  24.1052,  utc:  2,   region: 'europe' },
  { name: 'Tallinn',          nameRu: 'Таллин',              country: 'EE', lat:  59.4370,  lon:  24.7536,  utc:  2,   region: 'europe' },
  { name: 'Vilnius',          nameRu: 'Вильнюс',             country: 'LT', lat:  54.6872,  lon:  25.2797,  utc:  2,   region: 'europe' },
  { name: 'Podgorica',        nameRu: 'Подгорица',           country: 'ME', lat:  42.4304,  lon:  19.2594,  utc:  1,   region: 'europe' },
  { name: 'Tivat',            nameRu: 'Тиват',               country: 'ME', lat:  42.4349,  lon:  18.6966,  utc:  1,   region: 'europe' },
  { name: 'Skopje',           nameRu: 'Скопье',              country: 'MK', lat:  41.9965,  lon:  21.4314,  utc:  1,   region: 'europe' },
  { name: 'Tirana',           nameRu: 'Тирана',              country: 'AL', lat:  41.3275,  lon:  19.8187,  utc:  1,   region: 'europe' },
  { name: 'Nicosia',          nameRu: 'Никосия',             country: 'CY', lat:  35.1856,  lon:  33.3823,  utc:  2,   region: 'europe' },
  { name: 'Limassol',         nameRu: 'Лимасол',             country: 'CY', lat:  34.6823,  lon:  33.0464,  utc:  2,   region: 'europe' },
  { name: 'Paphos',           nameRu: 'Пафос',               country: 'CY', lat:  34.7755,  lon:  32.4241,  utc:  2,   region: 'europe' },
  { name: 'Valletta',         nameRu: 'Валлетта',            country: 'MT', lat:  35.8997,  lon:  14.5147,  utc:  1,   region: 'europe' },
  { name: 'Luxembourg',       nameRu: 'Люксембург',          country: 'LU', lat:  49.6116,  lon:   6.1319,  utc:  1,   region: 'europe' },
  { name: 'Reykjavik',        nameRu: 'Рейкьявик',           country: 'IS', lat:  64.1355,  lon: -21.8954,  utc:  0,   region: 'europe' },

  // ─ Turkey ─
  { name: 'Istanbul',         nameRu: 'Стамбул',             country: 'TR', lat:  41.0082,  lon:  28.9784,  utc:  3,   region: 'europe' },
  { name: 'Ankara',           nameRu: 'Анкара',              country: 'TR', lat:  39.9334,  lon:  32.8597,  utc:  3,   region: 'europe' },
  { name: 'Antalya',          nameRu: 'Анталья',             country: 'TR', lat:  36.8969,  lon:  30.7133,  utc:  3,   region: 'europe' },
  { name: 'Izmir',            nameRu: 'Измир',               country: 'TR', lat:  38.4237,  lon:  27.1428,  utc:  3,   region: 'europe' },
  { name: 'Bodrum',           nameRu: 'Бодрум',              country: 'TR', lat:  37.0344,  lon:  27.4305,  utc:  3,   region: 'europe' },
  { name: 'Alanya',           nameRu: 'Аланья',              country: 'TR', lat:  36.5435,  lon:  32.0059,  utc:  3,   region: 'europe' },

  // ─ Middle East & North Africa ─
  { name: 'Dubai',            nameRu: 'Дубай',               country: 'AE', lat:  25.2048,  lon:  55.2708,  utc:  4,   region: 'mena' },
  { name: 'Abu Dhabi',        nameRu: 'Абу-Даби',            country: 'AE', lat:  24.4539,  lon:  54.3773,  utc:  4,   region: 'mena' },
  { name: 'Sharjah',          nameRu: 'Шарджа',              country: 'AE', lat:  25.3462,  lon:  55.4209,  utc:  4,   region: 'mena' },
  { name: 'Tel Aviv',         nameRu: 'Тель-Авив',           country: 'IL', lat:  32.0853,  lon:  34.7818,  utc:  2,   region: 'mena' },
  { name: 'Jerusalem',        nameRu: 'Иерусалим',           country: 'IL', lat:  31.7683,  lon:  35.2137,  utc:  2,   region: 'mena' },
  { name: 'Haifa',            nameRu: 'Хайфа',               country: 'IL', lat:  32.7940,  lon:  34.9896,  utc:  2,   region: 'mena' },
  { name: 'Riyadh',           nameRu: 'Эр-Рияд',             country: 'SA', lat:  24.6877,  lon:  46.7219,  utc:  3,   region: 'mena' },
  { name: 'Jeddah',           nameRu: 'Джидда',              country: 'SA', lat:  21.4858,  lon:  39.1925,  utc:  3,   region: 'mena' },
  { name: 'Doha',             nameRu: 'Доха',                country: 'QA', lat:  25.2854,  lon:  51.5310,  utc:  3,   region: 'mena' },
  { name: 'Kuwait City',      nameRu: 'Кувейт',              country: 'KW', lat:  29.3759,  lon:  47.9774,  utc:  3,   region: 'mena' },
  { name: 'Manama',           nameRu: 'Манама',              country: 'BH', lat:  26.2235,  lon:  50.5876,  utc:  3,   region: 'mena' },
  { name: 'Muscat',           nameRu: 'Маскат',              country: 'OM', lat:  23.6100,  lon:  58.5922,  utc:  4,   region: 'mena' },
  { name: 'Beirut',           nameRu: 'Бейрут',              country: 'LB', lat:  33.8938,  lon:  35.5018,  utc:  2,   region: 'mena' },
  { name: 'Amman',            nameRu: 'Амман',               country: 'JO', lat:  31.9539,  lon:  35.9106,  utc:  2,   region: 'mena' },
  { name: 'Cairo',            nameRu: 'Каир',                country: 'EG', lat:  30.0444,  lon:  31.2357,  utc:  2,   region: 'mena' },
  { name: 'Alexandria',       nameRu: 'Александрия',         country: 'EG', lat:  31.2001,  lon:  29.9187,  utc:  2,   region: 'mena' },
  { name: 'Casablanca',       nameRu: 'Касабланка',          country: 'MA', lat:  33.5731,  lon:  -7.5898,  utc:  1,   region: 'mena' },
  { name: 'Marrakech',        nameRu: 'Марракеш',            country: 'MA', lat:  31.6295,  lon:  -7.9811,  utc:  1,   region: 'mena' },
  { name: 'Tunis',            nameRu: 'Тунис',               country: 'TN', lat:  36.8065,  lon:  10.1815,  utc:  1,   region: 'mena' },
  { name: 'Algiers',          nameRu: 'Алжир',               country: 'DZ', lat:  36.7372,  lon:   3.0865,  utc:  1,   region: 'mena' },
  { name: 'Tripoli',          nameRu: 'Триполи',             country: 'LY', lat:  32.9022,  lon:  13.1796,  utc:  2,   region: 'mena' },
  { name: 'Tehran',           nameRu: 'Тегеран',             country: 'IR', lat:  35.6892,  lon:  51.3890,  utc:  3.5, region: 'mena' },
  { name: 'Istanbul',         nameRu: 'Стамбул',             country: 'TR', lat:  41.0082,  lon:  28.9784,  utc:  3,   region: 'mena' },

  // ─ South & Southeast Asia ─
  { name: 'Bangkok',          nameRu: 'Бангкок',             country: 'TH', lat:  13.7563,  lon: 100.5018,  utc:  7,   region: 'asia' },
  { name: 'Chiang Mai',       nameRu: 'Чиангмай',            country: 'TH', lat:  18.7883,  lon:  98.9853,  utc:  7,   region: 'asia' },
  { name: 'Phuket',           nameRu: 'Пхукет',              country: 'TH', lat:   7.8804,  lon:  98.3923,  utc:  7,   region: 'asia' },
  { name: 'Koh Samui',        nameRu: 'Ко Самуи',            country: 'TH', lat:   9.5120,  lon: 100.0136,  utc:  7,   region: 'asia' },
  { name: 'Bali',             nameRu: 'Бали (Денпасар)',     country: 'ID', lat:  -8.3405,  lon: 115.0920,  utc:  8,   region: 'asia' },
  { name: 'Lombok',           nameRu: 'Ломбок',              country: 'ID', lat:  -8.6520,  lon: 116.3249,  utc:  8,   region: 'asia' },
  { name: 'Jakarta',          nameRu: 'Джакарта',            country: 'ID', lat:  -6.2088,  lon: 106.8456,  utc:  7,   region: 'asia' },
  { name: 'Singapore',        nameRu: 'Сингапур',            country: 'SG', lat:   1.3521,  lon: 103.8198,  utc:  8,   region: 'asia' },
  { name: 'Kuala Lumpur',     nameRu: 'Куала-Лумпур',        country: 'MY', lat:   3.1390,  lon: 101.6869,  utc:  8,   region: 'asia' },
  { name: 'Penang',           nameRu: 'Пинанг',              country: 'MY', lat:   5.4141,  lon: 100.3288,  utc:  8,   region: 'asia' },
  { name: 'Ho Chi Minh',      nameRu: 'Хошимин',             country: 'VN', lat:  10.8231,  lon: 106.6297,  utc:  7,   region: 'asia' },
  { name: 'Hanoi',            nameRu: 'Ханой',               country: 'VN', lat:  21.0278,  lon: 105.8342,  utc:  7,   region: 'asia' },
  { name: 'Da Nang',          nameRu: 'Дананг',              country: 'VN', lat:  16.0544,  lon: 108.2022,  utc:  7,   region: 'asia' },
  { name: 'Manila',           nameRu: 'Манила',              country: 'PH', lat:  14.5995,  lon: 120.9842,  utc:  8,   region: 'asia' },
  { name: 'Cebu',             nameRu: 'Себу',                country: 'PH', lat:  10.3157,  lon: 123.8854,  utc:  8,   region: 'asia' },
  { name: 'Mumbai',           nameRu: 'Мумбай',              country: 'IN', lat:  19.0760,  lon:  72.8777,  utc:  5.5, region: 'asia' },
  { name: 'Delhi',            nameRu: 'Дели',                country: 'IN', lat:  28.6139,  lon:  77.2090,  utc:  5.5, region: 'asia' },
  { name: 'Bangalore',        nameRu: 'Бангалор',            country: 'IN', lat:  12.9716,  lon:  77.5946,  utc:  5.5, region: 'asia' },
  { name: 'Goa',              nameRu: 'Гоа',                 country: 'IN', lat:  15.2993,  lon:  74.1240,  utc:  5.5, region: 'asia' },
  { name: 'Kolkata',          nameRu: 'Калькутта',           country: 'IN', lat:  22.5726,  lon:  88.3639,  utc:  5.5, region: 'asia' },
  { name: 'Chennai',          nameRu: 'Ченнай',              country: 'IN', lat:  13.0827,  lon:  80.2707,  utc:  5.5, region: 'asia' },
  { name: 'Kathmandu',        nameRu: 'Катманду',            country: 'NP', lat:  27.7172,  lon:  85.3240,  utc:  5.75,region: 'asia' },
  { name: 'Colombo',          nameRu: 'Коломбо',             country: 'LK', lat:   6.9271,  lon:  79.8612,  utc:  5.5, region: 'asia' },
  { name: 'Dhaka',            nameRu: 'Дакка',               country: 'BD', lat:  23.8103,  lon:  90.4125,  utc:  6,   region: 'asia' },
  { name: 'Yangon',           nameRu: 'Янгон',               country: 'MM', lat:  16.8661,  lon:  96.1951,  utc:  6.5, region: 'asia' },
  { name: 'Phnom Penh',       nameRu: 'Пномпень',            country: 'KH', lat:  11.5564,  lon: 104.9282,  utc:  7,   region: 'asia' },

  // ─ East Asia ─
  { name: 'Tokyo',            nameRu: 'Токио',               country: 'JP', lat:  35.6762,  lon: 139.6503,  utc:  9,   region: 'asia' },
  { name: 'Osaka',            nameRu: 'Осака',               country: 'JP', lat:  34.6937,  lon: 135.5023,  utc:  9,   region: 'asia' },
  { name: 'Kyoto',            nameRu: 'Киото',               country: 'JP', lat:  35.0116,  lon: 135.7681,  utc:  9,   region: 'asia' },
  { name: 'Seoul',            nameRu: 'Сеул',                country: 'KR', lat:  37.5665,  lon: 126.9780,  utc:  9,   region: 'asia' },
  { name: 'Busan',            nameRu: 'Пусан',               country: 'KR', lat:  35.1796,  lon: 129.0756,  utc:  9,   region: 'asia' },
  { name: 'Beijing',          nameRu: 'Пекин',               country: 'CN', lat:  39.9042,  lon: 116.4074,  utc:  8,   region: 'asia' },
  { name: 'Shanghai',         nameRu: 'Шанхай',              country: 'CN', lat:  31.2304,  lon: 121.4737,  utc:  8,   region: 'asia' },
  { name: 'Guangzhou',        nameRu: 'Гуанчжоу',            country: 'CN', lat:  23.1291,  lon: 113.2644,  utc:  8,   region: 'asia' },
  { name: 'Shenzhen',         nameRu: 'Шэньчжэнь',          country: 'CN', lat:  22.5431,  lon: 114.0579,  utc:  8,   region: 'asia' },
  { name: 'Chengdu',          nameRu: 'Чэнду',               country: 'CN', lat:  30.5728,  lon: 104.0668,  utc:  8,   region: 'asia' },
  { name: 'Hong Kong',        nameRu: 'Гонконг',             country: 'HK', lat:  22.3193,  lon: 114.1694,  utc:  8,   region: 'asia' },
  { name: 'Taipei',           nameRu: 'Тайбэй',              country: 'TW', lat:  25.0330,  lon: 121.5654,  utc:  8,   region: 'asia' },
  { name: 'Ulaanbaatar',      nameRu: 'Улан-Батор',          country: 'MN', lat:  47.8864,  lon: 106.9057,  utc:  8,   region: 'asia' },

  // ─ Central Asia / Caucasus extra ─
  { name: 'Tbilisi',          nameRu: 'Тбилиси',             country: 'GE', lat:  41.7151,  lon:  44.8271,  utc:  4,   region: 'asia' },

  // ─ Americas — North ─
  { name: 'New York',         nameRu: 'Нью-Йорк',            country: 'US', lat:  40.7128,  lon: -74.0060,  utc: -5,   region: 'americas' },
  { name: 'Los Angeles',      nameRu: 'Лос-Анджелес',        country: 'US', lat:  34.0522,  lon:-118.2437,  utc: -8,   region: 'americas' },
  { name: 'Chicago',          nameRu: 'Чикаго',              country: 'US', lat:  41.8781,  lon: -87.6298,  utc: -6,   region: 'americas' },
  { name: 'Miami',            nameRu: 'Майами',              country: 'US', lat:  25.7617,  lon: -80.1918,  utc: -5,   region: 'americas' },
  { name: 'San Francisco',    nameRu: 'Сан-Франциско',       country: 'US', lat:  37.7749,  lon:-122.4194,  utc: -8,   region: 'americas' },
  { name: 'Seattle',          nameRu: 'Сиэтл',               country: 'US', lat:  47.6062,  lon:-122.3321,  utc: -8,   region: 'americas' },
  { name: 'Austin',           nameRu: 'Остин',               country: 'US', lat:  30.2672,  lon: -97.7431,  utc: -6,   region: 'americas' },
  { name: 'Houston',          nameRu: 'Хьюстон',             country: 'US', lat:  29.7604,  lon: -95.3698,  utc: -6,   region: 'americas' },
  { name: 'Las Vegas',        nameRu: 'Лас-Вегас',           country: 'US', lat:  36.1699,  lon:-115.1398,  utc: -8,   region: 'americas' },
  { name: 'Denver',           nameRu: 'Денвер',              country: 'US', lat:  39.7392,  lon:-104.9903,  utc: -7,   region: 'americas' },
  { name: 'Boston',           nameRu: 'Бостон',              country: 'US', lat:  42.3601,  lon: -71.0589,  utc: -5,   region: 'americas' },
  { name: 'Washington DC',    nameRu: 'Вашингтон',           country: 'US', lat:  38.9072,  lon: -77.0369,  utc: -5,   region: 'americas' },
  { name: 'Orlando',          nameRu: 'Орландо',             country: 'US', lat:  28.5383,  lon: -81.3792,  utc: -5,   region: 'americas' },
  { name: 'Toronto',          nameRu: 'Торонто',             country: 'CA', lat:  43.6532,  lon: -79.3832,  utc: -5,   region: 'americas' },
  { name: 'Vancouver',        nameRu: 'Ванкувер',            country: 'CA', lat:  49.2827,  lon:-123.1207,  utc: -8,   region: 'americas' },
  { name: 'Montreal',         nameRu: 'Монреаль',            country: 'CA', lat:  45.5017,  lon: -73.5673,  utc: -5,   region: 'americas' },
  { name: 'Calgary',          nameRu: 'Калгари',             country: 'CA', lat:  51.0447,  lon:-114.0719,  utc: -7,   region: 'americas' },
  { name: 'Mexico City',      nameRu: 'Мехико',              country: 'MX', lat:  19.4326,  lon: -99.1332,  utc: -6,   region: 'americas' },
  { name: 'Cancun',           nameRu: 'Канкун',              country: 'MX', lat:  21.1619,  lon: -86.8515,  utc: -5,   region: 'americas' },
  { name: 'Guadalajara',      nameRu: 'Гвадалахара',         country: 'MX', lat:  20.6597,  lon:-103.3496,  utc: -6,   region: 'americas' },

  // ─ Americas — Central & Caribbean ─
  { name: 'San Jose',         nameRu: 'Сан-Хосе (КР)',       country: 'CR', lat:   9.9281,  lon: -84.0907,  utc: -6,   region: 'americas' },
  { name: 'Panama City',      nameRu: 'Панама',              country: 'PA', lat:   8.9936,  lon: -79.5197,  utc: -5,   region: 'americas' },
  { name: 'Havana',           nameRu: 'Гавана',              country: 'CU', lat:  23.1136,  lon: -82.3666,  utc: -5,   region: 'americas' },

  // ─ Americas — South ─
  { name: 'Buenos Aires',     nameRu: 'Буэнос-Айрес',        country: 'AR', lat: -34.6037,  lon: -58.3816,  utc: -3,   region: 'americas' },
  { name: 'Cordoba',          nameRu: 'Кордова (AR)',        country: 'AR', lat: -31.4201,  lon: -64.1888,  utc: -3,   region: 'americas' },
  { name: 'Mendoza',          nameRu: 'Мендоса',             country: 'AR', lat: -32.8908,  lon: -68.8272,  utc: -3,   region: 'americas' },
  { name: 'São Paulo',        nameRu: 'Сан-Паулу',           country: 'BR', lat: -23.5505,  lon: -46.6333,  utc: -3,   region: 'americas' },
  { name: 'Rio de Janeiro',   nameRu: 'Рио-де-Жанейро',      country: 'BR', lat: -22.9068,  lon: -43.1729,  utc: -3,   region: 'americas' },
  { name: 'Florianopolis',    nameRu: 'Флорианополис',       country: 'BR', lat: -27.5954,  lon: -48.5480,  utc: -3,   region: 'americas' },
  { name: 'Bogota',           nameRu: 'Богота',              country: 'CO', lat:   4.7110,  lon: -74.0721,  utc: -5,   region: 'americas' },
  { name: 'Medellin',         nameRu: 'Медельин',            country: 'CO', lat:   6.2442,  lon: -75.5812,  utc: -5,   region: 'americas' },
  { name: 'Cartagena',        nameRu: 'Картахена',           country: 'CO', lat:  10.3910,  lon: -75.4794,  utc: -5,   region: 'americas' },
  { name: 'Lima',             nameRu: 'Лима',                country: 'PE', lat: -12.0464,  lon: -77.0428,  utc: -5,   region: 'americas' },
  { name: 'Santiago',         nameRu: 'Сантьяго',            country: 'CL', lat: -33.4489,  lon: -70.6693,  utc: -4,   region: 'americas' },
  { name: 'Quito',            nameRu: 'Кито',                country: 'EC', lat:  -0.1807,  lon: -78.4678,  utc: -5,   region: 'americas' },
  { name: 'Montevideo',       nameRu: 'Монтевидео',          country: 'UY', lat: -34.9011,  lon: -56.1645,  utc: -3,   region: 'americas' },
  { name: 'Asuncion',         nameRu: 'Асунсьон',            country: 'PY', lat: -25.2867,  lon: -57.6470,  utc: -4,   region: 'americas' },

  // ─ Oceania ─
  { name: 'Sydney',           nameRu: 'Сидней',              country: 'AU', lat: -33.8688,  lon: 151.2093,  utc: 10,   region: 'oceania' },
  { name: 'Melbourne',        nameRu: 'Мельбурн',            country: 'AU', lat: -37.8136,  lon: 144.9631,  utc: 10,   region: 'oceania' },
  { name: 'Brisbane',         nameRu: 'Брисбен',             country: 'AU', lat: -27.4698,  lon: 153.0251,  utc: 10,   region: 'oceania' },
  { name: 'Perth',            nameRu: 'Перт',                country: 'AU', lat: -31.9505,  lon: 115.8605,  utc:  8,   region: 'oceania' },
  { name: 'Gold Coast',       nameRu: 'Голд-Кост',           country: 'AU', lat: -28.0167,  lon: 153.4000,  utc: 10,   region: 'oceania' },
  { name: 'Auckland',         nameRu: 'Окленд',              country: 'NZ', lat: -36.8485,  lon: 174.7633,  utc: 12,   region: 'oceania' },
  { name: 'Wellington',       nameRu: 'Веллингтон',          country: 'NZ', lat: -41.2865,  lon: 174.7762,  utc: 12,   region: 'oceania' },
  { name: 'Suva',             nameRu: 'Сува (Фиджи)',        country: 'FJ', lat:  -18.1248,  lon: 178.4501,  utc: 12,   region: 'oceania' },

  // ─ Africa ─
  { name: 'Cape Town',        nameRu: 'Кейптаун',            country: 'ZA', lat: -33.9249,  lon:  18.4241,  utc:  2,   region: 'africa' },
  { name: 'Johannesburg',     nameRu: 'Йоханнесбург',        country: 'ZA', lat: -26.2041,  lon:  28.0473,  utc:  2,   region: 'africa' },
  { name: 'Nairobi',          nameRu: 'Найроби',             country: 'KE', lat:  -1.2921,  lon:  36.8219,  utc:  3,   region: 'africa' },
  { name: 'Lagos',            nameRu: 'Лагос',               country: 'NG', lat:   6.5244,  lon:   3.3792,  utc:  1,   region: 'africa' },
  { name: 'Accra',            nameRu: 'Аккра',               country: 'GH', lat:   5.6037,  lon:  -0.1870,  utc:  0,   region: 'africa' },
  { name: 'Addis Ababa',      nameRu: 'Аддис-Абеба',         country: 'ET', lat:   9.0320,  lon:  38.7469,  utc:  3,   region: 'africa' },
  { name: 'Dar es Salaam',    nameRu: 'Дар-эс-Салам',        country: 'TZ', lat:  -6.7924,  lon:  39.2083,  utc:  3,   region: 'africa' },
  { name: 'Zanzibar',         nameRu: 'Занзибар',            country: 'TZ', lat:  -6.1659,  lon:  39.2026,  utc:  3,   region: 'africa' },
  { name: 'Dakar',            nameRu: 'Дакар',               country: 'SN', lat:  14.7645,  lon: -17.3660,  utc:  0,   region: 'africa' },
  { name: 'Luanda',           nameRu: 'Луанда',              country: 'AO', lat:  -8.8383,  lon:  13.2344,  utc:  1,   region: 'africa' },
];

export const REGION_LABELS: Record<string, string> = {
  cis:      'СНГ и Россия',
  europe:   'Европа и Турция',
  mena:     'Ближний Восток',
  asia:     'Азия и ЮВА',
  americas: 'Америка',
  oceania:  'Океания',
  africa:   'Африка',
};

// ── CITY SPHERE BIAS ──────────────────────────────────────────────────────────
// Эмпирически откалиброванные смещения сфер по типу города
// (относительно нейтральных 50 баллов, диапазон −15…+15)
// Используются в локальном оффлайн-расчёте как постоянная составляющая.

export interface SphereBias {
  love?: number; career?: number; money?: number; health?: number;
  creativity?: number; spirit?: number; stability?: number; social?: number;
}

export const CITY_SPHERE_BIAS: Record<string, SphereBias> = {
  // --- CIS ---
  'Москва':          { career: 12, money: 10, social: 8, love: -2, health: -5, spirit: -3 },
  'Санкт-Петербург': { creativity: 12, spirit: 8, love: 6, career: 5, health: 2 },
  'Сочи':            { health: 10, love: 8, stability: 5, social: 5, career: -3 },
  'Тбилиси':         { social: 10, creativity: 9, love: 8, money: 5, spirit: 6, career: 3 },
  'Батуми':          { love: 9, health: 8, stability: 6, social: 7, career: -5 },
  'Алматы':          { career: 7, money: 6, social: 6, stability: 5 },
  'Баку':            { money: 8, career: 7, social: 6, love: 4 },
  'Ереван':          { spirit: 9, creativity: 8, love: 7, social: 7, money: 3 },
  'Ташкент':         { stability: 8, social: 6, spirit: 5, money: 4 },

  // --- Europe ---
  'Лондон':          { career: 13, money: 11, social: 9, creativity: 8, love: -3, spirit: -4 },
  'Париж':           { love: 13, creativity: 12, social: 10, spirit: 7, stability: 5 },
  'Берлин':          { creativity: 12, social: 10, career: 8, love: 7, spirit: 6 },
  'Мюнхен':          { career: 9, money: 10, stability: 10, health: 7, social: 5 },
  'Гамбург':         { career: 8, money: 9, social: 7, love: 4, stability: 6 },
  'Франкфурт':       { money: 13, career: 11, stability: 7, social: 5, love: -2 },
  'Амстердам':       { creativity: 11, social: 10, love: 8, spirit: 7, career: 6 },
  'Брюссель':        { career: 8, money: 7, social: 8, stability: 6 },
  'Вена':            { creativity: 11, spirit: 9, love: 9, stability: 9, health: 6 },
  'Цюрих':           { money: 13, stability: 12, career: 10, health: 8, love: 3 },
  'Женева':          { money: 12, stability: 11, spirit: 8, health: 7, career: 9 },
  'Лиссабон':        { love: 11, health: 10, creativity: 10, spirit: 9, social: 9, career: 3 },
  'Порту':           { creativity: 10, spirit: 9, love: 9, health: 9, social: 7 },
  'Мадрид':          { social: 11, love: 10, creativity: 9, career: 7, health: 6 },
  'Барселона':       { love: 12, creativity: 12, social: 12, health: 9, spirit: 7 },
  'Валенсия':        { health: 11, love: 10, social: 9, creativity: 8, spirit: 6 },
  'Малага':          { health: 11, love: 10, spirit: 8, stability: 6, career: -2 },
  'Рим':             { love: 12, spirit: 10, creativity: 11, stability: 6, social: 9 },
  'Милан':           { career: 10, creativity: 10, money: 9, love: 8, social: 8 },
  'Флоренция':       { creativity: 13, spirit: 11, love: 10, health: 7, social: 7 },
  'Венеция':         { love: 14, creativity: 12, spirit: 10, social: 7, stability: -3 },
  'Неаполь':         { love: 9, social: 8, spirit: 7, creativity: 7, stability: -4 },
  'Афины':           { spirit: 11, creativity: 9, love: 9, social: 8, health: 7 },
  'Стокгольм':       { stability: 11, career: 9, health: 10, social: 7, money: 8 },
  'Осло':            { health: 11, stability: 10, money: 9, career: 8, spirit: 6 },
  'Копенгаген':      { health: 12, stability: 11, social: 9, creativity: 8, career: 8 },
  'Хельсинки':       { health: 10, stability: 10, spirit: 9, career: 7, social: 6 },
  'Дублин':          { social: 10, love: 8, creativity: 8, career: 7, spirit: 5 },
  'Прага':           { creativity: 11, spirit: 9, love: 9, social: 8, money: 4 },
  'Варшава':         { career: 9, money: 8, social: 7, stability: 7, love: 4 },
  'Краков':          { spirit: 10, creativity: 9, love: 8, social: 7, health: 6 },
  'Будапешт':        { love: 10, creativity: 9, spirit: 8, social: 8, health: 7 },
  'Братислава':      { stability: 8, love: 7, social: 6, health: 6, career: 5 },
  'Сплит':           { health: 12, love: 11, spirit: 9, social: 8, stability: 6 },
  'Дубровник':       { love: 13, health: 11, spirit: 10, creativity: 9, stability: 5 },
  'Белград':         { social: 11, love: 9, creativity: 9, career: 6, spirit: 6 },
  'София':           { stability: 7, social: 6, career: 5, love: 5, spirit: 5 },
  'Рига':            { creativity: 8, social: 7, love: 6, stability: 6, career: 5 },
  'Таллин':          { creativity: 9, health: 7, stability: 7, career: 6, spirit: 7 },
  'Вильнюс':         { spirit: 8, creativity: 8, love: 6, health: 7, stability: 6 },
  'Лимасол':         { money: 9, stability: 9, love: 8, health: 7, social: 7 },
  'Пафос':           { love: 10, spirit: 9, health: 9, stability: 7, creativity: 7 },
  'Стамбул':         { social: 12, creativity: 10, love: 9, career: 8, money: 8 },
  'Анталья':         { health: 11, love: 8, stability: 7, social: 6, career: -3 },
  'Измир':           { health: 10, love: 9, social: 8, creativity: 7, spirit: 6 },
  'Бодрум':          { love: 11, health: 10, social: 8, creativity: 7, spirit: 7 },
  'Рейкьявик':       { spirit: 13, health: 10, creativity: 9, stability: 8, social: 4 },

  // --- MENA ---
  'Дубай':           { money: 14, career: 12, social: 10, stability: 7, love: 3, spirit: -5 },
  'Абу-Даби':        { money: 12, career: 11, stability: 9, social: 7, love: 3 },
  'Тель-Авив':       { social: 11, creativity: 10, career: 9, love: 8, money: 8 },
  'Доха':            { money: 12, career: 10, stability: 8, social: 7, love: 2 },
  'Маскат':          { stability: 10, spirit: 8, health: 8, money: 7, love: 5 },
  'Каир':            { spirit: 9, social: 8, creativity: 7, love: 6, career: 4 },
  'Касабланка':      { money: 8, career: 7, social: 7, love: 6, creativity: 5 },
  'Марракеш':        { spirit: 12, creativity: 11, love: 10, social: 9, health: 7 },

  // --- Asia ---
  'Бангкок':         { social: 11, love: 9, creativity: 9, health: 6, money: 7, spirit: 5 },
  'Чиангмай':        { spirit: 12, health: 11, creativity: 10, love: 8, social: 7 },
  'Пхукет':          { health: 11, love: 10, social: 8, spirit: 7, stability: 4 },
  'Ко Самуи':        { health: 12, love: 11, spirit: 10, creativity: 8, social: 7 },
  'Бали (Денпасар)': { spirit: 14, creativity: 13, health: 12, love: 11, social: 9 },
  'Сингапур':        { career: 12, money: 12, social: 10, stability: 9, love: 3 },
  'Куала-Лумпур':    { career: 9, money: 9, social: 8, stability: 7, love: 5 },
  'Хошимин':         { career: 8, social: 8, money: 7, creativity: 7, love: 6 },
  'Дананг':          { health: 11, love: 9, spirit: 8, social: 7, creativity: 7 },
  'Токио':           { career: 12, money: 10, stability: 10, creativity: 10, social: 8 },
  'Осака':           { social: 11, creativity: 10, love: 9, money: 8, health: 7 },
  'Киото':           { spirit: 13, creativity: 12, love: 8, health: 9, stability: 9 },
  'Сеул':            { career: 11, social: 11, creativity: 10, money: 9, love: 7 },
  'Пекин':           { career: 10, money: 9, stability: 8, social: 7, spirit: 5 },
  'Шанхай':          { career: 11, money: 11, social: 10, creativity: 8, love: 5 },
  'Гонконг':         { money: 13, career: 11, social: 10, stability: 7, love: 3 },
  'Мумбай':          { career: 9, money: 9, social: 9, creativity: 8, love: 6 },
  'Гоа':             { spirit: 12, health: 11, love: 10, creativity: 9, social: 8 },
  'Катманду':        { spirit: 14, creativity: 10, health: 8, love: 7, social: 6 },

  // --- Americas ---
  'Нью-Йорк':        { career: 13, money: 12, social: 12, creativity: 11, love: 5, spirit: -3 },
  'Лос-Анджелес':    { creativity: 13, career: 11, love: 10, social: 10, money: 9 },
  'Майами':          { love: 12, social: 11, money: 9, health: 8, creativity: 9 },
  'Сан-Франциско':   { creativity: 12, career: 11, social: 10, money: 10, spirit: 7 },
  'Остин':           { creativity: 10, social: 10, career: 9, love: 8, health: 7 },
  'Монреаль':        { creativity: 11, social: 10, love: 8, spirit: 7, health: 7 },
  'Ванкувер':        { health: 12, stability: 10, spirit: 9, social: 8, love: 8 },
  'Мехико':          { social: 11, creativity: 10, love: 9, spirit: 8, career: 7 },
  'Медельин':        { social: 11, love: 10, creativity: 9, health: 9, career: 7 },
  'Картахена':       { love: 12, health: 10, social: 10, spirit: 8, creativity: 8 },
  'Буэнос-Айрес':    { love: 12, social: 11, creativity: 11, spirit: 8, career: 6 },
  'Рио-де-Жанейро':  { love: 13, social: 13, creativity: 11, health: 9, spirit: 8 },
  'Флорианополис':   { health: 11, love: 10, spirit: 9, social: 8, creativity: 8 },
  'Сантьяго':        { career: 8, money: 8, stability: 8, health: 7, social: 7 },

  // --- Oceania / Africa ---
  'Сидней':          { career: 10, health: 10, social: 9, love: 8, money: 8 },
  'Мельбурн':        { career: 10, creativity: 10, social: 9, stability: 9, health: 8 },
  'Кейптаун':        { creativity: 11, spirit: 10, health: 11, love: 10, social: 8 },
  'Найроби':         { career: 7, social: 7, spirit: 7, stability: 6, love: 5 },
  'Занзибар':        { spirit: 11, health: 10, love: 10, creativity: 8, social: 7 },
};

// ── STAY PERIOD RECOMMENDATIONS per goal ─────────────────────────────────────
// Рекомендации по оптимальной длительности пребывания для каждой сферы

export interface StayPeriodAdvice {
  minDays: number;
  maxDays: number;
  label: string;
  reason: string;
  optimalWindow: string; // Астрологический цикл
  planetaryCycle: string;
}

export const SPHERE_STAY_ADVICE: Record<string, StayPeriodAdvice[]> = {
  love: [
    { minDays: 7,   maxDays: 21,  label: '1–3 недели',     reason: 'Мощный первый импульс — знакомства, влечение, яркие встречи. Венера успевает активировать 5-й дом.',                   optimalWindow: 'До следующей Новой Луны',     planetaryCycle: 'Транзит Венеры ~23 дня' },
    { minDays: 90,  maxDays: 180, label: '3–6 месяцев',    reason: 'Достаточно для формирования устойчивой эмоциональной связи. Марс и Венера успевают пройти через 7-й дом.',              optimalWindow: 'В течение одного лунного квартала', planetaryCycle: 'Транзит Марса ~45–60 дней' },
    { minDays: 365, maxDays: 730, label: '1–2 года',       reason: 'Полный цикл Юпитера через 5-й/7-й дом (≈12 мес). Наилучший результат — встреча партнёра и строительство отношений.',   optimalWindow: 'Юпитер в 5-м или 7-м доме',  planetaryCycle: 'Юпитерный цикл ≈12 лет' },
  ],
  career: [
    { minDays: 30,  maxDays: 90,  label: '1–3 месяца',     reason: 'Достаточно для первых контактов и пробы почвы. Солнце успевает пройти через 10-й дом.',                                 optimalWindow: 'Транзит Солнца в 10-м доме', planetaryCycle: 'Солнечный цикл ~1 год' },
    { minDays: 180, maxDays: 365, label: '6–12 месяцев',   reason: 'Полное включение карьерного потенциала — новые проекты, связи, статус. Сатурн начинает "строить" 10-й дом.',             optimalWindow: 'Первый квадрат Сатурна к Солнцу', planetaryCycle: 'Сатурнианский цикл 29.5 лет' },
    { minDays: 730, maxDays: 4380,label: '2–12 лет',       reason: 'Долгосрочная карьерная база. Полный цикл Юпитера через MC и 10-й дом трансформирует профессиональную идентичность.',    optimalWindow: 'Юпитер конъюнкт MC',          planetaryCycle: 'Юпитерный цикл ≈12 лет' },
  ],
  money: [
    { minDays: 90,  maxDays: 180, label: '3–6 месяцев',    reason: 'Минимально необходимо для запуска финансовых потоков. Юпитер успевает активировать 2-й или 8-й дом.',                   optimalWindow: 'Юпитер в 2-м или 8-м доме',  planetaryCycle: 'Юпитерный цикл ≈12 лет' },
    { minDays: 365, maxDays: 1460,label: '1–4 года',       reason: 'Стабильное формирование финансовой базы. Сатурн в 2-м/8-м доме укрепляет и структурирует доходы.',                      optimalWindow: 'Сатурн в 2-м или 8-м доме',  planetaryCycle: 'Сатурнианский цикл 29.5 лет' },
  ],
  health: [
    { minDays: 14,  maxDays: 42,  label: '2–6 недель',     reason: 'Эффект детокса и первичного восстановления. Луна успевает пройти полный цикл — перезагрузка ритмов тела.',               optimalWindow: 'Новолуние → Полнолуние',       planetaryCycle: 'Лунный цикл 29.5 дней' },
    { minDays: 90,  maxDays: 180, label: '3–6 месяцев',    reason: 'Глубокая перестройка ритмов жизни. Марс завершает полный оборот по карте, восстанавливая 1-й и 6-й дома.',              optimalWindow: 'Марс конъюнкт ASC или 6-й дом', planetaryCycle: 'Цикл Марса ~2 года' },
    { minDays: 365, maxDays: 1095,label: '1–3 года',       reason: 'Кардинальная смена образа жизни. Все сезоны успевают перестроить режим сна, питания, движения.',                        optimalWindow: 'Транзит Сатурна в 1-м доме',  planetaryCycle: 'Сатурнианский цикл 29.5 лет' },
  ],
  creativity: [
    { minDays: 7,   maxDays: 30,  label: '1–4 недели',     reason: 'Быстрый импульс вдохновения — новая обстановка активирует Нептун и 5-й дом. Лучшее время для творческого ретрита.',     optimalWindow: 'Венера в 5-м доме',           planetaryCycle: 'Транзит Венеры ~23 дня' },
    { minDays: 90,  maxDays: 365, label: '3–12 месяцев',   reason: 'Формирование устойчивой творческой практики. Нептун и Уран начинают влиять на 3-й и 5-й дома.',                          optimalWindow: 'Уран конъюнкт 5-й дом',       planetaryCycle: 'Уранический цикл 84 года' },
  ],
  spirit: [
    { minDays: 7,   maxDays: 21,  label: '1–3 недели',     reason: 'Ретрит, медитация, первый контакт с сакральным пространством. Луна проходит через 12-й и 9-й дома.',                    optimalWindow: 'Луна в 9-м или 12-м доме',    planetaryCycle: 'Лунный цикл 29.5 дней' },
    { minDays: 90,  maxDays: 365, label: '3–12 месяцев',   reason: 'Глубокая интеграция духовного опыта. Нептун активирует 9-й и 12-й дома, трансформируя мировоззрение.',                  optimalWindow: 'Юпитер в 9-м или 12-м доме', planetaryCycle: 'Юпитерный цикл ≈12 лет' },
    { minDays: 730, maxDays: 3650,label: '2–10 лет',       reason: 'Духовный путь требует времени. Полный Юпитерный цикл через 9-й дом завершает мировоззренческую трансформацию.',          optimalWindow: 'Юпитер конъюнкт натальный Нептун', planetaryCycle: 'Нептунианский цикл 165 лет' },
  ],
  stability: [
    { minDays: 180, maxDays: 365, label: '6–12 месяцев',   reason: 'Минимальный порог для ощущения "дома". Луна и Сатурн успевают активировать 4-й дом.',                                   optimalWindow: 'Сатурн в 4-м доме',           planetaryCycle: 'Сатурнианский цикл 29.5 лет' },
    { minDays: 1095,maxDays: 7300,label: '3+ лет',         reason: 'Настоящий дом строится медленно. Полный цикл Юпитера через 4-й дом (≈12 лет) — предел долгосрочной стабильности.',      optimalWindow: 'Юпитер в 4-м доме',           planetaryCycle: 'Юпитерный цикл ≈12 лет' },
  ],
  social: [
    { minDays: 14,  maxDays: 60,  label: '2 нед–2 мес',    reason: 'Нетворкинг и поверхностные связи образуются быстро. Меркурий активирует 11-й дом за несколько недель.',                  optimalWindow: 'Меркурий в 11-м доме',        planetaryCycle: 'Транзит Меркурия ~3.5 мес' },
    { minDays: 180, maxDays: 730, label: '6 мес–2 года',   reason: 'Глубокий круг друзей и профессиональных связей. Юпитер проходит через 11-й дом, принося новые сообщества.',              optimalWindow: 'Юпитер в 11-м доме',          planetaryCycle: 'Юпитерный цикл ≈12 лет' },
  ],
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
  sphereEmphasis: string[];
  channelWeight: number;
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
  love:       { label: 'Любовь',       icon: '❤️', color: '#ec4899' },
  career:     { label: 'Карьера',      icon: '💼', color: '#3b82f6' },
  money:      { label: 'Финансы',      icon: '💰', color: '#f59e0b' },
  health:     { label: 'Здоровье',     icon: '💚', color: '#22c55e' },
  creativity: { label: 'Творчество',   icon: '🎨', color: '#8b5cf6' },
  spirit:     { label: 'Дух',          icon: '✨', color: '#6366f1' },
  stability:  { label: 'Стабильность', icon: '⚓', color: '#64748b' },
  social:     { label: 'Социум',       icon: '👥', color: '#06b6d4' },
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

// ═══════════════════════════════════════════════════════════════════════════════
// ── ACG (ASTROCARTOGRAPHY) ENGINE ─────────────────────────────────────────────
// Точный расчёт линий MC/IC/ASC/DSC для каждой планеты натальной карты
// и транзитных планет на заданную дату.
//
// Математика:
//   RAMC = RA Середины Неба (из MC натальной карты)
//   MC-линия планеты: geo_lon = RA_planet − RAMC_natal + natal_lon
//   IC-линия: MC_lon + 180°
//   ASC-линия: geo_lon = RA_planet − H − RAMC_natal + natal_lon
//     где H = arccos(−tan(φ_observer) · tan(δ_planet)) — часовой угол восхода
//   DSC-линия: RA_planet + H − RAMC_natal + natal_lon
// ═══════════════════════════════════════════════════════════════════════════════

const _DEG = Math.PI / 180;
const _OBLIQUITY = 23.4367; // наклон эклиптики, градусы

function _toRad(d: number) { return d * _DEG; }
function _toDeg(r: number) { return r / _DEG; }

/** Нормализует угол в диапазон −180…+180 */
function _normAngle(a: number): number {
  let r = ((a % 360) + 360) % 360;
  if (r > 180) r -= 360;
  return r;
}

/** Эклиптическая долгота → экваториальные RA (0..360), Dec (−90..90) */
function _eclToEq(lon: number, lat = 0): { ra: number; dec: number } {
  const l = _toRad(lon);
  const b = _toRad(lat);
  const e = _toRad(_OBLIQUITY);
  const sinDec = Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l);
  const dec = _toDeg(Math.asin(Math.max(-1, Math.min(1, sinDec))));
  const cosD = Math.cos(_toRad(dec));
  let ra = 0;
  if (cosD > 1e-10) {
    const cosRA = (Math.cos(l) * Math.cos(b)) / cosD;
    const sinRA = (Math.sin(l) * Math.cos(b) * Math.cos(e) - Math.sin(b) * Math.sin(e)) / cosD;
    ra = _toDeg(Math.atan2(sinRA, cosRA));
  }
  return { ra: ((ra % 360) + 360) % 360, dec };
}

/** Географическая долгота MC-линии планеты */
function _mcLineLon(planetRA: number, ramc: number, natalLon: number): number {
  return _normAngle(planetRA - ramc + natalLon);
}

/** Географическая долгота ASC-линии планеты на широте observerLat.
 *  Возвращает null, если планета всегда выше/ниже горизонта (приполярная). */
function _ascLineLon(
  planetRA: number, planetDec: number,
  ramc: number, natalLon: number, observerLat: number,
): number | null {
  const cosH = -Math.tan(_toRad(observerLat)) * Math.tan(_toRad(planetDec));
  if (Math.abs(cosH) > 1) return null;
  const H = _toDeg(Math.acos(cosH));
  return _normAngle(planetRA - H - ramc + natalLon);
}

function _dscLineLon(
  planetRA: number, planetDec: number,
  ramc: number, natalLon: number, observerLat: number,
): number | null {
  const cosH = -Math.tan(_toRad(observerLat)) * Math.tan(_toRad(planetDec));
  if (Math.abs(cosH) > 1) return null;
  const H = _toDeg(Math.acos(cosH));
  return _normAngle(planetRA + H - ramc + natalLon);
}

// ── Планетарные веса по углам → сферы ────────────────────────────────────────
// Каждая планета на каждом угле карты (MC/IC/ASC/DSC) усиливает свои сферы.
// Числа — максимальный бонус при нулевом орбисе (орбис масштабирует от 0 до 1).

const _PLANET_ANGLE_WEIGHTS: Record<string, Record<string, Partial<SphereBias>>> = {
  sun: {
    MC:  { career: 15, social: 6, stability: 4 },
    IC:  { stability: 10, spirit: 5, health: 4 },
    ASC: { career: 10, health: 8, social: 5 },
    DSC: { love: 8, social: 7, stability: 4 },
  },
  moon: {
    MC:  { career: 5, love: 7, social: 8 },
    IC:  { stability: 14, love: 10, health: 8 },
    ASC: { health: 12, love: 9, creativity: 5 },
    DSC: { love: 13, stability: 8, spirit: 6 },
  },
  mercury: {
    MC:  { career: 8, social: 12, creativity: 6 },
    IC:  { stability: 5, social: 7, spirit: 4 },
    ASC: { social: 13, creativity: 9, career: 5 },
    DSC: { social: 10, creativity: 7, love: 4 },
  },
  venus: {
    MC:  { love: 10, creativity: 11, social: 8, money: 5 },
    IC:  { love: 9, stability: 10, health: 6 },
    ASC: { love: 16, creativity: 11, health: 7 },
    DSC: { love: 14, stability: 8, money: 7 },
  },
  mars: {
    MC:  { career: 14, health: 6, money: 4 },
    IC:  { stability: 4, health: 9, spirit: -3 },
    ASC: { health: 13, career: 11, social: 4 },
    DSC: { love: 6, social: 5, health: 5 },
  },
  jupiter: {
    MC:  { career: 13, money: 11, social: 9 },
    IC:  { stability: 11, money: 8, spirit: 9 },
    ASC: { money: 13, health: 8, spirit: 7 },
    DSC: { love: 8, money: 7, social: 11 },
  },
  saturn: {
    MC:  { career: 16, stability: 10, money: 6 },
    IC:  { stability: 15, health: -4, spirit: 5 },
    ASC: { career: 11, stability: 9, health: 4 },
    DSC: { stability: 10, love: -4, money: 8 },
  },
  uranus: {
    MC:  { career: 7, creativity: 12, social: 8 },
    IC:  { stability: -6, spirit: 9, creativity: 8 },
    ASC: { creativity: 13, social: 9, health: 4 },
    DSC: { social: 11, creativity: 9, love: 4 },
  },
  neptune: {
    MC:  { spirit: 13, creativity: 11, career: -3 },
    IC:  { spirit: 16, stability: -5, health: 5 },
    ASC: { spirit: 14, creativity: 11, health: 5 },
    DSC: { love: 11, spirit: 13, creativity: 8 },
  },
  pluto: {
    MC:  { career: 10, money: 9, spirit: 8 },
    IC:  { spirit: 13, stability: 5, health: 6 },
    ASC: { health: 8, spirit: 11, career: 7 },
    DSC: { love: 8, money: 11, spirit: 9 },
  },
  node: {
    MC:  { career: 8, social: 9, spirit: 9 },
    IC:  { stability: 8, spirit: 8, health: 5 },
    ASC: { spirit: 11, social: 9, health: 5 },
    DSC: { love: 9, spirit: 9, social: 9 },
  },
  chiron: {
    MC:  { career: 5, spirit: 8, health: 9 },
    IC:  { health: 13, spirit: 11, stability: 5 },
    ASC: { health: 13, spirit: 9, creativity: 5 },
    DSC: { love: 7, health: 9, spirit: 9 },
  },
  lilith: {
    MC:  { career: 5, creativity: 8, spirit: 7 },
    IC:  { spirit: 10, stability: -4, creativity: 7 },
    ASC: { creativity: 10, spirit: 8, love: 6 },
    DSC: { love: 10, spirit: 8, creativity: 7 },
  },
};

// ── Snapshot-интерфейсы ────────────────────────────────────────────────────────

/** Предварительно подготовленный снимок натальной карты для ACG-расчётов */
export interface NatalSnapshot {
  /** RAMC натальной карты (градусы, 0..360) */
  ramc: number;
  /** Натальная долгота рождения */
  natalLon: number;
  /** Натальная широта рождения */
  natalLat: number;
  /** Планеты с предвычисленными RA/Dec */
  planets: Record<string, { ra: number; dec: number; retro: boolean; lon: number }>;
  /** MC долгота эклиптики (для отображения) */
  mcLon: number;
}

/** Снимок транзитных планет на дату/период */
export interface TransitSnapshot {
  date: string;
  planets: Record<string, { ra: number; dec: number; retro: boolean; lon: number }>;
}

/** Одно попадание планеты на угол карты (ACG-хит) */
export interface AcgHit {
  planet: string;
  angle: 'MC' | 'IC' | 'ASC' | 'DSC';
  /** Расстояние от линии до города, градусы */
  orb: number;
  isNatal: boolean;
  isTransit: boolean;
  sphereImpact: Partial<Record<string, number>>;
}

/** Строит NatalSnapshot из данных NatalChart (из getRelocatedChart/getNatalChart).
 *  Принимает объект с полями planets: Record<string, {lon, dec, retrograde}> и houses: Record<string, {lon}> */
export function buildNatalSnapshot(
  chart: {
    planets: Record<string, { lon: number; dec: number; retrograde?: boolean }>;
    houses:  Record<string, { lon: number }>;
    metadata?: { lat?: number; lon?: number };
  },
  natalLat: number,
  natalLon: number,
): NatalSnapshot {
  // Houses are keyed as 'h1'..'h12' in the chart API response.
  // Fallback to bare '10' for compatibility with any legacy format.
  const h = chart.houses as Record<string, { lon?: number } | undefined>;
  const mcLon = h['h10']?.lon ?? h['10']?.lon ?? 0;
  const ramc  = _eclToEq(mcLon).ra;
  const planets: NatalSnapshot['planets'] = {};
  for (const [name, pd] of Object.entries(chart.planets)) {
    const eq = _eclToEq(pd.lon, 0);
    // Use backend dec if available and reasonable, else compute from ecliptic
    const dec = (typeof pd.dec === 'number' && Math.abs(pd.dec) <= 90) ? pd.dec : eq.dec;
    planets[name] = { ra: eq.ra, dec, retro: pd.retrograde ?? false, lon: pd.lon };
  }
  return { ramc, natalLon, natalLat, planets, mcLon };
}

/** Строит TransitSnapshot из ответа /predictive/transits или аналогичного.
 *  Принимает date и словарь {planet: {lon, dec?, retrograde?}} */
export function buildTransitSnapshot(
  date: string,
  rawPlanets: Record<string, { lon: number; dec?: number; retrograde?: boolean }>,
): TransitSnapshot {
  const planets: TransitSnapshot['planets'] = {};
  for (const [name, pd] of Object.entries(rawPlanets)) {
    if (typeof pd.lon !== 'number') continue;
    const eq  = _eclToEq(pd.lon, 0);
    const dec = (typeof pd.dec === 'number' && Math.abs(pd.dec) <= 90) ? pd.dec : eq.dec;
    planets[name] = { ra: eq.ra, dec, retro: pd.retrograde ?? false, lon: pd.lon };
  }
  return { date, planets };
}

// ── Основная функция вычисления ACG-бонуса ────────────────────────────────────
// Professional ACG orbs: 7° for natal lines, 5° for transit lines.
// Cosine-smooth orb decay with partile (<1°) bonus ×1.4.
// Retrograde planets: benefic effects muted ×0.75, stress effects amplified ×1.25.

/** Cosine-smooth orb factor: 1.0 at diff=0°, 0.0 at diff=maxOrb° */
function _acgOrbFactor(diff: number, maxOrb: number): number {
  if (diff >= maxOrb) return 0;
  return Math.cos((Math.PI / 2) * (diff / maxOrb));
}

function _computeAcgBonus(
  planets: Record<string, { ra: number; dec: number; retro?: boolean }>,
  ramc: number,
  natalLon: number,
  cityLat: number,
  cityLon: number,
  transitFactor: number,   // 1.0 для натальных, 0.55 для транзитных
  hitsOut: AcgHit[],
  isTransit: boolean,
): Partial<SphereBias> {
  const bonus: Partial<SphereBias> = {};
  // Professional standard: 7° natal, 5° transit
  const maxOrb = isTransit ? 5 : 7;

  for (const [pname, pd] of Object.entries(planets)) {
    const angleWeights = _PLANET_ANGLE_WEIGHTS[pname];
    if (!angleWeights) continue;

    const mcLon  = _mcLineLon(pd.ra, ramc, natalLon);
    const icLon  = _normAngle(mcLon + 180);
    const ascLon = _ascLineLon(pd.ra, pd.dec, ramc, natalLon, cityLat);
    const dscLon = ascLon !== null ? _normAngle(ascLon + 180) : null;

    const checks: Array<['MC' | 'IC' | 'ASC' | 'DSC', number | null]> = [
      ['MC', mcLon], ['IC', icLon], ['ASC', ascLon], ['DSC', dscLon],
    ];

    const isRetro = pd.retro ?? false;

    for (const [angle, lineLon] of checks) {
      if (lineLon === null) continue;
      const diff = Math.abs(_normAngle(cityLon - lineLon));
      if (diff >= maxOrb) continue;

      const orbFactor = _acgOrbFactor(diff, maxOrb);
      const partile   = diff < 1.0 ? 1.4 : 1.0;   // partile boost
      const weights   = angleWeights[angle] ?? {};

      const sphereImpact: Partial<Record<string, number>> = {};
      for (const [sk, w] of Object.entries(weights)) {
        const wNum = w as number;
        // Retrograde: beneficial weights muted, negative weights amplified
        const retroAdj = isRetro ? (wNum > 0 ? wNum * 0.75 : wNum * 1.25) : wNum;
        const contrib  = Math.round(retroAdj * orbFactor * partile * transitFactor);
        if (Math.abs(contrib) < 1) continue;
        bonus[sk as keyof SphereBias] = (bonus[sk as keyof SphereBias] ?? 0) + contrib;
        sphereImpact[sk] = contrib;
      }

      if (Object.keys(sphereImpact).length > 0) {
        hitsOut.push({
          planet: pname, angle, orb: Math.round(diff * 10) / 10,
          isNatal: !isTransit, isTransit, sphereImpact,
        });
      }
    }
  }
  return bonus;
}

// ── LOCAL OFFLINE SCORE ENGINE ────────────────────────────────────────────────
// Рассчитывает сферные баллы по городу.
// Базовый слой: city bias + широта + долгота.
// Точный слой (опционально): ACG от натальной карты + транзиты.

export interface LocalCityScore {
  city: CityEntry;
  sphereScores: Record<string, number>;
  overallScore: number;
  stayAdvice: StayPeriodAdvice[];
  topSpheres: string[];
  /** ACG-попадания если переданы снимки натальной/транзитной карты */
  acgHits: AcgHit[];
  /** Суммарный ACG-бонус от натала (для отображения) */
  natalAcgBonus: Partial<SphereBias>;
  /** Суммарный ACG-бонус от транзитов */
  transitAcgBonus: Partial<SphereBias>;
  /** Флаг: использована ли точная натальная карта */
  usedNatal: boolean;
  /** Флаг: использованы ли транзиты */
  usedTransit: boolean;
}

/** Climate/latitude zone effect on life spheres.
 *  Based on consistent patterns from relocation astrology practice:
 *  - Tropical (< 23.5°): vital energy, sensuality, spirituality
 *  - Sub-tropical (23.5–35°): creativity, social life, warmth
 *  - Mediterranean / temperate warm (35–45°): balance, moderate everything
 *  - Continental (45–55°): career focus, structure, inner work
 *  - Northern (> 55°): stability-seeking, spirit depth but health cost
 */
function _latModifier(lat: number): Partial<SphereBias> {
  const absLat = Math.abs(lat);
  const southPenalty = lat < 0 ? { stability: -1 } : {};  // southern hemisphere mild instability modifier
  if (absLat < 23.5) return { health: 5, spirit: 4, love: 4, creativity: 3, stability: -1, ...southPenalty };
  if (absLat < 30)   return { love: 5, creativity: 4, health: 3, social: 2, ...southPenalty };
  if (absLat < 35)   return { love: 4, creativity: 3, health: 3, social: 2, ...southPenalty };
  if (absLat < 45)   return { love: 3, creativity: 3, spirit: 2, career: 1 };
  if (absLat < 52)   return { career: 3, stability: 3, money: 2, health: 1 };
  if (absLat < 60)   return { stability: 4, career: 3, spirit: 3, health: -1 };
  return { stability: 3, spirit: 5, career: 2, health: -3, love: -2 };  // high north: tough but spiritual
}

/** Longitudinal macro-region character bonus.
 *  Reflects dominant cultural-economic spheres of each longitude band.
 */
function _lonPlanetBonus(lon: number): Partial<SphereBias> {
  // Americas (West)
  if (lon < -100) return { money: 3, career: 3, social: 2, stability: -1 };
  if (lon < -60)  return { love: 3, creativity: 3, money: 2, social: 2 };
  // Atlantic / Western Europe
  if (lon < 0)    return { love: 3, creativity: 3, stability: 2, social: 1 };
  // Europe / MENA
  if (lon < 30)   return { career: 2, stability: 3, creativity: 2, spirit: 1 };
  if (lon < 60)   return { spirit: 3, stability: 2, money: 2, career: 2 };
  // Central Asia / Middle East
  if (lon < 90)   return { money: 3, career: 3, stability: 2, spirit: 2 };
  // East Asia
  if (lon < 120)  return { career: 4, money: 3, social: 2, stability: 2 };
  if (lon < 145)  return { career: 3, money: 2, creativity: 2, social: 2 };
  // Pacific
  return { spirit: 3, health: 3, creativity: 2, social: 2 };
}

export function computeLocalCityScores(
  city: CityEntry,
  goal: string,
  stayDays: number,
  natal?: NatalSnapshot | null,
  transit?: TransitSnapshot | null,
): LocalCityScore {
  const BASE = 50;
  const bias = CITY_SPHERE_BIAS[city.nameRu] ?? {};
  const lm   = _latModifier(city.lat);
  const lp   = _lonPlanetBonus(city.lon);

  // Stay multiplier: progressive — short trips show only surface effects.
  // Smooth curve rather than step function to avoid cliff edges.
  const stayMult = stayDays <= 7  ? 0.25
                 : stayDays <= 21 ? 0.35 + (stayDays - 7)  / 14 * 0.15   // 0.35→0.50
                 : stayDays <= 90 ? 0.50 + (stayDays - 21) / 69 * 0.20   // 0.50→0.70
                 : stayDays <= 180 ? 0.70 + (stayDays - 90) / 90 * 0.15  // 0.70→0.85
                 : stayDays <= 365 ? 0.85 + (stayDays - 180) / 185 * 0.10 // 0.85→0.95
                 : 1.0;

  const acgHits: AcgHit[] = [];
  const natalAcgBonus: Partial<SphereBias>   = {};
  const transitAcgBonus: Partial<SphereBias> = {};

  // ── Натальный ACG-слой (полный вес 1.0) ──────────────────────────────────
  if (natal && Object.keys(natal.planets).length > 0) {
    const b = _computeAcgBonus(
      natal.planets, natal.ramc, natal.natalLon,
      city.lat, city.lon, 1.0, acgHits, false,
    );
    for (const [k, v] of Object.entries(b)) {
      natalAcgBonus[k as keyof SphereBias] = (natalAcgBonus[k as keyof SphereBias] ?? 0) + (v ?? 0);
    }
  }

  // ── Транзитный ACG-слой (вес 0.50 — текущие активации) ───────────────────
  if (transit && Object.keys(transit.planets).length > 0) {
    const b = _computeAcgBonus(
      transit.planets, natal?.ramc ?? 0, natal?.natalLon ?? city.lon,
      city.lat, city.lon, 0.50, acgHits, true,
    );
    for (const [k, v] of Object.entries(b)) {
      transitAcgBonus[k as keyof SphereBias] = (transitAcgBonus[k as keyof SphereBias] ?? 0) + (v ?? 0);
    }
  }

  const sphereScores: Record<string, number> = {};
  for (const sk of Object.keys(SPHERE_LABELS)) {
    const cityBias  = (bias[sk as keyof SphereBias] ?? 0);
    const latMod    = (lm[sk as keyof SphereBias]   ?? 0);
    const lonMod    = (lp[sk as keyof SphereBias]   ?? 0);
    // Goal-sphere gets a targeted bonus (city is being evaluated FOR this sphere)
    const goalBonus = sk === goal ? 6 : 0;

    // ── Layer 1: Heuristic base (city character + geography) ──────────────
    // Scaled by stayMult — longer stay lets city energy manifest more fully.
    const baseLayer = BASE + (cityBias + latMod + lonMod + goalBonus) * stayMult;

    // ── Layer 2: ACG natal lines (personal activation layer) ──────────────
    // Also scaled: natal lines deepen with immersion.
    const natalAcg = (natalAcgBonus[sk as keyof SphereBias] ?? 0) * stayMult;

    // ── Layer 3: Transit ACG (current timing window) ──────────────────────
    // NOT stay-scaled — transits are windows, not permanences.
    const transitAcg = (transitAcgBonus[sk as keyof SphereBias] ?? 0);

    const raw = baseLayer + natalAcg + transitAcg;
    sphereScores[sk] = Math.round(Math.min(96, Math.max(10, raw)));
  }

  // Overall score: weighted average with 2× weight on the chosen goal sphere.
  const goalScore  = sphereScores[goal] ?? BASE;
  const sphereKeys = Object.keys(SPHERE_LABELS);
  const total      = sphereKeys.reduce((acc, sk) => acc + (sphereScores[sk] ?? BASE), 0);
  const overallScore = Math.round(
    (total + goalScore * 2) / (sphereKeys.length + 2)
  );

  const topSpheres = Object.entries(sphereScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(e => e[0]);

  const stayAdvice = (SPHERE_STAY_ADVICE[goal] ?? SPHERE_STAY_ADVICE['career'])
    .filter(a => stayDays >= a.minDays * 0.5 || stayDays <= a.maxDays * 2);

  // Sort ACG hits: natal partile first, then by orb
  acgHits.sort((a, b) => {
    if (a.isNatal !== b.isNatal) return a.isNatal ? -1 : 1;
    return a.orb - b.orb;
  });

  return {
    city, sphereScores, overallScore, stayAdvice, topSpheres,
    acgHits, natalAcgBonus, transitAcgBonus,
    usedNatal: !!natal, usedTransit: !!transit,
  };
}

/**
 * Ранжирует все города по цели и длительности.
 * Принимает опциональные снимки натальной/транзитной карты.
 */
export function rankCitiesLocally(
  goal: string,
  stayDays: number,
  limit = 30,
  regionFilter?: string,
  natal?: NatalSnapshot | null,
  transit?: TransitSnapshot | null,
): LocalCityScore[] {
  const seen = new Set<string>();
  const uniqueCities = CITIES.filter(c => {
    if (seen.has(c.name + c.country)) return false;
    seen.add(c.name + c.country);
    return true;
  });
  return uniqueCities
    .filter(c => !regionFilter || c.region === regionFilter)
    .map(c => computeLocalCityScores(c, goal, stayDays, natal, transit))
    .sort((a, b) => b.sphereScores[goal] - a.sphereScores[goal])
    .slice(0, limit);
}

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
    ?? `Потенциал места для сферы «${goal}»: ${scoreLabel(score)}.`;
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
  key_planet_activations: Array<{ planet: string; planet_key?: string; angle: string; orb: number; sign?: string }>;
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
