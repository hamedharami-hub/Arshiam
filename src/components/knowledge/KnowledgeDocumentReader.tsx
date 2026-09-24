import React, { useState, useRef, useEffect } from "react";
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
  Languages,
  Loader2,
  Columns,
  PanelLeftClose,
  PanelLeftOpen,
  Gamepad2,
  CalendarPlus,
} from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import type {
  KnowledgeDocument,
  KnowledgeFolder,
  DocumentViewMode,
  DocumentLanguageMode,
} from "@/lib/knowledgeTypes";
import { sanitizeKnowledgeHtml } from "@/lib/knowledgeBeautifier";
import { isPersianText, detectDirection, generateBilingualLesson } from "@/lib/bilingualHelper";
import { updateKnowledgeDocument } from "@/lib/knowledgeService";
import { attachInteractiveListeners } from "@/lib/interactiveLearningHelper";
import { TextSelectionFloatingBar } from "./TextSelectionFloatingBar";
import { AiQuestionGeneratorModal } from "./AiQuestionGeneratorModal";
import { InteractiveLearningModal } from "./InteractiveLearningModal";
import { toast } from "sonner";

interface KnowledgeDocumentReaderProps {
  document: KnowledgeDocument | null;
  folder: KnowledgeFolder | null;
  onEdit: (doc: KnowledgeDocument) => void;
  onDelete: (docId: string) => void;
  userId?: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenReview?: () => void;
  onDocumentUpdated?: (doc: KnowledgeDocument) => void;
  onScheduleStudy?: (doc: KnowledgeDocument) => void;
  /** @deprecated */
  onAddToNote?: (text: string) => void;
  /** @deprecated */
  onAddToTask?: (text: string) => void;
  onAiAction?: (text: string) => void;
}

