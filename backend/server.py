"""ARSHNAZ companion service (FastAPI + MongoDB).

Tasks stay in Firestore. This service handles:
- attachment uploads to Emergent Object Storage (signed upload/view URLs)
- (next phases) weather cache, holiday sync, Google tokens
"""
import logging
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import APIRouter, FastAPI  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402

from db import client  # noqa: E402
from attachments import router as attachments_router  # noqa: E402
from storage import init_storage  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="ARSHNAZ service")

api_router = APIRouter(prefix="/api/arsh")


@api_router.get("/health")
async def health():
    return {"ok": True, "service": "arshnaz"}


api_router.include_router(attachments_router)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    try:
        init_storage()
        logger.info("Object storage initialised")
    except Exception as exc:  # storage is optional at boot; uploads will retry init
        logger.error("Object storage init failed: %s", exc)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
