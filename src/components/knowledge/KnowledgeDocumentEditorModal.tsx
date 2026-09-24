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
  Languages,
  Gamepad2,
} from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { smartAiBeautifyDocument, sanitizeKnowledgeHtml } from "@/lib/knowledgeBeautifier";
import { generateBilingualLesson } from "@/lib/bilingualHelper";
import { InteractiveLearningModal } from "./InteractiveLearningModal";
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
    title_en?: string;
    content_html: string;
    content_en?: string;
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
  const [titleEn, setTitleEn] = useState("");
  const [folderId, setFolderId] = useState<string | null>(initialFolderId);
  const [contentHtml, setContentHtml] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [langTab, setLangTab] = useState<"fa" | "en">("fa");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [isSaving, setIsSaving] = useState(false);
  const [isBeautifying, setIsBeautifying] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [interactiveModalOpen, setInteractiveModalOpen] = useState(false);

  const handleInsertInteractive = (html: string, mode: "append" | "replace") => {
    if (langTab === "fa") {
      setContentHtml((prev) =>
        mode === "append" ? `${prev}\n<hr class="my-6 border-border/60" />\n${html}` : html
      );
    } else {
      setContentEn((prev) =>
        mode === "append" ? `${prev}\n<hr class="my-6 border-border/60" />\n${html}` : html
      );
    }
    setActiveTab("preview");
  };

  useEffect(() => {
    if (document) {
      setTitle(document.title || "");
      setTitleEn(document.title_en || "");
      setFolderId(document.folder_id || null);
      setContentHtml(document.content_html || "");
      setContentEn(document.content_en || "");
      setTagsInput(document.tags ? document.tags.join(", ") : "");
      setSourceUrl(document.source_url || "");
    } else {
      setTitle("");
      setTitleEn("");
      setFolderId(initialFolderId);
      setContentHtml("");
      setContentEn("");
      setTagsInput("");
      setSourceUrl("");
    }
    setLangTab("fa");
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
        if (langTab === "fa") {
          setContentHtml(result);
        } else {
          setContentEn(result);
        }
        toast.info(isEn ? "File loaded into editor" : "محتوای فایل در ویرایشگر قرار گرفت");
      }
    };
    reader.readAsText(file);
  };

  const handleBeautify = async () => {
    const currentContent = langTab === "fa" ? contentHtml : contentEn;
    const currentTitle = langTab === "fa" ? title : titleEn || title;

    if (!currentContent.trim()) {
      toast.error(isEn ? "Please enter content to format" : "لطفاً ابتدا متنی در کادر وارد کنید");
      return;
    }

    setIsBeautifying(true);
    try {
      const formatted = await smartAiBeautifyDocument(currentTitle || "Document", currentContent);
      if (langTab === "fa") {
        setContentHtml(formatted);
      } else {
        setContentEn(formatted);
      }
      setActiveTab("preview");
      toast.success(
        isEn
          ? "Document structured with native styles!"
          : "قالب‌بندی و کادرهای بومی برنامه با موفقیت اعمال شد!"
      );
    } catch (err) {
      toast.error("Error formatting document");
    } finally {
      setIsBeautifying(false);
    }
  };

  const handleGenerateBilingual = async () => {
    if (!contentHtml.trim() && !contentEn.trim()) {
      toast.error(isEn ? "Please provide lesson content first" : "لطفاً ابتدا متن درس را وارد کنید");
      return;
    }

    setIsTranslating(true);
    try {
      toast.info(isEn ? "Generating English translation..." : "در حال تولید نسخه انگلیسی درس...");
      const res = await generateBilingualLesson({
        title,
        content: contentHtml || contentEn,
        targetLang: langTab === "fa" ? "en" : "fa",
      });

      setTitleEn(res.title_en);
      setContentEn(res.content_en);
      setLangTab("en");
      toast.success(
        isEn
          ? "English version generated! Review in English tab."
          : "نسخه انگلیسی با موفقیت ساخته شد و در تب انگلیسی قرار گرفت."
      );
    } catch (err: any) {
      toast.error(err.message || "Error generating bilingual translation");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(isEn ? "Document title is required" : "عنوان سند الزامی است");
      return;
    }
    if (!contentHtml.trim() && !contentEn.trim()) {
      toast.error(isEn ? "Document content is required" : "متن سند نمی‌تواند خالی باشد");
      return;
    }

    setIsSaving(true);
    try {
      const tags = tagsInput
        .split(/[,،]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      await onSave({
        folder_id: folderId,
        title: title.trim(),
        title_en: titleEn.trim() || undefined,
        content_html: contentHtml.trim() || contentEn.trim(),
        content_en: contentEn.trim() || undefined,
        tags,
        source_url: sourceUrl.trim() || undefined,
      });

      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save document");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 bg-card border border-border text-card-foreground rounded-3xl shadow-2xl overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-card">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>
              {document
                ? isEn
                  ? "Edit Document"
                  : "ویرایش سند"
                : isEn
                ? "New Knowledge Document"
                : "افزودن سند آموزشی جدید"}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEn
              ? "Write or paste lesson content in Persian and English. Native styling and RTL/LTR are automatically applied."
              : "متن درس را به زبان‌های فارسی و انگلیسی وارد یا ترجمه کنید. استایل‌های بومی و جهت راست‌چین/چپ‌چین خودکار اعمال می‌شوند."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="p-4 sm:p-5 space-y-3.5 border-b border-border bg-muted/20 shrink-0">
            {/* Title Inputs: Persian and English */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">
                  <span>{isEn ? "Title (Persian / Primary)" : "عنوان درس (فارسی / اصلی)"}</span>
                  <span className="text-destructive ms-1">*</span>
                </label>
                <input
                  type="text"
                  required
                  dir="rtl"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثلاً راهنمای بالینی فلوکستین..."
                  className="w-full py-1.5 px-3 bg-background border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-right"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">
                  <span>{isEn ? "Title in English (Optional)" : "عنوان انگلیسی (اختیاری)"}</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder="e.g. Fluoxetine Clinical Guide..."
                  className="w-full py-1.5 px-3 bg-background border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-left"
                />
              </div>
            </div>

            {/* Folder, Tags and Source Link */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  {isEn ? "Category / Folder" : "دسته‌بندی و پوشه"}
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

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  {isEn ? "Tags (comma-separated)" : "برچسب‌ها (با کاما)"}
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="SSRI, Depression"
                  className="w-full py-1.5 px-3 bg-background border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  {isEn ? "Source Reference URL" : "آدرس منبع (اختیاری)"}
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

            {/* Language Tab Switcher + Action Tools */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50">
              <div className="flex items-center gap-2">
                {/* Language Tab: Persian vs English */}
                <div className="flex items-center p-0.5 rounded-xl bg-muted/60 border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setLangTab("fa")}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer text-xs ${
                      langTab === "fa"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🇮🇷 محتوای فارسی (RTL)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLangTab("en")}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer text-xs ${
                      langTab === "en"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🇬🇧 English Content (LTR)
                  </button>
                </div>

                {/* AI Bilingual Generator */}
                <button
                  type="button"
                  disabled={isTranslating}
                  onClick={handleGenerateBilingual}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold cursor-pointer transition disabled:opacity-50"
                  title={isEn ? "Generate bilingual version with AI" : "دوزبانه کردن درس با هوش مصنوعی"}
                >
                  {isTranslating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  ) : (
                    <Languages className="w-3.5 h-3.5 text-primary" />
                  )}
                  <span className="hidden sm:inline">
                    {isTranslating ? (isEn ? "Translating..." : "در حال تولید...") : (isEn ? "AI Bilingualize" : "دوزبانه با AI")}
                  </span>
                </button>
              </div>

              {/* Toolbar Buttons: Upload, Beautify, View Mode */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border cursor-pointer transition">
                  <Upload className="w-3 h-3 text-primary" />
                  <span className="hidden sm:inline">{isEn ? "Upload HTML" : "بارگذاری فایل"}</span>
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
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs border border-primary/25 cursor-pointer transition shadow-xs disabled:opacity-50"
                  title={isEn ? "Transform and structure content" : "قالب‌بندی هوشمند و کادرهای بومی"}
                >
                  {isBeautifying ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3" />
                  )}
                  <span>{isEn ? "Smart Beautify" : "زیباسازی"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInteractiveModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border cursor-pointer transition"
                  title={isEn ? "Generate 3D cards, quizzes & games" : "تولید کارت‌های ۳ بعدی، کوییز و بازی‌های یادگیری"}
                >
                  <Gamepad2 className="w-3 h-3 text-primary" />
                  <span className="hidden sm:inline">{isEn ? "Interactive" : "آموزش تعاملی"}</span>
                </button>

                {/* Tabs: Edit / Preview */}
                <div className="flex items-center p-0.5 rounded-xl bg-muted/60 border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab("edit")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition cursor-pointer ${
                      activeTab === "edit"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileCode className="w-3 h-3" />
                    <span>{isEn ? "Code" : "متن"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition cursor-pointer ${
                      activeTab === "preview"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>{isEn ? "Preview" : "پیش‌نمایش"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-h-[300px] overflow-y-auto p-4 bg-muted/15">
            {activeTab === "edit" ? (
              <textarea
                dir={langTab === "fa" ? "rtl" : "ltr"}
                value={langTab === "fa" ? contentHtml : contentEn}
                onChange={(e) =>
                  langTab === "fa"
                    ? setContentHtml(e.target.value)
                    : setContentEn(e.target.value)
                }
                placeholder={
                  langTab === "fa"
                    ? "متن یا کد HTML فارسی درس را اینجا وارد فرمایید...\nبا کلیک روی «زیباسازی»، کادرهای بالینی و جداول استاندارد اضافه می‌شوند."
                    : "Enter English educational text or HTML here...\nClick 'Smart Beautify' or 'AI Bilingualize' to auto-generate."
                }
                className={`w-full h-full min-h-[280px] p-3 font-mono text-xs bg-background border border-input rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-none shadow-xs ${
                  langTab === "fa" ? "text-right" : "text-left"
                }`}
              />
            ) : (
              <div className="p-5 bg-card rounded-2xl border border-border min-h-[280px] shadow-sm">
                <div
                  dir={langTab === "fa" ? "rtl" : "ltr"}
                  className={`knowledge-html-content ${langTab === "fa" ? "dir-rtl text-right" : "dir-ltr text-left"}`}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeKnowledgeHtml(
                      (langTab === "fa" ? contentHtml : contentEn) ||
                      `<p class="text-muted-foreground italic text-center py-8">${
                        isEn ? "No content to preview" : "محتوایی در این بخش برای پیش‌نمایش وجود ندارد"
                      }</p>`
                    ),
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
              <span>
                {isSaving
                  ? isEn
                    ? "Saving..."
                    : "در حال ذخیره..."
                  : isEn
                  ? "Save Document"
                  : "ذخیره سند"}
              </span>
            </button>
          </div>
        </form>
      </DialogContent>

      {/* Interactive Learning Studio Modal */}
      <InteractiveLearningModal
        open={interactiveModalOpen}
        onOpenChange={setInteractiveModalOpen}
        documentTitle={langTab === "fa" ? title : titleEn || title}
        documentContent={langTab === "fa" ? contentHtml : contentEn}
        onInsertContent={handleInsertInteractive}
      />
    </Dialog>
  );
};
