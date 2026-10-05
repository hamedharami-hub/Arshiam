"""Task attachments stored in Emergent Object Storage.

Flow:  POST /attachments/sign-upload  ->  PUT upload_url (raw body, XHR progress)  ->  status=ready
View:  GET  /attachments/{id}/file?exp&sig   (signed so <img>/<iframe> can load it without headers)
Delete: DELETE /attachments/{id}  -> removed from the app and never served again.
"""
import logging
import mimetypes
import uuid
from datetime import datetime, timezone
from typing import Literal, Optional
from urllib.parse import quote

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from auth import current_user_id
from db import BaseDocument, db
from signing import sign, verify
from storage import APP_NAME, StorageError, delete_object, get_object, put_object

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/attachments", tags=["attachments"])

MAX_BYTES = 25 * 1024 * 1024
UPLOAD_TTL = 15 * 60
VIEW_TTL = 60 * 60
ALLOWED_MIME = {
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif",
    "application/pdf",
    "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm",
    "video/mp4", "video/quicktime", "video/webm",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

Kind = Literal["image", "audio", "video", "pdf", "file"]


def kind_for(mime: str) -> Kind:
    if mime.startswith("image/"):
        return "image"
    if mime.startswith("audio/"):
        return "audio"
    if mime.startswith("video/"):
        return "video"
    if mime == "application/pdf":
        return "pdf"
    return "file"


class Attachment(BaseDocument):
    owner_id: str
    task_id: str
    file_name: str
    mime_type: str
    kind: Kind
    size_bytes: int
    storage_path: str
    status: Literal["pending", "ready", "deleted"] = "pending"
    source: str = "device"
    created_at: str
    uploaded_at: Optional[str] = None
    deleted_at: Optional[str] = None


class SignUploadIn(BaseModel):
    task_id: str = Field(min_length=1, max_length=200)
    file_name: str = Field(min_length=1, max_length=300)
    mime_type: str = Field(min_length=1, max_length=150)
    size_bytes: int = Field(gt=0)
    source: str = "device"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=404, detail="Attachment not found")


def _public(att: Attachment) -> dict:
    exp, sig = sign("view", att.id, VIEW_TTL)
    base = f"/api/arsh/attachments/{att.id}/file?exp={exp}&sig={sig}"
    return {
        "id": att.id,
        "task_id": att.task_id,
        "file_name": att.file_name,
        "mime_type": att.mime_type,
        "kind": att.kind,
        "size_bytes": att.size_bytes,
        "status": att.status,
        "source": att.source,
        "created_at": att.created_at,
        "uploaded_at": att.uploaded_at,
        "view_url": base,
        "download_url": base + "&download=1",
    }


def validate_upload(mime: str, size: int) -> None:
    if size > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than 25 MB")
    if mime not in ALLOWED_MIME:
        raise HTTPException(status_code=415, detail=f"File type not allowed: {mime}")


@router.post("/sign-upload")
async def sign_upload(body: SignUploadIn, uid: str = Depends(current_user_id)):
    mime = body.mime_type.lower()
    validate_upload(mime, body.size_bytes)
    ext = (body.file_name.rsplit(".", 1)[-1] if "." in body.file_name else (mimetypes.guess_extension(mime) or ".bin").lstrip(".")).lower()[:10]
    att = Attachment(
        owner_id=uid,
        task_id=body.task_id,
        file_name=body.file_name,
        mime_type=mime,
        kind=kind_for(mime),
        size_bytes=body.size_bytes,
        storage_path=f"{APP_NAME}/attachments/{uid}/{uuid.uuid4()}.{ext}",
        source=body.source[:30],
        created_at=_now(),
    )
    result = await db.attachments.insert_one(att.to_mongo())
    att.id = str(result.inserted_id)
    exp, sig = sign("upload", att.id, UPLOAD_TTL)
    return {
        "attachment_id": att.id,
        "upload_url": f"/api/arsh/attachments/{att.id}/content?exp={exp}&sig={sig}",
        "expires_at": exp,
        "max_bytes": MAX_BYTES,
    }


