#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SOLAR RETURN DEEP ANALYSIS ENGINE
====================================
Full solar return analysis by Pavel Andreev method with HOLOS extensions.

Features:
  - Deep natal × solar return overlay (priority house mapping)
  - Angular house activations with archetypes
  - City effect: ASC shift comparison for multiple observation points
  - HOLOS α-address and φ-node intersection
  - Lunar return calendar within the solar year
  - Planetary return coincidence detection (double/triple returns)
  - 12 statistical hypotheses for database validation

Usage:
  python astro_solar_return.py --natal-date 1979-08-12 --natal-time 13:29 \\
      --natal-lat 46.85 --natal-lon 29.61 --utc 3 --year 2026 \\
      --obs-lat 45.04 --obs-lon 38.98
  python astro_solar_return.py --natal-date 1979-08-12 --natal-time 13:29 \\
      --natal-lat 46.85 --natal-lon 29.61 --utc 3 --year 2026 --cities
"""

import argparse
import json
import math
from typing import Optional

from astro_engine import (
    jd, n360, deg_in_sign,
    calc_planets, calc_houses, sign_name, sign_glyph,
    planet_in_house, _angle_diff, SIGN_NAMES, sun as _sun,
)
from astro_predictive import lunar_return

# ═══════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════

ALPHA = 137.035999084          # golden angle in degrees
PHI   = 1.6180339887498948     # golden ratio (φ)

ANGULAR_HOUSES   = {1, 4, 7, 10}
SUCCEDENT_HOUSES = {2, 5, 8, 11}
CADENT_HOUSES    = {3, 6, 9, 12}

LUNAR_PERIOD_DAYS = 27.32      # sidereal lunar period

# ── Aspect table (name → (angle, max_orb)) ───────────────────────────────────
_SR_ASPECT_TABLE = {
    "conjunction":  (0,   8.0),
    "opposition":   (180, 8.0),
    "trine":        (120, 6.0),
    "square":       (90,  6.0),
    "sextile":      (60,  4.0),
    "quincunx":     (150, 3.0),
}
_SR_ASPECT_GLYPHS = {
    "conjunction": "☌", "opposition": "☍", "trine": "△",
    "square": "□", "sextile": "⚹", "quincunx": "⚻",
}

# ── Pavel Andreev: Planet archetypes when in 1st SR house ────────────────────
PLANET_IN_1ST_SR = {
    "sun":     {
        "архетип": "Год Я",
        "тема":    "Самовыражение, здоровье, идентичность на первом плане",
        "риск":    "Эгоцентризм, игнорирование партнёров",
        "шанс":    "Максимальное признание, личный бренд",
    },
    "moon":    {
        "архетип": "Год Эмоций",
        "тема":    "Семья, внутренние потребности, публичные отклики",
        "риск":    "Нестабильность, реактивность",
        "шанс":    "Близость с аудиторией, материнство/отцовство",
    },
    "mercury": {
        "архетип": "Год Слова",
        "тема":    "Коммуникации, обучение, переговоры",
        "риск":    "Рассеянность, поверхностность",
        "шанс":    "Писательство, выступления, обучение",
    },
    "venus":   {
        "архетип": "Год Сердца",
        "тема":    "Отношения, красота, финансы через партнёрство",
        "риск":    "Пассивность, зависимость от чужой оценки",
        "шанс":    "Любовь, творческий расцвет, популярность",
    },
    "mars":    {
        "архетип": "Год Действия",
        "тема":    "Инициатива, конкуренция, физическая активность",
        "риск":    "Конфликты, травмы, импульсивность",
        "шанс":    "Достижения через прямое действие, лидерство",
    },
    "jupiter": {
        "архетип": "Год Роста",
        "тема":    "Расширение, возможности, международные контакты",
        "риск":    "Самонадеянность, переоценка сил",
        "шанс":    "Удача, рост статуса, путешествия",
    },
    "saturn":  {
        "архетип": "Год Работы",
        "тема":    "Структурирование, ответственность, долгосрочное",
        "риск":    "Ограничения, усталость, изоляция",
        "шанс":    "Фундаментальные достижения, профессионализм",
    },
    "uranus":  {
        "архетип": "Год Перемен",
        "тема":    "Неожиданные события, революция, свобода",
        "риск":    "Непредсказуемость, разрывы",
        "шанс":    "Прорыв, инновация, новый образ",
    },
    "neptune": {
        "архетип": "Год Трансценденции",
        "тема":    "Духовность, искусство, тонкие материи",
        "риск":    "Иллюзии, туман, потеря ориентиров",
        "шанс":    "Творчество, медитация, растворение границ",
    },
    "pluto":   {
        "архетип": "Год Трансформации",
        "тема":    "Глубинные изменения, власть, кризис и возрождение",
        "риск":    "Разрушения, манипуляции, потери",
        "шанс":    "Полное обновление, выход на новый уровень",
    },
}

# ── SR Sun in SR house — year theme ──────────────────────────────────────────
SUN_IN_HOUSE_SR = {
    1:  "Год личного старта. Тело, имидж, самопрезентация",
    2:  "Год денег. Заработок, ценности, имущество",
    3:  "Год коммуникаций. Учёба, переезды, связи, IT",
    4:  "Год дома. Семья, корни, недвижимость",
    5:  "Год творчества. Дети, любовь, риск",
    6:  "Год труда. Работа, здоровье, рутина",
    7:  "Год партнёрства. Брак, договоры, открытые враги",
    8:  "Год трансформации. Кризис, сексуальность, чужие ресурсы",
    9:  "Год расширения. Путешествия, образование, философия, экспертиза",
    10: "Год карьеры. Статус, репутация, публичность",
    11: "Год сообщества. Команда, планы, мечты, аудитория",
    12: "Год уединения. Откаты, тайны, духовная работа",
}

# ── Pavel Andreev priority order ─────────────────────────────────────────────
PRIORITY_ORDER = [
    "1. АСЦ соляра → натальный дом (главная сфера года)",
    "2. Планеты в угловых домах соляра (1,4,7,10)",
    "3. МС соляра → натальный дом (карьерный вектор)",
    "4. Солнце соляра в доме соляра (тема самовыражения)",
    "5. Луна соляра (эмоциональный фон, потребности)",
    "6. Управитель АСЦ соляра (как реализуется главная тема)",
    "7. Аспекты планет соляра к натальным (активации)",
    "8. Планеты соляра в натальных домах (зоны активности)",
]

# ── Planetary return periods (years) ─────────────────────────────────────────
_RETURN_PERIODS = {
    "mercury": 0.317,   # ~116 days
    "venus":   0.616,   # ~225 days
    "mars":    2.135,   # ~780 days
    "jupiter": 11.862,
    "saturn":  29.457,
    "uranus":  84.01,
    "neptune": 164.79,
    "pluto":   248.09,
}
_RETURN_NAMES_RU = {
    "mercury": "Меркурий-ретурн",
    "venus":   "Венера-ретурн",
    "mars":    "Марс-ретурн",
    "jupiter": "Юпитер-ретурн",
    "saturn":  "Сатурн-ретурн",
    "uranus":  "Уран-ретурн",
    "neptune": "Нептун-ретурн",
    "pluto":   "Плутон-ретурн",
}

# ── Sign rulers (modern) ──────────────────────────────────────────────────────
SIGN_RULERS = {
    "aries": "mars",       "taurus": "venus",     "gemini": "mercury",
    "cancer": "moon",      "leo": "sun",           "virgo": "mercury",
    "libra": "venus",      "scorpio": "pluto",     "sagittarius": "jupiter",
    "capricorn": "saturn", "aquarius": "uranus",   "pisces": "neptune",
}

# ── Sphere labels — human-readable names for natal houses ────────────────────
SPHERE_LABELS = {
    1:  "личность и имидж",       2:  "финансы и ресурсы",
    3:  "коммуникации и IT",      4:  "дом и семья",
    5:  "творчество и любовь",    6:  "труд и здоровье",
    7:  "партнёрство",            8:  "трансформация",
    9:  "путешествия и развитие", 10: "карьера и статус",
    11: "сообщество и планы",     12: "духовность и тайны",
}

# ── Sphere keyword → natal house (for target_sphere API parameter) ────────────
SPHERE_KEYWORDS_EN = {
    "self": 1, "identity": 1, "image": 1, "personality": 1, "health": 1,
    "money": 2, "finance": 2, "resources": 2, "income": 2, "wealth": 2,
    "communication": 3, "it": 3, "learning": 3, "writing": 3, "education_short": 3,
    "home": 4, "family": 4, "roots": 4, "property": 4, "real_estate": 4,
    "creativity": 5, "love": 5, "children": 5, "fun": 5, "romance": 5,
    "work": 6, "routine": 6, "service": 6, "health_body": 6,
    "partnership": 7, "marriage": 7, "contracts": 7, "relationship": 7, "business_partner": 7,
    "transformation": 8, "crisis": 8, "inheritance": 8, "depth": 8, "investing": 8,
    "travel": 9, "philosophy": 9, "education": 9, "abroad": 9, "spirituality_high": 9,
    "career": 10, "status": 10, "reputation": 10, "ambition": 10, "public": 10,
    "community": 11, "goals": 11, "social": 11, "friends": 11, "audience": 11,
    "spirituality": 12, "secrets": 12, "solitude": 12, "retreat": 12, "hidden": 12,
}

# ── Moon in each SR house — full descriptions ─────────────────────────────────
MOON_IN_HOUSE_SR_FULL = {
    1:  "Год народного контакта и личного отклика. Ваши настроения заражают окружающих — "
        "используйте это для публичности и работы с аудиторией.",
    2:  "Нестабильные финансы, интуитивный заработок. Сильная связь эмоций и денег — "
        "избегайте эмоциональных трат. Доход приходит через интуицию.",
    3:  "Эмоциональные коммуникации, частые поездки, насыщенные встречи. "
        "Слова имеют особый эмоциональный вес — пишите, говорите, делитесь.",
    4:  "Сильная тема дома и семьи. Переживания связаны с близкими и жильём. "
        "Год психологической работы с корнями и внутренним пространством.",
    5:  "Эмоциональный творческий расцвет, чувственные отношения. "
        "Хороший год для творчества, романтики и радости жизни.",
    6:  "Переменчивое самочувствие, тело говорит через симптомы. "
        "Внимание к режиму, питанию, сну. Рутина должна быть приятной.",
    7:  "Эмоции через партнёров, чуткость к другому человеку. "
        "Отношения требуют эмоциональной зрелости и не-слияния.",
    8:  "Глубинные, трансформирующие переживания. Скрытые страхи и желания выходят на поверхность. "
        "Год честной работы с тенью.",
    9:  "Эмоциональная тяга к путешествиям и знаниям. Интуиция открыта. "
        "Год духовной мудрости, странствий и философских открытий.",
    10: "Публичный образ связан с чувствами. Карьера требует эмоциональной включённости. "
        "Хороший год для работы с аудиторией и публичных выступлений.",
    11: "Эмоции через коллектив и мечты. Широкий народный контакт, "
        "но нестабильность ближнего круга. Год обретения аудитории.",
    12: "Эмоции уходят в тень, внутренняя работа, уединение. "
        "Публично не год для чувств — это год тайной работы с собой.",
}

# ── Deep house themes for Priority 1 & 3 (full descriptions) ─────────────────
HOUSE_THEMES_DEEP = {
    1:  {
        "title":   "личность и самовыражение",
        "body":    "Этот год — про вас лично. Мир поворачивается к вашей личности, внешности, имиджу и "
                   "физическому телу. Всё что вы делаете для себя — работает. Личный бренд, новый образ, "
                   "открытый старт — в фокусе.",
        "focus":   "Обновите образ. Заявите о себе публично. Запустите личный проект. Тело и здоровье — приоритет.",
        "avoid":   "Не уходите в тень. Избегайте жертвенности в ущерб себе.",
        "career":  "Карьера продвигается через личную видимость и прямое действие.",
    },
    2:  {
        "title":   "финансы и личные ресурсы",
        "body":    "Деньги, имущество и самооценка — главные темы года. Возможны изменения в доходах, "
                   "появление новых ресурсов или переоценка того, что для вас ценно.",
        "focus":   "Инвестируйте. Создавайте финансовые потоки. Определите жизненные ценности.",
        "avoid":   "Не транжирьте — каждая трата и приобретение этого года имеет долгосрочный вес.",
        "career":  "Работа должна давать ощутимый материальный результат.",
    },
    3:  {
        "title":   "коммуникации и интеллект",
        "body":    "Год слов, связей и информации. Обучение, написание, переговоры, ближние поездки. "
                   "Ваш голос и экспертиза важны. IT, социальные сети, медиа — в центре.",
        "focus":   "Учитесь, пишите, общайтесь. Создавайте контент. Развивайте навыки.",
        "avoid":   "Не распыляйтесь — год может соблазнить поверхностностью.",
        "career":  "Карьера продвигается через знания, публикации и переговоры.",
    },
    4:  {
        "title":   "дом и семья",
        "body":    "Год корней и внутреннего пространства. Семья, жильё, психологические основы, "
                   "переезды и родовые темы в центре внимания.",
        "focus":   "Решите жилищный вопрос. Восстановите семейные связи. Обустройте базу.",
        "avoid":   "Внешние достижения требуют больших усилий — работайте изнутри.",
        "career":  "Работа из дома или семейный бизнес получат развитие.",
    },
    5:  {
        "title":   "творчество и удовольствие",
        "body":    "Год радости, риска и творческого расцвета. Дети, романтика, хобби, "
                   "азарт — всё что делает жизнь яркой. Год для рождения чего-то нового.",
        "focus":   "Создавайте. Влюбляйтесь. Рискуйте. Выражайте себя через творчество.",
        "avoid":   "Не укрывайтесь от жизни — этот год требует участия, игры, риска.",
        "career":  "Творческие проекты, искусство, работа с детьми или развлечениями — в фокусе.",
    },
    6:  {
        "title":   "труд и здоровье",
        "body":    "Год рабочей рутины, дисциплины и заботы о теле. Качество повседневной жизни, "
                   "режим, здоровье и совершенствование в работе — главные темы.",
        "focus":   "Выстройте режим. Займитесь здоровьем. Шлифуйте мастерство.",
        "avoid":   "Не игнорируйте сигналы тела и усталость — тело говорит в этот год.",
        "career":  "Профессиональный рост через качество, детальность и сервис.",
    },
    7:  {
        "title":   "партнёрство и союзы",
        "body":    "Год другого человека. Отношения, контракты, союзы — "
                   "всё что связано с 'ты' (а не 'я') будет в центре.",
        "focus":   "Инвестируйте в партнёрство. Заключите договоры. Найдите союзника.",
        "avoid":   "Не теряйте себя в угоду другому — соблюдайте баланс 'я' и 'ты'.",
        "career":  "Деловые партнёрства и совместные проекты дают максимальный результат.",
    },
    8:  {
        "title":   "трансформация и чужие ресурсы",
        "body":    "Год кризисов, глубинных изменений и работы с чужими ресурсами. "
                   "Наследство, инвестиции, психология, сексуальность, смерть и возрождение.",
        "focus":   "Трансформируйтесь. Разберитесь с долгами и наследством. Занимайтесь психологией.",
        "avoid":   "Держитесь за то, что по-настоящему важно — кризис очищает, а не разрушает.",
        "career":  "Работа в сфере финансов, психологии, медицины или кризис-менеджмента.",
    },
    9:  {
        "title":   "расширение и мировоззрение",
        "body":    "Год путешествий, высшего образования, философии и международных связей. "
                   "Горизонты расширяются — пространственно и интеллектуально.",
        "focus":   "Путешествуйте. Учитесь. Публикуйте экспертные материалы. Выходите на международный уровень.",
        "avoid":   "Не замыкайтесь в привычном — этот год требует выхода за границы.",
        "career":  "Международная деятельность, обучение, издательство, экспертные медиа.",
    },
    10: {
        "title":   "карьера и общественный статус",
        "body":    "Год карьеры и публичного признания. Ваша репутация, профессиональные достижения "
                   "и место в обществе — в центре внимания. Год максимальной видимости.",
        "focus":   "Выходите в публичное пространство. Берите ответственность за результат. Стройте репутацию.",
        "avoid":   "Не прячьтесь — вас будут видеть. Работайте над качеством публичного образа.",
        "career":  "Это год карьерной вершины. Решения этого года имеют долгосрочный вес.",
    },
    11: {
        "title":   "сообщество и планирование",
        "body":    "Год команды, мечтаний и социальных связей. Ваша аудитория, круг единомышленников, "
                   "долгосрочные цели и коллективные проекты — в центре.",
        "focus":   "Стройте сеть. Определите долгосрочные цели. Работайте на аудиторию.",
        "avoid":   "Не работайте в одиночку — этот год требует синергии.",
        "career":  "Проекты с командой и на широкую аудиторию дают максимальный отклик.",
    },
    12: {
        "title":   "уединение и духовная работа",
        "body":    "Год тайны и внутреннего пространства. Духовная практика, психотерапия, "
                   "уединение, работа за кулисами и трансформация скрытых паттернов.",
        "focus":   "Медитируйте. Обратитесь к психологу. Работайте над тайными проектами.",
        "avoid":   "Не выходите на публику до готовности — этот год готовит почву.",
        "career":  "Исследования, духовная практика, работа с уязвимыми группами — в фокусе.",
    },
}

# ── Planet archetypes in angular SR houses 4, 7, 10 ─────────────────────────
PLANET_IN_4TH_SR = {
    "sun":     {"архетип": "Год Дома", "тема": "Семья, корни, переезд", "шанс": "Создание дома мечты", "риск": "Поглощённость бытом"},
    "moon":    {"архетип": "Год Матери", "тема": "Эмоциональные корни, уход, семья", "шанс": "Укрепление семейных уз", "риск": "Эмоциональная зависимость от семьи"},
    "mercury": {"архетип": "Год Семейных Переговоров", "тема": "Документы на жильё, ремонт, семья", "шанс": "Решение жилищных вопросов", "риск": "Бытовые конфликты"},
    "venus":   {"архетип": "Год Семейной Гармонии", "тема": "Красота дома, покупка жилья", "шанс": "Гармония в семье", "риск": "Финансы привязаны к жилью"},
    "mars":    {"архетип": "Год Переезда", "тема": "Активные изменения дома, ремонт", "шанс": "Радикальная трансформация жилья", "риск": "Семейные конфликты"},
    "jupiter": {"архетип": "Год Расширения Семьи", "тема": "Пополнение семьи, покупка жилья", "шанс": "Удача через дом и семью", "риск": "Переоценка семейных ресурсов"},
    "saturn":  {"архетип": "Год Семейной Ответственности", "тема": "Уход за родителями, обязательства дома", "шанс": "Долгосрочный семейный фундамент", "риск": "Тяжёлые домашние обязательства"},
    "uranus":  {"архетип": "Год Неожиданного Переезда", "тема": "Внезапные семейные изменения", "шанс": "Обновление базы, свобода от прошлого", "риск": "Нестабильность, разрывы в семье"},
    "neptune": {"архетип": "Год Семейной Духовности", "тема": "Тайны предков, духовность дома", "шанс": "Духовное понимание корней", "риск": "Иллюзии или обманы в семье"},
    "pluto":   {"архетип": "Год Трансформации Рода", "тема": "Глубинные изменения в семейной системе", "шанс": "Освобождение от родовых программ", "риск": "Конфликты с корнями"},
}
PLANET_IN_7TH_SR = {
    "sun":     {"архетип": "Год Партнёра", "тема": "Отношения на первом плане", "шанс": "Брак или сильное деловое партнёрство", "риск": "Потеря собственного 'я'"},
    "moon":    {"архетип": "Год Эмоциональной Связи", "тема": "Чуткость к партнёру, эмоциональный союз", "шанс": "Глубокая эмоциональная близость", "риск": "Созависимость"},
    "mercury": {"архетип": "Год Переговоров", "тема": "Контракты, деловые союзы", "шанс": "Успешные договорённости", "риск": "Поверхностные связи"},
    "venus":   {"архетип": "Год Любви", "тема": "Романтика, красота отношений", "шанс": "Брак или яркие романтические отношения", "риск": "Идеализация партнёра"},
    "mars":    {"архетип": "Год Открытого Противостояния", "тема": "Конкуренция, конфликты, защита интересов", "шанс": "Сильный союзник-борец", "риск": "Открытые конфликты и расставания"},
    "jupiter": {"архетип": "Год Удачного Союза", "тема": "Расширение через партнёров", "шанс": "Мощный и удачный союз", "риск": "Слишком много претендентов"},
    "saturn":  {"архетип": "Год Серьёзных Обязательств", "тема": "Формализация отношений", "шанс": "Прочный долгосрочный союз", "риск": "Ограничения в отношениях"},
    "uranus":  {"архетип": "Год Свободных Связей", "тема": "Нестандартные отношения, неожиданные разрывы", "шанс": "Свобода и обновление в партнёрстве", "риск": "Неожиданные разрывы"},
    "neptune": {"архетип": "Год Духовного Партнёра", "тема": "Идеальный партнёр, творческий союз", "шанс": "Духовная близость", "риск": "Иллюзии о партнёре, обман"},
    "pluto":   {"архетип": "Год Трансформации Союза", "тема": "Глубинные изменения в ключевых отношениях", "шанс": "Мощное обновление союза", "риск": "Власть и манипуляции в паре"},
}
PLANET_IN_10TH_SR = {
    "sun":     {"архетип": "Год Карьерного Расцвета", "тема": "Максимальная публичность и признание", "шанс": "Пик карьеры", "риск": "Трудоголизм"},
    "moon":    {"архетип": "Год Публичного Образа", "тема": "Народная любовь, публичность через эмоции", "шанс": "Широкая аудитория", "риск": "Эмоциональные карьерные решения"},
    "mercury": {"архетип": "Год Экспертного Слова", "тема": "Авторитет через знания и выступления", "шанс": "Признание через слово", "риск": "Рассеянность в карьере"},
    "venus":   {"архетип": "Год Карьерного Очарования", "тема": "Успех через красоту, обаяние, творчество", "шанс": "Карьера в искусстве/красоте", "риск": "Завышенные ожидания"},
    "mars":    {"архетип": "Год Карьерного Прорыва", "тема": "Активное достижение, конкуренция, лидерство", "шанс": "Карьерный прорыв", "риск": "Конфликты с вышестоящими"},
    "jupiter": {"архетип": "Год Карьерного Взлёта", "тема": "Повышение, расширение, международные контакты", "шанс": "Значительный карьерный рост", "риск": "Самонадеянность"},
    "saturn":  {"архетип": "Год Карьерного Итога", "тема": "Ответственность, профессионализм", "шанс": "Заслуженный долгосрочный успех", "риск": "Тяжёлая нагрузка, ограничения"},
    "uranus":  {"архетип": "Год Карьерной Революции", "тема": "Внезапные карьерные перемены", "шанс": "Инновационный карьерный путь", "риск": "Нестабильность, потеря позиции"},
    "neptune": {"архетип": "Год Карьерного Вдохновения", "тема": "Творческая карьера, духовная деятельность", "шанс": "Вдохновенная смысловая работа", "риск": "Туман в карьерных целях"},
    "pluto":   {"архетип": "Год Карьерной Трансформации", "тема": "Глубинные карьерные изменения, власть", "шанс": "Трансформация в топ", "риск": "Потеря статуса, разрушение"},
}

_ANGULAR_ARCHETYPES = {1: PLANET_IN_1ST_SR, 4: PLANET_IN_4TH_SR, 7: PLANET_IN_7TH_SR, 10: PLANET_IN_10TH_SR}

# ── Element / modality for dominant quality analysis ─────────────────────────
_SIGN_ELEMENT = {
    "aries": "fire",  "leo": "fire",  "sagittarius": "fire",
    "taurus": "earth", "virgo": "earth", "capricorn": "earth",
    "gemini": "air",  "libra": "air",  "aquarius": "air",
    "cancer": "water", "scorpio": "water", "pisces": "water",
}
_SIGN_MODALITY = {
    "aries": "cardinal",  "cancer": "cardinal", "libra": "cardinal",  "capricorn": "cardinal",
    "taurus": "fixed",    "leo": "fixed",       "scorpio": "fixed",   "aquarius": "fixed",
    "gemini": "mutable",  "virgo": "mutable",   "sagittarius": "mutable", "pisces": "mutable",
}
_ELEMENT_RU  = {"fire": "Огонь", "earth": "Земля", "air": "Воздух", "water": "Вода"}
_MODALITY_RU = {"cardinal": "Кардинальная", "fixed": "Фиксированная", "mutable": "Мутабельная"}


# ═══════════════════════════════════════════════════════════════════════════
# CORRECT SOLAR RETURN FINDER (fixes anti-return bug in astro_predictive)
# ═══════════════════════════════════════════════════════════════════════════

def _calc_solar_return(natal_jd_utc: float, return_year: int, obs_lat: float, obs_lon: float, houses_system: str = "placidus") -> dict:
    """Find solar return for return_year, starting search near the natal birthday month.

    astro_predictive.solar_return() has a bug: it starts from Jan 1 and finds the
    anti-return (Sun 180° from natal) when natal Sun is in summer signs.  This
    function starts the binary-search near the estimated birthday date.
    """
    natal_sun_lon = _sun(natal_jd_utc)[0]

    # Estimate the approximate calendar day-of-year of the natal Sun crossing
    # by using the reference date (natal_jd itself).  Convert JD → calendar.
    import math
    # JD 2451545.0 = J2000.0 = 2000-01-01 12:00 UTC
    DAYS_PER_YEAR = 365.25
    # Approximate tropical year progress for natal date
    # We just need an approximate start for the binary search: use natal birthday
    # in return_year.  Julian day for noon on birthday in return_year:
    # Extract approximate birth month/day from natal_jd
    # Use the known formula: JD 2451545.0 = 2000-01-01.5 UTC
    ref_jd = 2451545.0  # 2000-01-01.5 UTC
    # Days from 2000-01-01 to natal date
    d = natal_jd_utc - ref_jd
    # Approximate year
    y_approx = 2000 + d / DAYS_PER_YEAR
    frac = y_approx - int(y_approx)
    # Day-of-year for natal (0-365)
    doy = frac * DAYS_PER_YEAR

    # Build a seed JD: Jan 1 of return_year + doy, adjusted for return_year's
    # actual leap status, minus 10 days safety margin.
    # Simpler: just start search from (natal_jd + (return_year - natal_year) * 365.25 - 10)
    natal_year_approx = int(y_approx)
    seed_jd = natal_jd_utc + (return_year - natal_year_approx) * DAYS_PER_YEAR - 10.0

    def sun_diff(t):
        s = n360(_sun(t)[0] - natal_sun_lon)
        return s - 360 if s > 180 else s

    # Step forward in 5-day increments to bracket the zero crossing
    t0 = seed_jd
    d0 = sun_diff(t0)
    bracket = None
    for _ in range(100):
        t1 = t0 + 5.0
        d1 = sun_diff(t1)
        if d0 * d1 < 0:
            bracket = (t0, t1)
            break
        t0, d0 = t1, d1

    if bracket is None:
        # Fallback: try wider window
        from astro_predictive import solar_return as _fallback_sr
        return _fallback_sr(natal_jd_utc, return_year, obs_lat, obs_lon, houses_system)

    # Binary search within bracket
    lo, hi = bracket
    for _ in range(60):
        mid = (lo + hi) / 2
        if sun_diff(lo) * sun_diff(mid) <= 0:
            hi = mid
        else:
            lo = mid
        if hi - lo < 1e-6:
            break

    sr_jd = (lo + hi) / 2

    # Build result dict matching astro_predictive.solar_return() format
    sr_planets_raw = calc_planets(sr_jd)
    sr_houses_raw = calc_houses(sr_jd, obs_lat, obs_lon, houses_system)

    from astro_engine import deg_in_sign as _deg, sign_name as _sgn, sign_glyph as _glyph

    def _fmt(lon_val):
        d_val = _deg(lon_val)
        d_int = int(d_val)
        m_int = int((d_val - d_int) * 60)
        return {"lon": round(lon_val, 4), "sign": _sgn(lon_val), "deg_min": f"{d_int}°{m_int:02d}'"}

    planets_out = {k: _fmt(v) for k, v in sr_planets_raw.items()}
    houses_out = {k: _fmt(v) for k, v in sr_houses_raw.items()}

    # Format date string
    total_secs = round((sr_jd - 0.5) % 1 * 86400)
    hh = total_secs // 3600
    mm = (total_secs % 3600) // 60
    # Calendar from JD
    import math as _math
    jd_int = int(sr_jd + 0.5)
    f = sr_jd + 0.5 - jd_int
    if jd_int >= 2299161:
        alpha = int((jd_int - 1867216.25) / 36524.25)
        A = jd_int + 1 + alpha - alpha // 4
    else:
        A = jd_int
    B = A + 1524
    C = int((B - 122.1) / 365.25)
    D = int(365.25 * C)
    E = int((B - D) / 30.6001)
    day = B - D - int(30.6001 * E)
    month = E - 1 if E < 14 else E - 13
    year = C - 4716 if month > 2 else C - 4715
    sr_date_str = f"{year:04d}-{month:02d}-{day:02d} {hh:02d}:{mm:02d} UTC"

    return {
        "type": "solar_return",
        "sr_date_utc": sr_date_str,
        "sr_jd": round(sr_jd, 4),
        "sr_sun_lon": round(natal_sun_lon, 4),
        "natal_sun_lon": round(natal_sun_lon, 4),
        "planets": planets_out,
        "houses": houses_out,
    }


# ═══════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def _fmt_lon(lon: float) -> str:
    """Format longitude as 'Знак DD°MM''."""
    g = sign_glyph(lon)
    n = sign_name(lon).capitalize()
    d = deg_in_sign(lon)
    dm = int(d); sm = int((d - dm) * 60)
    return f"{g}{n} {dm}°{sm:02d}'"


