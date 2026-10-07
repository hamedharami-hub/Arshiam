import { auth, db, doc, runTransaction, writeBatch } from "@/lib/firebase";
import { trackWrite } from "@/lib/firestoreUsage";
import { firebaseStore } from "@/lib/firebaseStore";

export type FolderDeletePlan = {
  folderIds: string[];
  taskIds: string[];
  noteIds: string[];
  columnIds: string[];
};

export type FolderDeleteResult = {
  deletedTaskIds: string[];
  deletedNoteIds: string[];
  deletedColumnIds: string[];
  deletedChildFolderIds: string[];
};

export type FolderDeleteLockState = { operationId: string; folderIds: string[]; taskIds: string[]; noteIds: string[] };

export function createFolderDeleteOperationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `folder-delete-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function sameFolderDeletePlan(left: FolderDeletePlan, right: FolderDeletePlan): boolean {
  const sameIds = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const rightIds = new Set(b);
    return a.every((id) => rightIds.has(id));
  };
  return sameIds(left.folderIds, right.folderIds)
    && sameIds(left.taskIds, right.taskIds)
    && sameIds(left.noteIds, right.noteIds)
    && sameIds(left.columnIds, right.columnIds);
}

export function mergeFolderDeletePlans(left: FolderDeletePlan, right: FolderDeletePlan): FolderDeletePlan {
  return {
    folderIds: [...new Set([...left.folderIds, ...right.folderIds])],
    taskIds: [...new Set([...left.taskIds, ...right.taskIds])],
    noteIds: [...new Set([...left.noteIds, ...right.noteIds])],
    columnIds: [...new Set([...left.columnIds, ...right.columnIds])],
  };
}

const chunksOf = <T,>(values: T[], size = 10): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
};

const emptyResult = (): FolderDeleteResult => ({
  deletedTaskIds: [],
  deletedNoteIds: [],
  deletedColumnIds: [],
  deletedChildFolderIds: [],
});

export const emptyFolderDeleteLockState = (operationId = createFolderDeleteOperationId()): FolderDeleteLockState => ({ operationId, folderIds: [], taskIds: [], noteIds: [] });

async function readRows<T extends Record<string, unknown>>(
  query: PromiseLike<{ data: T[] | null; error: Error | null; fromCache?: boolean }>,
  label: string,
): Promise<T[]> {
  const result = await query;
  if (result.error || result.fromCache !== false || !Array.isArray(result.data)) {
    throw new Error(`${label}: ${result.error?.message || "دادهٔ کامل از سرور تأیید نشد"}`);
  }
  return result.data;
}

/** Resolve the full folder and task tree before deleting anything. */
export async function collectFolderDeletePlan(userId: string, rootFolderId: string): Promise<FolderDeletePlan> {
  const folderIds = new Set([rootFolderId]);
  let folderFrontier = [rootFolderId];
  while (folderFrontier.length) {
    const next: string[] = [];
    for (const parentIds of chunksOf(folderFrontier)) {
      const rows = await readRows(
        firebaseStore.from("folders", userId).select("id,parent_id", { source: "server" }).in("parent_id", parentIds),
        "خطا در خواندن زیرپوشه‌ها",
      );
      for (const row of rows) {
        if (typeof row.id === "string" && !folderIds.has(row.id)) {
          folderIds.add(row.id);
          next.push(row.id);
        }
      }
    }
    folderFrontier = next;
  }

  const folderList = [...folderIds];
  const taskIds = new Set<string>();
  const noteIds = new Set<string>();
  const columnIds = new Set<string>();
  for (const folderBatch of chunksOf(folderList)) {
    const [tasks, notes, columns] = await Promise.all([
      readRows(firebaseStore.from("tasks", userId).select("id,parent_id", { source: "server" }).in("folder_id", folderBatch), "خطا در خواندن کارهای فولدر"),
      readRows(firebaseStore.from("notes", userId).select("id", { source: "server" }).in("folder_id", folderBatch), "خطا در خواندن نوت‌های فولدر"),
      readRows(firebaseStore.from("folder_columns", userId).select("id", { source: "server" }).in("folder_id", folderBatch), "خطا در خواندن ستون‌های فولدر"),
    ]);
    for (const task of tasks) if (typeof task.id === "string") taskIds.add(task.id);
    for (const note of notes) if (typeof note.id === "string") noteIds.add(note.id);
    for (const column of columns) if (typeof column.id === "string") columnIds.add(column.id);
  }

  let taskFrontier = [...taskIds];
  while (taskFrontier.length) {
    const next: string[] = [];
    for (const parentIds of chunksOf(taskFrontier)) {
      const children = await readRows(
        firebaseStore.from("tasks", userId).select("id,parent_id", { source: "server" }).in("parent_id", parentIds),
        "خطا در خواندن زیرکارها",
      );
      for (const child of children) {
        if (typeof child.id === "string" && !taskIds.has(child.id)) {
          taskIds.add(child.id);
          next.push(child.id);
        }
      }
    }
    taskFrontier = next;
  }

  return { folderIds: folderList, taskIds: [...taskIds], noteIds: [...noteIds], columnIds: [...columnIds] };
}

async function deleteAtomically(userId: string, table: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  if (auth.currentUser?.uid !== userId) throw new Error("حساب کاربری هنگام حذف تغییر کرد؛ حذف متوقف شد.");
  const batch = writeBatch(db);
  for (const id of ids) batch.delete(doc(db, "users", userId, table, id));
  if (auth.currentUser?.uid !== userId) throw new Error("حساب کاربری هنگام حذف تغییر کرد؛ حذف متوقف شد.");
  await batch.commit();
  trackWrite(ids.length, table);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("firebase-store-changed"));
}

export class FolderDeleteError extends Error {
  constructor(message: string, readonly result: FolderDeleteResult) {
    super(message);
    this.name = "FolderDeleteError";
  }
}

/** Fence folder, task, and note writes while a cascade is in progress. */
export async function markFolderDeleteLocks(
  userId: string,
  plan: FolderDeletePlan,
  locked: FolderDeleteLockState,
): Promise<void> {
  const stages: Array<{ table: string; ids: string[]; lockedIds: string[]; label: string }> = [
    { table: "folders", ids: plan.folderIds, lockedIds: locked.folderIds, label: "فولدرها" },
    { table: "tasks", ids: plan.taskIds, lockedIds: locked.taskIds, label: "کارها" },
    { table: "notes", ids: plan.noteIds, lockedIds: locked.noteIds, label: "نوت‌ها" },
  ];
  for (const stage of stages) {
    const alreadyLocked = new Set(stage.lockedIds);
    for (const ids of chunksOf(stage.ids.filter((id) => !alreadyLocked.has(id)), 100)) {
      if (auth.currentUser?.uid !== userId) throw new Error("حساب کاربری هنگام آماده‌سازی حذف تغییر کرد.");
      try {
        await runTransaction(db, async (transaction) => {
          const refs = ids.map((id) => doc(db, "users", userId, stage.table, id));
          const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
          if (auth.currentUser?.uid !== userId) throw new Error("حساب کاربری هنگام آماده‌سازی حذف تغییر کرد.");
          snapshots.forEach((snapshot) => {
            if (!snapshot.exists()) throw new Error("یکی از موارد پیش از قفل‌شدن حذف شده است؛ طرح حذف را دوباره بساز.");
            const activeLock = snapshot.data()?._delete_lock;
            if (snapshot.data()?._deleting === true && activeLock !== locked.operationId) {
              throw new Error("این فولدر هم‌زمان در عملیات حذف دیگری است؛ تغییری انجام نشد.");
            }
          });
          refs.forEach((ref) => transaction.update(ref, { _deleting: true, _delete_lock: locked.operationId }));
        });
      } catch (error) {
        throw new Error(`قفل موقت ${stage.label} ثبت نشد: ${error instanceof Error ? error.message : "خطای ناشناخته"}`);
      }
      stage.lockedIds.push(...ids);
      trackWrite(ids.length, stage.table);
    }
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("firebase-store-changed"));
}

/** Remove temporary fences from surviving documents if the cascade stops. */
export async function releaseFolderDeleteLocks(userId: string, locked: FolderDeleteLockState): Promise<boolean> {
  if (auth.currentUser?.uid !== userId) return false;
  const stages: Array<{ table: string; ids: string[] }> = [
    { table: "tasks", ids: locked.taskIds },
    { table: "notes", ids: locked.noteIds },
    { table: "folders", ids: locked.folderIds },
  ];
  try {
    for (const stage of stages) {
      for (const ids of chunksOf(stage.ids, 10)) {
        const existing = await readRows(
          firebaseStore.from(stage.table, userId).select("id,_deleting,_delete_lock", { source: "server" }).in("id", ids),
          "خطا در خواندن داده برای برداشتن قفل",
        );
        const existingIds = existing.flatMap((row) => typeof row.id === "string"
          && row._deleting === true && row._delete_lock === locked.operationId ? [row.id] : []);
        for (const batchIds of chunksOf(existingIds, 450)) {
          if (auth.currentUser?.uid !== userId) return false;
          const batch = writeBatch(db);
          for (const id of batchIds) batch.update(doc(db, "users", userId, stage.table, id), { _deleting: false, _delete_lock: locked.operationId });
          await batch.commit();
          trackWrite(batchIds.length, stage.table);
        }
      }
    }
    if (typeof window !== "undefined") window.dispatchEvent(new Event("firebase-store-changed"));
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete only ids from a server-confirmed plan. Each write batch is atomic,
 * so the caller knows which endpoint ids were actually committed and can
 * safely clean their note links after partial failure.
 */
export async function deleteFolderContents(userId: string, plan: FolderDeletePlan): Promise<FolderDeleteResult> {
  const result = emptyResult();
  const stages: Array<{ table: string; ids: string[]; resultKey: keyof FolderDeleteResult; label: string }> = [
    { table: "tasks", ids: plan.taskIds, resultKey: "deletedTaskIds", label: "خطا در حذف کارها" },
    { table: "notes", ids: plan.noteIds, resultKey: "deletedNoteIds", label: "خطا در حذف نوت‌ها" },
    { table: "folder_columns", ids: plan.columnIds, resultKey: "deletedColumnIds", label: "خطا در حذف ستون‌های فولدر" },
    { table: "folders", ids: plan.folderIds.slice(1), resultKey: "deletedChildFolderIds", label: "خطا در حذف زیرپوشه‌ها" },
  ];

  try {
    for (const stage of stages) {
      for (const ids of chunksOf(stage.ids, 450)) {
        try {
          await deleteAtomically(userId, stage.table, ids);
          result[stage.resultKey].push(...ids);
        } catch (error) {
          throw new Error(`${stage.label}: ${error instanceof Error ? error.message : "خطای ناشناخته"}`);
        }
      }
    }
    return result;
  } catch (error) {
    throw new FolderDeleteError(error instanceof Error ? error.message : "خطا در حذف محتوا", result);
  }
}

/** True only if a fresh server read confirms there is nothing left to cascade. */
export async function assertFolderDeletePlanEmpty(userId: string, rootFolderId: string): Promise<void> {
  const remaining = await collectFolderDeletePlan(userId, rootFolderId);
  if (remaining.folderIds.length > 1 || remaining.taskIds.length || remaining.noteIds.length || remaining.columnIds.length) {
    throw new Error("هنگام حذف محتوای تازه‌ای در فولدر ثبت شد؛ فولدر حذف نشد. دوباره تلاش کن.");
  }
}

/** Confirm the one folder is empty after moving its direct contents to the root. */
export async function assertFolderContainerEmpty(userId: string, folderId: string): Promise<void> {
  const [tasks, notes, children, columns] = await Promise.all([
    readRows(firebaseStore.from("tasks", userId).select("id", { source: "server" }).eq("folder_id", folderId), "خطا در بررسی کارهای فولدر"),
    readRows(firebaseStore.from("notes", userId).select("id", { source: "server" }).eq("folder_id", folderId), "خطا در بررسی نوت‌های فولدر"),
    readRows(firebaseStore.from("folders", userId).select("id", { source: "server" }).eq("parent_id", folderId), "خطا در بررسی زیرپوشه‌های فولدر"),
    readRows(firebaseStore.from("folder_columns", userId).select("id", { source: "server" }).eq("folder_id", folderId), "خطا در بررسی ستون‌های فولدر"),
  ]);
  if (tasks.length || notes.length || children.length || columns.length) {
    throw new Error("هنگام انتقال، محتوای تازه‌ای در فولدر ثبت شد؛ فولدر حذف نشد. دوباره تلاش کن.");
  }
}

/** Stop a cascade when this device still has related writes waiting to replay. */
export async function assertNoPendingFolderWrites(userId: string, plan: FolderDeletePlan): Promise<void> {
  const { getPendingOps, getQueuedOpOwnerId } = await import("@/lib/offlineQueue");
  let queued;
  try {
    queued = await getPendingOps();
  } catch {
    throw new Error("صف همگام‌سازی خوانده نشد؛ برای حفظ تغییرات آفلاین، حذف فولدر متوقف شد.");
  }

  const folderIds = new Set(plan.folderIds);
  const taskIds = new Set(plan.taskIds);
  const noteIds = new Set(plan.noteIds);
  for (const operation of queued) {
    if (!["tasks", "notes", "folders"].includes(operation.table)) continue;
    const ownerId = getQueuedOpOwnerId(operation);
    if (ownerId && ownerId !== userId) continue;
    if (!ownerId) throw new Error("یک تغییر آفلاین بدون مالک روشن وجود دارد؛ حذف فولدر متوقف شد تا داده‌ای از بین نرود.");

    const payloads = Array.isArray(operation.payload) ? operation.payload : [operation.payload];
    const entries = payloads.filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object"));
    const match = operation.match || {};
    const hasLocation = ["id", "folder_id", "parent_id"].some((key) =>
      Object.prototype.hasOwnProperty.call(match, key) || entries.some((entry) => Object.prototype.hasOwnProperty.call(entry, key)));
    const relevant = entries.some((entry) => {
      if (operation.table === "tasks") return (typeof entry.id === "string" && taskIds.has(entry.id)) ||
        (typeof entry.folder_id === "string" && folderIds.has(entry.folder_id)) ||
        (typeof entry.parent_id === "string" && taskIds.has(entry.parent_id));
      if (operation.table === "notes") return (typeof entry.id === "string" && noteIds.has(entry.id)) ||
        (typeof entry.folder_id === "string" && folderIds.has(entry.folder_id));
      return (typeof entry.id === "string" && folderIds.has(entry.id)) ||
        (typeof entry.parent_id === "string" && folderIds.has(entry.parent_id));
    }) || (operation.table === "tasks" && (
      (typeof match.id === "string" && taskIds.has(match.id)) ||
      (typeof match.folder_id === "string" && folderIds.has(match.folder_id)) ||
      (typeof match.parent_id === "string" && taskIds.has(match.parent_id))
    )) || (operation.table === "notes" && (
      (typeof match.id === "string" && noteIds.has(match.id)) ||
      (typeof match.folder_id === "string" && folderIds.has(match.folder_id))
    )) || (operation.table === "folders" && (
      (typeof match.id === "string" && folderIds.has(match.id)) ||
      (typeof match.parent_id === "string" && folderIds.has(match.parent_id))
    ));

    if (relevant || !hasLocation) {
      throw new Error("تغییرهای آفلاینِ مرتبط با این فولدر هنوز همگام نشده‌اند؛ پس از همگام‌سازی دوباره تلاش کن.");
    }
  }
}
