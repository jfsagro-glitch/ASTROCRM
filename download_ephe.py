"""
Download Swiss Ephemeris data files from GitHub.
Files needed for 1800-2399 coverage:
  sepl_18.se1  - main planets (Sun-Pluto, nodes, Lilith)
  semo_18.se1  - Moon high-precision
  seas_18.se1  - asteroids including Chiron
"""
import os
import pathlib
import urllib.request
import sys

EPHE_DIR = pathlib.Path(__file__).parent / "ephe"
GITHUB_BASE = "https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/"

# Minimal set for modern era (1800-2400 AD)
FILES_MODERN = [
    "sepl_18.se1",  # planets
    "semo_18.se1",  # moon
    "seas_18.se1",  # asteroids/chiron
]


def download_file(fname: str, dest_dir: pathlib.Path) -> bool:
    url = GITHUB_BASE + fname
    dest = dest_dir / fname
    if dest.exists():
        print(f"  {fname}: already present ({dest.stat().st_size:,} bytes)")
        return True
    print(f"  Downloading {fname} from GitHub...", end=" ", flush=True)
    try:
        headers = {"User-Agent": "HOLO-Natal-Ephemeris/1.0"}
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
        # Detect GitHub LFS pointer (small ASCII file with "oid sha256:" in it)
        if len(data) < 500 and b"oid sha256:" in data:
            print("SKIP (GitHub LFS pointer - file too large for raw download)")
            return False
        with open(dest, "wb") as f:
            f.write(data)
        print(f"OK ({len(data):,} bytes)")
        return True
    except Exception as e:
        print(f"FAILED: {e}")
        return False


def main():
    EPHE_DIR.mkdir(exist_ok=True)
    print(f"Ephemeris directory: {EPHE_DIR}")
    print()
    ok_count = 0
    for fname in FILES_MODERN:
        if download_file(fname, EPHE_DIR):
            ok_count += 1
    print()
    print(f"Result: {ok_count}/{len(FILES_MODERN)} files ready")
    if ok_count == len(FILES_MODERN):
        print("All files downloaded — Swiss Ephemeris full precision available.")
    else:
        print("Some files missing — Moshier approximation will be used for planets.")
        print("Chiron will fall back to table interpolation if seas_18.se1 missing.")


if __name__ == "__main__":
    main()
