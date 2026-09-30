import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { auth } from "@/lib/firebase";
import { validateAttachmentFile } from "./attachmentUpload";
import type { KnowledgeMediaAttachment } from "./knowledgeTypes";

export async function uploadKnowledgeAttachment(userId: string, documentId: string, file: File,
  onProgress: (percentage: number) => void, signal?: AbortSignal): Promise<KnowledgeMediaAttachment> {
  if (auth.currentUser?.uid !== userId) throw new Error("Sign in before uploading.");
  const validation = validateAttachmentFile(file);
  if (!validation.ok) throw new Error(validation.reason === "too_large" ? "Maximum file size is 25 MB." : "Unsupported or empty file.");
  const id = crypto.randomUUID();
  // Reuse the deployed private attachment rules and limits, with a disjoint lesson namespace.
  const path = `users/${userId}/task-attachments/knowledge-${encodeURIComponent(documentId)}/${id}`;
  const task = uploadBytesResumable(ref(getStorage(), path), file, { contentType: validation.mime, customMetadata: { fileName: file.name } });
  const cancel = () => task.cancel();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) task.cancel();
  try {
    await new Promise<void>((resolve, reject) => task.on("state_changed", snapshot => onProgress(Math.round(100 * snapshot.bytesTransferred / snapshot.totalBytes)), reject, resolve));
    return { provider: "firebase", file_id: id, storage_path: path, name: file.name, mime_type: validation.mime, size_bytes: file.size, added_at: new Date().toISOString() };
  } finally { signal?.removeEventListener("abort", cancel); }
}
export async function getKnowledgeAttachmentUrl(attachment: KnowledgeMediaAttachment): Promise<string> {
  if (attachment.provider !== "firebase" || !attachment.storage_path?.startsWith(`users/${auth.currentUser?.uid}/task-attachments/knowledge-`)) throw new Error("Attachment access denied.");
  return getDownloadURL(ref(getStorage(), attachment.storage_path));
}
export async function discardKnowledgeUpload(attachment: KnowledgeMediaAttachment) {
  if (attachment.provider !== "firebase" || !attachment.storage_path?.startsWith(`users/${auth.currentUser?.uid}/task-attachments/knowledge-`)) throw new Error("Attachment access denied.");
  await deleteObject(ref(getStorage(), attachment.storage_path));
}
