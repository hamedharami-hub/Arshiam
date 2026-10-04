"""Weather (Open-Meteo) + city geocoding, cached in MongoDB.

Cache key = lat/lon rounded to 2 decimals (~1 km). Entries are fresh for 30 minutes;
if Open-Meteo is unreachable the last cached copy is returned with stale=true.
"""
import logging
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, HTTPException, Query

from db import db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["weather"])

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
FRESH_FOR = timedelta(minutes=30)


def _key(lat: float, lon: float) -> str:
    return f"{round(lat, 2):.2f},{round(lon, 2):.2f}"


@router.get("/weather")
async def get_weather(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)):
    key = _key(lat, lon)
    now = datetime.now(timezone.utc)
    cached = await db.weather_cache.find_one({"key": key}, {"_id": 0})
    if cached and datetime.fromisoformat(cached["fetched_at"]) > now - FRESH_FOR:
        return {**cached["payload"], "fetched_at": cached["fetched_at"], "stale": False, "cached": True}
    params = {
        "latitude": round(lat, 2),
        "longitude": round(lon, 2),
        "hourly": "temperature_2m,weather_code,precipitation_probability,wind_speed_10m",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
        "current": "temperature_2m,weather_code,apparent_temperature,wind_speed_10m",
        "forecast_days": 8,
        "timezone": "auto",
    }
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.get(FORECAST_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        logger.warning("open-meteo failed: %s", exc)
        if cached:
            return {**cached["payload"], "fetched_at": cached["fetched_at"], "stale": True, "cached": True}
        raise HTTPException(status_code=502, detail="Weather service unavailable")
    payload = {
        "timezone": data.get("timezone"),
        "utc_offset_seconds": data.get("utc_offset_seconds"),
        "current": data.get("current"),
        "hourly": data.get("hourly"),
        "daily": data.get("daily"),
    }
    fetched_at = now.isoformat()
    await db.weather_cache.update_one({"key": key}, {"$set": {"key": key, "payload": payload, "fetched_at": fetched_at}}, upsert=True)
    return {**payload, "fetched_at": fetched_at, "stale": False, "cached": False}


@router.get("/geocode")
async def geocode(q: str = Query(..., min_length=2, max_length=80), lang: str = "en"):
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(GEOCODE_URL, params={"name": q, "count": 8, "language": lang[:2], "format": "json"})
            resp.raise_for_status()
            results = resp.json().get("results") or []
    except Exception as exc:
        logger.warning("geocode failed: %s", exc)
        raise HTTPException(status_code=502, detail="Geocoding unavailable")
    return {
        "items": [
            {
                "name": r.get("name"),
                "admin1": r.get("admin1"),
                "country": r.get("country"),
                "country_code": r.get("country_code"),
                "lat": r.get("latitude"),
                "lon": r.get("longitude"),
                "timezone": r.get("timezone"),
            }
            for r in results
        ]
    }
