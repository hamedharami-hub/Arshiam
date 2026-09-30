import { MoreHorizontal, Circle, CheckCircle2, BookOpen, Link as LinkIcon, Copy, CalendarDays, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task } from "@/lib/taskTypes";
import { useNavigate } from "react-router-dom";
import { getStudyTaskNavigation, isLeitnerStudyTask } from "@/lib/taskStudyService";

// Header ⋯: task-level actions only. Content actions (AI, parent, notes, delete) live in the bottom ⋯.
export interface TaskDetailActionsMenuProps {
  task: Task;
  canEdit: boolean;
  T: (fa: string, en: string) => string;
  onToggleCompletion: () => void;
  onCopyTaskLink: () => void;
  onDuplicateTask: () => void;
  onAddToCalendar?: () => void;
  onOpenFullPage?: () => void;
}

const ITEM = "flex items-center gap-2.5 px-2.5 py-2 cursor-pointer";

export function TaskDetailActionsMenu({
  task,
  canEdit,
  T,
  onToggleCompletion,
  onCopyTaskLink,
  onDuplicateTask,
  onAddToCalendar,
  onOpenFullPage,
}: TaskDetailActionsMenuProps) {
  const navigate = useNavigate();
  const isActiveLeitnerReview = isLeitnerStudyTask(task) && !task.completed;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title={T("گزینه‌های بیشتر", "More actions")}
          aria-label={T("گزینه‌های بیشتر", "More actions")}
          data-testid="task-detail-header-more"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-56 text-xs p-1">
        <DropdownMenuItem
          onClick={isActiveLeitnerReview ? () => navigate(getStudyTaskNavigation(task).navUrl) : onToggleCompletion}
          disabled={isActiveLeitnerReview ? !getStudyTaskNavigation(task).navUrl : !canEdit}
          className={ITEM}
        >
          {isActiveLeitnerReview
            ? <BookOpen className="w-4 h-4 text-muted-foreground" />
            : task.completed ? <Circle className="w-4 h-4 text-muted-foreground" /> : <CheckCircle2 className="w-4 h-4 text-muted-foreground" />}
          <span>{isActiveLeitnerReview
            ? T("شروع مرور لایتنر", "Open Leitner review")
            : task.completed ? T("بازگشایی تسک", "Reopen task") : T("تکمیل تسک", "Complete task")}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCopyTaskLink} className={ITEM}>
          <LinkIcon className="w-4 h-4 text-muted-foreground" />
          <span>{T("کپی لینک تسک", "Copy task link")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicateTask} disabled={!canEdit} className={ITEM}>
          <Copy className="w-4 h-4 text-muted-foreground" />
          <span>{T("تکثیر تسک", "Duplicate task")}</span>
        </DropdownMenuItem>
        {onAddToCalendar && (
          <DropdownMenuItem onClick={onAddToCalendar} className={ITEM}>
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <span>{T("افزودن به تقویم Android", "Add to Android Calendar")}</span>
          </DropdownMenuItem>
        )}
        {onOpenFullPage && (
          <DropdownMenuItem onClick={onOpenFullPage} className={ITEM}>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
            <span>{T("باز کردن در صفحهٔ کامل", "Open full page")}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
