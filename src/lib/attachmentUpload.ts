import { openDB, type IDBPDatabase } from "idb";
import { deleteObject, getDownloadURL, getMetadata, getStorage, listAll, ref, uploadBytesResumable } from "firebase/storage";
import { auth } from "@/lib/firebase";
import { ARSH_API_BASE, arshFetch, ArshApiError } from "@/lib/arshApi";

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif",
  "application/pdf",
  "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm",
  "video/mp4", "video/quicktime", "video/webm",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ATTACHMENT_ACCEPT = ALLOWED_ATTACHMENT_TYPES.join(",");

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp",
  heic: "image/heic", heif: "image/heif", pdf: "application/pdf", mp3: "audio/mpeg", m4a: "audio/mp4",
  wav: "audio/wav", ogg: "audio/ogg", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
  txt: "text/plain", doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export type AttachmentKind = "image" | "audio" | "video" | "pdf" | "file";

export type RemoteAttachment = {
  id: string;
  task_id: string;
  file_name: string;
  mime_type: string;
  kind: AttachmentKind;
  size_bytes: number;
  status: "ready";
  source: string;
  created_at: string;
  view_url: string;
  download_url: string;
};

/** Browsers (esp. Android WebView) often leave File.type empty; fall back to the extension. */
export function resolveMime(file: { name: string; type: string }): string {
  const t = (file.type || "").toLowerCase();
  if (t) return t;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return EXT_MIME[ext] || "application/octet-stream";
}

export type ValidationResult = { ok: boolean; mime: string; reason?: "too_large" | "type" | "empty" };

export function validateAttachmentFile(file: { name: string; type: string; size: number }): ValidationResult {
  const mime = resolveMime(file);
  if (file.size <= 0) return { ok: false, reason: "empty", mime };
  if (file.size > MAX_ATTACHMENT_BYTES) return { ok: false, reason: "too_large", mime };
  if (!(ALLOWED_ATTACHMENT_TYPES as readonly string[]).includes(mime)) return { ok: false, reason: "type", mime };
  return { ok: true, mime };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const FIREBASE_ID_PREFIX = "firebase:";

function attachmentFolder(uid: string, taskId: string): string {
  return `users/${uid}/task-attachments/${encodeURIComponent(taskId)}`;
}

function requireOwnerId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new ArshApiError(401, "Sign in before managing attachments");
  return uid;
}

function kindForMime(mime: string): AttachmentKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "file";
}

async function fromStorageRef(fileRef: ReturnType<typeof ref>, taskId: string): Promise<RemoteAttachment> {
  const [metadata, url] = await Promise.all([getMetadata(fileRef), getDownloadURL(fileRef)]);
  const mime = metadata.contentType || "application/octet-stream";
  return {
    id: `${FIREBASE_ID_PREFIX}${fileRef.fullPath}`,
    task_id: taskId,
    file_name: metadata.customMetadata?.fileName || decodeURIComponent(fileRef.name),
    mime_type: mime,
    kind: kindForMime(mime),
    size_bytes: metadata.size,
    status: "ready",
    source: metadata.customMetadata?.source || "device",
    created_at: metadata.timeCreated,
    view_url: url,
    download_url: url,
  };
}

