"""Google Drive + Google Photos (Picker API) link for ARSHNAZ.

OAuth (authorization code, offline) -> tokens encrypted (Fernet) in Mongo `google_tokens`.
Drive:  Google Picker (web) picks file ids -> /google/drive/import copies them into app Object Storage.
        /google/drive/upload copies an app attachment into the user's "Arshnaz" Drive folder.
Photos: /google/photos/session -> user picks in Google's own UI -> /google/photos/import copies into Object Storage.
"""
import base64
import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Literal, Optional
from urllib.parse import urlencode

import jwt
import requests
from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from attachments import MAX_BYTES, Attachment, _now, _oid, _public, kind_for, validate_upload
from auth import current_user_id
from db import db
from signing import sign, verify
from storage import APP_NAME, StorageError, get_object, put_object

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/google", tags=["google"])

SCOPES = [
    "openid",
    "email",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/photospicker.mediaitems.readonly",
]
REQUIRED_SCOPES = {SCOPES[2], SCOPES[3]}
TOKEN_URL = "https://oauth2.googleapis.com/token"
DRIVE = "https://www.googleapis.com/drive/v3"
DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3"
PHOTOS = "https://photospicker.googleapis.com/v1"
DRIVE_FOLDER = "Arshnaz"
FERNET = Fernet(os.environ["ARSH_TOKEN_KEY"].encode())


def _cfg(name: str) -> str:
    return (os.environ.get(name) or "").strip()