@router.put("/{attachment_id}/content")
async def upload_content(attachment_id: str, request: Request, exp: int = Query(...), sig: str = Query(...)):
    if not verify("upload", attachment_id, exp, sig):
        raise HTTPException(status_code=403, detail="Upload link expired or invalid")
    att = Attachment.from_mongo(await db.attachments.find_one({"_id": _oid(attachment_id)}))
    if not att or att.status == "deleted":
        raise HTTPException(status_code=404, detail="Attachment not found")
    data = await request.body()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty body")
    validate_upload(att.mime_type, len(data))
    try:
        await run_in_threadpool(put_object, att.storage_path, data, att.mime_type)
    except StorageError as exc:
        logger.error("storage put failed %s: %s", exc.status, exc)
        if exc.status == 402:
            raise HTTPException(status_code=402, detail="Storage credits exhausted")
        raise HTTPException(status_code=502, detail="Storage upload failed, please retry")
    now = _now()
    await db.attachments.update_one(
        {"_id": _oid(attachment_id)},
        {"$set": {"status": "ready", "uploaded_at": now, "size_bytes": len(data)}},
    )
    att.status, att.uploaded_at, att.size_bytes = "ready", now, len(data)
    return _public(att)


@router.get("")
async def list_attachments(task_id: str = Query(...), uid: str = Depends(current_user_id)):
    cursor = db.attachments.find({"owner_id": uid, "task_id": task_id, "status": "ready"}).sort("created_at", -1)
    return {"items": [_public(Attachment.from_mongo(doc)) async for doc in cursor]}


@router.get("/{attachment_id}/file")
async def get_file(attachment_id: str, exp: int = Query(...), sig: str = Query(...), download: int = 0):
    if not verify("view", attachment_id, exp, sig):
        raise HTTPException(status_code=403, detail="Link expired or invalid")
    att = Attachment.from_mongo(await db.attachments.find_one({"_id": _oid(attachment_id)}))
    if not att or att.status != "ready":
        raise HTTPException(status_code=404, detail="Attachment not found")
    try:
        data, _ = await run_in_threadpool(get_object, att.storage_path)
    except StorageError as exc:
        logger.error("storage get failed %s: %s", exc.status, exc)
        raise HTTPException(status_code=502, detail="Could not read file")
    disposition = "attachment" if download else "inline"
    return Response(
        content=data,
        media_type=att.mime_type,
        headers={
            "Content-Disposition": f"{disposition}; filename*=UTF-8''{quote(att.file_name)}",
            "Cache-Control": "private, max-age=3600",
        },
    )


async def delete_all_attachments_for_user(uid: str) -> int:
    """Delete legacy FastAPI attachment objects owned by an account."""
    # Include old soft-deleted rows too: pre-existing delete requests did not
    # remove the underlying object, so account deletion must clean those up.
    cursor = db.attachments.find({"owner_id": uid})
    deleted = 0
    async for raw in cursor:
        attachment = Attachment.from_mongo(raw)
        try:
            await run_in_threadpool(delete_object, attachment.storage_path)
        except StorageError as exc:
            # An unfinished upload may have a metadata row but no object.
            if exc.status != 404:
                logger.error("legacy attachment delete failed for %s: %s", attachment.id, exc)
                raise HTTPException(status_code=502, detail="Could not delete all stored attachments")
        result = await db.attachments.update_one(
            {"_id": _oid(attachment.id), "owner_id": uid, "status": {"$ne": "deleted"}},
            {"$set": {"status": "deleted", "deleted_at": _now()}},
        )
        deleted += result.modified_count
    return deleted


@router.delete("/delete-all")
async def delete_all_attachments(uid: str = Depends(current_user_id)):
    return {"ok": True, "deleted": await delete_all_attachments_for_user(uid)}


@router.delete("/{attachment_id}")
async def delete_attachment(attachment_id: str, uid: str = Depends(current_user_id)):
    res = await db.attachments.update_one(
        {"_id": _oid(attachment_id), "owner_id": uid, "status": {"$ne": "deleted"}},
        {"$set": {"status": "deleted", "deleted_at": _now()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Attachment not found")
    return {"ok": True, "id": attachment_id}
