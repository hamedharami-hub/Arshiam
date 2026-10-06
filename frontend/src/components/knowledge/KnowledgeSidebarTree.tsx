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
  Network,
  CalendarPlus,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBilingual } from "@/hooks/useBilingual";
import { useLongPress } from "@/lib/useLongPress";
import type { KnowledgeFolder, KnowledgeDocument, KnowledgeFolderNode } from "@/lib/knowledgeTypes";
import { getFolderAncestorIds } from "@/lib/knowledgeService";
import { PHARMACY_ROOT_FOLDER_ID } from "@/lib/pharmacyConstants";
import { splitPharmacyRootFolders } from "@/lib/pharmacyCategorySections";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function countDocumentsInSubtree(node: KnowledgeFolderNode): number {
  return node.document_count + node.children.reduce(
    (total, child) => total + countDocumentsInSubtree(child),
    0,
  );
}

interface FolderRowItemProps {
  node: KnowledgeFolderNode;
  depth: number;
  isSelected: boolean;
  isExpanded: boolean;
  isEn: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onSelect: () => void;
  onCreateDocument: (folderId: string) => void;
  onCreateSubfolder: (folderId: string) => void;
  onViewMindMap: (folderId: string) => void;
  onScheduleStudy?: (folder: KnowledgeFolder) => void;
  onDelete: (folderId: string) => void;
}

