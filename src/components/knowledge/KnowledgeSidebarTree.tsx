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
  Edit2,
  FolderOpen,
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

  // Filter documents if searching
  const rootDocuments = documents.filter((d) => !d.folder_id);

  const renderFolderNode = (node: KnowledgeFolderNode, depth = 0) => {
    const isExpanded = !!expandedFolders[node.id];
    const isSelected = selectedFolderId === node.id;
    const folderDocs = documents.filter((d) => d.folder_id === node.id);

    return (
      <div key={node.id} className="space-y-0.5 select-none">
        <div
          onClick={() => {
            onSelectFolder(isSelected ? null : node.id);
            setExpandedFolders((prev) => ({ ...prev, [node.id]: true }));
          }}
          className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl cursor-pointer transition text-xs font-medium ${
            isSelected
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-slate-300 hover:bg-slate-800/60"
          }`}
          style={{ paddingInlineStart: `${Math.max(8, depth * 14 + 8)}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={(e) => toggleFolder(node.id, e)}
              className="p-0.5 rounded hover:bg-slate-700/50 text-slate-400"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-emerald-400 shrink-0" />
            )}

            <span className="truncate">{node.name}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
              {node.document_count}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-slate-700 text-slate-400"
                >
                  <MoreVertical className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-slate-900 border-slate-800 text-xs">
                <DropdownMenuItem
                  onClick={() => onCreateDocument(node.id)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isEn ? "Add Document" : "افزودن سند"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => handleOpenCreateFolder(node.id, e as any)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEn ? "New Subfolder" : "زیرفولدر جدید"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDeleteFolder(node.id)}
                  className="flex items-center gap-2 text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isEn ? "Delete Folder" : "حذف فولدر"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Children folders & documents */}
        {isExpanded && (
          <div className="space-y-0.5 animate-in fade-in duration-150">
            {node.children.map((child) => renderFolderNode(child, depth + 1))}

            {folderDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition text-xs ${
                  selectedDocId === doc.id
                    ? "bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
                style={{ paddingInlineStart: `${Math.max(16, (depth + 1) * 14 + 14)}px` }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="truncate">{doc.title}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDocument(doc.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 rounded text-slate-500 hover:text-rose-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
      {/* Top Header */}
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Folder className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-xs text-white">
            {isEn ? "Folders & Docs" : "فولدرها و اسناد"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleOpenCreateFolder(null)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title={isEn ? "New Root Folder" : "ساخت فولدر اصلی"}
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onCreateDocument(selectedFolderId)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs transition cursor-pointer"
            title={isEn ? "Add Document" : "افزودن سند"}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isEn ? "Add" : "افزودن"}</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-slate-800/80">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute top-2.5 left-2.5 rtl:right-2.5 rtl:left-auto text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={isEn ? "Search documents..." : "جستجوی اسناد..."}
            className="w-full py-1.5 px-8 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* New Folder Inline Form */}
      {isCreatingFolder && (
        <form onSubmit={handleSaveNewFolder} className="p-2.5 bg-slate-900/80 border-b border-slate-800 flex flex-col gap-2 animate-in fade-in">
          <div className="text-[11px] text-emerald-400 font-semibold">
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
            className="w-full py-1 px-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setIsCreatingFolder(false)}
              className="px-2 py-1 rounded text-xs text-slate-400 hover:text-slate-200"
            >
              {isEn ? "Cancel" : "انصراف"}
            </button>
            <button
              type="submit"
              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              {isEn ? "Create" : "ایجاد"}
            </button>
          </div>
        </form>
      )}

      {/* Folder Tree & Root Docs */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {tree.length === 0 && rootDocuments.length === 0 && (
          <div className="p-4 text-center text-xs text-slate-500">
            {isEn ? "No folders or documents yet." : "هنوز فولدر یا سندی ایجاد نشده است."}
          </div>
        )}

        {/* Tree Nodes */}
        {tree.map((node) => renderFolderNode(node, 0))}

        {/* Root Documents without folder */}
        {rootDocuments.length > 0 && (
          <div className="pt-2 border-t border-slate-800/60 space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-slate-500 px-2 pb-1">
              {isEn ? "Root Documents" : "اسناد بدون فولدر"}
            </div>
            {rootDocuments.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition text-xs ${
                  selectedDocId === doc.id
                    ? "bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="truncate">{doc.title}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDocument(doc.id);
                  }}
                  className="opacity-60 hover:opacity-100 p-0.5 rounded text-slate-500 hover:text-rose-400"
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
