#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HOLO Natal — Swiss Ephemeris Bridge
=====================================
Wrapper around `swisseph` (pyswisseph) for high-accuracy planetary positions.
Data files are downloaded from GitHub on first use, then cached in ephe/.

Accuracy with SE files  : sub-arcsecond for classical planets, Moon < 1"
Fallback (Moshier)      : 1-5" for planets, ~1' for Moon, no Chiron
"""

import math
import pathlib
import threading
import urllib.request
from typing import Optional

try:
    import swisseph as _swe
    _SWE_AVAILABLE = True
except ImportError:
    _SWE_AVAILABLE = False

# ── paths ─────────────────────────────────────────────────────────────────────
EPHE_DIR = pathlib.Path(__file__).with_name("ephe")

# Swiss Ephemeris data files on GitHub (Alois Treindl's official repository).
# The "18" suffix covers 1800 – 2399 AD; change to "24" for 2400–2999 if needed.
_GITHUB_BASE = "https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/"
_EPHE_FILES = {
    "sepl_18.se1": "Main planets (Sun–Pluto), nodes, Lilith — 1800–2399",
    "semo_18.se1": "Moon (high-precision) — 1800–2399",
    "seas_18.se1": "Asteroids & Chiron — 1800–2399",
}

# ── initialisation state ──────────────────────────────────────────────────────
_init_lock = threading.Lock()
_initialized = False
_use_swieph = False   # True when at least one .se1 file is present

# ── body map ──────────────────────────────────────────────────────────────────
# Maps our internal names → pyswisseph body constants
_BODY_IDS: dict = {}   # filled in _init() when swisseph is available

_SIGN_NAMES = [
    "aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]

# ── download helpers ──────────────────────────────────────────────────────────

def _download_file(fname: str) -> bool:
    """Download a single SE1 file from GitHub raw. Returns True on success."""
    url = _GITHUB_BASE + fname
    dest = EPHE_DIR / fname
    if dest.exists() and dest.stat().st_size > 1024:
        return True
    EPHE_DIR.mkdir(parents=True, exist_ok=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "HOLO-Natal/1.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
        # Guard against GitHub LFS pointer files (< 500 bytes, contain 'oid sha256:')
        if len(data) < 1024 and b"oid sha256:" in data:
            return False
        dest.write_bytes(data)
        return True
    except Exception:
        return False


def download_ephemeris_files(verbose: bool = True) -> dict:
    """
    Download (or verify) all Swiss Ephemeris data files.
    Returns {'file': True/False, ...} for each file.
    """
    results = {}
    for fname in _EPHE_FILES:
        ok = _download_file(fname)
        results[fname] = ok
        if verbose:
            status = "OK" if ok else "FAILED"
            print(f"  {fname}: {status}")
    return results


# ── initialiser ───────────────────────────────────────────────────────────────

def _init():
    """Lazy one-time initialisation — called before every calculation."""
    global _initialized, _use_swieph, _BODY_IDS
    if _initialized:
        return
    with _init_lock:
        if _initialized:
            return
        if not _SWE_AVAILABLE:
            _initialized = True
            return

        # Populate body-ID map
        _BODY_IDS = {
            "sun":        _swe.SUN,
            "moon":       _swe.MOON,
            "mercury":    _swe.MERCURY,
            "venus":      _swe.VENUS,
            "mars":       _swe.MARS,
            "jupiter":    _swe.JUPITER,
            "saturn":     _swe.SATURN,
            "uranus":     _swe.URANUS,
            "neptune":    _swe.NEPTUNE,
            "pluto":      _swe.PLUTO,
            "true_node":  _swe.TRUE_NODE,
            "node":       _swe.MEAN_NODE,     # Mean Node
            "lilith":     _swe.MEAN_APOG,     # Mean Black Moon Lilith
            "chiron":     _swe.CHIRON,
        }

        # Try to locate existing data files
        se1_present = any((EPHE_DIR / f).exists() for f in _EPHE_FILES)

        if not se1_present:
            # Silently attempt download on first run
            try:
                download_ephemeris_files(verbose=False)
                se1_present = any((EPHE_DIR / f).exists() for f in _EPHE_FILES)
            except Exception:
                pass

        if se1_present:
            _swe.set_ephe_path(str(EPHE_DIR))
            _use_swieph = True
        else:
            _swe.set_ephe_path("")     # Moshier fallback
            _use_swieph = False

        _initialized = True


# ── core calculation ──────────────────────────────────────────────────────────

def calc_body(jd_ut: float, name: str) -> Optional[dict]:
    """
    Calculate position of one body at Julian Day (UT).

    Returns dict:
        lon         – ecliptic longitude (degrees, 0–360)
        lat         – ecliptic latitude  (degrees)
        dist        – distance (AU)
        speed       – longitudinal speed (degrees/day; negative = retrograde)
        retrograde  – bool
        sign        – zodiac sign name (lowercase)
        deg_in_sign – degrees within sign (float)
        deg_min     – formatted "X°MM'"

    Returns None if swisseph is not available or body is unsupported.
    """
    _init()
    if not _SWE_AVAILABLE:
        return None

    body_id = _BODY_IDS.get(name)
    if body_id is None:
        return None

    # Choose flags
    if _use_swieph:
        # For Chiron specifically, need seas_18.se1
        if name == "chiron" and not (EPHE_DIR / "seas_18.se1").exists():
            flags = _swe.FLG_MOSEPH | _swe.FLG_SPEED
        else:
            flags = _swe.FLG_SWIEPH | _swe.FLG_SPEED
    else:
        flags = _swe.FLG_MOSEPH | _swe.FLG_SPEED

    try:
        result, _ = _swe.calc_ut(jd_ut, body_id, flags)
    except Exception:
        # Fallback to Moshier if SE file missing for this body
        try:
            result, _ = _swe.calc_ut(jd_ut, body_id, _swe.FLG_MOSEPH | _swe.FLG_SPEED)
        except Exception:
            return None

    lon  = float(result[0]) % 360.0
    lat  = float(result[1])
    dist = float(result[2])
    spd  = float(result[3])   # deg/day, negative = retrograde

    s_idx    = int(lon / 30)
    d_in_sign = lon % 30.0
    deg_i    = int(d_in_sign)
    min_i    = int((d_in_sign % 1) * 60)

    return {
        "lon":         round(lon, 6),
        "lat":         round(lat, 6),
        "dist":        round(dist, 8),
        "speed":       round(spd, 6),
        "retrograde":  spd < 0.0,
        "sign":        _SIGN_NAMES[s_idx],
        "deg_in_sign": round(d_in_sign, 6),
        "deg_min":     f"{deg_i}°{min_i:02d}'",
    }


def calc_all(jd_ut: float, names: list) -> dict:
    """
    Calculate positions for a list of body names.
    Returns {name: calc_body(...)} skipping None results.
    """
    _init()
    return {n: r for n in names if (r := calc_body(jd_ut, n)) is not None}


def julday(year: int, month: int, day: int, hour: float = 0.0) -> float:
    """Julian Day (UT) via pyswisseph."""
    _init()
    if _SWE_AVAILABLE:
        return _swe.julday(year, month, day, hour)
    # Fallback to astro_engine formula
    if month <= 2:
        year -= 1; month += 12
    a = math.floor(year / 100)
    b = 2 - a + math.floor(a / 4)
    return (math.floor(365.25 * (year + 4716)) + math.floor(30.6001 * (month + 1))
            + day + hour / 24.0 + b - 1524.5)


def is_available() -> bool:
    """True if swisseph library is importable."""
    return _SWE_AVAILABLE


def is_using_se_files() -> bool:
    """True if full Swiss Ephemeris data files are loaded (vs Moshier fallback)."""
    _init()
    return _use_swieph


def status() -> dict:
    """Return status dict for diagnostics."""
    _init()
    files = {}
    for fname in _EPHE_FILES:
        p = EPHE_DIR / fname
        files[fname] = {"exists": p.exists(), "bytes": p.stat().st_size if p.exists() else 0}
    return {
        "swisseph_available": _SWE_AVAILABLE,
        "using_se_files": _use_swieph,
        "ephe_dir": str(EPHE_DIR),
        "files": files,
    }


# ── CLI self-test ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json, sys

    print("Swiss Ephemeris Bridge — self-test")
    print("=" * 50)
    st = status()
    print(f"swisseph available : {st['swisseph_available']}")
    print(f"using SE files     : {st['using_se_files']}")
    print(f"ephe directory     : {st['ephe_dir']}")
    print()
    for fname, info in st["files"].items():
        mark = "✓" if info["exists"] else "✗"
        size = f"{info['bytes']:,} B" if info["exists"] else "missing"
        print(f"  {mark} {fname:<18} {size}")
    print()

    if not _SWE_AVAILABLE:
        print("swisseph not installed — run: pip install pyswisseph")
        sys.exit(1)

    # Reference: 2026-01-01 00:00 UT (matches Astrodienst printed ephemeris)
    JD = julday(2026, 1, 1, 0.0)
    print(f"Test date  : 2026-01-01 00:00 UT  → JD {JD}")
    print(f"Mode       : {'Swiss Ephemeris' if is_using_se_files() else 'Moshier'}")
    print()

    BODIES = [
        "sun", "moon", "mercury", "venus", "mars", "jupiter",
        "saturn", "uranus", "neptune", "pluto",
        "true_node", "node", "lilith", "chiron",
    ]
    ASTRODIENST_REF = {
        "sun":       "Cap 10°34", "moon":     "Gem  6°43",
        "mercury":   "Sag 28°39", "venus":    "Cap  9°12",
        "mars":      "Cap 12°41", "jupiter":  "Can 21°21 R",
        "saturn":    "Pis 26°10", "uranus":   "Tau 27°57 R",
        "neptune":   "Pis 29°30", "pluto":    "Aqu  2°43",
        "true_node": "Pis 10°58 R", "node":   "Pis 12°10 R",
        "lilith":    "Sag  1°15", "chiron":   "Ari 22°36 R",
    }
    signs_abbr = ["Ari","Tau","Gem","Can","Leo","Vir",
                  "Lib","Sco","Sag","Cap","Aqu","Pis"]

    print(f"{'Body':<12} {'Calculated':<18} {'Astrodienst ref':<20}")
    print("─" * 52)
    for name in BODIES:
        r = calc_body(JD, name)
        if r is None:
            print(f"{name:<12} {'N/A — no swisseph':}")
            continue
        s = signs_abbr[int(r["lon"] / 30)]
        d = r["deg_in_sign"]
        fmt = f"{s} {int(d):>2}°{int((d%1)*60):02d}{'R' if r['retrograde'] else ' '}"
        ref = ASTRODIENST_REF.get(name, "—")
        print(f"{name:<12} {fmt:<18} {ref}")
