import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { firebaseStore } from "@/lib/firebaseStore";
import { auth } from "@/lib/firebase";
import { saveImageTaskBatch } from "@/lib/imageTaskBatch";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Paperclip, Trash2, FileText, Image as ImageIcon, Music, Video, Loader2, Sparkles, RotateCcw,
  CloudOff, ExternalLink, X, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { deleteMediaPath } from "@/lib/uploadMedia";
import { callAI } from "@/lib/ai";
import { absoluteArshUrl } from "@/lib/arshApi";
import {
  ATTACHMENT_ACCEPT, deleteAttachment, enqueueAttachment, flushAttachmentQueue, formatBytes, isNetworkError,
  listAttachments, listQueued, onQueueChange, removeQueued, recordAttachmentQueueError, startAttachmentQueueRunner, uploadAttachment,
  validateAttachmentFile, type AttachmentKind, type QueuedAttachment, type RemoteAttachment,
} from "@/lib/attachmentUpload";
import { GoogleImportButtons, SaveToDriveButton } from "@/components/GoogleImportButtons";
import { useBilingual } from "@/hooks/useBilingual";
import { PdfPreview } from "@/components/PdfPreview";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Unified row: new Object-Storage attachments + legacy Firebase Storage ones (read/delete only). */
type Item = {
  id: string;
  file_name: string;
  mime_type: string;
  kind: AttachmentKind;
  size_bytes: number | null;
  url: string; // absolute, loadable in <img>/<iframe>
  download_url: string;
  created_at: string;
  legacy?: { storage_path: string };
};

type Upload = { localId: string; file: File; progress: number; status: "uploading" | "failed"; error?: string };

type ImageAction = "attach" | "extract" | "summarize" | "research" | "tasks" | "scheduled_tasks";

function toItem(a: RemoteAttachment): Item {
  return {
    id: a.id, file_name: a.file_name, mime_type: a.mime_type, kind: a.kind, size_bytes: a.size_bytes,
    url: absoluteArshUrl(a.view_url), download_url: absoluteArshUrl(a.download_url), created_at: a.created_at,
  };
}

function legacyKind(k: string, mime: string | null): AttachmentKind {
  if (mime === "application/pdf") return "pdf";
  return (["image", "audio", "video"].includes(k) ? k : "file") as AttachmentKind;
}

export function TaskAttachments(props: { taskId: string; onCountChange?: (count: number) => void }) {
  const { user } = useAuth();
  return <TaskAttachmentsContent key={`${user?.id || "signed-out"}:${props.taskId}`} {...props} />;
}

