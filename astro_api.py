"""
HOLO Astrology REST API — FastAPI backend wrapping our Python engine.
Run: uvicorn astro_api:app --reload --port 8000
"""
import sys, os, re, json, math
from datetime import datetime, timedelta, timezone
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
try:
    from human_design_engine import (
        calc_human_design,
        present_cross_catalog,
        CHANNEL_DATA, CENTER_DATA, TYPE_DATA, AUTHORITY_DATA, LINE_DATA, GATE_DATA,
        GATE_ENCYCLOPEDIA, CHANNEL_ENCYCLOPEDIA, CROSS_CATALOG,
    )
    _HUMAN_DESIGN_OK = True
    _HUMAN_DESIGN_IMPORT_ERROR = ""
except Exception as exc:
    _HUMAN_DESIGN_OK = False
    _HUMAN_DESIGN_IMPORT_ERROR = str(exc)
    calc_human_design = None  # type: ignore[assignment]
    present_cross_catalog = None  # type: ignore[assignment]
    CHANNEL_DATA = []  # type: ignore[assignment]
    CENTER_DATA = {}  # type: ignore[assignment]
    TYPE_DATA = {}  # type: ignore[assignment]
    AUTHORITY_DATA = {}  # type: ignore[assignment]
    LINE_DATA = {}  # type: ignore[assignment]
    GATE_DATA = {}  # type: ignore[assignment]
    GATE_ENCYCLOPEDIA = {}  # type: ignore[assignment]
    CHANNEL_ENCYCLOPEDIA = {}  # type: ignore[assignment]
    CROSS_CATALOG = []  # type: ignore[assignment]
try:
    import astro_se as _se_module
except Exception:
    _se_module = None   # type: ignore

try:
    from jyotish_engine import calc_jyotish as _calc_jyotish
    _JYOTISH_OK = True
    _JYOTISH_IMPORT_ERROR = ""
except Exception:
    _JYOTISH_OK = False
    _JYOTISH_IMPORT_ERROR = str(sys.exc_info()[1] or "")
    _calc_jyotish = None  # type: ignore


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


def _feature_unavailable(name: str, reason: str = "") -> HTTPException:
    detail = f"{name} engine not available"
    if reason:
        detail = f"{detail}: {reason}"
    return HTTPException(503, detail)


def _require_human_design() -> None:
    if not _HUMAN_DESIGN_OK:
        raise _feature_unavailable("Human Design", _HUMAN_DESIGN_IMPORT_ERROR)


def _require_jyotish() -> None:
    if not _JYOTISH_OK:
        raise _feature_unavailable("Jyotish", _JYOTISH_IMPORT_ERROR)


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


_INTERP_KEY_TOKENS = (
    "interpret", "summary", "advice", "description", "meaning",
    "recommend", "risk", "strength", "challenge", "dharma",
    "career", "health", "relationship", "focus", "guidance",
)


def _to_plain_ru(text: str) -> str:
    raw = re.sub(r"\s+", " ", text or "").strip()
    if not raw:
        return raw
    if len(raw) < 120 or "Просто:" in raw:
        return raw

    replacements = {
        "акцентирует": "подсвечивает",
        "детерминирован": "устойчив",
        "дез-алайнмент": "сбивка с курса",
        "коррективное действие": "практический шаг",
        "масштабирование": "расширение",
        "итерациями": "небольшими шагами",
        "самореализация": "раскрытие себя",
        "дхарма": "жизненная задача",
    }
    simple = raw
    for src, dst in replacements.items():
        simple = simple.replace(src, dst)

    parts = [p.strip() for p in re.split(r"(?<=[.!?])\s+", simple) if p.strip()]
    if not parts:
        return simple
    core = parts[0]
    detail = parts[1] if len(parts) > 1 else parts[0]
    action = parts[2] if len(parts) > 2 else "Действуйте спокойно, по шагам, и фиксируйте договоренности."
    return f"{simple}\n\nПросто: {core}\nЧто это значит: {detail}\nЧто делать: {action}"


def _simplify_interpretation_payload(data: Any, parent_key: str = "") -> Any:
    if isinstance(data, dict):
        return {k: _simplify_interpretation_payload(v, k) for k, v in data.items()}
    if isinstance(data, list):
        return [_simplify_interpretation_payload(v, parent_key) for v in data]
    if isinstance(data, str):
        key = (parent_key or "").lower()
        if any(tok in key for tok in _INTERP_KEY_TOKENS):
            return _to_plain_ru(data)
    return data


def _present(data: Any) -> Any:
    """Return safe JSON with plain-language interpretation fields."""
    return _safe(_simplify_interpretation_payload(data))


def _gen_solar_return_interp(result: dict) -> str:
    """Generate interpretation for solar return chart."""
    try:
        chart_info = result.get("sr_date_utc", "")
        planets = result.get("planets", {})
        sun_info = planets.get("Sun", {})
        moon_info = planets.get("Moon", {})
        
        return (
            f"Солнечный возврат на {chart_info}. "
            f"Солнце в {sun_info.get('sign', 'знаке')}. "
            f"Луна в {moon_info.get('sign', 'знаке')}. "
            "Это год, когда Солнце вернулось на свою натальную позицию — период обновления, переоценки и инициирования нового цикла.\n\n"
            "Просто: солнечный возврат — это ваш личный новый год, когда начинается новый цикл развития на 12 месяцев.\n"
            "Что это значит: планеты в карте солнечного возврата показывают, какие темы будут доминировать в этот период, где будут возможности и где нужна осторожность.\n"
            "Что делать: используйте этот период для принятия важных решений, начала новых проектов и проработки того, что было в фокусе в предыдущем году."
        )
    except Exception:
        return "Период солнечного возврата приносит новый цикл в вашу жизнь."


def _gen_lunar_return_interp(result: dict) -> str:
    """Generate interpretation for lunar return chart."""
    try:
        return_date = result.get("return_date_utc", "")
        return (
            f"Лунный возврат на {return_date}. Луна вернулась на свою натальную позицию — момент эмоционального обновления и переосмысления.\n\n"
            "Просто: лунный возврат происходит примерно раз в месяц и показывает фазу эмоционального цикла.\n"
            "Что это значит: это время, когда стоит обратить внимание на свои чувства, потребности и то, что требует завершения или трансформации.\n"
            "Что делать: в этот день сделайте паузу, проверьте, что вас беспокоит, и примите решения, которые вы откладывали."
        )
    except Exception:
        return "Период лунного возврата приносит эмоциональное обновление."


def _gen_profections_interp(result: dict) -> str:
    """Generate interpretation for profections."""
    try:
        current_year = result.get("current_year", "")
        house_info = result.get("active_house", {}).get("name", "дома")
        
        return (
            f"Профекция на год: активный дом — {house_info}. "
            f"В целодневной прогрессии года Луна активирует новую область жизни каждый год.\n\n"
            "Просто: профекции показывают, какие сферы жизни находятся в фокусе в текущий год.\n"
            "Что это значит: активный дом раскрывает тему года — где будут основные события, вызовы и возможности раскрытия.\n"
            "Что делать: сосредоточьтесь на теме года; развивайте её, делайте значимые шаги в этой сфере и не распыляйтесь на второстепенное."
        )
    except Exception:
        return "Профекции показывают активный фокус года."


