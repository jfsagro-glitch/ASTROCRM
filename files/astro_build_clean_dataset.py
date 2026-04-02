#!/usr/bin/env python3
"""
Build Clean Astrological Dataset for HOLOS Research
=====================================================
Filters ADB to high-quality records, validates Sun sign via engine,
outputs clean CSV + SQLite table for HOLOS analysis.

Usage:
  python astro_build_clean_dataset.py --db astro.db
  python astro_build_clean_dataset.py --db astro.db --rating AA --output clean_charts.csv
"""

import sqlite3, math, json, argparse, re, csv, sys, time
from collections import defaultdict

# ── Minimal engine (Sun only for validation) ──────────────────────
def n360(d):
    r = d % 360
    return r + 360 if r < 0 else r

def jd_greg(yr, mo, dy, h=0, mi=0, sc=0):
    if mo <= 2: yr -= 1; mo += 12
    A = math.floor(yr / 100); B = 2 - A + math.floor(A / 4)
    return math.floor(365.25*(yr+4716)) + math.floor(30.6001*(mo+1)) + dy + (h+mi/60+sc/3600)/24 + B - 1524.5

def jd_julian(yr, mo, dy, h=0, mi=0, sc=0):
    if mo <= 2: yr -= 1; mo += 12
    return math.floor(365.25*(yr+4716)) + math.floor(30.6001*(mo+1)) + dy + (h+mi/60+sc/3600)/24 - 1524.5

def T(JD): return (JD - 2451545.0) / 36525

def sun_lon(JD):
    t = T(JD)
    L0 = n360(280.46646+36000.76983*t+3.032e-4*t*t)
    M = n360(357.52911+35999.05029*t-1.537e-4*t*t)
    Mr = math.radians(M)
    C = (1.914602-4.817e-3*t-1.4e-5*t*t)*math.sin(Mr) + (1.9993e-2-1.01e-4*t)*math.sin(2*Mr) + 2.89e-4*math.sin(3*Mr)
    om = n360(125.04-1934.136*t)
    return n360(L0+C-5.69e-3-4.78e-3*math.sin(math.radians(om)))

# ── DST detection (approximate, handles major zones) ─────────────
# DST rules by UTC offset:
# USA/Canada: last Sun March → last Sun Oct (1987+)
#   EST→EDT -5→-4, CST→CDT -6→-5, MST→MDT -7→-6, PST→PDT -8→-7
# Europe (most): last Sun March → last Sun Oct (1996+)
#   CET→CEST +1→+2, EET→EEST +2→+3

def last_sunday(yr, mo):
    """Last Sunday of month as day-of-month"""
    import calendar
    last_day = calendar.monthrange(yr, mo)[1]
    # Find day of week for last day (0=Mon, 6=Sun)
    dow = calendar.weekday(yr, mo, last_day)
    return last_day - dow if dow != 6 else last_day

def is_dst_usa(yr, mo, dy):
    """DST for North America (-5 to -8 standard offset), 1987+"""
    if yr < 1987: return False
    if mo < 3 or mo > 11: return False
    if mo > 3 and mo < 11: return True
    spring = last_sunday(yr, 3)
    fall = last_sunday(yr, 11)
    if mo == 3: return dy >= spring
    if mo == 11: return dy < fall
    return False

def is_dst_europe(yr, mo, dy):
    """DST for Central/Eastern Europe (+1/+2 standard offset), 1996+"""
    if yr < 1996: return False
    if mo < 3 or mo > 10: return False
    if mo > 3 and mo < 10: return True
    spring = last_sunday(yr, 3)
    fall = last_sunday(yr, 10)
    if mo == 3: return dy >= spring
    if mo == 10: return dy < fall
    return False

def apply_dst(utc_off, yr, mo, dy, lat, lon):
    """Return corrected UTC offset considering DST"""
    # Only apply DST correction if we suspect it's missing
    # North America (approximate longitude range -60 to -170)
    if lon < -60 and -9 <= utc_off <= -4:
        if is_dst_usa(yr, mo, dy):
            return utc_off + 1  # DST adds 1 hour
    # Europe (approximate longitude range -10 to 40)
    if -10 <= lon <= 40 and 0 <= utc_off <= 3:
        if is_dst_europe(yr, mo, dy):
            return utc_off + 1
    return utc_off

# ── Parsing ───────────────────────────────────────────────────────
SIGN_NAMES = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces']
SIGN_NORM = {'ari':'aries','tau':'taurus','gem':'gemini','can':'cancer','leo':'leo','vir':'virgo','lib':'libra','sco':'scorpio','sag':'sagittarius','cap':'capricorn','aqu':'aquarius','pis':'pisces','aries':'aries','taurus':'taurus','gemini':'gemini','cancer':'cancer','virgo':'virgo','libra':'libra','scorpio':'scorpio','sagittarius':'sagittarius','capricorn':'capricorn','aquarius':'aquarius','pisces':'pisces'}

