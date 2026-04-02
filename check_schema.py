import sqlite3, json
conn = sqlite3.connect('astro.db')

# Basic stats
total = conn.execute("SELECT COUNT(*) FROM people").fetchone()[0]
with_natal = conn.execute("SELECT COUNT(*) FROM people WHERE natal_chart_json IS NOT NULL AND natal_chart_json != '{}'").fetchone()[0]
quality = conn.execute("SELECT COUNT(*) FROM people WHERE rodden_rating IN ('AA','A','B')").fetchone()[0]

print("=" * 70)
print("ASTRODATABANK COMPLETE DATASET - FINAL SUMMARY")
print("=" * 70)
print()
print(f"Total records downloaded: {total:,}")
print(f"With natal chart data: {with_natal:,} ({100*with_natal/total:.1f}%)")
print(f"Quality-rated (AA/A/B): {quality:,} ({100*quality/total:.1f}%)")
print()

print("Rodden Rating Distribution:")
aa = conn.execute("SELECT COUNT(*) FROM people WHERE rodden_rating='AA'").fetchone()[0]
a = conn.execute("SELECT COUNT(*) FROM people WHERE rodden_rating='A'").fetchone()[0]
b = conn.execute("SELECT COUNT(*) FROM people WHERE rodden_rating='B'").fetchone()[0]
c = conn.execute("SELECT COUNT(*) FROM people WHERE rodden_rating='C'").fetchone()[0]
x = conn.execute("SELECT COUNT(*) FROM people WHERE rodden_rating='X'").fetchone()[0]
dd = conn.execute("SELECT COUNT(*) FROM people WHERE rodden_rating='DD'").fetchone()[0]
null = conn.execute("SELECT COUNT(*) FROM people WHERE rodden_rating IS NULL").fetchone()[0]
print(f"  AA (Excellent):       {aa:>6,}  {100*aa/total:>5.1f}%")
print(f"  A (Very Good):        {a:>6,}  {100*a/total:>5.1f}%")
print(f"  B (Good):             {b:>6,}  {100*b/total:>5.1f}%")
print(f"  C (Fair):             {c:>6,}  {100*c/total:>5.1f}%")
print(f"  X (Suspect):          {x:>6,}  {100*x/total:>5.1f}%")
print(f"  DD (Doubtful):        {dd:>6,}  {100*dd/total:>5.1f}%")
print(f"  Not rated:            {null:>6,}  {100*null/total:>5.1f}%")
print()

print("Database Statistics:")
people_analytics = conn.execute("SELECT COUNT(*) FROM people_analytics").fetchone()[0]
category_segments = conn.execute("SELECT COUNT(*) FROM category_segments").fetchone()[0]
print(f"  people_analytics rows: {people_analytics:,}")
print(f"  category_segments rows: {category_segments:,}")
print()

