export type NoteTaskLink = {
  id: string;
  user_id: string;
  note_id: string;
  task_id: string;
  created_at: string;
};

/** A stable, injective UTF-8 encoding of the note/task pair for idempotent writes. */
export function makeNoteTaskLinkId(noteId: string, taskId: string): string {
  const encode = (value: string) => Array.from(new TextEncoder().encode(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `note_${encode(noteId)}_task_${encode(taskId)}`;
}
