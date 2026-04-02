#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Astro-Databank collector
- discovers MediaWiki API endpoint
- downloads pages in batches (allpages / categorymembers / search)
- stores normalized data in SQLite for analysis
- supports resume after interruption
- saves raw wikitext for later re-parsing

Usage examples:
  python astrodatabank_collector.py init-db --db astro.db
  python astrodatabank_collector.py collect-all --db astro.db --limit 5000 --sleep 1.0
  python astrodatabank_collector.py collect-category --db astro.db --category "Category:Vocation : Entertainment : Actor/ Actress" --limit 2000
  python astrodatabank_collector.py export --db astro.db --format csv --out astro_people.csv

Notes:
- Be polite: keep a non-zero --sleep.
- This script prefers MediaWiki API. If astro.com changes endpoints or protection, update API_CANDIDATES.
"""

from __future__ import annotations

import argparse
import csv
import dataclasses
import datetime as dt
import json
import re
import sqlite3
import sys
import time
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Optional, Sequence, Tuple

import requests

API_CANDIDATES = [
    "https://www.astro.com/wiki/astro-databank/api.php",
    "https://www.astro.com/astro-databank/api.php",
]

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; AstroDataResearchBot/1.0; contact=replace-with-your-email)",
    "Accept": "application/json,text/plain,*/*",
}

CATEGORY_RE = re.compile(r"\[\[Category:([^\]]+)\]\]", re.I)
WIKILINK_RE = re.compile(r"\[\[(?:[^|\]]+\|)?([^\]]+)\]\]")
REF_RE = re.compile(r"<ref[^>]*>.*?</ref>", re.I | re.S)
COMMENT_RE = re.compile(r"<!--.*?-->", re.S)
TEMPLATE_RE = re.compile(r"\{\{([^{}]|\{[^{}]*\})*\}\}", re.S)
INFOBOX_FIELD_RE = re.compile(r"^\|\s*([^=\n]+?)\s*=\s*(.*?)\s*$", re.M)

DATE_KEYS = ["date", "birthdate", "born", "data", "sbdate", "sbdate_dmy", "pbdate"]
TIME_KEYS = ["time", "birthtime", "hour", "sbtime"]
PLACE_KEYS = ["place", "birthplace", "location"]
RODDEN_KEYS = ["roddenrating", "rodden", "rr", "sroddenrating", "roddenratingcode"]
GENDER_KEYS = ["gender", "sex"]
OCCUPATION_KEYS = ["occupation", "professions", "profession", "vocation"]

NATAL_FIELD_ALIASES: Dict[str, List[str]] = {
    "sun": ["sun"],
    "moon": ["moon"],
    "mercury": ["mercury"],
    "venus": ["venus"],
    "mars": ["mars"],
    "jupiter": ["jupiter"],
    "saturn": ["saturn"],
    "uranus": ["uranus"],
    "neptune": ["neptune"],
    "pluto": ["pluto"],
    "true_node": ["node", "northnode", "truenode", "lunarnode"],
    "chiron": ["chiron"],
    "asc": ["asc", "ascendant", "as"],
    "mc": ["mc", "midheaven"],
    "house_system": ["housesystem", "house", "houses"],
}

RODDEN_ORDER = {"AA": 5, "A": 4, "B": 3, "C": 2, "DD": 1, "X": 0}
MONTH_MAP = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}


def clean_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = REF_RE.sub(" ", value)
    value = COMMENT_RE.sub(" ", value)
    value = WIKILINK_RE.sub(r"\1", value)
    value = value.replace("'''", "").replace("''", "")
    value = re.sub(r"<[^>]+>", " ", value)
    value = re.sub(r"\s+", " ", value).strip(" |\t\r\n")
    return value or None


def norm_key(key: str) -> str:
    return re.sub(r"\s+", "", key.strip().lower())


@dataclasses.dataclass
class PersonRecord:
    page_id: int
    title: str
    name: str
    namespace: int
    date_of_birth: Optional[str] = None
    time_of_birth: Optional[str] = None
    place_of_birth: Optional[str] = None
    rodden_rating: Optional[str] = None
    gender: Optional[str] = None
    occupation: Optional[str] = None
    source_notes: Optional[str] = None
    biography: Optional[str] = None
    natal_chart_json: Optional[str] = None
    infobox_json: Optional[str] = None
    raw_wikitext: Optional[str] = None
    categories: Optional[List[str]] = None
    fetched_at: Optional[str] = None
    parse_version: int = 1


class AstroAPI:
    def __init__(self, api_url: Optional[str] = None, timeout: int = 40):
        self.session = requests.Session()
        self.session.headers.update(DEFAULT_HEADERS)
        self.timeout = timeout
        self.api_url = api_url or self.discover_api_url()

    def discover_api_url(self) -> str:
        last_error = None
        for candidate in API_CANDIDATES:
            try:
                r = self.session.get(
                    candidate,
                    params={"action": "query", "meta": "siteinfo", "format": "json"},
                    timeout=self.timeout,
                )
                if r.ok and "query" in r.json():
                    return candidate
            except Exception as exc:  # noqa: BLE001
                last_error = exc
        raise RuntimeError(f"Could not discover a working MediaWiki API endpoint. Last error: {last_error}")

    def get(self, **params) -> Dict:
        params["format"] = "json"
        r = self.session.get(self.api_url, params=params, timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def iter_allpages(self, namespace: int = 0, limit: Optional[int] = None) -> Iterator[Dict]:
        apcontinue = None
        count = 0
        while True:
            params = {
                "action": "query",
                "list": "allpages",
                "apnamespace": namespace,
                "aplimit": 50,
            }
            if apcontinue:
                params["apcontinue"] = apcontinue
            data = self.get(**params)
            pages = data.get("query", {}).get("allpages", [])
            for page in pages:
                yield page
                count += 1
                if limit is not None and count >= limit:
                    return
            apcontinue = data.get("continue", {}).get("apcontinue")
            if not apcontinue:
                return

    def iter_categorymembers(self, category: str, limit: Optional[int] = None) -> Iterator[Dict]:
        cmcontinue = None
        count = 0
        while True:
            params = {
                "action": "query",
                "list": "categorymembers",
                "cmtitle": category,
                "cmlimit": 50,
            }
            if cmcontinue:
                params["cmcontinue"] = cmcontinue
            data = self.get(**params)
            members = data.get("query", {}).get("categorymembers", [])
            for m in members:
                yield m
                count += 1
                if limit is not None and count >= limit:
                    return
            cmcontinue = data.get("continue", {}).get("cmcontinue")
            if not cmcontinue:
                return

    def iter_search(self, query: str, limit: Optional[int] = None) -> Iterator[Dict]:
        sroffset = None
        count = 0
        while True:
            params = {
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srlimit": 50,
            }
            if sroffset is not None:
                params["sroffset"] = sroffset
            data = self.get(**params)
            rows = data.get("query", {}).get("search", [])
            for row in rows:
                yield row
                count += 1
                if limit is not None and count >= limit:
                    return
            sroffset = data.get("continue", {}).get("sroffset")
            if sroffset is None:
                return

    def get_pages_wikitext(self, titles: Sequence[str]) -> List[Dict]:
        out: List[Dict] = []
        batch_size = 10
        for i in range(0, len(titles), batch_size):
            batch = titles[i : i + batch_size]
            data = self.get(
                action="query",
                prop="revisions|categories|info",
                rvprop="content",
                rvslots="main",
                cllimit="max",
                inprop="url",
                titles="|".join(batch),
            )
            pages = data.get("query", {}).get("pages", {})
            for _, page in pages.items():
                revisions = page.get("revisions", [])
                content = None
                if revisions:
                    rev = revisions[0]
                    content = (
                        rev.get("slots", {}).get("main", {}).get("*", None)
                        or rev.get("slots", {}).get("main", {}).get("content", None)
                        or rev.get("*", None)
                    )
                out.append(
                    {
                        "pageid": page.get("pageid", -1),
                        "ns": page.get("ns", 0),
                        "title": page.get("title", ""),
                        "fullurl": page.get("fullurl"),
                        "categories": [c.get("title", "").replace("Category:", "", 1) for c in page.get("categories", [])],
                        "wikitext": content,
                    }
                )
        return out


SCHEMA_SQL = """
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;

