import { persistTask, type TaskPersistenceStatus } from "@/lib/firestoreDataService";
import { linkNoteToTask } from "@/lib/noteTaskLinkService";
import type { Task } from "@/lib/taskTypes";

export type NoteActionItemTaskDraft = {
  id: string;
  ownerId: string;
  noteId: string;
  createdAt: string;
  title: string;
  description: string;
};

/**
 * Persist an accepted note action item with its stable draft ID. Repeating the
 * write targets the same owner-scoped Firestore document and deterministic
 * note-task relationship, so retries cannot create duplicates or edit the note.
 */
export function persistNoteActionItem(draft: NoteActionItemTaskDraft): Promise<TaskPersistenceStatus> {
  const title = draft.title.trim();
  if (!draft.id || !draft.ownerId || !draft.noteId || !title) return Promise.resolve("failed");

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

  return persistTask(draft.ownerId, task, { quietCompanion: true }).then(async (taskStatus) => {
    if (taskStatus === "failed") return "failed";
    try {
      const linkStatus = await linkNoteToTask(draft.ownerId, draft.noteId, draft.id);
      return taskStatus === "queued" || linkStatus === "queued" ? "queued" : "saved";
    } catch (error) {
      console.warn("[NoteActionItem] Task exists but its note relationship is pending:", error);
      return "failed";
    }
  });
}
