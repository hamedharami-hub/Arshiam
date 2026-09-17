import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { endOfDay, startOfDay } from "date-fns";
import {
  Calendar as CalendarIcon, CheckCircle2, Circle, ArrowRight, ArrowLeft,
  ChevronDown, ChevronUp, Target, CheckSquare, Sparkles, Plus, X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTasksData } from "@/hooks/useTasksData";
import { useBilingual } from "@/hooks/useBilingual";
import { firebaseStore } from "@/lib/firebaseStore";
import { formatDate, toPersianDigits } from "@/lib/jalali";
import { PRIORITY_META, PRIORITY_SELECTABLE, type Priority } from "@/lib/priority";
import type { Task } from "@/lib/taskTypes";
import { persistTask } from "@/lib/firestoreDataService";
import { parseTaskDueDate, taskDueTimestamp } from "@/lib/taskDate";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { BidiText } from "@/components/BidiText";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QuickAddTask } from "@/components/QuickAddTask";
import { toast } from "sonner";

function formatInputDate(value: string | null | undefined): string {
  const d = parseTaskDueDate(value);
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "";
}

function resolveNewDueDate(newDateStr: string, currentDueDate: string | null | undefined): string | null {
  if (!newDateStr) return null;
  const [y, m, d] = newDateStr.split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const prevDate = parseTaskDueDate(currentDueDate);
  const nextDate = new Date(y, m - 1, d);
  if (prevDate && (prevDate.getHours() !== 0 || prevDate.getMinutes() !== 0 || prevDate.getSeconds() !== 0)) {
    nextDate.setHours(prevDate.getHours(), prevDate.getMinutes(), prevDate.getSeconds(), 0);
  } else {
    nextDate.setHours(23, 59, 0, 0);
  }
  return nextDate.toISOString();
}

