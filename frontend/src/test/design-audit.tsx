import SleepView from "@/pages/SleepView";
import { RichEditor } from "@/components/RichEditor";
// Read-only fixture using the production reader, tree and task header components.
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TaskListSortSettings } from "@/pages/settings/TaskListSortSettings";
import { MobileBottomBarSettings } from "@/pages/settings/MobileBottomBarSettings";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { KnowledgeDocumentReader } from "@/components/knowledge/KnowledgeDocumentReader";
import { KnowledgeSidebarTree } from "@/components/knowledge/KnowledgeSidebarTree";
import { TaskDetailTopBar } from "@/components/task-detail/TaskDetailTopBar";
import { buildFolderTree } from "@/lib/knowledgeService";
import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";
import i18n from "@/i18n";
import "../index.css";

const params = new URLSearchParams(location.search);
const isEn = params.get("lang") === "en";
const isSleep = params.get("view") === "sleep";
const isEditor = params.get("view") === "editor";
const isSettings = params.get("view") === "settings";
void i18n.changeLanguage(isEn ? "en" : "fa");
document.documentElement.dir = isEn ? "ltr" : "rtl";
document.documentElement.lang = isEn ? "en" : "fa";
document.documentElement.classList.toggle("dark", params.get("theme") !== "light");
document.documentElement.classList.toggle("theme-oled", params.get("theme") === "oled");
document.documentElement.dataset.accent = "olive";
const T = (fa: string, en: string) => isEn ? en : fa;
const folders: KnowledgeFolder[] = [{ id: "qa-folder", name: T("دسته‌بندی آموزشی با نام طولانی برای بررسی نمایش", "A long learning category to check responsive navigation"), parent_id: null, position: 0, created_at: "", updated_at: "", user_id: "qa" }];
const lesson: KnowledgeDocument = {
  id: "qa-lesson", user_id: "qa", folder_id: "qa-folder",
  title: "عنوان بلند یک درس آموزشی برای بررسی خوانایی و چیدمان در گوشی تاشو",
  title_en: "A longer learning title for checking readable layouts on a foldable phone",
  content_html: "<h2>یادگیری با تمرکز</h2><p>این متن نمونه برای بررسی نمایش است. فاصله‌ها باید خوانایی را حفظ کنند و دکمه‌ها همیشه در دسترس باشند.</p><ul><li>مرور مطالب</li><li>ثبت یادداشت</li></ul><h2>منابع</h2><p>منبع نمونه برای بررسی تب افقی.</p>",
  content_en: "<h2>Focused learning</h2><p>This is a layout sample. Text should remain readable and controls accessible across screen sizes.</p><ul><li>Review lessons</li><li>Take notes</li></ul><h2>References</h2><p>A sample source for horizontal tabs.</p>",
  plain_text: "Layout sample", tags: [], created_at: "2026-09-30T00:00:00Z", updated_at: "2026-09-30T00:00:00Z", is_favorite: false, view_count: 0,
};
const noop = () => {};
function Fixture() {
  React.useEffect(() => { document.body.dataset.qaKey = params.toString(); }, []);
  return <BrowserRouter><TooltipProvider>
    <header className="h-12 flex items-center justify-between gap-2 border-b px-3">
      <div id="app-header-title" className="min-w-0 flex-1" />
      <div id="app-header-actions" className="shrink-0" />
    </header>
    {!isSleep && <HeaderTitlePortal title={isSettings ? T("تنظیمات", "Settings") : T("پایگاه دانش", "Knowledge")} />}
    {isSleep ? <SleepView /> : isEditor ? <main className="p-3 max-w-5xl mx-auto"><RichEditor initialMarkdown="A note with **bold** and <u>underlined text</u>." showVoiceButton={false} onChange={(_html, markdown) => { document.body.dataset.savedMarkdown = markdown; }} /></main> : isSettings ? <main className="p-4 max-w-xl mx-auto space-y-6"><MobileBottomBarSettings isEn={isEn} /><TaskListSortSettings /></main> : <>
    <div className="border-b px-3 py-1">
      <TaskDetailTopBar T={T} isEn={isEn} canEdit folderLabel={folders[0].name} hasFolder onFolder={noop} onGoal={noop} goalLabel={null} save={null} more={null} />
    </div>
    <div className="flex h-[calc(100dvh-6rem)] min-h-0 gap-3 p-2 md:p-4">
      <aside className="hidden lg:block w-64 shrink-0">
        <KnowledgeSidebarTree tree={buildFolderTree(folders, [lesson])} allFolders={folders} documents={[lesson]} selectedDocId={lesson.id} selectedFolderId={null} onSelectDocument={noop} onSelectFolder={noop} onCreateFolder={async () => {}} onDeleteFolder={noop} onCreateDocument={noop} onDeleteDocument={noop} searchQuery="" onSearchChange={noop} />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1">
        <KnowledgeDocumentReader document={lesson} folder={folders[0]} allDocuments={[lesson]} userId="" onEdit={noop} onDelete={noop} isSidebarCollapsed onToggleSidebar={noop} />
      </div>
    </div>
    </>}
  </TooltipProvider></BrowserRouter>;
}
async function mount() {
  createRoot(document.getElementById("root")!).render(<Fixture />);
}
void mount();
