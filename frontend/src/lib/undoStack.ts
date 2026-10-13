// Lightweight global undo/redo stack for destructive actions.
// Items are kept only in memory; capacity = 20. Related saves can opt into a
// short merge window for repeated high-impact actions, never routine autosaves.
// Each entry has: a label, an `undo` and optional `redo`.

import { toast } from "sonner";

export type UndoEntry = {
  /** Only high-impact operations belong in application recovery history. */
  importance?: "delete" | "bulk" | "replace";
  label: string;
  undo: () => Promise<void> | void;
  redo?: () => Promise<void> | void;
  /** Optional payload for actions whose merge closure needs to track the latest autosaved value. */
  mergeData?: unknown;
  onMerge?: (latestMergeData: unknown) => void;
};

type StoredUndoEntry = UndoEntry & { mergeKey?: string; updatedAt?: number };

const CAP = 20;
const undoStack: StoredUndoEntry[] = [];
const redoStack: StoredUndoEntry[] = [];
let running = false;

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());

export function subscribeUndo(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function pushUndo(entry: UndoEntry, opts: { showToast?: boolean; mergeKey?: string; mergeWindowMs?: number } = {}) {
  if (!entry.importance) return;
  const now = Date.now();
  const previous = undoStack[undoStack.length - 1];
  const shouldMerge = Boolean(
    opts.mergeKey &&
    previous?.importance === entry.importance &&
    previous?.mergeKey === opts.mergeKey &&
    previous.updatedAt != null &&
    now - previous.updatedAt <= (opts.mergeWindowMs ?? 8000),
  );

  if (shouldMerge && previous) {
    // Keep the first undo snapshot but replace redo with the latest committed value.
    previous.onMerge?.(entry.mergeData);
    undoStack[undoStack.length - 1] = {
      ...entry,
      undo: previous.undo,
      onMerge: previous.onMerge,
      mergeData: previous.mergeData,
      mergeKey: opts.mergeKey,
      updatedAt: now,
    };
  } else {
    undoStack.push({ ...entry, mergeKey: opts.mergeKey, updatedAt: now });
  }
  if (undoStack.length > CAP) undoStack.shift();
  redoStack.length = 0;
  notify();
  if (opts.showToast !== false && !shouldMerge) {
    toast(entry.label, {
      duration: 8000,
      action: {
        label: "↶ بازگردانی",
        onClick: () => undoEntry(entry.undo),
      },
    });
  }
}

export async function undoLast() {
  await undoEntry(undoStack[undoStack.length - 1]?.undo);
}

async function undoEntry(undo?: UndoEntry["undo"]) {
  if (running) return;
  const index = undoStack.findIndex(entry => entry.undo === undo);
  const entry = index >= 0 ? undoStack.splice(index, 1)[0] : undefined;
  if (!entry) {
    toast.info("چیزی برای بازگردانی نیست");
    return;
  }
  running = true;
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
    undoStack.splice(Math.min(index, undoStack.length), 0, entry);
    if (undoStack.length > CAP) undoStack.shift();
    notify();
  } finally {
    running = false;
  }
}

export async function redoLast() {
  if (running) return;
  const entry = redoStack.pop();
  if (!entry || !entry.redo) {
    toast.info("چیزی برای انجام مجدد نیست");
    return;
  }
  running = true;
  try {
    await entry.redo();
    undoStack.push(entry);
    if (undoStack.length > CAP) undoStack.shift();
    toast.success(`انجام مجدد: ${entry.label}`);
    notify();
  } catch (e: any) {
    toast.error(e?.message || "خطا در انجام مجدد");
    redoStack.push(entry);
  } finally {
    running = false;
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
    if (e.isComposing || isEditable(e.target)) return; // let editors handle their own undo
    if (e.shiftKey ? !canRedo() : !canUndo()) return;
    e.preventDefault();
    if (e.shiftKey) redoLast();
    else undoLast();
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