def _gen_secondary_prog_interp(result: dict) -> str:
    """Generate interpretation for secondary progressions."""
    try:
        return (
            "Вторичные прогрессии показывают психологическое развитие и внутренние трансформации в течение жизни.\n\n"
            "Просто: вторичная прогрессия — это личный год, отражающий эмоциональный и психологический рост.\n"
            "Что это значит: планеты в прогрессии показывают внутренние процессы, которые созревали незримо и теперь проявляются в жизни.\n"
            "Что делать: обратите внимание на внутренние сигналы; это время трансформации, переоценки и переосмысления жизненного пути."
        )
    except Exception:
        return "Вторичные прогрессии показывают психологический рост."


def _gen_solar_arc_interp(result: dict) -> str:
    """Generate interpretation for solar arc."""
    try:
        return (
            "Дуги Солнца показывают внешние события и возможности в течение периода развития.\n\n"
            "Просто: дуга Солнца измеряет движение Солнца каждый день после рождения и применяет это к другим планетам.\n"
            "Что это значит: аспекты дуги Солнца показывают важные события, достижения и кризисные точки на жизненном пути.\n"
            "Что делать: следите за периодами активных аспектов дуги; они часто совпадают с важными событиями и возможностями."
        )
    except Exception:
        return "Дуги Солнца показывают внешние развития."


def _gen_tertiary_interp(result: dict) -> str:
    """Generate interpretation for tertiary progressions."""
    try:
        return (
            "Третичные прогрессии показывают детали и подробности внутри каждого года вторичной прогрессии.\n\n"
            "Просто: если вторичная прогрессия показывает год, то третичная прогрессия показывает месяцы и дни внутри этого года.\n"
            "Что это значит: третичные аспекты срабатывают чаще и показывают более мелкие колебания энергии и событий.\n"
            "Что делать: используйте третичные прогрессии для планирования внутри более крупного цикла вторичной прогрессии."
        )
    except Exception:
        return "Третичные прогрессии показывают детали развития."


def _gen_converse_interp(result: dict) -> str:
    """Generate interpretation for converse progressions."""
    try:
        return (
            "Обратные прогрессии показывают внутренние развития, которые идут в противоположном направлении.\n\n"
            "Просто: обратная прогрессия движется от рождения к прошлому и показывает, что мы учимся через опыт.\n"
            "Что это значит: она раскрывает скрытые уроки, кармические паттерны и глубинные процессы трансформации.\n"
            "Что делать: медитируйте на уроки обратной прогрессии; они часто показывают, что нужно отпустить или переосмыслить."
        )
    except Exception:
        return "Обратные прогрессии показывают глубинные трансформации."


def _gen_prenatal_interp(result: dict) -> str:
    """Generate interpretation for prenatal syzygy."""
    try:
        return (
            "Пренатальный синодический пункт показывает фазу лунного цикла, в которую вы рождены.\n\n"
            "Просто: ваше рождение совпадает с определённой фазой Луны, которая отражает вашу врождённую природу.\n"
            "Что это значит: молодая Луна приносит новые начинания, полная Луна — полноту выражения, убывающая — интеграцию опыта.\n"
            "Что делать: поймите свою лунную фазу и как она влияет на вашу энергию, творчество и жизненный паттерн."
        )
    except Exception:
        return "Пренатальный синодический пункт показывает лунную фазу рождения."


def _gen_perfections_interp(result: dict) -> str:
    """Generate interpretation for perfections transit windows."""
    try:
        count = len(result.get("exact_dates", [])) if isinstance(result, dict) else 0
        return (
            f"Найдены точные транзитные окна: {count}. Это карта периодов, когда аспекты работают максимально точно.\n\n"
            "Просто: перфекции в этом модуле показывают конкретные даты, когда влияние планет усиливается.\n"
            "Что это значит: такие даты чаще совпадают с поворотными решениями, важными встречами и запуском новых процессов.\n"
            "Что делать: заранее планируйте ключевые действия на эти окна и фиксируйте результаты, чтобы увидеть, какие периоды дают лучший эффект."
        )
    except Exception:
        return "Перфекции показывают точные временные окна максимальной активности."


def _gen_eclipses_interp(result: dict) -> str:
    """Generate interpretation for eclipses endpoint."""
    try:
        items = result.get("eclipses", result) if isinstance(result, dict) else result
        count = len(items) if isinstance(items, list) else 0
        return (
            f"Найдено затмений в периоде: {count}. Затмения усиливают темы перемен, завершений и перенастройки приоритетов.\n\n"
            "Просто: затмения подсвечивают важные точки, где старый этап заканчивается и начинается новый.\n"
            "Что это значит: вблизи затмений события ощущаются интенсивнее, а решения имеют долгий эффект.\n"
            "Что делать: в эти периоды действуйте осознанно, снижайте импульсивность и выбирайте шаги, которые соответствуют вашим долгосрочным целям."
        )
    except Exception:
        return "Затмения показывают периоды сильной жизненной перенастройки."


def _gen_stations_interp(result: dict) -> str:
    """Generate interpretation for planetary stations endpoint."""
    try:
        items = result.get("stations", result) if isinstance(result, dict) else result
        count = len(items) if isinstance(items, list) else 0
        return (
            f"Стационарных точек найдено: {count}. Это моменты, когда планета замедляется перед сменой направления.\n\n"
            "Просто: в стациях энергия планеты ощущается сильнее обычного, будто тема ставится на паузу и требует внимания.\n"
            "Что это значит: такие периоды часто приносят возврат старых вопросов и необходимость пересмотра решений.\n"
            "Что делать: не форсируйте события, проверяйте детали и завершайте незакрытые задачи по теме соответствующей планеты."
        )
    except Exception:
        return "Стации планет показывают периоды усиленного фокуса и пересмотра."


def _gen_ingress_interp(result: dict) -> str:
    """Generate interpretation for ingress chart endpoint."""
    try:
        sign = result.get("sign", "знак") if isinstance(result, dict) else "знак"
        year = result.get("year", "") if isinstance(result, dict) else ""
        return (
            f"Ингресс-карта {year} для входа в {sign}. Она задает тон периода и общий стратегический фон.\n\n"
            "Просто: ингресс показывает, какая энергия будет доминировать в выбранный цикл.\n"
            "Что это значит: карта помогает понять, где будет основной рост, где нужен ресурс и какие темы лучше вывести в приоритет.\n"
            "Что делать: используйте ингресс как карту года: планируйте ключевые цели в гармонии с ведущей энергией периода."
        )
    except Exception:
        return "Ингресс-карта показывает стратегический фон периода."


def _file_response_with_cache(path: str, cache_control: str) -> FileResponse:
    response = FileResponse(path)
    response.headers["Cache-Control"] = cache_control
    return response


class FrontendAssetsStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 200:
            # Hashed Vite assets are content-addressed and safe for long-lived caching.
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response


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


class InteractionPerson(BaseModel):
    date: str
    time: str
    lat: float
    lon: float
    utc: float
    timezone_name: Optional[str] = None
    houses: str = "placidus"
    julian: bool = False
    name: Optional[str] = None
    current_lat: Optional[float] = None
    current_lon: Optional[float] = None


class InteractionPeriod(BaseModel):
    start: str
    end: str


class PersonalInteractionRequest(BaseModel):
    subject_person: InteractionPerson
    influencer_person: InteractionPerson
    period: InteractionPeriod
    topics: Optional[List[str]] = None


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _mid_date(start_date: str, end_date: str) -> str:
    s = datetime.strptime(start_date, "%Y-%m-%d")
    e = datetime.strptime(end_date, "%Y-%m-%d")
    mid = s + (e - s) / 2
    return mid.strftime("%Y-%m-%d")


