import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Compass, FolderKanban, Heart, ListChecks, Repeat2, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  subscribeFolders, subscribeHabits, subscribeMindValues, subscribeTasks,
  type FolderItem, type HabitItem,
} from "@/lib/firestoreDataService";
import { getAllKanbanGoals, TIME_HORIZONS } from "@/lib/kanbanGoals";
import { toPersianDigits } from "@/lib/jalali";
import type { Task } from "@/lib/taskTypes";

type Stage = { key: string; icon: typeof Heart; title: string; hint: string; count: number; to: string; accent: string };

export function LifeSystemMap({ userId, isEn }: { userId: string; isEn: boolean }) {
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const num = (n: number) => (isEn ? String(n) : toPersianDigits(n));
  const [valuesEntry, setValuesEntry] = useState<{ userId: string; values: Record<string, unknown> }>({ userId, values: {} });
  const values = valuesEntry.userId === userId ? valuesEntry.values : {};
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<HabitItem[]>([]);

  useEffect(() => {
    setValuesEntry({ userId, values: {} });
    const offs = [
      subscribeMindValues(userId, (next) => setValuesEntry((current) => current.userId === userId ? { userId, values: next } : current)),
      subscribeFolders(userId, setFolders),
      subscribeTasks(userId, setTasks),
      subscribeHabits(userId, setHabits),
    ];
    return () => offs.forEach((off) => off());
  }, [userId]);

  const goals = useMemo(() => getAllKanbanGoals(folders, userId), [folders, userId]);
  const openTasks = tasks.filter((t) => !t.parent_id);
  const done = openTasks.filter((t) => t.completed).length;
  const pct = openTasks.length ? Math.round((done / openTasks.length) * 100) : 0;
  const linked = openTasks.filter((t) => t.kanban_column_id && goals.some((g) => g.id === t.kanban_column_id)).length;
  const orphanGoals = goals.filter((g) => !openTasks.some((t) => t.kanban_column_id === g.id)).length;
  const Arrow = isEn ? ArrowRight : ArrowLeft;

  const stages: Stage[] = [
    { key: "values", icon: Heart, title: T("ارزش‌ها", "Values"), hint: T("چرا؟", "Why"), count: Object.keys(values).length, to: "/app/values", accent: "text-rose-500 bg-rose-500/10" },
    { key: "goals", icon: Target, title: T("اهداف", "Goals"), hint: T("چه؟", "What"), count: goals.length, to: "/app/kanban", accent: "text-amber-600 bg-amber-500/10" },
    { key: "plans", icon: FolderKanban, title: T("برنامه‌ها", "Plans"), hint: T("کجا؟", "Where"), count: folders.length, to: "/app/kanban", accent: "text-sky-600 bg-sky-500/10" },
    { key: "actions", icon: ListChecks, title: T("تسک و عادت", "Tasks & habits"), hint: T("چگونه؟", "How"), count: openTasks.length + habits.length, to: "/app/today", accent: "text-emerald-600 bg-emerald-500/10" },
  ];

  const nextStep = !stages[0].count
    ? { text: T("هنوز ارزشی ثبت نشده؛ از ارزش‌هایت شروع کن.", "No values yet — start from what matters to you."), to: "/app/values" }
    : !goals.length
      ? { text: T("هدفی نداری؛ یک هدف بساز تا به ارزش‌هایت وصل شود.", "No goals yet — create one to connect to your values."), to: "/app/kanban" }
      : orphanGoals > 0
        ? { text: T(`${num(orphanGoals)} هدف هنوز تسکی ندارد؛ برایش اولین قدم را بنویس.`, `${orphanGoals} goal(s) have no tasks — add a first step.`), to: "/app/kanban" }
        : null;

  return (
    <section className="space-y-4 text-start" data-testid="life-system-map" aria-label={T("نقشهٔ سیستم زندگی", "Life system map")}>
      <ol className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {stages.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.key} className="relative">
              <Link to={s.to} data-testid={`life-stage-${s.key}`} className="group flex h-full flex-col gap-2 rounded-xl border border-border/70 bg-card p-3 transition-colors hover:border-primary/50">
                <div className="flex items-center gap-2">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${s.accent}`}><Icon className="h-4 w-4" /></span>
                  <span className="text-[11px] text-muted-foreground">{s.hint}</span>
                  {i < stages.length - 1 && <Arrow className="ms-auto hidden h-3.5 w-3.5 text-muted-foreground/60 lg:block" aria-hidden />}
                </div>
                <div>
                  <div className="text-sm font-bold">{s.title}</div>
                  <div className="text-2xl font-black tabular-nums leading-none mt-1" data-testid={`life-stage-${s.key}-count`}>{num(s.count)}</div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2" data-testid="life-progress">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{T("پیشرفت کل", "Overall progress")}</span>
          <span className="flex items-center gap-2 tabular-nums text-muted-foreground"><bdi>{num(done)}/{num(openTasks.length)}</bdi><bdi>{num(pct)}٪</bdi></span>
        </div>
        <Progress value={pct} className="h-1.5" />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span>{T(`${num(linked)} تسک به هدف وصل است`, `${linked} tasks linked to goals`)}</span>
          <span className="inline-flex items-center gap-1"><Repeat2 className="h-3 w-3" />{T(`${num(habits.length)} عادت`, `${habits.length} habits`)}</span>
        </div>
      </div>

      {goals.length > 0 && (
        <ul className="space-y-1.5" data-testid="life-goal-list">
          {goals.slice(0, 6).map((g) => {
            const gt = openTasks.filter((t) => t.kanban_column_id === g.id);
            const gd = gt.filter((t) => t.completed).length;
            const horizon = TIME_HORIZONS.find((h) => h.id === g.timeHorizon);
            return (
              <li key={g.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-2">
                <span className="text-base" aria-hidden>{g.icon || "🎯"}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium" dir="auto">{g.title}</div>
                  <div className="text-[10px] text-muted-foreground">{horizon ? (isEn ? horizon.labelEn : horizon.labelFa) : ""}</div>
                </div>
                <div className="w-24 shrink-0">
                  <Progress value={gt.length ? Math.round((gd / gt.length) * 100) : 0} className="h-1" />
                  <div className="mt-0.5 text-end text-[10px] tabular-nums text-muted-foreground">{num(gd)}/{num(gt.length)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {nextStep && (
        <Link to={nextStep.to} className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm text-primary hover:bg-primary/10" data-testid="life-next-step">
          <Compass className="h-4 w-4 shrink-0" />
          <span className="flex-1">{nextStep.text}</span>
          <Arrow className="h-4 w-4 shrink-0" />
        </Link>
      )}
    </section>
  );
}
