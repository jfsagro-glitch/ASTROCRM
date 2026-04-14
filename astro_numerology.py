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

# ── Tikkun Number (Berg's 72-Angel System) ────────────────────────────────────

_72_ANGELS = [
    "Vehuiah", "Jeliel", "Sitael", "Elemiah", "Mahasiah", "Lelahel",
    "Achaiah", "Cahethel", "Haziel", "Aladiah", "Lauviah", "Hahaiah",
    "Iezalel", "Mebahel", "Hariel", "Hakamiah", "Lauviah II", "Caliel",
    "Leuviah", "Pahaliah", "Nelchael", "Yeiayel", "Melahel", "Haheuiah",
    "Nith-Haiah", "Haaiah", "Yerathel", "Seheiah", "Reiyel", "Omael",
    "Lecabel", "Vasariah", "Yehuiah", "Lehahiah", "Chavakiah", "Menadel",
    "Aniel", "Haamiah", "Rehael", "Ieiazel", "Hahahel", "Mikael",
    "Veuliah", "Yelahiah", "Sealiah", "Ariel", "Asaliah", "Mihael",
    "Vehuel", "Daniel", "Hahasiah", "Imamiah", "Nanael", "Nithael",
    "Mebahiah", "Poyel", "Nemamiah", "Yeialel", "Harahel", "Mitzrael",
    "Umabel", "Iah-Hel", "Anauel", "Mehiel", "Damabiah", "Manakel",
    "Eyael", "Habuhiah", "Rochel", "Jabamiah", "Haiaiel", "Mumiah",
]

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
