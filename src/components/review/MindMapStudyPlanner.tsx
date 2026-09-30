import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, CircleDashed, PlayCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MindMapSyncStatus } from "./MindMapSyncStatus";
import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";
import {
  loadMindMapStudyProgress,
  mindMapProgressCounts,
  saveMindMapStudyStatus,
  subscribeMindMapStudyProgress,
  type MindMapStudyProgress,
  type MindMapStudyStatus,
} from "@/lib/mindMapProgress";

const STATUS_META: Record<MindMapStudyStatus, { fa: string; en: string }> = {
  later: { fa: "بعداً", en: "Later" },
  studying: { fa: "در حال مطالعه", en: "Studying" },
  done: { fa: "تمام‌شده", en: "Done" },
};

export function MindMapStudyPlanner({
  open, onOpenChange, userId, folders, documents, isEn, onOpenDocument, onProgressChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  folders: KnowledgeFolder[];
  documents: KnowledgeDocument[];
  isEn: boolean;
  onOpenDocument: (document: KnowledgeDocument) => void;
  onProgressChange: (progress: MindMapStudyProgress) => void;
}) {
  const [remainingOnly, setRemainingOnly] = useState(false);
  const [progress, setProgress] = useState(() => loadMindMapStudyProgress(userId));

  useEffect(() => {
    if (!open || !userId) return;
    return subscribeMindMapStudyProgress(userId, (next) => {
      setProgress(next);
      onProgressChange(next);
    });
  }, [open, userId, onProgressChange]);

  const folderNames = useMemo(() => new Map(folders.map((folder) => [folder.id, folder.name])), [folders]);
  const branchProgress = useMemo(() => {
    const folderById = new Map(folders.map((folder) => [folder.id, folder]));
    const rootFor = (folderId: string | null) => {
      let current = folderId ? folderById.get(folderId) : undefined;
      const seen = new Set<string>();
      while (current?.parent_id && !seen.has(current.id)) {
        seen.add(current.id);
        current = folderById.get(current.parent_id) || current;
        if (!current.parent_id) break;
      }
      return current;
    };
    const groups = new Map<string, { name: string; ids: string[] }>();
    for (const document of documents) {
      const root = rootFor(document.folder_id);
      const id = root?.id || "__unfiled__";
      const group = groups.get(id) || { name: root?.name || (isEn ? "Unfiled" : "بدون پوشه"), ids: [] };
      group.ids.push(document.id);
      groups.set(id, group);
    }
    return [...groups.entries()].map(([id, group]) => ({ id, name: group.name, counts: mindMapProgressCounts(group.ids, progress) }));
  }, [documents, folders, isEn, progress]);
  const visible = remainingOnly ? documents.filter((document) => progress[document.id] !== "done") : documents;
  const counts = mindMapProgressCounts(documents.map((document) => document.id), progress);
  const nextDocument = documents.find((document) => progress[document.id] === "studying")
    || documents.find((document) => progress[document.id] !== "done");

  const setStatus = (documentId: string, status: MindMapStudyStatus) => {
    const next = saveMindMapStudyStatus(userId, documentId, status);
    setProgress(next);
    onProgressChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{isEn ? "Mind Map study planner" : "برنامه‌ریز مطالعهٔ نقشهٔ ذهنی"}</DialogTitle>
          <DialogDescription>
            {isEn ? `${counts.done} done · ${counts.studying} studying · ${counts.later} later` : `${counts.done} تمام‌شده · ${counts.studying} در حال مطالعه · ${counts.later} برای بعد`}
          </DialogDescription>
        </DialogHeader>
        <MindMapSyncStatus userId={userId} isEn={isEn} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => nextDocument && onOpenDocument(nextDocument)} disabled={!nextDocument} className="gap-1.5">
            <PlayCircle className="h-4 w-4" />{isEn ? "Open next item" : "رفتن به مورد بعدی"}
          </Button>
          <Button type="button" size="sm" variant={remainingOnly ? "secondary" : "outline"} onClick={() => setRemainingOnly((value) => !value)}>
            {isEn ? "Remaining only" : "فقط باقی‌مانده‌ها"}
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" data-testid="mindmap-branch-progress">
          {branchProgress.map((branch) => (
            <div key={branch.id} className="shrink-0 rounded-xl border border-border bg-muted/40 px-3 py-2 text-[11px]">
              <div className="max-w-40 truncate font-semibold">{branch.name}</div>
              <div className="text-muted-foreground">{branch.counts.done}/{branch.counts.done + branch.counts.studying + branch.counts.later} {isEn ? "done" : "تمام‌شده"}</div>
            </div>
          ))}
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pe-1" data-testid="mindmap-study-planner-list">
          {visible.map((document) => {
            const status = progress[document.id] || "later";
            return (
              <div key={document.id} className="rounded-xl border border-border bg-card p-3">
                <button type="button" onClick={() => onOpenDocument(document)} className="flex w-full items-start gap-2 text-start">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold" dir="auto">{document.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{document.folder_id ? folderNames.get(document.folder_id) : (isEn ? "Unfiled" : "بدون پوشه")}</span>
                  </span>
                </button>
                <div className="mt-2 grid grid-cols-3 gap-1">
                  {(["later", "studying", "done"] as const).map((value) => (
                    <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(document.id, value)} className={`inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border px-2 text-[11px] ${status === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                      {value === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : value === "studying" ? <PlayCircle className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
                      {isEn ? STATUS_META[value].en : STATUS_META[value].fa}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
