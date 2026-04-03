"""
HOLO Astrology REST API — FastAPI backend wrapping our Python engine.
Run: uvicorn astro_api:app --reload --port 8000
"""
import sys, os, re, json
from datetime import datetime
from typing import Optional, List, Dict, Any

# ── FastAPI ───────────────────────────────────────────────────────────────────
try:
    from fastapi import FastAPI, HTTPException, Query
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import FileResponse
    from fastapi.staticfiles import StaticFiles
    from pydantic import BaseModel, field_validator
except ImportError:
    sys.exit("pip install fastapi uvicorn pydantic")

# ── Engine imports ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))
from astro_engine import (
    calc_chart, jd as calc_jd, SIGN_NAMES, SIGN_GLYPHS
)
from astro_predictive import (
    secondary_progressions, solar_arc, solar_return, lunar_return,
    profections, transits, tertiary_progressions, converse_progressions,
    ingress_chart, find_eclipses, find_stations, prenatal_syzygy,
    transit_exact_dates, ephemerides_table, astro_summary, rectify_birth_time,
)
from astro_synastry import (
    synastry_aspects, composite_chart, davison_chart, synastry_score,
)
from astro_relocation import (
    relocated_chart, acg_lines, local_space, parans,
)
from human_design_engine import (
    calc_human_design,
    present_cross_catalog,
    CHANNEL_DATA, CENTER_DATA, TYPE_DATA, AUTHORITY_DATA, LINE_DATA, GATE_DATA,
    GATE_ENCYCLOPEDIA, CHANNEL_ENCYCLOPEDIA, CROSS_CATALOG,
)
try:
    import astro_se as _se_module
except Exception:
    _se_module = None   # type: ignore


# ═════════════════════════════════════════════════════════════════════════════
# APP
# ═════════════════════════════════════════════════════════════════════════════
app = FastAPI(title="HOLO Astrology API", version="2.0")

BASE_DIR = os.path.dirname(__file__)
FRONTEND_DIST_DIR = os.path.join(BASE_DIR, "frontend", "dist")
FRONTEND_INDEX_FILE = os.path.join(FRONTEND_DIST_DIR, "index.html")
HAS_FRONTEND_BUILD = os.path.exists(FRONTEND_INDEX_FILE)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═════════════════════════════════════════════════════════════════════════════
def _parse_date(date_str: str):
    """'YYYY-MM-DD' → (yr, mo, dy)"""
    m = re.match(r'(\d{4})[-/](\d{2})[-/](\d{2})', date_str)
    if not m:
        raise HTTPException(400, f"Invalid date format: {date_str}. Use YYYY-MM-DD")
    return int(m.group(1)), int(m.group(2)), int(m.group(3))


def _parse_time(time_str: str):
    """'HH:MM' or 'HH:MM:SS' → (h, mi, sc)"""
    parts = time_str.split(':')
    if len(parts) < 2:
        raise HTTPException(400, f"Invalid time: {time_str}")
    return int(parts[0]), int(parts[1]), int(parts[2]) if len(parts) > 2 else 0


def _to_jd(date: str, time: str, utc: float) -> float:
    yr, mo, dy = _parse_date(date)
    h, mi, sc  = _parse_time(time)
    return calc_jd(yr, mo, dy, h - utc, mi, sc)


def _safe(data: Any) -> Any:
    """Make any value JSON-serializable."""
    if isinstance(data, dict):
        return {k: _safe(v) for k, v in data.items()}
    if isinstance(data, (list, tuple)):
        return [_safe(i) for i in data]
    if isinstance(data, float):
        return round(data, 6) if not (data != data) else 0.0  # nan→0
    return data


# ═════════════════════════════════════════════════════════════════════════════
# MODELS
# ═════════════════════════════════════════════════════════════════════════════
class BirthData(BaseModel):
    date:          str          # YYYY-MM-DD
    time:          str          # HH:MM or HH:MM:SS
    lat:           float        # degrees, positive = north
    lon:           float        # degrees, positive = east
    utc:           float        # UTC offset, e.g. +3.0 for Moscow
    timezone_name: Optional[str] = None  # IANA timezone (overrides utc)
    houses:        str = "placidus"
    julian:        bool = False


