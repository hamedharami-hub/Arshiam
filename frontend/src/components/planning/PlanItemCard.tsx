import { useRef, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, CornerDownLeft, MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/taskTypes";
import type { Horizon, Period, TimeSettings } from "@/lib/timeHorizon";
import { horizonLabel, periodLabel } from "@/lib/timeHorizon";
import { isClosed, planOf, progressOf } from "@/lib/planCascade";
import { toSaveStatus } from "@/lib/saveFeedback";
import { clearTaskCreateIntent, getTaskCreateIntent, type TaskCreateIntent } from "@/lib/taskCreateIntent";
import type { TaskPersistenceStatus } from "@/lib/firestoreDataService";
import { readSchedule, scheduleLabel } from "@/lib/taskSchedule";
import { toPersianDigits } from "@/lib/jalali";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LEVEL_NAME, LEVEL_THEME, frac } from "./planningTheme";

export type PlanItemActions = {
  onToggle: (t: Task) => void;
  onOpen: (t: Task) => void;
  onAddChild?: (parent: Task, title: string, intentId: string) => Promise<TaskPersistenceStatus>;
  onMoveNext: (t: Task) => Promise<TaskPersistenceStatus>;
  onUnplan: (t: Task) => Promise<TaskPersistenceStatus>;
};

type Props = PlanItemActions & {
  task: Task; kids: Map<string, Task[]>; byId: Map<string, Task>;
  settings: TimeSettings; fa: boolean; childLevelName?: Horizon | null; valueLabel?: string;
};

export const CheckDot = ({ done, level, onClick, testId }: { done: boolean; level: Horizon; onClick: () => void; testId: string }) => (
  <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} data-testid={testId} aria-pressed={done}
    className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors duration-150",
      done ? `${LEVEL_THEME[level].bar} border-transparent text-white` : "border-muted-foreground/40 hover:border-foreground/60")}>
    {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
  </button>
);

export function ProgressLine({ ratio, level, className }: { ratio: number; level: Horizon; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", LEVEL_THEME[level].bar)} style={{ width: `${Math.round(ratio * 100)}%` }} />
    </div>
  );
}

export function ParentChip({ parent, settings, fa }: { parent: Task; settings: TimeSettings; fa: boolean }) {
  const p = planOf(parent, settings);
  const level = p?.horizon || "year";
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px]", LEVEL_THEME[level].chip)} data-testid={`plan-parent-chip-${parent.id}`}>
      <ArrowUpRight className="h-3 w-3 shrink-0" />
      <span className="shrink-0 font-medium">{LEVEL_NAME[level][fa ? "fa" : "en"]}:</span>
      <span className="truncate">{parent.title}</span>
    </span>
  );
}

