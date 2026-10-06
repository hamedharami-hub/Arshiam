import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { toPersianDigits } from "@/lib/persianDigits";
import { Clock, ListChecks, TrendingUp, Target, Minimize2, ChevronDown, History as HistoryIcon, Loader2, RefreshCw } from "lucide-react";
import PomodoroTimer from "@/components/PomodoroTimer";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { subDays, startOfDay, format, isSameDay } from "date-fns";
import { getCalendarSystem, jalaliDayOfWeek, WEEKDAY_SHORT_FA, formatDate } from "@/lib/jalali";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFocusSession } from "@/hooks/useFocusSession";
import { todayISO } from "@/lib/timeHorizon";
import { parseTaskDueDate, taskDueTimestamp, taskWorkDate } from "@/lib/taskDate";
import type { Task } from "@/lib/taskTypes";

type SessionRow = { id?: string; completed?: boolean; duration_minutes: number; task_id: string | null; ended_at: string | null; started_at?: string | null; tasks?: { title: string } | null };
type WeekRow = { duration_minutes: number; ended_at: string };
type TaskOption = { id: string; title: string; due_date: string | null };

export function sessionMinutesForCompletionDay(sessions: WeekRow[], day: Date): number {
  return sessions
    .filter((session) => isSameDay(new Date(session.ended_at), day))
    .reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
}

