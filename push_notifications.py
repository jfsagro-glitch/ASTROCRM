# ─── push_notifications.py — WebPush subscription storage + sender ──────────
# Простое файловое хранилище подписок (без Postgres/Redis):
# подписки пишутся в PUSH_STORE_PATH (json-файл). Для отправки используется
# pywebpush (optional import — если не установлен, /subscribe работает, а
# реальная отправка логируется как no-op). VAPID ключи берутся из env.
#
# ENV:
#   VAPID_PUBLIC_KEY   — base64url (публичный) — также отдаётся фронту
#   VAPID_PRIVATE_KEY  — base64url (приватный)
#   VAPID_SUBJECT      — "mailto:you@example.com"
#   PUSH_STORE_PATH    — путь к json-файлу (default ./push_subscriptions.json)
# ─────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import json
import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

# ─── Optional pywebpush import ───────────────────────────────────────────────
try:
    from pywebpush import WebPushException, webpush  # type: ignore
    _PYWEBPUSH_AVAILABLE = True
except Exception:
    webpush = None  # type: ignore
    WebPushException = Exception  # type: ignore
    _PYWEBPUSH_AVAILABLE = False

# ─── Config ──────────────────────────────────────────────────────────────────
STORE_PATH = Path(os.environ.get("PUSH_STORE_PATH", "push_subscriptions.json"))
SCHEDULE_PATH = Path(os.environ.get("PUSH_SCHEDULE_PATH", "push_schedule.json"))
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:admin@astrocrm.local")
PUSH_CRON_TOKEN = os.environ.get("PUSH_CRON_TOKEN", "")

_lock = threading.Lock()
_sched_lock = threading.Lock()

# ─── Storage helpers ─────────────────────────────────────────────────────────
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


def upsert_subscription(
    sub: dict[str, Any],
    user_id: Optional[str],
    prefs: Optional[dict[str, Any]] = None,
) -> None:
    with _lock:
        rows = _load_all()
        endpoint = sub.get("endpoint")
        if not endpoint:
            raise ValueError("subscription.endpoint missing")
        # preserve existing prefs if not supplied
        existing = next((r for r in rows if r.get("subscription", {}).get("endpoint") == endpoint), None)
        merged_prefs = (existing or {}).get("prefs") if existing else None
        if prefs is not None:
            merged_prefs = {**(merged_prefs or {}), **prefs}
        rows = [r for r in rows if r.get("subscription", {}).get("endpoint") != endpoint]
        rows.append({
            "user_id":      user_id,
            "subscription": sub,
            "prefs":        merged_prefs or {"morning_hour": 8, "morning_minute": 0, "tz_offset_min": 0, "enabled": True},
            "created_at":   datetime.now(timezone.utc).isoformat(),
        })
        _save_all(rows)


def update_prefs(endpoint: str, prefs: dict[str, Any]) -> bool:
    with _lock:
        rows = _load_all()
        found = False
        for r in rows:
            if r.get("subscription", {}).get("endpoint") == endpoint:
                r["prefs"] = {**(r.get("prefs") or {}), **prefs}
                found = True
                break
        if found:
            _save_all(rows)
        return found


def remove_subscription(endpoint: str) -> int:
    with _lock:
        rows = _load_all()
        before = len(rows)
        rows = [r for r in rows if r.get("subscription", {}).get("endpoint") != endpoint]
        _save_all(rows)
        return before - len(rows)


def list_subscriptions(user_id: Optional[str] = None) -> list[dict[str, Any]]:
    rows = _load_all()
    if user_id is not None:
        rows = [r for r in rows if r.get("user_id") == user_id]
    return rows


# ─── Schedule store ──────────────────────────────────────────────────────────
def _load_sched() -> list[dict[str, Any]]:
    if not SCHEDULE_PATH.exists():
        return []
    try:
        with SCHEDULE_PATH.open("r", encoding="utf-8") as f:
            return json.load(f) or []
    except Exception:
        return []


def _save_sched(rows: list[dict[str, Any]]) -> None:
    tmp = SCHEDULE_PATH.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
    tmp.replace(SCHEDULE_PATH)