export const KnowledgeDocumentReader: React.FC<KnowledgeDocumentReaderProps> = ({
  document,
  folder,
  onEdit,
  onDelete,
  userId = "guest",
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenReview,
  onDocumentUpdated,
  onScheduleStudy,
  onAddToNote,
  onAddToTask,
  onAiAction,
}) => {
  const { isEn } = useBilingual();
  const [viewMode, setViewMode] = useState<DocumentViewMode>("reader");
  const [docLangMode, setDocLangMode] = useState<DocumentLanguageMode>("fa");
  const [fontSize, setFontSize] = useState<number>(15);
  const [isCopied, setIsCopied] = useState(false);
  const [isGeneratingBilingual, setIsGeneratingBilingual] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [interactiveModalOpen, setInteractiveModalOpen] = useState(false);
  const [selectedSnippetForAi, setSelectedSnippetForAi] = useState("");
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Initialize language mode based on document properties
  useEffect(() => {
    if (document) {
      if (document.preferred_language) {
        setDocLangMode(document.preferred_language);
      } else if (document.content_en && document.content_html) {
        setDocLangMode("bilingual");
      } else if (!isPersianText(document.content_html)) {
        setDocLangMode("en");
      } else {
        setDocLangMode("fa");
      }
    }
  }, [document?.id, document?.preferred_language, document?.content_en]);

  // Attach interactive delegated click listeners (flip cards, quizzes, pairs, cases, etc.)
  useEffect(() => {
    if (viewMode === "reader" && contentContainerRef.current) {
      const cleanup = attachInteractiveListeners(contentContainerRef.current);
      return cleanup;
    }
  }, [viewMode, document?.content_html, document?.content_en, docLangMode]);

  const handleInsertInteractive = async (html: string, mode: "append" | "replace") => {
    if (!document) return;
    const newContent =
      mode === "append"
        ? `${document.content_html || ""}\n<hr class="my-6 border-border/60" />\n${html}`
        : html;

    try {
      const updated = await updateKnowledgeDocument(userId, document.id, {
        content_html: newContent,
      });
      if (onDocumentUpdated) {
        onDocumentUpdated(updated);
      }
    } catch (err: any) {
      console.error("Error saving interactive content:", err);
      toast.error(err.message || "Failed to update document");
    }
  };

  // Memoize sanitized Persian and English HTML
  const safeHtmlFa = React.useMemo(() => {
    if (!document?.content_html) return "";
    return sanitizeKnowledgeHtml(document.content_html);
  }, [document?.content_html]);

  const safeHtmlEn = React.useMemo(() => {
    if (!document?.content_en) return "";
    return sanitizeKnowledgeHtml(document.content_en);
  }, [document?.content_en]);

  const handleCopyAll = async () => {
    if (!document) return;
    const textToCopy =
      docLangMode === "en" && document.content_en
        ? document.content_en.replace(/<[^>]+>/g, " ").trim()
        : document.plain_text || document.title;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (e) {
      console.warn("Clipboard copy failed:", e);
    }
  };

  const handleOpenExternal = () => {
    if (!document) return;
    const content =
      docLangMode === "en" && document.content_en
        ? document.content_en
        : document.content_html;
    const blob = new Blob([content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const handleTriggerAiFromSelection = (text: string) => {
    setSelectedSnippetForAi(text);
    setAiModalOpen(true);
  };

  const handleTriggerAiFromToolbar = () => {
    if (!document) return;
    const selection = window.getSelection()?.toString().trim();
    const targetText = selection || document.plain_text || document.title;
    setSelectedSnippetForAi(targetText);
    setAiModalOpen(true);
  };

  // AI Bilingual Generation
  const handleGenerateBilingualLesson = async () => {
    if (!document) return;
    setIsGeneratingBilingual(true);

    try {
      toast.info(
        isEn
          ? "Generating bilingual lesson with AI..."
          : "در حال تولید نسخه دوزبانه درس با هوش مصنوعی..."
      );

      const targetLang = isPersianText(document.content_html) ? "en" : "fa";
      const result = await generateBilingualLesson({
        title: document.title,
        content: document.content_html,
        targetLang,
      });

      const updated = await updateKnowledgeDocument(userId, document.id, {
        title_en: result.title_en,
        content_en: result.content_en,
        preferred_language: "bilingual",
      });

      if (onDocumentUpdated) {
        onDocumentUpdated(updated);
      }
      setDocLangMode("bilingual");
      toast.success(
        isEn
          ? "Bilingual version successfully generated!"
          : "نسخه دوزبانه درس با موفقیت تولید و ذخیره شد!"
      );
    } catch (err: any) {
      console.error("Error generating bilingual lesson:", err);
      toast.error(err.message || (isEn ? "Failed to bilingualize lesson" : "خطا در دوزبانه کردن درس"));
    } finally {
      setIsGeneratingBilingual(false);
    }
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

  // Detect direction of current primary title
  const isTitleRtl = isPersianText(
    docLangMode === "en" && document.title_en ? document.title_en : document.title
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-card border border-border rounded-3xl overflow-hidden shadow-sm relative">
      {/* Top Toolbar */}
      <div className="p-3.5 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden md:flex items-center justify-center p-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border transition cursor-pointer shrink-0"
              title={
                isSidebarCollapsed
                  ? isEn
                    ? "Show Chapters Sidebar (Ctrl+B)"
                    : "نمایش سایدبار فصل‌ها (Ctrl+B)"
                  : isEn
                  ? "Hide Chapters Sidebar (Ctrl+B)"
                  : "بستن سایدبار فصل‌ها (Ctrl+B)"
              }
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-primary" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          )}

          {folder && (
            <div className="flex items-center gap-1 text-[11px] text-primary font-semibold shrink-0">
              <Folder className="w-3.5 h-3.5" />
              <span>{folder.name}</span>
              <span className="text-muted-foreground/60">/</span>
            </div>
          )}
          <h2
            dir={isTitleRtl ? "rtl" : "ltr"}
            className="text-sm font-bold text-foreground truncate"
          >
            {docLangMode === "en" && document.title_en ? document.title_en : document.title}
          </h2>
        </div>

        {/* View Mode & Actions Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Bilingual Language Switcher Pills */}
          <div className="flex items-center p-0.5 rounded-xl bg-muted/60 border border-border text-xs">
            <button
              type="button"
              onClick={() => setDocLangMode("fa")}
              className={`px-2 py-1 rounded-lg font-medium transition cursor-pointer text-xs ${
                docLangMode === "fa"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={isEn ? "Persian view (RTL)" : "نمایش فارسی (راست‌چین)"}
            >
              <span>فارسی</span>
            </button>

            <button
              type="button"
              onClick={() => setDocLangMode("en")}
              className={`px-2 py-1 rounded-lg font-medium transition cursor-pointer text-xs ${
                docLangMode === "en"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={isEn ? "English view (LTR)" : "نمایش انگلیسی (چپ‌چین)"}
            >
              <span>English</span>
            </button>

            <button
              type="button"
              onClick={() => setDocLangMode("bilingual")}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition cursor-pointer text-xs ${
                docLangMode === "bilingual"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={isEn ? "Side-by-side bilingual comparison" : "نمایش دوزبانه (مقایسه‌ای)"}
            >
              <Columns className="w-3 h-3 text-primary" />
              <span>{isEn ? "Bilingual" : "دو زبانه"}</span>
            </button>
          </div>

          {/* AI Bilingual Generator Button */}
          <button
            type="button"
            disabled={isGeneratingBilingual}
            onClick={handleGenerateBilingualLesson}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold transition cursor-pointer"
            title={
              isEn
                ? "Generate bilingual version with AI"
                : "دوزبانه کردن و ترجمه درس با هوش مصنوعی"
            }
          >
            {isGeneratingBilingual ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <Languages className="w-3.5 h-3.5 text-primary" />
            )}
            <span className="hidden sm:inline">
              {isEn ? "AI Bilingual" : "دوزبانه (AI)"}
            </span>
          </button>

          {/* AI Flashcard Generator Button */}
          <button
            type="button"
            onClick={handleTriggerAiFromToolbar}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-xs transition cursor-pointer"
            title={
              isEn
                ? "Generate Leitner & Mind Map questions with AI"
                : "تولید سوالات لایتنر و نقشه ذهنی با هوش مصنوعی"
            }
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>{isEn ? "Generate Cards" : "تولید کارت هوشمند"}</span>
          </button>

          {/* Interactive Learning Studio Button */}
          <button
            type="button"
            onClick={() => setInteractiveModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold transition cursor-pointer"
            title={
              isEn
                ? "Generate 3D cards, quizzes, scenarios & games"
                : "تولید کارت‌های ۳ بعدی، کوییز تشخیصی، سناریوی بالینی و بازی‌ها"
            }
          >
            <Gamepad2 className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">
              {isEn ? "Interactive Studio" : "آموزش تعاملی"}
            </span>
          </button>

          {/* Schedule Study Task Button */}
          {onScheduleStudy && (
            <button
              type="button"
              onClick={() => onScheduleStudy(document)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-xs font-semibold transition cursor-pointer shadow-2xs"
              title={
                isEn
                  ? "Schedule a study/review task for this lesson"
                  : "برنامه‌ریزی مطالعه و ایجاد تسک برای این درس"
              }
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isEn ? "Study Task" : "برنامه‌ریزی مطالعه"}
              </span>
            </button>
          )}

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
              <span>{isEn ? "Original HTML" : "سند اصلی (HTML)"}</span>
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
            title={isEn ? "Copy content" : "کپی محتوا"}
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
            className="knowledge-reader-prose max-w-5xl mx-auto leading-relaxed space-y-6 select-text"
          >
            {/* Header banner in reader mode */}
            <div className="border-b border-border pb-4 mb-6">
              <h1
                dir={isTitleRtl ? "rtl" : "ltr"}
                className={`text-xl md:text-2xl font-black text-foreground mb-2 tracking-tight ${
                  isTitleRtl ? "text-right" : "text-left"
                }`}
              >
                {docLangMode === "en" && document.title_en ? document.title_en : document.title}
              </h1>

              {docLangMode === "bilingual" && document.title_en && document.title_en !== document.title && (
                <div dir="ltr" className="text-sm font-semibold text-muted-foreground mb-2 text-left">
                  {document.title_en}
                </div>
              )}

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

            {/* TAB 1: PERSIAN ONLY VIEW (RTL) */}
            {docLangMode === "fa" && (
              <div
                dir="rtl"
                className="knowledge-html-content dir-rtl text-right"
                dangerouslySetInnerHTML={{ __html: safeHtmlFa }}
              />
            )}

            {/* TAB 2: ENGLISH ONLY VIEW (LTR) */}
            {docLangMode === "en" && (
              <div dir="ltr" className="space-y-4">
                {safeHtmlEn ? (
                  <div
                    dir="ltr"
                    className="knowledge-html-content dir-ltr text-left"
                    dangerouslySetInnerHTML={{ __html: safeHtmlEn }}
                  />
                ) : (
                  <div className="p-6 rounded-2xl bg-muted/30 border border-border text-center space-y-3">
                    <Languages className="w-10 h-10 text-primary mx-auto opacity-70" />
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      {isEn
                        ? "This document does not have an English translation yet. Generate a professional English version using AI with one click."
                        : "این درس هنوز دارای نسخه انگلیسی نیست. می‌توانید با یک کلیک نسخه انگلیسی و دوزبانه آن را با هوش مصنوعی تولید کنید."}
                    </p>
                    <button
                      type="button"
                      disabled={isGeneratingBilingual}
                      onClick={handleGenerateBilingualLesson}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:bg-primary/90 transition cursor-pointer inline-flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isEn ? "Generate English Version" : "تولید نسخه انگلیسی با هوش مصنوعی"}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: BILINGUAL SIDE-BY-SIDE VIEW */}
            {docLangMode === "bilingual" && (
              <div className="bilingual-dual-grid">
                {/* Persian Column (RTL) */}
                <div className="bilingual-col-fa space-y-3" dir="rtl">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <span>🇮🇷</span>
                      <span>متن فارسی (راست‌چین)</span>
                    </span>
                  </div>
                  <div
                    dir="rtl"
                    className="knowledge-html-content dir-rtl text-right"
                    dangerouslySetInnerHTML={{ __html: safeHtmlFa }}
                  />
                </div>

                {/* English Column (LTR) */}
                <div className="bilingual-col-en space-y-3" dir="ltr">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                      <span>🇬🇧</span>
                      <span>English Text (LTR)</span>
                    </span>
                  </div>

                  {safeHtmlEn ? (
                    <div
                      dir="ltr"
                      className="knowledge-html-content dir-ltr text-left"
                      dangerouslySetInnerHTML={{ __html: safeHtmlEn }}
                    />
                  ) : (
                    <div className="p-4 rounded-xl bg-muted/30 border border-border text-center space-y-2 text-xs">
                      <p className="text-muted-foreground">
                        {isEn
                          ? "English translation not generated yet."
                          : "نسخه انگلیسی هنوز تولید نشده است."}
                      </p>
                      <button
                        type="button"
                        disabled={isGeneratingBilingual}
                        onClick={handleGenerateBilingualLesson}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold cursor-pointer"
                      >
                        {isEn ? "Generate Now" : "تولید اکنون"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
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
          onGenerateQuestions={handleTriggerAiFromSelection}
        />
      )}

      {/* AI Question & Flashcard Generator Modal */}
      <AiQuestionGeneratorModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        initialText={selectedSnippetForAi}
        documentId={document?.id}
        documentTitle={document?.title}
        folderId={document?.folder_id}
        userId={userId}
        onOpenReview={onOpenReview}
      />

      {/* Interactive Learning Studio Modal */}
      <InteractiveLearningModal
        open={interactiveModalOpen}
        onOpenChange={setInteractiveModalOpen}
        documentTitle={document?.title || ""}
        documentContent={document?.content_html || ""}
        onInsertContent={handleInsertInteractive}
      />
    </div>
  );
};
