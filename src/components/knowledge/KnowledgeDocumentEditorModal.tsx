import React, { useState, useEffect } from "react";
import {
  Save,
  Upload,
  FileCode,
  Eye,
  Folder,
  Tag,
  Sparkles,
  Loader2,
  Wand2,
} from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { smartAiBeautifyDocument } from "@/lib/knowledgeBeautifier";
import { toast } from "sonner";

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
  const [isBeautifying, setIsBeautifying] = useState(false);

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
        toast.info(isEn ? "File loaded into editor" : "محتوای فایل در ویرایشگر قرار گرفت");
      }
    };
    reader.readAsText(file);
  };

  const handleBeautify = async () => {
    if (!contentHtml.trim()) {
      toast.error(isEn ? "Please enter content to format" : "لطفاً ابتدا متنی در کادر وارد کنید");
      return;
    }

    setIsBeautifying(true);
    try {
      const formatted = await smartAiBeautifyDocument(title || "Document", contentHtml);
      setContentHtml(formatted);
      setActiveTab("preview");
      toast.success(
        isEn
          ? "Document structured & beautified into native format!"
          : "سند با قالب‌های تعاملی، کادرها و جداول بومی برنامه زیباسازی شد!"
      );
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Error structuring document" : "خطا در قالب‌بندی هوشمند"));
    } finally {
      setIsBeautifying(false);
    }
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
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-card border border-border text-card-foreground rounded-3xl shadow-2xl">
        <DialogHeader className="p-4 border-b border-border bg-muted/30 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
            <FileCode className="w-4 h-4 text-primary" />
            <span>
              {document
                ? isEn
                  ? "Edit Document"
                  : "ویرایش سند آموزشی"
                : isEn
                ? "New HTML Document"
                : "افزودن سند جدید به پایگاه دانش"}
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">Document Editor Dialog</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Metadata Inputs */}
          <div className="p-4 border-b border-border bg-card/60 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Title Input */}
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  {isEn ? "Document Title" : "عنوان سند"}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isEn ? "e.g. Fluoxetine protocol" : "مثلاً راهنمای داروی فلوکستین..."}
                  className="w-full py-1.5 px-3 bg-background border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Folder Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  {isEn ? "Target Folder" : "فولدر مقصد"}
                </label>
                <select
                  value={folderId || ""}
                  onChange={(e) => setFolderId(e.target.value ? e.target.value : null)}
                  className="w-full py-1.5 px-3 bg-background border border-input rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  {isEn ? "Tags (comma-separated)" : "برچسب‌ها (با کاما جدا کنید)"}
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="SSRI, Depression, Protocol"
                  className="w-full py-1.5 px-3 bg-background border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  {isEn ? "Source URL (optional)" : "آدرس اینترنتی یا منبع (اختیاری)"}
                </label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full py-1.5 px-3 bg-background border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Toolbar Buttons: Upload, AI Beautifier, Edit/Preview Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5 text-primary" />
                  <span>{isEn ? "Upload HTML file" : "بارگذاری فایل HTML"}</span>
                  <input
                    type="file"
                    accept=".html,.htm,text/html"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleBeautify}
                  disabled={isBeautifying}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs border border-primary/25 cursor-pointer transition shadow-xs disabled:opacity-50"
                  title={isEn ? "Transform and structure content" : "قالب‌بندی هوشمند، کادرهای بالینی و جداول تعاملی"}
                >
                  {isBeautifying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isBeautifying ? (isEn ? "Structuring..." : "در حال زیباسازی...") : (isEn ? "Smart Beautify (AI)" : "زیباسازی هوشمند")}</span>
                </button>
              </div>

              {/* Tabs: Edit / Preview */}
              <div className="flex items-center p-0.5 rounded-xl bg-muted/60 border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("edit")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    activeTab === "edit"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{isEn ? "Editor" : "کد و متن"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    activeTab === "preview"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isEn ? "Preview" : "پیش‌نمایش"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-h-[300px] overflow-y-auto p-4 bg-muted/15">
            {activeTab === "edit" ? (
              <textarea
                value={contentHtml}
                onChange={(e) => setContentHtml(e.target.value)}
                placeholder={
                  isEn
                    ? "Paste HTML code or plain text here...\nTip: Click 'Smart Beautify (AI)' to automatically convert it into structured cards, pearls, and tables!"
                    : "کد HTML یا متن صفحه را اینجا وارد کنید یا فایل HTML خود را بارگذاری نمایید...\nراهنما: دکمه «زیباسازی هوشمند» به طور خودکار متن را به کادرهای بالینی، جدول و آکاردئون‌های تعاملی تبدیل می‌کند!"
                }
                className="w-full h-full min-h-[280px] p-3 font-mono text-xs bg-background border border-input rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-none shadow-xs"
              />
            ) : (
              <div className="p-5 bg-card rounded-2xl border border-border min-h-[280px] shadow-sm">
                <div
                  className="knowledge-html-content"
                  dangerouslySetInnerHTML={{
                    __html:
                      contentHtml ||
                      `<p class="text-muted-foreground italic text-center py-8">${
                        isEn ? "No content to preview" : "محتوایی برای پیش‌نمایش وجود ندارد"
                      }</p>`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3.5 border-t border-border bg-card flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            >
              {isEn ? "Cancel" : "انصراف"}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
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