def _fmt_house_lon(lon_or_dict) -> float:
    """Extract float longitude from either a plain float or {'lon': float} dict."""
    if isinstance(lon_or_dict, dict):
        return float(lon_or_dict.get("lon", 0))
    return float(lon_or_dict)


def _raw_houses(houses_raw_or_formatted: dict) -> dict:
    """Normalise house dict to {h1: float, h2: float, ...}."""
    out = {}
    for k, v in houses_raw_or_formatted.items():
        out[k] = _fmt_house_lon(v)
    return out


def _raw_planets(planets_formatted: dict) -> dict:
    """Extract {planet: lon} from formatted planet dict."""
    out = {}
    for p, v in planets_formatted.items():
        if isinstance(v, dict):
            out[p] = float(v.get("lon", 0))
        else:
            out[p] = float(v)
    return out


def _jd_to_date_str(jd_val: float) -> str:
    """Meeus JD → 'YYYY-MM-DD' string."""
    Z = math.floor(jd_val + 0.5)
    F = jd_val + 0.5 - Z
    if Z < 2299161:
        A = Z
    else:
        alpha = math.floor((Z - 1867216.25) / 36524.25)
        A = Z + 1 + alpha - math.floor(alpha / 4)
    B = A + 1524
    C = math.floor((B - 122.1) / 365.25)
    D = math.floor(365.25 * C)
    E = math.floor((B - D) / 30.6001)
    day   = int(B - D - math.floor(30.6001 * E))
    month = E - 1 if E < 14 else E - 13
    year  = C - 4716 if month > 2 else C - 4715
    return f"{int(year):04d}-{int(month):02d}-{day:02d}"


