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

  function renderFolderContents(folderId: string, depth = 0): ReactNode {
    if (depth > 12) return null;
    const children = childFolders.get(folderId) ?? [];
    const lessons = folderDocuments.get(folderId) ?? [];
    if (!children.length && !lessons.length) return null;
    return <div className="mt-2 space-y-2 border-s border-border/70 ps-3">
      {children.map((child) => <details key={child.id} className="rounded-lg bg-muted/30 px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium leading-relaxed">{child.name}</summary>
        <div className="mt-2"><Link to={knowledgeFolderUrl(child.id)} className="text-xs text-primary hover:underline">{T("باز کردن دسته", "Open category")}</Link></div>
        {renderFolderContents(child.id, depth + 1)}
      </details>)}
      {lessons.map((lesson) => <Link key={lesson.id} to={`/app/knowledge?docId=${encodeURIComponent(lesson.id)}`} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm leading-relaxed hover:bg-primary/5 hover:text-primary">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{lesson.title}</span>
      </Link>)}
    </div>;
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
            <div className="grid gap-3 md:grid-cols-2">
              {categories.map((category) => (
                <Card key={category.id} className="space-y-3 p-4">
                <Link to={knowledgeFolderUrl(category.id)} className="flex items-start gap-2 font-semibold leading-relaxed hover:text-primary hover:underline">
                  <FolderOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span>{category.name}</span>
                </Link>
                {category.subfolders.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {category.subfolders.map((child) => (
                      <Link
                        key={child.id}
                        to={knowledgeFolderUrl(child.id)}
                        className="rounded-lg border bg-muted/30 px-2.5 py-1.5 text-xs leading-relaxed hover:border-primary/40 hover:bg-primary/5"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
                <details className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium">{T("زیرمجموعه‌ها و درس‌ها", "Subcategories and lessons")}</summary>
                  {renderFolderContents(category.id)}
                </details>
                </Card>
              ))}
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
