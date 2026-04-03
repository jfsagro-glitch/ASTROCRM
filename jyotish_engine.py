"""
Jyotish (Vedic Astrology) Engine — HOLO Module
===============================================
Full Jyotish calculations:
  - Sidereal planetary positions (Lahiri ayanamsha)
  - Rasi (sign) and Bhava (house) placements — Whole sign houses
  - Nakshatra, Pada, Nakshatra Lord
  - Vimshottari Dasha (120-year cycle) with Antar + Pratyantar
  - Lagna (Ascendant) + special Lagnas (Chandra, Surya, Hora)
  - Planetary dignities (exaltation, debilitation, own sign, moolatrikona)
  - Shad Bala (simplified) — positional strength
  - Rajyogas, Dhana Yogas, Pancha Mahapurusha Yogas
  - Ashtakavarga (simplified BAV + SAV)
  - Graha drishti (planetary aspects)
  - Grahas: Sun/Moon/Mars/Mercury/Jupiter/Venus/Saturn/Rahu/Ketu
  - Detailed Russian interpretations per lagna, graha, dasha
"""

from __future__ import annotations

import math
from datetime import date as date_cls, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

try:
    import swisseph as swe
    _SWE_OK = True
except ImportError:
    _SWE_OK = False

ENGINE_VERSION = "1.0.0"

# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

LAHIRI_AYANAMSHA = swe.SIDM_LAHIRI if _SWE_OK else 1

RASI_NAMES_RU = [
    "Овен (Меша)", "Телец (Вришабха)", "Близнецы (Митхуна)", "Рак (Карката)",
    "Лев (Симха)", "Дева (Кання)", "Весы (Тула)", "Скорпион (Вришчика)",
    "Стрелец (Дхану)", "Козерог (Макара)", "Водолей (Кумбха)", "Рыбы (Мина)",
]
RASI_NAMES_EN = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]
RASI_GLYPHS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"]

GRAHA_NAMES_RU = {
    "sun":    "Солнце (Сурья)",
    "moon":   "Луна (Чандра)",
    "mars":   "Марс (Мангал)",
    "mercury":"Меркурий (Будха)",
    "jupiter":"Юпитер (Гуру)",
    "venus":  "Венера (Шукра)",
    "saturn": "Сатурн (Шани)",
    "rahu":   "Раху (Северный узел)",
    "ketu":   "Кету (Южный узел)",
}
GRAHA_GLYPHS = {
    "sun":"☉","moon":"☽","mars":"♂","mercury":"☿","jupiter":"♃",
    "venus":"♀","saturn":"♄","rahu":"☊","ketu":"☋",
}

GRAHA_TABLE = {
    # key: (swe_id, ru_name)
    "sun":     swe.SUN     if _SWE_OK else 0,
    "moon":    swe.MOON    if _SWE_OK else 1,
    "mars":    swe.MARS    if _SWE_OK else 4,
    "mercury": swe.MERCURY if _SWE_OK else 2,
    "jupiter": swe.JUPITER if _SWE_OK else 5,
    "venus":   swe.VENUS   if _SWE_OK else 3,
    "saturn":  swe.SATURN  if _SWE_OK else 6,
    "rahu":    swe.TRUE_NODE if _SWE_OK else 11,
}

# Nakshatra data: (name_ru, name_en, lord)
NAKSHATRAS: List[Tuple[str, str, str]] = [
    ("Ашвини",     "Ashvini",     "ketu"),
    ("Бхарани",    "Bharani",     "venus"),
    ("Криттика",   "Krittika",    "sun"),
    ("Рохини",     "Rohini",      "moon"),
    ("Мригашира",  "Mrigashira",  "mars"),
    ("Ардра",      "Ardra",       "rahu"),
    ("Пунарвасу",  "Punarvasu",   "jupiter"),
    ("Пушья",      "Pushya",      "saturn"),
    ("Ашлеша",     "Ashlesha",    "mercury"),
    ("Магха",      "Magha",       "ketu"),
    ("Пурва Пхалгуни",  "Purva Phalguni",  "venus"),
    ("Уттара Пхалгуни", "Uttara Phalguni", "sun"),
    ("Хаста",      "Hasta",       "moon"),
    ("Читра",      "Chitra",      "mars"),
    ("Сватхи",     "Swati",       "rahu"),
    ("Вишакха",    "Vishakha",    "jupiter"),
    ("Анурадха",   "Anuradha",    "saturn"),
    ("Джьештха",   "Jyeshtha",    "mercury"),
    ("Мула",       "Mula",        "ketu"),
    ("Пурва Ашадха",  "Purva Ashadha",  "venus"),
    ("Уттара Ашадха", "Uttara Ashadha", "sun"),
    ("Шравана",    "Shravana",    "moon"),
    ("Дхаништха",  "Dhanishtha",  "mars"),
    ("Шатабхиша",  "Shatabhisha", "rahu"),
    ("Пурва Бхадрапада","Purva Bhadrapada","jupiter"),
    ("Уттара Бхадрапада","Uttara Bhadrapada","saturn"),
    ("Ревати",     "Revati",      "mercury"),
]

# Vimshottari period lengths (years)
VIMSHOTTARI_ORDER = ["ketu","venus","sun","moon","mars","rahu","jupiter","saturn","mercury"]
VIMSHOTTARI_YEARS = {"ketu":7,"venus":20,"sun":6,"moon":10,"mars":7,
                     "rahu":18,"jupiter":16,"saturn":19,"mercury":17}
TOTAL_YEARS = 120

# Dignities
EXALTATION = {"sun":10,"moon":33,"mars":298,"mercury":165,"jupiter":95,
              "venus":357,"saturn":200,"rahu":60,"ketu":240}  # degrees
DEBILITATION = {k: (v + 180) % 360 for k, v in EXALTATION.items()}
OWN_SIGNS = {
    "sun":     [4],      # Leo
    "moon":    [3],      # Cancer
    "mars":    [0, 7],   # Aries, Scorpio
    "mercury": [2, 5],   # Gemini, Virgo
    "jupiter": [8, 11],  # Sagittarius, Pisces
    "venus":   [1, 6],   # Taurus, Libra
    "saturn":  [9, 10],  # Capricorn, Aquarius
    "rahu":    [2,10],   # (traditional: Gemini, Aquarius)
    "ketu":    [8, 11],  # Sagittarius, Pisces
}
MOOLATRIKONA = {
    "sun":5,  "moon":1,  "mars":0,  "mercury":5,
    "jupiter":8, "venus":6, "saturn":10,
}
# Graha drishti (Vedic 7th-sign aspect for all + special for Mars/Jupiter/Saturn)
GRAHA_DRISHTI: Dict[str, List[int]] = {
    "sun":     [6],
    "moon":    [6],
    "mercury": [6],
    "venus":   [6],
    "mars":    [3, 6, 7],   # 4th, 7th, 8th from its sign
    "jupiter": [4, 6, 8],   # 5th, 7th, 9th
    "saturn":  [2, 6, 9],   # 3rd, 7th, 10th
    "rahu":    [6],
    "ketu":    [6],
}

# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _n360(d: float) -> float:
    r = d % 360
    return r + 360 if r < 0 else r

