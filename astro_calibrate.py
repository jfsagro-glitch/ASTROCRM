#!/usr/bin/env python3
"""
Astro Engine Calibration Script
Mass calibration on AstroDatabank dataset.

Usage:
  python astro_calibrate.py --db astro.db --limit 5000 --rating AA
  python astro_calibrate.py --db astro.db --full --output results.json
"""

import argparse
import json
import math
import re
import sqlite3
import time
from collections import defaultdict


def n360(d):
    r = d % 360
    return r + 360 if r < 0 else r


def rad(d):
    return d * math.pi / 180


def deg(r):
    return r * 180 / math.pi


def vs(terms, tau):
    return sum(A * math.cos(B + C * tau) for A, B, C in terms)


def jd(yr, mo, dy, h=0, mi=0, sc=0, julian=False):
    if mo <= 2:
        yr -= 1
        mo += 12
    if julian:
        b = 0  # Julian calendar — use as-is
    elif (yr, mo, dy) >= (1582, 10, 15):
        a = math.floor(yr / 100)
        b = 2 - a + math.floor(a / 4)  # Gregorian correction
    else:
        b = 0  # Before Gregorian reform — treat as Julian
    return (
        math.floor(365.25 * (yr + 4716))
        + math.floor(30.6001 * (mo + 1))
        + dy
        + (h + mi / 60 + sc / 3600) / 24
        + b
        - 1524.5
    )


def T(JD):
    return (JD - 2451545.0) / 36525


def tau(JD):
    return (JD - 2451545.0) / 365250.0


# VSOP87 Earth
EL0 = [
    [175347046, 0, 0],
    [3341656, 4.6692568, 6283.07585],
    [34894, 4.626, 12566.152],
    [3497, 2.744, 5753.385],
    [3418, 2.829, 3.523],
    [3136, 3.628, 77.553],
    [2676, 4.418, 7860.419],
    [2343, 6.135, 3930.210],
    [1324, 0.742, 11506.770],
    [1273, 2.038, 529.691],
    [1199, 1.102, 1577.344],
    [990, 5.233, 5884.927],
    [902, 2.045, 26.298],
    [857, 3.509, 398.149],
    [780, 1.180, 5223.694],
]
EL1 = [
    [628331966747, 0, 0],
    [206059, 2.678235, 6283.07585],
    [4303, 2.635, 12566.152],
    [425, 1.590, 3.523],
    [119, 5.796, 26.298],
    [109, 2.966, 1577.344],
    [93, 2.592, 18849.228],
    [72, 1.139, 529.691],
]
ER0 = [
    [100013989, 0, 0],
    [1670700, 3.0984635, 6283.07585],
    [13956, 3.055, 12566.152],
    [3084, 5.199, 77.553],
    [1628, 1.174, 5753.385],
    [1576, 2.847, 7860.419],
    [924, 5.453, 11506.770],
    [542, 4.564, 3930.210],
    [472, 3.661, 5884.927],
    [346, 0.964, 5507.553],
]
ER1 = [[103019, 1.10749, 6283.07585], [1721, 1.064, 12566.152], [702, 3.143, 5753.385]]


def earth(JD):
    t = tau(JD)
    L = n360(deg((vs(EL0, t) + vs(EL1, t) * t) * 1e-8))
    R = (vs(ER0, t) + vs(ER1, t) * t) * 1e-8
    return L, R


# Sun (Meeus Ch.25)
def sun(JD):
    t = T(JD)
    L0 = n360(280.46646 + 36000.76983 * t + 3.032e-4 * t * t)
    M = n360(357.52911 + 35999.05029 * t - 1.537e-4 * t * t)
    Mr = rad(M)
    C = (
        (1.914602 - 4.817e-3 * t - 1.4e-5 * t * t) * math.sin(Mr)
        + (1.9993e-2 - 1.01e-4 * t) * math.sin(2 * Mr)
        + 2.89e-4 * math.sin(3 * Mr)
    )
    om = n360(125.04 - 1934.136 * t)
    lon = n360(L0 + C - 5.69e-3 - 4.78e-3 * math.sin(rad(om)))
    nu = n360(M + C)
    e = 0.016708634 - 4.2037e-5 * t
    R = 1.000001018 * (1 - e * e) / (1 + e * math.cos(rad(nu)))
    return lon, R


