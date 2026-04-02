#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HOLO Natal — Relocation & Astrocartography
==========================================
Relocated charts, ACG lines (MC/IC/ASC/DSC per planet),
Local Space (Az/Alt), and Parans.

Usage:
  # Relocated chart (same birth moment, new location):
  python astro_relocation.py natal --date 1990-03-15 --time 14:30 --natal-lat 55.75 --natal-lon 37.61 --utc 3 --new-lat 48.85 --new-lon 2.35

  # Astrocartography lines:
  python astro_relocation.py acg --date 1990-03-15 --time 14:30 --natal-lat 55.75 --natal-lon 37.61 --utc 3 --output acg.json

  # Local Space (azimuth/altitude at new location):
  python astro_relocation.py local-space --date 1990-03-15 --time 14:30 --natal-lat 55.75 --natal-lon 37.61 --utc 3 --new-lat 48.85 --new-lon 2.35

  # Parans at a given latitude:
  python astro_relocation.py parans --date 1990-03-15 --time 14:30 --natal-lat 55.75 --natal-lon 37.61 --utc 3 --paran-lat 51.5
"""

import sys, argparse, json, math

from astro_engine import (
    jd, n360, rad, deg, T, gmst, obliquity,
    sun, moon, mercury, vsop_geo, pluto, chiron, node, lilith,
    calc_planets, calc_houses, calc_chart, PLANET_ORDER, SIGN_NAMES,
    sign_name, sign_glyph, deg_in_sign, parse_date_arg, parse_time_arg,
    HOUSE_SYSTEMS,
)


# ══════════════════════════════════════════════════════════════════════════════
# COORDINATE HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _ecliptic_to_ra(lon, eps):
    """Ecliptic longitude → Right Ascension (ecliptic lat = 0)."""
    return n360(deg(math.atan2(math.sin(rad(lon)) * math.cos(rad(eps)),
                               math.cos(rad(lon)))))

def _ecliptic_to_dec(lon, eps):
    """Ecliptic longitude → Declination."""
    v = math.sin(rad(lon)) * math.sin(rad(eps))
    return deg(math.asin(max(-1.0, min(1.0, v))))

def _asc_from_ramc(ramc, lat, eps):
    """Compute Ascendant from RAMC, latitude, obliquity."""
    e, phi, ra = rad(eps), rad(lat), rad(ramc)
    return n360(deg(math.atan2(math.cos(ra),
                               -(math.sin(e) * math.tan(phi) + math.cos(e) * math.sin(ra)))))

def _find_ramc_for_asc(target_asc, lat, eps, max_iter=200):
    """Newton-Raphson: find RAMC such that ASC(RAMC, lat, eps) = target_asc."""
    ramc = n360(target_asc)
    for _ in range(max_iter):
        current = _asc_from_ramc(ramc, lat, eps)
        diff = n360(current - target_asc)
        if diff > 180: diff -= 360
        if abs(diff) < 1e-7: break
        ramc = n360(ramc - diff)
    return ramc

def _geo_lon_to_signed(geo_lon):
    """Convert 0-360 geographic longitude to ±180."""
    return geo_lon - 360 if geo_lon > 180 else geo_lon


# ══════════════════════════════════════════════════════════════════════════════
# RELOCATED CHART
# ══════════════════════════════════════════════════════════════════════════════

def relocated_chart(natal_jd_utc, new_lat, new_lon,
                    houses_system="placidus", include_aspects=True):
    """
    Same birth moment (natal_jd_utc = UTC Julian Date), new geographic location.
    Planets remain the same; only houses/ASC/MC change.

    Returns full chart dict (same format as calc_chart).
    """
    from astro_engine import (calc_planets, calc_houses, calc_aspects,
                              calc_patterns, calc_dignities, lunar_phase,
                              arabic_parts, is_retrograde, sign_name,
                              sign_glyph, deg_in_sign, planet_in_house)

    JD = natal_jd_utc
    planets = calc_planets(JD)
    houses  = calc_houses(JD, new_lat, new_lon, houses_system)
    retro   = {p: is_retrograde(p, JD) for p in PLANET_ORDER}
    p_house = {p: planet_in_house(lon, houses) for p, lon in planets.items()}

    planets_fmt = {}
    for p, lon in planets.items():
        s = sign_name(lon); d = deg_in_sign(lon)
        planets_fmt[p] = {
            "lon": round(lon, 4), "sign": s, "glyph": sign_glyph(lon),
            "deg": int(d), "min": int((d % 1) * 60),
            "deg_min": f"{int(d)}°{int((d%1)*60):02d}'",
            "retrograde": retro[p], "house": p_house[p],
        }

    houses_fmt = {}
    for hk, lon in houses.items():
        s = sign_name(lon); d = deg_in_sign(lon)
        houses_fmt[hk] = {
            "lon": round(lon, 4), "sign": s, "glyph": sign_glyph(lon),
            "deg": int(d), "min": int((d % 1) * 60),
            "deg_min": f"{int(d)}°{int((d%1)*60):02d}'",
        }

    result = {
        "metadata": {
            "jd": round(JD, 4), "new_lat": new_lat, "new_lon": new_lon,
            "houses_system": houses_system, "type": "relocated",
        },
        "planets": planets_fmt,
        "houses":  houses_fmt,
    }

    if include_aspects:
        asp = calc_aspects(planets)
        result["aspects"] = asp
        result["patterns"] = calc_patterns(planets, asp)

    result["arabic_parts"] = arabic_parts(planets, houses)
    result["lunar_phase"]  = lunar_phase(JD)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# ASTROCARTOGRAPHY (ACG) LINES
# ══════════════════════════════════════════════════════════════════════════════

def acg_lines(natal_jd_utc, lat_step=2, lat_min=-75, lat_max=75,
              planets=None):
    """
    Compute Astrocartography lines for each planet.

    MC/IC lines  — single longitude value (vertical lines on map).
    ASC/DSC lines — list of {lat, lon} points (curves on map).

    Returns:
      { planet: { mc_lon, ic_lon, asc_curve: [{lat,lon},...], dsc_curve: [...] } }
    """
    JD  = natal_jd_utc
    eps = obliquity(JD)
    gst = gmst(JD)   # degrees

    planet_lons = calc_planets(JD)
    if planets:
        planet_lons = {k: v for k, v in planet_lons.items() if k in planets}

    result = {}

    for pname, plon in planet_lons.items():
        if pname in ("node", "lilith"):
            # Nodes have no physical horizon crossing, skip ACG for now
            pass

        # — RA of the planet —
        ra_planet = _ecliptic_to_ra(plon, eps)

        # MC/IC longitude (where planet transits the meridian)
        # RAMC = GMST + geo_lon  →  geo_lon = RA_planet - GMST
        mc_lon_raw = n360(ra_planet - gst)
        mc_lon  = _geo_lon_to_signed(mc_lon_raw)
        ic_lon  = _geo_lon_to_signed(n360(mc_lon_raw + 180))

        # ASC/DSC curves
        asc_curve = []
        dsc_curve = []
        lat = lat_min
        while lat <= lat_max:
            # Skip polar regions where ASC is undefined
            dec = _ecliptic_to_dec(plon, eps)
            test = math.tan(rad(dec)) * math.tan(rad(lat))
            if abs(test) < 0.9999:
                # Find RAMC where ASC = plon
                ramc_for_asc = _find_ramc_for_asc(plon, lat, eps)
                asc_geo_lon  = _geo_lon_to_signed(n360(ramc_for_asc - gst))
                asc_curve.append({"lat": round(lat, 1), "lon": round(asc_geo_lon, 3)})

                # DSC = ASC + 180 → find where ASC = plon + 180
                ramc_for_dsc = _find_ramc_for_asc(n360(plon + 180), lat, eps)
                dsc_geo_lon  = _geo_lon_to_signed(n360(ramc_for_dsc - gst))
                dsc_curve.append({"lat": round(lat, 1), "lon": round(dsc_geo_lon, 3)})
            lat += lat_step

        result[pname] = {
            "mc_lon":   round(mc_lon, 3),
            "ic_lon":   round(ic_lon, 3),
            "asc_curve": asc_curve,
            "dsc_curve": dsc_curve,
            "planet_lon": round(plon, 4),
            "planet_sign": sign_name(plon),
        }

    return result


# ══════════════════════════════════════════════════════════════════════════════
# LOCAL SPACE (Azimuth / Altitude)
# ══════════════════════════════════════════════════════════════════════════════

def local_space(natal_jd_utc, obs_lat, obs_lon):
    """
    Compute azimuth and altitude of each planet for observer at (obs_lat, obs_lon)
    at the moment natal_jd_utc (UTC Julian Date).

    Returns: { planet: { azimuth, altitude, ra, dec, above_horizon } }
    """
    JD  = natal_jd_utc
    eps = obliquity(JD)
    gst = gmst(JD)   # GMST in degrees
    lst = n360(gst + obs_lon)   # Local Sidereal Time in degrees

    planet_lons = calc_planets(JD)
    result = {}

    for pname, plon in planet_lons.items():
        ra  = _ecliptic_to_ra(plon, eps)
        dec = _ecliptic_to_dec(plon, eps)

        # Hour Angle
        HA = n360(lst - ra)
        # Convert HA > 180 to negative
        HA_rad = rad(HA if HA <= 180 else HA - 360)
        phi    = rad(obs_lat)
        dec_r  = rad(dec)

        sin_alt = (math.sin(dec_r) * math.sin(phi)
                   + math.cos(dec_r) * math.cos(phi) * math.cos(HA_rad))
        sin_alt = max(-1.0, min(1.0, sin_alt))
        alt_rad = math.asin(sin_alt)
        alt = deg(alt_rad)

        cos_alt = math.cos(alt_rad)
        if abs(cos_alt) < 1e-10:
            az = 0.0
        else:
            cos_az = ((math.sin(dec_r) - math.sin(phi) * sin_alt)
                      / (math.cos(phi) * cos_alt))
            cos_az = max(-1.0, min(1.0, cos_az))
            az = deg(math.acos(cos_az))
            if math.sin(HA_rad) > 0:
                az = 360 - az

        # Local Space direction (azimuth from N, clockwise)
        result[pname] = {
            "azimuth":      round(az, 3),
            "altitude":     round(alt, 3),
            "ra":           round(ra, 4),
            "dec":          round(dec, 4),
            "above_horizon": alt > 0,
            "planet_lon":   round(plon, 4),
            "planet_sign":  sign_name(plon),
        }

    return result


# ══════════════════════════════════════════════════════════════════════════════
# PARANS
# ══════════════════════════════════════════════════════════════════════════════

def parans(natal_jd_utc, paran_lat, orb_deg=1.0):
    """
    Find parans at a given latitude for the birth moment.
    A paran occurs when two planets simultaneously occupy angular positions
    (one on horizon or meridian, another on a different angle).

    Returns list of: { planet1, angle1 (rising/setting/culminating/anticulminating),
                        planet2, angle2, separation_deg }
    """
    JD  = natal_jd_utc
    eps = obliquity(JD)
    gst = gmst(JD)

    planet_lons = calc_planets(JD)
    angles = {}   # planet → dict of angle status

    for pname, plon in planet_lons.items():
        ra  = _ecliptic_to_ra(plon, eps)
        dec = _ecliptic_to_dec(plon, eps)

        # At what longitude does this planet rise/set/culminate/anticulminate?
        # Rising: where RAMC - AD(plon) = RA(plon) → geo_lon for rising
        # Culminating (MC): geo_lon = RA - GMST
        mc_geo_lon = n360(ra - gst)

        dec_r = rad(dec); phi_r = rad(paran_lat)
        tpd = math.tan(dec_r) * math.tan(phi_r)

        if abs(tpd) <= 1.0:
            ad = deg(math.asin(tpd))       # ascensional difference
            oa = n360(ra - ad)             # oblique ascension
            od = n360(ra + ad)             # oblique descension
            rising_geo_lon  = n360(oa - gst)
            setting_geo_lon = n360(od - gst)
            above = True
        else:
            rising_geo_lon  = None  # circumpolar
            setting_geo_lon = None
            above = tpd > 0   # always above or always below

        angles[pname] = {
            "mc_lon":      mc_geo_lon,
            "ic_lon":      n360(mc_geo_lon + 180),
            "rising_lon":  rising_geo_lon,
            "setting_lon": setting_geo_lon,
        }

    # For the birth location longitude (obs_lon at given lat),
    # we scan pairwise: planet A is near rising/setting, planet B near MC/IC
    # Paran = when their angle-crossings coincide in longitude (within orb)

    def _diff_lons(a, b):
        if a is None or b is None: return None
        d = abs(a - b) % 360
        return 360 - d if d > 180 else d

    paran_list = []
    planet_names = list(planet_lons.keys())
    angle_labels = [("mc_lon","culminating"), ("ic_lon","anticulminating"),
                    ("rising_lon","rising"), ("setting_lon","setting")]

    for i in range(len(planet_names)):
        for j in range(i+1, len(planet_names)):
            p1, p2 = planet_names[i], planet_names[j]
            for ak, alabel in angle_labels:
                for bk, blabel in angle_labels:
                    d = _diff_lons(angles[p1][ak], angles[p2][bk])
                    if d is not None and d <= orb_deg:
                        paran_list.append({
                            "planet1": p1, "angle1": alabel,
                            "planet2": p2, "angle2": blabel,
                            "lon_separation": round(d, 3),
                            "planet1_lon": round(planet_lons[p1], 4),
                            "planet2_lon": round(planet_lons[p2], 4),
                        })

    return paran_list


# ══════════════════════════════════════════════════════════════════════════════
# COMPARE NATAL vs RELOCATED
# ══════════════════════════════════════════════════════════════════════════════

def compare_relocation(natal_jd_utc, natal_lat, natal_lon,
                       new_lat, new_lon, houses_system="placidus"):
    """
    Show house cusp differences between natal and relocated chart.
    """
    natal_houses = calc_houses(natal_jd_utc, natal_lat, natal_lon, houses_system)
    reloc_houses = calc_houses(natal_jd_utc, new_lat, new_lon, houses_system)

    diff = {}
    for hk in natal_houses:
        nat_lon = natal_houses[hk]
        rel_lon = reloc_houses[hk]
        delta   = rel_lon - nat_lon
        if delta > 180:  delta -= 360
        if delta < -180: delta += 360
        diff[hk] = {
            "natal_lon":   round(nat_lon, 4),
            "natal_sign":  sign_name(nat_lon),
            "reloc_lon":   round(rel_lon, 4),
            "reloc_sign":  sign_name(rel_lon),
            "delta_deg":   round(delta, 3),
        }
    return diff


# ══════════════════════════════════════════════════════════════════════════════
# TEXT FORMATTING
# ══════════════════════════════════════════════════════════════════════════════

def format_relocated_text(chart, orig_lat, orig_lon, new_lat, new_lon):
    lines = [
        "═"*60,
        f" RELOCATED CHART",
        f" Original:  {orig_lat:+.4f}°, {orig_lon:+.4f}°",
        f" Relocated: {new_lat:+.4f}°, {new_lon:+.4f}°",
        f" Houses: {chart['metadata']['houses_system'].upper()}",
        "═"*60,
        " PLANETS (unchanged)    |  NEW HOUSES",
        "─"*60,
    ]
    planets = chart["planets"]
    houses  = chart["houses"]
    for p, d in planets.items():
        lines.append(f" {p:<12} {d['sign']:<14} H{d['house']}")
    lines.append("─"*60)
    for i in range(1, 13):
        d = houses[f"h{i}"]
        lines.append(f" House {i:>2}  {d['lon']:>8.4f}  {d['sign']:<14} {d['deg_min']}")
    lines.append("═"*60)
    return "\n".join(lines)

def format_acg_text(acg):
    lines = ["═"*60, " ASTROCARTOGRAPHY LINES", "─"*60,
             f" {'Planet':<12} {'MC lon':>8}  {'IC lon':>8}  ASC/DSC curve points"]
    for planet, d in acg.items():
        n_pts = len(d["asc_curve"])
        lines.append(f" {planet:<12} {d['mc_lon']:>8.2f}°  {d['ic_lon']:>8.2f}°  {n_pts} latitude points")
    lines.append("─"*60)
    lines.append(" (Use --json for full ASC/DSC curve coordinates)")
    lines.append("═"*60)
    return "\n".join(lines)

def format_local_space_text(ls, lat, lon):
    lines = ["═"*60, f" LOCAL SPACE  lat={lat:+g}°  lon={lon:+g}°",
             "─"*60,
             f" {'Planet':<12} {'Az':>7}  {'Alt':>7}  {'Sign':<14}  Status"]
    for p, d in ls.items():
        status = "above" if d["above_horizon"] else "below"
        lines.append(f" {p:<12} {d['azimuth']:>7.2f}° {d['altitude']:>7.2f}°  "
                     f"{d['planet_sign']:<14}  {status}")
    lines.append("═"*60)
    return "\n".join(lines)

def format_parans_text(par, lat):
    lines = ["═"*60, f" PARANS  at latitude {lat:+g}°", "─"*60]
    if not par:
        lines.append(" No parans found within orb.")
    for p in par:
        lines.append(f" {p['planet1']:<10} {p['angle1']:<18} — "
                     f"{p['planet2']:<10} {p['angle2']:<18}  sep={p['lon_separation']:.2f}°")
    lines.append("═"*60)
    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def _add_common_args(p):
    p.add_argument("--date",      required=True,  help="Birth date YYYY-MM-DD")
    p.add_argument("--time",      required=True,  help="Birth time HH:MM[:SS]")
    p.add_argument("--natal-lat", required=True,  type=float, dest="natal_lat")
    p.add_argument("--natal-lon", required=True,  type=float, dest="natal_lon")
    p.add_argument("--utc",       required=True,  type=float)
    p.add_argument("--julian",    action="store_true")
    p.add_argument("--json",      action="store_true")
    p.add_argument("--houses", default="placidus",
                   choices=list(HOUSE_SYSTEMS.keys()), dest="houses")

def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="HOLO Natal — Relocation & Astrocartography")
    sub = parser.add_subparsers(dest="cmd", required=True)

    # — natal + relocated —
    p_natal = sub.add_parser("natal", help="Natal chart at new location")
    _add_common_args(p_natal)
    p_natal.add_argument("--new-lat", required=True, type=float, dest="new_lat")
    p_natal.add_argument("--new-lon", required=True, type=float, dest="new_lon")

    # — acg —
    p_acg = sub.add_parser("acg", help="Astrocartography lines")
    _add_common_args(p_acg)
    p_acg.add_argument("--output", default=None, help="Save JSON to file")
    p_acg.add_argument("--lat-step", type=float, default=2, dest="lat_step")
    p_acg.add_argument("--planets", default=None, help="Comma-separated planet list")

    # — local-space —
    p_ls = sub.add_parser("local-space", help="Local Space azimuth/altitude")
    _add_common_args(p_ls)
    p_ls.add_argument("--new-lat", required=True, type=float, dest="new_lat")
    p_ls.add_argument("--new-lon", required=True, type=float, dest="new_lon")

    # — parans —
    p_par = sub.add_parser("parans", help="Parans at a given latitude")
    _add_common_args(p_par)
    p_par.add_argument("--paran-lat", required=True, type=float, dest="paran_lat")
    p_par.add_argument("--orb", type=float, default=1.0)

    # — compare —
    p_cmp = sub.add_parser("compare", help="Compare natal vs relocated house cusps")
    _add_common_args(p_cmp)
    p_cmp.add_argument("--new-lat", required=True, type=float, dest="new_lat")
    p_cmp.add_argument("--new-lon", required=True, type=float, dest="new_lon")

    args = parser.parse_args()
    yr, mo, dy = parse_date_arg(args.date)
    h,  mi, sc = parse_time_arg(args.time)
    natal_jd_utc = jd(yr, mo, dy, h - args.utc, mi, sc, julian=args.julian)

    # ── natal at new location ──
    if args.cmd == "natal":
        chart = relocated_chart(natal_jd_utc, args.new_lat, args.new_lon,
                                houses_system=args.houses)
        if args.json:
            print(json.dumps(chart, ensure_ascii=False, indent=2))
        else:
            print(format_relocated_text(chart, args.natal_lat, args.natal_lon,
                                        args.new_lat, args.new_lon))

    # ── ACG ──
    elif args.cmd == "acg":
        planet_filter = args.planets.split(",") if args.planets else None
        acg = acg_lines(natal_jd_utc, lat_step=args.lat_step, planets=planet_filter)
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(acg, f, ensure_ascii=False, indent=2)
            print(f"Saved ACG to {args.output}")
            print(format_acg_text(acg))
        elif args.json:
            print(json.dumps(acg, ensure_ascii=False, indent=2))
        else:
            print(format_acg_text(acg))

    # ── Local Space ──
    elif args.cmd == "local-space":
        ls = local_space(natal_jd_utc, args.new_lat, args.new_lon)
        if args.json:
            print(json.dumps(ls, ensure_ascii=False, indent=2))
        else:
            print(format_local_space_text(ls, args.new_lat, args.new_lon))

    # ── Parans ──
    elif args.cmd == "parans":
        par = parans(natal_jd_utc, args.paran_lat, orb_deg=args.orb)
        if args.json:
            print(json.dumps(par, ensure_ascii=False, indent=2))
        else:
            print(format_parans_text(par, args.paran_lat))

    # ── Compare ──
    elif args.cmd == "compare":
        diff = compare_relocation(natal_jd_utc, args.natal_lat, args.natal_lon,
                                  args.new_lat, args.new_lon, args.houses)
        if args.json:
            print(json.dumps(diff, ensure_ascii=False, indent=2))
        else:
            print("═"*70)
            print(f" HOUSE COMPARISON  {args.houses.upper()} houses")
            print(f" Natal:  {args.natal_lat:+.4f}°, {args.natal_lon:+.4f}°")
            print(f" Reloc:  {args.new_lat:+.4f}°, {args.new_lon:+.4f}°")
            print("─"*70)
            print(f" {'House':<8} {'Natal sign':<16} {'Reloc sign':<16} {'Delta':>8}")
            print("─"*70)
            for hk, d in diff.items():
                sign_changed = "◄" if d["natal_sign"] != d["reloc_sign"] else ""
                print(f" {hk:<8} {d['natal_sign']:<16} {d['reloc_sign']:<16} "
                      f"{d['delta_deg']:>+7.2f}° {sign_changed}")
            print("═"*70)


if __name__ == "__main__":
    main()
