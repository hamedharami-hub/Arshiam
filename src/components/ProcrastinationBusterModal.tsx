import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Target,
  Layers,
  Flame,
  ShieldAlert,
  Lightbulb,
  Clock,
  Timer,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { callAI } from "@/lib/ai";
import { useAuth } from "@/hooks/useAuth";
import { awardWaterDrops } from "@/lib/garden";
import { haptic } from "@/lib/haptics";
import { playEndBell } from "@/lib/pomodoroSounds";
import { toPersianDigits } from "@/lib/persianDigits";
import { upsertTask } from "@/lib/firestoreDataService";
import { useBilingual } from "@/hooks/useBilingual";
import {
  ProcrastinationBarrier,
  PROCRASTINATION_BARRIERS,
  generateLocalBuster,
  buildAIBusterPrompt,
  parseAIBusterResponse,
  BusterResult,
} from "@/lib/procrastinationEngine";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority?: string | null;
  due_date?: string | null;
  folder_id?: string | null;
}

interface ProcrastinationBusterModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onStartFocus?: (taskId: string, minutes: number) => void;
}

export default function ProcrastinationBusterModal({
  task,
  open,
  onOpenChange,
  onSuccess,
  onStartFocus,
}: ProcrastinationBusterModalProps) {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const [barrier, setBarrier] = useState<ProcrastinationBarrier>("overwhelm");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busterData, setBusterData] = useState<BusterResult | null>(null);

  // In-modal sprint timer
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 minutes
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleGenerate = useCallback(async (selectedBarrier: ProcrastinationBarrier) => {
    if (!task) return;
    setLoading(true);
    haptic("light");

    // 1. Generate smart local heuristic first (immediate & always available)
    const localResult = generateLocalBuster(task.title, task.description || "", selectedBarrier);
    setBusterData(localResult);

    // 2. Try calling AI for deep personalized CBT reframing & tailored steps
    try {
      const prompt = buildAIBusterPrompt(task.title, task.description || "", selectedBarrier);
      const res = await callAI("task_subtasks", prompt, T("شکستن سد اهمال‌کاری با اصول روانشناسی CBT", "Overcoming Procrastination with CBT Principles"));
      if (res && res.text) {
        const enriched = parseAIBusterResponse(res.text, localResult);
        setBusterData(enriched);
      }
    } catch (err) {
      // Graceful degradation: local heuristic already set and tailored!
      console.log("[Buster] Using smart local heuristic engine.");
    } finally {
      setLoading(false);
    }
  }, [task, T]);

  const handleBarrierChange = (newBarrier: ProcrastinationBarrier) => {
    setBarrier(newBarrier);
    haptic("selection");
    handleGenerate(newBarrier);
  };

  useEffect(() => {
    if (open && task) {
      setTimerActive(false);
      setTimerSeconds(300);
      handleGenerate(barrier);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [open, task, barrier, handleGenerate]);

  // Sprint timer interval
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimerActive(false);
            playEndBell("chime");
            haptic("heavy");
            awardWaterDrops(25, T("اتمام موفق اسپرینت ۵ دقیقه‌ای ضد اهمال‌کاری ⚡", "Completed 5-minute Anti-Procrastination Sprint ⚡"));
            toast.success(T("🎉 فوق‌العاده است! ۵ دقیقه اول با موفقیت تمام شد!", "🎉 Amazing! First 5 minutes completed successfully!"), {
              description: T("سد ذهنی شکسته شد. اکنون کار را با همین شتاب ادامه بده!", "Mental barrier broken. Keep going with this momentum!"),
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  const handleStepChange = (index: number, val: string) => {
    if (!busterData) return;
    const nextSteps = [...busterData.steps];
    nextSteps[index] = { ...nextSteps[index], text: val };
    setBusterData({ ...busterData, steps: nextSteps });
  };

  const handleAddStep = () => {
    if (!busterData || busterData.steps.length >= 6) return;
    setBusterData({
      ...busterData,
      steps: [...busterData.steps, { text: "", estMinutes: 5 }],
    });
  };

  const handleRemoveStep = (index: number) => {
    if (!busterData) return;
    setBusterData({
      ...busterData,
      steps: busterData.steps.filter((_, i) => i !== index),
    });
  };

  const handleSaveStepsAsSubtasks = async () => {
    if (!task || !busterData) return;
    const validSteps = busterData.steps.filter((s) => s.text.trim().length > 0);
    if (validSteps.length === 0) {
      toast.error(T("حداقل یک گام بنویسید.", "Please write at least one step."));
      return;
    }

    setSaving(true);
    haptic("medium");
    const userId = user?.id || "guest";

    try {
      // Save each subtask reliably using upsertTask (local IDB cache + remote sync)
      for (let i = 0; i < validSteps.length; i++) {
        const st = validSteps[i];
        const subtaskId = crypto.randomUUID();
        await upsertTask(userId, {
          id: subtaskId,
          parent_id: task.id,
          folder_id: task.folder_id || null,
          title: st.text.trim(),
          completed: false,
          status: "todo",
          position: i,
          created_at: new Date().toISOString(),
        } as any);
      }

      awardWaterDrops(20, T("شکستن سد اهمال‌کاری و ایجاد ریزگام‌های اجرایی ⚡", "Overcoming Procrastination & Creating Micro-Steps ⚡"));
      toast.success(T(`🎉 ${validSteps.length} ریزگام اختصاصی به عنوان زیرتسک ذخیره شد!`, `🎉 ${validSteps.length} micro-steps saved as subtasks!`), {
        description: T("سد ذهنی شکسته شد؛ اکنون اولین قدم را بدون معطلی بردار!", "Mental barrier broken; take your first step now!"),
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Save subtasks error:", err);
      toast.error(err.message || T("خطا در ذخیره زیرتسک‌ها", "Error saving subtasks"));
    } finally {
      setSaving(false);
    }
  };

  const toggleTimer = () => {
    haptic("medium");
    setTimerActive(!timerActive);
  };

  const resetTimer = () => {
    haptic("light");
    setTimerActive(false);
    setTimerSeconds(300);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const mStr = m.toString().padStart(2, "0");
    const sStr = s.toString().padStart(2, "0");
    if (isEn) return `${mStr}:${sStr}`;
    return `${toPersianDigits(mStr)}:${toPersianDigits(sStr)}`;
  };

  const barrierOptions = [
    {
      id: "overwhelm" as ProcrastinationBarrier,
      icon: Layers,
      title: T("ابهام و سنگینی", "Overwhelm & Ambiguity"),
      color: "from-sky-500/20 to-indigo-500/20 border-sky-500/30 text-sky-600 dark:text-sky-400",
      activeColor: "bg-sky-500/20 border-sky-500 ring-1 ring-sky-500",
    },
    {
      id: "perfectionism" as ProcrastinationBarrier,
      icon: Target,
      title: T("کمال‌گرایی و وسواس", "Perfectionism"),
      color: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400",
      activeColor: "bg-amber-500/20 border-amber-500 ring-1 ring-amber-500",
    },
    {
      id: "low_energy" as ProcrastinationBarrier,
      icon: Flame,
      title: T("بی‌حوصلگی و خستگی", "Low Energy"),
      color: "from-rose-500/20 to-red-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400",
      activeColor: "bg-rose-500/20 border-rose-500 ring-1 ring-rose-500",
    },
    {
      id: "anxiety" as ProcrastinationBarrier,
      icon: ShieldAlert,
      title: T("اضطراب و مقاومت", "Anxiety & Resistance"),
      color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
      activeColor: "bg-emerald-500/20 border-emerald-500 ring-1 ring-emerald-500",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-3xl bg-card border-border/80 shadow-2xl space-y-4"
        dir={isEn ? "ltr" : "rtl"}
      >
        {/* Header */}
        <DialogHeader className={`${isEn ? "text-left" : "text-right"} space-y-1.5`}>
          <div className="flex items-center justify-between">
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold gap-1.5 px-3 py-1 text-xs">
              <Zap className="w-3.5 h-3.5 fill-current" />
              {T("موتور ضد اهمال‌کاری (CBT)", "Anti-Procrastination Engine (CBT)")}
            </Badge>
            <span className="text-[11px] text-muted-foreground/80 font-mono">
              {T("شناخت‌درمانی و عمل‌گرایی", "CBT & Action Focus")}
            </span>
          </div>

          <DialogTitle className="text-base sm:text-lg font-black text-foreground pt-1 flex items-center gap-2">
            {T(`شروع «${task?.title}» برات سخته؟`, `Struggling to start "${task?.title}"?`)}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {T(
              "مغز در برابر کارهای مهم مقاومت می‌کنه! با مشخص کردن سد ذهنی‌ات، راه‌حل اختصاصی بگیر و با یک گام کوچک شروع کن:",
              "The brain naturally resists important tasks! Identify your mental barrier, get targeted solutions, and start with one tiny step:"
            )}
          </DialogDescription>
        </DialogHeader>

        {/* 1. Barrier Diagnosis Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {T("علت اصلی به تعویق انداختن را انتخاب کن:", "Select the primary cause of procrastination:")}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {barrierOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = barrier === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleBarrierChange(opt.id)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all cursor-pointer select-none ${
                    isSelected
                      ? opt.activeColor + " shadow-sm scale-[1.02]"
                      : "bg-muted/30 border-border/60 hover:bg-muted/60 text-muted-foreground"
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? "text-primary fill-primary/20" : ""}`} />
                  <span className="text-[11px] font-bold leading-tight">{opt.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. CBT Reframe & Quick-Win Banner */}
        {busterData && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30 space-y-2">
            <div className="flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <div className="font-bold text-foreground">
                  {isEn ? PROCRASTINATION_BARRIERS[barrier].strategyTitleEn : PROCRASTINATION_BARRIERS[barrier].strategyTitleFa}
                </div>
                <p className="text-muted-foreground leading-relaxed italic">
                  {busterData.cbtReframe}
                </p>
              </div>
            </div>

            {busterData.quickWin && (
              <div className="flex items-center gap-2 pt-1 text-xs text-amber-700 dark:text-amber-300 font-medium bg-amber-500/10 rounded-xl px-2.5 py-1.5 border border-amber-500/20">
                <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>
                  <strong>{T("حرکت ۳۰ ثانیه‌ای برای شکستن یخ:", "30-Second Icebreaker:")}</strong> {busterData.quickWin}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 3. In-Modal Sprint Timer Widget */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">{T("اسپرینت ۵ دقیقه طلایی", "Golden 5-Minute Sprint")}</div>
              <div className="text-[10px] text-muted-foreground">{T("تعهد به فقط ۵ دقیقه کار بدون فکر به انتها", "Commit to just 5 minutes of work without worrying about finishing")}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-black font-mono tracking-wider text-primary px-2 py-1 rounded-xl bg-background border border-border/60">
              {formatTimer(timerSeconds)}
            </span>
            <Button
              type="button"
              variant={timerActive ? "destructive" : "default"}
              size="sm"
              onClick={toggleTimer}
              className="h-8 text-xs rounded-xl gap-1 font-bold"
            >
              {timerActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {timerActive ? T("توقف", "Pause") : T("شروع", "Start")}
            </Button>
            {timerSeconds < 300 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={resetTimer}
                className="w-7 h-7 text-muted-foreground hover:text-foreground"
                title={T("شروع مجدد تایمر", "Reset timer")}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* 4. Actionable Steps List */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-primary" />
              {T("ریزگام‌های اجرایی و عملیاتی:", "Actionable Micro-Steps:")}
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleGenerate(barrier)}
              disabled={loading}
              className="text-[11px] text-amber-600 dark:text-amber-400 gap-1 h-7 px-2 hover:bg-amber-500/10"
            >
              <Sparkles className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              {T("تولید مجدد با AI", "Regenerate with AI")}
            </Button>
          </div>

          {loading ? (
            <div className="py-8 text-center space-y-2 bg-muted/20 rounded-2xl border border-dashed">
              <Sparkles className="w-6 h-6 text-amber-500 animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground animate-pulse font-medium">
                {T("در حال طراحی ریزگام‌های متناسب با موضوع تسک و سد ذهنی...", "Designing micro-steps tailored to task topic and mental barrier...")}
              </p>
            </div>
          ) : busterData ? (
            <div className="space-y-2">
              {busterData.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-2xl bg-card border border-border/80 hover:border-amber-500/40 transition-colors shadow-2xs"
                >
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-black flex items-center justify-center shrink-0">
                    {isEn ? (idx + 1) : toPersianDigits(idx + 1)}
                  </div>
                  <Input
                    value={step.text}
                    onChange={(e) => handleStepChange(idx, e.target.value)}
                    placeholder={isEn ? `Step ${idx + 1}...` : `گام ${toPersianDigits(idx + 1)}...`}
                    className="h-8 text-xs bg-transparent border-none shadow-none focus-visible:ring-0 px-1 font-medium"
                  />
                  <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0 border-border/60 gap-1 py-0 px-1.5 h-5">
                    <Clock className="w-2.5 h-2.5" />
                    {isEn ? `${step.estMinutes} min` : `${toPersianDigits(step.estMinutes)} دقیقه`}
                  </Badge>
                  {busterData.steps.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveStep(idx)}
                      className="w-7 h-7 text-muted-foreground hover:text-rose-500 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}

              {busterData.steps.length < 6 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddStep}
                  className="text-xs text-muted-foreground gap-1.5 h-8 w-full border border-dashed border-border/70 rounded-xl hover:text-foreground"
                >
                  <Plus className="w-3.5 h-3.5" /> {T("افزودن گام دستی", "Add manual step")}
                </Button>
              )}
            </div>
          ) : null}
        </div>

        {/* Action Footer */}
        <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 border-t border-border/60">
          {onStartFocus && task && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onStartFocus(task.id, 15);
              }}
              className="text-xs rounded-2xl gap-1.5 border-primary/30 text-primary hover:bg-primary/10 h-10 px-3"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {T("ورود به مود تمرکز کامل", "Enter Focus Mode")}
            </Button>
          )}

          <Button
            onClick={handleSaveStepsAsSubtasks}
            disabled={saving || loading || !busterData || busterData.steps.length === 0}
            className="flex-1 rounded-2xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/20 h-10"
          >
            <CheckCircle2 className="w-4 h-4 me-1.5" />
            {saving ? T("در حال ثبت زیرتسک‌ها...", "Saving subtasks...") : T("ثبت به عنوان زیرتسک و شروع کار 🚀", "Save as Subtasks & Begin 🚀")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

