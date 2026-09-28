"""Australian public holidays synced from Nager.Date and cached in MongoDB (refreshed weekly).

GET /holidays/au?year=2026&state=NSW  -> national holidays + those of the chosen state.
state may be empty -> national only.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Query

from db import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/holidays", tags=["holidays"])

NAGER_URL = "https://date.nager.at/api/v3/PublicHolidays/{year}/AU"
STATES = {"NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"}
REFRESH_EVERY = timedelta(days=7)


async def _year_holidays(year: int) -> tuple[list, str, bool]:
    now = datetime.now(timezone.utc)
    cached = await db.holiday_cache.find_one({"key": f"AU:{year}"}, {"_id": 0})
    if cached and datetime.fromisoformat(cached["synced_at"]) > now - REFRESH_EVERY:
        return cached["items"], cached["synced_at"], False
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.get(NAGER_URL.format(year=year))
            resp.raise_for_status()
            items = resp.json()
    except Exception as exc:
        logger.warning("nager sync failed: %s", exc)
        if cached:
            return cached["items"], cached["synced_at"], True
        raise HTTPException(status_code=502, detail="Holiday service unavailable")
    synced_at = now.isoformat()
    await db.holiday_cache.update_one({"key": f"AU:{year}"}, {"$set": {"key": f"AU:{year}", "items": items, "synced_at": synced_at}}, upsert=True)
    return items, synced_at, False


@router.get("/au")
async def au_holidays(year: int = Query(..., ge=2000, le=2100), state: Optional[str] = None):
    st = (state or "").upper().strip()
    if st and st not in STATES:
        raise HTTPException(status_code=400, detail="Unknown state")
    items, synced_at, stale = await _year_holidays(year)
    out = []
    for h in items:
        counties = h.get("counties") or []
        national = bool(h.get("global")) or not counties
        if not national and (not st or f"AU-{st}" not in counties):
            continue
        out.append({
            "date": h["date"],
            "name": h.get("name"),
            "local_name": h.get("localName"),
            "national": national,
            "region": None if national else st,
            "types": h.get("types") or [],
        })
    return {"year": year, "state": st or None, "items": out, "synced_at": synced_at, "stale": stale}
