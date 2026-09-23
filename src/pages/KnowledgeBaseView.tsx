import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BookOpen, Menu, Plus, Sparkles, FolderPlus, ArrowLeft, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { useIsMobile } from "@/hooks/use-mobile";
import type { KnowledgeFolder, KnowledgeDocument, KnowledgeFolderNode } from "@/lib/knowledgeTypes";
import {
  getKnowledgeFolders,
  createKnowledgeFolder,
  deleteKnowledgeFolder,
  getKnowledgeDocuments,
  createKnowledgeDocument,
  updateKnowledgeDocument,
  deleteKnowledgeDocument,
  buildFolderTree,
  searchKnowledgeDocuments,
} from "@/lib/knowledgeService";
import { KnowledgeSidebarTree } from "@/components/knowledge/KnowledgeSidebarTree";
import { KnowledgeDocumentReader } from "@/components/knowledge/KnowledgeDocumentReader";
import { KnowledgeDocumentEditorModal } from "@/components/knowledge/KnowledgeDocumentEditorModal";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export const KnowledgeBaseView: React.FC = () => {
  const { user } = useAuth();
  const { isEn } = useBilingual();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const urlDocId = searchParams.get("docId");

  const [folders, setFolders] = useState<KnowledgeFolder[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);

  // Editor Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KnowledgeDocument | null>(null);
  const [editorInitialFolderId, setEditorInitialFolderId] = useState<string | null>(null);

  const userId = user?.id || "anonymous-kb-user";

  const loadData = useCallback(async () => {
    try {
      const [fList, dList] = await Promise.all([
        getKnowledgeFolders(userId),
        getKnowledgeDocuments(userId),
      ]);

      // If user has zero documents & zero folders, provide a helpful clinical sample
      if (fList.length === 0 && dList.length === 0 && user) {
        const rootMed = await createKnowledgeFolder(userId, {
          name: isEn ? "Medications" : "دسته‌های دارویی",
          icon: "Pill",
          color: "#10b981",
        });
        const subAntidepressants = await createKnowledgeFolder(userId, {
          name: isEn ? "Antidepressants (SSRIs)" : "ضد افسردگی‌ها (SSRIs)",
          parent_id: rootMed.id,
          icon: "Smile",
        });
        const sampleDoc = await createKnowledgeDocument(userId, {
          folder_id: subAntidepressants.id,
          title: isEn ? "Fluoxetine & Sertraline Clinical Guide" : "راهنمای بالینی فلوکستین و سرترالین",
          tags: ["SSRI", "Depression", "OCD"],
          source_url: "https://github.com/hamedharami-hub/pharmacy",
          content_html: `
            <h1>دسته‌بندی داروهای مهارکننده اختصاصی بازجذب سروتونین (SSRIs)</h1>
            <p>این دسته از داروها خط اول درمان در <strong>افسردگی اساسی (MDD)</strong>، اختلال اضطراب فراگیر (GAD) و وسواس فکری-عملی (OCD) هستند.</p>
            
            <blockquote>
              <strong>نکته بالینی طلایی (Clinical Pearl):</strong>
              اثرات ضدافسردگی معمولاً بین ۲ تا ۴ هفته پس از شروع دوز درمانی ظاهر می‌شوند. به بیمار آموزش دهید مصرف دارو را خودسرانه قطع نکند.
            </blockquote>

            <h2>جدول مقایسه بالینی داروهای شاخص</h2>
            <table>
              <thead>
                <tr>
                  <th>نام ژنریک</th>
                  <th>دوز شروع (mg/day)</th>
                  <th>نیمه‌عمر پلاسمایی</th>
                  <th>ویژگی‌های کلیدی</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>فلوکستین (Fluoxetine)</strong></td>
                  <td>20</td>
                  <td>طولانی (۲ تا ۴ روز) + متابولیت فعال (تا ۱۶ روز)</td>
                  <td>کمترین سندرم قطع مصرف، مناسب برای افراد با فراموشی دوز</td>
                </tr>
                <tr>
                  <td><strong>سرترالین (Sertraline)</strong></td>
                  <td>50</td>
                  <td>۲۶ ساعت</td>
                  <td>ایمن‌ترین انتخاب پس از سکته قلبی و ایمنی بالا در بارداری</td>
                </tr>
                <tr>
                  <td><strong>اس‌سیتالوپرام (Escitalopram)</strong></td>
                  <td>10</td>
                  <td>۳۰ ساعت</td>
                  <td>بالاترین اختصاصیت، کمترین تداخل آنزیمی سیتوکروم P450</td>
                </tr>
              </tbody>
            </table>

            <h3>عوارض جانبی و نکات مدیریت</h3>
            <ul>
              <li><strong>دستگاه گوارش:</strong> تهوع و ناراحتی معده (توصیه به مصرف همراه غذا).</li>
              <li><strong>بی‌خوابی یا خواب‌آلودگی:</strong> فلوکستین صبح‌ها و داروهای سداتیو شب‌ها مصرف شوند.</li>
              <li><strong>سندرم سروتونین:</strong> در مصرف همزمان با MAOIs یا ترامادول احتیاط شود.</li>
            </ul>
          `,
        });

        setFolders([rootMed, subAntidepressants]);
        setDocuments([sampleDoc]);
        setSelectedDocId(sampleDoc.id);
        return;
      }

      setFolders(fList);
      setDocuments(dList);
      setSelectedDocId((prev) => prev || (dList.length > 0 ? dList[0].id : null));
    } catch (e) {
      console.error("Error loading knowledge base data", e);
    }
  }, [userId, isEn, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync document selection from URL search params (?docId=...)
  useEffect(() => {
    if (urlDocId && documents.some((d) => d.id === urlDocId)) {
      setSelectedDocId(urlDocId);
    }
  }, [urlDocId, documents]);

  // Debounce search query for high-performance typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const tree = useMemo(() => {
    return buildFolderTree(folders, documents);
  }, [folders, documents]);

  const currentDoc = useMemo(() => {
    return documents.find((d) => d.id === selectedDocId) || null;
  }, [documents, selectedDocId]);

  const currentFolder = useMemo(() => {
    if (!currentDoc || !currentDoc.folder_id) return null;
    return folders.find((f) => f.id === currentDoc.folder_id) || null;
  }, [currentDoc, folders]);

  // Folder Actions
  const handleCreateFolder = async (name: string, parentId?: string | null) => {
    try {
      const created = await createKnowledgeFolder(userId, { name, parent_id: parentId });
      setFolders((prev) => [...prev, created]);
      toast.success(isEn ? "Folder created" : "فولدر جدید ایجاد شد");
    } catch (e: any) {
      toast.error(e.message || "Error creating folder");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await deleteKnowledgeFolder(userId, folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId && f.parent_id !== folderId));
      setDocuments((prev) =>
        prev.map((d) => (d.folder_id === folderId ? { ...d, folder_id: null } : d))
      );
      toast.success(isEn ? "Folder deleted" : "فولدر حذف شد");
    } catch (e: any) {
      toast.error(e.message || "Error deleting folder");
    }
  };

  // Document Actions
  const handleOpenCreateDoc = (folderId: string | null = null) => {
    setEditingDoc(null);
    setEditorInitialFolderId(folderId);
    setEditorOpen(true);
  };

  const handleOpenEditDoc = (doc: KnowledgeDocument) => {
    setEditingDoc(doc);
    setEditorInitialFolderId(doc.folder_id);
    setEditorOpen(true);
  };

  const handleSaveDoc = async (data: {
    folder_id: string | null;
    title: string;
    content_html: string;
    tags: string[];
    source_url?: string;
  }) => {
    if (editingDoc) {
      const updated = await updateKnowledgeDocument(userId, editingDoc.id, data);
      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      toast.success(isEn ? "Document updated" : "سند به‌روزرسانی شد");
    } else {
      const created = await createKnowledgeDocument(userId, data);
      setDocuments((prev) => [created, ...prev]);
      setSelectedDocId(created.id);
      toast.success(isEn ? "Document added" : "سند جدید اضافه شد");
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await deleteKnowledgeDocument(userId, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (selectedDocId === docId) {
        const remaining = documents.filter((d) => d.id !== docId);
        setSelectedDocId(remaining.length > 0 ? remaining[0].id : null);
      }
      toast.success(isEn ? "Document deleted" : "سند حذف شد");
    } catch (e: any) {
      toast.error(e.message || "Error deleting document");
    }
  };

  // Search filter
  const filteredDocuments = useMemo(() => {
    if (!debouncedSearch.trim()) return documents;
    const q = debouncedSearch.toLowerCase();
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.plain_text && d.plain_text.toLowerCase().includes(q)) ||
        (d.tags && d.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [documents, debouncedSearch]);


  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="flex-1 flex flex-col h-full w-full bg-background text-foreground overflow-hidden"
    >
      {/* Top Mobile Bar */}
      <div className="md:hidden flex items-center justify-between p-3 border-b border-border bg-card/80 backdrop-blur-md shrink-0">
        <button
          type="button"
          onClick={() => setMobileTreeOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-foreground text-xs font-semibold border border-border"
        >
          <Menu className="w-4 h-4 text-primary" />
          <span>{isEn ? "Folders & Docs" : "فولدرها و اسناد"}</span>
        </button>

        <button
          type="button"
          onClick={() => handleOpenCreateDoc(selectedFolderId)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>{isEn ? "Add Document" : "افزودن سند"}</span>
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden p-2 md:p-4 gap-3 min-h-0">
        {/* Desktop Sidebar Folder Tree */}
        <div className="hidden md:block w-72 lg:w-80 shrink-0 h-full">
          <KnowledgeSidebarTree
            tree={tree}
            allFolders={folders}
            documents={filteredDocuments}
            selectedDocId={selectedDocId}
            selectedFolderId={selectedFolderId}
            onSelectDocument={(doc) => setSelectedDocId(doc.id)}
            onSelectFolder={(fId) => setSelectedFolderId(fId)}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onCreateDocument={handleOpenCreateDoc}
            onDeleteDocument={handleDeleteDoc}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Mobile Drawer */}
        <Sheet open={mobileTreeOpen} onOpenChange={setMobileTreeOpen}>
          <SheetContent
            side={isEn ? "left" : "right"}
            className="w-80 p-0 bg-card border-border text-card-foreground"
          >
            <KnowledgeSidebarTree
              tree={tree}
              allFolders={folders}
              documents={filteredDocuments}
              selectedDocId={selectedDocId}
              selectedFolderId={selectedFolderId}
              onSelectDocument={(doc) => {
                setSelectedDocId(doc.id);
                setMobileTreeOpen(false);
              }}
              onSelectFolder={(fId) => setSelectedFolderId(fId)}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={handleDeleteFolder}
              onCreateDocument={(fId) => {
                handleOpenCreateDoc(fId);
                setMobileTreeOpen(false);
              }}
              onDeleteDocument={handleDeleteDoc}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </SheetContent>
        </Sheet>

        {/* Reader Document Main Panel */}
        <div className="flex-1 flex flex-col h-full min-w-0">
          <KnowledgeDocumentReader
            document={currentDoc}
            folder={currentFolder}
            onEdit={handleOpenEditDoc}
            onDelete={handleDeleteDoc}
            onAddToNote={(text) => {
              toast.success(isEn ? "Text copied for note" : "متن برای نوت کپی شد");
            }}
            onAddToTask={(text) => {
              toast.success(isEn ? "Text copied for task" : "متن برای تسک کپی شد");
            }}
          />
        </div>
      </div>

      {/* Document Create/Edit Modal */}
      <KnowledgeDocumentEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        document={editingDoc}
        initialFolderId={editorInitialFolderId}
        folders={folders}
        onSave={handleSaveDoc}
      />
    </div>
  );
};

export default KnowledgeBaseView;