export function PlanItemCard({ task, kids, byId, settings, fa, childLevelName, valueLabel, ...a }: Props) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const plan = planOf(task, settings);
  const level: Horizon = plan?.horizon || "week";
  const children = kids.get(task.id) || [];
  const prog = progressOf(task, kids);
  const parent = task.plan_parent_id ? byId.get(task.plan_parent_id) : undefined;
  const done = isClosed(task);
  const num = (n: number) => (fa ? toPersianDigits(n) : String(n));
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const createIntent = useRef<TaskCreateIntent | null>(null);
  const submit = async () => {
    const title = draft.trim();
    if (!title || !a.onAddChild || savingRef.current) return;
    const intent = getTaskCreateIntent(createIntent, `child:${task.id}:${title}`);
    savingRef.current = true;
    setSaving(true);
    let status: TaskPersistenceStatus;
    try { status = toSaveStatus(await a.onAddChild(task, title, intent.id)); }
    catch { status = "failed"; }
    finally { savingRef.current = false; setSaving(false); }
    if (status === "failed") return; // keep the typed step
    clearTaskCreateIntent(createIntent, intent);
    setDraft((current) => current.trim() === title ? "" : current);
    setAdding(false); setOpen(true);
  };

  return (
    <article className={cn("group rounded-xl border border-border/70 border-s-4 bg-card px-3 py-2.5 shadow-sm transition-shadow duration-200 hover:shadow-md", LEVEL_THEME[level].edge)} data-testid={`plan-item-${task.id}`}>
      <div className="flex items-start gap-2.5">
        <CheckDot done={done} level={level} onClick={() => a.onToggle(task)} testId={`plan-item-toggle-${task.id}`} />
        <button type="button" className="min-w-0 flex-1 text-start" onClick={() => a.onOpen(task)} data-testid={`plan-item-open-${task.id}`}>
          <p className={cn("text-sm font-medium leading-6 break-words", done && "text-muted-foreground line-through")}>{task.title || (fa ? "بدون عنوان" : "Untitled")}</p>
          {(parent || valueLabel) && (
            <div className="mt-1 flex flex-wrap gap-1">
              {parent && <ParentChip parent={parent} settings={settings} fa={fa} />}
              {valueLabel && <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-800 dark:text-amber-300" data-testid={`plan-value-chip-${task.id}`}>{valueLabel}</span>}
            </div>
          )}
        </button>
        {children.length > 0 && (
          <button type="button" onClick={() => setOpen(!open)} className="flex h-8 items-center gap-1 rounded-full px-2 text-xs text-muted-foreground hover:bg-muted" data-testid={`plan-item-expand-${task.id}`} aria-expanded={open}>
            {frac(prog.done, prog.total, fa)}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
          </button>
        )}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button type="button" className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label={fa ? "گزینه‌ها" : "Options"} data-testid={`plan-item-menu-${task.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {a.onAddChild && childLevelName && (
              <DropdownMenuItem onSelect={() => setAdding(true)} data-testid={`plan-item-add-child-${task.id}`}>
                <Plus className="me-2 h-4 w-4" />{fa ? `شکستن به کار ${horizonLabel(childLevelName, "fa")}` : `Break into ${horizonLabel(childLevelName, "en").toLowerCase()} steps`}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => a.onMoveNext(task)} data-testid={`plan-item-move-next-${task.id}`}>{fa ? "انتقال به دورهٔ بعد" : "Move to next period"}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => a.onOpen(task)}>{fa ? "جزئیات تسک" : "Task details"}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => a.onUnplan(task)} className="text-destructive" data-testid={`plan-item-unplan-${task.id}`}>{fa ? "برداشتن از برنامه" : "Remove from plan"}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {children.length > 0 && (
        <div className="mt-2 flex items-center gap-2 ps-8">
          <ProgressLine ratio={prog.ratio} level={level} />
          <span className="text-[11px] tabular-nums text-muted-foreground">{num(Math.round(prog.ratio * 100))}٪</span>
        </div>
      )}

      {open && children.length > 0 && (
        <ul className="mt-2 space-y-1 border-s border-dashed border-border ps-3 ms-8" data-testid={`plan-item-children-${task.id}`}>
          {children.map((c) => {
            const cp = planOf(c, settings);
            return (
              <li key={c.id} className="flex items-center gap-2 text-sm">
                <CheckDot done={isClosed(c)} level={cp?.horizon || "day"} onClick={() => a.onToggle(c)} testId={`plan-child-toggle-${c.id}`} />
                <button type="button" onClick={() => a.onOpen(c)} className={cn("min-w-0 flex-1 truncate text-start", isClosed(c) && "text-muted-foreground line-through")}>{c.title}</button>
                {cp && <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px]", LEVEL_THEME[cp.horizon].chip)}>{scheduleLabel(readSchedule(c, settings), settings, fa ? "fa" : "en")}</span>}
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <form className="mt-2 flex items-center gap-2 ps-8" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <input autoFocus value={draft} disabled={saving} onChange={(e) => setDraft(e.target.value)} onBlur={() => !draft && setAdding(false)}
            placeholder={fa ? "گام کوچک‌تر…" : "Smaller step…"} className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" data-testid={`plan-item-child-input-${task.id}`} />
          <button type="submit" disabled={saving} className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50" aria-label={fa ? "افزودن" : "Add"}><CornerDownLeft className="h-4 w-4" /></button>
        </form>
      )}
    </article>
  );
}
