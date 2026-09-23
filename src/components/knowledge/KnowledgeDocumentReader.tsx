import React, { useState, useRef } from "react";
import {
  BookOpen,
  Globe,
  Edit,
  Trash2,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Folder,
  Tag,
  Clock,
  Sparkles,
} from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import type { KnowledgeDocument, KnowledgeFolder, DocumentViewMode } from "@/lib/knowledgeTypes";
import { TextSelectionFloatingBar } from "./TextSelectionFloatingBar";

interface KnowledgeDocumentReaderProps {
  document: KnowledgeDocument | null;
  folder: KnowledgeFolder | null;
  onEdit: (doc: KnowledgeDocument) => void;
  onDelete: (docId: string) => void;
  onAddToNote?: (text: string) => void;
  onAddToTask?: (text: string) => void;
  onAiAction?: (text: string) => void;
}

export const KnowledgeDocumentReader: React.FC<KnowledgeDocumentReaderProps> = ({
  document,
  folder,
  onEdit,
  onDelete,
  onAddToNote,
  onAddToTask,
  onAiAction,
}) => {
  const { isEn } = useBilingual();
  const [viewMode, setViewMode] = useState<DocumentViewMode>("reader");
  const [fontSize, setFontSize] = useState<number>(15);
  const [isCopied, setIsCopied] = useState(false);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  const handleCopyAll = () => {
    if (!document) return;
    const textToCopy = document.plain_text || document.title;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleOpenExternal = () => {
    if (!document) return;
    const blob = new Blob([document.content_html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  if (!document) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-card/60 border border-border rounded-3xl">
        <BookOpen className="w-16 h-16 text-muted-foreground/40 mb-4 stroke-1" />
        <h3 className="text-base font-bold text-foreground mb-1">
          {isEn ? "Select or Add a Document" : "یک سند را انتخاب یا اضافه کنید"}
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
          {isEn
            ? "Choose a document from the folder hierarchy or add a new HTML page to start reading."
            : "سندی را از درخت فولدرها انتخاب کنید یا صفحهٔ HTML جدیدی بیفزایید تا متن آن در سبک بومی برنامه نمایش داده شود."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-card border border-border rounded-3xl overflow-hidden shadow-sm relative">
      {/* Top Toolbar */}
      <div className="p-3.5 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          {folder && (
            <div className="flex items-center gap-1 text-[11px] text-primary font-semibold shrink-0">
              <Folder className="w-3.5 h-3.5" />
              <span>{folder.name}</span>
              <span className="text-muted-foreground/60">/</span>
            </div>
          )}
          <h2 className="text-sm font-bold text-foreground truncate">{document.title}</h2>
        </div>

        {/* View Mode & Actions Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-muted/60 border border-border text-xs">
            <button
              type="button"
              onClick={() => setViewMode("reader")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                viewMode === "reader"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span>{isEn ? "Reader" : "مطالعه بومی"}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("original")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                viewMode === "original"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-sky-500" />
              <span>{isEn ? "Original HTML" : "کد HTML"}</span>
            </button>
          </div>

          {/* Font Resizer (Reader Mode only) */}
          {viewMode === "reader" && (
            <div className="hidden sm:flex items-center rounded-xl bg-muted/50 border border-border p-0.5">
              <button
                type="button"
                onClick={() => setFontSize((s) => Math.max(12, s - 1))}
                className="p-1 text-muted-foreground hover:text-foreground rounded transition cursor-pointer"
                title={isEn ? "Smaller text" : "کوچک‌تر"}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-muted-foreground px-1 font-mono">{fontSize}</span>
              <button
                type="button"
                onClick={() => setFontSize((s) => Math.min(24, s + 1))}
                className="p-1 text-muted-foreground hover:text-foreground rounded transition cursor-pointer"
                title={isEn ? "Larger text" : "بزرگ‌تر"}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Copy Full Text */}
          <button
            type="button"
            onClick={handleCopyAll}
            className="p-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition cursor-pointer border border-border"
            title={isEn ? "Copy full content" : "کپی کل متن"}
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Open in external tab */}
          <button
            type="button"
            onClick={handleOpenExternal}
            className="p-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition cursor-pointer border border-border"
            title={isEn ? "Open in browser window" : "باز کردن در تب مرورگر"}
          >
            <Globe className="w-3.5 h-3.5" />
          </button>

          {/* Edit Document */}
          <button
            type="button"
            onClick={() => onEdit(document)}
            className="p-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition cursor-pointer border border-border"
            title={isEn ? "Edit Document" : "ویرایش سند"}
          >
            <Edit className="w-3.5 h-3.5 text-primary" />
          </button>

          {/* Delete Document */}
          <button
            type="button"
            onClick={() => onDelete(document.id)}
            className="p-1.5 rounded-xl bg-secondary hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition cursor-pointer border border-border"
            title={isEn ? "Delete Document" : "حذف سند"}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tags and Meta Row */}
      {document.tags && document.tags.length > 0 && (
        <div className="px-4 py-2 border-b border-border/60 bg-muted/15 flex items-center gap-1.5 flex-wrap">
          <Tag className="w-3 h-3 text-muted-foreground" />
          {document.tags.map((tag, i) => (
            <span
              key={i}
              className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Reader Content Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8" ref={contentContainerRef}>
        {viewMode === "reader" ? (
          <div
            style={{ fontSize: `${fontSize}px` }}
            className="knowledge-reader-prose max-w-4xl mx-auto leading-relaxed space-y-4 select-text"
          >
            {/* Header banner in reader mode */}
            <div className="border-b border-border pb-4 mb-6">
              <h1 className="text-xl md:text-2xl font-black text-foreground mb-2 tracking-tight">
                {document.title}
              </h1>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {new Date(document.updated_at || document.created_at).toLocaleDateString(
                      isEn ? "en-US" : "fa-IR"
                    )}
                  </span>
                </div>
                {document.source_url && (
                  <a
                    href={document.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <Globe className="w-3 h-3" />
                    <span>{isEn ? "Source Reference" : "منبع سند"}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Sanitized/Formatted HTML content rendered with native reader styling */}
            <div
              className="knowledge-html-content"
              dangerouslySetInnerHTML={{ __html: document.content_html }}
            />
          </div>
        ) : (
          /* Original HTML in sandboxed iframe */
          <div className="w-full h-full min-h-[500px] rounded-2xl overflow-hidden border border-border bg-background shadow-xs">
            <iframe
              srcDoc={document.content_html}
              title={document.title}
              sandbox="allow-same-origin allow-popups allow-forms"
              className="w-full h-full min-h-[500px] border-0"
            />
          </div>
        )}
      </div>

      {/* Text Selection Floating Bar (active in Reader mode) */}
      {viewMode === "reader" && (
        <TextSelectionFloatingBar
          containerRef={contentContainerRef}
          onAddToNote={onAddToNote}
          onAddToTask={onAddToTask}
          onAiAction={onAiAction}
        />
      )}
    </div>
  );
};
