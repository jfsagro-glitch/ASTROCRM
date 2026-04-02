#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HOLO Natal — Synastry & Composite Charts
==========================================
Cross-chart aspects (synastry), composite chart (midpoint method),
Davison relationship chart (time+location midpoint), and compatibility scoring.

Usage:
  python astro_synastry.py aspects
      --date1 1990-03-15 --time1 14:30 --lat1 55.75 --lon1 37.61 --utc1 3
      --date2 1985-07-22 --time2 09:15 --lat2 48.85 --lon2 2.35 --utc2 1

  python astro_synastry.py composite
      --date1 1990-03-15 --time1 14:30 --lat1 55.75 --lon1 37.61 --utc1 3
      --date2 1985-07-22 --time2 09:15 --lat2 48.85 --lon2 2.35 --utc2 1
      --houses placidus

  python astro_synastry.py davison
      --date1 1990-03-15 --time1 14:30 --lat1 55.75 --lon1 37.61 --utc1 3
      --date2 1985-07-22 --time2 09:15 --lat2 48.85 --lon2 2.35 --utc2 1

  python astro_synastry.py score
      --date1 1990-03-15 --time1 14:30 --lat1 55.75 --lon1 37.61 --utc1 3
      --date2 1985-07-22 --time2 09:15 --lat2 48.85 --lon2 2.35 --utc2 1