const FolderRowItem: React.FC<FolderRowItemProps> = ({
  node,
  depth,
  isSelected,
  isExpanded,
  isEn,
  onToggle,
  onSelect,
  onCreateDocument,
  onCreateSubfolder,
  onViewMindMap,
  onScheduleStudy,
  onDelete,
}) => {
  const longPress = useLongPress({
    onLongPress: () => {
      onScheduleStudy?.(node);
    },
    delay: 500,
  });

  return (
    <div
      {...longPress.handlers}
      onClick={() => {
        if (longPress.didFire()) return;
        onSelect();
      }}
      className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl cursor-pointer transition text-xs font-medium ${
        isSelected
          ? "bg-primary/10 text-primary border border-primary/25 font-semibold"
          : "text-foreground hover:bg-muted/70"
      }`}
      style={{ paddingInlineStart: `${Math.max(8, depth * 14 + 8)}px` }}
    >
      <div className="flex min-w-0 flex-1 items-start gap-1.5">
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-label={isEn ? `Toggle ${node.name}` : `باز و بسته کردن ${node.name}`}
          onClick={(e) => onToggle(e)}
          className="min-h-8 min-w-8 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground transition"
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          )}
        </button>

        {isExpanded ? (
          <FolderOpen
            className="w-4 h-4 shrink-0 transition"
            style={node.color ? { color: node.color } : undefined}
          />
        ) : (
          <Folder
            className="w-4 h-4 shrink-0 transition"
            style={node.color ? { color: node.color } : undefined}
          />
        )}

        <span className="min-w-0 flex-1 whitespace-normal break-words leading-5" style={{ overflowWrap: "anywhere" }}>{node.name}</span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-mono">
          {countDocumentsInSubtree(node)}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label={isEn ? `Actions for ${node.name}` : `عملیات فولدر ${node.name}`}
              className="min-h-8 min-w-8 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
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
              onClick={() => onCreateSubfolder(node.id)}
              className="cursor-pointer gap-2"
            >
              <FolderPlus className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isEn ? "Add subfolder" : "افزودن زیرفولدر"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onViewMindMap(node.id)}
              className="cursor-pointer gap-2"
            >
              <Network className="w-3.5 h-3.5 text-primary" />
              <span>{isEn ? "View Mind Map" : "مشاهده نقشه ذهنی این فولدر"}</span>
            </DropdownMenuItem>
            {onScheduleStudy && (
              <DropdownMenuItem
                onClick={() => onScheduleStudy(node)}
                className="cursor-pointer gap-2"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isEn ? "Schedule study task" : "برنامه‌ریزی مطالعه این شاخه (تسک)"}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onDelete(node.id)}
              className="text-destructive focus:text-destructive cursor-pointer gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isEn ? "Delete folder" : "حذف فولدر"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

interface DocumentRowItemProps {
  doc: KnowledgeDocument;
  depth?: number;
  isSelected: boolean;
  isEn: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onScheduleStudy?: (doc: KnowledgeDocument) => void;
}

const DocumentRowItem: React.FC<DocumentRowItemProps> = ({
  doc,
  depth = 0,
  isSelected,
  isEn,
  onSelect,
  onDelete,
  onScheduleStudy,
}) => {
  const longPress = useLongPress({
    onLongPress: () => {
      onScheduleStudy?.(doc);
    },
    delay: 500,
  });

  return (
    <div
      {...longPress.handlers}
      onClick={() => {
        if (longPress.didFire()) return;
        onSelect();
      }}
      className={`group flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition text-xs ${
        isSelected
          ? "bg-primary/15 text-primary font-semibold border border-primary/30"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
      style={{
        paddingInlineStart: `${Math.max(16, depth * 14 + 12)}px`,
      }}
    >
      <div className="flex min-w-0 flex-1 items-start gap-1.5">
        <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="min-w-0 flex-1 whitespace-normal break-words leading-5" style={{ overflowWrap: "anywhere" }} dir="auto">{isEn ? doc.title_en || doc.title : doc.title}</span>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {onScheduleStudy && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onScheduleStudy(doc);
            }}
            className="opacity-100 min-h-8 min-w-8 inline-flex items-center justify-center p-0.5 rounded text-muted-foreground hover:text-emerald-500 transition cursor-pointer"
            title={isEn ? "Schedule study task" : "برنامه‌ریزی مطالعه این درس"}
          >
            <CalendarPlus className="w-3 h-3" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-100 min-h-8 min-w-8 inline-flex items-center justify-center p-0.5 rounded text-muted-foreground hover:text-destructive transition cursor-pointer"
          title={isEn ? "Delete document" : "حذف سند"}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

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
  onScheduleFolderStudy?: (folder: KnowledgeFolder) => void;
  onScheduleDocStudy?: (doc: KnowledgeDocument) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
  onToggleCollapse?: () => void;
}

export const HIGH_YIELD_TAG_FILTERS = [
  { id: "all", labelFa: "همه", labelEn: "All", icon: "✨" },
  { id: "Respiratory", labelFa: "تنفسی", labelEn: "Respiratory", icon: "🫁" },
  { id: "Gastrointestinal", labelFa: "گوارش", labelEn: "GI", icon: "🫄" },
  { id: "Dermatology", labelFa: "پوست", labelEn: "Derma", icon: "🧴" },
  { id: "Pain", labelFa: "درد", labelEn: "Pain", icon: "⚡" },
  { id: "CYP", labelFa: "سیتوکروم", labelEn: "CYP", icon: "🧬" },
  { id: "Monograph", labelFa: "مونوگراف", labelEn: "Monograph", icon: "💊" },
  { id: "Schedule S2", labelFa: "گروه S2", labelEn: "Schedule S2", icon: "🟢" },
  { id: "Schedule S3", labelFa: "گروه S3", labelEn: "Schedule S3", icon: "🟠" },
  { id: "Schedule S4", labelFa: "گروه S4", labelEn: "Schedule S4", icon: "🔴" },
  { id: "Schedule S8", labelFa: "گروه S8", labelEn: "Schedule S8", icon: "🔒" },
  { id: "RedFlags", labelFa: "علائم هشدار", labelEn: "Red Flags", icon: "🚨" },
  { id: "Slang", labelFa: "اصطلاحات", labelEn: "Slang", icon: "🗣️" },
  { id: "Scenario", labelFa: "سناریو بالینی", labelEn: "Scenario", icon: "📋" },
];

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
  onScheduleFolderStudy,
  onScheduleDocStudy,
  searchQuery,
  onSearchChange,
  selectedTag,
  onSelectTag,
  onToggleCollapse,
}) => {
  const { isEn } = useBilingual();
  const navigate = useNavigate();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [showOtherPharmacyFolders, setShowOtherPharmacyFolders] = useState(false);
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

    const toExpand = Object.fromEntries(
      getFolderAncestorIds(doc.folder_id, allFolders).map((folderId) => [folderId, true]),
    );
    setExpandedFolders((prev) => ({ ...prev, ...toExpand }));
  }, [selectedDocId, documents, allFolders]);

  // Auto-expand ancestor folders when selectedFolderId is activated
  React.useEffect(() => {
    if (!selectedFolderId) return;
    const toExpand = Object.fromEntries(
      getFolderAncestorIds(selectedFolderId, allFolders).map((folderId) => [folderId, true]),
    );
    setExpandedFolders((prev) => ({ ...prev, ...toExpand }));
  }, [selectedFolderId, allFolders]);

  const allFoldersRef = React.useRef(allFolders);
  allFoldersRef.current = allFolders;
  React.useEffect(() => {
    if (selectedFolderId === PHARMACY_ROOT_FOLDER_ID && !selectedDocId) {
      const { main } = splitPharmacyRootFolders(
        allFoldersRef.current.filter((folder) => folder.parent_id === PHARMACY_ROOT_FOLDER_ID),
      );
      setExpandedFolders({
        [PHARMACY_ROOT_FOLDER_ID]: true,
        ...Object.fromEntries(main.map((folder) => [folder.id, true])),
      });
    }
  }, [selectedFolderId, selectedDocId]);

  React.useEffect(() => {
    const selectedDocumentFolder = documents.find((doc) => doc.id === selectedDocId)?.folder_id;
    const folderId = selectedFolderId || selectedDocumentFolder;
    if (!folderId) return;
    const { additional } = splitPharmacyRootFolders(
      allFolders.filter((folder) => folder.parent_id === PHARMACY_ROOT_FOLDER_ID),
    );
    const additionalIds = new Set(additional.map((folder) => folder.id));
    if (getFolderAncestorIds(folderId, allFolders).some((id) => additionalIds.has(id))) {
      setShowOtherPharmacyFolders(true);
    }
  }, [selectedDocId, selectedFolderId, documents, allFolders]);

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

  const folderIds = React.useMemo(() => new Set(allFolders.map((folder) => folder.id)), [allFolders]);
  const unfiledDocuments = React.useMemo(
    () => documents.filter((doc) => !doc.folder_id || !folderIds.has(doc.folder_id)),
    [documents, folderIds],
  );

  const renderFolderNode = (node: KnowledgeFolderNode, depth = 0) => {
    const isExpanded = !!expandedFolders[node.id];
    const isSelected = selectedFolderId === node.id;
    const folderDocs = docsByFolder.get(node.id) || [];
    const { main: visibleChildren, additional: otherChildren } = node.id === PHARMACY_ROOT_FOLDER_ID
      ? splitPharmacyRootFolders(node.children)
      : { main: node.children, additional: [] as KnowledgeFolderNode[] };

    return (
      <div key={node.id} className="space-y-0.5 select-none">
        <FolderRowItem
          node={node}
          depth={depth}
          isSelected={isSelected}
          isExpanded={isExpanded}
          isEn={isEn}
          onToggle={(e) => toggleFolder(node.id, e)}
          onSelect={() => {
            onSelectFolder(isSelected ? null : node.id);
            setExpandedFolders((prev) => ({ ...prev, [node.id]: true }));
          }}
          onCreateDocument={(fId) => onCreateDocument(fId)}
          onCreateSubfolder={(pId) => handleOpenCreateFolder(pId)}
          onViewMindMap={(fId) => navigate(`/app/knowledge-mindmap?folderId=${encodeURIComponent(fId)}`)}
          onScheduleStudy={onScheduleFolderStudy}
          onDelete={(fId) => onDeleteFolder(fId)}
        />

        {/* Folder Children when expanded */}
        {isExpanded && (
          <div className="space-y-0.5 animate-in fade-in-50 duration-150">
            {/* Subfolders */}
            {visibleChildren.map((subNode) => renderFolderNode(subNode, depth + 1))}
            {otherChildren.length > 0 && (
              <div className="space-y-0.5">
                <button
                  type="button"
                  aria-expanded={showOtherPharmacyFolders}
                  onClick={() => setShowOtherPharmacyFolders((open) => !open)}
                  className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-start text-[11px] font-medium text-muted-foreground hover:bg-muted/70"
                >
                  {showOtherPharmacyFolders ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  {isEn ? "Earlier and other collections" : "مجموعه‌های قدیمی و پوشه‌های دیگر"} ({otherChildren.length})
                </button>
                {showOtherPharmacyFolders && otherChildren.map((subNode) => renderFolderNode(subNode, depth + 1))}
              </div>
            )}

            {/* Documents inside this folder */}
            {folderDocs.map((doc) => (
              <DocumentRowItem
                key={doc.id}
                doc={doc}
                depth={depth + 1}
                isSelected={selectedDocId === doc.id}
                isEn={isEn}
                onSelect={() => onSelectDocument(doc)}
                onDelete={() => onDeleteDocument(doc.id)}
                onScheduleStudy={onScheduleDocStudy}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      {/* Top Header & Search */}
      <div className="p-3.5 border-b border-border bg-muted/20 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">
            {isEn ? "Knowledge Explorer" : "فهرست پایگاه دانش"}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate(selectedFolderId ? `/app/knowledge-mindmap?folderId=${encodeURIComponent(selectedFolderId)}` : "/app/knowledge-mindmap")}
              className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-primary transition cursor-pointer border border-border"
              title={isEn ? "Open Mind Map" : "نقشه ذهنی پایگاه دانش"}
            >
              <Network className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleOpenCreateFolder(null)}
              className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-primary transition cursor-pointer border border-border"
              title={isEn ? "Create new root category" : "ساخت فولدر جدید"}
              aria-label={isEn ? "New folder" : "فولدر جدید"}
              data-testid="knowledge-new-folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
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
            onKeyDown={(e) => { if (e.key === "Escape" && searchQuery) { e.preventDefault(); onSearchChange(""); } }}
            data-testid="knowledge-search-input"
            aria-label={isEn ? "Search knowledge" : "جستجو در پایگاه دانش"}
            className="w-full py-1.5 ps-8 pe-8 bg-background border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute end-1.5 top-1/2 -translate-y-1/2 grid h-5 w-5 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={isEn ? "Clear search" : "پاک کردن جستجو"}
              data-testid="knowledge-search-clear"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* High-Yield Category Tag Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-0.5 px-0.5">
          {HIGH_YIELD_TAG_FILTERS.map((tag) => {
            const isTagActive =
              tag.id === "all" ? !selectedTag : selectedTag?.toLowerCase() === tag.id.toLowerCase();
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() =>
                  onSelectTag?.(tag.id === "all" ? null : isTagActive ? null : tag.id)
                }
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold shrink-0 transition flex items-center gap-1 cursor-pointer border ${
                  isTagActive
                    ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                    : "bg-background hover:bg-secondary text-muted-foreground hover:text-foreground border-border"
                }`}
              >
                <span>{tag.icon}</span>
                <span>{isEn ? tag.labelEn : tag.labelFa}</span>
              </button>
            );
          })}
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
        {tree.length === 0 && unfiledDocuments.length === 0 && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            {isEn ? "No folders or documents yet." : "هنوز فولدر یا سندی ایجاد نشده است."}
          </div>
        )}

        {/* Tree Nodes */}
        {tree.map((node) => renderFolderNode(node, 0))}

        {/* Keep root and orphaned documents visible instead of hiding broken folder links. */}
        {unfiledDocuments.length > 0 && (
          <div className="pt-2 border-t border-border/70 space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-muted-foreground px-2 pb-1">
              {isEn ? "Unfiled or unavailable-folder documents" : "اسناد بدون فولدر یا با فولدر ناموجود"}
            </div>
            {unfiledDocuments.map((doc) => (
              <DocumentRowItem
                key={doc.id}
                doc={doc}
                depth={0}
                isSelected={selectedDocId === doc.id}
                isEn={isEn}
                onSelect={() => onSelectDocument(doc)}
                onDelete={() => onDeleteDocument(doc.id)}
                onScheduleStudy={onScheduleDocStudy}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
