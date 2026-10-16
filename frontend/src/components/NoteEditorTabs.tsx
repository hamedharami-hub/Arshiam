import { lazy, Suspense, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { markdownToHtml } from "@/lib/markdown";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { Loader2 } from "lucide-react";
import { NoteMarkdown } from "@/components/NoteMarkdown";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { Button } from "@/components/ui/button";
import { canTriggerNoteLink, noteLinkMarkdown, type LinkableNote, type NoteLinkScope } from "@/lib/noteLinks";
import { NoteLinkPicker } from "@/components/notes/NoteLinkPicker";

const RichEditor = lazy(() =>
  import("@/components/RichEditor").then((m) => ({ default: m.RichEditor }))
);

/**
 * Three-mode note editor: visual rich editor / raw markdown / preview.
 * Used by NotesView and inside TaskDetail. Frameless — text spans full width.
 */
export function NoteEditorTabs({
  noteId,
  markdown,
  onChange,
  readOnly = false,
  mode,
  onModeChange,
  hideTabsList = false,
  onBusyChange,
  onSelectedTextChange,
  contentRevision,
  noteLinks,
  controlledHtml,
}: {
  noteId: string;
  markdown: string;
  onChange: (md: string, html: string) => void;
  readOnly?: boolean;
  mode?: "visual" | "markdown" | "preview";
  onModeChange?: (mode: "visual" | "markdown" | "preview") => void;
  hideTabsList?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onSelectedTextChange?: (text: string) => void;
  /** Bump to push an external markdown change (e.g. an applied AI proposal). */
  contentRevision?: number;
  noteLinks?: NoteLinkScope;
  /** New-note drafts support external Undo/template replacements without remounting. */
  controlledHtml?: string;
}) {
  const { T, isEn } = useBilingual();
  const { user } = useAuth();
  const [mediaBusy, setMediaBusy] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [linkRange, setLinkRange] = useState<{ from: number; to: number; label: string; base: string } | null>(null);
  const linkEdit = useRef<{ before: string; after: string } | null>(null);
  const closePicker = () => {
    const range = linkRange;
    setLinkRange(null);
    requestAnimationFrame(() => { textarea.current?.focus(); if (range) textarea.current?.setSelectionRange(range.to, range.to); });
  };
  const pickNote = (note: LinkableNote) => {
    if (!linkRange || readOnly) return;
    if (markdown !== linkRange.base) { closePicker(); return; }
    const text = noteLinkMarkdown(note, linkRange.label || note.title || T("بدون عنوان", "Untitled"));
    const next = markdown.slice(0, linkRange.from) + text + markdown.slice(linkRange.to);
    const cursor = linkRange.from + text.length;
    linkEdit.current = { before: markdown, after: next };
    onChange(next, markdownToHtml(next));
    setLinkRange(null);
    requestAnimationFrame(() => { textarea.current?.focus(); textarea.current?.setSelectionRange(cursor, cursor); });
  };
  const handleBusy = (busy: boolean) => { setMediaBusy(busy); onBusyChange?.(busy); };
  const [internalTab, setInternalTab] = useState<"visual" | "markdown" | "preview">("visual");
  const currentTab = mode ?? internalTab;
  const handleTabChange = (val: string) => {
    if (mediaBusy) return;
    const next = val as "visual" | "markdown" | "preview";
    onSelectedTextChange?.("");
    if (onModeChange) onModeChange(next);
    else setInternalTab(next);
  };

  return (
    <Tabs key={`${user?.id ?? "signed-out"}:${noteId}`} value={currentTab} onValueChange={handleTabChange} className="w-full">
      {!hideTabsList && (
        <TabsList className="h-9 p-0.5 bg-muted/60 border border-border/40">
          <TabsTrigger disabled={mediaBusy} value="visual" className="h-8 px-3 text-xs">{T("ویرایش", "Edit")}</TabsTrigger>
          <TabsTrigger disabled={mediaBusy} value="markdown" className="h-8 px-3 text-xs">{T("مارک‌داون", "Markdown")}</TabsTrigger>
          <TabsTrigger disabled={mediaBusy} value="preview" className="h-8 px-3 text-xs">{T("پیش‌نمایش", "Preview")}</TabsTrigger>
        </TabsList>
      )}

      <TabsContent value="visual" className="mt-1">
        <Suspense
          fallback={
            <div className="h-32 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground rounded-lg border border-dashed border-border/60 bg-muted/20">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs">{T("در حال آماده کردن ویرایشگر…", "Loading editor…")}</span>
            </div>
          }
        >
          <RichEditor
            key={`${user?.id ?? "signed-out"}:${noteId}`}
            attachmentScopeId={noteId}
            editorAriaLabel={T("متن یادداشت", "Note body")}
            initialMarkdown={markdown}
            controlledHtml={controlledHtml}
            externalMarkdown={markdown}
            externalRevision={contentRevision}
            onChange={(html, md) => onChange(md, html)}
            readOnly={readOnly}
            onBusyChange={handleBusy}
            onSelectedTextChange={onSelectedTextChange}
            noteLinks={noteLinks}
          />
        </Suspense>
      </TabsContent>

      <TabsContent value="markdown" className="mt-1 space-y-2">
        <div className="flex items-center justify-end">
          {noteLinks && <Button type="button" variant="ghost" disabled={readOnly} onClick={() => {
            const from = textarea.current?.selectionStart ?? markdown.length;
            const to = textarea.current?.selectionEnd ?? from;
            setLinkRange({ from, to, label: markdown.slice(from, to), base: markdown });
          }}>{T("پیوند به یادداشت", "Link to note")}</Button>}
          <VoiceInputButton
            continuous
            onTranscript={(text) => {
              const next = (markdown || "").trimEnd() + " " + text;
              onChange(next, markdownToHtml(next));
            }}
            disabled={readOnly}
            size="sm"
            className="h-7 px-2 text-xs"
          />
        </div>
        <Textarea
          ref={textarea}
          aria-label={T("متن یادداشت به مارک‌داون", "Note body in Markdown")}
          value={markdown}
          onSelect={(event) => {
            const target = event.currentTarget;
            onSelectedTextChange?.(target.value.slice(target.selectionStart, target.selectionEnd).trim());
          }}
          onChange={(e) => {
            const text = e.target.value;
            onChange(text, markdownToHtml(text));
            const cursor = e.target.selectionStart;
            if (noteLinks && !(e.nativeEvent as InputEvent).isComposing && canTriggerNoteLink(text, cursor)) setLinkRange({ from: cursor - 2, to: cursor, label: "", base: text });
          }}
          onKeyDown={event => {
            const edit = linkEdit.current;
            if (!edit || readOnly || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
            const expected = event.shiftKey ? edit.before : edit.after;
            if (markdown !== expected) return;
            event.preventDefault();
            const next = event.shiftKey ? edit.after : edit.before;
            onChange(next, markdownToHtml(next));
          }}
          disabled={readOnly}
          className="min-h-[40vh] font-mono text-sm w-full border-0 focus-visible:ring-2 focus-visible:ring-ring px-0"
          dir={isEn ? "ltr" : "auto"}
          style={{ unicodeBidi: "plaintext", textAlign: "start" }}
        />
        <div>
          <p className="text-xs text-muted-foreground mb-1">{T("پیش‌نمایش زنده", "Live preview")}</p>
          <div className="prose-note max-w-none">
            {markdown.length > 60_000 ? <p className="text-xs text-muted-foreground">{T("این نوت برای پیش‌نمایش زنده خیلی بلند است.", "This note is too long for a live preview.")}</p> : <NoteMarkdown noteLinks={noteLinks}>{markdown || ""}</NoteMarkdown>}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="preview" className="mt-1" onMouseUp={(event) => {
        const selection = window.getSelection();
        const selected = selection?.toString().trim() || "";
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        onSelectedTextChange?.(range && event.currentTarget.contains(range.commonAncestorContainer) ? selected : "");
      }} onTouchEnd={(event) => {
        const selection = window.getSelection();
        const selected = selection?.toString().trim() || "";
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        onSelectedTextChange?.(range && event.currentTarget.contains(range.commonAncestorContainer) ? selected : "");
      }}>
        <div className="min-h-[50vh]">
          <div className="prose-note max-w-none">
            {markdown.length > 60_000 ? <p className="text-xs text-muted-foreground">{T("این نوت برای پیش‌نمایش زنده خیلی بلند است.", "This note is too long for a live preview.")}</p> : <NoteMarkdown noteLinks={noteLinks}>{markdown || ""}</NoteMarkdown>}
          </div>
        </div>
      </TabsContent>
      {noteLinks && linkRange && <NoteLinkPicker key={noteLinks.ownerId} scope={noteLinks} sourceId={noteId} onPick={pickNote} onClose={closePicker} />}
    </Tabs>
  );
}
