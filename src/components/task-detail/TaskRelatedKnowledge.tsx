import React, { useState } from "react";
import { BookOpen, Plus, Unlink, FileText, ChevronRight } from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import type { KnowledgeDocument } from "@/lib/knowledgeTypes";
import { TaskKnowledgeReaderDialog } from "./TaskKnowledgeReaderDialog";

interface TaskRelatedKnowledgeProps {
  documents: KnowledgeDocument[];
  onOpenLinkModal: () => void;
  onUnlink: (docId: string) => void;
}

export const TaskRelatedKnowledge: React.FC<TaskRelatedKnowledgeProps> = ({
  documents,
  onOpenLinkModal,
  onUnlink,
}) => {
  const { isEn } = useBilingual();
  const [readingDoc, setReadingDoc] = useState<KnowledgeDocument | null>(null);

  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 pt-2 border-t border-slate-800/80">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isEn ? "Linked Knowledge & Guides" : "اسناد آموزشی و بالینی مرتبط"}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">
            {documents.length}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenLinkModal}
          className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>{isEn ? "Link Guide" : "اتصال سند"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {documents.map((doc) => (
          <div
            key={doc.id}
            onClick={() => setReadingDoc(doc)}
            className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-900 transition flex items-center justify-between gap-2 text-xs cursor-pointer group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="font-medium text-slate-200 truncate">{doc.title}</span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-slate-400 group-hover:text-emerald-400 transition flex items-center gap-0.5">
                <span>{isEn ? "Read" : "مشاهده"}</span>
                <ChevronRight className="w-3 h-3 rtl:rotate-180" />
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnlink(doc.id);
                }}
                className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                title={isEn ? "Unlink" : "قطع ارتباط"}
              >
                <Unlink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* In-Task Document Reader Dialog */}
      <TaskKnowledgeReaderDialog
        open={Boolean(readingDoc)}
        onOpenChange={(open) => {
          if (!open) setReadingDoc(null);
        }}
        document={readingDoc}
      />
    </div>
  );
};