def is_configured() -> bool:
    return all(_cfg(k) for k in ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"))


def _require_configured() -> None:
    if not is_configured():
        raise HTTPException(status_code=503, detail="Google integration is not configured on the server yet")


def _enc(value: Optional[str]) -> Optional[str]:
    return FERNET.encrypt(value.encode()).decode() if value else None


def _dec(value: Optional[str]) -> Optional[str]:
    return FERNET.decrypt(value.encode()).decode() if value else None


# ---------------- OAuth ----------------

class ConnectIn(BaseModel):
    platform: Literal["web", "android"] = "web"


def _state_for(uid: str, platform: str) -> str:
    exp, sig = sign("google-oauth", f"{uid}:{platform}", 600)
    raw = json.dumps({"u": uid, "p": platform, "e": exp, "s": sig}).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _parse_state(state: str) -> tuple[str, str]:
    try:
        data = json.loads(base64.urlsafe_b64decode(state + "=" * (-len(state) % 4)))
        uid, platform, exp, sig = data["u"], data["p"], int(data["e"]), data["s"]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    if not verify("google-oauth", f"{uid}:{platform}", exp, sig):
        raise HTTPException(status_code=400, detail="OAuth state expired, please connect again")
    return uid, platform


@router.get("/status")
async def status(uid: str = Depends(current_user_id)):
    doc = await db.google_tokens.find_one({"user_id": uid}, {"_id": 0, "email": 1, "scopes": 1, "connected_at": 1})
    return {
        "configured": is_configured(),
        "picker_ready": is_configured() and bool(_cfg("GOOGLE_API_KEY")) and bool(_cfg("GOOGLE_PROJECT_NUMBER")),
        "connected": bool(doc),
        "email": (doc or {}).get("email"),
        "connected_at": (doc or {}).get("connected_at"),
    }


@router.post("/connect")
async def connect(body: ConnectIn, uid: str = Depends(current_user_id)):
    _require_configured()
    params = {
        "client_id": _cfg("GOOGLE_CLIENT_ID"),
        "redirect_uri": _cfg("GOOGLE_REDIRECT_URI"),
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
        "state": _state_for(uid, body.platform),
    }
    return {"authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)}


def _finish_redirect(platform: str, result: str) -> RedirectResponse:
    if platform == "android":
        return RedirectResponse(f"arshnaz://google-connected?result={result}")
    return RedirectResponse(f"{_cfg('ARSH_FRONTEND_URL')}/app/settings?google={result}")


@router.get("/callback")
async def callback(state: str = Query(...), code: Optional[str] = None, error: Optional[str] = None):
    uid, platform = _parse_state(state)
    if error or not code:
        return _finish_redirect(platform, "cancelled")
    _require_configured()
    resp = await run_in_threadpool(requests.post, TOKEN_URL, data={
        "code": code,
        "client_id": _cfg("GOOGLE_CLIENT_ID"),
        "client_secret": _cfg("GOOGLE_CLIENT_SECRET"),
        "redirect_uri": _cfg("GOOGLE_REDIRECT_URI"),
        "grant_type": "authorization_code",
    }, timeout=30)
    if resp.status_code != 200:
        logger.error("google token exchange failed %s", resp.status_code)
        return _finish_redirect(platform, "failed")
    tok = resp.json()
    granted = set((tok.get("scope") or "").split())
    if not REQUIRED_SCOPES.issubset(granted):
        return _finish_redirect(platform, "missing_scopes")
    email = None
    if tok.get("id_token"):
        email = jwt.decode(tok["id_token"], options={"verify_signature": False}).get("email")
    await db.google_tokens.update_one({"user_id": uid}, {"$set": {
        "user_id": uid,
        "email": email,
        "access_token": _enc(tok["access_token"]),
        "refresh_token": _enc(tok.get("refresh_token")),
        "expires_at": int(time.time()) + int(tok.get("expires_in", 3600)) - 60,
        "scopes": sorted(granted),
        "connected_at": _now(),
    }}, upsert=True)
    return _finish_redirect(platform, "connected")


async def _access_token(uid: str) -> str:
    doc = await db.google_tokens.find_one({"user_id": uid})
    if not doc:
        raise HTTPException(status_code=409, detail="Google account is not connected")
    if doc.get("expires_at", 0) > time.time():
        return _dec(doc["access_token"])
    refresh = _dec(doc.get("refresh_token"))
    if not refresh:
        raise HTTPException(status_code=409, detail="Google access expired, please reconnect")
    resp = await run_in_threadpool(requests.post, TOKEN_URL, data={
        "client_id": _cfg("GOOGLE_CLIENT_ID"),
        "client_secret": _cfg("GOOGLE_CLIENT_SECRET"),
        "refresh_token": refresh,
        "grant_type": "refresh_token",
    }, timeout=30)
    if resp.status_code != 200:
        await db.google_tokens.delete_one({"user_id": uid})
        raise HTTPException(status_code=409, detail="Google access was revoked, please reconnect")
    tok = resp.json()
    await db.google_tokens.update_one({"user_id": uid}, {"$set": {
        "access_token": _enc(tok["access_token"]),
        "expires_at": int(time.time()) + int(tok.get("expires_in", 3600)) - 60,
    }})
    return tok["access_token"]


@router.post("/disconnect")
async def disconnect(uid: str = Depends(current_user_id)):
    doc = await db.google_tokens.find_one({"user_id": uid})
    if doc:
        token = _dec(doc.get("refresh_token")) or _dec(doc.get("access_token"))
        try:
            await run_in_threadpool(requests.post, "https://oauth2.googleapis.com/revoke", params={"token": token}, timeout=15)
        except requests.RequestException:
            logger.warning("google revoke failed; deleting local tokens anyway")
        await db.google_tokens.delete_one({"user_id": uid})
    return {"ok": True}


def _g(method: str, url: str, token: str, **kwargs) -> requests.Response:
    headers = {"Authorization": f"Bearer {token}", **kwargs.pop("headers", {})}
    resp = requests.request(method, url, headers=headers, timeout=kwargs.pop("timeout", 60), **kwargs)
    if resp.status_code == 401:
        raise HTTPException(status_code=409, detail="Google access expired, please reconnect")
    if resp.status_code >= 400:
        logger.error("google api %s %s -> %s %s", method, url.split("?")[0], resp.status_code, resp.text[:200])
        raise HTTPException(status_code=502, detail=f"Google API error ({resp.status_code})")
    return resp


async def _store_attachment(uid: str, task_id: str, name: str, mime: str, data: bytes, source: str) -> dict:
    validate_upload(mime, len(data))
    ext = (name.rsplit(".", 1)[-1] if "." in name else "bin").lower()[:10]
    att = Attachment(
        owner_id=uid, task_id=task_id, file_name=name, mime_type=mime, kind=kind_for(mime),
        size_bytes=len(data), storage_path=f"{APP_NAME}/attachments/{uid}/{uuid.uuid4()}.{ext}",
        source=source, created_at=_now(),
    )
    try:
        await run_in_threadpool(put_object, att.storage_path, data, mime)
    except StorageError as exc:
        logger.error("storage put failed %s: %s", exc.status, exc)
        raise HTTPException(status_code=502, detail="Storage upload failed, please retry")
    att.status, att.uploaded_at = "ready", _now()
    result = await db.attachments.insert_one(att.to_mongo())
    att.id = str(result.inserted_id)
    return _public(att)


# ---------------- Drive ----------------

@router.get("/picker-config")
async def picker_config(uid: str = Depends(current_user_id)):
    _require_configured()
    if not (_cfg("GOOGLE_API_KEY") and _cfg("GOOGLE_PROJECT_NUMBER")):
        raise HTTPException(status_code=503, detail="Google Picker API key / project number are not configured")
    return {
        "access_token": await _access_token(uid),
        "api_key": _cfg("GOOGLE_API_KEY"),
        "app_id": _cfg("GOOGLE_PROJECT_NUMBER"),
    }


class DriveImportIn(BaseModel):
    task_id: str = Field(min_length=1, max_length=200)
    file_ids: list[str] = Field(min_length=1, max_length=20)


def _download_drive_file(token: str, file_id: str) -> tuple[str, str, bytes]:
    meta = _g("GET", f"{DRIVE}/files/{file_id}", token, params={"fields": "id,name,mimeType,size"}).json()
    name, mime = meta.get("name") or "file", (meta.get("mimeType") or "").lower()
    if mime.startswith("application/vnd.google-apps."):
        data = _g("GET", f"{DRIVE}/files/{file_id}/export", token, params={"mimeType": "application/pdf"}).content
        return f"{name}.pdf", "application/pdf", data
    if int(meta.get("size") or 0) > MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"«{name}» is larger than 25 MB")
    data = _g("GET", f"{DRIVE}/files/{file_id}", token, params={"alt": "media"}, timeout=180).content
    return name, mime, data


@router.post("/drive/import")
async def drive_import(body: DriveImportIn, uid: str = Depends(current_user_id)):
    token = await _access_token(uid)
    items, errors = [], []
    for file_id in body.file_ids:
        try:
            name, mime, data = await run_in_threadpool(_download_drive_file, token, file_id)
            items.append(await _store_attachment(uid, body.task_id, name, mime, data, "google_drive"))
        except HTTPException as exc:
            errors.append({"file_id": file_id, "detail": exc.detail})
    return {"items": items, "errors": errors}


def _ensure_drive_folder(token: str) -> str:
    q = f"name = '{DRIVE_FOLDER}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    found = _g("GET", f"{DRIVE}/files", token, params={"q": q, "fields": "files(id)", "pageSize": 1}).json().get("files") or []
    if found:
        return found[0]["id"]
    created = _g("POST", f"{DRIVE}/files", token, json={"name": DRIVE_FOLDER, "mimeType": "application/vnd.google-apps.folder"})
    return created.json()["id"]


def _upload_to_drive(token: str, name: str, mime: str, data: bytes) -> dict:
    folder = _ensure_drive_folder(token)
    boundary = uuid.uuid4().hex
    meta = json.dumps({"name": name, "parents": [folder]}).encode()
    body = (
        f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n".encode() + meta
        + f"\r\n--{boundary}\r\nContent-Type: {mime}\r\n\r\n".encode() + data + f"\r\n--{boundary}--".encode()
    )
    return _g(
        "POST", f"{DRIVE_UPLOAD}/files", token, data=body, timeout=180,
        params={"uploadType": "multipart", "fields": "id,name,webViewLink"},
        headers={"Content-Type": f"multipart/related; boundary={boundary}"},
    ).json()


class DriveUploadIn(BaseModel):
    attachment_id: str


@router.post("/drive/upload")
async def drive_upload(body: DriveUploadIn, uid: str = Depends(current_user_id)):
    token = await _access_token(uid)
    att = Attachment.from_mongo(await db.attachments.find_one({"_id": _oid(body.attachment_id), "owner_id": uid, "status": "ready"}))
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
    try:
        data, _ = await run_in_threadpool(get_object, att.storage_path)
    except StorageError:
        raise HTTPException(status_code=502, detail="Could not read file")
    uploaded = await run_in_threadpool(_upload_to_drive, token, att.file_name, att.mime_type, data)
    await db.attachments.update_one({"_id": _oid(att.id)}, {"$set": {"drive_file_id": uploaded.get("id")}})
    return {"drive_file_id": uploaded.get("id"), "web_view_link": uploaded.get("webViewLink"), "folder": DRIVE_FOLDER}


# ---------------- Photos (Picker API) ----------------

@router.post("/photos/session")
async def photos_session(uid: str = Depends(current_user_id)):
    token = await _access_token(uid)
    s = (await run_in_threadpool(_g, "POST", f"{PHOTOS}/sessions", token, json={})).json()
    return {"id": s["id"], "picker_uri": s["pickerUri"], "polling": s.get("pollingConfig", {}), "done": bool(s.get("mediaItemsSet"))}


@router.get("/photos/session/{session_id}")
async def photos_session_status(session_id: str, uid: str = Depends(current_user_id)):
    token = await _access_token(uid)
    s = (await run_in_threadpool(_g, "GET", f"{PHOTOS}/sessions/{session_id}", token)).json()
    return {"id": s["id"], "done": bool(s.get("mediaItemsSet")), "polling": s.get("pollingConfig", {})}


class PhotosImportIn(BaseModel):
    task_id: str = Field(min_length=1, max_length=200)
    session_id: str = Field(min_length=1, max_length=200)


def _download_photos(token: str, session_id: str) -> list[tuple[str, str, bytes]]:
    items = _g("GET", f"{PHOTOS}/mediaItems", token, params={"sessionId": session_id, "pageSize": 20}).json().get("mediaItems") or []
    out = []
    for item in items:
        media = item.get("mediaFile") or {}
        suffix = "=dv" if item.get("type") == "VIDEO" else "=d"
        data = _g("GET", media["baseUrl"] + suffix, token, timeout=180).content
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        out.append((media.get("filename") or f"photo-{stamp}.jpg", (media.get("mimeType") or "image/jpeg").lower(), data))
    try:
        requests.delete(f"{PHOTOS}/sessions/{session_id}", headers={"Authorization": f"Bearer {token}"}, timeout=15)
    except requests.RequestException:
        pass
    return out


@router.post("/photos/import")
async def photos_import(body: PhotosImportIn, uid: str = Depends(current_user_id)):
    token = await _access_token(uid)
    files = await run_in_threadpool(_download_photos, token, body.session_id)
    items, errors = [], []
    for name, mime, data in files:
        try:
            items.append(await _store_attachment(uid, body.task_id, name, mime, data, "google_photos"))
        except HTTPException as exc:
            errors.append({"file_name": name, "detail": exc.detail})
    return {"items": items, "errors": errors}
