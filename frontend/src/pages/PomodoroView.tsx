import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { toPersianDigits } from "@/lib/persianDigits";
import { Clock, ListChecks, TrendingUp, Target } from "lucide-react";
import PomodoroTimer from "@/components/PomodoroTimer";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { subDays, startOfDay, format, isSameDay } from "date-fns";
import { getCalendarSystem, jalaliDayOfWeek, WEEKDAY_SHORT_FA, formatDate } from "@/lib/jalali";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { awardWaterDrops } from "@/lib/garden";
import { parseTaskDueDate, taskDueTimestamp, taskWorkDate } from "@/lib/taskDate";
import type { Task } from "@/lib/taskTypes";

type SessionRow = { duration_minutes: number; task_id: string | null; ended_at: string | null; tasks?: { title: string } | null };
type WeekRow = { duration_minutes: number; started_at: string };
type TaskOption = { id: string; title: string; due_date: string | null };

export default function PomodoroView() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const [today, setToday] = useState<SessionRow[]>([]);
  const [weekSessions, setWeekSessions] = useState<WeekRow[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const system = getCalendarSystem();

  useEffect(() => {
    if (!user) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const weekStart = startOfDay(subDays(new Date(), 6));
    firebaseStore.from("pomodoro_sessions")
      .select("duration_minutes, task_id, ended_at, tasks(title)")
      .eq("user_id", user.id)
      .eq("completed", true)
      .gte("started_at", start.toISOString())
      .order("ended_at", { ascending: false })
      .then(({ data }) => setToday((data as SessionRow[] | null) || []));
    firebaseStore.from("pomodoro_sessions")
      .select("duration_minutes, started_at")
      .eq("user_id", user.id)
      .eq("completed", true)
      .gte("started_at", weekStart.toISOString())
      .order("started_at", { ascending: true })
      .then(({ data }) => setWeekSessions((data as WeekRow[] | null) || []));
    firebaseStore.from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("completed", false)
      .then(({ data }) => {
        // Order by the task's single schedule (undated last), never by the legacy due_date field.
        const rows = ((data as Partial<Task>[] | null) || []).filter((t): t is Partial<Task> & { id: string; title: string } => Boolean(t?.id));
        const when = (t: Partial<Task>) => { const v = taskWorkDate(t); return v ? taskDueTimestamp(v) : Infinity; };
        setTasks(rows.sort((a, b) => when(a) - when(b)).slice(0, 50).map((t) => ({ id: t.id, title: t.title, due_date: taskWorkDate(t) })));
      });
  }, [user, refreshTick]);

  const totalMin = today.reduce((s, r) => s + (r.duration_minutes || 0), 0);

  const weekData = useMemo(() => {
    const days: { label: string; minutes: number; date: Date }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const minutes = weekSessions
        .filter((s) => isSameDay(new Date(s.started_at), d))
        .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      const weekday = system === "jalali" ? WEEKDAY_SHORT_FA[jalaliDayOfWeek(d)] : format(d, "EEE")[0];
      const dayNum = system === "jalali" ? formatDate(d, "d", "jalali") : format(d, "d");
      days.push({ label: `${weekday} ${dayNum}`, minutes, date: d });
    }
    return days;
  }, [weekSessions, system]);

  const taskTotals = new Map<string, { title: string; min: number }>();
  let freeMin = 0;
  for (const r of today) {
    if (r.task_id && r.tasks) {
      const cur = taskTotals.get(r.task_id) || { title: r.tasks.title, min: 0 };
      cur.min += r.duration_minutes;
      taskTotals.set(r.task_id, cur);
    } else freeMin += r.duration_minutes;
  }

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const selectedTaskDueDate = selectedTask && taskWorkDate(selectedTask) ? parseTaskDueDate(taskWorkDate(selectedTask)) : null;

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="p-4 md:p-6 max-w-md mx-auto space-y-4 page-enter">
      <HeaderTitlePortal title={T("پومودورو", "Pomodoro")} />
      <Card className="p-4 sm:p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Target className="w-3 h-3" /> {T("تسک فعلی", "Current Task")}
          </label>
          <Select value={selectedTaskId || "none"} onValueChange={(v) => setSelectedTaskId(v === "none" ? null : v)}>
            <SelectTrigger className="h-9 text-xs" data-testid="pomodoro-task-select">
              <SelectValue placeholder={T("انتخاب تسک برای تمرکز", "Select a task to focus on")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{T("بدون تسک", "No task")}</SelectItem>
              {tasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="truncate max-w-[16rem] block">{t.title}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTask && (
            <p className="text-[10px] text-muted-foreground">
              {selectedTaskDueDate
                ? `${T("تاریخ:", "Date:")} ${system === "jalali" ? formatDate(selectedTaskDueDate, "d MMM", "jalali") : format(selectedTaskDueDate, "d MMM")}`
                : T("بدون تاریخ", "No date")}
            </p>
          )}
        </div>
        <PomodoroTimer
          taskId={selectedTaskId}
          onSessionComplete={() => {
            setRefreshTick((t) => t + 1);
          }}
        />
      </Card>



      <Card className="p-4 space-y-4" data-testid="pomodoro-stats">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="w-3 h-3" /> {T("تمرکز امروز", "Focus today")}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-primary" data-testid="pomodoro-today-minutes">
              {isEn ? totalMin : toPersianDigits(totalMin)} <span className="text-xs font-normal text-muted-foreground">{T("دقیقه", "min")}</span>
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><ListChecks className="w-3 h-3" /> {T("جلسهٔ کامل", "Sessions")}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums" data-testid="pomodoro-today-sessions">{isEn ? today.length : toPersianDigits(today.length)}</div>
          </div>
        </div>

        {(taskTotals.size > 0 || freeMin > 0) && (
          <div className="space-y-1.5">
            {Array.from(taskTotals.entries()).map(([id, v]) => (
              <div key={id} className="flex justify-between text-sm">
                <span className="truncate flex-1 ms-2" dir="auto">{v.title}</span>
                <span className="tabular-nums text-muted-foreground">{isEn ? `${v.min}m` : `${toPersianDigits(v.min)}د`}</span>
              </div>
            ))}
            {freeMin > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{T("بدون تسک", "No task")}</span>
                <span className="tabular-nums text-muted-foreground">{isEn ? `${freeMin}m` : `${toPersianDigits(freeMin)}د`}</span>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-border pt-3">
          <div className="mb-2 flex items-center gap-1 text-[11px] text-muted-foreground"><TrendingUp className="w-3 h-3" /> {T("۷ روز اخیر", "Last 7 days")}</div>
          <div className="h-32 w-full" data-testid="pomodoro-week-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} reversed={!isEn} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{ borderRadius: "0.5rem", fontSize: 12 }}
                  formatter={(value: number) => [isEn ? `${value} min` : `${toPersianDigits(value)} دقیقه`, T("تمرکز", "Focus")]}
                />
                <Bar dataKey="minutes" radius={[3, 3, 0, 0]} fill="hsl(var(--primary))" maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </div>
  );
}
