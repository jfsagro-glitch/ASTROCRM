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
    calc_chart, calc_chart_analysis, calc_heliocentric_chart, jd as calc_jd, SIGN_NAMES, SIGN_GLYPHS,
    void_of_course_moon, calc_planets, sign_name, essential_dignity_score,
    lunar_mansion_full, calc_asteroids, calc_lilith_extended,
    planetary_hours, calc_sidereal_chart, ayanamsa, list_ayanamsa_systems,
)
from astro_predictive import (
    secondary_progressions, solar_arc, solar_return, lunar_return,
    profections, firdaria, transits, tertiary_progressions, converse_progressions,
    ingress_chart, find_eclipses, find_stations, prenatal_syzygy,
    transit_exact_dates, ephemerides_table, astro_summary, rectify_birth_time,
    zodiacal_releasing, primary_directions,
)
from astro_synastry import (
    synastry_aspects, composite_chart, davison_chart, synastry_score,
)
try:
    from astro_compensatory import build_compensatory_report
    _COMPENSATORY_OK = True
except Exception as _comp_err:
    _COMPENSATORY_OK = False
    build_compensatory_report = None  # type: ignore
from astro_relocation import (
    relocated_chart, acg_lines, local_space, parans,
)
try:
    from astro_solar_return import (
        solar_return_deep_analysis,
        city_asc_comparison,
        sr_sphere_city_search,
        generate_sr_hypotheses,
        solar_holos_intersection,
        lunar_return_calendar,
        SPHERE_LABELS as _SR_SPHERE_LABELS,
        SPHERE_KEYWORDS_EN as _SR_SPHERE_KW,
    )
    _SR_DEEP_OK = True
except Exception as _sr_err:
    _SR_DEEP_OK = False
    solar_return_deep_analysis = None   # type: ignore
    city_asc_comparison = None          # type: ignore
    sr_sphere_city_search = None        # type: ignore
    generate_sr_hypotheses = None       # type: ignore
    solar_holos_intersection = None     # type: ignore
    lunar_return_calendar = None        # type: ignore
    _SR_SPHERE_LABELS = {}              # type: ignore
    _SR_SPHERE_KW = {}                  # type: ignore
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
    _SE_OK = True
except Exception:
    _se_module = None   # type: ignore
    _SE_OK = False
    import logging as _logging
    _logging.warning(
        "\n" + "="*70 + "\n"
        "  ⚠  pyswisseph / astro_se not installed.\n"
        "     Calculations fall back to built-in VSOP87/Meeus approximations.\n"
        "     Accuracy: ~1-5′ (arc-minutes). NOT suitable for professional use.\n"
        "     Fix: pip install pyswisseph>=2.10.3\n"
        + "="*70
    )

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

# CORS: read from ALLOWED_ORIGINS env var (comma-separated) or default to localhost dev
_cors_env = os.environ.get("ALLOWED_ORIGINS", "")
if _cors_env.strip():
    _allowed_origins: list[str] = [o.strip() for o in _cors_env.split(",") if o.strip()]