def parse_sign_deg(s):
    if not s: return None, None
    s = s.lower().strip()
    sign = None
    for k, v in SIGN_NORM.items():
        if k in s: sign = v; break
    if sign is None: return None, None
    sign_i = SIGN_NAMES.index(sign)
    nums = re.findall(r'\d+', s)
    d = int(nums[0]) if nums else 0
    m = int(nums[1]) if len(nums) > 1 else 0
    return sign_i, d + m/60.0

def parse_date(s):
    if not s: return None
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})', str(s))
    return (int(m.group(1)), int(m.group(2)), int(m.group(3))) if m else None

def parse_time(s):
    if not s: return None
    p = re.findall(r'\d+', str(s))
    if len(p) < 2: return None
    h,mi = int(p[0]),int(p[1])
    sc = int(p[2]) if len(p) > 2 else 0
    return (h, mi, sc) if h <= 23 and mi <= 59 else None

def sign_label(lon):
    return SIGN_NAMES[int(n360(lon)/30)]

def lon_deg_min(lon):
    lon = n360(lon)
    d = int(lon % 30)
    m = int((lon % 1) * 60)
    return f"{d}°{m:02d}'"

# ── Quality scoring ───────────────────────────────────────────────
def quality_score(yr, utc_off, rodden, sun_err_deg, has_coords):
    """0-100 quality score for HOLOS inclusion"""
    score = 0
    # Rodden rating
    score += {'AA':40,'A':30,'B':15,'C':5,'X':0,'DD':0}.get(rodden or '', 0)
    # Year range (1890-2005 best)
    if yr and 1890 <= yr <= 2005: score += 20
    elif yr and 1800 <= yr <= 2020: score += 10
    # Has coordinates
    if has_coords: score += 15
    # UTC is reasonable
    if utc_off is not None and utc_off == round(utc_off * 2) / 2 and -14 <= utc_off <= 14: score += 10
    # Sun validation
    if sun_err_deg is not None:
        if sun_err_deg < 2: score += 15
        elif sun_err_deg < 5: score += 10
        elif sun_err_deg < 10: score += 5
    return score