export async function listAttachments(taskId: string): Promise<RemoteAttachment[]> {
  const uid = requireOwnerId();
  const folder = ref(getStorage(), attachmentFolder(uid, taskId));
  const files = await listAll(folder);
  const firebaseItems = await Promise.all(files.items.map((fileRef) => fromStorageRef(fileRef, taskId)));
  // Older native builds may have attachments in the separate FastAPI service.
  if (!ARSH_API_BASE) return firebaseItems.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const legacy = await arshFetch<{ items: RemoteAttachment[] }>(`/api/arsh/attachments?task_id=${encodeURIComponent(taskId)}`)
    .then((response) => response.items).catch(() => []);
  return [...firebaseItems, ...legacy].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function deleteAttachment(id: string): Promise<void> {
  if (id.startsWith(FIREBASE_ID_PREFIX)) {
    const path = id.slice(FIREBASE_ID_PREFIX.length);
    const uid = requireOwnerId();
    if (!path.startsWith(`users/${uid}/task-attachments/`)) throw new ArshApiError(403, "Attachment belongs to another account");
    await deleteObject(ref(getStorage(), path));
    return;
  }
  await arshFetch(`/api/arsh/attachments/${id}`, { method: "DELETE" });
}

/** Upload bytes directly to the signed-in user's private Firebase Storage path. */
export async function uploadAttachment(
  taskId: string,
  file: Blob & { name: string },
  onProgress?: (fraction: number) => void,
  source = "device",
): Promise<RemoteAttachment> {
  const v = validateAttachmentFile(file);
  if (!v.ok) throw new ArshApiError(v.reason === "too_large" ? 413 : 415, v.reason);
  const uid = requireOwnerId();
  // Keep objects directly under the task folder so listAll() can find them.
  const fileRef = ref(getStorage(), `${attachmentFolder(uid, taskId)}/${crypto.randomUUID()}_${encodeURIComponent(file.name)}`);
  return new Promise<RemoteAttachment>((resolve, reject) => {
    const upload = uploadBytesResumable(fileRef, file, {
      contentType: v.mime,
      customMetadata: { fileName: file.name, source },
    });
    upload.on("state_changed", (snapshot) => {
      if (snapshot.totalBytes > 0) onProgress?.(snapshot.bytesTransferred / snapshot.totalBytes);
    }, reject, () => {
      onProgress?.(1);
      void fromStorageRef(fileRef, taskId).then(resolve, reject);
    });
  });
}

export function isNetworkError(e: unknown): boolean {
  return (e instanceof ArshApiError && (e.status === 0 || e.status >= 502)) || e instanceof TypeError;
}

// ---------------- Offline queue (IndexedDB) ----------------

export type QueuedAttachment = {
  id: string;
  ownerId?: string;
  taskId: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  createdAt: string;
};

const QUEUE_EVENT = "arshnaz:attachment-queue-changed";
let dbPromise: Promise<IDBPDatabase> | null = null;

function queueDb() {
  if (!dbPromise) {
    dbPromise = openDB("arshnaz-attachment-queue", 1, {
      upgrade(db) {
        const store = db.createObjectStore("queue", { keyPath: "id" });
        store.createIndex("taskId", "taskId");
      },
    });
  }
  return dbPromise;
}

function notifyQueue(taskId: string) {
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT, { detail: { taskId } }));
}

export function onQueueChange(handler: (taskId: string) => void): () => void {
  const fn = (e: Event) => handler((e as CustomEvent).detail?.taskId);
  window.addEventListener(QUEUE_EVENT, fn);
  return () => window.removeEventListener(QUEUE_EVENT, fn);
}

export async function enqueueAttachment(taskId: string, file: File): Promise<QueuedAttachment> {
  const item: QueuedAttachment = {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ownerId: requireOwnerId(),
    taskId,
    name: file.name,
    type: resolveMime(file),
    size: file.size,
    blob: file,
    createdAt: new Date().toISOString(),
  };
  await (await queueDb()).put("queue", item);
  notifyQueue(taskId);
  return item;
}

export async function listQueued(taskId: string): Promise<QueuedAttachment[]> {
  return (await queueDb()).getAllFromIndex("queue", "taskId", taskId);
}

export async function removeQueued(id: string, taskId: string): Promise<void> {
  await (await queueDb()).delete("queue", id);
  notifyQueue(taskId);
}

let flushing = false;

/** Upload everything waiting in the offline queue. Safe to call repeatedly. */
export async function flushAttachmentQueue(): Promise<number> {
  if (flushing || !navigator.onLine) return 0;
  const uid = auth.currentUser?.uid;
  if (!uid) return 0;
  flushing = true;
  let done = 0;
  try {
    const all: QueuedAttachment[] = await (await queueDb()).getAll("queue");
    for (const item of all) {
      // Never upload an old unattributed blob or another account's blob.
      if (item.ownerId !== uid) continue;
      try {
        const file = Object.assign(item.blob, { name: item.name }) as Blob & { name: string };
        Object.defineProperty(file, "type", { value: item.type, configurable: true });
        await uploadAttachment(item.taskId, file);
        await removeQueued(item.id, item.taskId);
        window.dispatchEvent(new CustomEvent(`arshnaz:attach-refresh:${item.taskId}`));
        done++;
      } catch (e) {
        if (isNetworkError(e)) break; // still offline-ish, try later
        // Preserve the file on any other error (rules, quota, auth, etc.) so
        // the user can retry after the cloud configuration is repaired.
      }
    }
  } finally {
    flushing = false;
  }
  return done;
}

let runnerStarted = false;
export function startAttachmentQueueRunner() {
  if (runnerStarted || typeof window === "undefined") return;
  runnerStarted = true;
  window.addEventListener("online", () => { void flushAttachmentQueue(); });
  setTimeout(() => { void flushAttachmentQueue(); }, 3000);
}
