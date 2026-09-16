import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { endOfDay } from "date-fns";
import {
  Calendar as CalendarIcon, CheckCircle2, Circle, Flag, ArrowRight, ArrowLeft,
  ChevronDown, ChevronUp, Target, CheckSquare, Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTasksData } from "@/hooks/useTasksData";
import { useBilingual } from "@/hooks/useBilingual";
import { firebaseStore } from "@/lib/firebaseStore";
import { formatDate, toPersianDigits } from "@/lib/jalali";
import { PRIORITY_META } from "@/lib/priority";
import type { Task } from "@/lib/taskTypes";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { BidiText } from "@/components/BidiText";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QuickAddTask } from "@/components/QuickAddTask";
import { toast } from "sonner";

export default function TodayDashboardView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { T, isEn } = useBilingual();
  const [showCompleted, setShowCompleted] = useState(false);

  // 1. Tasks Data
  const { allTasks, setAllTasks } = useTasksData({ user, scope: "today" });
  const endOfToday = useMemo(() => endOfDay(new Date()).getTime(), []);

  const todayTasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (t.parent_id || !t.due_date) return false;
      const dueTime = new Date(t.due_date).getTime();
      return !isNaN(dueTime) && dueTime <= endOfToday;
    });
  }, [allTasks, endOfToday]);

  // 2. Top 3 Priorities (urgent or high)
  const priorityTasks = useMemo(() => {
    const list = todayTasks.filter((t) => t.priority === "urgent" || t.priority === "high");
    return [...list]
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (PRIORITY_META[a.priority]?.rank ?? 3) - (PRIORITY_META[b.priority]?.rank ?? 3);
      })
      .slice(0, 3);
  }, [todayTasks]);

  const priorityIds = useMemo(() => new Set(priorityTasks.map((t) => t.id)), [priorityTasks]);
  const remainingTasks = useMemo(() => todayTasks.filter((t) => !priorityIds.has(t.id)), [todayTasks, priorityIds]);
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
      const { error } = await firebaseStore.from("tasks").update({ completed: nextCompleted, status: nextStatus } as any).eq("id", task.id);
      if (error) {
        toast.error(error.message);
        setAllTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      }
    } catch {
      setAllTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    }
  }, [setAllTasks]);

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
            <p className="text-xs text-muted-foreground">{T("تسک‌های با اولویت فوری و بالا", "Urgent & high priority tasks")}</p>
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
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                    isUrgent ? "bg-red-500/15 text-red-600 dark:text-red-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  }`}>
                    <Flag className="w-2.5 h-2.5" />
                    {isUrgent ? T("فوق‌فوری", "Urgent") : T("فوری", "High")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ۳. تسک‌های امروز با QuickAddTask موجود */}
      <section className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary"><CheckSquare className="w-5 h-5" /></div>
          <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            {T("سایر تسک‌های امروز", "Other Tasks for Today")}
            <span className="text-xs font-normal text-muted-foreground">({toPersianDigits(activeRemaining.length)})</span>
          </h2>
        </div>

        <QuickAddTask
          defaults={{ due_date: new Date().toISOString() }}
          placeholder={T("افزودن سریع تسک به امروز...", "Quickly add task for today...")}
        />

        {activeRemaining.length === 0 && priorityTasks.length === 0 && completedRemaining.length === 0 ? (
          <div className="py-6 text-center text-xs sm:text-sm text-muted-foreground">
            {T("هیچ تسکی برای امروز ثبت نشده است.", "No tasks scheduled for today yet.")}
          </div>
        ) : activeRemaining.length === 0 ? (
          <div className="py-2 text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {T("✨ همه تسک‌های جانبی به اتمام رسیده‌اند!", "✨ All other tasks completed!")}
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
                {task.priority !== "none" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 font-medium">
                    <Flag className="w-2.5 h-2.5" />
                    {PRIORITY_META[task.priority]?.label}
                  </span>
                )}
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
