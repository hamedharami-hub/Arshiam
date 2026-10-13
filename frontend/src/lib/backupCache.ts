import { cacheGet } from "./offlineQueue";
import { extractTasksFromCache } from "@/features/tasks/taskCache";

// Scoped keys establish ownership for older rows without user_id. Shared legacy
// keys do not: only an explicit matching owner permits migration/export.
function ownedRows(rows: any[], ownerId: string, scoped: boolean): any[] {
  return rows.filter(row => row && typeof row === "object" && !Array.isArray(row)
    && (row.user_id === ownerId || (scoped && row.user_id == null)));
}

export async function readBackupTasks(ownerId: string): Promise<any[]> {
  const scoped = await cacheGet<any>(`tasks:all:${ownerId}`);
  if (scoped != null) return ownedRows(extractTasksFromCache(scoped), ownerId, true);
  return ownedRows(extractTasksFromCache(await cacheGet<any>("tasks")), ownerId, false);
}

export async function readBackupNotes(ownerId: string): Promise<any[]> {
  const scoped = await cacheGet<any>(`notes:all:${ownerId}`);
  if (Array.isArray(scoped)) return ownedRows(scoped, ownerId, true);
  const rows = new Map<string, any>();
  for (const key of ["notes", "arshnaz_notes"]) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(parsed)) {
        for (const row of ownedRows(parsed, ownerId, false)) rows.set(row.id, row);
      }
    } catch { /* An unreadable legacy cache is not evidence of ownership. */ }
  }
  return [...rows.values()];
}
