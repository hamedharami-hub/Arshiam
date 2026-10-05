type FieldValue = { present: boolean; value: unknown };
type FieldIntent = { version: number; status: "pending" | "saved" | "failed"; value: FieldValue };
type FieldJournal = { baseline: FieldValue; intents: FieldIntent[] };

export type TaskPatchJournal = {
  sequence: number;
  entities: Map<string, Map<string, FieldJournal>>;
};

export type PatchResolution = { values: Record<string, unknown>; removed: string[] };

export function createTaskPatchJournal(): TaskPatchJournal {
  return { sequence: 0, entities: new Map() };
}

/** Begin an optimistic patch while retaining the last settled value for each field. */
export function beginTaskPatch<T extends object>(journal: TaskPatchJournal, entityId: string, before: T, patch: Partial<T>): number {
  const version = ++journal.sequence;
  let fields = journal.entities.get(entityId);
  if (!fields) {
    fields = new Map();
    journal.entities.set(entityId, fields);
  }
  for (const key of Object.keys(patch)) {
    let field = fields.get(key);
    if (!field) {
      const record = before as Record<string, unknown>;
      field = { baseline: { present: Object.prototype.hasOwnProperty.call(before, key), value: record[key] }, intents: [] };
      fields.set(key, field);
    }
    field.intents.push({ version, status: "pending", value: { present: true, value: (patch as Record<string, unknown>)[key] } });
  }
  return version;
}

/** Resolve a save and calculate the latest effective value without applying stale rollback. */
export function resolveTaskPatch(journal: TaskPatchJournal, entityId: string, version: number, saved: boolean): PatchResolution {
  const fields = journal.entities.get(entityId);
  const values: Record<string, unknown> = {};
  const removed: string[] = [];
  if (!fields) return { values, removed };

  for (const [key, field] of fields) {
    const intent = field.intents.find((item) => item.version === version);
    if (!intent) continue;
    intent.status = saved ? "saved" : "failed";

    while (field.intents[0] && field.intents[0].status !== "pending") {
      const settled = field.intents.shift()!;
      if (settled.status === "saved") field.baseline = settled.value;
    }

    let effective = field.baseline;
    for (const pending of field.intents) {
      if (pending.status === "pending" || pending.status === "saved") effective = pending.value;
    }
    if (effective.present) values[key] = effective.value;
    else removed.push(key);
    if (!field.intents.length) fields.delete(key);
  }
  if (!fields.size) journal.entities.delete(entityId);
  return { values, removed };
}

export function applyPatchResolution<T extends object>(current: T, resolution: PatchResolution): T {
  const next = { ...current } as Record<string, unknown>;
  for (const [key, value] of Object.entries(resolution.values)) next[key] = value;
  for (const key of resolution.removed) delete next[key];
  return next as T;
}
