import { lazy, Suspense, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { markdownToHtml } from "@/lib/markdown";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MarkdownMediaLink } from "@/components/MarkdownMediaLink";

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
}: {
  noteId: string;
  markdown: string;
  onChange: (md: string, html: string) => void;
  readOnly?: boolean;
  mode?: "visual" | "markdown" | "preview";
  onModeChange?: (mode: "visual" | "markdown" | "preview") => void;
  hideTabsList?: boolean;
}) {
  const [internalTab, setInternalTab] = useState<"visual" | "markdown" | "preview">("visual");
  const currentTab = mode ?? internalTab;
  const handleTabChange = (val: string) => {
    const next = val as "visual" | "markdown" | "preview";
    if (onModeChange) onModeChange(next);
    else setInternalTab(next);
  };

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
      {!hideTabsList && (
        <TabsList className="h-7 p-0.5 bg-muted/60 border border-border/40">
          <TabsTrigger value="visual" className="h-6 px-2 text-xs">📖 ویژوال</TabsTrigger>
          <TabsTrigger value="markdown" className="h-6 px-2 text-xs">📝 مارک‌داون</TabsTrigger>
          <TabsTrigger value="preview" className="h-6 px-2 text-xs">👁 پیش‌نمایش</TabsTrigger>
        </TabsList>
      )}

      <TabsContent value="visual" className="mt-1">
        <Suspense
          fallback={
            <div className="h-32 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground rounded-lg border border-dashed border-border/60 bg-muted/20">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs">در حال بارگذاری ویرایشگر...</span>
            </div>
          }
        >
          <RichEditor
            key={noteId}
            initialMarkdown={markdown}
            onChange={(html, md) => onChange(md, html)}
            readOnly={readOnly}
          />
        </Suspense>
      </TabsContent>

      <TabsContent value="markdown" className="mt-1 space-y-2">
        <div className="flex items-center justify-end">
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
          value={markdown}
          onChange={(e) => onChange(e.target.value, markdownToHtml(e.target.value))}
          disabled={readOnly}
          className="min-h-[40vh] font-mono text-sm w-full border-0 focus-visible:ring-0 px-0"
          dir="ltr"
        />
        <div>
          <p className="text-xs text-muted-foreground mb-1">پیش‌نمایش زنده:</p>
          <div className="prose-note max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: MarkdownMediaLink }}>
              {markdown || ""}
            </ReactMarkdown>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="preview" className="mt-1">
        <div className="min-h-[50vh]">
          <div className="prose-note max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: MarkdownMediaLink }}>
              {markdown || ""}
            </ReactMarkdown>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
