"""Gene Keys profile calculator.

Uses the same 64-gate mandala as Human Design (I Ching hexagrams).
Calculates the Golden Path (Activation, Venus, Pearl sequences) from birth data.

Archetypal framework: Shadow → Gift → Siddhi (challenge → higher function → peak state).
I Ching names used are from the traditional Wilhelm translation (public domain).
Shadow/Gift/Siddhi descriptions are original archetypal interpretations.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import swisseph as swe

# ── Import shared gate constants from HD engine ────────────────────────────
try:
    from human_design_engine import (
        GATE_ORDER, START_DEG, GATE_SPAN, LINE_SPAN,
        _gate_from_lon, _planet_lon, _jd_from_local, GATE_DATA,
    )
    _HD_AVAILABLE = True
except ImportError:
    _HD_AVAILABLE = False
    GATE_ORDER = [
        41,19,13,49,30,55,37,63, 22,36,25,17,21,51,42,3,
        27,24,2,23,8,20,16,35, 45,12,15,52,39,53,62,56,
        31,33,7,4,29,59,40,64, 47,6,46,18,48,57,32,50,
        28,44,1,43,14,34,9,5, 26,11,10,58,38,54,61,60,
    ]
    START_DEG  = 302.0625
    GATE_SPAN  = 360.0 / 64.0
    LINE_SPAN  = GATE_SPAN / 6.0

    def _gate_from_lon(lon: float) -> Dict[str, Any]:
        offset   = (lon - START_DEG) % 360.0
        gate_idx = int(offset // GATE_SPAN)
        gate_num = GATE_ORDER[gate_idx]
        remainder = offset - gate_idx * GATE_SPAN
        line = min(6, int(remainder // LINE_SPAN) + 1)
        return {"gate": gate_num, "line": line, "name": str(gate_num), "keynote": ""}

    def _jd_from_local(date_str, time_str, utc_offset):
        fmt = "%Y-%m-%d %H:%M:%S" if len(time_str.split(":")) == 3 else "%Y-%m-%d %H:%M"
        dt  = datetime.strptime(f"{date_str} {time_str}", fmt)
        utc = dt - timedelta(hours=utc_offset)
        return swe.julday(utc.year, utc.month, utc.day,
                          utc.hour + utc.minute/60 + getattr(utc, 'second', 0)/3600)

    def _planet_lon(jd_ut, body, flags=0):
        r = swe.calc_ut(jd_ut, body, swe.FLG_SWIEPH | swe.FLG_SPEED)
        return r[0][0] if isinstance(r[0], (list, tuple)) else r[0]


# ── Gene Keys 64 hexagrams ─────────────────────────────────────────────────
# Each entry: I Ching name, Shadow/Gift/Siddhi triad, codon ring, partner gate
# Shadow = challenge pattern;  Gift = transcended quality;  Siddhi = peak state
# Partner = programming partner (opposite gate in the wheel, 180° away)

GK_DATA: Dict[int, Dict[str, Any]] = {
    1:  {"name": "Freshness",        "iching": "The Creative",              "shadow": "Entropy",        "gift": "Freshness",       "siddhi": "Beauty",        "ring": "Ring of Fire",       "partner": 2,  "keywords": ["creativity","renewal","vitality"]},
    2:  {"name": "Dislocation",      "iching": "The Receptive",             "shadow": "Dislocation",    "gift": "Orientation",     "siddhi": "Unity",         "ring": "Ring of Fire",       "partner": 1,  "keywords": ["receptivity","direction","oneness"]},
    3:  {"name": "Chaos",            "iching": "Difficulty at Beginning",   "shadow": "Chaos",          "gift": "Innovation",      "siddhi": "Innocence",     "ring": "Ring of Humanity",   "partner": 50, "keywords": ["innovation","order","new beginnings"]},
    4:  {"name": "Intolerance",      "iching": "Youthful Folly",            "shadow": "Intolerance",    "gift": "Understanding",   "siddhi": "Forgiveness",   "ring": "Ring of Secrets",    "partner": 49, "keywords": ["understanding","patience","acceptance"]},
    5:  {"name": "Impatience",       "iching": "Waiting",                   "shadow": "Impatience",     "gift": "Patience",        "siddhi": "Timelessness",  "ring": "Ring of Light",      "partner": 35, "keywords": ["timing","flow","presence"]},
    6:  {"name": "Conflict",         "iching": "Conflict",                  "shadow": "Conflict",       "gift": "Diplomacy",       "siddhi": "Peace",         "ring": "Ring of Union",      "partner": 36, "keywords": ["harmony","negotiation","peace"]},
    7:  {"name": "Division",         "iching": "The Army",                  "shadow": "Division",       "gift": "Guidance",        "siddhi": "Virtue",        "ring": "Ring of Seeking",    "partner": 13, "keywords": ["leadership","vision","integrity"]},
    8:  {"name": "Mediocrity",       "iching": "Holding Together",          "shadow": "Mediocrity",     "gift": "Style",           "siddhi": "Exquisiteness", "ring": "Ring of Light",      "partner": 14, "keywords": ["individuality","excellence","uniqueness"]},
    9:  {"name": "Inertia",          "iching": "Small Taming Power",        "shadow": "Inertia",        "gift": "Determination",   "siddhi": "Invincibility", "ring": "Ring of Trials",     "partner": 16, "keywords": ["persistence","focus","will"]},
    10: {"name": "Self-obsession",   "iching": "Treading",                  "shadow": "Self-obsession", "gift": "Naturalness",     "siddhi": "Being",         "ring": "Ring of Humanity",   "partner": 15, "keywords": ["authenticity","self-expression","presence"]},
    11: {"name": "Obscurity",        "iching": "Peace",                     "shadow": "Obscurity",      "gift": "Idealism",        "siddhi": "Light",         "ring": "Ring of Light",      "partner": 12, "keywords": ["vision","imagination","illumination"]},
    12: {"name": "Vanity",           "iching": "Standstill",                "shadow": "Vanity",         "gift": "Discrimination",  "siddhi": "Purity",        "ring": "Ring of Light",      "partner": 11, "keywords": ["discernment","simplicity","essence"]},
    13: {"name": "Discord",          "iching": "Fellowship with Men",       "shadow": "Discord",        "gift": "Discernment",     "siddhi": "Empathy",       "ring": "Ring of Seeking",    "partner": 7,  "keywords": ["listening","understanding","compassion"]},
    14: {"name": "Compromise",       "iching": "Possession in Abundance",   "shadow": "Compromise",     "gift": "Competence",      "siddhi": "Bounteousness", "ring": "Ring of Light",      "partner": 8,  "keywords": ["mastery","resources","abundance"]},
    15: {"name": "Dullness",         "iching": "Modesty",                   "shadow": "Dullness",       "gift": "Magnetism",       "siddhi": "Florescence",   "ring": "Ring of Humanity",   "partner": 10, "keywords": ["charisma","rhythms","diversity"]},
    16: {"name": "Indifference",     "iching": "Enthusiasm",                "shadow": "Indifference",   "gift": "Versatility",     "siddhi": "Mastery",       "ring": "Ring of Trials",     "partner": 9,  "keywords": ["skill","practice","excellence"]},
    17: {"name": "Opinion",          "iching": "Following",                 "shadow": "Opinion",        "gift": "Far-sightedness", "siddhi": "Omniscience",   "ring": "Ring of Secrets",    "partner": 18, "keywords": ["vision","openness","awareness"]},
    18: {"name": "Judgment",         "iching": "Work on the Decayed",       "shadow": "Judgment",       "gift": "Integrity",       "siddhi": "Perfection",    "ring": "Ring of Secrets",    "partner": 17, "keywords": ["healing","correction","wholeness"]},
    19: {"name": "Co-dependence",    "iching": "Approach",                  "shadow": "Co-dependence",  "gift": "Sensitivity",     "siddhi": "Sacrifice",     "ring": "Ring of No-Return",  "partner": 33, "keywords": ["attunement","needs","service"]},
    20: {"name": "Superficiality",   "iching": "Contemplation",             "shadow": "Superficiality", "gift": "Self-assurance",  "siddhi": "Presence",      "ring": "Ring of No-Return",  "partner": 34, "keywords": ["depth","awareness","now"]},
    21: {"name": "Control",          "iching": "Biting Through",            "shadow": "Control",        "gift": "Authority",       "siddhi": "Valour",        "ring": "Ring of the Purifier","partner": 48, "keywords": ["responsibility","leadership","courage"]},
    22: {"name": "Dishonour",        "iching": "Grace",                     "shadow": "Dishonour",      "gift": "Graciousness",    "siddhi": "Grace",         "ring": "Ring of Union",      "partner": 47, "keywords": ["dignity","beauty","elegance"]},
    23: {"name": "Complexity",       "iching": "Splitting Apart",           "shadow": "Complexity",     "gift": "Simplicity",      "siddhi": "Quintessence",  "ring": "Ring of Humanity",   "partner": 43, "keywords": ["clarity","essence","simplicity"]},
    24: {"name": "Addiction",        "iching": "Return",                    "shadow": "Addiction",      "gift": "Invention",       "siddhi": "Silence",       "ring": "Ring of Life and Death","partner": 44,"keywords": ["renewal","creativity","stillness"]},
    25: {"name": "Constriction",     "iching": "Innocence",                 "shadow": "Constriction",   "gift": "Acceptance",      "siddhi": "Universal Love", "ring": "Ring of Humanity",  "partner": 46, "keywords": ["openness","trust","unconditional love"]},
    26: {"name": "Pride",            "iching": "Great Taming Power",        "shadow": "Pride",          "gift": "Artfulness",      "siddhi": "Invisibility",  "ring": "Ring of the Witness","partner": 45, "keywords": ["humility","storytelling","transmission"]},
    27: {"name": "Selfishness",      "iching": "Nourishment",               "shadow": "Selfishness",    "gift": "Altruism",        "siddhi": "Selflessness",  "ring": "Ring of Humanity",   "partner": 28, "keywords": ["care","nourishment","generosity"]},
    28: {"name": "Purposelessness",  "iching": "Great Preponderance",       "shadow": "Purposelessness","gift": "Totality",         "siddhi": "Immortality",   "ring": "Ring of Life and Death","partner": 27,"keywords": ["meaning","commitment","eternity"]},
    29: {"name": "Half-heartedness", "iching": "The Abysmal",               "shadow": "Half-heartedness","gift": "Commitment",     "siddhi": "Devotion",      "ring": "Ring of Union",      "partner": 30, "keywords": ["dedication","yes","surrender"]},
    30: {"name": "Desire",           "iching": "The Clinging Fire",         "shadow": "Desire",         "gift": "Lightness",       "siddhi": "Rapture",       "ring": "Ring of Union",      "partner": 29, "keywords": ["feeling","joy","ecstasy"]},
    31: {"name": "Arrogance",        "iching": "Influence",                 "shadow": "Arrogance",      "gift": "Leadership",      "siddhi": "Humility",      "ring": "Ring of No-Return",  "partner": 41, "keywords": ["influence","service","modesty"]},
    32: {"name": "Failure",          "iching": "Duration",                  "shadow": "Failure",        "gift": "Preservation",    "siddhi": "Veneration",    "ring": "Ring of Trials",     "partner": 42, "keywords": ["sustainability","legacy","reverence"]},
    33: {"name": "Forgetting",       "iching": "Retreat",                   "shadow": "Forgetting",     "gift": "Mindfulness",     "siddhi": "Revelation",    "ring": "Ring of No-Return",  "partner": 19, "keywords": ["memory","reflection","wisdom"]},
    34: {"name": "Force",            "iching": "Great Power",               "shadow": "Force",          "gift": "Strength",        "siddhi": "Majesty",       "ring": "Ring of No-Return",  "partner": 20, "keywords": ["power","gentleness","greatness"]},
    35: {"name": "Hunger",           "iching": "Progress",                  "shadow": "Hunger",         "gift": "Adventure",       "siddhi": "Boundlessness", "ring": "Ring of Light",      "partner": 5,  "keywords": ["exploration","experience","freedom"]},
    36: {"name": "Turbulence",       "iching": "Darkening of Light",        "shadow": "Turbulence",     "gift": "Humanity",        "siddhi": "Compassion",    "ring": "Ring of Union",      "partner": 6,  "keywords": ["empathy","crisis","transcendence"]},
    37: {"name": "Weakness",         "iching": "The Family",                "shadow": "Weakness",       "gift": "Equality",        "siddhi": "Tenderness",    "ring": "Ring of the Witness","partner": 40, "keywords": ["community","belonging","love"]},
    38: {"name": "Struggle",         "iching": "Opposition",                "shadow": "Struggle",       "gift": "Perseverance",    "siddhi": "Honour",        "ring": "Ring of Trials",     "partner": 39, "keywords": ["integrity","challenge","dignity"]},
    39: {"name": "Provocation",      "iching": "Obstruction",               "shadow": "Provocation",    "gift": "Dynamism",        "siddhi": "Liberation",    "ring": "Ring of Trials",     "partner": 38, "keywords": ["energy","catalyst","freedom"]},
    40: {"name": "Exhaustion",       "iching": "Deliverance",               "shadow": "Exhaustion",     "gift": "Resolve",         "siddhi": "Divine Will",   "ring": "Ring of the Witness","partner": 37, "keywords": ["rest","boundaries","surrender"]},
    41: {"name": "Fantasy",          "iching": "Decrease",                  "shadow": "Fantasy",        "gift": "Anticipation",    "siddhi": "Emanation",     "ring": "Ring of No-Return",  "partner": 31, "keywords": ["imagination","longing","manifestation"]},
    42: {"name": "Expectation",      "iching": "Increase",                  "shadow": "Expectation",    "gift": "Detachment",      "siddhi": "Celebration",   "ring": "Ring of Trials",     "partner": 32, "keywords": ["completion","letting go","joy"]},
    43: {"name": "Deafness",         "iching": "Breakthrough",              "shadow": "Deafness",       "gift": "Insight",         "siddhi": "Epiphany",      "ring": "Ring of Humanity",   "partner": 23, "keywords": ["inner knowing","breakthrough","revelation"]},
    44: {"name": "Interference",     "iching": "Coming to Meet",            "shadow": "Interference",   "gift": "Teamwork",        "siddhi": "Synergy",       "ring": "Ring of Life and Death","partner": 24,"keywords": ["cooperation","patterns","wholeness"]},
    45: {"name": "Dominance",        "iching": "Gathering Together",        "shadow": "Dominance",      "gift": "Synergy",         "siddhi": "Communion",     "ring": "Ring of the Witness","partner": 26, "keywords": ["community","sharing","oneness"]},
    46: {"name": "Seriousness",      "iching": "Pushing Upward",            "shadow": "Seriousness",    "gift": "Delight",         "siddhi": "Ecstasy",       "ring": "Ring of Humanity",   "partner": 25, "keywords": ["joy","body","celebration"]},
    47: {"name": "Oppression",       "iching": "Oppression / Exhaustion",   "shadow": "Oppression",     "gift": "Transmutation",   "siddhi": "Transfiguration","ring": "Ring of Union",    "partner": 22, "keywords": ["alchemy","transformation","illumination"]},
    48: {"name": "Inadequacy",       "iching": "The Well",                  "shadow": "Inadequacy",     "gift": "Resourcefulness", "siddhi": "Wisdom",        "ring": "Ring of the Purifier","partner": 21,"keywords": ["depth","knowledge","understanding"]},
    49: {"name": "Reaction",         "iching": "Revolution",                "shadow": "Reaction",       "gift": "Revolution",      "siddhi": "Rebirth",       "ring": "Ring of Secrets",    "partner": 4,  "keywords": ["change","principle","renewal"]},
    50: {"name": "Corruption",       "iching": "The Cauldron",              "shadow": "Corruption",     "gift": "Equilibrium",     "siddhi": "Harmony",       "ring": "Ring of Humanity",   "partner": 3,  "keywords": ["values","balance","nourishment"]},
    51: {"name": "Agitation",        "iching": "The Arousing Thunder",      "shadow": "Agitation",      "gift": "Initiative",      "siddhi": "Awakening",     "ring": "Ring of Secrets",    "partner": 57, "keywords": ["courage","shock","presence"]},
    52: {"name": "Stress",           "iching": "Keeping Still Mountain",    "shadow": "Stress",         "gift": "Restraint",       "siddhi": "Stillness",     "ring": "Ring of Trials",     "partner": 58, "keywords": ["patience","silence","peace"]},
    53: {"name": "Immaturity",       "iching": "Gradual Development",       "shadow": "Immaturity",     "gift": "Expansion",       "siddhi": "Superabundance","ring": "Ring of Life and Death","partner": 54,"keywords": ["growth","process","abundance"]},
    54: {"name": "Greed",            "iching": "The Marrying Maiden",       "shadow": "Greed",          "gift": "Aspiration",      "siddhi": "Ascension",     "ring": "Ring of Life and Death","partner": 53,"keywords": ["ambition","evolution","transcendence"]},
    55: {"name": "Victimization",    "iching": "Abundance",                 "shadow": "Victimization",  "gift": "Freedom",         "siddhi": "Freedom",       "ring": "Ring of No-Return",  "partner": 59, "keywords": ["emotion","liberation","wholeness"]},
    56: {"name": "Distraction",      "iching": "The Wanderer",              "shadow": "Distraction",    "gift": "Enrichment",      "siddhi": "Intoxication",  "ring": "Ring of Prosperity", "partner": 60, "keywords": ["story","meaning","wonder"]},
    57: {"name": "Unease",           "iching": "The Gentle Wind",           "shadow": "Unease",         "gift": "Intuition",       "siddhi": "Clarity",       "ring": "Ring of Secrets",    "partner": 51, "keywords": ["instinct","subtlety","perception"]},
    58: {"name": "Dissatisfaction",  "iching": "The Joyous Lake",           "shadow": "Dissatisfaction","gift": "Vitality",         "siddhi": "Bliss",         "ring": "Ring of Trials",     "partner": 52, "keywords": ["joy","aliveness","wellbeing"]},
    59: {"name": "Dishonesty",       "iching": "Dispersion",                "shadow": "Dishonesty",     "gift": "Intimacy",        "siddhi": "Transparency",  "ring": "Ring of No-Return",  "partner": 55, "keywords": ["openness","vulnerability","truth"]},
    60: {"name": "Limitation",       "iching": "Limitation",                "shadow": "Limitation",     "gift": "Realism",         "siddhi": "Justice",       "ring": "Ring of Prosperity", "partner": 56, "keywords": ["acceptance","boundaries","fairness"]},
    61: {"name": "Psychosis",        "iching": "Inner Truth",               "shadow": "Psychosis",      "gift": "Inspiration",     "siddhi": "Sanctity",      "ring": "Ring of Secrets",    "partner": 62, "keywords": ["mystery","knowing","sacredness"]},
    62: {"name": "Intellectualization","iching": "Preponderance of Small",  "shadow": "Intellectualization","gift": "Precision",   "siddhi": "Impeccability", "ring": "Ring of Secrets",    "partner": 61, "keywords": ["detail","mastery","perfection"]},
    63: {"name": "Doubt",            "iching": "After Completion",          "shadow": "Doubt",          "gift": "Inquiry",         "siddhi": "Truth",         "ring": "Ring of Seeking",    "partner": 64, "keywords": ["questioning","wisdom","certainty"]},
    64: {"name": "Confusion",        "iching": "Before Completion",         "shadow": "Confusion",      "gift": "Imagination",     "siddhi": "Illumination",  "ring": "Ring of Seeking",    "partner": 63, "keywords": ["potential","creativity","enlightenment"]},
}


# ── Codon Ring descriptions ────────────────────────────────────────────────
CODON_RING_INFO: Dict[str, str] = {
    "Ring of Fire":         "Creative force and initiation — the spark of life itself.",
    "Ring of Humanity":     "The human journey: individual expression within collective story.",
    "Ring of Secrets":      "Hidden wisdom; the mystical undercurrent of perception.",
    "Ring of Union":        "Relationship and synthesis — merging opposites into wholeness.",
    "Ring of No-Return":    "Irreversible transformation; the point beyond which life cannot be the same.",
    "Ring of Light":        "Transmission of higher consciousness through form and beauty.",
    "Ring of Life and Death":"The great cycle: birth, sustenance, decay and renewal.",
    "Ring of Trials":       "Challenges that build resilience and refine the spirit.",
    "Ring of Seeking":      "Inquiry and the quest for deeper meaning.",
    "Ring of the Witness":  "Neutral awareness; the observer behind all experience.",
    "Ring of the Purifier": "Purification through depth and responsible use of power.",
    "Ring of Prosperity":   "Abundance, culture and the art of living well.",
}


# ── Golden Path sphere definitions ────────────────────────────────────────
GOLDEN_PATH: Dict[str, Any] = {
    "activation_sequence": {
        "name": "Activation Sequence — Your Four Prime Gifts",
        "description": "The four core Gene Keys that define your primary life purpose, gifts, and evolutionary path.",
        "spheres": [
            {"key": "life_work",   "name": "Sphere of Life's Work",  "planet": "birth_sun",    "description": "Your primary gift and life purpose — the core of who you are."},
            {"key": "evolution",   "name": "Sphere of Evolution",    "planet": "birth_earth",  "description": "The unconscious gift you carry — how you evolve through challenge."},
            {"key": "radiance",    "name": "Sphere of Radiance",     "planet": "design_sun",   "description": "Your unconscious nature — how your light radiates into the world."},
            {"key": "purpose",     "name": "Sphere of Purpose",      "planet": "design_earth", "description": "The ground of your being — your deeper unconscious purpose."},
        ],
    },
    "venus_sequence": {
        "name": "Venus Sequence — The Path of Love",
        "description": "The emotional journey through relationships that unlocks your heart intelligence.",
        "spheres": [
            {"key": "core_wound", "name": "Sphere of Core Wound",  "planet": "birth_moon",   "description": "Your deepest emotional wound and greatest teacher."},
            {"key": "iq",         "name": "Sphere of IQ",          "planet": "birth_mercury","description": "How you process and communicate your inner world."},
            {"key": "eq",         "name": "Sphere of EQ",          "planet": "birth_venus",  "description": "The quality of love you seek and offer."},
            {"key": "sq",         "name": "Sphere of SQ",          "planet": "birth_mars",   "description": "Your spiritual drive and desire for union."},
            {"key": "vocation",   "name": "Sphere of Vocation",    "planet": "birth_jupiter","description": "Your calling — how you serve and expand."},
            {"key": "culture",    "name": "Sphere of Culture",     "planet": "birth_saturn", "description": "The lessons you carry from ancestors; your contribution to culture."},
        ],
    },
    "pearl_sequence": {
        "name": "Pearl Sequence — The Path of Prosperity",
        "description": "The outer journey through work, service, and material abundance.",
        "spheres": [
            {"key": "brand",       "name": "Sphere of Brand",       "planet": "design_moon",   "description": "Your natural magnetism and how the world recognises you."},
            {"key": "pearl",       "name": "Sphere of Pearl",       "planet": "design_mercury","description": "The ultimate gift you give the world — your legacy."},
            {"key": "prosperity",  "name": "Sphere of Prosperity",  "planet": "design_venus",  "description": "Your relationship with abundance and material wellbeing."},
        ],
    },
}


# ── Calculations ───────────────────────────────────────────────────────────

_PLANET_IDS: Dict[str, Optional[int]] = {
    "sun":     swe.SUN,
    "earth":   None,      # computed as opp of Sun
    "moon":    swe.MOON,
    "mercury": swe.MERCURY,
    "venus":   swe.VENUS,
    "mars":    swe.MARS,
    "jupiter": swe.JUPITER,
    "saturn":  swe.SATURN,
}

_PLANETS_NEEDED = list(_PLANET_IDS.keys())


def _planet_lons(jd_ut: float) -> Dict[str, float]:
    """Return ecliptic longitudes for all needed planets at jd_ut."""
    result: Dict[str, float] = {}
    flags = swe.FLG_SWIEPH | swe.FLG_SPEED
    for pname, pid in _PLANET_IDS.items():
        if pid is None:
            continue
        try:
            r = swe.calc_ut(jd_ut, pid, flags)
            lon = r[0][0] if isinstance(r[0], (list, tuple)) else r[0]
        except Exception:
            lon = 0.0
        result[pname] = lon
    # Earth = opposite of Sun
    result["earth"] = (result.get("sun", 0) + 180.0) % 360.0
    return result


def _gate_info(lon: float) -> Dict[str, Any]:
    """Return gate number, line, GK name + triad for a given ecliptic longitude."""
    g = _gate_from_lon(lon)
    gate_num = g["gate"]
    gk = GK_DATA.get(gate_num, {})
    return {
        "gate":      gate_num,
        "line":      g.get("line", 1),
        "iching":    gk.get("iching", ""),
        "gk_name":   gk.get("name", ""),
        "shadow":    gk.get("shadow", ""),
        "gift":      gk.get("gift", ""),
        "siddhi":    gk.get("siddhi", ""),
        "keywords":  gk.get("keywords", []),
        "codon_ring":gk.get("ring", ""),
        "partner":   gk.get("partner", 0),
    }


def _build_sphere(sphere_def: Dict, gate_data: Dict) -> Dict[str, Any]:
    return {
        "key":         sphere_def["key"],
        "sphere_name": sphere_def["name"],
        "description": sphere_def["description"],
        "planet":      sphere_def["planet"],
        **gate_data,
    }


def calc_gene_keys_profile(
    date_str: str,
    time_str: str,
    lat: float,
    lon_deg: float,
    utc_offset: float,
    name: str = "",
) -> Dict[str, Any]:
    """
    Calculate a complete Gene Keys Golden Path profile from birth data.

    Returns Activation Sequence (4 spheres), Venus Sequence (6 spheres),
    Pearl Sequence (3 spheres), plus a summary interpretation.
    """
    # ── Birth JD ──────────────────────────────────────────────────────────
    birth_jd = _jd_from_local(date_str, time_str, utc_offset)

    # ── Design JD (88.736 days before birth — same as HD 88° solar arc) ──
    design_jd = birth_jd - 88.736

    # ── Calculate planetary positions ─────────────────────────────────────
    birth_lons  = _planet_lons(birth_jd)
    design_lons = _planet_lons(design_jd)

    # ── Build all gate activations ────────────────────────────────────────
    birth_gates  = {p: _gate_info(lon) for p, lon in birth_lons.items()}
    design_gates = {p: _gate_info(lon) for p, lon in design_lons.items()}

    # ── Activation Sequence ───────────────────────────────────────────────
    activation_map = {
        "birth_sun":    birth_gates["sun"],
        "birth_earth":  birth_gates["earth"],
        "design_sun":   design_gates["sun"],
        "design_earth": design_gates["earth"],
    }
    activation_spheres = []
    for sphere_def in GOLDEN_PATH["activation_sequence"]["spheres"]:
        planet_key = sphere_def["planet"]
        gate_data  = activation_map[planet_key]
        activation_spheres.append(_build_sphere(sphere_def, gate_data))

    # ── Venus Sequence ────────────────────────────────────────────────────
    venus_map = {
        "birth_moon":    birth_gates["moon"],
        "birth_mercury": birth_gates["mercury"],
        "birth_venus":   birth_gates["venus"],
        "birth_mars":    birth_gates["mars"],
        "birth_jupiter": birth_gates["jupiter"],
        "birth_saturn":  birth_gates["saturn"],
    }
    venus_spheres = []
    for sphere_def in GOLDEN_PATH["venus_sequence"]["spheres"]:
        planet_key = sphere_def["planet"]
        gate_data  = venus_map.get(planet_key, {})
        venus_spheres.append(_build_sphere(sphere_def, gate_data))

    # ── Pearl Sequence ────────────────────────────────────────────────────
    pearl_map = {
        "design_moon":    design_gates["moon"],
        "design_mercury": design_gates["mercury"],
        "design_venus":   design_gates["venus"],
    }
    pearl_spheres = []
    for sphere_def in GOLDEN_PATH["pearl_sequence"]["spheres"]:
        planet_key = sphere_def["planet"]
        gate_data  = pearl_map.get(planet_key, {})
        pearl_spheres.append(_build_sphere(sphere_def, gate_data))

    # ── Life Purpose summary (from Birth Sun gate) ─────────────────────────
    prime_gate  = birth_gates["sun"]
    shadow_gate = birth_gates["earth"]
    purpose_txt = (
        f"Your Life's Work centres on Gene Key {prime_gate['gate']} — "
        f"«{prime_gate['iching']}» ({prime_gate['gk_name']}). "
        f"The Shadow pattern to transcend is «{prime_gate['shadow']}». "
        f"When this is transformed, the Gift of «{prime_gate['gift']}» emerges. "
        f"At the highest expression: «{prime_gate['siddhi']}». "
        f"Your evolutionary ground (Earth, GK {shadow_gate['gate']}) holds "
        f"the Gift of «{shadow_gate['gift']}» — your unconscious resource."
    )

    # ── Unique Gate Set (all activated gates, birth + design) ─────────────
    all_gates: Dict[int, Dict] = {}
    for side, gates_dict in [("birth", birth_gates), ("design", design_gates)]:
        for pname, ginfo in gates_dict.items():
            gnum = ginfo["gate"]
            if gnum not in all_gates:
                all_gates[gnum] = {**ginfo, "sides": [], "planets": []}
            if side not in all_gates[gnum]["sides"]:
                all_gates[gnum]["sides"].append(side)
            all_gates[gnum]["planets"].append(f"{side}_{pname}")

    # ── Codon Ring analysis ───────────────────────────────────────────────
    rings_active: Dict[str, List[int]] = {}
    for gnum, ginfo in all_gates.items():
        ring = ginfo.get("codon_ring", "")
        if ring:
            rings_active.setdefault(ring, []).append(gnum)

    ring_summary = [
        {"ring": ring, "gates": sorted(gates), "description": CODON_RING_INFO.get(ring, "")}
        for ring, gates in rings_active.items()
        if len(gates) >= 2
    ]
    ring_summary.sort(key=lambda r: -len(r["gates"]))

    return {
        "name":       name,
        "birth_date": date_str,
        "design_date": _jd_to_iso(design_jd),
        "activation_sequence": {
            "name":        GOLDEN_PATH["activation_sequence"]["name"],
            "description": GOLDEN_PATH["activation_sequence"]["description"],
            "spheres":     activation_spheres,
        },
        "venus_sequence": {
            "name":        GOLDEN_PATH["venus_sequence"]["name"],
            "description": GOLDEN_PATH["venus_sequence"]["description"],
            "spheres":     venus_spheres,
        },
        "pearl_sequence": {
            "name":        GOLDEN_PATH["pearl_sequence"]["name"],
            "description": GOLDEN_PATH["pearl_sequence"]["description"],
            "spheres":     pearl_spheres,
        },
        "life_purpose": purpose_txt,
        "prime_gift":   prime_gate,
        "all_active_gates": sorted(all_gates.values(), key=lambda x: x["gate"]),
        "active_codon_rings": ring_summary,
        "total_activated_gates": len(all_gates),
    }


def _jd_to_iso(jd_ut: float) -> str:
    """Convert Julian Day to ISO date string."""
    try:
        y, m, d, _ = swe.revjul(jd_ut, swe.GREG_CAL)
        return f"{y:04d}-{m:02d}-{d:02d}"
    except Exception:
        return ""