def _rasi(lon: float) -> int:
    return int(_n360(lon) / 30)

def _deg_in_rasi(lon: float) -> float:
    return _n360(lon) % 30

def _nakshatra_index(sidereal_lon: float) -> int:
    return int((_n360(sidereal_lon) / (360 / 27)))

def _pada(sidereal_lon: float) -> int:
    span = 360 / 27
    pos_in_nak = _n360(sidereal_lon) % span
    return int(pos_in_nak / (span / 4)) + 1

def _jd_from_local(date_str: str, time_str: str, utc_offset: float) -> float:
    """Convert local datetime to Julian Day (UT)."""
    parts_d = date_str.split("-")
    yr, mo, dy = int(parts_d[0]), int(parts_d[1]), int(parts_d[2])
    parts_t = time_str.split(":")
    h = int(parts_t[0])
    mi = int(parts_t[1]) if len(parts_t) > 1 else 0
    sc = int(parts_t[2]) if len(parts_t) > 2 else 0
    ut_h = h - utc_offset + mi / 60.0 + sc / 3600.0
    # Julian Day (Meeus)
    if mo <= 2:
        yr -= 1; mo += 12
    A = math.floor(yr / 100)
    B = 2 - A + math.floor(A / 4)
    return (math.floor(365.25 * (yr + 4716)) +
            math.floor(30.6001 * (mo + 1)) + dy + B - 1524.5 + ut_h / 24.0)

def _get_ayanamsha(jd_ut: float) -> float:
    if _SWE_OK:
        swe.set_sid_mode(LAHIRI_AYANAMSHA, 0, 0)
        return swe.get_ayanamsa_ut(jd_ut)
    # Simplified Lahiri approximation
    T = (jd_ut - 2415020.0) / 36524.0
    return 22.46 + 0.0468 * (jd_ut - 2415020.0) / 365.25

def _get_planet_lon(jd_ut: float, graha: str) -> Tuple[float, bool]:
    """Return (tropical_longitude, is_retrograde)."""
    if not _SWE_OK:
        raise RuntimeError("swisseph not available")
    swe_id = GRAHA_TABLE[graha]
    flags = swe.FLG_SWIEPH | swe.FLG_SPEED
    try:
        result, _ = swe.calc_ut(jd_ut, swe_id, flags)
    except Exception:
        result, _ = swe.calc_ut(jd_ut, swe_id, swe.FLG_MOSEPH | swe.FLG_SPEED)
    lon = result[0]
    speed = result[3]
    retro = speed < 0
    return lon, retro

def _get_ascendant(jd_ut: float, lat: float, lon: float) -> float:
    """Tropical ascendant via SwissEph houses."""
    if _SWE_OK:
        _, ascmc = swe.houses(jd_ut, lat, lon, b'W')  # Whole sign — need cusp separately
        cusps, ascmc = swe.houses(jd_ut, lat, lon, b'P')  # Placidus for ASC value
        return ascmc[0]  # ASC tropical
    # Fallback: very rough approximation
    return 0.0

def _dignity_status(graha: str, sidereal_lon: float) -> str:
    rasi = _rasi(sidereal_lon)
    deg = _n360(sidereal_lon)
    # Check exaltation within 1 sign (±15°)
    ex = EXALTATION.get(graha)
    if ex is not None and abs(_n360(deg - ex + 180) - 180) < 15:
        return "uccha"    # exalted
    deb = DEBILITATION.get(graha)
    if deb is not None and abs(_n360(deg - deb + 180) - 180) < 15:
        return "neecha"   # debilitated
    mt = MOOLATRIKONA.get(graha)
    if mt is not None and rasi == mt:
        return "moolatrikona"
    if rasi in OWN_SIGNS.get(graha, []):
        return "sva"      # own sign
    return "neutral"

def _dignity_ru(status: str) -> str:
    return {
        "uccha": "Уча — Высокоусиленная (Экзальтация)",
        "neecha": "Нича — Ослабленная (Дебилитация)",
        "moolatrikona": "Мулатрикона — Оптимальная",
        "sva": "Сва Кшетра — Собственный знак",
        "neutral": "Нейтральная",
    }.get(status, "Нейтральная")

def _positional_strength(graha: str, bhava: int, sidereal_lon: float) -> int:
    """Simplified positional strength 1-5."""
    score = 3
    status = _dignity_status(graha, sidereal_lon)
    if status == "uccha": score += 2
    elif status == "neecha": score -= 2
    elif status in ("sva", "moolatrikona"): score += 1
    kendra = [0, 3, 6, 9]  # bhavas 1,4,7,10
    kona  = [0, 4, 8]       # bhavas 1,5,9
    if bhava in kendra: score += 1
    if bhava in kona:   score += 1
    dusthana = [5, 7, 11]   # 6,8,12
    if bhava in dusthana: score -= 1
    return max(1, min(5, score))

# ═══════════════════════════════════════════════════════════════════════════════
# VIMSHOTTARI DASHA
# ═══════════════════════════════════════════════════════════════════════════════

def _vimshottari_dasha(birth_date_str: str, moon_sidereal_lon: float) -> List[Dict]:
    """Compute Vimshottari Maha + Antar dashas from birth date."""
    nak_idx  = _nakshatra_index(moon_sidereal_lon)
    nak_span = 360 / 27
    nak_lord = NAKSHATRAS[nak_idx][2]
    nak_start = nak_idx * nak_span
    elapsed_frac = (_n360(moon_sidereal_lon) - nak_start) / nak_span
    lord_total_years = VIMSHOTTARI_YEARS[nak_lord]
    elapsed_years = elapsed_frac * lord_total_years
    remaining_years = lord_total_years - elapsed_years

    parts = birth_date_str.split("-")
    birth_dt = date_cls(int(parts[0]), int(parts[1]), int(parts[2]))

    # Build sequence from current nak_lord
    start_idx = VIMSHOTTARI_ORDER.index(nak_lord)
    sequence = (VIMSHOTTARI_ORDER[start_idx:] + VIMSHOTTARI_ORDER[:start_idx])

    current_dt = birth_dt
    # First dasha is partial
    dashas: List[Dict] = []
    for i, lord in enumerate(sequence):
        years = VIMSHOTTARI_YEARS[lord] if i > 0 else remaining_years
        end_dt = _add_years(current_dt, years)
        antars = _compute_antars(lord, current_dt, years)
        dashas.append({
            "lord": lord,
            "lord_ru": GRAHA_NAMES_RU[lord],
            "lord_glyph": GRAHA_GLYPHS[lord],
            "start": current_dt.isoformat(),
            "end": end_dt.isoformat(),
            "years": round(years, 2),
            "active": current_dt <= date_cls.today() <= end_dt,
            "antardasha": antars,
        })
        current_dt = end_dt
        if len(dashas) >= 9:
            break
    return dashas

def _add_years(dt: date_cls, years: float) -> date_cls:
    days = int(years * 365.25)
    return dt + timedelta(days=days)

