#!/usr/bin/env python3
"""Compare baseline vs robust verify reports.

Builds metric deltas for Sun/Moon/ASC and prints top-N improved/worsened records.

Usage:
  python compare_verify_reports.py \
      --baseline verify_report_seed123_baseline.csv \
      --robust verify_report_seed123_robust.csv \
      --top 20
"""

import argparse
import csv
import json
from statistics import median

BODIES = ("sun", "moon", "asc")


def to_float(v):
    try:
        return float(v)
    except Exception:
        return None


def to_bool(v):
    if isinstance(v, bool):
        return v
    s = str(v).strip().lower()
    if s in ("true", "1", "yes"):
        return True
    if s in ("false", "0", "no"):
        return False
    return None


def pct(n, d):
    return (100.0 * n / d) if d else 0.0


def percentile(sorted_vals, p):
    if not sorted_vals:
        return None
    idx = int(len(sorted_vals) * p)
    if idx >= len(sorted_vals):
        idx = len(sorted_vals) - 1
    return sorted_vals[idx]


def make_key(row):
    return (
        row.get("name", ""),
        row.get("date", ""),
        row.get("time", ""),
        row.get("lat", ""),
        row.get("lon", ""),
    )


def load_rows(path):
    out = {}
    with open(path, "r", encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            out[make_key(r)] = r
    return out


def body_metrics(rows, body):
    errs = []
    sign_ok = 0
    sign_n = 0

    for r in rows:
        e = to_float(r.get(f"{body}_err_am"))
        if e is not None:
            errs.append(e)

        s = to_bool(r.get(f"{body}_sign_ok"))
        if s is not None:
            sign_n += 1
            if s:
                sign_ok += 1

    errs.sort()
    n = len(errs)
    if n == 0:
        return {
            "n": 0,
            "mae": None,
            "median": None,
            "p90": None,
            "p99": None,
            "max": None,
            "gt5": 0,
            "gt30": 0,
            "sign_ok": sign_ok,
            "sign_n": sign_n,
            "sign_pct": pct(sign_ok, sign_n),
        }

    return {
        "n": n,
        "mae": sum(errs) / n,
        "median": median(errs),
        "p90": percentile(errs, 0.90),
        "p99": percentile(errs, 0.99),
        "max": errs[-1],
        "gt5": sum(1 for x in errs if x > 5),
        "gt30": sum(1 for x in errs if x > 30),
        "sign_ok": sign_ok,
        "sign_n": sign_n,
        "sign_pct": pct(sign_ok, sign_n),
    }


def safe_sub(a, b):
    if a is None or b is None:
        return None
    return a - b


def fmt(v, digits=2):
    if v is None:
        return "-"
    return f"{v:.{digits}f}"


def metrics_delta_line(name, b, r):
    d = safe_sub(r, b)
    return f"{name:10s}  base={fmt(b):>8}  robust={fmt(r):>8}  delta={fmt(d):>8}"


def per_record_delta(b_row, r_row):
    out = {"sum": 0.0}
    for body in BODIES:
        b = to_float(b_row.get(f"{body}_err_am"))
        r = to_float(r_row.get(f"{body}_err_am"))
        if b is None or r is None:
            out[body] = None
            continue
        d = r - b
        out[body] = d
        out["sum"] += d
    out["robust_utc_adjusted"] = int(to_bool(r_row.get("robust_utc_adjusted")) is True)
    return out


def print_body_section(body, b_m, r_m):
    title = body.upper()
    print(f"\n=== {title} ===")
    print(metrics_delta_line("count", b_m["n"], r_m["n"]))
    print(metrics_delta_line("mae", b_m["mae"], r_m["mae"]))
    print(metrics_delta_line("median", b_m["median"], r_m["median"]))
    print(metrics_delta_line("p90", b_m["p90"], r_m["p90"]))
    print(metrics_delta_line("p99", b_m["p99"], r_m["p99"]))
    print(metrics_delta_line("max", b_m["max"], r_m["max"]))
    print(metrics_delta_line("err_gt_5", b_m["gt5"], r_m["gt5"]))
    print(metrics_delta_line("err_gt_30", b_m["gt30"], r_m["gt30"]))
    print(metrics_delta_line("sign_ok", b_m["sign_ok"], r_m["sign_ok"]))
    print(metrics_delta_line("sign_pct", b_m["sign_pct"], r_m["sign_pct"]))


def print_top(title, rows, top_n, predicate=None):
    if predicate is not None:
        rows = [r for r in rows if predicate(r)]
    print(f"\n{title}")
    print("-" * len(title))
    if not rows:
        print("(none)")
        return
    for i, item in enumerate(rows[:top_n], 1):
        key = item["key"]
        d = item["delta"]
        print(
            f"{i:2d}. {key[0][:42]:42s}  date={key[1]} time={key[2]}  "
            f"d_sum={d['sum']:+8.2f}'  d_sun={fmt(d['sun']):>7}  d_moon={fmt(d['moon']):>7}  d_asc={fmt(d['asc']):>7}  "
            f"robust_adj={d['robust_utc_adjusted']}"
        )


def metric_triplet(b, r):
    return {"baseline": b, "robust": r, "delta": safe_sub(r, b)}


def top_rows(rows, top_n):
    out = []
    for item in rows[:top_n]:
        key = item["key"]
        d = item["delta"]
        out.append(
            {
                "name": key[0],
                "date": key[1],
                "time": key[2],
                "lat": key[3],
                "lon": key[4],
                "delta_sum_arcmin": d["sum"],
                "delta_sun_arcmin": d["sun"],
                "delta_moon_arcmin": d["moon"],
                "delta_asc_arcmin": d["asc"],
                "robust_utc_adjusted": d["robust_utc_adjusted"],
            }
        )
    return out


def main():
    p = argparse.ArgumentParser(description="Compare baseline and robust verify reports")
    p.add_argument("--baseline", required=True, help="Baseline CSV from verify_engine")
    p.add_argument("--robust", required=True, help="Robust CSV from verify_engine")
    p.add_argument("--top", type=int, default=20, help="Top N improved/worsened records")
    p.add_argument("--json-out", default=None, help="Optional JSON summary output path (for CI)")
    p.add_argument("--ci-max-asc-mae-delta", type=float, default=0.0,
                   help="CI threshold: max allowed delta for asc.mae_arcmin (robust-baseline)")
    p.add_argument("--ci-max-worsened-rows", type=int, default=0,
                   help="CI threshold: max allowed worsened rows")
    args = p.parse_args()

    b_map = load_rows(args.baseline)
    r_map = load_rows(args.robust)

    common_keys = sorted(set(b_map.keys()) & set(r_map.keys()))
    only_base = len(set(b_map.keys()) - set(r_map.keys()))
    only_robust = len(set(r_map.keys()) - set(b_map.keys()))

    b_rows = [b_map[k] for k in common_keys]
    r_rows = [r_map[k] for k in common_keys]

    print("=" * 88)
    print("VERIFY REPORT COMPARISON: BASELINE VS ROBUST")
    print("=" * 88)
    print(f"baseline rows: {len(b_map):,}")
    print(f"robust rows:   {len(r_map):,}")
    print(f"matched rows:  {len(common_keys):,}")
    print(f"only baseline: {only_base:,}")
    print(f"only robust:   {only_robust:,}")

    for body in BODIES:
        b_m = body_metrics(b_rows, body)
        r_m = body_metrics(r_rows, body)
        print_body_section(body, b_m, r_m)

    deltas = []
    improved = 0
    worsened = 0
    unchanged = 0
    robust_adjusted = 0

    for k in common_keys:
        d = per_record_delta(b_map[k], r_map[k])
        deltas.append({"key": k, "delta": d})
        robust_adjusted += d["robust_utc_adjusted"]
        if d["sum"] < -1e-9:
            improved += 1
        elif d["sum"] > 1e-9:
            worsened += 1
        else:
            unchanged += 1

    deltas_sorted = sorted(deltas, key=lambda x: x["delta"]["sum"])
    improved_rows = [x for x in deltas_sorted if x["delta"]["sum"] < -1e-9]
    regressed_rows = [x for x in reversed(deltas_sorted) if x["delta"]["sum"] > 1e-9]

    b_asc = body_metrics(b_rows, "asc")
    r_asc = body_metrics(r_rows, "asc")
    asc_mae_delta = safe_sub(r_asc["mae"], b_asc["mae"])

    ci_checks = {
        "asc_mae_delta_le_threshold": {
            "lhs": asc_mae_delta,
            "op": "<=",
            "rhs": args.ci_max_asc_mae_delta,
            "pass": (asc_mae_delta is not None and asc_mae_delta <= args.ci_max_asc_mae_delta),
        },
        "worsened_rows_le_threshold": {
            "lhs": worsened,
            "op": "<=",
            "rhs": args.ci_max_worsened_rows,
            "pass": worsened <= args.ci_max_worsened_rows,
        },
    }
    ci_status = "pass" if all(v["pass"] for v in ci_checks.values()) else "fail"

    print("\n=== OVERALL DELTAS (sum of Sun+Moon+ASC arcmin errors) ===")
    print(f"improved rows: {improved:,}")
    print(f"worsened rows: {worsened:,}")
    print(f"unchanged rows: {unchanged:,}")
    print(f"robust utc adjusted rows: {robust_adjusted:,}")

    print_top("TOP IMPROVEMENTS", improved_rows, args.top)
    print_top("TOP REGRESSIONS", regressed_rows, args.top)

    if args.json_out:
        per_body = {}
        for body in BODIES:
            b_m = body_metrics(b_rows, body)
            r_m = body_metrics(r_rows, body)
            per_body[body] = {
                "n": metric_triplet(b_m["n"], r_m["n"]),
                "mae_arcmin": metric_triplet(b_m["mae"], r_m["mae"]),
                "median_arcmin": metric_triplet(b_m["median"], r_m["median"]),
                "p90_arcmin": metric_triplet(b_m["p90"], r_m["p90"]),
                "p99_arcmin": metric_triplet(b_m["p99"], r_m["p99"]),
                "max_arcmin": metric_triplet(b_m["max"], r_m["max"]),
                "err_gt_5": metric_triplet(b_m["gt5"], r_m["gt5"]),
                "err_gt_30": metric_triplet(b_m["gt30"], r_m["gt30"]),
                "sign_ok": metric_triplet(b_m["sign_ok"], r_m["sign_ok"]),
                "sign_pct": metric_triplet(b_m["sign_pct"], r_m["sign_pct"]),
            }

        summary = {
            "inputs": {
                "baseline_csv": args.baseline,
                "robust_csv": args.robust,
                "top_n": args.top,
            },
            "row_counts": {
                "baseline": len(b_map),
                "robust": len(r_map),
                "matched": len(common_keys),
                "only_baseline": only_base,
                "only_robust": only_robust,
            },
            "overall": {
                "improved_rows": improved,
                "worsened_rows": worsened,
                "unchanged_rows": unchanged,
                "robust_utc_adjusted_rows": robust_adjusted,
            },
            "ci": {
                "status": ci_status,
                "checks": ci_checks,
            },
            "metrics": per_body,
            "top_improvements": top_rows(improved_rows, args.top),
            "top_regressions": top_rows(regressed_rows, args.top),
        }

        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
        print(f"\nJSON summary: {args.json_out}")

    print("\n=== CI STATUS ===")
    print(f"status: {ci_status}")
    print(f"asc.mae.delta: {fmt(asc_mae_delta, 4)} <= {fmt(args.ci_max_asc_mae_delta, 4)}")
    print(f"worsened_rows: {worsened} <= {args.ci_max_worsened_rows}")


if __name__ == "__main__":
    main()
