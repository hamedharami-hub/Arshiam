import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Clock,
  AlertCircle,
  X,
  ExternalLink,
  RotateCcw,
  Calendar,
  Layers,
  Inbox,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getCachedTasks, subscribeToTasks } from "@/features/tasks/taskService";
import { upsertTask } from "@/lib/firestoreDataService";
import { isAndroid, nativeExperience, type NativeLedgerItem } from "@/lib/nativeExperience";
import { resolveEffectiveReminder, type ReminderPlan } from "@/lib/reminders";
import { formatDate } from "@/lib/jalali";
import type { Task } from "@/lib/taskTypes";
import { toast } from "sonner";

interface ReminderCenterItem {
  taskId: string;
  title: string;
  due_date: string | null;
  mode: string;
  nextTriggerIso: string | null;
  snoozeUntilIso: string | null;
  fireCount: number;
  repeatCount: number;
  intervalMinutes: number;
  status: "upcoming" | "snoozed" | "missed";
  task: Task;
}

export function ReminderCenter({
  onOpenTask,
}: {
  onOpenTask?: (taskId: string) => void;
}) {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [nativeLedger, setNativeLedger] = useState<NativeLedgerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    if (!user) return;
    try {
      const cached = await getCachedTasks(user.id);
      setTasks(cached);
      if (isAndroid()) {
        const res = await nativeExperience.getReminderLedger();
        setNativeLedger(res.ledger || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadData();
    const unsub = subscribeToTasks(user.id, (updated) => {
      setTasks(updated);
      if (isAndroid()) {
        nativeExperience.getReminderLedger().then((res) => {
          setNativeLedger(res.ledger || []);
        }).catch(() => {});
      }
    });
    return () => unsub();
  }, [user]);

  // Aggregate active reminder items
  const items = useMemo<ReminderCenterItem[]>(() => {
    const now = Date.now();
    const result: ReminderCenterItem[] = [];

    // Filter incomplete tasks with active reminder plan or reminder_at
    const activeTasks = tasks.filter(
      (t) => !t.completed && t.status !== "done" && t.status !== "wont_do"
    );

    for (const t of activeTasks) {
      const plan = resolveEffectiveReminder(t);
      if (!plan || !plan.enabled) continue;

      // Check native ledger correlation if available
      const nativeItem = nativeLedger.find((l) => l.taskId === t.id);

      const fireCount = nativeItem ? nativeItem.fireCount : (plan.fire_count || 0);
      const repeatCount = nativeItem ? nativeItem.repeatCount : (plan.repeat_count || 1);
      const intervalMinutes = nativeItem ? Math.round(nativeItem.intervalMs / 60000) : (plan.repeat_interval_minutes || 15);

      const snoozeTime = nativeItem?.snoozeUntil || (plan.snooze_until ? new Date(plan.snooze_until).getTime() : 0);
      const isSnoozed = snoozeTime > now;

      let triggerTime = nativeItem ? nativeItem.at : (plan.trigger_at ? new Date(plan.trigger_at).getTime() : 0);

      // Determine category
      let category: "upcoming" | "snoozed" | "missed" = "upcoming";
      if (isSnoozed) {
        category = "snoozed";
      } else if (
        plan.status === "missed" ||
        (nativeItem && nativeItem.status === "missed") ||
        (triggerTime > 0 && triggerTime < now && plan.mode === "once" && fireCount >= 1) ||
        (plan.mode === "until_ack" && now - new Date(plan.trigger_at).getTime() >= 24 * 3600 * 1000)
      ) {
        category = "missed";
      } else {
        category = "upcoming";
      }

      result.push({
        taskId: t.id,
        title: t.title,
        due_date: t.due_date,
        mode: plan.mode,
        nextTriggerIso: triggerTime > 0 ? new Date(triggerTime).toISOString() : plan.trigger_at,
        snoozeUntilIso: isSnoozed ? new Date(snoozeTime).toISOString() : null,
        fireCount,
        repeatCount,
        intervalMinutes,
        status: category,
        task: t,
      });
    }

    return result;
  }, [tasks, nativeLedger]);

  const upcomingItems = items.filter((i) => i.status === "upcoming");
  const snoozedItems = items.filter((i) => i.status === "snoozed");
  const missedItems = items.filter((i) => i.status === "missed");

  const handleCancelReminder = async (taskId: string) => {
    if (!user) return;
    try {
      if (isAndroid()) {
        await nativeExperience.cancelReminder({ taskId });
      }
      await upsertTask(user.id, {
        id: taskId,
        reminder_at: null,
        reminder_plan: null,
      });
      toast.success(T("یادآور با موفقیت لغو شد.", "Reminder cancelled successfully."));
    } catch {
      toast.error(T("خطا در لغو یادآور.", "Failed to cancel reminder."));
    }
  };

  const renderSection = (
    title: string,
    subtitle: string,
    list: ReminderCenterItem[],
    icon: React.ReactNode,
    badgeVariant: "default" | "outline" | "secondary" | "destructive"
  ) => {
    if (list.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            {icon}
            <span>{title}</span>
            <Badge variant={badgeVariant} className="h-4 text-[9px] px-1 font-mono">
              {list.length}
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground">{subtitle}</span>
        </div>

        <div className="space-y-1.5">
          {list.map((item) => {
            const displayTime = item.snoozeUntilIso || item.nextTriggerIso;
            const formattedTime = displayTime
              ? formatDate(new Date(displayTime), "HH:mm - yyyy/MM/dd", isEn ? "gregorian" : "jalali")
              : "";

            return (
              <div
                key={item.taskId}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-card border border-border/50 hover:border-primary/40 transition-colors shadow-2xs"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground truncate">
                      {item.title}
                    </span>
                    {item.mode === "until_ack" && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary/40 text-primary">
                        {T("تکرار تا پاسخ", "Until Ack")}
                      </Badge>
                    )}
                    {item.mode === "count" && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">
                        {item.fireCount} / {item.repeatCount}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-primary" />
                      {formattedTime}
                    </span>
                    {item.mode !== "once" && (
                      <span>
                        • {T(`هر ${item.intervalMinutes} دقیقه`, `Every ${item.intervalMinutes}m`)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {onOpenTask && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onOpenTask(item.taskId)}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      title={T("مشاهده تسک", "View task")}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCancelReminder(item.taskId)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    title={T("لغو یادآور", "Cancel reminder")}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card className="p-4 space-y-4 bg-card/80 border-border/60">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {T("مرکز مدیریت یادآورها", "Reminder Center")}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {T("مشاهده یادآورهای پیش‌رو، تعویق‌افتاده و نیازمند توجه", "View upcoming, snoozed & missed alerts")}
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-xs">
          {items.length} {T("یادآور فعال", "active")}
        </Badge>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          {T("در حال بارگذاری یادآورها...", "Loading reminders...")}
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <Inbox className="w-8 h-8 mx-auto text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">
            {T("هیچ یادآور فعال یا زمان‌بندی‌شده‌ای وجود ندارد.", "No active or scheduled reminders.")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {renderSection(
            T("پیش‌رو و زمان‌بندی‌شده", "Upcoming Reminders"),
            T("هشدار در موعد مقرر فعال خواهد شد", "Alerts will trigger on schedule"),
            upcomingItems,
            <Clock className="w-3.5 h-3.5 text-primary" />,
            "default"
          )}

          {renderSection(
            T("به تعویق افتاده (Snoozed)", "Snoozed Reminders"),
            T("پس از پایان زمان تعویق هشدار دوباره فعال می‌شود", "Will re-alert after snooze interval"),
            snoozedItems,
            <RotateCcw className="w-3.5 h-3.5 text-amber-500" />,
            "secondary"
          )}

          {renderSection(
            T("نیازمند توجه / بدون پاسخ", "Needs Attention / Missed"),
            T("پایان بازه تکرار یا سپری‌شدن سقف ۲۴ ساعته", "Repetition cap or 24h safety limit elapsed"),
            missedItems,
            <AlertCircle className="w-3.5 h-3.5 text-destructive" />,
            "destructive"
          )}
        </div>
      )}
    </Card>
  );
}