def _house_nr(lon: float, raw_houses: dict) -> int:
    """House number (1-12) for a given longitude using calc_houses() raw output."""
    return planet_in_house(lon, raw_houses)


def _asc_ruler(asc_lon: float) -> str:
    """Return the modern ruler planet name for the given ASC sign."""
    return SIGN_RULERS.get(sign_name(asc_lon), "sun")


def _dominant_quality(planets_raw: dict) -> dict:
    """Compute dominant element and modality across SR chart planets."""
    elements  = {"fire": 0, "earth": 0, "air": 0, "water": 0}
    modalities = {"cardinal": 0, "fixed": 0, "mutable": 0}
    skip = {"node", "chiron", "lilith"}
    for planet, lon in planets_raw.items():
        if planet in skip:
            continue
        s = sign_name(float(lon))
        if s in _SIGN_ELEMENT:
            elements[_SIGN_ELEMENT[s]] += 1
        if s in _SIGN_MODALITY:
            modalities[_SIGN_MODALITY[s]] += 1
    dom_el  = max(elements,   key=elements.get)
    dom_mod = max(modalities, key=modalities.get)
    return {
        "dominant_element":  dom_el,
        "dominant_modality": dom_mod,
        "element_ru":        _ELEMENT_RU.get(dom_el, dom_el),
        "modality_ru":       _MODALITY_RU.get(dom_mod, dom_mod),
        "elements":          elements,
        "modalities":        modalities,
        "description": (
            f"Доминирующая стихия соляра: {_ELEMENT_RU.get(dom_el, dom_el)} | "
            f"Модальность: {_MODALITY_RU.get(dom_mod, dom_mod)}"
        ),
    }


def _build_sphere_map(
    sr_asc_lon: float, sr_mc_lon: float,
    sr_sun_lon: float, sr_moon_lon: float,
    natal_houses_raw: dict,
) -> dict:
    """Build a sphere-activation map showing which natal house each SR angle/planet activates."""
    asc_h  = _house_nr(sr_asc_lon,  natal_houses_raw)
    mc_h   = _house_nr(sr_mc_lon,   natal_houses_raw)
    sun_h  = _house_nr(sr_sun_lon,  natal_houses_raw)
    moon_h = _house_nr(sr_moon_lon, natal_houses_raw)
    return {
        "asc_natal_house":       asc_h,
        "mc_natal_house":        mc_h,
        "sun_natal_house":       sun_h,
        "moon_natal_house":      moon_h,
        "primary_sphere":        SPHERE_LABELS.get(asc_h, ""),
        "career_sphere":         SPHERE_LABELS.get(mc_h, ""),
        "sun_sphere":            SPHERE_LABELS.get(sun_h, ""),
        "moon_sphere":           SPHERE_LABELS.get(moon_h, ""),
        "summary": (
            f"АСЦ → {asc_h}й дом ({SPHERE_LABELS.get(asc_h, '')}), "
            f"МС → {mc_h}й дом ({SPHERE_LABELS.get(mc_h, '')}), "
            f"Солнце → {sun_h}й дом ({SPHERE_LABELS.get(sun_h, '')})"
        ),
    }


