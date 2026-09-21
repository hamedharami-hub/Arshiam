import {
  MoreHorizontal, Pin, PinOff, Circle, CheckCircle2, Timer, FolderInput,
  Network, Link as LinkIcon, Copy, Sparkles, CheckSquare, FileText,
  Paperclip, GitBranch, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task } from "@/types";

export interface TaskDetailActionsMenuProps {
  task: Task;
  canEdit: boolean;
  allowDelete: boolean;
  T: (fa: string, en: string) => string;
  onTogglePin: () => void;
  onToggleCompletion: () => void;
  onOpenFocus: () => void;
  onOpenFolder: () => void;
  onOpenParent: () => void;
  onCopyTaskLink: () => void;
  onDuplicateTask: () => void;
  onOpenAI: () => void;
  onShowSteps: () => void;
  onAddNote: () => void;
  onShowAttachments: () => void;
  onOpenOutcome: () => void;
  onOpenActionMenu: () => void;
  onDeleteTask: () => void;
}

export function TaskDetailActionsMenu({
  task,
  canEdit,
  allowDelete,
  T,
  onTogglePin,
  onToggleCompletion,
  onOpenFocus,
  onOpenFolder,
  onOpenParent,
  onCopyTaskLink,
  onDuplicateTask,
  onOpenAI,
  onShowSteps,
  onAddNote,
  onShowAttachments,
  onOpenOutcome,
  onOpenActionMenu,
  onDeleteTask,
}: TaskDetailActionsMenuProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground transition-transform active:scale-95"
          title={T("گزینه‌های بیشتر", "More actions")}
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-56 text-xs p-1.5 space-y-0.5 rounded-2xl shadow-xl border-border/60 bg-popover/95 backdrop-blur-md">
        <DropdownMenuItem
          onClick={onTogglePin}
          disabled={!canEdit}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer hover:bg-accent focus:bg-accent"
        >
          {task.pinned ? <PinOff className="w-4 h-4 text-amber-500" /> : <Pin className="w-4 h-4 text-primary" />}
          <span>{task.pinned ? T("حذف پین", "Unpin task") : T("پین کردن تسک", "Pin task")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onToggleCompletion}
          disabled={!canEdit}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer hover:bg-accent focus:bg-accent"
        >
          {task.completed ? <Circle className="w-4 h-4 text-muted-foreground" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          <span>{task.completed ? T("بازگشایی تسک", "Reopen task") : T("تکمیل تسک", "Complete task")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onOpenFocus}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer hover:bg-accent focus:bg-accent"
        >
          <Timer className="w-4 h-4 text-rose-500" />
          <span>{T("حالت تمرکز (پومودورو)", "Pomodoro timer")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onOpenFolder}
          disabled={!canEdit}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer hover:bg-accent focus:bg-accent"
        >
          <FolderInput className="w-4 h-4 text-blue-500" />
          <span>{T("انتقال به پوشه", "Move to folder")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onOpenParent}
          disabled={!canEdit}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer hover:bg-accent focus:bg-accent"
        >
          <Network className="w-4 h-4 text-amber-500" />
          <span>{T("لینک به تسک والد", "Link to parent task")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onCopyTaskLink}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer hover:bg-accent focus:bg-accent"
        >
          <LinkIcon className="w-4 h-4 text-muted-foreground" />
          <span>{T("کپی لینک تسک", "Copy task link")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDuplicateTask}
          disabled={!canEdit}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer hover:bg-accent focus:bg-accent"
        >
          <Copy className="w-4 h-4 text-muted-foreground" />
          <span>{T("تکثیر تسک", "Duplicate task")}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 border-border/50" />
        <DropdownMenuItem
          onClick={onOpenAI}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer hover:bg-accent focus:bg-accent"
        >
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span>{T("دستیار هوش مصنوعی", "AI Assistant")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onShowSteps}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer hover:bg-accent focus:bg-accent"
        >
          <CheckSquare className="w-4 h-4 text-emerald-500" />
          <span>{T("افزودن چک‌لیست و مراحل", "Add checklist & steps")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onAddNote}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer hover:bg-accent focus:bg-accent"
        >
          <FileText className="w-4 h-4 text-blue-500" />
          <span>{T("افزودن یادداشت", "Add note")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onShowAttachments}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer hover:bg-accent focus:bg-accent"
        >
          <Paperclip className="w-4 h-4 text-purple-500" />
          <span>{T("افزودن پیوست", "Add attachment")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onOpenOutcome}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer hover:bg-accent focus:bg-accent"
        >
          <GitBranch className="w-4 h-4 text-amber-500" />
          <span>{T("شاخه‌ها و تصمیمات", "Branches & outcomes")}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 border-border/50" />
        <DropdownMenuItem
          onClick={onOpenActionMenu}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer hover:bg-accent focus:bg-accent font-medium text-foreground"
        >
          <MoreHorizontal className="w-4 h-4 text-primary" />
          <span>{T("سایر گزینه‌ها و تاریخچه…", "More actions & history…")}</span>
        </DropdownMenuItem>
        {allowDelete && canEdit && (
          <>
            <DropdownMenuSeparator className="my-1 border-border/50" />
            <DropdownMenuItem
              onClick={onDeleteTask}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer text-destructive focus:text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
              <span>{T("حذف تسک", "Delete task")}</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