# Moon (Meeus Ch.47, 60-term)
MOON_TBL = [
    [0, 0, 1, 0, 6288774],
    [2, 0, -1, 0, 1274027],
    [2, 0, 0, 0, 658314],
    [0, 0, 2, 0, 213618],
    [0, 1, 0, 0, -185116],
    [0, 0, 0, 2, -114332],
    [2, 0, -2, 0, 58793],
    [2, -1, -1, 0, 57066],
    [2, 0, 1, 0, 53322],
    [2, -1, 0, 0, 45758],
    [0, 1, -1, 0, -40923],
    [1, 0, 0, 0, -34720],
    [0, 1, 1, 0, -30383],
    [2, 0, 0, -2, 15327],
    [0, 0, 1, 2, -12528],
    [0, 0, 1, -2, 10980],
    [4, 0, -1, 0, 10675],
    [0, 0, 3, 0, 10034],
    [4, 0, -2, 0, 8548],
    [2, 1, -1, 0, -7888],
    [2, 1, 0, 0, -6766],
    [1, 0, -1, 0, -5163],
    [1, 1, 0, 0, 4987],
    [2, -1, 1, 0, 4036],
    [2, 0, 2, 0, 3994],
    [4, 0, 0, 0, 3861],
    [2, 0, -3, 0, 3665],
    [0, 1, -2, 0, -2689],
    [2, 0, -1, 2, -2602],
    [2, -1, -2, 0, 2390],
    [1, 0, 1, 0, -2348],
    [2, -2, 0, 0, 2236],
    [0, 1, 2, 0, -2120],
    [0, 2, 0, 0, -2069],
    [2, -2, -1, 0, 2048],
    [2, 0, 1, -2, -1773],
    [2, 0, 0, 2, -1595],
    [4, -1, -1, 0, 1215],
    [0, 0, 2, 2, -1110],
    [3, 0, -1, 0, -892],
    [2, 1, 1, 0, -810],
    [4, -1, -2, 0, 759],
    [0, 2, -1, 0, -713],
    [2, 2, -1, 0, -700],
    [2, 1, -2, 0, 691],
    [2, -1, 0, -2, 596],
    [4, 0, 1, 0, 549],
    [0, 0, 4, 0, 537],
    [4, -1, 0, 0, 520],
    [1, 0, -2, 0, -487],
    [2, 1, 0, -2, -399],
    [0, 0, 2, -2, -381],
    [1, 1, 1, 0, 351],
    [3, 0, -2, 0, -340],
    [4, 0, -3, 0, 330],
    [2, -1, 2, 0, 327],
    [0, 2, 1, 0, -323],
    [1, 1, -1, 0, 299],
    [2, 0, 3, 0, 294],
]


def moon(JD):
    t = T(JD)
    Lp = n360(218.3165 + 481267.8813 * t)
    M = n360(357.5291 + 35999.0503 * t)
    Mp = n360(134.9634 + 477198.8676 * t)
    F = n360(93.2721 + 483202.0175 * t)
    D = n360(297.8502 + 445267.1115 * t)
    E = 1 - 2.516e-3 * t - 7.4e-6 * t * t
    Lr, Mr, Mpr, Fr, Dr = [rad(x) for x in [Lp, M, Mp, F, D]]

    sL = 0
    for D_, M_, Mp_, F_, cl in MOON_TBL:
        Ef = E if abs(M_) == 1 else (E * E if abs(M_) == 2 else 1)
        sL += Ef * cl * math.sin(D_ * Dr + M_ * Mr + Mp_ * Mpr + F_ * Fr)

    A1 = rad(n360(119.75 + 131.849 * t))
    A2 = rad(n360(53.09 + 479264.29 * t))
    sL += 3958 * math.sin(A1) + 1962 * math.sin(Lr - Fr) + 318 * math.sin(A2)

    om = rad(n360(125.0445 - 1934.1363 * t))
    slon = sun(JD)[0]
    dn = (
        -17.2 * math.sin(om)
        - 1.32 * math.sin(2 * rad(slon))
        - 0.23 * math.sin(2 * Mpr)
        + 0.21 * math.sin(2 * om)
    ) / 3600

    return n360(Lp + sL / 1e6 + dn)


