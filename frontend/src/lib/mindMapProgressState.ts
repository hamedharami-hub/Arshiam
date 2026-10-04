export type MindMapStudyStatus = "later" | "studying" | "done";
export type MindMapStudyProgress = Record<string, MindMapStudyStatus>;
export type MindMapProgressEntry = {
  status: MindMapStudyStatus;
  updatedAt: number;
  revision: number;
  mutationId: string;
  pending: boolean;
};
export type MindMapProgressEntries = Record<string, MindMapProgressEntry>;

export function sanitizeProgress(raw: unknown): MindMapStudyProgress {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter(([, value]) =>
    value === "later" || value === "studying" || value === "done")) as MindMapStudyProgress;
}

export function readProgressEntries(raw: unknown, pending = false): MindMapProgressEntries {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const entries: MindMapProgressEntries = {};
  for (const [id, value] of Object.entries(raw)) {
    const entry = value as Partial<MindMapProgressEntry> | null;
    if (!entry || !sanitizeProgress({ [id]: entry.status })[id]) continue;
    if (!Number.isSafeInteger(entry.updatedAt) || entry.updatedAt! < 0
      || !Number.isSafeInteger(entry.revision) || entry.revision! < 0
      || typeof entry.mutationId !== "string") continue;
    entries[id] = { status: entry.status!, updatedAt: entry.updatedAt!, revision: entry.revision!,
      mutationId: entry.mutationId, pending: pending && entry.pending === true };
  }
  return entries;
}

export function progressFromEntries(entries: MindMapProgressEntries): MindMapStudyProgress {
  return Object.fromEntries(Object.entries(entries).map(([id, entry]) => [id, entry.status]));
}

export function compareProgressEntries(a: MindMapProgressEntry, b: MindMapProgressEntry): number {
  return a.updatedAt - b.updatedAt || a.revision - b.revision || a.mutationId.localeCompare(b.mutationId);
}

/** Only confirmed server state may acknowledge a pending local mutation. */
export function mergeProgressEntries(local: MindMapProgressEntries, remote: MindMapProgressEntries,
  confirmed = false): MindMapProgressEntries {
  const result = { ...local };
  for (const [id, incoming] of Object.entries(remote)) {
    const current = result[id];
    if (!current || compareProgressEntries(incoming, current) > 0) {
      result[id] = { ...incoming, pending: false };
    } else if (confirmed && compareProgressEntries(incoming, current) === 0) {
      result[id] = { ...current, pending: false };
    }
  }
  return result;
}

export function entriesFromCloud(data: Record<string, unknown> | undefined): MindMapProgressEntries {
  const entries = readProgressEntries(data?.entries);
  const time = typeof data?.updated_at === "string" ? Date.parse(data.updated_at) : 0;
  for (const [id, status] of Object.entries(sanitizeProgress(data?.progress))) {
    if (!entries[id]) entries[id] = { status, updatedAt: Number.isFinite(time) ? Math.max(0, time) : 0,
      revision: 0, mutationId: `legacy:${id}:${status}`, pending: false };
  }
  return entries;
}