else:
    _allowed_origins = ["http://localhost:3000", "http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── WebPush router (optional; safe if pywebpush missing) ────────────────────
try:
    from push_notifications import router as _push_router  # type: ignore
    app.include_router(_push_router)
except Exception as _push_err:  # pragma: no cover
    print(f"[astro_api_v2] push_notifications disabled: {_push_err}")

# ─── Daily journal router ────────────────────────────────────────────────────
try:
    from day_entries import router as _journal_router  # type: ignore
    app.include_router(_journal_router)
except Exception as _journal_err:  # pragma: no cover
    print(f"[astro_api_v2] day_entries disabled: {_journal_err}")

# ─── Billing/entitlement router ──────────────────────────────────────────────
try:
    from billing import router as _billing_router  # type: ignore
    app.include_router(_billing_router)
except Exception as _billing_err:  # pragma: no cover
    print(f"[astro_api_v2] billing disabled: {_billing_err}")


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


def _utc_for_tz(timezone_name: Optional[str], date: str, utc_fallback: float) -> float:
    """Resolve UTC offset for a given IANA timezone name and date (handles DST)."""
    if not timezone_name:
        return utc_fallback
    try:
        from zoneinfo import ZoneInfo
    except ImportError:
        try:
            from backports.zoneinfo import ZoneInfo  # type: ignore
        except ImportError:
            return utc_fallback
    try:
        import datetime as _dt
        yr, mo, dy = _parse_date(date)
        tz = ZoneInfo(timezone_name)
        dt_local = _dt.datetime(yr, mo, dy, 12, 0, 0, tzinfo=tz)
        offset_sec = dt_local.utcoffset().total_seconds()  # type: ignore[union-attr]
        return offset_sec / 3600
    except Exception:
        return utc_fallback


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
    raw_orig = text or ""
    # Skip already-structured rich interpretations (Andreev 8 priorities, etc.):
    # collapsing them would destroy newline-based section breaks.
    if (
        "[ПРИОРИТЕТ" in raw_orig
        or "АНАЛИЗ ПО СИСТЕМЕ" in raw_orig
        or "ГОД В НЕСКОЛЬКИХ СЛОВАХ" in raw_orig
        or "ПЛАН ДЕЙСТВИЙ" in raw_orig
        or raw_orig.count("\n") >= 4
    ):
        return raw_orig
    raw = re.sub(r"\s+", " ", raw_orig).strip()
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
    advanced:     bool = False           # unlock tertiary/converse progressions
    timezone_name: Optional[str] = None  # IANA tz e.g. "Europe/Moscow" (improves DST accuracy)


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


# ── DAILY MOON (Void of Course + Moon sign) ──────────────────────────────────
@app.get("/daily/moon")
def daily_moon(date: Optional[str] = None, time: str = "12:00",
               utc: float = 0, lat: float = 0, lon: float = 0,
               look_ahead: float = 3.0):
    """Current Moon position, sign, phase, and Void of Course status.

    - **date**: YYYY-MM-DD (defaults to today UTC)
    - **time**: HH:MM (default 12:00)
    - **utc**: UTC offset in hours (e.g. 3 for Moscow)
    - **look_ahead**: days to scan for VoC end / next ingress (default 3)
    """
    try:
        if not date:
            date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        jd_utc = _to_jd(date, time, utc)
        planets = calc_planets(jd_utc)
        moon_lon = planets.get("moon", 0)
        sun_lon  = planets.get("sun",  0)

        # Phase angle (0=new…180=full…360=new)
        phase_angle = (moon_lon - sun_lon) % 360
        if   phase_angle <  45: phase_name = "new_moon"
        elif phase_angle <  90: phase_name = "waxing_crescent"
        elif phase_angle < 135: phase_name = "first_quarter"
        elif phase_angle < 180: phase_name = "waxing_gibbous"
        elif phase_angle < 225: phase_name = "full_moon"
        elif phase_angle < 270: phase_name = "waning_gibbous"
        elif phase_angle < 315: phase_name = "last_quarter"
        else:                   phase_name = "waning_crescent"

        voc = void_of_course_moon(jd_utc, look_ahead_days=look_ahead,
                                  lat=lat, lon=lon)

        return _present({
            "date":         date,
            "time":         time,
            "utc_offset":   utc,
            "moon_lon":     round(moon_lon, 4),
            "moon_sign":    sign_name(moon_lon),
            "moon_degree":  round(moon_lon % 30, 4),
            "phase_angle":  round(phase_angle, 2),
            "phase":        phase_name,
            "void_of_course": voc,
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ── LUNAR CALENDAR (28-day) ────────────────────────────────────────────────────
@app.get("/lunar-calendar")
def lunar_calendar(
    date: Optional[str] = None,
    days:   int   = 28,
    utc:    float = 0,
    lat:    float = 0,
    lon:    float = 0,
):
    """28-day lunar calendar: moon sign, phase, VoC, mansion, critical degrees.

    - **date**: start date YYYY-MM-DD (defaults to today UTC)
    - **days**: number of days to return (1–90, default 28)
    - **utc**: UTC offset in hours
    - **lat/lon**: observer coordinates (used for VoC ingress scanning)
    """
    from datetime import timedelta as _td, date as _date_t
    try:
        days = max(1, min(90, days))
        if not date:
            date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        start_dt = datetime.strptime(date, "%Y-%m-%d")
        # Critical degree sets (modular within sign)
        _CRITICAL = {
            "cardinal": {0, 13, 26},   # Aries, Cancer, Libra, Capricorn
            "fixed":    {9, 21},        # Taurus, Leo, Scorpio, Aquarius
            "mutable":  {4, 17},        # Gemini, Virgo, Sagittarius, Pisces
        }
        _CARDINAL = {"aries","cancer","libra","capricorn"}
        _FIXED    = {"taurus","leo","scorpio","aquarius"}

        calendar_days = []
        for i in range(days):
            dt = start_dt + timedelta(days=i)
            d_str = dt.strftime("%Y-%m-%d")
            jd_noon = _to_jd(d_str, "12:00", utc)
            planets = calc_planets(jd_noon)
            moon_lon = planets.get("moon", 0)
            sun_lon  = planets.get("sun",  0)

            phase_angle = (moon_lon - sun_lon) % 360
            if   phase_angle <  45: phase_name = "new_moon"
            elif phase_angle <  90: phase_name = "waxing_crescent"
            elif phase_angle < 135: phase_name = "first_quarter"
            elif phase_angle < 180: phase_name = "waxing_gibbous"
            elif phase_angle < 225: phase_name = "full_moon"
            elif phase_angle < 270: phase_name = "waning_gibbous"
            elif phase_angle < 315: phase_name = "last_quarter"
            else:                   phase_name = "waning_crescent"

            moon_deg = moon_lon % 30
            m_sign   = sign_name(moon_lon)
            mansion  = lunar_mansion_full(moon_lon)

            # Critical degree check
            deg_floor = int(moon_deg)
            if m_sign in _CARDINAL:
                is_critical = deg_floor in _CRITICAL["cardinal"]
            elif m_sign in _FIXED:
                is_critical = deg_floor in _CRITICAL["fixed"]
            else:
                is_critical = deg_floor in _CRITICAL["mutable"]

            # VoC: lightweight check (no binary search — just is_void flag)
            # Full VoC data only when look_ahead is small
            voc_data = void_of_course_moon(jd_noon, look_ahead_days=2.0, lat=lat, lon=lon)

            calendar_days.append({
                "date":           d_str,
                "weekday":        dt.strftime("%A"),
                "moon_lon":       round(moon_lon, 2),
                "moon_sign":      m_sign,
                "moon_degree":    round(moon_deg, 2),
                "phase_angle":    round(phase_angle, 1),
                "phase":          phase_name,
                "is_critical_degree": is_critical,
                "void_of_course": voc_data.get("is_void", False),
                "voc_end_sign":   voc_data.get("void_end_sign"),
                "mansion":        mansion,
            })

        return _present({
            "start_date": date,
            "days": days,
            "calendar": calendar_days,
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ── DASHBOARD (daily aggregated report) ──────────────────────────────────────
class DashboardRequest(BaseModel):
    """Birth data + optional target date for the dashboard report."""
    date:  str
    time:  str
    lat:   float
    lon:   float
    utc:   float
    target_date: Optional[str] = None   # YYYY-MM-DD, defaults to today UTC
    target_time: str = "12:00"
    houses: str = "placidus"
    julian: bool = False


# ── DAILY PERSONAL (personalised daily summary) ───────────────────────────────

class DailyPersonalRequest(BaseModel):
    date:        str
    time:        str
    lat:         float
    lon:         float
    utc:         float
    name:        Optional[str] = None
    target_date: Optional[str] = None   # defaults to today UTC



@app.post("/dashboard")
def dashboard(req: DashboardRequest):
    """Aggregated daily dashboard: moon status, top transits + compensatory,
    active firdaria, profections, fortune lot.

    Returns all data needed to render the bento-grid dashboard without
    the client making multiple separate API calls.
    """
    try:
        target_date = req.target_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # ── Natal chart ───────────────────────────────────────────────────────
        yr, mo, dy = _parse_date(req.date)
        h,  mi, sc = _parse_time(req.time)
        natal = calc_chart(
            yr, mo, dy, h, mi, sc,
            req.lat, req.lon, req.utc,
            houses_system=req.houses, julian=req.julian,
            include_aspects=True, include_patterns=False,
            include_dignities=True, include_arabic=True,
            include_fixed_stars=False, include_sect=True,
            include_dispositors=False,
        )

        # ── Chart analysis (shape / elements / modalities) ───────────────────
        try:
            planets_raw = {p: d["lon"] if isinstance(d, dict) else d
                           for p, d in natal.get("planets", {}).items()}
            chart_analysis = calc_chart_analysis(planets_raw, natal.get("aspects", []))
        except Exception:
            chart_analysis = {}

        # ── Natal essence (personal identity for dashboard header) ───────────
        try:
            def _planet_house(plon: float, houses: dict) -> int:
                cusps = []
                for i in range(1, 13):
                    hv = houses.get(f"h{i}")
                    if hv is None:
                        return 0
                    cusps.append(hv["lon"] if isinstance(hv, dict) else hv)
                plon_norm = plon % 360
                for i in range(12):
                    start = cusps[i] % 360
                    end   = cusps[(i + 1) % 12] % 360
                    if start <= end:
                        if start <= plon_norm < end:
                            return i + 1
                    else:
                        if plon_norm >= start or plon_norm < end:
                            return i + 1
                return 0

            np_ = natal.get("planets", {})
            nh_ = natal.get("houses", {})
            def _p_sign_lon(key):
                pd = np_.get(key, {})
                if isinstance(pd, dict):
                    return pd.get("sign", ""), pd.get("lon", 0.0), pd.get("deg_min", "")
                return "", float(pd or 0.0), ""
            sun_sign,  sun_lon,  sun_deg  = _p_sign_lon("sun")
            moon_sign, moon_lon, moon_deg = _p_sign_lon("moon")
            mer_sign,  mer_lon,  _mer_deg = _p_sign_lon("mercury")
            ven_sign,  ven_lon,  _v_deg   = _p_sign_lon("venus")
            mar_sign,  mar_lon,  _m_deg   = _p_sign_lon("mars")
            asc_raw = nh_.get("h1", {})
            mc_raw  = nh_.get("h10", {})
            asc_lon = asc_raw["lon"] if isinstance(asc_raw, dict) else float(asc_raw or 0.0)
            mc_lon  = mc_raw["lon"]  if isinstance(mc_raw, dict)  else float(mc_raw or 0.0)
            natal_essence = {
                "sun":     {"sign": sun_sign,  "house": _planet_house(sun_lon,  nh_), "deg_min": sun_deg},
                "moon":    {"sign": moon_sign, "house": _planet_house(moon_lon, nh_), "deg_min": moon_deg},
                "mercury": {"sign": mer_sign,  "house": _planet_house(mer_lon,  nh_)},
                "venus":   {"sign": ven_sign,  "house": _planet_house(ven_lon,  nh_)},
                "mars":    {"sign": mar_sign,  "house": _planet_house(mar_lon,  nh_)},
                "asc":     {"sign": sign_name(asc_lon), "lon": round(asc_lon, 2)},
                "mc":      {"sign": sign_name(mc_lon),  "lon": round(mc_lon, 2)},
                "sect":    natal.get("sect", {}).get("sect") if isinstance(natal.get("sect"), dict) else None,
            }
        except Exception:
            natal_essence = {}

        # ── Today's transit aspects to natal ────────────────────────────────
        natal_jd = _to_jd(req.date, req.time, req.utc)
        try:
            transit_result = transits(
                natal_jd, target_date, req.target_time,
                lat=req.lat, lon=req.lon,
                transit_orb_major=2.0, transit_orb_minor=1.0,
            )
            raw_aspects = transit_result.get("aspects", [])
            transit_planets_dict = {
                p: d["lon"] for p, d in transit_result.get("transit_planets", {}).items()
            }
        except Exception:
            raw_aspects = []
            transit_planets_dict = {}
            transit_result = {}

        # ── Annotate aspects with nature (benefic / malefic / mixed) ──────────
        _HARD_ASP    = {"conjunction", "opposition", "square"}
        _BENEFIC_PL  = {"jupiter", "venus"}
        _MALEFIC_PL  = {"saturn", "mars", "pluto", "uranus", "neptune"}
        _BENEFIC_ASP = {"trine", "sextile"}
        def _transit_nature(tp: str, asp: str) -> str:
            if tp in _BENEFIC_PL and asp in _BENEFIC_ASP: return "benefic"
            if tp in _MALEFIC_PL and asp in _HARD_ASP:    return "malefic"
            return "mixed"

        # Sort by orb, take top 5; tag with nature
        raw_aspects.sort(key=lambda a: a.get("orb", 99))
        top_transits = [
            {**a, "nature": _transit_nature(a.get("transit_planet", ""), a.get("aspect", ""))}
            for a in raw_aspects[:5]
        ]

        # ── Moon status ───────────────────────────────────────────────────────
        jd_target = _to_jd(target_date, req.target_time, req.utc)
        moon_lon = transit_planets_dict.get("moon", 0)
        sun_lon  = transit_planets_dict.get("sun",  0)
        phase_angle = (moon_lon - sun_lon) % 360
        if   phase_angle <  45: phase = "new_moon"
        elif phase_angle <  90: phase = "waxing_crescent"
        elif phase_angle < 135: phase = "first_quarter"
        elif phase_angle < 180: phase = "waxing_gibbous"
        elif phase_angle < 225: phase = "full_moon"
        elif phase_angle < 270: phase = "waning_gibbous"
        elif phase_angle < 315: phase = "last_quarter"
        else:                   phase = "waning_crescent"

        voc = void_of_course_moon(jd_target, look_ahead_days=2.0)
        mansion = lunar_mansion_full(moon_lon)

        moon_status = {
            "sign":           sign_name(moon_lon),
            "degree":         round(moon_lon % 30, 2),
            "phase":          phase,
            "phase_angle":    round(phase_angle, 1),
            "is_void":        voc.get("is_void", False),
            "void_end_sign":  voc.get("void_end_sign"),
            "void_end_utc":   voc.get("void_end_jd"),
            "mansion":        mansion,
        }

        # ── Firdaria ─────────────────────────────────────────────────────────
        natal_jd = _to_jd(req.date, req.time, req.utc)
        try:
            _fird_raw = firdaria(natal_jd, target_date, lat=req.lat, lon=req.lon)
            _am = _fird_raw.get("active_major") or {}
            _as = _fird_raw.get("active_sub")   or {}
            firdaria_data = {
                "main_period": ({
                    "planet": _am.get("major_lord"),
                    "start":  str(int(_am["start_year"])) if _am.get("start_year") else None,
                    "end":    str(int(_am["end_year"]))   if _am.get("end_year")   else None,
                } if _am else None),
                "sub_period": ({
                    "planet": _as.get("sub_lord"),
                    "start":  str(int(_as["start_year"])) if _as.get("start_year") else None,
                    "end":    str(int(_as["end_year"]))   if _as.get("end_year")   else None,
                } if _as else None),
                "sect": _fird_raw.get("sect", ""),
            }
        except Exception:
            firdaria_data = {}

        # ── Profections ───────────────────────────────────────────────────────
        try:
            prof_data = profections(natal_jd, target_date,
                                    houses_system=req.houses, lat=req.lat, lon=req.lon)
        except Exception:
            prof_data = {}

        # ── Arabic Part of Fortune for today ──────────────────────────────────
        from astro_engine import arabic_parts as _arabic_parts
        transit_pl_lons = {p: d["lon"] if isinstance(d, dict) else d
                           for p, d in transit_result.get("transit_planets", {}).items()}
        # Fortune needs houses → use natal houses (simplified approximation)
        natal_houses_lons = {k: v["lon"] if isinstance(v, dict) else v
                             for k, v in natal.get("houses", {}).items()}
        fortune_lot = _arabic_parts(transit_pl_lons, natal_houses_lons).get("fortune", {})

        # ── Compensatory recommendations for top transits ─────────────────────
        try:
            from astro_compensatory import build_compensatory_report
            # Build minimal chart-like dicts for compensatory engine
            _natal_for_comp = natal
            _transit_for_comp = {
                "planets": {
                    p: {"longitude": d["lon"], "sign": d.get("sign","")}
                    for p, d in transit_result.get("transit_planets", {}).items()
                }
            }
            comp_report = build_compensatory_report(
                _natal_for_comp, _transit_for_comp, raw_aspects[:5], target_date,
            )
        except Exception:
            comp_report = {}

        # ── Retrograde transiting planets ─────────────────────────────────────
        retrograde_planets = []
        for pname, pdata in transit_result.get("transit_planets", {}).items():
            if isinstance(pdata, dict) and pdata.get("retrograde", False):
                retrograde_planets.append({
                    "planet": pname,
                    "sign":   pdata.get("sign", ""),
                    "degree": round(float(pdata.get("lon", 0)) % 30, 1),
                })

        # ── Day score 0-100 ────────────────────────────────────────────────────
        benefic_pts = sum(1   for t in top_transits if t.get("nature") == "benefic")
        malefic_pts = sum(1   for t in top_transits if t.get("nature") == "malefic")
        mixed_pts   = sum(0.3 for t in top_transits if t.get("nature") == "mixed")
        raw_score = 50 + benefic_pts * 8 - malefic_pts * 8 + mixed_pts * 2
        day_score = max(15, min(95, round(raw_score)))

        # ── Sphere scores (love/work/finance/health/creative) ─────────────────
        SPHERE_PLANET_WEIGHT = {
            "love":     {"venus": 20, "mars": 10, "moon": 12, "jupiter": 8},
            "work":     {"mercury": 18, "sun": 12, "saturn": 10, "mars": 8, "jupiter": 10},
            "finance":  {"venus": 12, "jupiter": 20, "saturn": 8, "pluto": -8, "mercury": 8},
            "health":   {"sun": 12, "moon": 10, "mars": 8, "saturn": -8},
            "creative": {"venus": 15, "neptune": 15, "mercury": 10, "uranus": 10, "moon": 8},
        }
        ASPECT_MULT = {"trine": 1.0, "sextile": 0.7, "conjunction": 0.8,
                       "square": -0.8, "opposition": -0.9, "quincunx": -0.3}
        sphere_scores = {}
        for sphere, weights in SPHERE_PLANET_WEIGHT.items():
            base = 55.0
            for t in top_transits:
                tp = t.get("transit_planet", "")
                asp = t.get("aspect", "")
                if tp in weights:
                    base += weights[tp] * ASPECT_MULT.get(asp, 0.2)
            sphere_scores[sphere] = max(10, min(95, round(base)))

        # ── Next lunation (full / new moon) ────────────────────────────────────
        from datetime import date as _d, timedelta as _td
        _pa = phase_angle
        next_full_days = round((180 - _pa) % 360 / 12.19, 0) if _pa < 180 else round((360 + 180 - _pa) % 360 / 12.19, 0)
        next_new_days  = round((360 - _pa) % 360 / 12.19, 0)
        try:
            _today_date = _d.fromisoformat(target_date)
        except Exception:
            _today_date = _d.today()
        next_lunation = {
            "full_moon":    str(_today_date + _td(days=int(next_full_days))),
            "new_moon":     str(_today_date + _td(days=int(next_new_days))),
            "days_to_full": int(next_full_days),
            "days_to_new":  int(next_new_days),
        }

        # ── Hourly timeline (24 points, Moon-aspect intensity + diurnal) ───────
        # Moon ~13°/day → ~0.5417°/hr. We scan each hour 00..23 local-equivalent
        # (relative to target_date 00:00 UTC), evaluate Moon orbs to natal planets,
        # add diurnal curve and day-score baseline.
        try:
            natal_planet_lons = {}
            for pkey, pdata in (natal.get("planets", {}) or {}).items():
                if isinstance(pdata, dict):
                    natal_planet_lons[pkey] = float(pdata.get("lon", 0.0))
                else:
                    natal_planet_lons[pkey] = float(pdata or 0.0)

            _BENEFIC_PL2  = {"jupiter", "venus", "sun", "moon", "mercury"}
            _MALEFIC_PL2  = {"saturn", "mars", "pluto"}
            ASP_TARGETS = [(0, 8), (60, 5), (90, 6), (120, 7), (180, 8)]  # (angle, orb_max)
            ASP_BENEFIC_DELTA = {0: 4, 60: 6, 90: -5, 120: 8, 180: -4}
            ASP_MALEFIC_DELTA = {0: -3, 60: 1, 90: -8, 120: 2, 180: -7}

            moon_speed_per_hr = 13.176 / 24.0  # ~0.549°/h
            jd_day_start = _to_jd(target_date, "00:00", req.utc)
            moon_lon_at_target = float(transit_planets_dict.get("moon", moon_lon))
            # Estimate moon at hour 0 by extrapolating back from current target time
            try:
                tt_h, tt_m, _ = _parse_time(req.target_time or "12:00")
                hours_offset_from_midnight = tt_h + tt_m / 60.0
            except Exception:
                hours_offset_from_midnight = 12.0
            moon_lon_at_h0 = (moon_lon_at_target - moon_speed_per_hr * hours_offset_from_midnight) % 360

            hourly_timeline = []
            for h in range(24):
                m_lon = (moon_lon_at_h0 + moon_speed_per_hr * h) % 360
                bonus = 0.0
                hits = []
                for npl, nlon in natal_planet_lons.items():
                    if npl in ("north_node", "south_node", "chiron", "lilith"):
                        continue
                    sep = abs(((m_lon - nlon + 180) % 360) - 180)
                    for ang, orb_max in ASP_TARGETS:
                        d = abs(sep - ang)
                        if d <= orb_max:
                            strength = (orb_max - d) / orb_max  # 0..1
                            if npl in _BENEFIC_PL2:
                                bonus += ASP_BENEFIC_DELTA[ang] * strength
                            elif npl in _MALEFIC_PL2:
                                bonus += ASP_MALEFIC_DELTA[ang] * strength
                            else:
                                bonus += ASP_BENEFIC_DELTA[ang] * 0.5 * strength
                            if strength > 0.55:
                                hits.append({"planet": npl, "angle": ang})
                            break
                # Diurnal curve: low at night, peak mid-morning + early evening
                diurnal = -6 * math.cos((h - 10) * math.pi / 12) - 2 * math.cos((h - 19) * math.pi / 6)
                score_h = day_score + bonus + diurnal
                score_h = max(10, min(95, round(score_h)))
                hourly_timeline.append({
                    "hour":  h,
                    "score": score_h,
                    "hits":  hits[:2],
                })
            # Best-window (longest run of hours ≥ top-25%-threshold)
            scores_only = [p["score"] for p in hourly_timeline]
            sorted_scores = sorted(scores_only, reverse=True)
            threshold = sorted_scores[max(0, len(sorted_scores) // 4)] if sorted_scores else 60
            best_start = best_len = 0
            cur_start = -1
            cur_len = 0
            for i, s in enumerate(scores_only):
                if s >= threshold:
                    if cur_start < 0:
                        cur_start = i
                    cur_len += 1
                    if cur_len > best_len:
                        best_len = cur_len
                        best_start = cur_start
                else:
                    cur_start = -1
                    cur_len = 0
            best_window = {
                "start_hour": best_start,
                "end_hour":   best_start + max(1, best_len) - 1,
                "peak_score": max(scores_only) if scores_only else day_score,
                "peak_hour":  scores_only.index(max(scores_only)) if scores_only else 12,
            } if best_len > 0 else None
        except Exception:
            hourly_timeline = []
            best_window = None

        return _present({
            "target_date":        target_date,
            "moon":               moon_status,
            "top_transits":       top_transits,
            "compensatory":       comp_report,
            "firdaria":           firdaria_data,
            "profections":        prof_data,
            "fortune_today":      fortune_lot,
            "arabic_natal":       natal.get("arabic_parts", {}),
            "chart_analysis":     chart_analysis,
            "natal_essence":      natal_essence,
            "retrograde_planets": retrograde_planets,
            "day_score":          day_score,
            "sphere_scores":      sphere_scores,
            "next_lunation":      next_lunation,
            "hourly_timeline":    hourly_timeline,
            "best_window":        best_window,
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


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
        # Enrich with chart analysis (shape, elements, modalities, unaspected)
        try:
            from astro_engine import calc_chart_analysis as _cca
            pl_lons = {k: v["lon"] for k, v in chart.get("planets", {}).items()
                       if isinstance(v, dict) and "lon" in v}
            chart["chart_analysis"] = _cca(pl_lons, chart.get("aspects", []))
        except Exception:
            pass
        return _present(chart)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ── HELIOCENTRIC CHART ────────────────────────────────────────────────────────

@app.post("/heliocentric")
def heliocentric_chart(req: BirthData):
    """
    Heliocentric (Sun-centred) natal chart.
    Uses Swiss Ephemeris FLG_HELCTR when available, falls back to geocentric approximation.
    Earth replaces the Sun; inner planets show heliocentric longitudes.
    """
    try:
        yr, mo, dy = _parse_date(req.date)
        h,  mi, sc = _parse_time(req.time)
        result = calc_heliocentric_chart(
            yr, mo, dy, h, mi, sc,
            req.lat, req.lon, req.utc,
        )
        return _present(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ── PLANETARY NODES ───────────────────────────────────────────────────────────

@app.post("/natal/planetary-nodes")
def natal_planetary_nodes(req: BirthData):
    """Heliocentric ascending nodes (Ω) of planetary orbits for a natal chart.

    Returns ecliptic longitudes of the ascending nodes of Mercury–Pluto orbits
    at the birth epoch, with aspects to natal planets.
    Computed via Meeus J2000 reference + linear precession rate (~0.5° accuracy).
    """
    try:
        from astro_engine import calc_planetary_nodes, calc_chart as _cc
        yr, mo, dy = _parse_date(req.date)
        h,  mi, sc = _parse_time(req.time)
        natal_jd   = _to_jd(req.date, req.time, req.utc)
        nodes      = calc_planetary_nodes(natal_jd)

        # Compute aspects between each node and natal planets
        natal = _cc(yr, mo, dy, h, mi, sc, req.lat, req.lon, req.utc,
                    include_aspects=False)
        natal_lons = {k: v["lon"] for k, v in natal.get("planets", {}).items()
                      if isinstance(v, dict) and "lon" in v}

        from astro_engine import _angle_diff as _ad, ASPECT_DEFS as _ADEFS
        for planet, node_data in nodes.items():
            node_lon  = node_data["north_node_lon"]
            aspects_to_natal = []
            for np, nlon in natal_lons.items():
                diff = _ad(node_lon, nlon)
                for asp_name, (asp_angle, asp_orb, glyph) in _ADEFS.items():
                    orb_val = min(asp_orb, 2.0)
                    dev = abs(diff - asp_angle)
                    if dev <= orb_val:
                        aspects_to_natal.append({
                            "natal_planet": np,
                            "aspect": asp_name,
                            "glyph": glyph,
                            "orb": round(dev, 2),
                        })
            node_data["aspects_to_natal"] = sorted(aspects_to_natal, key=lambda x: x["orb"])

        return _present({
            "date":  req.date,
            "time":  req.time,
            "nodes": nodes,
            "note":  "Heliocentric ascending nodes of planetary orbits (Meeus J2000, ~0.5° accuracy).",
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))



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
    """Advanced technique. Pass advanced=true in request to enable."""
    if not req.advanced:
        raise HTTPException(
            400,
            "Tertiary progressions are an advanced technique. "
            "Pass advanced=true to enable."
        )
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
    """Advanced technique. Pass advanced=true in request to enable."""
    if not req.advanced:
        raise HTTPException(
            400,
            "Converse progressions are an advanced technique. "
            "Pass advanced=true to enable."
        )
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
        effective_utc = _utc_for_tz(req.timezone_name, req.date, req.utc)
        natal_jd = _to_jd(req.date, req.time, effective_utc)
        yr = int(req.target_date[:4])
        obs_lat = req.target_lat if req.target_lat is not None else req.lat
        obs_lon = req.target_lon if req.target_lon is not None else req.lon
        result = solar_return(natal_jd, yr, obs_lat, obs_lon,
                              houses_system=req.houses)
        if req.timezone_name:
            result["timezone_name"] = req.timezone_name
            result["effective_utc"] = round(effective_utc, 2)
        result["interpretation"] = _gen_solar_return_interp(result)
        return _present(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ── SOLAR RETURN — DEEP ANALYSIS (Pavel Andreev method) ──────────────────────

class SolarReturnDeepRequest(BaseModel):
    """Birth data + observation city for deep solar return analysis."""
    # Natal birth data
    date:  str            # YYYY-MM-DD
    time:  str            # HH:MM or HH:MM:SS
    lat:   float          # natal latitude
    lon:   float          # natal longitude
    utc:   float          # UTC offset at birth
    timezone_name: Optional[str] = None
    # Solar return year
    sr_year: int
    # Observation location (city where you celebrate birthday)
    obs_lat: Optional[float] = None   # defaults to natal lat
    obs_lon: Optional[float] = None   # defaults to natal lon
    houses: str = "placidus"
    # Optional modules
    include_holos:  bool = False      # HOLOS α/φ intersection
    include_lunars: bool = False      # lunar return calendar + hot months within SR year


class SolarReturnCitiesRequest(BaseModel):
    """Birth data + list of candidate cities for SR ASC comparison."""
    date:  str
    time:  str
    lat:   float
    lon:   float
    utc:   float
    timezone_name: Optional[str] = None
    sr_year: int
    cities: List[Dict[str, Any]]  # [{"name": "City", "lat": 45.0, "lon": 38.0}]
    houses: str = "placidus"
    # Optional sphere targeting
    target_natal_house: Optional[int] = None  # 1-12: rank cities by SR ASC in this natal house
    target_sphere: Optional[str] = None       # keyword: "career", "money", "love", etc.


class SolarReturnSphereCitiesRequest(BaseModel):
    """Find cities that activate a specific natal house / life sphere."""
    date:  str
    time:  str
    lat:   float
    lon:   float
    utc:   float
    timezone_name: Optional[str] = None
    sr_year: int
    cities: List[Dict[str, Any]]
    houses: str = "placidus"
    target_natal_house: Optional[int] = None  # 1-12
    target_sphere: Optional[str] = None       # keyword alias for house


def _require_sr_deep() -> None:
    if not _SR_DEEP_OK:
        raise _feature_unavailable("Solar Return Deep Analysis",
                                   "astro_solar_return module not available")


@app.post("/predictive/solar-return/deep")
def calc_solar_return_deep(req: SolarReturnDeepRequest):
    """
    Deep solar return analysis by Pavel Andreev method.

    Priority system:
      1. SR ASC in natal house (main sphere of the year)
      2. Planets in angular SR houses (1,4,7,10)
      3. SR MC in natal house (career vector)
      4. SR Sun in SR house (self-expression theme)
      5. SR Moon (emotional tone)
      6. SR ASC ruler (how the theme manifests)
      7. SR-to-natal aspects (activations)
      8. SR planets in natal houses (activity zones)

    Extensions:
      - include_holos: HOLOS α-address / φ-node intersection (hypothesis SR-8)
      - include_lunars: full lunar return calendar within the solar year
    """
    _require_sr_deep()
    try:
        effective_utc = _utc_for_tz(req.timezone_name, req.date, req.utc)
        natal_jd = _to_jd(req.date, req.time, effective_utc)
        obs_lat = req.obs_lat if req.obs_lat is not None else req.lat
        obs_lon = req.obs_lon if req.obs_lon is not None else req.lon
        result = solar_return_deep_analysis(
            natal_jd, req.sr_year,
            obs_lat, obs_lon,
            req.lat, req.lon,
            req.houses,
            include_holos=req.include_holos,
            include_lunars=req.include_lunars,
        )
        if req.timezone_name:
            result["timezone_name"] = req.timezone_name
            result["effective_utc"] = round(effective_utc, 2)
        return _present(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/solar-return/cities")
def calc_solar_return_cities(req: SolarReturnCitiesRequest):
    """
    Compare SR ASC across multiple observation cities.

    Default mode: ranks cities by proximity of SR ASC to natal ASC (resonance).

    Sphere-targeting mode (optional):
      - target_natal_house (1-12): rank by whether SR ASC falls in that natal house
      - target_sphere ("career", "money", "love", "partnership", etc.): same via keyword

    Each city result includes a full sphere_map (what natal houses SR ASC, MC, Sun, Moon activate),
    angular planet archetypes for all 4 angular houses, and sphere_recommendations dict.

    Each city entry: {"name": "City", "lat": 45.04, "lon": 38.98}
    """
    _require_sr_deep()
    if not req.cities:
        raise HTTPException(400, "Provide at least one city in 'cities' list")
    if len(req.cities) > 30:
        raise HTTPException(400, "Maximum 30 cities per request")
    try:
        effective_utc = _utc_for_tz(req.timezone_name, req.date, req.utc)
        natal_jd = _to_jd(req.date, req.time, effective_utc)
        result = city_asc_comparison(
            natal_jd, req.sr_year,
            req.cities,
            req.lat, req.lon,
            req.houses,
            target_natal_house=req.target_natal_house,
            target_sphere=req.target_sphere,
        )
        return _present(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/solar-return/sphere-search")
def calc_solar_return_sphere_search(req: SolarReturnSphereCitiesRequest):
    """
    Find cities where the SR ASC falls in a specific natal house (life sphere).

    AstroCRM client flow:
      "I want a career year" → target_natal_house=10 or target_sphere="career"
      Returns: exact matches (SR ASC in target house), near-matches (within 5° of cusp),
      and all cities ranked by distance to target house cusp.

    Supported target_sphere keywords:
      career, money, love, partnership, home, family, creativity, communication,
      travel, education, spirituality, transformation, community, health, work, etc.
    """
    _require_sr_deep()
    if not req.cities:
        raise HTTPException(400, "Provide at least one city in 'cities' list")
    if len(req.cities) > 50:
        raise HTTPException(400, "Maximum 50 cities per sphere search")

    # Resolve target
    target_house = req.target_natal_house
    if req.target_sphere and not target_house:
        target_house = _SR_SPHERE_KW.get(req.target_sphere.lower())
    if not target_house or not (1 <= target_house <= 12):
        raise HTTPException(
            400,
            f"Provide target_natal_house (1-12) or target_sphere keyword. "
            f"Valid keywords: {', '.join(sorted(_SR_SPHERE_KW.keys())[:20])}..."
        )
    try:
        effective_utc = _utc_for_tz(req.timezone_name, req.date, req.utc)
        natal_jd = _to_jd(req.date, req.time, effective_utc)
        result = sr_sphere_city_search(
            natal_jd, req.sr_year,
            target_house,
            req.cities,
            req.lat, req.lon,
            req.houses,
        )
        return _present(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/predictive/solar-return/spheres")
def get_solar_return_spheres():
    """
    Reference: list of all 12 natal house spheres and their keyword aliases.
    Useful for populating UI dropdowns or sphere-selection widgets.
    """
    _require_sr_deep()
    spheres = []
    # Build reverse map: house → keywords
    kw_by_house: dict = {}
    for kw, h in _SR_SPHERE_KW.items():
        kw_by_house.setdefault(h, []).append(kw)
    for h in range(1, 13):
        spheres.append({
            "natal_house": h,
            "label":       _SR_SPHERE_LABELS.get(h, ""),
            "keywords":    kw_by_house.get(h, []),
        })
    return _safe(spheres)


@app.get("/predictive/solar-return/hypotheses")
def get_solar_return_hypotheses():
    """
    12 statistical hypotheses about solar returns for database validation.
    Each hypothesis is testable on astrodatabank or holos_analytics.db.
    """
    _require_sr_deep()
    try:
        return _safe(generate_sr_hypotheses())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/lunar-return")
def calc_lunar_return(req: PredictiveRequest):
    try:
        effective_utc = _utc_for_tz(req.timezone_name, req.date, req.utc)
        natal_jd = _to_jd(req.date, req.time, effective_utc)
        obs_lat = req.target_lat if req.target_lat is not None else req.lat
        obs_lon = req.target_lon if req.target_lon is not None else req.lon
        result = lunar_return(natal_jd, req.target_date, obs_lat, obs_lon,
                              houses_system=req.houses)
        if req.timezone_name:
            result["timezone_name"] = req.timezone_name
            result["effective_utc"] = round(effective_utc, 2)
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


@app.post("/predictive/annual-profection")
def annual_profection(req: PredictiveRequest):
    """Annual profection — full 12-year cycle table + activated natal planets.

    Extends /predictive/profections with:
    - cycle_12: list of all 12 years ahead (house, sign, lord, age)
    - activated_natal_planets: natal planets inside the current profected house
    - house_theme: Russian theme text for the active house
    - interpretation: narrative text
    """
    try:
        from astro_predictive import TRADITIONAL_LORD as _TL
        from astro_engine import calc_houses as _ch, planet_in_house as _pih

        effective_utc = _utc_for_tz(req.timezone_name, req.date, req.utc)
        natal_jd = _to_jd(req.date, req.time, effective_utc)
        base = profections(natal_jd, req.target_date,
                           houses_system=req.houses, lat=req.lat, lon=req.lon)

        # Raw float house cusps for planet_in_house
        raw_houses = _ch(natal_jd, req.lat, req.lon, req.houses)

        # Natal planet lons from calc_chart (need lon floats)
        yr, mo, dy = _parse_date(req.date)
        h, mi, sc  = _parse_time(req.time)
        natal = calc_chart(yr, mo, dy, h, mi, sc, req.lat, req.lon, effective_utc,
                           houses_system=req.houses,
                           include_aspects=False, include_dignities=False,
                           include_arabic=False)
        natal_planets_fmt = natal.get("planets", {})

        current_house = base["annual_house"]
        age           = base["age"]

        # Full 12-year cycle
        cycle = []
        for offset in range(12):
            hnum    = ((current_house - 1 + offset) % 12) + 1
            h_lon   = raw_houses.get(f"h{hnum}", 0)
            h_sign  = sign_name(h_lon)
            cycle.append({
                "year_offset": offset,
                "age":         age + offset,
                "house":       hnum,
                "house_lon":   round(h_lon, 4),
                "sign":        h_sign,
                "lord":        _TL.get(h_sign, "sun"),
                "is_current":  offset == 0,
            })

        # Natal planets in the current profected house
        ann_h_lon  = raw_houses.get(f"h{current_house}", 0)
        next_h     = (current_house % 12) + 1
        next_h_lon = raw_houses.get(f"h{next_h}", 0)

        def _n360(x): return x % 360

        house_span = _n360(next_h_lon - ann_h_lon)
        activated = []
        for pname, pdata in natal_planets_fmt.items():
            if not isinstance(pdata, dict):
                continue
            plon = pdata.get("lon")
            if plon is None:
                continue
            diff = _n360(plon - ann_h_lon)
            if diff < house_span:
                activated.append({
                    "planet": pname,
                    "lon":    round(plon, 4),
                    "sign":   pdata.get("sign", sign_name(plon)),
                })

        _HOUSE_THEMES_RU = {
            1:  "идентичность, тело, новые начинания",
            2:  "деньги, ресурсы, ценности",
            3:  "коммуникации, братья/сёстры, обучение",
            4:  "дом, семья, корни",
            5:  "творчество, дети, романтика, риск",
            6:  "работа, здоровье, рутина",
            7:  "партнёрство, отношения, договоры",
            8:  "трансформация, наследство, кризис",
            9:  "путешествия, философия, высшее образование",
            10: "карьера, статус, публичность",
            11: "друзья, цели, социальные связи",
            12: "уединение, тайны, духовная работа",
        }
        theme     = _HOUSE_THEMES_RU.get(current_house, "")
        lord_name = base.get("annual_lord", "")

        interp = (
            f"Год профекций: дом {current_house} — «{theme}». "
            f"Лорд года: {lord_name.capitalize() if lord_name else '—'}. "
            "Состояние лорда в натальной карте определяет качество года. "
        )
        if activated:
            planets_str = ", ".join(p["planet"].capitalize() for p in activated)
            interp += (
                f"В активированном доме натально стоят: {planets_str} — "
                "эти планеты усиленно задействованы в текущем году."
            )
        else:
            interp += (
                "В активированном доме натально нет планет — "
                "тема дома раскрывается прежде всего через лорда года."
            )

        base["cycle_12"]                = cycle
        base["activated_natal_planets"] = activated
        base["house_theme"]             = theme
        base["interpretation"]          = interp
        base["type"]                    = "annual_profection"
        return _present(base)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/predictive/firdaria")
def calc_firdaria(req: PredictiveRequest):
    """Firdaria (Firdariyyat) — Hellenistic unequal planetary periods.

    Day chart: Sun→Venus→Mercury→Moon→Saturn→Jupiter→Mars (7+8+13+9+11+12+7 = 67 yr).
    Night chart: Moon→Saturn→Mercury→Mars→Venus→Sun→Jupiter.
    Each major period splits into 7 sub-periods ruled by the same sequence."""
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        result = firdaria(natal_jd, req.target_date,
                          lat=req.lat, lon=req.lon)
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


@app.post("/predictive/exact-aspects")
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




# ── SATURN CYCLE ──────────────────────────────────────────────────────────────

class SaturnCycleRequest(BaseModel):
    date:    str
    time:    str = "12:00"
    lat:     float = 0.0
    lon:     float = 0.0
    utc:     float = 0.0
    max_age: int   = 90

@app.post("/predictive/saturn-cycle")
def calc_saturn_cycle(req: SaturnCycleRequest):
    """
    Calculate Saturn cycle milestones for a native (returns, squares, oppositions).
    Returns all conjunction/square/opposition dates up to max_age years.
    """
    try:
        from astro_predictive import saturn_cycle as _saturn_cycle
        result = _saturn_cycle(
            req.date, req.time, req.lat, req.lon, req.utc,
            max_age=req.max_age,
        )
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


# ── COMPENSATORY PRACTICES ────────────────────────────────────────────────────

class CompensatoryRequest(BaseModel):
    date:        str;  time:   str
    lat:         float; lon:   float; utc: float
    target_date: str
    target_time: str = "12:00"
    context:     Optional[str] = None   # travel|work|home|crisis|creative
    intensity:   str = "medium"         # light|medium|deep
    houses:      str = "placidus"


@app.post("/compensatory/practices")
def compensatory_practices(req: CompensatoryRequest):
    """Компенсаторные практики по транзитам к натальной карте.

    Три слоя: одиночные транзитные планеты → практики, аспектные пары,
    фоновые нарративы 2025-2026. Плюс характеристика натального Солнца.
    """
    if not _COMPENSATORY_OK:
        raise HTTPException(503, "Compensatory engine not available")
    try:
        from astro_engine import calc_aspects as _calc_asp
        natal_jd   = _to_jd(req.date, req.time, req.utc)
        transit_jd = _to_jd(req.target_date, req.target_time, req.utc)
        natal_chart   = calc_chart(natal_jd,   req.lat, req.lon,
                                   houses_system=req.houses)
        transit_chart = calc_chart(transit_jd, req.lat, req.lon,
                                   houses_system=req.houses,
                                   include_aspects=False,
                                   include_patterns=False,
                                   include_dignities=False,
                                   include_arabic=False,
                                   include_sect=False,
                                   include_dispositors=False)
        # Transit-to-transit aspects
        tr_planets = {
            p: v.get("longitude", v) if isinstance(v, dict) else v
            for p, v in transit_chart.get("planets", {}).items()
        }
        transit_aspects = _calc_asp(tr_planets)
        report = build_compensatory_report(
            natal_chart    = natal_chart,
            transit_chart  = transit_chart,
            transit_aspects= transit_aspects,
            target_date    = req.target_date,
            intensity      = req.intensity,
            context        = req.context,
        )
        return _present(report)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/compensatory/current")
def compensatory_current(target_date: Optional[str] = None,
                         intensity: str = "medium"):
    """Компенсаторные практики только по текущим транзитам (без натальной карты).

    Возвращает практики для активных транзитных планет и аспектных пар.
    """
    if not _COMPENSATORY_OK:
        raise HTTPException(503, "Compensatory engine not available")
    try:
        from astro_engine import calc_aspects as _calc_asp
        if not target_date:
            from datetime import datetime, timezone
            target_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        transit_jd = _to_jd(target_date, "12:00", 0)
        transit_chart = calc_chart(transit_jd, 0, 0,
                                   include_aspects=False,
                                   include_patterns=False,
                                   include_dignities=False,
                                   include_arabic=False,
                                   include_sect=False,
                                   include_dispositors=False)
        tr_planets = {
            p: v.get("longitude", v) if isinstance(v, dict) else v
            for p, v in transit_chart.get("planets", {}).items()
        }
        transit_aspects = _calc_asp(tr_planets)
        report = build_compensatory_report(
            natal_chart    = {},
            transit_chart  = transit_chart,
            transit_aspects= transit_aspects,
            target_date    = target_date,
            intensity      = intensity,
        )
        return _present(report)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ── INTERACTION-ADJUSTED PERSONAL FORECAST ──────────────────────────────────
@app.post("/interaction/personal-forecast")
# NOTE: /interaction/* endpoints are for two-person relationship timing analysis
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


def _sign_norm(s: str) -> str:
    """Normalise sign string to Title-case for lookup."""
    return s.strip().capitalize() if s else ""


# ── Planetary essential dignity table ────────────────────────────────────────
# Traditional + modern rulerships.
# Domicile = 2.0, Exaltation = 1.5, Detriment = -1.5, Fall = -2.0
_PLANET_DIGNITY: Dict[str, Dict[str, float]] = {
    "sun":     {"Leo": 2.0, "Aries": 1.5, "Aquarius": -1.5, "Libra": -2.0},
    "moon":    {"Cancer": 2.0, "Taurus": 1.5, "Capricorn": -1.5, "Scorpio": -2.0},
    "mercury": {"Gemini": 2.0, "Virgo": 2.0, "Sagittarius": -1.5, "Pisces": -2.0},
    "venus":   {"Taurus": 2.0, "Libra": 2.0, "Pisces": 1.5, "Scorpio": -2.0, "Aries": -1.5},
    "mars":    {"Aries": 2.0, "Scorpio": 1.5, "Capricorn": 1.5, "Libra": -1.5, "Taurus": -2.0, "Cancer": -2.0},
    "jupiter": {"Sagittarius": 2.0, "Pisces": 1.5, "Cancer": 1.5, "Gemini": -1.5, "Virgo": -2.0, "Capricorn": -1.5},
    "saturn":  {"Capricorn": 2.0, "Aquarius": 1.5, "Libra": 1.5, "Aries": -2.0, "Cancer": -1.5, "Leo": -1.5},
    "uranus":  {"Aquarius": 2.0, "Scorpio": 1.0, "Leo": -1.5, "Taurus": -1.0},
    "neptune": {"Pisces": 2.0, "Cancer": 1.0, "Virgo": -1.5, "Capricorn": -1.0},
    "pluto":   {"Scorpio": 2.0, "Aries": 1.0, "Taurus": -1.5, "Libra": -1.0},
    "node":    {"Gemini": 1.0, "Cancer": 1.0, "Sagittarius": -1.0, "Capricorn": -1.0},
    "chiron":  {"Virgo": 1.5, "Sagittarius": 1.0},
}

# ── Relocated ASC sign quality per goal ──────────────────────────────────────
# The rising sign at the new location shapes how you show up there.
_ASC_SIGN_QUALITY: Dict[str, Dict[str, int]] = {
    "career":     {"Capricorn": 4, "Leo": 4, "Aries": 3, "Scorpio": 3, "Aquarius": 2,
                   "Libra": 1, "Cancer": -2, "Pisces": -1},
    "love":       {"Libra": 5, "Taurus": 4, "Cancer": 3, "Pisces": 3, "Leo": 2,
                   "Scorpio": 2, "Aries": -1, "Virgo": -1},
    "money":      {"Taurus": 5, "Scorpio": 4, "Capricorn": 3, "Virgo": 3,
                   "Aries": 1, "Gemini": -1, "Pisces": -2},
    "health":     {"Aries": 5, "Virgo": 4, "Leo": 3, "Taurus": 2,
                   "Scorpio": -1, "Pisces": -1, "Capricorn": 1},
    "creativity": {"Leo": 4, "Gemini": 4, "Aquarius": 3, "Sagittarius": 3,
                   "Pisces": 2, "Virgo": -2, "Capricorn": -1},
    "spirit":     {"Pisces": 5, "Sagittarius": 3, "Scorpio": 3, "Aquarius": 3,
                   "Cancer": 2, "Capricorn": -2, "Aries": -1},
    "stability":  {"Taurus": 4, "Capricorn": 4, "Cancer": 3, "Virgo": 3,
                   "Aries": -1, "Gemini": -2, "Sagittarius": -1},
    "social":     {"Gemini": 5, "Aquarius": 4, "Libra": 4, "Leo": 3,
                   "Sagittarius": 3, "Capricorn": -2, "Scorpio": -1},
    "overall":    {"Leo": 2, "Capricorn": 2, "Libra": 1, "Aquarius": 1},
}

# ── Relocated MC sign quality per goal ───────────────────────────────────────
# The Midheaven at the new location shapes your public image and calling there.
_MC_SIGN_QUALITY: Dict[str, Dict[str, int]] = {
    "career":     {"Capricorn": 5, "Leo": 4, "Aries": 3, "Aquarius": 3,
                   "Scorpio": 3, "Virgo": 2, "Cancer": -2, "Pisces": -1},
    "love":       {"Libra": 5, "Cancer": 4, "Taurus": 3, "Pisces": 3,
                   "Scorpio": 2, "Aries": -2, "Capricorn": -1},
    "money":      {"Taurus": 5, "Capricorn": 4, "Scorpio": 4, "Virgo": 3,
                   "Sagittarius": 2, "Pisces": -1, "Gemini": -1},
    "health":     {"Virgo": 5, "Aries": 4, "Taurus": 3, "Scorpio": 3,
                   "Capricorn": 2, "Pisces": -2, "Libra": -1},
    "creativity": {"Leo": 5, "Pisces": 4, "Sagittarius": 3, "Gemini": 3,
                   "Aquarius": 3, "Virgo": -2, "Capricorn": -1},
    "spirit":     {"Pisces": 5, "Sagittarius": 4, "Scorpio": 3,
                   "Aquarius": 3, "Cancer": 2, "Capricorn": -2},
    "stability":  {"Taurus": 5, "Capricorn": 4, "Cancer": 4,
                   "Virgo": 3, "Scorpio": 2, "Gemini": -1},
    "social":     {"Aquarius": 5, "Gemini": 4, "Libra": 4,
                   "Leo": 3, "Sagittarius": 3, "Capricorn": -2},
    "overall":    {"Capricorn": 2, "Leo": 2, "Libra": 1, "Taurus": 1},
}

# Goal → {house: weight} maps.
# Calibrated: typical good chart → 65-82. Exceptional multi-planet stacks → 90-96.
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

# Goal → which natal planets are primary significators.
# "mc" removed — it is an angle, not a planet; its effect is captured via house weights for h10.
_GOAL_PLANETS: Dict[str, List[str]] = {
    "love":       ["venus", "moon", "mars", "sun", "node"],
    "career":     ["sun", "saturn", "jupiter", "mars", "mercury"],
    "money":      ["jupiter", "venus", "saturn", "mercury", "pluto"],
    "health":     ["sun", "mars", "saturn", "moon", "jupiter"],
    "creativity": ["venus", "neptune", "mercury", "moon", "uranus"],
    "spirit":     ["neptune", "jupiter", "pluto", "node", "chiron"],
    "stability":  ["saturn", "moon", "venus", "jupiter", "sun"],
    "social":     ["mercury", "jupiter", "moon", "venus", "uranus"],
    "overall":    ["sun", "moon", "venus", "mars", "saturn", "jupiter"],
}


# Per-planet base angular effect on the relocated chart angles (ASC/IC/DSC/MC).
# Benefics add positive energy to the location; malefics introduce stress/challenge.
# Effect is further modified by the planet's dignity and retrograde state.
_ANGULAR_EFFECT: Dict[str, float] = {
    "sun": 4.0, "moon": 4.0, "venus": 5.0, "jupiter": 5.0, "mercury": 2.0,
    "mars": -3.0, "saturn": -4.5, "pluto": -3.5, "uranus": 1.5,
    "neptune": 2.5, "node": 2.5, "chiron": 2.0, "lilith": -1.5,
}


def _orb_factor(diff: float, max_orb: float = 5.0) -> float:
    """Smooth cosine-based orb decay: 1.0 at 0°, 0.0 at max_orb°."""
    if diff >= max_orb:
        return 0.0
    return math.cos(math.pi * diff / (2 * max_orb))


def _score_by_goal(planets: Dict, houses: Dict, goal: str, stay_days: int) -> int:
    """Score how well a relocated chart supports a given goal.

    Methodology layers (in order of astrological priority):
      1. House placement of goal-significant planets (primary)
      2. Essential dignity of those planets (multiplier)
      3. Retrograde state modifier
      4. Angular activations: benefics boost, malefics penalise
         — partile (<1°) = full effect; smooth cosine decay to 5° orb
         — dignity of angular planet modifies the effect ±20%
      5. Relocated ASC + MC sign quality for this goal
      6. Stay-duration factor (short trip = surface layer only)

    Calibration: neutral chart ~50; good chart 65–82;
    exceptional (rare multi-planet stacks + quality angles) 88–96.
    """
    cusps = [houses.get(f"h{i}", {}).get("lon", i * 30) for i in range(1, 13)]
    hw    = _GOAL_HOUSES.get(goal, _GOAL_HOUSES["overall"])
    planet_list = _GOAL_PLANETS.get(goal, _GOAL_PLANETS["overall"])

    score = 50.0

    # ── 1 + 2 + 3: House placement × dignity × retrograde ──────────────────
    for pname in planet_list:
        p   = planets.get(pname, {})
        lon = p.get("lon")
        if lon is None:
            continue
        house   = _get_house_for_lon(float(lon), cusps)
        hw_val  = float(hw.get(house, 0))
        if hw_val == 0:
            continue

        # Essential dignity multiplier (±20-40% change)
        sign    = _sign_norm(str(p.get("sign", "")))
        dignity = _PLANET_DIGNITY.get(pname, {}).get(sign, 0.0)
        dign_mult = 1.0 + dignity * 0.2       # dignity=2.0 → ×1.4; fall=-2.0 → ×0.6

        # Retrograde: in goal-relevant house benefic effect is softened,
        # malefic stress is slightly amplified (planet energy turns inward)
        if p.get("retrograde", False):
            if hw_val > 0:
                hw_val *= 0.70   # good house placement muted when retro
            else:
                hw_val *= 1.15   # bad house placement (e.g. h12 for health) slightly worse

        score += hw_val * dign_mult

    # ── 4: Angular planet effects ───────────────────────────────────────────
    angles = [cusps[0], cusps[3], cusps[6], cusps[9]]   # ASC, IC, DSC, MC
    for pname, pdata in planets.items():
        base_effect = _ANGULAR_EFFECT.get(pname)
        if base_effect is None:
            continue
        lon = pdata.get("lon")
        if lon is None:
            continue

        # Dignity modifier for angular planet
        sign    = _sign_norm(str(pdata.get("sign", "")))
        dignity = _PLANET_DIGNITY.get(pname, {}).get(sign, 0.0)
        effect  = base_effect * (1.0 + dignity * 0.15)

        # Retrograde on angle: malefics more destructive, benefics more introspective
        if pdata.get("retrograde", False):
            effect *= (-1.25 if effect < 0 else 0.75)

        for angle_lon in angles:
            diff = _ang_diff(float(lon), float(angle_lon))
            orb_f = _orb_factor(diff, 5.0)
            if orb_f > 0:
                # Partile bonus: extra weight when within 1°
                partile = 1.4 if diff < 1.0 else 1.0
                score  += effect * orb_f * partile

    # ── 5: Relocated ASC + MC sign quality ─────────────────────────────────
    asc_sign = _sign_norm(str(houses.get("h1",  {}).get("sign", "")))
    mc_sign  = _sign_norm(str(houses.get("h10", {}).get("sign", "")))
    asc_q    = _ASC_SIGN_QUALITY.get(goal, {}).get(asc_sign, 0)
    mc_q     = _MC_SIGN_QUALITY.get(goal, {}).get(mc_sign, 0)
    sign_bonus = asc_q + mc_q   # structural quality, scaled separately below

    # ── 6: Stay-duration factor ─────────────────────────────────────────────
    if stay_days <= 21:
        factor = 0.35
    elif stay_days <= 60:
        factor = 0.65
    elif stay_days <= 180:
        factor = 0.85
    else:
        factor = 1.0

    # Sign bonus activates a bit faster than deep house/angular effects
    sign_factor = min(factor + 0.25, 1.0)
    delta = (score - 50.0) * factor + sign_bonus * sign_factor
    return int(_clamp(50.0 + delta, 8, 96))


def _partner_house_overlay_bonus(
    b_planets: Dict, a_houses: Dict, goal: str
) -> float:
    """Partner's natal planets in A's goal-relevant relocated houses.

    Dignity of the partner's planet modifies its overlay contribution.
    Capped at 10.0 to preserve differentiation across cities.
    """
    cusps = [a_houses.get(f"h{i}", {}).get("lon", i * 30) for i in range(1, 13)]
    hw    = _GOAL_HOUSES.get(goal, _GOAL_HOUSES["overall"])
    bonus = 0.0
    for pname, p in b_planets.items():
        lon = p.get("lon")
        if lon is None:
            continue
        house   = _get_house_for_lon(float(lon), cusps)
        hw_val  = hw.get(house, 0)
        if hw_val == 0:
            continue
        sign    = _sign_norm(str(p.get("sign", "")))
        dignity = _PLANET_DIGNITY.get(pname, {}).get(sign, 0.0)
        bonus  += hw_val * 0.18 * (1.0 + dignity * 0.15)
    return float(_clamp(bonus, -5.0, 10.0))


def _partner_angle_aspect_bonus(b_planets: Dict, a_houses: Dict) -> float:
    """Partner's planets aspecting A's relocated angles (ASC, MC, DSC, IC).

    This is the synastry-in-relocation layer: a partner whose Venus trines
    your relocated ASC amplifies the location's love/beauty energy for the couple;
    a partner's Saturn squaring your relocated MC creates career friction there.

    Major aspects checked (orb 6°):
      Conjunction (0°)  × 1.0
      Trine (120°)      × 0.8
      Sextile (60°)     × 0.5
      Opposition (180°) × -0.5
      Square (90°)      × -0.4
    """
    angles = {
        "ASC": float(a_houses.get("h1",  {}).get("lon", 0)),
        "MC":  float(a_houses.get("h10", {}).get("lon", 0)),
        "DSC": float(a_houses.get("h7",  {}).get("lon", 0)),
        "IC":  float(a_houses.get("h4",  {}).get("lon", 0)),
    }
    # Base positivity of each planet (positive = generally constructive overlay)
    _PLANET_VALENCE: Dict[str, float] = {
        "sun": 2.5, "moon": 2.0, "venus": 4.0, "jupiter": 4.0, "mercury": 1.5,
        "mars": -1.5, "saturn": -3.0, "pluto": -2.5, "uranus": 1.0,
        "neptune": 1.5, "node": 2.0, "chiron": 1.0,
    }
    ASPECTS = {0: 1.0, 60: 0.5, 120: 0.8, 180: -0.5, 90: -0.4}
    MAX_ORB = 6.0

    bonus = 0.0
    for pname, pdata in b_planets.items():
        valence = _PLANET_VALENCE.get(pname, 0.0)
        if valence == 0.0:
            continue
        lon = pdata.get("lon")
        if lon is None:
            continue
        # Dignity adjusts valence
        sign    = _sign_norm(str(pdata.get("sign", "")))
        dignity = _PLANET_DIGNITY.get(pname, {}).get(sign, 0.0)
        v_adj   = valence * (1.0 + dignity * 0.15)

        for angle_name, angle_lon in angles.items():
            diff = _ang_diff(float(lon), angle_lon)
            for asp_deg, asp_mult in ASPECTS.items():
                orb = _ang_diff(diff, float(asp_deg))
                if orb < MAX_ORB:
                    orb_f  = _orb_factor(orb, MAX_ORB)
                    # MC/ASC carry more weight for most goals than IC/DSC
                    a_wt   = 1.2 if angle_name in ("ASC", "MC") else 0.8
                    bonus += v_adj * asp_mult * orb_f * a_wt * 0.35

    return float(_clamp(bonus, -8.0, 10.0))


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
    angle_bonus   = _partner_angle_aspect_bonus(rel_b_planets, rel_a_houses)

    # Synastry: global compatibility level adds flavour but is NOT location-specific.
    # Cap ±4 so it never dominates location-specific scores.
    syn_adj = float(_clamp((syn_pct - 50.0) * 0.07, -4.0, 4.0))

    partner_type_factor = {
        "romantic": 1.10, "business": 0.85, "friend": 0.90,
        "family": 0.90, "mentor": 0.80, "colleague": 0.75,
    }.get(req.partner_type, 1.0)

    # Total partner contribution capped to avoid ceiling saturation.
    # With-partner score = alone + (house overlay + angle aspects) × type_factor + synastry
    raw_partner = (overlay_bonus + angle_bonus) * partner_type_factor + syn_adj
    with_partner_score = int(_clamp(
        alone_score + float(_clamp(raw_partner, -12.0, 16.0)),
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
    angle_bonus_nat = _partner_angle_aspect_bonus(chart_b.get("planets", {}), rel_a_houses)
    raw_dist = (overlay_natal_b + angle_bonus_nat * 0.7) * 0.55 * partner_type_factor + syn_adj * 0.65
    distance_score = int(_clamp(
        alone_score + float(_clamp(raw_dist, -10.0, 13.0)) + dist_penalty,
        8, 96,
    ))

    # ── Sphere breakdown ──
    SPHERE_GOALS = ["love", "career", "money", "health", "creativity", "spirit", "stability", "social"]
    sphere_alone   = {g: _score_by_goal(rel_a_planets, rel_a_houses, g, req.stay_days)
                      for g in SPHERE_GOALS}
    sphere_with    = {}
    sphere_dist    = {}
    g_syn_adj = float(_clamp((syn_pct - 50.0) * 0.07, -4.0, 4.0))
    # Angle bonus is goal-agnostic (applies equally to all spheres); use shared value
    for g in SPHERE_GOALS:
        ov_b_rel  = _partner_house_overlay_bonus(rel_b_planets, rel_a_houses, g)
        ov_b_nat  = _partner_house_overlay_bonus(chart_b.get("planets", {}), rel_a_houses, g)
        rw = float(_clamp((ov_b_rel + angle_bonus) * partner_type_factor + g_syn_adj, -10.0, 15.0))
        rd = float(_clamp((ov_b_nat + angle_bonus_nat * 0.7) * 0.55 * partner_type_factor + g_syn_adj * 0.65, -8.0, 12.0))
        sphere_with[g] = int(_clamp(sphere_alone[g] + rw, 8, 96))
        sphere_dist[g] = int(_clamp(sphere_alone[g] + rd + dist_penalty * 0.6, 8, 96))

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
            "swiss_ephemeris": _SE_OK,
        },
        "ephemeris_accuracy": (
            "high — Swiss Ephemeris (pyswisseph), precision < 1\""
            if _SE_OK else
            "low — built-in VSOP87/Meeus (~1-5′). "
            "Install pyswisseph>=2.10.3 for professional accuracy."
        ),
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
# ASTEROIDS & LILITH EXTENDED
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/natal/asteroids")
def natal_asteroids(req: BirthData):
    """Return asteroid positions for a natal chart: Ceres, Pallas, Juno, Vesta, Eros, Psyche."""
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        asteroids = calc_asteroids(natal_jd)
        available = {k: v for k, v in asteroids.items() if v is not None}
        unavailable = [k for k, v in asteroids.items() if v is None]

        _ASTEROID_MEANINGS = {
            "ceres":   {"name_ru": "Церера",  "keyword": "Питание, материнство, циклы потерь и обретения"},
            "pallas":  {"name_ru": "Паллада", "keyword": "Стратегия, мудрость Афины, паттерны"},
            "juno":    {"name_ru": "Юнона",   "keyword": "Партнёрство, тип идеального союза"},
            "vesta":   {"name_ru": "Веста",   "keyword": "Посвящение, священный огонь, сосредоточенность"},
            "eros":    {"name_ru": "Эрос",    "keyword": "Эротическое влечение, страстное желание"},
            "psyche":  {"name_ru": "Психея",  "keyword": "Душа, трансформация через испытания"},
        }
        enriched = {}
        for name, data in available.items():
            enriched[name] = {**data, **_ASTEROID_MEANINGS.get(name, {})}
        return _present({
            "date": req.date,
            "time": req.time,
            "lat": req.lat, "lon": req.lon,
            "asteroids": enriched,
            "unavailable": unavailable,
            "note": "Numbered asteroids (Eros, Psyche) require seas_18.se1 ephemeris file." if unavailable else "",
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/natal/lilith-extended")
def natal_lilith_extended(req: BirthData):
    """Return all three Lilith types: Mean, True/Oscillating, Interpolated."""
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        liliths = calc_lilith_extended(natal_jd)
        _DESCRIPTIONS = {
            "mean":         "Средняя Лилит (Mean BML) — плавное движение ~9 лет. Карма, тень, вытесненные желания.",
            "true":         "Истинная Лилит (Oscillating) — точное положение апогея. Более резкая, дикая энергия.",
            "interpolated": "Интерполированная Лилит (Дитер Кох) — среднее между Mean и True. Балансирует обе.",
        }
        result = {}
        for ltype, data in liliths.items():
            result[ltype] = {**data, "description": _DESCRIPTIONS.get(ltype, "")}
        return _present({
            "date": req.date,
            "time": req.time,
            "lat": req.lat, "lon": req.lon,
            "lilith": result,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═════════════════════════════════════════════════════════════════════════════
# NUMEROLOGY / KABBALAH
# ═════════════════════════════════════════════════════════════════════════════

class NumerologyRequest(BaseModel):
    date:         str           # YYYY-MM-DD (birth date)
    name:         str = ""      # Full name for Kabbalah number
    current_year: Optional[int] = None
    natal_chart:  Optional[dict] = None  # If provided, adds Tree of Life mapping

try:
    from astro_numerology import numerology_profile as _numerology_profile
    _NUMEROLOGY_OK = True
except Exception as _num_err:
    _NUMEROLOGY_OK = False
    _numerology_profile = None  # type: ignore

@app.post("/numerology/profile")
def numerology_profile_endpoint(req: NumerologyRequest):
    """
    Full numerology & Kabbalah profile:
    Life Path, Personal Year, Tikkun (72 angels), Kabbalah Number, Tree of Life.
    """
    if not _NUMEROLOGY_OK:
        raise HTTPException(status_code=503, detail="Numerology module unavailable")
    try:
        profile = _numerology_profile(
            date_str=req.date,
            name=req.name,
            current_year=req.current_year,
            natal_chart=req.natal_chart,
        )
        return _present(profile)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/kabbalah/tree-mapping")
def kabbalah_tree_mapping(req: BirthData):
    """
    Standalone Tree of Life mapping.
    Computes natal chart and maps planets → Sephiroth.
    Returns: active/vacant Sephiroth, pillar balance (left/middle/right),
    dominant pillar, Tree visualization data.
    """
    if not _NUMEROLOGY_OK:
        raise HTTPException(status_code=503, detail="Numerology module unavailable")
    try:
        from astro_numerology import tree_of_life_profile as _tree_profile
        yr, mo, dy = _parse_date(req.date)
        h,  mi, sc = _parse_time(req.time)
        chart = calc_chart(
            yr, mo, dy, h, mi, sc, req.lat, req.lon, req.utc,
            include_aspects=False, include_patterns=False,
            include_dignities=False, include_arabic=False,
            include_fixed_stars=False, include_sect=False,
        )
        # Build planets_raw for tree profile (must be wrapped in {"planets": ...})
        planets_raw = {}
        for pname, pdata in chart.get("planets", {}).items():
            lon = pdata["lon"] if isinstance(pdata, dict) else pdata
            planets_raw[pname] = {"lon": lon, "longitude": lon, "sign": sign_name(lon)}
        raw = _tree_profile({"planets": planets_raw})

        # Normalise to a frontend-friendly format
        SEPH_NAMES_RU = {
            "kether": "Кетер", "chokmah": "Хокма", "binah": "Бина",
            "chesed": "Хесед", "geburah": "Гебура", "tiphareth": "Тиферет",
            "netzach": "Нецах", "hod": "Ход", "yesod": "Йесод", "malkuth": "Малхут",
        }
        SEPH_NUMBERS = {
            "kether": 1, "chokmah": 2, "binah": 3, "chesed": 4, "geburah": 5,
            "tiphareth": 6, "netzach": 7, "hod": 8, "yesod": 9, "malkuth": 10,
        }
        SEPH_PILLARS = {
            "kether": "middle", "chokmah": "right", "binah": "left",
            "chesed": "right", "geburah": "left", "tiphareth": "middle",
            "netzach": "right", "hod": "left", "yesod": "middle", "malkuth": "middle",
        }
        active_list = [
            {
                "number": v.get("number", SEPH_NUMBERS.get(k, 0)),
                "name": SEPH_NAMES_RU.get(k, k),
                "planet": v.get("planet", ""),
                "sign": v.get("sign", ""),
                "pillar": v.get("pillar", SEPH_PILLARS.get(k, "middle")),
            }
            for k, v in raw.get("active_sephiroth", {}).items()
        ]
        vacant_list = [
            {
                "number": SEPH_NUMBERS.get(k, 0),
                "name": SEPH_NAMES_RU.get(k, k),
                "pillar": SEPH_PILLARS.get(k, "middle"),
            }
            for k in raw.get("vacant_sephiroth", [])
        ]
        planet_sephirah: dict = {}
        for k, v in raw.get("active_sephiroth", {}).items():
            planet_name = v.get("planet", "")
            if planet_name:
                planet_sephirah[planet_name] = {
                    "sephirah": v.get("sephirah", SEPH_NAMES_RU.get(k, k)),
                    "number": v.get("number", SEPH_NUMBERS.get(k, 0)),
                }
        pc = raw.get("pillar_counts", {})
        tree = {
            "active_sephiroth": active_list,
            "vacant_sephiroth": vacant_list,
            "pillar_balance": {
                "left": pc.get("left", 0),
                "middle": pc.get("middle", 0),
                "right": pc.get("right", 0),
            },
            "dominant_pillar": raw.get("dominant_pillar", "middle"),
            "balance_comment": raw.get("balance_comment", ""),
            "planet_sephirah": planet_sephirah,
        }
        return _present({
            "type": "tree_of_life",
            "date": req.date,
            "tree": tree,
            "metadata": chart.get("metadata", {}),
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/kabbalah/72-angels")
def kabbalah_72_angels(req: BirthData):
    """
    Full 72 Angels of the Shemhamphorash for a natal chart.

    Maps each natal planet to its governing Shem angel (every 5° = one angel).
    Returns angel name (Hebrew + transliteration), ruling decan planet,
    corresponding Tarot pip card, and soul theme.
    Also returns Tikkun angel (from birth date digit sum).
    """
    if not _NUMEROLOGY_OK:
        raise HTTPException(status_code=503, detail="Numerology module unavailable")
    try:
        from astro_numerology import calc_natal_angels as _cna, tikkun_number as _tik
        yr, mo, dy = _parse_date(req.date)
        h,  mi, sc = _parse_time(req.time)
        chart = calc_chart(
            yr, mo, dy, h, mi, sc, req.lat, req.lon, req.utc,
            include_aspects=False, include_patterns=False,
            include_dignities=False, include_arabic=False,
            include_fixed_stars=False, include_sect=False,
        )
        planets_wrapped = {}
        for pname, pdata in chart.get("planets", {}).items():
            lon = pdata["lon"] if isinstance(pdata, dict) else pdata
            planets_wrapped[pname] = {"lon": lon, "sign": sign_name(lon)}

        natal_angels = _cna({"planets": planets_wrapped})
        tikkun       = _tik(req.date)

        return _present({
            "date":          req.date,
            "natal_angels":  natal_angels,
            "tikkun_angel":  tikkun,
            "note": (
                "Каждые 5° эклиптики управляются одним из 72 Ангелов Шем (Шемхамфораш). "
                "Натальный ангел планеты указывает архетипический канал её выражения. "
                "Ангел Тиккуна (из даты рождения) — душевная миссия коррекции."
            ),
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/kabbalah/four-worlds")
def kabbalah_four_worlds(req: BirthData):
    """
    Four Worlds of Kabbalah (Arba Olamot) analysis of a natal chart.

    Maps planets → Sephiroth → World (Atziluth / Briah / Yetzirah / Assiah).
    Returns: world balance, dominant world, planets-by-world,
    world descriptions (element, soul level, key questions, practice),
    and interpretive narrative.
    """
    if not _NUMEROLOGY_OK:
        raise HTTPException(status_code=503, detail="Numerology module unavailable")
    try:
        from astro_numerology import four_worlds_profile as _fwp
        yr, mo, dy = _parse_date(req.date)
        h,  mi, sc = _parse_time(req.time)
        chart = calc_chart(
            yr, mo, dy, h, mi, sc, req.lat, req.lon, req.utc,
            include_aspects=False, include_patterns=False,
            include_dignities=False, include_arabic=False,
            include_fixed_stars=False, include_sect=False,
        )
        planets_wrapped = {}
        for pname, pdata in chart.get("planets", {}).items():
            lon = pdata["lon"] if isinstance(pdata, dict) else pdata
            planets_wrapped[pname] = {"lon": lon, "sign": sign_name(lon)}

        result = _fwp({"planets": planets_wrapped})
        result["date"]     = req.date
        result["metadata"] = chart.get("metadata", {})
        return _present(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ═════════════════════════════════════════════════════════════════════════════

class PlanetaryHoursRequest(BaseModel):
    date: str           # YYYY-MM-DD
    lat:  float
    lon:  float
    utc:  float

@app.post("/planetary-hours")
def get_planetary_hours(req: PlanetaryHoursRequest):
    """
    Calculate all 24 planetary hours for a given date and location.
    Day hours = sunrise to sunset divided by 12.
    Night hours = sunset to next sunrise divided by 12.
    """
    try:
        result = planetary_hours(req.date, req.lat, req.lon, req.utc)
        return _present(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/planetary-hours/today")
def get_planetary_hours_today(lat: float, lon: float, utc: float):
    """Shortcut: planetary hours for today."""
    from datetime import date
    today = date.today().isoformat()
    try:
        result = planetary_hours(today, lat, lon, utc)
        return _present(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═════════════════════════════════════════════════════════════════════════════
# SIDEREAL / TROPICAL SWITCH
# ═════════════════════════════════════════════════════════════════════════════

class SiderealRequest(BaseModel):
    date:    str    # YYYY-MM-DD
    time:    str    # HH:MM
    lat:     float
    lon:     float
    utc:     float
    system:  str = "lahiri"   # lahiri | raman | fagan_bradley | krishnamurti | ...

@app.post("/natal/sidereal")
def natal_sidereal(req: SiderealRequest):
    """
    Return natal chart in sidereal zodiac using the selected ayanamsa system.
    Includes both tropical and sidereal positions for comparison.
    """
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        sidereal = calc_sidereal_chart(natal_jd, req.system)
        ayan = ayanamsa(natal_jd, req.system)
        return _present({
            "date":    req.date,
            "time":    req.time,
            "lat":     req.lat,
            "lon":     req.lon,
            "system":  req.system,
            "ayanamsa_deg": round(ayan, 4),
            "ayanamsa_str": f"{int(ayan)}°{int((ayan%1)*60):02d}'",
            "planets": sidereal,
            "available_systems": list_ayanamsa_systems(),
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/natal/sidereal/systems")
def sidereal_systems():
    """List all available ayanamsa systems."""
    return {"systems": list_ayanamsa_systems()}


# ═════════════════════════════════════════════════════════════════════════════
# ZODIACAL RELEASING
# ═════════════════════════════════════════════════════════════════════════════

class ZodiacalReleasingRequest(BaseModel):
    date:    str
    time:    str
    lat:     float
    lon:     float
    utc:     float
    target_date:   str
    lot:           str = "fortune"   # "fortune" | "spirit"
    houses:        str = "placidus"
    lookahead_years: int = 10

@app.post("/predictive/zodiacal-releasing")
def zodiacal_releasing_endpoint(req: ZodiacalReleasingRequest):
    """
    Zodiacal Releasing (Vettius Valens) — major and sub-periods from Lot of Fortune or Spirit.
    Identifies current period, upcoming periods, and Loosing of the Bond dates.
    """
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        result = zodiacal_releasing(
            natal_jd, req.target_date, req.lat, req.lon,
            lot=req.lot, houses_system=req.houses,
            lookahead_years=req.lookahead_years,
        )
        return _present(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═════════════════════════════════════════════════════════════════════════════
# PRIMARY DIRECTIONS
# ═════════════════════════════════════════════════════════════════════════════

class PrimaryDirectionsRequest(BaseModel):
    date:    str
    time:    str
    lat:     float
    lon:     float
    utc:     float
    target_date: str
    houses:  str = "placidus"
    key:     str = "naibod"   # "ptolemy" | "naibod"
    orb:     float = 1.5

@app.post("/predictive/primary-directions")
def primary_directions_endpoint(req: PrimaryDirectionsRequest):
    """
    Primary Directions (Ptolemy/Placidus semi-arc method).
    Naibod key: 0.9856° RA per year. Ptolemy key: 1° RA per year.
    Returns directed planets and aspects to natal points within orb.
    """
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        result = primary_directions(
            natal_jd, req.lat, req.lon, req.target_date,
            houses_system=req.houses, key=req.key, orb=req.orb,
        )
        return _present(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═════════════════════════════════════════════════════════════════════════════
# PROBABILITY MODEL (Seth/Monroe/Castaneda)
# ═════════════════════════════════════════════════════════════════════════════

try:
    from astro_probability import probability_tree as _probability_tree, assembly_point_index as _api_index
    _PROBABILITY_OK = True
except Exception as _prob_err:
    _PROBABILITY_OK = False
    _probability_tree = None  # type: ignore
    _api_index = None          # type: ignore

try:
    from astro_gene_keys import calc_gene_keys_profile as _calc_gk
    _GENE_KEYS_OK = True
except Exception as _gk_err:
    _GENE_KEYS_OK = False
    _calc_gk = None  # type: ignore

class ProbabilityRequest(BaseModel):
    date:        str
    time:        str
    lat:         float
    lon:         float
    utc:         float
    target_date: str
    context:     str = ""

@app.post("/predictive/probability-tree")
def probability_tree_endpoint(req: ProbabilityRequest):
    """
    Seth-style probability tree for all active transits.
    Calculates Assembly Point Index (Tonal/Nagual balance),
    probability branches per transit, dominant life spheres, recommendations.
    """
    if not _PROBABILITY_OK:
        raise HTTPException(status_code=503, detail="Probability module unavailable")
    try:
        natal_jd = _to_jd(req.date, req.time, req.utc)
        natal_chart = calc_chart(
            *[int(x) for x in req.date.split("-")],
            *[int(x) for x in req.time.replace(":", " ").split()[:2]], 0,
            req.lat, req.lon, req.utc,
            include_aspects=False, include_patterns=False,
            include_dignities=True, include_arabic=False,
        )
        # Get active transits
        transit_data = transits(
            natal_jd, req.target_date, lat=req.lat, lon=req.lon,
            transit_orb_major=3.0, transit_orb_minor=2.0,
        )
        transit_aspects = transit_data.get("transit_aspects", [])
        result = _probability_tree(natal_chart, transit_aspects,
                                   target_date=req.target_date, context=req.context)
        return _present(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═════════════════════════════════════════════════════════════════════════════
# GENE KEYS
# ═════════════════════════════════════════════════════════════════════════════

class GeneKeysRequest(BaseModel):
    date: str
    time: str
    lat:  float
    lon:  float
    utc:  float
    name: str = ""

@app.post("/gene-keys/profile")
def gene_keys_profile(req: GeneKeysRequest):
    """
    Gene Keys Golden Path profile (3 sequences):
    - Activation Sequence (4 spheres): Life's Work, Evolution, Radiance, Purpose
    - Venus Sequence (6 spheres): Core Wound, IQ, EQ, SQ, Vocation, Culture
    - Pearl Sequence (3 spheres): Brand, Pearl, Prosperity
    Uses the I Ching 64-hexagram mandala (same as Human Design).
    Shadow → Gift → Siddhi triad for each sphere.
    """
    if not _GENE_KEYS_OK:
        raise HTTPException(status_code=503, detail="Gene Keys module unavailable")
    try:
        result = _calc_gk(req.date, req.time, req.lat, req.lon, req.utc, name=req.name)
        return _present(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═════════════════════════════════════════════════════════════════════════════
# REPORT GENERATOR (HTML/PDF)
# ═════════════════════════════════════════════════════════════════════════════

class ReportRequest(BaseModel):
    date:        str
    time:        str
    lat:         float
    lon:         float
    utc:         float
    name:        str = ""
    target_date: Optional[str] = None
    depth:       str = "full"   # "brief" | "full" | "professional"
    format:      str = "html"   # "html" | "json"
    include: list = []  # ["natal","transits","firdaria","profections","numerology","probability"]

@app.post("/report/generate")
def generate_report(req: ReportRequest):
    """
    Generate a comprehensive astrological report.
    Aggregates ALL available engines: natal, aspects, chart-analysis, transits,
    firdaria, profections, solar-arc, numerology, kabbalah, jyotish, human-design,
    probability tree.
    Returns HTML (printable as PDF via browser) or JSON.
    """
    try:
        import datetime as _dt
        natal_jd = _to_jd(req.date, req.time, req.utc)
        yr, mo, dy = [int(x) for x in req.date.split("-")]
        h, mi = [int(x) for x in req.time.split(":")[:2]]
        target = req.target_date or _dt.date.today().isoformat()

        report_data: dict = {
            "name": req.name or "Без имени",
            "birth_date": req.date,
            "birth_time": req.time,
            "lat": req.lat,
            "lon": req.lon,
            "target_date": target,
            "depth": req.depth,
        }

        # Sections based on depth (always include everything unless caller restricts)
        _all = ["natal", "transits", "firdaria", "profections",
                "numerology", "jyotish", "human-design",
                "solar-arc", "probability", "compensatory"]
        sections = req.include or (
            ["natal", "transits", "profections", "numerology"]  if req.depth == "brief" else
            _all  # full + professional both include everything
        )

        # ── Natal chart ───────────────────────────────────────────────────────
        if "natal" in sections:
            chart = calc_chart(
                yr, mo, dy, h, mi, 0, req.lat, req.lon, req.utc,
                include_aspects=True, include_patterns=True,
                include_dignities=True, include_arabic=True,
                include_fixed_stars=True, include_sect=True,
            )
            # Chart analysis: shape, elements, modalities, unaspected
            try:
                from astro_engine import calc_chart_analysis as _cca
                pl_lons = {k: v["lon"] for k, v in chart.get("planets", {}).items()
                           if isinstance(v, dict) and "lon" in v}
                chart["chart_analysis"] = _cca(pl_lons, chart.get("aspects", []))
            except Exception:
                pass
            report_data["natal"] = chart

        # ── Transits ─────────────────────────────────────────────────────────
        if "transits" in sections:
            try:
                report_data["transits"] = transits(
                    natal_jd, target, lat=req.lat, lon=req.lon,
                    transit_orb_major=2.0, transit_orb_minor=1.0,
                )
            except Exception:
                report_data["transits"] = {}

        # ── Firdaria ─────────────────────────────────────────────────────────
        if "firdaria" in sections:
            try:
                report_data["firdaria"] = firdaria(natal_jd, target)
            except Exception:
                report_data["firdaria"] = {}

        # ── Profections ──────────────────────────────────────────────────────
        if "profections" in sections:
            try:
                report_data["profections"] = profections(natal_jd, target, lat=req.lat, lon=req.lon)
            except Exception:
                report_data["profections"] = {}

        # ── Solar arc ────────────────────────────────────────────────────────
        if "solar-arc" in sections:
            try:
                report_data["solar_arc"] = solar_arc(natal_jd, req.lat, req.lon, target)
            except Exception:
                report_data["solar_arc"] = {}

        # ── Solar Return ─────────────────────────────────────────────────────
        if req.depth in ("full", "professional") and "natal" in sections:
            try:
                report_data["solar_return"] = solar_return(natal_jd, req.lat, req.lon, target)
            except Exception:
                report_data["solar_return"] = {}

        # ── Numerology + Kabbalah ─────────────────────────────────────────────
        if "numerology" in sections and _NUMEROLOGY_OK:
            try:
                from astro_numerology import (
                    numerology_profile as _np,
                    four_worlds_profile as _fwp,
                    calc_natal_angels as _cna,
                    tikkun_number as _tkn,
                )
                natal_for_num = report_data.get("natal") or {}
                report_data["numerology"] = _np(req.date, req.name, int(target[:4]), natal_for_num)
                if natal_for_num:
                    try:
                        report_data["four_worlds"] = _fwp(natal_for_num)
                    except Exception:
                        pass
                    try:
                        report_data["natal_angels"] = _cna(natal_for_num)
                    except Exception:
                        pass
            except Exception:
                pass

        # ── Jyotish ──────────────────────────────────────────────────────────
        if "jyotish" in sections and _JYOTISH_OK and _calc_jyotish is not None:
            try:
                report_data["jyotish"] = _calc_jyotish(req.date, req.time, req.lat, req.lon, req.utc)
            except Exception:
                report_data["jyotish"] = {}

        # ── Human Design ─────────────────────────────────────────────────────
        if "human-design" in sections and _HUMAN_DESIGN_OK and calc_human_design is not None:
            try:
                report_data["human_design"] = calc_human_design(
                    req.date, req.time, req.lat, req.lon, req.utc, mode="analyst"
                )
            except Exception:
                report_data["human_design"] = {}

        # ── Probability tree ─────────────────────────────────────────────────
        if "probability" in sections and _PROBABILITY_OK:
            try:
                natal_for_prob = report_data.get("natal") or {}
                transit_aspects = report_data.get("transits", {}).get("transit_aspects", [])
                report_data["probability"] = _probability_tree(natal_for_prob, transit_aspects, target)
            except Exception:
                report_data["probability"] = {}

        if req.format == "json":
            return _present(report_data)

        # Build HTML report
        html = _build_html_report(report_data, req.depth)
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html, status_code=200)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _build_html_report(data: dict, depth: str) -> str:  # noqa: C901
    """Build a printable HTML report from aggregated report data — all engines."""
    name          = data.get("name", "")
    birth_date    = data.get("birth_date", "")
    birth_time    = data.get("birth_time", "")
    lat           = data.get("lat", 0)
    lon           = data.get("lon", 0)
    target_date   = data.get("target_date", "")
    natal         = data.get("natal", {})
    transits_d    = data.get("transits", {})
    firdaria_d    = data.get("firdaria", {})
    profections_d = data.get("profections", {})
    solar_arc_d   = data.get("solar_arc", {})
    solar_return_d= data.get("solar_return", {})
    numerology    = data.get("numerology", {})
    four_worlds   = data.get("four_worlds", {})
    natal_angels  = data.get("natal_angels", {})
    jyotish       = data.get("jyotish", {})
    human_design  = data.get("human_design", {})
    probability   = data.get("probability", {})

    _SIGN_GLYPHS = {'aries':'♈','taurus':'♉','gemini':'♊','cancer':'♋','leo':'♌','virgo':'♍',
                    'libra':'♎','scorpio':'♏','sagittarius':'♐','capricorn':'♑','aquarius':'♒','pisces':'♓'}
    _PLANET_GLYPHS = {'sun':'☉','moon':'☽','mercury':'☿','venus':'♀','mars':'♂',
                      'jupiter':'♃','saturn':'♄','uranus':'♅','neptune':'♆','pluto':'♇',
                      'node':'☊','lilith':'⚸','chiron':'⚷'}
    _PLANET_RU = {'sun':'Солнце','moon':'Луна','mercury':'Меркурий','venus':'Венера',
                  'mars':'Марс','jupiter':'Юпитер','saturn':'Сатурн','uranus':'Уран',
                  'neptune':'Нептун','pluto':'Плутон','node':'Сев. Узел',
                  'lilith':'Лилит','chiron':'Хирон'}
    _SIGN_RU = {'aries':'Овен','taurus':'Телец','gemini':'Близнецы','cancer':'Рак',
                'leo':'Лев','virgo':'Дева','libra':'Весы','scorpio':'Скорпион',
                'sagittarius':'Стрелец','capricorn':'Козерог','aquarius':'Водолей','pisces':'Рыбы'}
    _ASP_GLYPHS = {'conjunction':'☌','opposition':'☍','trine':'△','square':'□',
                   'sextile':'⚹','quincunx':'⚻','semisquare':'∠','sesquiquadrate':'⊼',
                   'semisextile':'⌖','quintile':'Q'}

    # ── helpers ──────────────────────────────────────────────────────────────
    def _esc(s): return str(s).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')

    def _planet_row(pname, pdata):
        sign  = pdata.get('sign','')
        dm    = pdata.get('deg_min','')
        ret   = ' ℞' if pdata.get('retrograde') else ''
        house = pdata.get('house', '')
        dig   = pdata.get('dignity', '')
        g     = _PLANET_GLYPHS.get(pname,'●')
        sg    = _SIGN_GLYPHS.get(sign,'')
        pru   = _PLANET_RU.get(pname, pname)
        sru   = _SIGN_RU.get(sign, sign)
        h_str = f" · дом {house}" if house else ''
        d_str = f" · <em>{_esc(dig)}</em>" if dig else ''
        return f"<tr><td>{g} {_esc(pru)}</td><td>{sg} {_esc(sru)} {_esc(dm)}{ret}</td><td>{h_str}{d_str}</td></tr>"

    # ── SECTION 1: Натальная карта ───────────────────────────────────────────
    planets_html = ""
    for pname, pdata in natal.get("planets", {}).items():
        if isinstance(pdata, dict):
            planets_html += _planet_row(pname, pdata)

    # Houses
    houses_html = ""
    for hnum, hdata in natal.get("houses", {}).items():
        if not isinstance(hdata, dict):
            continue
        sign = hdata.get('sign','')
        dm   = hdata.get('deg_min','')
        sg   = _SIGN_GLYPHS.get(sign,'')
        sru  = _SIGN_RU.get(sign, sign)
        houses_html += f"<tr><td>{hnum}</td><td>{sg} {_esc(sru)} {_esc(dm)}</td></tr>"

    # Natal aspects (major only, sorted by orb)
    aspects_html = ""
    _major = {'conjunction','opposition','trine','square','sextile'}
    for asp in sorted(natal.get("aspects",[]), key=lambda x: x.get("orb",99)):
        if asp.get("aspect","") not in _major:
            continue
        p1 = asp.get("planet1",""); p2 = asp.get("planet2",""); a = asp.get("aspect","")
        o  = asp.get("orb",0); ag = _ASP_GLYPHS.get(a,'')
        g1 = _PLANET_GLYPHS.get(p1,''); g2 = _PLANET_GLYPHS.get(p2,'')
        ru1 = _PLANET_RU.get(p1,p1); ru2 = _PLANET_RU.get(p2,p2)
        aspects_html += f"<tr><td>{g1} {_esc(ru1)}</td><td>{ag} {_esc(a)}</td><td>{g2} {_esc(ru2)}</td><td>{o:.1f}°</td></tr>"

    # Chart analysis
    ca = natal.get("chart_analysis", {})
    ca_html = ""
    if ca:
        shape = ca.get("chart_shape", {})
        shape_name = shape.get("shape","") if isinstance(shape, dict) else str(shape)
        el = ca.get("elements", {})
        mo = ca.get("modalities", {})
        un = ca.get("unaspected", [])
        el_str = " · ".join(f"{k}: {v}" for k,v in el.items()) if isinstance(el, dict) else str(el)
        mo_str = " · ".join(f"{k}: {v}" for k,v in mo.items()) if isinstance(mo, dict) else str(mo)
        un_str = ", ".join(str(u) for u in un) if un else "—"
        ca_html = f"""
        <p><strong>Форма карты:</strong> {_esc(shape_name)}</p>
        <p><strong>Стихии:</strong> {_esc(el_str)}</p>
        <p><strong>Модальности:</strong> {_esc(mo_str)}</p>
        <p><strong>Неаспектированные:</strong> {_esc(un_str)}</p>
        """

    # ── SECTION 2: Транзиты ──────────────────────────────────────────────────
    transits_html = ""
    for asp in sorted((transits_d.get("transit_aspects") or []), key=lambda x: x.get("orb",99))[:25]:
        tp  = asp.get("transiting_planet","")
        np  = asp.get("natal_planet","")
        a   = asp.get("aspect",""); o = asp.get("orb",0)
        applying = "→" if asp.get("applying") else "←"
        ag  = _ASP_GLYPHS.get(a,'')
        tg  = _PLANET_GLYPHS.get(tp,''); ng = _PLANET_GLYPHS.get(np,'')
        transits_html += (f"<tr><td>{tg} {_esc(_PLANET_RU.get(tp,tp))}</td>"
                          f"<td>{ag} {_esc(a)}</td>"
                          f"<td>{ng} {_esc(_PLANET_RU.get(np,np))}</td>"
                          f"<td>{o:.2f}° {applying}</td></tr>")

    # ── SECTION 3: Фирдарии ──────────────────────────────────────────────────
    firdaria_html = ""
    if firdaria_d:
        cp = firdaria_d.get("current_period",{})
        cs = firdaria_d.get("current_sub",{})
        pg = _PLANET_GLYPHS.get(cp.get("planet",""),'')
        sg2 = _PLANET_GLYPHS.get(cs.get("planet",""),'')
        p_ru = _PLANET_RU.get(cp.get('planet',''), cp.get('planet',''))
        s_ru = _PLANET_RU.get(cs.get('planet',''), cs.get('planet',''))
        ps = cp.get('start',''); pe = cp.get('end','')
        ss = cs.get('start',''); se = cs.get('end','')
        firdaria_html = f"""
        <p><strong>Главный период:</strong> {pg} {_esc(p_ru)} ({_esc(ps)} — {_esc(pe)})</p>
        <p><strong>Субпериод:</strong> {sg2} {_esc(s_ru)} ({_esc(ss)} — {_esc(se)})</p>
        """

    # ── SECTION 4: Профекции ─────────────────────────────────────────────────
    prof_html = ""
    if profections_d:
        yr_lord = profections_d.get("year_lord","")
        act_house = profections_d.get("active_house","")
        theme = profections_d.get("theme","")
        age = profections_d.get("age","")
        prof_html = f"""
        <p><strong>Возраст:</strong> {_esc(str(age))}</p>
        <p><strong>Активный дом:</strong> {_esc(str(act_house))}</p>
        <p><strong>Лорд года:</strong> {_PLANET_GLYPHS.get(str(yr_lord).lower(),'')} {_esc(str(yr_lord))}</p>
        <p><strong>Тема года:</strong> {_esc(str(theme))}</p>
        """

    # ── SECTION 5: Соляр ────────────────────────────────────────────────────
    sr_html = ""
    if solar_return_d:
        sr_date = solar_return_d.get("date", solar_return_d.get("return_date",""))
        sr_sun  = solar_return_d.get("sun_lon","")
        sr_asc  = solar_return_d.get("ascendant","")
        sr_html = f"""
        <p><strong>Дата соляра:</strong> {_esc(str(sr_date))}</p>
        <p><strong>Асцендент соляра:</strong> {_esc(str(sr_asc))}</p>
        <p><strong>Солнце:</strong> {_esc(str(sr_sun))}</p>
        """

    # ── SECTION 6: Нумерология & Каббала ────────────────────────────────────
    num_html = ""
    if numerology:
        lp = numerology.get("life_path", {})
        py = numerology.get("personal_year", {})
        tk = numerology.get("tikkun", {})
        ex = numerology.get("expression", {})
        su = numerology.get("soul_urge", {})
        mc = numerology.get("maturity_cycle", {})
        num_html = f"""
        <table>
          <tr><th>Число</th><th>Значение</th><th>Смысл</th></tr>
          <tr><td>Путь Жизни</td><td><strong>{_esc(str(lp.get('number','')))}</strong></td><td>{_esc(str(lp.get('meaning','')))}</td></tr>
          {'<tr><td>Выражение</td><td><strong>' + _esc(str(ex.get('number',''))) + '</strong></td><td>' + _esc(str(ex.get('meaning',''))) + '</td></tr>' if ex else ''}
          {'<tr><td>Зов Души</td><td><strong>' + _esc(str(su.get('number',''))) + '</strong></td><td>' + _esc(str(su.get('meaning',''))) + '</td></tr>' if su else ''}
          <tr><td>Личный год {_esc(str(py.get('current_year','')))} </td><td><strong>{_esc(str(py.get('personal_year','')))}</strong></td><td>{_esc(str(py.get('theme','')))}</td></tr>
          {'<tr><td>Цикл зрелости</td><td><strong>' + _esc(str(mc.get('number',''))) + '</strong></td><td>' + _esc(str(mc.get('theme',''))) + '</td></tr>' if mc else ''}
          <tr><td>Тиккун</td><td><strong>#{_esc(str(tk.get('tikkun_number','')))}</strong></td><td>Ангел {_esc(str(tk.get('angel','')))}</td></tr>
        </table>
        """

    # Four Worlds
    fw_html = ""
    if four_worlds:
        dom = four_worlds.get("dominant_world","")
        worlds = four_worlds.get("worlds",{})
        fw_rows = ""
        for wname, wdata in (worlds.items() if isinstance(worlds, dict) else []):
            score = wdata.get("score","") if isinstance(wdata, dict) else ""
            desc  = wdata.get("description","") if isinstance(wdata, dict) else str(wdata)
            fw_rows += f"<tr><td>{_esc(wname)}</td><td>{_esc(str(score))}</td><td>{_esc(str(desc)[:120])}</td></tr>"
        fw_html = f"""
        <p><strong>Доминантный мир:</strong> {_esc(str(dom))}</p>
        {'<table><tr><th>Мир</th><th>Балл</th><th>Описание</th></tr>' + fw_rows + '</table>' if fw_rows else ''}
        """

    # Natal angels summary (top 5 by planet)
    angels_html = ""
    if natal_angels:
        ang_rows = ""
        for planet, angel_data in list(natal_angels.items())[:8]:
            if not isinstance(angel_data, dict):
                continue
            aname = angel_data.get("name",""); heb = angel_data.get("heb","")
            theme = angel_data.get("theme",""); tarot = angel_data.get("tarot","")
            g = _PLANET_GLYPHS.get(planet,'')
            pru = _PLANET_RU.get(planet, planet)
            ang_rows += (f"<tr><td>{g} {_esc(pru)}</td>"
                         f"<td>{_esc(aname)} {_esc(heb)}</td>"
                         f"<td>{_esc(str(theme)[:90])}</td>"
                         f"<td>{_esc(str(tarot))}</td></tr>")
        if ang_rows:
            angels_html = f"""<table>
            <tr><th>Планета</th><th>Ангел</th><th>Тема</th><th>Таро</th></tr>
            {ang_rows}</table>"""

    # ── SECTION 7: Джйотиш ──────────────────────────────────────────────────
    jyotish_html = ""
    if jyotish:
        lagna = jyotish.get("lagna","")
        moon_rasi = jyotish.get("moon_rasi","")
        nakshatra = jyotish.get("nakshatra","")
        pada = jyotish.get("pada","")
        dasha_d = jyotish.get("current_dasha",{})
        antardasha_d = jyotish.get("current_antardasha",{})
        yogas = jyotish.get("yogas",[])
        y_rows = "".join(f"<tr><td>{_esc(y.get('name','') if isinstance(y,dict) else str(y))}</td><td>{_esc(y.get('description','') if isinstance(y,dict) else '')}</td></tr>" for y in yogas[:6])
        dasha_planet = dasha_d.get("planet","") if isinstance(dasha_d,dict) else ""
        antardasha_planet = antardasha_d.get("planet","") if isinstance(antardasha_d,dict) else ""
        dasha_end = dasha_d.get("end","") if isinstance(dasha_d,dict) else ""
        jyotish_html = f"""
        <p><strong>Лагна (Асцендент):</strong> {_esc(str(lagna))}</p>
        <p><strong>Луна (Раши):</strong> {_esc(str(moon_rasi))}</p>
        <p><strong>Накшатра:</strong> {_esc(str(nakshatra))} {('пада ' + str(pada)) if pada else ''}</p>
        <p><strong>Текущая Даша:</strong> {_PLANET_GLYPHS.get(str(dasha_planet).lower(),'')} {_esc(str(dasha_planet))} → {_esc(str(antardasha_planet))} (до {_esc(str(dasha_end))})</p>
        {'<table><tr><th>Йога</th><th>Описание</th></tr>' + y_rows + '</table>' if y_rows else ''}
        """

    # ── SECTION 8: Human Design ──────────────────────────────────────────────
    hd_html = ""
    if human_design:
        hd_type    = human_design.get("type","")
        profile    = human_design.get("profile","")
        authority  = human_design.get("authority","")
        cross      = human_design.get("incarnation_cross","")
        strategy   = human_design.get("strategy","")
        defined_centers = human_design.get("defined_centers",[])
        open_centers    = human_design.get("open_centers",[])
        channels   = human_design.get("channels",[])
        gates_list = human_design.get("gates",[])
        def_c_str = ", ".join(str(c) for c in (defined_centers or []))
        open_c_str = ", ".join(str(c) for c in (open_centers or []))
        ch_rows = "".join(
            f"<tr><td>{_esc(str(ch.get('channel','') if isinstance(ch,dict) else ch))}</td>"
            f"<td>{_esc(str(ch.get('name','') if isinstance(ch,dict) else ''))}</td></tr>"
            for ch in (channels or [])[:10]
        )
        hd_html = f"""
        <p><strong>Тип:</strong> {_esc(str(hd_type))}</p>
        <p><strong>Профиль:</strong> {_esc(str(profile))}</p>
        <p><strong>Авторитет:</strong> {_esc(str(authority))}</p>
        <p><strong>Стратегия:</strong> {_esc(str(strategy))}</p>
        <p><strong>Крест воплощения:</strong> {_esc(str(cross))}</p>
        <p><strong>Определённые центры:</strong> {_esc(def_c_str) or '—'}</p>
        <p><strong>Открытые центры:</strong> {_esc(open_c_str) or '—'}</p>
        {'<table><tr><th>Канал</th><th>Название</th></tr>' + ch_rows + '</table>' if ch_rows else ''}
        """

    # ── SECTION 9: Вероятностное дерево ─────────────────────────────────────
    prob_html = ""
    if probability:
        api_d = probability.get("assembly_point",{})
        topics = probability.get("topic_scores",{})
        top_rows = "".join(
            f"<tr><td>{_esc(k)}</td><td>{v}</td></tr>"
            for k,v in sorted((topics.items() if isinstance(topics,dict) else []),
                              key=lambda x: -x[1])[:8]
        )
        prob_html = f"""
        <p><strong>Зона точки сборки:</strong> {_esc(str(api_d.get('zone','')))} 
           (индекс {api_d.get('index',0):+.2f})</p>
        <p>{_esc(str(api_d.get('zone_description','')))}</p>
        <p><strong>Рекомендация:</strong> {_esc(str(api_d.get('recommendation','')))}</p>
        <p>{_esc(str(probability.get('summary','')))}</p>
        {'<table><tr><th>Тема</th><th>Балл</th></tr>' + top_rows + '</table>' if top_rows else ''}
        """


    # ── SECTION 10: Compensatory practices ──────────────────────────────────
    comp_report_html = ""
    if _COMPENSATORY_OK and report_data.get("natal"):
        try:
            transit_aspects_for_comp = report_data.get("transits", {}).get("aspects", [])[:5]
            comp_result = build_compensatory_report(
                natal_chart=report_data["natal"],
                transit_aspects=transit_aspects_for_comp,
                depth=depth,
            )
            report_data["compensatory"] = comp_result
            practices = comp_result.get("practices", [])
            asp_pairs = comp_result.get("aspect_pairs", [])
            rows = "".join(
                f"<tr><td><strong>{_esc(p.get('practice',''))}</strong></td>"
                f"<td>{_esc(p.get('why',''))}</td>"
                f"<td style=\'color:#7a8;font-size:.85em\'>{_esc(p.get('best_time',''))}</td></tr>"
                for p in practices[:6]
            )
            if asp_pairs:
                rows += "<tr><td colspan=3 style=\'padding-top:8px;font-weight:600\'>Аспектные связки:</td></tr>"
                rows += "".join(
                    f"<tr><td>{_esc(ap.get('name',''))}</td>"
                    f"<td colspan=2 style=\'color:#a87\'><em>{_esc(ap.get('image',''))}</em></td></tr>"
                    for ap in asp_pairs[:3]
                )
            comp_report_html = (
                f"<table><tr><th>Практика</th><th>Почему</th><th>Время</th></tr>{rows}</table>"
                if rows else ""
            )
        except Exception:
            pass

    depth_label = {"brief": "Краткий", "full": "Полный", "professional": "Профессиональный"}.get(depth, depth)

    def _section(icon, title, body):
        if not body or not body.strip():
            return ''
        return f'<div class="section"><h2>{icon} {title}</h2>{body}</div>'

    natal_tables = ""
    if planets_html:
        natal_tables += f'<table><tr><th>Планета</th><th>Позиция</th><th>Дом / Достоинство</th></tr>{planets_html}</table>'
    if houses_html:
        natal_tables += f'<details><summary style="cursor:pointer;color:#d4af37;margin:0.5rem 0">▸ Куспиды домов</summary><table><tr><th>Дом</th><th>Позиция</th></tr>{houses_html}</table></details>'
    if aspects_html:
        natal_tables += f'<details><summary style="cursor:pointer;color:#d4af37;margin:0.5rem 0">▸ Главные аспекты</summary><table><tr><th>Планета 1</th><th>Аспект</th><th>Планета 2</th><th>Орб</th></tr>{aspects_html}</table></details>'
    if ca_html:
        natal_tables += f'<div class="sub">{ca_html}</div>'

    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AstroCRM — {depth_label} отчёт — {_esc(name)}</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:'Georgia',serif;background:#0a0a1a;color:#e8d5a3;padding:2rem}}
  .report{{max-width:960px;margin:0 auto}}
  h1{{font-size:1.9rem;color:#ffd700;border-bottom:2px solid #ffd70030;padding-bottom:.6rem;margin-bottom:1.5rem}}
  h2{{font-size:1.05rem;color:#d4af37;margin:.1rem 0 .75rem;border-left:3px solid #d4af37;padding-left:.65rem;letter-spacing:.03em}}
  .meta{{color:#b8a070;font-size:.85rem;margin-bottom:1.5rem;line-height:1.8;
         border:1px solid #ffffff10;border-radius:8px;padding:.75rem 1rem;background:#0f0f2a}}
  table{{width:100%;border-collapse:collapse;margin-bottom:.75rem;font-size:.85rem}}
  th{{background:#1a1a3a;color:#c8a84b;padding:.4rem .7rem;text-align:left;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em}}
  td{{padding:.4rem .7rem;border-bottom:1px solid #ffffff12}}
  .section{{background:#0e0e26;border:1px solid #ffd70018;border-radius:10px;padding:1.1rem 1.25rem;margin-bottom:1.1rem}}
  .sub{{margin-top:.5rem;padding:.5rem .75rem;border-left:2px solid #ffd70030;font-size:.88rem}}
  details summary{{user-select:none}}
  p{{line-height:1.65;margin-bottom:.4rem;font-size:.9rem}}
  .cols2{{display:grid;grid-template-columns:1fr 1fr;gap:1rem}}
  .badge{{display:inline-block;background:#1a1a3a;border-radius:4px;padding:.15rem .45rem;
          font-size:.75rem;color:#c8a84b;margin:.1rem .15rem}}
  @media print{{
    body{{background:#fff;color:#111;padding:1rem}}
    .section{{border:1px solid #ccc;background:#fafafa}}
    h1,h2{{color:#333}}
    th{{background:#f0f0f0;color:#333}}
    table{{border:1px solid #ddd}}
    details{{open:open}}
    details summary{{display:none}}
  }}
</style>
</head>
<body>
<div class="report">
  <h1>✦ AstroCRM — {depth_label} Астрологический Отчёт</h1>
  <div class="meta">
    <strong>{_esc(name)}</strong> &nbsp;·&nbsp;
    Рождение: {_esc(birth_date)} {_esc(birth_time)} UTC{lat:+g} &nbsp;·&nbsp;
    Коорд: {lat:+.2f} / {lon:+.2f} &nbsp;·&nbsp;
    Дата анализа: <strong>{_esc(target_date)}</strong> &nbsp;·&nbsp;
    Глубина: {depth_label}
  </div>

  {_section('☽', 'Натальная карта', natal_tables)}
  {_section('⟳', 'Активные транзиты', ('<table><tr><th>Транзит</th><th>Аспект</th><th>Натальная</th><th>Орб</th></tr>' + transits_html + '</table>') if transits_html else '')}
  {_section('⏳', 'Фирдарии (Персидские периоды)', firdaria_html)}
  {_section('📅', 'Профекции (Годовой лорд)', prof_html)}
  {_section('☀️', 'Соляр (Солнечное возвращение)', sr_html)}
  {_section('🔢', 'Нумерология', num_html)}
  {_section('🌌', 'Четыре Мира Каббалы', fw_html)}
  {_section('👼', '72 Ангела Каббалы', angels_html)}
  {_section('🪐', 'Джйотиш (Ведическая астрология)', jyotish_html)}
  {_section('⬡', 'Human Design', hd_html)}
  {_section('🌀', 'Матрица вероятностей', prob_html)}
  {_section('🛠️', 'Компенсаторные практики', comp_report_html)}

  <div class="meta" style="margin-top:1.5rem;font-size:.72rem;color:#7a6a4a">
    Отчёт сгенерирован AstroCRM ✦ {_esc(target_date)}
  </div>
</div>
</body>
</html>"""


# ─── VOID OF COURSE (multi-window) ───────────────────────────────────────────

class VoCRequest(BaseModel):
    date:       str
    time:       str = "12:00"
    utc:        float = 0
    lat:        float = 0
    lon:        float = 0
    count:      int = 5          # number of VoC windows to return
    look_ahead: float = 30.0     # days to scan total


@app.post("/natal/void-of-course")
def get_voc_windows(req: VoCRequest):
    """Return the current + next N Void-of-Course Moon windows.

    Scans forward up to **look_ahead** days from **date/time** and returns
    up to **count** distinct VoC periods.

    Each window includes start/end JD, duration, void sign, and what ingress ends it.
    """
    try:
        jd_start = _to_jd(req.date, req.time, req.utc)
        windows = []
        scan_jd = jd_start
        step_days = 1.5   # step between successive VoC scans (slightly longer than avg VoC)
        max_jd = jd_start + req.look_ahead

        while len(windows) < req.count and scan_jd < max_jd:
            voc = void_of_course_moon(scan_jd, look_ahead_days=min(3.0, max_jd - scan_jd),
                                      lat=req.lat, lon=req.lon)
            if not voc:
                scan_jd += step_days
                continue

            if voc.get("is_void"):
                void_end_jd = voc.get("void_end_jd") or (scan_jd + 0.5)
                # Avoid duplicate windows: skip if same start as last
                if windows and abs(windows[-1].get("void_start_jd", 0) - (voc.get("void_start_jd") or scan_jd)) < 0.01:
                    scan_jd = void_end_jd + 0.05
                    continue
                windows.append({**voc, "void_start_jd": voc.get("void_start_jd") or scan_jd})
                scan_jd = void_end_jd + 0.05
            else:
                # Not in VoC now; advance to just after next ingress
                void_end_jd = voc.get("void_end_jd") or (scan_jd + step_days)
                scan_jd = void_end_jd + 0.05

        return _present({
            "query_date": req.date,
            "query_time": req.time,
            "utc_offset": req.utc,
            "windows_returned": len(windows),
            "windows": windows,
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ─── DAILY PERSONAL ──────────────────────────────────────────────────────────

class DailyPersonalRequest(BaseModel):
    # Birth data
    date:  str; time: str
    lat:   float; lon: float; utc: float
    # Target date (defaults to today)
    target_date: Optional[str] = None
    target_time: str = "12:00"
    name:  Optional[str] = None


@app.post("/daily/personal")
def daily_personal(req: DailyPersonalRequest):
    """Personalised daily astrology summary.

    Combines:
    - Current Moon sign, phase, and Void-of-Course status
    - Transits to natal chart (top aspects by orb)
    - Profection house for the current year
    - Current Firdaria period
    - Compensatory advice for top 3 transit aspects
    """
    try:
        target = req.target_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        natal_jd  = _to_jd(req.date, req.time, req.utc)
        target_jd = _to_jd(target, req.target_time, req.utc)

        # ── Moon ─────────────────────────────────────────────────────────────
        planets_now = calc_planets(target_jd)
        moon_lon = planets_now.get("moon", 0)
        sun_lon  = planets_now.get("sun",  0)
        phase_angle = (moon_lon - sun_lon) % 360
        if   phase_angle <  45: phase_name = "new_moon"
        elif phase_angle <  90: phase_name = "waxing_crescent"
        elif phase_angle < 135: phase_name = "first_quarter"
        elif phase_angle < 180: phase_name = "waxing_gibbous"
        elif phase_angle < 225: phase_name = "full_moon"
        elif phase_angle < 270: phase_name = "waning_gibbous"
        elif phase_angle < 315: phase_name = "last_quarter"
        else:                   phase_name = "waning_crescent"

        voc = void_of_course_moon(target_jd, look_ahead_days=3.0,
                                  lat=req.lat, lon=req.lon)

        moon_info = {
            "sign":        sign_name(moon_lon),
            "degree":      round(moon_lon % 30, 2),
            "phase":       phase_name,
            "phase_angle": round(phase_angle, 2),
            "void_of_course": voc,
        }

        # ── Transits to natal ─────────────────────────────────────────────────
        try:
            from astro_predictive import transits as calc_transits
            transit_result = calc_transits(natal_jd, target,
                                           req.lat, req.lon, req.utc)
            top_transits = sorted(
                transit_result.get("transit_aspects", []),
                key=lambda x: x.get("orb", 99),
            )[:5]
        except Exception:
            top_transits = []

        # ── Profections ───────────────────────────────────────────────────────
        try:
            from astro_predictive import profections as calc_profs
            birth_yr = int(req.date[:4])
            target_yr = int(target[:4])
            # approximate age from year difference
            age = target_yr - birth_yr
            prof_result = calc_profs(natal_jd, target)
            profection_info = {
                "age": age,
                "profected_house": prof_result.get("profected_house"),
                "lord_of_year":    prof_result.get("lord_of_year"),
            }
        except Exception:
            profection_info = {}

        # ── Firdaria ──────────────────────────────────────────────────────────
        try:
            from astro_predictive import firdaria as calc_fird
            fird_result = calc_fird(natal_jd, target)
            firdaria_info = {
                "current_period": fird_result.get("current_period"),
                "current_sub":    fird_result.get("current_sub"),
            }
        except Exception:
            firdaria_info = {}

        # ── Compensatory advice for top transits ──────────────────────────────
        advice = []
        if _COMPENSATORY_OK and top_transits:
            try:
                natal_chart = calc_chart(
                    *_parse_date(req.date), *_parse_time(req.time),
                    req.lat, req.lon, req.utc,
                    include_aspects=False, include_patterns=False,
                    include_dignities=True, include_arabic=False,
                )
                comp = build_compensatory_report(  # type: ignore[misc]
                    natal_chart=natal_chart,
                    transit_aspects=top_transits,
                    depth="light",
                )
                advice = comp.get("practices", [])[:3]
            except Exception:
                pass

        return _present({
            "name":        req.name,
            "birth_date":  req.date,
            "target_date": target,
            "moon":        moon_info,
            "top_transits": top_transits,
            "profection":  profection_info,
            "firdaria":    firdaria_info,
            "advice":      advice,
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ─── INGRESS CALENDAR ─────────────────────────────────────────────────────────

# Planets whose sign changes (ingresses) to track
_INGRESS_PLANETS = {
    "sun":     ("☉", 30),   # ~1 month per sign
    "moon":    ("☽", 2.5),  # ~2.5 days per sign
    "mercury": ("☿", 20),
    "venus":   ("♀", 25),
    "mars":    ("♂", 45),
    "jupiter": ("♃", 365),
    "saturn":  ("♄", 900),
}


# ═════════════════════════════════════════════════════════════════════════════
# FULL PROFILE — one-call aggregator: natal + transits + compensatory + timing
# ═════════════════════════════════════════════════════════════════════════════

class FullProfileRequest(BaseModel):
    date: str
    time: str = "12:00"
    lat: float
    lon: float
    utc: float = 0
    timezone_name: Optional[str] = None
    name: Optional[str] = None
    target_date: Optional[str] = None
    target_time: str = "12:00"
    current_lat: Optional[float] = None
    current_lon: Optional[float] = None
    depth: str = "full"          # brief | full | professional
    houses: str = "P"
    include_compensatory: bool = True
    include_human_design: bool = False
    include_jyotish: bool = False
    include_relocation: bool = False


@app.post("/full-profile")
def full_profile(req: FullProfileRequest):
    """
    ONE-CALL full profile: natal + top transits + compensatory practices +
    profections + firdaria + solar-arc hits + moon status.

    Designed for the main dashboard — single round-trip to populate all cards.
    """
    try:
        import datetime as _dt

        utc_off = _utc_for_tz(req.timezone_name, req.date, req.utc)
        natal_jd = _to_jd(req.date, req.time, utc_off)
        target = req.target_date or _dt.date.today().isoformat()
        yr, mo, dy = _parse_date(req.date)
        h, mi, sc  = _parse_time(req.time)

        # ── Natal chart ───────────────────────────────────────────────────────
        chart = calc_chart(
            yr, mo, dy, h, mi, sc, req.lat, req.lon, utc_off,
            houses_system=req.houses,
            include_aspects=True, include_patterns=False,
            include_dignities=True, include_arabic=True,
            include_fixed_stars=False, include_sect=True,
        )

        # ── Moon today ────────────────────────────────────────────────────────
        target_jd = _to_jd(target, req.target_time, 0)
        t_planets  = calc_planets(target_jd)
        moon_lon   = t_planets.get("moon", 0)
        sun_lon    = t_planets.get("sun",  0)
        phase_angle = (moon_lon - sun_lon) % 360
        phase_map  = [
            (45,  "new_moon"),  (90,  "waxing_crescent"),
            (135, "first_quarter"), (180, "waxing_gibbous"),
            (225, "full_moon"), (270, "waning_gibbous"),
            (315, "last_quarter"), (360, "waning_crescent"),
        ]
        phase_name = next((n for thr, n in phase_map if phase_angle < thr), "waning_crescent")
        voc = void_of_course_moon(target_jd, look_ahead_days=3.0, lat=req.lat, lon=req.lon)
        mansion = lunar_mansion_full(moon_lon)
        moon_today = {
            "sign": sign_name(moon_lon), "degree": round(moon_lon % 30, 2),
            "phase": phase_name, "phase_angle": round(phase_angle, 2),
            "void_of_course": voc, "mansion": mansion,
        }

        # ── Top transits (tight orb) ──────────────────────────────────────────
        try:
            tr = transits(natal_jd, target, req.target_time,
                          lat=req.lat, lon=req.lon,
                          transit_orb_major=3.0, transit_orb_minor=1.5)
            raw_transit_aspects = sorted(
                tr.get("aspects", []), key=lambda x: x.get("orb", 99)
            )[:6]
        except Exception:
            raw_transit_aspects = []

        # ── Compensatory practices per transit ────────────────────────────────
        active_transits = []
        if req.include_compensatory and _COMPENSATORY_OK and raw_transit_aspects:
            try:
                comp = build_compensatory_report(
                    natal_chart=chart,
                    transit_aspects=raw_transit_aspects,
                    depth="light" if req.depth == "brief" else "medium",
                )
                practices_by_aspect = {}
                for prac in comp.get("practices", []):
                    key = prac.get("transit_key", "")
                    if key not in practices_by_aspect:
                        practices_by_aspect[key] = []
                    practices_by_aspect[key].append(prac)

                for asp in raw_transit_aspects:
                    tk = f"{asp.get('transit_planet','')}-{asp.get('aspect','')}-{asp.get('natal_planet','')}"
                    asp["compensatory"] = practices_by_aspect.get(tk, [])
                    active_transits.append(asp)

                period_bg = comp.get("background", {})
            except Exception:
                active_transits = raw_transit_aspects
                period_bg = {}
        else:
            active_transits = raw_transit_aspects
            period_bg = {}

        # ── Profections ───────────────────────────────────────────────────────
        try:
            prof = profections(natal_jd, target, lat=req.lat, lon=req.lon)
        except Exception:
            prof = {}

        # ── Firdaria ──────────────────────────────────────────────────────────
        try:
            fird = firdaria(natal_jd, target)
        except Exception:
            fird = {}

        # ── Solar arc (top 3 tightest hits) ──────────────────────────────────
        sa_hits = []
        if req.depth != "brief":
            try:
                sa_res = solar_arc(natal_jd, target)
                sa_hits = sorted(
                    sa_res.get("aspects_to_natal", []),
                    key=lambda x: x.get("orb", 99)
                )[:3]
            except Exception:
                pass

        # ── Saturn cycle status ───────────────────────────────────────────────
        saturn_status = {}
        if req.depth != "brief":
            try:
                from astro_predictive import saturn_cycle
                saturn_status = saturn_cycle(natal_jd, target)
            except Exception:
                pass

        # ── Relocation block ─────────────────────────────────────────────────
        relocation_data = {}
        if req.include_relocation and req.current_lat is not None:
            try:
                relocation_data = relocated_chart(
                    natal_jd, req.current_lat, req.current_lon or req.lon,
                    lat_birth=req.lat, lon_birth=req.lon,
                )
            except Exception:
                pass

        # ── Human Design (optional, heavy) ───────────────────────────────────
        hd_data = {}
        if req.include_human_design and _HUMAN_DESIGN_OK:
            try:
                hd_data = calc_human_design(natal_jd)
            except Exception:
                pass

        # ── Jyotish (optional) ───────────────────────────────────────────────
        jyotish_data = {}
        if req.include_jyotish and _JYOTISH_OK:
            try:
                jyotish_data = _calc_jyotish(yr, mo, dy, h, mi, sc,
                                              req.lat, req.lon, utc_off)
            except Exception:
                pass

        result = {
            "name":            req.name,
            "birth_date":      req.date,
            "birth_time":      req.time,
            "target_date":     target,
            "depth":           req.depth,

            "moon_today":      moon_today,
            "natal":           chart if req.depth != "brief" else {
                "asc": chart.get("asc"), "mc": chart.get("mc"),
                "planets": {k: {"sign": v.get("sign"), "house": v.get("house")}
                            for k, v in chart.get("planets", {}).items()},
            },
            "active_transits": active_transits,
            "period_background": period_bg,

            "profections":     prof,
            "firdaria":        fird,
            "solar_arc_hits":  sa_hits,
            "saturn_cycle":    saturn_status,

            "relocation":      relocation_data,
            "human_design":    hd_data,
            "jyotish":         jyotish_data,
        }
        return _present(result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ═════════════════════════════════════════════════════════════════════════════
# COUPLE endpoints — aliases for /interaction/* with clearer semantics
# (kept for backward compat; /interaction/* routes remain active)
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/couple/forecast")
def couple_forecast(req: PersonalInteractionRequest):
    """Alias for /interaction/personal-forecast — two-person timing forecast."""
    try:
        result = _compute_interaction_model(req)
        return _present(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/couple/timeline")
def couple_timeline(req: PersonalInteractionRequest):
    """Alias for /interaction/timeline — active windows for a couple."""
    try:
        result = _compute_interaction_model(req)
        return _present({
            "subject":      result["subject"],
            "influencer":   result["influencer"],
            "period":       result["period"],
            "active_windows": result.get("active_windows", []),
            "synastry_score": result.get("synastry_score"),
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/couple/compare")
def couple_compare(req: PersonalInteractionRequest):
    """Alias for /interaction/delta — how partner affects subject."""
    try:
        result = _compute_interaction_model(req)
        return _present({
            "subject":           result["subject"],
            "influencer":        result["influencer"],
            "period":            result["period"],
            "baseline_forecast": result.get("baseline_forecast", {}),
            "partner_delta":     result.get("partner_delta", {}),
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))




@app.get("/ephemeris/ingress-calendar")
def ingress_calendar(
    year:          int = Query(..., description="Calendar year, e.g. 2026"),
    include_moon:  bool = Query(False, description="Include fast Moon ingresses (~54/year)"),
    planets:       str  = Query("sun,mercury,venus,mars,jupiter,saturn",
                                description="Comma-separated planet list"),
):
    """Yearly calendar of all planetary sign ingresses.

    Returns a chronological list of exact moments when each planet enters a
    new zodiac sign, accurate to ±6 minutes (binary search, 12-min steps).

    Set **include_moon=true** to also get the 50–54 annual Moon ingresses.
    """
    try:
        requested = {p.strip().lower() for p in planets.split(",") if p.strip()}
        if include_moon:
            requested.add("moon")
        # Validate
        unknown = requested - set(_INGRESS_PLANETS)
        if unknown:
            raise HTTPException(400, f"Unknown planets: {unknown}. Allowed: {list(_INGRESS_PLANETS)}")

        start_jd = calc_jd(year, 1, 1, 0, 0, 0)
        end_jd   = calc_jd(year + 1, 1, 1, 0, 0, 0)

        ingresses = []

        for pname in requested:
            _, step_days = _INGRESS_PLANETS[pname]
            # Scan with 0.1× step to catch all ingresses
            scan_step = step_days * 0.08
            jd_cur = start_jd

            prev_planets = calc_planets(jd_cur)
            prev_sign = int(prev_planets.get(pname, 0) % 360 / 30)

            while jd_cur < end_jd:
                jd_next = min(jd_cur + scan_step, end_jd)
                cur_planets = calc_planets(jd_next)
                cur_lon = cur_planets.get(pname, 0)
                cur_sign = int(cur_lon % 360 / 30)

                if cur_sign != prev_sign:
                    # Binary search for exact crossing moment
                    lo, hi = jd_cur, jd_next
                    for _ in range(18):  # 18 iterations → ~6 min accuracy
                        mid = (lo + hi) / 2
                        mid_lon = calc_planets(mid).get(pname, 0)
                        mid_sign = int(mid_lon % 360 / 30)
                        if mid_sign == prev_sign:
                            lo = mid
                        else:
                            hi = mid
                    exact_jd = (lo + hi) / 2

                    # Convert JD to calendar date (standard algorithm)
                    z = int(exact_jd + 0.5)
                    f = (exact_jd + 0.5) - z
                    if z < 2299161:
                        a = z
                    else:
                        alpha = int((z - 1867216.25) / 36524.25)
                        a = z + 1 + alpha - alpha // 4
                    b = a + 1524
                    c = int((b - 122.1) / 365.25)
                    d = int(365.25 * c)
                    e = int((b - d) / 30.6001)
                    day_f = b - d - int(30.6001 * e) + f
                    dy_r = int(day_f)
                    h_r  = (day_f - dy_r) * 24
                    mo_r = (e - 1) if e < 14 else (e - 13)
                    yr_r = (c - 4716) if mo_r > 2 else (c - 4715)
                    dt_str = f"{int(yr_r):04d}-{int(mo_r):02d}-{int(dy_r):02d} {int(h_r):02d}:{int((h_r % 1)*60):02d} UTC"

                    ingresses.append({
                        "planet":     pname,
                        "sign":       SIGN_NAMES[cur_sign % 12],
                        "sign_idx":   cur_sign % 12,
                        "jd":         round(exact_jd, 4),
                        "datetime_utc": dt_str,
                    })
                    prev_sign = cur_sign

                prev_planets = cur_planets
                jd_cur = jd_next

        # Sort chronologically
        ingresses.sort(key=lambda x: x["jd"])

        return _present({
            "year":     year,
            "planets":  sorted(requested),
            "count":    len(ingresses),
            "ingresses": ingresses,
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ═════════════════════════════════════════════════════════════════════════════
# ECLIPSE-PERSONAL — upcoming eclipses mapped to natal houses
# ═════════════════════════════════════════════════════════════════════════════

_HOUSE_THEMES_ECL = {
    1: "идентичность, тело, начинания",
    2: "деньги, ценности, ресурсы",
    3: "коммуникации, братья/сёстры, короткие поездки",
    4: "дом, семья, корни",
    5: "творчество, дети, удовольствие, риск",
    6: "работа, здоровье, рутина",
    7: "партнёрство, договоры, открытые враги",
    8: "трансформация, наследство, совместные ресурсы",
    9: "философия, путешествия, высшее образование",
    10: "карьера, публичность, статус",
    11: "друзья, сообщество, цели",
    12: "тайны, изоляция, кармические уроки",
}


class EclipsePersonalRequest(BaseModel):
    date:        str
    time:        str = "12:00"
    lat:         float
    lon:         float
    utc:         float = 0.0
    timezone_name: Optional[str] = None
    start_date:  Optional[str] = None
    count:       int = 6
    houses:      str = "placidus"
    include_compensatory: bool = True


@app.post("/predictive/eclipse-personal")
def eclipse_personal(req: EclipsePersonalRequest):
    """
    Find upcoming eclipses and map each to the native's natal house.
    Solar eclipse → new-cycle trigger; lunar → culmination/completion.
    """
    try:
        from astro_engine import planet_in_house as _pih
        effective_utc = _utc_for_tz(req.timezone_name, req.date, req.utc)
        start = req.start_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        eclipses = find_eclipses(start, count=req.count)

        yr, mo, dy = _parse_date(req.date)
        h, mi, sc  = _parse_time(req.time)
        natal = calc_chart(yr, mo, dy, h, mi, sc, req.lat, req.lon, effective_utc,
                           houses_system=req.houses,
                           include_aspects=False, include_dignities=False,
                           include_arabic=False)
        # planet_in_house expects {h1: float_lon, ...}
        raw_houses = natal.get("houses", {})
        houses_dict = {
            k: (v["lon"] if isinstance(v, dict) else v)
            for k, v in raw_houses.items()
            if k.startswith("h") and k[1:].isdigit()
        }

        enriched = []
        for ecl in eclipses:
            ecl_lon = ecl.get("sun_lon" if ecl["type"] == "solar" else "moon_lon", 0)
            natal_house = _pih(ecl_lon, houses_dict)
            theme = _HOUSE_THEMES_ECL.get(natal_house, "")
            entry = dict(ecl)
            entry["natal_house"]     = natal_house
            entry["activated_theme"] = theme
            entry["sign"]            = sign_name(ecl_lon)

            if req.include_compensatory and _COMPENSATORY_OK and build_compensatory_report is not None:
                try:
                    synth_aspect = {
                        "transit_planet": "sun" if ecl["type"] == "solar" else "moon",
                        "natal_planet":   f"house_{natal_house}",
                        "aspect":         "conjunction",
                        "orb":            0.0,
                        "applying":       True,
                    }
                    _ecl_date = (ecl.get("date_utc") or start)[:10]
                    _eyr, _emo, _edy = _parse_date(_ecl_date)
                    _ecl_tr_chart = calc_chart(
                        _eyr, _emo, _edy, 12, 0, 0, 0.0, 0.0, 0.0,
                        include_aspects=False, include_patterns=False,
                        include_dignities=False, include_arabic=False,
                        include_sect=False, include_dispositors=False,
                    )
                    comp = build_compensatory_report(
                        natal_chart=natal,
                        transit_chart=_ecl_tr_chart,
                        transit_aspects=[synth_aspect],
                        target_date=_ecl_date,
                        intensity="light",
                    )
                    _at_list = comp.get("active_transits", [])
                    entry["compensatory"] = [
                        _at.get("practices", [{}])[0] for _at in _at_list[:2]
                        if _at.get("practices")
                    ]
                except Exception:
                    entry["compensatory"] = []

            enriched.append(entry)

        return _present({
            "natal_date":  req.date,
            "scan_from":   start,
            "eclipses":    enriched,
            "count":       len(enriched),
            "interpretation": (
                f"Найдено {len(enriched)} затмений. "
                "Затмения активируют натальные дома, интенсифицируя их темы на 6–18 месяцев. "
                "Солнечное затмение (новолуние) запускает новый цикл в доме; "
                "лунное (полнолуние) — завершает или кульминирует тему."
            ),
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ═════════════════════════════════════════════════════════════════════════════
# INGRESS-PERSONAL — solar ingresses mapped to natal houses
# ═════════════════════════════════════════════════════════════════════════════

_ALL_SIGNS_12 = [
    "aries","taurus","gemini","cancer","leo","virgo",
    "libra","scorpio","sagittarius","capricorn","aquarius","pisces",
]

_SIGN_RU_MAP = {
    "aries": "Овен", "taurus": "Телец", "gemini": "Близнецы",
    "cancer": "Рак", "leo": "Лев", "virgo": "Дева",
    "libra": "Весы", "scorpio": "Скорпион", "sagittarius": "Стрелец",
    "capricorn": "Козерог", "aquarius": "Водолей", "pisces": "Рыбы",
}

_HOUSE_THEMES_ING = {
    1: "идентичность, тело, начинания",
    2: "деньги, ценности, ресурсы",
    3: "коммуникации, короткие поездки",
    4: "дом, семья, корни",
    5: "творчество, дети, удовольствие",
    6: "работа, здоровье, рутина",
    7: "партнёрство, договоры",
    8: "трансформация, совместные ресурсы",
    9: "философия, путешествия, учёба",
    10: "карьера, публичность",
    11: "друзья, сообщество, цели",
    12: "тайны, изоляция, духовность",
}


class IngressPersonalRequest(BaseModel):
    date:   str
    time:   str = "12:00"
    lat:    float
    lon:    float
    utc:    float = 0.0
    timezone_name: Optional[str] = None
    year:   Optional[int] = None
    houses: str = "placidus"


@app.post("/predictive/ingress-personal")
def ingress_personal(req: IngressPersonalRequest):
    """
    Compute all 12 solar ingresses for the year and map each to the native's natal house.
    Identifies which life area each solar month (~30 days) emphasises.
    """
    try:
        from astro_engine import planet_in_house as _pih
        effective_utc = _utc_for_tz(req.timezone_name, req.date, req.utc)
        year = req.year or datetime.now(timezone.utc).year

        yr, mo, dy = _parse_date(req.date)
        h, mi, sc  = _parse_time(req.time)
        natal = calc_chart(yr, mo, dy, h, mi, sc, req.lat, req.lon, effective_utc,
                           houses_system=req.houses,
                           include_aspects=False, include_dignities=False,
                           include_arabic=False)
        raw_houses = natal.get("houses", {})
        houses_dict = {
            k: (v["lon"] if isinstance(v, dict) else v)
            for k, v in raw_houses.items()
            if k.startswith("h") and k[1:].isdigit()
        }

        results = []
        for sign in _ALL_SIGNS_12:
            chart = None
            for try_year in [year, year + 1]:
                try:
                    chart = ingress_chart(try_year, sign, req.lat, req.lon,
                                         houses_system=req.houses)
                    if chart:
                        break
                except Exception:
                    continue

            if not chart:
                continue

            meta = chart.get("ingress_metadata", {})
            ingress_lon  = meta.get("target_lon", 0)
            ingress_date = meta.get("ingress_date_utc", "") or meta.get("date", "")
            natal_house  = _pih(ingress_lon, houses_dict)

            results.append({
                "sign":            sign,
                "sign_ru":         _SIGN_RU_MAP.get(sign, sign),
                "ingress_date":    ingress_date,
                "ingress_lon":     round(ingress_lon, 2),
                "natal_house":     natal_house,
                "activated_theme": _HOUSE_THEMES_ING.get(natal_house, ""),
            })

        results.sort(key=lambda x: x.get("ingress_date", ""))

        return _present({
            "natal_date": req.date,
            "year":       year,
            "ingresses":  results,
            "interpretation": (
                f"12 солнечных ингрессий {year} года с привязкой к натальным домам. "
                "Каждая ингрессия — смена фокуса на ~30 дней. "
                "Дом, куда входит Солнце, активирует соответствующую жизненную тему."
            ),
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ═════════════════════════════════════════════════════════════════════════════
# GEOCODING — city name → lat/lon via Nominatim
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/geocode/cities")
def geocode_cities(q: str = Query(..., min_length=2, max_length=100)):
    """
    Search cities by name using Nominatim (OpenStreetMap).
    Returns up to 7 results with name, lat, lon, display_name.
    """
    import urllib.request
    import urllib.parse
    if not q or not q.strip():
        raise HTTPException(400, "Query parameter 'q' is required")
    params = urllib.parse.urlencode({
        "q": q.strip(),
        "format": "json",
        "addressdetails": 1,
        "limit": 10,
    })
    url = f"https://nominatim.openstreetmap.org/search?{params}&accept-language=ru,en"

    # ── built-in fallback: well-known cities (works offline / on Nominatim downtime)
    BUILTIN = [
        ("москва", "Москва", "Russia", 55.75, 37.62),
        ("санкт-петербург", "Санкт-Петербург", "Russia", 59.93, 30.32),
        ("питер", "Санкт-Петербург", "Russia", 59.93, 30.32),
        ("спб", "Санкт-Петербург", "Russia", 59.93, 30.32),
        ("новосибирск", "Новосибирск", "Russia", 55.03, 82.92),
        ("екатеринбург", "Екатеринбург", "Russia", 56.84, 60.61),
        ("казань", "Казань", "Russia", 55.78, 49.12),
        ("сочи", "Сочи", "Russia", 43.60, 39.73),
        ("краснодар", "Краснодар", "Russia", 45.04, 38.98),
        ("калининград", "Калининград", "Russia", 54.71, 20.51),
        ("владивосток", "Владивосток", "Russia", 43.12, 131.89),
        ("берлин", "Берлин", "Germany", 52.52, 13.40),
        ("мюнхен", "Мюнхен", "Germany", 48.14, 11.58),
        ("прага", "Прага", "Czechia", 50.08, 14.44),
        ("вена", "Вена", "Austria", 48.21, 16.37),
        ("париж", "Париж", "France", 48.86, 2.35),
        ("лондон", "Лондон", "UK", 51.51, -0.13),
        ("рим", "Рим", "Italy", 41.90, 12.50),
        ("милан", "Милан", "Italy", 45.46, 9.19),
        ("барселона", "Барселона", "Spain", 41.39, 2.15),
        ("мадрид", "Мадрид", "Spain", 40.42, -3.70),
        ("стамбул", "Стамбул", "Türkiye", 41.01, 28.97),
        ("анталья", "Анталья", "Türkiye", 36.90, 30.71),
        ("тбилиси", "Тбилиси", "Georgia", 41.69, 44.83),
        ("батуми", "Батуми", "Georgia", 41.65, 41.64),
        ("ереван", "Ереван", "Armenia", 40.18, 44.51),
        ("баку", "Баку", "Azerbaijan", 40.41, 49.87),
        ("минск", "Минск", "Belarus", 53.90, 27.57),
        ("киев", "Киев", "Ukraine", 50.45, 30.52),
        ("алматы", "Алматы", "Kazakhstan", 43.24, 76.95),
        ("астана", "Астана", "Kazakhstan", 51.17, 71.43),
        ("ташкент", "Ташкент", "Uzbekistan", 41.30, 69.24),
        ("бишкек", "Бишкек", "Kyrgyzstan", 42.87, 74.59),
        ("дубай", "Дубай", "UAE", 25.20, 55.27),
        ("тель-авив", "Тель-Авив", "Israel", 32.08, 34.78),
        ("лимасол", "Лимасол", "Cyprus", 34.68, 33.04),
        ("белград", "Белград", "Serbia", 44.79, 20.46),
        ("будапешт", "Будапешт", "Hungary", 47.50, 19.04),
        ("варшава", "Варшава", "Poland", 52.23, 21.01),
        ("амстердам", "Амстердам", "Netherlands", 52.37, 4.90),
        ("брюссель", "Брюссель", "Belgium", 50.85, 4.35),
        ("хельсинки", "Хельсинки", "Finland", 60.17, 24.94),
        ("стокгольм", "Стокгольм", "Sweden", 59.33, 18.07),
        ("осло", "Осло", "Norway", 59.91, 10.75),
        ("копенгаген", "Копенгаген", "Denmark", 55.68, 12.57),
        ("афины", "Афины", "Greece", 37.98, 23.73),
        ("лиссабон", "Лиссабон", "Portugal", 38.72, -9.14),
        ("бали", "Бали (Денпасар)", "Indonesia", -8.34, 115.09),
        ("бангкок", "Бангкок", "Thailand", 13.76, 100.50),
        ("пхукет", "Пхукет", "Thailand", 7.88, 98.39),
        ("сингапур", "Сингапур", "Singapore", 1.35, 103.82),
        ("гонконг", "Гонконг", "China", 22.32, 114.17),
        ("токио", "Токио", "Japan", 35.68, 139.69),
        ("сеул", "Сеул", "South Korea", 37.57, 126.98),
        ("шанхай", "Шанхай", "China", 31.23, 121.47),
        ("пекин", "Пекин", "China", 39.90, 116.40),
        ("нью-йорк", "Нью-Йорк", "USA", 40.71, -74.01),
        ("лос-анджелес", "Лос-Анджелес", "USA", 34.05, -118.24),
        ("майами", "Майами", "USA", 25.76, -80.19),
        ("сан-франциско", "Сан-Франциско", "USA", 37.77, -122.42),
        ("чикаго", "Чикаго", "USA", 41.88, -87.63),
        ("торонто", "Торонто", "Canada", 43.65, -79.38),
        ("монреаль", "Монреаль", "Canada", 45.50, -73.57),
        ("мехико", "Мехико", "Mexico", 19.43, -99.13),
        ("буэнос-айрес", "Буэнос-Айрес", "Argentina", -34.60, -58.38),
        ("сан-паулу", "Сан-Паулу", "Brazil", -23.55, -46.63),
        ("рио", "Рио-де-Жанейро", "Brazil", -22.91, -43.17),
    ]

    def _builtin_match(query: str):
        ql = query.strip().lower()
        out = []
        for key, name, country, lat, lon in BUILTIN:
            if key.startswith(ql) or ql in key:
                out.append({
                    "name":         name,
                    "country":      country,
                    "display_name": f"{name}, {country}",
                    "lat":          lat,
                    "lon":          lon,
                })
        return out[:7]

    try:
        req_obj = urllib.request.Request(url, headers={"User-Agent": "AstroCRM/1.0 (contact@astrocrm.app)"})
        with urllib.request.urlopen(req_obj, timeout=8) as resp:
            data = json.loads(resp.read().decode())
        results = []
        for item in data:
            addr = item.get("address", {})
            place_type = item.get("type", "")
            place_class = item.get("class", "")
            # Relaxed filter: accept any place / boundary / administrative entity
            if place_class not in ("place", "boundary", "landuse", "administrative"):
                continue
            if place_type and place_type not in (
                "city", "town", "village", "municipality",
                "administrative", "suburb", "quarter",
                "hamlet", "district", "neighbourhood",
                "locality", "isolated_dwelling",
            ):
                continue
            city_name = (
                addr.get("city") or addr.get("town") or addr.get("village")
                or addr.get("municipality") or addr.get("county")
                or addr.get("state") or item.get("name", "")
            )
            country = addr.get("country", "")
            results.append({
                "name":         city_name,
                "country":      country,
                "display_name": f"{city_name}, {country}" if country else city_name,
                "lat":          round(float(item["lat"]), 5),
                "lon":          round(float(item["lon"]), 5),
            })
        # De-duplicate by (lat, lon)
        seen: set = set()
        unique = []
        for r in results:
            key = (round(r["lat"], 2), round(r["lon"], 2))
            if key not in seen:
                seen.add(key)
                unique.append(r)
        # Backfill from built-in list if Nominatim returned nothing
        if not unique:
            unique = _builtin_match(q)
        return {"results": unique[:7]}
    except HTTPException:
        raise
    except Exception as e:
        # Network / timeout / parse — fall back to built-in dictionary so the UI keeps working
        fallback = _builtin_match(q)
        if fallback:
            return {"results": fallback, "source": "builtin", "warning": str(e)[:120]}
        raise HTTPException(502, f"Geocoding failed: {e}")


# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("astro_api_v2:app", host="0.0.0.0", port=8000, reload=True)
