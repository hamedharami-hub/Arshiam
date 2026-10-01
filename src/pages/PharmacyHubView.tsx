import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, ChevronDown, GraduationCap, History, ExternalLink, FolderClosed, Layers3, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import PharmacyShortcuts from "@/components/PharmacyShortcuts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { PharmacyStatusBadge, type LessonStatus } from "@/components/pharmacy/PharmacyStatusBadge";
import { getLastStudy, getStudiedDocIds, syncStudiedDocs } from "@/lib/lastStudy";
import { getLeitnerCards } from "@/lib/leitnerService";
import { PHARMACY_ROOT_FOLDER_ID } from "@/lib/pharmacyConstants";
import { splitPharmacyRootFolders } from "@/lib/pharmacyCategorySections";
import { getKnowledgeDocuments, getKnowledgeFolders } from "@/lib/knowledgeService";
import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";
import { PharmacyLessonCollection } from "@/components/pharmacy/PharmacyLessonCollection";
import { buildPharmacyLessonCollections, pharmacyDescendantLessons } from "@/lib/pharmacyLessonCollections";
import "./PharmacyHubView.css";

function knowledgeFolderUrl(folderId: string) {
  return `/app/knowledge?folderId=${encodeURIComponent(folderId)}`;
}

function sortFolders(a: KnowledgeFolder, b: KnowledgeFolder) {
  return (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name);
}

