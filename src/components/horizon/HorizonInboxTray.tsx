import { useMemo, useState } from "react";
import { ChevronDown, Inbox, Plus } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { getTaskTime, type TimeSettings } from "@/lib/timeHorizon";
import type { Task } from "@/lib/taskTypes";

export function HorizonInboxTray({ tasks, settings, fa, onAssign }: {
  tasks: Task[];
  settings: TimeSettings;
  fa: boolean;
  onAssign: (task: Task) => void;
}) {
  const [open, setOpen] = useState(false);
  const unplanned = useMemo(
    () => tasks.filter((t) => !t.completed && !t.parent_id && !getTaskTime(t, settings)),
    [tasks, settings],
  );
  if (!unplanned.length) return null;
  const num = (n: number) => (fa ? toPersianDigits(n) : String(n));
  return (
    <section className="rounded-2xl border border-border/60 bg-card/50" data-testid="horizon-inbox-tray">
      <button
        type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-start"
        data-testid="horizon-inbox-tray-toggle"
      >
        <Inbox className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-xs font-semibold">
          {fa ? "برنامه‌ریزی نشده" : "Not planned yet"}
          <span className="ms-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">{num(unplanned.length)}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="max-h-64 space-y-1 overflow-y-auto border-t border-border/50 p-2">
          {unplanned.slice(0, 40).map((t) => (
            <li key={t.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60" data-testid={`horizon-inbox-task-${t.id}`}>
              <span className="min-w-0 flex-1 truncate text-sm" dir="auto">{t.title}</span>
              <button
                type="button" onClick={() => onAssign(t)}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-primary/30 px-2.5 text-xs font-medium text-primary hover:bg-primary/10"
                aria-label={fa ? "افزودن به این دوره" : "Add to this period"}
                data-testid={`horizon-inbox-assign-${t.id}`}
              >
                <Plus className="h-3.5 w-3.5" />{fa ? "به این دوره" : "Add here"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
