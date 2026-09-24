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
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import type {
  KnowledgeContentReviewEvidence,
  KnowledgeDocument,
  KnowledgeFolder,
} from "@/lib/knowledgeTypes";
import {
  getKnowledgeReviewState,
  hasCompleteKnowledgeReviewEvidence,
  isPharmacyKnowledgeDocument,
} from "@/lib/knowledgeReviewEvidence";
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
    content_review_status?: KnowledgeDocument["content_review_status"];
    content_review_evidence?: KnowledgeContentReviewEvidence;
  }) => Promise<void>;
}

function getTodayDate(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function createEmptyReviewEvidence(): KnowledgeContentReviewEvidence {
  const today = getTodayDate();
  return {
    reviewer_role: "",
    jurisdiction: "",
    scope: "",
    reviewed_at: today,
    references: [{ title: "", url: "", accessed_at: today }],
  };
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
  const [showMetadata, setShowMetadata] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<KnowledgeDocument["content_review_status"]>("unreviewed");
  const [reviewEvidence, setReviewEvidence] = useState<KnowledgeContentReviewEvidence>(createEmptyReviewEvidence);
  const [reviewTouched, setReviewTouched] = useState(false);
  const currentReviewState = document
    ? getKnowledgeReviewState(
        document,
        isPharmacyKnowledgeDocument(document),
      )
    : "not-required";

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
      setReviewStatus(document.content_review_status || "unreviewed");
      setReviewEvidence(document.content_review_evidence || createEmptyReviewEvidence());
      setReviewTouched(false);
      if (document.folder_id || (document.tags && document.tags.length > 0) || document.source_url) {
        setShowMetadata(true);
      }
    } else {
      setTitle("");
      setTitleEn("");
      setFolderId(initialFolderId);
      setContentHtml("");
      setContentEn("");
      setTagsInput("");
      setSourceUrl("");
      setReviewStatus("unreviewed");
      setReviewEvidence(createEmptyReviewEvidence());
      setReviewTouched(false);
      setShowMetadata(Boolean(initialFolderId));
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

    const normalizedReviewEvidence: KnowledgeContentReviewEvidence = {
      reviewer_role: reviewEvidence.reviewer_role.trim(),
      jurisdiction: reviewEvidence.jurisdiction.trim(),
      scope: reviewEvidence.scope.trim(),
      reviewed_at: reviewEvidence.reviewed_at,
      references: reviewEvidence.references.map((reference) => ({
        title: reference.title.trim(),
        url: reference.url.trim(),
        accessed_at: reference.accessed_at,
      })),
    };
    if (reviewTouched && reviewStatus === "reviewed" &&
      !hasCompleteKnowledgeReviewEvidence(normalizedReviewEvidence)) {
      toast.error(isEn
        ? "To mark reviewed, complete reviewer role, jurisdiction, scope, dates, and at least one HTTPS source."
        : "برای ثبت بازبینی، نقش بازبین، حوزهٔ قضایی، دامنه، تاریخ‌ها و دست‌کم یک منبع HTTPS معتبر را کامل کنید.");
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
        ...(reviewTouched
          ? reviewStatus === "reviewed"
            ? { content_review_status: "reviewed" as const, content_review_evidence: normalizedReviewEvidence }
            : { content_review_status: "unreviewed" as const }
          : {}),
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

            {/* Mobile/Foldable Metadata Collapsible Toggle */}
            <div className="sm:hidden">
              <button
                type="button"
                onClick={() => setShowMetadata((v) => !v)}
                className="w-full flex items-center justify-between py-1.5 px-3 rounded-xl bg-background border border-border text-[11px] font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {isEn
                      ? "Additional Details (Folder, Tags, URL)"
                      : "مشخصات تکمیلی (پوشه، برچسب‌ها، منبع)"}
                  </span>
                  {(folderId || tagsInput || sourceUrl) && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                {showMetadata ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Folder, Tags and Source Link */}
            <div className={`${showMetadata ? "grid" : "hidden sm:grid"} grid-cols-1 sm:grid-cols-3 gap-3`}>
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
          <div className="flex-1 min-h-[180px] sm:min-h-[280px] overflow-y-auto p-3 sm:p-4 bg-muted/15">
            {activeTab === "edit" ? (
              <div className="flex min-h-full flex-col gap-3">
                <details className="rounded-xl border border-border bg-card px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-foreground">
                    {isEn ? "Review status and source evidence" : "وضعیت بازبینی و شواهد منابع"}
                  </summary>
                  <div className="mt-3 space-y-3">
                    {currentReviewState === "missing-evidence" && (
                      <p role="note" className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-foreground">
                        {isEn
                          ? "The existing reviewed label has incomplete evidence. Reader mode will continue to show a caution until this record is completed."
                          : "فرادادهٔ بازبینی فعلی ناقص است؛ تا تکمیل این سابقه، Reader همچنان هشدار نشان می‌دهد."}
                      </p>
                    )}
                    <label className="block space-y-1 text-xs">
                      <span className="font-medium text-foreground">{isEn ? "Review status" : "وضعیت بازبینی"}</span>
                      <select
                        aria-label={isEn ? "Review status" : "وضعیت بازبینی"}
                        value={reviewStatus || "unreviewed"}
                        onChange={(event) => {
                          setReviewTouched(true);
                          setReviewStatus(event.target.value as KnowledgeDocument["content_review_status"]);
                        }}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground"
                      >
                        <option value="unreviewed">{isEn ? "Unreviewed" : "بازبینی‌نشده"}</option>
                        <option value="reviewed">{isEn ? "Reviewed (requires evidence)" : "بازبینی‌شده (نیازمند ثبت شواهد)"}</option>
                      </select>
                    </label>

                    {reviewStatus === "reviewed" ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="block space-y-1 text-xs">
                            <span className="font-medium">{isEn ? "Reviewer role" : "نقش بازبین"}</span>
                            <input
                              aria-label={isEn ? "Reviewer role" : "نقش بازبین"}
                              value={reviewEvidence.reviewer_role}
                              onChange={(event) => {
                                setReviewTouched(true);
                                setReviewEvidence((previous) => ({ ...previous, reviewer_role: event.target.value }));
                              }}
                              placeholder={isEn ? "e.g. registered pharmacist" : "مثلاً داروساز ثبت‌شده"}
                              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                            />
                          </label>
                          <label className="block space-y-1 text-xs">
                            <span className="font-medium">{isEn ? "Jurisdiction" : "حوزهٔ قضایی"}</span>
                            <input
                              aria-label={isEn ? "Jurisdiction" : "حوزهٔ قضایی"}
                              value={reviewEvidence.jurisdiction}
                              onChange={(event) => {
                                setReviewTouched(true);
                                setReviewEvidence((previous) => ({ ...previous, jurisdiction: event.target.value }));
                              }}
                              placeholder={isEn ? "e.g. NSW, Australia" : "مثلاً NSW، استرالیا"}
                              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                            />
                          </label>
                          <label className="block space-y-1 text-xs">
                            <span className="font-medium">{isEn ? "Review scope" : "دامنهٔ بازبینی"}</span>
                            <input
                              aria-label={isEn ? "Review scope" : "دامنهٔ بازبینی"}
                              value={reviewEvidence.scope}
                              onChange={(event) => {
                                setReviewTouched(true);
                                setReviewEvidence((previous) => ({ ...previous, scope: event.target.value }));
                              }}
                              placeholder={isEn ? "Clinical, regulatory, translation…" : "بالینی، مقررات، ترجمه…"}
                              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                            />
                          </label>
                          <label className="block space-y-1 text-xs">
                            <span className="font-medium">{isEn ? "Review date" : "تاریخ بازبینی"}</span>
                            <input
                              aria-label={isEn ? "Review date" : "تاریخ بازبینی"}
                              type="date"
                              value={reviewEvidence.reviewed_at}
                              onChange={(event) => {
                                setReviewTouched(true);
                                setReviewEvidence((previous) => ({ ...previous, reviewed_at: event.target.value }));
                              }}
                              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                            />
                          </label>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-semibold">{isEn ? "Primary/source references" : "منابع اولیه و مراجع"}</h3>
                            <button
                              type="button"
                              onClick={() => {
                                setReviewTouched(true);
                                const today = getTodayDate();
                                setReviewEvidence((previous) => ({
                                  ...previous,
                                  references: [...previous.references, { title: "", url: "", accessed_at: today }],
                                }));
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              {isEn ? "Add source" : "افزودن منبع"}
                            </button>
                          </div>
                          {reviewEvidence.references.map((reference, index) => (
                            <div key={`review-reference-${index}`} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 rounded-lg border border-border/70 p-2">
                              <label className="block space-y-1 text-xs">
                                <span>{isEn ? `Source title ${index + 1}` : `عنوان منبع ${index + 1}`}</span>
                                <input
                                  aria-label={isEn ? `Source title ${index + 1}` : `عنوان منبع ${index + 1}`}
                                  value={reference.title}
                                  onChange={(event) => {
                                    setReviewTouched(true);
                                    setReviewEvidence((previous) => ({
                                      ...previous,
                                      references: previous.references.map((item, itemIndex) => itemIndex === index
                                        ? { ...item, title: event.target.value }
                                        : item),
                                    }));
                                  }}
                                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                                />
                              </label>
                              <label className="block space-y-1 text-xs">
                                <span>{isEn ? `HTTPS source URL ${index + 1}` : `نشانی HTTPS منبع ${index + 1}`}</span>
                                <input
                                  aria-label={isEn ? `HTTPS source URL ${index + 1}` : `نشانی HTTPS منبع ${index + 1}`}
                                  type="url"
                                  value={reference.url}
                                  onChange={(event) => {
                                    setReviewTouched(true);
                                    setReviewEvidence((previous) => ({
                                      ...previous,
                                      references: previous.references.map((item, itemIndex) => itemIndex === index
                                        ? { ...item, url: event.target.value }
                                        : item),
                                    }));
                                  }}
                                  placeholder="https://..."
                                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                                />
                              </label>
                              <div className="flex items-end gap-2">
                                <label className="block min-w-0 flex-1 space-y-1 text-xs">
                                  <span>{isEn ? "Accessed" : "تاریخ دسترسی"}</span>
                                  <input
                                    aria-label={isEn ? `Access date ${index + 1}` : `تاریخ دسترسی منبع ${index + 1}`}
                                    type="date"
                                    value={reference.accessed_at}
                                    onChange={(event) => {
                                      setReviewTouched(true);
                                      setReviewEvidence((previous) => ({
                                        ...previous,
                                        references: previous.references.map((item, itemIndex) => itemIndex === index
                                          ? { ...item, accessed_at: event.target.value }
                                          : item),
                                      }));
                                    }}
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                                  />
                                </label>
                                <button
                                  type="button"
                                  aria-label={isEn ? `Remove source ${index + 1}` : `حذف منبع ${index + 1}`}
                                  onClick={() => {
                                    setReviewTouched(true);
                                    setReviewEvidence((previous) => ({
                                      ...previous,
                                      references: previous.references.filter((_, itemIndex) => itemIndex !== index),
                                    }));
                                  }}
                                  className="mb-0.5 rounded-lg border border-border p-2 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] leading-5 text-muted-foreground">
                          {isEn
                            ? "ARSHNAZ records what you enter; it does not verify the reviewer's registration or certify that a source is authoritative or current."
                            : "ARSHNAZ اطلاعات واردشده را ثبت می‌کند؛ ثبت حرفه‌ای بازبین یا اولیه/به‌روز بودن مرجع را مستقلاً تأیید نمی‌کند."}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs leading-5 text-muted-foreground">
                        {isEn
                          ? "Imported or clinical content should remain unreviewed until a human review and its sources are recorded."
                          : "محتوای واردشده یا بالینی تا زمان بازبینی انسانی و ثبت منابع باید بازبینی‌نشده بماند."}
                      </p>
                    )}
                  </div>
                </details>
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
                  className={`w-full flex-1 min-h-[160px] sm:min-h-[260px] p-3 font-mono text-xs bg-background border border-input rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-y shadow-xs ${
                    langTab === "fa" ? "text-right" : "text-left"
                  }`}
                />
              </div>
            ) : (
              <div className="p-4 sm:p-5 bg-card rounded-2xl border border-border min-h-[160px] sm:min-h-[260px] shadow-sm">
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
