import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Upload,
  FileCode,
  Eye,
  Folder,
  Tag,
  Link as LinkIcon,
} from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface KnowledgeDocumentEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: KnowledgeDocument | null;
  initialFolderId: string | null;
  folders: KnowledgeFolder[];
  onSave: (data: {
    folder_id: string | null;
    title: string;
    content_html: string;
    tags: string[];
    source_url?: string;
  }) => Promise<void>;
}

export const KnowledgeDocumentEditorModal: React.FC<KnowledgeDocumentEditorModalProps> = ({
  open,
  onOpenChange,
  document,
  initialFolderId,
  folders,
  onSave,
}) => {
  const { isEn } = useBilingual();
  const [title, setTitle] = useState("");
  const [folderId, setFolderId] = useState<string | null>(initialFolderId);
  const [contentHtml, setContentHtml] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (document) {
      setTitle(document.title || "");
      setFolderId(document.folder_id || null);
      setContentHtml(document.content_html || "");
      setTagsInput(document.tags ? document.tags.join(", ") : "");
      setSourceUrl(document.source_url || "");
    } else {
      setTitle("");
      setFolderId(initialFolderId);
      setContentHtml("");
      setTagsInput("");
      setSourceUrl("");
    }
    setActiveTab("edit");
  }, [document, initialFolderId, open]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!title) {
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setTitle(fileNameWithoutExt);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setContentHtml(result);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !contentHtml.trim()) return;

    try {
      setIsSaving(true);
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await onSave({
        folder_id: folderId,
        title: title.trim() || (isEn ? "Untitled Document" : "سند بدون عنوان"),
        content_html: contentHtml,
        tags,
        source_url: sourceUrl.trim(),
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-slate-950 border border-slate-800 text-slate-100 rounded-2xl">
        <DialogHeader className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span>
              {document
                ? isEn
                  ? "Edit Document"
                  : "ویرایش سند"
                : isEn
                ? "New HTML Document"
                : "افزودن سند HTML جدید"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Metadata Inputs */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-900/30 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Title Input */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {isEn ? "Document Title" : "عنوان سند"}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isEn ? "e.g. Fluoxetine protocol" : "مثلاً راهنمای داروی فلوکستین..."}
                  className="w-full py-1.5 px-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Folder Selector */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {isEn ? "Target Folder" : "فولدر مقصد"}
                </label>
                <select
                  value={folderId || ""}
                  onChange={(e) => setFolderId(e.target.value ? e.target.value : null)}
                  className="w-full py-1.5 px-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">{isEn ? "(Root / No Folder)" : "(بدون فولدر / ریشه)"}</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags and Source Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {isEn ? "Tags (comma-separated)" : "برچسب‌ها (با کاما جدا کنید)"}
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="SSRI, Depression, Protocol"
                  className="w-full py-1.5 px-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {isEn ? "Source URL (optional)" : "آدرس اینترنتی یا منبع (اختیاری)"}
                </label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full py-1.5 px-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Quick Upload Button */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium text-xs border border-emerald-500/30 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5" />
                <span>{isEn ? "Upload HTML file (.html, .htm)" : "بارگذاری فایل HTML (.html)"}</span>
                <input
                  type="file"
                  accept=".html,.htm,text/html"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Tabs: Edit / Preview */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("edit")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
                    activeTab === "edit"
                      ? "bg-emerald-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{isEn ? "Editor" : "کد و متن"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
                    activeTab === "preview"
                      ? "bg-purple-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isEn ? "Preview" : "پیش‌نمایش"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-h-[300px] overflow-y-auto p-4 bg-slate-950">
            {activeTab === "edit" ? (
              <textarea
                value={contentHtml}
                onChange={(e) => setContentHtml(e.target.value)}
                placeholder={
                  isEn
                    ? "Paste HTML code or plain text here...\nExample:\n<h1>Overview</h1>\n<p>Clinical details...</p>"
                    : "کد HTML یا متن صفحه را اینجا وارد کنید یا فایل HTML خود را بارگذاری نمایید...\nمثال:\n<h1>عنوان داروی ضد افسردگی</h1>\n<p>توضیحات و دوز مصرف...</p>"
                }
                className="w-full h-full min-h-[280px] p-3 font-mono text-xs bg-slate-900/90 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 leading-relaxed resize-none"
              />
            ) : (
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 min-h-[280px]">
                <div
                  className="knowledge-html-content text-slate-200"
                  dangerouslySetInnerHTML={{
                    __html:
                      contentHtml ||
                      `<p class="text-slate-500 italic">${
                        isEn ? "No content to preview" : "محتوایی برای پیش‌نمایش وجود ندارد"
                      }</p>`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              {isEn ? "Cancel" : "انصراف"}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? (isEn ? "Saving..." : "در حال ذخیره...") : (isEn ? "Save Document" : "ذخیره سند")}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
