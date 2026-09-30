import { useBilingual } from "@/hooks/useBilingual";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
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
import { uploadMedia, detectMediaKind } from "@/lib/uploadMedia";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { callAI, getAILanguage } from "@/lib/ai";
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdown";
import { VoiceInputButton } from "@/components/VoiceInputButton";

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
};

export const RichEditor = forwardRef<RichEditorHandle, {
  initialHtml?: string;
  initialMarkdown?: string;
  onChange?: (html: string, markdown: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  showVoiceButton?: boolean;
}>(function RichEditor({
  initialHtml = "",
  initialMarkdown = "",
  onChange,
  placeholder = "شروع به نوشتن کنید...",
  readOnly = false,
  showVoiceButton = true,
}, ref) {
  const { T } = useBilingual();
  const { user } = useAuth();
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
        files.forEach((f) => insertFile(f));
        return true;
      },
      handlePaste: (_view, event) => {
        if (readOnly) { event.preventDefault(); return true; }
        const files = Array.from(event.clipboardData?.files || []);
        if (!files.length) return false;
        event.preventDefault();
        files.forEach((f) => insertFile(f));
        return true;
      },
    },
  });

  useImperativeHandle(ref, () => ({
    getHtml: () => editor?.getHTML() ?? "",
    getMarkdown: () => editor ? htmlToMarkdown(editor.getHTML()) : "",
    insertText: (text: string) => {
      if (!editor || readOnly || !text.trim()) return;
      editor.chain().focus().insertContent(text.trim() + " ").run();
    },
  }), [editor, readOnly]);

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
    if (!user) return toast.error("ابتدا وارد شوید");
    const kind = detectMediaKind(file);
    const tid = toast.loading(`در حال آپلود ${file.name}...`);
    try {
      const url = await uploadMedia(file, user.id);
      if (!editor) return;
      if (kind === "image") {
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      } else if (kind === "video") {
        editor.chain().focus().insertContent(
          `<p><a href="${url}" target="_blank" rel="noopener">video</a></p><p></p>`
        ).run();
      } else if (kind === "audio") {
        editor.chain().focus().insertContent(
          `<p><a href="${url}" target="_blank" rel="noopener">audio</a></p><p></p>`
        ).run();
      } else {
        editor.chain().focus().insertContent(
          `<p>📎 <a href="${url}" target="_blank" rel="noopener">${file.name}</a></p>`
        ).run();
      }
      toast.success("اضافه شد", { id: tid });
    } catch (e: any) {
      toast.error(e.message || "آپلود ناموفق", { id: tid });
    }
  };

  const onPickFile = (kind: "image" | "audio" | "video" | "file") => {
    setPendingKind(kind);
    if (!fileRef.current) return;
    const accept = kind === "image" ? "image/*" : kind === "audio" ? "audio/*" : kind === "video" ? "video/*" : "*/*";
    fileRef.current.accept = accept;
    fileRef.current.value = "";
    fileRef.current.click();
  };

  const addLink = () => {
    const url = prompt("لینک:");
    if (!url) return;
    editor?.chain().focus().setLink({ href: url }).run();
  };

  const runAI = async (action: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, "\n");
    if (!selected.trim()) return toast.error("ابتدا متن را انتخاب کنید");
    setAiBusy(true);
    try {
      const r = await callAI("inline_edit", selected, undefined, action, getAILanguage());
      const newText = (r.text || "").trim();
      if (!newText) throw new Error("نتیجه خالی");
      editor.chain().focus().deleteRange({ from, to }).insertContent(markdownToHtml(newText)).run();
      toast.success("اعمال شد ✨");
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
        ref={fileRef} type="file" className="hidden"
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

      {/* Floating "show toolbar" FAB when toolbar is scrolled out */}
      {!readOnly && !toolbarOnScreen && (
        <button
          type="button"
          onClick={scrollToToolbar}
          className="fixed bottom-20 left-4 z-40 h-11 w-11 rounded-full shadow-elegant bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition"
          title="نمایش نوار ابزار"
          aria-label="نمایش نوار ابزار"
        >
          <Wrench className="w-5 h-5" />
        </button>
      )}
    </div>
  );
});
