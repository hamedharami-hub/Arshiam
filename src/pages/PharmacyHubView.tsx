import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronDown, ExternalLink, FolderClosed, Layers3, Pill, Search, X } from "lucide-react";
import PharmacyShortcuts from "@/components/PharmacyShortcuts";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { PHARMACY_ROOT_FOLDER_ID } from "@/lib/pharmacyConstants";
import { splitPharmacyRootFolders } from "@/lib/pharmacyCategorySections";
import { getKnowledgeDocuments, getKnowledgeFolders } from "@/lib/knowledgeService";
import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";
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
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [categoryQuery, setCategoryQuery] = useState("");
  const userId = user?.id || "anonymous-kb-user";

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadFailed(false);
    void Promise.all([getKnowledgeFolders(userId), getKnowledgeDocuments(userId)]).then(([savedFolders, savedDocuments]) => {
      if (active) { setFolders(savedFolders); setDocuments(savedDocuments); }
    }).catch(() => {
      if (active) setLoadFailed(true);
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [userId]);

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
    return categories.filter((category) =>
      category.name.toLocaleLowerCase().includes(query) ||
      category.subfolders.some((folder) => folder.name.toLocaleLowerCase().includes(query)),
    );
  }, [categories, categoryQuery]);

  function countLessons(folderId: string, depth = 0): number {
    if (depth > 12) return 0;
    const own = folderDocuments.get(folderId)?.length ?? 0;
    return own + (childFolders.get(folderId) ?? []).reduce((sum, child) => sum + countLessons(child.id, depth + 1), 0);
  }

  function renderLessons(lessons: KnowledgeDocument[]) {
    if (!lessons.length) return null;
    return <ul className="pharmacy-lesson-list">
      {lessons.map((lesson) => <li key={lesson.id}>
        <Link to={`/app/knowledge?docId=${encodeURIComponent(lesson.id)}`} data-testid={`pharmacy-lesson-${lesson.id}`} className="pharmacy-lesson-link">
          <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{lesson.title}</span>
        </Link>
      </li>)}
    </ul>;
  }

  function renderFolder(folder: KnowledgeFolder, depth: number) {
    const children = depth < 12 ? childFolders.get(folder.id) ?? [] : [];
    const lessons = folderDocuments.get(folder.id) ?? [];
    const lessonCount = countLessons(folder.id);
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
        {renderLessons(lessons)}
        {children.map((child) => renderFolder(child, depth + 1))}
        {lessons.length === 0 && children.length === 0 && <p className="pharmacy-empty-folder">{T("هنوز درسی ثبت نشده", "No lessons yet")}</p>}
      </div>
    </details>;
  }

  function renderCategory(category: KnowledgeFolder & { subfolders: KnowledgeFolder[] }) {
    const directLessons = folderDocuments.get(category.id) ?? [];
    const total = countLessons(category.id);
    const isOpen = openCategoryId === category.id;
    return <article key={category.id} data-testid={`pharmacy-category-${category.id}`} className={`pharmacy-category ${isOpen ? "is-open" : ""}`}>
      <div className="pharmacy-category-header">
        <button type="button" className="pharmacy-category-toggle" aria-expanded={isOpen} aria-controls={`pharmacy-category-panel-${category.id}`} onClick={() => setOpenCategoryId(isOpen ? null : category.id)}>
          <span className="pharmacy-category-icon"><FolderClosed className="h-5 w-5" aria-hidden="true" /></span>
          <span className="pharmacy-category-title">{category.name}</span>
          <span className="pharmacy-category-meta">{T(`${category.subfolders.length} زیرشاخه · ${total} درس`, `${category.subfolders.length} subcategories · ${total} lessons`)}</span>
          <ChevronDown className="pharmacy-category-chevron h-5 w-5" aria-hidden="true" />
        </button>
        <Link to={knowledgeFolderUrl(category.id)} className="pharmacy-category-link" aria-label={T(`باز کردن صفحه ${category.name}`, `Open ${category.name} folder`)} title={T("باز کردن پوشه در دانشنامه", "Open folder in knowledge base")}><ExternalLink className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
      {isOpen && <div id={`pharmacy-category-panel-${category.id}`} className="pharmacy-category-content">
        {category.subfolders.map((child) => renderFolder(child, 1))}
        {directLessons.length > 0 && <details className="pharmacy-folder"><summary className="pharmacy-folder-summary"><BookOpen className="h-4 w-4" aria-hidden="true" /><span className="pharmacy-folder-name">{T("درس‌های این دسته", "Lessons in this category")}</span><span className="pharmacy-folder-count">{directLessons.length}</span><ChevronDown className="pharmacy-folder-chevron h-4 w-4" aria-hidden="true" /></summary><div className="pharmacy-folder-content">{renderLessons(directLessons)}</div></details>}
        {category.subfolders.length === 0 && directLessons.length === 0 && <p className="pharmacy-empty-folder">{T("این شاخه هنوز خالی است", "This category is still empty")}</p>}
      </div>}
    </article>;
  }

  return (
    <main className="pharmacy-hub" dir={isEn ? "ltr" : "rtl"}>
      <header className="pharmacy-hub-header">
        <span className="pharmacy-hub-mark" aria-hidden="true"><Pill className="h-6 w-6" /></span>
        <div><h1>{T("فارماسی", "Pharmacy")}</h1><p>{T("دانش و تمرین داروسازی، مرتب و در دسترس", "Pharmacy knowledge and practice, clearly organized")}</p></div>
      </header>

      <PharmacyShortcuts />

      <section className="pharmacy-knowledge" aria-labelledby="pharmacy-categories-heading">
        <div className="pharmacy-section-head">
          <div><h2 id="pharmacy-categories-heading"><Layers3 className="h-5 w-5" aria-hidden="true" />{T("دسته‌بندی‌های دانشنامه", "Knowledge categories")}</h2><p>{T("برای دیدن زیرشاخه‌ها، یک دسته را باز کنید.", "Open a category to explore its folders.")}</p></div>
          <Link className="pharmacy-browse-all" to={knowledgeFolderUrl(PHARMACY_ROOT_FOLDER_ID)}><BookOpen className="h-4 w-4" aria-hidden="true" />{T("همهٔ دانشنامه", "Full library")}</Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground" role="status">{T("در حال بارگذاری دسته‌بندی‌ها…", "Loading categories…")}</p>
        ) : loadFailed ? (
          <p className="text-sm text-muted-foreground" role="status">{T("بارگذاری دسته‌بندی‌ها انجام نشد. از دانشنامه دوباره تلاش کن.", "Could not load categories. Open the knowledge base to try again.")}</p>
        ) : categories.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">
            {T("برای این حساب هنوز شاخه‌های Pharmacy در دانشنامه پیدا نشد. از صفحهٔ دانشنامه می‌توانی مطالب جاافتاده را اضافه کنی.", "No Pharmacy folders were found for this account. You can add missing content from the knowledge base.")}
          </Card>
        ) : (
          <div>
            <div className="pharmacy-search"><Search className="h-4 w-4" aria-hidden="true" /><Input value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)} placeholder={T("جست‌وجوی دسته یا زیرشاخه…", "Search categories or subfolders…")} aria-label={T("جست‌وجوی دسته‌ها", "Search categories")} />{categoryQuery && <button type="button" onClick={() => setCategoryQuery("")} aria-label={T("پاک کردن جست‌وجو", "Clear search")}><X className="h-4 w-4" /></button>}</div>
            <div className="pharmacy-category-list">
              {visibleCategories.length ? visibleCategories.map(renderCategory) : <p className="pharmacy-no-results">{T("دسته‌ای با این نام پیدا نشد.", "No matching category found.")}</p>}
            </div>
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
