import unittest

import astro_time as at


class TestAstroTime(unittest.TestCase):
    def test_decimal_year_uses_day(self):
        y1 = at.decimal_year(2000, 1, 1)
        y2 = at.decimal_year(2000, 1, 31)
        self.assertGreater(y2, y1)

    def test_decimal_year_leap_year(self):
        # Feb 29 should be representable in leap year and remain within the year range.
        y = at.decimal_year(2000, 2, 29)
        self.assertTrue(2000.0 <= y < 2001.0)

    def test_delta_t_reference_ranges(self):
        # Around J2000 Delta T should be near 64 seconds.
        dt_2000 = at.delta_t_seconds(2000, 1, 1)
        self.assertTrue(60.0 <= dt_2000 <= 70.0)

        # Around 1900 Delta T is slightly negative/small.
        dt_1900 = at.delta_t_seconds(1900, 1, 1)
        self.assertTrue(-6.0 <= dt_1900 <= 6.0)

    def test_delta_t_epoch_ranges(self):
        # Regression guardrails for major epochs used in historical chart work.
        self.assertTrue(100.0 <= at.delta_t_seconds(1600, 1, 1) <= 140.0)
        self.assertTrue(5.0 <= at.delta_t_seconds(1800, 1, 1) <= 25.0)
        self.assertTrue(-6.0 <= at.delta_t_seconds(1900, 1, 1) <= 6.0)
        self.assertTrue(60.0 <= at.delta_t_seconds(2000, 1, 1) <= 70.0)
        self.assertTrue(85.0 <= at.delta_t_seconds(2050, 1, 1) <= 100.0)

    def test_delta_t_modern_monotonicity(self):
        # In modern epochs this approximation should rise over long intervals.
        dt_1900 = at.delta_t_seconds(1900, 1, 1)
        dt_2000 = at.delta_t_seconds(2000, 1, 1)
        dt_2050 = at.delta_t_seconds(2050, 1, 1)
        self.assertLess(dt_1900, dt_2000)
        self.assertLess(dt_2000, dt_2050)

    def test_gmst_j2000(self):
        # JD 2451545.0 has well-known GMST base close to 280.46061837 deg.
        gmst = at.gmst(2451545.0)
        self.assertAlmostEqual(gmst, 280.46061837, places=6)

    def test_nutation_and_true_obliquity(self):
        jd = 2451545.0
        dpsi, deps = at.nutation(jd)
        eps_mean = at.mean_obliquity(jd)
        eps_true = at.true_obliquity(jd)

        # Nutation terms are arcsecond-scale corrections.
        self.assertTrue(abs(dpsi) < 0.02)
        self.assertTrue(abs(deps) < 0.02)

        # True obliquity differs only slightly from mean obliquity.
        self.assertTrue(abs(eps_true - eps_mean) < 0.02)

    def test_gast_close_to_gmst(self):
        jd = 2460400.5  # arbitrary modern date
        gmst = at.gmst(jd)
        gast = at.gast(jd)
        diff = abs((gast - gmst + 180.0) % 360.0 - 180.0)

        # Equation of equinoxes correction is small (arcsecond-level).
        self.assertTrue(diff < 0.05)


if __name__ == '__main__':
    unittest.main()