# ═══════════════════════════════════════════════════════════════════════════
# DETECT PLANETARY RETURNS
# ═══════════════════════════════════════════════════════════════════════════

def detect_planetary_returns(
    natal_planets: dict,
    sr_planets: dict,
    orb: float = 12.0,
) -> list:
    """
    Detect which planets are near their natal position at the SR moment.
    Only meaningful for slow-moving planets (Mars and outer).

    Categories:
      exact:      orb < 2°  — planet has returned to its natal degree
      close:      orb < 5°  — near-exact return
      approaching: orb < 12° — in same neighbourhood (same sign / adjacent)

    Returns list sorted by orb ascending.
    """
    results = []
    for planet, period in _RETURN_PERIODS.items():
        n_lon = natal_planets.get(planet)
        s_lon = sr_planets.get(planet)
        if n_lon is None or s_lon is None:
            continue
        diff = _angle_diff(float(n_lon), float(s_lon))
        if diff > orb:
            continue
        category = "exact" if diff < 2 else "close" if diff < 5 else "approaching"
        if category == "approaching":
            desc = (
                f"{_RETURN_NAMES_RU.get(planet, planet)} (приближение): "
                f"планета движется к натальной позиции, орб {round(diff, 1)}°. "
                f"Год активации {sign_name(float(n_lon)).capitalize()}-темы планеты."
            )
        else:
            desc = (
                f"{_RETURN_NAMES_RU.get(planet, planet)}: "
                f"орб {round(diff, 1)}° — планета вернулась в свою натальную позицию "
                f"({_fmt_lon(float(n_lon))}). Двойной возврат внутри соляра."
            )
        results.append({
            "planet":       planet,
            "name_ru":      _RETURN_NAMES_RU.get(planet, planet),
            "natal_lon":    round(float(n_lon), 2),
            "sr_lon":       round(float(s_lon), 2),
            "natal_sign":   sign_name(float(n_lon)),
            "sr_sign":      sign_name(float(s_lon)),
            "orb":          round(diff, 2),
            "category":     category,
            "period_years": period,
            "is_exact":     diff < 2.0,
            "description":  desc,
        })
    return sorted(results, key=lambda x: x["orb"])


# ═══════════════════════════════════════════════════════════════════════════
# HOLOS α / φ INTERSECTION
# ═══════════════════════════════════════════════════════════════════════════

def solar_holos_intersection(
    sr_asc_lon:  float,
    natal_asc_lon: float,
    orb: float = 5.0,
) -> dict:
    """
    Check if SR ASC falls on an α-address or φ-node derived from natal ASC.
    Hypothesis SR-8: when SR ASC hits an α-address year = HOLOS-powered year.

    α-addresses: natal_asc + ALPHA/n * 30 (mod 360), n=1..50
    φ-nodes:     natal_asc + PHI^n * 10  (mod 360), n=1..15
    """
    alpha_hits: list = []
    for n in range(1, 51):
        point = (natal_asc_lon + ALPHA / n * 30) % 360
        diff = _angle_diff(sr_asc_lon, point)
        if diff <= orb:
            alpha_hits.append({
                "n": n,
                "alpha_point": round(point, 2),
                "sign": sign_name(point),
                "orb": round(diff, 2),
            })

    phi_hits: list = []
    for n in range(1, 16):
        point = (natal_asc_lon + PHI ** n * 10) % 360
        diff = _angle_diff(sr_asc_lon, point)
        if diff <= orb:
            phi_hits.append({
                "n": n,
                "phi_point": round(point, 2),
                "sign": sign_name(point),
                "orb": round(diff, 2),
                "phi_power": round(PHI ** n, 4),
            })

    powered = bool(alpha_hits or phi_hits)
    return {
        "sr_asc_lon":    round(sr_asc_lon, 2),
        "natal_asc_lon": round(natal_asc_lon, 2),
        "alpha_hits":    alpha_hits,
        "phi_hits":      phi_hits,
        "holos_powered": powered,
        "description": (
            "HOLOS-усиленный год: АСЦ соляра попадает на α-адрес натального АСЦ. "
            "Гипотеза SR-8: такие годы дают hit_rate > 50% для значимых событий."
            if powered else
            "АСЦ соляра не попадает на α-адреса или φ-узлы натального АСЦ."
        ),
    }


# ═══════════════════════════════════════════════════════════════════════════
# LUNAR RETURN CALENDAR WITHIN SOLAR YEAR
# ═══════════════════════════════════════════════════════════════════════════

def lunar_return_calendar(
    natal_jd:      float,
    sr_jd:         float,
    obs_lat:       float,
    obs_lon:       float,
    houses_system: str = "placidus",
    count:         int = 14,
) -> list:
    """
    Compute the dates of the first `count` lunar returns within the solar year
    starting from sr_jd.  Returns lightweight list of return dates (no full charts).
    Uses binary search: Moon returns to natal Moon longitude.
    """
    from astro_engine import moon as _moon

    natal_moon_lon = _moon(natal_jd)
    results = []

    seed_jd = sr_jd - 1.0   # start slightly before SR

    def moon_diff(t):
        d = n360(_moon(t) - natal_moon_lon)
        return d - 360 if d > 180 else d

    for i in range(count):
        lo = seed_jd + i * LUNAR_PERIOD_DAYS
        hi = lo + LUNAR_PERIOD_DAYS + 2.0

        # Find bracket
        step = 1.0
        t0 = lo
        found = None
        while t0 < hi:
            t1 = t0 + step
            if moon_diff(t0) * moon_diff(t1) < 0:
                found = t0
                break
            t0 = t1

        if found is None:
            continue

        blo, bhi = found, found + step
        for _ in range(50):
            mid = (blo + bhi) / 2
            dm = moon_diff(mid)
            if abs(dm) < 1e-9:
                break
            if moon_diff(blo) * dm < 0:
                bhi = mid
            else:
                blo = mid
        lr_jd = (blo + bhi) / 2

        # Update seed for next iteration (advance ~27.32 days)
        seed_jd = lr_jd

        # Skip if before SR start
        if lr_jd < sr_jd - 1:
            continue

        lr_date = _jd_to_date_str(lr_jd)
        frac = lr_jd + 0.5 - math.floor(lr_jd + 0.5)
        h_ = int(frac * 24)
        mi_ = int((frac * 24 - h_) * 60)

        results.append({
            "n":          i + 1,
            "jd":         round(lr_jd, 4),
            "date":       lr_date,
            "time_utc":   f"{h_:02d}:{mi_:02d}",
            "month_in_sr": i + 1,
        })

    return results


# ═══════════════════════════════════════════════════════════════════════════
# CITY ASC COMPARISON
# ═══════════════════════════════════════════════════════════════════════════

def city_asc_comparison(
    natal_jd:           float,
    sr_year:            int,
    cities:             list,
    natal_lat:          float,
    natal_lon:          float,
    houses_system:      str = "placidus",
    target_natal_house: int = None,
    target_sphere:      str = None,
) -> dict:
    """
    Compare SR ASC for each city in the list.

    AstroCRM use-cases:
      • Default: rank cities by proximity of SR ASC to natal ASC (resonance)
      • target_natal_house (1-12): rank by activation of a specific natal house
      • target_sphere ("career", "money", "love", ...): same, via keyword

    Each city result includes a full sphere_map showing what natal house
    the SR ASC, MC, Sun, and Moon fall in.

    cities: [{"name": str, "lat": float, "lon": float}, ...]
    """
    # Resolve target_sphere keyword to house number
    if target_sphere and not target_natal_house:
        target_natal_house = SPHERE_KEYWORDS_EN.get(target_sphere.lower())

    # Natal charts (computed once)
    natal_raw_houses  = calc_houses(natal_jd, natal_lat, natal_lon, houses_system)
    natal_asc_lon     = natal_raw_houses.get("h1",  0.0)
    natal_mc_lon      = natal_raw_houses.get("h10", 0.0)
    natal_planets_raw = calc_planets(natal_jd)

    city_results = []
    for city_data in cities:
        name    = city_data.get("name", "Unknown")
        obs_lat = float(city_data.get("lat", natal_lat))
        obs_lon = float(city_data.get("lon", natal_lon))

        sr = _calc_solar_return(natal_jd, sr_year, obs_lat, obs_lon, houses_system)
        if "error" in sr:
            city_results.append({"city": name, "error": sr["error"]})
            continue

        sr_asc_lon     = _fmt_house_lon(sr["houses"].get("h1",  {}))
        sr_mc_lon      = _fmt_house_lon(sr["houses"].get("h10", {}))
        sr_sun_lon     = _fmt_house_lon(sr["planets"].get("sun", {}))
        sr_moon_lon    = _fmt_house_lon(sr["planets"].get("moon", {}))
        sr_planets_raw = _raw_planets(sr.get("planets", {}))
        sr_houses_raw  = _raw_houses(sr.get("houses",  {}))

        # Differences from natal angles
        diff_asc   = _angle_diff(sr_asc_lon, natal_asc_lon)
        diff_mc_asc = _angle_diff(sr_asc_lon, natal_mc_lon)
        diff_mc_sr  = _angle_diff(sr_mc_lon,  natal_mc_lon)

        # SR ASC in natal house
        sr_asc_natal_h = _house_nr(sr_asc_lon, natal_raw_houses)

        # Full sphere map
        sphere_map = _build_sphere_map(sr_asc_lon, sr_mc_lon, sr_sun_lon, sr_moon_lon, natal_raw_houses)

        # Angular planets in SR chart
        angular = []
        for p, lon in sr_planets_raw.items():
            h = _house_nr(lon, sr_houses_raw)
            if h in ANGULAR_HOUSES:
                arc = _ANGULAR_ARCHETYPES.get(h, {}).get(p, {})
                angular.append({
                    "planet":    p,
                    "sr_house":  h,
                    "sign":      sign_name(lon),
                    "formatted": _fmt_lon(lon),
                    "archetype": arc.get("архетип", "") if arc else "",
                })

        # Planetary returns (same moment for all cities)
        planetary_returns = detect_planetary_returns(natal_planets_raw, sr_planets_raw)

        # Resonance score toward natal ASC
        resonance_asc = max(0.0, 100.0 - diff_asc * 5.0)

        # Target house match
        target_match = (sr_asc_natal_h == target_natal_house) if target_natal_house else None
        target_dist  = _angle_diff(sr_asc_lon, natal_raw_houses.get(f"h{target_natal_house}", 0.0)) if target_natal_house else None

        # Category (based on target if given, else resonance)
        if target_natal_house:
            if sr_asc_natal_h == target_natal_house:
                category = f"✓ АСЦ соляра в {target_natal_house}-м натальном доме ({SPHERE_LABELS.get(target_natal_house, '')})"
            else:
                category = f"АСЦ соляра в {sr_asc_natal_h}-м доме ({SPHERE_LABELS.get(sr_asc_natal_h, '')})"
        else:
            if diff_asc < 3:
                category = "★★★ РЕЗОНАНТНЫЙ — АСЦ соляра ≈ натальному АСЦ"
            elif diff_asc < 8:
                category = "★★ ВЫСОКИЙ РЕЗОНАНС — близко к натальному АСЦ"
            elif diff_mc_asc < 3:
                category = "★ МС-РЕЗОНАНС — АСЦ соляра ≈ натальному МС"
            elif diff_mc_asc < 8:
                category = "Близко к натальному МС"
            else:
                category = "Стандартный соляр"

        city_results.append({
            "city":             name,
            "lat":              obs_lat,
            "lon":              obs_lon,
            "sr_date_utc":      sr.get("sr_date_utc", ""),
            "sr_asc": {
                "lon":                 round(sr_asc_lon, 2),
                "sign":                sign_name(sr_asc_lon),
                "formatted":           _fmt_lon(sr_asc_lon),
                "in_natal_house":      sr_asc_natal_h,
                "sphere_label":        SPHERE_LABELS.get(sr_asc_natal_h, ""),
                "diff_from_natal_asc": round(diff_asc, 2),
                "diff_from_natal_mc":  round(diff_mc_asc, 2),
            },
            "sr_mc": {
                "lon":                round(sr_mc_lon, 2),
                "sign":               sign_name(sr_mc_lon),
                "formatted":          _fmt_lon(sr_mc_lon),
                "in_natal_house":     _house_nr(sr_mc_lon, natal_raw_houses),
                "sphere_label":       SPHERE_LABELS.get(_house_nr(sr_mc_lon, natal_raw_houses), ""),
                "diff_from_natal_mc": round(diff_mc_sr, 2),
            },
            "sphere_map":           sphere_map,
            "angular_planets":      angular,
            "planetary_returns":    planetary_returns,
            "resonance_score":      round(resonance_asc, 1),
            "category":             category,
            "target_match":         target_match,
            "target_dist_to_cusp":  round(target_dist, 2) if target_dist is not None else None,
        })

    # Sort: by target house match first, then by resonance/proximity
    if target_natal_house:
        city_results.sort(key=lambda x: (
            0 if x.get("target_match") else 1,
            x.get("target_dist_to_cusp") or 999,
        ))
    else:
        city_results.sort(key=lambda x: x.get("sr_asc", {}).get("diff_from_natal_asc", 999))

    # Build sphere recommendations: which city is best for each sphere
    sphere_recommendations: dict = {}
    for h in range(1, 13):
        matching = [c for c in city_results if c.get("sr_asc", {}).get("in_natal_house") == h]
        if matching:
            sphere_recommendations[str(h)] = {
                "sphere_label":  SPHERE_LABELS.get(h, ""),
                "best_city":     matching[0]["city"],
                "sr_asc":        matching[0]["sr_asc"].get("formatted", ""),
            }

    best = city_results[0] if city_results else None
    if target_natal_house and best:
        rec = (
            f"Для сферы «{SPHERE_LABELS.get(target_natal_house, '')}» лучший город: "
            f"{best['city']} — {best['category']}"
        )
    elif best:
        rec = (
            f"Лучший город для соляра {sr_year}: {best['city']} "
            f"(АСЦ соляра {best['sr_asc']['formatted']}, "
            f"разница с натальным АСЦ: {best['sr_asc']['diff_from_natal_asc']}°)"
        )
    else:
        rec = ""

    return {
        "type":                 "solar_return_city_comparison",
        "sr_year":              sr_year,
        "target_natal_house":   target_natal_house,
        "target_sphere":        SPHERE_LABELS.get(target_natal_house, "") if target_natal_house else None,
        "natal_asc": {
            "lon":       round(natal_asc_lon, 2),
            "sign":      sign_name(natal_asc_lon),
            "formatted": _fmt_lon(natal_asc_lon),
        },
        "natal_mc": {
            "lon":       round(natal_mc_lon, 2),
            "sign":      sign_name(natal_mc_lon),
            "formatted": _fmt_lon(natal_mc_lon),
        },
        "cities":                city_results,
        "sphere_recommendations": sphere_recommendations,
        "best_city":             best["city"] if best else None,
        "recommendation":        rec,
    }


