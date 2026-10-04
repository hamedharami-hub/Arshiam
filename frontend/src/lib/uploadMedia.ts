import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { auth } from "@/lib/firebase";
import { firebaseStore } from "@/lib/firebaseStore";
import { compressImage } from "./imageCompression";
import { validateAttachmentFile } from "./attachmentUpload";

export type MediaKind = "image" | "audio" | "video" | "file";
export type UploadedMedia = { url: string; path: string; kind: MediaKind; mime: string; size: number; name: string };

export async function uploadMedia(file: File, userId: string): Promise<string> {
  return (await uploadMediaFull(file, userId)).url;
}

export async function uploadMediaFull(file: File, userId: string): Promise<UploadedMedia> {
  if (!userId || auth.currentUser?.uid !== userId) throw new Error("Sign in before uploading / ابتدا وارد حساب شوید");
  file = await compressImage(file);
  const validation = validateAttachmentFile(file);
  if (!validation.ok) throw new Error("Choose a supported, non-empty file up to 25 MB / فایل پشتیبانی‌شده و حداکثر ۲۵ مگابایت انتخاب کنید");
  if (auth.currentUser?.uid !== userId) throw new Error("Account changed / حساب تغییر کرد");
  const path = `users/${userId}/task-attachments/note-media/${crypto.randomUUID()}`;
  const storageRef = ref(getStorage(), path);
  await uploadBytes(storageRef, file, { contentType: validation.mime, customMetadata: { fileName: file.name } });
  const url = await getDownloadURL(storageRef);
  return { url, path, kind: detectMediaKind({ type: validation.mime }), mime: validation.mime, size: file.size, name: file.name };
}

export function detectMediaKind(file: File | { type: string }): MediaKind {
  const type = file.type || "";
  return type.startsWith("image/") ? "image" : type.startsWith("audio/") ? "audio" : type.startsWith("video/") ? "video" : "file";
}

export async function deleteMediaPath(path: string) {
  if (!path) return;
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("Authentication required");
  if (path.startsWith(`users/${userId}/task-attachments/note-media/`)) {
    await deleteObject(ref(getStorage(), path)); return;
  }
  // Existing journal attachments retain their original storage reference.
  if (!path.startsWith(`${userId}/`)) throw new Error("Attachment access denied");
  const { error } = await firebaseStore.storage.from("note-media").remove([path]);
  if (error && (error as Error & { code?: string }).code !== "storage/object-not-found") throw error;
}
