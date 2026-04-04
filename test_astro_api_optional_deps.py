import unittest

from fastapi import HTTPException

import astro_api


class TestAstroApiOptionalDeps(unittest.TestCase):
    def test_imports_even_when_optional_engines_are_missing(self):
        self.assertEqual(astro_api.app.title, "HOLO Astrology API")

    def test_health_reports_optional_feature_flags(self):
        payload = astro_api.health()

        self.assertTrue(payload["ok"])
        self.assertIn("features", payload)
        self.assertIn("human_design", payload["features"])
        self.assertIn("jyotish", payload["features"])
        self.assertIn("swiss_ephemeris", payload["features"])

    def test_human_design_endpoint_returns_503_when_engine_is_unavailable(self):
        if astro_api._HUMAN_DESIGN_OK:
            self.skipTest("Human Design engine is installed in this environment")

        birth = astro_api.BirthData(
            date="1979-08-12",
            time="13:29:30",
            lat=46.8566,
            lon=29.6059,
            utc=3.0,
        )

        with self.assertRaises(HTTPException) as cm:
            astro_api.human_design(birth)

        self.assertEqual(cm.exception.status_code, 503)

    def test_jyotish_endpoint_returns_503_when_engine_is_unavailable(self):
        if astro_api._JYOTISH_OK:
            self.skipTest("Jyotish engine is installed in this environment")

        birth = astro_api.BirthData(
            date="1979-08-12",
            time="13:29:30",
            lat=46.8566,
            lon=29.6059,
            utc=3.0,
        )

        with self.assertRaises(HTTPException) as cm:
            astro_api.jyotish(birth)

        self.assertEqual(cm.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()