def _topic_from_points(p_a: str, p_b: str, aspect: str) -> str:
    pa = p_a.lower()
    pb = p_b.lower()
    hard = aspect in {"square", "opposition"}
    if any(x in pa for x in ["venus", "moon", "mars", "desc"]) or any(x in pb for x in ["venus", "moon", "mars"]):
        return "love"
    if any(x in pa for x in ["mc", "sun", "jupiter", "saturn"]) or any(x in pb for x in ["jupiter", "saturn", "sun"]):
        return "project"
    if any(x in pa for x in ["mercury", "node"]) or any(x in pb for x in ["mercury", "node"]):
        return "decisions"
    if any(x in pa for x in ["h2", "h8"]) or any(x in pb for x in ["venus", "jupiter", "saturn"]):
        return "money"
    if hard:
        return "conflict"
    return "emotional_state"


def _build_baseline_scores(a_transits: Dict[str, Any], topics: List[str]) -> Dict[str, int]:
    scores: Dict[str, float] = {k: 52.0 for k in topics}
    aspects = a_transits.get("aspects", []) if isinstance(a_transits, dict) else []
    for asp in aspects:
        natal_p = str(asp.get("natal_planet", "")).lower()
        aspect = str(asp.get("aspect", "")).lower()
        orb = float(asp.get("orb", 3.0) or 3.0)
        hard = aspect in {"square", "opposition"}
        soft = aspect in {"trine", "sextile"}
        sign = -1.0 if hard else (1.0 if soft else 0.3)
        weight = (7.0 if hard else 5.0) * max(0.25, 1 - min(orb, 8) / 8)

        affected = []
        if natal_p in {"venus", "moon", "mars"}:
            affected.append("love")
        if natal_p in {"sun", "jupiter", "saturn"}:
            affected.append("career")
        if natal_p in {"venus", "jupiter", "saturn"}:
            affected.append("money")
        if natal_p in {"moon", "neptune", "saturn", "pluto"}:
            affected.append("emotional_state")
        if natal_p in {"mercury", "sun", "node"}:
            affected.append("decisions")
        if not affected:
            affected = ["emotional_state"]

        for t in affected:
            if t in scores:
                scores[t] += sign * weight

    return {k: int(round(_clamp(v, 0, 100))) for k, v in scores.items()}


def _compute_b_availability(b_transits: Dict[str, Any]) -> float:
    aspects = b_transits.get("aspects", []) if isinstance(b_transits, dict) else []
    if not aspects:
        return 0.55
    score = 0.0
    for asp in aspects:
        natal_p = str(asp.get("natal_planet", "")).lower()
        aspect = str(asp.get("aspect", "")).lower()
        orb = float(asp.get("orb", 3.0) or 3.0)
        hard = aspect in {"square", "opposition"}
        soft = aspect in {"trine", "sextile"}
        orb_factor = max(0.2, 1 - min(orb, 8) / 8)
        if natal_p in {"moon", "venus", "sun", "mercury"} and soft:
            score += 1.15 * orb_factor
        if natal_p in {"moon", "venus", "saturn", "pluto"} and hard:
            score -= 1.25 * orb_factor
        if aspect == "conjunction" and natal_p in {"jupiter", "venus"}:
            score += 0.95 * orb_factor
        if aspect == "conjunction" and natal_p in {"saturn", "pluto"}:
            score -= 0.95 * orb_factor
    return _clamp(0.55 + score / max(8.0, len(aspects) * 2.2), 0.12, 1.0)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(max(0.0, a))))


def _topic_key_from_channel_topic(topic: str) -> str:
    if topic == "project":
        return "career"
    if topic == "conflict":
        return "emotional_state"
    return topic


def _compute_relocation_block(
    natal_chart: Dict[str, Any],
    natal_jd: float,
    natal_lat: float,
    natal_lon: float,
    current_lat: Optional[float],
    current_lon: Optional[float],
    houses_system: str,
) -> Dict[str, Any]:
    obs_lat = current_lat if current_lat is not None else natal_lat
    obs_lon = current_lon if current_lon is not None else natal_lon
    distance_km = _haversine_km(natal_lat, natal_lon, obs_lat, obs_lon)
    if distance_km < 20:
        return {
            "active": False,
            "distance_km": round(distance_km, 1),
            "topic_shift": {"love": 0, "career": 0, "money": 0, "emotional_state": 0, "decisions": 0},
            "topic_receptivity": {"love": 0.0, "career": 0.0, "money": 0.0, "emotional_state": 0.0, "decisions": 0.0},
            "availability_delta": 0.0,
            "state": "natal_location",
            "house_changes": [],
            "angle_shift": {"asc_deg": 0.0, "mc_deg": 0.0},
        }

    rel = relocated_chart(natal_jd, obs_lat, obs_lon, houses_system=houses_system, include_aspects=False)
    natal_h1 = float(natal_chart.get("houses", {}).get("h1", {}).get("lon", 0.0))
    natal_h10 = float(natal_chart.get("houses", {}).get("h10", {}).get("lon", 0.0))
    rel_h1 = float(rel.get("houses", {}).get("h1", {}).get("lon", 0.0))
    rel_h10 = float(rel.get("houses", {}).get("h10", {}).get("lon", 0.0))
    asc_shift = abs(((rel_h1 - natal_h1 + 180) % 360) - 180)
    mc_shift = abs(((rel_h10 - natal_h10 + 180) % 360) - 180)

    keys = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "neptune", "pluto", "node"]
    house_changes = []
    for p in keys:
        n_h = natal_chart.get("planets", {}).get(p, {}).get("house")
        r_h = rel.get("planets", {}).get(p, {}).get("house")
        if isinstance(n_h, int) and isinstance(r_h, int) and n_h != r_h:
            house_changes.append({"planet": p, "natal_house": n_h, "relocated_house": r_h})

    topic_shift = {"love": 0.0, "career": 0.0, "money": 0.0, "emotional_state": 0.0, "decisions": 0.0}
    receptivity = {"love": 0.0, "career": 0.0, "money": 0.0, "emotional_state": 0.0, "decisions": 0.0}

    for ch in house_changes:
        p = ch["planet"]
        rh = ch["relocated_house"]
        if p in {"venus", "moon", "mars"}:
            topic_shift["love"] += 1.5 if rh in {5, 7, 8} else -0.8 if rh in {6, 12} else 0.3
            receptivity["love"] += 0.18 if rh in {5, 7, 8} else -0.09
        if p in {"sun", "jupiter", "saturn"}:
            topic_shift["career"] += 1.6 if rh in {10, 11} else -0.9 if rh in {4, 12} else 0.2
            receptivity["career"] += 0.16 if rh in {10, 11} else -0.08
        if p in {"venus", "jupiter", "saturn"}:
            topic_shift["money"] += 1.4 if rh in {2, 8, 10} else -0.8 if rh in {6, 12} else 0.1
            receptivity["money"] += 0.14 if rh in {2, 8, 10} else -0.07
        if p in {"moon", "neptune", "saturn", "pluto"}:
            topic_shift["emotional_state"] += -1.2 if rh in {8, 12} else 1.0 if rh in {4, 1} else 0.0
            receptivity["emotional_state"] += 0.15 if rh in {4, 8, 12} else 0.03
        if p in {"mercury", "sun", "node"}:
            topic_shift["decisions"] += 1.3 if rh in {1, 7, 10} else -0.7 if rh in {12} else 0.2
            receptivity["decisions"] += 0.12 if rh in {1, 7, 10} else -0.06

    intensity = _clamp((asc_shift + mc_shift) / 140.0 + len(house_changes) / 10.0, 0.0, 1.0)
    for k in topic_shift:
        topic_shift[k] = _clamp(topic_shift[k] * (0.65 + intensity * 0.6), -12.0, 12.0)
        receptivity[k] = _clamp(receptivity[k] * (0.55 + intensity * 0.7), -0.25, 0.35)

    b_like_delta = _clamp(
        (0.08 if rel.get("planets", {}).get("moon", {}).get("house") in {1, 7, 10, 11} else -0.04)
        + (0.06 if rel.get("planets", {}).get("venus", {}).get("house") in {1, 5, 7, 10, 11} else -0.03)
        + (0.05 if rel.get("planets", {}).get("mercury", {}).get("house") in {1, 3, 7, 10, 11} else -0.03)
        - (0.05 if rel.get("planets", {}).get("saturn", {}).get("house") in {8, 12} else 0.0),
        -0.18,
        0.18,
    )

    return {
        "active": True,
        "distance_km": round(distance_km, 1),
        "distance_band": "global" if distance_km > 3000 else "regional" if distance_km > 700 else "local",
        "topic_shift": {k: int(round(v)) for k, v in topic_shift.items()},
        "topic_receptivity": {k: round(v, 3) for k, v in receptivity.items()},
        "availability_delta": round(b_like_delta, 3),
        "state": "relocated",
        "house_changes": house_changes[:12],
        "angle_shift": {"asc_deg": round(asc_shift, 2), "mc_deg": round(mc_shift, 2)},
    }


