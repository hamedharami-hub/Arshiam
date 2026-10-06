"""Hidden feature modules (e.g. Study, Mind) unlocked per account with an access code.

Codes are stored only as HMAC hashes. A code can unlock all modules ("*") or a list, with optional
max uses / expiry, and can be revoked (optionally withdrawing what it unlocked).
Per-user state lives in `user_modules`: {user_id, modules: {<id>: {unlocked_at, code_id, installed, installed_at}}}.
"""
import hashlib
import hmac
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import current_claims, current_user_id
from db import db

router = APIRouter(prefix="/modules", tags=["modules"])

MODULE_IDS = ["study", "mind"]
MAX_FAILED = 5
FAIL_WINDOW = timedelta(minutes=15)
_SECRET = os.environ["ARSH_SIGNING_SECRET"].encode()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_code(code: str) -> str:
    return re.sub(r"[\s\-_]", "", code).upper()


def hash_code(code: str) -> str:
    return hmac.new(_SECRET, f"module-code:{normalize_code(code)}".encode(), hashlib.sha256).hexdigest()


def _admin_emails() -> set[str]:
    return {e.strip().lower() for e in os.environ.get("ARSH_ADMIN_EMAILS", "").split(",") if e.strip()}


def is_admin(claims: dict) -> bool:
    return bool(claims.get("admin") is True or claims.get("role") == "admin"
                or (claims.get("email") or "").lower() in _admin_emails())


async def require_admin(claims: dict = Depends(current_claims)) -> dict:
    if not is_admin(claims):
        raise HTTPException(status_code=403, detail="Admin only")
    return claims


async def seed_master_code() -> None:
    code = os.environ.get("ARSH_MASTER_UNLOCK_CODE", "").strip()
    if not code:
        return
    await db.module_codes.update_one(
        {"code_hash": hash_code(code)},
        {"$setOnInsert": {
            "code_hash": hash_code(code), "label": "master", "modules": ["*"], "max_uses": None, "uses": 0,
            "expires_at": None, "revoked": False, "created_at": _now().isoformat(), "created_by": "env",
        }},
        upsert=True,
    )


async def _state(uid: str) -> dict:
    doc = await db.user_modules.find_one({"user_id": uid}, {"_id": 0}) or {}
    mods = doc.get("modules") or {}
    unlocked = [m for m in MODULE_IDS if m in mods]
    return {"unlocked": unlocked, "installed": [m for m in unlocked if mods[m].get("installed")]}


@router.get("/me")
async def my_modules(claims: dict = Depends(current_claims)):
    uid = claims.get("user_id") or claims.get("sub")
    return {"catalog": MODULE_IDS, **(await _state(uid)), "is_admin": is_admin(claims)}


class RedeemIn(BaseModel):
    code: str = Field(min_length=4, max_length=64)


@router.post("/redeem")
async def redeem(body: RedeemIn, uid: str = Depends(current_user_id)):
    since = (_now() - FAIL_WINDOW).isoformat()
    if await db.module_attempts.count_documents({"user_id": uid, "at": {"$gte": since}}) >= MAX_FAILED:
        raise HTTPException(status_code=429, detail="Too many wrong codes, try again in 15 minutes")
    code = await db.module_codes.find_one({"code_hash": hash_code(body.code)})
    now = _now()
    valid = bool(code) and not code.get("revoked") \
        and (not code.get("expires_at") or code["expires_at"] > now.isoformat()) \
        and (code.get("max_uses") is None or code.get("uses", 0) < code["max_uses"])
    if not valid:
        await db.module_attempts.insert_one({"user_id": uid, "at": now.isoformat()})
        raise HTTPException(status_code=400, detail="Invalid code")
    targets = MODULE_IDS if "*" in code["modules"] else [m for m in code["modules"] if m in MODULE_IDS]
    current = (await db.user_modules.find_one({"user_id": uid}) or {}).get("modules") or {}
    new = [m for m in targets if m not in current]
    updates = {f"modules.{m}": {"unlocked_at": now.isoformat(), "code_id": str(code["_id"]), "installed": True,
                                "installed_at": now.isoformat()} for m in new}
    if updates:
        await db.user_modules.update_one({"user_id": uid}, {"$set": {"user_id": uid, **updates}}, upsert=True)
        await db.module_codes.update_one({"_id": code["_id"]}, {"$inc": {"uses": 1}})
    await db.module_attempts.delete_many({"user_id": uid})
    return {"newly_unlocked": new, **(await _state(uid))}


