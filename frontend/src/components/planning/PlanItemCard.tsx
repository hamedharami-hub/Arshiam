import { useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, Check, ChevronDown, CornerDownLeft, Flag, MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/taskTypes";
import type { Horizon, Period, TimeSettings } from "@/lib/timeHorizon";
import { horizonLabel } from "@/lib/timeHorizon";
import { isDone, planOf, progressOf } from "@/lib/planCascade";
import { toSaveStatus } from "@/lib/saveFeedback";
import { clearTaskCreateIntent, getTaskCreateIntent, type TaskCreateIntent } from "@/lib/taskCreateIntent";
import type { TaskPersistenceStatus } from "@/lib/firestoreDataService";
import { readSchedule, scheduleLabel } from "@/lib/taskSchedule";
import { toPersianDigits } from "@/lib/jalali";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LEVEL_NAME, LEVEL_THEME, frac } from "./planningTheme";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { reportSave } from "@/lib/saveFeedback";
import { normalizeTaskPriority, PRIORITY_META } from "@/lib/priority";
import { useLongPress } from "@/lib/useLongPress";

export type PlanItemActions = {
  onToggle: (t: Task) => void;
  onOpen: (t: Task) => void;
  onAddChild?: (parent: Task, title: string, intentId: string) => Promise<TaskPersistenceStatus>;
  onMoveNext: (t: Task) => Promise<TaskPersistenceStatus>;
  onUnplan: (t: Task) => Promise<TaskPersistenceStatus>;
  onSetFinishCriterion?: (t: Task, criterion: string | null) => Promise<TaskPersistenceStatus>;
};

type Props = PlanItemActions & {
  task: Task; kids: Map<string, Task[]>; byId: Map<string, Task>;
  settings: TimeSettings; fa: boolean; childLevelName?: Horizon | null; valueLabel?: string;
};

