import React, { useState, useEffect } from "react";
import {
  CalendarPlus,
  BookOpen,
  Network,
  Clock,
  Flag,
  FileText,
  Folder,
  Sparkles,
  Loader2,
  CheckCircle2,
  Layers,
} from "lucide-react";
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
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { DueDatePicker } from "@/components/DueDatePicker";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { toast } from "sonner";
import { useNavigate, useInRouterContext } from "react-router-dom";
import {
  createStudyTask,
  type StudyTargetType,
} from "@/lib/taskStudyService";
import type { Priority } from "@/lib/priority";
import type { Task, ReminderPlan } from "@/lib/taskTypes";

export interface StudyTaskScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: StudyTargetType;
  targetId: string;
  targetTitle: string;
  folderBreadcrumb?: string;
  onTaskCreated?: (task: Task) => void;
  targetOptions?: Array<{ id: string; title: string }>;
}

interface StudyTaskScheduleModalBaseProps extends StudyTaskScheduleModalProps {
  navigate: (to: string) => void;
}

const StudyTaskScheduleModalBase: React.FC<StudyTaskScheduleModalBaseProps> = ({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetTitle,
  folderBreadcrumb,
  onTaskCreated,
  navigate,
  targetOptions,
}) => {
  const { user } = useAuth();
  const { isEn, T } = useBilingual();

  const isMindMap = targetType.startsWith("mindmap_");
  const isLeitner = targetType === "leitner";

  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(() => {
    // Default to tomorrow 10:00 AM
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    tmrw.setHours(10, 0, 0, 0);
    return tmrw.toISOString();
  });
  const [reminderAt, setReminderAt] = useState<string | null>(null);
  const [reminderPlan, setReminderPlan] = useState<ReminderPlan | null>(null);
  const [priority, setPriority] = useState<Priority>("medium");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);
  const [saving, setSaving] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState(targetId);

  const selectedTargetTitle = selectedTargetId === targetId
    ? targetTitle
    : targetOptions?.find((option) => option.id === selectedTargetId)?.title || targetTitle;

  // Initialize or reset form when opened or target changes
  useEffect(() => {
    if (open) {
      setSelectedTargetId(targetId);
      let defaultTitle = "";
      if (targetType === "leitner") {
        defaultTitle = isEn
          ? "Review Leitner Flashcards"
          : "خواندن و مرور کارت‌های لایتنر";
      } else if (targetType === "knowledge_folder") {
        defaultTitle = isEn
          ? `Study Branch: ${targetTitle}`
          : `مطالعه شاخه: ${targetTitle}`;
      } else if (targetType === "knowledge_doc") {
        defaultTitle = isEn
          ? `Study Lesson: ${targetTitle}`
          : `مطالعه درس: ${targetTitle}`;
      } else if (targetType === "mindmap_all") {
        defaultTitle = isEn
          ? "Review Entire Knowledge Mind Map"
          : "مرور نقشه ذهنی کل پایگاه دانش";
      } else {
        defaultTitle = isEn
          ? `Mind Map Review: ${targetTitle}`
          : `مرور نقشه ذهنی: ${targetTitle}`;
      }

      setTitle(defaultTitle);
      setDescription("");

      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      tmrw.setHours(10, 0, 0, 0);
      setDueDate(tmrw.toISOString());
      setPriority("medium");
      setEstimatedMinutes(30);
    }
  }, [open, targetType, targetId, targetTitle, isEn]);

  // Quick Date Setters
  const setQuickDate = (daysFromNow: number, hours = 10) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hours, 0, 0, 0);
    setDueDate(d.toISOString());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(T("لطفاً عنوان تسک را وارد کنید", "Please enter a task title"));
      return;
    }

    const userId = user?.id?.trim();
    if (!userId) {
      toast.error(T("برای زمان‌بندی مطالعه ابتدا وارد حساب خود شوید", "Sign in before scheduling a study task"));
      return;
    }

    setSaving(true);

    try {
      const res = await createStudyTask({
        userId,
        targetType,
        targetId: selectedTargetId,
        targetTitle: selectedTargetTitle,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate,
        estimatedMinutes,
        priority,
        reminderAt,
        reminderPlan,
      });

      if (res.ok && res.task) {
        toast.success(
          isLeitner
            ? T("تسک خواندن لایتنر با موفقیت در تسک‌ها ایجاد شد", "Leitner review task created successfully")
            : isMindMap
            ? T("تسک مرور نقشه ذهنی با موفقیت ایجاد شد", "Mind map review task created")
            : T("تسک مطالعه شاخه با موفقیت ایجاد شد", "Study task created successfully"),
          {
            action: {
              label: T("مشاهده در تسک‌ها", "View in Tasks"),
              onClick: () => navigate("/app/tasks"),
            },
          }
        );

        if (onTaskCreated) {
          onTaskCreated(res.task);
        }
        onOpenChange(false);
      } else {
        toast.error(res.error || T("خطا در ایجاد تسک", "Failed to create task"));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={isEn ? "ltr" : "rtl"}
        className="max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl bg-card border border-border shadow-2xl font-sans"
      >
        <DialogHeader className="space-y-1.5 text-start">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2.5 rounded-2xl ${
                isLeitner
                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                  : isMindMap
                  ? "bg-indigo-500/15 text-indigo-500 border border-indigo-500/30"
                  : "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
              }`}
            >
              {isLeitner ? (
                <Layers className="w-5 h-5" />
              ) : isMindMap ? (
                <Network className="w-5 h-5" />
              ) : (
                <CalendarPlus className="w-5 h-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                {isLeitner
                  ? T("برنامه‌ریزی مرور جعبه لایتنر", "Schedule Leitner Review")
                  : isMindMap
                  ? T("برنامه‌ریزی مرور در نقشه ذهنی", "Schedule Mind Map Review")
                  : T("برنامه‌ریزی مطالعه درس / شاخه", "Schedule Study Task")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isLeitner
                  ? T(
                      "با ایجاد این تسک، با ۱ کلیک مستقیماً وارد مرور کارت‌های لایتنر می‌شوید.",
                      "This task will open Leitner flashcards review with 1 click."
                    )
                  : isMindMap
                  ? T(
                      "با ایجاد این تسک، با ۱ کلیک مستقیماً نقشه ذهنی با مرکزیت این شاخه باز می‌شود.",
                      "This task will open the mind map centered on this branch with 1 click."
                    )
                  : T(
                      "با ایجاد این تسک، با ۱ کلیک مستقیماً وارد این شاخه در پایگاه دانش می‌شوید.",
                      "This task will open this knowledge branch with 1 click."
                    )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Target Preview Box */}
        <div className="p-3 rounded-2xl bg-muted/50 border border-border/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {isLeitner ? (
              <Layers className="w-4 h-4 text-amber-500 shrink-0" />
            ) : targetType === "knowledge_folder" || targetType === "mindmap_folder" ? (
              <Folder className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : targetType === "knowledge_doc" || targetType === "mindmap_doc" ? (
              <FileText className="w-4 h-4 text-primary shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="font-semibold text-foreground truncate">
                {selectedTargetTitle}
              </div>
              {folderBreadcrumb && (
                <div className="text-[11px] text-muted-foreground truncate">
                  {folderBreadcrumb}
                </div>
              )}
            </div>
          </div>

          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
              isLeitner
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                : isMindMap
                ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25"
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
            }`}
          >
            {isLeitner
              ? T("جعبه لایتنر", "Leitner Box")
              : isMindMap
              ? T("مرکز نقشه ذهنی", "Centered Mind Map")
              : T("شاخه پایگاه دانش", "Knowledge Branch")}
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-4 pt-1">
          {isLeitner && (targetOptions?.length || 0) > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="study-review-target" className="text-xs font-semibold text-foreground">
                {T("مجموعهٔ مرور", "Review set")}
              </label>
              <select
                id="study-review-target"
                value={selectedTargetId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  const nextTitle = nextId === targetId
                    ? targetTitle
                    : targetOptions?.find((option) => option.id === nextId)?.title || targetTitle;
                  setSelectedTargetId(nextId);
                  setTitle(nextId === targetId
                    ? (isEn ? "Review Leitner Flashcards" : "خواندن و مرور کارت‌های لایتنر")
                    : (isEn ? `Review Leitner: ${nextTitle}` : `مرور لایتنر: ${nextTitle}`));
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value={targetId}>{isEn ? "All Leitner cards" : "همهٔ کارت‌های لایتنر"}</option>
                {targetOptions?.map((option) => (
                  <option key={option.id} value={option.id}>{option.title}</option>
                ))}
              </select>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {T(
                  "اگر یک درس را انتخاب کنید، با بازکردن این تسک فقط کارت‌های موعددار همان درس وارد جلسه می‌شوند.",
                  "Choosing a lesson limits this task to due cards linked to that lesson."
                )}
              </p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {T("عنوان تسک", "Task Title")}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={T("عنوان تسک مطالعه...", "Study task title...")}
              className="text-xs rounded-xl"
              required
            />
          </div>

          {/* Quick Date Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                {T("زمان‌بندی سررسید", "Due Date & Time")}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQuickDate(0, 18)}
                  className="px-2 py-0.5 rounded-lg text-[11px] bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  {T("امروز عصر", "Today")}
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(1, 10)}
                  className="px-2 py-0.5 rounded-lg text-[11px] bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  {T("فردا", "Tomorrow")}
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(3, 10)}
                  className="px-2 py-0.5 rounded-lg text-[11px] bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  {T("۳ روز بعد", "In 3 Days")}
                </button>
              </div>
            </div>

            <DueDatePicker
              value={dueDate}
              onChange={setDueDate}
              reminderValue={reminderAt}
              onReminderChange={setReminderAt}
              reminderPlan={reminderPlan}
              onReminderPlanChange={setReminderPlan}
              compact
            />
          </div>

          {/* Estimated Duration & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Estimated Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{T("مدت تخمینی مطالعه", "Est. Duration")}</span>
              </label>
              <div className="flex items-center gap-1 flex-wrap">
                {[15, 30, 45, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setEstimatedMinutes(mins)}
                    className={`px-2 py-1 rounded-xl text-[11px] font-medium transition cursor-pointer ${
                      estimatedMinutes === mins
                        ? "bg-primary text-primary-foreground shadow-xs font-bold"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mins} {T("دقیقه", "min")}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{T("اولویت تسک", "Priority")}</span>
              </label>
              <div className="flex items-center gap-1 flex-wrap">
                {[
                  { id: "none", labelFa: "عادی", labelEn: "None" },
                  { id: "low", labelFa: "پایین", labelEn: "Low" },
                  { id: "medium", labelFa: "متوسط", labelEn: "Medium" },
                  { id: "high", labelFa: "بالا", labelEn: "High" },
                  { id: "urgent", labelFa: "فوری", labelEn: "Urgent" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id as Priority)}
                    className={`px-2 py-1 rounded-xl text-[11px] font-medium transition cursor-pointer ${
                      priority === p.id
                        ? "bg-primary text-primary-foreground shadow-xs font-bold"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {T(p.labelFa, p.labelEn)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {T("یادداشت و هدف مطالعه (اختیاری)", "Notes & Goals (Optional)")}
            </label>
            <AutoTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={T(
                "مثلاً: مرور نکات بالینی و پاسخ به سوالات تعاملی...",
                "e.g. review key points and solve interactive questions..."
              )}
              className="text-xs rounded-xl min-h-[64px]"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              {T("انصراف", "Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className={`rounded-xl text-xs gap-1.5 ${
                isMindMap
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{T("در حال ثبت...", "Saving...")}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{T("ثبت تسک مطالعه", "Schedule Task")}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const StudyTaskScheduleModalWithRouter: React.FC<StudyTaskScheduleModalProps> = (props) => {
  const navigate = useNavigate();
  return <StudyTaskScheduleModalBase {...props} navigate={navigate} />;
};

export const StudyTaskScheduleModal: React.FC<StudyTaskScheduleModalProps> = (props) => {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <StudyTaskScheduleModalWithRouter {...props} />;
  }
  return (
    <StudyTaskScheduleModalBase
      {...props}
      navigate={(to) => {
        if (typeof window !== "undefined") {
          window.location.href = to;
        }
      }}
    />
  );
};
