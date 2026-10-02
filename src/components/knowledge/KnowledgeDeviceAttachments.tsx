import { useEffect, useRef, useState } from "react";
import { Upload, Loader2, ExternalLink, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ATTACHMENT_ACCEPT, validateAttachmentFile, formatBytes } from "@/lib/attachmentUpload";
import { uploadKnowledgeAttachment, getKnowledgeAttachmentUrl } from "@/lib/knowledgeAttachmentUpload";
import { updateKnowledgeDocumentWithPersistence } from "@/lib/knowledgeService";
import type { KnowledgeDocument, KnowledgeMediaAttachment } from "@/lib/knowledgeTypes";
import { useBilingual } from "@/hooks/useBilingual";

export function KnowledgeDeviceAttachments({ document, userId, onDocumentUpdated }: { document: KnowledgeDocument; userId: string; onDocumentUpdated?: (document: KnowledgeDocument) => void }) {
  const { T } = useBilingual();
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState<KnowledgeMediaAttachment | null>(null);
  const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(0); const [error, setError] = useState("");
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const documentRef = useRef(document); documentRef.current = document;
  const identity = useRef(`${userId}:${document.id}`); identity.current = `${userId}:${document.id}`;
  useEffect(() => { setFile(null); setPending(null); setError(""); setBusy(false); setFileUrls({}); controller.current?.abort(); }, [userId, document.id]);
  useEffect(() => () => controller.current?.abort(), []);
  const upload = async () => {
    if (!file && !pending) return;
    const target = identity.current; const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError("");
    try {
      const attachment = pending ?? await uploadKnowledgeAttachment(userId, document.id, file!, percentage => { if (identity.current === target) setProgress(percentage); }, abort.signal);
      if (abort.signal.aborted || identity.current !== target) return;
      setPending(attachment);
      const result = await updateKnowledgeDocumentWithPersistence(userId, document.id, { attachments: [...(documentRef.current.attachments ?? []).filter(item => item.file_id !== attachment.file_id), attachment] });
      if (identity.current !== target) return;
      onDocumentUpdated?.(result.document); setFile(null); setPending(null); if (input.current) input.current.value = "";
    } catch (cause) {
      if (identity.current === target && !abort.signal.aborted) setError(pending ? T("فایل در فضای ابری است؛ ذخیرهٔ پیوند را دوباره امتحان کنید.", "The file is in cloud storage. Retry saving its lesson link.") : T("بارگذاری یا ذخیره ناموفق بود؛ دوباره تلاش کنید.", "Upload or saving failed. Please retry.") + " " + (cause instanceof Error ? cause.message : ""));
    } finally { if (identity.current === target) setBusy(false); }
  };
  return <section className="mb-4 space-y-3 rounded-lg border bg-card p-3" aria-label={T("فایل‌های دستگاه", "Device files")}>
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-xs cursor-pointer focus-within:ring-2 focus-within:ring-ring">
        <Upload className="h-4 w-4" />{T("افزودن از گوشی یا کامپیوتر", "Add from phone or computer")}
        <input ref={input} type="file" accept={ATTACHMENT_ACCEPT} aria-label={T("انتخاب فایل از دستگاه", "Choose a device file")} disabled={busy || Boolean(pending) || !userId || document.user_id !== userId} className="sr-only" onChange={event => {
          const selected = event.target.files?.[0]; setError("");
          if (!selected) return;
          const validation = validateAttachmentFile(selected);
          if (!validation.ok) { setFile(null); event.target.value = ""; setError(T("فایل باید پشتیبانی‌شده، غیرخالی و حداکثر ۲۵ مگابایت باشد.", "Choose a supported, non-empty file up to 25 MB.")); return; }
          setFile(selected); setProgress(0);
        }} />
      </label>
      {file && <span className="min-w-0 break-words text-xs">{file.name} · {formatBytes(file.size)}</span>}
      {(file || pending) && <Button size="sm" disabled={busy} onClick={() => void upload()}>{busy ? <><Loader2 className="h-4 w-4 me-1 animate-spin" />{progress}%</> : pending ? T("ذخیرهٔ پیوند", "Save lesson link") : T("بارگذاری در فضای ابری", "Upload to app cloud")}</Button>}
    </div>
    <p className="text-xs text-muted-foreground">{T("تصویر، ویدیو، صدا، PDF، Word و متن؛ حداکثر ۲۵ مگابایت برای هر فایل.", "Images, video, audio, PDF, Word and text; up to 25 MB per file.")}</p>
    {pending && <p role="status" className="text-xs">{T("فایل بارگذاری شده؛ پیوند درس هنوز ذخیره نشده است. دوباره تلاش کنید.", "File uploaded; its lesson link is not saved yet. Retry saving.")}</p>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <ul className="space-y-2">{(document.attachments ?? []).filter(item => item.provider === "firebase").map(attachment => <li key={attachment.file_id} className="flex flex-wrap items-center gap-2 border-t pt-2 text-xs">
      <span className="min-w-0 flex-1 break-words">{attachment.name} · {formatBytes(attachment.size_bytes)}</span>
      {fileUrls[attachment.file_id] ? <a href={fileUrls[attachment.file_id]} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 px-2"><ExternalLink className="h-3.5 w-3.5" />{T("بازکردن فایل", "Open file")}</a> : <Button size="sm" variant="ghost" onClick={() => { const target = identity.current; void getKnowledgeAttachmentUrl(attachment).then(url => { if (identity.current === target) setFileUrls(current => ({ ...current, [attachment.file_id]: url })); }).catch(() => { if (identity.current === target) setError(T("فایل باز نشد؛ اتصال و دسترسی را بررسی کنید.", "Could not open the file. Check connection and access.")); }); }}><ExternalLink className="h-3.5 w-3.5 me-1" />{T("آماده‌سازی فایل", "Load file")}</Button>}
      <Button size="sm" variant="ghost" disabled={busy || document.user_id !== userId} onClick={() => { const target = identity.current; setBusy(true); void updateKnowledgeDocumentWithPersistence(userId, document.id, { attachments: document.attachments?.filter(item => item.file_id !== attachment.file_id) }).then(result => { if (identity.current === target) onDocumentUpdated?.(result.document); }).catch(() => { if (identity.current === target) setError(T("جداکردن ناموفق بود.", "Could not detach file.")); }).finally(() => { if (identity.current === target) setBusy(false); }); }}><Link2Off className="h-3.5 w-3.5 me-1" />{T("جداکردن", "Detach")}</Button>
    </li>)}</ul>
  </section>;
}
