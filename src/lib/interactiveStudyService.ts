import { collection, db, getDocs, query, where } from "@/lib/firebase";
import { saveEntityToFirestore, type SupportedFirestoreCollection } from "@/lib/firestoreSync";
import { cacheGet, cacheSet, enqueueOp, getPendingOps } from "@/lib/offlineQueue";
import { reconcileRemoteRowsWithPending } from "@/lib/offlineReconcile";
import { sanitizeKnowledgeHtml } from "@/lib/knowledgeBeautifier";

export const INTERACTIVE_STUDY_COLLECTION: SupportedFirestoreCollection = "interactive_study_sessions";
const MAX_SESSION_HTML_BYTES = 700 * 1024;
const REMOTE_SAVE_TIMEOUT_MS = 8_000;

export interface InteractiveStudySession {
  id: string;
  user_id: string;
  document_id: string;
  document_title: string;
  language: "fa" | "en";
  content_html: string;
  status: "in_progress" | "completed";
  created_at: string;
  updated_at: string;
}

export type InteractiveStudySaveStatus = "saved" | "queued" | "failed";

export type InteractiveStudyDraftLoadResult =
  | { ok: true; session: InteractiveStudySession | null; source: "remote" | "cache" | "none" }
  | { ok: false; error: string };

function cacheKey(userId: string, documentId: string, language: "fa" | "en") {
  return `interactive-study-session:v1:${encodeURIComponent(userId)}:${encodeURIComponent(documentId)}:${language}`;
}

function makeSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `study-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

function normalizeSession(row: Record<string, unknown>, id: string): InteractiveStudySession | null {
  if (
    typeof row.user_id !== "string" ||
    typeof row.document_id !== "string" ||
    typeof row.document_title !== "string" ||
    (row.language !== "fa" && row.language !== "en") ||
    typeof row.content_html !== "string" ||
    (row.status !== "in_progress" && row.status !== "completed") ||
    typeof row.created_at !== "string" ||
    typeof row.updated_at !== "string"
  ) return null;
  if (!Number.isFinite(Date.parse(row.created_at)) || !Number.isFinite(Date.parse(row.updated_at))) return null;

  return {
    id,
    user_id: row.user_id,
    document_id: row.document_id,
    document_title: row.document_title,
    language: row.language,
    content_html: sanitizeKnowledgeHtml(row.content_html),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function createInteractiveStudySessionDraft(
  userId: string,
  documentId: string,
  documentTitle: string,
  language: "fa" | "en",
  html: string,
): InteractiveStudySession {
  const now = new Date().toISOString();
  return {
    id: makeSessionId(),
    user_id: userId.trim(),
    document_id: documentId.trim(),
    document_title: documentTitle.trim(),
    language,
    content_html: sanitizeKnowledgeHtml(html),
    status: "in_progress",
    created_at: now,
    updated_at: now,
  };
}

function validateSession(session: InteractiveStudySession): string | null {
  if (!session.user_id.trim() || !session.id.trim() || !session.document_id.trim()) {
    return "A signed-in owner, session ID, and source lesson are required.";
  }
  if (session.language !== "fa" && session.language !== "en") return "Unsupported study language.";
  const html = sanitizeKnowledgeHtml(session.content_html);
  if (session.status !== "in_progress" && session.status !== "completed") return "Unsupported session status.";
  if (!Number.isFinite(Date.parse(session.created_at)) || !Number.isFinite(Date.parse(session.updated_at))) {
    return "Valid session timestamps are required.";
  }
  if (!html) return "The interactive session is empty.";
  if (new TextEncoder().encode(html).byteLength > MAX_SESSION_HTML_BYTES) {
    return "This session is too large to save safely. Reduce the generated content and try again.";
  }
  return null;
}

async function saveWithTimeout(session: InteractiveStudySession): Promise<boolean> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      saveEntityToFirestore(
        session.user_id,
        INTERACTIVE_STUDY_COLLECTION,
        session.id,
        session as unknown as Record<string, unknown>,
      ),
      new Promise<false>((resolve) => {
        timeoutId = setTimeout(() => resolve(false), REMOTE_SAVE_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return false;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function cacheSessionSafely(key: string, session: InteractiveStudySession | null): Promise<void> {
  try {
    await cacheSet(key, session);
  } catch (error) {
    // The Firestore write or durable outbox is the source of truth. Cache is only
    // an acceleration/offline recovery layer and must not turn a confirmed save
    // into an unhandled failure.
    console.warn("Could not update the interactive-study cache", error);
  }
}

/** Persists an owner-scoped draft; offline writes must be durably queued or are reported as failed. */
export async function persistInteractiveStudySession(
  input: InteractiveStudySession,
): Promise<{ status: InteractiveStudySaveStatus; session: InteractiveStudySession; error?: string }> {
  const invalid = validateSession(input);
  if (invalid) return { status: "failed", session: input, error: invalid };

  const html = sanitizeKnowledgeHtml(input.content_html);
  const previousTime = Date.parse(input.updated_at);
  const updatedAt = new Date(Math.max(Date.now(), Number.isFinite(previousTime) ? previousTime + 1 : 0)).toISOString();
  const session = { ...input, content_html: html, updated_at: updatedAt };

  if (isOnline() && await saveWithTimeout(session)) {
    await cacheSessionSafely(cacheKey(session.user_id, session.document_id, session.language), session);
    return { status: "saved", session };
  }

  let queued = false;
  try {
    queued = await enqueueOp({
      ownerId: session.user_id,
      table: INTERACTIVE_STUDY_COLLECTION,
      op: "upsert",
      payload: session,
      match: { id: session.id },
    });
  } catch {
    queued = false;
  }

  if (!queued) {
    return {
      status: "failed",
      session,
      error: "The session could not be confirmed in the cloud or safely queued on this device.",
    };
  }

  await cacheSessionSafely(cacheKey(session.user_id, session.document_id, session.language), session);
  return { status: "queued", session };
}

function latestDraft(rows: InteractiveStudySession[], documentId: string, language: "fa" | "en") {
  return rows
    .filter((row) => row.document_id === documentId && row.language === language && row.status === "in_progress")
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0] || null;
}

/** Loads the most recent resumable draft for one exact source document and language. */
export async function loadLatestInteractiveStudyDraft(
  userId: string,
  documentId: string,
  language: "fa" | "en",
): Promise<InteractiveStudyDraftLoadResult> {
  if (!userId.trim() || !documentId.trim()) return { ok: false, error: "A user and source lesson are required." };

  const key = cacheKey(userId, documentId, language);
  const cachedValue = await cacheGet<InteractiveStudySession | null>(key).catch(() => undefined);
  const cached = cachedValue && cachedValue.user_id === userId && cachedValue.document_id === documentId
    ? [cachedValue]
    : [];

  if (!isOnline()) {
    const pending = await getPendingOps(INTERACTIVE_STUDY_COLLECTION);
    const recovered = latestDraft(
      reconcileRemoteRowsWithPending(cached, cached, pending, INTERACTIVE_STUDY_COLLECTION, userId),
      documentId,
      language,
    );
    if (recovered) return { ok: true, session: recovered, source: "cache" };
    return cachedValue === null ? { ok: true, session: null, source: "none" } : {
      ok: false,
      error: "No saved draft is available offline. Reconnect to check your account's saved sessions.",
    };
  }

  try {
    const snapshot = await getDocs(query(
      collection(db, "users", userId, INTERACTIVE_STUDY_COLLECTION),
      where("document_id", "==", documentId),
    ));
    const remote = snapshot.docs
      .map((entry) => normalizeSession(entry.data() as Record<string, unknown>, entry.id))
      .filter((entry): entry is InteractiveStudySession => Boolean(entry && entry.user_id === userId));
    const pending = await getPendingOps(INTERACTIVE_STUDY_COLLECTION);
    const reconciled = reconcileRemoteRowsWithPending(
      remote,
      cached,
      pending,
      INTERACTIVE_STUDY_COLLECTION,
      userId,
    ).filter((entry) => entry.document_id === documentId && entry.language === language);
    const draft = latestDraft(reconciled, documentId, language);
    await cacheSessionSafely(key, draft);
    return { ok: true, session: draft, source: draft ? "remote" : "none" };
  } catch (error) {
    const pending = await getPendingOps(INTERACTIVE_STUDY_COLLECTION).catch(() => []);
    const recovered = latestDraft(
      reconcileRemoteRowsWithPending(cached, cached, pending, INTERACTIVE_STUDY_COLLECTION, userId),
      documentId,
      language,
    );
    if (recovered) return { ok: true, session: recovered, source: "cache" };
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Saved sessions could not be loaded.",
    };
  }
}