# ═══════════════════════════════════════════════════════════════════════════
# SPHERE-TARGETED CITY SEARCH
# ═══════════════════════════════════════════════════════════════════════════

def sr_sphere_city_search(
    natal_jd:           float,
    sr_year:            int,
    target_natal_house: int,
    cities:             list,
    natal_lat:          float,
    natal_lon:          float,
    houses_system:      str = "placidus",
) -> dict:
    """
    Find cities where the SR ASC falls in a specific natal house.

    AstroCRM use-case: "I want a career year" → target_natal_house=10
    Returns exact matches, near-matches (SR ASC within 5° of target cusp),
    and the best alternatives if no exact match found.

    cities: [{"name": str, "lat": float, "lon": float}, ...]
    """
    natal_houses_raw = calc_houses(natal_jd, natal_lat, natal_lon, houses_system)
    natal_asc_lon    = natal_houses_raw.get("h1",  0.0)

    # Get the cusp longitude of the target natal house
    target_cusp_lon  = natal_houses_raw.get(f"h{target_natal_house}", 0.0)

    exact_matches   = []
    near_matches    = []
    all_cities      = []

    for city_data in cities:
        name    = city_data.get("name", "Unknown")
        obs_lat = float(city_data.get("lat", natal_lat))
        obs_lon = float(city_data.get("lon", natal_lon))

        sr = _calc_solar_return(natal_jd, sr_year, obs_lat, obs_lon, houses_system)
        if "error" in sr:
            continue

        sr_asc_lon     = _fmt_house_lon(sr["houses"].get("h1", {}))
        sr_asc_house   = _house_nr(sr_asc_lon, natal_houses_raw)
        sphere_label   = SPHERE_LABELS.get(sr_asc_house, "")

        # Distance from SR ASC to target house cusp
        dist_to_cusp   = _angle_diff(sr_asc_lon, target_cusp_lon)

        entry = {
            "city":           name,
            "lat":            obs_lat,
            "lon":            obs_lon,
            "sr_asc":         _fmt_lon(sr_asc_lon),
            "sr_asc_house":   sr_asc_house,
            "sphere_label":   sphere_label,
            "dist_to_cusp":   round(dist_to_cusp, 2),
            "is_target":      sr_asc_house == target_natal_house,
            "sr_date_utc":    sr.get("sr_date_utc", ""),
        }
        all_cities.append(entry)

        if sr_asc_house == target_natal_house:
            exact_matches.append(entry)
        elif dist_to_cusp <= 5.0:
            near_matches.append(entry)

    # Sort each group by distance to target cusp
    exact_matches.sort(key=lambda x: x["dist_to_cusp"])
    near_matches.sort(key=lambda x: x["dist_to_cusp"])
    # Fallback alternatives: all cities sorted by distance to target cusp
    all_cities.sort(key=lambda x: x["dist_to_cusp"])

    target_label = SPHERE_LABELS.get(target_natal_house, f"дом {target_natal_house}")

    if exact_matches:
        best = exact_matches[0]
        rec  = (
            f"Для активации сферы «{target_label}» лучший город — "
            f"{best['city']} (АСЦ соляра {best['sr_asc']} попадает в "
            f"{target_natal_house}й натальный дом)."
        )
    elif near_matches:
        best = near_matches[0]
        rec  = (
            f"Точного попадания в {target_natal_house}й дом не найдено. "
            f"Ближе всего — {best['city']} "
            f"(АСЦ соляра в {best['dist_to_cusp']}° от границы дома, дом {best['sr_asc_house']})."
        )
    else:
        best = all_cities[0] if all_cities else None
        rec  = (
            f"Ни один из предложенных городов не даёт АСЦ соляра в {target_natal_house}м доме. "
            f"Наименее удалённый город — {best['city'] if best else '?'}."
        )

    return {
        "type":                 "sr_sphere_city_search",
        "sr_year":              sr_year,
        "target_natal_house":   target_natal_house,
        "target_sphere":        target_label,
        "natal_asc":            _fmt_lon(natal_asc_lon),
        "exact_matches":        exact_matches,
        "near_matches":         near_matches,
        "all_cities_ranked":    all_cities,
        "best_city":            best["city"] if best else None,
        "recommendation":       rec,
    }


# ═══════════════════════════════════════════════════════════════════════════
# DEEP INTERPRETATION BUILDER
# ═══════════════════════════════════════════════════════════════════════════

