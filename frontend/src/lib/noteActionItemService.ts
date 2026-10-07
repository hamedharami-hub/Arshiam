import { persistTask, type TaskPersistenceStatus } from "@/lib/firestoreDataService";
import type { Task } from "@/lib/taskTypes";

export type NoteActionItemTaskDraft = {
  id: string;
  ownerId: string;
  createdAt: string;
  title: string;
  description: string;
};

/**
 * Persist an accepted note action item with its stable draft ID. Repeating the
 * write targets the same owner-scoped Firestore document, so retries cannot
 * create duplicate tasks. This deliberately does not mutate or link the note.
 */
export function persistNoteActionItem(draft: NoteActionItemTaskDraft): Promise<TaskPersistenceStatus> {
  const title = draft.title.trim();
  if (!draft.id || !draft.ownerId || !title) return Promise.resolve("failed");

  const task: Task = {
    id: draft.id,
    user_id: draft.ownerId,
    title: title.slice(0, 200),
    description: draft.description.trim().slice(0, 2000) || null,
    priority: "none",
    due_date: null,
    completed: false,
    status: "todo",
    folder_id: null,
    recurrence: "none",
    parent_id: null,
    pinned: false,
    created_at: draft.createdAt,
  };

  return persistTask(draft.ownerId, task, { quietCompanion: true });
}
