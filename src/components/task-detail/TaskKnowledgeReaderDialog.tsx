import React from "react";
import { BookOpen, X, ExternalLink } from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import type { KnowledgeDocument } from "@/lib/knowledgeTypes";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TaskKnowledgeReaderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: KnowledgeDocument | null;
}

export const TaskKnowledgeReaderDialog: React.FC<TaskKnowledgeReaderDialogProps> = ({
  open,
  onOpenChange,
  document,
}) => {
  const { isEn } = useBilingual();

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden bg-slate-950 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl">
        <DialogHeader className="p-4 border-b border-slate-800 bg-slate-900/80 flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-bold flex items-center gap-2 truncate">
            <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{document.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 text-xs text-slate-200 select-text leading-relaxed">
          <div
            className="knowledge-html-content"
            dangerouslySetInnerHTML={{ __html: document.content_html }}
          />
        </div>

        <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span>
            {new Date(document.updated_at || document.created_at).toLocaleDateString(
              isEn ? "en-US" : "fa-IR"
            )}
          </span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium"
          >
            {isEn ? "Close" : "بستن"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
