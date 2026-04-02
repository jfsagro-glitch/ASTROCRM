#!/usr/bin/env python3
import csv
from statistics import mean


def key_of(r):
    return (
        r.get("name", ""),
        r.get("birth_year", ""),
        r.get("birth_month", ""),
        r.get("birth_day", ""),
        r.get("birth_hour", ""),
        r.get("birth_min", ""),
        r.get("birth_sec", ""),
    )


def to_float(v):
    try:
        return float(v)
    except Exception:
        return None


with open("holos_clean.csv", "r", encoding="utf-8", newline="") as f:
    with_dst = {key_of(r): r for r in csv.DictReader(f)}

with open("holos_clean_nodst.csv", "r", encoding="utf-8", newline="") as f:
    no_dst = {key_of(r): r for r in csv.DictReader(f)}

changed = []
all_deltas = []

for k, r1 in with_dst.items():
    r2 = no_dst.get(k)
    if not r2:
        continue
    e1 = to_float(r1.get("sun_err_arcmin", ""))
    e2 = to_float(r2.get("sun_err_arcmin", ""))
    if e1 is None or e2 is None:
        continue

    dst_flag = (r1.get("dst_applied", "0") == "1")
    if dst_flag:
        changed.append((e1, e2, e1 - e2, r1))

    all_deltas.append(e1 - e2)

better_with_dst = sum(1 for e1, e2, _, _ in changed if e1 < e2)
better_no_dst = sum(1 for e1, e2, _, _ in changed if e2 < e1)
same = sum(1 for e1, e2, _, _ in changed if e1 == e2)

print("DST effect analysis")
print("=" * 60)
print(f"Records with dst_applied=1: {len(changed):,}")
if changed:
    mae_with = mean([x[0] for x in changed])
    mae_no = mean([x[1] for x in changed])
    print(f"Sun MAE on DST-flagged records:")
    print(f"  with DST : {mae_with:.3f}'")
    print(f"  no DST   : {mae_no:.3f}'")
    print(f"  delta    : {mae_with - mae_no:+.3f}'")
    print(f"Per-record winner:")
    print(f"  with DST better: {better_with_dst:,}")
    print(f"  no DST better  : {better_no_dst:,}")
    print(f"  same           : {same:,}")

print("\nOverall delta across all matched records (with_dst - no_dst):")
if all_deltas:
    print(f"  mean delta: {mean(all_deltas):+.4f}'")

# Show biggest degradations when DST applied
worst = sorted(changed, key=lambda x: x[2], reverse=True)[:15]
if worst:
    print("\nTop 15 cases where DST worsened Sun error (arcmin):")
    for e1, e2, d, r in worst:
        print(f"  {r.get('name','')[:40]:40}  with={e1:7.2f}'  no={e2:7.2f}'  delta={d:+7.2f}'  utc={r.get('utc_offset','')}->{r.get('utc_dst_corrected','')}")
