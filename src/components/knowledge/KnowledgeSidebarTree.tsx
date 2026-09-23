import React, { useState } from "react";
import {
  Folder,
  FolderPlus,
  FileText,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  FolderOpen,
  PanelLeftClose,
} from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import type { KnowledgeFolder, KnowledgeDocument, KnowledgeFolderNode } from "@/lib/knowledgeTypes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface KnowledgeSidebarTreeProps {
  tree: KnowledgeFolderNode[];
  allFolders: KnowledgeFolder[];
  documents: KnowledgeDocument[];
  selectedDocId: string | null;
  selectedFolderId: string | null;
  onSelectDocument: (doc: KnowledgeDocument) => void;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId?: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
  onCreateDocument: (folderId: string | null) => void;
  onDeleteDocument: (docId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleCollapse?: () => void;
}

export const KnowledgeSidebarTree: React.FC<KnowledgeSidebarTreeProps> = ({
  tree,
  allFolders,
  documents,
  selectedDocId,
  selectedFolderId,
  onSelectDocument,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onCreateDocument,
  onDeleteDocument,
  searchQuery,
  onSearchChange,
  onToggleCollapse,
}) => {
  const { isEn } = useBilingual();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [targetParentId, setTargetParentId] = useState<string | null>(null);

  const toggleFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  // Auto-expand ancestor folders for selected document
  React.useEffect(() => {
    if (!selectedDocId) return;
    const doc = documents.find((d) => d.id === selectedDocId);
    if (!doc || !doc.folder_id) return;

    const toExpand: Record<string, boolean> = {};
    let currentFolderId: string | null = doc.folder_id;
    while (currentFolderId) {
      toExpand[currentFolderId] = true;
      const parent = allFolders.find((f) => f.id === currentFolderId);
      currentFolderId = parent?.parent_id || null;
    }
    setExpandedFolders((prev) => ({ ...prev, ...toExpand }));
  }, [selectedDocId, documents, allFolders]);

  const handleOpenCreateFolder = (parentId: string | null = null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetParentId(parentId);
    setNewFolderName("");
    setIsCreatingFolder(true);
  };

  const handleSaveNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim(), targetParentId);
    if (targetParentId) {
      setExpandedFolders((prev) => ({ ...prev, [targetParentId]: true }));
    }
    setIsCreatingFolder(false);
    setNewFolderName("");
  };

  // Pre-index documents by folder ID for O(1) instant lookup
  const docsByFolder = React.useMemo(() => {
    const map = new Map<string, KnowledgeDocument[]>();
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const key = doc.folder_id || "__root__";
      const list = map.get(key);
      if (list) {
        list.push(doc);
      } else {
        map.set(key, [doc]);
      }
    }
    return map;
  }, [documents]);

  const rootDocuments = docsByFolder.get("__root__") || [];

  const renderFolderNode = (node: KnowledgeFolderNode, depth = 0) => {
    const isExpanded = !!expandedFolders[node.id];
    const isSelected = selectedFolderId === node.id;
    const folderDocs = docsByFolder.get(node.id) || [];

    return (
      <div key={node.id} className="space-y-0.5 select-none">
        <div
          onClick={() => {
            onSelectFolder(isSelected ? null : node.id);
            setExpandedFolders((prev) => ({ ...prev, [node.id]: true }));
          }}
          className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl cursor-pointer transition text-xs font-medium ${
            isSelected
              ? "bg-primary/10 text-primary border border-primary/25 font-semibold"
              : "text-foreground hover:bg-muted/70"
          }`}
          style={{ paddingInlineStart: `${Math.max(8, depth * 14 + 8)}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={(e) => toggleFolder(node.id, e)}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground transition"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              )}
            </button>

            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-primary shrink-0" />
            )}

            <span className="truncate">{node.name}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-mono">
              {node.document_count}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  <MoreVertical className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                <DropdownMenuItem
                  onClick={() => onCreateDocument(node.id)}
                  className="cursor-pointer gap-2"
                >
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  <span>{isEn ? "Add document here" : "افزودن سند به این فولدر"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleOpenCreateFolder(node.id)}
                  className="cursor-pointer gap-2"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isEn ? "Add subfolder" : "افزودن زیرفولدر"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDeleteFolder(node.id)}
                  className="text-destructive focus:text-destructive cursor-pointer gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isEn ? "Delete folder" : "حذف فولدر"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Folder Children when expanded */}
        {isExpanded && (
          <div className="space-y-0.5 animate-in fade-in-50 duration-150">
            {/* Subfolders */}
            {node.children.map((subNode) => renderFolderNode(subNode, depth + 1))}

            {/* Documents inside this folder */}
            {folderDocs.map((doc) => {
              const isDocSelected = selectedDocId === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => onSelectDocument(doc)}
                  className={`group flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition text-xs ${
                    isDocSelected
                      ? "bg-primary/15 text-primary font-semibold border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  style={{
                    paddingInlineStart: `${Math.max(16, (depth + 1) * 14 + 12)}px`,
                  }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{doc.title}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDocument(doc.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive transition cursor-pointer"
                    title={isEn ? "Delete document" : "حذف سند"}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
      {/* Top Header & Search */}
      <div className="p-3.5 border-b border-border bg-muted/20 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">
            {isEn ? "Knowledge Explorer" : "فهرست پایگاه دانش"}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleOpenCreateFolder(null)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border transition cursor-pointer"
              title={isEn ? "Create new root category" : "ساخت فولدر جدید"}
            >
              <FolderPlus className="w-3.5 h-3.5 text-primary" />
              <span>{isEn ? "Folder" : "فولدر"}</span>
            </button>

            <button
              type="button"
              onClick={() => onCreateDocument(selectedFolderId)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition cursor-pointer"
              title={isEn ? "Add new document" : "افزودن سند"}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isEn ? "Doc" : "سند"}</span>
            </button>

            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden md:flex p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition cursor-pointer border border-border"
                title={isEn ? "Collapse sidebar (Ctrl+B)" : "بستن سایدبار فصل‌ها (Ctrl+B)"}
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute start-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={isEn ? "Search titles, tags, text..." : "جستجو در اسناد و داروها..."}
            className="w-full py-1.5 ps-8 pe-3 bg-background border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
          />
        </div>
      </div>

      {/* New Folder Inline Form */}
      {isCreatingFolder && (
        <form onSubmit={handleSaveNewFolder} className="p-3 bg-muted/40 border-b border-border flex flex-col gap-2 animate-in fade-in">
          <div className="text-[11px] text-primary font-semibold">
            {targetParentId
              ? isEn
                ? "New Subfolder"
                : "ساخت زیرفولدر جدید"
              : isEn
              ? "New Root Folder"
              : "ساخت فولدر اصلی"}
          </div>
          <input
            type="text"
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder={isEn ? "Folder name..." : "نام فولدر (مثلاً ضد افسردگی‌ها)..."}
            className="w-full py-1.5 px-3 bg-background border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setIsCreatingFolder(false)}
              className="px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              {isEn ? "Cancel" : "انصراف"}
            </button>
            <button
              type="submit"
              className="px-3 py-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs cursor-pointer"
            >
              {isEn ? "Create" : "ایجاد"}
            </button>
          </div>
        </form>
      )}

      {/* Folder Tree & Root Docs */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {tree.length === 0 && rootDocuments.length === 0 && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            {isEn ? "No folders or documents yet." : "هنوز فولدر یا سندی ایجاد نشده است."}
          </div>
        )}

        {/* Tree Nodes */}
        {tree.map((node) => renderFolderNode(node, 0))}

        {/* Root Documents without folder */}
        {rootDocuments.length > 0 && (
          <div className="pt-2 border-t border-border/70 space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-muted-foreground px-2 pb-1">
              {isEn ? "Root Documents" : "اسناد بدون فولدر"}
            </div>
            {rootDocuments.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className={`group flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition text-xs ${
                  selectedDocId === doc.id
                    ? "bg-primary/15 text-primary font-semibold border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{doc.title}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDocument(doc.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive transition cursor-pointer"
                  title={isEn ? "Delete document" : "حذف سند"}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