function TaskAttachmentsContent({ taskId, onCountChange }: { taskId: string; onCountChange?: (count: number) => void }) {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const [items, setItems] = useState<Item[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [queued, setQueued] = useState<QueuedAttachment[]>([]);
  const [preview, setPreview] = useState<Item | null>(null);
  const [pendingImage, setPendingImage] = useState<Item | null>(null);
  const [processing, setProcessing] = useState<ImageAction | null>(null);
  const [loadError, setLoadError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickAccept, setPickAccept] = useState<string>(ATTACHMENT_ACCEPT);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "remote"; item: Item } | { kind: "queued"; item: QueuedAttachment } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const alive = useRef(true);
  const loadSequence = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; loadSequence.current++; }; }, []);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    let failed = false;
    const [remote, legacy] = await Promise.all([
      listAttachments(taskId).catch(() => { failed = true; return []; }),
      firebaseStore.from("task_attachments").select("*").eq("task_id", taskId).order("created_at", { ascending: false })
        .then((result) => { if (result.error) { failed = true; return []; } return (result.data || []) as any[]; })
        .catch(() => { failed = true; return [] as any[]; }),
    ]);
    if (!alive.current || sequence !== loadSequence.current) return;
    setLoadError(failed);
    const merged: Item[] = [
      ...remote.map(toItem),
      ...legacy.map((a) => ({
        id: a.id, file_name: a.file_name, mime_type: a.mime_type || "", kind: legacyKind(a.kind, a.mime_type),
        size_bytes: a.size_bytes, url: a.url, download_url: a.url, created_at: a.created_at,
        legacy: { storage_path: a.storage_path },
      })),
    ];
    setItems(merged);
  }, [taskId]);

  const refreshQueued = useCallback(async () => {
    setQueued(await listQueued(taskId).catch(() => []));
  }, [taskId]);

  useEffect(() => { onCountChange?.(items.length); }, [items.length, onCountChange]);

  useEffect(() => {
    startAttachmentQueueRunner();
    void load();
    void refreshQueued().then(() => flushAttachmentQueue());
    const offQueue = onQueueChange((id) => { if (id === taskId) void refreshQueued(); });
    const onPick = (e: Event) => {
      const det = (e as CustomEvent).detail || {};
      setPickAccept(det.accept || ATTACHMENT_ACCEPT);
      setTimeout(() => fileRef.current?.click(), 30);
    };
    const onRefresh = () => void load();
    window.addEventListener(`arshnaz:attach-pick:${taskId}`, onPick as EventListener);
    window.addEventListener(`arshnaz:attach-refresh:${taskId}`, onRefresh);
    return () => {
      offQueue();
      window.removeEventListener(`arshnaz:attach-pick:${taskId}`, onPick as EventListener);
      window.removeEventListener(`arshnaz:attach-refresh:${taskId}`, onRefresh);
    };
  }, [taskId, load, refreshQueued]);

  const runUpload = async (localId: string, file: File) => {
    const ownerId = user?.id;
    if (!ownerId) return;
    setUploads((prev) => [...prev.filter((u) => u.localId !== localId), { localId, file, progress: 0, status: "uploading" }]);
    let durable = false;
    try {
      // Persist every file before transfer, not only after an offline error. Task switches cannot lose it.
      await enqueueAttachment(taskId, file, localId, ownerId);
      durable = true;
      if (!navigator.onLine) {
        if (alive.current) {
          setUploads((prev) => prev.filter((u) => u.localId !== localId));
          toast.message(T("فایل روی دستگاه ذخیره شد؛ در انتظار اینترنت", "Saved on device — waiting for connection"));
        }
        return;
      }
      const att = await uploadAttachment(taskId, file, (p) => {
        if (alive.current) setUploads((prev) => prev.map((u) => u.localId === localId ? { ...u, progress: p } : u));
      }, "device", { id: localId, ownerId });
      await removeQueued(localId, taskId);
      if (!alive.current) return;
      setUploads((prev) => prev.filter((u) => u.localId !== localId));
      const item = toItem(att);
      setItems((prev) => [item, ...prev.filter((current) => current.id !== item.id)]);
      if (item.kind === "image") setPendingImage(item);
    } catch (error: any) {
      if (durable) await recordAttachmentQueueError(localId, error).catch(() => {});
      if (!alive.current) return;
      const code = String(error?.code || "");
      const msg = !durable ? T("ذخیرهٔ فایل روی دستگاه ناموفق بود؛ صفحه را نبندید و دوباره تلاش کنید", "Device save failed — keep this page open and retry")
        : code.includes("unauthorized") || error?.status === 403 ? T("مجوز بارگذاری ندارید؛ فایل در صف محفوظ است", "Upload permission denied — file retained in queue")
        : code.includes("quota") || error?.status === 402 ? T("سهمیهٔ فضای ابری تمام شده؛ فایل در صف محفوظ است", "Storage quota exceeded — file retained in queue")
        : !navigator.onLine || isNetworkError(error) ? T("ارتباط قطع شد؛ فایل در صف محفوظ است", "Connection lost — file retained in queue")
        : error?.message || T("بارگذاری ناموفق؛ فایل در صف محفوظ است", "Upload failed — file retained in queue");
      setUploads((prev) => prev.map((u) => u.localId === localId ? { ...u, status: "failed", error: msg } : u));
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    for (const file of Array.from(files)) {
      const v = validateAttachmentFile(file);
      if (!v.ok) {
        toast.error(
          v.reason === "too_large"
            ? T(`«${file.name}» بزرگ‌تر از ۲۵ مگابایت است`, `"${file.name}" is larger than 25 MB`)
            : v.reason === "type"
              ? T(`نوع فایل «${file.name}» مجاز نیست`, `File type of "${file.name}" is not allowed`)
              : T(`«${file.name}» خالی است`, `"${file.name}" is empty`),
        );
        continue;
      }
      void runUpload(crypto.randomUUID(), file);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeItem = async (a: Item) => {
    if (a.legacy) {
      // Keep the record until the object deletion succeeds, so a partial failure remains retryable.
      await deleteMediaPath(a.legacy.storage_path);
      const { error } = await firebaseStore.from("task_attachments").delete().eq("id", a.id);
      if (error) throw error;
    } else {
      await deleteAttachment(a.id);
    }
    if (alive.current) {
      setItems((list) => list.filter((item) => item.id !== a.id));
      toast.success(T("پیوست حذف شد", "Attachment deleted"));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === "remote") await removeItem(deleteTarget.item);
      else await removeQueued(deleteTarget.item.id, taskId);
      if (alive.current) setDeleteTarget(null);
    } catch (error: any) {
      if (alive.current) toast.error(error?.message || T("حذف کامل نشد؛ دوباره تلاش کنید", "Deletion incomplete — retry"));
    } finally {
      if (alive.current) setDeleting(false);
    }
  };

  const openItem = (a: Item) => {
    if (a.kind === "image" || a.kind === "pdf") {
      setPreview(a);
      return;
    }
    window.open(a.url, Capacitor.isNativePlatform() ? "_system" : "_blank", "noopener");
  };

  const runImageAction = async (action: ImageAction) => {
    if (!pendingImage || !user || processing) return;
    if (action === "attach") { setPendingImage(null); return; }
    setProcessing(action);
    try {
      if (action === "tasks" || action === "scheduled_tasks") {
        const text = action === "scheduled_tasks"
          ? "Extract actionable tasks from this image. Suggest a reasonable due_date (ISO 8601) for each based on visible cues. Return tasks via the tool."
          : "Extract actionable tasks from this image. Return tasks via the tool.";
        const result = await saveImageTaskBatch({
          userId: user.id, taskId, imageId: pendingImage.id, action,
          generate: async () => {
            const response = await callAI("image_to_tasks" as any, { imageUrl: pendingImage.url, text });
            if (!alive.current || auth.currentUser?.uid !== user.id) throw new Error("Account or task changed; retry from the original task.");
            return Array.isArray(response.data?.tasks) ? response.data.tasks : [];
          },
        });
        if (!alive.current) return;
        if (!result.total) { toast.error(T("تسکی پیدا نشد", "No tasks found")); return; }
        if (result.failed || result.errors.length) {
          toast.error(T(`${result.saved} از ${result.total} تسک ذخیره شد؛ برای بقیه دوباره تلاش کنید`, `${result.saved} of ${result.total} tasks saved — retry the remaining tasks`));
          return;
        }
        toast.success(T(`${result.saved} تسک ذخیره شد`, `${result.saved} tasks saved`));
      } else {
        const modeMap = { extract: "image_extract", summarize: "image_summarize", research: "image_research" } as const;
        const titles = { extract: "متن استخراج‌شده از تصویر", summarize: "خلاصه/بسط تصویر", research: "یادداشت پژوهشی" } as const;
        const res = await callAI(modeMap[action] as any, { imageUrl: pendingImage.url, text: "Process this image as instructed." });
        const content = res.text || "";
        if (!content.trim()) { toast.error(T("نتیجه‌ای دریافت نشد", "No result came back")); return; }
        const { error } = await firebaseStore.from("notes").insert({ user_id: user.id, task_id: taskId, title: titles[action], content });
        if (error) { toast.error(error.message); return; }
        toast.success(T("نوت ساخته شد", "Note created"));
      }
      setPendingImage(null);
    } catch (e: any) {
      toast.error(e?.message || T("پردازش انجام نشد", "Processing failed"));
    } finally {
      setProcessing(null);
    }
  };

  const busy = uploads.some((u) => u.status === "uploading");
  const total = items.length + uploads.length + queued.length;

  return (
    <div data-testid="task-attachments">
      <div className="flex items-center justify-between mb-2">
        <span className="sr-only">{T("پیوست‌ها", "Attachments")} (<span data-testid="attachments-count">{items.length}</span>)</span>
        <span />
        <Button size="sm" variant="outline" onClick={() => { setPickAccept(ATTACHMENT_ACCEPT); fileRef.current?.click(); }}
          disabled={!user} className="gap-1 rounded-full" data-testid="attachments-add-btn">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
          {T("افزودن فایل", "Add file")}
        </Button>
        <input ref={fileRef} type="file" accept={pickAccept} multiple className="hidden" data-testid="attachments-file-input"
          onChange={(e) => onFiles(e.target.files)} />
      </div>
      <GoogleImportButtons taskId={taskId} onImported={(atts) => setItems((prev) => [...atts.map(toItem), ...prev])} />
      <p className="text-[11px] text-muted-foreground mb-2">
        {T("حداکثر ۲۵ مگابایت · عکس، PDF، صوت، ویدیو، متن و Word", "Max 25 MB · images, PDF, audio, video, text, Word")}
      </p>
      {loadError && (
        <p className="text-[11px] text-destructive mb-2" data-testid="attachments-load-error">
          {T("فهرست پیوست‌ها از سرور دریافت نشد", "Could not load attachments from the server")}
        </p>
      )}

      {total > 0 && (
        <div className="space-y-2">
          {uploads.map((u) => (
            <Card key={u.localId} className="p-2" data-testid="attachment-upload-row">
              <div className="flex items-center gap-2">
                {u.status === "uploading" ? <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" /> : <X className="w-4 h-4 text-destructive shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" dir="auto">{u.file.name}</div>
                  {u.status === "uploading" ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={Math.round(u.progress * 100)} className="h-1.5" data-testid="attachment-upload-progress" />
                      <span className="text-[10px] tabular-nums text-muted-foreground w-9 text-end">{Math.round(u.progress * 100)}%</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-destructive mt-0.5" data-testid="attachment-upload-error">{u.error}</div>
                  )}
                </div>
                {u.status === "failed" && (
                  <>
                    <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => runUpload(u.localId, u.file)} data-testid="attachment-retry-btn">
                      <RotateCcw className="w-3 h-3" /> {T("تلاش مجدد", "Retry")}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setUploads((p) => p.filter((x) => x.localId !== u.localId))} aria-label="dismiss">
                      <X className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}

          {queued.map((q) => (
            <Card key={q.id} className="p-2 border-dashed" data-testid="attachment-queued-row">
              <div className="flex items-center gap-2">
                <CloudOff className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" dir="auto">{q.name}</div>
                  <div className="text-[11px] text-muted-foreground">{T("در صف آفلاین · ", "Queued offline · ")}{formatBytes(q.size)}</div>
                  {q.ownerId !== user?.id && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-400">
                      {T("مالک این فایلِ قدیمی مشخص نیست یا حساب دیگری است؛ فایل را دوباره انتخاب کن", "This older file has no clear owner or belongs to another account; select it again")}
                    </div>
                  )}
                </div>
                <Button size="sm" variant="outline" className="h-8 gap-1" disabled={q.ownerId !== user?.id} onClick={() => flushAttachmentQueue()} data-testid="attachment-queue-retry-btn">
                  <RotateCcw className="w-3 h-3" /> {T("ارسال", "Send")}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteTarget({ kind: "queued", item: q })} aria-label="remove queued">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}

          {items.map((a) => (
            <Card key={a.id} className="p-2" data-testid={`attachment-item-${a.id}`}>
              <div className="flex items-start gap-2">
                <div className="shrink-0 mt-0.5 text-muted-foreground">
                  {a.kind === "image" ? <ImageIcon className="w-4 h-4" /> : a.kind === "audio" ? <Music className="w-4 h-4" /> :
                    a.kind === "video" ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <button type="button" onClick={() => openItem(a)} className="text-xs font-medium truncate block hover:underline text-start max-w-full" dir="auto" data-testid="attachment-open-btn">
                    {a.file_name}
                  </button>
                  {a.size_bytes ? <div className="text-[10px] text-muted-foreground">{formatBytes(a.size_bytes)}</div> : null}
                  {a.kind === "image" && (
                    <button type="button" onClick={() => openItem(a)} className="block" data-testid="attachment-image-thumb">
                      <img src={a.url} alt={a.file_name} className="mt-2 max-h-40 rounded-md object-contain border" loading="lazy" />
                    </button>
                  )}
                  {a.kind === "pdf" && (
                    <Button size="sm" variant="secondary" className="mt-2 h-7 gap-1 text-[11px]" onClick={() => openItem(a)} data-testid="attachment-pdf-preview-btn">
                      <Eye className="w-3 h-3" /> {T("پیش‌نمایش PDF", "Preview PDF")}
                    </Button>
                  )}
                  {a.kind === "audio" && <audio controls src={a.url} className="mt-2 w-full" preload="metadata" />}
                  {a.kind === "video" && <video controls src={a.url} className="mt-2 w-full max-h-64 rounded-md border" preload="metadata" />}
                </div>
                {!a.legacy && <SaveToDriveButton attachmentId={a.id} />}
                <Button size="icon" variant="ghost" onClick={() => setDeleteTarget({ kind: "remote", item: a })} data-testid="attachment-delete-btn" aria-label={T("حذف پیوست", "Delete attachment")}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-3xl w-[95vw] p-3" data-testid="attachment-preview-dialog">
          <DialogHeader>
            <DialogTitle className="text-sm truncate pe-8" dir="auto">{preview?.file_name}</DialogTitle>
            <DialogDescription className="sr-only">preview</DialogDescription>
          </DialogHeader>
          {preview?.kind === "image" && (
            <img src={preview.url} alt={preview.file_name} className="max-h-[75vh] w-full object-contain rounded" data-testid="attachment-preview-image" />
          )}
          {preview?.kind === "pdf" && <PdfPreview url={preview.url} isEn={isEn} />}
          {preview && (
            <a href={preview.download_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1 mt-1">
              <ExternalLink className="w-3 h-3" /> {T("دانلود / باز کردن", "Download / open")}
            </a>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingImage} onOpenChange={(v) => !v && !processing && setPendingImage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> {T("با این تصویر چه کنیم؟", "What should we do with this image?")}</DialogTitle>
            <DialogDescription>{T("یکی از گزینه‌ها را انتخاب کن", "Choose one option")}</DialogDescription>
          </DialogHeader>
          {pendingImage && <img src={pendingImage.url} alt="" className="max-h-40 rounded mx-auto object-contain" />}
          <div className="grid grid-cols-1 gap-2 mt-2">
            <ActionBtn label={T("فقط پیوست شود", "Just attach it")} onClick={() => runImageAction("attach")} disabled={!!processing} testId="image-action-attach" />
            <ActionBtn label={T("استخراج متن و افزودن به‌عنوان نوت", "Extract text into a note")} onClick={() => runImageAction("extract")} loading={processing === "extract"} disabled={!!processing && processing !== "extract"} />
            <ActionBtn label={T("خلاصه / بسط محتوا", "Summarise / expand")} onClick={() => runImageAction("summarize")} loading={processing === "summarize"} disabled={!!processing && processing !== "summarize"} />
            <ActionBtn label={T("پژوهش بر اساس این تصویر", "Research from this image")} onClick={() => runImageAction("research")} loading={processing === "research"} disabled={!!processing && processing !== "research"} />
            <ActionBtn label={T("ساخت تسک از این تصویر", "Create tasks from this image")} onClick={() => runImageAction("tasks")} loading={processing === "tasks"} disabled={!!processing && processing !== "tasks"} />
            <ActionBtn label={T("ساخت تسک با تاریخ پیشنهادی", "Create tasks with suggested dates")} onClick={() => runImageAction("scheduled_tasks")} loading={processing === "scheduled_tasks"} disabled={!!processing && processing !== "scheduled_tasks"} />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent data-testid="attachment-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>{T("این پیوست حذف شود؟", "Delete this attachment?")}</AlertDialogTitle>
            <AlertDialogDescription dir="auto">
              {deleteTarget?.kind === "queued" ? deleteTarget.item.name : deleteTarget?.item.file_name}
              {T(" پس از حذف از فضای ابری قابل بازیابی نیست.", " It cannot be recovered from cloud storage after deletion.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} data-testid="attachment-delete-cancel">{T("لغو", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={(event) => { event.preventDefault(); void confirmDelete(); }} data-testid="attachment-delete-confirm">
              {deleting ? T("در حال حذف…", "Deleting…") : T("حذف", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActionBtn({ label, onClick, loading, disabled, testId }: { label: string; onClick: () => void; loading?: boolean; disabled?: boolean; testId?: string }) {
  return (
    <Button variant="outline" className="justify-start gap-2 h-auto py-2" onClick={onClick} disabled={disabled} data-testid={testId}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 opacity-60" />}
      <span className="text-sm">{label}</span>
    </Button>
  );
}
