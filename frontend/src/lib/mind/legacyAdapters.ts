import { z } from "zod";
import { legacyRefSchema, type MindLegacyRef, type MindSaveResult } from "./sessionTypes";
import { createMindSession, listMindSessionsChecked, listMindSessionVersions, updateMindSession, readMindSession, attachMindTool } from "./sessionService";

export const legacyMindDraftKey = (ownerId: string) => `mind_draft_v1_${ownerId}`;
const draftSchema = z.object({ text: z.string(), path: z.enum(["think", "worry"]).nullable().optional(), updatedAt: z.number().optional() });
/** Opt-in migration: never claims the old draft's language, answers or completion time.
 * The destination provenance is the migration marker, checked by a fresh read.
 * Original storage is neither modified nor removed. */
export function migrateLegacyMindDraft(ownerId: string): MindSaveResult {
  if (!ownerId) return { ok: false, reason: "invalid-owner" };
  try {
    const sourceKey = legacyMindDraftKey(ownerId);
    const sessions = listMindSessionsChecked(ownerId);
    if (sessions.ok === false) return { ok: false, reason: sessions.reason };
    const raw = localStorage.getItem(sourceKey);
    const draft = raw === null ? null : draftSchema.parse(JSON.parse(raw));
    const existing = sessions.value.find(s => s.legacyDraft?.migrationVersion === 1 && s.legacyDraft.sourceKey === sourceKey);
    if (existing) return !draft || (draft.text === existing.legacyDraft!.text && (draft.path ?? null) === existing.legacyDraft!.path)
      ? { ok: true, session: existing } : { ok: false, reason: "legacy-draft-changed" };
    // Recover an interrupted append-before-head write using its original identity.
    const versions = listMindSessionVersions(ownerId);
    if (versions.ok === false) return { ok: false, reason: versions.reason };
    const candidates = versions.value.filter(v => v.session.legacyDraft?.sourceKey === sourceKey);
    if (new Set(candidates.map(v => v.session.id)).size > 1) return { ok: false, reason: "migration-conflict" };
    if (candidates.length) {
      const candidate = candidates[0].session;
      if (draft && (draft.text !== candidate.legacyDraft!.text || (draft.path ?? null) !== candidate.legacyDraft!.path)) return { ok: false, reason: "legacy-draft-changed" };
      return updateMindSession(ownerId, candidate, 0);
    }
    if (!draft) return { ok: false, reason: "no-legacy-draft" };
    if (!draft.text.trim()) return { ok: false, reason: "empty-legacy-draft" };
    const result = createMindSession(ownerId, draft.text, null, {
      migrationVersion: 1, sourceKey, text: draft.text, path: draft.path ?? null,
    });
    if (result.ok === false) return result;
    const verified = readMindSession(ownerId, result.session.id);
    return verified.ok && verified.value && JSON.stringify(verified.value) === JSON.stringify(result.session)
      ? result : { ok: false, reason: "migration-verification-failed" };
  } catch { return { ok: false, reason: "invalid-or-unreadable-legacy-draft" }; }
}
/** A reference only: the legacy collection remains authoritative for its artifact.
 * This adapter performs no cloud reads, copies, dual-writes, or deletes. */
export function attachLegacyMindTool(ownerId: string, sessionId: string, toolId: string,
  slot: string, legacyRef: MindLegacyRef, toolVersion = "unknown"): MindSaveResult {
  const parsed = legacyRefSchema.safeParse(legacyRef);
  if (parsed.success === false || parsed.data.ownerId !== ownerId) return { ok: false, reason: "owner-mismatch" };
  return attachMindTool(ownerId, sessionId, toolId, slot, { toolVersion, legacyRef: parsed.data });
}
