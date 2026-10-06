import type { QueuedOp } from "./offlineQueue";

/** Download the held copy; it is never rewritten or silently assigned an owner. */
export function exportQueuedChange(item: QueuedOp): void {
  const blob = new Blob([JSON.stringify({ schema: 1, exportedAt: new Date().toISOString(), change: item }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `saved-change-${item.id ?? item.createdAt}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
