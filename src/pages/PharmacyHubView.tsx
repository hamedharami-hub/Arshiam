import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BookOpen, FolderOpen, Pill } from "lucide-react";
import PharmacyShortcuts from "@/components/PharmacyShortcuts";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { PHARMACY_ROOT_FOLDER_ID } from "@/lib/pharmacyConstants";
import { splitPharmacyRootFolders } from "@/lib/pharmacyCategorySections";
import { getKnowledgeDocuments, getKnowledgeFolders } from "@/lib/knowledgeService";
import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";

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

  function countLessons(folderId: string, depth = 0): number {
    if (depth > 12) return 0;
    const own = folderDocuments.get(folderId)?.length ?? 0;
    return own + (childFolders.get(folderId) ?? []).reduce((sum, child) => sum + countLessons(child.id, depth + 1), 0);
  }

  function renderLessons(lessons: KnowledgeDocument[]) {
    if (!lessons.length) return null;
    return <ul className="space-y-0.5">
      {lessons.map((lesson) => <li key={lesson.id}>
        <Link to={`/app/knowledge?docId=${encodeURIComponent(lesson.id)}`} data-testid={`pharmacy-lesson-${lesson.id}`} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm leading-relaxed text-foreground/90 transition-colors hover:bg-primary/5 hover:text-primary">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" aria-hidden="true" /><span>{lesson.title}</span>
        </Link>
      </li>)}
    </ul>;
  }

  function renderNestedFolders(folderId: string, depth: number): ReactNode {
    if (depth > 12) return null;
    const children = childFolders.get(folderId) ?? [];
    if (!children.length) return null;
    return <div className="mt-2 space-y-2 border-s-2 border-primary/15 ps-3">
      {children.map((child) => <details key={child.id} open className="rounded-lg bg-muted/30 px-3 py-2">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium leading-relaxed">
          <FolderOpen className="h-4 w-4 shrink-0 text-primary/70" aria-hidden="true" />
          <Link to={knowledgeFolderUrl(child.id)} onClick={(event) => event.stopPropagation()} className="hover:text-primary hover:underline">{child.name}</Link>
          <span className="ms-auto text-[11px] text-muted-foreground">{countLessons(child.id)}</span>
        </summary>
        <div className="mt-1.5">{renderLessons(folderDocuments.get(child.id) ?? [])}</div>
        {renderNestedFolders(child.id, depth + 1)}
      </details>)}
    </div>;
  }

  function renderCategory(category: KnowledgeFolder & { subfolders: KnowledgeFolder[] }) {
    const directLessons = folderDocuments.get(category.id) ?? [];
    const total = countLessons(category.id);
    return <Card key={category.id} data-testid={`pharmacy-category-${category.id}`} className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b bg-primary/5 px-4 py-3">
        <Link to={knowledgeFolderUrl(category.id)} className="flex items-center gap-2 text-base font-bold leading-relaxed hover:text-primary hover:underline sm:text-lg">
          <FolderOpen className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <span>{category.name}</span>
        </Link>
        <span className="rounded-full bg-background/80 px-2.5 py-0.5 text-xs text-muted-foreground">
          {T(`${category.subfolders.length} زیرشاخه · ${total} درس`, `${category.subfolders.length} subcategories · ${total} lessons`)}
        </span>
      </div>
      <div className="grid gap-3 p-3 sm:p-4 md:grid-cols-2 xl:grid-cols-3">
        {category.subfolders.map((child) => <section key={child.id} data-testid={`pharmacy-subcategory-${child.id}`} className="rounded-xl border border-border/70 bg-card p-3">
          <div className="flex items-start gap-2">
            <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" aria-hidden="true" />
            <Link to={knowledgeFolderUrl(child.id)} className="text-sm font-semibold leading-relaxed hover:text-primary hover:underline">{child.name}</Link>
            <span className="ms-auto text-[11px] text-muted-foreground">{countLessons(child.id)}</span>
          </div>
          <div className="mt-2">{renderLessons(folderDocuments.get(child.id) ?? [])}</div>
          {renderNestedFolders(child.id, 1)}
          {!folderDocuments.get(child.id)?.length && !childFolders.get(child.id)?.length && (
            <p className="mt-2 text-xs text-muted-foreground">{T("هنوز درسی ثبت نشده", "No lessons yet")}</p>
          )}
        </section>)}
        {directLessons.length > 0 && <section className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3">
          <p className="text-sm font-semibold">{T("درس‌های این شاخه", "Lessons in this category")}</p>
          <div className="mt-2">{renderLessons(directLessons)}</div>
        </section>}
        {category.subfolders.length === 0 && directLessons.length === 0 && (
          <p className="text-sm text-muted-foreground">{T("این شاخه هنوز خالی است", "This category is still empty")}</p>
        )}
      </div>
    </Card>;
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-3 py-5 sm:px-5 sm:py-7" dir={isEn ? "ltr" : "rtl"}>
      <header className="flex items-start gap-3">
        <span className="rounded-2xl bg-primary/10 p-3 text-primary" aria-hidden="true"><Pill className="h-6 w-6" /></span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{T("فارماسی", "Pharmacy")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {T("دانشنامه، دسته‌بندی‌های دارو و بیماری، و ابزارهای تمرین", "Knowledge, medicine and disease categories, and practice tools")}
          </p>
        </div>
      </header>

      <PharmacyShortcuts />

      <section className="space-y-3" aria-labelledby="pharmacy-categories-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="pharmacy-categories-heading" className="text-lg font-semibold">
            {T("دسته‌بندی‌های دانشنامه", "Knowledge categories")}
          </h2>
          <Link className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline" to={knowledgeFolderUrl(PHARMACY_ROOT_FOLDER_ID)}>
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {T("نمایش همهٔ پوشه‌ها و درس‌ها", "Browse all folders and lessons")}
          </Link>
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
          <div className="space-y-4">
            <div className="space-y-4">
              {categories.map(renderCategory)}
            </div>
            {additional.length > 0 && (
              <details className="rounded-xl border bg-muted/20 p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  {T("مجموعه‌های قدیمی و پوشه‌های دیگر", "Earlier and other collections")} ({additional.length})
                </summary>
                <div className="mt-3 flex flex-col gap-2">
                  {additional.map((folder) => (
                    <Link key={folder.id} to={knowledgeFolderUrl(folder.id)} className="text-sm leading-relaxed text-primary hover:underline">
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