# VSOP87 outer planets
VSOP_DATA = {
    "venus": {
        "L": [
            [
                [317614667, 0, 0],
                [1353968, 5.5931332, 10213.2855462],
                [89892, 5.3065, 20426.571],
                [5477, 4.4163, 7860.419],
                [3456, 2.6996, 11790.629],
                [2372, 2.9938, 3930.210],
                [1664, 4.2502, 1577.344],
                [1438, 4.1575, 9153.904],
                [1317, 5.1867, 26.298],
                [761, 1.950, 529.691],
                [708, 1.065, 775.523],
            ],
            [
                [1021352943052, 0, 0],
                [95708, 2.46424, 10213.2855462],
                [14445, 0.51625, 20426.571],
                [213, 1.795, 30639.857],
                [174, 2.655, 26.298],
                [152, 6.106, 1577.344],
            ],
            [[54127, 0, 0], [3891, 0.3451, 10213.2855462], [1338, 2.0201, 20426.571]],
        ],
        "R": [
            [
                [72334821, 0, 0],
                [489824, 4.021518, 10213.2855462],
                [1658, 4.9021, 20426.571],
                [1632, 2.8455, 7860.419],
                [1378, 1.1285, 11790.629],
                [498, 2.587, 9153.904],
                [374, 1.423, 3930.210],
            ],
            [[34551, 0.89199, 10213.2855462], [234, 1.772, 20426.571], [234, 3.142, 0.0]],
        ],
    },
    "mars": {
        "L": [
            [
                [620347711, 0, 0],
                [18656368, 5.0503942, 3340.6124267],
                [1108217, 5.4009984, 6681.2248534],
                [91798, 5.7527, 10021.8372],
                [27745, 5.9705, 5621.8429],
                [12316, 0.8147, 2810.9215],
                [10610, 2.9281, 2281.2305],
                [8927, 4.1574, 0.0173],
                [8716, 6.2450, 13362.4497],
                [7775, 3.3397, 5884.9268],
                [3575, 1.6619, 2544.3144],
                [2512, 3.2172, 1751.5395],
                [2468, 4.0158, 3344.1355],
            ],
            [
                [334085627474, 0, 0],
                [1458227, 3.6042605, 3340.6124267],
                [164901, 3.926313, 6681.2248534],
                [19963, 4.26594, 10021.8372],
                [3452, 4.7321, 3337.0893],
                [2485, 4.6115, 13362.4497],
                [842, 4.459, 2281.231],
                [538, 5.016, 398.149],
            ],
        ],
        "R": [
            [
                [153033488, 0, 0],
                [14184953, 3.4800426, 3340.6124267],
                [660776, 3.8178, 6681.2249],
                [46179, 4.1518, 10021.8373],
                [8109, 5.5561, 2810.9215],
                [7485, 1.7724, 5621.8429],
                [5765, 0.0, 0.0],
                [5726, 0.8801, 2281.2305],
            ],
            [
                [1107433, 2.0325052, 3340.6124267],
                [103176, 2.3707, 6681.2248534],
                [12877, 0, 0],
                [10816, 2.7089, 10021.8372],
            ],
        ],
    },
    "jupiter": {
        "L": [
            [
                [59954691, 0, 0],
                [9695899, 5.0619179, 529.6909651],
                [573610, 1.44407, 7.1135498],
                [306389, 5.41711, 1059.38193],
                [97178, 4.14264, 632.78374],
                [72903, 3.64043, 522.57742],
                [64264, 3.41145, 103.09277],
                [39806, 2.29377, 419.48462],
                [38858, 1.27232, 316.39187],
                [27965, 1.78455, 536.80451],
                [13025, 5.38054, 1589.0729],
                [12350, 5.663, 1162.4747],
                [10830, 0.250, 846.08283],
                [10677, 4.440, 2118.76386],
            ],
            [
                [52993480757, 0, 0],
                [489741, 4.2202441, 529.6909651],
                [228919, 6.0261793, 7.1135498],
                [27655, 4.57266, 1059.38193],
                [20721, 5.45939, 522.57742],
                [12106, 0.16986, 536.80451],
                [6068, 4.4294, 103.09277],
                [5765, 2.5428, 419.48462],
                [4398, 4.9891, 632.78374],
            ],
        ],
        "R": [
            [
                [520887429, 0, 0],
                [25209327, 3.4910565, 529.6909651],
                [610600, 3.840, 1059.38193],
                [282029, 2.575, 632.78374],
                [187647, 2.076, 522.57742],
                [86793, 0.710, 419.48462],
                [72063, 0.215, 536.80451],
                [65517, 5.972, 316.39187],
                [30135, 2.161, 949.17561],
            ],
            [[1271802, 2.6493751, 529.6909651], [61662, 3.001, 1059.38193], [53444, 3.897, 632.78374], [41390, 0, 0]],
        ],
    },
    "saturn": {
        "L": [
            [
                [87401354, 0, 0],
                [11107660, 3.9620509, 213.2990954],
                [1414151, 4.5858152, 7.1135498],
                [398379, 0.52121, 206.18554],
                [350769, 3.30330, 426.59819],
                [206816, 0.24635, 103.09277],
                [79271, 3.84007, 220.41264],
                [23990, 4.66977, 110.20632],
                [16574, 0.43719, 419.48462],
                [15820, 0.93809, 632.78374],
                [15054, 2.71670, 639.89729],
                [13005, 5.98119, 11.04570],
                [12726, 1.18947, 323.50542],
            ],
            [
                [21354295596, 0, 0],
                [1296855, 1.8282054, 213.2990954],
                [564348, 2.88522, 7.11355],
                [107679, 2.27769, 206.18554],
                [98323, 1.08020, 426.59819],
                [40255, 2.04256, 220.41264],
                [19942, 1.27955, 103.09277],
                [10512, 2.7488, 14.227],
            ],
            [[116441, 2.0991, 213.29910], [91141, 0.071, 0], [90592, 1.90982, 426.59819]],
        ],
        "R": [
            [
                [955758136, 0, 0],
                [52921382, 2.3940820, 213.2990954],
                [1873680, 5.0309330, 426.59819],
                [1464664, 1.6477810, 7.11355],
                [821891, 5.93524, 206.18554],
                [547507, 5.01543, 103.09277],
                [371684, 2.27169, 220.41264],
                [131990, 5.37452, 110.20632],
            ],
            [
                [6182981, 0.255959, 213.2990954],
                [506578, 0.71110, 426.59819],
                [341394, 5.79594, 0],
                [188491, 0.47285, 206.18554],
                [186262, 3.14139, 220.41264],
                [143891, 1.40770, 7.11355],
            ],
        ],
    },
    "uranus": {
        "L": [
            [
                [548129294, 0, 0],
                [9260408, 0.8910642, 74.7815986],
                [1504248, 3.6271926, 1.4844727],
                [365982, 1.899622, 73.2971252],
                [272328, 3.358237, 149.5631971],
                [70328, 5.39254, 63.7358799],
                [68893, 6.09292, 76.2660713],
                [61999, 2.26952, 2.9689454],
                [61951, 2.85099, 11.045698],
                [26469, 3.14152, 71.8126516],
                [25711, 6.11380, 454.9093839],
                [21079, 4.36059, 148.0787258],
                [17819, 1.74437, 36.6485723],
                [14613, 4.73732, 3.9321532],
                [11163, 5.82682, 224.3447957],
                [10998, 0.48865, 138.5174968],
                [9527, 2.9552, 35.1641089],
                [7599, 0.0518, 77.7504847],
            ],
            [
                [7502543122, 0, 0],
                [154458, 5.242017, 74.781599],
                [24456, 1.71256, 1.48447],
                [9258, 0.42084, 11.04570],
                [8190, 5.9124, 149.5632],
                [6462, 0.7645, 70.32818],
                [4421, 3.4926, 74.7816],
                [4132, 0.71, 76.2661],
            ],
        ],
        "R": [
            [
                [1921264848, 0, 0],
                [88784984, 5.6007707, 74.7815986],
                [3440836, 0.3285049, 73.2971252],
                [2055653, 1.7829367, 149.5631971],
                [649322, 4.522473, 76.2660713],
                [639514, 5.655712, 1.4844727],
                [401643, 3.462203, 224.3447957],
                [261907, 2.964929, 63.7358799],
                [228804, 3.140492, 11.045698],
                [180518, 4.730117, 35.1641089],
                [177262, 3.124909, 148.0787258],
                [138468, 4.052399, 454.9093839],
            ],
            [[1479896, 3.672, 74.7816], [71212, 6.222, 149.5632], [28185, 3.063, 76.2661], [26558, 4.595, 73.2971], [19122, 0, 0]],
        ],
    },
    "neptune": {
        "L": [
            [
                [531188633, 0, 0],
                [1798476, 2.9010127, 38.1330356],
                [1019729, 0.485826, 1.4844727],
                [124532, 4.83008, 36.6485723],
                [42064, 5.41055, 2.9689454],
                [37715, 6.09222, 35.1641089],
                [33785, 1.24489, 76.2660713],
                [16483, 8e-5, 491.5579295],
                [9199, 4.9375, 175.1660598],
                [8994, 0.2746, 39.6175402],
                [4216, 1.9871, 73.2971250],
            ],
            [
                [3837687717, 0, 0],
                [16604, 4.86319, 1.48447],
                [15807, 2.27923, 38.13304],
                [3335, 3.6848, 76.2661],
                [1306, 3.6732, 2.9690],
                [605, 1.505, 35.1641],
                [461, 2.381, 491.5579],
            ],
        ],
        "R": [
            [
                [3007013206, 0, 0],
                [27062259, 1.3199491, 38.1330356],
                [1691764, 3.2518614, 36.6485723],
                [807831, 5.185948, 1.4844727],
                [537761, 4.521139, 35.1641089],
                [495258, 3.998429, 39.6175402],
                [274208, 2.462354, 2.9689454],
                [135134, 3.372206, 76.2660713],
                [121800, 5.797544, 74.7815884],
            ],
            [[236339, 0.70483, 38.1330356], [13220, 3.32015, 1.48447], [8622, 6.2163, 35.1641]],
        ],
    },
}


