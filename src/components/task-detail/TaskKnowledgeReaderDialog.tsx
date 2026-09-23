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
      <DialogContent className="max-w-md sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-card border border-border text-foreground rounded-3xl shadow-2xl">
        <DialogHeader className="p-4 border-b border-border bg-muted/40 flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-bold flex items-center gap-2 truncate">
            <BookOpen className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">{document.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 text-xs text-foreground select-text leading-relaxed">
          <div
            className="knowledge-html-content"
            dangerouslySetInnerHTML={{ __html: document.content_html }}
          />
        </div>

        <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {new Date(document.updated_at || document.created_at).toLocaleDateString(
              isEn ? "en-US" : "fa-IR"
            )}
          </span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3.5 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold border border-border cursor-pointer transition"
          >
            {isEn ? "Close" : "بستن"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
