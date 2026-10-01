import { detectDirection } from '@/lib/bilingualHelper';
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, BookOpenCheck, Globe, CalendarPlus, ClipboardCheck, Edit, Folder, Gamepad2, Languages,
  Loader2, Maximize2, MoreHorizontal, PanelLeftClose, PanelLeftOpen, RotateCcw, Sparkles, Tag, Trash2,
  X, ZoomIn, ZoomOut, GraduationCap,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type PharmacyHeaderLinks = { hub: string; practice: string; review: string };

type Props = {
  isEn: boolean;
  collapsed: boolean;
  folderName?: string;
  title?: string;
  tags?: string[];
  studyMode: boolean;
  fontSize: number;
  onFontSize: (next: number) => void;
  languageLabel: string;
  languageAriaLabel: string;
  onCycleLanguage: () => void;
  onBackDocument?: () => void;
  onClosePopup?: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleStudyMode?: () => void;
  onGenerateAi: () => void;
  onGenerateBilingual: () => void;
  isGeneratingBilingual: boolean;
  onOpenInteractive: () => void;
  onSchedule?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  pharmacyLinks?: PharmacyHeaderLinks;
};

const iconBtn = "inline-flex h-11 w-11 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function KnowledgeReaderHeader(p: Props) {
  const { isEn } = p;
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const [tagsOpen, setTagsOpen] = useState(false);
  const tags = p.tags ?? [];
  const shownTags = tagsOpen ? tags : tags.slice(0, 4);

  return (
    <div
      className={`shrink-0 overflow-hidden border-b border-border bg-card/95 transition-[max-height,opacity] duration-200 ease-out motion-reduce:transition-none ${p.collapsed ? "max-h-0 border-transparent opacity-0" : "max-h-40 opacity-100"}`}
      data-testid="knowledge-reader-header"
      aria-hidden={p.collapsed || undefined}
    >
      <div className="flex min-h-12 md:min-h-10 items-center gap-1 px-2">
        {p.onBackDocument && (
          <button type="button" onClick={p.onBackDocument} className={iconBtn} title={T("بازگشت به سند قبلی", "Back to previous document")} aria-label={T("بازگشت به سند قبلی", "Back to previous document")}>
            {isEn ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          </button>
        )}
        {p.onClosePopup && (
          <button type="button" onClick={p.onClosePopup} className={iconBtn} title={T("بستن پنجرهٔ سند", "Close linked document")} aria-label={T("بستن پنجرهٔ سند", "Close linked document")}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        {p.onToggleSidebar && (
          <button type="button" onClick={p.onToggleSidebar} className={`${iconBtn} hidden md:inline-flex`} title={p.isSidebarCollapsed ? T("نمایش سایدبار فصل‌ها (Ctrl+B)", "Show Chapters Sidebar (Ctrl+B)") : T("بستن سایدبار فصل‌ها (Ctrl+B)", "Hide Chapters Sidebar (Ctrl+B)")} aria-label={T("سایدبار فصل‌ها", "Chapters sidebar")}>
            {p.isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4 text-primary" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}

        <h1 dir={detectDirection(p.title || p.folderName || '')} className="min-w-0 flex-1 truncate text-sm font-semibold md:hidden learning-reader-mobile-title" title={p.title}>{p.title ?? p.folderName}</h1>
        <nav className="hidden md:flex min-w-0 flex-1 items-center gap-1 text-[12px] text-muted-foreground" aria-label={T("مسیر", "Breadcrumb")} data-testid="knowledge-reader-breadcrumb">
          {p.pharmacyLinks && (
            <>
              <Link to={p.pharmacyLinks.hub} className="shrink-0 font-medium text-primary hover:underline">{T("فارماسی", "Pharmacy")}</Link>
              <span className="shrink-0 opacity-50">/</span>
            </>
          )}
          {p.folderName && (
            <span className="flex min-w-0 items-center gap-1">
              <Folder className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate" title={p.folderName}>{p.folderName}</span>
            </span>
          )}
        </nav>

        <button
          type="button" onClick={p.onCycleLanguage}
          className="hidden md:inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted"
          aria-label={p.languageAriaLabel}
          title={isEn ? `${p.languageAriaLabel} · click to change` : `${p.languageAriaLabel} · برای تغییر کلیک کنید`}
          data-testid="knowledge-language-toggle"
        >
          <Languages className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span aria-hidden="true">{p.languageLabel}</span>
        </button>

        {p.onToggleStudyMode && (
          <button
            type="button" onClick={p.onToggleStudyMode} aria-pressed={p.studyMode}
            data-testid="knowledge-study-mode-toggle"
            className={`${iconBtn} ${p.studyMode ? "inline-flex" : "hidden md:inline-flex"} ${p.studyMode ? "bg-primary/10 text-primary" : ""}`}
            title={T("حالت مطالعه ابزارها را پنهان می‌کند، نه محتوا را (خروج با Esc)", "Study mode hides tools, not content (Esc to exit)")}
            aria-label={T("حالت مطالعه", "Study mode")}
          >
            <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        {p.onToggleStudyMode && p.studyMode && (
          <button
            type="button" data-testid="knowledge-fullscreen-toggle" className={iconBtn}
            onClick={() => { const root = window.document.documentElement; if (window.document.fullscreenElement) void window.document.exitFullscreen?.(); else void root.requestFullscreen?.().catch(() => undefined); }}
            aria-label={T("تمام‌صفحه", "Toggle full screen")} title={T("تمام‌صفحه", "Full screen")}
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        {!p.studyMode && (
          <>
            <button type="button" disabled={p.isGeneratingBilingual} onClick={p.onGenerateBilingual} className={`${iconBtn} hidden md:inline-flex`} title={T("دوزبانه کردن و ترجمه درس با هوش مصنوعی", "Generate bilingual version with AI")} aria-label={T("دوزبانه کردن و ترجمه درس با هوش مصنوعی", "Generate bilingual version with AI")} aria-busy={p.isGeneratingBilingual} data-testid="knowledge-translate">
              {p.isGeneratingBilingual ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Globe className="h-4 w-4" aria-hidden="true" />}
            </button>
            <button type="button" onClick={p.onOpenInteractive} className={`${iconBtn} hidden md:inline-flex`} title={T("آموزش تعاملی: کارت، کوییز، سناریو و بازی", "Interactive learning: cards, quizzes, scenarios & games")} aria-label={T("آموزش تعاملی", "Interactive learning studio")} data-testid="knowledge-interactive">
              <Gamepad2 className="h-4 w-4 text-primary" aria-hidden="true" />
            </button>
            <button type="button" onClick={p.onGenerateAi} className={`${iconBtn} hidden md:inline-flex text-primary`} title={T("تولید سوالات لایتنر و نقشه ذهنی با هوش مصنوعی", "Generate Leitner & Mind Map questions with AI")} aria-label={T("تولید سوالات لایتنر و نقشه ذهنی با هوش مصنوعی", "Generate Leitner and Mind Map cards with AI")} data-testid="knowledge-ai-generate">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={p.onEdit} className={`${iconBtn} hidden md:inline-flex`} title={T("ویرایش سند", "Edit document")} aria-label={T("ویرایش سند", "Edit document")} data-testid="knowledge-edit">
              <Edit className="h-4 w-4" aria-hidden="true" />
            </button>
            <DropdownMenu dir={isEn ? "ltr" : "rtl"}>
              <DropdownMenuTrigger asChild>
                <button type="button" className={iconBtn} title={T("بیشتر", "More")} aria-label={T("بیشتر", "More actions")} data-testid="knowledge-more-menu">
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="md:hidden learning-reader-mobile-actions">
                  <DropdownMenuItem onSelect={p.onCycleLanguage}><Languages className="h-4 w-4" />{p.languageAriaLabel}</DropdownMenuItem>
                  {p.onToggleStudyMode && <DropdownMenuItem onSelect={p.onToggleStudyMode}><BookOpenCheck className="h-4 w-4" />{T("حالت مطالعه", "Study mode")}</DropdownMenuItem>}
                  <DropdownMenuItem onSelect={p.onEdit}><Edit className="h-4 w-4" />{T("ویرایش سند", "Edit document")}</DropdownMenuItem>
                  <DropdownMenuItem onSelect={p.onOpenInteractive}><Gamepad2 className="h-4 w-4" />{T("آموزش تعاملی", "Interactive learning")}</DropdownMenuItem>
                  <DropdownMenuItem onSelect={p.onGenerateAi}><Sparkles className="h-4 w-4" />{T("تولید کارت و سوال", "Generate cards and questions")}</DropdownMenuItem>
                  <DropdownMenuItem disabled={p.isGeneratingBilingual} onSelect={p.onGenerateBilingual}><Globe className="h-4 w-4" />{T("تولید ترجمه", "Generate translation")}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                </div>
                <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs text-muted-foreground" data-testid="knowledge-font-row">
                  <span>{T("اندازهٔ متن", "Text size")}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" className={iconBtn} onClick={(e) => { e.preventDefault(); p.onFontSize(Math.max(12, p.fontSize - 1)); }} aria-label={T("کوچک‌تر کردن متن", "Smaller text")} title={T("کوچک‌تر", "Smaller")}><ZoomOut className="h-4 w-4" /></button>
                    <output className="w-7 text-center font-mono" aria-live="polite" aria-label={T(`اندازهٔ قلم ${p.fontSize}`, `Font size ${p.fontSize}`)}>{p.fontSize}</output>
                    <button type="button" className={iconBtn} onClick={(e) => { e.preventDefault(); p.onFontSize(Math.min(24, p.fontSize + 1)); }} aria-label={T("بزرگ‌تر کردن متن", "Larger text")} title={T("بزرگ‌تر", "Larger")}><ZoomIn className="h-4 w-4" /></button>
                  </div>
                </div>
                <DropdownMenuSeparator />
                {p.onSchedule && (
                  <DropdownMenuItem onSelect={p.onSchedule}>
                    <CalendarPlus className="h-4 w-4" />{T("افزودن به تقویم / برنامه مطالعه", "Add to calendar / study plan")}
                  </DropdownMenuItem>
                )}
                {p.pharmacyLinks && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild data-testid="pharmacy-strip-practice">
                      <Link to={p.pharmacyLinks.practice}><ClipboardCheck className="h-4 w-4" />{T("تمرین", "Practice")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild data-testid="pharmacy-strip-review">
                      <Link to={p.pharmacyLinks.review}><GraduationCap className="h-4 w-4" />{T("مرور این موضوع", "Review this topic")}</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={p.onDelete} title={T("حذف سند", "Delete document")} className="text-destructive focus:text-destructive" data-testid="knowledge-delete">
                  <Trash2 className="h-4 w-4" />{T("حذف سند", "Delete document")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {tags.length > 0 && (
        <div className="hidden md:flex items-center gap-1.5 px-3 pb-1.5" data-testid="knowledge-reader-tags">
          <Tag className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className={`flex min-w-0 flex-1 items-center gap-1 ${tagsOpen ? "flex-wrap" : "overflow-x-auto whitespace-nowrap [scrollbar-width:none]"}`}>
            {shownTags.map((tag, i) => (
              <span key={`${tag}-${i}`} className="shrink-0 rounded-md bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">{tag}</span>
            ))}
          </div>
          {tags.length > 4 && (
            <button type="button" onClick={() => setTagsOpen((v) => !v)} className="shrink-0 rounded-md px-1.5 py-px text-[10px] font-semibold text-primary hover:bg-primary/10" aria-expanded={tagsOpen} data-testid="knowledge-tags-toggle">
              {tagsOpen ? T("کمتر", "Less") : `+${tags.length - 4}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
