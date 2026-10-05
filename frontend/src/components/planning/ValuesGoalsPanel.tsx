import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Compass, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeMindGoals, type MindGoalItem } from "@/lib/firestoreDataService";
import { VALUE_DOMAINS } from "@/lib/valueDomains";
import type { Task } from "@/lib/taskTypes";
import type { Period, TimeSettings } from "@/lib/timeHorizon";
import { readSchedule, schedulePeriod } from "@/lib/taskSchedule";
import { isClosed } from "@/lib/planCascade";
import { toSaveStatus } from "@/lib/saveFeedback";
import { getTaskCreateIntent, type TaskCreateIntent } from "@/lib/taskCreateIntent";
import type { TaskPersistenceStatus } from "@/lib/firestoreDataService";

export const domainOf = (key?: string | null) => VALUE_DOMAINS.find((d) => d.key === key);

/** Goals from Values & Goals, ready to become this year's plan items. */
export type GoalsState = { goals: MindGoalItem[]; status: "loading" | "ready" | "error" };

/** Live goals of the signed-in account. Empty server data empties the list; loading/error are distinct from empty. */
export function useMindGoalsState(): GoalsState {
  const { user } = useAuth();
  const uid = user?.id;
  const [state, setState] = useState<GoalsState & { uid?: string }>({ goals: [], status: "loading" });
  useEffect(() => {
    setState({ goals: [], status: "loading", uid });
    if (!uid) return;
    return subscribeMindGoals(uid,
      (goals, meta) => setState((cur) => (cur.uid !== uid ? cur : { uid, goals, status: meta.source === "server" || goals.length || (typeof navigator !== "undefined" && !navigator.onLine) ? "ready" : cur.status })),
      () => setState((cur) => (cur.uid !== uid ? cur : { ...cur, status: cur.goals.length ? "ready" : "error" })));
  }, [uid]);
  return state.uid === uid ? state : { goals: [], status: "loading" };
}
export function useMindGoals(): MindGoalItem[] {
  return useMindGoalsState().goals;
}

/** A goal is "in the plan" only through an open task scheduled within the selected year. */
export function plannedGoalIds(tasks: Task[], year: Period, settings: TimeSettings): Set<string | null | undefined> {
  return new Set(tasks.filter((t) => {
    if (t.source_type !== "values_goal" || !t.source_id || isClosed(t)) return false;
    const p = schedulePeriod(readSchedule(t, settings));
    return !!p && p.start <= year.end && p.end >= year.start;
  }).map((t) => t.source_id));
}

export function ValuesGoalsPanel({ goals, tasks, year, settings, fa, onAdd, status = "ready" }: { goals: MindGoalItem[]; tasks: Task[]; year: Period; settings: TimeSettings; fa: boolean; onAdd: (g: MindGoalItem, intentId: string) => Promise<TaskPersistenceStatus>; status?: GoalsState["status"] }) {
  const linked = useMemo(() => plannedGoalIds(tasks, year, settings), [tasks, year, settings]);
  const [adding, setAdding] = useState<Set<string>>(() => new Set());
  const addingRef = useRef(new Set<string>());
  const createIntents = useRef(new Map<string, TaskCreateIntent>());
  const addGoal = async (goal: MindGoalItem) => {
    if (addingRef.current.has(goal.id) || linked.has(goal.id)) return;
    addingRef.current.add(goal.id);
    setAdding(new Set(addingRef.current));
    let intent = createIntents.current.get(goal.id);
    if (!intent) {
      const ref = { current: null as TaskCreateIntent | null };
      intent = getTaskCreateIntent(ref, `value-goal:${goal.id}`);
      createIntents.current.set(goal.id, intent);
    }
    try {
      const result = toSaveStatus(await onAdd(goal, intent.id));
      if (result !== "failed") createIntents.current.delete(goal.id);
    } catch {
      // Keep the same intent id for a safe retry after a thrown save.
    } finally {
      addingRef.current.delete(goal.id);
      setAdding(new Set(addingRef.current));
    }
  };
  const sorted = [...goals].sort((a, b) => Number(b.horizon === "year") - Number(a.horizon === "year"));
  return (
    <section className="surface-card p-3" data-testid="planning-values-panel">
      <header className="mb-2 flex items-center gap-2">
        <Compass className="h-4 w-4 text-amber-600" />
        <h3 className="flex-1 text-sm font-semibold">{fa ? "از ارزش‌ها و اهداف" : "From Values & Goals"}</h3>
        <Link to="/app/values" className="text-[11px] text-primary hover:underline" data-testid="planning-values-open">{fa ? "ویرایش" : "Edit"}</Link>
      </header>
      {status === "loading" && sorted.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground" data-testid="planning-values-loading">{fa ? "در حال بارگذاری…" : "Loading…"}</p>
      ) : status === "error" && sorted.length === 0 ? (
        <p className="py-2 text-xs text-destructive" data-testid="planning-values-error">{fa ? "اهداف بارگذاری نشد؛ اتصال را بررسی کن." : "Could not load goals; check your connection."}</p>
      ) : sorted.length === 0 ? (
        <p className="py-2 text-xs leading-6 text-muted-foreground">
          {fa ? "هنوز هدفی در «ارزش‌ها و اهداف» ننوشته‌ای. هدف‌های سالانه‌ات را آنجا بنویس تا اینجا برای برنامهٔ امسال پیشنهاد شوند." : "No goals in Values & Goals yet. Write your yearly goals there and they will be suggested here."}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {sorted.map((g) => {
            const d = domainOf(g.domain);
            const done = linked.has(g.id);
            return (
              <li key={g.id} className="flex items-center gap-2 rounded-lg bg-background/60 px-2 py-1.5" data-testid={`planning-value-goal-${g.id}`}>
                <span className="text-base leading-none" aria-hidden>{d?.icon || "•"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{g.text}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{d ? (fa ? d.label : d.label_en) : g.domain}</span>
                </span>
                {done ? (
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] text-emerald-600"><Check className="h-3.5 w-3.5" />{fa ? "در برنامه" : "Planned"}</span>
                ) : (
                  <button type="button" disabled={adding.has(g.id)} onClick={() => void addGoal(g)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/15 disabled:opacity-50" data-testid={`planning-value-add-${g.id}`}>
                    <Plus className="h-3.5 w-3.5" />{fa ? "به امسال" : "This year"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
