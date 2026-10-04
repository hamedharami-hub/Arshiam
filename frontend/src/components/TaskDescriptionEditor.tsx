import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NoteMarkdown } from "@/components/NoteMarkdown";
import { Maximize2, Minimize2, Check, Pencil, FileText, ImagePlus, Link as LinkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { uploadMediaFull } from "@/lib/uploadMedia";
import { LinkDialog } from "@/components/LinkDialog";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useDeviceFormFactor } from "@/hooks/useDeviceFormFactor";
import { NoteEditorTabs } from "@/components/NoteEditorTabs";
import { VoiceInputButton } from "@/components/VoiceInputButton";

/**
 * Task description editor with markdown support.
 * - Inline: AutoTextarea while editing; renders markdown preview when blurred (if content).
 * - Fullscreen button opens a Sheet with the full NoteEditorTabs (visual/markdown/preview).
 */
export function TaskDescriptionEditor({
  taskId,
  value,
  onChange,
  onSave,
  onConvertToNote,
  readOnly = false,
}: {
  taskId: string;
  value: string;
  onChange: (v: string) => void;
  onSave: (v: string) => void | Promise<void>;
  onConvertToNote?: () => void | Promise<void>;
  readOnly?: boolean;
}) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const { prefersDialog } = useDeviceFormFactor();

  const [editing, setEditing] = useState(false);
  const [full, setFull] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(value);
  const latestValue = useRef(value);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const startEditing = () => { setEditing(true); requestAnimationFrame(() => areaRef.current?.focus()); };
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  useEffect(() => { latestValue.current = value; }, [value]);

  const appendToDescription = (snippet: string) => {
    const base = (latestValue.current || "").trimEnd();
    const next = base ? `${base}\n\n${snippet}` : snippet;
    latestValue.current = next;
    onChange(next);
    void onSave(next);
  };

  const uploadFile = async (file: File) => {
    if (!user) { toast.error(T("ابتدا وارد حساب شوید", "Sign in first")); return; }
    setUploading(true);
    const tid = toast.loading(T(`در حال بارگذاری ${file.name}…`, `Uploading ${file.name}…`));
    try {
      const media = await uploadMediaFull(file, user.id);
      const label = media.name.replace(/[\[\]]/g, "");
      appendToDescription(media.kind === "image" ? `![${label}](${media.url})` : `[${label}](${media.url})`);
      toast.success(T("پیوست اضافه شد", "Attachment added"), { id: tid });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : T("بارگذاری ناموفق بود", "Upload failed"), {
        id: tid,
        action: { label: T("تلاش دوباره", "Retry"), onClick: () => void uploadFile(file) },
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const showPreview = !editing && Boolean(value?.trim());

  const hasContent = (value || "").trim().length > 0;

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
          onClick={(e) => { if (readOnly || (e.target as HTMLElement).closest("a")) return; startEditing(); }}
          onKeyDown={(e) => { if (!readOnly && e.key === "Enter") startEditing(); }}
          className="prose-note w-full cursor-text px-1 pb-2 text-[14px] leading-relaxed [&_img]:max-h-72 [&_img]:rounded-lg"
          data-testid="task-description-preview"
        >
          <NoteMarkdown>{value}</NoteMarkdown>
        </div>
      )}
      <AutoTextarea
        ref={areaRef}
        placeholder={T("توضیحات، یادداشت یا لینک…", "Description, notes or links…")}
        aria-label={T("توضیحات", "Description")}
        value={value || ""}
        disabled={readOnly}
        onFocus={() => !readOnly && setEditing(true)}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(event) => {
          const latest = event.currentTarget.value;
          latestValue.current = latest;
          setEditing(false);
          void onSave(latest);
        }}
        minHeight={expanded ? 260 : 72}
        maxHeight={expanded ? 900 : 520}
        dir="auto"
        style={{ unicodeBidi: "plaintext" }}
        className={`${showPreview ? "hidden" : ""} w-full flex-1 border-none bg-transparent px-1 pt-0 text-[14px] leading-relaxed text-foreground/90 placeholder:text-muted-foreground/60 focus-visible:ring-0`}
      />
      {/* Tools appear only while the field is focused; mousedown keeps focus in the textarea. */}
      {!readOnly && (
        <div
          className={`${editing ? "flex" : "hidden"} items-center justify-end gap-0.5 pt-1`}
          onMouseDown={(e) => e.preventDefault()}
          data-testid="task-description-tools"
        >
          <VoiceInputButton
            continuous
            onTranscript={(text) => {
              const next = (value || "").trimEnd() + " " + text;
              onChange(next);
              onSave(next);
            }}
            size="sm"
            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
            title={T("ورودی صوتی", "Voice input")}
          />
          <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title={T("پیوست تصویر یا فایل", "Attach image or file")} aria-label={T("پیوست تصویر یا فایل", "Attach image or file")} data-testid="task-description-attach">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => setLinkOpen(true)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title={T("افزودن لینک", "Add link")} aria-label={T("افزودن لینک", "Add link")} data-testid="task-description-add-link">
            <LinkIcon className="h-4 w-4" />
          </button>
          {hasContent && onConvertToNote && (
            <button type="button" onClick={() => void onConvertToNote()} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title={T("تبدیل به نوت", "Move to note")} aria-label={T("تبدیل به نوت", "Move to note")}>
              <FileText className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={() => { setDraft(value || ""); setFull(true); }} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title={T("ویرایشگر پیشرفته", "Advanced editor")} aria-label={T("ویرایشگر پیشرفته", "Advanced editor")}>
            <Pencil className="h-4 w-4" />
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

      <LinkDialog open={linkOpen} onOpenChange={setLinkOpen} onSubmit={(url, text) => appendToDescription(`[${text || url}](${url})`)} />
      {full && (
        prefersDialog ? (
          <Dialog open={full} onOpenChange={setFull}>
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
                  onClick={() => { onChange(draft); onSave(draft); setFull(false); }}
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
                />
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <Sheet open={full} onOpenChange={setFull}>
            <SheetContent side="bottom" className="h-[95vh] p-0 flex flex-col" dir={isEn ? "ltr" : "rtl"}>
              <SheetHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
                <SheetTitle className="text-base">{T("توضیحات تسک", "Task description")}</SheetTitle>
                <Button
                  size="sm"
                  onClick={() => { onChange(draft); onSave(draft); setFull(false); }}
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
                />
              </div>
            </SheetContent>
          </Sheet>
        )
      )}
    </div>
  );
}