class PersonPair(BaseModel):
    date1: str; time1: str; lat1: float; lon1: float; utc1: float
    date2: str; time2: str; lat2: float; lon2: float; utc2: float
    houses: str = "placidus"


class PredictiveRequest(BaseModel):
    date:         str;  time:        str
    lat:          float; lon:         float; utc: float
    target_date:  str                    # YYYY-MM-DD
    target_time:  Optional[str] = None   # HH:MM[:SS], defaults to 12:00
    target_lat:   Optional[float] = None # for returns & relocations
    target_lon:   Optional[float] = None
    houses:       str = "placidus"


class EphemeridesRequest(BaseModel):
    start_date: str
    days: int = 30
    time_utc: Optional[str] = None


class AstroSummaryRequest(BaseModel):
    target_date: str
    time_utc: Optional[str] = None


class RectificationEvent(BaseModel):
    type: str
    date: str
    time: Optional[str] = None


class RectificationRequest(BaseModel):
    date: str
    time: str
    lat: float
    lon: float
    utc: float
    events: List[RectificationEvent]
    range_minutes: int = 180
    houses: str = "placidus"

    @field_validator("events")
    @classmethod
    def validate_events(cls, v):
        if len(v) < 5 or len(v) > 7:
            raise ValueError("Provide 5 to 7 life events for professional rectification")
        return v


class RelocateRequest(BaseModel):
    date: str; time: str; lat: float; lon: float; utc: float
    new_lat: float; new_lon: float
    houses: str = "placidus"


class ACGRequest(BaseModel):
    date: str; time: str; lat: float; lon: float; utc: float
    lat_step: float = 2.0
    lat_min:  float = -75.0
    lat_max:  float = 75.0


class EclipsesRequest(BaseModel):
    start_date: str
    count: int = 10


class StationsRequest(BaseModel):
    planet:     str
    start_date: str
    end_date:   str


class IngressRequest(BaseModel):
    year:   int
    sign:   str
    lat:    float
    lon:    float
    houses: str = "placidus"


class PrenatalRequest(BaseModel):
    date: str; time: str; lat: float; lon: float; utc: float


class PerfectionsRequest(BaseModel):
    date:       str; time:      str
    lat:        float; lon:     float; utc: float
    from_date:  str
    to_date:    str


# ═════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/")
def root():
    if HAS_FRONTEND_BUILD:
        return FileResponse(FRONTEND_INDEX_FILE)
    return {"status": "HOLO Astrology API v2.0", "docs": "/docs"}


# ── NATAL CHART ───────────────────────────────────────────────────────────────
@app.post("/natal")
def natal(req: BirthData):
    """Full natal chart with all features."""
    try:
        yr, mo, dy = _parse_date(req.date)
        h,  mi, sc = _parse_time(req.time)
        chart = calc_chart(
            yr, mo, dy, h, mi, sc,
            req.lat, req.lon, req.utc,
            houses_system=req.houses,
            julian=req.julian,
            include_aspects=True, include_patterns=True,
            include_dignities=True, include_arabic=True,
            include_fixed_stars=True, include_sect=True,
            include_dispositors=True,
        )
        return _safe(chart)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/human-design")
def human_design(
    req: BirthData,
    mode: str = Query("analyst", pattern="^(reader|analyst|practitioner)$"),
):
    """Professional Human Design bodygraph calculation (§11.1)."""
    try:
        return _safe(calc_human_design(
            req.date, req.time, req.lat, req.lon, req.utc,
            timezone_name=req.timezone_name,
            mode=mode,
        ))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ── HD — Transits (§11.2) ─────────────────────────────────────────────────────
class HDTransitRequest(BaseModel):
    """Transit chart: natal chart compared to planet positions on a target date."""
    date:          str
    time:          str
    lat:           float
    lon:           float
    utc:           float
    timezone_name: Optional[str] = None
    transit_date:  str           # YYYY-MM-DD