def _build_sr_interpretation(
    sr_year:                int,
    sr_asc_in_natal_house:  int,
    sr_mc_in_natal_house:   int,
    sr_sun_in_sr_house:     int,
    sr_moon_in_sr_house:    int,
    sr_moon_sign:           str,
    sr_moon_in_natal_house: int,
    angular_planets:        list,
    sr_to_natal_aspects:    list,
    asc_resonance:          float,
    mc_resonance:           float,
    planetary_returns:      list,
    sr_asc_sign:            str,
    # Priority 6 inputs
    ruler_planet:           str = "",
    ruler_in_sr_house:      int = 0,
    ruler_in_natal_house:   int = 0,
    ruler_sign:             str = "",
    ruler_formatted:        str = "",
    # Priority 8 inputs
    sr_in_natal_houses:     dict = None,
    # Quality
    dominant_quality:       dict = None,
) -> str:
    """Build comprehensive Russian-language interpretation per Pavel Andreev 8-priority system."""

    parts: list = []

    # ─── Heading ─────────────────────────────────────────────────────────
    parts.append(f"{'═'*60}")
    parts.append(f"СОЛЯР {sr_year} — АНАЛИЗ ПО СИСТЕМЕ АНДРЕЕВА")
    parts.append(f"{'═'*60}")

    # ─── Dominant quality banner ─────────────────────────────────────────
    if dominant_quality:
        parts.append(
            f"Стихия соляра: {dominant_quality.get('element_ru', '')}  •  "
            f"Модальность: {dominant_quality.get('modality_ru', '')}"
        )

    # ─── Resonance alert ─────────────────────────────────────────────────
    if asc_resonance < 3:
        parts.append(
            f"\n★★★ РЕЗОНАНТНЫЙ ГОД (АСЦ разница {asc_resonance:.1f}°)\n"
            "АСЦ соляра практически совпадает с натальным АСЦ. Соляр повторяет "
            "натальную структуру — максимальная реализация всей натальной карты. "
            "События этого года имеют особый вес и долгосрочный след."
        )
    elif asc_resonance < 8:
        parts.append(
            f"\n★★ ВЫСОКИЙ РЕЗОНАНС (АСЦ разница {asc_resonance:.1f}°)\n"
            "АСЦ соляра близок к натальному — личная тема года усилена. "
            "Год активирует натальную карту в целом, не только одну сферу."
        )

    # ─── Planetary returns (rare events — show first) ────────────────────
    if planetary_returns:
        exact_close  = [r for r in planetary_returns if r.get("category") in {"exact", "close"}]
        approaching  = [r for r in planetary_returns if r.get("category") == "approaching"]
        if exact_close:
            names = " + ".join(r["name_ru"] for r in exact_close)
            parts.append(
                f"\n★★★ ДВОЙНОЙ ВОЗВРАТ: {names} совпадает с соляром!\n"
                "Это происходит редко (Меркурий — раз в 3-7 лет, Марс — раз в 15 лет, "
                "Юпитер — раз в ~12 лет). Год структурного перелома и усиленного отыгрыша."
            )
        if approaching:
            names = ", ".join(r["name_ru"] for r in approaching)
            parts.append(
                f"\n★★ ПРИБЛИЖЕНИЕ РЕТУРНА: {names}\n"
                "Планета в том же знаке что и в натале, движется к точному возврату. "
                "Темы этой планеты будут нарастать в течение года."
            )
        parts.append("")
        for r in planetary_returns:
            parts.append(f"  • {r['description']}")

    # ─── PRIORITY 1: SR ASC in natal house ───────────────────────────────
    td = HOUSE_THEMES_DEEP.get(sr_asc_in_natal_house, {})
    t_title = td.get("title", f"дом {sr_asc_in_natal_house}")
    t_body  = td.get("body",  "")
    t_focus = td.get("focus", "")
    t_avoid = td.get("avoid", "")
    parts.append(
        f"\n{'─'*60}\n"
        f"[ПРИОРИТЕТ 1] ГЛАВНАЯ СФЕРА ГОДА → {sr_asc_in_natal_house}-й натальный дом\n"
        f"  Тема: {t_title.upper()}"
    )
    parts.append(f"  {t_body}")
    if t_focus:
        parts.append(f"  ✓ Фокус: {t_focus}")
    if t_avoid:
        parts.append(f"  ✗ Избегать: {t_avoid}")

    # ─── PRIORITY 2: Angular planets in SR houses ─────────────────────────
    parts.append(f"\n{'─'*60}")
    if angular_planets:
        parts.append("[ПРИОРИТЕТ 2] ПЛАНЕТЫ В УГЛОВЫХ ДОМАХ СОЛЯРА:")
        house_label_map = {
            1: "1-й (личность)", 4: "4-й (дом/корни)",
            7: "7-й (партнёр)",  10: "10-й (карьера)",
        }
        for ap in angular_planets:
            p    = ap["planet"]
            hlabel = house_label_map.get(ap["sr_house"], f"{ap['sr_house']}-й")
            parts.append(
                f"  • {p.capitalize()} ({ap.get('formatted', ap['sign'])}) "
                f"в {hlabel} доме соляра"
            )
            arc = _ANGULAR_ARCHETYPES.get(ap["sr_house"], {}).get(p, {})
            if arc:
                parts.append(f"    ★ Архетип: «{arc['архетип']}»")
                parts.append(f"    Тема: {arc['тема']}")
                parts.append(f"    Шанс: {arc['шанс']} | Риск: {arc['риск']}")
    else:
        parts.append("[ПРИОРИТЕТ 2] Угловые дома соляра не заняты планетами.")
        parts.append("  Год реализуется через сукцедентные и кадентные дома — менее заметно, но стабильно.")

    # ─── PRIORITY 3: SR MC in natal house ────────────────────────────────
    mc_td    = HOUSE_THEMES_DEEP.get(sr_mc_in_natal_house, {})
    mc_title = mc_td.get("title", f"дом {sr_mc_in_natal_house}")
    mc_body  = mc_td.get("career", "")
    parts.append(
        f"\n{'─'*60}\n"
        f"[ПРИОРИТЕТ 3] КАРЬЕРНЫЙ ВЕКТОР → МС соляра в {sr_mc_in_natal_house}-м натальном доме\n"
        f"  Карьерный фокус года: {mc_title}"
    )
    if mc_body:
        parts.append(f"  {mc_body}")
    if mc_resonance < 5:
        parts.append(
            f"  ★★ МС соляра совпадает с натальным МС (разница {mc_resonance:.1f}°) — "
            "двойная активация карьерной вершины. Год профессиональных итогов."
        )
    elif mc_resonance < 10:
        parts.append(
            f"  ★ МС соляра в {mc_resonance:.1f}° от натального МС — карьерная тема активна."
        )

    # ─── PRIORITY 4: SR Sun in SR house ──────────────────────────────────
    sun_theme = SUN_IN_HOUSE_SR.get(sr_sun_in_sr_house, "")
    parts.append(
        f"\n{'─'*60}\n"
        f"[ПРИОРИТЕТ 4] ТЕМА САМОВЫРАЖЕНИЯ → Солнце в {sr_sun_in_sr_house}-м доме соляра\n"
        f"  {sun_theme}"
    )

    # ─── PRIORITY 5: SR Moon ─────────────────────────────────────────────
    moon_desc = MOON_IN_HOUSE_SR_FULL.get(sr_moon_in_sr_house, "")
    parts.append(
        f"\n{'─'*60}\n"
        f"[ПРИОРИТЕТ 5] ЭМОЦИОНАЛЬНЫЙ ФОН → Луна в {sr_moon_sign.capitalize()} "
        f"в {sr_moon_in_sr_house}-м доме соляра (натальный дом: {sr_moon_in_natal_house})"
    )
    if moon_desc:
        parts.append(f"  {moon_desc}")

    # ─── PRIORITY 6: ASC ruler ────────────────────────────────────────────
    if ruler_planet:
        parts.append(
            f"\n{'─'*60}\n"
            f"[ПРИОРИТЕТ 6] УПРАВИТЕЛЬ АСЦ СОЛЯРА → {ruler_planet.capitalize()}\n"
            f"  {ruler_planet.capitalize()} (управитель {sr_asc_sign.capitalize()}) "
            f"находится в {ruler_formatted} — "
            f"в {ruler_in_sr_house}-м доме соляра (натальный дом: {ruler_in_natal_house})"
        )
        parts.append(
            f"  Это показывает КАК будет реализовываться главная тема года ({t_title}): "
            f"через сферу {ruler_in_sr_house}-го дома соляра "
            f"({SPHERE_LABELS.get(ruler_in_natal_house, '')} в натале)."
        )

    # ─── PRIORITY 7: SR → natal aspects ──────────────────────────────────
    # Show conjunctions (orb ≤ 4°) and any tighter major aspects
    key_aspects = [
        a for a in sr_to_natal_aspects
        if (a["aspect"] == "conjunction" and a["orb"] <= 4.0)
        or (a["aspect"] in {"opposition", "trine", "square"} and a["orb"] <= 2.0)
    ]
    if key_aspects:
        parts.append(f"\n{'─'*60}\n[ПРИОРИТЕТ 7] КЛЮЧЕВЫЕ АКТИВАЦИИ (соляр → натал):")
        asp_ru = {
            "conjunction": "☌", "opposition": "☍", "trine": "△",
            "square": "□", "sextile": "⚹",
        }
        for a in key_aspects[:8]:
            glyph = asp_ru.get(a["aspect"], a["aspect"])
            parts.append(
                f"  • {a['sr_planet'].capitalize()} соляра {glyph} "
                f"натальный {a['natal_planet'].capitalize()} "
                f"(орб {a['orb']}°, {a['sr_sign']} → {a['natal_sign']}) — "
                f"прямая активация натальной {a['natal_planet']}."
            )

    # ─── PRIORITY 8: SR planets in natal houses (highlights) ─────────────
    if sr_in_natal_houses:
        angular_natal = {
            p: d for p, d in sr_in_natal_houses.items()
            if d.get("natal_house") in ANGULAR_HOUSES and p not in ("sun", "moon")
        }
        if angular_natal:
            parts.append(f"\n{'─'*60}\n[ПРИОРИТЕТ 8] ПЛАНЕТЫ СОЛЯРА В УГЛОВЫХ НАТАЛЬНЫХ ДОМАХ:")
            for p, d in angular_natal.items():
                parts.append(
                    f"  • {p.capitalize()} ({d.get('formatted', d.get('sign', ''))}) "
                    f"в {d['natal_house']}-м натальном доме "
                    f"({SPHERE_LABELS.get(d['natal_house'], '')})"
                )

    # ─── Year card (summary) ─────────────────────────────────────────────
    parts.append(f"\n{'═'*60}")
    parts.append(f"ГОД В НЕСКОЛЬКИХ СЛОВАХ:")
    parts.append(
        f"  Главная сфера: {sr_asc_in_natal_house}-й дом ({t_title})"
    )
    parts.append(
        f"  Тема реализации: Солнце в {sr_sun_in_sr_house}-м доме соляра — "
        f"{SUN_IN_HOUSE_SR.get(sr_sun_in_sr_house, '').split('.')[0]}"
    )
    parts.append(
        f"  Эмоциональный фон: Луна в {sr_moon_in_sr_house}-м доме — "
        f"{MOON_IN_HOUSE_SR_FULL.get(sr_moon_in_sr_house, '').split('.')[0]}"
    )
    if planetary_returns:
        pr_short = ", ".join(r["name_ru"] for r in planetary_returns)
        parts.append(f"  Усиление: {pr_short}")

    # ─── Action plan ─────────────────────────────────────────────────────
    parts.append(f"\n{'─'*60}")
    parts.append("ПЛАН ДЕЙСТВИЙ:")
    parts.append(f"  1. {t_focus}")
    if mc_body:
        parts.append(f"  2. {mc_body}")
    if t_avoid:
        parts.append(f"  3. {t_avoid.replace('Не ', 'Избегайте: ')}")
    if angular_planets:
        ap_str = ", ".join(a["planet"].capitalize() for a in angular_planets[:3])
        parts.append(
            f"  4. Планеты {ap_str} в угловых домах — используйте их энергию активно в первые 3 месяца соляра."
        )
    if planetary_returns:
        pr_act = [r for r in planetary_returns if r.get("category") in {"exact", "close"}]
        if pr_act:
            p_name = pr_act[0]["name_ru"]
            parts.append(
                f"  5. {p_name}: момент для долгосрочных решений, связанных с темой этой планеты."
            )

    return "\n".join(parts)


# ═══════════════════════════════════════════════════════════════════════════
# MAIN DEEP ANALYSIS FUNCTION
# ═══════════════════════════════════════════════════════════════════════════

