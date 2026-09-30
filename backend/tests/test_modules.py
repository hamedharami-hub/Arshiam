"""Hidden modules: code redeem, install/uninstall, admin codes (uses a real Firebase test user)."""
import json
import os
from pathlib import Path

import pytest
import requests

BASE_URL = ""
for line in (Path(__file__).resolve().parents[2] / "frontend" / ".env").read_text().splitlines():
    if line.startswith(("EXPO_PUBLIC_BACKEND_URL=", "REACT_APP_BACKEND_URL=")):
        BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
API = f"{BASE_URL}/api/arsh"
FIREBASE_API_KEY = json.loads((Path(__file__).resolve().parents[2] / "firebase-applet-config.json").read_text())["apiKey"]
EMAIL, PASSWORD = "test.arshnaz@example.com", "Test123456"
MASTER = os.environ.get("ARSH_MASTER_UNLOCK_CODE", "ARSHNAZ-2026")


@pytest.fixture(scope="module")
def headers():
    r = requests.post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}",
        json={"email": EMAIL, "password": PASSWORD, "returnSecureToken": True}, timeout=30,
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['idToken']}"}


def test_requires_auth():
    assert requests.get(f"{API}/modules/me", timeout=20).status_code == 401


def test_redeem_install_uninstall(headers):
    bad = requests.post(f"{API}/modules/redeem", json={"code": "WRONG-CODE"}, headers=headers, timeout=20)
    assert bad.status_code == 400
    r = requests.post(f"{API}/modules/redeem", json={"code": MASTER.lower().replace("-", " ")}, headers=headers, timeout=20)
    assert r.status_code == 200, r.text
    assert set(r.json()["unlocked"]) == {"pharmacy", "study", "mind"}
    off = requests.post(f"{API}/modules/mind/uninstall", headers=headers, timeout=20).json()
    assert "mind" not in off["installed"] and "mind" in off["unlocked"]
    on = requests.post(f"{API}/modules/mind/install", headers=headers, timeout=20).json()
    assert "mind" in on["installed"]
    me = requests.get(f"{API}/modules/me", headers=headers, timeout=20).json()
    assert me["is_admin"] is True


def test_admin_codes(headers):
    c = requests.post(f"{API}/modules/admin/codes", json={"label": "pytest", "max_uses": 1}, headers=headers, timeout=20)
    assert c.status_code == 200, c.text
    body = c.json()
    assert body["code"].startswith("ARSH-")
    listed = requests.get(f"{API}/modules/admin/codes", headers=headers, timeout=20).json()["items"]
    assert any(i["id"] == body["id"] and "code" not in i for i in listed)
    rv = requests.post(f"{API}/modules/admin/codes/{body['id']}/revoke", json={"withdraw_access": False}, headers=headers, timeout=20)
    assert rv.status_code == 200
    again = requests.post(f"{API}/modules/redeem", json={"code": body["code"]}, headers=headers, timeout=20)
    assert again.status_code == 400


def test_google_status_not_configured(headers):
    s = requests.get(f"{API}/google/status", headers=headers, timeout=20).json()
    assert s["configured"] is False and s["connected"] is False
    assert requests.post(f"{API}/google/connect", json={"platform": "web"}, headers=headers, timeout=20).status_code == 503
