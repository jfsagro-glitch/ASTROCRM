import sqlite3

conn = sqlite3.connect('astro.db')
rows = conn.execute(
    """
    SELECT time_of_birth, date_of_birth, title
    FROM people
    WHERE rodden_rating = 'AA'
      AND time_of_birth IS NOT NULL
    LIMIT 50
    """
).fetchall()

for t, d, title in rows:
    print(f"{t!r} | {d!r} | {title}")
