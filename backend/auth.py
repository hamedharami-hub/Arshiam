"""Firebase ID-token verification (no service account needed: uses Google's public certs)."""
import os
from functools import lru_cache

import google.auth.transport.requests
from fastapi import Header, HTTPException
from google.oauth2 import id_token
from starlette.concurrency import run_in_threadpool

FIREBASE_PROJECT_ID = os.environ["FIREBASE_PROJECT_ID"]


@lru_cache(maxsize=1)
def _request():
    return google.auth.transport.requests.Request()


def _verify(token: str) -> dict:
    return id_token.verify_firebase_token(token, _request(), audience=FIREBASE_PROJECT_ID)


async def current_user_id(authorization: str = Header(default="")) -> str:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        claims = await run_in_threadpool(_verify, token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    uid = claims.get("user_id") or claims.get("sub")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")
    return uid
