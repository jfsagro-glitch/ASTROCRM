#!/usr/bin/env python3
"""
Astro Engine Deep Analysis
Разбор ошибок калибровки: распределение, выбросы, системные паттерны

Usage:
  python astro_analyze.py --db astro.db --limit 5000 --rating AA
  python astro_analyze.py --db astro.db --full --output analysis.json
"""

import sqlite3, math, json, argparse, re, sys, time
from collections import defaultdict

# ══════════════════════════════════════════════════════════════════
# Copy of engine from astro_calibrate.py (same algorithms)
# ══════════════════════════════════════════════════════════════════

def n360(d):
    r = d % 360
    return r + 360 if r < 0 else r

def rad(d): return d * math.pi / 180
def deg(r): return r * 180 / math.pi
def vs(terms, tau): return sum(A * math.cos(B + C*tau) for A,B,C in terms)

def jd(yr, mo, dy, h=0, mi=0, sc=0):
    if mo <= 2: yr -= 1; mo += 12
    A = math.floor(yr / 100); B = 2 - A + math.floor(A / 4)
    return math.floor(365.25*(yr+4716)) + math.floor(30.6001*(mo+1)) + dy + (h+mi/60+sc/3600)/24 + B - 1524.5

def jd_julian(yr, mo, dy, h=0, mi=0, sc=0):
    """Julian calendar JD (no Gregorian correction)"""
    if mo <= 2: yr -= 1; mo += 12
    return math.floor(365.25*(yr+4716)) + math.floor(30.6001*(mo+1)) + dy + (h+mi/60+sc/3600)/24 - 1524.5

def T(JD): return (JD - 2451545.0) / 36525
def tau(JD): return (JD - 2451545.0) / 365250.0

EL0=[[175347046,0,0],[3341656,4.6692568,6283.07585],[34894,4.626,12566.152],[3497,2.744,5753.385],[3418,2.829,3.523],[3136,3.628,77.553],[2676,4.418,7860.419],[2343,6.135,3930.210],[1324,0.742,11506.770],[1273,2.038,529.691],[1199,1.102,1577.344]]
EL1=[[628331966747,0,0],[206059,2.678235,6283.07585],[4303,2.635,12566.152],[425,1.590,3.523],[119,5.796,26.298],[109,2.966,1577.344],[93,2.592,18849.228],[72,1.139,529.691]]
ER0=[[100013989,0,0],[1670700,3.0984635,6283.07585],[13956,3.055,12566.152],[3084,5.199,77.553],[1628,1.174,5753.385],[1576,2.847,7860.419],[924,5.453,11506.770],[542,4.564,3930.210],[472,3.661,5884.927],[346,0.964,5507.553]]
ER1=[[103019,1.10749,6283.07585],[1721,1.064,12566.152],[702,3.143,5753.385]]

def earth(JD):
    t = tau(JD)
    L = n360(deg((vs(EL0,t)+vs(EL1,t)*t)*1e-8))
    R = (vs(ER0,t)+vs(ER1,t)*t)*1e-8
    return L, R

def sun(JD):
    t = T(JD)
    L0 = n360(280.46646+36000.76983*t+3.032e-4*t*t)
    M = n360(357.52911+35999.05029*t-1.537e-4*t*t)
    Mr = rad(M)
    C = (1.914602-4.817e-3*t-1.4e-5*t*t)*math.sin(Mr) + (1.9993e-2-1.01e-4*t)*math.sin(2*Mr) + 2.89e-4*math.sin(3*Mr)
    om = n360(125.04-1934.136*t)
    lon = n360(L0+C-5.69e-3-4.78e-3*math.sin(rad(om)))
    nu = n360(M+C); e = 0.016708634-4.2037e-5*t
    R = 1.000001018*(1-e*e)/(1+e*math.cos(rad(nu)))
    return lon, R

