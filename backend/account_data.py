"""Cleanup of account-owned data held by the FastAPI companion service."""
from fastapi import APIRouter, Depends

from attachments import delete_all_attachments_for_user
from auth import current_user_id
from db import db
from google_integration import disconnect

router = APIRouter(prefix="/account", tags=["account"])


@router.delete("/data")
async def delete_account_data(uid: str = Depends(current_user_id)):
    # Remove external objects before deleting their metadata. Failure leaves the
    # account credentials valid so the client can safely retry.
    attachments_deleted = await delete_all_attachments_for_user(uid)
    await disconnect(uid)
    modules = await db.user_modules.delete_many({"user_id": uid})
    attempts = await db.module_attempts.delete_many({"user_id": uid})
    return {
        "ok": True,
        "attachments_deleted": attachments_deleted,
        "module_states_deleted": modules.deleted_count,
        "module_attempts_deleted": attempts.deleted_count,
    }
