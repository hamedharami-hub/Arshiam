import { supabase } from "@/integrations/supabase/client";

export type MediaKind = "image" | "audio" | "video" | "file";

export async function uploadMedia(file: File, userId: string): Promise<string> {
  const r = await uploadMediaFull(file, userId);
  return r.url;
}

export async function uploadMediaFull(file: File, userId: string): Promise<{
  url: string; path: string; kind: MediaKind; mime: string; size: number; name: string;
}> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("note-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = await supabase.storage.from("note-media").createSignedUrl(path, 60 * 60 * 24 * 365);
  if (!data?.signedUrl) throw new Error("نتوانست URL بسازد");
  return {
    url: data.signedUrl,
    path,
    kind: detectMediaKind(file),
    mime: file.type || "application/octet-stream",
    size: file.size,
    name: file.name,
  };
}

export function detectMediaKind(file: File | { type: string }): MediaKind {
  const t = file.type || "";
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("audio/")) return "audio";
  if (t.startsWith("video/")) return "video";
  return "file";
}

export async function deleteMediaPath(path: string) {
  await supabase.storage.from("note-media").remove([path]);
}