"""

import sys
import argparse
import json
import math

from astro_engine import (
    jd, n360, rad, deg,
    calc_planets, calc_houses, calc_chart,
    PLANET_ORDER, ASPECT_DEFS,
    sign_name, sign_glyph, deg_in_sign,
    parse_date_arg, parse_time_arg,
    _angle_diff,
)


# ══════════════════════════════════════════════════════════════════════════════
# SYNASTRY ASPECT ORBS (slightly tighter than natal)
# ══════════════════════════════════════════════════════════════════════════════

SYNASTRY_ORBS = {
    "conjunction":    7.0,
    "opposition":     7.0,
    "trine":          6.0,
    "square":         6.0,
    "sextile":        5.0,
    "semi_sextile":   2.0,
    "semi_square":    2.0,
    "quintile":       2.0,
    "sesquiquadrate": 2.0,
    "biquintile":     2.0,
    "quincunx":       3.0,
}


# ══════════════════════════════════════════════════════════════════════════════
# SYNASTRY ASPECTS
# ══════════════════════════════════════════════════════════════════════════════

def synastry_aspects(chart1, chart2, orbs=None):
    """
    Compute cross-chart aspects between two natal charts.
    chart1, chart2: dicts returned by calc_chart() (or {name: lon_float} dicts).
    orbs: optional dict to override SYNASTRY_ORBS.
    Returns list of aspect dicts with keys:
      p1, chart, p2, chart2, aspect, glyph, angle, orb, exact_diff, applying.
    """
    # Accept either full chart dicts or raw planet lon dicts
    if "planets" in chart1:
        planets1 = {p: d["lon"] for p, d in chart1["planets"].items()}
    else:
        planets1 = chart1

    if "planets" in chart2:
        planets2 = {p: d["lon"] for p, d in chart2["planets"].items()}
    else:
        planets2 = chart2

    asp_orbs = dict(SYNASTRY_ORBS)
    if orbs:
        asp_orbs.update(orbs)

    results = []
    for p1, lon1 in planets1.items():
        for p2, lon2 in planets2.items():
            diff = _angle_diff(lon1, lon2)
            best, best_dev = None, float("inf")
            for asp_name, (asp_angle, default_orb, glyph) in ASPECT_DEFS.items():
                orb_val = asp_orbs.get(asp_name, default_orb)
                deviation = abs(diff - asp_angle)
                if deviation <= orb_val and deviation < best_dev:
                    best_dev = deviation
                    best = (asp_name, asp_angle, deviation, diff - asp_angle, glyph)
            if best:
                asp_name, asp_angle, deviation, exact, glyph = best
                results.append({
                    "p1":         p1,
                    "chart":      1,
                    "p2":         p2,
                    "chart2":     2,
                    "aspect":     asp_name,
                    "glyph":      glyph,
                    "angle":      asp_angle,
                    "orb":        round(deviation, 2),
                    "exact_diff": round(exact, 2),
                    "applying":   exact < 0,
                    "lon1":       round(lon1, 4),
                    "lon2":       round(lon2, 4),
                })

    results.sort(key=lambda x: x["orb"])
    return results


# ══════════════════════════════════════════════════════════════════════════════
# COMPOSITE CHART (midpoint method)
# ══════════════════════════════════════════════════════════════════════════════

def _midpoint_lon(lon1, lon2):
    """Midpoint of two ecliptic longitudes via shortest arc."""
    diff = (lon2 - lon1) % 360
    if diff > 180:
        # Take the other half-circle midpoint
        mp = n360(lon1 + (diff - 360) / 2)
    else:
        mp = n360(lon1 + diff / 2)
    return mp

def _midpoint_lat(lat1, lat2):
    """Simple arithmetic midpoint of latitudes."""
    return (lat1 + lat2) / 2.0

def _midpoint_lon_geo(lon1, lon2):
    """
    Geographic longitude midpoint via shorter arc.
    Handles wrapping correctly (e.g., 170E and 170W → 180E/W, not 0).
    lon1, lon2 in degrees, range [-180, 180] or [0, 360].
    """
    # Normalize to [-180, 180]
    def norm(x):
        x = x % 360
        return x - 360 if x > 180 else x

    a = norm(lon1)
    b = norm(lon2)
    diff = b - a
    if diff > 180:
        diff -= 360
    elif diff < -180:
        diff += 360
    mid = a + diff / 2.0
    # Normalize back
    if mid > 180:
        mid -= 360
    elif mid < -180:
        mid += 360
    return mid


def composite_chart(jd1, lat1, lon1, utc1,
                    jd2, lat2, lon2, utc2,
                    houses_system='placidus'):
    """
    Composite chart using the midpoint method.
    Each planet is placed at the midpoint (shorter arc) of the two natal positions.
    The chart is cast for the geographic midpoint location.
    Returns a chart dict with the same structure as calc_chart().
    """
    planets1 = calc_planets(jd1)
    planets2 = calc_planets(jd2)

    # Composite planets: midpoint of each planet pair
    comp_planets_raw = {}
    for p in PLANET_ORDER:
        if p in planets1 and p in planets2:
            comp_planets_raw[p] = _midpoint_lon(planets1[p], planets2[p])

    # Geographic midpoint
    comp_lat = _midpoint_lat(lat1, lat2)
    comp_lon = _midpoint_lon_geo(lon1, lon2)

    # JD midpoint for houses (average of the two birth moments)
    comp_jd = (jd1 + jd2) / 2.0

    # Compute houses at midpoint location and time
    houses = calc_houses(comp_jd, comp_lat, comp_lon, houses_system)

    # Format planets
    from astro_engine import (sign_glyph, deg_in_sign, planet_in_house,
                               is_retrograde, calc_aspects, calc_patterns,
                               calc_dignities, lunar_phase, arabic_parts,
                               _mc_asc, calc_vertex, obliquity,
                               calc_declinations, calc_speeds,
                               calc_decan, calc_term_ruler, lunar_mansion)

    _, _, ramc, eps = _mc_asc(comp_jd, comp_lat, comp_lon)
    vtx_lon, avx_lon = calc_vertex(ramc, comp_lat, eps)
    decls = calc_declinations(comp_planets_raw, comp_jd)
    speeds = calc_speeds(comp_planets_raw, comp_jd)
    retro = {p: is_retrograde(p, comp_jd) for p in PLANET_ORDER if p in comp_planets_raw}
    p_in_house = {p: planet_in_house(lon, houses) for p, lon in comp_planets_raw.items()}

    planets_fmt = {}
    for p, lon in comp_planets_raw.items():
        s = sign_name(lon)
        d = deg_in_sign(lon)
        dn, dr = calc_decan(lon)
        tr = calc_term_ruler(lon)
        dec = decls.get(p, 0.0)
        sp, sp_st = speeds.get(p, (0.0, 'unknown'))
        pd = {
            "lon":          round(lon, 4),
            "sign":         s,
            "glyph":        sign_glyph(lon),
            "deg":          int(d),
            "min":          int((d % 1) * 60),
            "deg_min":      f"{int(d)}\u00b0{int((d % 1) * 60):02d}'",
            "retrograde":   retro.get(p, False),
            "house":        p_in_house[p],
            "dec":          round(dec, 4),
            "speed":        sp,
            "speed_status": sp_st,
            "decan":        dn,
            "decan_ruler":  dr,
            "term_ruler":   tr,
        }
        if p == 'moon':
            mn_num, mn_name, mn_nature = lunar_mansion(lon)
            pd["mansion_num"]    = mn_num
            pd["mansion_name"]   = mn_name
            pd["mansion_nature"] = mn_nature
        planets_fmt[p] = pd

    # Format houses
    houses_fmt = {}
    for h_key, lon in houses.items():
        s = sign_name(lon); d = deg_in_sign(lon)
        houses_fmt[h_key] = {
            "lon": round(lon, 4), "sign": s, "glyph": sign_glyph(lon),
            "deg": int(d), "min": int((d % 1) * 60),
            "deg_min": f"{int(d)}\u00b0{int((d % 1) * 60):02d}'",
        }
    for label, vlon in (("vtx", vtx_lon), ("avx", avx_lon)):
        s = sign_name(vlon); d = deg_in_sign(vlon)
        houses_fmt[label] = {
            "lon": round(vlon, 4), "sign": s, "glyph": sign_glyph(vlon),
            "deg": int(d), "min": int((d % 1) * 60),
            "deg_min": f"{int(d)}\u00b0{int((d % 1) * 60):02d}'",
        }

    # Aspects
    asp = calc_aspects(comp_planets_raw, decls_dict=decls)
    patterns = calc_patterns(comp_planets_raw, asp)
    dignities = calc_dignities(comp_planets_raw)
    lp = lunar_phase(comp_jd)
    ap = arabic_parts(comp_planets_raw, houses)

    # Metadata — inline Meeus JD→date conversion
    def jd_to_str(jd_val):
        Z = math.floor(jd_val + 0.5)
        F = jd_val + 0.5 - Z
        if Z < 2299161: A = Z
        else:
            alpha = math.floor((Z - 1867216.25) / 36524.25)
            A = Z + 1 + alpha - math.floor(alpha / 4)
        B = A + 1524; C = math.floor((B - 122.1) / 365.25)
        D = math.floor(365.25 * C); E = math.floor((B - D) / 30.6001)
        day   = B - D - math.floor(30.6001 * E) + F
        month = E - 1 if E < 14 else E - 13
        year  = C - 4716 if month > 2 else C - 4715
        return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"

    comp_date = jd_to_str(comp_jd)
    frac = (comp_jd + 0.5) % 1.0
    h_ut  = int(frac * 24)
    mi_ut = int((frac * 24 - h_ut) * 60)
    sc_ut = int(((frac * 24 - h_ut) * 60 - mi_ut) * 60)

    return {
        "type": "composite",
        "metadata": {
            "date":         comp_date,
            "time":         f"{h_ut:02d}:{mi_ut:02d}:{sc_ut:02d}",
            "lat":          round(comp_lat, 4),
            "lon":          round(comp_lon, 4),
            "utc":          0.0,
            "jd":           round(comp_jd, 4),
            "houses_system": houses_system,
            "method":       "midpoint",
        },
        "planets":      planets_fmt,
        "houses":       houses_fmt,
        "aspects":      asp,
        "patterns":     patterns,
        "dignities":    dignities,
        "lunar_phase":  lp,
        "arabic_parts": ap,
    }


# ══════════════════════════════════════════════════════════════════════════════
# DAVISON RELATIONSHIP CHART
# ══════════════════════════════════════════════════════════════════════════════

def davison_chart(jd1, lat1, lon1, utc1,
                  jd2, lat2, lon2, utc2,
                  houses_system='placidus'):
    """
    Davison Relationship Chart: the midpoint in time and space.
    - Time midpoint: average of the two Julian Days
    - Location midpoint: geographic midpoint
    Returns a full chart dict at the midpoint time and location.
    """
    mid_jd  = (jd1 + jd2) / 2.0
    mid_lat = _midpoint_lat(lat1, lat2)
    mid_lon = _midpoint_lon_geo(lon1, lon2)

    # Build the chart at the midpoint JD/location
    def jd_to_ymd_hms(jd_val):
        Z = math.floor(jd_val + 0.5)
        F = jd_val + 0.5 - Z
        if Z < 2299161: A = Z
        else:
            alpha = math.floor((Z - 1867216.25) / 36524.25)
            A = Z + 1 + alpha - math.floor(alpha / 4)
        B = A + 1524; C = math.floor((B - 122.1) / 365.25)
        D = math.floor(365.25 * C); E = math.floor((B - D) / 30.6001)
        day_full = B - D - math.floor(30.6001 * E) + F
        month    = E - 1 if E < 14 else E - 13
        year     = C - 4716 if month > 2 else C - 4715
        day_int  = int(day_full)
        frac     = day_full - day_int
        h_ut     = int(frac * 24)
        mi_ut    = int((frac * 24 - h_ut) * 60)
        sc_ut    = int(((frac * 24 - h_ut) * 60 - mi_ut) * 60)
        return int(year), int(month), day_int, h_ut, mi_ut, sc_ut

    yr, mo, dy, h_ut, mi_ut, sc_ut = jd_to_ymd_hms(mid_jd)

    chart = calc_chart(yr, mo, dy, h_ut, mi_ut, sc_ut,
                       mid_lat, mid_lon, 0.0,
                       houses_system=houses_system)
    chart["type"] = "davison"
    chart["metadata"]["method"] = "davison_midpoint"
    chart["metadata"]["mid_lat"] = round(mid_lat, 4)
    chart["metadata"]["mid_lon"] = round(mid_lon, 4)
    return chart


# ══════════════════════════════════════════════════════════════════════════════
# SYNASTRY SCORE
# ══════════════════════════════════════════════════════════════════════════════

# Scoring weights by category
_HARMONY_ASPECTS   = {"trine", "sextile"}
_CHALLENGE_ASPECTS = {"square", "opposition"}
_MINOR_EASY        = {"semi_sextile", "quintile", "biquintile"}
_MINOR_HARD        = {"semi_square", "sesquiquadrate", "quincunx"}

_HARMONY_PLANETS   = {"venus", "moon", "jupiter", "sun"}
_CHALLENGE_PLANETS = {"mars", "saturn", "pluto", "uranus"}

def synastry_score(aspects_list, chart1_planets=None, chart2_planets=None):
    """
    Score a synastry aspects list into compatibility categories.

    Returns dict:
      total_score, harmony, challenge, attraction, communication,
      category_breakdown, aspect_scores (list).
    """
    harmony       = 0.0
    challenge     = 0.0
    attraction    = 0.0
    communication = 0.0
    aspect_scores = []

    for asp in aspects_list:
        p1  = asp.get("p1", "")
        p2  = asp.get("p2", "")
        asp_name = asp.get("aspect", "")
        orb = asp.get("orb", 5.0)
        # Orb-based weight: closer = stronger (max at orb=0, ~0 at orb limit)
        orb_weight = max(0.0, 1.0 - orb / 8.0)

        score = 0.0
        tags  = []

        # ── Harmony: easy aspects to benefic planets ────────────────────────
        if asp_name in _HARMONY_ASPECTS:
            if p1 in _HARMONY_PLANETS or p2 in _HARMONY_PLANETS:
                score += 3.0 * orb_weight
                harmony += 3.0 * orb_weight
                tags.append("harmony")
            else:
                score += 1.5 * orb_weight
                harmony += 1.5 * orb_weight
                tags.append("harmony-minor")

        # ── Challenge: hard aspects involving malefic planets ───────────────
        elif asp_name in _CHALLENGE_ASPECTS:
            if p1 in _CHALLENGE_PLANETS or p2 in _CHALLENGE_PLANETS:
                score -= 2.5 * orb_weight
                challenge -= 2.5 * orb_weight
                tags.append("challenge")
            else:
                score -= 1.0 * orb_weight
                challenge -= 1.0 * orb_weight
                tags.append("tension")

        # ── Minor easy aspects ───────────────────────────────────────────────
        elif asp_name in _MINOR_EASY:
            score += 0.5 * orb_weight
            harmony += 0.5 * orb_weight
            tags.append("minor-harmony")

        # ── Minor hard aspects ───────────────────────────────────────────────
        elif asp_name in _MINOR_HARD:
            score -= 0.5 * orb_weight
            challenge -= 0.5 * orb_weight
            tags.append("minor-tension")

        # ── Conjunction: depends on planets ─────────────────────────────────
        elif asp_name == "conjunction":
            if p1 in _HARMONY_PLANETS or p2 in _HARMONY_PLANETS:
                score += 2.0 * orb_weight
                harmony += 2.0 * orb_weight
                tags.append("harmony-conj")
            elif p1 in _CHALLENGE_PLANETS or p2 in _CHALLENGE_PLANETS:
                score -= 1.0 * orb_weight
                challenge -= 1.0 * orb_weight
                tags.append("challenge-conj")
            else:
                score += 0.5 * orb_weight
                tags.append("neutral-conj")

        # ── Attraction: Venus-Mars, Sun-Moon aspects ─────────────────────────
        pair = {p1, p2}
        if pair == {"venus", "mars"} or pair == {"sun", "moon"}:
            attract_pts = 4.0 * orb_weight if asp_name in _HARMONY_ASPECTS else \
                          3.0 * orb_weight if asp_name == "conjunction" else \
                          2.0 * orb_weight
            attraction += attract_pts
            score += attract_pts * 0.5
            tags.append("attraction")

        # ── Communication: Mercury with Mercury/Sun/Moon ─────────────────────
        if "mercury" in pair and (pair <= {"mercury", "sun"} or pair <= {"mercury", "moon"} or pair == {"mercury", "mercury"}):
            if asp_name in _HARMONY_ASPECTS | {"conjunction"}:
                comm_pts = 2.0 * orb_weight
                communication += comm_pts
                score += comm_pts * 0.3
                tags.append("communication")

        if tags:
            aspect_scores.append({
                "p1":       p1,
                "p2":       p2,
                "aspect":   asp_name,
                "orb":      round(orb, 2),
                "score":    round(score, 2),
                "tags":     tags,
            })

    total = harmony + challenge + attraction * 0.5 + communication * 0.3

    return {
        "total_score":    round(total, 2),
        "harmony":        round(harmony, 2),
        "challenge":      round(challenge, 2),
        "attraction":     round(attraction, 2),
        "communication":  round(communication, 2),
        "category_breakdown": {
            "harmony_pct":       _pct(harmony, total),
            "challenge_pct":     _pct(abs(challenge), abs(total)) if total != 0 else 0,
            "attraction_score":  round(attraction, 2),
            "communication_score": round(communication, 2),
        },
        "aspect_scores":  aspect_scores,
    }


def _pct(part, total):
    if total == 0:
        return 0.0
    return round(100.0 * part / total, 1)


# ══════════════════════════════════════════════════════════════════════════════
# TEXT FORMATTING
# ══════════════════════════════════════════════════════════════════════════════

def format_synastry_aspects_text(aspects_list, label1="Person 1", label2="Person 2"):
    """Pretty-print synastry aspects."""
    lines = [
        "\u2550" * 70,
        f" SYNASTRY ASPECTS  {label1}  \u2194  {label2}",
        "\u2550" * 70,
        f" {'P1':<12} {'Asp':<4} {'P2':<12} {'Aspect':<18} {'Orb':>6}",
        "\u2500" * 70,
    ]
    major = {"conjunction", "sextile", "square", "trine", "opposition"}
    major_asps = [a for a in aspects_list if a["aspect"] in major]
    minor_asps = [a for a in aspects_list if a["aspect"] not in major]

    for a in major_asps:
        lines.append(f" {a['p1']:<12} {a['glyph']:<4} {a['p2']:<12} "
                     f"{a['aspect']:<18} {a['orb']:>5.2f}\u00b0")
    if minor_asps:
        lines.append(" \u2014 minor \u2014")
        for a in minor_asps:
            lines.append(f" {a['p1']:<12} {a['glyph']:<4} {a['p2']:<12} "
                         f"{a['aspect']:<18} {a['orb']:>5.2f}\u00b0")
    lines.append("\u2550" * 70)
    return "\n".join(lines)


def format_composite_text(chart, title="COMPOSITE CHART"):
    """Pretty-print a composite/Davison chart."""
    from astro_engine import format_chart_text
    chart_type = chart.get("type", "composite").upper()
    method = chart.get("metadata", {}).get("method", "")
    lines = [
        "\u2550" * 60,
        f" {chart_type}  ({method})",
        f" Location: {chart['metadata']['lat']:+.4f}\u00b0, {chart['metadata']['lon']:+.4f}\u00b0",
        "\u2550" * 60,
    ]
    # Reuse astro_engine formatter for the body; skip its first 3 header lines
    body = format_chart_text(chart)
    body_lines = body.split("\n")
    # Skip the first 3 lines (═══, header, location) and the trailing ═══
    # Keep from "PLANETS" section onwards
    skip = 0
    for i, line in enumerate(body_lines):
        if line.strip().startswith("\u2550"):
            skip = i + 1
            if skip >= 3:
                break
    lines.extend(body_lines[skip:])
    return "\n".join(lines)


def format_score_text(score_data, label1="Person 1", label2="Person 2"):
    """Pretty-print synastry compatibility score."""
    lines = [
        "\u2550" * 60,
        f" SYNASTRY COMPATIBILITY SCORE",
        f" {label1}  \u2194  {label2}",
        "\u2550" * 60,
        f" Total score:        {score_data['total_score']:>+7.2f}",
        f" Harmony:            {score_data['harmony']:>+7.2f}",
        f" Challenge:          {score_data['challenge']:>+7.2f}",
        f" Attraction:         {score_data['attraction']:>+7.2f}",
        f" Communication:      {score_data['communication']:>+7.2f}",
        "\u2500" * 60,
    ]
    for asp_sc in score_data["aspect_scores"]:
        tag_str = ", ".join(asp_sc["tags"])
        lines.append(f" {asp_sc['p1']:<10} {asp_sc['aspect']:<18} {asp_sc['p2']:<10} "
                     f"sc={asp_sc['score']:+.2f}  [{tag_str}]")
    lines.append("\u2550" * 60)
    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════════════════════
# CLI HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _add_two_person_args(p):
    """Add --date1/time1/lat1/lon1/utc1 and --date2/time2/lat2/lon2/utc2."""
    p.add_argument("--date1", required=True)
    p.add_argument("--time1", required=True)
    p.add_argument("--lat1",  required=True, type=float)
    p.add_argument("--lon1",  required=True, type=float)
    p.add_argument("--utc1",  required=True, type=float)
    p.add_argument("--date2", required=True)
    p.add_argument("--time2", required=True)
    p.add_argument("--lat2",  required=True, type=float)
    p.add_argument("--lon2",  required=True, type=float)
    p.add_argument("--utc2",  required=True, type=float)
    p.add_argument("--julian1", action="store_true")
    p.add_argument("--julian2", action="store_true")
    p.add_argument("--name1",  default="Person 1")
    p.add_argument("--name2",  default="Person 2")
    p.add_argument("--json",   action="store_true")


def _parse_person(args, n):
    """Parse date/time/utc for person n (1 or 2) and return natal_jd_utc."""
    date = getattr(args, f"date{n}")
    time = getattr(args, f"time{n}")
    utc  = getattr(args, f"utc{n}")
    jul  = getattr(args, f"julian{n}", False)
    yr, mo, dy = parse_date_arg(date)
    h,  mi, sc = parse_time_arg(time)
    return jd(yr, mo, dy, h - utc, mi, sc, julian=jul)


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(
        description="HOLO Natal \u2014 Synastry & Composite Charts",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    # aspects
    p_asp = sub.add_parser("aspects", help="Synastry cross-chart aspects")
    _add_two_person_args(p_asp)

    # composite
    p_comp = sub.add_parser("composite", help="Composite chart (midpoint method)")
    _add_two_person_args(p_comp)
    p_comp.add_argument("--houses", default="placidus")

    # davison
    p_dav = sub.add_parser("davison", help="Davison relationship chart")
    _add_two_person_args(p_dav)
    p_dav.add_argument("--houses", default="placidus")

    # score
    p_sc = sub.add_parser("score", help="Synastry compatibility score")
    _add_two_person_args(p_sc)

    args = parser.parse_args()

    jd1 = _parse_person(args, 1)
    jd2 = _parse_person(args, 2)

    if args.cmd == "aspects":
        planets1 = calc_planets(jd1)
        planets2 = calc_planets(jd2)
        aspects = synastry_aspects(planets1, planets2)
        if args.json:
            print(json.dumps(aspects, ensure_ascii=False, indent=2))
        else:
            print(format_synastry_aspects_text(aspects, args.name1, args.name2))

    elif args.cmd == "composite":
        chart = composite_chart(
            jd1, args.lat1, args.lon1, args.utc1,
            jd2, args.lat2, args.lon2, args.utc2,
            houses_system=args.houses,
        )
        if args.json:
            print(json.dumps(chart, ensure_ascii=False, indent=2))
        else:
            print(format_composite_text(chart, "COMPOSITE CHART"))

    elif args.cmd == "davison":
        chart = davison_chart(
            jd1, args.lat1, args.lon1, args.utc1,
            jd2, args.lat2, args.lon2, args.utc2,
            houses_system=getattr(args, "houses", "placidus"),
        )
        if args.json:
            print(json.dumps(chart, ensure_ascii=False, indent=2))
        else:
            print(format_composite_text(chart, "DAVISON RELATIONSHIP CHART"))

    elif args.cmd == "score":
        planets1 = calc_planets(jd1)
        planets2 = calc_planets(jd2)
        aspects = synastry_aspects(planets1, planets2)
        score_data = synastry_score(aspects, planets1, planets2)
        if args.json:
            print(json.dumps(score_data, ensure_ascii=False, indent=2))
        else:
            print(format_score_text(score_data, args.name1, args.name2))


if __name__ == "__main__":
    main()
