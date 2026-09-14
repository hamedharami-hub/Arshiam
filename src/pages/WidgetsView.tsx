import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  LayoutGrid,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  RefreshCw,
  Smartphone,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Activity,
  BrainCircuit,
  Palette,
  ChevronDown,
  Layers,
  ListChecks,
  TimerReset,
  ShieldCheck,
  Check,
  Wind,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { fetchTasks, saveTask } from "@/features/tasks/taskService";
import type { Task } from "@/lib/taskTypes";
import { refreshAndroidWidgets, getWidgetDiagnostics } from "@/lib/androidWidget";
import { isAndroid } from "@/lib/nativeExperience";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { formatDate } from "@/lib/jalali";

export type WidgetTheme = "midnight" | "signature" | "emerald" | "crystal" | "amoled";

interface WidgetSettings {
  theme: WidgetTheme;
  textSize: "small" | "medium" | "large";
  showCompleted: boolean;
  highPriorityOnly: boolean;
  sort: "time" | "priority" | "title";
}

const DEFAULT_SETTINGS: WidgetSettings = {
  theme: "midnight",
  textSize: "medium",
  showCompleted: false,
  highPriorityOnly: false,
  sort: "time",
};

const THEMES: { id: WidgetTheme; name: string; bg: string; cardBg: string; text: string; accent: string; border: string }[] = [
  { id: "midnight", name: "اسلیت شبانه (Midnight)", bg: "bg-slate-950", cardBg: "bg-slate-900/90", text: "text-slate-100", accent: "text-violet-400 border-violet-500/30", border: "border-slate-800" },
  { id: "signature", name: "نئون ارشناز (Signature)", bg: "bg-gradient-to-br from-slate-950 via-purple-950/40 to-slate-950", cardBg: "bg-purple-950/30 backdrop-blur-xl", text: "text-pink-100", accent: "text-pink-400 border-pink-500/40", border: "border-pink-500/30" },
  { id: "emerald", name: "سبز زمردی (Emerald)", bg: "bg-slate-950", cardBg: "bg-emerald-950/30 backdrop-blur-xl", text: "text-emerald-100", accent: "text-emerald-400 border-emerald-500/40", border: "border-emerald-500/30" },
  { id: "crystal", name: "شیشه‌ای روشن (Crystal Light)", bg: "bg-slate-100", cardBg: "bg-white/95 shadow-sm", text: "text-slate-900", accent: "text-violet-600 border-violet-200", border: "border-slate-200" },
  { id: "amoled", name: "مشکی اولد (AMOLED Pure)", bg: "bg-black", cardBg: "bg-black", text: "text-white", accent: "text-violet-400 border-zinc-800", border: "border-zinc-800" },
];

