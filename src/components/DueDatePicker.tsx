import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, X, Bell, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import {
  ensureNotificationPermission,
  toLocalDatetimeInputString,
  parseLocalDateFromInput,
  createDefaultReminderPlan,
  resolveEffectiveReminder,
  type ReminderPlan,
  type ReminderMode,
} from "@/lib/reminders";
import { toast } from "sonner";

import { addDays, format, startOfDay } from "date-fns";
import { formatDate } from "@/lib/jalali";

/**
 * Smart due-date & multi-step reliable reminder picker.
 * - Quick chips: امروز / فردا + date input
 * - Toggle for time (with time field)
 * - Multi-step Android-reliable Reminder drawer
 */
export function DueDatePicker({
  value,
  onChange,
  reminderValue = null,
  onReminderChange,
  reminderPlan = null,
  onReminderPlanChange,
  label,
  compact = false,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  reminderValue?: string | null;
  onReminderChange?: (iso: string | null) => void;
  reminderPlan?: ReminderPlan | null;
  onReminderPlanChange?: (plan: ReminderPlan | null) => void;
  label?: string;
  compact?: boolean;
}) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const labelText = label || T("سررسید", "Due date");
  const [datePart, setDatePart] = useState<string>("");
  const [timePart, setTimePart] = useState<string>("");
  const [includeTime, setIncludeTime] = useState<boolean>(false);

  // Reminder active state
  const effectivePlan = reminderPlan || (reminderValue ? resolveEffectiveReminder({ reminder_at: reminderValue }) : null);
  const [reminderOn, setReminderOn] = useState<boolean>(!!effectivePlan?.enabled || !!reminderValue);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Reminder settings state
  const [timingPreset, setTimingPreset] = useState<"custom" | "ontime" | "5min" | "15min" | "30min" | "1hour">("custom");
  const [mode, setMode] = useState<ReminderMode>(effectivePlan?.mode || "once");
  const [intervalMinutes, setIntervalMinutes] = useState<number>(effectivePlan?.repeat_interval_minutes || 15);
  const [repeatCount, setRepeatCount] = useState<1 | 3 | 5>(effectivePlan?.repeat_count || 3);
  const [customTriggerIso, setCustomTriggerIso] = useState<string>(
    effectivePlan?.trigger_at || reminderValue || ""
  );

  useEffect(() => {
    if (!value) {
      setDatePart(""); setTimePart(""); setIncludeTime(false);
      return;
    }
    const d = new Date(value);
    if (isNaN(d.getTime())) return;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    setDatePart(`${y}-${m}-${day}`);
    const isEndOfDayMarker = d.getHours() === 23 && d.getMinutes() === 59;
    setIncludeTime(!isEndOfDayMarker);
    setTimePart(isEndOfDayMarker ? "09:00" : `${h}:${mm}`);
  }, [value]);

  useEffect(() => {
    const active = !!reminderPlan?.enabled || !!reminderValue;
    setReminderOn(active);
    if (reminderPlan) {
      setMode(reminderPlan.mode);
      setIntervalMinutes(reminderPlan.repeat_interval_minutes);
      setRepeatCount(reminderPlan.repeat_count);
      setCustomTriggerIso(reminderPlan.trigger_at);
    } else if (reminderValue) {
      setCustomTriggerIso(reminderValue);
    }
  }, [reminderValue, reminderPlan]);

  const emitDate = (date: string, time: string, withTime: boolean) => {
    if (!date) { onChange(null); return; }
    const t = withTime && time ? time : "23:59";
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = t.split(":").map(Number);
    const localD = new Date(y, m - 1, d, hh, mm, 0, 0);
    onChange(localD.toISOString());
  };

  const setQuick = (offsetDays: number) => {
    const d = addDays(startOfDay(new Date()), offsetDays);
    const iso = format(d, "yyyy-MM-dd");
    setDatePart(iso);
    emitDate(iso, timePart || "09:00", includeTime);
  };

  const clear = () => {
    setDatePart(""); setTimePart(""); setIncludeTime(false);
    onChange(null);
    if (onReminderChange) onReminderChange(null);
    if (onReminderPlanChange) onReminderPlanChange(null);
    setReminderOn(false);
  };

  const calculatePresetIso = (preset: typeof timingPreset, baseDate: string, baseTime: string, hasTime: boolean): string | null => {
    if (!baseDate) return null;
    const timeToUse = hasTime && baseTime ? baseTime : "09:00";
    const [y, m, d] = baseDate.split("-").map(Number);
    const [hh, mm] = timeToUse.split(":").map(Number);
    const target = new Date(y, m - 1, d, hh, mm, 0, 0);
    if (isNaN(target.getTime())) return null;

    if (preset === "5min") target.setMinutes(target.getMinutes() - 5);
    else if (preset === "15min") target.setMinutes(target.getMinutes() - 15);
    else if (preset === "30min") target.setMinutes(target.getMinutes() - 30);
    else if (preset === "1hour") target.setHours(target.getHours() - 1);

    return target.toISOString();
  };

  const updateReminder = (
    nextTriggerIso: string | null,
    nextMode: ReminderMode = mode,
    nextInterval: number = intervalMinutes,
    nextCount: 1 | 3 | 5 = repeatCount
  ) => {
    if (!nextTriggerIso) {
      if (onReminderChange) onReminderChange(null);
      if (onReminderPlanChange) onReminderPlanChange(null);
      return;
    }

    const safeInterval = nextMode === "until_ack" ? Math.max(15, nextInterval) : nextInterval;
    const plan: ReminderPlan = {
      version: 1,
      enabled: true,
      trigger_at: nextTriggerIso,
      mode: nextMode,
      repeat_interval_minutes: safeInterval as any,
      repeat_count: nextCount,
      snooze_options: [10, 15, 30, 60],
      importance: "normal",
      status: "pending",
      fire_count: 0,
      max_window_hours: 24,
    };

    if (onReminderPlanChange) onReminderPlanChange(plan);
    if (onReminderChange) onReminderChange(nextTriggerIso);
  };

  const handleToggleReminder = async (checked: boolean) => {
    setReminderOn(checked);
    if (!checked) {
      if (onReminderChange) onReminderChange(null);
      if (onReminderPlanChange) onReminderPlanChange(null);
      return;
    }

    const ok = await ensureNotificationPermission();
    if (!ok) {
      toast.warning(
        T(
          "اجازه‌ی نوتیفیکیشن داده نشده — در صورت عدم اعطای دسترسی، یادآور صدا نمی‌زند",
          "Notification permission not granted — reminder cannot sound without permission"
        )
      );
    }

    let nextIso = customTriggerIso;
    if (!nextIso && datePart) {
      nextIso = calculatePresetIso(timingPreset, datePart, timePart, includeTime) || new Date().toISOString();
    } else if (!nextIso) {
      const nowPlusHour = new Date(Date.now() + 60 * 60 * 1000);
      nextIso = nowPlusHour.toISOString();
    }

    setCustomTriggerIso(nextIso);
    updateReminder(nextIso, mode, intervalMinutes, repeatCount);
  };

  const handlePresetSelect = (preset: typeof timingPreset) => {
    setTimingPreset(preset);
    if (preset === "custom") {
      setShowAdvanced(true);
      return;
    }
    const computed = calculatePresetIso(preset, datePart, timePart, includeTime);
    if (computed) {
      setCustomTriggerIso(computed);
      updateReminder(computed, mode, intervalMinutes, repeatCount);
    }
  };

  const jalaliPreview = datePart ? formatDate(new Date(`${datePart}T12:00:00`), "EEEE d MMMM", "jalali") : "";

  return (
    <div className="space-y-2.5">
      {label && (
        <label className="text-xs text-muted-foreground flex items-center justify-between gap-1">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {labelText}
          </span>
          {jalaliPreview && (
            <span className="text-[11px] font-medium text-primary">
              {jalaliPreview}
            </span>
          )}
        </label>
      )}

      {/* Quick chips + date input */}
      <div className="flex gap-1.5 items-center flex-wrap">
        <Button
          type="button" size="sm"
          variant={isToday(datePart) ? "default" : "outline"}
          onClick={() => setQuick(0)} className="h-8 text-xs px-2"
        >{T("امروز", "Today")}</Button>
        <Button
          type="button" size="sm"
          variant={isTomorrow(datePart) ? "default" : "outline"}
          onClick={() => setQuick(1)} className="h-8 text-xs px-2"
        >{T("فردا", "Tomorrow")}</Button>
        <Input
          type="date" value={datePart}
          onChange={(e) => { setDatePart(e.target.value); emitDate(e.target.value, timePart, includeTime); }}
          className="h-8 flex-1 min-w-[130px] text-xs"
        />
        {value && (
          <Button type="button" size="icon" variant="ghost" onClick={clear} className="h-8 w-8" title={T("حذف", "Delete")}>
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {!label && jalaliPreview && (
        <div className="text-[11px] font-medium text-primary text-end">
          {jalaliPreview}
        </div>
      )}

      {/* Time toggle + time input */}
      <div className="flex items-center gap-2">
        <Switch
          checked={includeTime}
          onCheckedChange={(v) => {
            setIncludeTime(v);
            if (datePart) emitDate(datePart, timePart || "09:00", v);
          }}
          id="due-time-toggle"
        />
        <label htmlFor="due-time-toggle" className="text-[11px] text-muted-foreground flex items-center gap-1 cursor-pointer flex-shrink-0">
          <Clock className="w-3 h-3" /> {T("ساعت", "Time")}
        </label>
        {includeTime && (
          <Input
            type="time"
            value={timePart || "09:00"}
            onChange={(e) => { setTimePart(e.target.value); emitDate(datePart, e.target.value, true); }}
            className="h-8 flex-1 text-xs"
          />
        )}
      </div>

      {/* Multi-step Reliable Reminder Section */}
      {(onReminderChange || onReminderPlanChange) && (
        <div className="pt-2 border-t border-border/40 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={reminderOn}
                onCheckedChange={handleToggleReminder}
                id="reminder-toggle"
              />
              <label htmlFor="reminder-toggle" className="text-[11px] font-medium text-foreground flex items-center gap-1.5 cursor-pointer">
                <Bell className="w-3.5 h-3.5 text-primary" />
                {T("یادآور هوشمند اندروید", "Android Smart Reminder")}
              </label>
            </div>

            {reminderOn && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="h-6 text-[11px] px-1.5 gap-1 text-muted-foreground hover:text-foreground"
              >
                <span>{showAdvanced ? T("بستن جزئیات", "Less") : T("تنظیمات تکرار", "More")}</span>
                {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            )}
          </div>

          {reminderOn && (
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 space-y-3">
              {/* Presets when date is present */}
              {datePart && (
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block">{T("زمان هشدار:", "Alert timing:")}</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {[
                      { key: "ontime", labelFa: "سر موعد", labelEn: "On time" },
                      { key: "5min", labelFa: "۵ دقیقه قبل", labelEn: "5m before" },
                      { key: "15min", labelFa: "۱۵ دقیقه قبل", labelEn: "15m before" },
                      { key: "1hour", labelFa: "۱ ساعت قبل", labelEn: "1h before" },
                      { key: "custom", labelFa: "دلخواه", labelEn: "Custom" },
                    ].map((p) => (
                      <Button
                        key={p.key}
                        type="button"
                        size="sm"
                        variant={timingPreset === p.key ? "default" : "outline"}
                        onClick={() => handlePresetSelect(p.key as any)}
                        className="h-6 text-[10px] px-2 rounded-lg"
                      >
                        {T(p.labelFa, p.labelEn)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Timezone-safe Datetime input */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground block">{T("تاریخ و ساعت دقیق هشدار:", "Exact alert datetime:")}</span>
                <Input
                  type="datetime-local"
                  value={toLocalDatetimeInputString(customTriggerIso)}
                  onChange={(e) => {
                    const parsedIso = parseLocalDateFromInput(e.target.value);
                    if (parsedIso) {
                      setTimingPreset("custom");
                      setCustomTriggerIso(parsedIso);
                      updateReminder(parsedIso, mode, intervalMinutes, repeatCount);
                    }
                  }}
                  className="h-8 text-xs font-mono"
                />
              </div>

              {/* Follow-up / Repetition Settings */}
              {showAdvanced && (
                <div className="pt-2 border-t border-border/30 space-y-2.5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">{T("نحوه پیگیری یادآور:", "Follow-up mode:")}</span>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { key: "once", labelFa: "فقط یک‌بار", labelEn: "Once" },
                        { key: "until_ack", labelFa: "تا پاسخ من", labelEn: "Until I answer" },
                        { key: "count", labelFa: "تعداد مشخص", labelEn: "Fixed count" },
                      ].map((m) => (
                        <Button
                          key={m.key}
                          type="button"
                          size="sm"
                          variant={mode === m.key ? "default" : "outline"}
                          onClick={() => {
                            const newMode = m.key as ReminderMode;
                            setMode(newMode);
                            const safeInterval = newMode === "until_ack" ? Math.max(15, intervalMinutes) : intervalMinutes;
                            setIntervalMinutes(safeInterval);
                            updateReminder(customTriggerIso, newMode, safeInterval, repeatCount);
                          }}
                          className="h-7 text-[10px] px-1 rounded-lg"
                        >
                          {T(m.labelFa, m.labelEn)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Interval selector for repeating modes */}
                  {mode !== "once" && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground block">
                        {T("فاصله بین تکرارها:", "Interval between repeats:")}
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {[5, 10, 15, 30, 60].map((mins) => {
                          const disabled = mode === "until_ack" && mins < 15;
                          return (
                            <Button
                              key={mins}
                              type="button"
                              size="sm"
                              disabled={disabled}
                              variant={intervalMinutes === mins ? "default" : "outline"}
                              onClick={() => {
                                setIntervalMinutes(mins);
                                updateReminder(customTriggerIso, mode, mins, repeatCount);
                              }}
                              className={`h-6 text-[10px] px-2 rounded-lg ${disabled ? "opacity-35 cursor-not-allowed" : ""}`}
                              title={disabled ? T("حداقل فاصله در حالت تا پاسخ من ۱۵ دقیقه است", "Minimum interval for until-ack is 15m") : undefined}
                            >
                              {mins} {T("دقیقه", "min")}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Repeat count if mode is count */}
                  {mode === "count" && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground block">
                        {T("تعداد دفعات تکرار:", "Repeat count:")}
                      </span>
                      <div className="flex items-center gap-1">
                        {([1, 3, 5] as const).map((cnt) => (
                          <Button
                            key={cnt}
                            type="button"
                            size="sm"
                            variant={repeatCount === cnt ? "default" : "outline"}
                            onClick={() => {
                              setRepeatCount(cnt);
                              updateReminder(customTriggerIso, mode, intervalMinutes, cnt);
                            }}
                            className="h-6 text-[10px] px-3 rounded-lg"
                          >
                            {cnt} {T("بار", "times")}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transparent, honest microcopy */}
                  <div className="rounded-lg bg-background/60 p-2 text-[10px] text-muted-foreground space-y-1 leading-relaxed">
                    {mode === "until_ack" && (
                      <p className="text-primary/90 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {T(
                          `اگر پاسخ ندهی، هر ${intervalMinutes} دقیقه یادآوری می‌کنم. پس از پایان بازه (حداکثر ۲۴ ساعت)، در یادآورهای نیازمند توجه می‌ماند.`,
                          `If you don't answer, I'll remind every ${intervalMinutes} min. After 24h max, it will rest in Needs Attention.`
                        )}
                      </p>
                    )}
                    {mode === "count" && (
                      <p className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {T(
                          `این یادآور حداکثر ${repeatCount} بار با فاصلهٔ ${intervalMinutes} دقیقه تکرار می‌شود.`,
                          `This reminder will repeat at most ${repeatCount} times every ${intervalMinutes} min.`
                        )}
                      </p>
                    )}
                    {mode === "once" && (
                      <p>{T("یادآور یک‌باره؛ بدون تکرار خودکار.", "Single-shot reminder without auto-repeats.")}</p>
                    )}
                    <p className="text-muted-foreground/80">
                      {T(
                        "در اندروید، در صورت محدودیت آلارم دقیق توسط سیستم‌عامل، هشدار با اندکی تأخیر اجرا خواهد شد.",
                        "On Android, if exact alarm is restricted by the OS, alerts may experience slight delays."
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function isToday(iso: string) {
  if (!iso) return false;
  return iso === format(startOfDay(new Date()), "yyyy-MM-dd");
}
function isTomorrow(iso: string) {
  if (!iso) return false;
  return iso === format(addDays(startOfDay(new Date()), 1), "yyyy-MM-dd");
}
