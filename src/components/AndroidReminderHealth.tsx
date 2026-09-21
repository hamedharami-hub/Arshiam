import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Clock,
  BatteryCharging,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Send,
  RefreshCw,
} from "lucide-react";
import {
  isAndroid,
  nativeExperience,
  type NativeStatus,
} from "@/lib/nativeExperience";
import { toast } from "sonner";

export function AndroidReminderHealth() {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);

  const [status, setStatus] = useState<NativeStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [testing, setTesting] = useState<boolean>(false);

  const loadStatus = async () => {
    if (!isAndroid()) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await nativeExperience.status();
      setStatus(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleTestNotification = async () => {
    if (!isAndroid()) {
      toast.info(T("این ویژگی مختص نسخهٔ اندروید است.", "This feature is specific to Android."));
      return;
    }
    setTesting(true);
    try {
      const res = await nativeExperience.testNotification();
      if (res.sent) {
        toast.success(T("اعلان آزمایشی ارسال شد!", "Test notification sent!"));
      }
    } catch {
      toast.error(T("ارسال اعلان آزمایشی ناموفق بود.", "Failed to send test notification."));
    } finally {
      setTesting(false);
    }
  };

  // Evaluate overall system health status
  const getOverallState = () => {
    if (!status) return "unknown";
    if (!status.notificationsAllowed) return "action_required";
    if (status.exactAllowed && status.ignoringBattery) return "ready";
    return "fallback";
  };

  const overall = getOverallState();

  return (
    <Card className="p-4 space-y-4 bg-card/70 border-border/60">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {T("وضعیت سلامت یادآورهای اندروید", "Android Reminder Health")}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {T("بررسی دسترسی‌های آلارم دقیق و اعلان‌های پس‌زمینه", "Exact alarm permissions & background alerts")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {overall === "ready" && (
            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1 text-[10px]">
              <CheckCircle2 className="w-3 h-3" />
              {T("آماده و بهینه", "Ready & Optimal")}
            </Badge>
          )}
          {overall === "fallback" && (
            <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1 text-[10px]">
              <AlertTriangle className="w-3 h-3" />
              {T("حالت پشتیبان (Fallback)", "Fallback Mode")}
            </Badge>
          )}
          {overall === "action_required" && (
            <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1 text-[10px]">
              <XCircle className="w-3 h-3" />
              {T("نیازمند اقدام", "Action Required")}
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={loadStatus}
            disabled={loading}
            className="h-7 w-7"
            title={T("تازه‌سازی وضعیت", "Refresh status")}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {!isAndroid() ? (
        <div className="p-3 rounded-xl bg-muted/40 border border-border/40 text-xs text-muted-foreground leading-relaxed">
          {T(
            "سیستم یادآور دقیق و چندمرحله‌ای ARSHNAZ بر پایهٔ AlarmManager سیستم‌عامل اندروید توسعه داده شده است. در مرورگر وب، یادآورها فقط در زمان باز بودن برگه بررسی می‌شوند.",
            "ARSHNAZ reliable multi-step reminders are powered by Android AlarmManager. In web browsers, reminders only trigger while the tab is active."
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Diagnostic Rows */}
          <div className="space-y-2 text-xs">
            {/* 1. Notifications permission */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-background/60 border border-border/40">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{T("مجوز ارسال اعلان:", "Notification permission:")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={status?.notificationsAllowed ? "text-emerald-600 font-medium" : "text-destructive font-medium"}>
                  {status?.notificationsAllowed ? T("مجاز", "Allowed") : T("مسدود / غیرمجاز", "Denied")}
                </span>
                {!status?.notificationsAllowed && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => nativeExperience.openNotificationSettings()}
                    className="h-6 text-[10px] px-2 gap-1"
                  >
                    <span>{T("تنظیمات", "Settings")}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* 2. Exact Alarms permission */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-background/60 border border-border/40">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{T("آلارم دقیق سیستم‌عامل (Exact Alarm):", "Exact Alarm permission:")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={status?.exactAllowed ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                  {status?.exactAllowed ? T("فعال و دقیق", "Allowed (Exact)") : T("پشتیبان با تأخیر (Fallback)", "Fallback")}
                </span>
                {!status?.exactAllowed && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => nativeExperience.openExactSettings()}
                    className="h-6 text-[10px] px-2 gap-1"
                  >
                    <span>{T("فعال‌سازی", "Enable")}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* 3. Battery Optimization */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-background/60 border border-border/40">
              <div className="flex items-center gap-2">
                <BatteryCharging className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{T("بهینه‌سازی باتری اندروید:", "Battery optimization:")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={status?.ignoringBattery ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                  {status?.ignoringBattery ? T("استثنا شده (توصیه‌شده)", "Unrestricted") : T("تحت بهینه‌سازی", "Optimized")}
                </span>
                {!status?.ignoringBattery && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => nativeExperience.openBatterySettings()}
                    className="h-6 text-[10px] px-2 gap-1"
                  >
                    <span>{T("مدیریت باتری", "Battery")}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* 4. Active alarms count */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-background/60 border border-border/40">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>{T("تعداد یادآورهای زمان‌بندی‌شده در سیستم‌عامل:", "OS Scheduled reminders:")}</span>
              </div>
              <span className="font-semibold text-foreground px-2 py-0.5 rounded bg-muted/60 text-xs">
                {status?.scheduledCount ?? 0}
              </span>
            </div>
          </div>

          {/* Transparent Explanatory Note */}
          <div className="text-[11px] text-muted-foreground leading-relaxed p-2.5 rounded-xl bg-muted/40 border border-border/40">
            {overall === "ready" && (
              <p className="text-emerald-600/90 font-medium">
                {T(
                  "همهٔ دسترسی‌ها کامل است. یادآورها سر موعد مقرر و حتی در حالت بسته‌بودن برنامه و اسکرین خاموش فعال خواهند شد.",
                  "All permissions granted. Reminders will fire reliably on time even when the screen is off."
                )}
              </p>
            )}
            {overall === "fallback" && (
              <p className="text-amber-600/90 font-medium">
                {T(
                  "اعلان‌ها فعال هستند اما به دلیل عدم اعطای آلارم دقیق یا فعال‌بودن بهینه‌سازی باتری، آلارم‌ها در حالت پشتیبان اندروید اجرا می‌شوند و ممکن است چند دقیقه با تأخیر زنگ بخورند.",
                  "Notifications are enabled, but due to exact alarm or battery limits, alerts run in Android fallback mode with possible slight delays."
                )}
              </p>
            )}
            {overall === "action_required" && (
              <p className="text-destructive font-medium">
                {T(
                  "دسترسی به اعلان‌ها مسدود است. تا زمان اعطای مجوز در تنظیمات، هیچ هشداری به شما نمایش داده نمی‌شود.",
                  "Notifications are blocked. No reminders will sound until permission is granted in settings."
                )}
              </p>
            )}
          </div>

          {/* Test notification button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestNotification}
            disabled={testing}
            className="w-full h-8 text-xs gap-1.5 border-dashed"
          >
            <Send className="w-3.5 h-3.5 text-primary" />
            <span>{T("ارسال اعلان آزمایشی جهت تست سلامت کانال", "Send test notification")}</span>
          </Button>
        </div>
      )}
    </Card>
  );
}