def vsop_geo(planet_name, JD):
    """VSOP87 geocentric ecliptic longitude."""
    d = VSOP_DATA[planet_name]
    t = tau(JD)
    Lp = n360(deg(sum(vs(layer, t) * t ** i for i, layer in enumerate(d["L"])) * 1e-8))
    Rp = sum(vs(layer, t) * t ** i for i, layer in enumerate(d["R"])) * 1e-8
    Le, Re = earth(JD)
    xp = Rp * math.cos(rad(Lp))
    yp = Rp * math.sin(rad(Lp))
    xe = Re * math.cos(rad(Le))
    ye = Re * math.sin(rad(Le))
    return n360(deg(math.atan2(yp - ye, xp - xe)))


# Kepler for Mercury
ELT = {
    "mercury": {
        "L": [252.250906, 149472.6746358, 3.035e-4, 0],
        "a": 0.38709831,
        "e": [0.20563175, 2.0407e-5, -2.83e-8],
        "i": [7.004986, -5.9516e-3],
        "om": [77.456119, 0.15886, -1.342e-5],
        "Om": [48.330893, -0.12542, -8.833e-5],
    },
}


def kepler_geo(name, JD):
    t = T(JD)
    el = ELT[name]

    def poly(c, x):
        return sum(v * x ** i for i, v in enumerate(c))

    L = n360(poly(el["L"], t))
    ecc = poly(el["e"], t)
    incl = rad(poly(el["i"], t))
    om = rad(n360(poly(el["om"], t)))
    Om = rad(n360(poly(el["Om"], t)))
    M = rad(n360(L - deg(om)))

    E = M + ecc * math.sin(M) * (1 + ecc * math.cos(M))
    for _ in range(50):
        dE = (M + ecc * math.sin(E) - E) / (1 - ecc * math.cos(E))
        E += dE
        if abs(dE) < 1e-12:
            break

    nu = 2 * math.atan2(math.sqrt(1 + ecc) * math.sin(E / 2), math.sqrt(1 - ecc) * math.cos(E / 2))
    r = el["a"] * (1 - ecc * math.cos(E))
    w = om - Om

    x = r * (math.cos(Om) * math.cos(nu + w) - math.sin(Om) * math.sin(nu + w) * math.cos(incl))
    y = r * (math.sin(Om) * math.cos(nu + w) + math.cos(Om) * math.sin(nu + w) * math.cos(incl))

    sL, sR = sun(JD)
    Le = rad(n360(sL + 180))
    return n360(deg(math.atan2(y - sR * math.sin(Le), x - sR * math.cos(Le))))


def node(JD):
    t = T(JD)
    return n360(125.04452 - 1934.136261 * t + 2.0708e-3 * t * t + t * t * t / 450000)


def lilith(JD):
    t = T(JD)
    return n360(83.3532 + 4069.0137 * t - 0.01032 * t * t - t * t * t / 80053 + 180)


