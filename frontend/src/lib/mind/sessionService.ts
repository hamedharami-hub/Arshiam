import { z } from "zod";
import { mindSessionSchema, type MindSession, type MindSaveResult, type MindResult, type MindLegacyRef } from "./sessionTypes";

const PREFIX = "arshiam:mind:session:v1:";
export const mindSessionKey = (ownerId: string, sessionId: string) =>
  `${PREFIX}${encodeURIComponent(ownerId)}:${encodeURIComponent(sessionId)}`;
const ownerPrefix = (ownerId: string) => `${PREFIX}${encodeURIComponent(ownerId)}:`;
export interface MindSessionVersion {
  id: string; kind: "saved" | "conflict" | "reconcile" | "import"; session: MindSession;
}
const versionSchema = z.object({ id: z.string().min(1), kind: z.enum(["saved", "conflict", "reconcile", "import"]), session: mindSessionSchema })
  .strict().transform((value): MindSessionVersion => value as MindSessionVersion);
interface MindSessionBackup {
  format: "mind-local-sessions"; schemaVersion: 1; ownerId: string;
  sessions: MindSession[]; versions: MindSessionVersion[];
}
const backupSchema = z.object({
  format: z.literal("mind-local-sessions"), schemaVersion: z.literal(1), ownerId: z.string().min(1),
  sessions: z.array(mindSessionSchema), versions: z.array(versionSchema),
}).strict().transform((value): MindSessionBackup => value as MindSessionBackup);
const uuid = () => crypto.randomUUID();
/** Notifications are advisory and cannot turn a verified write into a failure. */
function emitSaved(ownerId: string): void {
  try { window.dispatchEvent(new CustomEvent("arshiam:mind-session", { detail: { ownerId } })); } catch { /* no browser event target */ }
}
function checkedWrite(key: string, raw: string): boolean {
  try { localStorage.setItem(key, raw); return localStorage.getItem(key) === raw; } catch { return false; }
}
function keys(ownerId: string): string[] {
  const result: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(ownerPrefix(ownerId))) result.push(key);
  }
  return result;
}
function decode(raw: string, ownerId: string, sessionId?: string): MindSession {
  const value = mindSessionSchema.parse(JSON.parse(raw));
  if (value.ownerId !== ownerId || (sessionId && value.id !== sessionId)) throw new Error("Owner or identity mismatch");
  return value;
}
export function readMindSession(ownerId: string, sessionId: string): MindResult<MindSession | null> {
  if (!ownerId || !sessionId) return { ok: false, reason: "invalid-identity" };
  try {
    const raw = localStorage.getItem(mindSessionKey(ownerId, sessionId));
    return { ok: true, value: raw === null ? null : decode(raw, ownerId, sessionId) };
  } catch { return { ok: false, reason: "unreadable-storage" }; }
}
/** Convenience readers fail closed; use checked variants to distinguish empty from error. */
export function getMindSession(ownerId: string, sessionId: string): MindSession | null {
  const result = readMindSession(ownerId, sessionId);
  return result.ok ? result.value : null;
}
export function listMindSessionsChecked(ownerId: string): MindResult<MindSession[]> {
  if (!ownerId) return { ok: false, reason: "invalid-owner" };
  try {
    const sessions = keys(ownerId).filter(k => !k.includes(":version:")).map(k => {
      const session = decode(localStorage.getItem(k)!, ownerId);
      if (k !== mindSessionKey(ownerId, session.id)) throw new Error("Identity mismatch");
      return session;
    });
    return { ok: true, value: sessions.sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id)) };
  } catch { return { ok: false, reason: "unreadable-storage" }; }
}
export function listMindSessions(ownerId: string): MindSession[] {
  const result = listMindSessionsChecked(ownerId);
  return result.ok ? result.value : [];
}
export function getActiveMindSession(ownerId: string): MindSession | null {
  return listMindSessions(ownerId).find(s => s.status === "draft" || s.status === "paused") ?? null;
}
function preserve(session: MindSession, kind: MindSessionVersion["kind"]): boolean {
  const version: MindSessionVersion = { id: uuid(), kind, session };
  return checkedWrite(`${mindSessionKey(session.ownerId, session.id)}:version:${version.id}`, JSON.stringify(version));
}
export function listMindSessionVersions(ownerId: string, sessionId?: string): MindResult<MindSessionVersion[]> {
  if (!ownerId) return { ok: false, reason: "invalid-owner" };
  try {
    const values = keys(ownerId).filter(k => k.includes(":version:")).map(k => {
      const version = versionSchema.parse(JSON.parse(localStorage.getItem(k)!));
      if (version.session.ownerId !== ownerId || k !== `${mindSessionKey(ownerId, version.session.id)}:version:${version.id}`) throw new Error("Foreign version");
      return version;
    }).filter(v => !sessionId || v.session.id === sessionId);
    return { ok: true, value: values };
  } catch { return { ok: false, reason: "unreadable-storage" }; }
}
function immutableReferences(current: MindSession, next: MindSession): boolean {
  return current.steps.every(step => {
    const proposed = next.steps.find(s => s.stepId === step.stepId);
    return proposed && proposed.toolId === step.toolId && proposed.toolVersion === step.toolVersion
      && proposed.slot === step.slot && JSON.stringify(proposed.legacyRef) === JSON.stringify(step.legacyRef);
  }) && current.actions.every(action => {
    const proposed = next.actions.find(a => a.id === action.id);
    return proposed && proposed.suggestionId === action.suggestionId && proposed.destination === action.destination
      && (action.status !== "converted" || (proposed.status === "converted" && proposed.destinationId === action.destinationId));
  }) && current.suggestions.every(s => next.suggestions.some(n => n.id === s.id
    && n.source === s.source && n.reason === s.reason && n.text === s.text && n.inputRevision === s.inputRevision))
    && current.feedback.every(f => next.feedback.some(n => n.id === f.id && JSON.stringify(n) === JSON.stringify(f)))
    && JSON.stringify(current.legacyDraft) === JSON.stringify(next.legacyDraft);
}
/** expectedRevision=0 creates only. No unknown/future schema is ever replaced. */
export function updateMindSession(ownerId: string, session: MindSession, expectedRevision: number): MindSaveResult {
  return save(ownerId, session, expectedRevision, "saved");
}
function save(ownerId: string, input: MindSession, expectedRevision: number, kind: MindSessionVersion["kind"]): MindSaveResult {
  if (!ownerId || input?.ownerId !== ownerId || !Number.isInteger(expectedRevision) || expectedRevision < 0) return { ok: false, reason: "invalid-identity" };
  try {
    const key = mindSessionKey(ownerId, input.id);
    const baseline = localStorage.getItem(key);
    const current = baseline === null ? null : decode(baseline, ownerId, input.id);
    const proposed = mindSessionSchema.parse({ ...input, revision: expectedRevision + 1,
      updatedAt: Math.max(Date.now(), input.createdAt, current?.updatedAt ?? 0) });
    if (current && current.createdAt !== proposed.createdAt) return { ok: false, reason: "immutable-reference" };
    if ((current?.revision ?? 0) !== expectedRevision) {
      return { ok: false, reason: "conflict", current: current ?? undefined, proposed, preserved: preserve(proposed, "conflict") };
    }
    if (current && !immutableReferences(current, proposed)) return { ok: false, reason: "immutable-reference" };
    // Append before replacing the head: a racing writer cannot erase this candidate.
    if (!preserve(proposed, kind)) return { ok: false, reason: "storage-write-failed", proposed, preserved: false };
    if (localStorage.getItem(key) !== baseline) return { ok: false, reason: "conflict", proposed, preserved: true };
    if (!checkedWrite(key, JSON.stringify(proposed))) return { ok: false, reason: "storage-write-failed", proposed, preserved: true };
    emitSaved(ownerId);
    return { ok: true, session: proposed };
  } catch { return { ok: false, reason: "invalid-or-unreadable-storage" }; }
}
export function beginMindSession(ownerId: string, text: string, language: "fa" | "en"): MindSaveResult {
  return createMindSession(ownerId, text, language);
}
/** null language is reserved for legacy records whose original language is unknown. */
export function createMindSession(ownerId: string, text: string, language: "fa" | "en" | null,
  legacyDraft?: MindSession["legacyDraft"]): MindSaveResult {
  const readable = listMindSessionsChecked(ownerId);
  if (readable.ok === false) return { ok: false, reason: readable.reason };
  const versions = listMindSessionVersions(ownerId);
  if (versions.ok === false) return { ok: false, reason: versions.reason };
  try {
    const now = Date.now();
    return updateMindSession(ownerId, { id: uuid(), ownerId, schemaVersion: 1, revision: 1,
      language, text, createdAt: now, updatedAt: now, goal: null, intensity: null, status: "draft",
      steps: [], suggestions: [], actions: [], feedback: [], ...(legacyDraft ? { legacyDraft } : {}) }, 0);
  } catch { return { ok: false, reason: "storage-unavailable" }; }
}
/** Resume only an explicit ID. Without one, even identical text creates a new concern. */
export function createOrResumeConcern(ownerId: string, text: string, language: "fa" | "en", sessionId?: string): MindSaveResult {
  if (!sessionId) return beginMindSession(ownerId, text, language);
  const result = readMindSession(ownerId, sessionId);
  if (result.ok === false) return { ok: false, reason: result.reason };
  return result.value ? { ok: true, session: result.value } : { ok: false, reason: "not-found" };
}
export function attachMindTool(ownerId: string, sessionId: string, toolId: string, slot: string,
  options: { toolVersion?: string; legacyRef?: MindLegacyRef } = {}): MindSaveResult {
  const read = readMindSession(ownerId, sessionId);
  if (read.ok === false) return { ok: false, reason: read.reason };
  if (!read.value) return { ok: false, reason: "not-found" };
  const session = read.value;
  const existing = session.steps.find(s => s.slot === slot);
  if (existing) return existing.toolId === toolId && existing.toolVersion === (options.toolVersion ?? "1")
    && JSON.stringify(existing.legacyRef) === JSON.stringify(options.legacyRef)
    ? { ok: true, session } : { ok: false, reason: "slot-already-attached" };
  try {
    return updateMindSession(ownerId, { ...session, steps: [...session.steps, {
      sessionId, toolId, toolVersion: options.toolVersion ?? "1", slot, stepId: uuid(), answers: {}, status: "draft",
      ...(options.legacyRef ? { legacyRef: options.legacyRef } : {}),
    }] }, session.revision);
  } catch { return { ok: false, reason: "storage-unavailable" }; }
}
export function transitionMindSession(ownerId: string, sessionId: string, status: MindSession["status"], expectedRevision: number): MindSaveResult {
  const read = readMindSession(ownerId, sessionId);
  if (read.ok === false) return { ok: false, reason: read.reason };
  return read.value ? updateMindSession(ownerId, { ...read.value, status }, expectedRevision) : { ok: false, reason: "not-found" };
}
/** User-selected/edited version; preserves all prior candidates, never auto-merges text. */
export function reconcileMindSession(ownerId: string, selected: MindSession, expectedRevision: number): MindSaveResult {
  return save(ownerId, selected, expectedRevision, "reconcile");
}
export function exportMindSessions(ownerId: string): MindResult<string> {
  const sessions = listMindSessionsChecked(ownerId);
  const versions = listMindSessionVersions(ownerId);
  if (sessions.ok === false) return { ok: false, reason: sessions.reason };
  if (versions.ok === false) return { ok: false, reason: versions.reason };
  return { ok: true, value: JSON.stringify({ format: "mind-local-sessions", schemaVersion: 1, ownerId,
    sessions: sessions.value, versions: versions.value }) };
}
/** Additive exact restore. Existing unequal heads remain unchanged and become conflicts.
 * Partial failure is retryable: no existing records or immutable versions are deleted. */