export default function PharmacyHubView() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const [folders, setFolders] = useState<KnowledgeFolder[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const openCategoryId = searchParams.get("pharmacyCategory");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const userId = user?.id || "anonymous-kb-user";
  const lastStudy = useMemo(() => getLastStudy(userId), [userId]);
  const [practisedDocIds, setPractisedDocIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    let active = true;
    setPractisedDocIds(new Set());
    void getLeitnerCards(userId).then((cards) => {
      if (active) setPractisedDocIds(new Set(cards.filter((card) => card.document_id && card.review_count > 0).map((card) => card.document_id as string)));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [userId]);
  const [studiedDocIds, setStudiedDocIds] = useState<Set<string>>(() => getStudiedDocIds(userId));
  useEffect(() => {
    let active = true;
    setStudiedDocIds(getStudiedDocIds(userId));
    void syncStudiedDocs(userId).then((ids) => { if (active) setStudiedDocIds(ids); }).catch(() => undefined);
    return () => { active = false; };
  }, [userId]);
  const statusOf = (docId: string): LessonStatus => practisedDocIds.has(docId) ? "practised" : studiedDocIds.has(docId) || lastStudy?.docId === docId ? "learning" : "not_started";

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadFailed(false);
    setFolders([]);
    setDocuments([]);
    void Promise.all([getKnowledgeFolders(userId), getKnowledgeDocuments(userId)]).then(([savedFolders, savedDocuments]) => {
      if (active) { setFolders(savedFolders); setDocuments(savedDocuments); }
    }).catch(() => {
      if (active) setLoadFailed(true);
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [userId, loadAttempt]);

  const { categories, additional } = useMemo(() => {
    const rootFolders = splitPharmacyRootFolders(
      folders.filter((folder) => folder.parent_id === PHARMACY_ROOT_FOLDER_ID),
    );
    return {
      categories: rootFolders.main.map((folder) => ({
        ...folder,
        subfolders: folders.filter((child) => child.parent_id === folder.id).sort(sortFolders),
      })),
      additional: rootFolders.additional,
    };
  }, [folders]);

  const childFolders = useMemo(() => {
    const index = new Map<string, KnowledgeFolder[]>();
    for (const folder of folders) {
      const siblings = index.get(folder.parent_id ?? "") ?? [];
      siblings.push(folder);
      index.set(folder.parent_id ?? "", siblings);
    }
    for (const siblings of index.values()) siblings.sort(sortFolders);
    return index;
  }, [folders]);

  const folderDocuments = useMemo(() => {
    const index = new Map<string, KnowledgeDocument[]>();
    for (const document of documents) {
      const siblings = index.get(document.folder_id ?? "") ?? [];
      siblings.push(document);
      index.set(document.folder_id ?? "", siblings);
    }
    for (const siblings of index.values()) siblings.sort((a, b) => a.title.localeCompare(b.title));
    return index;
  }, [documents]);

  const visibleCategories = useMemo(() => {
    const query = categoryQuery.trim().toLocaleLowerCase();
    if (!query) return categories;
    const matchesFolder = (id: string, seen: Set<string>): boolean => {
      if (seen.has(id)) return false;
      seen.add(id);
      if ((folderDocuments.get(id) ?? []).some((lesson) =>
        `${lesson.title} ${lesson.title_en ?? ""}`.toLocaleLowerCase().includes(query))) return true;
      return (childFolders.get(id) ?? []).some((folder) =>
        folder.name.toLocaleLowerCase().includes(query) || matchesFolder(folder.id, seen));
    };
    return categories.filter((category) =>
      category.name.toLocaleLowerCase().includes(query) ||
      matchesFolder(category.id, new Set()),
    );
  }, [categories, categoryQuery, childFolders, folderDocuments]);

  const lessonCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const parents = new Map(folders.map((folder) => [folder.id, folder.parent_id]));
    for (const [folderId, lessons] of folderDocuments) {
      const seen = new Set<string>();
      let id: string | null | undefined = folderId;
      while (id && !seen.has(id)) {
        seen.add(id);
        counts.set(id, (counts.get(id) ?? 0) + lessons.length);
        id = parents.get(id);
      }
    }
    return counts;
  }, [folders, folderDocuments]);

  const searchResults = useMemo(() => {
    const query = categoryQuery.trim().toLocaleLowerCase();
    if (!query) return [];
    const scope = new Set<string>();
    const pending = [...categories, ...additional].map((folder) => folder.id);
    while (pending.length) {
      const id = pending.pop()!;
      if (scope.has(id)) continue;
      scope.add(id);
      pending.push(...(childFolders.get(id) ?? []).map((folder) => folder.id));
    }
    return documents.filter((lesson) => scope.has(lesson.folder_id ?? "") &&
      `${lesson.title} ${lesson.title_en ?? ""}`.toLocaleLowerCase().includes(query));
  }, [categoryQuery, categories, additional, childFolders, documents]);

  const lastPharmacyDocument = useMemo(() => pharmacyDescendantLessons(PHARMACY_ROOT_FOLDER_ID, folders, documents).find(document => document.id === lastStudy?.docId), [folders, documents, lastStudy?.docId]);

  function renderLessons(lessons: KnowledgeDocument[]) {
    if (!lessons.length) return null;
    return <ul className="pharmacy-lesson-list">
      {lessons.map((lesson) => <li key={lesson.id}>
        <Link to={`/app/knowledge?docId=${encodeURIComponent(lesson.id)}`} data-testid={`pharmacy-lesson-${lesson.id}`} className="pharmacy-lesson-link" data-current={lastStudy?.docId === lesson.id || undefined}>
          <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" /><span dir="auto">{isEn ? lesson.title_en || lesson.title : lesson.title}</span>
          {lastStudy?.docId === lesson.id && <span className="pharmacy-lesson-badge">{T("آخرین مطالعه", "Last studied")}</span>}
          <span className={lastStudy?.docId === lesson.id ? "" : "ms-auto"}><PharmacyStatusBadge status={statusOf(lesson.id)} testId={`pharmacy-lesson-status-${lesson.id}`} /></span>
        </Link>
      </li>)}
    </ul>;
  }

  function renderFolder(folder: KnowledgeFolder, depth: number) {
    const children = depth < 12 ? childFolders.get(folder.id) ?? [] : [];
    const lessons = folderDocuments.get(folder.id) ?? [];
    const lessonCount = lessonCounts.get(folder.id) ?? 0;
    return <details key={folder.id} data-testid={`pharmacy-subcategory-${folder.id}`} className="pharmacy-folder">
      <summary className="pharmacy-folder-summary">
        <FolderClosed className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="pharmacy-folder-name">{folder.name}</span>
        <span className="pharmacy-folder-count">{T(`${lessonCount} درس`, `${lessonCount} lessons`)}</span>
        <ChevronDown className="pharmacy-folder-chevron h-4 w-4 shrink-0" aria-hidden="true" />
      </summary>
      <div className="pharmacy-folder-content">
        <Link className="pharmacy-open-folder" to={knowledgeFolderUrl(folder.id)}>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />{T("باز کردن پوشه", "Open folder")}
        </Link>
        {folder.id === "folder-mono-special" ? <PharmacyLessonCollection lessons={lessons} kind="schedule" statusOf={statusOf} lastDocId={lastStudy?.docId} /> : renderLessons(lessons)}
        {children.map((child) => renderFolder(child, depth + 1))}
        {lessons.length === 0 && children.length === 0 && <p className="pharmacy-empty-folder">{T("هنوز درسی ثبت نشده", "No lessons yet")}</p>}
      </div>
    </details>;
  }

  const selectedCategory = visibleCategories.find((category) => category.id === openCategoryId) ?? null;

  function renderTopicNav() {
    return <nav className="pharmacy-category-nav" aria-label={T("انتخاب موضوع", "Choose topic")}>
      {visibleCategories.map((category) => <button key={category.id} type="button" data-testid={`pharmacy-category-${category.id}`} aria-label={T(`انتخاب ${category.name}`, `Choose ${category.name}`)} aria-pressed={selectedCategory?.id === category.id} onClick={() => { const next = new URLSearchParams(searchParams); next.set("pharmacyCategory", category.id); setSearchParams(next); setTopicsOpen(false); }}>
        <FolderClosed className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="pharmacy-topic-name">{category.name}</span><span className="pharmacy-topic-count">{lessonCounts.get(category.id) ?? 0}</span>
      </button>)}
    </nav>;
  }

  function renderTopicPanel(category: KnowledgeFolder & { subfolders: KnowledgeFolder[] }) {
    const directLessons = folderDocuments.get(category.id) ?? [];
    const total = lessonCounts.get(category.id) ?? 0;
    const academic = category.id === "folder-pharmacy-cat-academic-modules";
    const academicLessons = academic ? pharmacyDescendantLessons(category.id, folders, documents) : [];
    const moduleCount = academic ? buildPharmacyLessonCollections(academicLessons, "academic").filter(group => group.id !== "other").length : 0;
    return <section className="pharmacy-topic-panel" aria-labelledby="pharmacy-topic-title" data-testid="pharmacy-topic-panel">
      <div className="pharmacy-topic-head">
        <h3 id="pharmacy-topic-title">{category.name}</h3>
        <p>{academic ? T(`${moduleCount} ماژول · ${total} درس`, `${moduleCount} modules · ${total} lessons`) : T(`${category.subfolders.length} زیرشاخه · ${total} درس`, `${category.subfolders.length} subcategories · ${total} lessons`)}</p>
        <Link to={knowledgeFolderUrl(category.id)} className="pharmacy-category-link" aria-label={T(`باز کردن صفحه ${category.name}`, `Open ${category.name} folder`)}><ExternalLink className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
      <Tabs key={category.id} defaultValue="study" dir={isEn ? "ltr" : "rtl"}>
        <TabsList className="mb-3">
          <TabsTrigger value="study" data-testid="pharmacy-path-study">{T("مطالعه", "Study")}</TabsTrigger>
          <TabsTrigger value="practice" data-testid="pharmacy-path-practice">{T("تمرین", "Practice")}</TabsTrigger>
          <TabsTrigger value="review" data-testid="pharmacy-path-review">{T("مرور", "Review")}</TabsTrigger>
        </TabsList>
        <TabsContent value="study" className="pharmacy-category-content">
          {academic ? <>
            <PharmacyLessonCollection lessons={academicLessons} kind="academic" statusOf={statusOf} lastDocId={lastStudy?.docId} />
            <details className="pharmacy-collection-original"><summary>{T("پوشه‌های اصلی", "Original folders")}</summary>{category.subfolders.map((child) => renderFolder(child, 1))}</details>
          </> : category.subfolders.map((child) => renderFolder(child, 1))}
          {!academic && directLessons.length > 0 && <details className="pharmacy-folder"><summary className="pharmacy-folder-summary"><BookOpen className="h-4 w-4" aria-hidden="true" /><span className="pharmacy-folder-name">{T("درس‌های این دسته", "Lessons in this category")}</span><span className="pharmacy-folder-count">{directLessons.length}</span><ChevronDown className="pharmacy-folder-chevron h-4 w-4" aria-hidden="true" /></summary><div className="pharmacy-folder-content">{renderLessons(directLessons)}</div></details>}
          {category.subfolders.length === 0 && directLessons.length === 0 && <p className="pharmacy-empty-folder">{T("این شاخه هنوز خالی است", "This category is still empty")}</p>}
        </TabsContent>
        <TabsContent value="practice" className="space-y-2">
          <p className="text-sm text-muted-foreground">{T("بعد از خواندن درس، همان مفهوم را با تمرین محک بزن.", "After a lesson, test the same idea with practice.")}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline"><Link to="/app/pharmacy-fred-practice" data-testid="pharmacy-practice-fred">{T("درس‌های تمرینی FRED", "FRED practice lessons")}</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to="/app/pharmacy-scenario-practice" data-testid="pharmacy-practice-scenarios">{T("سناریوهای تمرینی", "Practice scenarios")}</Link></Button>
          </div>
        </TabsContent>
        <TabsContent value="review" className="space-y-2">
          <p className="text-sm text-muted-foreground">{T("کارت‌ها و نقشهٔ همین موضوع را مرور کن.", "Review the cards and map for this topic.")}</p>
          <Button asChild size="sm"><Link to={`/app/review?domain=pharmacy&topic=${encodeURIComponent(category.id)}`} data-testid="pharmacy-review-topic-link">{T("مرور این موضوع", "Review this topic")}</Link></Button>
        </TabsContent>
      </Tabs>
    </section>;
  }

  return (
    <main className="pharmacy-hub" dir={isEn ? "ltr" : "rtl"}>
      <HeaderTitlePortal title={T("فارماسی", "Pharmacy")} />
      <header className="pharmacy-hero" data-testid="pharmacy-hero">
        {lastPharmacyDocument && <Link to={`/app/knowledge?docId=${encodeURIComponent(lastPharmacyDocument.id)}`} className="pharmacy-continue" data-testid="pharmacy-continue-link">
          <History className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span><small>{T("ادامهٔ مطالعه", "Continue")}</small><b dir="auto">{isEn ? lastPharmacyDocument.title_en || lastPharmacyDocument.title : lastPharmacyDocument.title}</b></span>
        </Link>}
      </header>
      <details className="pharmacy-tools-disclosure"><summary>{T("ابزارهای تمرین و مرور", "Practice and review tools")}</summary><PharmacyShortcuts /></details>


      <section className="pharmacy-knowledge" aria-labelledby="pharmacy-categories-heading">
        <div className="pharmacy-section-head">
          <div><h2 id="pharmacy-categories-heading"><Layers3 className="h-5 w-5" aria-hidden="true" />{T("دسته‌بندی‌های دانشنامه", "Knowledge categories")}</h2><p>{T("برای دیدن زیرشاخه‌ها، یک دسته را باز کنید.", "Open a category to explore its folders.")}</p></div>
          <Link className="pharmacy-browse-all" to={knowledgeFolderUrl(PHARMACY_ROOT_FOLDER_ID)}><BookOpen className="h-4 w-4" aria-hidden="true" />{T("همهٔ دانشنامه", "Full library")}</Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground" role="status">{T("در حال بارگذاری دسته‌بندی‌ها…", "Loading categories…")}</p>
        ) : loadFailed ? (
          <div role="alert" className="space-y-3">
            <p className="text-sm text-muted-foreground">{T("دسته‌بندی‌ها بارگذاری نشدند.", "Could not load categories.")}</p>
            <Button variant="outline" size="sm" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>{T("تلاش دوباره", "Retry")}</Button>
          </div>
        ) : categories.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">
            {T("برای این حساب هنوز شاخه‌های Pharmacy در دانشنامه پیدا نشد. از صفحهٔ دانشنامه می‌توانی مطالب جاافتاده را اضافه کنی.", "No Pharmacy folders were found for this account. You can add missing content from the knowledge base.")}
          </Card>
        ) : (
          <div>
            <div className="pharmacy-search"><Search className="h-4 w-4" aria-hidden="true" /><Input value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)} placeholder={T("جست‌وجوی دسته، زیرشاخه یا درس…", "Search categories, folders or lessons…")} aria-label={T("جست‌وجوی دسته‌ها", "Search categories")} />{categoryQuery && <button type="button" onClick={() => setCategoryQuery("")} aria-label={T("پاک کردن جست‌وجو", "Clear search")}><X className="h-4 w-4" /></button>}</div>
            {categoryQuery.trim() && searchResults.length > 0 && <section aria-label={T("درس‌های پیدا شده", "Matching lessons")} className="pharmacy-search-results">
              <p role="status">{T(`${searchResults.length} درس پیدا شد`, `${searchResults.length} matching lessons`)}</p>
              {renderLessons(searchResults)}
            </section>}
            {selectedCategory && <button type="button" className="pharmacy-collection-back" onClick={() => { const next = new URLSearchParams(searchParams); next.delete("pharmacyCategory"); setSearchParams(next); }}>{T("همهٔ مجموعه‌ها", "All collections")}</button>}
            {selectedCategory ? <div className="pharmacy-layout" data-collapsed={collapsed}>
              <aside className="pharmacy-topics" data-testid="pharmacy-topics">
                <button type="button" className="pharmacy-topics-toggle" aria-expanded={!collapsed} aria-controls="pharmacy-topic-list" onClick={() => setCollapsed((value) => !value)} data-testid="pharmacy-topics-toggle">
                  {collapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}<span className="sr-only">{collapsed ? T("باز کردن ستون موضوعات", "Expand topics") : T("جمع کردن ستون موضوعات", "Collapse topics")}</span>
                </button>
                <div id="pharmacy-topic-list" hidden={collapsed}>{renderTopicNav()}</div>
              </aside>
              <div className="pharmacy-topics-mobile">
                <Sheet open={topicsOpen} onOpenChange={setTopicsOpen}>
                  <SheetTrigger asChild><Button type="button" variant="outline" size="sm" data-testid="pharmacy-topics-open"><Menu className="me-2 h-4 w-4 shrink-0" aria-hidden="true" /><span className="truncate">{T("موضوعات", "Topics")}: {selectedCategory.name}</span></Button></SheetTrigger>
                  <SheetContent side={isEn ? "left" : "right"}><SheetHeader><SheetTitle>{T("موضوعات", "Topics")}</SheetTitle></SheetHeader>{renderTopicNav()}</SheetContent>
                </Sheet>
              </div>
              {!(categoryQuery.trim() && searchResults.length > 0) && renderTopicPanel(selectedCategory)}
            </div> : visibleCategories.length > 0 ? <div className="pharmacy-collection-grid">
              {visibleCategories.map(category => <button key={category.id} type="button" className="pharmacy-collection-card" onClick={() => { const next = new URLSearchParams(searchParams); next.set("pharmacyCategory", category.id); setSearchParams(next); }}>
                <FolderClosed className="h-7 w-7 text-primary" aria-hidden="true" /><strong>{category.name}</strong><span>{T(`${lessonCounts.get(category.id) ?? 0} درس`, `${lessonCounts.get(category.id) ?? 0} lessons`)}</span>
              </button>)}
            </div> : <p className="pharmacy-no-results">{T("دسته‌ای با این نام پیدا نشد.", "No matching category found.")}</p>}
            {additional.length > 0 && (
              <details className="pharmacy-additional">
                <summary>
                  {T("مجموعه‌های قدیمی و پوشه‌های دیگر", "Earlier and other collections")} ({additional.length})
                </summary>
                <div className="pharmacy-additional-links">
                  {additional.map((folder) => (
                    <Link key={folder.id} to={knowledgeFolderUrl(folder.id)}>
                      {folder.name}
                    </Link>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