async def _set_installed(uid: str, module_id: str, installed: bool) -> dict:
    if module_id not in MODULE_IDS:
        raise HTTPException(status_code=404, detail="Unknown module")
    res = await db.user_modules.update_one(
        {"user_id": uid, f"modules.{module_id}": {"$exists": True}},
        {"$set": {f"modules.{module_id}.installed": installed, f"modules.{module_id}.installed_at": _now().isoformat()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=403, detail="Module is not unlocked for this account")
    return await _state(uid)


@router.post("/{module_id}/install")
async def install(module_id: str, uid: str = Depends(current_user_id)):
    return await _set_installed(uid, module_id, True)


@router.post("/{module_id}/uninstall")
async def uninstall(module_id: str, uid: str = Depends(current_user_id)):
    return await _set_installed(uid, module_id, False)


# ---------------- Admin: access codes ----------------

class CodeIn(BaseModel):
    label: str = Field(min_length=1, max_length=80)
    modules: list[str] = Field(default_factory=lambda: ["*"])
    max_uses: Optional[int] = Field(default=None, ge=1, le=100000)
    expires_in_days: Optional[int] = Field(default=None, ge=1, le=3650)


def _code_public(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]), "label": doc.get("label"), "modules": doc.get("modules", []),
        "max_uses": doc.get("max_uses"), "uses": doc.get("uses", 0), "expires_at": doc.get("expires_at"),
        "revoked": bool(doc.get("revoked")), "created_at": doc.get("created_at"),
    }


@router.get("/admin/codes")
async def list_codes(_: dict = Depends(require_admin)):
    cursor = db.module_codes.find({}).sort("created_at", -1)
    return {"items": [_code_public(d) async for d in cursor]}


@router.post("/admin/codes")
async def create_code(body: CodeIn, claims: dict = Depends(require_admin)):
    modules = ["*"] if "*" in body.modules else [m for m in body.modules if m in MODULE_IDS]
    if not modules:
        raise HTTPException(status_code=400, detail="Choose at least one module")
    raw = "ARSH-" + "-".join(secrets.token_hex(2).upper() for _ in range(3))
    doc = {
        "code_hash": hash_code(raw), "label": body.label, "modules": modules, "max_uses": body.max_uses, "uses": 0,
        "expires_at": (_now() + timedelta(days=body.expires_in_days)).isoformat() if body.expires_in_days else None,
        "revoked": False, "created_at": _now().isoformat(), "created_by": claims.get("email") or claims.get("sub"),
    }
    res = await db.module_codes.insert_one(doc)
    doc["_id"] = res.inserted_id
    return {**_code_public(doc), "code": raw}


class RevokeIn(BaseModel):
    withdraw_access: bool = False


@router.post("/admin/codes/{code_id}/revoke")
async def revoke_code(code_id: str, body: RevokeIn, _: dict = Depends(require_admin)):
    from bson import ObjectId
    from bson.errors import InvalidId
    try:
        oid = ObjectId(code_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Code not found")
    res = await db.module_codes.update_one({"_id": oid}, {"$set": {"revoked": True, "revoked_at": _now().isoformat()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Code not found")
    withdrawn = 0
    if body.withdraw_access:
        for m in MODULE_IDS:
            r = await db.user_modules.update_many({f"modules.{m}.code_id": code_id}, {"$unset": {f"modules.{m}": ""}})
            withdrawn += r.modified_count
    return {"ok": True, "withdrawn": withdrawn}
