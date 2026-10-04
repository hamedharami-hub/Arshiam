import { auth, db, doc } from "@/lib/firebase";
import { runTransaction } from "firebase/firestore";

type DraftTask = { id: string; title: string; description: string | null; priority: string; due_date: string | null };
type Draft = { tasks: DraftTask[]; saved: string[]; createdAt: string };

/** Durable per-image intent + create-if-absent transactions make retries safe even after a lost acknowledgement. */
export async function saveImageTaskBatch(input: {
  userId: string; taskId: string; imageId: string; action: string;
  generate: () => Promise<unknown[]>;
}) {
  const { userId, taskId, imageId, action } = input;
  const assertAccount = () => {
    if (auth.currentUser?.uid !== userId) throw new Error("Account changed; retry from the original account.");
  };
  assertAccount();
  const key = `arsh:image-task-batch:v1:${JSON.stringify([userId, taskId, imageId, action])}`;
  const existing = localStorage.getItem(key);
  let draft: Draft;
  if (existing) {
    draft = JSON.parse(existing) as Draft;
    if (!Array.isArray(draft.tasks) || !Array.isArray(draft.saved)) throw new Error("Saved task draft is invalid.");
  } else {
    const generated = await input.generate();
    assertAccount();
    const tasks: DraftTask[] = generated.flatMap((raw) => {
      const value = raw as Record<string, unknown>;
      if (!value || typeof value.title !== "string" || !value.title.trim()) return [];
      return [{ id: crypto.randomUUID(), title: value.title.trim(),
        description: typeof value.description === "string" ? value.description : null,
        priority: typeof value.priority === "string" ? value.priority : "none",
        due_date: typeof value.due_date === "string" ? value.due_date : null }];
    });
    draft = { tasks, saved: [], createdAt: new Date().toISOString() };
    // Fail before the first remote write if the retry intent cannot be persisted.
    localStorage.setItem(key, JSON.stringify(draft));
  }
  const errors: string[] = [];
  let created = 0;
  for (const task of draft.tasks) {
    if (draft.saved.includes(task.id)) continue;
    assertAccount();
    try {
      const reference = doc(db, "users", userId, "tasks", task.id);
      const wasCreated = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(reference);
        assertAccount();
        if (snapshot.exists()) return false;
        transaction.set(reference, { ...task, user_id: userId, parent_id: taskId,
          created_at: draft.createdAt, updated_at: draft.createdAt, completed: false });
        return true;
      });
      if (wasCreated) created++;
      draft.saved.push(task.id);
      localStorage.setItem(key, JSON.stringify(draft));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (created) window.dispatchEvent(new Event("firebase-store-changed"));
  return { total: draft.tasks.length, saved: draft.saved.length, created,
    failed: draft.tasks.length - draft.saved.length, errors };
}
