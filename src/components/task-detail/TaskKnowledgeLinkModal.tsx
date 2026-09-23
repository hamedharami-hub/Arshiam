import React, { useState, useEffect } from "react";
import { BookOpen, Search, Plus, Check, Folder } from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";
import { getKnowledgeDocuments, getKnowledgeFolders } from "@/lib/knowledgeService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TaskKnowledgeLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  alreadyLinkedDocIds: string[];
  onSelectDoc: (doc: KnowledgeDocument) => void;
}

export const TaskKnowledgeLinkModal: React.FC<TaskKnowledgeLinkModalProps> = ({
  open,
  onOpenChange,
  userId,
  alreadyLinkedDocIds,
  onSelectDoc,
}) => {
  const { isEn } = useBilingual();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [folders, setFolders] = useState<KnowledgeFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open && userId) {
      (async () => {
        try {
          const [dList, fList] = await Promise.all([
            getKnowledgeDocuments(userId),
            getKnowledgeFolders(userId),
          ]);
          setDocuments(dList);
          setFolders(fList);
        } catch (e) {
          console.error("Error loading docs for linking", e);
        }
      })();
    }
  }, [open, userId]);

  const folderMap = new Map(folders.map((f) => [f.id, f.name]));

  const filtered = documents.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      (d.tags && d.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 overflow-hidden bg-slate-950 border border-slate-800 text-slate-100 rounded-3xl">
        <DialogHeader className="p-4 border-b border-slate-800 bg-slate-900/80">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>{isEn ? "Link Knowledge Document" : "اتصال سند آموزشی به تسک"}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="p-3 border-b border-slate-800/80">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute top-2.5 left-2.5 rtl:right-2.5 rtl:left-auto text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? "Search documents..." : "جستجوی اسناد و پروتکل‌ها..."}
              className="w-full py-1.5 px-8 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[200px]">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              {isEn ? "No documents found." : "سندی یافت نشد."}
            </div>
          ) : (
            filtered.map((doc) => {
              const isLinked = alreadyLinkedDocIds.includes(doc.id);
              const folderName = doc.folder_id ? folderMap.get(doc.folder_id) : null;

              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    if (!isLinked) {
                      onSelectDoc(doc);
                      onOpenChange(false);
                    }
                  }}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition cursor-pointer text-xs ${
                    isLinked
                      ? "bg-slate-900/40 border-slate-800 opacity-60 cursor-default"
                      : "bg-slate-900/80 border-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-850"
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-slate-200 truncate">{doc.title}</div>
                    {folderName && (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-400/80">
                        <Folder className="w-3 h-3" />
                        <span>{folderName}</span>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {isLinked ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                        <Check className="w-3 h-3" />
                        <span>{isEn ? "Linked" : "متصل است"}</span>
                      </span>
                    ) : (
                      <span className="p-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 flex items-center gap-1 text-[11px] font-medium">
                        <Plus className="w-3 h-3" />
                        <span>{isEn ? "Link" : "اتصال"}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
