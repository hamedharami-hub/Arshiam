import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, CircleAlert, Gamepad2, Loader2, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InteractiveLearningModal } from "@/components/knowledge/InteractiveLearningModal";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { attachInteractiveListeners } from "@/lib/interactiveLearningHelper";
import {
  createInteractiveStudySessionDraft,
  loadLatestInteractiveStudyDraft,
  persistInteractiveStudySession,
  type InteractiveStudySaveStatus,
  type InteractiveStudySession,
} from "@/lib/interactiveStudyService";
import { getKnowledgeDocuments, getKnowledgeFolders } from "@/lib/knowledgeService";
import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";
import { sanitizeKnowledgeHtml } from "@/lib/knowledgeBeautifier";
import { getSafeKnowledgeExternalUrl } from "@/lib/knowledgeReviewEvidence";

const ALL_FOLDERS = "__all__";
const UNFILED_FOLDER = "__unfiled__";
type SessionSaveUiState = "idle" | "loading" | "saving" | InteractiveStudySaveStatus;
type SessionFlushResult = InteractiveStudySaveStatus | "none";

interface StudyFolderOption {
  id: string;
  name: string;
  depth: number;
}

function flattenStudyFolders(folders: KnowledgeFolder[]): StudyFolderOption[] {
  const childrenByParent = new Map<string | null, KnowledgeFolder[]>();
  for (const folder of folders) {
    const siblings = childrenByParent.get(folder.parent_id) || [];
    siblings.push(folder);
    childrenByParent.set(folder.parent_id, siblings);
  }

  const compareFolders = (a: KnowledgeFolder, b: KnowledgeFolder) =>
    (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name);
  for (const siblings of childrenByParent.values()) siblings.sort(compareFolders);

  const visited = new Set<string>();
  const options: StudyFolderOption[] = [];
  const visit = (folder: KnowledgeFolder, depth: number) => {
    if (visited.has(folder.id)) return;
    visited.add(folder.id);
    options.push({ id: folder.id, name: folder.name, depth });
    for (const child of childrenByParent.get(folder.id) || []) visit(child, depth + 1);
  };

  for (const root of childrenByParent.get(null) || []) visit(root, 0);
  // Keep orphaned/cyclic legacy folders discoverable instead of silently hiding them.
  for (const folder of [...folders].sort(compareFolders)) {
    if (!visited.has(folder.id)) visit(folder, 0);
  }
  return options;
}

function filterStudyDocuments(
  documents: KnowledgeDocument[],
  folders: KnowledgeFolder[],
  folderFilter: string,
  search: string,
): KnowledgeDocument[] {
  const folderIds = new Set(folders.map((folder) => folder.id));
  let scopedDocuments = documents;

  if (folderFilter === UNFILED_FOLDER) {
    scopedDocuments = documents.filter((document) => !document.folder_id || !folderIds.has(document.folder_id));
  } else if (folderFilter !== ALL_FOLDERS) {
    const includedFolderIds = new Set([folderFilter]);
    let hasNewDescendants = true;
    while (hasNewDescendants) {
      hasNewDescendants = false;
      for (const folder of folders) {
        if (folder.parent_id && includedFolderIds.has(folder.parent_id) && !includedFolderIds.has(folder.id)) {
          includedFolderIds.add(folder.id);
          hasNewDescendants = true;
        }
      }
    }
    scopedDocuments = documents.filter(
      (document) => Boolean(document.folder_id && includedFolderIds.has(document.folder_id)),
    );
  }

  const query = search.trim().normalize("NFC").toLocaleLowerCase();
  if (!query) return scopedDocuments;
  return scopedDocuments.filter((document) =>
    [document.title, document.title_en, ...(document.tags || [])]
      .filter(Boolean)
      .some((value) => value!.normalize("NFC").toLocaleLowerCase().includes(query)),
  );
}