PLUTO_TBL = [
    [2422324.5, 99.20], [2424151.5, 109.00], [2425977.5, 118.50], [2427803.5, 124.70], [2429629.5, 130.00],
    [2431456.5, 155.00], [2433282.5, 177.50], [2434012.5, 166.50], [2434743.5, 168.20], [2435473.5, 168.50],
    [2436204.5, 170.00], [2436934.5, 163.10], [2437665.5, 165.80], [2438395.5, 167.80], [2439126.5, 170.70],
    [2439856.5, 172.00], [2440587.5, 174.00], [2441317.5, 176.80], [2442048.5, 179.50], [2442778.5, 185.70],
    [2443144.5, 188.20], [2443509.5, 190.80], [2443874.5, 193.40], [2444097.9, 197.00], [2444239.5, 195.00],
    [2444605.5, 196.00], [2444970.5, 197.20], [2445335.5, 199.00], [2445700.5, 200.30], [2446066.5, 202.00],
    [2446431.5, 204.40], [2446656.3, 214.77], [2446796.5, 207.00], [2447161.5, 209.70], [2447527.5, 211.50],
    [2447892.5, 213.50], [2448622.5, 218.00], [2449353.5, 221.80], [2450083.5, 233.00], [2450814.5, 244.00],
    [2451544.5, 251.30], [2452275.5, 257.00], [2453005.5, 261.60], [2453736.5, 265.70], [2454466.5, 270.30],
    [2455197.5, 273.70], [2455927.5, 277.50], [2456658.5, 281.20], [2457388.5, 285.10], [2458119.5, 289.00],
    [2458849.5, 292.70], [2459580.5, 296.00], [2460310.5, 299.70], [2461041.5, 304.50], [2461771.5, 308.00],
    [2462502.5, 310.00],
]


def pluto(JD):
    for i in range(len(PLUTO_TBL) - 1):
        j0, l0 = PLUTO_TBL[i]
        j1, l1 = PLUTO_TBL[i + 1]
        if j0 <= JD < j1:
            return n360(l0 + (JD - j0) / (j1 - j0) * (l1 - l0))
    j0, l0 = PLUTO_TBL[-2]
    j1, l1 = PLUTO_TBL[-1]
    return n360(l0 + (JD - j0) / (j1 - j0) * (l1 - l0))


CHIRON_TBL = [
    [2440587.5, 4.217], [2442778.5, 26.917], [2444097.9, 43.900], [2444240.5, 47.917], [2444971.0, 56.983],
    [2445701.0, 66.217], [2446432.0, 74.033], [2446656.0, 80.117], [2447161.5, 85.633], [2447893.0, 90.4],
    [2448623.0, 105.1], [2450084.5, 157.117], [2451544.5, 251.367], [2455197.5, 302.183], [2458849.5, 364.017],
    [2462451.5, 386.9], [2466053.5, 409.8],
]


def chiron(JD):
    for i in range(len(CHIRON_TBL) - 1):
        j0, l0 = CHIRON_TBL[i]
        j1, l1 = CHIRON_TBL[i + 1]
        if j0 <= JD < j1:
            return n360(l0 + (JD - j0) / (j1 - j0) * (l1 - l0))
    j0, l0 = CHIRON_TBL[-2]
    j1, l1 = CHIRON_TBL[-1]
    return n360(l0 + (JD - j0) / (j1 - j0) * (l1 - l0))


def obliquity(JD):
    t = T(JD)
    return 23.4392911 - 1.3004167e-2 * t - 1.639e-7 * t * t + 5.036e-7 * t * t * t


def gmst(JD):
    t = T(JD)
    return n360(280.46061837 + 360.98564736629 * (JD - 2451545) + 3.87933e-4 * t * t - t * t * t / 38710000)


def placidus(JD, lat, lon):
    eps = obliquity(JD)
    ramc = n360(gmst(JD) + lon)
    e = rad(eps)
    phi = rad(lat)
    ra = rad(ramc)

    mc = n360(deg(math.atan2(math.sin(ra), math.cos(ra) * math.cos(e))))
    asc = n360(deg(math.atan2(math.cos(ra), -(math.sin(e) * math.tan(phi) + math.cos(e) * math.sin(ra)))))

    def cusp(frac, sign):
        L = ramc + sign * frac * 90
        for _ in range(300):
            L = n360(L)
            sinL = math.sin(rad(L))
            cosL = math.cos(rad(L))
            sinD = math.sin(e) * sinL
            if abs(sinD) >= 1:
                L += sign * 0.5
                continue
            decl = math.asin(sinD)
            tpt = math.tan(phi) * math.tan(decl)
            if abs(tpt) > 1:
                L += sign * 0.5
                continue
            dsa = deg(math.acos(-tpt))
            RA = n360(deg(math.atan2(sinL * math.cos(e), cosL)))
            md = n360(RA - ramc)
            if md > 180:
                md -= 360
            diff = sign * frac * dsa - md
            if abs(diff) < 1e-9:
                break
            L = n360(L + diff * 0.9)
        return n360(L)

    h11 = cusp(1 / 3, 1)
    h12 = cusp(2 / 3, 1)
    h8 = cusp(2 / 3, -1)
    h9 = cusp(1 / 3, -1)

    return {
        "asc": asc,
        "mc": mc,
        "h2": n360(h8 + 180),
        "h3": n360(h9 + 180),
        "h8": h8,
        "h9": h9,
        "h11": h11,
        "h12": h12,
    }


