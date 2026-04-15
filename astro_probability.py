#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AstroCRM — Probability Model (Seth's Framework)
=================================================
Implements a probability tree for astrological transits based on:
  - Seth (Jane Roberts): "настоящее — точка силы", вероятностные ветви
  - Robert Monroe: ROTE-ядро (натальная карта как пакет данных)
  - Castaneda: индекс точки сборки (Tonal/Nagual balance)

Architecture:
  Level 1 — ROTE core: natal chart as probability seed
  Level 2 — Probability matrix: each transit generates branches with weights
  Level 3 — Assembly Point Index: Tonal (structure) vs Nagual (chaos) balance
  Level 4 — Temporal navigation: multi-dimensional time map
  Level 5 — Compensatory report: "which probabilities are activated"
"""

from __future__ import annotations
import math
from typing import Optional


# ── Constants ─────────────────────────────────────────────────────────────────

# Seth's framework: Tonal planets (structure) vs Nagual planets (transformation)
_TONAL_PLANETS  = {"sun", "saturn", "mercury", "jupiter"}  # rational, structure
_NAGUAL_PLANETS = {"neptune", "pluto", "moon", "uranus"}   # chaos, transformation
_BRIDGE_PLANETS = {"mars", "venus", "node", "chiron", "lilith"}  # bridge/catalyst

# Aspect weights for probability score (0.0 → 1.0)
_ASPECT_WEIGHTS = {
    "conjunction":  1.0,
    "opposition":   0.85,
    "square":       0.80,
    "trine":        0.70,
    "sextile":      0.55,
    "quincunx":     0.40,
    "semisquare":   0.30,
    "sesquisquare": 0.30,
    "semisextile":  0.20,
}

# Life sphere mapping for each planet
_PLANET_SPHERES = {
    "sun":     ["идентичность", "карьера", "жизненная сила"],
    "moon":    ["эмоции", "семья", "бессознательное"],
    "mercury": ["коммуникации", "интеллект", "документы"],
    "venus":   ["отношения", "финансы", "красота"],
    "mars":    ["энергия", "конфликты", "инициативы"],
    "jupiter": ["рост", "удача", "философия"],
    "saturn":  ["ограничения", "карьера", "дисциплина"],
    "uranus":  ["перемены", "нестандартность", "разрывы"],
    "neptune": ["духовность", "иллюзии", "интуиция"],
    "pluto":   ["трансформация", "власть", "смерть/возрождение"],
    "node":    ["карма", "судьба", "жизненный путь"],
    "chiron":  ["исцеление", "раны", "мудрость"],
    "lilith":  ["тень", "табу", "вытесненное"],
}

_PLANET_RU = {
    "sun": "Солнце", "moon": "Луна", "mercury": "Меркурий", "venus": "Венера",
    "mars": "Марс", "jupiter": "Юпитер", "saturn": "Сатурн",
    "uranus": "Уран", "neptune": "Нептун", "pluto": "Плутон",
    "node": "Сев. Узел", "chiron": "Хирон", "lilith": "Лилит",
}


# ── Scoring Functions ─────────────────────────────────────────────────────────

def _orb_weight(orb_deg: float, max_orb: float = 8.0) -> float:
    """Orb-based probability weight: tighter = stronger (linear decay)."""
    if orb_deg >= max_orb:
        return 0.0
    return max(0.0, 1.0 - orb_deg / max_orb) ** 1.5


def _dignity_multiplier(planet: str, natal_chart: dict) -> float:
    """Dignity score multiplier for a planet (0.5–2.0)."""
    planets = natal_chart.get("planets", {})
    pdata   = planets.get(planet, {})
    dignity = pdata.get("dignity_score") or pdata.get("essential_dignity_score", 0)
    # Normalize: -4..+5 → 0.5..2.0
    return max(0.5, min(2.0, 1.0 + dignity * 0.15))


def _transit_probability(
    transiting_planet: str,
    natal_planet: str,
    aspect: str,
    orb: float,
    natal_chart: dict,
) -> float:
    """
    Base probability weight for a single transit aspect.
    Combines: aspect weight × orb decay × dignity multiplier
    """
    asp_w = _ASPECT_WEIGHTS.get(aspect, 0.2)
    orb_w = _orb_weight(orb, max_orb=10.0 if aspect == "conjunction" else 8.0)
    dig_m = _dignity_multiplier(natal_planet, natal_chart)
    return round(asp_w * orb_w * dig_m, 4)


# ── Assembly Point Index ──────────────────────────────────────────────────────

def assembly_point_index(natal_chart: dict, transit_aspects: list) -> dict:
    """
    Calculates Castaneda's Assembly Point Index:
    Balance between Tonal (structure/rational) and Nagual (chaos/transformation).

    Returns index from -1.0 (full Tonal/rigid) to +1.0 (full Nagual/dissolved),
    with 0.0 being optimal balance.
    """
    tonal_score  = 0.0
    nagual_score = 0.0
    bridge_score = 0.0

    for asp in transit_aspects:
        tp = asp.get("transiting_planet", asp.get("planet", ""))
        np = asp.get("natal_planet", asp.get("target", ""))
        asp_name = asp.get("aspect", "conjunction")
        orb  = asp.get("orb", 5.0)
        prob = asp.get("probability", _aspect_weights_simple(asp_name, orb))

        for planet in (tp, np):
            if planet in _TONAL_PLANETS:
                tonal_score  += prob
            elif planet in _NAGUAL_PLANETS:
                nagual_score += prob
            else:
                bridge_score += prob * 0.5

    total = tonal_score + nagual_score + bridge_score + 0.001
    index = (nagual_score - tonal_score) / total
    index = max(-1.0, min(1.0, index))

    intensity = min(1.0, (tonal_score + nagual_score + bridge_score) / 5.0)

    zones = {
        (-1.0, -0.6): ("Глубокое Тональ", "Жёсткие структуры, сопротивление переменам. Риск ригидности."),
        (-0.6, -0.2): ("Умеренное Тональ", "Структура преобладает. Хорошо для планирования и дисциплины."),
        (-0.2,  0.2): ("Равновесие",       "Оптимальный баланс Тональ/Нагуаль. Точка силы по Сету."),
        ( 0.2,  0.6): ("Умеренный Нагуаль","Трансформация активна. Хорошо для духовной работы и перемен."),
        ( 0.6,  1.0): ("Глубокий Нагуаль", "Сильная дестабилизация. Риск хаоса, но и глубокое прозрение."),
    }
    zone_name, zone_desc = "Равновесие", ""
    for (lo, hi), (name, desc) in zones.items():
        if lo <= index < hi or (hi == 1.0 and index == 1.0):
            zone_name, zone_desc = name, desc
            break

    return {
        "index":        round(index, 4),
        "tonal_score":  round(tonal_score, 4),
        "nagual_score": round(nagual_score, 4),
        "bridge_score": round(bridge_score, 4),
        "intensity":    round(intensity, 4),
        "zone":         zone_name,
        "zone_description": zone_desc,
        "recommendation": (
            "Время действовать — точка силы Сета" if abs(index) < 0.2 else
            "Укрепите структуры — медитация, планирование, дисциплина" if index < -0.2 else
            "Доверьтесь потоку — отпустите контроль, практикуйте намерение"
        ),
    }


def _aspect_weights_simple(aspect: str, orb: float) -> float:
    w = _ASPECT_WEIGHTS.get(aspect, 0.2)
    return w * max(0.0, 1.0 - orb / 8.0)


# ── Probability Tree Generator ────────────────────────────────────────────────

def _generate_branch(
    transit_aspect: dict,
    natal_chart: dict,
    branch_depth: int = 2,
) -> dict:
    """
    Generate a single probability branch for one transit aspect.
    Each branch has: action sphere, probability weight, timeline, compensatory actions.
    """
    tp = transit_aspect.get("transiting_planet", transit_aspect.get("planet", ""))
    np = transit_aspect.get("natal_planet", transit_aspect.get("target", ""))
    aspect = transit_aspect.get("aspect", "conjunction")
    orb    = transit_aspect.get("orb", 5.0)

    base_prob = _transit_probability(tp, np, aspect, orb, natal_chart)
    if base_prob < 0.05:
        return None

    # Life spheres affected
    spheres = list(set(
        _PLANET_SPHERES.get(tp, []) + _PLANET_SPHERES.get(np, [])
    ))[:4]

    # Determine polarity (harmonious/tense)
    is_tense = aspect in ("opposition", "square", "semisquare", "sesquisquare")
    is_harmonious = aspect in ("trine", "sextile", "semisextile")
    polarity = "напряжённый" if is_tense else ("гармоничный" if is_harmonious else "нейтральный")

    # Generate probability branches
    branches = []
    if is_tense:
        branches = [
            {"path": "сопротивление", "prob": round(base_prob * 0.4, 3),
             "outcome": "Конфликт, потеря, необходимость адаптации"},
            {"path": "трансформация", "prob": round(base_prob * 0.45, 3),
             "outcome": "Кризис как точка роста, прорыв через ограничение"},
            {"path": "интеграция",    "prob": round(base_prob * 0.15, 3),
             "outcome": "Осознанная работа с напряжением, компенсация"},
        ]
    elif is_harmonious:
        branches = [
            {"path": "реализация",   "prob": round(base_prob * 0.55, 3),
             "outcome": "Гармоничное развитие, поддержка, удача"},
            {"path": "пассивность",  "prob": round(base_prob * 0.30, 3),
             "outcome": "Возможность упущена из-за бездействия"},
            {"path": "усиление",     "prob": round(base_prob * 0.15, 3),
             "outcome": "Максимальная реализация через намерение"},
        ]
    else:
        branches = [
            {"path": "нейтральный поток", "prob": round(base_prob * 0.50, 3),
             "outcome": "Равномерное развитие событий"},
            {"path": "активация",  "prob": round(base_prob * 0.30, 3),
             "outcome": "Событие требует осознанного действия"},
            {"path": "упущение",   "prob": round(base_prob * 0.20, 3),
             "outcome": "Момент пройдёт незамеченным без внимания"},
        ]

    return {
        "transiting_planet":  tp,
        "natal_planet":       np,
        "transiting_planet_ru": _PLANET_RU.get(tp, tp),
        "natal_planet_ru":    _PLANET_RU.get(np, np),
        "aspect":             aspect,
        "orb":                round(orb, 3),
        "base_probability":   base_prob,
        "polarity":           polarity,
        "spheres":            spheres,
        "probability_branches": branches,
        "total_probability":  round(sum(b["prob"] for b in branches), 3),
    }


# ── Main Probability Model ────────────────────────────────────────────────────

def probability_tree(
    natal_chart: dict,
    transit_aspects: list,
    target_date: str = "",
    context: str = "",
) -> dict:
    """
    Generate Seth-style probability tree for all active transits.

    Returns:
        - assembly_point: Tonal/Nagual balance index
        - branches: sorted list of probability branches
        - dominant_spheres: most activated life areas
        - top_probability: highest-weight branch
        - summary: Russian-language interpretation
        - recommendations: 3-5 concrete actions for optimal probability activation
    """
    # Generate branches for all transit aspects
    branches = []
    for asp in transit_aspects:
        branch = _generate_branch(asp, natal_chart)
        if branch and branch["base_probability"] > 0.05:
            branches.append(branch)

    # Sort by base probability descending
    branches.sort(key=lambda b: b["base_probability"], reverse=True)

    # Dominant spheres (frequency count)
    sphere_counts: dict = {}
    for b in branches:
        for s in b.get("spheres", []):
            sphere_counts[s] = sphere_counts.get(s, 0) + b["base_probability"]
    dominant_spheres = sorted(sphere_counts, key=sphere_counts.get, reverse=True)[:5]  # type: ignore

    # Assembly Point Index
    api = assembly_point_index(natal_chart, transit_aspects)

    # Top branch
    top_branch = branches[0] if branches else None

    # Summary
    if not branches:
        summary = "Активных транзитных аспектов не обнаружено. Период относительного покоя."
    else:
        n_tense = sum(1 for b in branches if b["polarity"] == "напряжённый")
        n_harm  = sum(1 for b in branches if b["polarity"] == "гармоничный")
        total_prob = sum(b["base_probability"] for b in branches)
        spheres_str = ", ".join(dominant_spheres[:3])
        summary = (
            f"Активировано {len(branches)} транзитных ветвей (вероятность: {total_prob:.2f}). "
            f"Доминирующие сферы: {spheres_str}. "
            f"Напряжённых аспектов: {n_tense}, гармоничных: {n_harm}. "
            f"Индекс точки сборки: {api['zone']} ({api['index']:+.2f})."
        )

    # Recommendations based on Seth framework
    recs = []
    if api["index"] < -0.2:
        recs.append("🏗 Укрепите фундамент: структурируйте рутину, дисциплина = точка силы")
    elif api["index"] > 0.2:
        recs.append("🌊 Практикуйте намерение: медитация, дневник снов, сталкинг по Кастанеде")
    else:
        recs.append("⚡ Точка силы Сета активна: это момент максимального влияния на вероятности")

    for b in branches[:3]:
        if b["polarity"] == "напряжённый":
            recs.append(f"⚠ {b['transiting_planet_ru']} → {b['natal_planet_ru']}: используйте ветвь «трансформация» вместо «сопротивления»")
        elif b["polarity"] == "гармоничный":
            recs.append(f"✓ {b['transiting_planet_ru']} → {b['natal_planet_ru']}: активируйте ветвь «усиление» через осознанное намерение")

    return {
        "target_date":       target_date,
        "assembly_point":    api,
        "branches":          branches[:20],
        "dominant_spheres":  dominant_spheres,
        "top_probability":   top_branch,
        "total_branches":    len(branches),
        "summary":           summary,
        "recommendations":   recs[:5],
        "framework":         "Seth/Monroe/Castaneda probability model v1.0",
    }
