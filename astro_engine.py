#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HOLO Natal — Unified Astrological Engine
=========================================
Full planetary calculations, 5 house systems, aspects, aspect patterns,
dignities, retrograde, lunar phase, Arabic parts, midpoints, and CLI.

Usage:
  python astro_engine.py --date 1990-03-15 --time 14:30 --lat 55.75 --lon 37.61 --utc 3
  python astro_engine.py --date 1990-03-15 --time 14:30 --lat 55.75 --lon 37.61 --utc 3 --houses koch --json
  python astro_engine.py --date 1990-03-15 --time 14:30 --lat 55.75 --lon 37.61 --utc 3 --houses all
"""

import argparse
import json
import math
import sys

import astro_time as at

# Swiss Ephemeris bridge — provides sub-arcsecond accuracy when available.
# Gracefully degrades to the built-in VSOP/Meeus formulas when not present.
try:
    import astro_se as _se
    _SE_OK = _se.is_available()
except Exception:
    _se = None      # type: ignore
    _SE_OK = False


# ══════════════════════════════════════════════════════════════════════════════
# CORE MATH
# ══════════════════════════════════════════════════════════════════════════════

def n360(d):
    r = d % 360
    return r + 360 if r < 0 else r

def rad(d): return d * math.pi / 180
def deg(r): return r * 180 / math.pi
def vs(terms, t): return sum(A * math.cos(B + C * t) for A, B, C in terms)

SIGN_NAMES = ["aries","taurus","gemini","cancer","leo","virgo",
              "libra","scorpio","sagittarius","capricorn","aquarius","pisces"]
SIGN_GLYPHS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"]

def sign_idx(lon): return int(n360(lon) / 30)
def sign_name(lon): return SIGN_NAMES[sign_idx(lon)]
def sign_glyph(lon): return SIGN_GLYPHS[sign_idx(lon)]
def deg_in_sign(lon): return n360(lon) % 30


# ══════════════════════════════════════════════════════════════════════════════
# JULIAN DATE
# ══════════════════════════════════════════════════════════════════════════════

def jd(yr, mo, dy, h=0, mi=0, sc=0, julian=False):
    if mo <= 2: yr -= 1; mo += 12
    if julian:
        b = 0
    elif (yr, mo, dy) >= (1582, 10, 15):
        a = math.floor(yr / 100); b = 2 - a + math.floor(a / 4)
    else:
        b = 0
    return (math.floor(365.25*(yr+4716)) + math.floor(30.6001*(mo+1))
            + dy + (h + mi/60 + sc/3600)/24 + b - 1524.5)

def T(JD): return (JD - 2451545.0) / 36525
def tau(JD): return (JD - 2451545.0) / 365250.0

def delta_t_seconds(yr, mo, dy=1):
    return at.delta_t_seconds(yr, mo, dy)


# ══════════════════════════════════════════════════════════════════════════════
# VSOP87 EARTH
# ══════════════════════════════════════════════════════════════════════════════

EL0 = [[175347046,0,0],[3341656,4.6692568,6283.07585],[34894,4.626,12566.152],
       [3497,2.744,5753.385],[3418,2.829,3.523],[3136,3.628,77.553],
       [2676,4.418,7860.419],[2343,6.135,3930.210],[1324,0.742,11506.770],
       [1273,2.038,529.691],[1199,1.102,1577.344],[990,5.233,5884.927],
       [902,2.045,26.298],[857,3.509,398.149],[780,1.180,5223.694]]
EL1 = [[628331966747,0,0],[206059,2.678235,6283.07585],[4303,2.635,12566.152],
       [425,1.590,3.523],[119,5.796,26.298],[109,2.966,1577.344],
       [93,2.592,18849.228],[72,1.139,529.691]]
ER0 = [[100013989,0,0],[1670700,3.0984635,6283.07585],[13956,3.055,12566.152],
       [3084,5.199,77.553],[1628,1.174,5753.385],[1576,2.847,7860.419],
       [924,5.453,11506.770],[542,4.564,3930.210],[472,3.661,5884.927],
       [346,0.964,5507.553]]
ER1 = [[103019,1.10749,6283.07585],[1721,1.064,12566.152],[702,3.143,5753.385]]

def earth(JD):
    t = tau(JD)
    L = n360(deg((vs(EL0,t) + vs(EL1,t)*t) * 1e-8))
    R = (vs(ER0,t) + vs(ER1,t)*t) * 1e-8
    return L, R


# ══════════════════════════════════════════════════════════════════════════════
# SUN (Meeus Ch.25)
# ══════════════════════════════════════════════════════════════════════════════

def sun(JD):
    t = T(JD)
    L0 = n360(280.46646 + 36000.76983*t + 3.032e-4*t*t)
    M  = n360(357.52911 + 35999.05029*t - 1.537e-4*t*t)
    Mr = rad(M)
    C  = ((1.914602 - 4.817e-3*t - 1.4e-5*t*t)*math.sin(Mr)
          + (1.9993e-2 - 1.01e-4*t)*math.sin(2*Mr)
          + 2.89e-4*math.sin(3*Mr))
    om = n360(125.04 - 1934.136*t)
    lon = n360(L0 + C - 5.69e-3 - 4.78e-3*math.sin(rad(om)))
    nu  = n360(M + C); e = 0.016708634 - 4.2037e-5*t
    R   = 1.000001018*(1-e*e)/(1+e*math.cos(rad(nu)))
    return lon, R


# ══════════════════════════════════════════════════════════════════════════════
# MOON (Meeus Ch.47, 60-term)
# ══════════════════════════════════════════════════════════════════════════════

MOON_TBL = [
    [0,0,1,0,6288774],[2,0,-1,0,1274027],[2,0,0,0,658314],[0,0,2,0,213618],
    [0,1,0,0,-185116],[0,0,0,2,-114332],[2,0,-2,0,58793],[2,-1,-1,0,57066],
    [2,0,1,0,53322],[2,-1,0,0,45758],[0,1,-1,0,-40923],[1,0,0,0,-34720],
    [0,1,1,0,-30383],[2,0,0,-2,15327],[0,0,1,2,-12528],[0,0,1,-2,10980],
    [4,0,-1,0,10675],[0,0,3,0,10034],[4,0,-2,0,8548],[2,1,-1,0,-7888],
    [2,1,0,0,-6766],[1,0,-1,0,-5163],[1,1,0,0,4987],[2,-1,1,0,4036],
    [2,0,2,0,3994],[4,0,0,0,3861],[2,0,-3,0,3665],[0,1,-2,0,-2689],
    [2,0,-1,2,-2602],[2,-1,-2,0,2390],[1,0,1,0,-2348],[2,-2,0,0,2236],
    [0,1,2,0,-2120],[0,2,0,0,-2069],[2,-2,-1,0,2048],[2,0,1,-2,-1773],
    [2,0,0,2,-1595],[4,-1,-1,0,1215],[0,0,2,2,-1110],[3,0,-1,0,-892],
    [2,1,1,0,-810],[4,-1,-2,0,759],[0,2,-1,0,-713],[2,2,-1,0,-700],
    [2,1,-2,0,691],[2,-1,0,-2,596],[4,0,1,0,549],[0,0,4,0,537],
    [4,-1,0,0,520],[1,0,-2,0,-487],[2,1,0,-2,-399],[0,0,2,-2,-381],
    [1,1,1,0,351],[3,0,-2,0,-340],[4,0,-3,0,330],[2,-1,2,0,327],
    [0,2,1,0,-323],[1,1,-1,0,299],[2,0,3,0,294],
]

def moon(JD):
    t = T(JD)
    Lp = n360(218.3165 + 481267.8813*t)
    M  = n360(357.5291 + 35999.0503*t)
    Mp = n360(134.9634 + 477198.8676*t)
    F  = n360(93.2721  + 483202.0175*t)
    D  = n360(297.8502 + 445267.1115*t)
    E  = 1 - 2.516e-3*t - 7.4e-6*t*t
    Lr,Mr,Mpr,Fr,Dr = [rad(x) for x in [Lp,M,Mp,F,D]]
    sL = 0
    for D_,M_,Mp_,F_,cl in MOON_TBL:
        Ef = E if abs(M_)==1 else (E*E if abs(M_)==2 else 1)
        sL += Ef*cl*math.sin(D_*Dr + M_*Mr + Mp_*Mpr + F_*Fr)
    A1 = rad(n360(119.75 + 131.849*t))
    A2 = rad(n360(53.09 + 479264.29*t))
    sL += 3958*math.sin(A1) + 1962*math.sin(Lr-Fr) + 318*math.sin(A2)
    om  = rad(n360(125.0445 - 1934.1363*t))
    slon = sun(JD)[0]
    dn  = (-17.2*math.sin(om) - 1.32*math.sin(2*rad(slon))
           - 0.23*math.sin(2*Mpr) + 0.21*math.sin(2*om)) / 3600
    return n360(Lp + sL/1e6 + dn)


# ══════════════════════════════════════════════════════════════════════════════
# VSOP87 OUTER PLANETS
# ══════════════════════════════════════════════════════════════════════════════

VSOP_DATA = {
    "venus":{
        "L":[[[317614667,0,0],[1353968,5.5931332,10213.2855462],[89892,5.3065,20426.571],
              [5477,4.4163,7860.419],[3456,2.6996,11790.629],[2372,2.9938,3930.210],
              [1664,4.2502,1577.344],[1438,4.1575,9153.904],[1317,5.1867,26.298],
              [761,1.950,529.691],[708,1.065,775.523]],
             [[1021352943052,0,0],[95708,2.46424,10213.2855462],[14445,0.51625,20426.571],
              [213,1.795,30639.857],[174,2.655,26.298],[152,6.106,1577.344]],
             [[54127,0,0],[3891,0.3451,10213.2855462],[1338,2.0201,20426.571]]],
        "R":[[[72334821,0,0],[489824,4.021518,10213.2855462],[1658,4.9021,20426.571],
              [1632,2.8455,7860.419],[1378,1.1285,11790.629],[498,2.587,9153.904],
              [374,1.423,3930.210]],
             [[34551,0.89199,10213.2855462],[234,1.772,20426.571],[234,3.142,0.0]]]},
    "mars":{
        "L":[[[620347711,0,0],[18656368,5.0503942,3340.6124267],[1108217,5.4009984,6681.2248534],
              [91798,5.7527,10021.8372],[27745,5.9705,5621.8429],[12316,0.8147,2810.9215],
              [10610,2.9281,2281.2305],[8927,4.1574,0.0173],[8716,6.2450,13362.4497],
              [7775,3.3397,5884.9268],[3575,1.6619,2544.3144],[2512,3.2172,1751.5395],
              [2468,4.0158,3344.1355]],
             [[334085627474,0,0],[1458227,3.6042605,3340.6124267],[164901,3.926313,6681.2248534],
              [19963,4.26594,10021.8372],[3452,4.7321,3337.0893],[2485,4.6115,13362.4497],
              [842,4.459,2281.231],[538,5.016,398.149]]],
        "R":[[[153033488,0,0],[14184953,3.4800426,3340.6124267],[660776,3.8178,6681.2249],
              [46179,4.1518,10021.8373],[8109,5.5561,2810.9215],[7485,1.7724,5621.8429],
              [5765,0.0,0.0],[5726,0.8801,2281.2305]],
             [[1107433,2.0325052,3340.6124267],[103176,2.3707,6681.2248534],
              [12877,0,0],[10816,2.7089,10021.8372]]]},
    "jupiter":{
        "L":[[[59954691,0,0],[9695899,5.0619179,529.6909651],[573610,1.44407,7.1135498],
              [306389,5.41711,1059.38193],[97178,4.14264,632.78374],[72903,3.64043,522.57742],
              [64264,3.41145,103.09277],[39806,2.29377,419.48462],[38858,1.27232,316.39187],
              [27965,1.78455,536.80451],[13025,5.38054,1589.0729],[12350,5.663,1162.4747],
              [10830,0.250,846.08283],[10677,4.440,2118.76386]],
             [[52993480757,0,0],[489741,4.2202441,529.6909651],[228919,6.0261793,7.1135498],
              [27655,4.57266,1059.38193],[20721,5.45939,522.57742],[12106,0.16986,536.80451],
              [6068,4.4294,103.09277],[5765,2.5428,419.48462],[4398,4.9891,632.78374]]],
        "R":[[[520887429,0,0],[25209327,3.4910565,529.6909651],[610600,3.840,1059.38193],
              [282029,2.575,632.78374],[187647,2.076,522.57742],[86793,0.710,419.48462],
              [72063,0.215,536.80451],[65517,5.972,316.39187],[30135,2.161,949.17561]],
             [[1271802,2.6493751,529.6909651],[61662,3.001,1059.38193],
              [53444,3.897,632.78374],[41390,0,0]]]},
    "saturn":{
        "L":[[[87401354,0,0],[11107660,3.9620509,213.2990954],[1414151,4.5858152,7.1135498],
              [398379,0.52121,206.18554],[350769,3.30330,426.59819],[206816,0.24635,103.09277],
              [79271,3.84007,220.41264],[23990,4.66977,110.20632],[16574,0.43719,419.48462],
              [15820,0.93809,632.78374],[15054,2.71670,639.89729],[13005,5.98119,11.04570],
              [12726,1.18947,323.50542]],
             [[21354295596,0,0],[1296855,1.8282054,213.2990954],[564348,2.88522,7.11355],
              [107679,2.27769,206.18554],[98323,1.08020,426.59819],[40255,2.04256,220.41264],
              [19942,1.27955,103.09277],[10512,2.7488,14.227]],
             [[116441,2.0991,213.29910],[91141,0.071,0],[90592,1.90982,426.59819]]],
        "R":[[[955758136,0,0],[52921382,2.3940820,213.2990954],[1873680,5.0309330,426.59819],
              [1464664,1.6477810,7.11355],[821891,5.93524,206.18554],[547507,5.01543,103.09277],
              [371684,2.27169,220.41264],[131990,5.37452,110.20632]],
             [[6182981,0.255959,213.2990954],[506578,0.71110,426.59819],[341394,5.79594,0],
              [188491,0.47285,206.18554],[186262,3.14139,220.41264],[143891,1.40770,7.11355]]]},
    "uranus":{
        "L":[[[548129294,0,0],[9260408,0.8910642,74.7815986],[1504248,3.6271926,1.4844727],
              [365982,1.899622,73.2971252],[272328,3.358237,149.5631971],[70328,5.39254,63.7358799],
              [68893,6.09292,76.2660713],[61999,2.26952,2.9689454],[61951,2.85099,11.045698],
              [26469,3.14152,71.8126516],[25711,6.11380,454.9093839],[21079,4.36059,148.0787258],
              [17819,1.74437,36.6485723],[14613,4.73732,3.9321532],[11163,5.82682,224.3447957],
              [10998,0.48865,138.5174968],[9527,2.9552,35.1641089],[7599,0.0518,77.7504847]],
             [[7502543122,0,0],[154458,5.242017,74.781599],[24456,1.71256,1.48447],
              [9258,0.42084,11.04570],[8190,5.9124,149.5632],[6462,0.7645,70.32818],
              [4421,3.4926,74.7816],[4132,0.71,76.2661]]],
        "R":[[[1921264848,0,0],[88784984,5.6007707,74.7815986],[3440836,0.3285049,73.2971252],
              [2055653,1.7829367,149.5631971],[649322,4.522473,76.2660713],[639514,5.655712,1.4844727],
              [401643,3.462203,224.3447957],[261907,2.964929,63.7358799],[228804,3.140492,11.045698],
              [180518,4.730117,35.1641089],[177262,3.124909,148.0787258],[138468,4.052399,454.9093839]],
             [[1479896,3.672,74.7816],[71212,6.222,149.5632],[28185,3.063,76.2661],
              [26558,4.595,73.2971],[19122,0,0]]]},
    "neptune":{
        "L":[[[531188633,0,0],[1798476,2.9010127,38.1330356],[1019729,0.485826,1.4844727],
              [124532,4.83008,36.6485723],[42064,5.41055,2.9689454],[37715,6.09222,35.1641089],
              [33785,1.24489,76.2660713],[16483,8e-5,491.5579295],[9199,4.9375,175.1660598],
              [8994,0.2746,39.6175402],[4216,1.9871,73.2971250]],
             [[3837687717,0,0],[16604,4.86319,1.48447],[15807,2.27923,38.13304],
              [3335,3.6848,76.2661],[1306,3.6732,2.9690],[605,1.505,35.1641],[461,2.381,491.5579]]],
        "R":[[[3007013206,0,0],[27062259,1.3199491,38.1330356],[1691764,3.2518614,36.6485723],
              [807831,5.185948,1.4844727],[537761,4.521139,35.1641089],[495258,3.998429,39.6175402],
              [274208,2.462354,2.9689454],[135134,3.372206,76.2660713],[121800,5.797544,74.7815884]],
             [[236339,0.70483,38.1330356],[13220,3.32015,1.48447],[8622,6.2163,35.1641]]]},
}

def vsop_geo(planet_name, JD):
    d = VSOP_DATA[planet_name]; t = tau(JD)
    Lp = n360(deg(sum(vs(layer,t)*t**i for i,layer in enumerate(d["L"]))*1e-8))
    Rp = sum(vs(layer,t)*t**i for i,layer in enumerate(d["R"]))*1e-8
    Le,Re = earth(JD)
    xp = Rp*math.cos(rad(Lp)); yp = Rp*math.sin(rad(Lp))
    xe = Re*math.cos(rad(Le)); ye = Re*math.sin(rad(Le))
    return n360(deg(math.atan2(yp-ye, xp-xe)))


# ══════════════════════════════════════════════════════════════════════════════
# MERCURY (Kepler)
# ══════════════════════════════════════════════════════════════════════════════

ELT_MERCURY = {
    "L":[252.250906,149472.6746358,3.035e-4,0], "a":0.38709831,
    "e":[0.20563175,2.0407e-5,-2.83e-8],
    "i":[7.004986,-5.9516e-3], "om":[77.456119,0.15886,-1.342e-5],
    "Om":[48.330893,-0.12542,-8.833e-5],
}

def mercury(JD):
    t = T(JD); el = ELT_MERCURY
    def poly(c,x): return sum(v*x**i for i,v in enumerate(c))
    L   = n360(poly(el["L"],t)); ecc = poly(el["e"],t)
    incl = rad(poly(el["i"],t)); om  = rad(n360(poly(el["om"],t)))
    Om  = rad(n360(poly(el["Om"],t))); M   = rad(n360(L - deg(om)))
    E = M + ecc*math.sin(M)*(1+ecc*math.cos(M))
    for _ in range(50):
        dE = (M + ecc*math.sin(E) - E)/(1 - ecc*math.cos(E)); E += dE
        if abs(dE) < 1e-12: break
    nu = 2*math.atan2(math.sqrt(1+ecc)*math.sin(E/2), math.sqrt(1-ecc)*math.cos(E/2))
    r  = el["a"]*(1 - ecc*math.cos(E)); w = om - Om
    x  = r*(math.cos(Om)*math.cos(nu+w) - math.sin(Om)*math.sin(nu+w)*math.cos(incl))
    y  = r*(math.sin(Om)*math.cos(nu+w) + math.cos(Om)*math.sin(nu+w)*math.cos(incl))
    sL,sR = sun(JD); Le = rad(n360(sL+180))
    return n360(deg(math.atan2(y-sR*math.sin(Le), x-sR*math.cos(Le))))


# ══════════════════════════════════════════════════════════════════════════════
# SLOW BODIES
# ══════════════════════════════════════════════════════════════════════════════

def node(JD):
    t = T(JD)
    return n360(125.04452 - 1934.136261*t + 2.0708e-3*t*t + t*t*t/450000)


def true_node(JD):
    """
    True lunar ascending node (mean node + short-period terms), degrees.
    Uses standard low-order periodic correction suitable for ephemerides display.
    """
    t = T(JD)
    Om = node(JD)

    D = n360(297.8501921 + 445267.1114034*t - 0.0018819*t*t + (t*t*t)/545868.0 - (t*t*t*t)/113065000.0)
    M = n360(357.5291092 + 35999.0502909*t - 0.0001536*t*t + (t*t*t)/24490000.0)
    Mp = n360(134.9633964 + 477198.8675055*t + 0.0087414*t*t + (t*t*t)/69699.0 - (t*t*t*t)/14712000.0)
    F = n360(93.2720950 + 483202.0175233*t - 0.0036539*t*t - (t*t*t)/3526000.0 + (t*t*t*t)/863310000.0)

    corr = (
        -1.4979 * math.sin(rad(2 * (D - F)))
        -0.1500 * math.sin(rad(M))
        -0.1226 * math.sin(rad(2 * D))
        +0.1176 * math.sin(rad(2 * F))
        -0.0801 * math.sin(rad(2 * (Mp - F)))
    )

    return n360(Om + corr)

def lilith(JD):
    t = T(JD)
    return n360(83.3532 + 4069.0137*t - 0.01032*t*t - t*t*t/80053 + 180)

def lilith_true(JD):
    """True (Oscillating/Osculating) Black Moon Lilith via Swiss Ephemeris."""
    if _SE_OK:
        r = _se.calc_body(JD, "lilith_true")
        if r is not None:
            return r["lon"]
    return lilith(JD)  # fallback to mean

def lilith_interpolated(JD):
    """Interpolated Lilith (Dieter Koch method): midpoint of Mean and True."""
    m = lilith(JD)
    t = lilith_true(JD)
    diff = (t - m + 180) % 360 - 180
    return n360(m + diff / 2.0)

def calc_lilith_extended(JD):
    """Return all three Lilith types with full sign/deg metadata."""
    def _fmt(lon):
        s_idx = int(lon / 30)
        d_in  = lon % 30.0
        return {
            "lon":         round(lon, 4),
            "sign":        SIGN_NAMES[s_idx],
            "deg_in_sign": round(d_in, 4),
            "deg_min":     f"{int(d_in)}°{int((d_in % 1) * 60):02d}'",
        }
    return {
        "mean":         _fmt(lilith(JD)),
        "true":         _fmt(lilith_true(JD)),
        "interpolated": _fmt(lilith_interpolated(JD)),
    }

def calc_asteroids(JD):
    """Return positions of Ceres, Pallas, Juno, Vesta, Eros, Psyche."""
    result = {}
    def _make_entry(r):
        lon = r["lon"]
        s_idx = int(lon / 30)
        d_in  = lon % 30.0
        return {
            "lon":         round(lon, 4),
            "sign":        SIGN_NAMES[s_idx],
            "deg_in_sign": round(d_in, 4),
            "deg_min":     f"{int(d_in)}°{int((d_in % 1) * 60):02d}'",
            "retrograde":  r.get("retrograde", False),
            "speed":       round(r.get("speed", 0), 4),
        }
    for name in ("ceres", "pallas", "juno", "vesta"):
        if _SE_OK:
            r = _se.calc_body(JD, name)
            if r is not None:
                result[name] = _make_entry(r)
                continue
        result[name] = None
    # Numbered asteroids
    for aname, anum in (("eros", 433), ("psyche", 16)):
        if _SE_OK:
            r = _se.calc_asteroid(JD, anum)
            if r is not None:
                result[aname] = _make_entry(r)
                continue
        result[aname] = None
    return result

PLUTO_TBL = [
    [2422324.5,99.20],[2424151.5,109.00],[2425977.5,118.50],[2427803.5,124.70],[2429629.5,130.00],
    [2431456.5,155.00],[2433282.5,177.50],[2434012.5,166.50],[2434743.5,168.20],[2435473.5,168.50],
    [2436204.5,170.00],[2436934.5,163.10],[2437665.5,165.80],[2438395.5,167.80],[2439126.5,170.70],
    [2439856.5,172.00],[2440587.5,174.00],[2441317.5,176.80],[2442048.5,179.50],[2442778.5,185.70],
    [2443144.5,188.20],[2443509.5,190.80],[2443874.5,193.40],[2444097.9,197.00],[2444239.5,195.00],
    [2444605.5,196.00],[2444970.5,197.20],[2445335.5,199.00],[2445700.5,200.30],[2446066.5,202.00],
    [2446431.5,204.40],[2446656.3,214.77],[2446796.5,207.00],[2447161.5,209.70],[2447527.5,211.50],
    [2447892.5,213.50],[2448622.5,218.00],[2449353.5,221.80],[2450083.5,233.00],[2450814.5,244.00],
    [2451544.5,251.30],[2452275.5,257.00],[2453005.5,261.60],[2453736.5,265.70],[2454466.5,270.30],
    [2455197.5,273.70],[2455927.5,277.50],[2456658.5,281.20],[2457388.5,285.10],[2458119.5,289.00],
    [2458849.5,292.70],[2459580.5,296.00],[2460310.5,299.70],[2461041.5,304.50],[2461771.5,308.00],
    [2462502.5,310.00],
]

def pluto(JD):
    for i in range(len(PLUTO_TBL)-1):
        j0,l0 = PLUTO_TBL[i]; j1,l1 = PLUTO_TBL[i+1]
        if j0 <= JD < j1:
            return n360(l0 + (JD-j0)/(j1-j0)*(l1-l0))
    j0,l0 = PLUTO_TBL[-2]; j1,l1 = PLUTO_TBL[-1]
    return n360(l0 + (JD-j0)/(j1-j0)*(l1-l0))

CHIRON_TBL = [
    [2440587.5,4.217],[2442778.5,26.917],[2444097.9,43.900],[2444240.5,47.917],[2444971.0,56.983],
    [2445701.0,66.217],[2446432.0,74.033],[2446656.0,80.117],[2447161.5,85.633],[2447893.0,90.4],
    [2448623.0,105.1],[2450084.5,157.117],[2451544.5,251.367],[2455197.5,302.183],
    [2458849.5,364.017],[2462451.5,386.9],[2466053.5,409.8],
]

def chiron(JD):
    for i in range(len(CHIRON_TBL)-1):
        j0,l0 = CHIRON_TBL[i]; j1,l1 = CHIRON_TBL[i+1]
        if j0 <= JD < j1:
            return n360(l0 + (JD-j0)/(j1-j0)*(l1-l0))
    j0,l0 = CHIRON_TBL[-2]; j1,l1 = CHIRON_TBL[-1]
    return n360(l0 + (JD-j0)/(j1-j0)*(l1-l0))


# ══════════════════════════════════════════════════════════════════════════════
# PLANET DISPATCH
# ══════════════════════════════════════════════════════════════════════════════

PLANET_FUNCS = {
    "sun":     lambda JD: sun(JD)[0],
    "moon":    moon,
    "mercury": mercury,
    "venus":   lambda JD: vsop_geo("venus", JD),
    "mars":    lambda JD: vsop_geo("mars", JD),
    "jupiter": lambda JD: vsop_geo("jupiter", JD),
    "saturn":  lambda JD: vsop_geo("saturn", JD),
    "uranus":  lambda JD: vsop_geo("uranus", JD),
    "neptune": lambda JD: vsop_geo("neptune", JD),
    "pluto":   pluto,
    "node":    node,
    "lilith":  lilith,
    "chiron":  chiron,
}

PLANET_ORDER = ["sun","moon","mercury","venus","mars","jupiter","saturn",
                "uranus","neptune","pluto","node","lilith","chiron"]

def calc_planets(JD):
    """Return dict {planet: longitude_degrees} for all bodies in PLANET_ORDER.
    Uses Swiss Ephemeris (sub-arcsecond) when available, falls back to VSOP87/Meeus."""
    if _SE_OK:
        results = {}
        for p in PLANET_ORDER:
            r = _se.calc_body(JD, p)
            results[p] = r["lon"] if r is not None else PLANET_FUNCS[p](JD)
        return results
    return {p: PLANET_FUNCS[p](JD) for p in PLANET_ORDER}


# ══════════════════════════════════════════════════════════════════════════════
# RETROGRADE
# ══════════════════════════════════════════════════════════════════════════════

RETROGRADE_BODIES = {"mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto","chiron"}

def is_retrograde(planet_name, JD):
    """True if planet is moving retrograde at JD (ecliptic longitude decreasing)."""
    if planet_name not in RETROGRADE_BODIES:
        return False
    if _SE_OK:
        r = _se.calc_body(JD, planet_name)
        if r is not None:
            return r["retrograde"]
    f = PLANET_FUNCS.get(planet_name)
    if not f: return False
    lon1 = f(JD); lon2 = f(JD + 0.5)
    diff = lon2 - lon1
    if diff > 180: diff -= 360
    if diff < -180: diff += 360
    return diff < 0


# ══════════════════════════════════════════════════════════════════════════════
# HOUSE SYSTEMS
# ══════════════════════════════════════════════════════════════════════════════

def obliquity(JD):
    return at.true_obliquity(JD)

def nutation(JD):
    return at.nutation(JD)

def gmst(JD):
    return at.gmst(JD)

def gast(JD):
    return at.gast(JD)

def _mc_asc(JD, lat, lon):
    """Compute MC and ASC."""
    eps = obliquity(JD)
    ramc = n360(gast(JD) + lon)
    e,phi,ra = rad(eps), rad(lat), rad(ramc)
    mc  = n360(deg(math.atan2(math.sin(ra), math.cos(ra)*math.cos(e))))
    asc = n360(deg(math.atan2(math.cos(ra), -(math.sin(e)*math.tan(phi)+math.cos(e)*math.sin(ra)))))
    return mc, asc, ramc, eps

def houses_placidus(JD, lat, lon):
    """Placidus 12-cusp house system."""
    mc, asc, ramc, eps = _mc_asc(JD, lat, lon)
    e, phi = rad(eps), rad(lat)

    def cusp(frac, sign):
        L = n360(ramc + sign*frac*90)
        for _ in range(300):
            L = n360(L)
            sinL,cosL = math.sin(rad(L)), math.cos(rad(L))
            sinD = math.sin(e)*sinL
            if abs(sinD) >= 1: L += sign*0.5; continue
            decl = math.asin(sinD)
            tpt  = math.tan(phi)*math.tan(decl)
            if abs(tpt) > 1: L += sign*0.5; continue
            dsa = deg(math.acos(-tpt))
            RA  = n360(deg(math.atan2(sinL*math.cos(e), cosL)))
            md  = n360(RA - ramc)
            if md > 180: md -= 360
            diff = sign*frac*dsa - md
            if abs(diff) < 1e-9: break
            L = n360(L + diff*0.9)
        return n360(L)

    h11 = cusp(1/3,  1); h12 = cusp(2/3,  1)
    h8  = cusp(2/3, -1); h9  = cusp(1/3, -1)
    ic  = n360(mc + 180); dsc = n360(asc + 180)
    return {
        "h1":asc, "h2":n360(h8+180), "h3":n360(h9+180), "h4":ic,
        "h5":n360(h11+180), "h6":n360(h12+180), "h7":dsc,
        "h8":h8, "h9":h9, "h10":mc, "h11":h11, "h12":h12,
    }

def houses_equal(JD, lat, lon):
    """Equal house system (ASC + 30° per house)."""
    mc, asc, _, _ = _mc_asc(JD, lat, lon)
    return {f"h{i+1}": n360(asc + i*30) for i in range(12)} | {"h10": mc}

def houses_whole_sign(JD, lat, lon):
    """Whole sign house system."""
    mc, asc, _, _ = _mc_asc(JD, lat, lon)
    h1_start = sign_idx(asc) * 30
    return {f"h{i+1}": n360(h1_start + i*30) for i in range(12)} | {"h10": mc}

def houses_porphyry(JD, lat, lon):
    """Porphyry house system (trisect each quadrant)."""
    mc, asc, _, _ = _mc_asc(JD, lat, lon)
    ic  = n360(mc + 180); dsc = n360(asc + 180)
    def trisect(start, end):
        span = n360(end - start)
        return n360(start + span/3), n360(start + 2*span/3)
    h11,h12 = trisect(mc, asc)
    h2,h3   = trisect(asc, ic)
    h5,h6   = trisect(ic, dsc)
    h8,h9   = trisect(dsc, mc)
    return {"h1":asc,"h2":h2,"h3":h3,"h4":ic,"h5":h5,"h6":h6,
            "h7":dsc,"h8":h8,"h9":h9,"h10":mc,"h11":h11,"h12":h12}

def _ecliptic_ra(lon, eps):
    """Ecliptic longitude → Right Ascension (ecliptic lat=0)."""
    return n360(deg(math.atan2(math.sin(rad(lon))*math.cos(rad(eps)), math.cos(rad(lon)))))

def _ecliptic_dec(lon, eps):
    """Ecliptic longitude → Declination."""
    return deg(math.asin(max(-1,min(1, math.sin(rad(lon))*math.sin(rad(eps))))))

def _oblique_ascension(lon, eps, lat):
    ra  = _ecliptic_ra(lon, eps)
    dec = _ecliptic_dec(lon, eps)
    tpd = math.tan(rad(dec))*math.tan(rad(lat))
    if abs(tpd) > 1: return None  # circumpolar
    ad = deg(math.asin(tpd))
    return n360(ra - ad)

def houses_koch(JD, lat, lon):
    """Koch (Birthplace) house system via oblique ascension iteration."""
    mc, asc, ramc, eps = _mc_asc(JD, lat, lon)
    ic = n360(mc+180); dsc = n360(asc+180)

    def find_cusp(target_oa):
        """Find ecliptic longitude whose oblique ascension = target_oa at lat."""
        L = target_oa
        for _ in range(150):
            oa = _oblique_ascension(L, eps, lat)
            if oa is None: L = n360(L + 1); continue
            diff = n360(oa - target_oa)
            if diff > 180: diff -= 360
            if abs(diff) < 1e-8: break
            L = n360(L - diff*0.85)
        return n360(L)

    # Koch: house cusps derived from RAMC ± 30° offsets via OA
    h11 = find_cusp(n360(ramc + 30))
    h12 = find_cusp(n360(ramc + 60))
    h2  = find_cusp(n360(ramc + 120))
    h3  = find_cusp(n360(ramc + 150))
    # Below-horizon: use descension (OD = RA + AD)
    def find_cusp_below(target_oa):
        L = target_oa
        for _ in range(150):
            oa = _oblique_ascension(L, eps, lat)
            if oa is None: L = n360(L+1); continue
            diff = n360(oa - target_oa)
            if diff > 180: diff -= 360
            if abs(diff) < 1e-8: break
            L = n360(L - diff*0.85)
        return n360(L)
    h8  = n360(h2 + 180); h9  = n360(h3 + 180)
    h5  = n360(h11+ 180); h6  = n360(h12+ 180)
    return {"h1":asc,"h2":h2,"h3":h3,"h4":ic,"h5":h5,"h6":h6,
            "h7":dsc,"h8":h8,"h9":h9,"h10":mc,"h11":h11,"h12":h12}

HOUSE_SYSTEMS = {
    "placidus":   houses_placidus,
    "equal":      houses_equal,
    "whole_sign": houses_whole_sign,
    "porphyry":   houses_porphyry,
    "koch":       houses_koch,
}

def calc_houses(JD, lat, lon, system="placidus"):
    fn = HOUSE_SYSTEMS.get(system.lower(), houses_placidus)
    return fn(JD, lat, lon)

def planet_in_house(planet_lon, houses):
    """Return house number (1-12) containing the planet."""
    for i in range(12):
        h_start = houses[f"h{i+1}"]
        h_end   = houses[f"h{(i%12)+1}"] if i < 11 else houses["h1"]
        span    = n360(h_end - h_start)
        dist    = n360(planet_lon - h_start)
        if dist < span:
            return i + 1
    # Fallback: nearest cusp
    best, best_h = 360, 1
    for i in range(12):
        d = n360(planet_lon - houses[f"h{i+1}"])
        if d < best: best, best_h = d, i+1
    return best_h


# ══════════════════════════════════════════════════════════════════════════════
# ASPECTS
# ══════════════════════════════════════════════════════════════════════════════

ASPECT_DEFS = {
    "conjunction":    (0,   8.0, "☌"),
    "sextile":        (60,  6.0, "⚹"),
    "square":         (90,  8.0, "□"),
    "trine":          (120, 8.0, "△"),
    "opposition":     (180, 8.0, "☍"),
    "semi_sextile":   (30,  2.0, "⚺"),
    "semi_square":    (45,  2.0, "∠"),
    "quintile":       (72,  2.0, "Q"),
    "sesquiquadrate": (135, 2.0, "⚼"),
    "biquintile":     (144, 2.0, "bQ"),
    "quincunx":       (150, 3.0, "⚻"),
}

def _angle_diff(lon1, lon2):
    """Shortest arc between two longitudes (0-180)."""
    d = abs(lon1 - lon2) % 360
    return 360 - d if d > 180 else d

def calc_aspects(planets_dict, custom_orbs=None, decls_dict=None, parallel_orb=1.0):
    """Compute all aspects (longitude + declination-based) between planets."""
    orbs = {k: v for k, (v, o, _) in ASPECT_DEFS.items()}
    if custom_orbs:
        orbs.update(custom_orbs)

    names = list(planets_dict.keys())
    results = []

    # Longitude-based aspects
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            p1, p2 = names[i], names[j]
            diff = _angle_diff(planets_dict[p1], planets_dict[p2])
            best, best_dev = None, float("inf")
            for asp_name, (asp_angle, asp_orb, glyph) in ASPECT_DEFS.items():
                orb_val = orbs.get(asp_name, asp_orb)
                deviation = abs(diff - asp_angle)
                if deviation <= orb_val and deviation < best_dev:
                    best_dev = deviation
                    best = (asp_name, asp_angle, deviation, diff - asp_angle, glyph)
            if best:
                asp_name, asp_angle, deviation, exact, glyph = best
                results.append({
                    "p1": p1, "p2": p2, "aspect": asp_name,
                    "glyph": glyph, "angle": asp_angle,
                    "orb": round(deviation, 2),
                    "exact_diff": round(exact, 2),
                    "applying": exact < 0,
                })

    # Declination-based aspects (parallels / contra-parallels)
    if decls_dict:
        for i in range(len(names)):
            for j in range(i + 1, len(names)):
                p1, p2 = names[i], names[j]
                d1 = decls_dict.get(p1)
                d2 = decls_dict.get(p2)
                if d1 is None or d2 is None:
                    continue
                # Parallel: same declination direction, nearly equal magnitude
                diff_par = abs(d1 - d2)
                # Contra-parallel: opposite directions, nearly equal magnitude
                diff_cp  = abs(abs(d1) - abs(d2))
                same_sign = (d1 >= 0) == (d2 >= 0)
                if same_sign and diff_par <= parallel_orb:
                    results.append({
                        "p1": p1, "p2": p2, "aspect": "parallel",
                        "glyph": "\u2225", "angle": 0,
                        "orb": round(diff_par, 2),
                        "exact_diff": round(d1 - d2, 2),
                        "applying": None,
                    })
                elif not same_sign and diff_cp <= parallel_orb:
                    results.append({
                        "p1": p1, "p2": p2, "aspect": "contra_parallel",
                        "glyph": "\u22bc", "angle": 180,
                        "orb": round(diff_cp, 2),
                        "exact_diff": round(abs(d1) - abs(d2), 2),
                        "applying": None,
                    })

    return results


# ══════════════════════════════════════════════════════════════════════════════
# ASPECT PATTERNS
# ══════════════════════════════════════════════════════════════════════════════

def calc_patterns(planets_dict, aspects):
    """Detect classic aspect patterns."""
    asp_map = {}
    for a in aspects:
        asp_map[(a["p1"], a["p2"])] = a["aspect"]
        asp_map[(a["p2"], a["p1"])] = a["aspect"]

    def has(p1, p2, asp): return asp_map.get((p1,p2)) == asp or asp_map.get((p2,p1)) == asp
    ns = list(planets_dict.keys())
    patterns = []

    # Stellium: 3+ planets all conjunct each other
    for i in range(len(ns)):
        for j in range(i+1, len(ns)):
            for k in range(j+1, len(ns)):
                if has(ns[i],ns[j],"conjunction") and has(ns[j],ns[k],"conjunction") and has(ns[i],ns[k],"conjunction"):
                    patterns.append({"type":"stellium","planets":[ns[i],ns[j],ns[k]]})

    # Grand Trine
    for i in range(len(ns)):
        for j in range(i+1, len(ns)):
            for k in range(j+1, len(ns)):
                if has(ns[i],ns[j],"trine") and has(ns[j],ns[k],"trine") and has(ns[i],ns[k],"trine"):
                    patterns.append({"type":"grand_trine","planets":[ns[i],ns[j],ns[k]]})

    # T-square: p1 opp p2, both squared by focal
    for i in range(len(ns)):
        for j in range(i+1, len(ns)):
            if has(ns[i],ns[j],"opposition"):
                for k in range(len(ns)):
                    if k==i or k==j: continue
                    if has(ns[k],ns[i],"square") and has(ns[k],ns[j],"square"):
                        patterns.append({"type":"t_square","axis":[ns[i],ns[j]],"focal":ns[k]})

    # Grand Cross: 2 oppositions + 4 squares
    for i in range(len(ns)):
        for j in range(i+1, len(ns)):
            for k in range(j+1, len(ns)):
                for l in range(k+1, len(ns)):
                    ps = [ns[i],ns[j],ns[k],ns[l]]
                    combos = [([ps[0],ps[2]],[ps[1],ps[3]],[(ps[0],ps[1]),(ps[1],ps[2]),(ps[2],ps[3]),(ps[3],ps[0])]),
                              ([ps[0],ps[1]],[ps[2],ps[3]],[(ps[0],ps[2]),(ps[2],ps[1]),(ps[1],ps[3]),(ps[3],ps[0])]),
                              ([ps[0],ps[3]],[ps[1],ps[2]],[(ps[0],ps[1]),(ps[1],ps[3]),(ps[3],ps[2]),(ps[2],ps[0])])]
                    for opp1,opp2,sqs in combos:
                        if (has(opp1[0],opp1[1],"opposition") and has(opp2[0],opp2[1],"opposition")
                                and all(has(a,b,"square") for a,b in sqs)):
                            patterns.append({"type":"grand_cross","planets":ps}); break

    # Yod: p1 sextile p2, both quincunx apex
    for i in range(len(ns)):
        for j in range(i+1, len(ns)):
            if has(ns[i],ns[j],"sextile"):
                for k in range(len(ns)):
                    if k==i or k==j: continue
                    if has(ns[i],ns[k],"quincunx") and has(ns[j],ns[k],"quincunx"):
                        patterns.append({"type":"yod","base":[ns[i],ns[j]],"apex":ns[k]})

    # Kite: Grand Trine + opposition from one trine point to outer
    gt_planets = [p["planets"] for p in patterns if p["type"]=="grand_trine"]
    for gt in gt_planets:
        for p in gt:
            for outer in ns:
                if outer in gt: continue
                opp_to = [x for x in gt if x != p]
                if has(outer,p,"opposition") and has(outer,opp_to[0],"sextile") and has(outer,opp_to[1],"sextile"):
                    patterns.append({"type":"kite","grand_trine":gt,"spine":p,"kite_point":outer})

    # Mystic Rectangle: 2 trines + 2 sextiles + 2 oppositions
    for i in range(len(ns)):
        for j in range(i+1, len(ns)):
            for k in range(j+1, len(ns)):
                for l in range(k+1, len(ns)):
                    ps = [ns[i],ns[j],ns[k],ns[l]]
                    combos = [[(ps[0],ps[2]),(ps[1],ps[3]),(ps[0],ps[1]),(ps[2],ps[3]),(ps[0],ps[3]),(ps[1],ps[2])]]
                    for combo in combos:
                        opps,sxts,trns = combo[:2],combo[2:4],combo[4:]
                        if (all(has(a,b,"opposition") for a,b in opps)
                                and all(has(a,b,"sextile") for a,b in sxts)
                                and all(has(a,b,"trine") for a,b in trns)):
                            patterns.append({"type":"mystic_rectangle","planets":ps})

    # Deduplicate
    seen = set(); unique = []
    for p in patterns:
        key = (p["type"], frozenset(p.get("planets", p.get("axis", []) + [p.get("focal","")])))
        if key not in seen: seen.add(key); unique.append(p)
    return unique


# ══════════════════════════════════════════════════════════════════════════════
# DIGNITIES
# ══════════════════════════════════════════════════════════════════════════════

# (domicile_signs, exalt_sign, exalt_deg, detriment_signs, fall_sign, fall_deg)
DIGNITY_TABLE = {
    "sun":     (["leo"],                 "aries",       19, ["aquarius"],          "libra",       19),
    "moon":    (["cancer"],              "taurus",       3, ["capricorn"],          "scorpio",      3),
    "mercury": (["gemini","virgo"],      "virgo",       15, ["sagittarius","pisces"],"pisces",      15),
    "venus":   (["taurus","libra"],      "pisces",      27, ["scorpio","aries"],     "virgo",       27),
    "mars":    (["aries","scorpio"],     "capricorn",   28, ["libra","taurus"],      "cancer",      28),
    "jupiter": (["sagittarius","pisces"],"cancer",      15, ["gemini","virgo"],      "capricorn",   15),
    "saturn":  (["capricorn","aquarius"],"libra",       21, ["cancer","leo"],        "aries",       21),
    "uranus":  (["aquarius"],            "scorpio",      0, ["leo"],                 "taurus",       0),
    "neptune": (["pisces"],              "cancer",       0, ["virgo"],               "capricorn",    0),
    "pluto":   (["scorpio"],             "aries",        0, ["taurus"],              "libra",        0),
}

def calc_dignity(planet_name, planet_lon):
    """Return dignity score and label for a planet at given longitude."""
    if planet_name not in DIGNITY_TABLE:
        return 0, "none"
    dom, exalt_sign, exalt_deg, det, fall_sign, fall_deg = DIGNITY_TABLE[planet_name]
    sign = sign_name(planet_lon)
    deg  = deg_in_sign(planet_lon)

    if sign in dom: return 5, "domicile"
    if sign in det: return -5, "detriment"
    if sign == exalt_sign:
        if abs(deg - exalt_deg) <= 2: return 5, "exaltation (exact)"
        return 4, "exaltation"
    if sign == fall_sign:
        if abs(deg - fall_deg) <= 2: return -5, "fall (exact)"
        return -4, "fall"

    # Triplicity (day ruler, night ruler, participating ruler - simplified)
    TRIPLICITIES = {
        "fire":  (["aries","leo","sagittarius"],    "sun","jupiter","saturn"),
        "earth": (["taurus","virgo","capricorn"],   "venus","moon","mars"),
        "air":   (["gemini","libra","aquarius"],    "saturn","mercury","jupiter"),
        "water": (["cancer","scorpio","pisces"],    "venus","mars","moon"),
    }
    for element, (signs, day_r, night_r, part_r) in TRIPLICITIES.items():
        if sign in signs and planet_name in (day_r, night_r, part_r):
            return 3, f"triplicity ({element})"

    # Ptolemaic Terms (bounded rulerships within sign) — each row:
    # (sign, [(planet, 0-based end_deg_exclusive), ...])
    # Source: Ptolemy / Lilly standard allocation
    _TERMS = {
        "aries":       [("jupiter",6),("venus",14),("mercury",21),("mars",26),("saturn",30)],
        "taurus":      [("venus",8),("mercury",15),("jupiter",22),("saturn",26),("mars",30)],
        "gemini":      [("mercury",7),("jupiter",13),("venus",17),("mars",24),("saturn",30)],
        "cancer":      [("mars",7),("jupiter",13),("mercury",19),("venus",26),("saturn",30)],
        "leo":         [("jupiter",6),("venus",12),("saturn",18),("mercury",24),("mars",30)],
        "virgo":       [("mercury",7),("venus",13),("jupiter",18),("mars",24),("saturn",30)],
        "libra":       [("saturn",6),("mercury",14),("jupiter",21),("venus",28),("mars",30)],
        "scorpio":     [("mars",7),("jupiter",11),("venus",19),("mercury",24),("saturn",30)],
        "sagittarius": [("jupiter",12),("venus",17),("mercury",21),("saturn",26),("mars",30)],
        "capricorn":   [("mercury",7),("jupiter",14),("venus",22),("saturn",26),("mars",30)],
        "aquarius":    [("mercury",7),("venus",13),("jupiter",20),("mars",25),("saturn",30)],
        "pisces":      [("venus",12),("jupiter",16),("mercury",19),("mars",28),("saturn",30)],
    }
    d = deg_in_sign(planet_lon)
    for ruler, end in _TERMS.get(sign, []):
        if d < end:
            if planet_name == ruler:
                return 2, f"term ({sign})"
            break

    # Face / Decan (Chaldean order, 10° each)
    # Chaldean sequence from Mars: ♂☉♀☿☽♄♃ cycling across 36 decans
    _CHALDEAN = ["mars","sun","venus","mercury","moon","saturn","jupiter"]
    # First decan of Aries = Mars (index 0 in sequence); full list indexed by decan number
    _FACE_RULER = [_CHALDEAN[i % 7] for i in range(36)]
    # Decan index = sign_idx * 3 + floor(deg_in_sign / 10)
    decan_idx = sign_idx(planet_lon) * 3 + int(d / 10)
    if planet_name == _FACE_RULER[decan_idx % 36]:
        return 1, f"face (decan {decan_idx % 3 + 1} of {sign})"

    return 0, "peregrine"

def calc_dignities(planets_dict):
    result = {}
    for p, lon in planets_dict.items():
        score, label = calc_dignity(p, lon)
        result[p] = {"score": score, "label": label}
    return result


def essential_dignity_score(planet: str, lon: float) -> int:
    """Summed essential dignity score per Lilly: domicile+5, exalt+4,
    triplicity+3, term+2, face+1, peregrine 0, fall-4, detriment-5."""
    score, _ = calc_dignity(planet, lon)
    return score


# ══════════════════════════════════════════════════════════════════════════════
# LUNAR PHASE
# ══════════════════════════════════════════════════════════════════════════════

PHASE_NAMES = [
    (0,   45,  "New Moon"),
    (45,  90,  "Waxing Crescent"),
    (90,  135, "First Quarter"),
    (135, 180, "Waxing Gibbous"),
    (180, 225, "Full Moon"),
    (225, 270, "Disseminating"),
    (270, 315, "Last Quarter"),
    (315, 360, "Balsamic"),
]

def lunar_phase(JD):
    sun_lon  = sun(JD)[0]
    moon_lon = moon(JD)
    angle    = n360(moon_lon - sun_lon)
    for lo,hi,name in PHASE_NAMES:
        if lo <= angle < hi:
            return {"angle": round(angle,2), "phase": name,
                    "sun_lon": round(sun_lon,4), "moon_lon": round(moon_lon,4)}
    return {"angle": round(angle,2), "phase": "New Moon",
            "sun_lon": round(sun_lon,4), "moon_lon": round(moon_lon,4)}


# ══════════════════════════════════════════════════════════════════════════════
# VOID OF COURSE MOON
# ══════════════════════════════════════════════════════════════════════════════

# Major aspects Moon can form (classic set)
_MOON_ASPECTS = {0: "conjunction", 60: "sextile", 90: "square",
                 120: "trine", 180: "opposition"}
_MOON_ASPECT_ORB = 1.0   # degrees, tight scan window


def void_of_course_moon(jd_start: float, look_ahead_days: float = 3.0,
                        lat: float = 0, lon: float = 0) -> dict:
    """
    Determine if the Moon is Void of Course (VoC) at jd_start, and if so,
    when it ends (Moon enters next sign).

    Scans forward minute-by-minute (using 10-minute steps) from jd_start
    to find:
      a) The last exact aspect Moon makes to a classical planet before
         changing sign (VoC start).
      b) The exact JD when Moon crosses into the next sign (VoC end).

    Classical planets for VoC: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn
    (traditional 7 — outer planets excluded per Hellenistic tradition).

    Returns:
        {
          "is_void": bool,
          "moon_lon": float,          # current Moon longitude
          "moon_sign": str,
          "last_aspect": {planet, aspect, exact_jd, exact_dt_utc} | None,
          "void_start_jd": float | None,
          "void_end_jd": float | None,   # Moon enters next sign
          "void_end_sign": str | None,
          "void_duration_hours": float | None,
        }
    """
    _CLASSICAL = {"sun", "mercury", "venus", "mars", "jupiter", "saturn"}

    step = 10 / (24 * 60)   # 10 minutes in JD units
    planets_now = calc_planets(jd_start)
    moon_lon_now = planets_now.get("moon", 0)
    current_sign = sign_name(moon_lon_now)

    def _sign_index(lon):
        return int(lon % 360 / 30)

    current_sign_idx = _sign_index(moon_lon_now)

    # --- Find next sign ingress (VoC end candidate)
    void_end_jd = None
    void_end_sign = None
    jd_scan = jd_start
    prev_idx = current_sign_idx
    for _ in range(int(look_ahead_days * 24 * 6)):   # 10-min steps
        jd_scan += step
        pls = calc_planets(jd_scan)
        idx = _sign_index(pls.get("moon", 0))
        if idx != prev_idx:
            # Binary search for precise crossing
            lo, hi = jd_scan - step, jd_scan
            for _ in range(16):
                mid = (lo + hi) / 2
                mi  = _sign_index(calc_planets(mid).get("moon", 0))
                if mi == prev_idx:
                    lo = mid
                else:
                    hi = mid
            void_end_jd  = hi
            void_end_sign = sign_name(calc_planets(hi).get("moon", 0))
            break
        prev_idx = idx

    if void_end_jd is None:
        # Could not find ingress within look_ahead window
        return {
            "is_void": False,
            "moon_lon": round(moon_lon_now, 4),
            "moon_sign": current_sign,
            "last_aspect": None,
            "void_start_jd": None,
            "void_end_jd": None,
            "void_end_sign": None,
            "void_duration_hours": None,
            "note": f"No sign ingress found within {look_ahead_days} days"
        }

    # --- Scan from jd_start to void_end_jd for all Moon aspects
    last_aspect = None
    jd_scan = jd_start
    prev_moon = moon_lon_now

    while jd_scan < void_end_jd:
        jd_scan += step
        pls = calc_planets(jd_scan)
        moon_lon = pls.get("moon", 0)

        for planet in _CLASSICAL:
            if planet == "moon":
                continue
            p_lon = pls.get(planet, 0)
            raw_diff = (moon_lon - p_lon) % 360
            for angle in _MOON_ASPECTS:
                dist = min(abs(raw_diff - angle), 360 - abs(raw_diff - angle))
                if dist < _MOON_ASPECT_ORB:
                    # Check if we're near exact (within 0.3°)
                    prev_pls  = calc_planets(jd_scan - step)
                    prev_moon = prev_pls.get("moon", 0)
                    prev_plon = prev_pls.get(planet, 0)
                    prev_diff = (prev_moon - prev_plon) % 360
                    prev_dist = min(abs(prev_diff - angle),
                                    360 - abs(prev_diff - angle))
                    if prev_dist > dist:   # Moon approaching this aspect
                        last_aspect = {
                            "planet":       planet,
                            "aspect":       _MOON_ASPECTS[angle],
                            "exact_jd":     round(jd_scan, 6),
                            "exact_dt_utc": _jd_to_iso(jd_scan),
                        }

    is_void = last_aspect is None  # no aspects found = already void
    void_start_jd = last_aspect["exact_jd"] if last_aspect else jd_start

    duration_h = None
    if void_end_jd is not None and void_start_jd is not None:
        duration_h = round((void_end_jd - void_start_jd) * 24, 2)

    return {
        "is_void":              is_void,
        "moon_lon":             round(moon_lon_now, 4),
        "moon_sign":            current_sign,
        "last_aspect":          last_aspect,
        "void_start_jd":        round(void_start_jd, 6) if void_start_jd else None,
        "void_end_jd":          round(void_end_jd,   6) if void_end_jd   else None,
        "void_end_sign":        void_end_sign,
        "void_duration_hours":  duration_h,
    }


def _jd_to_iso(jd: float) -> str:
    """Convert Julian Day to ISO-8601 UTC string."""
    Z = math.floor(jd + 0.5)
    F = (jd + 0.5) - Z
    alpha = math.floor((Z - 1867216.25) / 36524.25)
    A = Z + 1 + alpha - math.floor(alpha / 4) if Z >= 2299161 else Z
    B = A + 1524; C = math.floor((B - 122.1) / 365.25)
    D = math.floor(365.25 * C); E = math.floor((B - D) / 30.6001)
    day   = int(B - D - math.floor(30.6001 * E))
    month = int(E - 1 if E < 14 else E - 13)
    year  = int(C - 4716 if month > 2 else C - 4715)
    frac  = F
    hour  = int(frac * 24); frac = frac * 24 - hour
    minute = int(frac * 60); frac = frac * 60 - minute
    second = int(frac * 60)
    return f"{year:04d}-{month:02d}-{day:02d}T{hour:02d}:{minute:02d}:{second:02d}Z"


# ARABIC PARTS (LOTS)
# ══════════════════════════════════════════════════════════════════════════════

def arabic_parts(planets_dict, houses_dict):
    """Compute the fifteen classical Arabic Parts/Lots.

    Scoring system (score field) uses essential dignity of the lot's sign ruler
    as a rough strength indicator.

    Sources: Vettius Valens (Anthologiae), Paulus Alexandrinus,
             Al-Biruni, Bonatti (Liber Astronomiae).
    """
    asc = houses_dict.get("h1", 0)
    dsc = n360(asc + 180)
    s   = planets_dict.get("sun",  0)
    m   = planets_dict.get("moon", 0)
    v   = planets_dict.get("venus",0)
    me  = planets_dict.get("mercury",0)
    j   = planets_dict.get("jupiter",0)
    sa  = planets_dict.get("saturn",0)
    ma  = planets_dict.get("mars",0)

    # Day chart: Sun above horizon (Sun in H7-H12)
    is_day = n360(s - asc) >= 180

    def lot(a, b, c): return n360(a + b - c)

    # ── Core lots ────────────────────────────────────────────────────────────
    pof = lot(asc, m, s) if is_day else lot(asc, s, m)   # Fortuna
    pos = lot(asc, s, m) if is_day else lot(asc, m, s)   # Spirit (Daemon)

    # ── Marriage lots — Bonatti/Al-Biruni ────────────────────────────────────
    pom_universal   = lot(asc, dsc, v)                           # Zoller universal
    pom_male        = lot(asc, v, sa)  if is_day else lot(asc, sa, v)
    pom_female      = lot(asc, ma, m)  if is_day else lot(asc, m, ma)

    # ── Commerce/Eminence/Courage ─────────────────────────────────────────────
    poc = lot(asc, me, s)  if is_day else lot(asc, s, me)   # Commerce/Merchants
    pok = lot(asc, j, sa)  if is_day else lot(asc, sa, j)   # Eminence/Kingdom
    pov = lot(asc, sa, s)  if is_day else lot(asc, s, sa)   # Nemesis
    pob = lot(asc, ma, s)  if is_day else lot(asc, s, ma)   # Courage/Valor

    # ── NEW: Eros (Desire) — Valens: ASC + Venus - Spirit ────────────────────
    # Simplifies to: Moon + Venus - Sun (day), Sun + Venus - Moon (night)
    poe = lot(asc, v, pos)  # Spirit already sect-adjusted above

    # ── NEW: Victory (Nike) — Paulus: ASC + Jupiter - Spirit ─────────────────
    poni = lot(asc, j, pos)

    # ── NEW: Necessity (Ananke) — Paulus: Fortune + Mercury - ASC ────────────
    # Day = Fortune + Saturn - Mercury; Night = Fortune + Mercury - Saturn
    pon = lot(pof, sa, me) if is_day else lot(pof, me, sa)

    # ── NEW: Father — Valens: day=ASC+Sun-Saturn; night=ASC+Saturn-Sun ───────
    pof2 = lot(asc, s, sa) if is_day else lot(asc, sa, s)

    # ── NEW: Mother — Valens: day=ASC+Moon-Venus; night=ASC+Venus-Moon ───────
    pomo = lot(asc, m, v)  if is_day else lot(asc, v, m)

    # ── NEW: Exaltation (Hypsoma) ─────────────────────────────────────────────
    # Day:   ASC + 19°Aries - Sun  (Sun's exaltation = 19°, longitude = 19°)
    # Night: ASC + 3°Taurus - Moon (Moon's exaltation = 3°, longitude = 33°)
    pex = lot(asc, 19.0, s)  if is_day else lot(asc, 33.0, m)

    def fmt(lon):
        return {
            "lon":     round(lon, 4),
            "sign":    sign_name(lon),
            "deg_min": f"{int(deg_in_sign(lon))}°{int((deg_in_sign(lon) % 1) * 60):02d}'",
        }

    return {
        # Classic seven
        "fortune":          fmt(pof),
        "spirit":           fmt(pos),
        "marriage":         fmt(pom_universal),    # Zoller: ASC + DSC - Venus
        "marriage_male":    fmt(pom_male),         # Bonatti: day=ASC+Venus-Saturn
        "marriage_female":  fmt(pom_female),       # Bonatti: day=ASC+Mars-Moon
        "commerce":         fmt(poc),
        "eminence":         fmt(pok),
        "nemesis":          fmt(pov),
        "courage":          fmt(pob),
        # Extended lots (Valens / Paulus Alexandrinus)
        "eros":             fmt(poe),   # ASC + Venus - Spirit
        "victory":          fmt(poni),  # ASC + Jupiter - Spirit
        "necessity":        fmt(pon),   # day=Fortune+Saturn-Mercury
        "father":           fmt(pof2),  # day=ASC+Sun-Saturn
        "mother":           fmt(pomo),  # day=ASC+Moon-Venus
        "exaltation":       fmt(pex),   # day=ASC+19°Aries-Sun
        "is_day":           is_day,
    }


# ══════════════════════════════════════════════════════════════════════════════
# MIDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

def midpoints(planets_dict):
    """Compute all pairwise midpoints."""
    ns = list(planets_dict.keys())
    result = {}
    for i in range(len(ns)):
        for j in range(i+1, len(ns)):
            p1,p2 = ns[i],ns[j]
            l1,l2 = planets_dict[p1], planets_dict[p2]
            mp = n360((l1 + l2) / 2)
            # Short arc midpoint
            if abs(l1-l2) > 180: mp = n360(mp + 180)
            key = f"{p1}/{p2}"
            result[key] = {"lon": round(mp,4), "sign": sign_name(mp)}
    return result


# ══════════════════════════════════════════════════════════════════════════════
# ANTISCIA
# ══════════════════════════════════════════════════════════════════════════════

def antiscia(planet_lon):
    """Antiscion: mirror over 0°Cancer/0°Capricorn axis (lon reflected over 90°/270°)."""
    return n360(180 - planet_lon)

def contra_antiscia(planet_lon):
    """Contra-antiscion: mirror over 0°Aries/0°Libra axis."""
    return n360(360 - planet_lon)

def calc_antiscia_all(planets_dict):
    return {p: {"antiscion": round(antiscia(lon),4), "antiscion_sign": sign_name(antiscia(lon)),
                "contra_antiscion": round(contra_antiscia(lon),4),
                "contra_antiscion_sign": sign_name(contra_antiscia(lon))}
            for p,lon in planets_dict.items()}


# ══════════════════════════════════════════════════════════════════════════════
# EXTENDED TRADITIONAL TECHNIQUES
# ══════════════════════════════════════════════════════════════════════════════

# Mean daily motion in degrees/day
MEAN_DAILY_MOTION = {
    'sun': 0.9856, 'moon': 13.1764, 'mercury': 1.3833, 'venus': 1.2000,
    'mars': 0.5240, 'jupiter': 0.0831, 'saturn': 0.0335, 'uranus': 0.0116,
    'neptune': 0.0059, 'pluto': 0.0040, 'node': -0.0529,
    'chiron': 0.0200, 'lilith': 0.1108,
}

# Chaldean decan rulers: DECAN_RULERS[sign_index] = [ruler_dec1, ruler_dec2, ruler_dec3]
DECAN_RULERS = {
    0:  ['mars',    'sun',     'jupiter'],  # Aries
    1:  ['venus',   'mercury', 'saturn'],   # Taurus
    2:  ['mercury', 'venus',   'saturn'],   # Gemini
    3:  ['moon',    'mars',    'jupiter'],  # Cancer
    4:  ['sun',     'jupiter', 'mars'],     # Leo
    5:  ['mercury', 'saturn',  'venus'],    # Virgo
    6:  ['venus',   'saturn',  'mercury'],  # Libra
    7:  ['mars',    'jupiter', 'moon'],     # Scorpio
    8:  ['jupiter', 'mars',    'sun'],      # Sagittarius
    9:  ['saturn',  'venus',   'mercury'],  # Capricorn
    10: ['saturn',  'mercury', 'venus'],    # Aquarius
    11: ['jupiter', 'moon',    'mars'],     # Pisces
}

# Egyptian Terms: TERMS[sign_index] = [(ruler, end_degree_exclusive), ...]
TERMS = {
    0:  [('jupiter',6),('venus',14),('mercury',21),('mars',26),('saturn',30)],
    1:  [('venus',8),('mercury',15),('jupiter',22),('saturn',26),('mars',30)],
    2:  [('mercury',7),('jupiter',14),('venus',21),('saturn',25),('mars',30)],
    3:  [('mars',6),('jupiter',13),('mercury',20),('venus',27),('saturn',30)],
    4:  [('jupiter',6),('venus',11),('saturn',18),('mercury',24),('mars',30)],
    5:  [('mercury',7),('venus',17),('jupiter',21),('mars',28),('saturn',30)],
    6:  [('saturn',6),('mercury',14),('jupiter',21),('venus',28),('mars',30)],
    7:  [('mars',7),('venus',11),('mercury',19),('jupiter',24),('saturn',30)],
    8:  [('jupiter',12),('venus',17),('mercury',21),('saturn',26),('mars',30)],
    9:  [('mercury',7),('jupiter',14),('venus',22),('saturn',26),('mars',30)],
    10: [('mercury',7),('venus',13),('jupiter',20),('mars',25),('saturn',30)],
    11: [('venus',12),('jupiter',16),('mercury',19),('mars',28),('saturn',30)],
}

# 28 Lunar Mansions (Arabic Manazil): (name, nature)
LUNAR_MANSIONS = [
    ('Al-Sharatain',    'mixed'),    # 1
    ('Al-Butain',       'benefic'),  # 2
    ('Al-Thurayya',     'benefic'),  # 3
    ('Al-Dabaran',      'malefic'),  # 4
    ('Al-Haqa',         'benefic'),  # 5
    ('Al-Hana',         'benefic'),  # 6
    ('Al-Dhira',        'benefic'),  # 7
    ('Al-Nathrah',      'benefic'),  # 8
    ('Al-Tarf',         'malefic'),  # 9
    ('Al-Jabha',        'malefic'),  # 10
    ('Al-Zubra',        'benefic'),  # 11
    ('Al-Sarfa',        'malefic'),  # 12
    ('Al-Awwa',         'benefic'),  # 13
    ('Al-Simak',        'benefic'),  # 14
    ('Al-Ghafr',        'benefic'),  # 15
    ('Al-Zubana',       'malefic'),  # 16
    ('Al-Iklil',        'malefic'),  # 17
    ('Al-Qalb',         'malefic'),  # 18
    ('Al-Shawla',       'malefic'),  # 19
    ('Al-Naayim',       'benefic'),  # 20
    ('Al-Baldah',       'benefic'),  # 21
    ('Saad Al-Dhabih',  'mixed'),    # 22
    ('Saad Al-Bula',    'malefic'),  # 23
    ('Saad Al-Saud',    'benefic'),  # 24
    ('Saad Al-Akhbia',  'mixed'),    # 25
    ('Al-Fargh Al-Awwal','benefic'), # 26
    ('Al-Fargh Al-Thani','benefic'), # 27
    ('Batn Al-Hut',     'benefic'),  # 28
]

# Rich descriptions for all 28 Arabic Lunar Mansions
# Source: Al-Biruni (Kitab al-Tafhim), Picatrix, medieval astrological tradition
# Keys: name_ru, keyword, do (recommended), avoid, theme
LUNAR_MANSION_DETAILS = [
    # 1 — Al-Sharatain (β+γ Aries)
    {"name_ru": "Аш-Шаратайн",   "keyword": "начало",       "theme": "Новые начинания, риск",
     "do":   ["начинать проекты", "путешествия", "переговоры"],
     "avoid": ["медицинские операции", "долгосрочные договоры"]},
    # 2 — Al-Butain (ε Aries)
    {"name_ru": "Аль-Бутайн",    "keyword": "рост",          "theme": "Накопление, сельское хозяйство",
     "do":   ["сажать растения", "копить ресурсы", "укреплять здоровье"],
     "avoid": ["конфликты", "крупные покупки"]},
    # 3 — Al-Thurayya (Плеяды)
    {"name_ru": "Ат-Туррайя",    "keyword": "изобилие",      "theme": "Удача, торговля, путешествия",
     "do":   ["торговля", "путешествия", "деловые встречи", "брак"],
     "avoid": ["спорные дела", "хирургия"]},
    # 4 — Al-Dabaran (Альдебаран)
    {"name_ru": "Ад-Дабаран",    "keyword": "препятствие",   "theme": "Испытания, задержки",
     "do":   ["практики терпения", "ревизия планов", "духовная работа"],
     "avoid": ["новые начинания", "путешествия", "контракты"]},
    # 5 — Al-Haqa (λ Ori)
    {"name_ru": "Аль-Хака",      "keyword": "мастерство",    "theme": "Ремёсла, обучение",
     "do":   ["обучение", "ремёсла", "физические упражнения"],
     "avoid": ["браки", "деловые партнёрства"]},
    # 6 — Al-Hana (γ Gem)
    {"name_ru": "Аль-Хана",      "keyword": "любовь",        "theme": "Дружба, романтика",
     "do":   ["романтика", "дружеские встречи", "искусство"],
     "avoid": ["ссоры", "юридические споры"]},
    # 7 — Al-Dhira (α+β Gem)
    {"name_ru": "Аз-Зира",       "keyword": "прибыль",       "theme": "Торговля, богатство",
     "do":   ["торговля", "переговоры о прибыли", "партнёрства"],
     "avoid": ["легкомысленные расходы"]},
    # 8 — Al-Nathrah (Praesepe)
    {"name_ru": "Ан-Натра",      "keyword": "защита",        "theme": "Безопасность, дом, семья",
     "do":   ["домашние дела", "защита имущества", "уход за здоровьем"],
     "avoid": ["путешествия", "рискованные решения"]},
    # 9 — Al-Tarf (κ Can)
    {"name_ru": "Ат-Тарф",       "keyword": "застой",        "theme": "Блокировки, болезни",
     "do":   ["очищение", "медитация", "отдых"],
     "avoid": ["начинания", "деловые встречи", "путешествия"]},
    # 10 — Al-Jabha (ζ Leo)
    {"name_ru": "Аль-Джабха",    "keyword": "конфликт",      "theme": "Власть, конкуренция",
     "do":   ["силовые тренировки", "стратегическое планирование"],
     "avoid": ["переговоры", "союзы", "брак"]},
    # 11 — Al-Zubra (δ Leo)
    {"name_ru": "Аз-Зубра",      "keyword": "победа",        "theme": "Освобождение, победа",
     "do":   ["завершение проектов", "выход из сложных ситуаций"],
     "avoid": ["рутина без цели"]},
    # 12 — Al-Sarfa (β Leo)
    {"name_ru": "Ас-Сарфа",      "keyword": "смена",         "theme": "Перемены, трансформация",
     "do":   ["трансформационные практики", "смена образа жизни"],
     "avoid": ["важные решения", "путешествия"]},
    # 13 — Al-Awwa (β Vir)
    {"name_ru": "Аль-Авва",      "keyword": "содружество",   "theme": "Союзы, сотрудничество",
     "do":   ["партнёрства", "дипломатия", "брак"],
     "avoid": ["одиночные начинания"]},
    # 14 — Al-Simak (Spica)
    {"name_ru": "Ас-Симак",      "keyword": "гармония",      "theme": "Красота, искусство, гармония",
     "do":   ["творчество", "романтика", "обучение искусству"],
     "avoid": ["жёсткие переговоры"]},
    # 15 — Al-Ghafr (ι Vir)
    {"name_ru": "Аль-Гафр",      "keyword": "безопасность",  "theme": "Мир, безопасность, исцеление",
     "do":   ["исцеление", "духовные практики", "медитация"],
     "avoid": ["конфронтации", "рискованные инвестиции"]},
    # 16 — Al-Zubana (α Lib)
    {"name_ru": "Аз-Зубана",     "keyword": "напряжение",    "theme": "Несправедливость, конфликты",
     "do":   ["юридическая защита", "ревизия договоров"],
     "avoid": ["новые договоры", "путешествия", "операции"]},
    # 17 — Al-Iklil (β Sco)
    {"name_ru": "Аль-Икляль",    "keyword": "испытание",     "theme": "Кризис, решения",
     "do":   ["молитвы", "ритуалы защиты", "принятие решений с холодной головой"],
     "avoid": ["поспешные действия", "партнёрства"]},
    # 18 — Al-Qalb (Antares)
    {"name_ru": "Аль-Кальб",     "keyword": "интенсивность", "theme": "Страсть, трансформация, опасность",
     "do":   ["глубокие трансформационные практики", "кризисная работа"],
     "avoid": ["путешествия", "хирургия", "финансовые решения"]},
    # 19 — Al-Shawla (λ Sco)
    {"name_ru": "Аш-Шавла",      "keyword": "рассеивание",   "theme": "Потери, расставания",
     "do":   ["завершение старого", "практики отпускания"],
     "avoid": ["новые партнёрства", "займы", "дорогостоящие покупки"]},
    # 20 — Al-Naayim (σ Sgr)
    {"name_ru": "Ан-Наайим",     "keyword": "мудрость",      "theme": "Философия, дальние путешествия",
     "do":   ["обучение", "путешествия", "духовные практики", "публикации"],
     "avoid": ["мелкие бытовые конфликты"]},
    # 21 — Al-Baldah (π Sgr)
    {"name_ru": "Аль-Бальда",    "keyword": "ясность",       "theme": "Успех, ясность пути",
     "do":   ["принятие решений", "начало важных дел", "переговоры"],
     "avoid": ["ложь", "манипуляции"]},
    # 22 — Saad Al-Dhabih (α Cap)
    {"name_ru": "Сад аз-Забих",  "keyword": "очищение",      "theme": "Жертва, очищение, переход",
     "do":   ["очищение пространства", "избавление от лишнего"],
     "avoid": ["крупные покупки", "браки"]},
    # 23 — Saad Al-Bula (ν Aqr)
    {"name_ru": "Сад аль-Буля",  "keyword": "поглощение",    "theme": "Конец цикла, разрушение",
     "do":   ["завершение проектов", "уборка и очищение"],
     "avoid": ["начинания", "вложения", "путешествия"]},
    # 24 — Saad Al-Saud (β Aqr)
    {"name_ru": "Сад ас-Сауд",   "keyword": "удача",         "theme": "Счастье, процветание",
     "do":   ["новые партнёрства", "браки", "финансовые вложения"],
     "avoid": ["конфликты"]},
    # 25 — Saad Al-Akhbia (γ Aqr)
    {"name_ru": "Сад аль-Ахбийя","keyword": "скрытность",    "theme": "Секреты, исследования, магия",
     "do":   ["исследования", "эзотерические практики", "защитная магия"],
     "avoid": ["публичные выступления", "подписание договоров"]},
    # 26 — Al-Fargh Al-Awwal (α+β Peg)
    {"name_ru": "Аль-Фарг аль-Авваль","keyword": "строительство","theme": "Созидание, закладка фундамента",
     "do":   ["строительство", "долгосрочные инвестиции", "образование"],
     "avoid": ["поспешные решения"]},
    # 27 — Al-Fargh Al-Thani (γ Peg)
    {"name_ru": "Аль-Фарг ас-Сани","keyword": "завершение",  "theme": "Завершение цикла, мудрость",
     "do":   ["подведение итогов", "духовные практики", "медитация"],
     "avoid": ["новые начинания до закрытия старых"]},
    # 28 — Batn Al-Hut (β And)
    {"name_ru": "Батн аль-Хут",  "keyword": "растворение",   "theme": "Трансцендентность, мистика",
     "do":   ["медитация", "сны", "визуализации", "творческое вдохновение"],
     "avoid": ["жёсткие решения", "бизнес-переговоры"]},
]

# Domicile rulers (modern): for dispositor chain
DOMICILE_RULER_MAP = {
    'aries': 'mars', 'taurus': 'venus', 'gemini': 'mercury', 'cancer': 'moon',
    'leo': 'sun', 'virgo': 'mercury', 'libra': 'venus', 'scorpio': 'pluto',
    'sagittarius': 'jupiter', 'capricorn': 'saturn', 'aquarius': 'uranus',
    'pisces': 'neptune',
}

# Sect groups
_DIURNAL_PLANETS  = {'sun', 'jupiter', 'saturn'}
_NOCTURNAL_PLANETS = {'moon', 'venus', 'mars'}

# 30 major fixed stars: (name, lon_j2000°, lat°, precession_arcsec/yr, nature, magnitude)
FIXED_STARS = [
    ('Algol',              55.256,  22.86,  50.29, 'malefic',  2.1),
    ('Alcyone',            59.473,   4.03,  50.29, 'mixed',    2.9),
    ('Aldebaran',          69.894,  -5.47,  50.29, 'benefic',  0.9),
    ('Rigel',              76.625, -31.12,  50.29, 'benefic',  0.1),
    ('Capella',            81.571,  22.86,  50.29, 'benefic',  0.1),
    ('Bellatrix',          81.117, -14.56,  50.29, 'malefic',  1.6),
    ('Betelgeuse',         88.793, -16.04,  50.29, 'mixed',    0.5),
    ('Sirius',            104.082, -39.61,  50.29, 'benefic', -1.5),
    ('Pollux',            113.193,  -6.68,  50.29, 'mixed',    1.2),
    ('Procyon',           115.959, -16.03,  50.29, 'mixed',    0.4),
    ('Regulus',           150.004,   0.46,  50.29, 'benefic',  1.4),
    ('Denebola',          182.532,  14.18,  50.29, 'malefic',  2.1),
    ('Spica',             203.897,  -2.06,  50.29, 'benefic',  1.0),
    ('Arcturus',          213.983,  30.73,  50.29, 'benefic',  0.0),
    ('Alphecca',          232.478,  44.58,  50.29, 'benefic',  2.2),
    ('Antares',           249.881,  -4.57,  50.29, 'malefic',  1.1),
    ('Vega',              284.219,  61.74,  50.29, 'benefic',  0.0),
    ('Altair',            301.850,  -9.23,  50.29, 'mixed',    0.8),
    ('Fomalhaut',         333.887, -21.13,  50.29, 'benefic',  1.2),
    ('Achernar',           15.338, -59.51,  50.29, 'benefic',  0.5),
    ('Scheat',             29.229,  31.07,  50.29, 'malefic',  2.4),
    ('Markab',             23.558,  19.36,  50.29, 'malefic',  2.5),
    ('Alphard',           146.683, -22.43,  50.29, 'malefic',  2.0),
    ('Zubenelgenubi',     222.726,  -1.97,  50.29, 'malefic',  2.7),
    ('Zubeneschamali',    231.212,   8.45,  50.29, 'benefic',  2.6),
    ('Canopus',            95.902, -75.98,  50.29, 'benefic', -0.7),
    ('Castor',            113.151,  10.05,  50.29, 'mixed',    1.6),
    ('Deneb',             354.858,  60.20,  50.29, 'mixed',    1.3),
    ('Alhena',            108.970,  -6.90,  50.29, 'benefic',  1.9),
    ('Spica-Hyadum',       60.450,  -5.30,  50.29, 'malefic',  3.5),  # Ain/Hyadum
]


def calc_decan(lon):
    """Return (decan_number 1-3, decan_ruler) for ecliptic longitude."""
    si = sign_idx(lon)
    d_in = deg_in_sign(lon)
    dn = int(d_in // 10) + 1      # 1, 2, 3
    ruler = DECAN_RULERS[si][dn - 1]
    return dn, ruler

def calc_term_ruler(lon):
    """Return Egyptian term ruler for ecliptic longitude."""
    si = sign_idx(lon)
    d_in = deg_in_sign(lon)
    for lord, end in TERMS[si]:
        if d_in < end:
            return lord
    return 'saturn'

def lunar_mansion(moon_lon):
    """Return (mansion_number 1-28, name, nature) for Moon longitude."""
    n = int(n360(moon_lon) / (360.0 / 28)) % 28
    name, nature = LUNAR_MANSIONS[n]
    return n + 1, name, nature


def lunar_mansion_full(moon_lon):
    """Return full mansion dict including Arabic descriptions."""
    n = int(n360(moon_lon) / (360.0 / 28)) % 28
    name, nature = LUNAR_MANSIONS[n]
    details = LUNAR_MANSION_DETAILS[n]
    return {
        "number": n + 1,
        "name": name,
        "nature": nature,
        **details,
    }

def calc_vertex(ramc, lat, eps):
    """Compute Vertex and Anti-Vertex from RAMC, latitude, obliquity."""
    # Vertex = ASC formula evaluated at RAMC-90° (western prime vertical)
    rv = rad(n360(ramc - 90))
    e, phi = rad(eps), rad(lat)
    vtx = n360(deg(math.atan2(math.cos(rv),
                              -(math.sin(e) * math.tan(phi) + math.cos(e) * math.sin(rv)))))
    return vtx, n360(vtx + 180)   # vtx, anti-vertex

def calc_declinations(planets_raw, JD):
    """Return {planet: dec_degrees} declination dict (ecliptic lat=0 approximation)."""
    eps = obliquity(JD)
    return {p: _ecliptic_dec(lon, eps) for p, lon in planets_raw.items()}

def calc_speeds(planets_raw, JD):
    """Return {planet: (speed_deg_per_day, speed_status)} dict."""
    result = {}
    for name, lon in planets_raw.items():
        lon_next = _planet_lon(name, JD + 1.0)
        if lon_next is None:
            result[name] = (0.0, 'unknown')
            continue
        raw = lon_next - lon
        # Normalize to [-180, 180]
        speed = raw % 360
        if speed > 180: speed -= 360
        mean = MEAN_DAILY_MOTION.get(name, 0.1)
        if abs(speed) < 0.01:
            status = 'stationary'
        elif speed < 0:
            status = 'retrograde'
        elif abs(mean) > 0 and speed > abs(mean) * 1.2:
            status = 'fast'
        elif abs(mean) > 0 and abs(speed) < abs(mean) * 0.8:
            status = 'slow'
        else:
            status = 'average'
        result[name] = (round(speed, 4), status)
    return result

def _planet_lon(name, JD):
    """Get single planet longitude at JD (used by calc_speeds)."""
    try:
        if name == 'sun':     return sun(JD)[0]
        if name == 'moon':    return moon(JD)
        if name in ('venus','mars','jupiter','saturn','uranus','neptune'):
            return vsop_geo(name, JD)
        if name == 'mercury': return mercury(JD)
        if name == 'node':    return node(JD)
        if name == 'lilith':  return lilith(JD)
        if name == 'pluto':   return pluto(JD)
        if name == 'chiron':  return chiron(JD)
    except Exception:
        return None
    return None

def calc_sect(planets_raw, houses_dict):
    """
    Determine chart sect (day/night) and per-planet sect status.
    Returns (sect_string, {planet: sect_status}).
    """
    sun_lon  = planets_raw.get('sun', 0)
    asc_lon  = houses_dict.get('h1', 0)
    # Day chart: Sun is above horizon = in houses 7-12
    # Sun above horizon means n360(sun_lon - asc_lon) >= 180
    is_day = (n360(sun_lon - asc_lon) >= 180)
    sect = 'day' if is_day else 'night'

    sect_status = {}
    for name in planets_raw:
        if name in _DIURNAL_PLANETS:
            sect_status[name] = 'in_sect' if is_day else 'out_of_sect'
        elif name in _NOCTURNAL_PLANETS:
            sect_status[name] = 'out_of_sect' if is_day else 'in_sect'
        elif name == 'mercury':
            # Mercury adapts: morning star (before Sun) = diurnal; evening star = nocturnal
            sun_lon2 = planets_raw.get('sun', 0)
            mer_lon  = planets_raw.get('mercury', 0)
            diff = n360(sun_lon2 - mer_lon)
            # Mercury rising before Sun → Oriental (morning star) → diurnal sect
            is_morning = (diff <= 180)
            if is_day:
                sect_status[name] = 'in_sect' if is_morning else 'out_of_sect'
            else:
                sect_status[name] = 'out_of_sect' if is_morning else 'in_sect'
        else:
            sect_status[name] = None
    return sect, sect_status

def calc_fixed_stars(JD, planets_raw, orb=1.0):
    """
    Find fixed star conjunctions to natal planets.
    Returns list of {star, planet, star_lon, planet_lon, orb, nature, magnitude}.
    """
    years = (JD - 2451545.0) / 365.25
    result = []
    for star_name, lon2000, lat_s, prec_rate, nature, mag in FIXED_STARS:
        star_lon = n360(lon2000 + years * prec_rate / 3600.0)
        for pname, plon in planets_raw.items():
            d = abs(_angle_diff(plon, star_lon))
            if d <= orb:
                result.append({
                    'star':       star_name,
                    'planet':     pname,
                    'star_lon':   round(star_lon, 3),
                    'planet_lon': round(plon, 4),
                    'orb':        round(d, 3),
                    'nature':     nature,
                    'magnitude':  mag,
                })
    result.sort(key=lambda x: x['orb'])
    return result

def calc_dispositors(planets_raw):
    """
    Compute dispositor chain and mutual receptions for all planets.
    planets_raw = {planet_name: lon_float}
    Returns dict: {chains, mutual_receptions, final_dispositors, dispositor}.
    """
    # Map each planet to its sign ruler
    dispositor = {}
    for name, lon in planets_raw.items():
        sn = sign_name(lon)
        dispositor[name] = DOMICILE_RULER_MAP.get(sn)

    # Build chain for each planet
    chains = {}
    for start in dispositor:
        chain = [start]
        cur = dispositor.get(start)
        for _ in range(13):
            if cur is None or cur in chain:
                break
            chain.append(cur)
            cur = dispositor.get(cur)
        chains[start] = chain

    # Mutual reception: A disposits B, B disposits A
    mutual = []
    planet_list = list(dispositor.keys())
    for i in range(len(planet_list)):
        for j in range(i + 1, len(planet_list)):
            a, b = planet_list[i], planet_list[j]
            if dispositor.get(a) == b and dispositor.get(b) == a:
                mutual.append((a, b))

    # Final dispositor: planet in own sign or end of chain
    finals = []
    for p in chains:
        ch = chains[p]
        if len(ch) == 1:  # only itself → in own sign
            finals.append(p)
        else:
            last = ch[-1]
            # Check if last planet's dispositor points back to itself
            if dispositor.get(last) == last or dispositor.get(last) in ch:
                if last not in finals:
                    finals.append(last)

    return {
        'dispositor':       dispositor,
        'chains':           chains,
        'mutual_receptions': mutual,
        'final_dispositors': list(set(finals)),
    }


# ══════════════════════════════════════════════════════════════════════════════
# FULL CHART CALCULATION
# ══════════════════════════════════════════════════════════════════════════════

def calc_chart(yr, mo, dy, h, mi, sc, lat, lon_deg, utc_off,
               houses_system="placidus", julian=False,
               include_aspects=True, include_patterns=True,
               include_dignities=True, include_arabic=True,
               include_midpoints=False, include_antiscia=False,
               include_fixed_stars=False, include_sect=True,
               include_dispositors=True):
    """
    Compute a full natal chart.

    Returns dict with:
      planets, houses, aspects, patterns, dignities, lunar_phase,
      arabic_parts, sect, dispositors, fixed_stars (opt),
      midpoints (opt), antiscia (opt), metadata
    """
    jd_ut = jd(yr, mo, dy, h - utc_off, mi, sc, julian=julian)
    day_fraction = (h - utc_off + mi / 60.0 + sc / 3600.0) / 24.0
    dt_sec = delta_t_seconds(yr, mo, dy + day_fraction)
    jd_tt = jd_ut + dt_sec / 86400.0

    # Planets/lights are evaluated on TT, while houses/angles stay on UT.
    planets = calc_planets(jd_tt)       # {name: lon_float}
    houses  = calc_houses(jd_ut, lat, lon_deg, houses_system)

    # ── Vertex / Anti-Vertex ─────────────────────────────────────────────────
    _, _, ramc, eps = _mc_asc(jd_ut, lat, lon_deg)
    vtx_lon, avx_lon = calc_vertex(ramc, lat, eps)

    # ── Declinations ─────────────────────────────────────────────────────────
    decls = calc_declinations(planets, jd_tt)   # {name: dec_float}

    # ── Speeds ───────────────────────────────────────────────────────────────
    speeds = calc_speeds(planets, jd_tt)        # {name: (speed, status)}

    # ── Retrograde flags ─────────────────────────────────────────────────────
    retro = {p: is_retrograde(p, jd_tt) for p in PLANET_ORDER}

    # ── Planet in house ──────────────────────────────────────────────────────
    p_in_house = {p: planet_in_house(lon, houses) for p, lon in planets.items()}

    # ── Format planets ───────────────────────────────────────────────────────
    planets_fmt = {}
    for p, lon in planets.items():
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
            "deg_min":      f"{int(d)}°{int((d % 1) * 60):02d}'",
            "retrograde":   retro[p],
            "house":        p_in_house[p],
            "dec":          round(dec, 4),
            "oob":          abs(dec) > eps,
            "speed":        sp,
            "speed_status": sp_st,
            "decan":        dn,
            "decan_ruler":  dr,
            "term_ruler":   tr,
        }
        # Lunar mansion for Moon
        if p == 'moon':
            mn_num, mn_name, mn_nature = lunar_mansion(lon)
            pd["mansion_num"]    = mn_num
            pd["mansion_name"]   = mn_name
            pd["mansion_nature"] = mn_nature
        planets_fmt[p] = pd

    # ── Format houses ─────────────────────────────────────────────────────────
    houses_fmt = {}
    for h_key, lon in houses.items():
        s = sign_name(lon)
        d = deg_in_sign(lon)
        houses_fmt[h_key] = {
            "lon": round(lon, 4), "sign": s, "glyph": sign_glyph(lon),
            "deg": int(d), "min": int((d % 1) * 60),
            "deg_min": f"{int(d)}°{int((d % 1) * 60):02d}'",
        }
    # Add Vertex and Anti-Vertex to houses
    for label, vlon in (("vtx", vtx_lon), ("avx", avx_lon)):
        s = sign_name(vlon); d = deg_in_sign(vlon)
        houses_fmt[label] = {
            "lon": round(vlon, 4), "sign": s, "glyph": sign_glyph(vlon),
            "deg": int(d), "min": int((d % 1) * 60),
            "deg_min": f"{int(d)}°{int((d % 1) * 60):02d}'",
        }

    result = {
        "metadata": {
            "date": f"{yr:04d}-{mo:02d}-{dy:02d}",
            "time": f"{h:02d}:{mi:02d}:{sc:02d}",
            "lat": lat, "lon": lon_deg, "utc": utc_off,
            "julian": julian,
            "jd": round(jd_ut, 4),
            "jd_ut": round(jd_ut, 6),
            "jd_tt": round(jd_tt, 6),
            "delta_t_seconds": round(dt_sec, 3),
            "houses_system": houses_system,
        },
        "planets": planets_fmt,
        "houses":  houses_fmt,
    }

    # ── Aspects + patterns ────────────────────────────────────────────────────
    if include_aspects:
        asp = calc_aspects(planets, decls_dict=decls)
        result["aspects"] = asp
        if include_patterns:
            result["patterns"] = calc_patterns(planets, asp)

    # ── Dignities ─────────────────────────────────────────────────────────────
    if include_dignities:
        digs = calc_dignities(planets)
        result["dignities"] = digs
        # Embed essential_dignity_score into each planet entry for convenience
        for pname, d in digs.items():
            if pname in result["planets"]:
                result["planets"][pname]["essential_dignity_score"] = d["score"]
                result["planets"][pname]["essential_dignity_label"] = d["label"]

    # ── Lunar phase ───────────────────────────────────────────────────────────
    result["lunar_phase"] = lunar_phase(jd_tt)

    # ── Arabic parts ─────────────────────────────────────────────────────────
    if include_arabic:
        result["arabic_parts"] = arabic_parts(planets, houses)

    # ── Sect ─────────────────────────────────────────────────────────────────
    if include_sect:
        sect_str, sect_status = calc_sect(planets, houses)
        result["sect"] = sect_str
        for pname, st in sect_status.items():
            if pname in result["planets"] and st is not None:
                result["planets"][pname]["sect_status"] = st

    # ── Dispositors ──────────────────────────────────────────────────────────
    if include_dispositors:
        disp = calc_dispositors(planets)
        result["dispositors"] = disp
        # Expose mutual_receptions at top level for easy access
        result["mutual_receptions"] = disp.get("mutual_receptions", [])

    # ── Optional ─────────────────────────────────────────────────────────────
    if include_midpoints:
        result["midpoints"] = midpoints(planets)

    if include_antiscia:
        result["antiscia"] = calc_antiscia_all(planets)

    if include_fixed_stars:
        result["fixed_stars"] = calc_fixed_stars(jd_tt, planets)

    # ── Chart analysis (shape, elements, modalities, unaspected) ────────────
    result["chart_analysis"] = calc_chart_analysis(
        planets,
        result.get("aspects", []),
    )

    return result



# ══════════════════════════════════════════════════════════════════════════════
# CHART ANALYSIS — shape, elements, modalities, unaspected
# ══════════════════════════════════════════════════════════════════════════════

# 10 traditional planets for shape / element analysis (exclude nodes/lilith/chiron)
_SHAPE_PLANETS = ["sun","moon","mercury","venus","mars","jupiter","saturn",
                  "uranus","neptune","pluto"]

# Planet weights for element/modality scoring (personal → generational)
_PLANET_WEIGHTS = {
    "sun": 3, "moon": 3,
    "mercury": 2, "venus": 2, "mars": 2,
    "jupiter": 1.5, "saturn": 1.5,
    "uranus": 1, "neptune": 1, "pluto": 1,
}

# Major aspects for unaspected detection
_MAJOR_ASP = {"conjunction", "sextile", "square", "trine", "opposition"}


def _chart_shape(lons: list) -> dict:
    """Marc Edmund Jones 7 chart patterns.

    Returns {shape, spread_deg, max_gap_deg}.
    """
    if len(lons) < 2:
        return {"shape": "splash", "spread_deg": 360, "max_gap_deg": 0}

    srt = sorted(float(lon) % 360 for lon in lons)
    n = len(srt)
    gaps = [((srt[(i + 1) % n] - srt[i]) % 360) for i in range(n)]
    max_gap = max(gaps)
    spread = 360 - max_gap

    # Find planets that are isolated on both sides (handle candidates)
    def _is_handle(i):
        gap_before = gaps[(i - 1) % n]
        gap_after  = gaps[i]
        return gap_before > 60 and gap_after > 60

    handle_count = sum(_is_handle(i) for i in range(n))

    # Count significant gaps (> 60°)
    sig_gaps = [g for g in gaps if g > 60]

    if spread <= 120:
        shape = "bundle"
    elif max_gap >= 180:
        shape = "bucket" if handle_count == 1 else "bowl"
    elif max_gap >= 120:
        shape = "locomotive"
    elif len(sig_gaps) == 2:
        shape = "seesaw"
    elif len(sig_gaps) >= 3:
        shape = "splay"
    else:
        shape = "splash"

    return {
        "shape":      shape,
        "spread_deg": round(spread, 1),
        "max_gap_deg": round(max_gap, 1),
    }


_ELEMENT_SIGNS = {
    "fire":  {"aries","leo","sagittarius"},
    "earth": {"taurus","virgo","capricorn"},
    "air":   {"gemini","libra","aquarius"},
    "water": {"cancer","scorpio","pisces"},
}

_MODALITY_SIGNS = {
    "cardinal": {"aries","cancer","libra","capricorn"},
    "fixed":    {"taurus","leo","scorpio","aquarius"},
    "mutable":  {"gemini","virgo","sagittarius","pisces"},
}


def calc_chart_analysis(planets_dict: dict, aspects: list) -> dict:
    """Compute chart shape, dominant element, dominant modality, unaspected planets.

    Args:
        planets_dict: {planet_name: longitude_float}
        aspects:      list of aspect dicts from calc_aspects()

    Returns dict with keys:
        shape, spread_deg, max_gap_deg,
        element_scores, dominant_element,
        modality_scores, dominant_modality,
        unaspected_planets
    """
    # ── Shape ───────────────────────────────────────────────────────────────
    lons = [planets_dict[p] for p in _SHAPE_PLANETS if p in planets_dict]
    shape_info = _chart_shape(lons)

    # ── Elements & modalities ────────────────────────────────────────────────
    element_scores: dict[str, float] = {e: 0.0 for e in _ELEMENT_SIGNS}
    modality_scores: dict[str, float] = {m: 0.0 for m in _MODALITY_SIGNS}

    for pname, lon in planets_dict.items():
        if pname not in _PLANET_WEIGHTS:
            continue
        w = _PLANET_WEIGHTS[pname]
        sname = sign_name(lon)
        for elem, signs in _ELEMENT_SIGNS.items():
            if sname in signs:
                element_scores[elem] += w
        for mod, signs in _MODALITY_SIGNS.items():
            if sname in signs:
                modality_scores[mod] += w

    dominant_element  = max(element_scores,  key=element_scores.__getitem__)
    dominant_modality = max(modality_scores, key=modality_scores.__getitem__)

    # Round scores
    element_scores  = {k: round(v, 1) for k, v in element_scores.items()}
    modality_scores = {k: round(v, 1) for k, v in modality_scores.items()}

    # ── Unaspected planets ───────────────────────────────────────────────────
    # A planet is unaspected if it forms NO major aspect to any other planet
    aspected: set[str] = set()
    for asp in aspects:
        if asp.get("aspect") in _MAJOR_ASP:
            aspected.add(asp.get("p1", ""))
            aspected.add(asp.get("p2", ""))
    aspected.discard("")

    unaspected = [
        p for p in _SHAPE_PLANETS
        if p in planets_dict and p not in aspected
    ]

    return {
        **shape_info,
        "element_scores":   element_scores,
        "dominant_element": dominant_element,
        "modality_scores":  modality_scores,
        "dominant_modality": dominant_modality,
        "unaspected_planets": unaspected,
    }


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS FOR PARSING INPUT
# ══════════════════════════════════════════════════════════════════════════════

def parse_date_arg(s):
    import re
    m = re.match(r"(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})", s)
    if not m: raise ValueError(f"Invalid date: {s}")
    return int(m.group(1)), int(m.group(2)), int(m.group(3))

def parse_time_arg(s):
    import re
    m = re.match(r"(\d{1,2}):(\d{2})(?::(\d{2}))?", s)
    if not m: raise ValueError(f"Invalid time: {s}")
    return int(m.group(1)), int(m.group(2)), int(m.group(3) or 0)




# ══════════════════════════════════════════════════════════════════════════════
# PLANETARY HOURS
# ══════════════════════════════════════════════════════════════════════════════

# Chaldean order (Saturday=Saturn, Sunday=Sun, Monday=Moon, ...)
_CHALDEAN = ["saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon"]

# Day of week → index into first daytime hour planet
# 0=Mon,1=Tue,...,6=Sun (Python weekday)
_DAY_RULER = {0: "moon", 1: "mars", 2: "mercury", 3: "jupiter", 4: "venus", 5: "saturn", 6: "sun"}
_DAY_RULER_START = {
    "saturn": 0, "jupiter": 1, "mars": 2, "sun": 3, "venus": 4, "mercury": 5, "moon": 6,
}

_PLANET_RU = {
    "sun": "Солнце", "moon": "Луна", "mars": "Марс", "mercury": "Меркурий",
    "jupiter": "Юпитер", "venus": "Венера", "saturn": "Сатурн",
}

_PLANET_GLYPHS = {
    "sun": "☉", "moon": "☽", "mars": "♂", "mercury": "☿",
    "jupiter": "♃", "venus": "♀", "saturn": "♄",
}

_PLANET_KEYWORDS = {
    "sun": "Успех, власть, лидерство, публичность",
    "moon": "Интуиция, семья, эмоции, женщины",
    "mars": "Активность, конкуренция, спорт, конфликты",
    "mercury": "Переговоры, документы, путешествия, обучение",
    "jupiter": "Удача, юридические вопросы, философия, расширение",
    "venus": "Любовь, красота, искусство, партнёрство",
    "saturn": "Ограничения, дисциплина, структура, долгосрочное",
}


def _sunrise_sunset_approx(date_str: str, lat: float, lon: float, utc: float):
    """
    Approximate sunrise/sunset times using NOAA simplified formula.
    Returns (sunrise_jd, sunset_jd) in Julian Day (UT).
    """
    try:
        yr, mo, dy = [int(x) for x in date_str.split("-")]
    except ValueError:
        from datetime import date as _d
        today = _d.today()
        yr, mo, dy = today.year, today.month, today.day

    jd = jd_from_calendar(yr, mo, dy, 12.0)

    # Julian century from J2000
    n = jd - 2451545.0
    lat_r = math.radians(lat)

    # Mean longitude and anomaly
    L = n360(280.460 + 0.9856474 * n)
    g = math.radians(n360(357.528 + 0.9856003 * n))
    lam = math.radians(n360(L + 1.915 * math.sin(g) + 0.020 * math.sin(2 * g)))
    eps = math.radians(23.439 - 0.0000004 * n)

    # Sun's declination
    sin_dec = math.sin(eps) * math.sin(lam)
    dec = math.asin(sin_dec)

    # Hour angle for sunrise (solar zenith 90.833°)
    cos_ha = (math.cos(math.radians(90.833)) - math.sin(lat_r) * math.sin(dec)) \
             / (math.cos(lat_r) * math.cos(dec))
    if abs(cos_ha) > 1:
        # Polar day/night — default to 6:00/18:00
        ha_deg = 90.0
    else:
        ha_deg = math.degrees(math.acos(cos_ha))

    # Equation of time (minutes)
    RA = math.degrees(math.atan2(math.cos(eps) * math.sin(lam), math.cos(lam))) / 15.0
    eot = (L / 15.0 - RA) * 60  # minutes

    # Noon, sunrise, sunset in UTC hours
    solar_noon_utc = 12.0 - lon / 15.0 - eot / 60.0 - utc
    sunrise_utc = solar_noon_utc - ha_deg / 15.0 + utc
    sunset_utc  = solar_noon_utc + ha_deg / 15.0 + utc

    sunrise_jd = jd_from_calendar(yr, mo, dy, sunrise_utc)
    sunset_jd  = jd_from_calendar(yr, mo, dy, sunset_utc)
    return sunrise_jd, sunset_jd, sunrise_utc, sunset_utc


def jd_from_calendar(yr, mo, dy, hour_utc=0.0):
    """Julian Day from calendar date (Gregorian)."""
    if mo <= 2:
        yr -= 1; mo += 12
    a = yr // 100
    b = 2 - a + a // 4
    return (int(365.25 * (yr + 4716)) + int(30.6001 * (mo + 1))
            + dy + hour_utc / 24.0 + b - 1524.5)


def planetary_hours(date_str: str, lat: float, lon: float, utc: float) -> dict:
    """
    Calculate all 24 planetary hours for a given date and location.
    Returns day hours (sunrise to sunset) and night hours (sunset to next sunrise).

    Each hour entry:
      hour_number: 1-24
      period: 'day' | 'night'
      planet: lowercase name
      planet_ru: Russian name
      glyph: astrological glyph
      start_utc: float (hours)
      end_utc: float (hours)
      start_str: "HH:MM" in local time
      end_str: "HH:MM" in local time
      keyword: activity recommendation
      is_current: bool (whether this hour is active now)
    """
    from datetime import datetime, timezone, timedelta

    rise_jd, set_jd, rise_h, set_h = _sunrise_sunset_approx(date_str, lat, lon, utc)

    # Next day's sunrise
    try:
        yr, mo, dy = [int(x) for x in date_str.split("-")]
    except ValueError:
        from datetime import date as _d
        today = _d.today()
        yr, mo, dy = today.year, today.month, today.day

    # Next sunrise approximate (same params, +1 day)
    from datetime import date as _date, timedelta as _td
    from_date = _date(yr, mo, dy)
    next_date = from_date + _td(days=1)
    _, _, rise_next_h, _ = _sunrise_sunset_approx(next_date.isoformat(), lat, lon, utc)
    rise_next_h_adj = rise_next_h + 24.0  # shift by 24h for continuity

    # Day/night duration in hours
    day_dur   = set_h - rise_h
    night_dur = rise_next_h_adj - set_h
    day_hour_len   = day_dur / 12.0
    night_hour_len = night_dur / 12.0

    # Determine ruling planet for this weekday (hour 1 of day)
    weekday = from_date.weekday()  # 0=Mon ... 6=Sun
    day_ruler = _DAY_RULER[weekday]
    start_idx = _DAY_RULER_START[day_ruler]

    # Current time for is_current detection
    now_utc = datetime.now(timezone.utc)
    now_h = now_utc.hour + now_utc.minute / 60.0 + now_utc.second / 3600.0

    def _fmt(h_utc):
        h_local = h_utc  # already in local time via UTC offset convention
        h_local_mod = h_local % 24
        hh = int(h_local_mod)
        mm = int((h_local_mod % 1) * 60)
        return f"{hh:02d}:{mm:02d}"

    hours = []
    # Day hours (1-12)
    for i in range(12):
        planet = _CHALDEAN[(start_idx + i) % 7]
        start  = rise_h + i * day_hour_len
        end    = start + day_hour_len
        hours.append({
            "hour_number": i + 1,
            "period":      "day",
            "planet":      planet,
            "planet_ru":   _PLANET_RU[planet],
            "glyph":       _PLANET_GLYPHS[planet],
            "start_utc":   round(start, 4),
            "end_utc":     round(end, 4),
            "start_str":   _fmt(start),
            "end_str":     _fmt(end),
            "keyword":     _PLANET_KEYWORDS[planet],
            "is_current":  start <= now_h < end,
        })
    # Night hours (13-24)
    for i in range(12):
        planet = _CHALDEAN[(start_idx + 12 + i) % 7]
        start  = set_h + i * night_hour_len
        end    = start + night_hour_len
        start_disp = start % 24
        end_disp   = end % 24
        hours.append({
            "hour_number": 13 + i,
            "period":      "night",
            "planet":      planet,
            "planet_ru":   _PLANET_RU[planet],
            "glyph":       _PLANET_GLYPHS[planet],
            "start_utc":   round(start_disp, 4),
            "end_utc":     round(end_disp, 4),
            "start_str":   _fmt(start_disp),
            "end_str":     _fmt(end_disp),
            "keyword":     _PLANET_KEYWORDS[planet],
            "is_current":  start_disp <= now_h < end_disp,
        })

    current = next((h for h in hours if h["is_current"]), None)
    return {
        "date":           date_str,
        "lat":            lat,
        "lon":            lon,
        "day_ruler":      day_ruler,
        "day_ruler_ru":   _PLANET_RU[day_ruler],
        "day_ruler_glyph":_PLANET_GLYPHS[day_ruler],
        "sunrise_local":  _fmt(rise_h),
        "sunset_local":   _fmt(set_h),
        "day_hour_len_min":  round(day_hour_len * 60, 1),
        "night_hour_len_min":round(night_hour_len * 60, 1),
        "hours":          hours,
        "current_hour":   current,
    }


# ══════════════════════════════════════════════════════════════════════════════
# SIDEREAL / AYANAMSA
# ══════════════════════════════════════════════════════════════════════════════

# Ayanamsa values for popular systems (at J2000.0 + rate °/year)
_AYANAMSA_SYSTEMS = {
    "lahiri":   {"base": 23.8559720, "rate": 0.013972},   # Official Indian (Chitrapaksha)
    "raman":    {"base": 22.4600000, "rate": 0.013972},   # B.V. Raman
    "fagan_bradley": {"base": 24.0424370, "rate": 0.013960},
    "krishnamurti": {"base": 23.8500000, "rate": 0.013972},
    "yukteshwar": {"base": 22.4600000, "rate": 0.013972},
    "de_luce":  {"base": 29.5800000, "rate": 0.013972},
    "djwhal_khul": {"base": 23.8600000, "rate": 0.013972},
}

# J2000.0 = 2451545.0
_J2000 = 2451545.0
_JULIAN_YEAR = 365.25


def ayanamsa(JD: float, system: str = "lahiri") -> float:
    """
    Calculate ayanamsa (tropical - sidereal offset) in degrees for a given Julian Day.
    Uses Swiss Ephemeris if available for Lahiri, otherwise polynomial approximation.
    """
    system = system.lower()

    if system == "lahiri" and _SE_OK:
        try:
            import swisseph as _swe
            _swe.set_sid_mode(_swe.SIDM_LAHIRI)
            return _swe.get_ayanamsa_ut(JD)
        except Exception:
            pass

    params = _AYANAMSA_SYSTEMS.get(system, _AYANAMSA_SYSTEMS["lahiri"])
    years_from_j2000 = (JD - _J2000) / _JULIAN_YEAR
    return params["base"] + params["rate"] * years_from_j2000


def tropical_to_sidereal(lon: float, JD: float, system: str = "lahiri") -> float:
    """Convert tropical longitude to sidereal (subtract ayanamsa)."""
    return n360(lon - ayanamsa(JD, system))


def sidereal_to_tropical(lon: float, JD: float, system: str = "lahiri") -> float:
    """Convert sidereal longitude to tropical (add ayanamsa)."""
    return n360(lon + ayanamsa(JD, system))


def calc_sidereal_chart(JD: float, system: str = "lahiri") -> dict:
    """
    Return planet longitudes in sidereal zodiac for a given ayanamsa system.
    Returns {planet: {tropical_lon, sidereal_lon, sign_tropical, sign_sidereal, ayanamsa, deg_min}}
    """
    tropical_planets = calc_planets(JD)
    ayan = ayanamsa(JD, system)
    result = {}
    for planet, t_lon in tropical_planets.items():
        s_lon = n360(t_lon - ayan)
        t_idx = int(t_lon / 30)
        s_idx = int(s_lon / 30)
        s_d_in = s_lon % 30.0
        result[planet] = {
            "tropical_lon":   round(t_lon, 4),
            "sidereal_lon":   round(s_lon, 4),
            "sign_tropical":  SIGN_NAMES[t_idx],
            "sign_sidereal":  SIGN_NAMES[s_idx],
            "deg_in_sign":    round(s_d_in, 4),
            "deg_min":        f"{int(s_d_in)}°{int((s_d_in % 1) * 60):02d}'",
            "ayanamsa":       round(ayan, 4),
        }
    return result


def list_ayanamsa_systems() -> list:
    """Return list of available ayanamsa systems."""
    return list(_AYANAMSA_SYSTEMS.keys()) + ["lahiri"]


# ══════════════════════════════════════════════════════════════════════════════
# CLI OUTPUT FORMATTING
# ══════════════════════════════════════════════════════════════════════════════

def format_chart_text(chart):
    """Pretty-print a natal chart."""
    m = chart["metadata"]
    lines = [
        "═"*60,
        f" NATAL CHART  {m['date']} {m['time']}  UTC{m['utc']:+g}",
        f" Location: {m['lat']:+.4f}°, {m['lon']:+.4f}°  |  {m['houses_system'].upper()} houses",
        "═"*60,
        "\n PLANETS",
        "─"*60,
        f" {'Planet':<12} {'Lon':>8}  {'Sign':<14} {'Deg':<8}  Rx  House",
        "─"*60,
    ]
    for p, d in chart["planets"].items():
        rx = "℞" if d["retrograde"] else " "
        lines.append(f" {p:<12} {d['lon']:>8.4f}  {d['glyph']}{d['sign']:<13} {d['deg_min']:<8}  {rx}   {d['house']}")

    lines += ["\n HOUSES", "─"*60]
    for i in range(1,13):
        d = chart["houses"][f"h{i}"]
        lines.append(f" House {i:>2}       {d['lon']:>8.4f}  {d['glyph']}{d['sign']:<13} {d['deg_min']}")

    if "aspects" in chart:
        lines += ["\n ASPECTS", "─"*60]
        majors = [a for a in chart["aspects"] if a["aspect"] in ("conjunction","sextile","square","trine","opposition")]
        for a in majors:
            app = "→" if a["applying"] else "←"
            lines.append(f" {a['p1']:<10} {a['glyph']} {a['p2']:<10}  {a['aspect']:<15} orb {a['orb']:.2f}° {app}")
        minors = [a for a in chart["aspects"] if a["aspect"] not in ("conjunction","sextile","square","trine","opposition")]
        if minors:
            lines.append(" — minor aspects —")
            for a in minors:
                lines.append(f" {a['p1']:<10} {a['glyph']} {a['p2']:<10}  {a['aspect']:<15} orb {a['orb']:.2f}°")

    if "patterns" in chart and chart["patterns"]:
        lines += ["\n ASPECT PATTERNS", "─"*60]
        for p in chart["patterns"]:
            if p["type"] in ("t_square","yod"):
                lines.append(f" {p['type'].upper()}: {p.get('axis',p.get('base',''))}, focal/apex: {p.get('focal',p.get('apex',''))}")
            else:
                lines.append(f" {p['type'].upper()}: {p.get('planets','')}")

    if "lunar_phase" in chart:
        lp = chart["lunar_phase"]
        lines += ["\n LUNAR PHASE", "─"*60,
                  f" {lp['phase']}  ({lp['angle']:.1f}° Moon-Sun)"]

    if "arabic_parts" in chart:
        lines += ["\n ARABIC PARTS", "─"*60]
        for name, val in chart["arabic_parts"].items():
            if isinstance(val, dict):
                lines.append(f" Part of {name.capitalize():<12} {val['deg_min']} {val['sign']}")

    if "dignities" in chart:
        lines += ["\n DIGNITIES", "─"*60]
        for p, d in chart["dignities"].items():
            if d["label"] != "peregrine" and d["score"] != 0:
                lines.append(f" {p:<12} {d['label']:<25} score: {d['score']:+d}")

    # Vertex / Anti-Vertex
    if "vtx" in chart.get("houses", {}):
        lines += ["\n VERTEX / ANTI-VERTEX", "─"*60]
        vtx = chart["houses"]["vtx"]
        avx = chart["houses"]["avx"]
        lines.append(f" Vertex      {vtx['lon']:>8.4f}  {vtx['glyph']}{vtx['sign']:<13} {vtx['deg_min']}")
        lines.append(f" Anti-Vertex {avx['lon']:>8.4f}  {avx['glyph']}{avx['sign']:<13} {avx['deg_min']}")

    # Sect
    if "sect" in chart:
        lines += ["\n SECT & SPEED", "─"*60]
        lines.append(f" Chart sect: {chart['sect'].upper()}")
        for p, pd in chart["planets"].items():
            sp_st = pd.get("speed_status", "")
            sect_st = pd.get("sect_status", "")
            oob = "OOB" if pd.get("oob") else "   "
            dec = pd.get("dec", 0)
            lines.append(f" {p:<12} dec={dec:+7.3f}°  {oob}  speed={pd.get('speed',0):+7.4f}°/d  "
                         f"{sp_st:<10}  sect: {sect_st or 'n/a'}")

    # Dispositors
    if "dispositors" in chart:
        disp = chart["dispositors"]
        lines += ["\n DISPOSITORS", "─"*60]
        if disp.get("mutual_receptions"):
            for a, b in disp["mutual_receptions"]:
                lines.append(f" Mutual Reception: {a} \u2194 {b}")
        if disp.get("final_dispositors"):
            lines.append(f" Final Dispositor(s): {', '.join(disp['final_dispositors'])}")

    # Decans and Terms
    lines += ["\n DECANS & TERMS", "─"*60]
    for p, pd in chart["planets"].items():
        lines.append(f" {p:<12} Decan {pd.get('decan','?')} ({pd.get('decan_ruler','?'):<8})  "
                     f"Term: {pd.get('term_ruler','?')}")

    # Moon mansion
    moon_pd = chart["planets"].get("moon", {})
    if "mansion_num" in moon_pd:
        lines += ["\n MOON MANSION", "─"*60]
        lines.append(f" Mansion {moon_pd['mansion_num']:>2}: {moon_pd['mansion_name']}  "
                     f"({moon_pd['mansion_nature']})")

    # Fixed stars
    if "fixed_stars" in chart and chart["fixed_stars"]:
        lines += ["\n FIXED STARS (within 1\u00b0)", "─"*60]
        for fs in chart["fixed_stars"]:
            lines.append(f" {fs['star']:<20} conj {fs['planet']:<10}  "
                         f"orb={fs['orb']:.3f}\u00b0  {fs['nature']}")

    lines.append("═"*60)
    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(
        description="HOLO Natal — Full Astrological Engine",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python astro_engine.py --date 1990-03-15 --time 14:30 --lat 55.75 --lon 37.61 --utc 3
  python astro_engine.py --date 1990-03-15 --time 14:30 --lat 55.75 --lon 37.61 --utc 3 --houses koch --json
  python astro_engine.py --date 1990-03-15 --time 14:30 --lat 55.75 --lon 37.61 --utc -5 --houses all
  python astro_engine.py --date 1990-03-15 --time 14:30 --lat 55.75 --lon 37.61 --utc 3 --midpoints --antiscia
""")
    parser.add_argument("--date", required=True, help="Birth date YYYY-MM-DD")
    parser.add_argument("--time", required=True, help="Birth time HH:MM or HH:MM:SS")
    parser.add_argument("--lat",  required=True, type=float, help="Latitude (+ north)")
    parser.add_argument("--lon",  required=True, type=float, help="Longitude (+ east)")
    parser.add_argument("--utc",  required=True, type=float, help="UTC offset in hours (e.g. +3, -5)")
    parser.add_argument("--houses", default="placidus",
                        choices=["placidus","equal","whole_sign","porphyry","koch","all"],
                        help="House system (default: placidus)")
    parser.add_argument("--julian", action="store_true", help="Use Julian calendar")
    parser.add_argument("--json",   action="store_true", help="Output as JSON")
    parser.add_argument("--midpoints", action="store_true", help="Include midpoints")
    parser.add_argument("--antiscia",  action="store_true", help="Include antiscia")
    parser.add_argument("--no-aspects",  action="store_true", help="Skip aspects")
    parser.add_argument("--no-patterns", action="store_true", help="Skip aspect patterns")
    parser.add_argument("--fixed-stars", action="store_true", help="Include fixed star conjunctions")

    args = parser.parse_args()

    yr, mo, dy = parse_date_arg(args.date)
    h,  mi, sc = parse_time_arg(args.time)

    if args.houses == "all":
        systems = list(HOUSE_SYSTEMS.keys())
    else:
        systems = [args.houses]

    charts = {}
    for sys_name in systems:
        charts[sys_name] = calc_chart(
            yr, mo, dy, h, mi, sc, args.lat, args.lon, args.utc,
            houses_system=sys_name, julian=args.julian,
            include_aspects=not args.no_aspects,
            include_patterns=not args.no_patterns,
            include_midpoints=args.midpoints,
            include_antiscia=args.antiscia,
            include_fixed_stars=args.fixed_stars,
        )

    if args.json:
        output = charts if len(charts) > 1 else list(charts.values())[0]
        print(json.dumps(output, ensure_ascii=False, indent=2))
    else:
        for sys_name, chart in charts.items():
            if len(charts) > 1:
                print(f"\n{'▓'*60}")
                print(f"  HOUSE SYSTEM: {sys_name.upper()}")
                print(f"{'▓'*60}")
            print(format_chart_text(chart))


if __name__ == "__main__":
    main()
