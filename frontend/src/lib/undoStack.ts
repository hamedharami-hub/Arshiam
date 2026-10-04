// Lightweight global undo/redo stack for destructive actions.
// Items are kept only in memory; capacity = 20.
// Each entry has: a label, an `undo` (re-create what was deleted) and optional `redo` (re-perform the action).

import { toast } from "sonner";

export type UndoEntry = {
  label: string;
  undo: () => Promise<void> | void;
  redo?: () => Promise<void> | void;
};

const CAP = 20;
const undoStack: UndoEntry[] = [];
const redoStack: UndoEntry[] = [];

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());

export function subscribeUndo(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function pushUndo(entry: UndoEntry, opts: { showToast?: boolean } = {}) {
  undoStack.push(entry);
  if (undoStack.length > CAP) undoStack.shift();
  redoStack.length = 0;
  notify();
  if (opts.showToast !== false) {
    toast(entry.label, {
      duration: 8000,
      action: {
        label: "↶ بازگردانی",
        onClick: () => undoLast(),
      },
    });
  }
}

export async function undoLast() {
  const entry = undoStack.pop();
  if (!entry) {
    toast.info("چیزی برای بازگردانی نیست");
    return;
  }
  try {
    await entry.undo();
    if (entry.redo) {
      redoStack.push(entry);
      if (redoStack.length > CAP) redoStack.shift();
    }
    toast.success(`بازگردانی شد: ${entry.label}`);
    notify();
  } catch (e: any) {
    toast.error(e?.message || "خطا در بازگردانی");
    // put back so user can retry
    undoStack.push(entry);
  }
}

export async function redoLast() {
  const entry = redoStack.pop();
  if (!entry || !entry.redo) {
    toast.info("چیزی برای انجام مجدد نیست");
    return;
  }
  try {
    await entry.redo();
    undoStack.push(entry);
    toast.success(`انجام مجدد: ${entry.label}`);
    notify();
  } catch (e: any) {
    toast.error(e?.message || "خطا در انجام مجدد");
    redoStack.push(entry);
  }
}

export function canUndo() { return undoStack.length > 0; }
export function canRedo() { return redoStack.length > 0; }

/** Install global Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z listeners (skips when typing in editable fields). */
export function installUndoShortcuts() {
  const isEditable = (el: EventTarget | null) => {
    if (!(el instanceof HTMLElement)) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (el.isContentEditable) return true;
    if (el.closest('[contenteditable="true"]')) return true;
    return false;
  };
  const handler = (e: KeyboardEvent) => {
    const meta = e.metaKey || e.ctrlKey;
    if (!meta) return;
    if (e.key !== "z" && e.key !== "Z") return;
    if (isEditable(e.target)) return; // let editors handle their own undo
    e.preventDefault();
    if (e.shiftKey) redoLast();
    else undoLast();
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
