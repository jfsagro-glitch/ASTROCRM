#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AstroCRM — Numerology & Kabbalah Engine
=========================================
Algorithms:
  - Life Path Number (Pythagorean, master numbers 11/22/33)
  - Personal Year Number (9-year cycle)
  - Kabbalah Number (letter-sum method, MOD 9 + 1)
  - Tikkun Number (Berg's 72-angel system)
  - Tree of Life Mapping (planets → Sephiroth → pillar balance)
  - Numerology Profile (aggregate report)
"""

from __future__ import annotations
import re
from datetime import date as _date
from typing import Optional

# ── Helper: digit reduction ───────────────────────────────────────────────────

def _sum_digits(n: int) -> int:
    return sum(int(d) for d in str(abs(n)))

def _reduce(n: int, master: bool = True) -> int:
    """Reduce to single digit; preserve 11, 22, 33 if master=True."""
    while n > 9 and not (master and n in (11, 22, 33)):
        n = _sum_digits(n)
    return n

# ── Life Path Number ──────────────────────────────────────────────────────────

def life_path_number(date_str: str) -> dict:
    """
    Life Path = reduce(day) + reduce(month) + reduce(year).
    Master numbers 11, 22, 33 preserved.
    date_str: YYYY-MM-DD
    """
    try:
        y, m, d = [int(x) for x in date_str.split("-")]
    except ValueError:
        return {"error": "invalid date format (YYYY-MM-DD required)"}

    rd = _reduce(_sum_digits(d))
    rm = _reduce(_sum_digits(m))
    ry = _reduce(_sum_digits(y))
    total = rd + rm + ry
    lp = _reduce(total)

    _MEANINGS = {
        1:  "Лидер и пионер. Независимость, самодостаточность, инициатива.",
        2:  "Дипломат. Сотрудничество, интуиция, баланс.",
        3:  "Творец. Самовыражение, радость, общение.",
        4:  "Строитель. Дисциплина, порядок, труд.",
        5:  "Путешественник. Свобода, перемены, авантюризм.",
        6:  "Воспитатель. Забота, ответственность, гармония.",
        7:  "Мыслитель. Анализ, духовный поиск, одиночество.",
        8:  "Власть. Материальный успех, сила воли, реализм.",
        9:  "Гуманист. Альтруизм, мудрость, завершение.",
        11: "Мастер-интуит. Вдохновение, духовная миссия.",
        22: "Мастер-строитель. Глобальные проекты, материализация мечты.",
        33: "Мастер-учитель. Бескорыстная любовь, исцеление мира.",
    }
    return {
        "number": lp,
        "day_reduced": rd,
        "month_reduced": rm,
        "year_reduced": ry,
        "total_before_reduction": total,
        "is_master": lp in (11, 22, 33),
        "meaning": _MEANINGS.get(lp, ""),
    }

# ── Personal Year Number ──────────────────────────────────────────────────────

def personal_year(date_str: str, current_year: Optional[int] = None) -> dict:
    """
    Personal Year = reduce(day + month + current_year).
    Returns current year cycle, next year preview, and 9-year arc.
    """
    try:
        y, m, d = [int(x) for x in date_str.split("-")]
    except ValueError:
        return {"error": "invalid date format"}

    if current_year is None:
        current_year = _date.today().year

    def _py(yr):
        return _reduce(_sum_digits(d) + _sum_digits(m) + _sum_digits(yr), master=False)

    _THEMES = {
        1: "Новые начала. Посев семян, запуск проектов.",
        2: "Партнёрство. Терпение, сотрудничество, ожидание.",
        3: "Рост и творчество. Общение, расширение.",
        4: "Труд и фундамент. Строительство, дисциплина.",
        5: "Перемены. Свобода, движение, неожиданности.",
        6: "Ответственность. Семья, здоровье, служение.",
        7: "Рефлексия. Духовный поиск, обучение, одиночество.",
        8: "Власть и успех. Финансы, карьера, результаты.",
        9: "Завершение. Отпускание, итоги, трансформация.",
    }
    cur = _py(current_year)
    return {
        "current_year": current_year,
        "personal_year": cur,
        "theme": _THEMES.get(cur, ""),
        "next_year": _py(current_year + 1),
        "next_theme": _THEMES.get(_py(current_year + 1), ""),
        "9year_cycle": [
            {"year": current_year - (cur - 1) + i, "py": _py(current_year - (cur - 1) + i),
             "theme": _THEMES.get(_py(current_year - (cur - 1) + i), "")}
            for i in range(9)
        ],
    }

# ── Kabbalah Number ───────────────────────────────────────────────────────────

# Hebrew letter → numeric value (simple English transliteration mapping)
_KABBALAH_MAP: dict[str, int] = {
    'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5,
    'f': 6, 'g': 7, 'h': 8, 'i': 9, 'j': 1,
    'k': 2, 'l': 3, 'm': 4, 'n': 5, 'o': 7,
    'p': 8, 'q': 1, 'r': 2, 's': 3, 't': 4,
    'u': 6, 'v': 6, 'w': 6, 'x': 5, 'y': 1,
    'z': 7,
}

def kabbalah_number(name: str) -> dict:
    """
    Kabbalah Number = sum of letter values MOD 9, then + 1 if result = 0.
    Returns number 1–9 with Kabbalistic meaning.
    """
    clean = re.sub(r'[^a-zA-Z]', '', name.lower())
    if not clean:
        return {"error": "no valid letters in name", "number": None}
    total = sum(_KABBALAH_MAP.get(c, 0) for c in clean)
    kn = (total % 9) or 9

    _MEANINGS = {
        1: "Солнце. Лидерство, оригинальность, сила воли.",
        2: "Луна. Эмоции, интуиция, мягкость.",
        3: "Юпитер. Рост, мудрость, щедрость.",
        4: "Уран. Нестандартность, революция, разрыв.",
        5: "Меркурий. Общение, гибкость, интеллект.",
        6: "Венера. Любовь, красота, гармония.",
        7: "Нептун. Духовность, мистика, иллюзии.",
        8: "Сатурн. Карма, испытания, мастерство.",
        9: "Марс. Воля, энергия, активность.",
    }
    return {
        "number":   kn,
        "raw_sum":  total,
        "letters":  clean,
        "meaning":  _MEANINGS.get(kn, ""),
    }

# ── 72 Angels of the Shemhamphorash (complete table) ─────────────────────────
#
# Each angel governs 5° of the ecliptic (72 × 5° = 360°).
# Decan rulers follow Chaldean tradition (Golden Dawn assignment).
# Tarot pip cards follow Golden Dawn decan-to-card mapping.
# Format: (name, hebrew, decan_planet, tarot_card)
#
# Decan rulers by sign (10° each, 3 per sign):
#   Aries:      Mars / Sun / Venus
#   Taurus:     Mercury / Moon / Saturn
#   Gemini:     Jupiter / Mars / Sun
#   Cancer:     Venus / Mercury / Moon
#   Leo:        Saturn / Jupiter / Mars
#   Virgo:      Sun / Venus / Mercury
#   Libra:      Moon / Saturn / Jupiter
#   Scorpio:    Mars / Sun / Venus
#   Sagittarius:Mercury / Moon / Saturn
#   Capricorn:  Jupiter / Mars / Sun
#   Aquarius:   Venus / Mercury / Moon
#   Pisces:     Saturn / Jupiter / Mars

_72_ANGELS_FULL: list[dict] = [
    # ── ARIES (0–30°) ─────────────────────────────────────────────────────────
    # Decan 1 (0–10°, Mars): Tarot 2 of Wands
    {"n":  1, "name": "Vehuiah",   "heb": "וְהוּיָה", "decan_planet": "mars",    "tarot": "2 of Wands",     "theme": "Воля, трансформация, начало"},
    {"n":  2, "name": "Jeliel",    "heb": "יֵלִיֵאל", "decan_planet": "mars",    "tarot": "2 of Wands",     "theme": "Любовь, плодородие, примирение"},
    # Decan 2 (10–20°, Sun): Tarot 3 of Wands
    {"n":  3, "name": "Sitael",    "heb": "סִיטָאֵל", "decan_planet": "sun",     "tarot": "3 of Wands",     "theme": "Строительство, защита, терпение"},
    {"n":  4, "name": "Elemiah",   "heb": "עֶלְמִיָה", "decan_planet": "sun",     "tarot": "3 of Wands",     "theme": "Путешествия, открытия, власть"},
    # Decan 3 (20–30°, Venus): Tarot 4 of Wands
    {"n":  5, "name": "Mahasiah",  "heb": "מַהַשִׁיָה", "decan_planet": "venus",   "tarot": "4 of Wands",     "theme": "Гармония, магия, исцеление"},
    {"n":  6, "name": "Lelahel",   "heb": "לֵלָהֵאל", "decan_planet": "venus",   "tarot": "4 of Wands",     "theme": "Свет, знание, удача"},
    # ── TAURUS (30–60°) ───────────────────────────────────────────────────────
    # Decan 1 (30–40°, Mercury): Tarot 5 of Pentacles
    {"n":  7, "name": "Achaiah",   "heb": "אַכַאיָה",  "decan_planet": "mercury", "tarot": "5 of Pentacles", "theme": "Терпение, тайные знания"},
    {"n":  8, "name": "Cahethel",  "heb": "כַהֵתֵאל", "decan_planet": "mercury", "tarot": "5 of Pentacles", "theme": "Благословение, сельское хозяйство"},
    # Decan 2 (40–50°, Moon): Tarot 6 of Pentacles
    {"n":  9, "name": "Haziel",    "heb": "הֲזִיאֵל",  "decan_planet": "moon",    "tarot": "6 of Pentacles", "theme": "Прощение, милосердие, любовь"},
    {"n": 10, "name": "Aladiah",   "heb": "אַלַדִיָה", "decan_planet": "moon",    "tarot": "6 of Pentacles", "theme": "Исцеление, прощение грехов"},
    # Decan 3 (50–60°, Saturn): Tarot 7 of Pentacles
    {"n": 11, "name": "Lauviah",   "heb": "לָאוּיָה",  "decan_planet": "saturn",  "tarot": "7 of Pentacles", "theme": "Победа, слава, высшее знание"},
    {"n": 12, "name": "Hahaiah",   "heb": "הַהַעִיָה", "decan_planet": "saturn",  "tarot": "7 of Pentacles", "theme": "Убежище, скрытые тайны"},
    # ── GEMINI (60–90°) ───────────────────────────────────────────────────────
    # Decan 1 (60–70°, Jupiter): Tarot 8 of Swords
    {"n": 13, "name": "Iezalel",   "heb": "יֵיְזַלֵאל", "decan_planet": "jupiter", "tarot": "8 of Swords",    "theme": "Верность, память, примирение"},
    {"n": 14, "name": "Mebahel",   "heb": "מֶבַהֵאל",  "decan_planet": "jupiter", "tarot": "8 of Swords",    "theme": "Истина, свобода, правосудие"},
    # Decan 2 (70–80°, Mars): Tarot 9 of Swords
    {"n": 15, "name": "Hariel",    "heb": "הַרִיאֵל",  "decan_planet": "mars",    "tarot": "9 of Swords",    "theme": "Очищение, вера, духовность"},
    {"n": 16, "name": "Hakamiah",  "heb": "הַקַמִיָה",  "decan_planet": "mars",    "tarot": "9 of Swords",    "theme": "Лояльность, победа над врагами"},
    # Decan 3 (80–90°, Sun): Tarot 10 of Swords
    {"n": 17, "name": "Lauviah II","heb": "לָאוּיָה",  "decan_planet": "sun",     "tarot": "10 of Swords",   "theme": "Откровения, пробуждение, вдохновение"},
    {"n": 18, "name": "Caliel",    "heb": "כַּלִיֵאל", "decan_planet": "sun",     "tarot": "10 of Swords",   "theme": "Правосудие, помощь в трудностях"},
    # ── CANCER (90–120°) ──────────────────────────────────────────────────────
    # Decan 1 (90–100°, Venus): Tarot 2 of Cups
    {"n": 19, "name": "Leuviah",   "heb": "לֵאוּיָה",  "decan_planet": "venus",   "tarot": "2 of Cups",      "theme": "Принятие, память, доброта"},
    {"n": 20, "name": "Pahaliah",  "heb": "פַּהַלִיָה", "decan_planet": "venus",   "tarot": "2 of Cups",      "theme": "Духовность, искупление, мораль"},
    # Decan 2 (100–110°, Mercury): Tarot 3 of Cups
    {"n": 21, "name": "Nelchael",  "heb": "נֵלְכָאֵל", "decan_planet": "mercury", "tarot": "3 of Cups",      "theme": "Обучение, победа над злом"},
    {"n": 22, "name": "Yeiayel",   "heb": "יֵיָיֵאל",  "decan_planet": "mercury", "tarot": "3 of Cups",      "theme": "Слава, путешествия, дипломатия"},
    # Decan 3 (110–120°, Moon): Tarot 4 of Cups
    {"n": 23, "name": "Melahel",   "heb": "מֵלָהֵאל",  "decan_planet": "moon",    "tarot": "4 of Cups",      "theme": "Исцеление, природа, безопасность"},
    {"n": 24, "name": "Haheuiah",  "heb": "הַהֵאוּיָה", "decan_planet": "moon",    "tarot": "4 of Cups",      "theme": "Защита, истина, изгнание"},
    # ── LEO (120–150°) ────────────────────────────────────────────────────────
    # Decan 1 (120–130°, Saturn): Tarot 5 of Wands
    {"n": 25, "name": "Nith-Haiah","heb": "נִיתַהַיָה", "decan_planet": "saturn",  "tarot": "5 of Wands",     "theme": "Магия, мудрость, высшие силы"},
    {"n": 26, "name": "Haaiah",    "heb": "הַאַיָה",   "decan_planet": "saturn",  "tarot": "5 of Wands",     "theme": "Политика, судьи, тайные операции"},
    # Decan 2 (130–140°, Jupiter): Tarot 6 of Wands
    {"n": 27, "name": "Yerathel",  "heb": "יֵרָתֵאל",  "decan_planet": "jupiter", "tarot": "6 of Wands",     "theme": "Освобождение, свет, прогресс"},
    {"n": 28, "name": "Seheiah",   "heb": "שֶׁהֵיָה",  "decan_planet": "jupiter", "tarot": "6 of Wands",     "theme": "Защита, долголетие, ясность"},
    # Decan 3 (140–150°, Mars): Tarot 7 of Wands
    {"n": 29, "name": "Reiyel",    "heb": "רֵיִיֵאל",  "decan_planet": "mars",    "tarot": "7 of Wands",     "theme": "Мистика, освобождение, медитация"},
    {"n": 30, "name": "Omael",     "heb": "אוֹמַאֵל",  "decan_planet": "mars",    "tarot": "7 of Wands",     "theme": "Умножение, терпение, биология"},
    # ── VIRGO (150–180°) ──────────────────────────────────────────────────────
    # Decan 1 (150–160°, Sun): Tarot 8 of Pentacles
    {"n": 31, "name": "Lecabel",   "heb": "לֶכַבֵאל",  "decan_planet": "sun",     "tarot": "8 of Pentacles", "theme": "Таланты, точность, ремесло"},
    {"n": 32, "name": "Vasariah",  "heb": "וָסַרִיָה",  "decan_planet": "sun",     "tarot": "8 of Pentacles", "theme": "Правосудие, прощение, доброта"},
    # Decan 2 (160–170°, Venus): Tarot 9 of Pentacles
    {"n": 33, "name": "Yehuiah",   "heb": "יֵהוּיָה",  "decan_planet": "venus",   "tarot": "9 of Pentacles", "theme": "Открытие заговоров, защита"},
    {"n": 34, "name": "Lehahiah",  "heb": "לֵהַחִיָה",  "decan_planet": "venus",   "tarot": "9 of Pentacles", "theme": "Послушание, мир, удача"},
    # Decan 3 (170–180°, Mercury): Tarot 10 of Pentacles
    {"n": 35, "name": "Chavakiah", "heb": "חַוַקִיָה",  "decan_planet": "mercury", "tarot": "10 of Pentacles","theme": "Примирение, наследие, семья"},
    {"n": 36, "name": "Menadel",   "heb": "מֵנָדֵאל",  "decan_planet": "mercury", "tarot": "10 of Pentacles","theme": "Работа, связи, освобождение"},
    # ── LIBRA (180–210°) ──────────────────────────────────────────────────────
    # Decan 1 (180–190°, Moon): Tarot 2 of Swords
    {"n": 37, "name": "Aniel",     "heb": "אַנִיאֵל",  "decan_planet": "moon",    "tarot": "2 of Swords",    "theme": "Наука, искусство, разрыв блокад"},
    {"n": 38, "name": "Haamiah",   "heb": "הַעַמִיָה",  "decan_planet": "moon",    "tarot": "2 of Swords",    "theme": "Ритуалы, истина, защита"},
    # Decan 2 (190–200°, Saturn): Tarot 3 of Swords
    {"n": 39, "name": "Rehael",    "heb": "רֵהַאֵל",   "decan_planet": "saturn",  "tarot": "3 of Swords",    "theme": "Исцеление, послушание, уважение"},
    {"n": 40, "name": "Ieiazel",   "heb": "יֵיָיְזֵאל", "decan_planet": "saturn",  "tarot": "3 of Swords",    "theme": "Творчество, свобода от тюрьмы"},
    # Decan 3 (200–210°, Jupiter): Tarot 4 of Swords
    {"n": 41, "name": "Hahahel",   "heb": "הַהַהֵאל",  "decan_planet": "jupiter", "tarot": "4 of Swords",    "theme": "Вера, миссия, духовность"},
    {"n": 42, "name": "Mikael",    "heb": "מִיכַאֵל",  "decan_planet": "jupiter", "tarot": "4 of Swords",    "theme": "Политический порядок, защита"},
    # ── SCORPIO (210–240°) ────────────────────────────────────────────────────
    # Decan 1 (210–220°, Mars): Tarot 5 of Cups
    {"n": 43, "name": "Veuliah",   "heb": "וֵאוּלִיָה", "decan_planet": "mars",    "tarot": "5 of Cups",      "theme": "Процветание, свобода, победа"},
    {"n": 44, "name": "Yelahiah",  "heb": "יֵלָהִיָה",  "decan_planet": "mars",    "tarot": "5 of Cups",      "theme": "Карма, воины, магия"},
    # Decan 2 (220–230°, Sun): Tarot 6 of Cups
    {"n": 45, "name": "Sealiah",   "heb": "סֵאַלִיָה",  "decan_planet": "sun",     "tarot": "6 of Cups",      "theme": "Воля, мотивация, разоблачение"},
    {"n": 46, "name": "Ariel",     "heb": "אַרִיאֵל",   "decan_planet": "sun",     "tarot": "6 of Cups",      "theme": "Откровения, мечты, восприятие"},
    # Decan 3 (230–240°, Venus): Tarot 7 of Cups
    {"n": 47, "name": "Asaliah",   "heb": "אַסַלִיָה",  "decan_planet": "venus",   "tarot": "7 of Cups",      "theme": "Созерцание, правда, высший план"},
    {"n": 48, "name": "Mihael",    "heb": "מִיהַאֵל",   "decan_planet": "venus",   "tarot": "7 of Cups",      "theme": "Мир, дружба, плодородие"},
    # ── SAGITTARIUS (240–270°) ────────────────────────────────────────────────
    # Decan 1 (240–250°, Mercury): Tarot 8 of Wands
    {"n": 49, "name": "Vehuel",    "heb": "וֵהוּאֵל",  "decan_planet": "mercury", "tarot": "8 of Wands",     "theme": "Величие, мудрость, благодарность"},
    {"n": 50, "name": "Daniel",    "heb": "דָנִיאֵל",   "decan_planet": "mercury", "tarot": "8 of Wands",     "theme": "Красноречие, закон, изобилие"},
    # Decan 2 (250–260°, Moon): Tarot 9 of Wands
    {"n": 51, "name": "Hahasiah",  "heb": "הַחַשִׁיָה", "decan_planet": "moon",    "tarot": "9 of Wands",     "theme": "Медицина, алхимия, тайны"},
    {"n": 52, "name": "Imamiah",   "heb": "עִמַמִיָה",  "decan_planet": "moon",    "tarot": "9 of Wands",     "theme": "Искупление, путешествия, сила"},
    # Decan 3 (260–270°, Saturn): Tarot 10 of Wands
    {"n": 53, "name": "Nanael",    "heb": "נַנַאֵל",    "decan_planet": "saturn",  "tarot": "10 of Wands",    "theme": "Духовное знание, философия"},
    {"n": 54, "name": "Nithael",   "heb": "נִיתָאֵל",   "decan_planet": "saturn",  "tarot": "10 of Wands",    "theme": "Долголетие, небесная монархия"},
    # ── CAPRICORN (270–300°) ──────────────────────────────────────────────────
    # Decan 1 (270–280°, Jupiter): Tarot 2 of Pentacles
    {"n": 55, "name": "Mebahiah",  "heb": "מֶבַהִיָה",  "decan_planet": "jupiter", "tarot": "2 of Pentacles", "theme": "Моральный порядок, плодородие"},
    {"n": 56, "name": "Poyel",     "heb": "פּוֹיֵאל",   "decan_planet": "jupiter", "tarot": "2 of Pentacles", "theme": "Удача, слава, скромность"},
    # Decan 2 (280–290°, Mars): Tarot 3 of Pentacles
    {"n": 57, "name": "Nemamiah",  "heb": "נֵמַמִיָה",  "decan_planet": "mars",    "tarot": "3 of Pentacles", "theme": "Дискриминация, военная стратегия"},
    {"n": 58, "name": "Yeialel",   "heb": "יֵיָלֵאל",   "decan_planet": "mars",    "tarot": "3 of Pentacles", "theme": "Мужество, ментальное здоровье"},
    # Decan 3 (290–300°, Sun): Tarot 4 of Pentacles
    {"n": 59, "name": "Harahel",   "heb": "הַרָחֵאל",   "decan_planet": "sun",     "tarot": "4 of Pentacles", "theme": "Интеллект, библиотеки, богатство"},
    {"n": 60, "name": "Mitzrael",  "heb": "מִיצְרָאֵל", "decan_planet": "sun",     "tarot": "4 of Pentacles", "theme": "Ремонт, исцеление, послушание"},
    # ── AQUARIUS (300–330°) ───────────────────────────────────────────────────
    # Decan 1 (300–310°, Venus): Tarot 5 of Swords
    {"n": 61, "name": "Umabel",    "heb": "אוּמָבֵאל",  "decan_planet": "venus",   "tarot": "5 of Swords",    "theme": "Дружба, чувствительность, астрология"},
    {"n": 62, "name": "Iah-Hel",   "heb": "יָהֵאֵל",   "decan_planet": "venus",   "tarot": "5 of Swords",    "theme": "Мудрость, уединение, философия"},
    # Decan 2 (310–320°, Mercury): Tarot 6 of Swords
    {"n": 63, "name": "Anauel",    "heb": "אַנָאוּאֵל",  "decan_planet": "mercury", "tarot": "6 of Swords",    "theme": "Единство, защита, коммерция"},
    {"n": 64, "name": "Mehiel",    "heb": "מֵהִיאֵל",   "decan_planet": "mercury", "tarot": "6 of Swords",    "theme": "Защита от злых духов, писатели"},
    # Decan 3 (320–330°, Moon): Tarot 7 of Swords
    {"n": 65, "name": "Damabiah",  "heb": "דַמַבִּיָה",  "decan_planet": "moon",    "tarot": "7 of Swords",    "theme": "Фонтаны мудрости, мореплавание"},
    {"n": 66, "name": "Manakel",   "heb": "מַנַקֵאל",   "decan_planet": "moon",    "tarot": "7 of Swords",    "theme": "Знание добра и зла, спокойствие"},
    # ── PISCES (330–360°) ─────────────────────────────────────────────────────
    # Decan 1 (330–340°, Saturn): Tarot 8 of Cups
    {"n": 67, "name": "Eyael",     "heb": "אֵיָיֵאל",   "decan_planet": "saturn",  "tarot": "8 of Cups",      "theme": "Перемены, возвышенные знания"},
    {"n": 68, "name": "Habuhiah",  "heb": "הַבוּהִיָה",  "decan_planet": "saturn",  "tarot": "8 of Cups",      "theme": "Исцеление, природа, сельское хозяйство"},
    # Decan 2 (340–350°, Jupiter): Tarot 9 of Cups
    {"n": 69, "name": "Rochel",    "heb": "רוֹחֵאל",    "decan_planet": "jupiter", "tarot": "9 of Cups",      "theme": "Нахождение потерянного, закон"},
    {"n": 70, "name": "Jabamiah",  "heb": "יָבָמִיָה",   "decan_planet": "jupiter", "tarot": "9 of Cups",      "theme": "Алхимия, возрождение, природа"},
    # Decan 3 (350–360°, Mars): Tarot 10 of Cups
    {"n": 71, "name": "Haiaiel",   "heb": "הַיָּיֵאל",   "decan_planet": "mars",    "tarot": "10 of Cups",     "theme": "Победа, оружие, разрешение конфликтов"},
    {"n": 72, "name": "Mumiah",    "heb": "מוּמִיָה",    "decan_planet": "mars",    "tarot": "10 of Cups",     "theme": "Конец цикла, возрождение, медицина"},
]

# Backwards-compatible name-only list
_72_ANGELS = [a["name"] for a in _72_ANGELS_FULL]


def get_angel_for_lon(lon: float) -> dict:
    """Return the Shem angel governing a given ecliptic longitude (0–360°)."""
    lon = lon % 360
    idx = int(lon / 5)         # 0–71
    return _72_ANGELS_FULL[idx]


def calc_natal_angels(natal_chart: dict) -> dict:
    """
    For each natal planet, identify which of the 72 Shem angels governs
    its ecliptic degree (every 5° = one angel).

    Returns a dict: {planet: {angel_number, angel_name, hebrew, decan_planet,
                               tarot, theme, lon, sign}}
    """
    planets = natal_chart.get("planets", {})
    result = {}
    for pname, pdata in planets.items():
        if not isinstance(pdata, dict):
            continue
        lon = pdata.get("lon") or pdata.get("longitude")
        if lon is None:
            continue
        angel = get_angel_for_lon(lon)
        result[pname] = {
            "planet":       pname,
            "lon":          round(lon, 4),
            "sign":         pdata.get("sign", ""),
            "angel_number": angel["n"],
            "angel_name":   angel["name"],
            "hebrew":       angel["heb"],
            "decan_planet": angel["decan_planet"],
            "tarot_card":   angel["tarot"],
            "theme":        angel["theme"],
        }
    return result

def tikkun_number(date_str: str) -> dict:
    """
    Tikkun (Berg method): sum all digits of DDMMYYYY → reduce to 1–72 → angel.
    The Tikkun represents the soul's correction/mission in this life.
    """
    try:
        y, m, d = [int(x) for x in date_str.split("-")]
    except ValueError:
        return {"error": "invalid date format"}

    # DDMMYYYY format
    digits_str = f"{d:02d}{m:02d}{y:04d}"
    total = sum(int(c) for c in digits_str)

    # Reduce to ≤ 72
    while total > 72:
        total = sum(int(c) for c in str(total))
    if total == 0:
        total = 1

    angel_name = _72_ANGELS[total - 1] if total <= len(_72_ANGELS) else f"Angel #{total}"
    # Each angel corresponds to 5° of the zodiac (72 × 5° = 360°)
    lon_start = (total - 1) * 5.0
    sign_idx  = int(lon_start / 30)
    _SIGNS = ["Овен", "Телец", "Близнецы", "Рак", "Лев", "Дева",
              "Весы", "Скорпион", "Стрелец", "Козерог", "Водолей", "Рыбы"]

    return {
        "tikkun_number": total,
        "angel":         angel_name,
        "zodiac_lon":    lon_start,
        "sign":          _SIGNS[sign_idx % 12],
        "degree_in_sign": lon_start % 30,
        "description":   (
            f"Ангел {angel_name} (Тиккун #{total}). "
            f"Область коррекции: {lon_start:.1f}° зодиака ({_SIGNS[sign_idx % 12]} {lon_start % 30:.0f}°). "
            "Работа с этим ангелом помогает трансформировать карму и реализовать душевную миссию."
        ),
    }

# ── Tree of Life Mapping ──────────────────────────────────────────────────────

_SEPHIROTH = {
    "kether":   {"number": 1,  "name_ru": "Кетер",   "planet": "neptune", "pillar": "middle",  "theme": "Единство, трансцендентное"},
    "chokmah":  {"number": 2,  "name_ru": "Хокма",   "planet": "uranus",  "pillar": "right",   "theme": "Мудрость, инициация"},
    "binah":    {"number": 3,  "name_ru": "Бина",    "planet": "saturn",  "pillar": "left",    "theme": "Понимание, форма, ограничение"},
    "chesed":   {"number": 4,  "name_ru": "Хесед",   "planet": "jupiter", "pillar": "right",   "theme": "Милосердие, рост, щедрость"},
    "geburah":  {"number": 5,  "name_ru": "Гебура",  "planet": "mars",    "pillar": "left",    "theme": "Сила, суд, очищение"},
    "tiphareth":{"number": 6,  "name_ru": "Тиферет", "planet": "sun",     "pillar": "middle",  "theme": "Красота, равновесие, Высшее Я"},
    "netzach":  {"number": 7,  "name_ru": "Нецах",   "planet": "venus",   "pillar": "right",   "theme": "Победа, природа, желания"},
    "hod":      {"number": 8,  "name_ru": "Ход",     "planet": "mercury", "pillar": "left",    "theme": "Слава, интеллект, коммуникация"},
    "yesod":    {"number": 9,  "name_ru": "Йесод",   "planet": "moon",    "pillar": "middle",  "theme": "Основание, подсознание, астральный план"},
    "malkuth":  {"number": 10, "name_ru": "Малхут",  "planet": "earth",   "pillar": "middle",  "theme": "Царство, материальный мир, воплощение"},
}

_PLANET_TO_SEPHIRAH = {v["planet"]: k for k, v in _SEPHIROTH.items()}

def tree_of_life_profile(natal_chart: dict) -> dict:
    """
    Map natal chart planets to Sephiroth.
    Returns mapping, pillar balance, and active/vacant Sephiroth.
    """
    planets = natal_chart.get("planets", {})
    pillar_counts = {"right": 0, "left": 0, "middle": 0}
    active = {}
    vacant = []

    for seph_key, seph_data in _SEPHIROTH.items():
        planet = seph_data["planet"]
        if planet in planets:
            lon = planets[planet].get("longitude") or planets[planet].get("lon", 0)
            sign = planets[planet].get("sign", "")
            active[seph_key] = {
                "sephirah":   seph_data["name_ru"],
                "number":     seph_data["number"],
                "planet":     planet,
                "sign":       sign,
                "lon":        lon,
                "pillar":     seph_data["pillar"],
                "theme":      seph_data["theme"],
            }
            pillar_counts[seph_data["pillar"]] += 1
        else:
            vacant.append(seph_key)

    # Pillar labels
    pillar_labels = {
        "right":  "Столп Милосердия (Яхин) — Юпитер, Венера, Хокма",
        "left":   "Столп Суровости (Боаз) — Сатурн, Марс, Меркурий",
        "middle": "Столп Равновесия — Солнце, Луна, Нептун",
    }

    dominant = max(pillar_counts, key=lambda k: pillar_counts[k])
    balance_comment = {
        "right":  "Преобладает энергия расширения и милосердия — риск чрезмерного оптимизма.",
        "left":   "Преобладает энергия структуры и суровости — риск ригидности.",
        "middle": "Баланс активен через центральный столп — гармония и интеграция.",
    }[dominant]

    return {
        "active_sephiroth": active,
        "vacant_sephiroth": vacant,
        "pillar_counts":    pillar_counts,
        "dominant_pillar":  dominant,
        "dominant_label":   pillar_labels[dominant],
        "balance_comment":  balance_comment,
    }


# ── Four Worlds of Kabbalah (Arba Olamot) ─────────────────────────────────────
#
# Atziluth  (Emanation) — Fire  — Yod     — Kether, Chokmah, Binah
# Briah     (Creation)  — Water — He      — Chesed, Geburah, Tiphareth
# Yetzirah  (Formation) — Air   — Vav     — Netzach, Hod, Yesod
# Assiah    (Action)    — Earth — He-fin  — Malkuth
#
# Soul levels: Chaiah / Neshamah / Ruach / Nefesh
# Each world vibrates at a different frequency of divine expression.

_FOUR_WORLDS: dict[str, dict] = {
    "atziluth": {
        "name_ru":    "Ацилут (Эманация)",
        "name_en":    "Atziluth",
        "element":    "fire",
        "element_ru": "Огонь",
        "hebrew_letter": "יוֹד (Yod)",
        "soul_level": "Chaiah (חַיָּה) — жизненная сила",
        "sephiroth":  ["kether", "chokmah", "binah"],
        "planets":    ["neptune", "uranus", "saturn"],
        "theme":      "Прямое излучение Бесконечного. Архетип без формы.",
        "questions":  ["Зачем я здесь?", "Что моя душа знает до воплощения?",
                       "Какова моя высшая миссия?"],
        "practice":   "Молчаливое созерцание. Медитация без объекта. Чистое Бытие.",
    },
    "briah": {
        "name_ru":    "Бриа (Творение)",
        "name_en":    "Briah",
        "element":    "water",
        "element_ru": "Вода",
        "hebrew_letter": "הֵא (He)",
        "soul_level": "Neshamah (נְשָׁמָה) — высший ум, интуиция",
        "sephiroth":  ["chesed", "geburah", "tiphareth"],
        "planets":    ["jupiter", "mars", "sun"],
        "theme":      "Архетипические образы получают форму. Мир высших идей.",
        "questions":  ["Что я создаю в этой жизни?", "Где моя сила и где моё ограничение?",
                       "Как я реализую красоту?"],
        "practice":   "Визуализация. Работа с образами. Намерение в медитации.",
    },
    "yetzirah": {
        "name_ru":    "Йецира (Формирование)",
        "name_en":    "Yetzirah",
        "element":    "air",
        "element_ru": "Воздух",
        "hebrew_letter": "וָו (Vav)",
        "soul_level": "Ruach (רוּחַ) — разум, речь, воображение",
        "sephiroth":  ["netzach", "hod", "yesod"],
        "planets":    ["venus", "mercury", "moon"],
        "theme":      "Астральный план. Желания, коммуникация, подсознание.",
        "questions":  ["Чего я на самом деле хочу?", "Как я думаю и говорю?",
                       "Что живёт в моих снах?"],
        "practice":   "Работа со снами. Аффирмации. Запись потока сознания.",
    },
    "assiah": {
        "name_ru":    "Асия (Действие)",
        "name_en":    "Assiah",
        "element":    "earth",
        "element_ru": "Земля",
        "hebrew_letter": "הֵא סוֹפִית (He-final)",
        "soul_level": "Nefesh (נֶפֶשׁ) — животная душа, инстинкты, тело",
        "sephiroth":  ["malkuth"],
        "planets":    ["earth"],
        "theme":      "Материальный мир. Воплощение. Физическое действие.",
        "questions":  ["Что я реально делаю?", "Как я живу в теле?",
                       "Что я оставляю после себя в материальном мире?"],
        "practice":   "Физический труд. Забота о теле. Конкретные действия.",
    },
}

# Which world each sephirah belongs to
_SEPHIRAH_TO_WORLD = {
    "kether":    "atziluth", "chokmah":    "atziluth", "binah":    "atziluth",
    "chesed":    "briah",    "geburah":    "briah",    "tiphareth":"briah",
    "netzach":   "yetzirah", "hod":        "yetzirah", "yesod":    "yetzirah",
    "malkuth":   "assiah",
}


def four_worlds_profile(natal_chart: dict) -> dict:
    """
    Map the natal chart to the Four Worlds of Kabbalah (Arba Olamot).

    Returns:
        worlds_balance: count of planets per world
        dominant_world: which world is most occupied
        planets_by_world: {world: [{planet, lon, sign, sephirah}]}
        world_descriptions: full dict from _FOUR_WORLDS
        interpretation: narrative about the chart's Four-Worlds profile
    """
    planets = natal_chart.get("planets", {})

    # Planet → Sephirah → World
    planet_to_seph = {v["planet"]: k for k, v in _SEPHIROTH.items()}
    planets_by_world: dict[str, list] = {w: [] for w in _FOUR_WORLDS}
    world_counts: dict[str, int] = {w: 0 for w in _FOUR_WORLDS}

    for pname, pdata in planets.items():
        if not isinstance(pdata, dict):
            continue
        seph = planet_to_seph.get(pname)
        if seph is None:
            continue
        world = _SEPHIRAH_TO_WORLD.get(seph)
        if world is None:
            continue
        lon  = pdata.get("lon") or pdata.get("longitude", 0)
        sign = pdata.get("sign", "")
        planets_by_world[world].append({
            "planet":   pname,
            "sephirah": seph,
            "lon":      round(lon, 2),
            "sign":     sign,
        })
        world_counts[world] += 1

    dominant_world = max(world_counts, key=lambda w: world_counts[w])
    dw = _FOUR_WORLDS[dominant_world]

    # Build interpretation
    total = sum(world_counts.values()) or 1
    pct   = {w: round(100 * c / total) for w, c in world_counts.items()}
    interp = (
        f"Доминирующий мир: {dw['name_ru']} ({dw['element_ru']}, {dw['soul_level']}). "
        f"{dw['theme']} "
        f"Ключевые вопросы: {'; '.join(dw['questions'][:2])}. "
        f"Практика: {dw['practice']}"
    )

    return {
        "worlds_balance":     world_counts,
        "worlds_percent":     pct,
        "dominant_world":     dominant_world,
        "dominant_world_data": dw,
        "planets_by_world":   planets_by_world,
        "world_descriptions": _FOUR_WORLDS,
        "interpretation":     interp,
    }


# ── Aggregate Profile ─────────────────────────────────────────────────────────

def numerology_profile(
    date_str: str,
    name: str = "",
    current_year: Optional[int] = None,
    natal_chart: Optional[dict] = None,
) -> dict:
    """
    Full numerology + Kabbalah report for a given date and name.
    """
    result: dict = {
        "life_path":     life_path_number(date_str),
        "personal_year": personal_year(date_str, current_year),
        "tikkun":        tikkun_number(date_str),
    }
    if name:
        result["kabbalah"] = kabbalah_number(name)
    if natal_chart:
        result["tree_of_life"] = tree_of_life_profile(natal_chart)
    return result


if __name__ == "__main__":
    import json
    test_date = "1990-06-15"
    print(json.dumps(numerology_profile(test_date, "Alexander", 2026), ensure_ascii=False, indent=2))