def schedule_push(
    endpoint: str,
    fire_at_utc: str,
    payload: dict[str, Any],
    dedup_key: Optional[str] = None,
) -> dict[str, Any]:
    """Queue one push. dedup_key replaces an existing pending entry with the same key."""
    with _sched_lock:
        rows = _load_sched()
        if dedup_key:
            rows = [
                r for r in rows
                if not (r.get("endpoint") == endpoint and r.get("dedup_key") == dedup_key and r.get("status") == "pending")
            ]
        rows.append({
            "endpoint":    endpoint,
            "fire_at_utc": fire_at_utc,
            "payload":     payload,
            "dedup_key":   dedup_key,
            "status":      "pending",
            "created_at":  datetime.now(timezone.utc).isoformat(),
        })
        # cap history
        if len(rows) > 5000:
            rows = rows[-5000:]
        _save_sched(rows)
        return {"ok": True}


def _find_sub_by_endpoint(endpoint: str) -> Optional[dict[str, Any]]:
    for r in _load_all():
        if r.get("subscription", {}).get("endpoint") == endpoint:
            return r
    return None


def flush_due(now: Optional[datetime] = None, max_send: int = 200) -> dict[str, Any]:
    """Send all pending entries with fire_at_utc <= now. Returns summary."""
    now = now or datetime.now(timezone.utc)
    sent = failed = skipped = 0
    errors: list[str] = []
    with _sched_lock:
        rows = _load_sched()
    changed = False
    for row in rows:
        if row.get("status") != "pending":
            continue
        try:
            fire = datetime.fromisoformat(row["fire_at_utc"].replace("Z", "+00:00"))
        except Exception:
            row["status"] = "error"; row["error"] = "bad fire_at_utc"
            changed = True; continue
        if fire > now:
            continue
        if sent + failed >= max_send:
            break
        sub_row = _find_sub_by_endpoint(row.get("endpoint", ""))
        if not sub_row:
            row["status"] = "dropped"; row["error"] = "subscription not found"
            changed = True; skipped += 1; continue
        prefs = sub_row.get("prefs") or {}
        if prefs.get("enabled") is False:
            row["status"] = "skipped"; row["error"] = "disabled"
            changed = True; skipped += 1; continue
        p = row.get("payload") or {}
        res = send_push(
            sub_row["subscription"],
            title=p.get("title", "✦ Astro Daily"),
            body=p.get("body",  "Откройте дашборд"),
            url=p.get("url",   "/"),
            icon=p.get("icon"),
        )
        if res.get("ok"):
            row["status"] = "sent"; row["sent_at"] = now.isoformat()
            sent += 1
        else:
            row["status"] = "error"; row["error"] = res.get("error", "send failed")
            failed += 1
            if len(errors) < 5: errors.append(row["error"])
        changed = True
    if changed:
        with _sched_lock:
            _save_sched(rows)
    return {"sent": sent, "failed": failed, "skipped": skipped, "errors": errors}


# ─── Sender ──────────────────────────────────────────────────────────────────
def send_push(
    sub: dict[str, Any],
    title: str,
    body: str,
    url: str = "/",
    icon: Optional[str] = None,
) -> dict[str, Any]:
    """Send one notification. Returns {"ok": bool, "error": str?}."""
    if not _PYWEBPUSH_AVAILABLE:
        return {"ok": False, "error": "pywebpush not installed"}
    if not VAPID_PRIVATE_KEY:
        return {"ok": False, "error": "VAPID_PRIVATE_KEY not set"}

    payload = json.dumps({
        "title": title,
        "body":  body,
        "url":   url,
        "icon":  icon or "/icons/icon-192x192.png",
    }, ensure_ascii=False)

    try:
        webpush(
            subscription_info=sub,
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_SUBJECT},
        )
        return {"ok": True}
    except WebPushException as e:  # type: ignore[misc]
        # 410 Gone / 404 — подписка протухла, чистим
        resp = getattr(e, "response", None)
        code = getattr(resp, "status_code", None)
        if code in (404, 410):
            endpoint = sub.get("endpoint", "")
            if endpoint:
                remove_subscription(endpoint)
        return {"ok": False, "error": f"webpush:{code}:{e}"}
    except Exception as e:  # pragma: no cover
        return {"ok": False, "error": str(e)}


def broadcast(
    title: str,
    body: str,
    url: str = "/",
    user_id: Optional[str] = None,
) -> dict[str, Any]:
    """Send to all (optionally filtered by user_id). Returns summary."""
    subs = list_subscriptions(user_id=user_id)
    ok = fail = 0
    errors: list[str] = []
    for row in subs:
        res = send_push(row["subscription"], title, body, url)
        if res.get("ok"):
            ok += 1
        else:
            fail += 1
            err = res.get("error")
            if err and len(errors) < 5:
                errors.append(err)
    return {"sent": ok, "failed": fail, "total": len(subs), "errors": errors}


