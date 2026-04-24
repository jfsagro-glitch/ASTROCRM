# ─── day_entries.py — Daily journal (morning/evening notes + mood) ──────────
# File-based JSON store (parallel to push_notifications storage pattern).
# No Postgres dependency — rows are keyed by (user_id, date).
# ENV:
#   JOURNAL_STORE_PATH — json-file path (default ./day_entries.json)
# ────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import json
import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

STORE_PATH = Path(os.environ.get("JOURNAL_STORE_PATH", "day_entries.json"))
_lock = threading.Lock()


# ─── Storage ─────────────────────────────────────────────────────────────────
def _load_all() -> list[dict[str, Any]]:
    if not STORE_PATH.exists():
        return []
    try:
        with STORE_PATH.open("r", encoding="utf-8") as f:
            return json.load(f) or []
    except Exception:
        return []


def _save_all(rows: list[dict[str, Any]]) -> None:
    tmp = STORE_PATH.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
    tmp.replace(STORE_PATH)


def _key(row: dict[str, Any]) -> tuple[str, str]:
    return (str(row.get("user_id") or ""), str(row.get("date") or ""))


# ─── Models ──────────────────────────────────────────────────────────────────
class DayEntry(BaseModel):
    user_id: Optional[str] = None
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD")
    morning_note: str = ""
    evening_note: str = ""
    mood: Optional[int] = Field(None, ge=1, le=5, description="1=ужасно … 5=отлично")
    gratitude: str = ""
    tags: list[str] = Field(default_factory=list)


class DayEntryStored(DayEntry):
    created_at: str
    updated_at: str


# ─── CRUD ────────────────────────────────────────────────────────────────────
def upsert_entry(entry: DayEntry) -> DayEntryStored:
    with _lock:
        rows = _load_all()
        now = datetime.now(timezone.utc).isoformat()
        k = (str(entry.user_id or ""), entry.date)
        existing: Optional[dict[str, Any]] = None
        kept: list[dict[str, Any]] = []
        for r in rows:
            if _key(r) == k:
                existing = r
            else:
                kept.append(r)
        merged: dict[str, Any] = {
            "user_id":      entry.user_id,
            "date":         entry.date,
            "morning_note": entry.morning_note,
            "evening_note": entry.evening_note,
            "mood":         entry.mood,
            "gratitude":    entry.gratitude,
            "tags":         list(entry.tags),
            "created_at":   (existing or {}).get("created_at", now),
            "updated_at":   now,
        }
        kept.append(merged)
        _save_all(kept)
        return DayEntryStored(**merged)


def get_entry(user_id: Optional[str], date: str) -> Optional[DayEntryStored]:
    k = (str(user_id or ""), date)
    for r in _load_all():
        if _key(r) == k:
            return DayEntryStored(**r)
    return None


def list_entries(
    user_id: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    limit: int = 90,
) -> list[DayEntryStored]:
    rows = _load_all()
    uid = str(user_id or "")
    if user_id is not None:
        rows = [r for r in rows if str(r.get("user_id") or "") == uid]
    if start:
        rows = [r for r in rows if r.get("date", "") >= start]
    if end:
        rows = [r for r in rows if r.get("date", "") <= end]
    rows.sort(key=lambda r: r.get("date", ""), reverse=True)
    return [DayEntryStored(**r) for r in rows[:limit]]


def delete_entry(user_id: Optional[str], date: str) -> int:
    with _lock:
        rows = _load_all()
        k = (str(user_id or ""), date)
        before = len(rows)
        rows = [r for r in rows if _key(r) != k]
        _save_all(rows)
        return before - len(rows)


# ─── Router ──────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/api/journal", tags=["journal"])


class ListQuery(BaseModel):
    user_id: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    limit: int = 90


@router.post("/upsert")
def api_upsert(entry: DayEntry) -> dict[str, Any]:
    try:
        stored = upsert_entry(entry)
        return {"ok": True, "entry": stored.model_dump()}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.get("/get")
def api_get(date: str, user_id: Optional[str] = None) -> dict[str, Any]:
    row = get_entry(user_id, date)
    return {"ok": True, "entry": (row.model_dump() if row else None)}


@router.get("/list")
def api_list(
    user_id: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    limit: int = 90,
) -> dict[str, Any]:
    rows = list_entries(user_id, start, end, limit)
    return {"ok": True, "entries": [r.model_dump() for r in rows], "total": len(rows)}


@router.delete("/delete")
def api_delete(date: str, user_id: Optional[str] = None) -> dict[str, Any]:
    removed = delete_entry(user_id, date)
    return {"ok": True, "removed": removed}


@router.get("/stats")
def api_stats(user_id: Optional[str] = None, days: int = 30) -> dict[str, Any]:
    """Простая сводка: средний mood за N дней, число записей, streak."""
    rows = list_entries(user_id, limit=days)
    moods = [r.mood for r in rows if r.mood is not None]
    avg_mood = (sum(moods) / len(moods)) if moods else None
    # streak: consecutive days with an entry ending today
    try:
        from datetime import date as _d, timedelta
        today = _d.today()
        dates = {r.date for r in rows}
        streak = 0
        cur = today
        while cur.isoformat() in dates:
            streak += 1
            cur -= timedelta(days=1)
    except Exception:
        streak = 0
    return {
        "ok":        True,
        "count":     len(rows),
        "avg_mood":  avg_mood,
        "streak":    streak,
        "window":    days,
    }
