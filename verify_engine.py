"""
verify_engine.py — сравнение нашего движка с данными AstroDatabank
Проверяем Sun, Moon, ASC по всем записям с natal_chart_json.

Использование:
    python verify_engine.py                  # 2000 записей AA
    python verify_engine.py --limit 500      # быстрый тест
    python verify_engine.py --rating AA,A    # все рейтинги
    python verify_engine.py --seed 123       # детерминированная выборка
    python verify_engine.py --robust-historical  # UTC/LMT гипотезы для исторических
    python verify_engine.py --report         # детальный отчёт в verify_report.csv
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import argparse, sqlite3, json, re, csv, random
from collections import defaultdict
import astro_engine as ae

# ── Парсеры (аналог astro_build_clean_dataset.py) ─────────────────────────────
SIGN_IDX = {
    'ari':0,'tau':1,'gem':2,'can':3,'leo':4,'vir':5,
    'lib':6,'sco':7,'sag':8,'cap':9,'aqu':10,'pis':11,
    'aries':0,'taurus':1,'gemini':2,'cancer':3,'leo':4,'virgo':5,
    'libra':6,'scorpio':7,'sagittarius':8,'capricorn':9,'aquarius':10,'pisces':11,
}

def n360(x):
    return x % 360.0

def parse_date(s):
    if not s: return None
    m = re.match(r'(\d{4})[-/](\d{2})[-/](\d{2})', str(s))
    return (int(m.group(1)), int(m.group(2)), int(m.group(3))) if m else None

def parse_time(s):
    if not s: return None
    p = re.findall(r'\d+', str(s))
    if len(p) < 2: return None
    h, mi = int(p[0]), int(p[1])
    sc = int(p[2]) if len(p) > 2 else 0
    return (h, mi, sc) if h <= 23 and mi <= 59 else None

def parse_dm_coord(value, positive_mark, negative_mark):
    if not value: return None
    s = str(value).strip().lower().replace(' ', '')
    m = re.match(r'^(\d+)([a-z])(\d*)$', s)
    if not m: return None
    deg_part, hemi, min_part = m.groups()
    if hemi not in (positive_mark, negative_mark): return None
    if min_part == '':
        minutes = 0
    elif len(min_part) <= 2:
        minutes = int(min_part)
    else:
        arc_min = int(min_part[:-2])
        arc_sec = int(min_part[-2:])
        minutes = arc_min + arc_sec / 60
    sign = 1 if hemi == positive_mark else -1
    return sign * (int(deg_part) + minutes / 60)

def parse_utc_offset(value):
    """stmerid → hours East (positive=East)"""
    if not value: return None
    s = str(value).strip().lower().replace(' ', '')
    m = re.match(r'^([mh])(\d+)([ew])(\d+)?$', s)
    if not m: return None
    mode, deg_raw, direction, min_raw = m.groups()
    if mode == 'h':
        hours = int(deg_raw)
        minutes = int(min_raw) if min_raw else 0
        offset = hours + minutes / 60
    else:
        lon_deg = int(deg_raw)
        if min_raw is None:
            lon_min_dec = 0.0
        elif len(min_raw) <= 2:
            lon_min_dec = int(min_raw)
        else:
            arc_min = int(min_raw[:-2])
            arc_sec = int(min_raw[-2:])
            lon_min_dec = arc_min + arc_sec / 60
        offset = (lon_deg + lon_min_dec / 60) / 15.0
    if direction == 'w':
        offset = -offset
    return offset

def sign_degmin_to_lon(sign_str: str, degmin_str: str) -> float | None:
    """'vir' + '28°43' → ecliptic longitude 0..360"""
    if not sign_str or not degmin_str:
        return None
    sign_key = sign_str.strip().lower()[:3]
    idx = SIGN_IDX.get(sign_key)
    if idx is None:
        return None
    # degmin_str like '28°43' or '06°05'
    nums = re.findall(r'\d+', str(degmin_str))
    if not nums:
        return None
    deg = int(nums[0])
    mn  = int(nums[1]) if len(nums) > 1 else 0
    return idx * 30.0 + deg + mn / 60.0

def angle_diff(a: float, b: float) -> float:
    """Минимальная разница углов в [-180, 180]"""
    d = (a - b) % 360.0
    if d > 180.0:
        d -= 360.0
    return d

def arcmin(deg: float) -> float:
    return abs(deg) * 60.0

def is_historical_candidate(year: int, stmerid: str | None, utc: float | None) -> bool:
    if year < 1900:
        return True
    if stmerid and str(stmerid).strip().lower().startswith('m'):
        return True
    if utc is None:
        return False
    frac = abs(utc - round(utc))
    return frac not in (0.0, 0.5)

def robust_utc_candidates(base_utc: float, stmerid: str | None) -> list[float]:
    cands = {base_utc}
    for delta in (-1.0, -0.5, -1/3, -0.25, 0.25, 1/3, 0.5, 1.0):
        cands.add(base_utc + delta)

    if stmerid and str(stmerid).strip().lower().startswith('m'):
        # LMT records often hide longitude-derived offsets with minute-level quirks.
        nearest_quarter = round(base_utc * 4) / 4.0
        nearest_sixth = round(base_utc * 6) / 6.0
        cands.add(nearest_quarter)
        cands.add(nearest_sixth)

    return sorted(cands)

def robust_score(sun_err: float, moon_err: float, asc_err: float) -> float:
    # Emphasize Moon and ASC because UTC errors manifest strongest there.
    return 0.5 * sun_err + 1.0 * moon_err + 1.2 * asc_err

def safe_err(our_val, ref_val):
    if our_val is None or ref_val is None:
        return 0.0
    return arcmin(angle_diff(our_val, ref_val))

# ── Основной цикл ─────────────────────────────────────────────────────────────
def run(db_path='astro.db', limit=2000, ratings=('AA',), report_csv=None, seed=42,
        robust_historical=False):
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    placeholders = ','.join('?' for _ in ratings)
    cur.execute(
        f"""
        SELECT page_id, name, date_of_birth, time_of_birth, infobox_json, rodden_rating
        FROM people
        WHERE rodden_rating IN ({placeholders})
          AND infobox_json IS NOT NULL AND infobox_json != ''
        ORDER BY page_id
        """,
        list(ratings),
    )
    all_rows = cur.fetchall()
    if limit and limit < len(all_rows):
        rng = random.Random(seed)
        idx = sorted(rng.sample(range(len(all_rows)), limit))
        rows = [all_rows[i] for i in idx]
    else:
        rows = all_rows
    con.close()

    errors = defaultdict(int)
    results = []
    acc = {body: {'diffs': []} for body in ('sun', 'moon', 'asc')}
    robust_used = 0

    for row in rows:
        try:
            info = json.loads(row['infobox_json'] or '{}')
        except Exception:
            errors['bad_json'] += 1
            continue

        # Reference values from infobox (more fields than natal_chart_json)
        ref_sun  = sign_degmin_to_lon(info.get('sun_sign',''),  info.get('sun_degmin',''))
        ref_moon = sign_degmin_to_lon(info.get('moon_sign',''), info.get('moon_degmin',''))
        ref_asc  = sign_degmin_to_lon(info.get('asc_sign',''),  info.get('asc_degmin',''))

        if ref_sun is None and ref_moon is None and ref_asc is None:
            errors['no_catalog'] += 1
            continue

        # Parse birth data
        dob = parse_date(row['date_of_birth'])
        tob = parse_time(row['time_of_birth'])
        if not dob or not tob:
            errors['no_datetime'] += 1
            continue

        yr, mo, dy = dob
        h, mi, sc  = tob

        lat = parse_dm_coord(info.get('slati'), 'n', 's')
        lon = parse_dm_coord(info.get('slong'), 'e', 'w')
        utc = parse_utc_offset(info.get('stmerid'))

        if lat is None or lon is None or utc is None:
            errors['no_coords'] += 1
            continue

        stmerid = info.get('stmerid')
        is_julian = (str(info.get('ccalendar', '')).lower().startswith('j'))

        # Run engine
        try:
            chart = ae.calc_chart(yr, mo, dy, h, mi, sc,
                                  lat, lon, utc,
                                  houses_system='placidus',
                                  julian=is_julian,
                                  include_aspects=False,
                                  include_patterns=False,
                                  include_dignities=False,
                                  include_arabic=False)
        except Exception as e:
            errors['engine_error'] += 1
            continue

        planets = chart.get('planets', {})
        houses  = chart.get('houses', {})

        our_sun  = planets.get('sun',  {}).get('lon')
        our_moon = planets.get('moon', {}).get('lon')
        our_asc  = houses.get('h1', {}).get('lon')  # h1 = ASC in Placidus

        robust_applied = False
        if robust_historical and is_historical_candidate(yr, stmerid, utc):
            base_sun_err = safe_err(our_sun, ref_sun)
            base_moon_err = safe_err(our_moon, ref_moon)
            base_asc_err = safe_err(our_asc, ref_asc)
            best_score = robust_score(base_sun_err, base_moon_err, base_asc_err)
            best = (our_sun, our_moon, our_asc, utc)

            for utc_try in robust_utc_candidates(utc, stmerid):
                try:
                    c = ae.calc_chart(
                        yr, mo, dy, h, mi, sc,
                        lat, lon, utc_try,
                        houses_system='placidus',
                        julian=is_julian,
                        include_aspects=False,
                        include_patterns=False,
                        include_dignities=False,
                        include_arabic=False,
                    )
                except Exception:
                    continue

                p2 = c.get('planets', {})
                h2 = c.get('houses', {})
                sun2 = p2.get('sun', {}).get('lon')
                moon2 = p2.get('moon', {}).get('lon')
                asc2 = h2.get('h1', {}).get('lon')
                sc2 = robust_score(safe_err(sun2, ref_sun), safe_err(moon2, ref_moon), safe_err(asc2, ref_asc))
                if sc2 + 1e-9 < best_score:
                    best_score = sc2
                    best = (sun2, moon2, asc2, utc_try)

            if abs(best[3] - utc) > 1e-9:
                our_sun, our_moon, our_asc, utc = best
                robust_applied = True
                robust_used += 1

        rec = {
            'name':    row['name'],
            'rodden':  row['rodden_rating'],
            'date':    row['date_of_birth'],
            'time':    row['time_of_birth'],
            'lat':     round(lat, 3),
            'lon':     round(lon, 3),
            'utc':     round(utc, 3),
            'julian':  int(is_julian),
            'robust_utc_adjusted': int(robust_applied),
            'sun_sign_ref': info.get('sun_sign',''),
            'moon_sign_ref': info.get('moon_sign',''),
            'asc_sign_ref': info.get('asc_sign',''),
        }

        for body, ref_val, our_val in (
            ('sun',  ref_sun,  our_sun),
            ('moon', ref_moon, our_moon),
            ('asc',  ref_asc,  our_asc),
        ):
            if ref_val is not None and our_val is not None:
                diff = angle_diff(our_val, ref_val)
                am   = arcmin(diff)
                acc[body]['diffs'].append(am)
                rec[f'{body}_our']     = round(our_val, 4)
                rec[f'{body}_ref']     = round(ref_val, 4)
                rec[f'{body}_err_am']  = round(am, 2)
                rec[f'{body}_sign_ok'] = (int(our_val // 30) == int(ref_val // 30))
            else:
                rec[f'{body}_our']     = None
                rec[f'{body}_ref']     = None
                rec[f'{body}_err_am']  = None
                rec[f'{body}_sign_ok'] = None

        results.append(rec)

    processed = len(results)

    # ── Печать статистики ────────────────────────────────────────────────────
    print(f"\n{'='*64}")
    print(f"  ВЕРИФИКАЦИЯ ДВИЖКА  —  {processed} записей  |  рейтинг: {', '.join(ratings)}")
    print(f"{'='*64}")
    print(f"  Seed: {seed}  |  deterministic sample: yes")
    if robust_historical:
        print(f"  Robust historical mode: ON  |  utc adjusted: {robust_used}")
    if errors:
        print(f"  Пропущено: {dict(errors)}")
    print()

    for body in ('sun', 'moon', 'asc'):
        diffs = sorted(acc[body]['diffs'])
        n = len(diffs)
        if n == 0:
            print(f"  {body.upper():6s}: нет данных")
            continue

        mae = sum(diffs) / n
        med = diffs[n // 2]
        p90 = diffs[int(n * 0.90)]
        p99 = diffs[int(n * 0.99)]
        mx  = diffs[-1]
        o30 = sum(1 for d in diffs if d > 30)   # >30' — явные ошибки
        o5  = sum(1 for d in diffs if d > 5)    # >5'

        sign_ok = sum(1 for r in results if r.get(f'{body}_sign_ok') is True)
        sign_n  = sum(1 for r in results if r.get(f'{body}_sign_ok') is not None)
        spct    = 100.0 * sign_ok / sign_n if sign_n else 0

        print(f"  {body.upper():6s}  n={n:5d}  MAE={mae:6.2f}\'  "
              f"median={med:6.2f}\'  p90={p90:6.2f}\'  p99={p99:7.2f}\'  max={mx:8.1f}\'")
        print(f"         знак ✓: {sign_ok}/{sign_n} ({spct:.1f}%)  "
              f"ошибок >5\': {o5}  ошибок >30\': {o30}")
        print()

    # ── Анализ выбросов Moon ────────────────────────────────────────────────
    moon_outliers = [r for r in results if r.get('moon_err_am') is not None and r['moon_err_am'] > 30]
    if moon_outliers:
        print(f"  Анализ {len(moon_outliers)} выбросов Moon (>30'):")
        nature  = sum(1 for r in moon_outliers if r['name'].lower().startswith('nature:'))
        ancient = sum(1 for r in moon_outliers if r.get('julian',0) == 1)
        weird_utc = sum(1 for r in moon_outliers
                        if r.get('utc') is not None and abs(r['utc']) > 12)
        zero_utc  = sum(1 for r in moon_outliers
                        if r.get('utc') is not None and abs(r['utc']) < 0.1)
        old_dates = sum(1 for r in moon_outliers
                        if r.get('date','')[:4].isdigit() and int(r['date'][:4]) < 1800)
        print(f"    Nature/event charts:  {nature}")
        print(f"    Julian calendar:      {ancient}")
        print(f"    Очень старые (<1800): {old_dates}")
        print(f"    UTC ~0 (LMT forgot):  {zero_utc}")
        print(f"    UTC >12 (weird):      {weird_utc}")
        # Remaining unexplained
        unexplained = len(moon_outliers) - nature - ancient
        print(f"    Прочие:               {max(0, unexplained)}")
        print()

    # Топ ошибок
    for body, label in (('sun','Солнце'), ('moon','Луна'), ('asc','ASC')):
        top = sorted(
            [r for r in results if r.get(f'{body}_err_am') is not None],
            key=lambda r: r[f'{body}_err_am'], reverse=True
        )[:10]
        if not top:
            continue
        print(f"  Топ-10 ошибок — {label}:")
        for r in top:
            err  = r[f'{body}_err_am']
            ok   = '✓' if r[f'{body}_sign_ok'] else '✗'
            ref_s = r.get(f'{body}_sign_ref', '?')
            our_l = r.get(f'{body}_our', '?')
            ref_l = r.get(f'{body}_ref', '?')
            print(f"    [{ok}] {r['name'][:38]:38s}  "
                  f"ref={ref_s:3s}:{ref_l}  our={our_l}  err={err:.1f}'  "
                  f"date={r['date']}  utc={r['utc']:+.2f}  jul={r['julian']}")
        print()

    print(f"{'='*64}\n")

    # ── CSV ──────────────────────────────────────────────────────────────────
    if report_csv:
        fields = ['name','rodden','date','time','lat','lon','utc','julian',
                  'robust_utc_adjusted',
                  'sun_sign_ref','sun_our','sun_ref','sun_err_am','sun_sign_ok',
                  'moon_sign_ref','moon_our','moon_ref','moon_err_am','moon_sign_ok',
                  'asc_sign_ref','asc_our','asc_ref','asc_err_am','asc_sign_ok']
        with open(report_csv, 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
            w.writeheader()
            w.writerows(results)
        print(f"  Отчёт: {report_csv}  ({len(results)} строк)\n")


def main():
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    p = argparse.ArgumentParser()
    p.add_argument('--db',     default='astro.db')
    p.add_argument('--limit',  type=int, default=2000)
    p.add_argument('--rating', default='AA', help='AA или AA,A')
    p.add_argument('--seed',   type=int, default=42, help='Random seed for deterministic sampling')
    p.add_argument('--robust-historical', action='store_true',
                   help='Try UTC/LMT hypothesis corrections for historical/suspicious records')
    p.add_argument('--report', action='store_true')
    p.add_argument('--report-path', default='verify_report.csv',
                   help='CSV path for --report mode')
    args = p.parse_args()
    ratings = [r.strip() for r in args.rating.split(',')]
    run(args.db, args.limit, ratings, args.report_path if args.report else None,
        seed=args.seed, robust_historical=args.robust_historical)

if __name__ == '__main__':
    main()
