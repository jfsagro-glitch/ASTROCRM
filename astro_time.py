#!/usr/bin/env python3
"""Astronomical time-scale and sidereal helpers.

This module keeps UT/TT conversion and sidereal math isolated from the
main engine so benchmarking and tests can validate them independently.
"""

import math


def n360(d):
    r = d % 360.0
    return r + 360.0 if r < 0 else r


def rad(d):
    return d * math.pi / 180.0


def T(jd):
    return (jd - 2451545.0) / 36525.0


def is_leap_year(year):
    return (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)


def days_in_month(year, month):
    if month in (1, 3, 5, 7, 8, 10, 12):
        return 31
    if month in (4, 6, 9, 11):
        return 30
    return 29 if is_leap_year(year) else 28


def decimal_year(year, month, day=1):
    # Convert calendar date to year fraction using day-of-year.
    month = max(1, min(12, int(month)))
    day = float(day)

    doy = day
    for m in range(1, month):
        doy += days_in_month(year, m)

    year_len = 366.0 if is_leap_year(year) else 365.0
    return year + (doy - 0.5) / year_len


def delta_t_seconds(year, month, day=1):
    """Approximate Delta T = TT - UT in seconds.

    Piecewise polynomial model (Espenak/Meeus style) suitable for
    astrological charting and historical calibration workflows.
    """
    y = decimal_year(year, month, day)

    if y < -500:
        u = (y - 1820.0) / 100.0
        return -20.0 + 32.0 * u * u
    if y < 500:
        u = y / 100.0
        return (
            10583.6
            - 1014.41 * u
            + 33.78311 * u**2
            - 5.952053 * u**3
            - 0.1798452 * u**4
            + 0.022174192 * u**5
            + 0.0090316521 * u**6
        )
    if y < 1600:
        u = (y - 1000.0) / 100.0
        return (
            1574.2
            - 556.01 * u
            + 71.23472 * u**2
            + 0.319781 * u**3
            - 0.8503463 * u**4
            - 0.005050998 * u**5
            + 0.0083572073 * u**6
        )
    if y < 1700:
        t = y - 1600.0
        return 120.0 - 0.9808 * t - 0.01532 * t * t + (t**3) / 7129.0
    if y < 1800:
        t = y - 1700.0
        return 8.83 + 0.1603 * t - 0.0059285 * t**2 + 0.00013336 * t**3 - (t**4) / 1174000.0
    if y < 1860:
        t = y - 1800.0
        return (
            13.72
            - 0.332447 * t
            + 0.0068612 * t**2
            + 0.0041116 * t**3
            - 0.00037436 * t**4
            + 0.0000121272 * t**5
            - 0.0000001699 * t**6
            + 0.000000000875 * t**7
        )
    if y < 1900:
        t = y - 1860.0
        return 7.62 + 0.5737 * t - 0.251754 * t**2 + 0.01680668 * t**3 - 0.0004473624 * t**4 + (t**5) / 233174.0
    if y < 1920:
        t = y - 1900.0
        return -2.79 + 1.494119 * t - 0.0598939 * t**2 + 0.0061966 * t**3 - 0.000197 * t**4
    if y < 1941:
        t = y - 1920.0
        return 21.20 + 0.84493 * t - 0.076100 * t**2 + 0.0020936 * t**3
    if y < 1961:
        t = y - 1950.0
        return 29.07 + 0.407 * t - (t**2) / 233.0 + (t**3) / 2547.0
    if y < 1986:
        t = y - 1975.0
        return 45.45 + 1.067 * t - (t**2) / 260.0 - (t**3) / 718.0
    if y < 2005:
        t = y - 2000.0
        return (
            63.86
            + 0.3345 * t
            - 0.060374 * t**2
            + 0.0017275 * t**3
            + 0.000651814 * t**4
            + 0.00002373599 * t**5
        )
    if y < 2050:
        t = y - 2000.0
        return 62.92 + 0.32217 * t + 0.005589 * t**2
    if y < 2150:
        return -20.0 + 32.0 * ((y - 1820.0) / 100.0) ** 2 - 0.5628 * (2150.0 - y)

    u = (y - 1820.0) / 100.0
    return -20.0 + 32.0 * u * u


def nutation(jd):
    """Return (dpsi, deps) in degrees using short Meeus terms."""
    t = T(jd)
    L = n360(280.4665 + 36000.7698 * t)
    Lp = n360(218.3165 + 481267.8813 * t)
    Om = n360(125.04452 - 1934.136261 * t + 0.0020708 * t * t + (t**3) / 450000.0)

    dpsi = (
        -17.20 * math.sin(rad(Om))
        - 1.32 * math.sin(rad(2.0 * L))
        - 0.23 * math.sin(rad(2.0 * Lp))
        + 0.21 * math.sin(rad(2.0 * Om))
    ) / 3600.0
    deps = (
        9.20 * math.cos(rad(Om))
        + 0.57 * math.cos(rad(2.0 * L))
        + 0.10 * math.cos(rad(2.0 * Lp))
        - 0.09 * math.cos(rad(2.0 * Om))
    ) / 3600.0
    return dpsi, deps


def mean_obliquity(jd):
    t = T(jd)
    return 23.4392911 - 1.3004167e-2 * t - 1.639e-7 * t * t + 5.036e-7 * t * t * t


def true_obliquity(jd):
    _, deps = nutation(jd)
    return mean_obliquity(jd) + deps


def gmst(jd):
    t = T(jd)
    return n360(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 3.87933e-4 * t * t - t * t * t / 38710000.0)


def gast(jd):
    dpsi, _ = nutation(jd)
    eps = true_obliquity(jd)
    return n360(gmst(jd) + dpsi * math.cos(rad(eps)))
