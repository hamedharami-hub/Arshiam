import React, { useState, useRef, useMemo } from "react";
import {
  BookOpen,
  Globe,
  ExternalLink,
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
  Share2,
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
        <BookOpen className="w-16 h-16 text-slate-700 mb-4 stroke-1" />
        <h3 className="text-base font-bold text-slate-300 mb-1">
          {isEn ? "Select or Add a Document" : "یک سند را انتخاب یا اضافه کنید"}
        </h3>
        <p className="text-xs text-slate-500 max-w-sm">
          {isEn
            ? "Choose a document from the folder hierarchy or add a new HTML page to start reading."
            : "سندی را از درخت فولدرها انتخاب کنید یا صفحهٔ HTML جدیدی بیفزایید تا متن آن در سبک بومی برنامه نمایش داده شود."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/80 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md relative">
      {/* Top Toolbar */}
      <div className="p-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 bg-slate-900/60">
        <div className="flex items-center gap-2 min-w-0">
          {folder && (
            <div className="flex items-center gap-1 text-[11px] text-emerald-400/90 font-medium shrink-0">
              <Folder className="w-3.5 h-3.5" />
              <span>{folder.name}</span>
              <span className="text-slate-600">/</span>
            </div>
          )}
          <h2 className="text-sm font-bold text-slate-100 truncate">{document.title}</h2>
        </div>

        {/* View Mode & Actions Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("reader")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                viewMode === "reader"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isEn ? "Reader" : "مطالعه بومی"}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("original")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                viewMode === "original"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isEn ? "Original HTML" : "سند اصلی"}</span>
            </button>
          </div>

          {/* Font Resizer (Reader Mode only) */}
          {viewMode === "reader" && (
            <div className="hidden sm:flex items-center rounded-xl bg-slate-800/60 border border-slate-700/60 p-0.5">
              <button
                type="button"
                onClick={() => setFontSize((s) => Math.max(12, s - 1))}
                className="p-1 text-slate-400 hover:text-white rounded"
                title={isEn ? "Smaller text" : "کوچک‌تر"}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-slate-400 px-1 font-mono">{fontSize}</span>
              <button
                type="button"
                onClick={() => setFontSize((s) => Math.min(24, s + 1))}
                className="p-1 text-slate-400 hover:text-white rounded"
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
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title={isEn ? "Copy full content" : "کپی کل متن"}
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Open in external tab */}
          <button
            type="button"
            onClick={handleOpenExternal}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title={isEn ? "Open in new window" : "باز کردن در پنجره جدید"}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Edit */}
          <button
            type="button"
            onClick={() => onEdit(document)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
            title={isEn ? "Edit Document" : "ویرایش سند"}
          >
            <Edit className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => onDelete(document.id)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-rose-400 hover:text-rose-300 transition cursor-pointer"
            title={isEn ? "Delete Document" : "حذف سند"}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tags and Meta Row */}
      {document.tags && document.tags.length > 0 && (
        <div className="px-4 py-1.5 border-b border-slate-800/50 bg-slate-900/30 flex items-center gap-1.5 flex-wrap">
          <Tag className="w-3 h-3 text-slate-500" />
          {document.tags.map((tag, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20"
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
            className="knowledge-reader-prose max-w-4xl mx-auto text-slate-200 leading-relaxed space-y-4 select-text"
          >
            {/* Header banner in reader mode */}
            <div className="border-b border-slate-800 pb-4 mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-white mb-2 tracking-tight">
                {document.title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {new Date(document.updated_at || document.created_at).toLocaleDateString(
                    isEn ? "en-US" : "fa-IR"
                  )}
                </span>
                {document.source_url && (
                  <a
                    href={document.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Globe className="w-3 h-3" />
                    <span>{isEn ? "Source Link" : "منبع سند"}</span>
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
          <div className="w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-slate-800 bg-white">
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
