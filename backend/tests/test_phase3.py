"""Phase 3 backend tests: /holidays/au, /weather, /geocode.

These live endpoints hit external APIs (Nager.Date, Open-Meteo) with MongoDB caching.
Use the same BASE_URL as attachments tests. Tests are read-only for holidays/weather;
they just verify shape and caching semantics.
"""
import os
import time

import pytest
import requests

BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "http://localhost:8001").rstrip("/")
ARSH = f"{BASE_URL}/api/arsh"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# ----------------------------- holidays -----------------------------
class TestHolidaysAU:
    def test_nsw_2026_contains_national_and_nsw_only(self, s):
        r = s.get(f"{ARSH}/holidays/au", params={"year": 2026, "state": "NSW"}, timeout=25)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["year"] == 2026
        assert data["state"] == "NSW"
        assert "items" in data and isinstance(data["items"], list)
        assert "synced_at" in data and data["synced_at"]
        dates = {(h["date"], h["name"]) for h in data["items"]}
        # Australia Day is national
        assert any(d == "2026-01-26" for d, _ in dates), f"missing Australia Day: {dates}"
        # NSW Labour Day is first Monday of October = 2026-10-05
        assert any(d == "2026-10-05" for d, _ in dates), f"missing NSW Labour Day: {dates}"
        # WA Labour Day (first Monday of March) MUST NOT appear when state=NSW
        wa_labour = [h for h in data["items"] if h["date"] == "2026-03-02"]
        assert not wa_labour, f"WA-only holiday leaked into NSW: {wa_labour}"
        # region check: national items have region None, NSW-only items have region NSW
        for h in data["items"]:
            if h["national"]:
                assert h["region"] is None
            else:
                assert h["region"] == "NSW"

    def test_empty_state_returns_national_only(self, s):
        r = s.get(f"{ARSH}/holidays/au", params={"year": 2026, "state": ""}, timeout=25)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["state"] is None
        assert all(h["national"] for h in data["items"]), \
            f"non-national leaked when state empty: {[h for h in data['items'] if not h['national']]}"

    def test_unknown_state_400(self, s):
        r = s.get(f"{ARSH}/holidays/au", params={"year": 2026, "state": "XX"}, timeout=15)
        assert r.status_code == 400, r.text

    def test_cached_synced_at_stable(self, s):
        r1 = s.get(f"{ARSH}/holidays/au", params={"year": 2026, "state": "NSW"}, timeout=25)
        r2 = s.get(f"{ARSH}/holidays/au", params={"year": 2026, "state": "NSW"}, timeout=25)
        assert r1.status_code == 200 and r2.status_code == 200
        # synced_at should not change between two back-to-back calls (cached in Mongo)
        assert r1.json()["synced_at"] == r2.json()["synced_at"]


# ----------------------------- weather -----------------------------
class TestWeather:
    def test_sydney_current_hourly_daily(self, s):
        r = s.get(f"{ARSH}/weather", params={"lat": -33.87, "lon": 151.21}, timeout=25)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["timezone"] == "Australia/Sydney", f"unexpected tz: {d.get('timezone')}"
        assert "current" in d and d["current"] is not None
        assert "hourly" in d and "time" in d["hourly"]
        assert 150 <= len(d["hourly"]["time"]) <= 250, f"hourly points: {len(d['hourly']['time'])}"
        assert "daily" in d and len(d["daily"]["time"]) == 8
        assert "fetched_at" in d and d["fetched_at"]

    def test_weather_second_call_cached(self, s):
        # first call to warm the cache
        s.get(f"{ARSH}/weather", params={"lat": -33.87, "lon": 151.21}, timeout=25)
        time.sleep(0.3)
        r = s.get(f"{ARSH}/weather", params={"lat": -33.87, "lon": 151.21}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("cached") is True

    def test_weather_invalid_lat_422(self, s):
        r = s.get(f"{ARSH}/weather", params={"lat": 200, "lon": 0}, timeout=10)
        assert r.status_code == 422, r.text


# ----------------------------- geocode -----------------------------
class TestGeocode:
    def test_geocode_sydney(self, s):
        r = s.get(f"{ARSH}/geocode", params={"q": "Sydney"}, timeout=15)
        assert r.status_code == 200, r.text
        items = r.json()["items"]
        assert len(items) >= 1
        first = items[0]
        assert "lat" in first and "lon" in first
        assert isinstance(first["lat"], (int, float)) and isinstance(first["lon"], (int, float))

    def test_geocode_short_query_422(self, s):
        r = s.get(f"{ARSH}/geocode", params={"q": "a"}, timeout=10)
        assert r.status_code == 422, r.text
