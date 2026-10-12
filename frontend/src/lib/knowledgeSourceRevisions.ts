import type { KnowledgeDocument } from "./knowledgeTypes";

type SourceFields = Pick<KnowledgeDocument, "content_html" | "content_en" | "title_en" | "preferred_language">;
export interface SourceRevision { userId: string; documentId: string; savedAt: number; source: SourceFields; expectedSource: string }
const key = (uid: string, id: string) => `arshnaz:knowledge-source-revisions:v2:${encodeURIComponent(id)}:${uid}`;
const previousKey = (uid: string, id: string) => `arshnaz:knowledge-source-revisions:v2:${encodeURIComponent(uid)}:${encodeURIComponent(id)}`;
export const sourceFingerprint = (doc: Partial<KnowledgeDocument>) => JSON.stringify([doc.title ?? "", doc.content_html ?? "", doc.content_en ?? "", doc.title_en ?? "", doc.preferred_language ?? ""]);
export function sameSourceDocument(a: KnowledgeDocument, b: KnowledgeDocument | null) {
  return !!b && a.id === b.id && a.user_id === b.user_id && a.updated_at === b.updated_at && sourceFingerprint(a) === sourceFingerprint(b);
}
export function readSourceRevisions(uid: string, id: string): SourceRevision[] {
  try {
    const current = key(uid, id);
    const previous = previousKey(uid, id);
    let serialized = localStorage.getItem(current);
    if (serialized === null && previous !== current) {
      const legacy = localStorage.getItem(previous);
      if (legacy !== null) {
        // Do not discard an old snapshot unless the copy is durably readable.
        const parsed: unknown = JSON.parse(legacy);
        if (!Array.isArray(parsed) || parsed.some(row => !row || typeof row !== "object" || (row.userId !== undefined && row.userId !== uid) || (row.documentId !== undefined && row.documentId !== id))) return [];
        const migrated = JSON.stringify(parsed.map(row => ({ ...row, userId: uid, documentId: id })));
        localStorage.setItem(current, migrated);
        if (localStorage.getItem(current) !== migrated) throw new Error("Source recovery migration could not be stored.");
        localStorage.removeItem(previous);
        serialized = migrated;
      }
    }
    const rows: unknown = JSON.parse(serialized ?? "[]");
    return Array.isArray(rows) ? rows.filter((row): row is SourceRevision => !!row && typeof row === "object" && row.userId === uid && row.documentId === id && Number.isFinite(row.savedAt) && typeof row.expectedSource === "string" && !!row.source && typeof row.source.content_html === "string" && typeof row.source.content_en === "string" && typeof row.source.title_en === "string" && typeof row.source.preferred_language === "string") : [];
  } catch { return []; }
}
/** Snapshot first: if device storage fails, do not promise recovery or overwrite. */
export function preserveSourceRevision(uid: string, doc: KnowledgeDocument, patch: Partial<KnowledgeDocument>): SourceRevision {
  if (doc.user_id !== uid || !uid || uid === "guest") throw new Error("Only the lesson owner can change its source.");
  const revision: SourceRevision = { userId: uid, documentId: doc.id, savedAt: Date.now(), source: {
    content_html: doc.content_html ?? "", content_en: doc.content_en ?? "", title_en: doc.title_en ?? "", preferred_language: doc.preferred_language ?? "en",
  }, expectedSource: sourceFingerprint({ ...doc, ...patch }) };
  const rows = [...readSourceRevisions(uid, doc.id), revision].slice(-10);
  const serialized = JSON.stringify(rows);
  localStorage.setItem(key(uid, doc.id), serialized);
  if (localStorage.getItem(key(uid, doc.id)) !== serialized) throw new Error("Source recovery could not be stored.");
  return revision;
}
export function sourceRestorePatch(uid: string, current: KnowledgeDocument, revision: SourceRevision): Partial<KnowledgeDocument> {
  if (current.user_id !== uid || !uid || uid === "guest") throw new Error("Only the lesson owner can restore its source.");
  if (revision.userId !== uid || revision.documentId !== current.id) throw new Error("This snapshot belongs to another lesson or account.");
  if (sourceFingerprint(current) !== revision.expectedSource) throw new Error("The lesson changed since this snapshot. Restore was not applied.");
  return { ...revision.source, _expected_document_updated_at: current.updated_at };
}