def solar_return_deep_analysis(
    natal_jd:       float,
    sr_year:        int,
    obs_lat:        float,
    obs_lon:        float,
    natal_lat:      float,
    natal_lon:      float,
    houses_system:  str = "placidus",
    include_holos:  bool = False,
    include_lunars: bool = False,
) -> dict:
    """
    Full solar return analysis by Pavel Andreev 8-priority method.

    Returns prioritised interpretation, angular activations,
    natal/SR overlays, planetary return detection, ASC ruler (Priority 6),
    dominant quality, sphere map, and optional HOLOS / lunar extensions.
    """
    # ── 1. Get SR chart ───────────────────────────────────────────────────
    sr = _calc_solar_return(natal_jd, sr_year, obs_lat, obs_lon, houses_system)
    if "error" in sr:
        return sr

    sr_jd          = float(sr["sr_jd"])
    sr_date_utc    = sr.get("sr_date_utc", "")
    sr_sun_lon_raw = float(sr.get("sr_sun_lon", 0))

    sr_planets_fmt = sr.get("planets", {})
    sr_houses_fmt  = sr.get("houses",  {})
    sr_planets     = _raw_planets(sr_planets_fmt)
    sr_houses      = _raw_houses(sr_houses_fmt)

    sr_asc_lon = sr_houses.get("h1",  0.0)
    sr_mc_lon  = sr_houses.get("h10", 0.0)

    # ── 2. Natal chart ────────────────────────────────────────────────────
    natal_planets_raw = calc_planets(natal_jd)
    natal_houses_raw  = calc_houses(natal_jd, natal_lat, natal_lon, houses_system)
    natal_asc_lon     = natal_houses_raw.get("h1",  0.0)
    natal_mc_lon      = natal_houses_raw.get("h10", 0.0)

    # ── 3. Priority 1: SR ASC in natal house ─────────────────────────────
    sr_asc_in_natal_house = _house_nr(sr_asc_lon, natal_houses_raw)

    # ── 4. Priority 3: SR MC in natal house ──────────────────────────────
    sr_mc_in_natal_house = _house_nr(sr_mc_lon, natal_houses_raw)

    # ── 5. Priority 4: SR Sun in SR house ────────────────────────────────
    sr_sun_in_sr_house = _house_nr(sr_sun_lon_raw, sr_houses)

    # ── 6. Priority 5: SR Moon ───────────────────────────────────────────
    sr_moon_lon            = sr_planets.get("moon", 0.0)
    sr_moon_in_sr_house    = _house_nr(sr_moon_lon, sr_houses)
    sr_moon_in_natal_house = _house_nr(sr_moon_lon, natal_houses_raw)
    sr_moon_sign           = sign_name(sr_moon_lon)

    # ── 7. Priority 6 (NEW): ASC ruler ────────────────────────────────────
    ruler_planet        = _asc_ruler(sr_asc_lon)
    ruler_lon           = sr_planets.get(ruler_planet, 0.0)
    ruler_in_sr_house   = _house_nr(ruler_lon, sr_houses)
    ruler_in_natal_house = _house_nr(ruler_lon, natal_houses_raw)
    ruler_sign          = sign_name(ruler_lon)
    ruler_formatted     = _fmt_lon(ruler_lon)

    # ── 8. Priority 2: Angular planets ───────────────────────────────────
    angular_planets = []
    for planet, lon in sr_planets.items():
        h = _house_nr(lon, sr_houses)
        if h in ANGULAR_HOUSES:
            angular_planets.append({
                "planet":    planet,
                "sr_house":  h,
                "lon":       round(lon, 2),
                "sign":      sign_name(lon),
                "formatted": _fmt_lon(lon),
                "deg_min":   f"{int(deg_in_sign(lon))}°{int((deg_in_sign(lon) % 1) * 60):02d}'",
                "archetype": _ANGULAR_ARCHETYPES.get(h, {}).get(planet),
            })
    angular_planets.sort(key=lambda x: x["sr_house"])

    # ── 9. All SR planets in SR houses ───────────────────────────────────
    sr_planet_houses: dict = {}
    for planet, lon in sr_planets.items():
        h = _house_nr(lon, sr_houses)
        sr_planet_houses[planet] = {
            "house":     h,
            "quadrant":  "angular" if h in ANGULAR_HOUSES else
                         "succedent" if h in SUCCEDENT_HOUSES else "cadent",
            "sign":      sign_name(lon),
            "formatted": _fmt_lon(lon),
        }

    # ── 10. SR planets in natal houses ───────────────────────────────────
    sr_in_natal_houses: dict = {}
    for planet, lon in sr_planets.items():
        sr_in_natal_houses[planet] = {
            "natal_house":  _house_nr(lon, natal_houses_raw),
            "sphere_label": SPHERE_LABELS.get(_house_nr(lon, natal_houses_raw), ""),
            "sign":         sign_name(lon),
            "formatted":    _fmt_lon(lon),
        }

    # ── 11. Priority 7: SR → natal aspects ───────────────────────────────
    sr_to_natal_aspects: list = []
    for sr_p, sr_lon in sr_planets.items():
        for nat_p, nat_lon in natal_planets_raw.items():
            diff = _angle_diff(sr_lon, nat_lon)
            for asp_name, (angle, max_orb) in _SR_ASPECT_TABLE.items():
                dev = abs(diff - angle)
                if dev <= max_orb:
                    sr_to_natal_aspects.append({
                        "sr_planet":    sr_p,
                        "natal_planet": nat_p,
                        "aspect":       asp_name,
                        "glyph":        _SR_ASPECT_GLYPHS.get(asp_name, ""),
                        "orb":          round(dev, 2),
                        "sr_lon":       round(sr_lon, 2),
                        "natal_lon":    round(nat_lon, 2),
                        "sr_sign":      sign_name(sr_lon),
                        "natal_sign":   sign_name(nat_lon),
                    })
    sr_to_natal_aspects.sort(key=lambda x: x["orb"])

    # ── 12. ASC / MC resonance ────────────────────────────────────────────
    asc_resonance = _angle_diff(sr_asc_lon, natal_asc_lon)
    mc_resonance  = _angle_diff(sr_mc_lon,  natal_mc_lon)

    # ── 13. Planetary returns ─────────────────────────────────────────────
    planetary_returns = detect_planetary_returns(natal_planets_raw, sr_planets)

    # ── 14. Dominant quality ─────────────────────────────────────────────
    dom_quality = _dominant_quality(sr_planets)

    # ── 15. Sphere map ────────────────────────────────────────────────────
    sphere_map = _build_sphere_map(
        sr_asc_lon, sr_mc_lon, sr_sun_lon_raw, sr_moon_lon, natal_houses_raw
    )

    # ── 16. Year card ─────────────────────────────────────────────────────
    p1_theme = HOUSE_THEMES_DEEP.get(sr_asc_in_natal_house, {})
    year_card = {
        "year":           sr_year,
        "sr_date":        sr_date_utc,
        "primary_sphere": f"{sr_asc_in_natal_house}-й дом — {p1_theme.get('title', '')}",
        "asc_sign":       f"АСЦ соляра: {_fmt_lon(sr_asc_lon)}",
        "career_vector":  f"МС соляра → {sr_mc_in_natal_house}-й дом ({SPHERE_LABELS.get(sr_mc_in_natal_house, '')})",
        "sun_theme":      f"Солнце в {sr_sun_in_sr_house}-м доме соляра",
        "moon_backdrop":  f"Луна в {sr_moon_sign.capitalize()} в {sr_moon_in_sr_house}-м доме",
        "resonance":      (
            f"★★★ Резонантный год ({asc_resonance:.1f}°)" if asc_resonance < 5 else
            f"★★ Высокий резонанс ({asc_resonance:.1f}°)"  if asc_resonance < 10 else
            f"Стандартный соляр (АСЦ разница {asc_resonance:.1f}°)"
        ),
        "planetary_returns": [r["name_ru"] for r in planetary_returns],
        "focus":          p1_theme.get("focus", ""),
        "avoid":          p1_theme.get("avoid", ""),
    }

    # ── 17. Optional: HOLOS α intersection ───────────────────────────────
    holos_data = None
    if include_holos:
        holos_data = solar_holos_intersection(sr_asc_lon, natal_asc_lon)

    # ── 18. Optional: Lunar return calendar + hot months ─────────────────
    lunar_calendar = None
    hot_months: list = []
    if include_lunars:
        lunar_calendar = lunar_return_calendar(
            natal_jd, sr_jd, obs_lat, obs_lon, houses_system
        )
        # Mark months where lunar return ASC or Moon hits natal angular house
        for lr in lunar_calendar:
            lr_jd_val = lr.get("jd", 0.0)
            if lr_jd_val > 0:
                try:
                    lr_houses = calc_houses(lr_jd_val, obs_lat, obs_lon, houses_system)
                    lr_asc_h  = _house_nr(lr_houses.get("h1", 0.0), natal_houses_raw)
                    if lr_asc_h in ANGULAR_HOUSES:
                        hot_months.append({
                            "month_in_sr": lr["month_in_sr"],
                            "date":        lr["date"],
                            "lr_asc_natal_house": lr_asc_h,
                            "sphere":      SPHERE_LABELS.get(lr_asc_h, ""),
                            "note":        f"Лунар активирует {lr_asc_h}-й натальный дом ({SPHERE_LABELS.get(lr_asc_h, '')})",
                        })
                except Exception:
                    pass

    # ── 19. Interpretation ────────────────────────────────────────────────
    interpretation = _build_sr_interpretation(
        sr_year=sr_year,
        sr_asc_in_natal_house=sr_asc_in_natal_house,
        sr_mc_in_natal_house=sr_mc_in_natal_house,
        sr_sun_in_sr_house=sr_sun_in_sr_house,
        sr_moon_in_sr_house=sr_moon_in_sr_house,
        sr_moon_sign=sr_moon_sign,
        sr_moon_in_natal_house=sr_moon_in_natal_house,
        angular_planets=angular_planets,
        sr_to_natal_aspects=sr_to_natal_aspects[:20],
        asc_resonance=asc_resonance,
        mc_resonance=mc_resonance,
        planetary_returns=planetary_returns,
        sr_asc_sign=sign_name(sr_asc_lon),
        ruler_planet=ruler_planet,
        ruler_in_sr_house=ruler_in_sr_house,
        ruler_in_natal_house=ruler_in_natal_house,
        ruler_sign=ruler_sign,
        ruler_formatted=ruler_formatted,
        sr_in_natal_houses=sr_in_natal_houses,
        dominant_quality=dom_quality,
    )

    # ── 20. Assemble full result ──────────────────────────────────────────
    result = {
        "type":          "solar_return_deep",
        "sr_year":       sr_year,
        "sr_date_utc":   sr_date_utc,
        "sr_jd":         round(sr_jd, 4),
        "observation_location": {"lat": obs_lat, "lon": obs_lon},

        # Year summary card
        "year_card": year_card,

        # Sphere map
        "sphere_map": sphere_map,

        # Dominant quality
        "dominant_quality": dom_quality,

        # Priority 1: SR ASC
        "sr_asc": {
            "lon":             round(sr_asc_lon, 2),
            "sign":            sign_name(sr_asc_lon),
            "formatted":       _fmt_lon(sr_asc_lon),
            "in_natal_house":  sr_asc_in_natal_house,
            "sphere_label":    SPHERE_LABELS.get(sr_asc_in_natal_house, ""),
            "resonance_natal_asc_deg": round(asc_resonance, 2),
            "resonance_natal_mc_deg":  round(_angle_diff(sr_asc_lon, natal_mc_lon), 2),
            "resonance_category": (
                "exact_resonance" if asc_resonance < 5  else
                "high_resonance"  if asc_resonance < 10 else
                "moderate"        if asc_resonance < 20 else
                "standard"
            ),
        },

        # Priority 2: Angular planets
        "angular_planets": angular_planets,

        # Priority 3: SR MC
        "sr_mc": {
            "lon":            round(sr_mc_lon, 2),
            "sign":           sign_name(sr_mc_lon),
            "formatted":      _fmt_lon(sr_mc_lon),
            "in_natal_house": sr_mc_in_natal_house,
            "sphere_label":   SPHERE_LABELS.get(sr_mc_in_natal_house, ""),
            "resonance_natal_mc_deg": round(mc_resonance, 2),
        },

        # Priority 4: SR Sun
        "sr_sun": {
            "lon":         round(sr_sun_lon_raw, 2),
            "sign":        sign_name(sr_sun_lon_raw),
            "formatted":   _fmt_lon(sr_sun_lon_raw),
            "in_sr_house": sr_sun_in_sr_house,
            "year_theme":  SUN_IN_HOUSE_SR.get(sr_sun_in_sr_house, ""),
        },

        # Priority 5: SR Moon
        "sr_moon": {
            "lon":             round(sr_moon_lon, 2),
            "sign":            sr_moon_sign,
            "formatted":       _fmt_lon(sr_moon_lon),
            "in_sr_house":     sr_moon_in_sr_house,
            "in_natal_house":  sr_moon_in_natal_house,
            "description":     MOON_IN_HOUSE_SR_FULL.get(sr_moon_in_sr_house, ""),
        },

        # Priority 6 (NEW): ASC ruler
        "sr_asc_ruler": {
            "planet":          ruler_planet,
            "lon":             round(ruler_lon, 2),
            "sign":            ruler_sign,
            "formatted":       ruler_formatted,
            "in_sr_house":     ruler_in_sr_house,
            "in_natal_house":  ruler_in_natal_house,
            "sphere_label":    SPHERE_LABELS.get(ruler_in_natal_house, ""),
        },

        # Priority 7: SR → natal aspects
        "sr_to_natal_aspects": sr_to_natal_aspects[:25],

        # Priority 8: SR planets in natal houses
        "sr_planets_in_natal_houses": sr_in_natal_houses,

        # All SR planets in SR houses
        "sr_planet_houses": sr_planet_houses,

        # Natal reference
        "natal_angles": {
            "asc": {
                "lon":       round(natal_asc_lon, 2),
                "sign":      sign_name(natal_asc_lon),
                "formatted": _fmt_lon(natal_asc_lon),
            },
            "mc": {
                "lon":       round(natal_mc_lon, 2),
                "sign":      sign_name(natal_mc_lon),
                "formatted": _fmt_lon(natal_mc_lon),
            },
        },

        # Planetary returns
        "planetary_returns": planetary_returns,

        # Priority system reference
        "priority_method": PRIORITY_ORDER,

        # Full SR chart passthrough
        "sr_chart": {
            "planets": sr_planets_fmt,
            "houses":  sr_houses_fmt,
        },

        # Russian interpretation text
        "interpretation": interpretation,
    }

    if holos_data is not None:
        result["holos_intersection"] = holos_data

    if lunar_calendar is not None:
        result["lunar_return_calendar"] = lunar_calendar
        if hot_months:
            result["hot_months"] = hot_months

    return result