def _compute_antars(maha_lord: str, maha_start: date_cls, maha_years: float) -> List[Dict]:
    """Compute Antardasha periods within a Maha Dasha."""
    start_idx = VIMSHOTTARI_ORDER.index(maha_lord)
    sequence = (VIMSHOTTARI_ORDER[start_idx:] + VIMSHOTTARI_ORDER[:start_idx])
    current = maha_start
    antars = []
    for lord in sequence:
        frac = VIMSHOTTARI_YEARS[lord] / TOTAL_YEARS
        sub_years = maha_years * frac
        end_dt = _add_years(current, sub_years)
        antars.append({
            "lord": lord,
            "lord_ru": GRAHA_NAMES_RU[lord],
            "lord_glyph": GRAHA_GLYPHS[lord],
            "start": current.isoformat(),
            "end": end_dt.isoformat(),
            "active": current <= date_cls.today() <= end_dt,
        })
        current = end_dt
    return antars

# ═══════════════════════════════════════════════════════════════════════════════
# YOGA DETECTION
# ═══════════════════════════════════════════════════════════════════════════════

def _detect_yogas(grahas: Dict[str, Dict], lagna_rasi: int) -> List[Dict]:
    yogas: List[Dict] = []

    def bhava(graha: str) -> int:
        r = grahas[graha]["rasi"]
        return (r - lagna_rasi) % 12

    # ── Pancha Mahapurusha Yogas (Panchamahapurusha) ──────────────────────────
    for graha, rasi_list in [
        ("mars",    [0, 7, 9]),  # Ruchaka — Aries, Scorpio, Capricorn(own/exalt)
        ("mercury", [2, 5, 6]),  # Bhadra — Gemini, Virgo, Libra(debil=no)
        ("jupiter", [8, 11, 3]), # Hamsa — Sagittarius, Pisces, Cancer
        ("venus",   [1, 6, 11]), # Malavya — Taurus, Libra, Pisces
        ("saturn",  [9, 10, 6]), # Sasa — Capricorn, Aquarius, Libra
    ]:
        b = bhava(graha)
        g = grahas[graha]
        if g["rasi"] in rasi_list and b in [0, 3, 6, 9]:
            names = {
                "mars": ("Рудхака Йога", "Ruchaka Yoga",
                    "Марс силён в кендре и собственном/экзальтационном знаке. "
                    "Даёт мужество, воинскую доблесть, лидерские качества, физическую силу и способность побеждать врагов."),
                "mercury": ("Бхадра Йога", "Bhadra Yoga",
                    "Меркурий силён в кендре. Острый ум, красноречие, торговля, математические способности, дипломатичность."),
                "jupiter": ("Хамса Йога", "Hamsa Yoga",
                    "Юпитер силён в кендре. Мудрость, духовность, процветание, великодушие, правосудие, изобилие."),
                "venus": ("Малавья Йога", "Malavya Yoga",
                    "Венера сильна в кендре. Красота, утончённость, искусство, любовь, роскошь, харизма."),
                "saturn": ("Шаша Йога", "Sasa Yoga",
                    "Сатурн силён в кендре. Долгожительство, власть, дисциплина, трудолюбие, управление массами."),
            }
            name_ru, name_en, interp = names[graha]
            yogas.append({
                "name_ru": name_ru, "name_en": name_en,
                "type": "mahapurusha",
                "strength": "strong",
                "grahas": [graha],
                "interpretation": interp,
            })

    # ── Rajyogas (9th + 10th lords combined) ──────────────────────────────────
    # Lords of trines (1,5,9) + kendras (1,4,7,10) together = Rajyoga
    trine_lords = [_bhava_lord(lagna_rasi, h) for h in [0, 4, 8]]
    kendra_lords = [_bhava_lord(lagna_rasi, h) for h in [0, 3, 6, 9]]
    seen_pairs = set()
    for tl in trine_lords:
        for kl in kendra_lords:
            if tl == kl:
                continue
            if tl not in grahas or kl not in grahas:
                continue
            pair = tuple(sorted([tl, kl]))
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)
            # Check if they are in mutual aspect, conjunction, or exchange
            r1 = grahas[tl]["rasi"]
            r2 = grahas[kl]["rasi"]
            if r1 == r2:  # conjunction
                yogas.append(_rajyoga(tl, kl, "conjunction", lagna_rasi))
            elif (r1, r2) in [(_rasi_lord_of(r2), _rasi_lord_of(r1))]:
                yogas.append(_rajyoga(tl, kl, "exchange", lagna_rasi))

    # ── Dhana Yogas (wealth) ──────────────────────────────────────────────────
    lord2 = _bhava_lord(lagna_rasi, 1)  # 2nd house lord
    lord11 = _bhava_lord(lagna_rasi, 10) # 11th house lord
    if (lord2 in grahas and lord11 in grahas and
            grahas[lord2]["rasi"] == grahas[lord11]["rasi"]):
        yogas.append({
            "name_ru": "Дхана Йога",
            "name_en": "Dhana Yoga",
            "type": "dhana",
            "strength": "moderate",
            "grahas": [lord2, lord11],
            "interpretation": (
                "Господа 2-го и 11-го домов соединены. Продвижение к богатству через "
                "накопление собственных средств и реализацию желаний. "
                "Финансовые возможности реализуются особенно в периоды этих граха."
            ),
        })

    # ── Gajakesari Yoga ───────────────────────────────────────────────────────
    moon_bhava = bhava("moon")
    jup_bhava = bhava("jupiter")
    if (grahas["moon"]["rasi"] != grahas["jupiter"]["rasi"] and
            abs(moon_bhava - jup_bhava) in [3, 6, 9, 0]):  # kendra from moon
        yogas.append({
            "name_ru": "Гаджакесари Йога",
            "name_en": "Gajakesari Yoga",
            "type": "auspicious",
            "strength": "strong",
            "grahas": ["moon","jupiter"],
            "interpretation": (
                "Юпитер и Луна в кендре друг от друга. "
                "Исключительная удача, мудрость, слава, влиятельность, щедрость. "
                "Наделяет авторитетом слона (гаджа) и смелостью льва (кесари)."
            ),
        })

    # ── Budha-Aditya Yoga ─────────────────────────────────────────────────────
    if grahas["mercury"]["rasi"] == grahas["sun"]["rasi"]:
        yogas.append({
            "name_ru": "Будха-Адитья Йога",
            "name_en": "Budha-Aditya Yoga",
            "type": "auspicious",
            "strength": "moderate",
            "grahas": ["sun","mercury"],
            "interpretation": (
                "Солнце и Меркурий соединены. Блестящий интеллект, "
                "административные способности, красноречие и признание в обществе. "
                "Особенно силён если не ожжён (combust)."
            ),
        })

    # ── Chandra-Mangala Yoga ──────────────────────────────────────────────────
    if grahas["moon"]["rasi"] == grahas["mars"]["rasi"]:
        yogas.append({
            "name_ru": "Чандра-Мангала Йога",
            "name_en": "Chandra-Mangala Yoga",
            "type": "mixed",
            "strength": "moderate",
            "grahas": ["moon","mars"],
            "interpretation": (
                "Луна и Марс соединены. Сильная воля, богатство через смелые поступки, "
                "зарабатывание через мать или материальную деятельность. "
                "Требуется баланс между чувствами и действиями."
            ),
        })

    # ── Kemadruma Yoga (negative) ─────────────────────────────────────────────
    moon_r = grahas["moon"]["rasi"]
    no_planet_around = all(
        grahas[g]["rasi"] not in [(moon_r - 1) % 12, (moon_r + 1) % 12]
        for g in grahas if g not in ("rahu", "ketu", "moon")
    )
    if no_planet_around:
        yogas.append({
            "name_ru": "Кемадрума Йога",
            "name_en": "Kemadruma Yoga",
            "type": "challenging",
            "strength": "moderate",
            "grahas": ["moon"],
            "interpretation": (
                "Луна находится без соседних планет (2-й и 12-й от неё пустые). "
                "Возможна нестабильность ума, трудности в построении отношений. "
                "Смягчается сильным Юпитером или Луной в кендре."
            ),
        })

    return yogas


