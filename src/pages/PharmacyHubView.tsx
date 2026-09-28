import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, FolderOpen, Pill } from "lucide-react";
import PharmacyShortcuts from "@/components/PharmacyShortcuts";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { PHARMACY_ROOT_FOLDER_ID } from "@/lib/pharmacyConstants";
import { splitPharmacyRootFolders } from "@/lib/pharmacyCategorySections";
import { getKnowledgeFolders } from "@/lib/knowledgeService";
import type { KnowledgeFolder } from "@/lib/knowledgeTypes";

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
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const userId = user?.id || "anonymous-kb-user";

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadFailed(false);
    void getKnowledgeFolders(userId).then((result) => {
      if (active) setFolders(result);
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
