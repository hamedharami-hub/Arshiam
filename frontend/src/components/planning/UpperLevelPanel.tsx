import { useRef, useState } from "react";
import { ArrowDownToLine, CheckCircle2, CornerDownLeft, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/taskTypes";
import type { Horizon, Period, TimeSettings } from "@/lib/timeHorizon";
import { periodLabel } from "@/lib/timeHorizon";
import { isClosed, planOf, progressOf } from "@/lib/planCascade";
import { toPersianDigits } from "@/lib/jalali";
import { LEVEL_NAME, LEVEL_THEME, NOW_LABEL, frac } from "./planningTheme";
import { ProgressLine } from "./PlanItemCard";
import { toSaveStatus } from "@/lib/saveFeedback";
import { clearTaskCreateIntent, getTaskCreateIntent, type TaskCreateIntent } from "@/lib/taskCreateIntent";
import type { TaskPersistenceStatus } from "@/lib/firestoreDataService";

type Props = {
  parentPeriod: Period; items: Task[]; kids: Map<string, Task[]>; current: Period; settings: TimeSettings; fa: boolean;
  onPull: (parent: Task, title: string, intentId: string) => Promise<TaskPersistenceStatus>; onMoveHere: (t: Task) => Promise<TaskPersistenceStatus>; onOpen: (t: Task) => void;
};

function UpperRow({ t, kids, current, settings, fa, onPull, onMoveHere, onOpen }: Omit<Props, "parentPeriod" | "items"> & { t: Task }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const createIntent = useRef<TaskCreateIntent | null>(null);
  const level = planOf(t, settings)?.horizon || "month";
  const prog = progressOf(t, kids);
  const here = (kids.get(t.id) || []).filter((c) => { const p = planOf(c, settings); return p && p.start >= current.start && p.start <= current.end; }).length;
  const num = (n: number) => (fa ? toPersianDigits(n) : String(n));
  const nowName = NOW_LABEL[current.horizon][fa ? "fa" : "en"];
  const submitPull = async (title: string, fromDraft: boolean) => {
    const cleanTitle = title.trim();
    if (!cleanTitle || savingRef.current) return;
    const intent = getTaskCreateIntent(createIntent, `upper:${t.id}:${current.start}:${current.end}:${cleanTitle}`);
    savingRef.current = true;
    setSaving(true);
    let status: TaskPersistenceStatus;
    try { status = toSaveStatus(await onPull(t, cleanTitle, intent.id)); }
    catch { status = "failed"; }
    finally { savingRef.current = false; setSaving(false); }
    if (status === "failed") return;
    clearTaskCreateIntent(createIntent, intent);
    if (fromDraft) setDraft((value) => value?.trim() === cleanTitle ? null : value);
  };
  const moveHere = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try { await onMoveHere(t); }
    catch { /* PlanningBoard reports the persistence result. */ }
    finally { savingRef.current = false; setSaving(false); }
  };
  return (
    <li className="rounded-xl border border-border/60 bg-background/60 p-2.5" data-testid={`plan-upper-${t.id}`}>
      <div className="flex items-start gap-2">
        <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", LEVEL_THEME[level].dot)} />
        <button type="button" onClick={() => onOpen(t)} className={cn("min-w-0 flex-1 text-start text-sm leading-6", isClosed(t) && "line-through text-muted-foreground")}>{t.title}</button>
        {here > 0 && <span className="mt-1 inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 text-[11px] text-emerald-700 dark:text-emerald-400" data-testid={`plan-upper-here-${t.id}`}><CheckCircle2 className="h-3 w-3" />{fa ? `${num(here)} در ${nowName}` : `${here} in ${nowName.toLowerCase()}`}</span>}
      </div>
      {prog.total > 0 && <div className="mt-1.5 flex items-center gap-2 ps-4"><ProgressLine ratio={prog.ratio} level={level} /><span className="text-[10px] tabular-nums text-muted-foreground">{frac(prog.done, prog.total, fa)}</span></div>}
      {draft === null ? (
        <div className="mt-2 flex flex-wrap gap-1.5 ps-4">
          <button type="button" disabled={saving} onClick={() => void submitPull(t.title, false)} className="inline-flex h-8 items-center gap-1 rounded-full bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/15 disabled:opacity-50" data-testid={`plan-upper-pull-${t.id}`}>
            <Plus className="h-3.5 w-3.5" />{fa ? `به ${nowName}` : `To ${nowName.toLowerCase()}`}
          </button>
          <button type="button" disabled={saving} onClick={() => setDraft("")} className="inline-flex h-8 items-center rounded-full px-3 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50" data-testid={`plan-upper-step-${t.id}`}>
            {fa ? "گام کوچک‌تر…" : "Smaller step…"}
          </button>
          <button type="button" disabled={saving} onClick={() => void moveHere()} title={fa ? "خود این آیتم به این دوره منتقل شود" : "Move this item itself here"} className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50" data-testid={`plan-upper-move-${t.id}`}>
            <ArrowDownToLine className="h-3.5 w-3.5" />{fa ? "انتقال" : "Move"}
          </button>
        </div>
      ) : (
        <form className="mt-2 flex gap-1.5 ps-4" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) void submitPull(draft, true); }}>
          <input autoFocus value={draft} disabled={saving} onChange={(e) => setDraft(e.target.value)} onBlur={() => !draft && setDraft(null)} placeholder={fa ? "گام کوچک‌تر برای این دوره" : "Smaller step for this period"}
            className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" data-testid={`plan-upper-step-input-${t.id}`} />
          <button type="submit" disabled={saving} className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50" aria-label={fa ? "افزودن" : "Add"}><CornerDownLeft className="h-4 w-4" /></button>
        </form>
      )}
    </li>
  );
}

export function UpperLevelPanel({ parentPeriod, items, ...rest }: Props) {
  const { settings, fa } = rest;
  const level: Horizon = parentPeriod.horizon;
  return (
    <section className="surface-card p-3" data-testid="planning-upper-panel">
      <header className="mb-2 flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 rounded-full", LEVEL_THEME[level].dot)} />
        <h3 className="text-sm font-semibold">{fa ? `از ${LEVEL_NAME[level].fa}: ` : `From ${LEVEL_NAME[level].en}: `}{periodLabel(parentPeriod, settings, fa ? "fa" : "en")}</h3>
      </header>
      {items.length === 0 ? (
        <p className="py-3 text-xs leading-6 text-muted-foreground">{fa ? `برای این ${LEVEL_NAME[level].fa} هنوز چیزی ننوشته‌ای. از سطح «${LEVEL_NAME[level].fa}» شروع کن تا اینجا پیشنهاد شود.` : `Nothing planned for this ${LEVEL_NAME[level].en.toLowerCase()} yet. Plan that level first and it will show up here.`}</p>
      ) : (
        <ul className="space-y-2">{items.map((t) => <UpperRow key={t.id} t={t} {...rest} />)}</ul>
      )}
    </section>
  );
}
