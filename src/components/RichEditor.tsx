import { useBilingual } from "@/hooks/useBilingual";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Typography from "@tiptap/extension-typography";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks, Quote, Code, Image as ImgIcon, Music, Video, Paperclip,
  Link as LinkIcon, Highlighter, AlignLeft, AlignCenter, AlignRight, Minus, Sparkles, Loader2,
  Undo2, Redo2, Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { uploadMediaFull, type UploadedMedia } from "@/lib/uploadMedia";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { callAI, getAILanguage } from "@/lib/ai";
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdown";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { LinkDialog } from "@/components/LinkDialog";

const AI_ACTIONS = [
  { key: "improve", label: "✨ بهبود نگارش" },
  { key: "summarize", label: "📝 خلاصه کن" },
  { key: "expand", label: "📖 گسترش بده" },
  { key: "translate_fa", label: "🇮🇷 ترجمه به فارسی" },
  { key: "translate_en", label: "🇬🇧 ترجمه به انگلیسی" },
  { key: "to_list", label: "• تبدیل به لیست" },
  { key: "fix_grammar", label: "✏️ اصلاح املا و گرامر" },
  { key: "tone_formal", label: "👔 لحن رسمی‌تر" },
  { key: "tone_casual", label: "😊 لحن صمیمی‌تر" },
];

export type RichEditorHandle = {
  getHtml: () => string;
  getMarkdown: () => string;
  insertText: (text: string) => void;
  insertAttachment: (media: Pick<UploadedMedia, "url" | "name" | "kind">) => void;
};

