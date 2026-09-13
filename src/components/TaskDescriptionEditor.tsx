import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Maximize2, Check } from "lucide-react";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  readOnly = false,
}: {
  taskId: string;
  value: string;
  onChange: (v: string) => void;
  onSave: (v: string) => void | Promise<void>;
  readOnly?: boolean;
}) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);

  const [editing, setEditing] = useState(false);
  const [full, setFull] = useState(false);
  const [draft, setDraft] = useState(value);
  const [fullscreenInitialValue, setFullscreenInitialValue] = useState(value || "");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [savingFullscreen, setSavingFullscreen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const latestValue = useRef(value);

  useEffect(() => { latestValue.current = value; }, [value]);

  const hasContent = (value || "").trim().length > 0;
  const hasFullscreenChanges = draft !== fullscreenInitialValue;

  const openFullscreen = () => {
    const initialValue = value || "";
    setDraft(initialValue);
    setFullscreenInitialValue(initialValue);
    setConfirmDiscard(false);
    setSaveError(null);
    setFull(true);
  };

  const closeFullscreen = () => {
    if (savingFullscreen) return;
    if (!hasFullscreenChanges) {
      setFull(false);
      return;
    }
    setConfirmDiscard(true);
  };

  const saveFullscreen = async () => {
    if (savingFullscreen) return;
    setSavingFullscreen(true);
    setSaveError(null);
    try {
      await onSave(draft);
      onChange(draft);
      setConfirmDiscard(false);
      setFull(false);
    } catch {
      setSaveError(T(
        "ذخیره‌سازی انجام نشد. اتصال را بررسی کنید و دوباره تلاش کنید.",
        "Saving did not complete. Check your connection and try again.",
      ));
    } finally {
      setSavingFullscreen(false);
    }
  };

  const discardFullscreenChanges = () => {
    setDraft(fullscreenInitialValue);
    setConfirmDiscard(false);
    setSaveError(null);
    setFull(false);
  };

  return (
    <div className="relative group rounded-2xl border border-border/50 bg-muted/20 dark:bg-card/20 hover:border-border/80 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200 p-3">
      {/* Action buttons toolbar (voice, fullscreen markdown) */}
      {!readOnly && (
        <div className="flex items-center gap-1 absolute top-2.5 end-2.5 z-10">
          <VoiceInputButton
            continuous
            onTranscript={(text) => {
              const next = (value || "").trimEnd() + " " + text;
              onChange(next);
              onSave(next);
            }}
            size="sm"
            className="h-7 w-7 text-muted-foreground/70 hover:text-foreground hover:bg-accent/60 rounded-lg transition"
            title={T("ضبط صوتی", "Voice input")}
          />
          <button
            type="button"
            onClick={openFullscreen}
            aria-label={T("تمام صفحه", "Fullscreen")}
            title={T("ویرایشگر پیشرفته / تمام صفحه", "Advanced markdown / fullscreen")}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-accent/60 transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {editing || !hasContent ? (
        <AutoTextarea
          aria-label={T("متن تسک", "Task notes")}
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
          minHeight={180}
          maxHeight={720}
          dir="auto"
          className="border-none bg-transparent focus-visible:ring-0 px-0 pt-0 text-[14px] leading-relaxed text-foreground/90 placeholder:text-muted-foreground/60 w-full pe-16"
        />
      ) : (
        <button
          type="button"
          onClick={() => !readOnly && setEditing(true)}
          disabled={readOnly}
          dir="auto"
          className={`w-full text-start px-0 pt-0 text-[14px] leading-relaxed text-foreground/90 rounded transition pe-16 ${readOnly ? "" : "hover:opacity-90"}`}
        >
          <div className="prose-note prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          </div>
        </button>
      )}

      <Sheet
        open={full}
        onOpenChange={(open) => {
          if (open) setFull(true);
          else closeFullscreen();
        }}
      >
        <SheetContent side="bottom" className="h-[95vh] p-0 flex flex-col">
          <SheetHeader className="px-4 pe-14 py-3 border-b flex-row items-center justify-between space-y-0">
            <SheetTitle className="text-base">{T("توضیحات تسک", "Task description")}</SheetTitle>
            <Button
              size="sm"
              disabled={savingFullscreen}
              onClick={() => { void saveFullscreen(); }}
              className="gap-1"
            >
              <Check className="w-4 h-4" />
              {savingFullscreen ? T("در حال ذخیره…", "Saving…") : T("ذخیره", "Save")}
            </Button>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {saveError && <p role="alert" className="mb-3 text-sm text-destructive">{saveError}</p>}
            <NoteEditorTabs
              noteId={`task-desc-${taskId}`}
              markdown={draft}
              onChange={(md) => setDraft(md)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent dir={isEn ? "ltr" : "rtl"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{T("تغییرات ذخیره نشده‌اند", "Unsaved changes")}</AlertDialogTitle>
            <AlertDialogDescription>
              {T(
                "پیش از بستن توضیحات، تغییرات را ذخیره می‌کنید یا بدون ذخیره خارج می‌شوید؟",
                "Would you like to save your changes before closing the description?",
              )}
            </AlertDialogDescription>
            {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel disabled={savingFullscreen}>
              {T("ادامهٔ ویرایش", "Keep editing")}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              disabled={savingFullscreen}
              onClick={discardFullscreenChanges}
            >
              {T("خروج بدون ذخیره", "Discard changes")}
            </Button>
            <Button
              type="button"
              disabled={savingFullscreen}
              onClick={() => { void saveFullscreen(); }}
            >
              <Check className="w-4 h-4" />
              {savingFullscreen ? T("در حال ذخیره…", "Saving…") : T("ذخیره و بستن", "Save and close")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
