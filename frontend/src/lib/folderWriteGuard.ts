import { db, doc } from "@/lib/firebase";
import type { DocumentSnapshot, Transaction } from "firebase/firestore";

type ScopedCollection = "tasks" | "notes" | "folders" | "folder_columns";

const TRANSFER_METADATA_KEYS = new Set(["created_at", "updated_at", "updatedAt", "_firestoreSyncAt", "id", "user_id", "userId"]);

function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  try { return JSON.stringify(left) === JSON.stringify(right); } catch { return false; }
}

function onlyDetaches(current: Record<string, unknown>, payload: Record<string, unknown>, locationKey: "folder_id" | "parent_id"): boolean {
  if (payload[locationKey] !== null) return false;
  const keys = new Set([...Object.keys(current), ...Object.keys(payload)]);
  for (const key of keys) {
    if (key === locationKey || TRANSFER_METADATA_KEYS.has(key)) continue;
    if (!sameValue(current[key], payload[key])) return false;
  }
  return true;
}

async function folderReferenceAllowed(
  transaction: Transaction,
  userId: string,
  folderId: unknown,
  currentFolderId: unknown,
  current: Record<string, unknown> | undefined,
  payload: Record<string, unknown>,
  locationKey: "folder_id" | "parent_id",
  allowDetachment: boolean,
): Promise<boolean> {
  const ids = [...new Set([folderId, currentFolderId].filter((id): id is string => typeof id === "string" && id.length > 0))];
  for (const id of ids) {
    const folder = await transaction.get(doc(db, "users", userId, "folders", id));
    if (!folder.exists()) return false;
    if (folder.data()?._deleting === true) {
      const isSafeTransfer = allowDetachment && id === currentFolderId && folderId == null && current && onlyDetaches(current, payload, locationKey);
      if (!isSafeTransfer) return false;
    }
  }
  return true;
}

/** Resolve server-side folder and parent references in the same transaction as a write. */
export async function folderScopedWriteAllowed(
  transaction: Transaction,
  userId: string,
  collection: ScopedCollection,
  payload: Record<string, unknown>,
  current?: DocumentSnapshot,
): Promise<boolean> {
  if (current?.exists() && current.data()?._deleting === true) return false;

  const locationKey = collection === "folders" ? "parent_id" : "folder_id";
  const folderId = payload[locationKey];
  const currentData = current?.exists() ? current.data() as Record<string, unknown> : undefined;
  const currentFolderId = currentData?.[locationKey];
  if (!await folderReferenceAllowed(
    transaction, userId, folderId, currentFolderId, currentData, payload, locationKey, collection !== "folder_columns",
  )) return false;

  const parentTaskId = collection === "tasks" ? payload.parent_id : null;
  if (typeof parentTaskId === "string" && parentTaskId) {
    const parent = await transaction.get(doc(db, "users", userId, "tasks", parentTaskId));
    if (!parent.exists() || parent.data()?._deleting === true) return false;
  }
  const currentParentTaskId = collection === "tasks" ? currentData?.parent_id : null;
  if (typeof currentParentTaskId === "string" && currentParentTaskId && currentParentTaskId !== parentTaskId) {
    const previousParent = await transaction.get(doc(db, "users", userId, "tasks", currentParentTaskId));
    if (!previousParent.exists() || previousParent.data()?._deleting === true) return false;
  }
  return true;
}