export function importMindSessions(ownerId: string, raw: string): MindResult<{ imported: number; conflicts: string[] }> {
  try {
    const backup = backupSchema.parse(JSON.parse(raw));
    if (backup.ownerId !== ownerId || backup.sessions.some(s => s.ownerId !== ownerId)
      || backup.versions.some(v => v.session.ownerId !== ownerId)) return { ok: false, reason: "owner-mismatch" };
    if (new Set(backup.sessions.map(s => s.id)).size !== backup.sessions.length
      || new Set(backup.versions.map(v => v.id)).size !== backup.versions.length) return { ok: false, reason: "duplicate-identity" };
    const readable = listMindSessionsChecked(ownerId);
    const history = listMindSessionVersions(ownerId);
    if (readable.ok === false) return { ok: false, reason: readable.reason };
    if (history.ok === false) return { ok: false, reason: history.reason };
    // Validate all collisions before writing anything.
    for (const version of backup.versions) {
      const key = `${mindSessionKey(ownerId, version.session.id)}:version:${version.id}`;
      const old = localStorage.getItem(key);
      if (old !== null && JSON.stringify(versionSchema.parse(JSON.parse(old))) !== JSON.stringify(version)) return { ok: false, reason: "version-collision" };
    }
    for (const version of backup.versions) {
      if (!checkedWrite(`${mindSessionKey(ownerId, version.session.id)}:version:${version.id}`, JSON.stringify(version))) return { ok: false, reason: "storage-write-failed" };
    }
    const conflicts: string[] = [];
    let imported = 0;
    for (const session of backup.sessions) {
      const key = mindSessionKey(ownerId, session.id);
      const old = localStorage.getItem(key);
      const next = JSON.stringify(session);
      if (old !== null && JSON.stringify(decode(old, ownerId, session.id)) !== next) {
        const duplicate = listMindSessionVersions(ownerId, session.id);
        if (duplicate.ok === false) return { ok: false, reason: duplicate.reason };
        if (!duplicate.value.some(v => JSON.stringify(v.session) === next) && !preserve(session, "import")) return { ok: false, reason: "storage-write-failed" };
        conflicts.push(session.id);
      } else if (old === null) {
        if (!preserve(session, "import") || localStorage.getItem(key) !== null || !checkedWrite(key, next)) return { ok: false, reason: "storage-write-failed" };
        imported++;
        emitSaved(ownerId);
      }
    }
    // Head writes already notified, including a prefix of an interrupted import.
    // A history/conflict-only successful import also needs a scoped refresh.
    if (imported === 0 && (backup.versions.length > 0 || conflicts.length > 0)) emitSaved(ownerId);
    return { ok: true, value: { imported, conflicts } };
  } catch { return { ok: false, reason: "invalid-or-unreadable-backup" }; }
}
