"""HMAC-signed, short-lived URLs for upload (PUT) and view (GET)."""
import hashlib
import hmac
import os
import time

SECRET = os.environ["ARSH_SIGNING_SECRET"].encode()


def sign(action: str, resource_id: str, ttl_seconds: int) -> tuple[int, str]:
    exp = int(time.time()) + ttl_seconds
    return exp, _digest(action, resource_id, exp)


def verify(action: str, resource_id: str, exp: int, sig: str) -> bool:
    if exp < int(time.time()):
        return False
    return hmac.compare_digest(_digest(action, resource_id, exp), sig)


def _digest(action: str, resource_id: str, exp: int) -> str:
    return hmac.new(SECRET, f"{action}:{resource_id}:{exp}".encode(), hashlib.sha256).hexdigest()