def _compute_interaction_model(req: PersonalInteractionRequest) -> Dict[str, Any]:
    a = req.subject_person
    b = req.influencer_person
    topics = req.topics or ["love", "career", "money", "emotional_state"]
    period_start = req.period.start
    period_end = req.period.end
    period_mid = _mid_date(period_start, period_end)

    # Core charts
    ay, amo, ad = _parse_date(a.date)
    ah, ami, asc = _parse_time(a.time)
    by, bmo, bd = _parse_date(b.date)
    bh, bmi, bsc = _parse_time(b.time)

    chart_a = calc_chart(ay, amo, ad, ah, ami, asc, a.lat, a.lon, a.utc, houses_system=a.houses, julian=a.julian)
    chart_b = calc_chart(by, bmo, bd, bh, bmi, bsc, b.lat, b.lon, b.utc, houses_system=b.houses, julian=b.julian)

    jd_a = _to_jd(a.date, a.time, a.utc)
    jd_b = _to_jd(b.date, b.time, b.utc)

    # Relocation-aware layer (current location can differ from natal location)
    a_relocation = _compute_relocation_block(
        chart_a, jd_a, a.lat, a.lon, a.current_lat, a.current_lon, a.houses,
    )
    b_relocation = _compute_relocation_block(
        chart_b, jd_b, b.lat, b.lon, b.current_lat, b.current_lon, b.houses,
    )

    syn_aspects = synastry_aspects(chart_a, chart_b)
    syn_score = synastry_score(syn_aspects)
    comp_chart = composite_chart(jd_a, a.lat, a.lon, a.utc, jd_b, b.lat, b.lon, b.utc, houses_system=a.houses)

    # Current state transits within target period (middle point)
    a_transits = transits(jd_a, period_mid, "12:00", lat=a.lat, lon=a.lon)
    b_transits = transits(jd_b, period_mid, "12:00", lat=b.lat, lon=b.lon)
    b_availability = _compute_b_availability(b_transits)
    b_availability = _clamp(b_availability + float(b_relocation.get("availability_delta", 0.0)), 0.12, 1.0)

    rel_a_planets = None
    if bool(a_relocation.get("active")):
        rel_a_cached = relocated_chart(
            jd_a,
            a.current_lat if a.current_lat is not None else a.lat,
            a.current_lon if a.current_lon is not None else a.lon,
            houses_system=a.houses,
            include_aspects=False,
        )
        rel_a_planets = rel_a_cached.get("planets", {})

    # Build directional channels B -> A
    a_transit_aspects = a_transits.get("aspects", []) if isinstance(a_transits, dict) else []
    b_transit_aspects = b_transits.get("aspects", []) if isinstance(b_transits, dict) else []
    channels: List[Dict[str, Any]] = []
    for i, asp in enumerate(syn_aspects[:48], start=1):
        p_a = str(asp.get("p1", ""))
        p_b = str(asp.get("p2", ""))
        aspect = str(asp.get("aspect", ""))
        orb = float(asp.get("orb", 7.0) or 7.0)

        entry_house = None
        try:
            entry_house = (rel_a_planets or chart_a.get("planets", {})).get(p_a, {}).get("house")
        except Exception:
            entry_house = None

        base_strength = _clamp((10 - min(orb, 10)) * (1.15 if aspect == "conjunction" else 1.0), 0.8, 10.0)
        a_hits = [x for x in a_transit_aspects if str(x.get("natal_planet", "")).lower() == p_a.lower()]
        b_hits = [x for x in b_transit_aspects if str(x.get("natal_planet", "")).lower() == p_b.lower()]
        transit_amp = 1.0 + min(0.7, 0.08 * (len(a_hits) + len(b_hits)))
        topic = _topic_from_points(p_a, p_b, aspect)
        topic_key = _topic_key_from_channel_topic(topic)
        relocation_receptivity = float(a_relocation.get("topic_receptivity", {}).get(topic_key, 0.0))
        transit_amp = _clamp(transit_amp + relocation_receptivity, 0.75, 1.95)

        realization = _clamp(
            (base_strength / 10.0) * 0.48 + (transit_amp - 1.0) * 0.25 + b_availability * 0.27,
            0.05,
            0.99,
        )

        channels.append({
            "id": f"influence_{i:03d}",
            "direction": "B_to_A",
            "topic": topic,
            "entry_point_in_A": p_a,
            "entry_house_in_A": entry_house,
            "source_point_in_B": p_b,
            "synastry_aspect": aspect,
            "base_strength": round(base_strength, 2),
            "transit_amplifier": round(transit_amp, 2),
            "relocation_receptivity": round(relocation_receptivity, 3),
            "b_availability": round(b_availability, 2),
            "realization_probability": round(realization, 2),
            "active_now": bool(realization >= 0.58 and transit_amp >= 1.08),
            "window_start": period_start,
            "window_peak": period_mid,
            "window_end": period_end,
        })

    channels.sort(key=lambda x: x["realization_probability"], reverse=True)

    baseline = _build_baseline_scores(a_transits, topics)
    for k, v in a_relocation.get("topic_shift", {}).items():
        if k in baseline:
            baseline[k] = int(round(_clamp(baseline[k] + float(v), 0, 100)))

    delta = {k: 0.0 for k in topics}

    for ch in channels:
        raw = (float(ch["realization_probability"]) - 0.5) * 34.0
        if ch["active_now"]:
            raw *= 1.14
        if ch["topic"] == "love" and "love" in delta:
            delta["love"] += raw
        if ch["topic"] == "project" and "career" in delta:
            delta["career"] += raw * 0.75
        if ch["topic"] == "money" and "money" in delta:
            delta["money"] += raw * 0.88
        if ch["topic"] == "emotional_state" and "emotional_state" in delta:
            delta["emotional_state"] += raw * 0.84
        if ch["topic"] == "decisions" and "decisions" in delta:
            delta["decisions"] += raw * 0.9
        if ch["topic"] == "conflict":
            if "emotional_state" in delta:
                delta["emotional_state"] -= abs(raw) * 0.72
            if "love" in delta:
                delta["love"] -= abs(raw) * 0.45
            if "decisions" in delta:
                delta["decisions"] += abs(raw) * 0.3

    # Composite adjustment as relationship entity pressure
    comp_pressure = (float(syn_score.get("percent", 50)) - 50.0) / 9.0 if isinstance(syn_score, dict) else 0.0
    if "love" in delta:
        delta["love"] += comp_pressure * 0.8
    if "career" in delta:
        delta["career"] += comp_pressure * 0.42
    if "emotional_state" in delta:
        delta["emotional_state"] += comp_pressure * 0.55

    availability_adj = (b_availability - 0.5) * 16.0
    for k in list(delta.keys()):
        delta[k] += availability_adj * (0.8 if k in {"love", "emotional_state"} else 0.45)

    low_conf_ratio = (len([c for c in channels if c["realization_probability"] < 0.48]) / len(channels)) if channels else 0.0
    distortion_noise = low_conf_ratio * 8.0
    if "emotional_state" in delta:
        delta["emotional_state"] -= distortion_noise * 0.85
    if "decisions" in delta:
        delta["decisions"] -= distortion_noise * 0.45

    # Relocation also shifts interaction sensitivity of A in current location
    for k, v in a_relocation.get("topic_shift", {}).items():
        if k in delta:
            delta[k] += float(v) * 0.45

    delta_int = {k: int(round(_clamp(v, -35, 35))) for k, v in delta.items()}
    final_scores = {k: int(round(_clamp(baseline[k] + delta_int[k], 0, 100))) for k in baseline.keys()}

    active_windows = [
        {
            "title": f"{c['source_point_in_B']} -> {c['entry_point_in_A']} ({c['topic']})",
            "start": c["window_start"],
            "peak": c["window_peak"],
            "end": c["window_end"],
            "probability": c["realization_probability"],
        }
        for c in channels if c["active_now"] or c["realization_probability"] >= 0.62
    ][:12]

    through_come = []
    through_leave = []
    for c in channels[:18]:
        t = c["topic"]
        p = c["realization_probability"]
        if p >= 0.6:
            if t == "love": through_come.append("романтическое сближение")
            if t == "project": through_come.append("карьерный шанс и полезный союз")
            if t == "money": through_come.append("финансовая возможность через контакт")
            if t == "decisions": through_come.append("решающий разговор и выбор траектории")
            if t == "emotional_state": through_come.append("эмоциональная ясность")
            if t == "conflict": through_come.append("кризис определения и перезапуск сценария")
        if p >= 0.55:
            if t == "conflict": through_leave.append("старый формат ожиданий")
            if t == "project": through_leave.append("карьерный застой")
            if t == "love" and b_availability < 0.42: through_leave.append("старая эмоциональная стабильность")
            if t == "decisions": through_leave.append("промедление и неопределенность")

    through_come = list(dict.fromkeys(through_come))[:6]
    through_leave = list(dict.fromkeys(through_leave))[:6]

    can_do = []
    avoid = []
    conflict_active = len([c for c in channels if c["topic"] == "conflict" and c["active_now"]])
    if b_availability < 0.45:
        avoid.append("требовать быстрых обещаний")
        can_do.append("снижать темп и проверять контакт действиями")
    if conflict_active >= 2:
        avoid.append("давить на определенность")
        can_do.append("вести короткий структурный разговор и обозначать границы")
    if delta_int.get("love", 0) > 8:
        can_do.append("мягко сближаться и прояснять ожидания")
    if delta_int.get("emotional_state", 0) < -8:
        avoid.append("принимать необратимые решения в перегрузе")
        can_do.append("делать паузу 24-48 часов перед ключевым выбором")
    if not can_do:
        can_do.append("действовать по фактической взаимности")
    if not avoid:
        avoid.append("форсировать события вне активного окна")

    return {
        "subject": a.name or "A",
        "influencer": b.name or "B",
        "period": {"start": period_start, "end": period_end, "peak": period_mid},
        "topics": topics,
        "baseline_forecast": baseline,
        "interaction_adjustments": delta_int,
        "final_forecast": final_scores,
        "through_b_may_come": through_come,
        "through_b_may_leave": through_leave,
        "active_windows": active_windows,
        "recommendations": {
            "can_do": list(dict.fromkeys(can_do))[:6],
            "avoid": list(dict.fromkeys(avoid))[:6],
        },
        "b_current_state": {
            "availability": round(b_availability, 3),
            "state": "active_conductor" if b_availability >= 0.62 else "potential_conductor" if b_availability >= 0.42 else "limited_conductor",
            "transit_aspects_count": len(b_transits.get("aspects", [])) if isinstance(b_transits, dict) else 0,
        },
        "relocation": {
            "subject": a_relocation,
            "influencer": b_relocation,
        },
        "channels": channels,
        "meta": {
            "synastry_score": syn_score,
            "composite_present": bool(comp_chart),
            "distortion_noise": round(distortion_noise, 3),
        },
    }


