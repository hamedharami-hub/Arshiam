import { useState } from "react";
import { History, Inbox, Plus } from "lucide-react";
import type { Task } from "@/lib/taskTypes";
import { periodLabel, type TimeSettings } from "@/lib/timeHorizon";
import { getTaskPlanning, isTaskOverdue } from "@/lib/taskPlanning";
import { toPersianDigits } from "@/lib/jalali";

const num = (n: number, fa: boolean) => (fa ? toPersianDigits(n) : String(n));

export function UnplannedTray({ tasks, fa, targetName, onAssign, onOpen }: { tasks: Task[]; fa: boolean; targetName: string; onAssign: (t: Task) => void; onOpen: (t: Task) => void }) {
  const [limit, setLimit] = useState(8);
  return (
    <section className="surface-card p-3" data-testid="planning-unplanned-tray">
      <header className="mb-2 flex items-center gap-2">
        <Inbox className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{fa ? "برنامه‌ریزی نشده" : "Not planned yet"}</h3>
        <span className="text-xs text-muted-foreground" data-testid="planning-unplanned-count">({num(tasks.length, fa)})</span>
      </header>
      {tasks.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">{fa ? "همهٔ تسک‌ها به یک دوره وصل شده‌اند." : "Every task belongs to a period."}</p>
      ) : (
        <ul className="divide-y divide-border/50">
          {tasks.slice(0, limit).map((t) => (
            <li key={t.id} className="flex items-center gap-2 py-1.5">
              <button type="button" onClick={() => onOpen(t)} className="min-w-0 flex-1 truncate text-start text-sm">{t.title || (fa ? "بدون عنوان" : "Untitled")}</button>
              <button type="button" onClick={() => onAssign(t)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-border px-2.5 text-xs hover:bg-muted" data-testid={`planning-unplanned-assign-${t.id}`}>
                <Plus className="h-3.5 w-3.5" />{targetName}
              </button>
            </li>
          ))}
        </ul>
      )}
      {tasks.length > limit && (
        <button type="button" onClick={() => setLimit(limit + 20)} className="mt-1 w-full rounded-lg py-1.5 text-xs text-primary hover:bg-primary/5" data-testid="planning-unplanned-more">
          {fa ? `نمایش بیشتر (${num(tasks.length - limit, true)})` : `Show more (${tasks.length - limit})`}
        </button>
      )}
    </section>
  );
}

export function CarryOverCard({ tasks, settings, fa, onMoveHere, onComplete, onDrop, onMoveAll }: {
  tasks: Task[]; settings: TimeSettings; fa: boolean;
  onMoveHere: (t: Task) => void; onComplete: (t: Task) => void; onDrop: (t: Task) => void; onMoveAll: () => void;
}) {
  if (!tasks.length) return null;
  return (
    <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3" data-testid="planning-carryover">
      <header className="mb-2 flex items-center gap-2">
        <History className="h-4 w-4 text-amber-600" />
        <h3 className="flex-1 text-sm font-semibold">{fa ? "از دوره‌های قبل مانده" : "Left from earlier periods"} <span className="text-xs font-normal text-muted-foreground">({num(tasks.length, fa)})</span></h3>
        {tasks.length > 1 && <button type="button" onClick={onMoveAll} className="h-8 rounded-full border border-amber-500/40 px-3 text-xs hover:bg-amber-500/10" data-testid="planning-carryover-move-all">{fa ? "انتقال همه" : "Move all"}</button>}
      </header>
      <ul className="space-y-2">
        {tasks.map((t) => {
          const p = getTaskPlanning(t, settings);
          const overdue = isTaskOverdue(t, settings);
          return (
            <li key={t.id} className="rounded-lg bg-background/70 p-2" data-testid={`planning-carryover-item-${t.id}`}>
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                {p && <span className="shrink-0 text-[11px] text-muted-foreground">{periodLabel(p, settings, fa ? "fa" : "en")}</span>}
                {overdue && <span className="shrink-0 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-400" data-testid={`planning-carryover-overdue-${t.id}`}>{fa ? "عقب‌افتاده" : "Overdue"}</span>}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => onMoveHere(t)} className="h-8 rounded-full bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/15" data-testid={`planning-carryover-move-${t.id}`}>{fa ? "انتقال به این دوره" : "Move here"}</button>
                <button type="button" onClick={() => onComplete(t)} className="h-8 rounded-full px-3 text-xs hover:bg-muted" data-testid={`planning-carryover-done-${t.id}`}>{fa ? "تکمیل" : "Complete"}</button>
                <button type="button" onClick={() => onDrop(t)} className="h-8 rounded-full px-3 text-xs text-muted-foreground hover:bg-muted" data-testid={`planning-carryover-drop-${t.id}`}>{fa ? "رها کردن" : "Let go"}</button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
