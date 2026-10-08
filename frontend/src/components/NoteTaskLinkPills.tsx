import { Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBilingual } from "@/hooks/useBilingual";

/** Small, keyboard-accessible links from a note to its related tasks. */
export function NoteTaskLinkPills({
  taskIds,
  taskTitles,
}: {
  taskIds: string[];
  taskTitles: ReadonlyMap<string, string>;
}) {
  const navigate = useNavigate();
  const { T } = useBilingual();
  const uniqueTaskIds = [...new Set(taskIds.filter(Boolean))];
  if (!uniqueTaskIds.length) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap" data-testid="note-linked-tasks">
      {uniqueTaskIds.map((taskId, index) => {
        const title = taskTitles.get(taskId) || T(`تسک مرتبط ${index + 1}`, `Linked task ${index + 1}`);
        return (
          <button
            key={taskId}
            type="button"
            onClick={() => navigate(`/app/tasks/${encodeURIComponent(taskId)}`)}
            className="inline-flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground bg-muted/50 hover:bg-muted"
            aria-label={T(`باز کردن تسک مرتبط: ${title}`, `Open linked task: ${title}`)}
            title={title}
            data-testid={`note-linked-task-${taskId}`}
          >
            <Link2 className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate max-w-[140px]">{title}</span>
          </button>
        );
      })}
    </div>
  );
}