CREATE TABLE IF NOT EXISTS people (
    page_id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    name TEXT NOT NULL,
    namespace INTEGER NOT NULL,
    date_of_birth TEXT,
    time_of_birth TEXT,
    place_of_birth TEXT,
    rodden_rating TEXT,
    gender TEXT,
    occupation TEXT,
    source_notes TEXT,
    biography TEXT,
    natal_chart_json TEXT,
    infobox_json TEXT,
    raw_wikitext TEXT,
    fetched_at TEXT,
    parse_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categories (
    page_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    PRIMARY KEY (page_id, category),
    FOREIGN KEY (page_id) REFERENCES people(page_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crawl_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fetch_log (
    ts TEXT NOT NULL,
    source_mode TEXT NOT NULL,
    title TEXT,
    page_id INTEGER,
    status TEXT NOT NULL,
    note TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS people_fts USING fts5(
    title, name, occupation, place_of_birth, biography, source_notes, categories,
    content=''
);

CREATE INDEX IF NOT EXISTS idx_people_rodden ON people(rodden_rating);
CREATE INDEX IF NOT EXISTS idx_people_dob ON people(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_people_occupation ON people(occupation);
CREATE INDEX IF NOT EXISTS idx_categories_category ON categories(category);

CREATE TABLE IF NOT EXISTS people_analytics (
    page_id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    name TEXT NOT NULL,
    rodden_rating TEXT,
    rodden_rank INTEGER,
    birth_date_raw TEXT,
    birth_year INTEGER,
    birth_month INTEGER,
    birth_day INTEGER,
    birth_time_raw TEXT,
    birth_hour INTEGER,
    birth_minute INTEGER,
    birth_time_minutes INTEGER,
    place_of_birth_raw TEXT,
    place_of_birth_norm TEXT,
    place_country_guess TEXT,
    gender_raw TEXT,
    gender_norm TEXT,
    occupation_raw TEXT,
    occupation_norm TEXT,
    natal_chart_json TEXT,
    natal_planets_count INTEGER NOT NULL DEFAULT 0,
    natal_points TEXT,
    categories TEXT,
    categories_count INTEGER NOT NULL DEFAULT 0,
    has_biography INTEGER NOT NULL DEFAULT 0,
    has_source_notes INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (page_id) REFERENCES people(page_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS category_segments (
    page_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    level INTEGER NOT NULL,
    segment TEXT NOT NULL,
    PRIMARY KEY (page_id, category, level),
    FOREIGN KEY (page_id) REFERENCES people(page_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_people_analytics_rodden_rank ON people_analytics(rodden_rank);
CREATE INDEX IF NOT EXISTS idx_people_analytics_birth_year ON people_analytics(birth_year);
CREATE INDEX IF NOT EXISTS idx_people_analytics_country ON people_analytics(place_country_guess);
CREATE INDEX IF NOT EXISTS idx_people_analytics_occupation ON people_analytics(occupation_norm);
CREATE INDEX IF NOT EXISTS idx_people_analytics_natal_count ON people_analytics(natal_planets_count);
CREATE INDEX IF NOT EXISTS idx_category_segments_segment ON category_segments(segment);
"""


def connect_db(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA_SQL)
    ensure_schema_migrations(conn)
    return conn


def ensure_column(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    cols = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
    if column not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def ensure_schema_migrations(conn: sqlite3.Connection) -> None:
    ensure_column(conn, "people", "natal_chart_json", "TEXT")
    ensure_column(conn, "people", "infobox_json", "TEXT")
    ensure_column(conn, "people_analytics", "natal_chart_json", "TEXT")
    ensure_column(conn, "people_analytics", "natal_planets_count", "INTEGER NOT NULL DEFAULT 0")
    ensure_column(conn, "people_analytics", "natal_points", "TEXT")
    conn.commit()


def set_state(conn: sqlite3.Connection, key: str, value: str) -> None:
    conn.execute(
        """
        INSERT INTO crawl_state(key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
        """,
        (key, value, utcnow()),
    )
    conn.commit()


def get_state(conn: sqlite3.Connection, key: str) -> Optional[str]:
    row = conn.execute("SELECT value FROM crawl_state WHERE key=?", (key,)).fetchone()
    return row[0] if row else None


def utcnow() -> str:
    return dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def choose_field(fields: Dict[str, str], candidates: Sequence[str]) -> Optional[str]:
    for c in candidates:
        if c in fields and clean_text(fields[c]):
            return clean_text(fields[c])
    return None


def rodden_rank(value: Optional[str]) -> int:
    return RODDEN_ORDER.get((value or "").strip().upper(), -1)


def parse_birth_date(raw: Optional[str]) -> Tuple[Optional[int], Optional[int], Optional[int]]:
    if not raw:
        return None, None, None
    text = clean_text(raw) or ""

    m_iso = re.search(r"\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b", text)
    if m_iso:
        y, m, d = int(m_iso.group(1)), int(m_iso.group(2)), int(m_iso.group(3))
        if 1 <= m <= 12 and 1 <= d <= 31:
            return y, m, d

    m_dmy = re.search(r"\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b", text)
    if m_dmy:
        d, m, y = int(m_dmy.group(1)), int(m_dmy.group(2)), int(m_dmy.group(3))
        if 1 <= m <= 12 and 1 <= d <= 31:
            return y, m, d

    m_month = re.search(r"\b([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\b", text)
    if m_month:
        month = MONTH_MAP.get(m_month.group(1).strip().lower())
        if month:
            d = int(m_month.group(2))
            y = int(m_month.group(3))
            if 1 <= d <= 31:
                return y, month, d

    m_month2 = re.search(r"\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b", text)
    if m_month2:
        d = int(m_month2.group(1))
        month = MONTH_MAP.get(m_month2.group(2).strip().lower())
        y = int(m_month2.group(3))
        if month and 1 <= d <= 31:
            return y, month, d

    m_year = re.search(r"\b(\d{4})\b", text)
    if m_year:
        return int(m_year.group(1)), None, None

    return None, None, None


def parse_birth_time(raw: Optional[str]) -> Tuple[Optional[int], Optional[int], Optional[int]]:
    if not raw:
        return None, None, None
    text = (clean_text(raw) or "").lower()
    m = re.search(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b", text)
    if not m:
        return None, None, None

    hour = int(m.group(1))
    minute = int(m.group(2) or "0")
    ampm = m.group(3)

    if minute > 59:
        return None, None, None

    if ampm == "pm" and hour < 12:
        hour += 12
    elif ampm == "am" and hour == 12:
        hour = 0

    if hour > 23:
        return None, None, None

    return hour, minute, hour * 60 + minute


def normalize_gender(value: Optional[str]) -> Optional[str]:
    text = (clean_text(value) or "").lower()
    if not text:
        return None
    if text in {"m", "male", "man"}:
        return "male"
    if text in {"f", "female", "woman"}:
        return "female"
    if "male" in text and "female" not in text:
        return "male"
    if "female" in text:
        return "female"
    return text


def normalize_occupation(value: Optional[str]) -> Optional[str]:
    text = clean_text(value)
    if not text:
        return None
    return re.sub(r"\s+", " ", text.lower()).strip(" ;,")


def normalize_place(value: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    text = clean_text(value)
    if not text:
        return None, None
    norm = re.sub(r"\s+", " ", text).strip(" ,;")
    parts = [p.strip(" .") for p in norm.split(",") if p.strip()]
    country_guess = parts[-1] if parts else None
    if country_guess:
        country_guess = re.sub(r"\(.*?\)", "", country_guess).strip()
    return norm or None, country_guess or None


def split_category_segments(category: str) -> List[str]:
    cleaned = clean_text(category) or category
    segments = [seg.strip() for seg in re.split(r":|/", cleaned) if seg.strip()]
    return segments


def extract_natal_chart(fields: Dict[str, str], text: str) -> Dict[str, str]:
    out: Dict[str, str] = {}

    def from_alias(alias: str) -> Optional[str]:
        direct = clean_text(fields.get(alias))
        if direct:
            return direct
        sign = clean_text(fields.get(f"{alias}_sign"))
        deg = clean_text(fields.get(f"{alias}_degmin"))
        if sign or deg:
            return " ".join(x for x in [sign, deg] if x)
        return None

    for canonical, aliases in NATAL_FIELD_ALIASES.items():
        for alias in aliases:
            value = from_alias(alias)
            if value:
                out[canonical] = value
                break

    # Generic capture: any <base>_sign + <base>_degmin pair is treated as a natal point.
    bases = set()
    for key in fields.keys():
        if key.endswith("_sign"):
            bases.add(key[:-5])
        elif key.endswith("_degmin"):
            bases.add(key[:-7])

    for base in sorted(bases):
        sign = clean_text(fields.get(f"{base}_sign"))
        deg = clean_text(fields.get(f"{base}_degmin"))
        if not sign and not deg:
            continue
        value = " ".join(x for x in [sign, deg] if x)
        if value:
            out.setdefault(base, value)

    # Preserve alt values when present.
    for alt_key in ["sun_alt", "moon_alt"]:
        alt_value = clean_text(fields.get(alt_key))
        if alt_value:
            out[alt_key] = alt_value

    # Fallback: parse explicit lines in case infobox keys were atypical.
    if not out:
        for canonical, aliases in NATAL_FIELD_ALIASES.items():
            for alias in aliases:
                m = re.search(rf"(?im)^\|\s*{re.escape(alias)}\s*=\s*(.+)$", text)
                if m:
                    value = clean_text(m.group(1))
                    if value:
                        out[canonical] = value
                        break
            if canonical in out:
                continue

    return out


def fmt_seconds(value: float) -> str:
    seconds = max(int(value), 0)
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def parse_wikitext_to_record(page_id: int, title: str, namespace: int, wikitext: Optional[str], categories: List[str]) -> PersonRecord:
    text = wikitext or ""
    fields: Dict[str, str] = {}
    for key, value in INFOBOX_FIELD_RE.findall(text):
        fields[norm_key(key)] = value.strip()

    fields_clean: Dict[str, str] = {}
    for key, value in fields.items():
        c = clean_text(value)
        if c:
            fields_clean[key] = c

    bio = None
    source_notes = None

    m_bio = re.search(r"(?is)==\s*Biography\s*==(.*?)(?:\n==|\Z)", text)
    if m_bio:
        bio = clean_text(m_bio.group(1))

    m_source = re.search(r"(?is)==\s*Source Notes\s*==(.*?)(?:\n==|\Z)", text)
    if m_source:
        source_notes = clean_text(m_source.group(1))

    natal_map = extract_natal_chart(fields, text)

    rec = PersonRecord(
        page_id=page_id,
        title=title,
        name=clean_text(title) or title,
        namespace=namespace,
        date_of_birth=choose_field(fields, DATE_KEYS),
        time_of_birth=choose_field(fields, TIME_KEYS),
        place_of_birth=choose_field(fields, PLACE_KEYS),
        rodden_rating=choose_field(fields, RODDEN_KEYS),
        gender=choose_field(fields, GENDER_KEYS),
        occupation=choose_field(fields, OCCUPATION_KEYS),
        source_notes=source_notes,
        biography=bio,
        natal_chart_json=json.dumps(natal_map, ensure_ascii=False, sort_keys=True) if natal_map else None,
        infobox_json=json.dumps(fields_clean, ensure_ascii=False, sort_keys=True) if fields_clean else None,
        raw_wikitext=text,
        categories=sorted(set(categories + CATEGORY_RE.findall(text))),
        fetched_at=utcnow(),
        parse_version=2,
    )
    return rec


def upsert_record(conn: sqlite3.Connection, rec: PersonRecord) -> None:
    conn.execute(
        """
        INSERT INTO people(
            page_id, title, name, namespace,
            date_of_birth, time_of_birth, place_of_birth, rodden_rating,
            gender, occupation, source_notes, biography,
            natal_chart_json, infobox_json, raw_wikitext, fetched_at, parse_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(page_id) DO UPDATE SET
            title=excluded.title,
            name=excluded.name,
            namespace=excluded.namespace,
            date_of_birth=excluded.date_of_birth,
            time_of_birth=excluded.time_of_birth,
            place_of_birth=excluded.place_of_birth,
            rodden_rating=excluded.rodden_rating,
            gender=excluded.gender,
            occupation=excluded.occupation,
            source_notes=excluded.source_notes,
            biography=excluded.biography,
            natal_chart_json=excluded.natal_chart_json,
            infobox_json=excluded.infobox_json,
            raw_wikitext=excluded.raw_wikitext,
            fetched_at=excluded.fetched_at,
            parse_version=excluded.parse_version
        """,
        (
            rec.page_id,
            rec.title,
            rec.name,
            rec.namespace,
            rec.date_of_birth,
            rec.time_of_birth,
            rec.place_of_birth,
            rec.rodden_rating,
            rec.gender,
            rec.occupation,
            rec.source_notes,
            rec.biography,
            rec.natal_chart_json,
            rec.infobox_json,
            rec.raw_wikitext,
            rec.fetched_at,
            rec.parse_version,
        ),
    )
    conn.execute("DELETE FROM categories WHERE page_id=?", (rec.page_id,))
    for cat in rec.categories or []:
        conn.execute("INSERT OR IGNORE INTO categories(page_id, category) VALUES (?, ?)", (rec.page_id, cat))

    fts_categories = "; ".join(rec.categories or [])
    conn.execute(
        "INSERT OR REPLACE INTO people_fts(rowid, title, name, occupation, place_of_birth, biography, source_notes, categories) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (rec.page_id, rec.title, rec.name, rec.occupation, rec.place_of_birth, rec.biography, rec.source_notes, fts_categories),
    )


def log_fetch(conn: sqlite3.Connection, source_mode: str, title: Optional[str], page_id: Optional[int], status: str, note: Optional[str] = None) -> None:
    conn.execute(
        "INSERT INTO fetch_log(ts, source_mode, title, page_id, status, note) VALUES (?, ?, ?, ?, ?, ?)",
        (utcnow(), source_mode, title, page_id, status, note),
    )


def collect_from_titles(
    conn: sqlite3.Connection,
    api: AstroAPI,
    titles: List[str],
    source_mode: str,
    sleep_s: float = 1.0,
    commit_every: int = 100,
    live_log: bool = False,
    log_every_batches: int = 1,
) -> int:
    processed = 0
    skipped = 0
    parse_errors = 0
    api_errors = 0
    total_batches = (len(titles) + 9) // 10 if titles else 0
    started = time.time()

    if live_log:
        print(f"[live] source={source_mode} titles={len(titles)} batches={total_batches}")

    for i in range(0, len(titles), 10):
        batch = titles[i : i + 10]
        batch_no = (i // 10) + 1
        try:
            pages = api.get_pages_wikitext(batch)
        except Exception as exc:  # noqa: BLE001
            api_errors += len(batch)
            for t in batch:
                log_fetch(conn, source_mode, t, None, "error", str(exc))
            conn.commit()
            if live_log:
                elapsed = time.time() - started
                rate = processed / elapsed if elapsed > 0 else 0.0
                print(
                    f"[live] batch={batch_no}/{total_batches} api_error={len(batch)} "
                    f"processed={processed} skipped={skipped} parse_errors={parse_errors} api_errors={api_errors} "
                    f"rate={rate:.2f}/s elapsed={fmt_seconds(elapsed)}"
                )
            time.sleep(max(sleep_s, 2.0))
            continue

        for page in pages:
            page_id = page.get("pageid", -1)
            title = page.get("title", "")
            ns = page.get("ns", 0)
            wikitext = page.get("wikitext")
            cats = page.get("categories", []) or []
            if page_id == -1 or not title or not wikitext:
                log_fetch(conn, source_mode, title or None, page_id if page_id != -1 else None, "skipped", "missing content")
                skipped += 1
                continue
            try:
                rec = parse_wikitext_to_record(page_id, title, ns, wikitext, cats)
                upsert_record(conn, rec)
                log_fetch(conn, source_mode, title, page_id, "ok", None)
                processed += 1
            except Exception as exc:  # noqa: BLE001
                log_fetch(conn, source_mode, title, page_id, "parse_error", str(exc))
                parse_errors += 1

        if processed and processed % commit_every == 0:
            conn.commit()
        else:
            conn.commit()

        if live_log and (batch_no % max(log_every_batches, 1) == 0 or batch_no == total_batches):
            elapsed = time.time() - started
            rate = processed / elapsed if elapsed > 0 else 0.0
            done = processed + skipped + parse_errors + api_errors
            eta = ((len(titles) - done) / rate) if rate > 0 else 0.0
            print(
                f"[live] batch={batch_no}/{total_batches} done={done}/{len(titles)} "
                f"processed={processed} skipped={skipped} parse_errors={parse_errors} api_errors={api_errors} "
                f"rate={rate:.2f}/s elapsed={fmt_seconds(elapsed)} eta={fmt_seconds(eta)}"
            )

        time.sleep(sleep_s)

    if live_log:
        elapsed = time.time() - started
        rate = processed / elapsed if elapsed > 0 else 0.0
        print(
            f"[live] completed source={source_mode} processed={processed} skipped={skipped} "
            f"parse_errors={parse_errors} api_errors={api_errors} elapsed={fmt_seconds(elapsed)} rate={rate:.2f}/s"
        )

    return processed


def collect_all(conn: sqlite3.Connection, api: AstroAPI, limit: Optional[int], sleep_s: float, live_log: bool = False) -> int:
    titles: List[str] = []
    already = set(row[0] for row in conn.execute("SELECT title FROM people"))
    for page in api.iter_allpages(namespace=0, limit=limit):
        title = page.get("title")
        if title and title not in already:
            titles.append(title)
    if live_log:
        print(f"[live] allpages discovered new_titles={len(titles)} existing={len(already)}")
    return collect_from_titles(conn, api, titles, source_mode="allpages", sleep_s=sleep_s, live_log=live_log)


def collect_category(
    conn: sqlite3.Connection,
    api: AstroAPI,
    category: str,
    limit: Optional[int],
    sleep_s: float,
    live_log: bool = False,
) -> int:
    titles = []
    already = set(row[0] for row in conn.execute("SELECT title FROM people"))
    for row in api.iter_categorymembers(category, limit=limit):
        title = row.get("title")
        if title and title not in already:
            titles.append(title)
    if live_log:
        print(f"[live] category discovered new_titles={len(titles)} existing={len(already)} category={category}")
    return collect_from_titles(conn, api, titles, source_mode=f"category:{category}", sleep_s=sleep_s, live_log=live_log)


def collect_search(
    conn: sqlite3.Connection,
    api: AstroAPI,
    query: str,
    limit: Optional[int],
    sleep_s: float,
    live_log: bool = False,
) -> int:
    titles = []
    already = set(row[0] for row in conn.execute("SELECT title FROM people"))
    for row in api.iter_search(query, limit=limit):
        title = row.get("title")
        if title and title not in already:
            titles.append(title)
    if live_log:
        print(f"[live] search discovered new_titles={len(titles)} existing={len(already)} query={query}")
    return collect_from_titles(conn, api, titles, source_mode=f"search:{query}", sleep_s=sleep_s, live_log=live_log)


def reparse_existing(conn: sqlite3.Connection, limit: Optional[int] = None, live_log: bool = False) -> Dict[str, int]:
    query = "SELECT page_id, title, namespace, raw_wikitext FROM people ORDER BY page_id"
    if limit is not None:
        rows = conn.execute(query + " LIMIT ?", (limit,)).fetchall()
    else:
        rows = conn.execute(query).fetchall()

    total = len(rows)
    ok = 0
    failed = 0
    started = time.time()

    for idx, row in enumerate(rows, start=1):
        cats = [r[0] for r in conn.execute("SELECT category FROM categories WHERE page_id=?", (row["page_id"],)).fetchall()]
        try:
            rec = parse_wikitext_to_record(
                page_id=row["page_id"],
                title=row["title"],
                namespace=row["namespace"],
                wikitext=row["raw_wikitext"],
                categories=cats,
            )
            upsert_record(conn, rec)
            ok += 1
        except Exception:
            failed += 1

        if live_log and (idx % 100 == 0 or idx == total):
            elapsed = time.time() - started
            rate = idx / elapsed if elapsed > 0 else 0.0
            eta = ((total - idx) / rate) if rate > 0 else 0.0
            print(
                f"[live] reparse {idx}/{total} ok={ok} failed={failed} "
                f"elapsed={fmt_seconds(elapsed)} eta={fmt_seconds(eta)} rate={rate:.2f}/s"
            )

    conn.commit()
    return {"total": total, "ok": ok, "failed": failed}


def export_people(conn: sqlite3.Connection, out_path: str, out_format: str = "csv", min_rodden: Optional[str] = None) -> None:
    where = ""
    params: List[str] = []
    if min_rodden:
        # Simple ordinal filter for common Rodden values.
        order_map = {"AA": 5, "A": 4, "B": 3, "C": 2, "DD": 1, "X": 0}
        threshold = order_map.get(min_rodden.upper())
        if threshold is None:
            raise ValueError("Unsupported min_rodden; use one of AA,A,B,C,DD,X")
        conn.create_function("rodden_rank", 1, lambda v: order_map.get((v or "").upper(), -1))
        where = " WHERE rodden_rank(rodden_rating) >= ? "
        params.append(str(threshold))

    query = f"""
        SELECT p.*, GROUP_CONCAT(c.category, '; ') AS categories
        FROM people p
        LEFT JOIN categories c ON c.page_id = p.page_id
        {where}
        GROUP BY p.page_id
        ORDER BY p.title
    """
    rows = conn.execute(query, params).fetchall()
    path = Path(out_path)

    if out_format == "jsonl":
        with path.open("w", encoding="utf-8") as f:
            for r in rows:
                f.write(json.dumps(dict(r), ensure_ascii=False) + "\n")
        return

    if out_format != "csv":
        raise ValueError("format must be csv or jsonl")

    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys() if rows else [])
        writer.writeheader()
        for r in rows:
            writer.writerow(dict(r))


def summary(conn: sqlite3.Connection) -> Dict[str, object]:
    total_people = conn.execute("SELECT COUNT(*) FROM people").fetchone()[0]
    by_rodden = conn.execute(
        "SELECT COALESCE(rodden_rating, 'NULL') AS rr, COUNT(*) AS n FROM people GROUP BY rr ORDER BY n DESC"
    ).fetchall()
    top_categories = conn.execute(
        "SELECT category, COUNT(*) AS n FROM categories GROUP BY category ORDER BY n DESC LIMIT 20"
    ).fetchall()
    return {
        "total_people": total_people,
        "rodden_distribution": [dict(x) for x in by_rodden],
        "top_categories": [dict(x) for x in top_categories],
    }


def build_analytics(conn: sqlite3.Connection, rebuild: bool = False) -> Dict[str, int]:
    if rebuild:
        conn.execute("DELETE FROM category_segments")
        conn.execute("DELETE FROM people_analytics")

    rows = conn.execute(
        """
        SELECT
            p.page_id,
            p.title,
            p.name,
            p.rodden_rating,
            p.date_of_birth,
            p.time_of_birth,
            p.place_of_birth,
            p.gender,
            p.occupation,
            p.natal_chart_json,
            p.biography,
            p.source_notes,
            GROUP_CONCAT(c.category, '; ') AS categories
        FROM people p
        LEFT JOIN categories c ON c.page_id = p.page_id
        GROUP BY p.page_id
        """
    ).fetchall()

    inserted = 0
    seg_rows: List[Tuple[int, str, int, str]] = []
    for row in rows:
        cats_text = row["categories"] or ""
        cats = [c.strip() for c in cats_text.split(";") if c.strip()]

        year, month, day = parse_birth_date(row["date_of_birth"])
        hour, minute, minutes = parse_birth_time(row["time_of_birth"])
        place_norm, country_guess = normalize_place(row["place_of_birth"])
        g_norm = normalize_gender(row["gender"])
        o_norm = normalize_occupation(row["occupation"])
        natal_raw = row["natal_chart_json"]
        natal_points: List[str] = []
        if natal_raw:
            try:
                parsed_natal = json.loads(natal_raw)
                if isinstance(parsed_natal, dict):
                    natal_points = sorted(str(k) for k in parsed_natal.keys())
            except Exception:  # noqa: BLE001
                natal_points = []

        conn.execute(
            """
            INSERT INTO people_analytics(
                page_id, title, name,
                rodden_rating, rodden_rank,
                birth_date_raw, birth_year, birth_month, birth_day,
                birth_time_raw, birth_hour, birth_minute, birth_time_minutes,
                place_of_birth_raw, place_of_birth_norm, place_country_guess,
                gender_raw, gender_norm,
                occupation_raw, occupation_norm,
                natal_chart_json, natal_planets_count, natal_points,
                categories, categories_count,
                has_biography, has_source_notes,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(page_id) DO UPDATE SET
                title=excluded.title,
                name=excluded.name,
                rodden_rating=excluded.rodden_rating,
                rodden_rank=excluded.rodden_rank,
                birth_date_raw=excluded.birth_date_raw,
                birth_year=excluded.birth_year,
                birth_month=excluded.birth_month,
                birth_day=excluded.birth_day,
                birth_time_raw=excluded.birth_time_raw,
                birth_hour=excluded.birth_hour,
                birth_minute=excluded.birth_minute,
                birth_time_minutes=excluded.birth_time_minutes,
                place_of_birth_raw=excluded.place_of_birth_raw,
                place_of_birth_norm=excluded.place_of_birth_norm,
                place_country_guess=excluded.place_country_guess,
                gender_raw=excluded.gender_raw,
                gender_norm=excluded.gender_norm,
                occupation_raw=excluded.occupation_raw,
                occupation_norm=excluded.occupation_norm,
                natal_chart_json=excluded.natal_chart_json,
                natal_planets_count=excluded.natal_planets_count,
                natal_points=excluded.natal_points,
                categories=excluded.categories,
                categories_count=excluded.categories_count,
                has_biography=excluded.has_biography,
                has_source_notes=excluded.has_source_notes,
                updated_at=excluded.updated_at
            """,
            (
                row["page_id"],
                row["title"],
                row["name"],
                row["rodden_rating"],
                rodden_rank(row["rodden_rating"]),
                row["date_of_birth"],
                year,
                month,
                day,
                row["time_of_birth"],
                hour,
                minute,
                minutes,
                row["place_of_birth"],
                place_norm,
                country_guess,
                row["gender"],
                g_norm,
                row["occupation"],
                o_norm,
                natal_raw,
                len(natal_points),
                "; ".join(natal_points),
                "; ".join(cats),
                len(cats),
                1 if row["biography"] else 0,
                1 if row["source_notes"] else 0,
                utcnow(),
            ),
        )
        inserted += 1

        for cat in cats:
            segments = split_category_segments(cat)
            for idx, seg in enumerate(segments, start=1):
                seg_rows.append((row["page_id"], cat, idx, seg.lower()))

    if rebuild:
        conn.execute("DELETE FROM category_segments")
    conn.executemany(
        "INSERT OR REPLACE INTO category_segments(page_id, category, level, segment) VALUES (?, ?, ?, ?)",
        seg_rows,
    )
    conn.commit()

    return {
        "people_analytics_rows": inserted,
        "category_segments_rows": len(seg_rows),
    }


def export_analytics(conn: sqlite3.Connection, out_path: str, out_format: str = "csv", min_rodden: Optional[str] = None) -> None:
    where = ""
    params: List[object] = []
    if min_rodden:
        threshold = RODDEN_ORDER.get(min_rodden.upper())
        if threshold is None:
            raise ValueError("Unsupported min_rodden; use one of AA,A,B,C,DD,X")
        where = " WHERE pa.rodden_rank >= ? "
        params.append(threshold)

    query = f"""
        SELECT pa.*
        FROM people_analytics pa
        {where}
        ORDER BY pa.title
    """
    rows = conn.execute(query, params).fetchall()
    path = Path(out_path)

    if out_format == "jsonl":
        with path.open("w", encoding="utf-8") as f:
            for r in rows:
                f.write(json.dumps(dict(r), ensure_ascii=False) + "\n")
        return

    if out_format != "csv":
        raise ValueError("format must be csv or jsonl")

    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys() if rows else [])
        writer.writeheader()
        for r in rows:
            writer.writerow(dict(r))


def fts_search(conn: sqlite3.Connection, query: str, limit: int = 20) -> List[Dict[str, object]]:
    rows = conn.execute(
        """
        SELECT
            p.page_id,
            p.title,
            p.name,
            p.rodden_rating,
            snippet(people_fts, 4, '[', ']', ' ... ', 12) AS bio_snippet,
            snippet(people_fts, 5, '[', ']', ' ... ', 12) AS source_snippet
        FROM people_fts
        JOIN people p ON p.page_id = people_fts.rowid
        WHERE people_fts MATCH ?
        LIMIT ?
        """,
        (query, limit),
    ).fetchall()
    return [dict(r) for r in rows]


def cmd_init_db(args: argparse.Namespace) -> None:
    conn = connect_db(args.db)
    conn.close()
    print(f"Initialized: {args.db}")


def cmd_collect_all(args: argparse.Namespace) -> None:
    conn = connect_db(args.db)
    api = AstroAPI(api_url=args.api_url)
    n = collect_all(conn, api, limit=args.limit, sleep_s=args.sleep, live_log=args.live_log)
    conn.commit()
    print(json.dumps({"inserted_or_updated": n, **summary(conn)}, ensure_ascii=False, indent=2))
    conn.close()


def cmd_collect_category(args: argparse.Namespace) -> None:
    conn = connect_db(args.db)
    api = AstroAPI(api_url=args.api_url)
    n = collect_category(conn, api, category=args.category, limit=args.limit, sleep_s=args.sleep, live_log=args.live_log)
    conn.commit()
    print(json.dumps({"inserted_or_updated": n, **summary(conn)}, ensure_ascii=False, indent=2))
    conn.close()


def cmd_collect_search(args: argparse.Namespace) -> None:
    conn = connect_db(args.db)
    api = AstroAPI(api_url=args.api_url)
    n = collect_search(conn, api, query=args.query, limit=args.limit, sleep_s=args.sleep, live_log=args.live_log)
    conn.commit()
    print(json.dumps({"inserted_or_updated": n, **summary(conn)}, ensure_ascii=False, indent=2))
    conn.close()


def cmd_export(args: argparse.Namespace) -> None:
    conn = connect_db(args.db)
    export_people(conn, args.out, args.format, args.min_rodden)
    print(f"Exported to {args.out}")
    conn.close()


def cmd_summary(args: argparse.Namespace) -> None:
    conn = connect_db(args.db)
    print(json.dumps(summary(conn), ensure_ascii=False, indent=2))
    conn.close()


def cmd_build_analytics(args: argparse.Namespace) -> None:
    conn = connect_db(args.db)
    payload = build_analytics(conn, rebuild=args.rebuild)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    conn.close()


def cmd_export_analytics(args: argparse.Namespace) -> None:
    conn = connect_db(args.db)
    export_analytics(conn, args.out, args.format, args.min_rodden)
    print(f"Exported analytics to {args.out}")
    conn.close()


def cmd_fts_search(args: argparse.Namespace) -> None:
    conn = connect_db(args.db)
    rows = fts_search(conn, args.query, args.limit)
    print(json.dumps({"query": args.query, "count": len(rows), "rows": rows}, ensure_ascii=False, indent=2))
    conn.close()


def cmd_reparse_existing(args: argparse.Namespace) -> None:
    conn = connect_db(args.db)
    payload = reparse_existing(conn, limit=args.limit, live_log=args.live_log)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    conn.close()


def cmd_natal_stats(args: argparse.Namespace) -> None:
    conn = connect_db(args.db)
    rows = conn.execute("SELECT page_id, title, natal_chart_json FROM people").fetchall()
    total = len(rows)
    with_natal = 0
    with_major7 = 0
    point_counts: Dict[str, int] = {}
    samples: List[Dict[str, object]] = []

    for row in rows:
        raw = row["natal_chart_json"]
        if not raw:
            continue
        try:
            payload = json.loads(raw)
            if not isinstance(payload, dict) or not payload:
                continue
        except Exception:  # noqa: BLE001
            continue

        with_natal += 1
        points = sorted(str(k) for k in payload.keys())
        for p in points:
            point_counts[p] = point_counts.get(p, 0) + 1

        major_planets = {"sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"}
        if len(major_planets.intersection(set(points))) >= 7:
            with_major7 += 1

        if len(samples) < args.sample:
            samples.append(
                {
                    "page_id": row["page_id"],
                    "title": row["title"],
                    "points": points,
                    "natal": payload,
                }
            )

    top_points = sorted(point_counts.items(), key=lambda kv: (-kv[1], kv[0]))[:20]
    out = {
        "total_people": total,
        "with_natal_chart": with_natal,
        "coverage_pct": round((with_natal / total * 100.0), 2) if total else 0.0,
        "with_major7_planets": with_major7,
        "top_points": [{"point": p, "n": n} for p, n in top_points],
        "samples": samples,
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))
    conn.close()


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Astro-Databank collector")
    sub = p.add_subparsers(dest="cmd", required=True)

    p_init = sub.add_parser("init-db")
    p_init.add_argument("--db", required=True)
    p_init.set_defaults(func=cmd_init_db)

    for name in ["collect-all", "collect-category", "collect-search"]:
        sp = sub.add_parser(name)
        sp.add_argument("--db", required=True)
        sp.add_argument("--api-url", default=None)
        sp.add_argument("--limit", type=int, default=None)
        sp.add_argument("--sleep", type=float, default=1.0)
        sp.add_argument("--live-log", action="store_true")
        if name == "collect-category":
            sp.add_argument("--category", required=True)
        if name == "collect-search":
            sp.add_argument("--query", required=True)
        if name == "collect-all":
            sp.set_defaults(func=cmd_collect_all)
        elif name == "collect-category":
            sp.set_defaults(func=cmd_collect_category)
        else:
            sp.set_defaults(func=cmd_collect_search)

    p_export = sub.add_parser("export")
    p_export.add_argument("--db", required=True)
    p_export.add_argument("--out", required=True)
    p_export.add_argument("--format", choices=["csv", "jsonl"], default="csv")
    p_export.add_argument("--min-rodden", default=None)
    p_export.set_defaults(func=cmd_export)

    p_summary = sub.add_parser("summary")
    p_summary.add_argument("--db", required=True)
    p_summary.set_defaults(func=cmd_summary)

    p_build_analytics = sub.add_parser("build-analytics")
    p_build_analytics.add_argument("--db", required=True)
    p_build_analytics.add_argument("--rebuild", action="store_true")
    p_build_analytics.set_defaults(func=cmd_build_analytics)

    p_export_analytics = sub.add_parser("export-analytics")
    p_export_analytics.add_argument("--db", required=True)
    p_export_analytics.add_argument("--out", required=True)
    p_export_analytics.add_argument("--format", choices=["csv", "jsonl"], default="csv")
    p_export_analytics.add_argument("--min-rodden", default=None)
    p_export_analytics.set_defaults(func=cmd_export_analytics)

    p_fts = sub.add_parser("fts-search")
    p_fts.add_argument("--db", required=True)
    p_fts.add_argument("--query", required=True)
    p_fts.add_argument("--limit", type=int, default=20)
    p_fts.set_defaults(func=cmd_fts_search)

    p_reparse = sub.add_parser("reparse-existing")
    p_reparse.add_argument("--db", required=True)
    p_reparse.add_argument("--limit", type=int, default=None)
    p_reparse.add_argument("--live-log", action="store_true")
    p_reparse.set_defaults(func=cmd_reparse_existing)

    p_natal_stats = sub.add_parser("natal-stats")
    p_natal_stats.add_argument("--db", required=True)
    p_natal_stats.add_argument("--sample", type=int, default=10)
    p_natal_stats.set_defaults(func=cmd_natal_stats)

    return p


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    args.func(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
