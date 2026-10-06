import type { TaskNote } from "@/lib/taskTypes";

/** A durable note id survives retries when saving the note succeeded but clearing failed. */
export async function descriptionNoteId(userId: string, taskId: string, title: string, content: string): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify([userId, taskId, title.trim(), content.trim()]));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return `description-${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function moveDescriptionToNote(options: {
  userId: string;
  taskId: string;
  title: string;
  content: string;
  isCurrent: () => boolean;
  create: (data: { id: string; title: string; content: string }) => Promise<TaskNote>;
  clear: () => Promise<unknown>;
  onCreated: (note: TaskNote) => void;
}): Promise<boolean> {
  const id = await descriptionNoteId(options.userId, options.taskId, options.title, options.content);
  if (!options.isCurrent()) return false;
  const note = await options.create({ id, title: options.title, content: options.content });
  if (!options.isCurrent()) return false;
  options.onCreated(note);
  await options.clear();
  return options.isCurrent();
}