# ─── API router ──────────────────────────────────────────────────────────────
router = APIRouter(prefix="/api/push", tags=["push"])


class SubscribeBody(BaseModel):
    subscription: dict[str, Any] = Field(..., description="PushSubscription.toJSON()")
    user_id: Optional[str] = None
    prefs: Optional[dict[str, Any]] = None


class PrefsBody(BaseModel):
    endpoint: str
    morning_hour: Optional[int] = None       # 0..23 local
    morning_minute: Optional[int] = None     # 0..59
    tz_offset_min: Optional[int] = None      # JS Date.getTimezoneOffset() (negative east)
    enabled: Optional[bool] = None


class UnsubscribeBody(BaseModel):
    endpoint: str
    user_id: Optional[str] = None


class TestSendBody(BaseModel):
    user_id: Optional[str] = None
    title: str = "HOLO"
    body: str = "Тестовое уведомление"
    url: str = "/"


class ScheduleBody(BaseModel):
    endpoint: str
    fire_at_utc: str = Field(..., description="ISO-8601 UTC, e.g. 2026-04-27T05:00:00Z")
    title: str = "✦ Astro Daily"
    body: str = "Откройте дашборд"
    url: str = "/"
    dedup_key: Optional[str] = None  # replaces existing pending with same key


class TestNowBody(BaseModel):
    endpoint: str
    title: str = "✦ Astro Daily"
    body: str = "Тест: уведомления включены"
    url: str = "/"


@router.get("/vapid-public-key")
def get_vapid_public_key() -> dict[str, str]:
    return {"public_key": VAPID_PUBLIC_KEY}


@router.post("/subscribe")
def subscribe(body: SubscribeBody) -> dict[str, Any]:
    try:
        upsert_subscription(body.subscription, body.user_id, body.prefs)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/prefs")
def set_prefs(body: PrefsBody) -> dict[str, Any]:
    prefs: dict[str, Any] = {}
    if body.morning_hour   is not None: prefs["morning_hour"]   = max(0, min(23, body.morning_hour))
    if body.morning_minute is not None: prefs["morning_minute"] = max(0, min(59, body.morning_minute))
    if body.tz_offset_min  is not None: prefs["tz_offset_min"]  = body.tz_offset_min
    if body.enabled        is not None: prefs["enabled"]        = bool(body.enabled)
    if not prefs:
        raise HTTPException(400, "no prefs supplied")
    found = update_prefs(body.endpoint, prefs)
    if not found:
        raise HTTPException(404, "subscription not found")
    return {"ok": True, "prefs": prefs}


@router.post("/unsubscribe")
def unsubscribe(body: UnsubscribeBody) -> dict[str, Any]:
    removed = remove_subscription(body.endpoint)
    return {"ok": True, "removed": removed}


@router.post("/test-send")
def test_send(body: TestSendBody) -> dict[str, Any]:
    """DEV-only helper to fire a broadcast."""
    return broadcast(body.title, body.body, body.url, user_id=body.user_id)


@router.post("/schedule")
def schedule(body: ScheduleBody) -> dict[str, Any]:
    sub_row = _find_sub_by_endpoint(body.endpoint)
    if not sub_row:
        raise HTTPException(404, "subscription not found")
    return schedule_push(
        endpoint=body.endpoint,
        fire_at_utc=body.fire_at_utc,
        payload={"title": body.title, "body": body.body, "url": body.url},
        dedup_key=body.dedup_key,
    )


@router.post("/test-now")
def test_now(body: TestNowBody) -> dict[str, Any]:
    """Fire a single push immediately to one endpoint (used by 'send test' UI)."""
    sub_row = _find_sub_by_endpoint(body.endpoint)
    if not sub_row:
        raise HTTPException(404, "subscription not found")
    return send_push(sub_row["subscription"], title=body.title, body=body.body, url=body.url)


@router.post("/cron-tick")
def cron_tick(token: str = "") -> dict[str, Any]:
    """Flush due scheduled pushes. Protect with PUSH_CRON_TOKEN env if set."""
    if PUSH_CRON_TOKEN and token != PUSH_CRON_TOKEN:
        raise HTTPException(401, "invalid token")
    return flush_due()


@router.get("/status")
def status() -> dict[str, Any]:
    return {
        "pywebpush":        _PYWEBPUSH_AVAILABLE,
        "vapid_configured": bool(VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY),
        "subscriptions":    len(_load_all()),
        "store_path":       str(STORE_PATH),
    }
