import { saveEntityToFirestore, type SupportedFirestoreCollection } from "./firestoreSync";
import { enqueueOp } from "./offlineQueue";
import { prepareFirestoreBackupRecord } from "./backupRecord";

export type BackupRestoreRow = Record<string, unknown> & { id: string };

export interface BackupRestoreBatchResult {
  saved: BackupRestoreRow[];
  queued: BackupRestoreRow[];
  failedIds: string[];
  skipped: number;
}

function isBrowserOnline(): boolean {
  return typeof navigator === "undefined" ||
    typeof navigator.onLine !== "boolean" ||
    navigator.onLine;
}

/** Restore rows without bypassing Firestore revision checks or claiming cloud success offline. */
export async function restoreBackupRows(
  userId: string,
  collection: Extract<SupportedFirestoreCollection, "tasks" | "notes">,
  input: unknown[],
): Promise<BackupRestoreBatchResult> {
  if (!userId) throw new Error("User ID is required to restore a backup.");

  const result: BackupRestoreBatchResult = { saved: [], queued: [], failedIds: [], skipped: 0 };
  for (const value of input) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      result.skipped++;
      continue;
    }

    const source = value as Record<string, unknown>;
    if (typeof source.id !== "string" || !source.id.trim()) {
      result.skipped++;
      continue;
    }

    const row = prepareFirestoreBackupRecord(source, userId) as BackupRestoreRow;
    try {
      if (isBrowserOnline()) {
        if (await saveEntityToFirestore(userId, collection, row.id, row)) {
          result.saved.push(row);
        } else {
          // A false result can mean a newer cloud revision; do not queue it and
          // later bypass that conflict through another write path.
          result.failedIds.push(row.id);
        }
        continue;
      }

      const queued = await enqueueOp({
        ownerId: userId,
        table: collection,
        op: "upsert",
        payload: row,
        match: { id: row.id },
      });
      if (queued) result.queued.push(row);
      else result.failedIds.push(row.id);
    } catch {
      result.failedIds.push(row.id);
    }
  }

  return result;
}
