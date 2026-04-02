#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HOLO Natal — Full Dataset Builder
===================================
Extends holos_clean.csv to a full astrological dataset:
all 13 planets, 12 house cusps, planet-in-house, dignity scores,
aspects summary, aspect pattern flags, lunar phase, Arabic parts.

Usage:
  python astro_build_full_dataset.py --db astro.db --output holos_full.csv
  python astro_build_full_dataset.py --db astro.db --output holos_full.csv --rating AA,A --min-score 60
  python astro_build_full_dataset.py --db astro.db --output holos_full.csv --limit 100   # test
  python astro_build_full_dataset.py --db astro.db --output holos_full.csv --houses placidus
"""

import sys, io, argparse, json, math, sqlite3, csv, re, time
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from astro_engine import (
    jd, n360, sign_name, deg_in_sign, PLANET_ORDER,
    calc_planets, calc_houses, calc_aspects, calc_patterns,
    calc_dignity, lunar_phase, arabic_parts, is_retrograde,
    planet_in_house, ASPECT_DEFS,
)

# ══════════════════════════════════════════════════════════════════════════════
# PARSING HELPERS (from astro_calibrate.py)
# ══════════════════════════════════════════════════════════════════════════════

def parse_date(s):
    if not s: return None
    m = re.match(r"(\d{4})[-/](\d{2})[-/](\d{2})", str(s))
    return (int(m.group(1)), int(m.group(2)), int(m.group(3))) if m else None

def parse_time_str(s):
    if not s: return None
    parts = re.findall(r"\d+", str(s))
    if len(parts) < 2: return None
    h, mi = int(parts[0]), int(parts[1])
    sc = int(parts[2]) if len(parts) > 2 else 0
    return (h, mi, sc) if h <= 23 and mi <= 59 else None

def parse_dm_coord(value, pos, neg):
    if not value: return None
    s = str(value).strip().lower().replace(" ", "")
    m = re.match(r"^(\d+)([a-z])(\d*)$", s)
    if not m: return None
    deg_p, hemi, min_p = m.groups()
    if hemi not in (pos, neg): return None
    minutes = 0 if not min_p else (int(min_p) if len(min_p) <= 2
                                   else int(min_p[:-2]) + int(min_p[-2:]) / 60)
    return (1 if hemi == pos else -1) * (int(deg_p) + minutes / 60)

def parse_utc_offset(value):
    if not value: return None
    s = str(value).strip().lower().replace(" ", "")
    m = re.match(r"^([mh])(\d+)([ew])(\d+)?$", s)
    if not m: return None
    mode, deg_raw, direction, min_raw = m.groups()
    if mode == "h":
        offset = int(deg_raw) + (int(min_raw) if min_raw else 0) / 60
    else:
        lon_deg = int(deg_raw)
        if not min_raw: lm = 0.0
        elif len(min_raw) <= 2: lm = int(min_raw)
        else: lm = int(min_raw[:-2]) + int(min_raw[-2:]) / 60
        offset = (lon_deg + lm / 60) / 15.0
    return -offset if direction == "w" else offset


# ══════════════════════════════════════════════════════════════════════════════
# QUALITY SCORE (mirrors astro_build_clean_dataset.py)
# ══════════════════════════════════════════════════════════════════════════════

def quality_score(yr, utc_off, rodden, sun_err_deg, has_coords):
    score = 0
    score += {"AA": 40, "A": 30, "B": 15, "C": 5}.get(str(rodden), 0)
    if yr and 1890 <= yr <= 2005: score += 20
    elif yr and 1800 <= yr <= 2020: score += 10
    if has_coords: score += 15
    if utc_off is not None and -14 <= utc_off <= 14: score += 10
    if sun_err_deg is not None:
        if   sun_err_deg < 2:  score += 15
        elif sun_err_deg < 5:  score += 10
        elif sun_err_deg < 10: score += 5
    return score


# ══════════════════════════════════════════════════════════════════════════════
# SIGN-DEGREE PARSER (for validation)
# ══════════════════════════════════════════════════════════════════════════════

SIGN_NORM = {
    "ari":"aries","tau":"taurus","gem":"gemini","can":"cancer","leo":"leo",
    "vir":"virgo","lib":"libra","sco":"scorpio","sag":"sagittarius",
    "cap":"capricorn","aqu":"aquarius","pis":"pisces",
    "aries":"aries","taurus":"taurus","gemini":"gemini","cancer":"cancer",
    "virgo":"virgo","libra":"libra","scorpio":"scorpio","sagittarius":"sagittarius",
    "capricorn":"capricorn","aquarius":"aquarius","pisces":"pisces",
}
SIGN_NAMES = ["aries","taurus","gemini","cancer","leo","virgo",
              "libra","scorpio","sagittarius","capricorn","aquarius","pisces"]

def parse_sign_deg(s):
    if not s: return None, None
    s = s.lower().strip()
    sign = next((v for k,v in SIGN_NORM.items() if k in s), None)
    if sign is None: return None, None
    nums = re.findall(r"\d+", s)
    d = int(nums[0]) if nums else 0
    mi = int(nums[1]) if len(nums) > 1 else 0
    return SIGN_NAMES.index(sign), d + mi / 60.0


# ══════════════════════════════════════════════════════════════════════════════
# COLUMN DEFINITIONS
# ══════════════════════════════════════════════════════════════════════════════

BASE_COLS = [
    "name","birth_year","birth_month","birth_day","birth_hour","birth_min","birth_sec",
    "latitude","longitude","utc_offset","rodden_rating","gender","occupation",
    "quality_score","is_julian",
]

PLANET_COLS = []
for p in PLANET_ORDER:
    PLANET_COLS += [f"{p}_lon", f"{p}_sign", f"{p}_deg", f"{p}_min",
                    f"{p}_retrograde", f"{p}_house"]
    if p not in ("node","lilith","chiron"):
        PLANET_COLS.append(f"{p}_dignity")

HOUSE_COLS = []
for i in range(1, 13):
    HOUSE_COLS += [f"house{i}_lon", f"house{i}_sign"]

ASPECT_COLS = ["aspects_major_count","aspects_minor_count","aspects_json"]

PATTERN_COLS = ["has_grand_trine","has_t_square","has_grand_cross",
                "has_yod","has_stellium","has_kite","has_mystic_rectangle"]

LUNAR_COLS = ["lunar_phase_angle","lunar_phase_name"]

ARABIC_COLS = ["part_fortune_lon","part_fortune_sign",
               "part_spirit_lon","part_spirit_sign",
               "part_marriage_lon","is_day_chart"]

ALL_COLS = BASE_COLS + PLANET_COLS + HOUSE_COLS + ASPECT_COLS + PATTERN_COLS + LUNAR_COLS + ARABIC_COLS


# ══════════════════════════════════════════════════════════════════════════════
# MAIN BUILD FUNCTION
# ══════════════════════════════════════════════════════════════════════════════

def build_full_dataset(db_path, output_csv, rating="AA,A", min_score=60,
                       limit=0, houses_system="placidus", verbose=False):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    ratings = [r.strip() for r in rating.split(",")]
    placeholders = ",".join("?" * len(ratings))
    limit_str = f"LIMIT {limit}" if limit else ""

    # Check schema
    cols = [c[1] for c in conn.execute("PRAGMA table_info(people)").fetchall()]
    has_latlon = "latitude" in cols and "longitude" in cols and "utc_offset" in cols

    if has_latlon:
        query = f"""
            SELECT title, name, date_of_birth, time_of_birth, rodden_rating,
                   gender, occupation, natal_chart_json, infobox_json,
                   latitude, longitude, utc_offset
            FROM people
            WHERE time_of_birth IS NOT NULL
              AND date_of_birth IS NOT NULL
              AND rodden_rating IN ({placeholders})
            ORDER BY rodden_rating, title
            {limit_str}
        """
    else:
        query = f"""
            SELECT title, name, date_of_birth, time_of_birth, rodden_rating,
                   gender, occupation, natal_chart_json, infobox_json
            FROM people
            WHERE time_of_birth IS NOT NULL
              AND date_of_birth IS NOT NULL
              AND rodden_rating IN ({placeholders})
            ORDER BY rodden_rating, title
            {limit_str}
        """

    rows = conn.execute(query, ratings).fetchall()
    print(f"Loaded {len(rows):,} records from {db_path}")
    print(f"Ratings: {rating}  |  Min score: {min_score}  |  Houses: {houses_system}")

    stats = defaultdict(int)
    t0 = time.time()
    written = 0

    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=ALL_COLS, extrasaction="ignore")
        writer.writeheader()

        for i, row in enumerate(rows):
            if i % 500 == 0 and i > 0:
                elapsed = time.time() - t0
                rate = i / elapsed if elapsed > 0 else 0
                eta = (len(rows) - i) / rate if rate > 0 else 0
                print(f"  [{i:6d}/{len(rows)}]  written={written:,}  "
                      f"{rate:.0f}/s  ETA {eta:.0f}s", end="\r")

            # — Parse date/time —
            date = parse_date(row["date_of_birth"])
            if not date: stats["no_date"] += 1; continue
            yr, mo, dy = date

            tparsed = parse_time_str(row["time_of_birth"])
            if not tparsed: stats["no_time"] += 1; continue
            h, mi, sc = tparsed

            # — Parse location —
            infobox = {}
            try:
                infobox = json.loads(row["infobox_json"]) if row["infobox_json"] else {}
            except Exception: pass

            lat = lon_deg = utc_off = None
            if has_latlon:
                try: lat = float(row["latitude"]) if row["latitude"] not in (None,"") else None
                except: pass
                try: lon_deg = float(row["longitude"]) if row["longitude"] not in (None,"") else None
                except: pass
                try: utc_off = float(row["utc_offset"]) if row["utc_offset"] not in (None,"") else None
                except: pass
            if lat is None: lat = parse_dm_coord(infobox.get("slati"), "n", "s")
            if lon_deg is None: lon_deg = parse_dm_coord(infobox.get("slong"), "e", "w")
            if utc_off is None: utc_off = parse_utc_offset(infobox.get("stmerid"))

            if lat is None or lon_deg is None:
                stats["no_coords"] += 1; continue
            if utc_off is None: utc_off = 0.0

            # — Calendar —
            use_julian = infobox.get("ccalendar", "g") == "j"

            # — Sun validation for quality score —
            chart_data = {}
            try:
                chart_data = json.loads(row["natal_chart_json"]) if row["natal_chart_json"] else {}
            except: pass

            sun_err_deg = None
            if chart_data.get("sun"):
                si, sd = parse_sign_deg(str(chart_data["sun"]))
                if si is not None:
                    from astro_engine import sun as sun_fn
                    jd_val = jd(yr, mo, dy, h - utc_off, mi, sc, julian=use_julian)
                    comp_sun = sun_fn(jd_val)[0]
                    exp_lon  = si * 30 + sd
                    diff = abs(comp_sun - exp_lon)
                    if diff > 180: diff = 360 - diff
                    sun_err_deg = diff

            qs = quality_score(yr, utc_off, row["rodden_rating"],
                               sun_err_deg, lat is not None)
            if qs < min_score:
                stats["low_quality"] += 1; continue

            # — Compute full chart —
            try:
                jd_val  = jd(yr, mo, dy, h - utc_off, mi, sc, julian=use_julian)
                planets = calc_planets(jd_val)
                houses  = calc_houses(jd_val, lat, lon_deg, houses_system)
                aspects = calc_aspects(planets)
                patterns_list = calc_patterns(planets, aspects)
                lphase  = lunar_phase(jd_val)
                arabic  = arabic_parts(planets, houses)
            except Exception as e:
                if verbose: print(f"\nERROR {row['title']}: {e}")
                stats["compute_error"] += 1; continue

            # — Build row dict —
            rec = {}

            # Base fields
            rec["name"]         = row["name"] or row["title"]
            rec["birth_year"]   = yr; rec["birth_month"] = mo; rec["birth_day"] = dy
            rec["birth_hour"]   = h;  rec["birth_min"]   = mi; rec["birth_sec"]  = sc
            rec["latitude"]     = round(lat, 6)
            rec["longitude"]    = round(lon_deg, 6)
            rec["utc_offset"]   = round(utc_off, 4)
            rec["rodden_rating"]= row["rodden_rating"]
            rec["gender"]       = (row["gender"] or "").strip()
            rec["occupation"]   = (row["occupation"] or "").strip()
            rec["quality_score"]= qs
            rec["is_julian"]    = 1 if use_julian else 0

            # Planet fields
            for p in PLANET_ORDER:
                lon = planets[p]
                d   = deg_in_sign(lon)
                rec[f"{p}_lon"]       = round(lon, 4)
                rec[f"{p}_sign"]      = sign_name(lon)
                rec[f"{p}_deg"]       = int(d)
                rec[f"{p}_min"]       = int((d % 1) * 60)
                rec[f"{p}_retrograde"]= 1 if is_retrograde(p, jd_val) else 0
                rec[f"{p}_house"]     = planet_in_house(lon, houses)
                if p not in ("node","lilith","chiron"):
                    rec[f"{p}_dignity"] = calc_dignity(p, lon)[0]

            # House fields
            for i in range(1, 13):
                hlon = houses[f"h{i}"]
                rec[f"house{i}_lon"]  = round(hlon, 4)
                rec[f"house{i}_sign"] = sign_name(hlon)

            # Aspects
            major_asp = {"conjunction","sextile","square","trine","opposition"}
            maj = sum(1 for a in aspects if a["aspect"] in major_asp)
            mn  = len(aspects) - maj
            rec["aspects_major_count"] = maj
            rec["aspects_minor_count"] = mn
            # Compact JSON: just type+planets+orb
            rec["aspects_json"] = json.dumps(
                [{"p1":a["p1"],"p2":a["p2"],"asp":a["aspect"],"orb":a["orb"]}
                 for a in aspects if a["aspect"] in major_asp],
                separators=(",",":"))

            # Patterns
            pt_types = {p["type"] for p in patterns_list}
            rec["has_grand_trine"]      = 1 if "grand_trine"      in pt_types else 0
            rec["has_t_square"]         = 1 if "t_square"         in pt_types else 0
            rec["has_grand_cross"]      = 1 if "grand_cross"      in pt_types else 0
            rec["has_yod"]              = 1 if "yod"              in pt_types else 0
            rec["has_stellium"]         = 1 if "stellium"         in pt_types else 0
            rec["has_kite"]             = 1 if "kite"             in pt_types else 0
            rec["has_mystic_rectangle"] = 1 if "mystic_rectangle" in pt_types else 0

            # Lunar phase
            rec["lunar_phase_angle"] = lphase["angle"]
            rec["lunar_phase_name"]  = lphase["phase"]

            # Arabic parts
            rec["part_fortune_lon"]   = arabic["fortune"]["lon"]
            rec["part_fortune_sign"]  = arabic["fortune"]["sign"]
            rec["part_spirit_lon"]    = arabic["spirit"]["lon"]
            rec["part_spirit_sign"]   = arabic["spirit"]["sign"]
            rec["part_marriage_lon"]  = arabic["marriage"]["lon"]
            rec["is_day_chart"]       = 1 if arabic["is_day"] else 0

            writer.writerow(rec)
            written += 1
            stats["written"] += 1

    conn.close()
    elapsed = time.time() - t0

    print(f"\n{'='*60}")
    print(f"COMPLETED: {written:,} records written to {output_csv}")
    print(f"Time: {elapsed:.1f}s  ({written/elapsed:.0f} records/s)")
    print(f"\nStats:")
    for k, v in sorted(stats.items()):
        print(f"  {k:<20} {v:>8,}")
    print(f"\nColumns: {len(ALL_COLS)}")
    print(f"{'='*60}")
    return written


# ══════════════════════════════════════════════════════════════════════════════
# DATASET SUMMARY
# ══════════════════════════════════════════════════════════════════════════════

def summarize_dataset(csv_path):
    """Print summary statistics of the full dataset."""
    import csv as csvmod
    rows = []
    with open(csv_path, encoding="utf-8") as f:
        reader = csvmod.DictReader(f)
        for r in reader:
            rows.append(r)

    n = len(rows)
    if n == 0:
        print("Empty dataset"); return

    print(f"\n{'='*60}")
    print(f"DATASET SUMMARY: {csv_path}")
    print(f"{'='*60}")
    print(f"Total records: {n:,}")
    print(f"Columns:       {len(rows[0])}")

    # Rodden distribution
    rodden_cnt = defaultdict(int)
    for r in rows: rodden_cnt[r["rodden_rating"]] += 1
    print("\nRodden Distribution:")
    for k in ["AA","A","B","C","X","DD"]:
        if k in rodden_cnt:
            print(f"  {k}: {rodden_cnt[k]:,} ({100*rodden_cnt[k]/n:.1f}%)")

    # Sign distributions for Sun, Moon, ASC
    for planet in ["sun","moon"]:
        sign_cnt = defaultdict(int)
        col = f"{planet}_sign"
        if col in rows[0]:
            for r in rows: sign_cnt[r[col]] += 1
            signs_str = " | ".join(f"{s[:3]}:{sign_cnt[s]}" for s in
                                    ["aries","taurus","gemini","cancer","leo","virgo",
                                     "libra","scorpio","sagittarius","capricorn","aquarius","pisces"]
                                    if s in sign_cnt)
            print(f"\n{planet.capitalize()} signs: {signs_str}")

    # Pattern flags
    pattern_cols = ["has_grand_trine","has_t_square","has_grand_cross",
                    "has_yod","has_stellium","has_kite"]
    print("\nAspect Patterns:")
    for pc in pattern_cols:
        if pc in rows[0]:
            cnt = sum(1 for r in rows if r[pc] == "1")
            print(f"  {pc:<22}: {cnt:,} ({100*cnt/n:.1f}%)")

    # Lunar phase distribution
    phase_cnt = defaultdict(int)
    if "lunar_phase_name" in rows[0]:
        for r in rows: phase_cnt[r["lunar_phase_name"]] += 1
        print("\nLunar Phases:")
        for phase in ["New Moon","Waxing Crescent","First Quarter","Waxing Gibbous",
                      "Full Moon","Disseminating","Last Quarter","Balsamic"]:
            if phase in phase_cnt:
                print(f"  {phase:<20}: {phase_cnt[phase]:,} ({100*phase_cnt[phase]/n:.1f}%)")

    print(f"{'='*60}\n")


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="HOLO Natal — Full Dataset Builder",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python astro_build_full_dataset.py --db astro.db --output holos_full.csv
  python astro_build_full_dataset.py --db astro.db --output holos_full.csv --rating AA --min-score 75
  python astro_build_full_dataset.py --db astro.db --output test_full.csv --limit 100
  python astro_build_full_dataset.py --summarize holos_full.csv
""")
    parser.add_argument("--db",       default="astro.db",       help="SQLite database path")
    parser.add_argument("--output",   default="holos_full.csv", help="Output CSV path")
    parser.add_argument("--rating",   default="AA,A",            help="Rodden ratings filter")
    parser.add_argument("--min-score",type=int, default=60,      dest="min_score")
    parser.add_argument("--limit",    type=int, default=0,       help="Record limit (0=all)")
    parser.add_argument("--houses",   default="placidus",
                        choices=["placidus","equal","whole_sign","porphyry","koch"])
    parser.add_argument("--verbose",  action="store_true")
    parser.add_argument("--summarize",default=None, metavar="CSV",
                        help="Print summary of existing CSV instead of building")

    args = parser.parse_args()

    if args.summarize:
        summarize_dataset(args.summarize)
        return

    build_full_dataset(
        db_path=args.db, output_csv=args.output,
        rating=args.rating, min_score=args.min_score,
        limit=args.limit, houses_system=args.houses,
        verbose=args.verbose,
    )
    # Auto-summarize after build
    summarize_dataset(args.output)


if __name__ == "__main__":
    main()