# ═══════════════════════════════════════════════════════════════════════════
# 12 STATISTICAL HYPOTHESES
# ═══════════════════════════════════════════════════════════════════════════

def generate_sr_hypotheses() -> list:
    """12 testable hypotheses about solar returns for statistical validation."""
    return [
        {
            "id": "SR-1",
            "name": "АСЦ соляра = натальный АСЦ → максимальный год",
            "formula": "|ASC_SR - ASC_natal| < 5° → hit_rate++",
            "testable": (
                "Найти годы когда АСЦ соляра ≈ натальному АСЦ (разница < 5°). "
                "Проверить: больше ли число значимых событий по сравнению с обычными годами?"
            ),
            "expectation": "effect > 1.5×",
            "dataset": "holos_analytics.db",
        },
        {
            "id": "SR-2",
            "name": "Юпитер в 1м доме соляра → год удачи",
            "formula": "Jupiter_SR in house_1_SR → positive events",
            "testable": (
                "Astrodatabank: годы с Jup_SR в 1м доме. "
                "Сравнить hit_rate с другими домами Юпитера."
            ),
            "expectation": "Jup_1 > Jup_12 по числу позитивных событий",
            "dataset": "astrodatabank",
        },
        {
            "id": "SR-3",
            "name": "Правило города: место встречи определяет год",
            "formula": "SR_ASC(city_A) ≠ SR_ASC(city_B) → разные события",
            "testable": (
                "Собрать выборку людей которые встречали соляр в разных городах. "
                "Сравнить какой соляр 'отыгрался' по событиям."
            ),
            "expectation": "Место встречи ≥ 70% совпадений (по данным Андреева)",
            "dataset": "user_retrospective",
        },
        {
            "id": "SR-4",
            "name": "Двойной возврат = год максимума (HOLOS × Соляр)",
            "formula": "SR + Jupiter_return в один год → top event year",
            "testable": (
                "Найти людей у кого Юпитер-ретурн совпал с датой соляра (±3 мес). "
                "Проверить значимость событий в такие годы."
            ),
            "expectation": "Двойной возврат → значимые события в 90%+ случаев",
            "dataset": "holos_analytics.db + astrodatabank",
        },
        {
            "id": "SR-5",
            "name": "τ-инвариант внутри соляра",
            "formula": "События соляра кластеризуются каждые τ/12 месяцев",
            "testable": (
                "Взять τ человека. Разбить соляр на части τ/12. "
                "Проверить: события происходят в τ-кратные месяцы?"
            ),
            "expectation": "effect > 1.2× для τ/12 внутри годового цикла",
            "dataset": "holos_analytics.db",
        },
        {
            "id": "SR-6",
            "name": "Луна соляра в 1м доме соляра = эмоциональный год",
            "formula": "Moon_SR house_1 → публичность через эмоции",
            "testable": (
                "Astrodatabank occupation: актёры/психологи чаще имеют "
                "Луну в 1м доме соляра в год дебюта?"
            ),
            "expectation": "p < 0.05",
            "dataset": "astrodatabank",
        },
        {
            "id": "SR-7",
            "name": "Сатурн в 10м доме соляра = год карьерного взлёта ИЛИ краха",
            "formula": "Saturn_SR house_10 → extreme career event",
            "testable": (
                "Оба исхода (взлёт И крах) должны быть статистически "
                "более частыми чем у Сатурна в других домах."
            ),
            "expectation": "Биномодальное распределение карьерных событий",
            "dataset": "astrodatabank",
        },
        {
            "id": "SR-8",
            "name": "α-адрес рождения ≈ год соляра → HOLOS-усиленный год",
            "formula": "birth + 137/n ≈ current_year → соляр этого года особый",
            "testable": (
                "Проверить: в α-адресные годы соляр даёт "
                "больше верифицированных событий чем в обычные годы."
            ),
            "expectation": "α-годы соляра: hit_rate > 50%",
            "dataset": "holos_analytics.db",
        },
        {
            "id": "SR-9",
            "name": "Соляр на год смерти: АСЦ в 8м доме натала",
            "formula": "SR_ASC in natal_house_8 → death year",
            "testable": (
                "Astrodatabank: у умерших проверить АСЦ соляра "
                "в год смерти. Чаще ли он в натальном 8м?"
            ),
            "expectation": "effect > 2× (сильный сигнал)",
            "dataset": "astrodatabank",
        },
        {
            "id": "SR-10",
            "name": "Солнце соляра конъюнкт натальному Сатурну → год труда/ограничений",
            "formula": "|Sun_SR - Saturn_natal| < 3° → restrictive year",
            "testable": (
                "Найти эти годы у известных людей. "
                "Сравнить с годами Sun_SR конъюнкт Jupiter_natal."
            ),
            "expectation": "Противоположные событийные паттерны",
            "dataset": "astrodatabank",
        },
        {
            "id": "SR-11",
            "name": "Правило 3-6-9 внутри соляра",
            "formula": "3й, 6й, 9й месяцы соляра = переломные точки",
            "testable": (
                "События соляра кластеризуются у 3,6,9,12-го месяца "
                "от даты соляра? (квартальный ритм)"
            ),
            "expectation": "effect 1.3× у этих дат",
            "dataset": "user_retrospective",
        },
        {
            "id": "SR-12",
            "name": "Лунная фаза рождения × соляр",
            "formula": (
                "Рождённые на убывающей Луне (Disseminating, ~240°) "
                "имеют иной паттерн соляра чем рождённые на растущей"
            ),
            "testable": (
                "Разбить Astrodatabank по лунной фазе рождения. "
                "Проверить hit_rate соляра по группам."
            ),
            "expectation": (
                "Disseminating (убывающая горбатая) → "
                "лучший hit_rate в 9-10 доме соляра"
            ),
            "dataset": "astrodatabank",
        },
    ]


# ═══════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════

def _parse_natal_to_jd(args) -> float:
    """Convert CLI natal args to Julian Date."""
    from astro_engine import parse_date_arg, parse_time_arg
    yr, mo, dy = parse_date_arg(args.natal_date)
    h, mi, sc  = parse_time_arg(args.natal_time)
    utc_offset = float(args.utc)
    return jd(yr, mo, dy, h - utc_offset, mi, sc)


def main():
    parser = argparse.ArgumentParser(
        description="Solar Return Deep Analysis Engine",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--natal-date",  required=True, help="Birth date YYYY-MM-DD")
    parser.add_argument("--natal-time",  required=True, help="Birth time HH:MM")
    parser.add_argument("--natal-lat",   required=True, type=float, help="Birth latitude")
    parser.add_argument("--natal-lon",   required=True, type=float, help="Birth longitude")
    parser.add_argument("--utc",         required=True, type=float, help="UTC offset at birth")
    parser.add_argument("--year",        required=True, type=int,   help="Solar return year")
    parser.add_argument("--obs-lat",     type=float, help="Observation latitude (default = natal)")
    parser.add_argument("--obs-lon",     type=float, help="Observation longitude (default = natal)")
    parser.add_argument("--houses",      default="placidus", help="House system")
    parser.add_argument("--holos",       action="store_true", help="Include HOLOS α-intersection")
    parser.add_argument("--lunars",      action="store_true", help="Include lunar return calendar")
    parser.add_argument("--cities",      action="store_true", help="Run city comparison for Alexander's cities")
    parser.add_argument("--hypotheses",  action="store_true", help="Print 12 SR hypotheses")
    parser.add_argument("--json",        action="store_true", help="Output raw JSON")
    args = parser.parse_args()

    natal_jd_val = _parse_natal_to_jd(args)
    obs_lat = args.obs_lat if args.obs_lat is not None else args.natal_lat
    obs_lon = args.obs_lon if args.obs_lon is not None else args.natal_lon

    if args.hypotheses:
        hyps = generate_sr_hypotheses()
        if args.json:
            print(json.dumps(hyps, ensure_ascii=False, indent=2))
        else:
            print("=" * 65)
            print("12 ГИПОТЕЗ ДЛЯ СТАТИСТИЧЕСКОЙ ПРОВЕРКИ СОЛЯРА")
            print("=" * 65)
            for h in hyps:
                print(f"\n[{h['id']}] {h['name']}")
                print(f"  Формула:   {h['formula']}")
                print(f"  Тест:      {h['testable']}")
                print(f"  Ожидание:  {h['expectation']}")
                print(f"  Датасет:   {h['dataset']}")
        return

    if args.cities:
        # Alexander's key cities
        cities = [
            {"name": "Тирасполь (рождение)",  "lat": 46.85, "lon": 29.61},
            {"name": "Краснодар (дом)",        "lat": 45.04, "lon": 38.98},
            {"name": "Тбилиси",                "lat": 41.69, "lon": 44.83},
            {"name": "Батуми",                 "lat": 41.64, "lon": 41.64},
            {"name": "Москва",                 "lat": 55.75, "lon": 37.62},
            {"name": "Белград",                "lat": 44.79, "lon": 20.46},
            {"name": "Милан",                  "lat": 45.46, "lon":  9.19},
            {"name": "Берлин",                 "lat": 52.52, "lon": 13.40},
            {"name": "Стамбул",                "lat": 41.01, "lon": 28.97},
            {"name": "Бишкек",                 "lat": 42.87, "lon": 74.59},
        ]
        result = city_asc_comparison(
            natal_jd_val, args.year, cities,
            args.natal_lat, args.natal_lon, args.houses,
        )
        if args.json:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print("=" * 65)
            print(f"СРАВНЕНИЕ ГОРОДОВ ДЛЯ СОЛЯРА {args.year}")
            print(f"Натальный АСЦ: {result['natal_asc']['formatted']}")
            print(f"Натальный МС:  {result['natal_mc']['formatted']}")
            print("=" * 65)
            print(f"\n{'Город':<30} {'АСЦ соляра':<20} {'ΔАСЦ от нат.':<16} {'Категория'}")
            print("─" * 90)
            for c in result["cities"]:
                if "error" in c:
                    print(f"  {c['city']:<28} ОШИБКА: {c['error']}")
                    continue
                print(
                    f"  {c['city']:<28} {c['sr_asc']['formatted']:<20} "
                    f"{c['sr_asc']['diff_from_natal_asc']:>7.1f}°        {c['category']}"
                )
            print(f"\n{result['recommendation']}")
        return

    # Default: deep analysis
    result = solar_return_deep_analysis(
        natal_jd_val, args.year,
        obs_lat, obs_lon,
        args.natal_lat, args.natal_lon,
        args.houses,
        include_holos=args.holos,
        include_lunars=args.lunars,
    )

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(result.get("interpretation", ""))
        print()
        if result.get("planetary_returns"):
            print("ПЛАНЕТАРНЫЕ РЕТУРНЫ:")
            for r in result["planetary_returns"]:
                print(f"  • {r['description']}")
        if result.get("holos_intersection"):
            h = result["holos_intersection"]
            print(f"\nHOLOS: {h['description']}")


if __name__ == "__main__":
    main()