MOON_TBL=[[0,0,1,0,6288774],[2,0,-1,0,1274027],[2,0,0,0,658314],[0,0,2,0,213618],[0,1,0,0,-185116],[0,0,0,2,-114332],[2,0,-2,0,58793],[2,-1,-1,0,57066],[2,0,1,0,53322],[2,-1,0,0,45758],[0,1,-1,0,-40923],[1,0,0,0,-34720],[0,1,1,0,-30383],[2,0,0,-2,15327],[0,0,1,2,-12528],[0,0,1,-2,10980],[4,0,-1,0,10675],[0,0,3,0,10034],[4,0,-2,0,8548],[2,1,-1,0,-7888],[2,1,0,0,-6766],[1,0,-1,0,-5163],[1,1,0,0,4987],[2,-1,1,0,4036],[2,0,2,0,3994],[4,0,0,0,3861],[2,0,-3,0,3665],[0,1,-2,0,-2689],[2,0,-1,2,-2602],[2,-1,-2,0,2390],[1,0,1,0,-2348],[2,-2,0,0,2236],[0,1,2,0,-2120],[0,2,0,0,-2069],[2,-2,-1,0,2048],[2,0,1,-2,-1773],[2,0,0,2,-1595],[4,-1,-1,0,1215],[0,0,2,2,-1110],[3,0,-1,0,-892],[2,1,1,0,-810],[4,-1,-2,0,759],[0,2,-1,0,-713],[2,2,-1,0,-700],[2,1,-2,0,691],[2,-1,0,-2,596],[4,0,1,0,549],[0,0,4,0,537],[4,-1,0,0,520],[1,0,-2,0,-487],[2,1,0,-2,-399],[0,0,2,-2,-381],[1,1,1,0,351],[3,0,-2,0,-340],[4,0,-3,0,330],[2,-1,2,0,327],[0,2,1,0,-323],[1,1,-1,0,299],[2,0,3,0,294]]

def moon_lon(JD):
    t = T(JD)
    Lp=n360(218.3165+481267.8813*t); M=n360(357.5291+35999.0503*t)
    Mp=n360(134.9634+477198.8676*t); F=n360(93.2721+483202.0175*t)
    D=n360(297.8502+445267.1115*t); E=1-2.516e-3*t-7.4e-6*t*t
    Lr,Mr,Mpr,Fr,Dr=[rad(x) for x in [Lp,M,Mp,F,D]]
    sL=0
    for D_,M_,Mp_,F_,cl in MOON_TBL:
        Ef = E if abs(M_)==1 else (E*E if abs(M_)==2 else 1)
        sL += Ef*cl*math.sin(D_*Dr+M_*Mr+Mp_*Mpr+F_*Fr)
    A1=rad(n360(119.75+131.849*t)); A2=rad(n360(53.09+479264.29*t))
    sL += 3958*math.sin(A1)+1962*math.sin(Lr-Fr)+318*math.sin(A2)
    om=rad(n360(125.0445-1934.1363*t))
    slon=sun(JD)[0]
    dn=(-17.2*math.sin(om)-1.32*math.sin(2*rad(slon))-0.23*math.sin(2*Mpr)+0.21*math.sin(2*om))/3600
    return n360(Lp+sL/1e6+dn)

def obliquity(JD):
    t=T(JD)
    return 23.4392911-1.3004167e-2*t-1.639e-7*t*t+5.036e-7*t*t*t

def gmst(JD):
    t=T(JD)
    return n360(280.46061837+360.98564736629*(JD-2451545)+3.87933e-4*t*t-t*t*t/38710000)

def asc_lon(JD, lat, lon_deg):
    eps=obliquity(JD); RAMC=n360(gmst(JD)+lon_deg)
    e=rad(eps); phi=rad(lat); ra=rad(RAMC)
    return n360(deg(math.atan2(math.cos(ra), -(math.sin(e)*math.tan(phi)+math.cos(e)*math.sin(ra)))))

SIGN_NAMES=['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces']
SIGN_NORM={'ari':'aries','tau':'taurus','gem':'gemini','can':'cancer','leo':'leo','vir':'virgo','lib':'libra','sco':'scorpio','sag':'sagittarius','cap':'capricorn','aqu':'aquarius','pis':'pisces','aries':'aries','taurus':'taurus','gemini':'gemini','cancer':'cancer','virgo':'virgo','libra':'libra','scorpio':'scorpio','sagittarius':'sagittarius','capricorn':'capricorn','aquarius':'aquarius','pisces':'pisces'}

