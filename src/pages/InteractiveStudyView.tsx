import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, CircleAlert, Gamepad2, Loader2, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InteractiveLearningModal } from "@/components/knowledge/InteractiveLearningModal";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { attachInteractiveListeners } from "@/lib/interactiveLearningHelper";
import { getKnowledgeDocuments } from "@/lib/knowledgeService";
import type { KnowledgeDocument } from "@/lib/knowledgeTypes";
import { sanitizeKnowledgeHtml } from "@/lib/knowledgeBeautifier";

export const InteractiveStudyView: React.FC = () => {
  const { user } = useAuth();
  const { isEn } = useBilingual();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState<"en" | "fa">("en");
  const [sessionHtml, setSessionHtml] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const sessionContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isCurrent = true;
    const loadDocuments = async () => {
      if (!user?.id) {
        setDocuments([]);
        setSelectedDocId(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(false);
      try {
        const rows = await getKnowledgeDocuments(user.id);
        if (!isCurrent) return;
        const available = rows.filter((doc) => !doc.is_archived && Boolean(doc.content_html || doc.content_en));
        setDocuments(available);
        setSelectedDocId((previous) =>
          available.some((doc) => doc.id === previous) ? previous : available[0]?.id || null
        );
      } catch (error) {
        console.error("Could not load study documents", error);
        if (isCurrent) setLoadError(true);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    void loadDocuments();
    return () => {
      isCurrent = false;
    };
  }, [user?.id]);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocId) || null,
    [documents, selectedDocId]
  );

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return documents;
    return documents.filter((document) =>
      [document.title, document.title_en, ...(document.tags || [])]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(query))
    );
  }, [documents, search]);

  const documentTitle = selectedDocument
    ? language === "en"
      ? selectedDocument.title_en?.trim() || selectedDocument.title
      : selectedDocument.title
    : "";
  const documentContent = selectedDocument
    ? language === "en"
      ? selectedDocument.content_en?.trim() || selectedDocument.content_html || ""
      : selectedDocument.content_html || selectedDocument.content_en || ""
    : "";

  const safeSessionHtml = useMemo(() => sanitizeKnowledgeHtml(sessionHtml), [sessionHtml]);

  useEffect(() => {
    const container = sessionContainerRef.current;
    if (!container || !safeSessionHtml) return;
    return attachInteractiveListeners(container);
  }, [safeSessionHtml]);

  const handleSelectDocument = useCallback((documentId: string) => {
    setSelectedDocId(documentId);
    setSessionHtml("");
  }, []);

  const handleSessionReady = useCallback((html: string) => {
    setSessionHtml(html);
  }, []);

  const handleEndSession = useCallback(() => setSessionHtml(""), []);
  const labels = {
    title: isEn ? "Interactive Study Studio" : "استودیوی مطالعهٔ تعاملی",
    description: isEn
      ? "Choose a lesson, create a short interactive practice session, and study it here. Sessions are temporary and are not written back to your lesson or Leitner cards."
      : "یک درس را انتخاب کن، جلسهٔ تمرین تعاملی بساز و همین‌جا مطالعه کن. جلسه موقتی است و در متن درس یا کارت‌های لایتنر ذخیره نمی‌شود.",
    documents: isEn ? "Your lessons" : "درس‌های شما",
    search: isEn ? "Search lessons or tags…" : "جست‌وجوی درس یا برچسب…",
    selectLesson: isEn ? "Select a lesson to begin" : "برای شروع یک درس انتخاب کن",
    chooseLanguage: isEn ? "Study language" : "زبان مطالعه",
    start: isEn ? "Build an interactive session" : "ساخت جلسهٔ تعاملی",
    change: isEn ? "Change formats or regenerate" : "تغییر قالب‌ها یا ساخت دوباره",
    end: isEn ? "End session" : "پایان جلسه",
    openLibrary: isEn ? "Open Knowledge Base" : "رفتن به کتابخانهٔ دانش",
    loading: isEn ? "Loading lessons…" : "در حال بارگذاری درس‌ها…",
    loadError: isEn ? "Lessons could not be loaded." : "بارگذاری درس‌ها انجام نشد.",
    empty: isEn ? "No study-ready lessons found." : "درسی برای مطالعه پیدا نشد.",
    safetyTitle: isEn ? "Learning aid — verify clinical content" : "ابزار آموزشی — مطالب بالینی را بررسی کن",
    safetyText: isEn
      ? "AI-generated questions and scenarios can be wrong. Check medicine, dose, interaction, and legal claims against the cited source and current Australian guidance; this is not patient-specific advice."
      : "سؤال و سناریوی تولیدشده با AI ممکن است اشتباه باشد. ادعاهای دارویی، دوز، تداخل و قانونی را با منبع و راهنمای به‌روز استرالیا بررسی کن؛ این ابزار توصیهٔ اختصاصی برای بیمار نیست.",
    unreviewed: isEn ? "Source review not verified" : "بازبینی منبع تأیید نشده",
    sessionReady: isEn ? "Practice session" : "جلسهٔ تمرین",
    temporary: isEn ? "This session exists only in this page until you end or leave it." : "این جلسه فقط در همین صفحه می‌ماند تا آن را ببندی یا از صفحه خارج شوی.",
    noMatching: isEn ? "No matching lessons." : "درس منطبقی پیدا نشد.",
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background" dir={isEn ? "ltr" : "rtl"}>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-3 sm:gap-5 sm:p-5 lg:p-7">
        <header className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Gamepad2 className="h-6 w-6" /></div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-foreground sm:text-xl">{labels.title}</h1>
              <p className="mt-1 max-w-3xl text-xs leading-6 text-muted-foreground sm:text-sm">{labels.description}</p>
            </div>
          </div>
          <Button variant="outline" className="shrink-0 rounded-xl" onClick={() => navigate("/app/knowledge")}>
            <BookOpen className="me-2 h-4 w-4" />{labels.openLibrary}
          </Button>
        </header>

        <aside role="note" className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-6 text-foreground sm:p-4">
          <CircleAlert className="mt-1 h-4 w-4 shrink-0 text-amber-600" />
          <div><strong className="block">{labels.safetyTitle}</strong><span className="text-muted-foreground">{labels.safetyText}</span></div>
        </aside>

        <div className="grid min-h-[420px] min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(270px,0.8fr)_minmax(0,1.6fr)]">
          <section aria-label={labels.documents} className="flex min-h-0 min-w-0 flex-col rounded-3xl border border-border bg-card p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">{labels.documents}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{documents.length}</span>
            </div>
            <div role="group" aria-label={labels.chooseLanguage} className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {(["en", "fa"] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={language === value}
                  onClick={() => { setLanguage(value); setSessionHtml(""); }}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${language === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {value === "en" ? "English" : "فارسی"}
                </button>
              ))}
            </div>
            <label className="relative mb-3 block">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} className="rounded-xl ps-9" />
            </label>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pe-1">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{labels.loading}</div>
              ) : loadError ? (
                <p role="alert" className="py-8 text-center text-sm text-destructive">{labels.loadError}</p>
              ) : documents.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{labels.empty}</p>
              ) : filteredDocuments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{labels.noMatching}</p>
              ) : filteredDocuments.map((document) => {
                const title = language === "en" ? document.title_en?.trim() || document.title : document.title;
                const isSelected = selectedDocId === document.id;
                return (
                  <button
                    key={document.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleSelectDocument(document.id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-start transition ${isSelected ? "border-primary/50 bg-primary/5 shadow-sm" : "border-transparent hover:border-border hover:bg-muted/60"}`}
                  >
                    <span className="block truncate text-sm font-semibold">{title}</span>
                    <span className="mt-1 block truncate text-[11px] text-muted-foreground">{(document.tags || []).slice(0, 3).join(" · ") || (isEn ? "Lesson" : "درس")}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-label={labels.sessionReady} className="flex min-h-[340px] min-w-0 flex-col rounded-3xl border border-border bg-card p-4 sm:p-5">
            {sessionHtml ? (
              <>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                  <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{labels.sessionReady}</p><h2 className="mt-1 truncate text-base font-bold">{documentTitle}</h2><p className="mt-1 text-[11px] text-muted-foreground">{labels.temporary}</p>{selectedDocument?.content_review_status !== "reviewed" && <p role="note" className="mt-2 inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-[11px] text-amber-800 dark:text-amber-300"><CircleAlert className="h-3.5 w-3.5" />{labels.unreviewed}</p>}</div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setStudioOpen(true)}><Gamepad2 className="me-1.5 h-4 w-4" />{labels.change}</Button>
                    <Button variant="ghost" size="sm" className="rounded-xl" onClick={handleEndSession}><X className="me-1.5 h-4 w-4" />{labels.end}</Button>
                  </div>
                </div>
                <div ref={sessionContainerRef} dir={language === "en" ? "ltr" : "rtl"} className="knowledge-html-content min-w-0 flex-1 overflow-x-hidden">
                  <div dangerouslySetInnerHTML={{ __html: safeSessionHtml }} />
                </div>
              </>
            ) : selectedDocument ? (
              <div className="flex flex-1 flex-col justify-between gap-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{labels.chooseLanguage}</p>
                  <h2 className="mt-2 break-words text-xl font-bold">{documentTitle}</h2>
                  {selectedDocument.content_review_status !== "reviewed" && (
                    <p role="note" className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-300"><CircleAlert className="h-4 w-4" />{labels.unreviewed}</p>
                  )}
                  {selectedDocument.tags?.length ? <div className="mt-3 flex flex-wrap gap-1.5">{selectedDocument.tags.map((tag) => <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">{tag}</span>)}</div> : null}
                  {selectedDocument.source_url ? <a href={selectedDocument.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-block break-all text-xs text-primary underline-offset-4 hover:underline">{selectedDocument.source_url}</a> : null}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-muted-foreground">{labels.temporary}</p>
                  <Button className="shrink-0 rounded-xl" onClick={() => setStudioOpen(true)}>
                    <Gamepad2 className="me-2 h-4 w-4" />{labels.start}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground"><BookOpen className="h-9 w-9 opacity-50" /><p className="text-sm">{labels.selectLesson}</p></div>
            )}
          </section>
        </div>
      </main>

      {selectedDocument && (
        <InteractiveLearningModal
          open={studioOpen}
          onOpenChange={setStudioOpen}
          documentTitle={documentTitle}
          documentContent={documentContent}
          onInsertContent={handleSessionReady}
          presentationMode="standalone"
          languageOverride={language}
        />
      )}
    </div>
  );
};

export default InteractiveStudyView;
