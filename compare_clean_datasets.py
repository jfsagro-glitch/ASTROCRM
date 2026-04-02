#!/usr/bin/env python3
import csv
import argparse
from collections import defaultdict


def pct(part, total):
    if total == 0:
        return 0.0
    return 100.0 * part / total


def percentile(sorted_vals, p):
    if not sorted_vals:
        return 0.0
    idx = (len(sorted_vals) - 1) * p / 100.0
    lo = int(idx)
    hi = min(lo + 1, len(sorted_vals) - 1)
    frac = idx - lo
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * frac


def summarize_csv(path):
    rows = []
    with open(path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    total = len(rows)
    ratings = defaultdict(int)
    by_decade = defaultdict(int)
    dst_applied = 0
    julian = 0
    sun_err = []
    scores = []

    for r in rows:
        ratings[r.get("rodden_rating", "") or ""] += 1

        y = r.get("birth_year", "")
        try:
            yi = int(y)
            by_decade[(yi // 10) * 10] += 1
        except Exception:
            pass

        if (r.get("dst_applied", "0") or "0").strip() == "1":
            dst_applied += 1

        if (r.get("is_julian", "0") or "0").strip() == "1":
            julian += 1

        e = r.get("sun_err_arcmin", "")
        if e != "":
            try:
                sun_err.append(float(e))
            except Exception:
                pass

        s = r.get("quality_score", "")
        if s != "":
            try:
                scores.append(float(s))
            except Exception:
                pass

    sun_err_sorted = sorted(sun_err)
    scores_sorted = sorted(scores)

    return {
        "path": path,
        "rows": total,
        "ratings": dict(sorted(ratings.items())),
        "dst_applied": dst_applied,
        "dst_pct": pct(dst_applied, total),
        "julian": julian,
        "julian_pct": pct(julian, total),
        "sun_mae": (sum(sun_err) / len(sun_err)) if sun_err else 0.0,
        "sun_p50": percentile(sun_err_sorted, 50),
        "sun_p90": percentile(sun_err_sorted, 90),
        "sun_p99": percentile(sun_err_sorted, 99),
        "score_avg": (sum(scores) / len(scores)) if scores else 0.0,
        "score_p10": percentile(scores_sorted, 10),
        "score_p50": percentile(scores_sorted, 50),
        "score_p90": percentile(scores_sorted, 90),
        "decade_top": sorted(by_decade.items(), key=lambda x: x[1], reverse=True)[:8],
    }


def print_summary(s):
    print("=" * 76)
    print(f"FILE: {s['path']}")
    print("-" * 76)
    print(f"Rows:                  {s['rows']:,}")
    print(f"Ratings:               {s['ratings']}")
    print(f"DST applied:           {s['dst_applied']:,} ({s['dst_pct']:.2f}%)")
    print(f"Julian records:        {s['julian']:,} ({s['julian_pct']:.2f}%)")
    print(f"Sun MAE:               {s['sun_mae']:.3f}'")
    print(f"Sun percentiles:       P50={s['sun_p50']:.3f}'  P90={s['sun_p90']:.3f}'  P99={s['sun_p99']:.3f}'")
    print(f"Score avg:             {s['score_avg']:.2f}")
    print(f"Score percentiles:     P10={s['score_p10']:.1f}  P50={s['score_p50']:.1f}  P90={s['score_p90']:.1f}")
    print("Top decades by volume:")
    for d, n in s["decade_top"]:
        print(f"  {d}s: {n:,}")


def main():
    p = argparse.ArgumentParser(description="Compare HOLOS clean datasets")
    p.add_argument("files", nargs="+", help="CSV files to compare")
    args = p.parse_args()

    summaries = [summarize_csv(path) for path in args.files]
    for s in summaries:
        print_summary(s)

    print("=" * 76)
    print("RANKING BY SUN MAE (lower is better)")
    for i, s in enumerate(sorted(summaries, key=lambda x: x["sun_mae"]), start=1):
        print(f"{i}. {s['path']}  | rows={s['rows']:,} | sun_mae={s['sun_mae']:.3f}' | score_avg={s['score_avg']:.2f}")


if __name__ == "__main__":
    main()
