import type { QueuedOp } from "./offlineQueue";

type IdentifiedRow = { id: string };

function queuedRowId(op: QueuedOp): string | undefined {
  const payload = op.payload && typeof op.payload === "object"
    ? op.payload as Record<string, unknown>
    : undefined;
  const candidate = payload?.id ?? op.match?.id;
  return typeof candidate === "string" && candidate ? candidate : undefined;
}

/**
 * Treats a successful remote read as authoritative while replaying only the
 * current user's pending local mutations over it. This prevents records that
 * were deleted on another device from being resurrected by an old cache.
 */
export function reconcileRemoteRowsWithPending<T extends IdentifiedRow>(
  remote: T[],
  cached: T[],
  pendingOps: QueuedOp[],
  table: string,
  ownerId: string,
): T[] {
  const rows = new Map(remote.map((row) => [row.id, row]));
  const cachedRows = new Map(cached.map((row) => [row.id, row]));

  const relevantOps = pendingOps
    .filter((op) => op.table === table && op.ownerId === ownerId)
    .sort((left, right) => left.createdAt - right.createdAt);

  for (const op of relevantOps) {
    const id = queuedRowId(op);
    if (!id) continue;

    if (op.op === "delete") {
      rows.delete(id);
      continue;
    }

    if (!op.payload || typeof op.payload !== "object") continue;
    const payload = op.payload as Partial<T>;
    const base = rows.get(id) ?? cachedRows.get(id);
    rows.set(id, { ...(base || {}), ...payload, id } as T);
  }

  return Array.from(rows.values());
}
