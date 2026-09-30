import { useState } from "react";
import { Calendar, Check, Flag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PriorityFlag } from "@/components/PriorityFlag";
import { DueDatePicker } from "@/components/DueDatePicker";
import { PRIORITY_META, type Priority } from "@/lib/priority";

const OPTIONS: Priority[] = ["urgent", "high", "medium", "low", "none"];

export type TaskMetaPatch = { priority?: Priority; due_date?: string | null };

// Clickable priority flag + due date chips with their own pickers (used on kanban cards).
export function TaskMetaQuickEdit({
  taskId,
  priority,
  dueDate,
  isEn,
  onChange,
}: {
  taskId: string;
  priority: Priority;
  dueDate?: string | null;
  isEn: boolean;
  onChange: (patch: TaskMetaPatch) => void;
}) {
  const [dateOpen, setDateOpen] = useState(false);
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const dateLabel = dueDate
    ? new Date(dueDate).toLocaleDateString(isEn ? "en-US" : "fa-IR", { month: "short", day: "numeric" })
    : T("تاریخ", "Date");

  return (
    <div className="flex items-center gap-1" onClick={stop} onPointerDown={stop}>
      <DropdownMenu dir={isEn ? "ltr" : "rtl"}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="grid h-6 w-6 place-items-center rounded hover:bg-muted"
            aria-label={T("اولویت", "Priority")}
            title={T("اولویت", "Priority")}
            data-testid={`task-priority-trigger-${taskId}`}
          >
            {priority === "none" ? <Flag className="h-4 w-4 text-muted-foreground/60" /> : <PriorityFlag priority={priority} />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          {OPTIONS.map((p) => (
            <DropdownMenuItem key={p} onClick={() => onChange({ priority: p })} className="gap-2 text-xs" data-testid={`task-priority-option-${p}`}>
              <PriorityFlag priority={p} />
              <span className="flex-1">{isEn ? PRIORITY_META[p].labelEn : PRIORITY_META[p].label}</span>
              {priority === p && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`inline-flex h-6 items-center gap-1 rounded px-1.5 text-[11px] hover:bg-muted ${dueDate ? "text-muted-foreground" : "text-muted-foreground/60"}`}
            aria-label={T("تاریخ سررسید", "Due date")}
            data-testid={`task-date-trigger-${taskId}`}
          >
            <Calendar className="h-3 w-3" />
            <span>{dateLabel}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-3" dir={isEn ? "ltr" : "rtl"} data-testid={`task-date-popover-${taskId}`}>
          <DueDatePicker value={dueDate || null} onChange={(iso) => onChange({ due_date: iso })} compact />
        </PopoverContent>
      </Popover>
    </div>
  );
}