# ═════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/")
def root():
    if HAS_FRONTEND_BUILD:
        return FileResponse(FRONTEND_INDEX_FILE)
    return {"status": "HOLO Astrology API v2.0", "docs": "/docs"}


# ── JYOTISH (VEDIC ASTROLOGY) ────────────────────────────────────────────────
@app.post("/jyotish")
def jyotish(req: BirthData):
    """Full Jyotish (Vedic astrology) chart with Lahiri sidereal, nakshatras, dashas, yogas."""
    _require_jyotish()
    try:
        result = _calc_jyotish(req.date, req.time, req.lat, req.lon, req.utc)
        return _present(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


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
        return _present(chart)
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
    _require_human_design()
    try:
        return _present(calc_human_design(
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
    _require_human_design()
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

        return _present({
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
    _require_human_design()
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

        return _present({
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
    _require_human_design()
    return _safe(TYPE_DATA)


@app.get("/human-design/reference/authorities")
def hd_ref_authorities():
    _require_human_design()
    return _safe(AUTHORITY_DATA)


@app.get("/human-design/reference/profiles")
def hd_ref_profiles():
    _require_human_design()
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
    _require_human_design()
    return _safe({k: {**v, "encyclopedic": GATE_ENCYCLOPEDIA.get(k, "")} for k, v in GATE_DATA.items()})


@app.get("/human-design/reference/channels")
def hd_ref_channels():
    _require_human_design()
    return _safe([{**ch, "encyclopedic": CHANNEL_ENCYCLOPEDIA.get(f"{ch['gates'][0]}-{ch['gates'][1]}", "")} for ch in CHANNEL_DATA])


@app.get("/human-design/reference/centers")
def hd_ref_centers():
    _require_human_design()
    return _safe(CENTER_DATA)


@app.get("/human-design/reference/crosses")
def hd_ref_crosses(
    mode: str = Query("analyst", pattern="^(reader|analyst|practitioner)$"),
):
    _require_human_design()
    return _safe(present_cross_catalog(mode))


# ── PREDICTIVE ────────────────────────────────────────────────────────────────
@app.post("/predictive/transits")
def calc_transits(req: PredictiveRequest):
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        result = transits(natal_jd, req.target_date, req.target_time or "12:00",
                          lat=req.lat, lon=req.lon)
        return _present(result)
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
        return _present(astro_summary(req.target_date, req.time_utc or "12:00"))
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
        result["interpretation"] = _gen_secondary_prog_interp(result)
        return _present(result)
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
        result["interpretation"] = _gen_solar_arc_interp(result)
        return _present(result)
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
        result["interpretation"] = _gen_tertiary_interp(result)
        return _present(result)
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
        result["interpretation"] = _gen_converse_interp(result)
        return _present(result)
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
        result["interpretation"] = _gen_solar_return_interp(result)
        return _present(result)
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
        result["interpretation"] = _gen_lunar_return_interp(result)
        return _present(result)
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
        result["interpretation"] = _gen_profections_interp(result)
        return _present(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/prenatal-syzygy")
def calc_prenatal(req: PrenatalRequest):
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        result = prenatal_syzygy(natal_jd)
        result["interpretation"] = _gen_prenatal_interp(result)
        return _present(result)
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
        if isinstance(result, dict):
            result["interpretation"] = _gen_perfections_interp(result)
        return _present(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/eclipses")
def calc_eclipses(req: EclipsesRequest):
    try:
        result = find_eclipses(req.start_date, count=req.count)
        if isinstance(result, dict):
            result["interpretation"] = _gen_eclipses_interp(result)
        else:
            result = {"items": result, "interpretation": _gen_eclipses_interp(result)}
        return _present(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/stations")
def calc_stations(req: StationsRequest):
    try:
        result = find_stations(req.planet, req.start_date, req.end_date)
        if isinstance(result, dict):
            result["interpretation"] = _gen_stations_interp(result)
        else:
            result = {"items": result, "interpretation": _gen_stations_interp(result)}
        return _present(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/ingress")
def calc_ingress(req: IngressRequest):
    try:
        result = ingress_chart(req.year, req.sign, req.lat, req.lon,
                               houses_system=req.houses)
        if isinstance(result, dict):
            result["interpretation"] = _gen_ingress_interp(result)
        return _present(result)
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
        return _present({"chart1": c1, "chart2": c2, "aspects": aspects, "score": score})
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


# ── INTERACTION-ADJUSTED PERSONAL FORECAST ──────────────────────────────────
@app.post("/interaction/personal-forecast")
def interaction_personal_forecast(req: PersonalInteractionRequest):
    try:
        result = _compute_interaction_model(req)
        return _present(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/interaction/routes")
def interaction_routes(req: PersonalInteractionRequest):
    try:
        result = _compute_interaction_model(req)
        return _present({
            "subject": result["subject"],
            "influencer": result["influencer"],
            "period": result["period"],
            "b_current_state": result["b_current_state"],
            "relocation": result.get("relocation", {}),
            "routes": result["channels"],
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/interaction/timeline")
def interaction_timeline(req: PersonalInteractionRequest):
    try:
        result = _compute_interaction_model(req)
        return _present({
            "subject": result["subject"],
            "influencer": result["influencer"],
            "period": result["period"],
            "relocation": result.get("relocation", {}),
            "active_windows": result["active_windows"],
            "recommendations": result["recommendations"],
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/interaction/delta")
def interaction_delta(req: PersonalInteractionRequest):
    try:
        result = _compute_interaction_model(req)
        return _present({
            "subject": result["subject"],
            "influencer": result["influencer"],
            "period": result["period"],
            "relocation": result.get("relocation", {}),
            "baseline_forecast": result["baseline_forecast"],
            "interaction_adjustments": result["interaction_adjustments"],
            "final_forecast": result["final_forecast"],
            "through_b_may_come": result["through_b_may_come"],
            "through_b_may_leave": result["through_b_may_leave"],
            "meta": result["meta"],
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ── SCENARIO COMPARISON ENGINE ───────────────────────────────────────────────

class LocationEntry(BaseModel):
    name: str
    lat: float
    lon: float

class ScenarioCompareRequest(BaseModel):
    subject: InteractionPerson
    partner: InteractionPerson
    period: InteractionPeriod
    locations: List[LocationEntry] = []
    goal: str = "overall"          # love|career|money|health|creativity|spirit|stability|social
    stay_days: int = 90
    partner_type: str = "romantic" # romantic|business|friend|family|mentor|colleague


def _norm_angle(v: float) -> float:
    return ((v % 360) + 360) % 360


def _ang_diff(a: float, b: float) -> float:
    d = abs(_norm_angle(a) - _norm_angle(b))
    return min(d, 360 - d)


def _get_house_for_lon(lon: float, cusps: List[float]) -> int:
    v = _norm_angle(lon)
    for i in range(12):
        s = _norm_angle(cusps[i])
        e = _norm_angle(cusps[(i + 1) % 12])
        in_range = (s <= v < e) if s < e else (v >= s or v < e)
        if in_range:
            return i + 1
    return 1


# Goal → {house: weight} maps.
# Weights are calibrated so that a realistically good chart scores ~70–85 (not always 96).
# Max possible delta before stay factor: ~6 planets × best_weight(11) + 4×angular(4) = 66+16 = 82
# With factor 0.85: 50 + 82×0.85 = 120 → clamp 96 only for truly exceptional charts.
_GOAL_HOUSES: Dict[str, Dict[int, int]] = {
    "love":       {5: 10, 7: 10, 1: 4, 8: 6, 4: 4, 11: 2},
    "career":     {10: 11, 1: 6, 6: 5, 2: 4, 11: 4, 9: 2},
    "money":      {2: 11, 8: 8, 11: 5, 4: 4, 10: 4, 5: 2},
    "health":     {1: 10, 6: 9, 4: 5, 10: 3, 12: -8},
    "creativity": {5: 10, 3: 7, 11: 6, 1: 5, 9: 4, 12: 2},
    "spirit":     {9: 10, 12: 9, 4: 6, 8: 5, 1: 3},
    "stability":  {4: 10, 7: 7, 10: 6, 2: 5, 1: 4},
    "social":     {11: 10, 7: 8, 3: 6, 1: 5, 5: 4},
    "overall":    {1: 5, 4: 5, 7: 5, 10: 5, 5: 4, 11: 4},
}

# Goal → which natal planets matter most
_GOAL_PLANETS: Dict[str, List[str]] = {
    "love":       ["venus", "moon", "mars", "sun", "node"],
    "career":     ["sun", "saturn", "jupiter", "mars", "mc"],
    "money":      ["jupiter", "venus", "saturn", "mercury"],
    "health":     ["sun", "mars", "saturn", "moon"],
    "creativity": ["venus", "neptune", "mercury", "moon", "uranus"],
    "spirit":     ["neptune", "jupiter", "pluto", "node", "chiron"],
    "stability":  ["saturn", "moon", "venus", "jupiter"],
    "social":     ["mercury", "jupiter", "moon", "venus", "uranus"],
    "overall":    ["sun", "moon", "venus", "mars", "saturn", "jupiter"],
}


# Per-planet angular effect: benefics boost, malefics stress.
# Applied when the planet is within 4° of ASC/IC/DSC/MC in the relocated chart.
_ANGULAR_EFFECT: Dict[str, float] = {
    "sun": 4.0, "moon": 4.0, "venus": 5.0, "jupiter": 4.0, "mercury": 2.0,
    "mars": -3.0, "saturn": -4.0, "pluto": -3.0, "uranus": 1.0,
    "neptune": 2.0, "node": 2.0, "chiron": 2.0, "lilith": -1.0,
}


def _score_by_goal(planets: Dict, houses: Dict, goal: str, stay_days: int) -> int:
    """Score how well a natal chart (possibly relocated) supports a given goal.

    Calibration: typical good chart → 65–82; truly exceptional (rare) → 90–96.
    Base 50, house weights halved vs original so ceilings require genuinely rare
    multi-planet angular/house stacks.
    """
    cusps = [houses.get(f"h{i}", {}).get("lon", i * 30) for i in range(1, 13)]
    hw = _GOAL_HOUSES.get(goal, _GOAL_HOUSES["overall"])
    planet_list = _GOAL_PLANETS.get(goal, _GOAL_PLANETS["overall"])

    score = 50.0

    # 1. House-based scoring for goal planets
    for planet in planet_list:
        p = planets.get(planet, {})
        lon = p.get("lon")
        if lon is None:
            continue
        house = _get_house_for_lon(float(lon), cusps)
        score += hw.get(house, 0)

    # 2. Angular effects for ALL planets (benefics boost, malefics penalise)
    angles = [cusps[0], cusps[3], cusps[6], cusps[9]]  # ASC, IC, DSC, MC
    for pname, pdata in planets.items():
        effect = _ANGULAR_EFFECT.get(pname)
        if effect is None:
            continue
        lon = pdata.get("lon")
        if lon is None:
            continue
        for angle_lon in angles:
            diff = _ang_diff(float(lon), float(angle_lon))
            if diff < 3:
                score += effect            # tight orb — full effect
            elif diff < 5:
                score += effect * 0.5     # wider orb — partial

    # 3. Stay duration modifier
    if stay_days <= 21:
        factor = 0.35
    elif stay_days <= 60:
        factor = 0.65
    elif stay_days <= 180:
        factor = 0.85
    else:
        factor = 1.0

    delta = (score - 50.0) * factor
    return int(_clamp(50.0 + delta, 8, 96))


def _partner_house_overlay_bonus(
    b_planets: Dict, a_houses: Dict, goal: str
) -> float:
    """How much partner's natal planets land in A's goal-relevant houses.

    Reduced multiplier (0.18) prevents partner bonus from overshadowing
    the location-specific alone_score and saturating the 8–96 range.
    Capped at 12.0 so a single very compatible partner can add at most
    ~12–14 points after partner_type_factor, preserving score spread.
    """
    cusps = [a_houses.get(f"h{i}", {}).get("lon", i * 30) for i in range(1, 13)]
    hw = _GOAL_HOUSES.get(goal, _GOAL_HOUSES["overall"])
    bonus = 0.0
    for pname, p in b_planets.items():
        lon = p.get("lon")
        if lon is None:
            continue
        house = _get_house_for_lon(float(lon), cusps)
        bonus += hw.get(house, 0) * 0.18
    return min(bonus, 12.0)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    dφ = math.radians(lat2 - lat1)
    dλ = math.radians(lon2 - lon1)
    a = math.sin(dφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(dλ / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _compute_location_scenarios(
    req: ScenarioCompareRequest,
    loc_lat: float,
    loc_lon: float,
    loc_name: str,
) -> Dict[str, Any]:
    a = req.subject
    b = req.partner
    goal = req.goal

    ay, amo, ad = _parse_date(a.date)
    ah, ami, asc_s = _parse_time(a.time)
    by, bmo, bd = _parse_date(b.date)
    bh, bmi, bsc_s = _parse_time(b.time)

    jd_a = _to_jd(a.date, a.time, a.utc)
    jd_b = _to_jd(b.date, b.time, b.utc)

    # Natal charts
    chart_a = calc_chart(ay, amo, ad, ah, ami, asc_s, a.lat, a.lon, a.utc,
                         houses_system=a.houses, julian=a.julian, include_aspects=False)
    chart_b = calc_chart(by, bmo, bd, bh, bmi, bsc_s, b.lat, b.lon, b.utc,
                         houses_system=b.houses, julian=b.julian, include_aspects=False)

    # Relocated chart for A at this location
    is_reloc = abs(loc_lat - a.lat) > 0.05 or abs(loc_lon - a.lon) > 0.05
    if is_reloc:
        rel_a = relocated_chart(jd_a, loc_lat, loc_lon,
                                houses_system=a.houses, include_aspects=False)
    else:
        rel_a = chart_a

    rel_a_houses = rel_a.get("houses", chart_a.get("houses", {}))
    rel_a_planets = rel_a.get("planets", chart_a.get("planets", {}))

    # ASC/MC shift
    natal_asc = chart_a.get("houses", {}).get("h1", {}).get("lon", 0)
    rel_asc    = rel_a_houses.get("h1", {}).get("lon", natal_asc)
    natal_mc   = chart_a.get("houses", {}).get("h10", {}).get("lon", 0)
    rel_mc     = rel_a_houses.get("h10", {}).get("lon", natal_mc)

    asc_shift = round(_ang_diff(float(natal_asc), float(rel_asc)), 1)
    mc_shift  = round(_ang_diff(float(natal_mc),  float(rel_mc)),  1)

    # Synastry
    syn_aspects_list = synastry_aspects(chart_a, chart_b)
    syn_score_map    = synastry_score(syn_aspects_list)
    syn_pct = float(syn_score_map.get("percent", 50))

    # ── Scenario 1: A alone at location ──
    alone_score = _score_by_goal(rel_a_planets, rel_a_houses, goal, req.stay_days)

    # ── Scenario 2: A + B both at location ──
    is_b_reloc = abs(loc_lat - b.lat) > 0.05 or abs(loc_lon - b.lon) > 0.05
    if is_b_reloc:
        rel_b = relocated_chart(jd_b, loc_lat, loc_lon,
                                houses_system=b.houses, include_aspects=False)
    else:
        rel_b = chart_b
    rel_b_planets = rel_b.get("planets", chart_b.get("planets", {}))

    overlay_bonus = _partner_house_overlay_bonus(rel_b_planets, rel_a_houses, goal)
    # Synastry adjustment: capped at ±5 so it flavours without dominating.
    # High synastry (80%) adds only +2.1; low (20%) subtracts −2.1.
    syn_adj = float(_clamp((syn_pct - 50.0) * 0.07, -5.0, 5.0))
    partner_type_factor = {
        "romantic": 1.10, "business": 0.85, "friend": 0.90,
        "family": 0.90, "mentor": 0.80, "colleague": 0.75,
    }.get(req.partner_type, 1.0)

    with_partner_score = int(_clamp(
        alone_score + overlay_bonus * partner_type_factor + syn_adj,
        8, 96,
    ))

    # ── Scenario 3: A relocated, B stays natal ──
    distance_km = _haversine_km(loc_lat, loc_lon, b.lat, b.lon)
    dist_penalty = 0.0
    if distance_km > 4000:
        dist_penalty = -12
    elif distance_km > 2000:
        dist_penalty = -7
    elif distance_km > 700:
        dist_penalty = -3
    else:
        dist_penalty = 0

    overlay_natal_b = _partner_house_overlay_bonus(
        chart_b.get("planets", {}), rel_a_houses, goal
    )
    distance_score = int(_clamp(
        alone_score + overlay_natal_b * 0.55 * partner_type_factor + syn_adj * 0.65 + dist_penalty,
        8, 96,
    ))

    # ── Sphere breakdown ──
    SPHERE_GOALS = ["love", "career", "money", "health", "creativity", "spirit", "stability", "social"]
    sphere_alone   = {g: _score_by_goal(rel_a_planets, rel_a_houses, g, req.stay_days)
                      for g in SPHERE_GOALS}
    sphere_with    = {}
    sphere_dist    = {}
    g_syn_adj = float(_clamp((syn_pct - 50.0) * 0.07, -5.0, 5.0))
    for g in SPHERE_GOALS:
        ov_b_rel  = _partner_house_overlay_bonus(rel_b_planets, rel_a_houses, g)
        ov_b_nat  = _partner_house_overlay_bonus(chart_b.get("planets", {}), rel_a_houses, g)
        sphere_with[g] = int(_clamp(sphere_alone[g] + ov_b_rel * partner_type_factor + g_syn_adj, 8, 96))
        sphere_dist[g] = int(_clamp(sphere_alone[g] + ov_b_nat * 0.55 * partner_type_factor + g_syn_adj * 0.65 + dist_penalty * 0.6, 8, 96))

    # ── What comes / leaves per scenario ──
    def _what_through(spheres: Dict[str, int], prefix: str) -> Dict[str, List[str]]:
        comes = []
        leaves = []
        if spheres.get("love", 50) >= 68:     comes.append("романтическое сближение и притяжение")
        if spheres.get("career", 50) >= 68:   comes.append("карьерный рост и профессиональные возможности")
        if spheres.get("money", 50) >= 68:    comes.append("финансовые потоки и ресурсы")
        if spheres.get("creativity", 50) >= 65: comes.append("творческое вдохновение и реализация")
        if spheres.get("social", 50) >= 65 if "social" in spheres else False: comes.append("новый социальный круг")
        if spheres.get("spirit", 50) >= 68:   comes.append("духовный рост и внутренняя ясность")
        if spheres.get("health", 50) >= 68:   comes.append("жизненный тонус и витальность")
        if spheres.get("stability", 50) >= 68: comes.append("устойчивость и долгосрочные основы")

        if spheres.get("love", 50) <= 38:      leaves.append("старая эмоциональная стабильность")
        if spheres.get("career", 50) <= 38:    leaves.append("карьерный застой и рутина")
        if spheres.get("health", 50) <= 38:    leaves.append("физический ресурс — нужен отдых")
        if spheres.get("stability", 50) <= 38: leaves.append("ощущение почвы под ногами")
        return {"comes": comes[:4], "leaves": leaves[:3]}

    through_alone  = _what_through(sphere_alone, "alone")
    through_with   = _what_through(sphere_with, "with")
    through_dist   = _what_through(sphere_dist, "dist")

    # Key planets on angles in relocated chart (ACG activations)
    # Orb 5° is standard professional astrocartography practice.
    key_activations = []
    angle_names = {"h1": "ASC", "h4": "IC", "h7": "DSC", "h10": "MC"}
    planet_display = {
        "sun": "Солнце", "moon": "Луна", "venus": "Венера", "mars": "Марс",
        "jupiter": "Юпитер", "saturn": "Сатурн", "uranus": "Уран",
        "neptune": "Нептун", "pluto": "Плутон", "node": "Сев.Узел",
        "chiron": "Хирон", "lilith": "Лилит",
    }
    for h_key, angle_label in angle_names.items():
        a_cusp = float(rel_a_houses.get(h_key, {}).get("lon", 999))
        for pname, pdata in rel_a_planets.items():
            if pname not in planet_display:
                continue
            p_lon = pdata.get("lon")
            if p_lon is None:
                continue
            orb = _ang_diff(float(p_lon), a_cusp)
            if orb <= 5:
                key_activations.append({
                    "planet": planet_display[pname],   # Russian display name
                    "planet_key": pname,                # English key for ACG lookup
                    "angle": angle_label,
                    "orb": round(orb, 1),
                    "sign": pdata.get("sign", ""),
                })
    key_activations.sort(key=lambda x: x["orb"])

    return {
        "location": loc_name,
        "lat": loc_lat,
        "lon": loc_lon,
        "distance_km": round(_haversine_km(a.lat, a.lon, loc_lat, loc_lon)),
        "asc_shift": asc_shift,
        "mc_shift": mc_shift,
        "synastry_percent": round(syn_pct),
        "scores": {
            "alone": alone_score,
            "with_partner": with_partner_score,
            "partner_distance": distance_score,
        },
        "sphere_alone":   sphere_alone,
        "sphere_with":    sphere_with,
        "sphere_distance": sphere_dist,
        "through_alone":  through_alone,
        "through_with":   through_with,
        "through_distance": through_dist,
        "key_planet_activations": key_activations[:6],
    }


@app.post("/interaction/compare-scenarios")
def compare_scenarios(req: ScenarioCompareRequest):
    """
    Multi-scenario location comparison.
    Returns scores for alone / with_partner / partner_stays_natal
    across all provided candidate locations (+ natal baseline).
    """
    try:
        a = req.subject
        results = []

        # Always include natal as baseline
        natal_entry = _compute_location_scenarios(req, a.lat, a.lon, "Родная локация")
        results.append(natal_entry)

        for loc in req.locations:
            entry = _compute_location_scenarios(req, loc.lat, loc.lon, loc.name)
            results.append(entry)

        # Sort target locations by with_partner score for the goal
        target_sorted = sorted(results[1:], key=lambda x: x["scores"]["with_partner"], reverse=True)

        return _present({
            "goal": req.goal,
            "partner_type": req.partner_type,
            "stay_days": req.stay_days,
            "baseline": results[0],
            "locations": target_sorted,
            "all_locations": results,
            "recommendation": target_sorted[0]["location"] if target_sorted else None,
        })
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
    return {
        "ok": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "features": {
            "human_design": _HUMAN_DESIGN_OK,
            "jyotish": _JYOTISH_OK,
            "swiss_ephemeris": _se_module is not None,
        },
    }


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
def get_timezone(lat: float, lon: float, date: Optional[str] = None, time: Optional[str] = None):
    """Return IANA timezone name and HISTORICAL UTC offset for the given coordinates and date/time.

    If date/time are provided, the offset is computed for that exact historical moment
    (correctly handles DST changes, historical Soviet/USSR summer time, etc.).
    Falls back to current offset when date is omitted.
    """
    try:
        from timezonefinder import TimezoneFinder
        import pytz
        tf = TimezoneFinder()
        tz_name = tf.timezone_at(lat=lat, lng=lon)
        if not tz_name:
            return {"timezone": "UTC", "utc_offset": 0.0}
        tz = pytz.timezone(tz_name)

        if date:
            # Parse date and optional time to build a naive datetime at the target moment
            try:
                yr, mo, dy = [int(x) for x in date.split("-")]
                if time:
                    parts = time.replace(":", " ").split()
                    hh = int(parts[0]) if len(parts) > 0 else 12
                    mm = int(parts[1]) if len(parts) > 1 else 0
                else:
                    hh, mm = 12, 0
                naive_dt = datetime(yr, mo, dy, hh, mm)
                # localize with is_dst=None lets pytz raise on ambiguous times;
                # use is_dst=False as safe fallback
                try:
                    local_dt = tz.localize(naive_dt, is_dst=None)
                except Exception:
                    local_dt = tz.localize(naive_dt, is_dst=False)
                offset = local_dt.utcoffset().total_seconds() / 3600
            except Exception:
                # On parse failure fall back to current offset
                now = datetime.utcnow().replace(tzinfo=pytz.utc).astimezone(tz)
                offset = now.utcoffset().total_seconds() / 3600
        else:
            now = datetime.utcnow().replace(tzinfo=pytz.utc).astimezone(tz)
            offset = now.utcoffset().total_seconds() / 3600

        return {"timezone": tz_name, "utc_offset": offset}
    except Exception:
        return {"timezone": "UTC", "utc_offset": 0.0}


if HAS_FRONTEND_BUILD:
    assets_dir = os.path.join(FRONTEND_DIST_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", FrontendAssetsStaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        requested_path = os.path.join(FRONTEND_DIST_DIR, full_path)
        if full_path and os.path.isfile(requested_path):
            return _file_response_with_cache(requested_path, "public, max-age=3600")
        # Always revalidate index.html so clients pick up the latest asset hashes.
        return _file_response_with_cache(FRONTEND_INDEX_FILE, "no-cache, no-store, must-revalidate")


# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("astro_api:app", host="0.0.0.0", port=8000, reload=True)