export const RichEditor = forwardRef<RichEditorHandle, {
  initialHtml?: string;
  controlledHtml?: string;
  initialMarkdown?: string;
  onChange?: (html: string, markdown: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  showVoiceButton?: boolean;
  attachmentScopeId?: string;
  onAttachmentUploaded?: (media: UploadedMedia) => void;
}>(function RichEditor({
  initialHtml = "",
  controlledHtml,
  initialMarkdown = "",
  onChange,
  placeholder: placeholderProp,
  readOnly = false,
  showVoiceButton = true,
  attachmentScopeId = "",
  onAttachmentUploaded,
}, ref) {
  const { T } = useBilingual();
  const placeholder = placeholderProp ?? T("شروع به نوشتن کن…", "Start writing…");
  const { user } = useAuth();
  const attachmentIdentity = useRef(""); attachmentIdentity.current = `${user?.id ?? ""}:${attachmentScopeId}`;
  const onUploadedRef = useRef(onAttachmentUploaded); onUploadedRef.current = onAttachmentUploaded;
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingKind, setPendingKind] = useState<"image" | "audio" | "video" | "file">("file");
  const [aiBusy, setAiBusy] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [toolbarOnScreen, setToolbarOnScreen] = useState(true);

  const editor = useEditor({
    editable: !readOnly,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true } }),
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ inline: false, allowBase64: false }),
      Youtube.configure({ controls: true, nocookie: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      Placeholder.configure({ placeholder }),
    ],
    content: initialHtml || (initialMarkdown ? markdownToHtml(initialMarkdown) : ""),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html, htmlToMarkdown(html));
    },
    editorProps: {
      attributes: {
        class: "prose-note focus:outline-none min-h-[50vh] px-1",
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (readOnly) { event.preventDefault(); return true; }
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files || []);
        if (!files.length) return false;
        event.preventDefault();
        void (async () => { for (const file of files) await insertFile(file); })();
        return true;
      },
      handlePaste: (_view, event) => {
        if (readOnly) { event.preventDefault(); return true; }
        const files = Array.from(event.clipboardData?.files || []);
        if (!files.length) return false;
        event.preventDefault();
        void (async () => { for (const file of files) await insertFile(file); })();
        return true;
      },
    },
  });

  const insertMedia = useCallback((media: Pick<UploadedMedia, "url" | "name" | "kind">) => {
    if (!editor || editor.isDestroyed || readOnly) return;
    if (media.kind === "image") editor.chain().focus().setImage({ src: media.url, alt: media.name, title: media.name }).run();
    else editor.chain().focus().insertContent({ type: "paragraph", content: [
      { type: "text", text: "📎 " },
      { type: "text", text: media.name, marks: [{ type: "link", attrs: { href: media.url, target: "_blank", rel: "noopener noreferrer" } }] },
    ] }).run();
  }, [editor, readOnly]);

  useImperativeHandle(ref, () => ({
    getHtml: () => editor?.getHTML() ?? "",
    getMarkdown: () => editor ? htmlToMarkdown(editor.getHTML()) : "",
    insertText: (text: string) => {
      if (!editor || readOnly || !text.trim()) return;
      editor.chain().focus().insertContent({ type: "text", text: text.trim() + " " }).run();
    },
    insertAttachment: (media: Pick<UploadedMedia, "url" | "name" | "kind">) => { if (editor && !readOnly) insertMedia(media); },
  }), [editor, readOnly, insertMedia]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const next = initialHtml || (initialMarkdown ? markdownToHtml(initialMarkdown) : "");
    if (next && editor.isEmpty) {
      try {
        editor.commands.setContent(next, { emitUpdate: false });
      } catch {
        /* editor view not ready yet — content already supplied via `content` option */
      }
    }
  }, [editor, initialHtml, initialMarkdown]);

  useEffect(() => {
    if (editor && !editor.isDestroyed && controlledHtml !== undefined && editor.getHTML() !== controlledHtml) editor.commands.setContent(controlledHtml, { emitUpdate: false });
  }, [editor, controlledHtml]);
  useEffect(() => { editor?.setEditable(!readOnly); }, [editor, readOnly]);

  // Detect when toolbar scrolls out of view → show floating "show toolbar" FAB
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => setToolbarOnScreen(entry.isIntersecting),
      { rootMargin: "-1px 0px 0px 0px", threshold: 0 }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, []);

  const scrollToToolbar = () => {
    toolbarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const insertFile = async (file: File) => {
    if (!user || !editor || readOnly) return toast.error(T("ابتدا وارد حساب شوید", "Sign in first"));
    const target = attachmentIdentity.current;
    let position = editor.state.selection.from;
    const mapPosition = ({ transaction }: { transaction: import("@tiptap/pm/state").Transaction }) => { position = transaction.mapping.map(position, 1); };
    editor.on("transaction", mapPosition);
    const tid = toast.loading(T(`در حال بارگذاری ${file.name}…`, `Uploading ${file.name}…`));
    try {
      const media = await uploadMediaFull(file, user.id);
      if (editor.isDestroyed || attachmentIdentity.current !== target) { toast.dismiss(tid); return; }
      editor.chain().focus().setTextSelection(Math.min(position, editor.state.doc.content.size)).run();
      insertMedia(media); onUploadedRef.current?.(media);
      toast.success(T("در متن اضافه شد", "Added to the text"), { id: tid });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : T("بارگذاری ناموفق بود", "Upload failed"), { id: tid });
    } finally { editor.off("transaction", mapPosition); if (fileRef.current) fileRef.current.value = ""; }
  };

  const onPickFile = (kind: "image" | "audio" | "video" | "file") => {
    setPendingKind(kind);
    if (!fileRef.current) return;
    const accept = kind === "image" ? "image/*" : kind === "audio" ? "audio/*" : kind === "video" ? "video/*" : "*/*";
    fileRef.current.accept = accept;
    fileRef.current.value = "";
    fileRef.current.click();
  };

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkSelection, setLinkSelection] = useState("");
  const addLink = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    setLinkSelection(editor.state.doc.textBetween(from, to, " "));
    setLinkOpen(true);
  };
  const submitLink = (url: string, text: string) => {
    if (!editor || editor.isDestroyed) return;
    if (editor.state.selection.empty) {
      editor.chain().focus().insertContent({ type: "text", text: text || url, marks: [{ type: "link", attrs: { href: url } }] }).run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const runAI = async (action: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, "\n");
    if (!selected.trim()) return toast.error(T("اول متنی را انتخاب کن", "Select some text first"));
    setAiBusy(true);
    try {
      const r = await callAI("inline_edit", selected, undefined, action, getAILanguage());
      const newText = (r.text || "").trim();
      if (!newText) throw new Error(T("نتیجه خالی بود", "Empty result"));
      editor.chain().focus().deleteRange({ from, to }).insertContent(markdownToHtml(newText)).run();
      toast.success(T("اعمال شد", "Applied"));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAiBusy(false);
    }
  };

  if (!editor) return <div className="min-h-[50vh] animate-pulse bg-muted/30 rounded" />;

  return (
    <div
      className="bg-background overflow-hidden relative w-full rich-editor-surface"
      data-rich-selection
      onContextMenu={(e) => e.preventDefault()}
      style={{ WebkitTouchCallout: "none" } as any}
    >
      <input
        ref={fileRef} type="file" className="hidden" aria-label={T("انتخاب پیوست برای درج در متن", "Choose an attachment to insert in the text")}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) insertFile(f);
        }}
      />

      <div ref={sentinelRef} aria-hidden className="h-px" />

      {!readOnly && <div ref={toolbarRef} data-testid="rich-editor-toolbar" role="toolbar" aria-label={T("قالب‌بندی متن", "Text formatting")} className="flex items-center gap-0.5 border-b p-1 sticky top-0 bg-background z-10 overflow-x-auto">
        <Button size="sm" variant="ghost" className="h-8 px-2 shrink-0" aria-label="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 className="w-4 h-4" /></Button>
        <Button size="sm" variant="ghost" className="h-8 px-2 shrink-0" aria-label="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 className="w-4 h-4" /></Button>
        {([ ["bold", Bold], ["italic", Italic], ["underline", UnderlineIcon] ] as const).map(([mark, Icon]) => <Toggle key={mark} size="sm" className="shrink-0 h-8 w-8 px-0" data-mark={mark} aria-label={mark === "bold" ? T("پررنگ", "Bold") : mark === "italic" ? T("مورب", "Italic") : mark === "underline" ? T("زیرخط", "Underline") : T("هایلایت", "Highlight")} pressed={editor.isActive(mark)} onPressedChange={() => editor.chain().focus().toggleMark(mark).run()}><Icon className="w-4 h-4" /></Toggle>)}
        <DropdownMenu><DropdownMenuTrigger asChild><Button size="sm" variant="ghost" className="h-8 px-2 shrink-0" aria-label={T("قالب‌بندی بیشتر", "More formatting")} data-testid="editor-more-tools"><Wrench className="w-4 h-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[60dvh] overflow-y-auto">
            {[1, 2, 3].map(level => <DropdownMenuItem key={level} onClick={() => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()}>{T("عنوان", "Heading")} {level}</DropdownMenuItem>)}
            <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>{T("متن معمولی", "Paragraph")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleStrike().run()}>{T("خط‌خورده", "Strikethrough")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHighlight().run()}>{T("هایلایت", "Highlight")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleBulletList().run()}>{T("فهرست", "Bullet list")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleOrderedList().run()}>{T("فهرست شماره‌دار", "Numbered list")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleTaskList().run()}>{T("چک‌لیست", "Checklist")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleBlockquote().run()}>{T("نقل‌قول", "Quote")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleCodeBlock().run()}>{T("بلوک کد", "Code block")}</DropdownMenuItem>
            {(["right", "center", "left"] as const).map(align => <DropdownMenuItem key={align} onClick={() => editor.chain().focus().setTextAlign(align).run()}>{align === "right" ? T("راست‌چین", "Align right") : align === "left" ? T("چپ‌چین", "Align left") : T("وسط‌چین", "Align center")}</DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu><DropdownMenuTrigger asChild><Button size="sm" variant="ghost" className="h-8 px-2 shrink-0" aria-label={T("درج پیوست", "Insert attachment")}><Paperclip className="w-4 h-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(["image", "audio", "video", "file"] as const).map(kind => <DropdownMenuItem key={kind} onClick={() => onPickFile(kind)}>{kind === "image" ? T("تصویر", "Image") : kind === "audio" ? T("صدا", "Audio") : kind === "video" ? T("ویدیو", "Video") : T("فایل", "File")}</DropdownMenuItem>)}
            <DropdownMenuItem onClick={addLink}>{T("لینک", "Link")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setHorizontalRule().run()}>{T("خط افقی", "Divider")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {showVoiceButton && <VoiceInputButton continuous onTranscript={text => editor.chain().focus().insertContent(text + " ").run()} size="sm" className="h-8 px-2 shrink-0" />}
      </div>}

      {!readOnly && <BubbleMenu editor={editor} updateDelay={100}>
        <div role="toolbar" aria-label={T("قالب‌بندی انتخاب", "Selection formatting")} className="flex items-center gap-0.5 rounded-md border bg-popover p-1 shadow-md" onMouseDown={event => event.preventDefault()}>
          {([ ["bold", Bold], ["italic", Italic], ["underline", UnderlineIcon], ["highlight", Highlighter] ] as const).map(([mark, Icon]) => <Toggle key={mark} size="sm" className="h-8 w-8 px-0" data-mark={mark} aria-label={mark === "bold" ? T("پررنگ", "Bold") : mark === "italic" ? T("مورب", "Italic") : mark === "underline" ? T("زیرخط", "Underline") : T("هایلایت", "Highlight")} pressed={editor.isActive(mark)} onPressedChange={() => editor.chain().focus().toggleMark(mark).run()}><Icon className="w-4 h-4" /></Toggle>)}
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={T("لینک", "Link")} onClick={addLink}><LinkIcon className="w-4 h-4" /></Button>
          <DropdownMenu><DropdownMenuTrigger asChild><Button size="sm" variant="ghost" className="h-8 px-2" disabled={aiBusy} aria-label="AI">{aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">{AI_ACTIONS.map(action => <DropdownMenuItem key={action.key} onClick={() => runAI(action.key)}>{action.label}</DropdownMenuItem>)}</DropdownMenuContent>
          </DropdownMenu>
        </div>
      </BubbleMenu>}

      <div className="px-1 py-2">
        <EditorContent editor={editor} />
      </div>
      <LinkDialog open={linkOpen} onOpenChange={setLinkOpen} initialText={linkSelection} askText={!linkSelection} onSubmit={submitLink} />

      {/* Floating "show toolbar" FAB when toolbar is scrolled out */}
      {!readOnly && !toolbarOnScreen && (
        <button
          type="button"
          onClick={scrollToToolbar}
          className="fixed bottom-20 start-4 z-40 h-11 w-11 rounded-full shadow-elegant bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition"
          title={T("نمایش نوار ابزار", "Show toolbar")}
          aria-label={T("نمایش نوار ابزار", "Show toolbar")}
        >
          <Wrench className="w-5 h-5" />
        </button>
      )}
    </div>
  );
});
