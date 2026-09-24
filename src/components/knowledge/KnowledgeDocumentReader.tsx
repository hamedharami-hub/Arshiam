import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  BookOpen,
  Globe,
  Check,
  Eye,
  Edit,
  Trash2,
  ZoomIn,
  ZoomOut,
  Folder,
  Tag,
  Clock,
  Sparkles,
  Languages,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  ArrowRight,
  Gamepad2,
  CalendarPlus,
  Layers,
  FileText,
} from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import type {
  KnowledgeDocument,
  KnowledgeFolder,
  DocumentLanguageMode,
} from "@/lib/knowledgeTypes";
import { sanitizeKnowledgeHtml } from "@/lib/knowledgeBeautifier";
import { isPersianText, detectDirection, generateBilingualLesson } from "@/lib/bilingualHelper";
import { updateKnowledgeDocument } from "@/lib/knowledgeService";
import { attachInteractiveListeners } from "@/lib/interactiveLearningHelper";
import {
  extractDocumentCheckpoints,
  getRelatedDocumentSuggestions,
  type KnowledgeCheckpoint,
} from "@/lib/knowledgeCheckpointHelper";
import { createLeitnerCard } from "@/lib/leitnerService";
import { getKnowledgeReviewState, isPharmacyKnowledgeDocument } from "@/lib/knowledgeReviewEvidence";
import { hasSubstantialPersianInEnglish } from "@/lib/bilingualHelper";
import { TextSelectionFloatingBar } from "./TextSelectionFloatingBar";
const AiQuestionGeneratorModal = React.lazy(() =>
  import("./AiQuestionGeneratorModal").then((m) => ({
    default: m.AiQuestionGeneratorModal,
  }))
);
const InteractiveLearningModal = React.lazy(() =>
  import("./InteractiveLearningModal").then((m) => ({
    default: m.InteractiveLearningModal,
  }))
);
const ClinicalRelationsNetwork = React.lazy(() =>
  import("./ClinicalRelationsNetwork").then((m) => ({
    default: m.ClinicalRelationsNetwork,
  }))
);
import { toast } from "sonner";

interface KnowledgeDocumentReaderProps {
  document: KnowledgeDocument | null;
  folder: KnowledgeFolder | null;
  allDocuments?: KnowledgeDocument[];
  onSelectDocument?: (docId: string) => void;
  onBackDocument?: () => void;
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
  onImportPharmacy?: (force?: boolean) => Promise<void>;
  isPharmacyImported?: boolean;
  isImportingPharmacy?: boolean;
}

