import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import sqlite3, json

con = sqlite3.connect('astro.db')
cur = con.cursor()

# Check date/time formats
cur.execute("""SELECT name, date_of_birth, time_of_birth, infobox_json, rodden_rating
               FROM people WHERE rodden_rating='AA' AND natal_chart_json IS NOT NULL
               AND natal_chart_json != '' LIMIT 10""")
rows = cur.fetchall()
for r in rows:
    info = {}
    try:
        info = json.loads(r[3] or '{}')
    except:
        pass
    print(f"{r[0][:40]:40s}  dob={r[1]!r:25s}  tob={r[2]!r:15s}  "
          f"slati={info.get('slati','?')!r}  slong={info.get('slong','?')!r}  "
          f"stmerid={info.get('stmerid','?')!r}")

print()
print("=== infobox_json keys sample ===")
cur.execute("SELECT infobox_json FROM people WHERE infobox_json IS NOT NULL AND infobox_json != '' LIMIT 5")
for r in cur.fetchall():
    try:
        d = json.loads(r[0])
        print("Keys:", list(d.keys()))
        for k,v in d.items():
            print(f"  {k}: {repr(v)[:60]}")
        print()
    except:
        pass

con.close()