def parse_sign_deg(s):
    if not s: return None, None
    s = s.lower().strip()
    sign = None
    for k, v in SIGN_NORM.items():
        if k in s: sign = v; break
    if sign is None: return None, None
    sign_i = SIGN_NAMES.index(sign)
    nums = re.findall(r'\d+', s)
    if not nums: return sign_i, 0.0
    d = int(nums[0]); m = int(nums[1]) if len(nums)>1 else 0
    return sign_i, d + m/60.0

def angle_diff_arcmin(computed_lon, expected_sign_idx, expected_deg):
    expected_lon = expected_sign_idx * 30 + expected_deg
    diff = abs(computed_lon - expected_lon)
    if diff > 180: diff = 360 - diff
    return diff * 60

def parse_time(time_str):
    if not time_str: return None
    parts = re.findall(r'\d+', str(time_str))
    if len(parts)<2: return None
    h,m = int(parts[0]),int(parts[1])
    s = int(parts[2]) if len(parts)>2 else 0
    if h>23 or m>59: return None
    return h, m, s

def parse_date(date_str):
    if not date_str: return None
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})', str(date_str))
    if not m: return None
    return int(m.group(1)), int(m.group(2)), int(m.group(3))

# ══════════════════════════════════════════════════════════════════
# DEEP ANALYSIS
# ══════════════════════════════════════════════════════════════════

def percentile(sorted_list, p):
    if not sorted_list: return 0
    idx = (len(sorted_list)-1)*p/100
    lo, hi = int(idx), min(int(idx)+1, len(sorted_list)-1)
    return sorted_list[lo] + (sorted_list[hi]-sorted_list[lo])*(idx-lo)

