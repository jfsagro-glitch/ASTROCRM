# HOLOS Clean Datasets — Training Data Manifest

Generated: 2026-03-28  
Source: AstroDatabank (81,365 total records → quality-filtered trainsets)  
Astronomical engine: Meeus Ch.25 Sun, 60-term Moon, Placidus houses, VSOP87 planets

---

## Available Datasets

### 1. **holos_clean.csv** — PRIMARY TRAINING SET
- **Purpose:** Main HOLOS training data (balanced quality & count)
- **Records:** 61,583 (Rodden ratings AA + A)
- **Sun accuracy (MAE):** 1.37 arcminutes
- **Filtering:** score ≥ 60 (quality composite: Rodden rating, coordinates availability, time precision, modern data weighting)
- **DST correction:** None (AstroDatabank stores final clock offset in stmerid)
- **Recommended use:** Default training set for HOLOS model

### 2. **holos_clean_aa75.csv** — HIGH-PRECISION SUBSET
- **Purpose:** Premium clean data (all AA, high quality scores)
- **Records:** 45,912 (Rodden rating AA only, quality score ≥ 75)
- **Sun accuracy (MAE):** 0.835 arcminutes (gold standard)
- **Filtering:** Strictest criteria — ideal for validation/testing or transfer learning
- **DST correction:** None
- **Recommended use:** Validation set, or for fine-tuning on cleanest data only

---

## Field Specification

| Field | Type | Source | Notes |
|---|---|---|---|
| `name` | string | title or name column | Chart owner name |
| `birth_year` | int | date_of_birth parsed | YYYY format |
| `birth_month` | int | date_of_birth parsed | 1–12 |
| `birth_day` | int | date_of_birth parsed | 1–31 |
| `birth_hour` | int | time_of_birth parsed | 0–23 (24h local time) |
| `birth_min` | int | time_of_birth parsed | 0–59 |
| `birth_sec` | int | time_of_birth parsed | 0–59 |
| `utc_offset` | float | infobox_json.stmerid | Hours west of Greenwich (negative = east) |
| `utc_dst_corrected` | float | computed if DST applied | Always equals utc_offset now (DST disabled) |
| `dst_applied` | int | 0 or 1 | Always 0 in current sets (DST feature disabled) |
| `latitude` | float | infobox_json.slati or direct col | Decimal degrees (N = +, S = −) |
| `longitude` | float | infobox_json.slong or direct col | Decimal degrees (E = +, W = −) |
| `rodden_rating` | string | people.rodden_rating | 'AA', 'A', 'B', 'C', 'X', 'DD' |
| `gender` | string | gender_norm or direct column | Normalized: 'M', 'F', or empty |
| `occupation` | string | occupation_norm or direct column | e.g., 'Actor', 'Politician', or empty |
| `sun_sign` | string | computed from sun_lon | Zodiac sign name (e.g., 'Aries', 'Leo') |
| `sun_lon` | float | computed ephemeris | Ecliptic longitude (0–360°) |
| `sun_deg_min` | string | derived from sun_lon | Format: "♈ 12° 04'" (human-readable) |
| `sun_err_arcmin` | float | comparison vs. natal_chart_json | AstroDatabank catalog error, in arcminutes |
| `is_julian` | int | 0 or 1 | Calendar type: Julian (1) or Gregorian (0) |
| `quality_score` | int | computed | 0–100 synthetic score (Rodden + coords + time precision) |

---

## Quality Metrics

### Completeness by Field
- **birth_year/month/day/hour/min/sec:** 100% (filtered requirement)
- **latitude/longitude:** 100% (filtered requirement)
- **utc_offset:** 100% (filtered requirement)
- **sun_lon:** 100% (computed; validation passed)
- **rodden_rating:** 100% in holos_clean.csv, AA-only in holos_clean_aa75.csv
- **gender/occupation:** ~40–50% populated (optional fields in source)

### Sun Accuracy (vs. AstroDatabank catalog)
| Metric | holos_clean.csv | holos_clean_aa75.csv |
|---|---|---|
| Mean Absolute Error (MAE) | 1.37' | 0.835' |
| Median | ~1.0' | ~0.5' |
| 90th percentile | ~3.0' | ~1.5' |
| Records validated | 61,583 | 45,912 |

---

## DST Note (Critical)

**AstroDatabank's `stmerid` already stores the actual birth-time meridian offset, including DST when applicable.** Applying an additional +1h correction worsens accuracy:
- **Verified on 2,143 DST-flagged records:**
  - Sun MAE **with extra DST:**  2.76 arcmin (harmful)
  - Sun MAE **without extra DST:** 0.74 arcmin (correct)
  - Degradation: +2.02 arcmin per record (98.9% negatively affected)

Therefore, `dst_applied` is always 0 in these datasets. The UTC offset in `utc_offset` is final and should be used as-is.

---

## Usage Example (Python)

```python
import pandas as pd

# Load primary training set
df = pd.read_csv('holos_clean.csv')
print(f"Loaded {len(df)} records")

# Filter by birth year range (e.g., 1900-2000)
df_modern = df[(df['birth_year'] >= 1900) & (df['birth_year'] <= 2000)]

# Access computed Sun position
sun_lon = df['sun_lon'].values  # Ecliptic longitude in degrees [0, 360)
sun_sign = df['sun_sign'].values  # Zodiac sign name

# Build training features
# Example: year, month, day, hour, min, sec, lat, lon, utc_offset → sun_lon
X = df[['birth_year', 'birth_month', 'birth_day', 'birth_hour', 
         'birth_min', 'birth_sec', 'latitude', 'longitude', 'utc_offset']]
y = df['sun_lon']

# Train model...
```

---

## Files Generated

```
holos_clean.csv             (6.24 MB)  Primary set
holos_clean_aa75.csv        (4.69 MB)  High-precision subset
HOLOS_DATASET_MANIFEST.md   (this file)
```

---

## Archive & Deprecated

- `holos_clean_nodst.csv` — **DELETED** (was identical to holos_clean.csv after DST fix)

---

## Next Steps for HOLOS

1. **Data Loading:** Use pandas or similar to load either CSV
2. **Feature Engineering:** Year/month/day/hour/min/sec + lat/lon/utc_offset → ephemeris inputs
3. **Target:** sun_lon (0–360°) or sun_sign (categorical: 0–11 = Aries–Pisces)
4. **Validation:** Use holos_clean_aa75.csv as held-out test set
5. **Calibration:** Compare model predictions vs. sun_lon field post-training

---

**Project:** HOLO_natal  
**Datasets ready:** ✅ Yes  
**Quality verified:** ✅ Yes  
**Ready for training:** ✅ Yes  