function InlineTaskControls({ task, onPatch, T, isEn }: {
  task: Task; onPatch: (patch: Partial<Task>) => void; T: (fa: string, en: string) => string; isEn: boolean;
}) {
  const dateValue = formatInputDate(task.due_date);

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" onClick={(event) => event.stopPropagation()}>
      <input
        type="date"
        aria-label={T("تغییر تاریخ تسک", "Change task date")}
        title={T("تغییر تاریخ تسک", "Change task date")}
        value={dateValue}
        onChange={(event) => {
          const nextDueDate = resolveNewDueDate(event.target.value, task.due_date);
          onPatch({ due_date: nextDueDate });
        }}
        className="h-7 w-[6.75rem] sm:w-[7.75rem] rounded-lg border border-border/60 bg-background px-1 sm:px-1.5 text-[10px] sm:text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
      />
      <select
        aria-label={T("تغییر اولویت تسک", "Change task priority")}
        title={T("تغییر اولویت تسک", "Change task priority")}
        value={task.priority}
        onChange={(event) => onPatch({ priority: event.target.value as Priority })}
        className="h-7 w-[4.25rem] sm:w-[5.25rem] rounded-lg border border-border/60 bg-background px-1 text-[10px] sm:text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
      >
        <option value="none">{T("بدون", "None")}</option>
        {PRIORITY_SELECTABLE.map((priority) => (
          <option key={priority} value={priority}>
            {isEn ? PRIORITY_META[priority].labelEn : PRIORITY_META[priority].label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function TodayDashboardView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { T, isEn } = useBilingual();
  const [showCompleted, setShowCompleted] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // 1. Tasks Data
  const { allTasks, setAllTasks } = useTasksData({ user, scope: "today" });
  const startOfToday = useMemo(() => startOfDay(new Date()).getTime(), []);
  const endOfToday = useMemo(() => endOfDay(new Date()).getTime(), []);

  const todayTasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (t.parent_id || !t.due_date) return false;
      const dueTime = taskDueTimestamp(t.due_date);
      return !isNaN(dueTime) && dueTime <= endOfToday;
    });
  }, [allTasks, endOfToday]);

  // Keep one deterministic ordering for the whole dashboard: open tasks due
  // today first, open overdue tasks after them, then priority and due date.
  const orderedTodayTasks = useMemo(() => [...todayTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const aDue = taskDueTimestamp(a.due_date);
    const bDue = taskDueTimestamp(b.due_date);
    const aOverdue = aDue < startOfToday;
    const bOverdue = bDue < startOfToday;
    if (aOverdue !== bOverdue) return aOverdue ? 1 : -1;
    const priorityDiff = (PRIORITY_META[a.priority]?.rank ?? 3) - (PRIORITY_META[b.priority]?.rank ?? 3);
    if (priorityDiff !== 0) return priorityDiff;
    if (aDue !== bDue) return aDue - bDue;
    return a.id.localeCompare(b.id);
  }), [todayTasks, startOfToday]);

  // 2. Top 3 Priorities (urgent or high)
  const priorityTasks = useMemo(() => orderedTodayTasks
    .filter((t) => t.priority === "urgent" || t.priority === "high")
    .slice(0, 3), [orderedTodayTasks]);

  const priorityIds = useMemo(() => new Set(priorityTasks.map((t) => t.id)), [priorityTasks]);
  const remainingTasks = useMemo(() => orderedTodayTasks.filter((t) => !priorityIds.has(t.id)), [orderedTodayTasks, priorityIds]);
  const activeRemaining = useMemo(() => remainingTasks.filter((t) => !t.completed), [remainingTasks]);
  const completedRemaining = useMemo(() => remainingTasks.filter((t) => t.completed), [remainingTasks]);

  const totalCount = todayTasks.length;
  const completedCount = todayTasks.filter((t) => t.completed).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggleTask = useCallback(async (task: Task) => {
    const nextCompleted = !task.completed;
    const nextStatus = nextCompleted ? "done" : "todo";
    setAllTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: nextCompleted, status: nextStatus } : t)));
    try {
      if (user?.id) {
        const res = await persistTask(user.id, { id: task.id, completed: nextCompleted, status: nextStatus });
        if (res === "failed") throw new Error(T("بروزرسانی تسک ناموفق بود", "Could not update task"));
      } else {
        const { error } = await firebaseStore.from("tasks").update({ completed: nextCompleted, status: nextStatus } as any).eq("id", task.id);
        if (error) throw new Error(error.message);
      }
      window.dispatchEvent(new Event("tasks-changed"));
    } catch (err) {
      setAllTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      toast.error(err instanceof Error ? err.message : T("بروزرسانی تسک با خطا مواجه شد", "Could not update task"));
    }
  }, [T, user?.id, setAllTasks]);

  const handlePatchTask = useCallback(async (task: Task, patch: Partial<Task>) => {
    const next = { ...task, ...patch };
    setAllTasks((prev) => prev.map((item) => item.id === task.id ? next : item));
    try {
      if (user?.id) {
        const res = await persistTask(user.id, { id: task.id, ...patch });
        if (res === "failed") throw new Error(T("ذخیره تغییرات ناموفق بود", "Could not save task changes"));
      } else {
        const { error } = await firebaseStore.from("tasks").update(patch as any).eq("id", task.id);
        if (error) throw new Error(error.message);
      }
      window.dispatchEvent(new Event("tasks-changed"));
    } catch (error) {
      setAllTasks((prev) => prev.map((item) => item.id === task.id ? task : item));
      toast.error(error instanceof Error ? error.message : T("ذخیره تغییرات ناموفق بود", "Could not save task changes"));
    }
  }, [T, user?.id, setAllTasks]);

  const todayJalali = formatDate(new Date(), "EEEE، d MMMM yyyy", "jalali");
  const todayGregorian = formatDate(new Date(), "EEEE, MMMM d, yyyy", "gregorian");

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 pb-24 page-enter">
      <HeaderTitlePortal title={T("امروز", "Today")} />

      {/* ۱. هدر تاریخ و پیشرفت */}
      <section className="bg-gradient-to-br from-card to-card/70 border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              {T("برنامهٔ امروز", "Today's Agenda")}
            </span>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground mt-2">
              {isEn ? todayGregorian : todayJalali}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 opacity-80">
              {isEn ? todayJalali : todayGregorian}
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2 min-w-[200px]">
            <div className="flex items-center justify-between w-full text-xs sm:text-sm">
              <span className="text-muted-foreground">{T("پیشرفت تسک‌ها", "Tasks Progress")}</span>
              <span className="font-bold text-foreground">
                {toPersianDigits(completedCount)} / {toPersianDigits(totalCount)} ({toPersianDigits(progressPercent)}%)
              </span>
            </div>
            <Progress value={progressPercent} className="h-2.5 w-full rounded-full" />
          </div>
        </div>
      </section>

      {/* ۲. سه اولویت اصلی (urgent/high) */}
      <section className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500"><Target className="w-5 h-5" /></div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              {T("سه اولویت اصلی امروز", "Top 3 Priorities")}
              <span className="text-xs font-normal text-muted-foreground">({toPersianDigits(priorityTasks.length)}/۳)</span>
            </h2>
            <p className="text-xs text-muted-foreground">{T("سه کار مهم‌تر برای شروع", "Three tasks to start with")}</p>
          </div>
        </div>

        {priorityTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-4 text-center text-xs text-muted-foreground bg-muted/20">
            {T("امروز اولویت فوری یا بالا مشخص نکرده‌اید.", "No urgent or high priority tasks set for today.")}
          </div>
        ) : (
          <div className="space-y-2">
            {priorityTasks.map((task, index) => {
              const isUrgent = task.priority === "urgent";
              return (
                <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  task.completed ? "bg-muted/40 border-border/50 opacity-65" : isUrgent ? "bg-red-500/[0.04] border-red-500/30" : "bg-amber-500/[0.04] border-amber-500/30"
                }`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    task.completed ? "bg-muted text-muted-foreground" : isUrgent ? "bg-red-500 text-white" : "bg-amber-500 text-white"
                  }`}>
                    {toPersianDigits(index + 1)}
                  </span>
                  <button type="button" onClick={() => handleToggleTask(task)} className="p-0.5 text-muted-foreground hover:text-primary cursor-pointer">
                    {task.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/app/tasks/${task.id}`)}>
                    <span className={`text-sm font-semibold truncate block ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      <BidiText text={task.title} />
                    </span>
                  </div>
                  <InlineTaskControls task={task} onPatch={(patch) => void handlePatchTask(task, patch)} T={T} isEn={isEn} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ۳. سایر تسک‌های امروز؛ عنوان متنی حذف شده تا فضا و تمرکز حفظ شود */}
      <section className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2" aria-label={T("سایر تسک‌های امروز", "Other tasks for today")}>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary"><CheckSquare className="w-5 h-5" /></div>
            <span className="text-xs font-semibold text-muted-foreground">{toPersianDigits(activeRemaining.length)}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={showQuickAdd ? T("بستن افزودن تسک", "Close task entry") : T("افزودن تسک", "Add task")}
            title={showQuickAdd ? T("بستن", "Close") : T("افزودن تسک", "Add task")}
            onClick={() => setShowQuickAdd((visible) => !visible)}
            className="h-9 w-9 rounded-full border-primary/30 text-primary hover:bg-primary/10"
          >
            {showQuickAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>

        {showQuickAdd && (
          <QuickAddTask
            defaults={{ due_date: new Date().toISOString() }}
            placeholder={T("عنوان تسک امروز...", "Task title for today...")}
          />
        )}

        {activeRemaining.length === 0 && priorityTasks.length === 0 && completedRemaining.length === 0 ? (
          <div className="py-6 text-center text-xs sm:text-sm text-muted-foreground">
            {T("هیچ تسکی برای امروز ثبت نشده است.", "No tasks scheduled for today yet.")}
          </div>
        ) : activeRemaining.length === 0 ? (
          <div className="py-2 text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {T("✨ همهٔ تسک‌های باز امروز انجام شده‌اند!", "✨ All open tasks for today are complete!")}
          </div>
        ) : (
          <div className="space-y-1.5">
            {activeRemaining.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/60 hover:bg-muted/30 transition-all">
                <button type="button" onClick={() => handleToggleTask(task)} className="p-0.5 text-muted-foreground hover:text-primary cursor-pointer">
                  <Circle className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/app/tasks/${task.id}`)}>
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate"><BidiText text={task.title} /></p>
                </div>
                <InlineTaskControls task={task} onPatch={(patch) => void handlePatchTask(task, patch)} T={T} isEn={isEn} />
              </div>
            ))}
          </div>
        )}

        {completedRemaining.length > 0 && (
          <div className="pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setShowCompleted((v) => !v)}
              className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground py-1 font-medium cursor-pointer"
            >
              <span>{T("تسک‌های انجام‌شده", "Completed Tasks")} ({toPersianDigits(completedRemaining.length)})</span>
              {showCompleted ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showCompleted && (
              <div className="space-y-1.5 mt-2">
                {completedRemaining.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20 border border-border/40 opacity-70 text-xs">
                    <button type="button" onClick={() => handleToggleTask(task)} className="p-0.5 text-emerald-500 cursor-pointer">
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <span className="line-through text-muted-foreground truncate flex-1"><BidiText text={task.title} /></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ۴. پیوند به تقویم */}
      <section className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 flex-shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-foreground">{T("تقویم و زمان‌بندی", "Calendar & Schedule")}</h2>
              <p className="text-xs text-muted-foreground truncate">{T("مرور تقویم هفتگی و ماهانه برای برنامه‌ریزی آینده", "View weekly & monthly calendar")}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/app/calendar")} className="text-xs rounded-xl flex-shrink-0">
            {T("مشاهده تقویم", "View Calendar")}
            {isEn ? <ArrowRight className="w-3.5 h-3.5 ml-1.5" /> : <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />}
          </Button>
        </div>
      </section>
    </div>
  );
}
