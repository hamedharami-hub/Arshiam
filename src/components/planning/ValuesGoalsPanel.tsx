import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Compass, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeMindGoals, type MindGoalItem } from "@/lib/firestoreDataService";
import { VALUE_DOMAINS } from "@/lib/valueDomains";
import type { Task } from "@/lib/taskTypes";

export const domainOf = (key?: string | null) => VALUE_DOMAINS.find((d) => d.key === key);

/** Goals from Values & Goals, ready to become this year's plan items. */
export function useMindGoals(): MindGoalItem[] {
  const { user } = useAuth();
  const [goals, setGoals] = useState<MindGoalItem[]>(() => {
    try { return user ? JSON.parse(localStorage.getItem(`mind_goals_${user.id}`) || "[]") : []; } catch { return []; }
  });
  useEffect(() => (user ? subscribeMindGoals(user.id, (g) => { if (g.length) setGoals(g); }) : undefined), [user]);
  return goals;
}

export function ValuesGoalsPanel({ goals, tasks, fa, onAdd }: { goals: MindGoalItem[]; tasks: Task[]; fa: boolean; onAdd: (g: MindGoalItem) => void }) {
  const linked = useMemo(() => new Set(tasks.filter((t) => t.source_type === "values_goal").map((t) => t.source_id)), [tasks]);
  const sorted = [...goals].sort((a, b) => Number(b.horizon === "year") - Number(a.horizon === "year"));
  return (
    <section className="surface-card p-3" data-testid="planning-values-panel">
      <header className="mb-2 flex items-center gap-2">
        <Compass className="h-4 w-4 text-amber-600" />
        <h3 className="flex-1 text-sm font-semibold">{fa ? "از ارزش‌ها و اهداف" : "From Values & Goals"}</h3>
        <Link to="/app/values" className="text-[11px] text-primary hover:underline" data-testid="planning-values-open">{fa ? "ویرایش" : "Edit"}</Link>
      </header>
      {sorted.length === 0 ? (
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
                  <button type="button" onClick={() => onAdd(g)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/15" data-testid={`planning-value-add-${g.id}`}>
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