const SAMPLE_TASKS: Task[] = [
  { id: "s1", user_id: "sample", title: "طراحی رابط کاربری و بررسی ویجت‌ها", completed: false, status: "todo", priority: "high", due_date: new Date().toISOString().split("T")[0], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "s2", user_id: "sample", title: "تنفس ۳بعدی و چک‌این آرامش ذهن", completed: false, status: "todo", priority: "medium", due_date: new Date().toISOString().split("T")[0], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "s3", user_id: "sample", title: "مرور اهداف هفتگی و خلاصه پیشرفت", completed: true, status: "done", priority: "low", due_date: new Date().toISOString().split("T")[0], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "s4", user_id: "sample", title: "تماس با تیم و هماهنگی نسخه جدید", completed: false, status: "todo", priority: "urgent", due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export default function WidgetsView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("widget") || "agenda";

  const [activeWidget, setActiveWidget] = useState<string>(initialTab);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncBusy, setSyncBusy] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Focus Timer state for simulated widget
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);

  // Agenda Scope Filter for simulated widget
  const [agendaScope, setAgendaScope] = useState<"today" | "tomorrow" | "next7" | "high">("today");

  // Load custom settings
  const [settings, setSettings] = useState<WidgetSettings>(() => {
    try {
      const saved = localStorage.getItem("arshnaz_widget_preferences");
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const saveSettings = useCallback((next: Partial<WidgetSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...next };
      try {
        localStorage.setItem("arshnaz_widget_preferences", JSON.stringify(merged));
      } catch {
        // ignore storage errors
      }
      return merged;
    });
  }, []);

  // Fetch real user tasks
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user?.uid) {
        setTasks(SAMPLE_TASKS);
        setLoading(false);
        return;
      }
      try {
        const loaded = await fetchTasks(user.uid);
        if (mounted) setTasks(loaded.length > 0 ? loaded : SAMPLE_TASKS);
      } catch {
        if (mounted) setTasks(SAMPLE_TASKS);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [user]);

  // Pomodoro countdown effect
  useEffect(() => {
    let interval: any;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds((s) => Math.max(0, s - 1)), 1000);
    } else if (timerSeconds === 0) {
      setTimerRunning(false);
      toast.success("جلسهٔ تمرکز با موفقیت به پایان رسید!");
      haptic("success");
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  // Filter tasks based on widget scope
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    return tasks.filter((t) => {
      if (!settings.showCompleted && (t.completed || t.status === "done")) return false;
      if (settings.highPriorityOnly && t.priority !== "high" && t.priority !== "urgent") return false;

      if (agendaScope === "today") return t.due_date?.startsWith(todayStr);
      if (agendaScope === "tomorrow") return t.due_date?.startsWith(tomorrowStr);
      if (agendaScope === "high") return t.priority === "high" || t.priority === "urgent";
      return true; // next7 or all
    });
  }, [tasks, agendaScope, settings.showCompleted, settings.highPriorityOnly]);

  // Toggle task completion from widget preview
  const handleToggleTask = async (task: Task) => {
    haptic("light");
    const nextCompleted = !task.completed;
    const updated = {
      ...task,
      completed: nextCompleted,
      status: (nextCompleted ? "done" : "todo") as "done" | "todo",
      updated_at: new Date().toISOString(),
    };

    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));

    if (user?.uid && task.id && !task.id.startsWith("s")) {
      try {
        await saveTask(user.uid, updated);
        toast.success(nextCompleted ? "تسک در ویجت انجام شد" : "تسک دوباره فعال شد");
      } catch {
        toast.error("خطا در ذخیره وضعیت تسک");
      }
    }
  };

  // Trigger instant Android sync
  const handleSyncAll = async () => {
    setSyncBusy(true);
    haptic("medium");
    try {
      await refreshAndroidWidgets();
      toast.success("همهٔ ویجت‌های اندروید با موفقیت همگام‌سازی شدند");
      haptic("success");
    } catch {
      toast.info("ویجت‌ها در محیط برنامه به‌روزرسانی شدند");
    } finally {
      setSyncBusy(false);
    }
  };

  const currentTheme = THEMES.find((t) => t.id === settings.theme) || THEMES[0];
  const diagnostics = getWidgetDiagnostics();

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20 pt-4 px-3 sm:px-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <LayoutGrid className="h-4 w-4" />
            <span>ARSHNAZ WIDGET STUDIO</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            استودیوی ویجت‌ها و نمای تعاملی
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            پیش‌نمایش زنده، شخصی‌سازی ظاهر، تنظیمات بومی اندروید و تست در لحظه
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleSyncAll()}
            disabled={syncBusy}
            className="gap-2 rounded-xl border-primary/30 hover:border-primary"
          >
            <RefreshCw className={`h-4 w-4 text-primary ${syncBusy ? "animate-spin" : ""}`} />
            <span>همگام‌سازی فوری ویجت‌ها</span>
          </Button>

          {isAndroid() && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate("/app/settings")}
              className="gap-1.5 rounded-xl text-xs"
            >
              <Smartphone className="h-3.5 w-3.5 text-primary" />
              <span>تنظیمات سیستم</span>
            </Button>
          )}
        </div>
      </div>

      {/* Diagnostics / Status Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border/50 bg-card/60 p-3 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Smartphone className="h-3.5 w-3.5 text-primary" />
            <span>بریج بومی</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
            <span className={`h-2 w-2 rounded-full ${diagnostics.isNative ? "bg-emerald-500" : "bg-sky-500"}`} />
            <span>{diagnostics.isNative ? "Android Native" : "Web Simulator"}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/60 p-3 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5 text-primary" />
            <span>تسک‌های فعال</span>
          </div>
          <div className="mt-2 text-sm font-semibold">
            {loading ? "..." : `${filteredTasks.filter((t) => !t.completed).length} تسک`}
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/60 p-3 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>آخرین همگام‌سازی</span>
          </div>
          <div className="mt-2 text-xs font-semibold">
            {diagnostics.lastSyncTimestamp ? formatDate(new Date(diagnostics.lastSyncTimestamp)) : "همین حالا"}
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/60 p-3 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>نشست کاربر</span>
          </div>
          <div className="mt-2 truncate text-xs font-mono font-medium text-muted-foreground">
            {user?.uid ? user.uid.slice(0, 10) + "..." : "مهمان"}
          </div>
        </div>
      </div>

      {/* Main Workspace: Widget Selector & Interactive Preview */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Side: Widget Type Selector & Customizer (5 cols) */}
        <div className="space-y-5 lg:col-span-5">
          {/* Widget Selector Card */}
          <Card className="rounded-2xl border-border/60 bg-card/70 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-primary" />
                <span>انتخاب ویجت</span>
              </CardTitle>
              <CardDescription className="text-xs">
                ویجت مورد نظر خود را برای مشاهده و آزمایش انتخاب کنید
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {[
                { id: "agenda", name: "Agenda (دستور کار روز)", desc: "لیست کامل تسک‌ها، زیرتسک‌ها و دکمه انجام", icon: ListChecks },
                { id: "compact", name: "Compact (تک تسک متمرکز)", desc: "نمای مینیمال ۲×۱ با تیک سریع", icon: LayoutGrid },
                { id: "pomodoro", name: "Focus Timer (تایمر تمرکز)", desc: "شمارش معکوس زنده ۲۵ دقیقه‌ای با شروع/توقف", icon: TimerReset },
                { id: "action_hub", name: "Quick Actions Hub", desc: "دکمه‌های فوری تسک جدید، ویس، ذهن و پومودورو", icon: Sparkles },
                { id: "mind", name: "Mind Reset (تنظیم ذهن)", desc: "چک‌این روحی، ثبت فکر CBT و تمرین تنفس ۳بعدی", icon: Activity },
                { id: "problem", name: "Problem Solver (حل مسئله)", desc: "چارچوب ABC، تفکر سقراطی و قدم بعدی", icon: BrainCircuit },
              ].map((w) => {
                const Icon = w.icon;
                const isSelected = activeWidget === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => {
                      setActiveWidget(w.id);
                      haptic("selection");
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-right transition-all duration-200 ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/40 bg-card/40 hover:border-border hover:bg-card/70"
                    }`}
                  >
                    <div className={`rounded-lg p-2 ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{w.name}</span>
                        {isSelected && <Badge variant="default" className="text-[10px]">فعال</Badge>}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{w.desc}</p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Customizer Card */}
          <Card className="rounded-2xl border-border/60 bg-card/70 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4 text-primary" />
                <span>شخصی‌سازی ظاهر ویجت</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0 text-xs">
              {/* Theme Picker */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">تم رنگی ویجت</label>
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => saveSettings({ theme: theme.id })}
                      className={`flex items-center gap-2 rounded-xl border p-2 text-right transition-all ${
                        settings.theme === theme.id ? "border-primary bg-primary/10" : "border-border/40 hover:border-border"
                      }`}
                    >
                      <div className={`h-4 w-4 rounded-full border border-border ${theme.bg}`} />
                      <span className="truncate text-[11px]">{theme.name.split(" ")[0]}</span>
                      {settings.theme === theme.id && <Check className="mr-auto h-3 w-3 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2.5 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs">نمایش تسک‌های انجام‌شده</span>
                  <Switch
                    checked={settings.showCompleted}
                    onCheckedChange={(val) => saveSettings({ showCompleted: val })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs">فقط تسک‌های با اولویت بالا</span>
                  <Switch
                    checked={settings.highPriorityOnly}
                    onCheckedChange={(val) => saveSettings({ highPriorityOnly: val })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Simulated Phone Widget Preview (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          <Card className="overflow-hidden rounded-3xl border-border/60 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-3">
              <div>
                <CardTitle className="text-sm font-semibold">پیش‌نمایش زنده در صفحه گوشی</CardTitle>
                <CardDescription className="text-xs">این پیش‌نمایش کاملاً فعال و دارای کنترل‌های تعاملی است</CardDescription>
              </div>
              <Badge variant="outline" className="gap-1 border-primary/40 bg-primary/5 text-primary text-[10px]">
                <Sparkles className="h-3 w-3" /> Live Simulator
              </Badge>
            </CardHeader>

            <CardContent className="flex flex-col items-center justify-center p-4 sm:p-8">
              {/* Simulated Phone Widget Frame */}
              <div className="w-full max-w-md transition-all duration-300">
                {/* Simulated Widget Card */}
                <div
                  className={`w-full rounded-[24px] border p-4 shadow-2xl transition-all duration-300 ${currentTheme.cardBg} ${currentTheme.border} ${currentTheme.text}`}
                >
                  {/* --- 1. AGENDA WIDGET PREVIEW --- */}
                  {activeWidget === "agenda" && (
                    <div className="space-y-3">
                      {/* Widget Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary">ARSHNAZ</span>
                            <span className="text-[10px] text-muted-foreground">· AGENDA</span>
                          </div>
                          <h3 className="text-lg font-bold">دستور کار امروز</h3>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            {filteredTasks.filter((t) => !t.completed).length} فعال
                          </span>
                        </div>
                      </div>

                      {/* Scope Pills */}
                      <div className="flex gap-1 overflow-x-auto pb-1 text-[11px]">
                        {[
                          { id: "today", label: "امروز" },
                          { id: "tomorrow", label: "فردا" },
                          { id: "next7", label: "۷ روز" },
                          { id: "high", label: "مهم‌ها" },
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              setAgendaScope(s.id as any);
                              haptic("selection");
                            }}
                            className={`rounded-full px-2.5 py-0.5 font-medium transition-all ${
                              agendaScope === s.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/40 hover:bg-muted"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>

                      {/* Task List Inside Widget */}
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {filteredTasks.length === 0 ? (
                          <div className="py-8 text-center text-xs text-muted-foreground">
                            هیچ تسکی در این نما وجود ندارد
                          </div>
                        ) : (
                          filteredTasks.slice(0, 5).map((t) => (
                            <div
                              key={t.id}
                              className={`group flex items-center gap-2.5 rounded-xl border p-2.5 transition-all ${
                                t.completed
                                  ? "border-border/30 bg-muted/20 opacity-60"
                                  : "border-border/50 bg-card/60 hover:border-primary/40"
                              }`}
                            >
                              {/* Checkbox */}
                              <button
                                onClick={() => void handleToggleTask(t)}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-primary/40 text-primary transition-all hover:scale-105"
                              >
                                {t.completed ? <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/20" /> : <Circle className="h-4 w-4" />}
                              </button>

                              {/* Task Content */}
                              <div className="min-w-0 flex-1">
                                <p className={`truncate text-xs font-medium ${t.completed ? "line-through text-muted-foreground" : ""}`}>
                                  {t.title}
                                </p>
                                <span className="text-[10px] text-muted-foreground">
                                  {t.priority === "high" || t.priority === "urgent" ? "● اولویت بالا · " : ""}
                                  {t.due_date ? t.due_date.slice(5) : "بدون تاریخ"}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Widget Bottom Action */}
                      <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate("/app/new/task")}
                          className="h-7 text-xs gap-1 hover:text-primary px-2"
                        >
                          <Plus className="h-3.5 w-3.5" /> افزودن تسک
                        </Button>
                        <span className="text-[10px] text-muted-foreground">لمس تیک برای انجام</span>
                      </div>
                    </div>
                  )}

                  {/* --- 2. COMPACT WIDGET PREVIEW --- */}
                  {activeWidget === "compact" && (
                    <div className="space-y-3 py-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">تسک متمرکز جاری</span>
                        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">۱ تسک</Badge>
                      </div>

                      {filteredTasks[0] ? (
                        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3">
                          <button
                            onClick={() => void handleToggleTask(filteredTasks[0])}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-card border border-primary/40 text-primary"
                          >
                            {filteredTasks[0].completed ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-xs font-bold">{filteredTasks[0].title}</h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5">برای بازکردن تسک لمس کنید</p>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center text-xs text-muted-foreground">
                          تسک فعالی وجود ندارد · آماده افزودن
                        </div>
                      )}

                      <Button
                        size="sm"
                        onClick={() => navigate("/app/new/task")}
                        className="w-full h-8 text-xs gap-1 rounded-xl"
                      >
                        <Plus className="h-3.5 w-3.5" /> تسک جدید
                      </Button>
                    </div>
                  )}

                  {/* --- 3. FOCUS TIMER / POMODORO WIDGET PREVIEW --- */}
                  {activeWidget === "pomodoro" && (
                    <div className="space-y-4 py-2 text-center">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">ARSHNAZ · FOCUS TIMER</span>
                        <Badge variant="secondary" className="text-[10px]">۲۵ دقیقه</Badge>
                      </div>

                      {/* Chronometer Display */}
                      <div className="py-2">
                        <div className="font-mono text-4xl font-extrabold tracking-wider text-primary">
                          {String(Math.floor(timerSeconds / 60)).padStart(2, "0")}:
                          {String(timerSeconds % 60).padStart(2, "0")}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">جلسه فوکوس و تمرکز عمیق</p>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setTimerRunning((r) => !r);
                            haptic("medium");
                          }}
                          className={`gap-1.5 rounded-xl px-5 text-xs ${timerRunning ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                        >
                          {timerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          <span>{timerRunning ? "توقف" : "شروع تمرکز"}</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTimerRunning(false);
                            setTimerSeconds(25 * 60);
                            haptic("light");
                          }}
                          className="rounded-xl h-8 px-2.5"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* --- 4. ACTION HUB WIDGET PREVIEW --- */}
                  {activeWidget === "action_hub" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold">مرکز عملیات سریع (Quick Hub)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/app/new/task")}
                          className="h-12 flex-col gap-0.5 rounded-xl border-border/50 text-[11px]"
                        >
                          <Plus className="h-4 w-4 text-primary" />
                          <span>تسک جدید</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/app/checkin")}
                          className="h-12 flex-col gap-0.5 rounded-xl border-border/50 text-[11px]"
                        >
                          <Activity className="h-4 w-4 text-pink-400" />
                          <span>چک‌این ذهن</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/app/breathing")}
                          className="h-12 flex-col gap-0.5 rounded-xl border-border/50 text-[11px]"
                        >
                          <Wind className="h-4 w-4 text-sky-400" />
                          <span>تنفس ۳بعدی</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/app/pomodoro")}
                          className="h-12 flex-col gap-0.5 rounded-xl border-border/50 text-[11px]"
                        >
                          <TimerReset className="h-4 w-4 text-violet-400" />
                          <span>پومودورو</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* --- 5. MIND RESET WIDGET PREVIEW --- */}
                  {activeWidget === "mind" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-pink-400" />
                          <span className="text-xs font-bold">آرامش و تعادل ذهن</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-pink-400 border-pink-400/30">Mind</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-5">
                        بررسی خلق، ثبت افکار شناختی و تنفس ضد استرس
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate("/app/checkin")}
                          className="h-9 text-xs rounded-xl"
                        >
                          چک‌این روزانه
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate("/app/breathing")}
                          className="h-9 text-xs rounded-xl"
                        >
                          تنفس آرامش
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* --- 6. PROBLEM SOLVER WIDGET PREVIEW --- */}
                  {activeWidget === "problem" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <BrainCircuit className="h-4 w-4 text-violet-400" />
                          <span className="text-xs font-bold">حل مسئله و تفکر سقراطی</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-violet-400 border-violet-400/30">CBT</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-5">
                        تفکیک مسئله، پاسخ به سوالات سقراطی و کشف قدم بعدی
                      </p>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() => navigate("/app/socratic")}
                          className="h-9 flex-1 text-xs rounded-xl"
                        >
                          چت سقراطی
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate("/app/abc")}
                          className="h-9 flex-1 text-xs rounded-xl"
                        >
                          مدل ABC
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 text-center text-[11px] text-muted-foreground">
                  این ویجت روی صفحهٔ هوم گوشی شما با همین ابعاد و رنگ رندر می‌شود
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Guide Section: How to Add Widgets on Android */}
      <Card className="rounded-2xl border-border/60 bg-card/60 backdrop-blur-md">
        <CardHeader
          className="cursor-pointer transition-colors hover:bg-muted/20"
          onClick={() => setShowGuide((g) => !g)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-sm font-semibold">راهنمای تصویری افزودن ویجت‌ها به صفحه گوشی</CardTitle>
                <CardDescription className="text-xs">آموزش گام‌به‌گام برای سامسونگ (One UI)، شیائومی و گوگل پیکسل</CardDescription>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showGuide ? "rotate-180" : ""}`} />
          </div>
        </CardHeader>
        {showGuide && (
          <CardContent className="space-y-4 pt-2 border-t border-border/40 text-xs leading-6 text-muted-foreground">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
                <h4 className="font-bold text-foreground">۱. لمس طولانی صفحه</h4>
                <p className="mt-1">روی یک فضای خالی در صفحهٔ اصلی گوشی دست خود را نگه دارید تا منوی لانچر باز شود.</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
                <h4 className="font-bold text-foreground">۲. انتخاب Widgets</h4>
                <p className="mt-1">گزینهٔ ویجت‌ها (Widgets) را لمس کرده و از میان برنامه‌ها نام ARSHNAZ را بیابید.</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
                <h4 className="font-bold text-foreground">۳. انتخاب و کشیدن</h4>
                <p className="mt-1">ویجت Agenda، Focus یا Compact را انتخاب کرده و روی محل دلخواه رها کنید.</p>
              </div>
            </div>
            <p className="text-[11px] text-primary">
              نکته: با زدن آیکون ⚙ روی گوشهٔ هر ویجت در اندروید، می‌توانید اولویت، اندازه فونت و تم روشن یا تاریک آن ویجت را مستقل تنظیم کنید.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