export const InteractiveStudyView: React.FC = () => {
  const { user } = useAuth();
  const { isEn } = useBilingual();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [folders, setFolders] = useState<KnowledgeFolder[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isLessonPickerCollapsed, setIsLessonPickerCollapsed] = useState(false);
  const [folderFilter, setFolderFilter] = useState(ALL_FOLDERS);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState<"en" | "fa">("en");
  const [sessionHtml, setSessionHtml] = useState("");
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [draftLoadError, setDraftLoadError] = useState("");
  const [sessionSaveState, setSessionSaveState] = useState<SessionSaveUiState>("idle");
  const [sessionSaveError, setSessionSaveError] = useState("");
  const [isRestoredDraft, setIsRestoredDraft] = useState(false);
  const [sessionNotice, setSessionNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const lessonSearchRef = useRef<HTMLInputElement>(null);
  const sessionContainerRef = useRef<HTMLDivElement>(null);
  const activeSessionRef = useRef<InteractiveStudySession | null>(null);
  const draftLoadSequenceRef = useRef(0);
  const isEnRef = useRef(isEn);
  isEnRef.current = isEn;
  const sessionSaveQueueRef = useRef<Promise<SessionFlushResult>>(Promise.resolve("none"));
  const documentChangeSequenceRef = useRef(0);
  const languageChangeSequenceRef = useRef(0);
  const pendingSessionHtmlRef = useRef<string | null>(null);
  const sessionSaveTimerRef = useRef<number | null>(null);
  const persistSessionHtmlRef = useRef<(html: string) => Promise<SessionFlushResult>>(async () => "none");
  const flushPendingSessionSaveRef = useRef<() => Promise<SessionFlushResult>>(async () => "none");

  useEffect(() => {
    let isCurrent = true;
    const loadDocuments = async () => {
      if (!user?.id) {
        setDocuments([]);
        setFolders([]);
        setSelectedDocId(null);
        setIsLessonPickerCollapsed(false);
        setFolderFilter(ALL_FOLDERS);
        setSearch("");
        setSessionHtml("");
        setStudioOpen(false);
        setIsLoading(false);
        return;
      }

      setSelectedDocId(null);
      setIsLessonPickerCollapsed(false);
      setSessionHtml("");
      setStudioOpen(false);
      setFolderFilter(ALL_FOLDERS);
      setSearch("");
      setIsLoading(true);
      setLoadError(false);
      try {
        const [rows, folderRows] = await Promise.all([
          getKnowledgeDocuments(user.id),
          getKnowledgeFolders(user.id).catch((error) => {
            console.warn("Could not load study folders; showing all lessons", error);
            return [];
          }),
        ]);
        if (!isCurrent) return;
        const available = rows.filter((doc) => !doc.is_archived && Boolean(doc.content_html || doc.content_en));
        setFolders(folderRows);
        setDocuments(available);
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
      void flushPendingSessionSaveRef.current();
    };
  }, [user?.id]);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocId) || null,
    [documents, selectedDocId]
  );

  const folderOptions = useMemo(() => flattenStudyFolders(folders), [folders]);

  const filteredDocuments = useMemo(
    () => filterStudyDocuments(documents, folders, folderFilter, search),
    [documents, folders, folderFilter, search],
  );

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
  const safeSourceUrl = getSafeKnowledgeExternalUrl(selectedDocument?.source_url);

  const safeSessionHtml = useMemo(() => sanitizeKnowledgeHtml(sessionHtml), [sessionHtml]);
  const safeDocumentPreviewHtml = useMemo(() => sanitizeKnowledgeHtml(documentContent), [documentContent]);

  const persistSessionHtml = useCallback(async (html: string): Promise<SessionFlushResult> => {
    const current = activeSessionRef.current;
    if (!current) return "none";

    const operation = sessionSaveQueueRef.current
      .catch((): SessionFlushResult => "failed")
      .then(async () => {
        const result = await persistInteractiveStudySession({
          ...current,
          content_html: sanitizeKnowledgeHtml(html),
        });
        if (activeSessionRef.current?.id === current.id) {
          activeSessionRef.current = result.session;
          setSessionSaveState(result.status);
          setSessionSaveError(result.error || "");
        }
        return result.status;
      })
      .catch((error): SessionFlushResult => {
        if (activeSessionRef.current?.id === current.id) {
          setSessionSaveState("failed");
          setSessionSaveError(error instanceof Error ? error.message : "Session progress could not be saved.");
        }
        return "failed";
      });
    sessionSaveQueueRef.current = operation;
    return operation;
  }, []);
  persistSessionHtmlRef.current = persistSessionHtml;

  const flushPendingSessionSave = useCallback(async (): Promise<SessionFlushResult> => {
    if (sessionSaveTimerRef.current !== null) {
      window.clearTimeout(sessionSaveTimerRef.current);
      sessionSaveTimerRef.current = null;
    }
    const html = pendingSessionHtmlRef.current;
    pendingSessionHtmlRef.current = null;
    if (html === null) return sessionSaveQueueRef.current;
    return persistSessionHtmlRef.current(html);
  }, []);
  flushPendingSessionSaveRef.current = flushPendingSessionSave;

  const scheduleSessionSave = useCallback((html: string) => {
    if (!activeSessionRef.current) return;
    pendingSessionHtmlRef.current = html;
    setSessionSaveState("saving");
    setIsRestoredDraft(false);
    setSessionSaveError("");
    if (sessionSaveTimerRef.current !== null) window.clearTimeout(sessionSaveTimerRef.current);
    sessionSaveTimerRef.current = window.setTimeout(() => {
      sessionSaveTimerRef.current = null;
      void flushPendingSessionSaveRef.current();
    }, 650);
  }, []);

  useEffect(() => {
    const container = sessionContainerRef.current;
    if (!container || !safeSessionHtml) return;
    return attachInteractiveListeners(container, scheduleSessionSave, language);
  }, [language, safeSessionHtml, scheduleSessionSave]);

  useEffect(() => () => {
    void flushPendingSessionSaveRef.current();
  }, []);

  useEffect(() => {
    if (!sessionHtml || !activeSessionRef.current || (sessionSaveState !== "saving" && sessionSaveState !== "failed")) return;
    const guardUnsavedExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guardUnsavedExit);
    return () => window.removeEventListener("beforeunload", guardUnsavedExit);
  }, [sessionHtml, sessionSaveState]);

  const loadSelectedDraft = useCallback(async (userId: string, documentId: string, draftLanguage: "en" | "fa") => {
    const requestSequence = ++draftLoadSequenceRef.current;
    activeSessionRef.current = null;
    setIsLoadingDraft(true);
    setDraftLoadError("");
    setSessionHtml("");
    setIsRestoredDraft(false);
    setSessionSaveError("");
    setSessionSaveState("loading");
    setSessionNotice("");

    try {
      const result = await loadLatestInteractiveStudyDraft(userId, documentId, draftLanguage);
      if (requestSequence !== draftLoadSequenceRef.current) return;
      setIsLoadingDraft(false);
      if (result.ok === false) {
        setDraftLoadError(result.error);
        setSessionSaveState("idle");
        return;
      }
      if (result.session) {
        activeSessionRef.current = result.session;
        setSessionHtml(result.session.content_html);
        setIsRestoredDraft(true);
        setSessionSaveState("saved");
      } else {
        setSessionSaveState("idle");
      }
    } catch (error) {
      if (requestSequence !== draftLoadSequenceRef.current) return;
      console.warn("Could not load interactive study draft", error);
      setIsLoadingDraft(false);
      setDraftLoadError(error instanceof Error ? error.message : "Saved practice could not be checked.");
      setSessionSaveState("idle");
    }
  }, []);

  useEffect(() => {
    if (!user?.id || !selectedDocId || selectedDocument?.id !== selectedDocId || selectedDocument.user_id !== user.id) {
      draftLoadSequenceRef.current += 1;
      activeSessionRef.current = null;
      setIsLoadingDraft(false);
      setDraftLoadError("");
      setSessionHtml("");
      setIsRestoredDraft(false);
      setSessionSaveError("");
      setSessionSaveState("idle");
      setSessionNotice("");
      return;
    }

    void loadSelectedDraft(user.id, selectedDocId, language);
    return () => { draftLoadSequenceRef.current += 1; };
  }, [language, loadSelectedDraft, selectedDocId, selectedDocument?.id, selectedDocument?.user_id, user?.id]);

  const handleRetryDraftLoad = useCallback(() => {
    if (isLoadingDraft || !user?.id || !selectedDocument || selectedDocument.user_id !== user.id) return;
    void loadSelectedDraft(user.id, selectedDocument.id, language);
  }, [isLoadingDraft, language, loadSelectedDraft, selectedDocument, user?.id]);

  const handleBrowseLessons = useCallback(() => {
    const input = lessonSearchRef.current;
    if (!input) return;
    input.focus();
    input.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }, []);

  const handleChangeLesson = useCallback(() => {
    setIsLessonPickerCollapsed(false);
  }, []);

  useEffect(() => {
    if (isLessonPickerCollapsed || !selectedDocId) return;
    handleBrowseLessons();
  }, [handleBrowseLessons, isLessonPickerCollapsed, selectedDocId]);

  const handleSelectDocument = useCallback((documentId: string) => {
    if (documentId === selectedDocId) return;
    const requestSequence = ++documentChangeSequenceRef.current;
    void (async () => {
      const result = await flushPendingSessionSaveRef.current();
      if (result === "failed" || requestSequence !== documentChangeSequenceRef.current) return;
      const document = documents.find((candidate) => candidate.id === documentId && candidate.user_id === user?.id);
      if (!document) return;
      setSelectedDocId(documentId);
      setIsLessonPickerCollapsed(true);
      setSessionHtml("");
    })();
  }, [documents, selectedDocId, user?.id]);

  const handleLanguageChange = useCallback((nextLanguage: "en" | "fa") => {
    if (nextLanguage === language) return;
    const requestSequence = ++languageChangeSequenceRef.current;
    void (async () => {
      const result = await flushPendingSessionSaveRef.current();
      if (result === "failed" || requestSequence !== languageChangeSequenceRef.current) return;
      setLanguage(nextLanguage);
      setSessionHtml("");
    })();
  }, [language]);

  const handleSessionReady = useCallback(async (html: string) => {
    const result = await flushPendingSessionSaveRef.current();
    if (result === "failed" || !user?.id || !selectedDocument || selectedDocument.user_id !== user.id) return;

    const session = createInteractiveStudySessionDraft(
      user.id,
      selectedDocument.id,
      documentTitle,
      language,
      html,
    );
    activeSessionRef.current = session;
    pendingSessionHtmlRef.current = null;
    setSessionHtml(session.content_html);
    setIsRestoredDraft(false);
    setSessionNotice("");
    setSessionSaveError("");
    setSessionSaveState("saving");
    await persistSessionHtmlRef.current(session.content_html);
  }, [documentTitle, language, selectedDocument, user?.id]);

  const finishCompletedSessionUi = useCallback((saveResult: InteractiveStudySaveStatus) => {
    activeSessionRef.current = null;
    setSessionHtml("");
    setIsRestoredDraft(false);
    setSessionNotice(saveResult === "queued"
      ? (isEn ? "Completed locally; cloud sync is pending." : "جلسه در دستگاه تکمیل شد؛ همگام‌سازی ابری در صف است.")
      : (isEn ? "Session completed and saved." : "جلسه تکمیل و ذخیره شد."));
  }, [isEn]);

  const handleEndSession = useCallback(() => {
    void (async () => {
      const flushResult = await flushPendingSessionSaveRef.current();
      if (flushResult === "failed") return;
      const current = activeSessionRef.current;
      if (!current) {
        setSessionHtml("");
        return;
      }

      const liveHtml = sessionContainerRef.current?.innerHTML || current.content_html;
      activeSessionRef.current = {
        ...current,
        content_html: sanitizeKnowledgeHtml(liveHtml),
        status: "completed",
      };
      setSessionSaveState("saving");
      const saveResult = await persistSessionHtmlRef.current(liveHtml);
      if (saveResult === "failed" || saveResult === "none") {
        if (saveResult === "none") {
          setSessionSaveState("failed");
          setSessionSaveError(isEn ? "The session is no longer available to save." : "جلسهٔ فعال برای ذخیره پیدا نشد.");
        }
        return;
      }

      finishCompletedSessionUi(saveResult);
    })();
  }, [finishCompletedSessionUi, isEn]);

  const handleRetrySessionSave = useCallback(() => {
    const current = activeSessionRef.current;
    const currentHtml = sessionContainerRef.current?.innerHTML || current?.content_html;
    if (!currentHtml) return;
    setSessionSaveState("saving");
    setSessionSaveError("");
    void (async () => {
      const saveResult = await persistSessionHtmlRef.current(currentHtml);
      if (saveResult === "none") {
        setSessionSaveState("failed");
        setSessionSaveError(isEn ? "The session is no longer available to save." : "جلسهٔ فعال برای ذخیره پیدا نشد.");
        return;
      }
      if (current?.status === "completed" && saveResult !== "failed" && activeSessionRef.current?.id === current.id) {
        finishCompletedSessionUi(saveResult);
      }
    })();
  }, [finishCompletedSessionUi, isEn]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    const matches = filterStudyDocuments(documents, folders, folderFilter, value);
    if (selectedDocId && !matches.some((document) => document.id === selectedDocId)) {
      void (async () => {
        const result = await flushPendingSessionSaveRef.current();
        if (result === "failed") return;
        setSelectedDocId(null);
        setIsLessonPickerCollapsed(false);
        setSessionHtml("");
        setStudioOpen(false);
      })();
    }
  }, [documents, folderFilter, folders, selectedDocId]);

  const handleFolderChange = useCallback((value: string) => {
    setFolderFilter(value);
    const matches = filterStudyDocuments(documents, folders, value, search);
    if (selectedDocId && !matches.some((document) => document.id === selectedDocId)) {
      void (async () => {
        const result = await flushPendingSessionSaveRef.current();
        if (result === "failed") return;
        setSelectedDocId(null);
        setIsLessonPickerCollapsed(false);
        setSessionHtml("");
        setStudioOpen(false);
      })();
    }
  }, [documents, folders, search, selectedDocId]);

  const saveStatusText = sessionSaveState === "loading"
    ? (isEn ? "Checking saved practice…" : "در حال بررسی جلسهٔ ذخیره‌شده…")
    : sessionSaveState === "saving"
      ? (isEn ? "Saving progress…" : "در حال ذخیرهٔ پیشرفت…")
      : sessionSaveState === "saved"
        ? (isRestoredDraft
          ? (isEn ? "Saved session restored" : "جلسهٔ ذخیره‌شده بازیابی شد")
          : (isEn ? "Saved to your account" : "در حساب شما ذخیره شد"))
        : sessionSaveState === "queued"
          ? (isEn ? "Saved on this device — sync pending" : "در این دستگاه ذخیره شد؛ همگام‌سازی در صف است")
          : sessionSaveState === "failed"
            ? (isEn ? "Progress is not saved yet" : "پیشرفت هنوز ذخیره نشده است")
            : "";

  const labels = {
    folderFilter: isEn ? "Filter by folder" : "فیلتر بر اساس پوشه",
    allLessons: isEn ? "All lessons" : "همهٔ درس‌ها",
    unfiled: isEn ? "Unfiled" : "بدون پوشه",
    title: isEn ? "Interactive Study Studio" : "استودیوی مطالعهٔ تعاملی",
    description: isEn
      ? "Turn a Knowledge lesson into AI-generated practice, try it, and resume later. Your lesson stays unchanged; practice is separate from Leitner."
      : "از یک درس در کتابخانهٔ دانش، تمرین تعاملی با هوش مصنوعی بساز، انجامش بده و بعداً ادامه بده. متن درس تغییر نمی‌کند و تمرین از لایتنر جداست.",
    documents: isEn ? "Your lessons" : "درس‌های شما",
    search: isEn ? "Search lessons or tags…" : "جست‌وجوی درس یا برچسب…",
    selectLesson: isEn ? "Select a lesson to begin" : "برای شروع یک درس انتخاب کن",
    emptyDescription: isEn
      ? "Interactive Study turns one Knowledge lesson into a separate practice session. Choose a lesson, build the activities you want, then continue from your saved progress."
      : "مطالعهٔ تعاملی، یک درس از کتابخانهٔ دانش را به جلسه‌ای جداگانه برای تمرین تبدیل می‌کند. درس را انتخاب کن، تمرین‌های دلخواهت را بساز و بعداً از پیشرفت ذخیره‌شده ادامه بده.",
    emptyStepsTitle: isEn ? "How it works" : "روش کار",
    emptyStepChoose: isEn ? "Choose a lesson" : "یک درس انتخاب کن",
    emptyStepBuild: isEn ? "Choose formats and generate" : "قالب‌ها را انتخاب و تولید کن",
    emptyStepPractice: isEn ? "Practice; progress saves separately" : "تمرین کن؛ پیشرفت جدا ذخیره می‌شود",
    emptyFormats: isEn
      ? "Flashcards · quizzes · matching · cases · decision trees · memory games"
      : "فلش‌کارت · آزمون · تطبیق · سناریو · درخت تصمیم · بازی حافظه",
    browseLessons: isEn ? "Browse lessons" : "رفتن به فهرست درس‌ها",
    chooseLanguage: isEn ? "Study language" : "زبان مطالعه",
    start: isEn ? "Build practice from this lesson" : "ساخت تمرین از این درس",
    selectedLesson: isEn ? "Selected lesson" : "درس انتخاب‌شده",
    changeLesson: isEn ? "Change lesson" : "تغییر درس",
    whatYouCanPractice: isEn ? "What can I practice here?" : "اینجا چه تمرین‌هایی می‌توانم بسازم؟",
    workflow: isEn ? "Study flow" : "مسیر مطالعه",
    stepSource: isEn ? "Choose a lesson" : "انتخاب درس",
    stepFormats: isEn ? "Choose practice" : "انتخاب تمرین",
    stepPractice: isEn ? "Practice & save" : "تمرین و ذخیره",
    sourcePreview: isEn ? "Review the lesson used for practice" : "متن درسی را که مبنای تمرین است ببین",
    sourcePreviewHint: isEn ? "The generator uses this lesson only; it does not change the source." : "هوش مصنوعی فقط از همین درس استفاده می‌کند و متن اصلی را تغییر نمی‌دهد.",
    practiceFormats: isEn
      ? "Flashcards, quizzes, matching games, step-by-step cases, fill-in-the-blanks, decision trees, and memory games."
      : "فلش‌کارت، آزمون، بازی تطبیق، سناریوی مرحله‌ای، جای‌خالی، درخت تصمیم و بازی حافظه.",
    nextStep: isEn
      ? "Choose one or more formats, generate a preview, then start the practice session."
      : "یک یا چند قالب را انتخاب کن، پیش‌نمایش بساز و بعد جلسهٔ تمرین را شروع کن.",
    separateFromLeitner: isEn
      ? "Practice progress is saved separately. This does not create Leitner cards or review tasks."
      : "پیشرفت تمرین جداگانه ذخیره می‌شود؛ این بخش کارت لایتنر یا تسک مرور نمی‌سازد.",
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
    autosave: isEn ? "Your interaction progress is saved separately from the source lesson." : "پیشرفت تعامل‌ها جدا از متن درس ذخیره می‌شود.",
    draftLoadError: isEn ? "A saved session could not be checked. Starting a new one will not delete older data." : "جلسه‌های قبلی بررسی نشدند؛ ساخت جلسهٔ تازه دادهٔ قبلی را حذف نمی‌کند.",
    retryDraftLoad: isEn ? "Retry check" : "بررسی دوباره",
    draftLoadErrorDetails: isEn ? "Technical details" : "جزئیات فنی",
    loadingDraft: isEn ? "Checking for a saved session…" : "در حال بررسی جلسهٔ ذخیره‌شده…",
    restored: isEn ? "Continue your saved session." : "جلسهٔ ذخیره‌شده را ادامه بده.",
    retrySave: isEn ? "Retry save" : "تلاش دوباره برای ذخیره",
    noMatching: isEn ? "No matching lessons." : "درس منطبقی پیدا نشد.",
    sessionCompleted: isEn ? "Session completed." : "جلسه تکمیل شد.",
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

        <div className="grid min-h-[420px] min-w-0 grid-cols-1 gap-4 min-[720px]:h-[68vh] min-[720px]:max-h-[680px] min-[720px]:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.5fr)] lg:grid-cols-[minmax(270px,0.8fr)_minmax(0,1.6fr)]">
          <section data-testid="interactive-study-lesson-picker" aria-label={labels.documents} className={`${isLessonPickerCollapsed && selectedDocument ? "hidden min-[720px]:flex" : "flex"} min-h-0 min-w-0 flex-col rounded-3xl border border-border bg-card p-3 sm:p-4`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">{labels.documents}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground" aria-live="polite">
                {filteredDocuments.length}{filteredDocuments.length !== documents.length ? ` / ${documents.length}` : ""}
              </span>
            </div>
            <div role="group" aria-label={labels.chooseLanguage} className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {(["en", "fa"] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={language === value}
                  onClick={() => handleLanguageChange(value)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${language === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {value === "en" ? "English" : "فارسی"}
                </button>
              ))}
            </div>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">{labels.folderFilter}</span>
              <select
                aria-label={labels.folderFilter}
                value={folderFilter}
                onChange={(event) => handleFolderChange(event.target.value)}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value={ALL_FOLDERS}>{labels.allLessons}</option>
                <option value={UNFILED_FOLDER}>{labels.unfiled}</option>
                {folderOptions.map((folder) => (
                  <option key={folder.id} value={folder.id}>{`${"　".repeat(Math.min(folder.depth, 6))}${folder.name}`}</option>
                ))}
              </select>
            </label>
            <label className="relative mb-3 block">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input ref={lessonSearchRef} value={search} onChange={(event) => handleSearchChange(event.target.value)} placeholder={labels.search} className="rounded-xl ps-9" />
            </label>
            <div className="min-h-0 max-h-64 flex-1 space-y-1 overflow-y-auto pe-1 min-[720px]:max-h-none">
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

          <section aria-label={labels.sessionReady} className="flex min-h-[340px] min-w-0 flex-col overflow-y-auto rounded-3xl border border-border bg-card p-4 sm:p-5 min-[720px]:min-h-0">
            {selectedDocument && (
              <ol aria-label={labels.workflow} className="mb-4 grid grid-cols-3 gap-2">
                {[labels.stepSource, labels.stepFormats, labels.stepPractice].map((step, index) => {
                  const activeStep = sessionHtml ? 2 : 1;
                  const isComplete = index < activeStep;
                  const isCurrent = index === activeStep;
                  return (
                    <li
                      key={step}
                      aria-current={isCurrent ? "step" : undefined}
                      className={`min-w-0 rounded-xl border px-2 py-2 text-center text-[10px] leading-4 sm:text-xs ${isCurrent ? "border-primary/40 bg-primary/5 text-foreground" : isComplete ? "border-emerald-500/20 bg-emerald-500/5 text-foreground" : "border-border bg-muted/25 text-muted-foreground"}`}
                    >
                      <span className={`mx-auto mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${isCurrent ? "bg-primary text-primary-foreground" : isComplete ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                        {isComplete ? "✓" : index + 1}
                      </span>
                      <span className="block break-words">{step}</span>
                    </li>
                  );
                })}
              </ol>
            )}
            {sessionHtml ? (
              <>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{labels.sessionReady}</p>
                    <h2 className="mt-1 truncate text-base font-bold">{documentTitle}</h2>
                    <p className="mt-1 text-[11px] text-muted-foreground">{labels.autosave}</p>
                    {isRestoredDraft && <p className="mt-1 text-[11px] text-muted-foreground">{labels.restored}</p>}
                    {saveStatusText && <p role="status" aria-live="polite" className="mt-1 text-[11px] text-muted-foreground">{saveStatusText}</p>}
                    {sessionSaveError && <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-xs text-destructive">
                      <span>{sessionSaveError}</span>
                      <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={handleRetrySessionSave}>{labels.retrySave}</Button>
                    </div>}
                    {selectedDocument?.content_review_status !== "reviewed" && <p role="note" className="mt-2 inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-[11px] text-amber-800 dark:text-amber-300"><CircleAlert className="h-3.5 w-3.5" />{labels.unreviewed}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" className="rounded-xl min-[720px]:hidden" onClick={handleChangeLesson}>
                      <BookOpen className="me-1.5 h-4 w-4" />{labels.changeLesson}
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setStudioOpen(true)}><Gamepad2 className="me-1.5 h-4 w-4" />{labels.change}</Button>
                    <Button variant="ghost" size="sm" className="rounded-xl" onClick={handleEndSession}><X className="me-1.5 h-4 w-4" />{labels.end}</Button>
                  </div>
                </div>
                <div dir={language === "en" ? "ltr" : "rtl"} className="knowledge-html-content min-w-0 flex-1 overflow-x-hidden">
                  <div ref={sessionContainerRef} dangerouslySetInnerHTML={{ __html: safeSessionHtml }} />
                </div>
              </>
            ) : isLoadingDraft ? (
              <div role="status" className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{labels.loadingDraft}</div>
            ) : selectedDocument ? (
              <div className="flex flex-1 flex-col justify-between gap-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{labels.selectedLesson}</p>
                  <h2 className="mt-2 break-words text-xl font-bold">{documentTitle}</h2>
                  <Button type="button" variant="outline" size="sm" className="mt-3 rounded-xl min-[720px]:hidden" onClick={handleChangeLesson}>
                    <BookOpen className="me-1.5 h-4 w-4" />{labels.changeLesson}
                  </Button>
                  {draftLoadError && (
                    <div role="alert" className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs leading-5 text-amber-800 dark:text-amber-300">
                      <p>{labels.draftLoadError}</p>
                      <div className="mt-2 flex flex-wrap items-start gap-3">
                        <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={handleRetryDraftLoad} disabled={isLoadingDraft}>
                          {labels.retryDraftLoad}
                        </Button>
                        <details className="min-w-0 flex-1">
                          <summary className="cursor-pointer underline underline-offset-2">{labels.draftLoadErrorDetails}</summary>
                          <code dir="ltr" className="mt-1 block max-h-20 overflow-auto break-words text-[10px] text-muted-foreground">{draftLoadError.slice(0, 300)}</code>
                        </details>
                      </div>
                    </div>
                  )}
                  {sessionNotice && <p role="status" className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-5">{sessionNotice}</p>}
                  {selectedDocument.content_review_status !== "reviewed" && (
                    <p role="note" className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-300"><CircleAlert className="h-4 w-4" />{labels.unreviewed}</p>
                  )}
                  {selectedDocument.tags?.length ? <div className="mt-3 flex flex-wrap gap-1.5">{selectedDocument.tags.map((tag) => <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">{tag}</span>)}</div> : null}
                  {safeSourceUrl ? <a href={safeSourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block break-all text-xs text-primary underline-offset-4 hover:underline">{safeSourceUrl}</a> : null}
                  <details className="mt-3 rounded-2xl border border-border bg-muted/20">
                    <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-foreground marker:text-primary">{labels.sourcePreview}</summary>
                    <div className="border-t border-border px-3 py-3">
                      <p className="mb-2 text-[11px] leading-5 text-muted-foreground">{labels.sourcePreviewHint}</p>
                      <div dir={language === "en" ? "ltr" : "rtl"} className="knowledge-html-content max-h-64 overflow-y-auto rounded-xl bg-background p-3 text-xs leading-6" dangerouslySetInnerHTML={{ __html: safeDocumentPreviewHtml }} />
                    </div>
                  </details>
                  <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/[0.035] p-3 sm:p-4">
                    <h3 className="text-sm font-semibold">{labels.whatYouCanPractice}</h3>
                    <p className="mt-1.5 text-xs leading-6 text-muted-foreground">{labels.practiceFormats}</p>
                    <p className="mt-2 border-t border-border/70 pt-2 text-xs leading-5 text-muted-foreground">{labels.separateFromLeitner}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-muted-foreground">{labels.nextStep}</p>
                  <Button className="shrink-0 rounded-xl" onClick={() => setStudioOpen(true)}>
                    <Gamepad2 className="me-2 h-4 w-4" />{labels.start}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-1 py-5 text-center">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary"><BookOpen className="h-7 w-7" aria-hidden="true" /></div>
                <div className="space-y-2">
                  <h2 className="text-base font-bold text-foreground">{labels.selectLesson}</h2>
                  <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground">{labels.emptyDescription}</p>
                </div>
                <div className="w-full max-w-2xl space-y-2">
                  <p className="text-xs font-semibold text-foreground">{labels.emptyStepsTitle}</p>
                  <ol className="grid gap-2 text-start sm:grid-cols-3">
                    {[labels.emptyStepChoose, labels.emptyStepBuild, labels.emptyStepPractice].map((step, index) => (
                      <li key={step} className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-2.5 text-xs leading-5 text-muted-foreground">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary" aria-hidden="true">{index + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <p className="max-w-xl text-xs leading-5 text-muted-foreground">{labels.emptyFormats}</p>
                <Button type="button" variant="outline" className="rounded-xl" onClick={handleBrowseLessons}>
                  <Search className="me-2 h-4 w-4" />{labels.browseLessons}
                </Button>
              </div>
            )}
          </section>
        </div>
      </main>

      {selectedDocument && (
        <InteractiveLearningModal
          documentId={selectedDocument.id}
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
