import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NoteMarkdown } from "@/components/NoteMarkdown";
import { Maximize2, Minimize2, Check, Pencil, FileText, ImagePlus, Link as LinkIcon, Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { uploadMediaFull } from "@/lib/uploadMedia";
import { LinkDialog } from "@/components/LinkDialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useDeviceFormFactor } from "@/hooks/useDeviceFormFactor";
import { NoteEditorTabs } from "@/components/NoteEditorTabs";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import type { RichEditorHandle } from "@/components/RichEditor";

const RichEditor = lazy(() => import("@/components/RichEditor").then((module) => ({ default: module.RichEditor })));

/**
 * Task description editor with markdown support.
 * - Inline editing uses the same rich-text format as the preview, so only the selected text changes.
 * - The expanded editor keeps the full NoteEditorTabs (visual/markdown/preview).
 */
type DescriptionEditorProps = {
  taskId: string;
  value: string;
  onChange: (v: string) => void;
  onSave: (v: string) => void | Promise<void>;
  onConvertToNote?: () => void | Promise<void>;
  readOnly?: boolean;
};

export function TaskDescriptionEditor(props: DescriptionEditorProps) {
  const { user } = useAuth();
  return <TaskDescriptionEditorContent key={`${user?.id ?? "signed-out"}:${props.taskId}`} {...props} />;
}

function TaskDescriptionEditorContent({ taskId, value, onChange, onSave, onConvertToNote, readOnly = false }: DescriptionEditorProps) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const { prefersDialog } = useDeviceFormFactor();

  const [editing, setEditing] = useState(false);
  const [full, setFull] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [inlineEditorGeneration, setInlineEditorGeneration] = useState(0);
  const [draft, setDraft] = useState(value);
  const latestValue = useRef(value);
  const fileRef = useRef<HTMLInputElement>(null);
  const inlineEditorRef = useRef<RichEditorHandle | null>(null);
  const startEditing = () => { setEditing(true); requestAnimationFrame(() => inlineEditorRef.current?.focus()); };
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [startingRecording, setStartingRecording] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [linkOpen, setLinkOpen] = useState(false);
  const alive = useRef(true);
  const converting = useRef(false);
  const [saving, setSaving] = useState(false);
  const [editorUploading, setEditorUploading] = useState(false);
  const saveLock = useRef(false);
  const mountedOwner = useRef(user?.id);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setRecordingSeconds((seconds) => {
      const next = seconds + 1;
      if (next >= 600) {
        const recorder = recorderRef.current;
        if (recorder && recorder.state !== "inactive") {
          toast.info(isEn ? "Audio recording stops after ten minutes" : "ضبط صدا پس از ده دقیقه متوقف می‌شود");
          window.setTimeout(() => { if (recorder.state !== "inactive") recorder.stop(); }, 0);
        }
      }
      return next;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [recording, isEn]);

  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      if (recorder.state !== "inactive") recorder.stop();
    }
    recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    latestValue.current = value;
    if (!full) setDraft(value);
  }, [value, full]);

  const appendToDescription = async (snippet: string) => {
    const base = (inlineEditorRef.current?.getMarkdown() ?? latestValue.current ?? "").trimEnd();
    const next = base ? `${base}\n\n${snippet}` : snippet;
    latestValue.current = next;
    onChange(next);
    setInlineEditorGeneration((generation) => generation + 1);
    await onSave(next);
  };

  const uploadFile = async (file: File) => {
    if (!user) { toast.error(T("ابتدا وارد حساب شوید", "Sign in first")); return; }
    setUploading(true);
    const tid = toast.loading(T(`در حال بارگذاری ${file.name}…`, `Uploading ${file.name}…`));
    try {
      const media = await uploadMediaFull(file, user.id);
      if (!alive.current || mountedOwner.current !== user.id) { toast.dismiss(tid); return; }
      const editor = inlineEditorRef.current;
      if (editor) {
        editor.insertAttachment(media);
        const next = editor.getMarkdown();
        latestValue.current = next;
        onChange(next);
        await onSave(next);
      } else {
        const label = media.name.replace(/[\[\]]/g, "");
        await appendToDescription(media.kind === "image" ? `![${label}](${media.url})` : `[${label}](${media.url})`);
      }
      toast.success(T("پیوست اضافه شد", "Attachment added"), { id: tid });
    } catch (error) {
      if (!alive.current) { toast.dismiss(tid); return; }
      toast.error(error instanceof Error ? error.message : T("بارگذاری ناموفق بود", "Upload failed"), {
        id: tid,
        action: { label: T("تلاش دوباره", "Retry"), onClick: () => { if (alive.current) void uploadFile(file); } },
      });
    } finally {
      if (alive.current) setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const startAudioRecording = async () => {
    if (startingRecording || recording || uploading) return;
    if (!user?.id || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error(T("ضبط صدا در این دستگاه پشتیبانی نمی‌شود", "Audio recording is not supported on this device"));
      return;
    }
    const ownerId = user.id;
    let stream: MediaStream | null = null;
    setStartingRecording(true);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current || mountedOwner.current !== ownerId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const preferredType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported?.(type));
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      recorderRef.current = recorder;
      recorderStreamRef.current = stream;
      recorderChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) recorderChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (recorderStreamRef.current === stream) recorderStreamRef.current = null;
        if (recorderRef.current === recorder) recorderRef.current = null;
        if (!alive.current || mountedOwner.current !== ownerId) return;
        const mime = (recorder.mimeType || "audio/webm").split(";")[0].toLowerCase();
        const blob = new Blob(recorderChunksRef.current, { type: mime });
        recorderChunksRef.current = [];
        setRecording(false);
        if (!blob.size) {
          toast.error(T("صدایی ضبط نشد؛ دوباره تلاش کن", "No audio was captured; try again"));
          return;
        }
        const extension = mime.includes("mp4") ? "m4a" : "webm";
        void uploadFile(new File([blob], `task-voice-${Date.now()}.${extension}`, { type: mime }));
      };
      recorder.start();
      setRecordingSeconds(0);
      setRecording(true);
    } catch (error) {
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      stream?.getTracks().forEach((track) => track.stop());
      if (recorderStreamRef.current === stream) recorderStreamRef.current = null;
      recorderRef.current = null;
      setRecording(false);
      toast.error(error instanceof Error ? error.message : T("دسترسی به میکروفون ممکن نشد", "Microphone access was denied"));
    } finally {
      if (alive.current) setStartingRecording(false);
    }
  };

  const stopAudioRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const saveAdvanced = async () => {
    if (saveLock.current || readOnly || editorUploading) return;
    saveLock.current = true;
    setSaving(true);
    try {
      await onSave(draft);
      if (!alive.current) return;
      latestValue.current = draft;
      onChange(draft);
      setInlineEditorGeneration((generation) => generation + 1);
      setFull(false);
    } catch (error) {
      if (alive.current) toast.error(error instanceof Error ? error.message : T("ذخیره انجام نشد؛ متن محفوظ است", "Save failed; your draft is retained"));
    } finally { saveLock.current = false; if (alive.current) setSaving(false); }
  };

  const convertToNote = async () => {
    if (!onConvertToNote || converting.current || readOnly || uploading) return;
    converting.current = true;
    try { await onConvertToNote(); }
    finally { converting.current = false; }
  };

  const showPreview = !editing && Boolean(value?.trim());

  const hasContent = (value || "").trim().length > 0;

  const finishEditing = async () => {
    if (readOnly || saving) return;
    const current = inlineEditorRef.current?.getMarkdown() ?? latestValue.current ?? "";
    latestValue.current = current;
    setSaving(true);
    try {
      await onSave(current);
      onChange(current);
      setEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : T("ذخیره انجام نشد؛ متن محفوظ است", "Save failed; your text is retained"));
    } finally {
      if (alive.current) setSaving(false);
    }
  };

  return (
    <div className="group/desc relative flex w-full min-w-0 flex-col px-1" data-testid="task-description">
      <input
        ref={fileRef} type="file" accept="image/*,application/pdf,audio/*,video/*,text/plain" className="hidden"
        data-testid="task-description-file-input"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f); }}
      />
      {showPreview && (
        <div
          role={readOnly ? undefined : "button"} tabIndex={readOnly ? undefined : 0} dir="auto"
          onClick={(e) => {
            const selection = window.getSelection();
            if (readOnly || (e.target as HTMLElement).closest("a") || (selection && !selection.isCollapsed)) return;
            startEditing();
          }}
          onKeyDown={(e) => { if (!readOnly && e.key === "Enter") startEditing(); }}
          className="prose-note w-full cursor-text px-1 pb-2 text-[14px] leading-relaxed [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg"
          data-testid="task-description-preview"
        >
          <NoteMarkdown>{value}</NoteMarkdown>
        </div>
      )}
      {!showPreview && (
        <Suspense fallback={<div className="min-h-[72px] animate-pulse rounded-lg bg-muted/20" />}>
          <div onFocusCapture={() => !readOnly && setEditing(true)} onClickCapture={() => !readOnly && setEditing(true)}>
            <RichEditor
              key={`task-description-inline:${taskId}:${inlineEditorGeneration}`}
              ref={inlineEditorRef}
              attachmentScopeId={`task-description-inline:${taskId}`}
              initialMarkdown={value || ""}
              onChange={(_html, markdown) => {
                latestValue.current = markdown;
                onChange(markdown);
              }}
              placeholder={T("توضیحات، یادداشت یا لینک…", "Description, notes or links…")}
              editorAriaLabel={T("توضیحات", "Description")}
              readOnly={readOnly}
              showVoiceButton={false}
              showToolbar={false}
              autoFocus={editing}
              compact
              compactExpanded={expanded}
            />
          </div>
        </Suspense>
      )}
      {/* Tools appear while editing; mousedown keeps the rich-text selection in place. */}
      {!readOnly && (
        <div
          className={`${editing ? "flex" : "hidden"} items-center justify-end gap-0.5 pt-1`}
          onMouseDown={(e) => e.preventDefault()}
          data-testid="task-description-tools"
        >
          <VoiceInputButton
            continuous
            onTranscript={(text) => {
              if (!alive.current || readOnly) return;
              const editor = inlineEditorRef.current;
              if (editor) {
                editor.insertText(text);
                const next = editor.getMarkdown();
                latestValue.current = next;
                onChange(next);
                void Promise.resolve(onSave(next)).catch(error => toast.error(error instanceof Error ? error.message : T("ذخیره انجام نشد", "Save failed")));
              } else {
                void appendToDescription(text).catch(error => toast.error(error instanceof Error ? error.message : T("ذخیره انجام نشد", "Save failed")));
              }
            }}
            size="sm"
            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
            title={T("ورودی صوتی", "Voice input")}
          />
          <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title={T("پیوست تصویر یا فایل", "Attach image or file")} aria-label={T("پیوست تصویر یا فایل", "Attach image or file")} data-testid="task-description-attach">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          </button>
          <button
            type="button"
            disabled={uploading || startingRecording}
            onClick={() => recording ? stopAudioRecording() : void startAudioRecording()}
            className={`grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 ${recording ? "text-destructive animate-pulse" : ""}`}
            title={recording ? T("توقف ضبط صدا", "Stop audio recording") : T("ضبط صدا", "Record audio")}
            aria-label={recording ? T("توقف ضبط صدا", "Stop audio recording") : T("ضبط صدا", "Record audio")}
            data-testid="task-description-record-audio"
          >
            {startingRecording ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          {recording && <span className="inline-flex items-center text-[11px] tabular-nums text-destructive" aria-live="polite">{Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, "0")}</span>}
          <button type="button" onClick={() => setLinkOpen(true)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title={T("افزودن لینک", "Add link")} aria-label={T("افزودن لینک", "Add link")} data-testid="task-description-add-link">
            <LinkIcon className="h-4 w-4" />
          </button>
          {hasContent && onConvertToNote && (
            <button type="button" onClick={() => void convertToNote()} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title={T("تبدیل به نوت", "Move to note")} aria-label={T("تبدیل به نوت", "Move to note")}>
              <FileText className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={() => { setDraft(inlineEditorRef.current?.getMarkdown() ?? value ?? ""); setFull(true); }} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title={T("ویرایشگر پیشرفته", "Advanced editor")} aria-label={T("ویرایشگر پیشرفته", "Advanced editor")}>
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void finishEditing()}
            disabled={saving || uploading || editorUploading}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            title={T("پایان ویرایش", "Finish editing")}
            aria-label={T("پایان ویرایش", "Finish editing")}
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-label={expanded ? T("نمای جمع‌وجور", "Compact view") : T("گسترش متن", "Expand text")}
            title={expanded ? T("نمای جمع‌وجور", "Compact view") : T("گسترش متن", "Expand text")}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      )}

      <LinkDialog open={linkOpen} onOpenChange={setLinkOpen} onSubmit={(url, text) => { void appendToDescription(`[${text || url}](${url})`).catch(error => toast.error(error instanceof Error ? error.message : T("ذخیره انجام نشد", "Save failed"))); }} />
      {full && (
        prefersDialog ? (
          <Dialog open={full} onOpenChange={next => { if (!saveLock.current && !editorUploading) setFull(next); }}>
            <DialogContent
              dir={isEn ? "ltr" : "rtl"}
              className="w-full max-w-2xl max-h-[75vh] p-0 flex flex-col overflow-hidden rounded-2xl"
            >
              <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
                <DialogTitle className="text-base">{T("توضیحات تسک", "Task description")}</DialogTitle>
                <DialogDescription className="sr-only">
                  {T("ویرایشگر توضیحات تسک", "Task description editor")}
                </DialogDescription>
                <Button
                  size="sm"
                  disabled={saving || editorUploading}
                  onClick={() => void saveAdvanced()}
                  className="gap-1 me-6"
                >
                  <Check className="w-4 h-4" />
                  {T("ذخیره", "Save")}
                </Button>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
                <NoteEditorTabs
                  noteId={`task-desc-${taskId}`}
                  markdown={draft}
                  onChange={(md) => setDraft(md)}
                  readOnly={saving}
                  onBusyChange={setEditorUploading}
                />
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <Sheet open={full} onOpenChange={next => { if (!saveLock.current && !editorUploading) setFull(next); }}>
            <SheetContent side="bottom" className="h-[95vh] p-0 flex flex-col" dir={isEn ? "ltr" : "rtl"}>
              <SheetHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
                <SheetTitle className="text-base">{T("توضیحات تسک", "Task description")}</SheetTitle>
                <Button
                  size="sm"
                  disabled={saving || editorUploading}
                  onClick={() => void saveAdvanced()}
                  className="gap-1"
                >
                  <Check className="w-4 h-4" />
                  {T("ذخیره", "Save")}
                </Button>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
                <NoteEditorTabs
                  noteId={`task-desc-${taskId}`}
                  markdown={draft}
                  onChange={(md) => setDraft(md)}
                  readOnly={saving}
                  onBusyChange={setEditorUploading}
                />
              </div>
            </SheetContent>
          </Sheet>
        )
      )}
    </div>
  );
}
