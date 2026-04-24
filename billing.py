# ─── billing.py — Subscription/entitlement scaffold (YooKassa/SBP-ready) ────
# File-based JSON store for entitlements (parallel to push_notifications +
# day_entries pattern). Ready to plug into YooKassa / Tinkoff SBP webhooks
# later — POST /webhook principals + signature check added as stubs.
#
# Tiers:
#   free — базовый дашборд
#   pro  — расширенные эпики (Firdaria sub-period, Returns timeline,
#          Journal history > 30 дней, push-уведомления без задержки)
#
# ENV:
#   BILLING_STORE_PATH   — json-file (default ./billing.json)
#   YOOKASSA_SECRET      — optional; if set, webhook verifies signature
# ────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import json
import os
import threading
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Literal, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

STORE_PATH = Path(os.environ.get("BILLING_STORE_PATH", "billing.json"))
YOOKASSA_SECRET = os.environ.get("YOOKASSA_SECRET", "")

_lock = threading.Lock()

Tier = Literal["free", "pro"]


# ─── Storage ─────────────────────────────────────────────────────────────────
def _load() -> dict[str, Any]:
    if not STORE_PATH.exists():
        return {"entitlements": [], "events": []}
    try:
        with STORE_PATH.open("r", encoding="utf-8") as f:
            return json.load(f) or {"entitlements": [], "events": []}
    except Exception:
        return {"entitlements": [], "events": []}


def _save(data: dict[str, Any]) -> None:
    tmp = STORE_PATH.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    tmp.replace(STORE_PATH)


# ─── Models ──────────────────────────────────────────────────────────────────
class Entitlement(BaseModel):
    user_id: str
    tier: Tier = "free"
    valid_until: Optional[str] = None   # ISO-date; None = lifetime (pro) or N/A (free)
    source: Optional[str] = None        # "yookassa" | "tinkoff" | "manual" | "trial"
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class GrantRequest(BaseModel):
    user_id: str
    tier: Tier
    days: int = 30
    source: str = "manual"


# ─── Helpers ─────────────────────────────────────────────────────────────────
def _now() -> datetime:
    return datetime.now(timezone.utc)


def _is_active(ent: dict[str, Any]) -> bool:
    if ent.get("tier") != "pro":
        return False
    vu = ent.get("valid_until")
    if not vu:
        return True  # lifetime
    try:
        return datetime.fromisoformat(vu) > _now()
    except Exception:
        return False


def get_entitlement(user_id: str) -> Entitlement:
    data = _load()
    for e in data.get("entitlements", []):
        if str(e.get("user_id") or "") == str(user_id):
            # downgrade expired pro to free
            if e.get("tier") == "pro" and not _is_active(e):
                e["tier"] = "free"
            return Entitlement(**{k: e.get(k) for k in ("user_id","tier","valid_until","source","updated_at")})
    return Entitlement(user_id=user_id, tier="free")


def upsert_entitlement(ent: Entitlement) -> Entitlement:
    with _lock:
        data = _load()
        rows: list[dict[str, Any]] = data.get("entitlements", []) or []
        rows = [r for r in rows if str(r.get("user_id") or "") != str(ent.user_id)]
        rows.append(ent.model_dump())
        data["entitlements"] = rows
        _save(data)
    return ent


def grant_pro(user_id: str, days: int = 30, source: str = "manual") -> Entitlement:
    existing = get_entitlement(user_id)
    base = _now()
    if existing.tier == "pro" and existing.valid_until:
        try:
            cur_end = datetime.fromisoformat(existing.valid_until)
            if cur_end > base:
                base = cur_end  # extend
        except Exception:
            pass
    new_end = (base + timedelta(days=days)).isoformat()
    return upsert_entitlement(Entitlement(
        user_id=user_id, tier="pro", valid_until=new_end, source=source,
        updated_at=_now().isoformat(),
    ))


def revoke_pro(user_id: str, reason: str = "refund") -> Entitlement:
    return upsert_entitlement(Entitlement(
        user_id=user_id, tier="free", valid_until=None, source=reason,
        updated_at=_now().isoformat(),
    ))