SIGN_NAMES = [
    "aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]


def sign_idx(lon):
    return int(n360(lon) / 30)


def calc_chart(yr, mo, dy, h, mi, sc, lat, lon_deg, utc_off, julian=False):
    JD = jd(yr, mo, dy, h - utc_off, mi, sc, julian=julian)
    planets = {
        "sun": sun(JD)[0],
        "moon": moon(JD),
        "mercury": kepler_geo("mercury", JD),
        "venus": vsop_geo("venus", JD),
        "mars": vsop_geo("mars", JD),
        "jupiter": vsop_geo("jupiter", JD),
        "saturn": vsop_geo("saturn", JD),
        "uranus": vsop_geo("uranus", JD),
        "neptune": vsop_geo("neptune", JD),
        "pluto": pluto(JD),
        "node": node(JD),
        "lilith": lilith(JD),
        "chiron": chiron(JD),
    }
    houses = placidus(JD, lat, lon_deg)
    return planets, houses


SIGN_NORM = {
    "ari": "aries", "tau": "taurus", "gem": "gemini", "can": "cancer", "leo": "leo",
    "vir": "virgo", "lib": "libra", "sco": "scorpio", "sag": "sagittarius",
    "cap": "capricorn", "aqu": "aquarius", "pis": "pisces",
    "aries": "aries", "taurus": "taurus", "gemini": "gemini", "cancer": "cancer",
    "virgo": "virgo", "libra": "libra", "scorpio": "scorpio", "sagittarius": "sagittarius",
    "capricorn": "capricorn", "aquarius": "aquarius", "pisces": "pisces",
}


def parse_sign_deg(s):
    """Parse 'leo 12 01' style strings into sign and degree float."""
    if not s:
        return None, None
    s = s.lower().strip()

    sign = None
    for k, v in SIGN_NORM.items():
        if k in s:
            sign = v
            break

    if sign is None:
        return None, None

    sign_i = SIGN_NAMES.index(sign)
    nums = re.findall(r"\d+", s)
    if not nums:
        return sign_i, 0.0

    d = int(nums[0])
    m = int(nums[1]) if len(nums) > 1 else 0
    return sign_i, d + m / 60.0


def angle_diff_arcmin(computed_lon, expected_sign_idx, expected_deg):
    expected_lon = expected_sign_idx * 30 + expected_deg
    diff = abs(computed_lon - expected_lon)
    if diff > 180:
        diff = 360 - diff
    return diff * 60


def parse_time(time_str):
    if not time_str:
        return None
    parts = re.findall(r"\d+", str(time_str))
    if len(parts) < 2:
        return None
    h, m = int(parts[0]), int(parts[1])
    s = int(parts[2]) if len(parts) > 2 else 0
    if h > 23 or m > 59:
        return None
    return h, m, s


def parse_date(date_str):
    if not date_str:
        return None
    m = re.match(r"(\d{4})[-/](\d{2})[-/](\d{2})", str(date_str))
    if not m:
        return None
    return int(m.group(1)), int(m.group(2)), int(m.group(3))


def parse_dm_coord(value, positive_mark, negative_mark):
    if not value:
        return None
    s = str(value).strip().lower().replace(" ", "")
    match = re.match(r"^(\d+)([a-z])(\d*)$", s)
    if not match:
        return None

    deg_part, hemi, min_part = match.groups()
    if hemi not in (positive_mark, negative_mark):
        return None

    if min_part == "":
        minutes = 0
    elif len(min_part) <= 2:
        minutes = int(min_part)
    else:
        # Some records are malformed like 46n2005 or 5e3320. Treat the trailing
        # digits as seconds and keep the leading part as arcminutes.
        minutes = int(min_part[:-2])
        seconds = int(min_part[-2:])
        minutes += seconds / 60

    sign = 1 if hemi == positive_mark else -1
    return sign * (int(deg_part) + minutes / 60)


def parse_utc_offset(value):
    if not value:
        return None
    s = str(value).strip().lower().replace(" ", "")

    # Format "hNe" / "hNw" [MM] — standard hour zone, N hours + optional minutes
    # Format "mDDeMM" / "mDDwMM" — local mean time meridian in degrees+arcminutes
    match = re.match(r"^([mh])(\d+)([ew])(\d+)?$", s)
    if not match:
        return None

    mode, deg_raw, direction, min_raw = match.groups()

    if mode == "h":
        # h4w = UTC-4,  h1e30 = UTC+1.5
        hours = int(deg_raw)
        minutes = int(min_raw) if min_raw else 0
        offset = hours + minutes / 60
    else:
        # m20e = LMT at 20°E → offset = 20/15 h
        # m5e3320 = LMT at 5°33'20"E → offset = 5.556/15
        # m0w20 = LMT at 0°20'W
        lon_deg = int(deg_raw)
        if min_raw is None:
            lon_min_dec = 0.0
        elif len(min_raw) <= 2:
            lon_min_dec = int(min_raw)
        else:
            # 4-digit MMSS: "3320" → 33 min 20 sec
            arc_min = int(min_raw[:-2])
            arc_sec = int(min_raw[-2:])
            lon_min_dec = arc_min + arc_sec / 60
        lon_decimal = lon_deg + lon_min_dec / 60
        offset = lon_decimal / 15.0

    if direction == "w":
        offset = -offset

    # DST: AstroDatabank stores the *actual* offset used in stmerid (not always
    # the standard zone), so we do NOT add +1 for daylight saving time records.
    # The stmerid value already reflects the correct clock offset at birth.

    return offset


def extract_runtime_location(row):
    infobox_raw = row["infobox_json"] if "infobox_json" in row.keys() else None
    infobox = {}
    if infobox_raw:
        try:
            infobox = json.loads(infobox_raw)
        except Exception:
            infobox = {}

    latitude = None
    longitude = None
    utc_offset = None

    if "latitude" in row.keys() and row["latitude"] not in (None, ""):
        try:
            latitude = float(row["latitude"])
        except Exception:
            latitude = None
    if "longitude" in row.keys() and row["longitude"] not in (None, ""):
        try:
            longitude = float(row["longitude"])
        except Exception:
            longitude = None
    if "utc_offset" in row.keys() and row["utc_offset"] not in (None, ""):
        try:
            utc_offset = float(row["utc_offset"])
        except Exception:
            utc_offset = None

    if latitude is None:
        latitude = parse_dm_coord(infobox.get("slati"), "n", "s")
    if longitude is None:
        longitude = parse_dm_coord(infobox.get("slong"), "e", "w")
    if utc_offset is None:
        utc_offset = parse_utc_offset(infobox.get("stmerid"))

    return latitude, longitude, utc_offset


def run_calibration(db_path, limit=1000, rating_filter=None, verbose=False, output_file=None):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    where_clauses = ["p.time_of_birth IS NOT NULL", "p.natal_chart_json IS NOT NULL"]
    params = []

    if rating_filter:
        ratings = [r.strip() for r in rating_filter.split(",")]
        placeholders = ",".join("?" for _ in ratings)
        where_clauses.append(f"p.rodden_rating IN ({placeholders})")
        params.extend(ratings)

    where_str = " AND ".join(where_clauses)
    limit_str = f"LIMIT {limit}" if limit else ""

    cols = [c[1] for c in conn.execute("PRAGMA table_info(people)").fetchall()]
    has_latlon = "latitude" in cols and "longitude" in cols and "utc_offset" in cols

    if has_latlon:
        query = f"""
            SELECT p.title, p.date_of_birth, p.time_of_birth, p.place_of_birth,
                   p.natal_chart_json, p.rodden_rating,
                   p.latitude, p.longitude, p.utc_offset, p.infobox_json
            FROM people p
            WHERE {where_str}
            ORDER BY p.rodden_rating
            {limit_str}
        """
    else:
        query = f"""
            SELECT p.title, p.date_of_birth, p.time_of_birth, p.place_of_birth,
                   p.natal_chart_json, p.rodden_rating, p.infobox_json
            FROM people p
            WHERE {where_str}
            ORDER BY p.rodden_rating
            {limit_str}
        """

    rows = conn.execute(query, params).fetchall()

    print("\n" + "=" * 65)
    print("ASTRO ENGINE | Calibration on AstroDatabank")
    print("=" * 65)
    print(f"Records selected: {len(rows):,}")
    print(f"Rodden filter: {rating_filter or 'all'}")

    stats = {
        "total": 0,
        "no_coords": 0,
        "no_utc": 0,
        "no_time": 0,
        "parse_error": 0,
        "computed": 0,
        "by_planet": defaultdict(
            lambda: {
                "count": 0,
                "err_sum": 0,
                "err_sq": 0,
                "correct_sign": 0,
                "wrong_sign": 0,
                "within1deg": 0,
                "within30min": 0,
            }
        ),
    }

    errors_log = []
    t0 = time.time()

    for i, row in enumerate(rows):
        if i % 200 == 0 and i > 0:
            elapsed = time.time() - t0
            rate = i / elapsed if elapsed > 0 else 0
            eta = (len(rows) - i) / rate if rate > 0 else 0
            print(f"  [{i:5d}/{len(rows)}] {rate:.0f} charts/s, ETA {eta:.0f}s", end="\r")

        stats["total"] += 1

        date = parse_date(row["date_of_birth"])
        if not date:
            stats["no_time"] += 1
            continue
        yr, mo, dy = date

        time_parsed = parse_time(row["time_of_birth"])
        if not time_parsed:
            stats["no_time"] += 1
            continue
        h, mi, sc = time_parsed

        lat, lon_coord, utc = extract_runtime_location(row)
        if lat is None or lon_coord is None:
            stats["no_coords"] += 1
            continue
        if utc is None:
            stats["no_utc"] += 1
            continue

        try:
            chart_data = json.loads(row["natal_chart_json"]) if row["natal_chart_json"] else {}
        except Exception:
            stats["parse_error"] += 1
            continue

        if not chart_data:
            stats["parse_error"] += 1
            continue

        # Determine calendar type: j=Julian (treat date as Julian OS), g/None=Gregorian
        infobox_raw = row["infobox_json"] if "infobox_json" in row.keys() else None
        use_julian = False
        if infobox_raw:
            try:
                ib = json.loads(infobox_raw)
                cal = str(ib.get("ccalendar", "g") or "g").strip().lower()
                use_julian = cal.startswith("j")
            except Exception:
                pass

        try:
            computed_planets, computed_houses = calc_chart(yr, mo, dy, h, mi, sc, lat, lon_coord, utc, julian=use_julian)
        except Exception as ex:
            stats["parse_error"] += 1
            if verbose:
                print(f"  ERROR computing {row['title']}: {ex}")
            continue

        stats["computed"] += 1

        planet_map = {
            "sun": "sun",
            "moon": "moon",
            "asc": "asc",
            "mercury": "mercury",
            "venus": "venus",
            "mars": "mars",
            "jupiter": "jupiter",
            "saturn": "saturn",
            "uranus": "uranus",
            "neptune": "neptune",
            "pluto": "pluto",
        }

        for db_key, planet_key in planet_map.items():
            db_val = chart_data.get(db_key) or chart_data.get(db_key.capitalize())
            if not db_val:
                continue

            exp_sign_i, exp_deg = parse_sign_deg(str(db_val))
            if exp_sign_i is None:
                continue

            computed_lon = computed_houses.get("asc") if planet_key == "asc" else computed_planets.get(planet_key)
            if computed_lon is None:
                continue

            diff_arcmin = angle_diff_arcmin(computed_lon, exp_sign_i, exp_deg)
            computed_sign_i = sign_idx(computed_lon)

            ps = stats["by_planet"][planet_key]
            ps["count"] += 1
            ps["err_sum"] += diff_arcmin
            ps["err_sq"] += diff_arcmin ** 2

            if computed_sign_i == exp_sign_i:
                ps["correct_sign"] += 1
            else:
                ps["wrong_sign"] += 1
                if verbose and diff_arcmin > 60:
                    errors_log.append(
                        {
                            "name": row["title"],
                            "planet": planet_key,
                            "expected": f"{SIGN_NAMES[exp_sign_i]} {exp_deg:.1f}",
                            "computed": f"{SIGN_NAMES[computed_sign_i]} {int(computed_lon % 30)}:{int((computed_lon % 1) * 60):02d}",
                            "diff_arcmin": round(diff_arcmin, 1),
                        }
                    )

            if diff_arcmin <= 60:
                ps["within1deg"] += 1
            if diff_arcmin <= 30:
                ps["within30min"] += 1

    print("\n\n" + "=" * 65)
    print("CALIBRATION RESULTS")
    print("=" * 65)
    print(f"Total records:    {stats['total']:>8,}")
    print(f"No coords:        {stats['no_coords']:>8,}")
    print(f"No UTC:           {stats['no_utc']:>8,}")
    print(f"No time:          {stats['no_time']:>8,}")
    print(f"Parse errors:     {stats['parse_error']:>8,}")
    print(f"Computed:         {stats['computed']:>8,}")
    print("\n" + "-" * 65)
    print(f"{'Planet':<12} {'N':>7} {'SignOK':>11} {'Sign%':>7} {'MAE':>8} {'RMSE':>8} {'<30m':>7} {'<1d':>7}")
    print("-" * 65)

    results = {}
    planet_order = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "asc"]

    for pk in planet_order:
        ps = stats["by_planet"].get(pk)
        if not ps or ps["count"] == 0:
            continue

        n = ps["count"]
        mae = ps["err_sum"] / n
        rmse = math.sqrt(ps["err_sq"] / n)
        sign_pct = 100 * ps["correct_sign"] / n
        p30 = 100 * ps["within30min"] / n
        p60 = 100 * ps["within1deg"] / n

        print(f"{pk:<12} {n:>7,} {ps['correct_sign']:>11,} {sign_pct:>6.1f}% {mae:>7.1f} {rmse:>7.1f} {p30:>6.1f}% {p60:>6.1f}%")
        results[pk] = {
            "n": n,
            "mae_arcmin": round(mae, 2),
            "rmse_arcmin": round(rmse, 2),
            "sign_accuracy_pct": round(sign_pct, 2),
            "within30min_pct": round(p30, 2),
            "within1deg_pct": round(p60, 2),
        }

    print("-" * 65)

    if errors_log:
        print("\nTop sign mismatches (first 20):")
        for e in errors_log[:20]:
            print(f"  {e['name'][:30]:<30} {e['planet']:<10} {e['expected']:<18} -> {e['computed']:<18} d={e['diff_arcmin']:.0f}m")

    elapsed = time.time() - t0
    speed = stats["computed"] / elapsed if elapsed > 0 else 0
    print(f"\nTime: {elapsed:.1f}s ({speed:.0f} charts/s)")

    if output_file:
        output = {
            "stats": {k: v for k, v in stats.items() if k != "by_planet"},
            "results": results,
            "top_errors": errors_log[:50],
        }
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"\nSaved: {output_file}")

    conn.close()
    return results


def main():
    parser = argparse.ArgumentParser(description="Astro engine calibration on AstroDatabank")
    parser.add_argument("--db", default="astro.db", help="Path to SQLite database")
    parser.add_argument("--limit", type=int, default=2000, help="Record limit (0=all)")
    parser.add_argument("--rating", default="AA", help="Rodden filter: AA, A, B, AA,A,B, all")
    parser.add_argument("--full", action="store_true", help="Use all records (ignores --limit)")
    parser.add_argument("--verbose", action="store_true", help="Show detailed errors")
    parser.add_argument("--output", default=None, help="Output JSON file")
    args = parser.parse_args()

    limit = 0 if args.full else args.limit
    rating = None if args.rating.lower() == "all" else args.rating

    run_calibration(
        db_path=args.db,
        limit=limit,
        rating_filter=rating,
        verbose=args.verbose,
        output_file=args.output,
    )


if __name__ == "__main__":
    main()