def run_analysis(db_path, limit=5000, rating_filter='AA,A,B', output_file=None):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    where_clauses = ["p.time_of_birth IS NOT NULL", "p.natal_chart_json IS NOT NULL"]
    params = []
    if rating_filter and rating_filter != 'all':
        ratings = [r.strip() for r in rating_filter.split(',')]
        where_clauses.append(f"p.rodden_rating IN ({','.join('?'*len(ratings))})")
        params = ratings

    where_str = " AND ".join(where_clauses)
    limit_str = f"LIMIT {limit}" if limit else ""

    cols = [c[1] for c in conn.execute("PRAGMA table_info(people)").fetchall()]
    has_latlon = 'latitude' in cols and 'longitude' in cols
    has_calendar = 'calendar' in cols or 'ccalendar' in cols
    calendar_col = 'calendar' if 'calendar' in cols else ('ccalendar' if 'ccalendar' in cols else None)

    sel_extra = f", p.{calendar_col}" if calendar_col else ", NULL as calendar_type"
    query = f"""
        SELECT p.title, p.date_of_birth, p.time_of_birth, p.place_of_birth,
               p.natal_chart_json, p.rodden_rating, p.infobox_json,
               p.latitude, p.longitude, p.utc_offset, p.birth_year{sel_extra}
        FROM people p
        WHERE {where_str}
        ORDER BY p.rodden_rating
        {limit_str}
    """
    rows = conn.execute(query, params).fetchall()

    print(f"\n{'═'*70}")
    print(f"ГЛУБОКИЙ АНАЛИЗ ОШИБОК | AstroDatabank {len(rows):,} карт")
    print(f"{'═'*70}")

    # Buckets for analysis
    sun_errors = []   # (error_arcmin, year, utc_off)
    moon_errors = []
    asc_errors = []
    outliers = []     # charts with error > 3 degrees

    # Error distribution buckets
    sun_by_decade = defaultdict(list)
    moon_by_decade = defaultdict(list)
    asc_by_decade = defaultdict(list)

    # UTC offset distribution
    utc_dist = defaultdict(int)
    sign_errors = defaultdict(list)  # planet → [error_arcmin]

    no_coords = skip_time = skip_parse = computed = 0
    t0 = time.time()

    for i, row in enumerate(rows):
        if i % 500 == 0 and i > 0:
            print(f"  [{i:5d}/{len(rows)}]", end='\r')

        date = parse_date(row['date_of_birth'])
        if not date: skip_time += 1; continue
        yr, mo, dy = date

        time_parsed = parse_time(row['time_of_birth'])
        if not time_parsed: skip_time += 1; continue
        h, mi, sc = time_parsed

        if not (row['latitude'] and row['longitude']):
            no_coords += 1; continue

        try:
            lat = float(row['latitude']); lon_coord = float(row['longitude'])
            utc = float(row['utc_offset']) if row['utc_offset'] else 0
        except:
            no_coords += 1; continue

        try:
            chart_data = json.loads(row['natal_chart_json']) if row['natal_chart_json'] else {}
        except:
            skip_parse += 1; continue

        if not chart_data: skip_parse += 1; continue

        # Check calendar type
        cal = row['calendar_type'] if 'calendar_type' in row.keys() else None
        use_julian = cal and str(cal).lower() in ('j', 'julian', 'jul')

        try:
            if use_julian:
                JD = jd_julian(yr, mo, dy, h-utc, mi, sc)
            else:
                JD = jd(yr, mo, dy, h-utc, mi, sc)
            sun_lon = sun(JD)[0]
            moon_val = moon_lon(JD)
            asc_val = asc_lon(JD, lat, lon_coord)
        except Exception as ex:
            skip_parse += 1; continue

        computed += 1
        decade = (yr // 10) * 10
        utc_dist[round(utc*2)/2] += 1  # bucket by 0.5h

        # Sun
        db_sun = chart_data.get('sun') or chart_data.get('Sun')
        if db_sun:
            si, sd = parse_sign_deg(str(db_sun))
            if si is not None:
                err = angle_diff_arcmin(sun_lon, si, sd)
                sun_errors.append(err)
                sun_by_decade[decade].append(err)
                if err > 180:
                    outliers.append({'name':row['title'],'planet':'sun','err_arcmin':round(err,1),'year':yr,'utc':utc,'computed':f"{SIGN_NAMES[int(sun_lon/30)]} {int(sun_lon%30)}°",'expected':f"{SIGN_NAMES[si]} {sd:.1f}°"})

        # Moon
        db_moon = chart_data.get('moon') or chart_data.get('Moon')
        if db_moon:
            si, sd = parse_sign_deg(str(db_moon))
            if si is not None:
                err = angle_diff_arcmin(moon_val, si, sd)
                moon_errors.append(err)
                moon_by_decade[decade].append(err)
                if err > 180:
                    outliers.append({'name':row['title'],'planet':'moon','err_arcmin':round(err,1),'year':yr,'utc':utc,'computed':f"{SIGN_NAMES[int(moon_val/30)]} {int(moon_val%30)}°",'expected':f"{SIGN_NAMES[si]} {sd:.1f}°"})

        # ASC
        db_asc = chart_data.get('asc') or chart_data.get('Asc') or chart_data.get('ascendant')
        if db_asc:
            si, sd = parse_sign_deg(str(db_asc))
            if si is not None:
                err = angle_diff_arcmin(asc_val, si, sd)
                asc_errors.append(err)
                asc_by_decade[decade].append(err)
                if err > 180:
                    outliers.append({'name':row['title'],'planet':'asc','err_arcmin':round(err,1),'year':yr,'utc':utc,'computed':f"{SIGN_NAMES[int(asc_val/30)]} {int(asc_val%30)}°",'expected':f"{SIGN_NAMES[si]} {sd:.1f}°"})

    print(f"\n\nОбработано: {computed:,} / {len(rows):,} карт")
    print(f"Пропущено: координаты={no_coords}, время={skip_time}, парсинг={skip_parse}")

    def analyze_errors(errs, name):
        if not errs: return {}
        s = sorted(errs)
        n = len(s)
        # Separate clean (≤60') from outliers (>60')
        clean = [x for x in s if x <= 60]
        bad = [x for x in s if x > 60]
        pct_bad = 100*len(bad)/n
        mae_clean = sum(clean)/len(clean) if clean else 0
        mae_all = sum(s)/n

        print(f"\n{'─'*55}")
        print(f"  {name}")
        print(f"{'─'*55}")
        print(f"  N:                {n:,}")
        print(f"  MAE (все):        {mae_all:.1f}'")
        print(f"  MAE (≤60'):       {mae_clean:.1f}'  ({len(clean):,} карт)")
        print(f"  Выбросы >60':     {len(bad):,} ({pct_bad:.1f}%)")
        print(f"  Выбросы >3°:      {sum(1 for x in s if x>180):,}")
        print(f"  Перцентили: P50={percentile(s,50):.1f}' P75={percentile(s,75):.1f}' P90={percentile(s,90):.1f}' P95={percentile(s,95):.1f}' P99={percentile(s,99):.1f}'")
        print(f"  Точность:")
        print(f"    <5':   {100*sum(1 for x in s if x<5)/n:.1f}%")
        print(f"    <15':  {100*sum(1 for x in s if x<15)/n:.1f}%")
        print(f"    <30':  {100*sum(1 for x in s if x<30)/n:.1f}%")
        print(f"    <1°:   {100*sum(1 for x in s if x<60)/n:.1f}%")
        print(f"    <2°:   {100*sum(1 for x in s if x<120)/n:.1f}%")
        print(f"    Знак:  {100*sum(1 for x in s if x<900)/n:.1f}%")
        return {'n':n,'mae_all':round(mae_all,2),'mae_clean':round(mae_clean,2),'pct_bad':round(pct_bad,2),'pct_5min':round(100*sum(1 for x in s if x<5)/n,1),'pct_30min':round(100*sum(1 for x in s if x<30)/n,1),'pct_1deg':round(100*sum(1 for x in s if x<60)/n,1),'p50':round(percentile(s,50),1),'p90':round(percentile(s,90),1),'p99':round(percentile(s,99),1)}

    r = {}
    r['sun']  = analyze_errors(sun_errors, "☉ СОЛНЦЕ")
    r['moon'] = analyze_errors(moon_errors, "☽ ЛУНА")
    r['asc']  = analyze_errors(asc_errors, "↑ ASC")

    # Decade breakdown
    print(f"\n{'═'*70}")
    print("ОШИБКИ ПО ДЕСЯТИЛЕТИЯМ (MAE в угловых минутах)")
    print(f"{'─'*70}")
    print(f"{'Декада':<10} {'N':>6} {'☉ MAE':>8} {'☽ MAE':>8} {'ASC MAE':>9} {'☉ P90':>8} {'☽ P90':>8}")
    print(f"{'─'*70}")
    all_decades = sorted(set(list(sun_by_decade.keys())+list(moon_by_decade.keys())+list(asc_by_decade.keys())))
    decade_results = {}
    for d in all_decades:
        se = sun_by_decade.get(d, []); me = moon_by_decade.get(d, []); ae = asc_by_decade.get(d, [])
        n = len(se)
        if n < 10: continue
        sm = sum(se)/len(se) if se else 0
        mm = sum(me)/len(me) if me else 0
        am = sum(ae)/len(ae) if ae else 0
        sp90 = percentile(sorted(se),90) if se else 0
        mp90 = percentile(sorted(me),90) if me else 0
        print(f"  {d}s{'':<5} {n:>6,} {sm:>7.1f}' {mm:>7.1f}' {am:>8.1f}' {sp90:>7.1f}' {mp90:>7.1f}'")
        decade_results[str(d)] = {'n':n,'sun_mae':round(sm,1),'moon_mae':round(mm,1),'asc_mae':round(am,1),'sun_p90':round(sp90,1),'moon_p90':round(mp90,1)}

    # UTC distribution
    print(f"\n{'═'*70}")
    print("РАСПРЕДЕЛЕНИЕ UTC СМЕЩЕНИЙ")
    print(f"{'─'*70}")
    for utc_val in sorted(utc_dist.keys()):
        cnt = utc_dist[utc_val]
        bar = '█' * min(40, cnt // max(1, max(utc_dist.values())//40))
        print(f"  UTC{utc_val:+5.1f}h  {cnt:6,}  {bar}")

    # Top outliers
    outliers_sorted = sorted(outliers, key=lambda x: x['err_arcmin'], reverse=True)
    print(f"\n{'═'*70}")
    print(f"ТОП-30 ВЫБРОСОВ (ошибка > 3°)")
    print(f"{'─'*70}")
    print(f"{'Имя':<32} {'Пл':>5} {'Δ':>7} {'Год':>6} {'UTC':>5} {'Наш':>12} {'БД':>12}")
    for e in outliers_sorted[:30]:
        print(f"  {e['name'][:30]:<30} {e['planet']:>5} {e['err_arcmin']:>6.0f}' {e['year']:>6} {e['utc']:>5.1f} {e['computed']:>12} {e['expected']:>12}")

    # Error root cause analysis
    print(f"\n{'═'*70}")
    print("АНАЛИЗ ПРИЧИН ВЫБРОСОВ")
    print(f"{'─'*70}")

    # Check: do large ASC errors cluster by UTC offset?
    asc_by_utc = defaultdict(list)
    rows2 = conn.execute(query, params).fetchall()
    for row in rows2[:min(5000,len(rows2))]:
        date = parse_date(row['date_of_birth'])
        if not date: continue
        yr, mo, dy = date
        time_parsed = parse_time(row['time_of_birth'])
        if not time_parsed: continue
        h, mi, sc = time_parsed
        if not (row['latitude'] and row['longitude']): continue
        try:
            lat=float(row['latitude']); lon_coord=float(row['longitude']); utc=float(row['utc_offset'] or 0)
        except: continue
        chart_data = json.loads(row['natal_chart_json'] or '{}') if row['natal_chart_json'] else {}
        db_asc = chart_data.get('asc') or chart_data.get('Asc')
        if not db_asc: continue
        si, sd = parse_sign_deg(str(db_asc))
        if si is None: continue
        try:
            JD = jd(yr, mo, dy, h-utc, mi, sc)
            asc_v = asc_lon(JD, lat, lon_coord)
            err = angle_diff_arcmin(asc_v, si, sd)
            asc_by_utc[round(utc*2)/2].append(err)
        except: pass

    print("\nMAE ASC по UTC (для выявления систематических ошибок часового пояса):")
    for utc_val in sorted(asc_by_utc.keys()):
        errs = asc_by_utc[utc_val]
        if len(errs) < 5: continue
        mae = sum(errs)/len(errs)
        bad_pct = 100*sum(1 for e in errs if e>60)/len(errs)
        flag = " ← ПРОБЛЕМА?" if mae > 80 or bad_pct > 15 else ""
        print(f"  UTC{utc_val:+5.1f}h  N={len(errs):5,}  MAE={mae:6.1f}'  >60'={bad_pct:5.1f}%{flag}")

    elapsed = time.time()-t0
    print(f"\n{'═'*70}")
    print(f"Время анализа: {elapsed:.1f}с")

    if output_file:
        output = {
            'analysis': r,
            'by_decade': decade_results,
            'utc_distribution': {str(k):v for k,v in utc_dist.items()},
            'top_outliers': outliers_sorted[:100],
        }
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"Результаты → {output_file}")

    conn.close()
    return r

# ══════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Глубокий анализ ошибок астро-движка')
    parser.add_argument('--db',      default='astro.db')
    parser.add_argument('--limit',   type=int, default=5000)
    parser.add_argument('--rating',  default='AA,A,B')
    parser.add_argument('--full',    action='store_true')
    parser.add_argument('--output',  default=None)
    args = parser.parse_args()

    run_analysis(
        db_path=args.db,
        limit=0 if args.full else args.limit,
        rating_filter=args.rating,
        output_file=args.output
    )
