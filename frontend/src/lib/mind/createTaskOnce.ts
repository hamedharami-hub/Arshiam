import { doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Task } from "@/lib/taskTypes";

/** Create-if-absent across tabs/devices. A retry never resets a completed task.
 * Offline transactions fail honestly; an unverified upsert is not a fallback.
 */
export async function createMindTaskOnce(ownerId: string, task: Task): Promise<{ ok: boolean; error?: string; task?: Task }> {
  if (!ownerId || !task.id || !task.title.trim()) return { ok: false, error: "Missing task identity or title" };
  try {
    return await runTransaction(db, async transaction => {
      const ref = doc(db, "users", ownerId, "tasks", task.id);
      const existing = await transaction.get(ref);
      if (existing.exists()) {
        const data = existing.data();
        if (data.user_id && data.user_id !== ownerId) return { ok: false, error: "Task owner mismatch" };
        return { ok: true, task: { ...data, id: existing.id || task.id, user_id: ownerId } as Task };
      }
      const now = new Date().toISOString();
      const created = { ...task, user_id: ownerId, created_at: task.created_at || now, updated_at: now };
      transaction.set(ref, created);
      return { ok: true, task: created };
    });
  } catch { return { ok: false, error: "Task creation is not confirmed; reconnect and retry" }; }
}
