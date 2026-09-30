"""Backend regression tests for ARSHNAZ attachments router.

Covers:
- Health check
- Auth requirement on protected endpoints
- Signed upload flow (size, mime validation, PUT content)
- View URL signing (valid + invalid signature)
- List filtered by owner + task
- Soft delete
"""
import io
import json
import os
import struct
import zlib
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv

# Backend env has FIREBASE_PROJECT_ID etc.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
if not BASE_URL:
    # fallback to frontend/.env
    fenv = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    if fenv.exists():
        for line in fenv.read_text().splitlines():
            if line.startswith(("EXPO_PUBLIC_BACKEND_URL=", "REACT_APP_BACKEND_URL=")):
                BASE_URL = line.split("=", 1)[1].strip().strip('"')
                break
BASE_URL = (BASE_URL or "").rstrip("/")
API = f"{BASE_URL}/api/arsh"

FIREBASE_API_KEY = "AIzaSyBWVJ7J4xjgnxZ5mrCozVWUKWTTemGBggk"  # from /app/firebase-applet-config.json
TEST_EMAIL = "test.arshnaz@example.com"
TEST_PASSWORD = "Test123456"
TEST_TASK_ID = "TEST_backend_pytest_task"


def _tiny_png() -> bytes:
    """Generate a 1x1 red PNG (~70 bytes) without external deps."""
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    raw = b"\x00" + b"\xff\x00\x00"
    idat = zlib.compress(raw)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


@pytest.fixture(scope="module")
def id_token():
    r = requests.post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "returnSecureToken": True},
        timeout=15,
    )
    if r.status_code != 200:
        pytest.skip(f"Firebase sign-in failed: {r.status_code} {r.text[:200]}")
    return r.json()["idToken"]


@pytest.fixture(scope="module")
def auth_headers(id_token):
    return {"Authorization": f"Bearer {id_token}"}


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------------- Health ----------------
class TestHealth:
    def test_health(self, api_client):
        r = api_client.get(f"{API}/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("service") == "arshnaz"


# ---------------- Auth ----------------
class TestAuth:
    def test_sign_upload_requires_bearer(self, api_client):
        r = api_client.post(f"{API}/attachments/sign-upload", json={
            "task_id": TEST_TASK_ID, "file_name": "a.png", "mime_type": "image/png", "size_bytes": 10,
        })
        assert r.status_code == 401

    def test_list_requires_bearer(self, api_client):
        r = api_client.get(f"{API}/attachments", params={"task_id": TEST_TASK_ID})
        assert r.status_code == 401

    def test_delete_requires_bearer(self, api_client):
        r = api_client.delete(f"{API}/attachments/000000000000000000000000")
        assert r.status_code == 401

    def test_invalid_token_401(self, api_client):
        r = api_client.post(
            f"{API}/attachments/sign-upload",
            headers={"Authorization": "Bearer not-a-real-token"},
            json={"task_id": TEST_TASK_ID, "file_name": "a.png", "mime_type": "image/png", "size_bytes": 10},
        )
        assert r.status_code == 401


# ---------------- Validation ----------------
class TestValidation:
    def test_reject_over_25mb(self, api_client, auth_headers):
        r = api_client.post(f"{API}/attachments/sign-upload", headers=auth_headers, json={
            "task_id": TEST_TASK_ID, "file_name": "big.png", "mime_type": "image/png", "size_bytes": 26 * 1024 * 1024,
        })
        assert r.status_code == 413

    def test_reject_disallowed_mime(self, api_client, auth_headers):
        r = api_client.post(f"{API}/attachments/sign-upload", headers=auth_headers, json={
            "task_id": TEST_TASK_ID, "file_name": "evil.exe", "mime_type": "application/x-msdownload", "size_bytes": 100,
        })
        assert r.status_code == 415


# ---------------- Full upload/list/view/delete ----------------
class TestUploadFlow:
    created_id = None
    view_url = None

    def test_full_flow_and_isolation(self, api_client, auth_headers, id_token):
        png = _tiny_png()
        # 1) sign-upload
        r = api_client.post(f"{API}/attachments/sign-upload", headers=auth_headers, json={
            "task_id": TEST_TASK_ID, "file_name": "TEST_pixel.png", "mime_type": "image/png", "size_bytes": len(png),
        })
        assert r.status_code == 200, r.text
        sign = r.json()
        assert "upload_url" in sign and "attachment_id" in sign
        assert sign["max_bytes"] == 25 * 1024 * 1024
        att_id = sign["attachment_id"]
        TestUploadFlow.created_id = att_id

        # 2) PUT the bytes (upload_url does NOT need auth header)
        upload_url = BASE_URL + sign["upload_url"]
        put = requests.put(upload_url, data=png, headers={"Content-Type": "image/png"}, timeout=30)
        assert put.status_code == 200, put.text
        pub = put.json()
        assert pub["id"] == att_id
        assert pub["status"] == "ready"
        assert pub["kind"] == "image"
        assert pub["mime_type"] == "image/png"
        assert pub["size_bytes"] == len(png)
        assert pub["view_url"].startswith("/api/arsh/attachments/")
        TestUploadFlow.view_url = BASE_URL + pub["view_url"]

        # 3) list contains it
        lst = api_client.get(f"{API}/attachments", headers=auth_headers, params={"task_id": TEST_TASK_ID})
        assert lst.status_code == 200
        items = lst.json()["items"]
        assert any(it["id"] == att_id for it in items)

        # 4) view URL fetches bytes without auth header
        view = requests.get(TestUploadFlow.view_url, timeout=15)
        assert view.status_code == 200
        assert view.content == png
        assert view.headers.get("content-type", "").startswith("image/png")

        # 5) invalid signature -> 403
        bad = TestUploadFlow.view_url.rsplit("sig=", 1)[0] + "sig=deadbeef"
        bad_r = requests.get(bad, timeout=15)
        assert bad_r.status_code == 403

        # 6) list with unrelated task returns no items for this attachment
        other = api_client.get(f"{API}/attachments", headers=auth_headers, params={"task_id": "TEST_other_task"})
        assert other.status_code == 200
        assert not any(it["id"] == att_id for it in other.json()["items"])

    def test_delete_soft_removes(self, api_client, auth_headers):
        att_id = TestUploadFlow.created_id
        assert att_id, "prior test must have created an attachment"

        d = api_client.delete(f"{API}/attachments/{att_id}", headers=auth_headers)
        assert d.status_code == 200
        assert d.json()["ok"] is True

        # no longer in list
        lst = api_client.get(f"{API}/attachments", headers=auth_headers, params={"task_id": TEST_TASK_ID})
        assert lst.status_code == 200
        assert not any(it["id"] == att_id for it in lst.json()["items"])

        # view_url now 404 (soft delete: status != ready)
        view = requests.get(TestUploadFlow.view_url, timeout=15)
        assert view.status_code == 404

        # second delete -> 404
        d2 = api_client.delete(f"{API}/attachments/{att_id}", headers=auth_headers)
        assert d2.status_code == 404
