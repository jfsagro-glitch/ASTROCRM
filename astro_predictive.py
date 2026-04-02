#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HOLO Natal — Predictive Techniques
====================================
Secondary progressions, solar arc directions, solar returns,
lunar returns, annual profections, and transits.

Usage:
  python astro_predictive.py progressions  --natal-date 1990-03-15 --natal-time 14:30 --natal-lat 55.75 --natal-lon 37.61 --utc 3 --target-date 2025-06-01
  python astro_predictive.py solar-arc     --natal-date 1990-03-15 --natal-time 14:30 --natal-lat 55.75 --natal-lon 37.61 --utc 3 --target-date 2025-06-01
  python astro_predictive.py solar-return  --natal-date 1990-03-15 --natal-time 14:30 --natal-lat 55.75 --natal-lon 37.61 --utc 3 --year 2025
  python astro_predictive.py lunar-return  --natal-date 1990-03-15 --natal-time 14:30 --natal-lat 55.75 --natal-lon 37.61 --utc 3 --target-date 2025-06-01
  python astro_predictive.py transits      --natal-date 1990-03-15 --natal-time 14:30 --natal-lat 55.75 --natal-lon 37.61 --utc 3 --target-date 2025-06-01
  python astro_predictive.py profections   --natal-date 1990-03-15 --natal-time 14:30 --natal-lat 55.75 --natal-lon 37.61 --utc 3 --target-date 2025-06-01
