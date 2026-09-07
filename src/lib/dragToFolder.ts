// Lightweight cross-component drag-and-drop helper for moving tasks/notes
// onto sidebar folder rows. Uses native HTML5 drag events so it works across
// independent React trees without coordinating a single dnd-kit context.

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DragPayload = { kind: "task" | "note"; id: string; title?: string };

const MIME = "application/x-taskflow-item";

export function startItemDrag(e: React.DragEvent, payload: DragPayload) {
  try {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(MIME, JSON.stringify(payload));
    // Fallback for browsers that need text/plain
    e.dataTransfer.setData("text/plain", payload.title || payload.id);
  } catch { /* ignore */ }
}

export function readItemDrag(e: React.DragEvent): DragPayload | null {
  try {
    const raw = e.dataTransfer.getData(MIME);
    if (!raw) return null;
    return JSON.parse(raw) as DragPayload;
  } catch { return null; }
}

export async function moveItemToFolder(payload: DragPayload, folderId: string | null) {
  const table = payload.kind === "task" ? "tasks" : "notes";
  const { error } = await supabase.from(table as any).update({ folder_id: folderId }).eq("id", payload.id);
  if (error) { toast.error(error.message); return false; }
  toast.success(folderId ? "منتقل شد" : "به Inbox منتقل شد");
  return true;
}
