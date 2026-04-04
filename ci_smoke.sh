#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# CI smoke test — checks all interpretation endpoints for 3-block format
# Usage:  API=https://... bash ci_smoke.sh
#         or just:  bash ci_smoke.sh   (uses default Railway URL)
# Exit:   0 — all checks passed
#         1 — at least one check failed
# ---------------------------------------------------------------------------

API="${API:-https://astrocrm-production.up.railway.app}"
FAIL=0

check() {
  local name="$1" field="$2" text="$3"
  local p1 p2 p3
  p1=$(echo "$text" | grep -c "Просто:")
  p2=$(echo "$text" | grep -c "Что это значит:")
  p3=$(echo "$text" | grep -c "Что делать:")
  local ok=$(( p1 > 0 && p2 > 0 && p3 > 0 ))
  if [[ $ok -eq 1 ]]; then
    echo "  OK  $name / $field  [has_prosto=true has_meaning=true has_action=true len=${#text}]"
  else
    echo "FAIL  $name / $field  [has_prosto=$(( p1>0 )) has_meaning=$(( p2>0 )) has_action=$(( p3>0 )) len=${#text}]"
    FAIL=1
  fi
}

# ---------------------------------------------------------------------------
echo "=== Predictive: secondary ==="
R=$(curl -sS -X POST "$API/predictive/secondary" \
  -H "Content-Type: application/json" \
  -d '{"date":"1990-01-01","time":"12:00","lat":55.75,"lon":37.62,"utc":"+03:00","target_date":"2026-04-01"}')
check "secondary" "interpretation" "$(echo "$R" | jq -r '.interpretation // ""')"

# ---------------------------------------------------------------------------
echo "=== Predictive: tertiary ==="
R=$(curl -sS -X POST "$API/predictive/tertiary" \
  -H "Content-Type: application/json" \
  -d '{"date":"1990-01-01","time":"12:00","lat":55.75,"lon":37.62,"utc":"+03:00","target_date":"2026-04-01"}')
check "tertiary" "interpretation" "$(echo "$R" | jq -r '.interpretation // ""')"

# ---------------------------------------------------------------------------
echo "=== Predictive: converse ==="
R=$(curl -sS -X POST "$API/predictive/converse" \
  -H "Content-Type: application/json" \
  -d '{"date":"1990-01-01","time":"12:00","lat":55.75,"lon":37.62,"utc":"+03:00","target_date":"2026-04-01"}')
check "converse" "interpretation" "$(echo "$R" | jq -r '.interpretation // ""')"

# ---------------------------------------------------------------------------
echo "=== Predictive: solar-return ==="
R=$(curl -sS -X POST "$API/predictive/solar-return" \
  -H "Content-Type: application/json" \
  -d '{"date":"1990-01-01","time":"12:00","lat":55.75,"lon":37.62,"utc":3,"target_date":"2026-04-01"}')
check "solar-return" "interpretation" "$(echo "$R" | jq -r '.interpretation // ""')"

# ---------------------------------------------------------------------------
echo "=== Predictive: lunar-return ==="
R=$(curl -sS -X POST "$API/predictive/lunar-return" \
  -H "Content-Type: application/json" \
  -d '{"date":"1990-01-01","time":"12:00","lat":55.75,"lon":37.62,"utc":3,"target_date":"2026-04-01"}')
check "lunar-return" "interpretation" "$(echo "$R" | jq -r '.interpretation // ""')"

# ---------------------------------------------------------------------------
echo "=== Predictive: profections ==="
R=$(curl -sS -X POST "$API/predictive/profections" \
  -H "Content-Type: application/json" \
  -d '{"date":"1990-01-01","time":"12:00","lat":55.75,"lon":37.62,"utc":3,"target_date":"2026-04-01"}')
check "profections" "interpretation" "$(echo "$R" | jq -r '.interpretation // ""')"

# ---------------------------------------------------------------------------
echo "=== Predictive: solar-arc ==="
R=$(curl -sS -X POST "$API/predictive/solar-arc" \
  -H "Content-Type: application/json" \
  -d '{"date":"1990-01-01","time":"12:00","lat":55.75,"lon":37.62,"utc":3,"target_date":"2026-04-01"}')
