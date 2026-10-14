import { z } from "zod";
import { exportMindSessions, importMindSessions } from "./sessionService";
import { workspaceDraftKey } from "./workspaceDraft";
import { validMindDraftValue, validMindTimestamp } from "./draftValidation";

const draftSchema = z.object({ version: z.literal(1), owner: z.string(), slot: z.string().min(1), updatedAt: z.number().refine(validMindTimestamp), value: z.record(z.unknown()) }).refine(draft => validMindDraftValue(draft.slot, draft.value));
const feedbackSchema = z.object({ version: z.literal(1), ownerId: z.string(), items: z.array(z.object({
  id: z.string(), toolId: z.string(), toolVersion: z.string(), sessionId: z.string(), createdAt: z.string().refine(value => Number.isFinite(Date.parse(value))),
  response: z.enum(["helpful", "no_change", "uncomfortable", "unsure"]),
})) });
const legacySchema = z.object({ text: z.string(), path: z.enum(["think", "worry"]).nullable(), updatedAt: z.number().finite() });
const recoverySchema = z.object({ ownerId: z.string(), targetKey: z.string(), raw: z.string() }).strict();
const backupSchema = z.object({ format: z.literal("mind-device-backup"), version: z.literal(1), ownerId: z.string().min(1),
  sessions: z.string(), drafts: z.array(draftSchema), feedback: feedbackSchema.nullable(), legacy: legacySchema.nullable(), recoveries: z.array(recoverySchema).default([]) }).strict();
export type DeviceResult<T> = { ok: true; value: T } | { ok: false; reason: string };
const prefix = (ownerId: string) => `arshiam:mind:workspace:v1:${encodeURIComponent(ownerId)}:`;
const recoveryPrefix = (ownerId: string) => `arshiam:mind:recovery:v1:${encodeURIComponent(ownerId)}:`;
export function readMindRecoveryCandidates(ownerId: string): DeviceResult<z.infer<typeof recoverySchema>[]> {
  try {
    const values: z.infer<typeof recoverySchema>[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(recoveryPrefix(ownerId))) continue;
      const candidate = recoverySchema.parse(JSON.parse(localStorage.getItem(key)!));
      if (candidate.ownerId !== ownerId) return { ok: false, reason: "owner-mismatch" };
      values.push(candidate);
    }
    return { ok: true, value: values };
  } catch { return { ok: false, reason: "unreadable-recovery" }; }
}
function preserveCandidate(ownerId: string, targetKey: string, raw: string): boolean {
  const candidates = readMindRecoveryCandidates(ownerId);
  if (candidates.ok === false) return false;
  if (candidates.value.some(item => item.targetKey === targetKey && item.raw === raw)) return true;
  const key = `${recoveryPrefix(ownerId)}${crypto.randomUUID()}`;
  const value = JSON.stringify({ ownerId, targetKey, raw });
  localStorage.setItem(key, value);
  return localStorage.getItem(key) === value;
}

export function listMindDeviceDrafts(ownerId: string): DeviceResult<z.infer<typeof draftSchema>[]> {
  if (!ownerId) return { ok: false, reason: "invalid-owner" };
  try {
    const drafts: z.infer<typeof draftSchema>[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix(ownerId))) continue;
      const draft = draftSchema.parse(JSON.parse(localStorage.getItem(key)!));
      if (draft.owner !== ownerId || key !== workspaceDraftKey(ownerId, draft.slot)) return { ok: false, reason: "owner-or-schema-mismatch" };
      drafts.push(draft);
    }
    return { ok: true, value: drafts.sort((a, b) => b.updatedAt - a.updatedAt) };
  } catch { return { ok: false, reason: "unreadable-drafts" }; }
}