export default function PomodoroView() {
  const { user } = useAuth();
  const historyOwner = useRef(user?.id ?? null);
  historyOwner.current = user?.id ?? null;
  const navigate = useNavigate();
  const { T, isEn } = useBilingual();
  const [storedToday, setToday] = useState<SessionRow[]>([]);
  const [storedWeekSessions, setWeekSessions] = useState<WeekRow[]>([]);
  const [history, setHistory] = useState<SessionRow[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [storedTasks, setTasks] = useState<TaskOption[]>([]);
  const [dataOwner, setDataOwner] = useState<string | null>(null);
  const today = dataOwner === user?.id ? storedToday : [];
  const weekSessions = dataOwner === user?.id ? storedWeekSessions : [];
  const tasks = dataOwner === user?.id ? storedTasks : [];
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const system = getCalendarSystem();
  const focus = useFocusSession();
  const [day, setDay] = useState(todayISO);
  useEffect(() => { const update = () => setDay(todayISO()); const id = window.setInterval(update, 30000); document.addEventListener("visibilitychange", update); return () => { clearInterval(id); document.removeEventListener("visibilitychange", update); }; }, []);

  useEffect(() => {
    let active = true;
    setDataOwner(user?.id || null); setToday([]); setWeekSessions([]); setTasks([]);
    if (!user) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const weekStart = startOfDay(subDays(new Date(), 6));
    firebaseStore.from("pomodoro_sessions")
      .select("duration_minutes, task_id, ended_at, completed, tasks(title)")
      .eq("user_id", user.id)
      .gte("ended_at", start.toISOString())
      .order("ended_at", { ascending: false })
      .then(({ data }) => { if (active) setToday((data as SessionRow[] | null) || []); });
    firebaseStore.from("pomodoro_sessions")
      .select("duration_minutes, ended_at")
      .eq("user_id", user.id)
      .gte("ended_at", weekStart.toISOString())
      .order("ended_at", { ascending: true })
      .then(({ data }) => { if (active) setWeekSessions((data as WeekRow[] | null) || []); });
    firebaseStore.from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("completed", false)
      .then(({ data }) => {
        if (!active) return;
        // Order by the task's single schedule (undated last), never by the legacy due_date field.
        const rows = ((data as Partial<Task>[] | null) || []).filter((t): t is Partial<Task> & { id: string; title: string } => Boolean(t?.id));
        const when = (t: Partial<Task>) => { const v = taskWorkDate(t); return v ? taskDueTimestamp(v) : Infinity; };
        setTasks(rows.sort((a, b) => when(a) - when(b)).map((t) => ({ id: t.id, title: t.title, due_date: taskWorkDate(t) })));
      });
    return () => { active = false; };
  }, [user?.id, refreshTick, focus?.completedVersion, day]);

  useEffect(() => { setHistory([]); setHistoryCursor(null); setHistoryHasMore(false); setHistoryError(false); setHistoryOpen(false); }, [user?.id]);

  useEffect(() => { setSelectedTaskId(focus?.session.startedAt ? focus.session.taskId : null); }, [user?.id, focus?.session.id]);
  const totalMin = today.reduce((s, r) => s + (r.duration_minutes || 0), 0);

  const weekData = useMemo(() => {
    const days: { label: string; minutes: number; date: Date }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const minutes = sessionMinutesForCompletionDay(weekSessions, d);
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
  const fullFocus = Boolean(focus?.session.startedAt);

  const fetchHistory = async (reset = false) => {
    if (!user || historyLoading) return;
    setHistoryLoading(true);
    setHistoryError(false);
    try {
      let query = firebaseStore.from("pomodoro_sessions")
        .select("id, duration_minutes, task_id, ended_at, started_at, completed, tasks(title)")
        .eq("user_id", user.id);
      if (!reset && historyCursor) query = query.lt("ended_at", historyCursor);
      const { data, error } = await query.order("ended_at", { ascending: false }).limit(25);
      if (error) throw error;
      if (historyOwner.current !== user.id) return;
      const page = ((data as SessionRow[] | null) || []).filter((r) => Boolean(r.ended_at));
      setHistory((current) => reset ? page : [...current, ...page]);
      setHistoryCursor(page.length ? page[page.length - 1].ended_at : (reset ? null : historyCursor));
      setHistoryHasMore(page.length === 25);
    } catch {
      if (historyOwner.current === user.id) setHistoryError(true);
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleHistory = () => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && history.length === 0) void fetchHistory(true);
  };

  return (
    <div dir={isEn ? "ltr" : "rtl"} className={fullFocus ? "fixed inset-0 z-[80] flex flex-col overflow-y-auto bg-background px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)] page-enter" : "p-4 md:p-6 max-w-md mx-auto space-y-4 page-enter"} data-testid={fullFocus ? "pomodoro-fullscreen" : "pomodoro-page"}>
      <HeaderTitlePortal title={T("پومودورو", "Pomodoro")} />
      <Card className={fullFocus ? "my-auto w-full max-w-md self-center space-y-5 border-0 bg-transparent p-2 shadow-none sm:p-4" : "p-4 sm:p-6 space-y-5"}>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Target className="w-3 h-3" /> {T("تسک فعلی", "Current Task")}
          </label>
          {focus?.session.startedAt && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate("/app/today")} aria-label={T("کوچک‌کردن تمرکز", "Minimize focus")} data-testid="pomodoro-minimize"><Minimize2 className="h-3.5 w-3.5" /></Button>}
          </div>
          {fullFocus ? (
            <div className="truncate rounded-xl bg-muted/40 px-3 py-2 text-center text-sm font-medium" dir="auto">{focus?.session.taskTitle || T("تمرکز آزاد", "Free focus")}</div>
          ) : <Select disabled={Boolean(focus?.session.startedAt)} value={selectedTaskId || "none"} onValueChange={(v) => setSelectedTaskId(v === "none" ? null : v)}>
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
            </Select>}
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
          taskTitle={selectedTask?.title || ""}
          onSessionComplete={() => {
            setRefreshTick((t) => t + 1);
          }}
        />
      </Card>



      {!fullFocus && <Card className="p-4 space-y-4" data-testid="pomodoro-stats">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="w-3 h-3" /> {T("تمرکز امروز", "Focus today")}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-primary" data-testid="pomodoro-today-minutes">
              {isEn ? totalMin : toPersianDigits(totalMin)} <span className="text-xs font-normal text-muted-foreground">{T("دقیقه", "min")}</span>
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><ListChecks className="w-3 h-3" /> {T("جلسهٔ کامل", "Sessions")}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums" data-testid="pomodoro-today-sessions">{isEn ? today.filter(s => s.completed !== false).length : toPersianDigits(today.filter(s => s.completed !== false).length)}</div>
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
      </Card>}

      {!fullFocus && <Card className="overflow-hidden" data-testid="pomodoro-history">
        <button type="button" onClick={toggleHistory} aria-expanded={historyOpen} className="flex min-h-12 w-full items-center gap-2 px-4 py-3 text-start">
          <HistoryIcon className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium">{T("تاریخچهٔ جلسه‌ها", "Session history")}</span>
          {historyOpen && <span role="status" className="text-[10px] text-muted-foreground">{T("صفحه‌بندی‌شده", "Paged history")}</span>}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${historyOpen ? "rotate-180" : ""}`} />
        </button>
        {historyOpen && <div className="space-y-2 border-t border-border p-3">
          <div className="flex justify-end">
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" disabled={historyLoading} onClick={() => void fetchHistory(true)}><RefreshCw className={`h-3 w-3 ${historyLoading ? "animate-spin" : ""}`} />{T("تازه‌سازی", "Refresh")}</Button>
          </div>
          {history.map((row, index) => {
            const ended = row.ended_at ? new Date(row.ended_at) : null;
            const dateLabel = ended ? (system === "jalali" ? formatDate(ended, "d MMM yyyy", "jalali") : format(ended, "d MMM yyyy")) : "";
            const timeLabel = ended ? format(ended, "HH:mm") : "";
            return <div key={row.id || `${row.ended_at}-${row.task_id}-${index}`} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium" dir="auto">{row.tasks?.title || (row.task_id ? T("کار حذف‌شده", "Deleted task") : T("بدون تسک", "No task"))}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{dateLabel} · {timeLabel} · {row.completed === false ? T("جلسهٔ ناتمام", "Stopped early") : T("کامل", "Completed")}</div>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{isEn ? `${Math.round(row.duration_minutes || 0)}m` : `${toPersianDigits(Math.round(row.duration_minutes || 0))}د`}</span>
            </div>;
          })}
          {historyLoading && <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
          {!historyLoading && historyError && <p role="status" className="py-3 text-center text-xs text-muted-foreground">{T("تاریخچه بارگذاری نشد. دوباره تلاش کن.", "History could not be loaded. Try again.")}</p>}
          {!historyLoading && !historyError && history.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">{T("هنوز جلسه‌ای ثبت نشده است.", "No focus sessions have been recorded yet.")}</p>}
          {!historyLoading && historyHasMore && <Button size="sm" variant="outline" className="w-full" onClick={() => void fetchHistory(false)}>{T("جلسه‌های قدیمی‌تر", "Load older sessions")}</Button>}
        </div>}
      </Card>}
    </div>
  );
}
