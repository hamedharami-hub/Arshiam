import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Maximize2, Check, Eraser } from "lucide-react";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  const latestValue = useRef(value);

  useEffect(() => { latestValue.current = value; }, [value]);

  const hasContent = (value || "").trim().length > 0;

  return (
    <div className="relative group mt-2 rounded-2xl border border-border/50 bg-muted/20 dark:bg-card/20 hover:border-border/80 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200 p-3">
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
            onClick={() => { setDraft(value || ""); setFull(true); }}
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
          placeholder={T("توضیحات…", "Description…")}
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
          minHeight={40}
          maxHeight={360}
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

      <Sheet open={full} onOpenChange={setFull}>
        <SheetContent side="bottom" className="h-[95vh] p-0 flex flex-col">
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
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <NoteEditorTabs
              noteId={`task-desc-${taskId}`}
              markdown={draft}
              onChange={(md) => setDraft(md)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