check "solar-arc" "interpretation" "$(echo "$R" | jq -r '.interpretation // ""')"

# ---------------------------------------------------------------------------
echo "=== Predictive: prenatal-syzygy ==="
R=$(curl -sS -X POST "$API/predictive/prenatal-syzygy" \
  -H "Content-Type: application/json" \
  -d '{"date":"1990-01-01","time":"12:00","lat":55.75,"lon":37.62,"utc":3}')
check "prenatal-syzygy" "interpretation" "$(echo "$R" | jq -r '.interpretation // ""')"

# ---------------------------------------------------------------------------
echo "=== Predictive: perfections ==="
R=$(curl -sS -X POST "$API/predictive/perfections" \
  -H "Content-Type: application/json" \
  -d '{"date":"1990-01-01","time":"12:00","lat":55.75,"lon":37.62,"utc":3,"from_date":"2026-04-01","to_date":"2026-06-30"}')
check "perfections" "interpretation" "$(echo "$R" | jq -r '.interpretation // ""')"

# ---------------------------------------------------------------------------
echo "=== Predictive: eclipses ==="
R=$(curl -sS -X POST "$API/predictive/eclipses" \
  -H "Content-Type: application/json" \
  -d '{"start_date":"2026-01-01","count":3}')
check "eclipses" "interpretation" "$(echo "$R" | jq -r '.interpretation // ""')"

# ---------------------------------------------------------------------------
echo "=== Predictive: stations ==="
R=$(curl -sS -X POST "$API/predictive/stations" \
  -H "Content-Type: application/json" \
  -d '{"planet":"mercury","start_date":"2026-01-01","end_date":"2026-12-31"}')
check "stations" "interpretation" "$(echo "$R" | jq -r '.interpretation // ""')"

# ---------------------------------------------------------------------------
echo "=== Predictive: ingress ==="
R=$(curl -sS -X POST "$API/predictive/ingress" \
  -H "Content-Type: application/json" \
  -d '{"year":2026,"sign":"aries","lat":55.75,"lon":37.62,"houses":"placidus"}')
check "ingress" "interpretation" "$(echo "$R" | jq -r '.interpretation // ""')"

# ---------------------------------------------------------------------------
echo "=== Human Design (5 fields) ==="
R=$(curl -sS -X POST "$API/human-design" \
  -H "Content-Type: application/json" \
  -d '{"date":"1990-01-01","time":"12:00","lat":55.75,"lon":37.62,"utc":3}')
for field in identity decision_making strengths risk_patterns recommendations; do
  TXT=$(echo "$R" | jq -r --arg k "$field" '.detail[$k] // ""')
  check "human-design" "$field" "$TXT"
done

# ---------------------------------------------------------------------------
echo "=== Interaction: relocation-aware endpoints ==="
PAYLOAD='{
  "subject_person": {"name":"A","date":"1990-01-01","time":"12:00","lat":55.75,"lon":37.62,"utc":3,"current_lat":40.71,"current_lon":-74.00},
  "influencer_person": {"name":"B","date":"1988-06-15","time":"09:20","lat":50.45,"lon":30.52,"utc":2,"current_lat":51.50,"current_lon":-0.12},
  "period": {"start":"2026-04-01","end":"2026-06-30"},
  "topics": ["love","career","money","emotional_state","decisions"]
}'

for ep in personal-forecast routes timeline delta; do
  R=$(curl -sS -X POST "$API/interaction/$ep" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")
  HAS_RELOC=$(echo "$R" | jq -r 'has("relocation")')
  if [[ "$HAS_RELOC" == "true" ]]; then
    echo "  OK  interaction/$ep [has_relocation=true]"
  else
    echo "FAIL  interaction/$ep [has_relocation=false]"
    FAIL=1
  fi
done

# ---------------------------------------------------------------------------
echo ""
if [[ $FAIL -eq 0 ]]; then
  echo "ALL CHECKS PASSED"
  exit 0
else
  echo "SOME CHECKS FAILED — see FAIL lines above"
  exit 1
fi
