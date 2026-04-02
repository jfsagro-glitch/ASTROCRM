import sqlite3, json

conn = sqlite3.connect('astro.db')

# Check columns
cols = [c[1] for c in conn.execute("PRAGMA table_info(people)").fetchall()]
print("All columns:", cols)
print()

# Check infobox_json for one AA record
r = conn.execute("SELECT title, infobox_json FROM people WHERE rodden_rating='AA' AND infobox_json IS NOT NULL LIMIT 1").fetchone()
if r:
    print(f"Sample infobox_json for: {r[0]}")
    try:
        d = json.loads(r[1])
        print(f"  Keys in infobox: {list(d.keys())[:15]}")
        print()
        print("  Sample values:")
        for k in ['slati', 'slong', 'stmerid', 'stimetype', 'ccalendar']:
            print(f"    {k}: {d.get(k, 'N/A')}")
    except Exception as e:
        print(f"  Error parsing: {e}")

conn.close()
