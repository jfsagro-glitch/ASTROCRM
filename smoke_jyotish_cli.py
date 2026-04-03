"""
One-shot CLI smoke checker for /jyotish.

Usage:
  python smoke_jyotish_cli.py
  python smoke_jyotish_cli.py --url http://127.0.0.1:8000/jyotish
  python smoke_jyotish_cli.py --direct
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from typing import Any, Dict


DEFAULT_PAYLOAD: Dict[str, Any] = {
    "date": "1979-08-12",
    "time": "13:29:30",
    "lat": 46.8566,
    "lon": 29.6059,
    "utc": 3.0,
}


def _print_summary(payload: Dict[str, Any]) -> None:
    meta = payload.get("meta", {})
    lagna = payload.get("lagna", {})
    grahas = payload.get("grahas", {})
    dashas = payload.get("dashas", [])

    print("SMOKE OK")
    print(f"  ayanamsha_lahiri: {meta.get('ayanamsha_lahiri')}")
    print(f"  lagna: {lagna.get('title')}")
    print(f"  graha_count: {len(grahas)}")
    print(f"  dasha_count: {len(dashas)}")


def _validate_minimal_contract(payload: Dict[str, Any]) -> None:
    required = ["meta", "lagna", "grahas", "dashas", "summary"]
    missing = [k for k in required if k not in payload]
    if missing:
        raise RuntimeError(f"Missing keys in /jyotish response: {missing}")

    grahas = payload.get("grahas")
    if not isinstance(grahas, dict) or len(grahas) < 9:
        raise RuntimeError("Invalid grahas block in /jyotish response")


def _call_http(url: str, body: Dict[str, Any]) -> Dict[str, Any]:
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        if resp.status != 200:
            raise RuntimeError(f"HTTP {resp.status}")
        return json.loads(resp.read().decode("utf-8"))


def _call_direct(body: Dict[str, Any]) -> Dict[str, Any]:
    from astro_api import BirthData, jyotish

    return jyotish(BirthData(**body))


def _call_engine(body: Dict[str, Any]) -> Dict[str, Any]:
    from jyotish_engine import calc_jyotish

    return calc_jyotish(
        date_str=body["date"],
        time_str=body["time"],
        lat=float(body["lat"]),
        lon=float(body["lon"]),
        utc_offset=float(body["utc"]),
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Smoke check /jyotish in one run")
    parser.add_argument("--url", default="http://127.0.0.1:8000/jyotish", help="Full /jyotish URL")
    parser.add_argument("--direct", action="store_true", help="Skip HTTP and call endpoint directly")
    args = parser.parse_args()

    try:
        if args.direct:
            try:
                payload = _call_direct(DEFAULT_PAYLOAD)
                _validate_minimal_contract(payload)
                _print_summary(payload)
                return 0
            except BaseException as e:
                print(f"Direct /jyotish call unavailable ({e}), trying engine fallback...")
                payload = _call_engine(DEFAULT_PAYLOAD)
                _validate_minimal_contract(payload)
                _print_summary(payload)
                return 0

        try:
            payload = _call_http(args.url, DEFAULT_PAYLOAD)
            _validate_minimal_contract(payload)
            _print_summary(payload)
            return 0
        except (urllib.error.URLError, ConnectionError) as e:
            print(f"HTTP path unavailable ({e}), trying direct call...")
            try:
                payload = _call_direct(DEFAULT_PAYLOAD)
                _validate_minimal_contract(payload)
                _print_summary(payload)
                return 0
            except BaseException as e2:
                print(f"Direct /jyotish call unavailable ({e2}), trying engine fallback...")
                payload = _call_engine(DEFAULT_PAYLOAD)
                _validate_minimal_contract(payload)
                _print_summary(payload)
                return 0
    except Exception as e:
        print(f"SMOKE FAILED: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
