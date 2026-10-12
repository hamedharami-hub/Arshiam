import { useEffect, useRef, useState } from "react";
import { FileText, Image as ImageIcon, Loader2, Mic, Music, Paperclip, Square, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { uploadMediaFull, type MediaKind } from "@/lib/uploadMedia";
import type { DiaryAttachment } from "@/lib/diary";

type Props = {
  entryId?: string;
  onInsert?: (item: DiaryAttachment) => void;
  attachments: DiaryAttachment[];
  onChange: (next: DiaryAttachment[]) => void;
};

const KIND_ICON: Record<MediaKind, typeof Music> = { image: ImageIcon, audio: Music, video: Video, file: FileText };

export function DiaryAttachments({ attachments, onChange, entryId = "", onInsert }: Props) {
  const { user } = useAuth();
  const { T } = useBilingual();
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const identityRef = useRef(""); identityRef.current = `${user?.id ?? ""}:${entryId}`;
  const attachmentsRef = useRef(attachments); attachmentsRef.current = attachments;
  const onChangeRef = useRef(onChange); onChangeRef.current = onChange;
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.onstop = null;
        if (recorder.state !== "inactive") recorder.stop();
        recorder.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [entryId, user?.id]);
  const chunksRef = useRef<Blob[]>([]);
  const [uploading, setUploading] = useState(0);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [pendingRemove, setPendingRemove] = useState<DiaryAttachment | null>(null);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  const upload = async (files: File[]) => {
    if (!user?.id || !files.length) return;
    const identity = identityRef.current;
    setUploading((value) => value + files.length);
    const added: DiaryAttachment[] = [];
    for (const file of files) {
      if (!mountedRef.current || identityRef.current !== identity) break;
      try {
        const result = await uploadMediaFull(file, user.id);
        if (!mountedRef.current || identityRef.current !== identity) return;
        added.push({ id: crypto.randomUUID(), url: result.url, kind: result.kind, name: result.name, path: result.path });
      } catch (error: any) {
        toast.error(error?.message || T(`آپلود ${file.name} ناموفق بود`, `Upload of ${file.name} failed`));
      } finally {
        if (mountedRef.current && identityRef.current === identity) setUploading(value => value - 1);
      }
    }
    if (added.length && mountedRef.current && identityRef.current === identity) onChangeRef.current([...attachmentsRef.current, ...added]);
  };

  const pick = (accept: string) => {
    if (!fileRef.current) return;
    fileRef.current.accept = accept;
    fileRef.current.value = "";
    fileRef.current.click();
  };

  const startRecording = async () => {
    const identity = identityRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current || identityRef.current !== identity) { stream.getTracks().forEach(track => track.stop()); return; }
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (!mountedRef.current || identityRef.current !== identity) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const ext = (recorder.mimeType || "audio/webm").includes("mp4") ? "m4a" : "webm";
        void upload([new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type })]);
      };
      recorder.start();
      recorderRef.current = recorder;
      setSeconds(0);
      setRecording(true);
    } catch {
      toast.error(T("دسترسی به میکروفون ممکن نشد", "Microphone access was denied"));
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  // Detach the attachment from this entry only. The stored file is left intact and
  // the action is reversible, so a stray click can never destroy a memory.
  const confirmRemove = () => {
    const item = pendingRemove;
    if (!item) return;
    setPendingRemove(null);
    onChangeRef.current(attachmentsRef.current.filter((entry) => entry.id !== item.id));
    toast(T("پیوست از این خاطره جدا شد؛ فایل ذخیره‌شده پاک نشد.", "Attachment removed from this entry; the stored file was not deleted."), {
      action: {
        label: T("بازگرداندن", "Undo"),
        onClick: () => {
          const current = attachmentsRef.current;
          if (current.some((entry) => entry.id === item.id)) return;
          onChangeRef.current([...current, item]);
        },
      },
    });
  };

  return (
    <div className="space-y-3" data-testid="diary-attachments">
      <input ref={fileRef} type="file" multiple className="hidden" onChange={(event) => void upload(Array.from(event.target.files || []))} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" className="gap-1.5 bg-background/80" data-testid="diary-attach-audio" onClick={() => pick("audio/*")}><Music className="h-4 w-4" />{T("صدا", "Audio")}</Button>
        <Button type="button" size="sm" variant="outline" className="gap-1.5 bg-background/80" data-testid="diary-attach-video" onClick={() => pick("video/*")}><Video className="h-4 w-4" />{T("ویدیو", "Video")}</Button>
        <Button type="button" size="sm" variant="outline" className="gap-1.5 bg-background/80" data-testid="diary-attach-image" onClick={() => pick("image/*")}><ImageIcon className="h-4 w-4" />{T("عکس", "Photo")}</Button>
        <Button type="button" size="sm" variant="outline" className="gap-1.5 bg-background/80" data-testid="diary-attach-file" onClick={() => pick("*/*")}><Paperclip className="h-4 w-4" />{T("فایل", "File")}</Button>
        {recording ? (
          <Button type="button" size="sm" variant="destructive" className="gap-1.5 animate-pulse" data-testid="diary-record-stop" onClick={stopRecording}><Square className="h-4 w-4" />{T("توقف", "Stop")} · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</Button>
        ) : (
          <Button type="button" size="sm" className="gap-1.5" data-testid="diary-record-start" onClick={() => void startRecording()}><Mic className="h-4 w-4" />{T("ضبط صدای امروز", "Record a voice note")}</Button>
        )}
        {uploading > 0 && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />{T("در حال آپلود…", "Uploading…")}</span>}
      </div>

      {attachments.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {attachments.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <li key={item.id} data-testid={`diary-attachment-${item.id}`} className="group relative overflow-hidden rounded-md border bg-background/85 p-2">
                <div className="mb-1.5 flex items-center gap-2 text-xs">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="truncate font-medium" dir="ltr">{item.name}</span>
                  <button type="button" aria-label={T("جدا کردن پیوست از خاطره", "Remove attachment from entry")} title={T("فقط از این خاطره جدا می‌شود؛ فایل ذخیره‌شده پاک نمی‌گردد", "Removes it from this entry only; the stored file is kept")} data-testid={`diary-attachment-remove-${item.id}`} onClick={() => setPendingRemove(item)} className="ms-auto rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                {onInsert && <Button type="button" size="sm" variant="ghost" className="mb-2 text-xs" onClick={() => onInsert(item)}>{T("درج در متن", "Insert into text")}</Button>}
                {item.kind === "image" && <img src={item.url} alt={item.name} className="max-h-64 w-full rounded-lg object-cover" loading="lazy" />}
                {item.kind === "audio" && <audio controls preload="none" src={item.url} className="w-full" />}
                {item.kind === "video" && <video controls preload="metadata" src={item.url} className="max-h-72 w-full rounded-lg bg-black" />}
                {item.kind === "file" && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{T("باز کردن فایل", "Open file")}</a>}
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={Boolean(pendingRemove)} onOpenChange={(open) => { if (!open) setPendingRemove(null); }}>
        <AlertDialogContent data-testid="diary-attachment-remove-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{T("این پیوست از خاطره جدا شود؟", "Remove this attachment from the entry?")}</AlertDialogTitle>
            <AlertDialogDescription>{T("فایل ذخیره‌شده پاک نمی‌شود؛ فقط ارتباط آن با این خاطره برداشته می‌شود و می‌توانی بازگردانی کنی.", "The stored file is not deleted; only its link to this entry is removed, and you can undo this.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="diary-attachment-remove-cancel">{T("انصراف", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction data-testid="diary-attachment-remove-confirm" onClick={(event) => { event.preventDefault(); confirmRemove(); }}>{T("جدا کن", "Remove")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