export const KnowledgeDocumentReader: React.FC<KnowledgeDocumentReaderProps> = ({
  document,
  folder,
  allDocuments = [],
  onSelectDocument,
  onBackDocument,
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
  onImportPharmacy,
  isPharmacyImported = true,
  isImportingPharmacy = false,
}) => {
  const { isEn } = useBilingual();
  const isPharmacySourceFile = document ? isPharmacyKnowledgeDocument(document) : false;
  const documentId = document?.id;
  const documentPreferredLanguage = document?.preferred_language;
  const reviewState = document
    ? getKnowledgeReviewState(document, isPharmacySourceFile)
    : "not-required";
  const [docLangMode, setDocLangMode] = useState<DocumentLanguageMode>("en");
  const [fontSize, setFontSize] = useState<number>(15);
  const [isGeneratingBilingual, setIsGeneratingBilingual] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [interactiveModalOpen, setInteractiveModalOpen] = useState(false);
  const [selectedSnippetForAi, setSelectedSnippetForAi] = useState("");
  const [revealedCheckpoints, setRevealedCheckpoints] = useState<Record<string, boolean>>({});
  const [addedToLeitner, setAddedToLeitner] = useState<Record<string, boolean>>({});
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Compute active recall checkpoints from current document
  const checkpoints = useMemo(() => {
    return document ? extractDocumentCheckpoints(document) : [];
  }, [document]);

  // Compute smart related documents
  const relatedSuggestions = useMemo(() => {
    return document && allDocuments.length > 0
      ? getRelatedDocumentSuggestions(document, allDocuments, 3)
      : [];
  }, [document, allDocuments]);

  // Reset revealed answers when document changes
  useEffect(() => {
    setRevealedCheckpoints({});
    setAddedToLeitner({});
    if (contentContainerRef.current) contentContainerRef.current.scrollTop = 0;
  }, [document?.id]);

  const handleAddCheckpointToLeitner = async (cp: KnowledgeCheckpoint) => {
    if (!document || !userId) return;
    try {
      const question = isEn && cp.questionEn ? cp.questionEn : cp.questionFa;
      const answer = isEn && cp.answerEn ? cp.answerEn : cp.answerFa;
      await createLeitnerCard(userId, {
        front: question,
        back: answer,
        clue: isEn ? cp.badgeEn : cp.badgeFa,
        document_id: document.id,
        folder_id: document.folder_id,
        box: 1,
      });
      setAddedToLeitner((prev) => ({ ...prev, [cp.id]: true }));
      toast.success(
        isEn
          ? "Checkpoint added to your Leitner deck!"
          : "نکته کلیدی به جعبه مرور لایتنر شما اضافه شد!"
      );
    } catch (err: any) {
      console.error("Failed to add checkpoint to Leitner", err);
      toast.error(err.message || (isEn ? "Failed to add card" : "خطا در افزودن به لایتنر"));
    }
  };

  // Initialize language mode based on document properties
  useEffect(() => {
    if (documentId) setDocLangMode(documentPreferredLanguage || "en");
  }, [documentId, documentPreferredLanguage]);

  // Attach interactive delegated click listeners (flip cards, quizzes, pairs, cases, etc.)
  useEffect(() => {
    if (contentContainerRef.current) {
      const cleanup = attachInteractiveListeners(contentContainerRef.current);
      return cleanup;
    }
  }, [document?.content_html, document?.content_en, docLangMode]);

  // Delegated click listener for in-content cross-document links [data-doc-link="..."]
  useEffect(() => {
    const container = contentContainerRef.current;
    if (!container) return;

    const handleDocLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const linkEl = target.closest("[data-doc-link]") as HTMLElement | null;
      if (linkEl) {
        e.preventDefault();
        e.stopPropagation();
        const targetDocId = linkEl.getAttribute("data-doc-link");
        if (targetDocId && onSelectDocument) {
          onSelectDocument(targetDocId);
          container.scrollTop = 0;
        }
      }
    };

    container.addEventListener("click", handleDocLinkClick);
    return () => {
      container.removeEventListener("click", handleDocLinkClick);
    };
  }, [onSelectDocument, document?.id]);

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

  const persianBodyIncomplete = React.useMemo(() => {
    if (!document?.content_html || !document.content_en) return false;
    const text = document.content_html.replace(/<[^>]+>/g, " ");
    const persianCharacters = (text.match(/[\u0600-\u06ff]/g) || []).length;
    const latinCharacters = (text.match(/[a-z]/gi) || []).length;
    return persianCharacters > 0 && persianCharacters < 200 && latinCharacters > persianCharacters * 2;
  }, [document?.content_html, document?.content_en]);

  const englishBodyHasPersianPassages = React.useMemo(
    () => hasSubstantialPersianInEnglish(document?.content_en),
    [document?.content_en],
  );

  const safeHtmlEn = React.useMemo(() => {
    if (!document?.content_en) return "";
    return sanitizeKnowledgeHtml(document.content_en);
  }, [document?.content_en]);

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

  const cycleDocumentLanguage = () => {
    setDocLangMode((current) =>
      current === "en" ? "fa" : current === "fa" ? "bilingual" : "en"
    );
  };

  const languageModeLabel =
    docLangMode === "en" ? "EN" : docLangMode === "fa" ? "فا" : "فا + EN";
  const languageModeAccessibleLabel = isEn
    ? `Reading language: ${docLangMode === "en" ? "English" : docLangMode === "fa" ? "Persian" : "bilingual"}`
    : `زبان مطالعه: ${docLangMode === "en" ? "انگلیسی" : docLangMode === "fa" ? "فارسی" : "دوزبانه"}`;

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

        {!isPharmacyImported && onImportPharmacy && (
          <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-primary/10 border border-emerald-500/25 max-w-md text-center space-y-3 shadow-xs animate-in fade-in">
            <div className="text-2xl">💊</div>
            <div className="text-xs font-bold text-foreground">
              {isEn
                ? "Pharmacy Knowledge & Clinical Modules"
                : "دایره‌المعارف و آموزش جامع دارویی"}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {isEn
                ? "Add the missing pharmacy reference documents and study cards without replacing your work."
                : "اسناد و کارت‌های داروییِ جاافتاده را بدون بازنویسی کارهای فعلی اضافه کن."}
            </p>
            <button
              type="button"
              disabled={isImportingPharmacy}
              onClick={() => onImportPharmacy(false)}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition disabled:opacity-60 inline-flex items-center gap-2 cursor-pointer"
            >
              {isImportingPharmacy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>
                {isImportingPharmacy
                  ? isEn
                    ? "Importing 97 Lessons..."
                    : "در حال بارگذاری ۹۷ درس..."
                  : isEn
                  ? "Install Pharmacy Knowledge"
                  : "واردسازی بسته جامع دارویی"}
              </span>
            </button>
          </div>
        )}
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
          {onBackDocument && (
            <button
              type="button"
              onClick={onBackDocument}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border bg-secondary p-1.5 text-foreground hover:bg-secondary/80"
              aria-label={isEn ? "Back to previous document" : "بازگشت به سند قبلی"}
              title={isEn ? "Back to previous document" : "بازگشت به سند قبلی"}
            >
              {isEn ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </button>
          )}
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
          {/* Compact language control: English → Persian → bilingual. */}
          <button
            type="button"
            onClick={cycleDocumentLanguage}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border bg-muted/60 px-2 text-xs font-semibold text-foreground transition hover:bg-muted"
            aria-label={languageModeAccessibleLabel}
            title={isEn ? `${languageModeAccessibleLabel} · click to change` : `${languageModeAccessibleLabel} · برای تغییر کلیک کنید`}
          >
            <Languages className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span aria-hidden="true">{languageModeLabel}</span>
          </button>

          {/* AI Bilingual Generator Button */}
          <button
            type="button"
            disabled={isGeneratingBilingual}
            onClick={handleGenerateBilingualLesson}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-secondary text-foreground transition hover:bg-secondary/80 disabled:cursor-wait disabled:opacity-60"
            aria-label={isEn ? "Generate bilingual version with AI" : "دوزبانه کردن و ترجمه درس با هوش مصنوعی"}
            aria-busy={isGeneratingBilingual}
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
          </button>

          {/* AI Flashcard Generator Button */}
          <button
            type="button"
            onClick={handleTriggerAiFromToolbar}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs transition hover:bg-primary/90"
            aria-label={isEn ? "Generate Leitner and Mind Map cards with AI" : "تولید سوالات لایتنر و نقشه ذهنی با هوش مصنوعی"}
            title={
              isEn
                ? "Generate Leitner & Mind Map questions with AI"
                : "تولید سوالات لایتنر و نقشه ذهنی با هوش مصنوعی"
            }
          >
            <Sparkles className="h-4 w-4 text-amber-300" aria-hidden="true" />
          </button>

          {/* Interactive Learning Studio Button */}
          <button
            type="button"
            onClick={() => setInteractiveModalOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-secondary text-foreground transition hover:bg-secondary/80"
            aria-label={isEn ? "Interactive learning studio" : "آموزش تعاملی"}
            title={
              isEn
                ? "Generate 3D cards, quizzes, scenarios & games"
                : "تولید کارت‌های ۳ بعدی، کوییز تشخیصی، سناریوی بالینی و بازی‌ها"
            }
          >
            <Gamepad2 className="h-4 w-4 text-primary" aria-hidden="true" />
          </button>

          {/* Schedule Study Task Button */}
          {onScheduleStudy && (
            <button
              type="button"
              onClick={() => onScheduleStudy(document)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 shadow-2xs transition hover:bg-emerald-500/20 dark:text-emerald-400"
              aria-label={isEn ? "Schedule a study or review task for this lesson" : "برنامه‌ریزی مطالعه و ایجاد تسک برای این درس"}
              title={
                isEn
                  ? "Schedule a study/review task for this lesson"
                  : "برنامه‌ریزی مطالعه و ایجاد تسک برای این درس"
              }
            >
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          <div className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border bg-background/70 px-2 text-xs font-medium text-muted-foreground" aria-label={isEn ? "Reader mode" : "حالت مطالعه Reader"}>
            <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>Reader</span>
          </div>

          {/* Font Resizer */}
          <div className="flex items-center rounded-xl border border-border bg-muted/50 p-0.5">
              <button
                type="button"
                onClick={() => setFontSize((s) => Math.max(12, s - 1))}
                className="p-1 text-muted-foreground hover:text-foreground rounded transition cursor-pointer"
                aria-label={isEn ? "Smaller text" : "کوچک‌تر کردن متن"}
                title={isEn ? "Smaller text" : "کوچک‌تر"}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <output className="px-1 font-mono text-[10px] text-muted-foreground" aria-live="polite" aria-label={isEn ? `Font size ${fontSize}` : `اندازهٔ قلم ${fontSize}`}>
                {fontSize}
              </output>
              <button
                type="button"
                onClick={() => setFontSize((s) => Math.min(24, s + 1))}
                className="p-1 text-muted-foreground hover:text-foreground rounded transition cursor-pointer"
                aria-label={isEn ? "Larger text" : "بزرگ‌تر کردن متن"}
                title={isEn ? "Larger text" : "بزرگ‌تر"}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
          </div>

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
        <div
            style={{ "--knowledge-reader-font-size": `${fontSize}px` } as React.CSSProperties}
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
                    <span>{isPharmacySourceFile
                      ? isEn ? "Pharmacy source file" : "فایل مبدأ Pharmacy"
                      : isEn ? "Source Reference" : "منبع سند"}</span>
                  </a>
                )}
                {reviewState === "recorded" && document.content_review_evidence && (
                  <details className="basis-full rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-xs leading-5">
                    <summary className="cursor-pointer font-semibold text-foreground">
                      {isEn ? "Recorded review evidence" : "شواهد بازبینی ثبت‌شده"}
                    </summary>
                    <div className="mt-2 space-y-1.5 text-muted-foreground">
                      <p>
                        {isEn ? "Reviewer role:" : "نقش بازبین:"} {document.content_review_evidence.reviewer_role}
                        {" · "}{isEn ? "Jurisdiction:" : "حوزهٔ قضایی:"} {document.content_review_evidence.jurisdiction}
                      </p>
                      <p>
                        {isEn ? "Scope:" : "دامنهٔ بازبینی:"} {document.content_review_evidence.scope}
                        {" · "}{isEn ? "Reviewed:" : "تاریخ بازبینی:"} {document.content_review_evidence.reviewed_at}
                      </p>
                      <ul className="list-disc space-y-1 ps-5">
                        {document.content_review_evidence.references.map((reference) => (
                          <li key={`${reference.url}-${reference.accessed_at}`}>
                            <a href={reference.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              {reference.title}
                            </a>
                            <span>{" · "}{isEn ? "accessed" : "تاریخ دسترسی"}: {reference.accessed_at}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px]">
                        {isEn
                          ? "This is recorded metadata; ARSHNAZ does not independently certify the reviewer or source authority."
                          : "این فرادادهٔ ثبت‌شده است؛ ARSHNAZ صلاحیت بازبین یا اعتبار مرجع را مستقلاً تأیید نمی‌کند."}
                      </p>
                    </div>
                  </details>
                )}
              </div>
            </div>

            {(reviewState === "unreviewed" || reviewState === "missing-evidence") && (
              <div role="note" className="mb-5 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-foreground">
                {reviewState === "missing-evidence"
                  ? isEn
                    ? "This document is marked reviewed, but its review record is missing valid reviewer, jurisdiction, date, scope, or source details. Treat it as unreviewed."
                    : "برای این سند برچسب بازبینی‌شده ثبت شده، اما نقش بازبین، حوزهٔ قضایی، تاریخ، دامنه یا جزئیات معتبر منبع کامل نیست؛ فعلاً آن را بازبینی‌نشده در نظر بگیرید."
                  : isPharmacySourceFile
                    ? isEn
                      ? "Imported educational content. It has not been independently checked against current Australian clinical references or state and territory rules. Verify the current primary source before using it in practice."
                      : "محتوای آموزشیِ واردشده است و با منابع اولیهٔ بالینیِ جاری یا قوانین ایالت‌ها و قلمروهای استرالیا به‌طور مستقل تطبیق داده نشده؛ پیش از استفادهٔ حرفه‌ای، منبع اولیهٔ روز را بررسی کنید."
                    : isEn
                      ? "This document is marked unreviewed. Check its primary sources before relying on it for professional decisions."
                      : "این سند بازبینی‌نشده است؛ پیش از اتکا به آن برای تصمیم حرفه‌ای، منابع اولیه‌اش را بررسی کنید."}
              </div>
            )}

            {persianBodyIncomplete && docLangMode !== "en" && (
              <div role="status" className="mb-5 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-foreground">
                {isEn
                  ? "This older document has Persian headings but much of its body is still English. Its Persian translation is incomplete."
                  : "ترجمهٔ فارسی این سند قدیمی کامل نیست؛ بعضی بخش‌ها با وجود تیتر فارسی هنوز انگلیسی‌اند."}
              </div>
            )}

            {englishBodyHasPersianPassages && docLangMode === "en" && (
              <div role="status" className="mb-5 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-foreground">
                {isEn
                  ? "The English field contains substantial Persian passages. This may be intentional bilingual content, but this view is not strictly English-only."
                  : "نسخهٔ انگلیسی این سند بخش‌های فارسیِ قابل‌توجه دارد؛ ممکن است محتوای دوزبانه عمدی باشد، اما این نما کاملاً انگلیسی نیست."}
              </div>
            )}

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

            {/* Active Recall & Key Checkpoints Section */}
            {checkpoints.length > 0 && (
              <div className="mt-10 pt-6 border-t border-border/80 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <span>
                          {isEn
                            ? "Active Recall & Key Checkpoints"
                            : "خودآزمایی سریع و نکات کلیدی (Active Recall)"}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold">
                          {checkpoints.length} {isEn ? "Checkpoints" : "نکته کلیدی"}
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {isEn
                          ? "Test your clinical retention, reveal answers, and add them directly into your Leitner deck"
                          : "درک مطلب خود را بیازمایید و نکات مهم را با یک کلیک به جعبه لایتنر بفرستید"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {checkpoints.map((cp) => {
                    const isRevealed = !!revealedCheckpoints[cp.id];
                    const isAdded = !!addedToLeitner[cp.id];
                    const questionText = isEn && cp.questionEn ? cp.questionEn : cp.questionFa;
                    const answerText = isEn && cp.answerEn ? cp.answerEn : cp.answerFa;

                    return (
                      <div
                        key={cp.id}
                        className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-3 transition hover:border-primary/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5 min-w-0">
                            <span
                              className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border"
                              style={{
                                color: cp.color,
                                borderColor: `${cp.color}40`,
                                backgroundColor: `${cp.color}15`,
                              }}
                            >
                              {isEn ? cp.badgeEn : cp.badgeFa}
                            </span>
                            <h4 className="text-xs md:text-sm font-semibold text-foreground leading-snug">
                              {questionText}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedCheckpoints((prev) => ({
                                  ...prev,
                                  [cp.id]: !prev[cp.id],
                                }))
                              }
                              className="px-2.5 py-1 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium border border-border transition cursor-pointer flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5 text-primary" />
                              <span>
                                {isRevealed
                                  ? isEn
                                    ? "Hide"
                                    : "مخفی‌سازی"
                                  : isEn
                                  ? "Show Answer"
                                  : "مشاهده پاسخ"}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Revealed Answer Content */}
                        {isRevealed && (
                          <div className="pt-2 border-t border-border/50 text-xs md:text-sm text-foreground/90 space-y-2.5 animate-in fade-in duration-200">
                            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 leading-relaxed font-sans select-text">
                              {answerText}
                            </div>

                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                disabled={isAdded}
                                onClick={() => handleAddCheckpointToLeitner(cp)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                                  isAdded
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 cursor-default"
                                    : "bg-primary hover:bg-primary/90 text-primary-foreground border-transparent shadow-2xs"
                                }`}
                              >
                                {isAdded ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{isEn ? "Added to Leitner" : "✓ به لایتنر اضافه شد"}</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>
                                      {isEn ? "Add to Leitner Deck" : "⚡ افزودن به جعبه لایتنر"}
                                    </span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Interconnected Clinical & Drug Relations Network */}
            <React.Suspense fallback={null}>
              <ClinicalRelationsNetwork
                document={document}
                allDocuments={allDocuments}
                onSelectDocument={onSelectDocument}
                isEn={isEn}
              />
            </React.Suspense>

            {/* Smart Related Knowledge & Products Section */}
            {relatedSuggestions.length > 0 && (
              <div className="mt-8 pt-6 border-t border-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs md:text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-primary/10 text-primary">
                      <Layers className="w-3.5 h-3.5" />
                    </span>
                    <span>
                      {isEn
                        ? "Suggested further reading"
                        : "پیشنهاد برای مطالعهٔ بیشتر"}
                    </span>
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {relatedSuggestions.length} {isEn ? "documents" : "سند"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {relatedSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.document.id}
                      type="button"
                      onClick={() => onSelectDocument?.(suggestion.document.id)}
                      className="flex flex-col justify-between p-3 rounded-2xl bg-card hover:bg-secondary/70 border border-border/80 hover:border-primary/50 transition text-start group cursor-pointer shadow-2xs space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <span className="p-1.5 rounded-xl bg-primary/10 text-primary shrink-0 group-hover:scale-105 transition">
                          <FileText className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition line-clamp-2">
                            {isEn && suggestion.document.title_en ? suggestion.document.title_en : suggestion.document.title}
                          </h4>
                          <span className="mt-1 inline-flex rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                            {suggestion.match === "shared-tag"
                              ? `${isEn ? "Specific tag" : "برچسب موضوعی"}: ${suggestion.matchedTags.slice(0, 2).join(", ")}`
                              : suggestion.match === "shared-category"
                                ? `${isEn ? "Broad category" : "دسته‌بندی مشترک"}: ${suggestion.matchedTags.slice(0, 2).join(", ")}`
                                : suggestion.match === "title-overlap"
                                  ? `${isEn ? "Title overlap" : "هم‌پوشانی عنوان"}: ${suggestion.matchedTitleWords.slice(0, 2).join(", ")}`
                                  : isEn ? "Same folder" : "همین پوشه"}
                          </span>
                          {suggestion.document.title_en && !isEn && (
                            <p className="text-[10px] text-muted-foreground line-clamp-1" dir="ltr">
                              {suggestion.document.title_en}
                            </p>
                          )}
                        </div>
                      </div>

                      {suggestion.document.tags && suggestion.document.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-border/40">
                          {suggestion.document.tags.slice(0, 2).map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>

      <TextSelectionFloatingBar
        containerRef={contentContainerRef}
        onAddToNote={onAddToNote}
        onAddToTask={onAddToTask}
        onAiAction={onAiAction}
        onGenerateQuestions={handleTriggerAiFromSelection}
      />

      {/* AI Question & Flashcard Generator Modal */}
      {aiModalOpen && (
        <React.Suspense fallback={null}>
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
        </React.Suspense>
      )}

      {/* Interactive Learning Studio Modal */}
      {interactiveModalOpen && (
        <React.Suspense fallback={null}>
          <InteractiveLearningModal
            open={interactiveModalOpen}
            onOpenChange={setInteractiveModalOpen}
            documentTitle={document?.title || ""}
            documentContent={document?.content_html || ""}
            onInsertContent={handleInsertInteractive}
          />
        </React.Suspense>
      )}
    </div>
  );
};