export const CheckDot = ({ done, level, priority, onClick, testId, label }: { done: boolean; level: Horizon; priority?: string | null; onClick: () => void; testId: string; label?: string }) => (
  <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} data-testid={testId} aria-pressed={done}
    aria-label={label} data-state={done ? "checked" : "unchecked"} data-plan-level={level}
    className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-transform duration-200 active:scale-75",
      PRIORITY_META[normalizeTaskPriority(priority)].checkboxClass)}>
    {done && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
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

function PlanChildRow({
  task,
  period,
  settings,
  fa,
  onToggle,
  onOpen,
  onMoveNext,
  onUnplan,
}: {
  task: Task;
  period: Period | null;
  settings: TimeSettings;
  fa: boolean;
  onToggle: (task: Task) => void;
  onOpen: (task: Task) => void;
  onMoveNext: (task: Task) => Promise<TaskPersistenceStatus>;
  onUnplan: (task: Task) => Promise<TaskPersistenceStatus>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const done = isDone(task);
  const level = period?.horizon || "day";
  const longPress = useLongPress({ onLongPress: () => setMenuOpen(true), ignoreButtons: true });

  return (
    <li
      className="rounded-lg bg-muted/20 px-1.5 py-1"
      data-plan-child-row
      {...longPress.handlers}
      onClickCapture={(event) => {
        if (longPress.didFire()) { event.preventDefault(); event.stopPropagation(); }
      }}
      onContextMenu={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("input, textarea, [contenteditable='true']")) return;
        event.preventDefault();
        event.stopPropagation();
        setMenuOpen(true);
      }}
      onKeyDown={(event) => {
        if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
        event.preventDefault();
        event.stopPropagation();
        setMenuOpen(true);
      }}
    >
      <div className="flex items-center gap-1.5">
        <CheckDot
          done={done}
          level={level}
          priority={task.priority}
          onClick={() => onToggle(task)}
          testId={`plan-child-toggle-${task.id}`}
          label={fa ? (done ? "بازکردن تسک" : "تکمیل تسک") : (done ? "Reopen task" : "Complete task")}
        />
        <button
          type="button"
          data-task-row-open
          onClick={() => onOpen(task)}
          className={cn("min-w-0 flex-1 truncate text-start text-sm font-medium", done && "text-muted-foreground line-through", task.status === "wont_do" && !done && "text-muted-foreground")}
        >
          {task.status === "wont_do" && <Flag className="me-1 inline h-2.5 w-2.5 fill-current text-muted-foreground" />}
          {task.title}
        </button>
        {period && <span className={cn("inline-flex h-5 max-w-[45%] shrink-0 items-center gap-1 truncate rounded-full border border-border/50 px-1.5 text-[10px] text-muted-foreground", LEVEL_THEME[period.horizon].chip)}>
          <CalendarDays className="h-3 w-3 shrink-0" />
          <bdi className="truncate">{scheduleLabel(readSchedule(task, settings), settings, fa ? "fa" : "en")}</bdi>
        </span>}
        <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"
              aria-label={fa ? `گزینه‌های ${task.title || "زیرهدف"}` : `Actions for ${task.title || "child goal"}`}
              data-testid={`plan-child-menu-${task.id}`}
              data-no-longpress
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={() => onToggle(task)} data-testid={`plan-child-toggle-action-${task.id}`}>
              <Check className="me-2 h-4 w-4" />{fa ? (done ? "بازکردن تسک" : "تکمیل تسک") : (done ? "Reopen task" : "Complete task")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOpen(task)} data-testid={`plan-child-open-${task.id}`}>
              {fa ? "جزئیات تسک" : "Task details"}
            </DropdownMenuItem>
            {period && <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { void onMoveNext(task); }} data-testid={`plan-child-move-next-${task.id}`}>
                {fa ? "انتقال به دورهٔ بعد" : "Move to next period"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { void onUnplan(task); }} className="text-destructive" data-testid={`plan-child-unplan-${task.id}`}>
                {fa ? "برداشتن از برنامه" : "Remove from plan"}
              </DropdownMenuItem>
            </>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

export function PlanItemCard({ task, kids, byId, settings, fa, childLevelName, valueLabel, ...a }: Props) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [criterionOpen, setCriterionOpen] = useState(false);
  const [criterionDraft, setCriterionDraft] = useState(task.finish_criterion || "");
  const plan = planOf(task, settings);
  const level: Horizon = plan?.horizon || "week";
  const children = kids.get(task.id) || [];
  const prog = progressOf(task, kids);
  const parent = task.plan_parent_id ? byId.get(task.plan_parent_id) : undefined;
  const done = isDone(task);
  const scheduleText = scheduleLabel(readSchedule(task, settings), settings, fa ? "fa" : "en");
  const statusText = task.status === "wont_do"
    ? (fa ? "کنار گذاشته" : "Won't do")
    : task.status === "waiting"
      ? (fa ? "منتظر" : "Waiting")
      : done
        ? (fa ? "انجام‌شده" : "Done")
        : task.status === "in_progress"
          ? (fa ? "در حال انجام" : "In progress")
          : null;
  const statusClass = task.status === "waiting"
    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
    : task.status === "wont_do"
      ? "bg-muted text-muted-foreground border-border/70"
      : done
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
        : "bg-primary/10 text-primary border-primary/20";
  const num = (n: number) => (fa ? toPersianDigits(n) : String(n));
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const criterionSavingRef = useRef(false);
  const [criterionSaving, setCriterionSaving] = useState(false);
  const createIntent = useRef<TaskCreateIntent | null>(null);
  const longPress = useLongPress({ onLongPress: () => setMenuOpen(true), ignoreButtons: true });
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
  const saveCriterion = async () => {
    if (!a.onSetFinishCriterion || criterionSavingRef.current) return;
    criterionSavingRef.current = true;
    setCriterionSaving(true);
    let status: TaskPersistenceStatus;
    try { status = toSaveStatus(await a.onSetFinishCriterion(task, criterionDraft.trim() || null)); }
    catch { status = "failed"; }
    finally { criterionSavingRef.current = false; setCriterionSaving(false); }
    reportSave(status, fa, fa ? "معیار پایان ذخیره شد" : "Finish criterion saved");
    if (status !== "failed") setCriterionOpen(false);
  };

  return (
    <article
      className={cn("group rounded-xl border border-border/70 border-s-4 bg-card p-1.5 shadow-sm transition-colors duration-150 hover:bg-accent/40", LEVEL_THEME[level].edge)}
      data-testid={`plan-item-${task.id}`}
      data-no-swipe-nav
      {...longPress.handlers}
      onClickCapture={(event) => {
        if (longPress.didFire()) { event.preventDefault(); event.stopPropagation(); }
      }}
      onContextMenu={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("input, textarea, [contenteditable='true'], [data-plan-child-row]")) return;
        event.preventDefault();
        event.stopPropagation();
        setMenuOpen(true);
      }}
    >
      <div className="flex items-start gap-1.5">
        <CheckDot done={done} level={level} priority={task.priority} onClick={() => a.onToggle(task)} testId={`plan-item-toggle-${task.id}`} label={fa ? (done ? "بازکردن تسک" : "تکمیل تسک") : (done ? "Reopen task" : "Complete task")} />
        <button type="button" data-task-row-open className="min-w-0 flex-1 cursor-pointer select-none text-start rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" onClick={() => a.onOpen(task)} data-testid={`plan-item-open-${task.id}`}>
          {task.status === "wont_do" && <span className="me-1 inline-grid h-4 w-4 place-items-center rounded bg-muted text-muted-foreground align-middle" title={fa ? "این کار نباید انجام شود" : "This task should not be done"}><Flag className="h-2.5 w-2.5 fill-current" /></span>}
          <span className={cn("block text-sm font-medium leading-tight break-words", done && "text-muted-foreground line-through", task.status === "wont_do" && !done && "text-muted-foreground")}>{task.title || (fa ? "بدون عنوان" : "Untitled")}</span>
        </button>
        {children.length > 0 && (
          <button type="button" onClick={() => setOpen(!open)} className="flex h-8 shrink-0 items-center gap-1 rounded-md px-1.5 text-[10px] tabular-nums text-muted-foreground hover:bg-muted" data-testid={`plan-item-expand-${task.id}`} aria-expanded={open} aria-label={fa ? "نمایش یا بستن هدف‌های فرزند" : "Expand or collapse child goals"} data-no-longpress>
            {frac(prog.done, prog.total, fa)}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
          </button>
        )}
        <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button type="button" className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted" aria-label={fa ? "گزینه‌ها" : "Options"} data-testid={`plan-item-menu-${task.id}`} data-no-longpress>
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
            {a.onSetFinishCriterion && <DropdownMenuItem onSelect={() => { setCriterionDraft(task.finish_criterion || ""); setCriterionOpen(true); }} data-testid={`plan-item-finish-criterion-edit-${task.id}`}>{fa ? "معیار اختیاریِ پایان…" : "Optional finish criterion…"}</DropdownMenuItem>}
            <DropdownMenuItem onSelect={() => a.onOpen(task)}>{fa ? "جزئیات تسک" : "Task details"}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => a.onUnplan(task)} className="text-destructive" data-testid={`plan-item-unplan-${task.id}`}>{fa ? "برداشتن از برنامه" : "Remove from plan"}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="ms-5 mt-1 flex min-h-5 flex-wrap items-center gap-1.5" dir={fa ? "rtl" : "ltr"}>
        <span className="inline-flex h-5 max-w-full items-center gap-1 rounded-full border border-border/60 bg-secondary/70 px-2 text-[10px] font-medium text-secondary-foreground" title={fa ? "دورهٔ برنامه‌ریزی" : "Planning period"}>
          <CalendarDays className="h-3 w-3 shrink-0" />
          <bdi className="truncate">{scheduleText}</bdi>
        </span>
        {statusText && <span className={cn("inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-[10px] font-medium", statusClass)} data-testid={`plan-item-status-${task.id}`}>
          {task.status === "wont_do" && <Flag className="h-2.5 w-2.5 fill-current" />}
          {statusText}
        </span>}
        {parent && <ParentChip parent={parent} settings={settings} fa={fa} />}
        {valueLabel && <span className="inline-flex h-5 max-w-full items-center gap-1 truncate rounded-full border border-amber-500/20 bg-amber-500/10 px-2 text-[10px] text-amber-800 dark:text-amber-300" data-testid={`plan-value-chip-${task.id}`}>{valueLabel}</span>}
      </div>

      {children.length > 0 && (
        <div className="ms-5 mt-1.5 flex items-center gap-2" data-testid={`plan-item-progress-${task.id}`}>
          <ProgressLine ratio={prog.ratio} level={level} />
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{num(Math.round(prog.ratio * 100))}٪</span>
        </div>
      )}
      {task.finish_criterion && <p className="ms-5 mt-1 break-words text-[11px] leading-4 text-muted-foreground" data-testid={`plan-item-finish-criterion-${task.id}`}>{fa ? "معیار پایان:" : "Finish when:"} {task.finish_criterion}</p>}

      {open && children.length > 0 && (
        <ul className="ms-5 mt-2 space-y-1 border-s border-dashed border-border ps-3" data-testid={`plan-item-children-${task.id}`}>
          {children.map((c) => {
            const cp = planOf(c, settings);
            return (
              <PlanChildRow key={c.id} task={c} period={cp} settings={settings} fa={fa} onToggle={a.onToggle} onOpen={a.onOpen} onMoveNext={a.onMoveNext} onUnplan={a.onUnplan} />
            );
          })}
        </ul>
      )}

      {adding && (
        <form className="ms-5 mt-2 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <input autoFocus value={draft} disabled={saving} onChange={(e) => setDraft(e.target.value)} onBlur={() => !draft && setAdding(false)}
            placeholder={fa ? "گام کوچک‌تر…" : "Smaller step…"} className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" data-testid={`plan-item-child-input-${task.id}`} />
          <button type="submit" disabled={saving} className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50" aria-label={fa ? "افزودن" : "Add"}><CornerDownLeft className="h-4 w-4" /></button>
        </form>
      )}
      <Dialog open={criterionOpen} onOpenChange={setCriterionOpen}>
        <DialogContent dir={fa ? "rtl" : "ltr"} className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{fa ? "معیار اختیاریِ پایان هدف" : "Optional goal finish criterion"}</DialogTitle>
            <DialogDescription>{fa ? "این متن جدا از درصد زیرکارهاست و فقط با قضاوت تو مشخص می‌کند هدف چه زمانی کامل است." : "This is separate from subtask progress. It records your judgment of when the goal is complete."}</DialogDescription>
          </DialogHeader>
          <textarea value={criterionDraft} onChange={(event) => setCriterionDraft(event.target.value)} rows={3} className="w-full resize-none rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" data-testid={`plan-item-finish-criterion-input-${task.id}`} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCriterionOpen(false)}>{fa ? "انصراف" : "Cancel"}</Button>
            <Button type="button" disabled={criterionSaving} onClick={() => void saveCriterion()} data-testid={`plan-item-finish-criterion-save-${task.id}`}>{criterionSaving ? (fa ? "در حال ذخیره…" : "Saving…") : (fa ? "ذخیره" : "Save")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}