# ── Main ──────────────────────────────────────────────────────────
def build_dataset(db_path, rating='AA,A', output_csv='clean_charts.csv',
                  min_score=60, dst_correction=True, validate_sun=True,
                  limit=0):

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    cols = [c[1] for c in conn.execute("PRAGMA table_info(people)").fetchall()]
    has_lat = 'latitude' in cols
    cal_col = next((c for c in ['ccalendar','calendar'] if c in cols), None)

    ratings = [r.strip() for r in rating.split(',')]
    placeholders = ','.join('?'*len(ratings))
    limit_str = f"LIMIT {limit}" if limit else ""

    query = f"""
        SELECT p.title, p.name, p.date_of_birth, p.time_of_birth,
               p.place_of_birth, p.natal_chart_json, p.rodden_rating,
               p.birth_year,
               {('p.latitude, p.longitude, p.utc_offset') if has_lat else 'NULL as latitude, NULL as longitude, NULL as utc_offset'},
               {(f'p.{cal_col}') if cal_col else 'NULL'} as calendar_type,
               p.gender_norm, p.occupation_norm
        FROM people p
        WHERE p.rodden_rating IN ({placeholders})
          AND p.time_of_birth IS NOT NULL
          AND p.natal_chart_json IS NOT NULL
        ORDER BY p.rodden_rating, p.birth_year
        {limit_str}
    """

    rows = conn.execute(query, ratings).fetchall()
    print(f"\n{'═'*70}")
    print(f"СБОРКА ЧИСТОГО ДАТАСЕТА ДЛЯ HOLOS")
    print(f"{'═'*70}")
    print(f"Входных записей: {len(rows):,}  (рейтинг: {rating})")

    accepted = []
    stats = defaultdict(int)
    t0 = time.time()

    for i, row in enumerate(rows):
        if i % 1000 == 0 and i > 0:
            print(f"  [{i:6d}/{len(rows)}] принято={len(accepted):,}", end='\r')

        stats['total'] += 1

        # Date/time
        date = parse_date(row['date_of_birth'])
        if not date: stats['no_date'] += 1; continue
        yr, mo, dy = date

        time_p = parse_time(row['time_of_birth'])
        if not time_p: stats['no_time'] += 1; continue
        h, mi, sc = time_p

        # Coords
        lat = lon_c = utc = None
        if row['latitude'] and row['longitude']:
            try:
                lat = float(row['latitude']); lon_c = float(row['longitude'])
                utc = float(row['utc_offset']) if row['utc_offset'] is not None else 0.0
            except: pass

        if lat is None: stats['no_coords'] += 1; continue

        # Apply DST correction if enabled
        utc_original = utc
        dst_applied = False
        if dst_correction and lat is not None:
            utc_corr = apply_dst(utc, yr, mo, dy, lat, lon_c)
            if utc_corr != utc:
                utc = utc_corr
                dst_applied = True
                stats['dst_corrected'] += 1

        # Calendar
        cal = str(row['calendar_type'] or '').lower()
        is_julian = cal in ('j', 'julian', 'jul')

        # Compute Sun
        try:
            if is_julian:
                JD = jd_julian(yr, mo, dy, h-utc, mi, sc)
            else:
                JD = jd_greg(yr, mo, dy, h-utc, mi, sc)
            computed_sun = sun_lon(JD)
        except:
            stats['compute_error'] += 1; continue

        # Parse expected Sun from DB
        chart_data = {}
        try: chart_data = json.loads(row['natal_chart_json'] or '{}')
        except: pass
        db_sun = chart_data.get('sun') or chart_data.get('Sun')

        sun_err_deg = None
        sun_valid = True
        if validate_sun and db_sun:
            si, sd = parse_sign_deg(str(db_sun))
            if si is not None:
                exp_lon = si * 30 + sd
                diff = abs(computed_sun - exp_lon)
                if diff > 180: diff = 360 - diff
                sun_err_deg = diff
                # Reject if error > 20° (clearly wrong UTC or data error)
                if diff > 20:
                    sun_valid = False
                    stats['sun_validation_fail'] += 1

        if not sun_valid: continue

        # Quality score
        score = quality_score(yr, utc_original, row['rodden_rating'], sun_err_deg, lat is not None)
        if score < min_score:
            stats['low_score'] += 1; continue

        stats['accepted'] += 1

        # Build output record
        accepted.append({
            'name': row['name'] or row['title'],
            'birth_year': yr,
            'birth_month': mo,
            'birth_day': dy,
            'birth_hour': h,
            'birth_min': mi,
            'birth_sec': sc,
            'utc_offset': utc_original,
            'utc_dst_corrected': utc if dst_applied else utc_original,
            'dst_applied': int(dst_applied),
            'latitude': round(lat, 4),
            'longitude': round(lon_c, 4),
            'rodden_rating': row['rodden_rating'],
            'gender': row['gender_norm'] or '',
            'occupation': row['occupation_norm'] or '',
            'sun_sign': sign_label(computed_sun),
            'sun_lon': round(computed_sun, 4),
            'sun_deg_min': lon_deg_min(computed_sun),
            'sun_err_arcmin': round(sun_err_deg * 60, 1) if sun_err_deg is not None else '',
            'is_julian': int(is_julian),
            'quality_score': score,
        })

    # Write CSV
    if accepted:
        fieldnames = list(accepted[0].keys())
        with open(output_csv, 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
            w.writerows(accepted)

    elapsed = time.time() - t0
    print(f"\n\n{'═'*70}")
    print(f"ИТОГ")
    print(f"{'─'*70}")
    print(f"  Входных записей:       {stats['total']:>10,}")
    print(f"  Нет координат:         {stats['no_coords']:>10,}")
    print(f"  Нет времени:           {stats['no_time']:>10,}")
    print(f"  Ошибки расчёта:        {stats['compute_error']:>10,}")
    print(f"  DST скорректировано:   {stats['dst_corrected']:>10,}")
    print(f"  Ошибка валид. Солнца:  {stats['sun_validation_fail']:>10,}")
    print(f"  Низкий quality score:  {stats['low_score']:>10,}")
    print(f"  {'─'*35}")
    print(f"  ПРИНЯТО В ДАТАСЕТ:     {stats['accepted']:>10,}")
    print(f"{'═'*70}")
    print(f"  Файл: {output_csv}")
    print(f"  Время: {elapsed:.1f}с ({stats['total']/elapsed:.0f} карт/с)")

    # Distribution analysis
    if accepted:
        by_decade = defaultdict(int)
        by_rating = defaultdict(int)
        sun_errors = [r['sun_err_arcmin'] for r in accepted if r['sun_err_arcmin'] != '']
        for r in accepted:
            by_decade[(r['birth_year']//10)*10] += 1
            by_rating[r['rodden_rating']] += 1

        print(f"\n  Рейтинг Роддена: { {k:v for k,v in sorted(by_rating.items())} }")
        print(f"  Sun MAE (чистый): {sum(sun_errors)/len(sun_errors):.1f}' ({len(sun_errors):,} карт)" if sun_errors else '')

        print(f"\n  По декадам:")
        for d in sorted(by_decade):
            bar = '▓' * min(40, by_decade[d]//100)
            print(f"    {d}s: {by_decade[d]:5,}  {bar}")

    conn.close()
    return stats['accepted']

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Сборка чистого датасета для HOLOS')
    parser.add_argument('--db',           default='astro.db')
    parser.add_argument('--rating',       default='AA,A', help='Rodden rating filter')
    parser.add_argument('--output',       default='holos_clean_charts.csv')
    parser.add_argument('--min-score',    type=int, default=60)
    parser.add_argument('--no-dst',       action='store_true', help='Disable DST correction')
    parser.add_argument('--no-validate',  action='store_true', help='Skip Sun validation')
    parser.add_argument('--limit',        type=int, default=0)
    args = parser.parse_args()

    build_dataset(
        db_path=args.db,
        rating=args.rating,
        output_csv=args.output,
        min_score=args.min_score,
        dst_correction=not args.no_dst,
        validate_sun=not args.no_validate,
        limit=args.limit,
    )