@app.post("/human-design/transits")
def human_design_transits(
    req: HDTransitRequest,
    mode: str = Query("analyst", pattern="^(reader|analyst|practitioner)$"),
):
    """Compare natal HD gates with transit positions on *transit_date* (§11.2).

    Returns natal summary + transit activations + temporary channels formed by
    the transit triggering natal hanging gates.
    """
    try:
        import swisseph as swe
        from human_design_engine import (
            _all_activations, _build_active_gates, _defined_channels,
            EPHE_FLAGS_PRIMARY,
        )
        from datetime import datetime as _dt

        # Natal chart
        natal = calc_human_design(
            req.date, req.time, req.lat, req.lon, req.utc,
            timezone_name=req.timezone_name,
            mode=mode,
        )

        # Transit activations at transit_date noon UTC
        tdate = _dt.strptime(req.transit_date, "%Y-%m-%d")
        t_jd = swe.julday(tdate.year, tdate.month, tdate.day, 12.0)
        transit_activations = _all_activations(t_jd, "transit", EPHE_FLAGS_PRIMARY)

        # Temporary channels: combine natal + transit gates and detect new channels
        all_acts = natal["activations"]["personality"] + natal["activations"]["design"] + transit_activations
        combined_dict = _build_active_gates(all_acts, [])
        all_channels = _defined_channels(combined_dict)
        natal_channel_labels = {ch["label"] for ch in natal["channels"]}
        temporary_channels = [ch for ch in all_channels if ch["label"] not in natal_channel_labels]

        # Resonant gates: transit completes a natal hanging gate
        natal_hanging_partners = {hg["partner_gate"] for hg in natal.get("hanging_gates", []) if hg.get("partner_gate")}
        resonant = [act for act in transit_activations if act["gate"] in natal_hanging_partners]

        return _safe({
            "natal_summary": {
                "type": natal["overview"]["type"],
                "authority": natal["overview"]["authority"],
                "profile": natal["overview"]["profile"],
                "definition": natal["overview"]["definition"],
                "active_gates": sorted(g["gate"] for g in natal["gates"]),
            },
            "transit_date": req.transit_date,
            "transit_activations": transit_activations,
            "temporary_channels": temporary_channels,
            "resonant_with_hanging_gates": resonant,
            "meta": natal["meta"],
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ── HD — Synastry (§11.3) ────────────────────────────────────────────────────
class HDSynastryRequest(BaseModel):
    """Two natal charts for HD relationship comparison."""
    date1: str; time1: str; lat1: float; lon1: float; utc1: float
    timezone_name1: Optional[str] = None
    date2: str; time2: str; lat2: float; lon2: float; utc2: float
    timezone_name2: Optional[str] = None


@app.post("/human-design/synastry")
def human_design_synastry(
    req: HDSynastryRequest,
    mode: str = Query("analyst", pattern="^(reader|analyst|practitioner)$"),
):
    """Human Design relationship analysis (§11.3).

    Computes electromagnetic, companionship, compromise, dominance, and
    friendship dynamics between two people.
    """
    try:
        from human_design_engine import CHANNEL_DATA as _CHANNEL_DATA

        a = calc_human_design(req.date1, req.time1, req.lat1, req.lon1, req.utc1, timezone_name=req.timezone_name1, mode=mode)
        b = calc_human_design(req.date2, req.time2, req.lat2, req.lon2, req.utc2, timezone_name=req.timezone_name2, mode=mode)

        gates_a = {g["gate"] for g in a["gates"]}
        gates_b = {g["gate"] for g in b["gates"]}
        hanging_a = {hg["gate"]: hg for hg in a.get("hanging_gates", [])}
        hanging_b = {hg["gate"]: hg for hg in b.get("hanging_gates", [])}

        # Electromagnetic: person A has one gate of a channel, B has the other
        electromagnetic = []
        for ch in _CHANNEL_DATA:
            g1, g2 = ch["gates"]
            if (g1 in gates_a and g2 in gates_b) or (g1 in gates_b and g2 in gates_a):
                electromagnetic.append({
                    "channel": f"{g1}-{g2}",
                    "name": ch["name"],
                    "person_a_gate": g1 if g1 in gates_a else g2,
                    "person_b_gate": g2 if g1 in gates_a else g1,
                    "circuit": ch.get("circuit", ""),
                    "summary": ch["summary"],
                    "dynamic": "electromagnetic",
                })

        # Companionship: both have the same gate active
        shared_gates = sorted(gates_a & gates_b)
        companionship = [{"gate": g, "name": GATE_DATA[g]["name"], "keynote": GATE_DATA[g]["keynote"]} for g in shared_gates]

        # Compromise: both have full channels that connect the same two centers
        channels_a = {ch["label"] for ch in a["channels"]}
        channels_b = {ch["label"] for ch in b["channels"]}
        compromise_channels = sorted(channels_a & channels_b)

        # Dominance: one has a defined center, other has it open
        def_a = {c["key"] for c in a["centers"] if c["defined"]}
        def_b = {c["key"] for c in b["centers"] if c["defined"]}
        dominance = [
            {"center": k, "defined_in": "person_a", "open_in": "person_b"}
            for k in (def_a - def_b)
        ] + [
            {"center": k, "defined_in": "person_b", "open_in": "person_a"}
            for k in (def_b - def_a)
        ]

        # Bridging: A's hanging gate is completed by B's gate (or vice versa)
        bridging = []
        for gate_num, hg in hanging_a.items():
            partner = hg.get("partner_gate")
            if partner and partner in gates_b:
                bridging.append({
                    "gate_from_a": gate_num,
                    "completing_gate_from_b": partner,
                    "channel": f"{min(gate_num, partner)}-{max(gate_num, partner)}",
                    "direction": "A_hanging_completed_by_B",
                })
        for gate_num, hg in hanging_b.items():
            partner = hg.get("partner_gate")
            if partner and partner in gates_a:
                bridging.append({
                    "gate_from_b": gate_num,
                    "completing_gate_from_a": partner,
                    "channel": f"{min(gate_num, partner)}-{max(gate_num, partner)}",
                    "direction": "B_hanging_completed_by_A",
                })

        return _safe({
            "person_a": {"type": a["overview"]["type"], "authority": a["overview"]["authority"], "profile": a["overview"]["profile"]},
            "person_b": {"type": b["overview"]["type"], "authority": b["overview"]["authority"], "profile": b["overview"]["profile"]},
            "electromagnetic": electromagnetic,
            "companionship": companionship,
            "compromise_channels": compromise_channels,
            "dominance": dominance,
            "bridging_splits": bridging,
            "electromagnetic_count": len(electromagnetic),
            "shared_gates_count": len(shared_gates),
            "meta": a["meta"],
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ── HD — Reference (§11.5) ──────────────────────────────────────────────────
@app.get("/human-design/reference/types")
def hd_ref_types():
    return _safe(TYPE_DATA)


@app.get("/human-design/reference/authorities")
def hd_ref_authorities():
    return _safe(AUTHORITY_DATA)


@app.get("/human-design/reference/profiles")
def hd_ref_profiles():
    return _safe({
        f"{p}/{d}": {
            "conscious_line": p,
            "unconscious_line": d,
            "conscious_theme": LINE_DATA[p]["theme"],
            "unconscious_theme": LINE_DATA[d]["theme"],
        }
        for p in range(1, 7)
        for d in range(1, 7)
        if f"{p}/{d}" in {"1/3","1/4","2/4","2/5","3/5","3/6","4/6","4/1","5/1","5/2","6/2","6/3"}
    })


@app.get("/human-design/reference/gates")
def hd_ref_gates():
    return _safe({k: {**v, "encyclopedic": GATE_ENCYCLOPEDIA.get(k, "")} for k, v in GATE_DATA.items()})


@app.get("/human-design/reference/channels")
def hd_ref_channels():
    return _safe([{**ch, "encyclopedic": CHANNEL_ENCYCLOPEDIA.get(f"{ch['gates'][0]}-{ch['gates'][1]}", "")} for ch in CHANNEL_DATA])


@app.get("/human-design/reference/centers")
def hd_ref_centers():
    return _safe(CENTER_DATA)


@app.get("/human-design/reference/crosses")
def hd_ref_crosses(
    mode: str = Query("analyst", pattern="^(reader|analyst|practitioner)$"),
):
    return _safe(present_cross_catalog(mode))


# ── PREDICTIVE ────────────────────────────────────────────────────────────────
@app.post("/predictive/transits")
def calc_transits(req: PredictiveRequest):
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        result = transits(natal_jd, req.target_date, req.target_time or "12:00",
                          lat=req.lat, lon=req.lon)
        return _safe(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/ephemerides")
def calc_ephemerides(req: EphemeridesRequest):
    try:
        return _safe(ephemerides_table(req.start_date, req.days, req.time_utc or "12:00"))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/astrosummary")
def calc_astrosummary(req: AstroSummaryRequest):
    try:
        return _safe(astro_summary(req.target_date, req.time_utc or "12:00"))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/rectification")
def calc_rectification(req: RectificationRequest):
    try:
        result = rectify_birth_time(
            req.date,
            req.time,
            req.lat,
            req.lon,
            req.utc,
            [e.model_dump() for e in req.events],
            range_minutes=req.range_minutes,
            houses_system=req.houses,
        )
        return _safe(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/secondary")
def calc_secondary(req: PredictiveRequest):
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        result = secondary_progressions(natal_jd, req.lat, req.lon,
                                        req.target_date,
                                        houses_system=req.houses)
        return _safe(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/solar-arc")
def calc_solar_arc(req: PredictiveRequest):
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        result = solar_arc(natal_jd, req.lat, req.lon, req.target_date,
                           houses_system=req.houses)
        return _safe(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/tertiary")
def calc_tertiary(req: PredictiveRequest):
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        result = tertiary_progressions(natal_jd, req.target_date,
                                       req.lat, req.lon,
                                       houses_system=req.houses)
        return _safe(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/converse")
def calc_converse(req: PredictiveRequest):
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        result = converse_progressions(natal_jd, req.target_date,
                                       req.lat, req.lon,
                                       houses_system=req.houses)
        return _safe(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/solar-return")
def calc_solar_return(req: PredictiveRequest):
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        yr = int(req.target_date[:4])
        obs_lat = req.target_lat if req.target_lat is not None else req.lat
        obs_lon = req.target_lon if req.target_lon is not None else req.lon
        result = solar_return(natal_jd, yr, obs_lat, obs_lon,
                              houses_system=req.houses)
        return _safe(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/lunar-return")
def calc_lunar_return(req: PredictiveRequest):
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        obs_lat = req.target_lat if req.target_lat is not None else req.lat
        obs_lon = req.target_lon if req.target_lon is not None else req.lon
        result = lunar_return(natal_jd, req.target_date, obs_lat, obs_lon,
                              houses_system=req.houses)
        return _safe(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/profections")
def calc_profections(req: PredictiveRequest):
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        result = profections(natal_jd, req.target_date,
                             houses_system=req.houses,
                             lat=req.lat, lon=req.lon)
        return _safe(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/prenatal-syzygy")
def calc_prenatal(req: PrenatalRequest):
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        return _safe(prenatal_syzygy(natal_jd))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/perfections")
def calc_perfections(req: PerfectionsRequest):
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        result = transit_exact_dates(natal_jd, req.from_date, req.to_date,
                                     lat=req.lat, lon=req.lon)
        return _safe(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/eclipses")
def calc_eclipses(req: EclipsesRequest):
    try:
        return _safe(find_eclipses(req.start_date, count=req.count))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/stations")
def calc_stations(req: StationsRequest):
    try:
        return _safe(find_stations(req.planet, req.start_date, req.end_date))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/ingress")
def calc_ingress(req: IngressRequest):
    try:
        result = ingress_chart(req.year, req.sign, req.lat, req.lon,
                               houses_system=req.houses)
        return _safe(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ── SYNASTRY ──────────────────────────────────────────────────────────────────
@app.post("/synastry/aspects")
def calc_synastry_aspects(req: PersonPair):
    try:
        yr1, mo1, dy1 = _parse_date(req.date1); h1, mi1, sc1 = _parse_time(req.time1)
        yr2, mo2, dy2 = _parse_date(req.date2); h2, mi2, sc2 = _parse_time(req.time2)
        c1 = calc_chart(yr1, mo1, dy1, h1, mi1, sc1, req.lat1, req.lon1, req.utc1,
                        houses_system=req.houses)
        c2 = calc_chart(yr2, mo2, dy2, h2, mi2, sc2, req.lat2, req.lon2, req.utc2,
                        houses_system=req.houses)
        aspects = synastry_aspects(c1, c2)
        score   = synastry_score(aspects)
        return _safe({"chart1": c1, "chart2": c2, "aspects": aspects, "score": score})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/synastry/composite")
def calc_composite(req: PersonPair):
    try:
        jd1 = _to_jd(req.date1, req.time1, req.utc1)
        jd2 = _to_jd(req.date2, req.time2, req.utc2)
        result = composite_chart(jd1, req.lat1, req.lon1, req.utc1,
                                 jd2, req.lat2, req.lon2, req.utc2,
                                 houses_system=req.houses)
        return _safe(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/synastry/davison")
def calc_davison(req: PersonPair):
    try:
        jd1 = _to_jd(req.date1, req.time1, req.utc1)
        jd2 = _to_jd(req.date2, req.time2, req.utc2)
        result = davison_chart(jd1, req.lat1, req.lon1, req.utc1,
                               jd2, req.lat2, req.lon2, req.utc2,
                               houses_system=req.houses)
        return _safe(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ── RELOCATION ────────────────────────────────────────────────────────────────
@app.post("/relocation/chart")
def calc_relocation(req: RelocateRequest):
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        result = relocated_chart(natal_jd, req.new_lat, req.new_lon,
                                 houses_system=req.houses)
        return _safe(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/relocation/acg")
def calc_acg(req: ACGRequest):
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        result = acg_lines(natal_jd,
                           lat_step=req.lat_step,
                           lat_min=req.lat_min,
                           lat_max=req.lat_max)
        return _safe(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/relocation/local-space")
def calc_local_space(req: RelocateRequest):
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        result = local_space(natal_jd, req.new_lat, req.new_lon)
        return _safe(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/relocation/parans")
def calc_parans(req: RelocateRequest):
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        result = parans(natal_jd, req.new_lat)
        return _safe(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ── HEALTH ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"ok": True, "timestamp": datetime.utcnow().isoformat()}


@app.get("/ephemeris/status")
def ephemeris_status():
    """Return Swiss Ephemeris engine status and data file inventory."""
    if _se_module is None:
        return {"available": False, "note": "swisseph not installed"}
    return _se_module.status()


@app.post("/ephemeris/download")
def ephemeris_download():
    """Trigger download of Swiss Ephemeris data files (sepl/semo/seas_18.se1)."""
    if _se_module is None:
        raise HTTPException(503, "swisseph not installed")
    results = _se_module.download_ephemeris_files(verbose=False)
    return {"downloaded": results}


@app.get("/timezone")
def get_timezone(lat: float, lon: float):
    """Return IANA timezone name and current UTC offset in hours for given coordinates."""
    try:
        from timezonefinder import TimezoneFinder
        import pytz
        tf = TimezoneFinder()
        tz_name = tf.timezone_at(lat=lat, lng=lon)
        if not tz_name:
            return {"timezone": "UTC", "utc_offset": 0.0}
        tz = pytz.timezone(tz_name)
        now = datetime.utcnow().replace(tzinfo=pytz.utc).astimezone(tz)
        offset = now.utcoffset().total_seconds() / 3600
        return {"timezone": tz_name, "utc_offset": offset}
    except Exception:
        return {"timezone": "UTC", "utc_offset": 0.0}


if HAS_FRONTEND_BUILD:
    assets_dir = os.path.join(FRONTEND_DIST_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        requested_path = os.path.join(FRONTEND_DIST_DIR, full_path)
        if full_path and os.path.isfile(requested_path):
            return FileResponse(requested_path)
        return FileResponse(FRONTEND_INDEX_FILE)


# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("astro_api:app", host="0.0.0.0", port=8000, reload=True)
