"""Emergent Object Storage helpers (sync; call via run_in_threadpool)."""
import os

import requests

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = os.environ["ARSH_APP_NAME"]

storage_key = None


class StorageError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def init_storage(force: bool = False) -> str:
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def _call(method: str, path: str, **kwargs) -> requests.Response:
    key = init_storage()
    headers = kwargs.pop("headers", {})
    resp = requests.request(method, f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, **headers}, **kwargs)
    if resp.status_code == 503:  # stale key -> re-init once
        key = init_storage(force=True)
        resp = requests.request(method, f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, **headers}, **kwargs)
    if resp.status_code >= 400:
        raise StorageError(resp.status_code, resp.text[:300])
    return resp


def put_object(path: str, data: bytes, content_type: str) -> dict:
    return _call("PUT", path, data=data, headers={"Content-Type": content_type}, timeout=180).json()


def get_object(path: str) -> tuple[bytes, str]:
    resp = _call("GET", path, timeout=90)
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