/** Explicit private device backup, separate from general task/note backups. */
export function exportMindDeviceData(ownerId: string): DeviceResult<string> {
  const drafts = listMindDeviceDrafts(ownerId);
  const sessions = exportMindSessions(ownerId);
  const recoveries = readMindRecoveryCandidates(ownerId);
  if (drafts.ok === false) return drafts;
  if (sessions.ok === false) return sessions;
  if (recoveries.ok === false) return recoveries;
  try {
    const feedbackRaw = localStorage.getItem(`arshiam:mind:feedback:v1:${encodeURIComponent(ownerId)}`);
    const feedback = feedbackRaw === null ? null : feedbackSchema.parse(JSON.parse(feedbackRaw));
    if (feedback && feedback.ownerId !== ownerId) return { ok: false, reason: "owner-mismatch" };
    const legacyRaw = localStorage.getItem(`mind_draft_v1_${ownerId}`);
    const legacy = legacyRaw === null ? null : legacySchema.parse(JSON.parse(legacyRaw));
    return { ok: true, value: JSON.stringify({ format: "mind-device-backup", version: 1, ownerId, sessions: sessions.value, drafts: drafts.value, feedback, legacy, recoveries: recoveries.value }) };
  } catch { return { ok: false, reason: "unreadable-local-data" }; }
}

export function importMindDeviceData(ownerId: string, raw: string): DeviceResult<{ imported: number; conflicts: number }> {
  try {
    const backup = backupSchema.parse(JSON.parse(raw));
    if (!ownerId || backup.ownerId !== ownerId || backup.drafts.some(draft => draft.owner !== ownerId)
      || (backup.feedback && backup.feedback.ownerId !== ownerId) || backup.recoveries.some(item => item.ownerId !== ownerId)) return { ok: false, reason: "owner-mismatch" };
    if (new Set(backup.drafts.map(draft => draft.slot)).size !== backup.drafts.length) return { ok: false, reason: "duplicate-draft" };
    const restored = importMindSessions(ownerId, backup.sessions);
    if (restored.ok === false) return restored;
    let imported = restored.value.imported;
    let conflicts = restored.value.conflicts.length;
    const records = backup.drafts.map(draft => ({ key: workspaceDraftKey(ownerId, draft.slot), value: JSON.stringify(draft) }));
    if (backup.feedback) records.push({ key: `arshiam:mind:feedback:v1:${encodeURIComponent(ownerId)}`, value: JSON.stringify(backup.feedback) });
    if (backup.legacy) records.push({ key: `mind_draft_v1_${ownerId}`, value: JSON.stringify(backup.legacy) });
    for (const record of records) {
      const previous = localStorage.getItem(record.key);
      if (previous === record.value) continue;
      if (previous !== null) {
        // Preserve the imported candidate, never replace an open editor's copy.
        if (!preserveCandidate(ownerId, record.key, record.value)) return { ok: false, reason: "recovery-write-failed" };
        conflicts++;
      } else {
        localStorage.setItem(record.key, record.value);
        if (localStorage.getItem(record.key) !== record.value) return { ok: false, reason: "restore-write-failed" };
        imported++;
      }
    }
    for (const recovery of backup.recoveries) if (!preserveCandidate(ownerId, recovery.targetKey, recovery.raw)) return { ok: false, reason: "recovery-write-failed" };
    window.dispatchEvent(new CustomEvent("arshiam:mind-workspace", { detail: { key: "restore" } }));
    window.dispatchEvent(new CustomEvent("arshiam:mind-device-data"));
    return { ok: true, value: { imported, conflicts } };
  } catch { return { ok: false, reason: "invalid-backup-or-storage-failed" }; }
}

/** Deliberate owner-scoped deletion; never deletes cloud records or tasks/notes. */
export function clearMindDeviceData(ownerId: string): boolean {
  if (!ownerId) return false;
  try {
    const roots = [prefix(ownerId), `arshiam:mind:session:v1:${encodeURIComponent(ownerId)}:`, `arshiam:mind:recovery:v1:${encodeURIComponent(ownerId)}:`];
    const exact = new Set([`mind_draft_v1_${ownerId}`, `arshiam:mind:feedback:v1:${encodeURIComponent(ownerId)}`]);
    const selected: string[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key && (exact.has(key) || roots.some(root => key.startsWith(root)))) selected.push(key);
    }
    for (const key of selected) { localStorage.removeItem(key); if (localStorage.getItem(key) !== null) return false; }
    window.dispatchEvent(new CustomEvent("arshiam:mind-device-data"));
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    return true;
  } catch { return false; }
}
