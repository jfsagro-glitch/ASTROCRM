import unittest


def _has_swisseph() -> bool:
    try:
        import swisseph  # noqa: F401
        return True
    except Exception:
        return False


HAS_SWE = _has_swisseph()


@unittest.skipUnless(HAS_SWE, "swisseph is required for Jyotish tests")
class TestJyotishEngine(unittest.TestCase):
    def setUp(self) -> None:
        self.birth = {
            "date": "1979-08-12",
            "time": "13:29:30",
            "lat": 46.8566,
            "lon": 29.6059,
            "utc": 3.0,
        }

    def test_calc_jyotish_structure_smoke(self):
        from jyotish_engine import calc_jyotish

        result = calc_jyotish(
            date_str=self.birth["date"],
            time_str=self.birth["time"],
            lat=self.birth["lat"],
            lon=self.birth["lon"],
            utc_offset=self.birth["utc"],
        )

        top_keys = {
            "meta", "lagna", "grahas", "dashas", "current_dasha", "current_antar",
            "yogas", "rasi_chart", "sav", "navamsha_rasi", "navamsha_rasi_name_ru", "summary",
        }
        self.assertTrue(top_keys.issubset(set(result.keys())))

        grahas = result["grahas"]
        expected_grahas = {"sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"}
        self.assertEqual(set(grahas.keys()), expected_grahas)

        for key, item in grahas.items():
            self.assertIn("sidereal_lon", item, f"missing sidereal_lon for {key}")
            self.assertIn("rasi", item, f"missing rasi for {key}")
            self.assertIn("bhava", item, f"missing bhava for {key}")
            self.assertTrue(0 <= int(item["rasi"]) <= 11)
            self.assertTrue(1 <= int(item["bhava"]) <= 12)

        self.assertEqual(len(result["dashas"]), 9)
        self.assertEqual(len(result["sav"]), 12)

        active_count = sum(1 for d in result["dashas"] if d.get("active"))
        self.assertGreaterEqual(active_count, 1)

    def test_api_jyotish_endpoint_smoke(self):
        from astro_api import BirthData, jyotish

        payload = jyotish(BirthData(**self.birth))

        self.assertIn("meta", payload)
        self.assertIn("lagna", payload)
        self.assertIn("grahas", payload)
        self.assertIn("dashas", payload)
        self.assertIn("summary", payload)


if __name__ == "__main__":
    unittest.main()