"""

import sys, argparse, json, math

from astro_engine import (
    jd, n360, rad, deg, T, sun, moon, node,
    true_node,
    calc_planets, calc_houses, calc_aspects, calc_chart,
    PLANET_ORDER, SIGN_NAMES, sign_name, sign_glyph, deg_in_sign,
    parse_date_arg, parse_time_arg, ASPECT_DEFS, _angle_diff,
)

# Swiss Ephemeris bridge for high-accuracy ephemerides
try:
    import astro_se as _se
    _SE_OK = _se.is_available()
except Exception:
    _se = None   # type: ignore
    _SE_OK = False


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _years_elapsed(natal_jd, target_date_str):
    """Fractional years from natal JD to target date string YYYY-MM-DD."""
    yr, mo, dy = parse_date_arg(target_date_str)
    target_jd = jd(yr, mo, dy)
    return (target_jd - natal_jd) / 365.25

def _days_elapsed(natal_jd, target_date_str):
    yr, mo, dy = parse_date_arg(target_date_str)
    return jd(yr, mo, dy) - natal_jd

def _format_lon(lon):
    s = sign_name(lon); d = deg_in_sign(lon)
    return f"{sign_glyph(lon)}{s} {int(d)}°{int((d%1)*60):02d}'"

def _aspect_diff(lon1, lon2):
    d = abs(lon1 - lon2) % 360
    return 360 - d if d > 180 else d


# ══════════════════════════════════════════════════════════════════════════════
# SECONDARY PROGRESSIONS (SP)
# ══════════════════════════════════════════════════════════════════════════════
# 1 day after birth = 1 year of life  →  prog_JD = natal_JD + years_elapsed

def secondary_progressions(natal_jd_utc, lat, lon, target_date_str,
                            houses_system="placidus"):
    """
    Compute secondary progressed chart.
    Returns: { prog_planets, prog_houses, natal_planets,
               prog_to_natal_aspects, prog_to_natal_conjunctions }
    """
    years = _years_elapsed(natal_jd_utc, target_date_str)
    prog_jd = natal_jd_utc + years          # 1 day/year

    natal_planets = calc_planets(natal_jd_utc)
    prog_planets  = calc_planets(prog_jd)
    prog_houses   = calc_houses(prog_jd, lat, lon, houses_system)

    # Aspects: progressed planets to natal planets
    asp_list = []
    for pp, plon in prog_planets.items():
        for np_, nlon in natal_planets.items():
            diff = _aspect_diff(plon, nlon)
            for asp_name, (asp_angle, asp_orb, glyph) in ASPECT_DEFS.items():
                orb_val = min(asp_orb, 2.0)   # tighter orbs for progressions
                deviation = abs(diff - asp_angle)
                if deviation <= orb_val:
                    asp_list.append({
                        "prog_planet": pp,   "natal_planet": np_,
                        "aspect": asp_name,  "glyph": glyph,
                        "orb": round(deviation, 3),
                        "prog_lon": round(plon, 4),
                        "natal_lon": round(nlon, 4),
                    })
                    break

    def fmt_planets(p_dict):
        out = {}
        for p, lon in p_dict.items():
            d = deg_in_sign(lon)
            out[p] = {"lon": round(lon,4), "sign": sign_name(lon),
                      "deg_min": f"{int(d)}°{int((d%1)*60):02d}'"}
        return out

    return {
        "type": "secondary_progressions",
        "target_date": target_date_str,
        "years_elapsed": round(years, 4),
        "prog_jd": round(prog_jd, 4),
        "prog_planets": fmt_planets(prog_planets),
        "prog_houses":  {hk: {"lon": round(v,4), "sign": sign_name(v)}
                         for hk,v in prog_houses.items()},
        "natal_planets": fmt_planets(natal_planets),
        "aspects_prog_to_natal": asp_list,
    }


# ══════════════════════════════════════════════════════════════════════════════
# SOLAR ARC DIRECTIONS
# ══════════════════════════════════════════════════════════════════════════════
# Solar arc = progressed Sun longitude − natal Sun longitude
# All planets advance by this same arc

def solar_arc(natal_jd_utc, lat, lon, target_date_str, houses_system="placidus"):
    """
    Compute solar arc directed chart.
    """
    years    = _years_elapsed(natal_jd_utc, target_date_str)
    prog_jd  = natal_jd_utc + years

    natal_sun_lon = sun(natal_jd_utc)[0]
    prog_sun_lon  = sun(prog_jd)[0]
    arc = n360(prog_sun_lon - natal_sun_lon)

    natal_planets = calc_planets(natal_jd_utc)
    directed = {p: n360(lon + arc) for p, lon in natal_planets.items()}

    # Directed houses (ASC + arc)
    natal_houses = calc_houses(natal_jd_utc, lat, lon, houses_system)
    dir_houses   = {hk: n360(v + arc) for hk, v in natal_houses.items()}

    # Aspects: directed planets to natal planets
    asp_list = []
    for dp, dlon in directed.items():
        for np_, nlon in natal_planets.items():
            diff = _aspect_diff(dlon, nlon)
            for asp_name, (asp_angle, asp_orb, glyph) in ASPECT_DEFS.items():
                orb_val = min(asp_orb, 2.0)
                deviation = abs(diff - asp_angle)
                if deviation <= orb_val:
                    asp_list.append({
                        "directed_planet": dp, "natal_planet": np_,
                        "aspect": asp_name, "glyph": glyph,
                        "orb": round(deviation, 3),
                        "directed_lon": round(dlon, 4),
                        "natal_lon": round(nlon, 4),
                    })
                    break

    def fmt(p_dict):
        return {p: {"lon": round(v,4), "sign": sign_name(v),
                    "deg_min": f"{int(deg_in_sign(v))}°{int((deg_in_sign(v)%1)*60):02d}'"}
                for p,v in p_dict.items()}

    return {
        "type": "solar_arc",
        "target_date": target_date_str,
        "solar_arc_deg": round(arc, 4),
        "directed_planets": fmt(directed),
        "directed_houses":  {hk: {"lon": round(v,4), "sign": sign_name(v)}
                             for hk,v in dir_houses.items()},
        "natal_planets": fmt(natal_planets),
        "aspects_directed_to_natal": asp_list,
    }


# ══════════════════════════════════════════════════════════════════════════════
# SOLAR RETURN
# ══════════════════════════════════════════════════════════════════════════════

def solar_return(natal_jd_utc, return_year, lat, lon,
                 houses_system="placidus"):
    """
    Find the exact moment when the Sun returns to its natal degree in return_year.
    Uses binary search on JD.
    """
    natal_sun_lon = sun(natal_jd_utc)[0]

    # Approximate start: March 20 of return_year (near vernal equinox)
    # Better: use natal birth date in return_year as seed
    # Get approximate month of natal date from natal_jd_utc
    import datetime
    # Convert JD to approximate calendar date for seeding
    # JD 2451545.0 = J2000.0 = 2000-01-01 12:00 UTC
    approx_days = natal_jd_utc - 2451545.0
    # Seed = J2000 + (return_year - 2000) * 365.25 + same day-of-year
    day_of_year = (natal_jd_utc % 365.25)
    seed_jd = jd(return_year, 1, 1) + (natal_jd_utc - jd(
        return_year - int((jd(return_year,1,1) - natal_jd_utc) / 365.25 + 0.5), 1, 1))

    # Binary search: find JD in [seed-10, seed+10] where sun_lon = natal_sun_lon
    # Search window: ±200 days around estimated date
    yr_start = jd(return_year, 1, 1)
    lo = yr_start - 10
    hi = yr_start + 375

    def sun_diff(test_jd):
        """Signed difference (test - natal), handling wraparound near 0°/360°."""
        s = n360(sun(test_jd)[0] - natal_sun_lon)
        return s - 360 if s > 180 else s

    # Find bracket where sun crosses natal_sun_lon
    step = 5.0
    t0 = lo
    found_lo = None
    while t0 < hi:
        t1 = t0 + step
        d0 = sun_diff(t0); d1 = sun_diff(t1)
        if d0 * d1 < 0:
            found_lo = t0; break
        t0 = t1

    if found_lo is None:
        return {"error": f"Solar return not found in {return_year}"}

    # Bisection refinement
    blo, bhi = found_lo, found_lo + step
    for _ in range(60):
        mid = (blo + bhi) / 2
        dm  = sun_diff(mid)
        if abs(dm) < 1e-9: break
        if sun_diff(blo) * dm < 0: bhi = mid
        else: blo = mid
    sr_jd = (blo + bhi) / 2

    # Full chart at solar return moment
    sr_planets = calc_planets(sr_jd)
    sr_houses  = calc_houses(sr_jd, lat, lon, houses_system)
    sr_sun_lon = sun(sr_jd)[0]

    # JD to approximate date string
    # Meeus algorithm (integer)
    Z = math.floor(sr_jd + 0.5)
    F = sr_jd + 0.5 - Z
    if Z < 2299161:
        A = Z
    else:
        alpha = math.floor((Z - 1867216.25) / 36524.25)
        A = Z + 1 + alpha - math.floor(alpha / 4)
    B = A + 1524; C = math.floor((B - 122.1) / 365.25)
    D = math.floor(365.25 * C); E = math.floor((B - D) / 30.6001)
    day   = B - D - math.floor(30.6001 * E) + F
    month = E - 1 if E < 14 else E - 13
    year  = C - 4716 if month > 2 else C - 4715
    day_int = int(day); frac = day - day_int
    h_ = int(frac * 24); mi_ = int((frac * 24 - h_) * 60)
    date_str = f"{int(year):04d}-{int(month):02d}-{day_int:02d} {h_:02d}:{mi_:02d} UTC"

    def fmt(p_dict):
        return {p: {"lon": round(v,4), "sign": sign_name(v),
                    "deg_min": f"{int(deg_in_sign(v))}°{int((deg_in_sign(v)%1)*60):02d}'"}
                for p,v in p_dict.items()}

    return {
        "type": "solar_return",
        "return_year": return_year,
        "sr_date_utc": date_str,
        "sr_jd": round(sr_jd, 6),
        "sr_sun_lon": round(sr_sun_lon, 4),
        "natal_sun_lon": round(natal_sun_lon, 4),
        "planets": fmt(sr_planets),
        "houses":  {hk: {"lon": round(v,4), "sign": sign_name(v)}
                    for hk,v in sr_houses.items()},
    }


# ══════════════════════════════════════════════════════════════════════════════
# LUNAR RETURN
# ══════════════════════════════════════════════════════════════════════════════

def lunar_return(natal_jd_utc, near_date_str, lat, lon,
                 houses_system="placidus"):
    """
    Find the nearest lunar return (Moon back to natal degree) around near_date_str.
    """
    natal_moon_lon = moon(natal_jd_utc)
    yr, mo, dy = parse_date_arg(near_date_str)
    seed_jd = jd(yr, mo, dy)

    def moon_diff(test_jd):
        d = n360(moon(test_jd) - natal_moon_lon)
        return d - 360 if d > 180 else d

    # Search ±20 days around seed (lunar cycle ~27.3 days)
    lo = seed_jd - 14; hi = seed_jd + 14
    step = 1.0
    t0 = lo; found_lo = None
    while t0 < hi:
        t1 = t0 + step
        if moon_diff(t0) * moon_diff(t1) < 0:
            found_lo = t0; break
        t0 = t1

    if found_lo is None:
        # Try wider window
        lo = seed_jd - 28; hi = seed_jd + 28
        t0 = lo
        while t0 < hi:
            t1 = t0 + step
            if moon_diff(t0) * moon_diff(t1) < 0:
                found_lo = t0; break
            t0 = t1

    if found_lo is None:
        return {"error": "Lunar return not found near given date"}

    blo, bhi = found_lo, found_lo + step
    for _ in range(80):
        mid = (blo + bhi) / 2
        dm  = moon_diff(mid)
        if abs(dm) < 1e-9: break
        if moon_diff(blo) * dm < 0: bhi = mid
        else: blo = mid
    lr_jd = (blo + bhi) / 2

    lr_planets = calc_planets(lr_jd)
    lr_houses  = calc_houses(lr_jd, lat, lon, houses_system)

    def fmt(p_dict):
        return {p: {"lon": round(v,4), "sign": sign_name(v),
                    "deg_min": f"{int(deg_in_sign(v))}°{int((deg_in_sign(v)%1)*60):02d}'"}
                for p,v in p_dict.items()}

    return {
        "type": "lunar_return",
        "near_date": near_date_str,
        "lr_jd": round(lr_jd, 6),
        "natal_moon_lon": round(natal_moon_lon, 4),
        "lr_moon_lon": round(moon(lr_jd), 4),
        "planets": fmt(lr_planets),
        "houses":  {hk: {"lon": round(v,4), "sign": sign_name(v)}
                    for hk,v in lr_houses.items()},
    }


# ══════════════════════════════════════════════════════════════════════════════
# ANNUAL PROFECTIONS
# ══════════════════════════════════════════════════════════════════════════════

PLANET_OF_HOUR = {  # Traditional house lords (Chaldean order)
    1: "mars", 2: "venus", 3: "mercury", 4: "moon", 5: "sun",
    6: "venus", 7: "mercury", 8: "moon", 9: "sun", 10: "mars",
    11: "jupiter", 12: "saturn",
}

TRADITIONAL_LORD = {
    "aries": "mars", "taurus": "venus", "gemini": "mercury",
    "cancer": "moon", "leo": "sun", "virgo": "mercury",
    "libra": "venus", "scorpio": "mars", "sagittarius": "jupiter",
    "capricorn": "saturn", "aquarius": "saturn", "pisces": "jupiter",
}

def profections(natal_jd_utc, target_date_str, houses_system="placidus",
                lat=0, lon=0):
    """
    Annual and monthly profections.
    Annual profection: each year moves one house forward from H1.
    Monthly profection: each month moves one house forward from annual house.
    """
    natal_planets = calc_planets(natal_jd_utc)
    natal_houses  = calc_houses(natal_jd_utc, lat, lon, houses_system)
    asc_lon = natal_houses.get("h1", 0)

    # Years elapsed (whole years)
    yr_t, mo_t, dy_t = parse_date_arg(target_date_str)
    # Extract natal year/month/day from JD
    # Approximate natal date from JD
    Z = math.floor(natal_jd_utc + 0.5)
    if Z < 2299161: A = Z
    else:
        alpha = math.floor((Z - 1867216.25) / 36524.25)
        A = Z + 1 + alpha - math.floor(alpha / 4)
    B = A + 1524; C = math.floor((B - 122.1) / 365.25)
    D = math.floor(365.25 * C); E = math.floor((B - D) / 30.6001)
    mo_n = E - 1 if E < 14 else E - 13
    yr_n = C - 4716 if mo_n > 2 else C - 4715
    dy_n = int(B - D - math.floor(30.6001 * E))

    # Age at target date (approximate)
    if (mo_t, dy_t) >= (int(mo_n), int(dy_n)):
        age = yr_t - int(yr_n)
    else:
        age = yr_t - int(yr_n) - 1

    annual_house  = (age % 12) + 1
    annual_house_lon = natal_houses[f"h{annual_house}"]
    annual_sign  = sign_name(annual_house_lon)
    annual_lord  = TRADITIONAL_LORD.get(annual_sign, "sun")

    # Monthly profection from the annual house
    months_into_year = mo_t - int(mo_n) if mo_t >= int(mo_n) else 12 + mo_t - int(mo_n)
    monthly_house_offset = (annual_house - 1 + months_into_year) % 12
    monthly_house = monthly_house_offset + 1
    monthly_house_lon = natal_houses[f"h{monthly_house}"]
    monthly_sign = sign_name(monthly_house_lon)
    monthly_lord = TRADITIONAL_LORD.get(monthly_sign, "sun")

    # Position of annual lord in natal chart
    annual_lord_lon = natal_planets.get(annual_lord)

    return {
        "type": "profections",
        "natal_year": int(yr_n), "natal_month": int(mo_n), "natal_day": int(dy_n),
        "target_date": target_date_str,
        "age": age,
        "annual_house": annual_house,
        "annual_house_lon": round(annual_house_lon, 4),
        "annual_sign": annual_sign,
        "annual_lord": annual_lord,
        "annual_lord_natal_lon": round(annual_lord_lon, 4) if annual_lord_lon else None,
        "annual_lord_sign": sign_name(annual_lord_lon) if annual_lord_lon else None,
        "monthly_house": monthly_house,
        "monthly_house_lon": round(monthly_house_lon, 4),
        "monthly_sign": monthly_sign,
        "monthly_lord": monthly_lord,
        "months_into_year": months_into_year,
    }


# ══════════════════════════════════════════════════════════════════════════════
# TRANSITS
# ══════════════════════════════════════════════════════════════════════════════

def transits(natal_jd_utc, target_date_str, target_time_str="12:00", lat=0, lon=0,
             transit_orb_major=1.0, transit_orb_minor=0.5):
    """
    Compute transiting planets on target_date and their aspects to natal chart.
    """
    natal_planets = calc_planets(natal_jd_utc)
    transit_jd   = _parse_target_datetime(target_date_str, target_time_str)
    transit_planets = calc_planets(transit_jd)

    # Transits to natal planets
    asp_list = []
    major = {"conjunction","sextile","square","trine","opposition"}
    for tp, tlon in transit_planets.items():
        for np_, nlon in natal_planets.items():
            diff = _aspect_diff(tlon, nlon)
            for asp_name, (asp_angle, asp_orb, glyph) in ASPECT_DEFS.items():
                orb_val = transit_orb_major if asp_name in major else transit_orb_minor
                deviation = abs(diff - asp_angle)
                if deviation <= orb_val:
                    # Check applying/separating (compare JD+1)
                    tlon_next = calc_planets(transit_jd + 1)[tp]
                    diff_next = _aspect_diff(tlon_next, nlon)
                    dev_next  = abs(diff_next - asp_angle)
                    applying  = dev_next < deviation  # getting closer
                    asp_list.append({
                        "transit_planet": tp,
                        "natal_planet":   np_,
                        "aspect": asp_name,
                        "glyph": glyph,
                        "orb": round(deviation, 3),
                        "applying": applying,
                        "transit_lon": round(tlon, 4),
                        "transit_sign": sign_name(tlon),
                        "natal_lon": round(nlon, 4),
                        "natal_sign": sign_name(nlon),
                    })
                    break

    def fmt(p_dict):
        return {p: {"lon": round(v,4), "sign": sign_name(v),
                    "deg_min": f"{int(deg_in_sign(v))}°{int((deg_in_sign(v)%1)*60):02d}'"}
                for p,v in p_dict.items()}

    # Sort: first applying, then by planet importance
    planet_rank = {p: i for i, p in enumerate(PLANET_ORDER)}
    asp_list.sort(key=lambda a: (not a["applying"],
                                  planet_rank.get(a["transit_planet"], 99),
                                  a["orb"]))

    return {
        "type": "transits",
        "target_date": target_date_str,
        "target_time": target_time_str,
        "transit_jd": round(transit_jd, 4),
        "transit_planets": fmt(transit_planets),
        "natal_planets": fmt(natal_planets),
        "aspects": asp_list,
    }


def ephemerides_table(start_date_str, days=30, time_str="12:00"):
    """
    Build daily ephemerides for core planets.
    Uses Swiss Ephemeris when available (sub-arcsecond accuracy + exact speeds).
    Falls back to VSOP87/Meeus with finite-difference speeds.
    Returns rows with longitude, sign, position in sign, speed and retrograde flag.
    """
    days = max(1, min(int(days), 120))
    hh, mi, sc = parse_time_arg(time_str)
    yr, mo, dy = parse_date_arg(start_date_str)
    start_jd = jd(yr, mo, dy, hh, mi, sc)

    def signed_delta(a, b):
        return ((a - b + 540.0) % 360.0) - 180.0

    eph_order = [
        "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
        "uranus", "neptune", "pluto", "true_node", "node", "lilith", "chiron",
    ]

    rows = []
    for i in range(days):
        cur_jd = start_jd + i

        planets = {}

        if _SE_OK:
            # Swiss Ephemeris path: calc_body returns lon + exact speed in one call
            for p in eph_order:
                r = _se.calc_body(cur_jd, p)
                if r is None:
                    # Fallback for this body
                    lon = true_node(cur_jd) if p == "true_node" else calc_planets(cur_jd).get(p, 0.0)
                    d = deg_in_sign(lon)
                    planets[p] = {
                        "lon": round(lon, 6),
                        "sign": sign_name(lon),
                        "deg_min": f"{int(d)}°{int((d % 1) * 60):02d}'",
                        "speed_deg_day": 0.0,
                        "retrograde": False,
                    }
                else:
                    d = deg_in_sign(r["lon"])
                    planets[p] = {
                        "lon": r["lon"],
                        "sign": r["sign"],
                        "deg_min": r["deg_min"],
                        "speed_deg_day": round(r["speed"], 6),
                        "retrograde": r["retrograde"],
                    }
        else:
            # Legacy path: finite-difference speed approximation
            cur = calc_planets(cur_jd)
            prev = calc_planets(cur_jd - 1.0)
            nxt = calc_planets(cur_jd + 1.0)
            cur["true_node"] = true_node(cur_jd)
            prev["true_node"] = true_node(cur_jd - 1.0)
            nxt["true_node"] = true_node(cur_jd + 1.0)
            for p in eph_order:
                lon = cur[p]
                speed = signed_delta(nxt[p], prev[p]) / 2.0
                d = deg_in_sign(lon)
                planets[p] = {
                    "lon": round(lon, 6),
                    "sign": sign_name(lon),
                    "deg_min": f"{int(d)}°{int((d % 1) * 60):02d}'",
                    "speed_deg_day": round(speed, 6),
                    "retrograde": speed < 0,
                }

        rows.append({
            "index": i,
            "jd": round(cur_jd, 6),
            "date": _jd_to_date_str(cur_jd),
            "time_utc": f"{hh:02d}:{mi:02d}:{sc:02d}",
            "planets": planets,
        })

    return {
        "type": "ephemerides",
        "start_date": start_date_str,
        "time_utc": f"{hh:02d}:{mi:02d}:{sc:02d}",
        "days": days,
        "rows": rows,
    }


# ══════════════════════════════════════════════════════════════════════════════
# TEXT FORMATTING
# ══════════════════════════════════════════════════════════════════════════════

def _fmt_planet_table(planets_fmt, label=""):
    lines = [f" {'Planet':<12} {'Lon':>8}  {'Sign':<16} {'Deg'}"]
    lines.append("─" * 55)
    for p, d in planets_fmt.items():
        lines.append(f" {p:<12} {d['lon']:>8.4f}  {d['sign']:<16} {d['deg_min']}")
    return lines

def format_progressions_text(data):
    lines = ["═"*60, f" SECONDARY PROGRESSIONS → {data['target_date']}",
             f" Years elapsed: {data['years_elapsed']:.2f}", "═"*60,
             "\n PROGRESSED PLANETS", "─"*60]
    for p, d in data["prog_planets"].items():
        lines.append(f" {p:<12} {d['sign']:<16} {d['deg_min']}")
    lines += ["\n ASPECTS: Progressed → Natal", "─"*60]
    for a in data["aspects_prog_to_natal"]:
        app = "→" if a.get("applying") else " "
        lines.append(f" {a['prog_planet']:<10} {a['glyph']} {a['natal_planet']:<10} "
                     f"{a['aspect']:<15} orb {a['orb']:.3f}°")
    lines.append("═"*60)
    return "\n".join(lines)

def format_solar_arc_text(data):
    lines = ["═"*60, f" SOLAR ARC DIRECTIONS → {data['target_date']}",
             f" Solar arc: {data['solar_arc_deg']:.4f}°", "═"*60,
             "\n DIRECTED PLANETS", "─"*60]
    for p, d in data["directed_planets"].items():
        nat = data["natal_planets"][p]
        lines.append(f" {p:<12} natal: {nat['sign']:<14} → directed: {d['sign']:<14} {d['deg_min']}")
    lines += ["\n ASPECTS: Directed → Natal", "─"*60]
    for a in data["aspects_directed_to_natal"]:
        lines.append(f" {a['directed_planet']:<10} {a['glyph']} {a['natal_planet']:<10} "
                     f"{a['aspect']:<15} orb {a['orb']:.3f}°")
    lines.append("═"*60)
    return "\n".join(lines)

def format_solar_return_text(data):
    lines = ["═"*60, f" SOLAR RETURN {data['return_year']}",
             f" Date/time (UTC): {data['sr_date_utc']}",
             f" Sun: {_format_lon(data['sr_sun_lon'])}  (natal: {_format_lon(data['natal_sun_lon'])})",
             "═"*60, "\n PLANETS", "─"*60]
    for p, d in data["planets"].items():
        lines.append(f" {p:<12} {d['sign']:<16} {d['deg_min']}")
    lines += ["\n HOUSES", "─"*60]
    for i in range(1, 13):
        d = data["houses"][f"h{i}"]
        lines.append(f" House {i:>2}  {d['lon']:>8.4f}  {d['sign']}")
    lines.append("═"*60)
    return "\n".join(lines)

def format_lunar_return_text(data):
    lines = ["═"*60, f" LUNAR RETURN near {data['near_date']}",
             f" JD: {data['lr_jd']:.4f}",
             f" Moon: {_format_lon(data['lr_moon_lon'])}  (natal: {_format_lon(data['natal_moon_lon'])})",
             "═"*60, "\n PLANETS", "─"*60]
    for p, d in data["planets"].items():
        lines.append(f" {p:<12} {d['sign']:<16} {d['deg_min']}")
    lines.append("═"*60)
    return "\n".join(lines)

def format_profections_text(data):
    lines = ["═"*60, f" ANNUAL PROFECTIONS → {data['target_date']}",
             f" Age: {data['age']}",
             "═"*60,
             f" Annual house:  {data['annual_house']:>2}  ({data['annual_sign']})",
             f" Annual lord:   {data['annual_lord']}  @ {_format_lon(data['annual_lord_natal_lon']) if data['annual_lord_natal_lon'] else 'N/A'}",
             f" Monthly house: {data['monthly_house']:>2}  ({data['monthly_sign']})",
             f" Monthly lord:  {data['monthly_lord']}",
             "═"*60]
    return "\n".join(lines)

def format_transits_text(data):
    lines = ["═"*60, f" TRANSITS → {data['target_date']}", "═"*60,
             " TRANSITING PLANETS", "─"*60]
    for p, d in data["transit_planets"].items():
        lines.append(f" {p:<12} {d['sign']:<16} {d['deg_min']}")
    lines += ["\n ASPECTS TO NATAL", "─"*60]
    for a in data["aspects"]:
        app = "→" if a["applying"] else "←"
        lines.append(f" T.{a['transit_planet']:<9} {a['glyph']} N.{a['natal_planet']:<9} "
                     f"{a['aspect']:<15} orb {a['orb']:.3f}° {app}")
    lines.append("═"*60)
    return "\n".join(lines)

def _format_lon(lon):
    if lon is None: return "N/A"
    s = sign_name(lon); d = deg_in_sign(lon)
    return f"{sign_glyph(lon)}{s} {int(d)}°{int((d%1)*60):02d}'"


# ══════════════════════════════════════════════════════════════════════════════
# ADVANCED PREDICTIVE TECHNIQUES
# ══════════════════════════════════════════════════════════════════════════════

_SIGN_INGRESS_LONS = {
    'aries': 0, 'taurus': 30, 'gemini': 60, 'cancer': 90,
    'leo': 120, 'virgo': 150, 'libra': 180, 'scorpio': 210,
    'sagittarius': 240, 'capricorn': 270, 'aquarius': 300, 'pisces': 330,
}


def _jd_to_date_str(jd_val):
    """Convert Julian Day number to 'YYYY-MM-DD' string (Meeus algorithm)."""
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
    day   = B - D - math.floor(30.6001 * E) + F
    month = E - 1 if E < 14 else E - 13
    year  = C - 4716 if month > 2 else C - 4715
    return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"


def _parse_target_date(s):
    """Parse YYYY-MM-DD string and return Julian Day."""
    yr, mo, dy = parse_date_arg(s)
    return jd(yr, mo, dy)


def _parse_target_datetime(date_str, time_str="12:00"):
    """Parse YYYY-MM-DD + HH:MM[:SS] and return Julian Day."""
    yr, mo, dy = parse_date_arg(date_str)
    hh, mi, sc = parse_time_arg(time_str)
    return jd(yr, mo, dy, hh, mi, sc)


def prenatal_syzygy(natal_jd):
    """
    Find the last New Moon or Full Moon before the natal moment.
    Returns dict with type, jd, date_str, sun_lon, moon_lon.
    """
    def moon_sun_angle(jd_val):
        m = moon(jd_val)
        s = sun(jd_val)[0]
        return n360(m - s)

    # Step backward through days from natal_jd
    jd_step = natal_jd
    prev_angle = moon_sun_angle(jd_step)
    best_jd = None
    best_type = None

    for _ in range(40):
        jd_step -= 1.0
        cur_angle = moon_sun_angle(jd_step)
        for target in (0.0, 180.0):
            a1, a2 = cur_angle, prev_angle
            d1 = (a1 - target) % 360
            d2 = (a2 - target) % 360
            # Crossing: d1 in upper half, d2 in lower half (crossing zero going forward)
            if d1 > 180 and d2 < 180:
                # bisect
                lo, hi = jd_step, jd_step + 1.0
                for _ in range(60):
                    mid = (lo + hi) / 2
                    am = (moon_sun_angle(mid) - target) % 360
                    if am > 180:
                        lo = mid
                    else:
                        hi = mid
                exact_jd = (lo + hi) / 2
                if best_jd is None:
                    best_jd = exact_jd
                    best_type = 'new_moon' if target < 1 else 'full_moon'
                    break
        if best_jd:
            break
        prev_angle = cur_angle

    if best_jd is None:
        return None

    s_lon  = sun(best_jd)[0]
    m_lon  = moon(best_jd)
    date_s = _jd_to_date_str(best_jd)
    return {
        'type':     best_type,
        'jd':       round(best_jd, 4),
        'date_str': date_s,
        'sun_lon':  round(s_lon, 4),
        'moon_lon': round(m_lon, 4),
    }


def find_eclipses(start_date_str, count=5):
    """
    Find next N solar/lunar eclipses after start_date_str.
    Returns list of eclipse dicts.
    """
    import re
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})', start_date_str)
    start_jd = jd(int(m.group(1)), int(m.group(2)), int(m.group(3)))

    def phase_angle(jd_val):
        return n360(moon(jd_val) - sun(jd_val)[0])

    def find_next_syzygy(after_jd, target):
        """Find next moment angle ≈ target (0=NM, 180=FM) after after_jd."""
        jd_cur = after_jd
        prev = (phase_angle(jd_cur) - target) % 360
        for _ in range(40):
            jd_cur += 1.0
            cur = (phase_angle(jd_cur) - target) % 360
            if prev > 180 and cur < 180:
                lo, hi = jd_cur - 1.0, jd_cur
                for _ in range(60):
                    mid = (lo + hi) / 2
                    a = (phase_angle(mid) - target) % 360
                    if a > 180: lo = mid
                    else:       hi = mid
                return (lo + hi) / 2
            prev = cur
        return None

    results = []
    seen_jd = set()
    jd_scan = start_jd

    for _ in range(count * 10):
        nm_jd = find_next_syzygy(jd_scan, 0.0)
        fm_jd = find_next_syzygy(jd_scan, 180.0)

        for syzygy_jd, syzygy_type in sorted(
            [(nm_jd, 'solar'), (fm_jd, 'lunar')],
            key=lambda x: x[0] if x[0] else 1e10
        ):
            if syzygy_jd is None:
                continue
            # Deduplicate: skip if we already added this syzygy (within 1 day)
            jd_key = round(syzygy_jd, 0)
            if jd_key in seen_jd:
                continue
            seen_jd.add(jd_key)
            s_lon  = sun(syzygy_jd)[0]
            m_lon  = moon(syzygy_jd)
            nd_lon = node(syzygy_jd)

            if syzygy_type == 'solar':
                # Solar eclipse: Moon conjunct Sun near node
                dist = abs(n360(s_lon - nd_lon + 180) - 180)
                if dist > 180: dist = 360 - dist
                if dist < 18.5:
                    if dist < 10.0:
                        eclipse_class = 'total/annular'
                    elif dist < 15.0:
                        eclipse_class = 'partial'
                    else:
                        eclipse_class = 'penumbral'
                    results.append({
                        'type':          'solar',
                        'eclipse_class': eclipse_class,
                        'date_str':      _jd_to_date_str(syzygy_jd),
                        'jd':            round(syzygy_jd, 4),
                        'sun_lon':       round(s_lon, 4),
                        'moon_lon':      round(m_lon, 4),
                        'node_lon':      round(nd_lon, 4),
                        'dist_node':     round(dist, 2),
                    })
            else:
                # Lunar eclipse: Full Moon near node
                dist = abs(n360(m_lon - nd_lon + 180) - 180)
                if dist > 180: dist = 360 - dist
                if dist < 12.5:
                    if dist < 4.5:
                        eclipse_class = 'total'
                    elif dist < 9.5:
                        eclipse_class = 'partial'
                    else:
                        eclipse_class = 'penumbral'
                    results.append({
                        'type':          'lunar',
                        'eclipse_class': eclipse_class,
                        'date_str':      _jd_to_date_str(syzygy_jd),
                        'jd':            round(syzygy_jd, 4),
                        'sun_lon':       round(s_lon, 4),
                        'moon_lon':      round(m_lon, 4),
                        'node_lon':      round(nd_lon, 4),
                        'dist_node':     round(dist, 2),
                    })

        if nm_jd and fm_jd:
            jd_scan = min(nm_jd, fm_jd) + 1.0
        else:
            jd_scan += 15.0

        if len(results) >= count:
            break

    return results[:count]


def find_stations(planet_name, start_date_str, end_date_str):
    """
    Find retrograde and direct station dates for a planet in a date range.
    Returns list of {planet, type, date_str, jd, lon, sign}.
    """
    import re
    import astro_engine as ae

    def parse_d(s):
        m = re.match(r'(\d{4})-(\d{2})-(\d{2})', s)
        return jd(int(m.group(1)), int(m.group(2)), int(m.group(3)))

    def get_lon(jd_val):
        return ae._planet_lon(planet_name, jd_val)

    start_jd = parse_d(start_date_str)
    end_jd   = parse_d(end_date_str)

    def speed(jd_val):
        l1 = get_lon(jd_val)
        l2 = get_lon(jd_val + 1.0)
        if l1 is None or l2 is None: return 0.0
        s = (l2 - l1) % 360
        if s > 180: s -= 360
        return s

    results = []
    prev_sp = speed(start_jd)
    jd_cur  = start_jd + 1.0

    while jd_cur <= end_jd:
        cur_sp = speed(jd_cur)
        # Sign change in speed → station (direction change)
        if prev_sp > 0 and cur_sp < 0:
            # Station Retrograde: bisect
            lo, hi = jd_cur - 1.0, jd_cur
            for _ in range(60):
                mid = (lo + hi) / 2
                if speed(mid) > 0: lo = mid
                else:              hi = mid
            st_jd = (lo + hi) / 2
            st_lon = get_lon(st_jd) or 0.0
            results.append({
                'planet':   planet_name,
                'type':     'station_retrograde',
                'date_str': _jd_to_date_str(st_jd),
                'jd':       round(st_jd, 4),
                'lon':      round(st_lon, 4),
                'sign':     sign_name(st_lon),
            })
        elif prev_sp < 0 and cur_sp > 0:
            # Station Direct: bisect
            lo, hi = jd_cur - 1.0, jd_cur
            for _ in range(60):
                mid = (lo + hi) / 2
                if speed(mid) < 0: lo = mid
                else:              hi = mid
            st_jd = (lo + hi) / 2
            st_lon = get_lon(st_jd) or 0.0
            results.append({
                'planet':   planet_name,
                'type':     'station_direct',
                'date_str': _jd_to_date_str(st_jd),
                'jd':       round(st_jd, 4),
                'lon':      round(st_lon, 4),
                'sign':     sign_name(st_lon),
            })
        prev_sp = cur_sp
        jd_cur += 1.0

    return results


def transit_exact_dates(natal_jd_utc, from_date_str, to_date_str, lat=0, lon=0):
    """
    Find exact perfection dates for all transiting aspects to natal planets.
    Returns list of {transit_planet, natal_planet, aspect, exact_date_str, jd, lon_at_exact}.
    """
    import re

    def parse_d(s):
        m2 = re.match(r'(\d{4})-(\d{2})-(\d{2})', s)
        return jd(int(m2.group(1)), int(m2.group(2)), int(m2.group(3)))

    natal_planets = calc_planets(natal_jd_utc)
    from_jd = parse_d(from_date_str)
    to_jd   = parse_d(to_date_str)

    def aspect_orb(tr_lon, nat_lon, asp_angle):
        diff = _angle_diff(tr_lon, nat_lon)
        return diff - asp_angle

    results = []
    seen_exact = set()

    jd_cur = from_jd
    prev_tr = calc_planets(jd_cur)

    while jd_cur < to_jd:
        jd_next = jd_cur + 1.0
        cur_tr  = calc_planets(jd_next)

        for tr_p, tr_lon_cur in cur_tr.items():
            tr_lon_prev = prev_tr.get(tr_p, tr_lon_cur)
            for nat_p, nat_lon in natal_planets.items():
                if tr_p == nat_p:
                    continue
                for asp_name, (asp_angle, asp_orb_deg, glyph) in ASPECT_DEFS.items():
                    orb_prev = aspect_orb(tr_lon_prev, nat_lon, asp_angle)
                    orb_cur  = aspect_orb(tr_lon_cur,  nat_lon, asp_angle)
                    # Detect sign change of orb (crossing zero = exact aspect)
                    if (orb_prev * orb_cur < 0
                            and abs(orb_prev) <= asp_orb_deg
                            and abs(orb_cur) <= asp_orb_deg):
                        key = (tr_p, nat_p, asp_name, round(jd_cur))
                        if key in seen_exact:
                            continue
                        seen_exact.add(key)
                        lo, hi = jd_cur, jd_next
                        for _ in range(40):
                            mid = (lo + hi) / 2
                            tr_mid = calc_planets(mid).get(tr_p, tr_lon_cur)
                            o_mid  = aspect_orb(tr_mid, nat_lon, asp_angle)
                            if o_mid * orb_prev < 0:
                                hi = mid
                            else:
                                lo = mid
                        exact_jd  = (lo + hi) / 2
                        exact_lon = calc_planets(exact_jd).get(tr_p, tr_lon_cur)
                        results.append({
                            'transit_planet': tr_p,
                            'natal_planet':   nat_p,
                            'aspect':         asp_name,
                            'glyph':          glyph,
                            'exact_date_str': _jd_to_date_str(exact_jd),
                            'jd':             round(exact_jd, 4),
                            'lon_at_exact':   round(exact_lon, 4),
                        })

        prev_tr = cur_tr
        jd_cur  = jd_next

    results.sort(key=lambda x: x['jd'])
    return results


def tertiary_progressions(natal_jd_utc, target_date_str, lat, lon,
                           houses_system='placidus'):
    """
    Tertiary progressions: 1 lunar month (27.321582 days) = 1 year of life.
    Returns same structure as secondary_progressions().
    """
    import astro_engine as ae

    target_jd = _parse_target_date(target_date_str)
    years = (target_jd - natal_jd_utc) / 365.25
    LUNAR_MONTH = 27.321582
    prog_jd = natal_jd_utc + years * LUNAR_MONTH

    natal_planets = ae.calc_planets(natal_jd_utc)
    prog_planets  = ae.calc_planets(prog_jd)
    prog_houses   = ae.calc_houses(prog_jd, lat, lon, houses_system)

    prog_fmt = {}
    for p, lon_p in prog_planets.items():
        s = ae.sign_name(lon_p); d = ae.deg_in_sign(lon_p)
        prog_fmt[p] = {
            'lon': round(lon_p, 4), 'sign': s, 'glyph': ae.sign_glyph(lon_p),
            'deg': int(d), 'min': int((d % 1) * 60),
            'deg_min': f"{int(d)}°{int((d % 1) * 60):02d}'",
        }

    natal_fmt = {}
    for p, lon_p in natal_planets.items():
        s = ae.sign_name(lon_p); d = ae.deg_in_sign(lon_p)
        natal_fmt[p] = {
            'lon': round(lon_p, 4), 'sign': s,
            'deg': int(d), 'min': int((d % 1) * 60),
        }

    ASP_ANGLES = {n: (a, min(o, 2.0)) for n, (a, o, _) in ae.ASPECT_DEFS.items()}
    aspects = []
    for pn, plon in prog_planets.items():
        for nn, nlon in natal_planets.items():
            diff = ae._angle_diff(plon, nlon)
            for asp_name, (ang, orb) in ASP_ANGLES.items():
                dev = abs(diff - ang)
                if dev <= orb:
                    aspects.append({
                        'prog_planet': pn, 'natal_planet': nn,
                        'aspect': asp_name, 'orb': round(dev, 2),
                        'applying': (diff - ang) < 0,
                    })

    return {
        'type':       'tertiary',
        'prog_jd':    round(prog_jd, 4),
        'years':      round(years, 4),
        'lunar_months': round(years, 4),
        'prog_date':  _jd_to_date_str(prog_jd),
        'target_date': target_date_str,
        'prog_planets': prog_fmt,
        'natal_planets': natal_fmt,
        'aspects_prog_to_natal': aspects,
    }


def converse_progressions(natal_jd_utc, target_date_str, lat, lon,
                           houses_system='placidus'):
    """
    Converse secondary progressions: 1 day BEFORE birth = 1 year of life (going backward).
    """
    import astro_engine as ae

    target_jd = _parse_target_date(target_date_str)
    years = (target_jd - natal_jd_utc) / 365.25
    prog_jd = natal_jd_utc - years   # go BACKWARD

    natal_planets = ae.calc_planets(natal_jd_utc)
    prog_planets  = ae.calc_planets(prog_jd)
    prog_houses   = ae.calc_houses(prog_jd, lat, lon, houses_system)

    prog_fmt = {}
    for p, lon_p in prog_planets.items():
        s = ae.sign_name(lon_p); d = ae.deg_in_sign(lon_p)
        prog_fmt[p] = {
            'lon': round(lon_p, 4), 'sign': s, 'glyph': ae.sign_glyph(lon_p),
            'deg': int(d), 'min': int((d % 1) * 60),
            'deg_min': f"{int(d)}°{int((d % 1) * 60):02d}'",
        }

    natal_fmt = {}
    for p, lon_p in natal_planets.items():
        s = ae.sign_name(lon_p); d = ae.deg_in_sign(lon_p)
        natal_fmt[p] = {
            'lon': round(lon_p, 4), 'sign': s,
            'deg': int(d), 'min': int((d % 1) * 60),
        }

    ASP_ANGLES = {n: (a, min(o, 2.0)) for n, (a, o, _) in ae.ASPECT_DEFS.items()}
    aspects = []
    for pn, plon in prog_planets.items():
        for nn, nlon in natal_planets.items():
            diff = ae._angle_diff(plon, nlon)
            for asp_name, (ang, orb) in ASP_ANGLES.items():
                dev = abs(diff - ang)
                if dev <= orb:
                    aspects.append({
                        'prog_planet': pn, 'natal_planet': nn,
                        'aspect': asp_name, 'orb': round(dev, 2),
                        'applying': (diff - ang) < 0,
                    })

    return {
        'type':       'converse',
        'prog_jd':    round(prog_jd, 4),
        'years':      round(years, 4),
        'prog_date':  _jd_to_date_str(prog_jd),
        'target_date': target_date_str,
        'prog_planets': prog_fmt,
        'natal_planets': natal_fmt,
        'aspects_prog_to_natal': aspects,
    }


def ingress_chart(year, sign_name_or_lon, lat, lon_geo, houses_system='placidus'):
    """
    Find exact moment Sun enters a sign, return full chart at that moment.
    sign_name_or_lon: sign name string (e.g. 'aries') or ecliptic longitude (0, 30, 90...).
    """
    import astro_engine as ae

    if isinstance(sign_name_or_lon, str):
        target_lon = _SIGN_INGRESS_LONS.get(sign_name_or_lon.lower(), 0.0)
    else:
        target_lon = float(sign_name_or_lon) % 360

    def sun_dist(jd_val):
        """Signed distance from target_lon (negative when Sun before target, positive after)."""
        slon = ae.sun(jd_val)[0]
        d = (slon - target_lon) % 360
        if d > 180: d -= 360
        return d

    # Find the crossing in the given year
    jd_start = ae.jd(year, 1, 1)
    jd_end   = ae.jd(year + 1, 1, 1)
    prev_d   = sun_dist(jd_start)
    ingress_jd = None

    jd_scan = jd_start
    while jd_scan < jd_end:
        jd_scan += 1.0
        cur_d = sun_dist(jd_scan)
        if prev_d < 0 and cur_d >= 0:
            # Bisect
            lo, hi = jd_scan - 1.0, jd_scan
            for _ in range(60):
                mid = (lo + hi) / 2
                if sun_dist(mid) < 0: lo = mid
                else:                 hi = mid
            ingress_jd = (lo + hi) / 2
            break
        prev_d = cur_d

    if ingress_jd is None:
        return None

    # Convert JD to calendar date/time for chart call
    date_str = _jd_to_date_str(ingress_jd)
    frac = (ingress_jd + 0.5) % 1.0
    h_ut  = int(frac * 24)
    mi_ut = int((frac * 24 - h_ut) * 60)
    sc_ut = int(((frac * 24 - h_ut) * 60 - mi_ut) * 60)

    ds = date_str.split('-')
    yr2, mo2, dy2 = int(ds[0]), int(ds[1]), int(ds[2])

    chart = ae.calc_chart(yr2, mo2, dy2, h_ut, mi_ut, sc_ut,
                          lat, lon_geo, 0.0,
                          houses_system=houses_system)
    chart['ingress_metadata'] = {
        'type':       'solar_ingress',
        'sign':       sign_name_or_lon if isinstance(sign_name_or_lon, str) else ae.sign_name(target_lon),
        'target_lon': target_lon,
        'ingress_jd': round(ingress_jd, 6),
        'date_utc':   date_str,
        'time_utc':   f"{h_ut:02d}:{mi_ut:02d}:{sc_ut:02d}",
    }
    return chart


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def _add_natal_args(p):
    p.add_argument("--natal-date",  required=True,  dest="natal_date")
    p.add_argument("--natal-time",  required=True,  dest="natal_time")
    p.add_argument("--natal-lat",   required=True,  type=float, dest="natal_lat")
    p.add_argument("--natal-lon",   required=True,  type=float, dest="natal_lon")
    p.add_argument("--utc",         required=True,  type=float)
    p.add_argument("--julian",      action="store_true")
    p.add_argument("--houses",      default="placidus")
    p.add_argument("--json",        action="store_true")

def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description="HOLO Natal — Predictive Techniques")
    sub    = parser.add_subparsers(dest="cmd", required=True)

    # progressions
    pp = sub.add_parser("progressions"); _add_natal_args(pp)
    pp.add_argument("--target-date", required=True, dest="target_date")

    # solar-arc
    psa = sub.add_parser("solar-arc"); _add_natal_args(psa)
    psa.add_argument("--target-date", required=True, dest="target_date")

    # solar-return
    psr = sub.add_parser("solar-return"); _add_natal_args(psr)
    psr.add_argument("--year", required=True, type=int)

    # lunar-return
    plr = sub.add_parser("lunar-return"); _add_natal_args(plr)
    plr.add_argument("--target-date", required=True, dest="target_date")

    # profections
    ppf = sub.add_parser("profections"); _add_natal_args(ppf)
    ppf.add_argument("--target-date", required=True, dest="target_date")

    # transits
    ptr = sub.add_parser("transits"); _add_natal_args(ptr)
    ptr.add_argument("--target-date",  required=True,  dest="target_date")
    ptr.add_argument("--orb-major",    type=float, default=1.0,  dest="orb_major")
    ptr.add_argument("--orb-minor",    type=float, default=0.5,  dest="orb_minor")

    # eclipses
    p_ecl = sub.add_parser('eclipses', help='Find next N eclipses')
    p_ecl.add_argument('--from-date', default='2026-01-01', dest='from_date')
    p_ecl.add_argument('--count', type=int, default=5)

    # stations
    p_sta = sub.add_parser('stations', help='Find retrograde/direct stations')
    p_sta.add_argument('--planet', required=True)
    p_sta.add_argument('--from-date', required=True, dest='from_date')
    p_sta.add_argument('--to-date',   required=True, dest='to_date')

    # ingress
    p_ing = sub.add_parser('ingress', help='Solar ingress chart')
    p_ing.add_argument('--year',   type=int, required=True)
    p_ing.add_argument('--sign',   required=True, help='e.g. aries, cancer, libra, capricorn')
    p_ing.add_argument('--lat',    type=float, default=0)
    p_ing.add_argument('--lon',    type=float, default=0)
    p_ing.add_argument('--houses', default='placidus')
    p_ing.add_argument('--json',   action='store_true')

    # tertiary progressions
    p_tert = sub.add_parser('tertiary', help='Tertiary progressions')
    _add_natal_args(p_tert)
    p_tert.add_argument('--target-date', required=True, dest='target_date')

    # converse progressions
    p_conv = sub.add_parser('converse', help='Converse secondary progressions')
    _add_natal_args(p_conv)
    p_conv.add_argument('--target-date', required=True, dest='target_date')

    # perfection dates
    p_perf = sub.add_parser('perfections', help='Transit exact perfection dates')
    _add_natal_args(p_perf)
    p_perf.add_argument('--from-date', required=True, dest='from_date')
    p_perf.add_argument('--to-date',   required=True, dest='to_date')

    args = parser.parse_args()

    # Commands that do NOT require natal args
    if args.cmd == 'eclipses':
        result = find_eclipses(args.from_date, args.count)
        print("═"*60)
        print(f" ECLIPSES from {args.from_date}")
        print("═"*60)
        for ec in result:
            print(f" {ec['date_str']}  {ec['type'].upper()} ({ec['eclipse_class']})  "
                  f"dist_node={ec['dist_node']:.1f}\u00b0")
        print("═"*60)
        engine = "swiss_ephemeris" if _SE_OK and _se is not None and _se.is_using_se_files() else (
            "moshier" if _SE_OK else "vsop87"
        )
        return {
            "type": "ephemerides",
            "start_date": start_date_str,
            "time_utc": f"{hh:02d}:{mi:02d}:{sc:02d}",
            "days": days,
            "engine": engine,
            "rows": rows,
        }
        for st in result:
            print(f" {st['date_str']}  {st['type']:<22}  "
                  f"{st['lon']:.4f}\u00b0  {st['sign']}")
        print("═"*60)
        return

    if args.cmd == 'ingress':
        chart = ingress_chart(args.year, args.sign, args.lat, args.lon, args.houses)
        if chart is None:
            print(f"Ingress for {args.sign} not found in {args.year}")
            return
        im = chart['ingress_metadata']
        if args.json:
            print(json.dumps(chart, ensure_ascii=False, indent=2))
        else:
            from astro_engine import format_chart_text
            print(f"SOLAR INGRESS: Sun enters {im['sign'].upper()}  {im['date_utc']} {im['time_utc']} UTC")
            print(format_chart_text(chart))
        return

    # All remaining commands require natal args
    yr, mo, dy = parse_date_arg(args.natal_date)
    h,  mi, sc = parse_time_arg(args.natal_time)
    natal_jd_utc = jd(yr, mo, dy, h - args.utc, mi, sc, julian=args.julian)

    if args.cmd == "progressions":
        data = secondary_progressions(natal_jd_utc, args.natal_lat, args.natal_lon,
                                      args.target_date, args.houses)
        if args.json: print(json.dumps(data, ensure_ascii=False, indent=2))
        else:         print(format_progressions_text(data))

    elif args.cmd == "solar-arc":
        data = solar_arc(natal_jd_utc, args.natal_lat, args.natal_lon,
                         args.target_date, args.houses)
        if args.json: print(json.dumps(data, ensure_ascii=False, indent=2))
        else:         print(format_solar_arc_text(data))

    elif args.cmd == "solar-return":
        data = solar_return(natal_jd_utc, args.year,
                            args.natal_lat, args.natal_lon, args.houses)
        if args.json: print(json.dumps(data, ensure_ascii=False, indent=2))
        else:         print(format_solar_return_text(data))

    elif args.cmd == "lunar-return":
        data = lunar_return(natal_jd_utc, args.target_date,
                            args.natal_lat, args.natal_lon, args.houses)
        if args.json: print(json.dumps(data, ensure_ascii=False, indent=2))
        else:         print(format_lunar_return_text(data))

    elif args.cmd == "profections":
        data = profections(natal_jd_utc, args.target_date, args.houses,
                           args.natal_lat, args.natal_lon)
        if args.json: print(json.dumps(data, ensure_ascii=False, indent=2))
        else:         print(format_profections_text(data))

    elif args.cmd == "transits":
        data = transits(natal_jd_utc, args.target_date,
                        args.natal_lat, args.natal_lon,
                        args.orb_major, args.orb_minor)
        if args.json: print(json.dumps(data, ensure_ascii=False, indent=2))
        else:         print(format_transits_text(data))

    elif args.cmd == 'tertiary':
        data = tertiary_progressions(natal_jd_utc, args.target_date,
                                     args.natal_lat, args.natal_lon, args.houses)
        if args.json:
            print(json.dumps(data, ensure_ascii=False, indent=2))
        else:
            print("═"*60)
            print(f" TERTIARY PROGRESSIONS → {data['target_date']}")
            print(f" Prog date: {data['prog_date']}  (years: {data['years']:.4f})")
            print("═"*60)
            for p, pd in data['prog_planets'].items():
                print(f" {p:<12} {pd['sign']:<16} {pd['deg_min']}")
            print("─"*60)
            for a in data['aspects_prog_to_natal']:
                print(f" {a['prog_planet']:<10} {a['aspect']:<18} {a['natal_planet']:<10}  orb {a['orb']:.2f}\u00b0")
            print("═"*60)

    elif args.cmd == 'converse':
        data = converse_progressions(natal_jd_utc, args.target_date,
                                     args.natal_lat, args.natal_lon, args.houses)
        if args.json:
            print(json.dumps(data, ensure_ascii=False, indent=2))
        else:
            print("═"*60)
            print(f" CONVERSE PROGRESSIONS → {data['target_date']}")
            print(f" Prog date: {data['prog_date']}  (years back: {data['years']:.4f})")
            print("═"*60)
            for p, pd in data['prog_planets'].items():
                print(f" {p:<12} {pd['sign']:<16} {pd['deg_min']}")
            print("─"*60)
            for a in data['aspects_prog_to_natal']:
                print(f" {a['prog_planet']:<10} {a['aspect']:<18} {a['natal_planet']:<10}  orb {a['orb']:.2f}\u00b0")
            print("═"*60)

    elif args.cmd == 'perfections':
        result = transit_exact_dates(natal_jd_utc, args.from_date, args.to_date,
                                     args.natal_lat, args.natal_lon)
        if args.json:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print("═"*60)
            print(f" TRANSIT EXACT DATES  {args.from_date} → {args.to_date}")
            print("═"*60)
            for r in result:
                print(f" {r['exact_date_str']}  T.{r['transit_planet']:<10} "
                      f"{r['glyph']} {r['aspect']:<18} N.{r['natal_planet']}")
            print("═"*60)


if __name__ == "__main__":
    main()