def _bhava_lord(lagna_rasi: int, bhava_num: int) -> str:
    """Return the graha ruling given bhava (0-indexed)."""
    rasi = (lagna_rasi + bhava_num) % 12
    return _rasi_lord_of(rasi)


def _rasi_lord_of(rasi: int) -> str:
    lords = ["mars","venus","mercury","moon","sun","mercury",
             "venus","mars","jupiter","saturn","saturn","jupiter"]
    return lords[rasi]


# ═══════════════════════════════════════════════════════════════════════════════
# ASHTAKAVARGA (simplified)
# ═══════════════════════════════════════════════════════════════════════════════

def _ashtakavarga_bav(graha: str, graha_rasi: int, all_rasis: Dict[str, int]) -> List[int]:
    """Return Bhinna Ashtakavarga (BAV) for each of 12 signs — simplified rules."""
    # Simplified: use benefic positions relative to each planet's placement
    bav = [0] * 12
    bav_rules = {
        "sun":     [0, 2, 3, 4, 6, 10, 11],
        "moon":    [0, 2, 3, 4, 7, 8, 10, 11],
        "mars":    [0, 1, 4, 6, 7, 11],
        "mercury": [0, 1, 2, 4, 6, 7, 9, 10],
        "jupiter": [0, 2, 4, 6, 7, 8, 10, 11],
        "venus":   [0, 1, 2, 3, 4, 5, 8, 9, 10, 11],
        "saturn":  [2, 5, 11],
        "lagna":   [0, 2, 3, 4, 6, 10, 11],
    }
    spots = bav_rules.get(graha, [0, 3, 6, 9])
    ref_points = [graha_rasi] + list(all_rasis.values())
    for ref in ref_points:
        for offset in spots:
            bav[(ref + offset) % 12] += 1
    # Normalize to 0-8
    bav = [min(8, v // max(1, len(ref_points) // 4)) for v in bav]
    return bav


def _rajyoga(lord1: str, lord2: str, yoga_type: str, lagna_rasi: int) -> Dict:
    return {
        "name_ru": "Раджайога",
        "name_en": "Rajyoga",
        "type": "rajyoga",
        "strength": "strong",
        "grahas": [lord1, lord2],
        "interpretation": (
            f"Господа тригоны и кендры ({GRAHA_NAMES_RU.get(lord1,'?')} и "
            f"{GRAHA_NAMES_RU.get(lord2,'?')}) связаны через {yoga_type}. "
            "Это мощная Раджайога, дающая власть, статус, признание и успех. "
            "Наиболее активна в Дашу и Антардашу этих граха."
        ),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# INTERPRETATIONS (Russian)
# ═══════════════════════════════════════════════════════════════════════════════

LAGNA_INTERP: Dict[int, Dict] = {
    0: {
        "title": "Меша Лагна (Овен)",
        "element": "Огонь",
        "quality": "Кардинальный",
        "lord": "mars",
        "keywords": "инициатива, энергия, лидерство, смелость",
        "body": "голова, мозг, лицо",
        "general": (
            "Восходящий Овен (Меша) наделяет личностью первопроходца и природного лидера. "
            "Вы прямолинейны, напористы и быстро принимаете решения. "
            "Ваш покровитель Марс (Мангал) — планета энергии и воли."
        ),
        "strengths": "Смелость, инициативность, независимость, способность начинать новые проекты.",
        "challenges": "Нетерпеливость, вспыльчивость, склонность к поспешным решениям.",
        "dharma": "Ваша дхарма — быть первым, вести других, воплощать смелость в действии.",
        "career": "Военная сфера, спорт, хирургия, предпринимательство, технологии.",
        "health": "Следите за головой, мозгом и нервной системой. Регулярные физические нагрузки необходимы.",
        "relationships": "Прямолинейны в чувствах. Ищете партнёра с харизмой. Ревнивы, но страстны.",
    },
    1: {
        "title": "Вришабха Лагна (Телец)",
        "element": "Земля",
        "quality": "Фиксированный",
        "lord": "venus",
        "keywords": "стабильность, чувственность, терпение, материальность",
        "body": "шея, горло, щитовидная железа",
        "general": (
            "Телец-асцендент создаёт натуру, ориентированную на стабильность, комфорт и красоту. "
            "Ваш покровитель Венера (Шукра) — планета любви, искусства и богатства."
        ),
        "strengths": "Упорство, надёжность, практичность, чувство прекрасного, терпение.",
        "challenges": "Упрямство, медлительность, чрезмерная привязанность к материальному.",
        "dharma": "Сохранять, создавать красоту и обеспечивать стабильность.",
        "career": "Банковское дело, искусство, музыка, кулинария, земледелие, роскошные товары.",
        "health": "Следите за горлом и щитовидкой. Умеренность в еде продлевает жизнь.",
        "relationships": "Преданны и чувственны. Нуждаетесь в безопасности и постоянстве в отношениях.",
    },
    2: {
        "title": "Митхуна Лагна (Близнецы)",
        "element": "Воздух",
        "quality": "Мутабельный",
        "lord": "mercury",
        "keywords": "интеллект, коммуникация, адаптивность, любопытство",
        "body": "руки, лёгкие, нервная система",
        "general": (
            "Близнецы-асцендент создаёт острый ум, любознательность и коммуникативный дар. "
            "Ваш покровитель Меркурий (Будха) — планета интеллекта и торговли."
        ),
        "strengths": "Остроумие, многогранность, гибкость, умение договариваться.",
        "challenges": "Непостоянство, рассеянность, поверхностность, тревожность.",
        "dharma": "Распространять знания, соединять людей, исследовать идеи.",
        "career": "Журналистика, программирование, торговля, обучение, дипломатия.",
        "health": "Нервная система и лёгкие наиболее уязвимы. Практикуйте пранаяму.",
        "relationships": "Ищете интеллектуальное родство. Любите разнообразие, нуждаетесь в свободе общения.",
    },
    3: {
        "title": "Карката Лагна (Рак)",
        "element": "Вода",
        "quality": "Кардинальный",
        "lord": "moon",
        "keywords": "эмоциональность, забота, интуиция, семья",
        "body": "грудь, желудок, молочные железы",
        "general": (
            "Рак-асцендент создаёт глубокую эмоциональную природу с развитой интуицией. "
            "Ваш покровитель Луна (Чандра) — планета ума, матери и общественного образа."
        ),
        "strengths": "Интуиция, заботливость, память, патриотизм, глубокая привязанность.",
        "challenges": "Сверхчувствительность, перепады настроения, привязанность к прошлому.",
        "dharma": "Питать, защищать, хранить традиции и создавать уют.",
        "career": "Медицина, кулинария, недвижимость, история, психология, забота о ближних.",
        "health": "Желудочно-кишечный тракт и грудная клетка. Управляйте эмоциями для здоровья.",
        "relationships": "Глубоко привязаны, нуждаетесь в эмоциональной безопасности. Образцовый семьянин.",
    },
    4: {
        "title": "Симха Лагна (Лев)",
        "element": "Огонь",
        "quality": "Фиксированный",
        "lord": "sun",
        "keywords": "величие, лидерство, творчество, достоинство",
        "body": "сердце, позвоночник, спина",
        "general": (
            "Лев-асцендент наделяет королевским достоинством, харизмой и природным авторитетом. "
            "Ваш покровитель Солнце (Сурья) — планета власти, отца и самореализации."
        ),
        "strengths": "Харизма, щедрость, великодушие, творческая сила, организаторский талант.",
        "challenges": "Гордость, эгоцентризм, потребность в постоянном признании.",
        "dharma": "Сиять, вдохновлять, быть примером великодушия и чести.",
        "career": "Политика, актёрство, предпринимательство, управление, педагогика.",
        "health": "Сердечно-сосудистая система. Умеренность в образе жизни крайне важна.",
        "relationships": "Щедры в любви, нуждаетесь в восхищении. Ищете равного себе партнёра.",
    },
    5: {
        "title": "Кання Лагна (Дева)",
        "element": "Земля",
        "quality": "Мутабельный",
        "lord": "mercury",
        "keywords": "анализ, служение, порядок, совершенство",
        "body": "пищеварение, кишечник, поджелудочная железа",
        "general": (
            "Дева-асцендент создаёт аналитический ум, стремление к совершенству и практический талант. "
            "Ваш покровитель Меркурий (Будха) особенно силён в этом знаке."
        ),
        "strengths": "Аналитические способности, точность, скромность, трудолюбие, практичность.",
        "challenges": "Сверхкритичность, тревожность, склонность к перфекционизму.",
        "dharma": "Служить, совершенствовать, исцелять и упорядочивать.",
        "career": "Медицина, бухгалтерия, наука, редактирование, исследования, ремёсла.",
        "health": "Пищеварение является ключевым. Правильное питание и режим — основа здоровья.",
        "relationships": "Преданны, но критичны. Ищете порядка в отношениях. Глубже раскрываетесь с надёжным партнёром.",
    },
    6: {
        "title": "Тула Лагна (Весы)",
        "element": "Воздух",
        "quality": "Кардинальный",
        "lord": "venus",
        "keywords": "баланс, дипломатия, красота, партнёрство",
        "body": "почки, поясница, кожа",
        "general": (
            "Весы-асцендент создаёт дипломатичную, эстетически чуткую и ориентированную на партнёрство личность. "
            "Ваш покровитель Венера (Шукра) дарует обаяние и способность к гармонии."
        ),
        "strengths": "Дипломатичность, чувство справедливости, эстетический вкус, умение объединять.",
        "challenges": "Нерешительность, избегание конфликтов, зависимость от мнения других.",
        "dharma": "Создавать справедливость, красоту и гармонию в отношениях.",
        "career": "Юриспруденция, дипломатия, искусство, дизайн, консультирование.",
        "health": "Почки и поясница. Следите за кислотно-щелочным балансом.",
        "relationships": "Отношения являются вашей главной ареной жизни. Моногамны, идеализируют партнёра.",
    },
    7: {
        "title": "Вришчика Лагна (Скорпион)",
        "element": "Вода",
        "quality": "Фиксированный",
        "lord": "mars",
        "keywords": "трансформация, глубина, интенсивность, тайна",
        "body": "половые органы, мочевыводящая система",
        "general": (
            "Скорпион-асцендент создаёт загадочную, интенсивную и трансформирующую личность. "
            "Ваши покровители — Марс (Мангал) и Кету."
        ),
        "strengths": "Глубина восприятия, воля, трансформационная сила, исследовательский талант.",
        "challenges": "Мстительность, контролирующее поведение, скрытность, ревность.",
        "dharma": "Исследовать глубины, трансформировать и возрождаться.",
        "career": "Медицина, психология, исследования, финансы, криминология, мистические науки.",
        "health": "Репродуктивная и мочевыделительная системы. Важна детоксикация.",
        "relationships": "Интенсивны и страстны. Нуждаетесь в полном доверии. Ищете трансформирующей связи.",
    },
    8: {
        "title": "Дхану Лагна (Стрелец)",
        "element": "Огонь",
        "quality": "Мутабельный",
        "lord": "jupiter",
        "keywords": "философия, расширение, удача, мудрость",
        "body": "бёдра, печень, нервная система",
        "general": (
            "Стрелец-асцендент создаёт оптимистичного, философски мыслящего и устремлённого к высшему человека. "
            "Ваш покровитель Юпитер (Гуру) — величайший блаженствователь."
        ),
        "strengths": "Оптимизм, мудрость, широта взглядов, честность, любовь к приключениям.",
        "challenges": "Необязательность, чрезмерный оптимизм, импульсивность, догматизм.",
        "dharma": "Искать истину, расширять горизонты, вдохновлять жаждой знаний.",
        "career": "Философия, религия, образование, юриспруденция, путешествия, спорт.",
        "health": "Печень и бёдра. Умеренность в пище (особенно жирах) и физическая активность.",
        "relationships": "Цените свободу. Ищете интеллектуального и духовного партнёра.",
    },
    9: {
        "title": "Макара Лагна (Козерог)",
        "element": "Земля",
        "quality": "Кардинальный",
        "lord": "saturn",
        "keywords": "дисциплина, карьера, структура, амбиции",
        "body": "колени, кости, кожа, зубы",
        "general": (
            "Козерог-асцендент создаёт дисциплинированную, амбициозную и трудолюбивую личность. "
            "Ваш покровитель Сатурн (Шани) — планета кармы и долга."
        ),
        "strengths": "Дисциплина, выносливость, практичность, настойчивость, деловые качества.",
        "challenges": "Пессимизм, чрезмерная серьёзность, жёсткость, скупость.",
        "dharma": "Строить структуры, нести ответственность, оставлять наследие.",
        "career": "Политика, бизнес, инжиниринг, государственная служба, строительство.",
        "health": "Суставы (колени) и костная система. Важны движение и тепло.",
        "relationships": "Медленно открываетесь. Верны и серьёзны в обязательствах. Ищете стабильного партнёра.",
    },
    10: {
        "title": "Кумбха Лагна (Водолей)",
        "element": "Воздух",
        "quality": "Фиксированный",
        "lord": "saturn",
        "keywords": "гуманизм, оригинальность, реформаторство, свобода",
        "body": "лодыжки, голени, кровеносная система",
        "general": (
            "Водолей-асцендент создаёт независимую, ориентированную на общество и прогрессивную личность. "
            "Ваш покровитель Сатурн (Шани) с глубоким гуманистическим началом."
        ),
        "strengths": "Оригинальность, гуманизм, интеллект, дальновидность, дружелюбие.",
        "challenges": "Непрактичность, непостоянство в чувствах, эксцентричность.",
        "dharma": "Служить человечеству, реформировать устаревшее, продвигать прогресс.",
        "career": "IT, наука, социальная работа, изобретательство, политика, НКО.",
        "health": "Кровообращение, голени. Избегайте переохлаждения.",
        "relationships": "Ищете дружескую связь. Нуждаетесь в независимости. Придёте к глубоким отношениям через дружество.",
    },
    11: {
        "title": "Мина Лагна (Рыбы)",
        "element": "Вода",
        "quality": "Мутабельный",
        "lord": "jupiter",
        "keywords": "интуиция, духовность, сострадание, растворение",
        "body": "ступни, лимфатическая система, иммунитет",
        "general": (
            "Рыбы-асцендент создаёт глубокую, мечтательную и сострадательную личность с сильной интуицией. "
            "Ваш покровитель Юпитер (Гуру) даёт мудрость и духовный путь."
        ),
        "strengths": "Интуиция, сострадание, творческое воображение, духовность, великодушие.",
        "challenges": "Эскапизм, границы, жертвенность, склонность к зависимостям.",
        "dharma": "Растворяться в служении, нести сострадание, соединять с трансцендентным.",
        "career": "Медицина, духовные практики, искусство, благотворительность, психология.",
        "health": "Иммунитет и ступни. Практикуйте земные заземляющие техники.",
        "relationships": "Романтичны и преданны. Могут идеализировать партнёра. Нуждаетесь в духовной связи.",
    },
}

GRAHA_INTERP: Dict[str, Dict[int, str]] = {
    "sun": {
        0: "Солнце в 1-м доме (лагне): Исключительная харизма, природное лидерство, сильная воля. Вы обладаете королевской природой и стремитесь к самовыражению. Здоровье крепкое, но возможна гордость.",
        1: "Солнце в 2-м доме: Богатство через авторитет и власть. Красноречие и работа в сфере государственного управления. Важно следить за финансами.",
        2: "Солнце в 3-м доме: Сильные коммуникативные способности, смелость в самовыражении, трудолюбие и братские связи. Хорош в СМИ и искусстве.",
        3: "Солнце в 4-м доме: Счастливый дом, уважение матери, имущество. Развитое чувство корней и традиций. Возможна отдалённость от отца. Успех в недвижимости.",
        4: "Солнце в 5-м доме: Блестящий ум, таланты для руководства и педагогики. Дети приносят гордость. Спекуляции могут быть успешны.",
        5: "Солнце в 6-м доме: Победа над врагами и болезнями. Хорошо в медицине, юриспруденции. Возможны конфликты с властью.",
        6: "Солнце в 7-м доме: Партнёр с сильной личностью или связи с правительством. Возможна доминирующая роль в отношениях. Деловое партнёрство с лидерами.",
        7: "Солнце в 8-м доме: Трансформационная личность, интерес к тайнам. Возможны проблемы с отцом. Долгая жизнь при других хороших планетах.",
        8: "Солнце в 9-м доме: Удача, религиозность, философская натура. Отец — важная фигура. Склонность к путешествиям, высшему образованию.",
        9: "Солнце в 10-м доме: Отличная позиция для карьеры и социального статуса. Признание, власть, государственная служба. Сильный дхармический путь.",
        10: "Солнце в 11-м доме: Высокие заработки, влиятельные друзья, исполнение желаний. Общественное признание. Старший брат имеет значение.",
        11: "Солнце в 12-м доме: Склонность к уединению, духовные исследования. Расходы поглощают доходы. Работа в иностранных странах или изоляции.",
    },
    "moon": {
        0: "Луна в 1-м доме: Привлекательная внешность, чувствительная природа, изменчивое настроение. Интуиция развита. Общественный образ очень важен.",
        1: "Луна в 2-м доме: Богатство, семейная жизнь даёт радость. Способность к накоплению богатства. Эмоциональная привязанность к материальным ценностям.",
        2: "Луна в 3-м доме: Активное, любопытное сознание. Успех в торговле и коммуникациях. Близкие братские связи. Частые путешествия.",
        3: "Луна в 4-м доме: Мощная позиция — связь с матерью, обилие имущества, счастливый дом. Эмоциональная безопасность через корни.",
        4: "Луна в 5-м доме: Романтичность, любовь к детям, интуитивное мышление. Удача в спекуляциях. Эмоциональное выражение через творчество.",
        5: "Луна в 6-м доме: Эмоциональные трудности на рабочем месте. Внимательность к здоровью. Успех через служение другим. Изменчивые враги.",
        6: "Луна в 7-м доме: Эмоциональные партнёрства. Партнёр красив и чувствителен. Возможна чрезмерная зависимость от брака.",
        7: "Луна в 8-м доме: Сильная интуиция, интерес к скрытым мирам. Эмоциональные трансформации. Наследство возможно. Осторожность в здоровье.",
        8: "Луна в 9-м доме: Удача, религиозная природа, связь с матерью как с гуру. Путешествия и широкий кругозор.",
        9: "Луна в 10-м доме: Известность, работа в публичной сфере, связь с широкой аудиторией. Мать оказывает влияние на карьеру.",
        10: "Луна в 11-м доме: Богатство, исполнение желаний, связи с сетью людей. Общительность и популярность.",
        11: "Луна в 12-м доме: Тяга к уединению и духовному опыту. Эмоциональные жертвы. Работа за рубежом или в изоляции. Ночная жизнь привлекает.",
    },
    # General fallback per graha
}

GRAHA_GENERAL_INTERP: Dict[str, str] = {
    "sun": (
        "Солнце (Сурья) — Душа, Атман. Правит самовыражением, авторитетом, отцом, правительством и здоровьем. "
        "Сильное Солнце даёт харизму, уверенность и успех в государственной сфере."
    ),
    "moon": (
        "Луна (Чандра) — Ум, Манас. Управляет эмоциями, матерью, общественным образом, памятью и подсознанием. "
        "Сильная Луна обеспечивает эмоциональный баланс, интуицию и популярность."
    ),
    "mars": (
        "Марс (Мангал) — Энергия, Воля. Правит смелостью, братьями, землёй, техникой и хирургией. "
        "Сильный Марс даёт силу воли, отвагу и способность к победе. Слабый — агрессию или трусость."
    ),
    "mercury": (
        "Меркурий (Будха) — Интеллект, Речь. Управляет коммуникацией, торговлей, образованием, кожей. "
        "Сильный Меркурий — острый ум, красноречие и деловой успех."
    ),
    "jupiter": (
        "Юпитер (Гуру, Брихаспати) — Мудрость, Благодать. Правит высшими знаниями, детьми, удачей, религией. "
        "Самый благоприятный из граха. Его благосклонность приносит процветание и духовный рост."
    ),
    "venus": (
        "Венера (Шукра) — Любовь, Красота. Управляет браком, искусством, роскошью, сексуальностью. "
        "Сильная Венера — харизма, эстетический дар и успех в партнёрстве."
    ),
    "saturn": (
        "Сатурн (Шани) — Карма, Дисциплина. Правит долгом, испытаниями, смертностью, слугами, хроническими процессами. "
        "Сильный Сатурн даёт выносливость, справедливость и долгую жизнь. Слабый — задержки и потери."
    ),
    "rahu": (
        "Раху (Северный Лунный Узел) — Амбиции, Иллюзии, Чужеродное. Усиливает дом и конъюнкцию. "
        "Стремление к материальному и необычному. Кармическое влечение к безграничному опыту."
    ),
    "ketu": (
        "Кету (Южный Лунный Узел) — Освобождение, Прошлое, Духовность. Ведёт к мокше. "
        "Отрешённость от материального, психические способности, духовные поиски. Часть прошлых жизней."
    ),
}

DASHA_INTERP: Dict[str, str] = {
    "sun": (
        "Маха Даша Солнца (6 лет): Период самореализации, власти и авторитета. "
        "Отношения с отцом, правительством или руководством выходят на первый план. "
        "Возможны карьерный рост, признание, но и испытания самолюбия. "
        "Время укреплять здоровье и работать над целеустремлённостью."
    ),
    "moon": (
        "Маха Даша Луны (10 лет): Эмоциональный период, связанный с семьёй, матерью, общественным образом. "
        "Возможны переезды, изменения в жилье, рост популярности. "
        "Настроение изменчиво — важно практиковать стабилизирующие техники. "
        "Хорошо для торговли, путешествий, работы с общественностью."
    ),
    "mars": (
        "Маха Даша Марса (7 лет): Период энергии, действий и смелых начинаний. "
        "Возможны достижения в карьере, спорте или предпринимательстве. "
        "Риски конфликтов, травм, операций — следите за агрессией. "
        "Время для воплощения давно задуманных проектов."
    ),
    "mercury": (
        "Маха Даша Меркурия (17 лет): Длительный период интеллектуального развития, коммуникаций и деловых связей. "
        "Успех в торговле, образовании, технологиях и письменной деятельности. "
        "Частые поездки, новые контакты, развитие навыков."
    ),
    "jupiter": (
        "Маха Даша Юпитера (16 лет): Один из самых благоприятных периодов. "
        "Расширение, удача, мудрость, духовный рост. Дети, брак, высшее образование — под благоприятным влиянием. "
        "Возможности для путешествий, наставничества и реализации дхармы."
    ),
    "venus": (
        "Маха Даша Венеры (20 лет): Самый долгий и связанный с комфортом период. "
        "Любовь, брак, рождение детей, искусство, роскошь. "
        "Карьерный рост в творческих или женских сферах. "
        "Возможности для создания материального благополучия."
    ),
    "saturn": (
        "Маха Даша Сатурна (19 лет): Долгий период кармической отработки и дисциплины. "
        "Возможны задержки, испытания, но и великие достижения через труд. "
        "Время укреплять профессионализм, принимать ответственность. "
        "Успех придёт к тем, кто работает методично и честно."
    ),
    "rahu": (
        "Маха Даша Раху (18 лет): Период амбиций, необычных событий и кармических разворотов. "
        "Соблазны, иллюзии, неожиданный взлёт или падение. "
        "Материальный успех возможен, но нужна бдительность и духовная практика. "
        "Время исследовать новые сферы с осторожностью."
    ),
    "ketu": (
        "Маха Даша Кету (7 лет): Период духовных поисков, отрешённости и переосмысления. "
        "Возможны потери или разочарования в материальном. "
        "Хорошее время для медитации, изучения эзотерики, внутреннего очищения. "
        "Прошлые кармы выходят на поверхность для трансформации."
    ),
}

BHAVA_THEMES: Dict[int, Dict[str, str]] = {
    0:  {"name": "1-й Дом (Лагна)",      "theme": "Тело, личность, внешность, жизненная сила, начало жизни"},
    1:  {"name": "2-й Дом (Дхана)",       "theme": "Богатство, семья, речь, ценности, накопление"},
    2:  {"name": "3-й Дом (Сахаджа)",     "theme": "Братья/сёстры, коммуникация, смелость, путешествия, навыки"},
    3:  {"name": "4-й Дом (Сукха)",       "theme": "Мать, дом, имущество, образование, счастье, корни"},
    4:  {"name": "5-й Дом (Путра)",       "theme": "Дети, ум, творчество, спекуляции, прошлые заслуги"},
    5:  {"name": "6-й Дом (Шатру)",       "theme": "Враги, болезни, служение, долги, конкуренция (Дустхана)"},
    6:  {"name": "7-й Дом (Кала)",        "theme": "Брак, партнёрство, открытые враги, торговля, путешествия"},
    7:  {"name": "8-й Дом (Аюс)",         "theme": "Долголетие, тайны, трансформация, наследство (Дустхана)"},
    8:  {"name": "9-й Дом (Дхарма)",      "theme": "Удача, высшее образование, отец, духовность, дальние путешествия"},
    9:  {"name": "10-й Дом (Карма)",      "theme": "Карьера, социальный статус, власть, действия, отец/государство"},
    10: {"name": "11-й Дом (Лабха)",      "theme": "Прибыль, желания, друзья, старший брат, сети, достижения"},
    11: {"name": "12-й Дом (Вьяя)",       "theme": "Расходы, потери, освобождение, иностранные страны, уединение, сон"},
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN CALCULATION FUNCTION
# ═══════════════════════════════════════════════════════════════════════════════

def calc_jyotish(
    date_str: str,
    time_str: str,
    lat: float,
    lon: float,
    utc_offset: float,
) -> Dict[str, Any]:
    """
    Main Jyotish calculation.
    Returns dict with all Vedic astrology data + interpretations.
    """
    jd_ut = _jd_from_local(date_str, time_str, utc_offset)
    ayanamsha = _get_ayanamsha(jd_ut)

    # ── Get tropical positions ────────────────────────────────────────────────
    tropical_lons: Dict[str, float] = {}
    retrogrades: Dict[str, bool] = {}
    for graha in list(GRAHA_TABLE.keys()):
        tlon, retro = _get_planet_lon(jd_ut, graha)
        tropical_lons[graha] = tlon
        retrogrades[graha] = retro
    # Ketu = Rahu + 180
    tropical_lons["ketu"] = (tropical_lons["rahu"] + 180) % 360
    retrogrades["ketu"] = True  # Ketu is always listed as retrograde

    # ── Ascendant ─────────────────────────────────────────────────────────────
    asc_tropical = _get_ascendant(jd_ut, lat, lon)
    asc_sidereal = _n360(asc_tropical - ayanamsha)
    lagna_rasi = _rasi(asc_sidereal)
    lagna_deg = _deg_in_rasi(asc_sidereal)

    # ── Convert to sidereal ───────────────────────────────────────────────────
    sidereal_lons: Dict[str, float] = {
        g: _n360(tlon - ayanamsha) for g, tlon in tropical_lons.items()
    }

    # ── Build graha records ───────────────────────────────────────────────────
    all_rasis: Dict[str, int] = {}
    grahas: Dict[str, Dict] = {}
    for graha, slon in sidereal_lons.items():
        rasi = _rasi(slon)
        all_rasis[graha] = rasi
        deg_in = _deg_in_rasi(slon)
        bhava = (rasi - lagna_rasi) % 12
        nak_idx = _nakshatra_index(slon)
        pada = _pada(slon)
        nak_name_ru, nak_name_en, nak_lord = NAKSHATRAS[nak_idx]
        dignity = _dignity_status(graha, slon)
        strength = _positional_strength(graha, bhava, slon)
        bav = _ashtakavarga_bav(graha, rasi, {k: v for k, v in all_rasis.items() if k != graha})
        bhava_info = BHAVA_THEMES.get(bhava, {"name": f"{bhava+1}-й Дом", "theme": ""})
        # Interpretation
        graha_bhava_interp = (
            GRAHA_INTERP.get(graha, {}).get(bhava) or
            f"{GRAHA_NAMES_RU.get(graha, graha)} в {bhava+1}-м доме. "
            f"{GRAHA_GENERAL_INTERP.get(graha, '')}"
        )
        grahas[graha] = {
            "key": graha,
            "name_ru": GRAHA_NAMES_RU.get(graha, graha),
            "glyph": GRAHA_GLYPHS.get(graha, ""),
            "tropical_lon": round(tropical_lons[graha], 4),
            "sidereal_lon": round(slon, 4),
            "rasi": rasi,
            "rasi_name_ru": RASI_NAMES_RU[rasi],
            "rasi_name_en": RASI_NAMES_EN[rasi],
            "rasi_glyph": RASI_GLYPHS[rasi],
            "deg_in_rasi": round(deg_in, 4),
            "bhava": bhava + 1,  # 1-indexed for display
            "bhava_name": bhava_info["name"],
            "bhava_theme": bhava_info["theme"],
            "retrograde": retrogrades.get(graha, False),
            "nakshatra_ru": nak_name_ru,
            "nakshatra_en": nak_name_en,
            "nakshatra_lord": nak_lord,
            "pada": pada,
            "dignity": dignity,
            "dignity_ru": _dignity_ru(dignity),
            "strength": strength,
            "bav": bav,
            "interpretation": graha_bhava_interp,
            "general_meaning": GRAHA_GENERAL_INTERP.get(graha, ""),
        }

    # ── Lagna info ────────────────────────────────────────────────────────────
    lagna_info_base = LAGNA_INTERP.get(lagna_rasi, {
        "title": RASI_NAMES_RU[lagna_rasi],
        "general": "Лагна определяет общий характер личности.",
        "strengths": "", "challenges": "", "dharma": "",
        "career": "", "health": "", "relationships": "",
    })
    lagna_info = {
        **lagna_info_base,
        "rasi": lagna_rasi,
        "rasi_name_ru": RASI_NAMES_RU[lagna_rasi],
        "rasi_glyph": RASI_GLYPHS[lagna_rasi],
        "deg": round(lagna_deg, 4),
        "lord": lagna_info_base.get("lord", _rasi_lord_of(lagna_rasi)),
        "lord_ru": GRAHA_NAMES_RU.get(lagna_info_base.get("lord", _rasi_lord_of(lagna_rasi)), ""),
    }

    # ── Vimshottari Dasha ─────────────────────────────────────────────────────
    moon_sidereal = sidereal_lons["moon"]
    dashas = _vimshottari_dasha(date_str, moon_sidereal)

    # Find current dasha/antar
    today = date_cls.today()
    current_dasha = next((d for d in dashas if d["active"]), None)
    current_antar = None
    if current_dasha:
        current_antar = next((a for a in current_dasha["antardasha"] if a["active"]), None)
        if current_dasha:
            current_dasha["dasha_interp"] = DASHA_INTERP.get(current_dasha["lord"], "")
        if current_antar:
            current_antar["antar_interp"] = (
                f"Антардаша {GRAHA_NAMES_RU.get(current_antar['lord'], current_antar['lord'])}: "
                f"В рамках Маха Даша {GRAHA_NAMES_RU.get(current_dasha['lord'], '')} "
                f"этот под-период акцентирует темы {GRAHA_NAMES_RU.get(current_antar['lord'], '')}."
            )

    # ── Yogas ────────────────────────────────────────────────────────────────
    yogas = _detect_yogas(grahas, lagna_rasi)

    # ── Rasi chart grid (who is where) ────────────────────────────────────────
    rasi_chart: Dict[int, List[str]] = {i: [] for i in range(12)}
    for graha, data in grahas.items():
        rasi_chart[data["rasi"]].append(graha)
    # Add Lagna separately
    rasi_chart_labeled = {}
    for rasi_num, graha_list in rasi_chart.items():
        bhava_num = (rasi_num - lagna_rasi) % 12 + 1
        rasi_chart_labeled[str(rasi_num)] = {
            "bhava": bhava_num,
            "rasi_name_ru": RASI_NAMES_RU[rasi_num],
            "rasi_glyph": RASI_GLYPHS[rasi_num],
            "grahas": graha_list,
            "is_lagna": rasi_num == lagna_rasi,
        }

    # ── SAV Ashtakavarga ─────────────────────────────────────────────────────
    sav = [0] * 12
    for graha, data in grahas.items():
        if graha in ("rahu", "ketu"):
            continue
        bav = data["bav"]
        for i in range(12):
            sav[i] += bav[i]

    # ── Navamsha (D-9) lagna ─────────────────────────────────────────────────
    navamsha_lon = (_n360(asc_sidereal) * 9) % 360
    navamsha_rasi = _rasi(navamsha_lon)

    # ── Build summary text ───────────────────────────────────────────────────
    strong_grahas = [g for g, d in grahas.items() if d["strength"] >= 4]
    weak_grahas = [g for g, d in grahas.items() if d["strength"] <= 2]

    summary = {
        "lagna_summary": (
            f"Ваша Лагна (асцендент) — {lagna_info['title']}. "
            f"Господин Лагны: {lagna_info.get('lord_ru', '')}. "
            f"{lagna_info.get('general', '')}"
        ),
        "current_dasha_summary": (
            f"Текущая Маха Даша: {current_dasha['lord_ru']} ({current_dasha['start']} — {current_dasha['end']}). "
            f"{DASHA_INTERP.get(current_dasha['lord'], '')}"
            if current_dasha else "Маха Даша не определена."
        ),
        "current_antar_summary": (
            f"Антардаша: {current_antar['lord_ru']} (до {current_antar['end']})."
            if current_antar else ""
        ),
        "strong_grahas": [GRAHA_NAMES_RU.get(g, g) for g in strong_grahas],
        "weak_grahas": [GRAHA_NAMES_RU.get(g, g) for g in weak_grahas],
        "yoga_count": len(yogas),
        "top_yogas": [y["name_ru"] for y in yogas[:3]],
    }

    return {
        "meta": {
            "engine_version": ENGINE_VERSION,
            "date": date_str,
            "time": time_str,
            "lat": lat,
            "lon": lon,
            "utc": utc_offset,
            "ayanamsha_lahiri": round(ayanamsha, 4),
            "jd_ut": round(jd_ut, 4),
        },
        "lagna": lagna_info,
        "grahas": grahas,
        "dashas": dashas,
        "current_dasha": current_dasha,
        "current_antar": current_antar,
        "yogas": yogas,
        "rasi_chart": rasi_chart_labeled,
        "sav": sav,
        "navamsha_rasi": navamsha_rasi,
        "navamsha_rasi_name_ru": RASI_NAMES_RU[navamsha_rasi],
        "summary": summary,
    }