def _log_event(kind: str, payload: dict[str, Any]) -> None:
    with _lock:
        data = _load()
        events: list[dict[str, Any]] = data.get("events", []) or []
        events.append({
            "kind":      kind,
            "at":        _now().isoformat(),
            "payload":   payload,
        })
        data["events"] = events[-500:]  # keep last 500
        _save(data)


# ─── Router ──────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/api/billing", tags=["billing"])


@router.get("/entitlement")
def api_entitlement(user_id: str) -> dict[str, Any]:
    ent = get_entitlement(user_id)
    return {"ok": True, "entitlement": ent.model_dump(), "is_pro": ent.tier == "pro"}


@router.get("/plans")
def api_plans() -> dict[str, Any]:
    """Описание тарифов — фронт берёт лейблы/цены отсюда."""
    return {
        "ok": True,
        "plans": [
            {
                "id":       "free",
                "name":     "Free",
                "price":    0,
                "currency": "RUB",
                "period":   "∞",
                "features": [
                    "Ежедневный дашборд",
                    "Натальная карта",
                    "Базовый прогноз",
                ],
            },
            {
                "id":       "pro_month",
                "name":     "Pro",
                "price":    490,
                "currency": "RUB",
                "period":   "30 дней",
                "features": [
                    "Всё из Free",
                    "Фирдарий суб-периоды + практики",
                    "Solar/Lunar Return timeline",
                    "Дневник — вся история без лимита",
                    "Push-уведомления в реальном времени",
                    "Компенсирующие практики",
                ],
                "sbp":      True,
            },
            {
                "id":       "pro_year",
                "name":     "Pro · Год",
                "price":    3990,
                "currency": "RUB",
                "period":   "365 дней",
                "features": ["Всё из Pro · экономия ~32%"],
                "sbp":      True,
                "badge":    "Выгодно",
            },
        ],
    }


@router.post("/grant")
def api_grant(req: GrantRequest) -> dict[str, Any]:
    """Manual grant — для админ-утилит, триалов, рекомпенсаций.
    Не для прод-пуб.биллинга! (авторизация не настроена).
    """
    ent = grant_pro(req.user_id, days=req.days, source=req.source) if req.tier == "pro" \
          else revoke_pro(req.user_id, reason=req.source)
    _log_event("grant", {"user_id": req.user_id, "tier": req.tier, "days": req.days, "source": req.source})
    return {"ok": True, "entitlement": ent.model_dump()}


# ─── Webhook stubs (to be wired with YooKassa / Tinkoff SBP later) ───────────
@router.post("/webhook/yookassa")
async def yookassa_webhook(request: Request) -> dict[str, Any]:
    """Stub: принимает событие YooKassa и выдаёт Pro при succeeded-payment.
    TODO: верифицировать подпись через YOOKASSA_SECRET перед продом.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(400, "invalid json")
    _log_event("yookassa", payload)
    event = str(payload.get("event") or "")
    obj = payload.get("object") or {}
    status = str(obj.get("status") or "")
    meta = obj.get("metadata") or {}
    user_id = str(meta.get("user_id") or "")
    plan = str(meta.get("plan") or "pro_month")
    if event == "payment.succeeded" and status == "succeeded" and user_id:
        days = 365 if plan == "pro_year" else 30
        grant_pro(user_id, days=days, source="yookassa")
        return {"ok": True, "granted": True, "user_id": user_id, "days": days}
    if event == "refund.succeeded" and user_id:
        revoke_pro(user_id, reason="refund")
        return {"ok": True, "revoked": True}
    return {"ok": True, "ignored": True}


@router.get("/status")
def api_status() -> dict[str, Any]:
    data = _load()
    return {
        "ok":         True,
        "users":      len(data.get("entitlements", []) or []),
        "events":     len(data.get("events", []) or []),
        "yookassa":   bool(YOOKASSA_SECRET),
        "store_path": str(STORE_PATH),
    }
