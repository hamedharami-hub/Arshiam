import { canReplayForOwner, type QueuedOp } from "@/lib/offlineQueue";

export type QueueProjectedNote = { id: string; user_id?: string };

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

/** Apply pending note mutations in queue order without mixing account data. */
export function projectQueuedNotes<T extends QueueProjectedNote>(
  base: T[],
  ops: QueuedOp[],
  userId: string | undefined,
): T[] {
  if (!userId) return base;

  const orderedOps = ops
    .filter((op) => op.table === "notes" && canReplayForOwner(op, userId))
    .sort((left, right) => left.createdAt - right.createdAt || (left.id ?? 0) - (right.id ?? 0));
  let projected = [...base];

  for (const op of orderedOps) {
    const payload = asRecord(op.payload);
    const matchId = typeof op.match?.id === "string" ? op.match.id : undefined;
    const payloadId = typeof payload?.id === "string" ? payload.id : undefined;

    if (op.op === "delete") {
      if (matchId) projected = projected.filter((note) => note.id !== matchId);
      continue;
    }
    if (!payload || (matchId && payloadId && matchId !== payloadId)) continue;

    const noteId = matchId || payloadId;
    if (!noteId) continue;
    const index = projected.findIndex((note) => note.id === noteId);

    if (op.op === "insert") {
      if (index < 0) projected = [{ ...payload, id: noteId } as T, ...projected];
    } else if (op.op === "upsert") {
      const queuedNote = { ...payload, id: noteId } as T;
      if (index < 0) projected = [queuedNote, ...projected];
      else projected[index] = { ...projected[index], ...queuedNote };
    } else if (op.op === "update" && index >= 0) {
      projected[index] = { ...projected[index], ...payload, id: noteId };
    }
  }

  return projected;
}
