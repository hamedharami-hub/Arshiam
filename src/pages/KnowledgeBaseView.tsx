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
import { StudyTaskScheduleModal } from "@/components/knowledge/StudyTaskScheduleModal";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { isPharmacyImported, importPharmacyKnowledge } from "@/lib/pharmacyImportService";

export const KnowledgeBaseView: React.FC = () => {
  const { user } = useAuth();
  const { isEn } = useBilingual();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlDocId = searchParams.get("docId");
  const urlFolderId = searchParams.get("folderId");

  const [folders, setFolders] = useState<KnowledgeFolder[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [hasPharmacy, setHasPharmacy] = useState<boolean>(true);
  const [isImportingPharmacy, setIsImportingPharmacy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("knowledge_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  // Study task scheduling modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<{
    targetType: "knowledge_folder" | "knowledge_doc";
    targetId: string;
    targetTitle: string;
    folderBreadcrumb?: string;
  } | null>(null);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("knowledge_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  }, []);

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle chapters sidebar on desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  // Editor Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KnowledgeDocument | null>(null);
  const [editorInitialFolderId, setEditorInitialFolderId] = useState<string | null>(null);

  const userId = user?.id || "anonymous-kb-user";

  const loadData = useCallback(async () => {
    try {
      const [fList, dList, imported] = await Promise.all([
        getKnowledgeFolders(userId),
        getKnowledgeDocuments(userId),
        isPharmacyImported(userId),
      ]);

      setFolders(fList);
      setDocuments(dList);
      setHasPharmacy(imported);
      setSelectedDocId((prev) => prev || (dList.length > 0 ? dList[0].id : null));
    } catch (e) {
      console.error("Error loading knowledge base data", e);
    }
  }, [userId]);

  const handleImportPharmacy = useCallback(async (force = false) => {
    setIsImportingPharmacy(true);
    const toastId = toast.loading(
      isEn
        ? "Importing Pharmacy Encyclopedia (144 clinical lessons & 35 cards)..."
        : "در حال بارگذاری دایره‌المعارف دارویی (۱۴۴ درس و ۳۵ کارت لایتنر)..."
    );
    try {
      const result = await importPharmacyKnowledge(userId, { force, importCards: true });
      await loadData();
      setHasPharmacy(true);
      setSelectedFolderId("pharmacy-root");
      toast.success(
        isEn
          ? `Imported ${result.docsCount} lessons and ${result.cardsCount} flashcards!`
          : `بسته دارویی با موفقیت وارد شد (${result.docsCount} درس و ${result.cardsCount} کارت لایتنر)`,
        { id: toastId }
      );
    } catch (err: any) {
      console.error("Pharmacy import failed:", err);
      toast.error(
        err.message || (isEn ? "Failed to import pharmacy knowledge" : "خطا در بارگذاری دایره‌المعارف دارویی"),
        { id: toastId }
      );
    } finally {
      setIsImportingPharmacy(false);
    }
  }, [userId, isEn, loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync document selection from URL search params (?docId=...)
  useEffect(() => {
    if (urlDocId && documents.some((d) => d.id === urlDocId)) {
      setSelectedDocId(urlDocId);
    }
  }, [urlDocId, documents]);

  // Sync folder selection from URL search params (?folderId=...)
  useEffect(() => {
    if (urlFolderId && folders.some((f) => f.id === urlFolderId)) {
      setSelectedFolderId(urlFolderId);
      const docsInFolder = documents.filter((d) => d.folder_id === urlFolderId);
      if (docsInFolder.length > 0 && !urlDocId) {
        setSelectedDocId(docsInFolder[0].id);
      }
    }
  }, [urlFolderId, folders, documents, urlDocId]);

  // Study task scheduling handlers
  const handleScheduleFolderStudy = useCallback((folder: KnowledgeFolder) => {
    setScheduleTarget({
      targetType: "knowledge_folder",
      targetId: folder.id,
      targetTitle: folder.name,
    });
    setScheduleModalOpen(true);
  }, []);

  const handleScheduleDocStudy = useCallback((doc: KnowledgeDocument) => {
    const parent = folders.find((f) => f.id === doc.folder_id);
    setScheduleTarget({
      targetType: "knowledge_doc",
      targetId: doc.id,
      targetTitle: doc.title,
      folderBreadcrumb: parent?.name,
    });
    setScheduleModalOpen(true);
  }, [folders]);

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
    title_en?: string;
    content_html: string;
    content_en?: string;
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

  // Search & Tag filter
  const filteredDocuments = useMemo(() => {
    let docs = documents;
    if (selectedTag) {
      const t = selectedTag.toLowerCase();
      docs = docs.filter((d) => {
        if (d.tags?.some((tag) => tag.toLowerCase().includes(t))) return true;
        if (d.title?.toLowerCase().includes(t) || d.title_en?.toLowerCase().includes(t)) return true;
        return false;
      });
    }
    if (!debouncedSearch.trim()) return docs;
    const q = debouncedSearch.toLowerCase();
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.title_en && d.title_en.toLowerCase().includes(q)) ||
        (d.plain_text && d.plain_text.toLowerCase().includes(q)) ||
        (d.tags && d.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [documents, selectedTag, debouncedSearch]);


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
        <div
          className={`hidden md:block shrink-0 h-full transition-all duration-300 ease-in-out ${
            sidebarCollapsed
              ? "w-0 opacity-0 overflow-hidden -me-3 pointer-events-none"
              : "w-72 lg:w-80 opacity-100"
          }`}
        >
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
            onScheduleFolderStudy={handleScheduleFolderStudy}
            onScheduleDocStudy={handleScheduleDocStudy}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            onToggleCollapse={toggleSidebar}
            onImportPharmacy={handleImportPharmacy}
            isPharmacyImported={hasPharmacy}
            isImportingPharmacy={isImportingPharmacy}
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
              onScheduleFolderStudy={(f) => {
                handleScheduleFolderStudy(f);
                setMobileTreeOpen(false);
              }}
              onScheduleDocStudy={(d) => {
                handleScheduleDocStudy(d);
                setMobileTreeOpen(false);
              }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedTag={selectedTag}
              onSelectTag={setSelectedTag}
              onImportPharmacy={handleImportPharmacy}
              isPharmacyImported={hasPharmacy}
              isImportingPharmacy={isImportingPharmacy}
            />
          </SheetContent>
        </Sheet>

        {/* Reader Document Main Panel */}
        <div className="flex-1 flex flex-col h-full min-w-0">
          <KnowledgeDocumentReader
            document={currentDoc}
            folder={currentFolder}
            allDocuments={documents}
            onSelectDocument={(docId) => setSelectedDocId(docId)}
            onEdit={handleOpenEditDoc}
            onDelete={handleDeleteDoc}
            userId={userId}
            isSidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={toggleSidebar}
            onOpenReview={() => navigate("/app/review")}
            onDocumentUpdated={(updated) => {
              setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
            }}
            onScheduleStudy={handleScheduleDocStudy}
            onImportPharmacy={handleImportPharmacy}
            isPharmacyImported={hasPharmacy}
            isImportingPharmacy={isImportingPharmacy}
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

      {/* Study Task Schedule Modal */}
      {scheduleTarget && (
        <StudyTaskScheduleModal
          open={scheduleModalOpen}
          onOpenChange={setScheduleModalOpen}
          targetType={scheduleTarget.targetType}
          targetId={scheduleTarget.targetId}
          targetTitle={scheduleTarget.targetTitle}
          folderBreadcrumb={scheduleTarget.folderBreadcrumb}
        />
      )}
    </div>
  );
};

export default KnowledgeBaseView;
