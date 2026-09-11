import { useCallback, useEffect, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import { Activity, BellRing, CalendarClock, CheckCircle2, ChevronDown, Clock3, LayoutGrid, ListChecks, RefreshCw, Smartphone, Sparkles, TimerReset, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isAndroid, nativeExperience, type NativeStatus } from "@/lib/nativeExperience";
import { refreshAndroidWidgets } from "@/lib/androidWidget";
import { ensureNotificationPermission } from "@/lib/notify";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

const WIDGETS = [
  { name: "Today", description: "Live agenda with quick completion", icon: ListChecks },
  { name: "Tomorrow", description: "Prepare your next day", icon: CalendarClock },
  { name: "Upcoming", description: "Seven-day planning view", icon: Clock3 },
  { name: "Focus", description: "High and urgent tasks only", icon: Zap },
  { name: "Compact", description: "One focused task in minimal space", icon: LayoutGrid },
  { name: "Quick Actions", description: "Add, check-in, focus and notes", icon: Sparkles },
] as const;

function StatusTile({ icon: Icon, label, value, good }: { icon: typeof BellRing; label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4" /><span className="text-xs">{label}</span></div>
      <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold">{good !== undefined && <span className={`h-2 w-2 rounded-full ${good ? "bg-emerald-500" : "bg-amber-500"}`} />}{value}</div>
    </div>
  );
}

export default function AndroidSettings() {
  const [status, setStatus] = useState<NativeStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [widgetBusy, setWidgetBusy] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [touch, setTouch] = useState(() => localStorage.getItem("haptics_off") !== "1");
  const [gestures, setGestures] = useState(() => localStorage.getItem("android_gestures_off") !== "1");
  const refresh = useCallback(() => nativeExperience.status().then(setStatus), []);

  useEffect(() => {
    if (!isAndroid()) return;
    void refresh().catch(() => toast.error("وضعیت اندروید دریافت نشد"));
    let disposed = false;
    const listener = CapApp.addListener("appStateChange", ({ isActive }) => { if (isActive && !disposed) void refresh().catch(() => {}); });
    return () => { disposed = true; void listener.then((h) => h.remove()).catch(() => {}); };
  }, [refresh]);

  if (!isAndroid()) return null;

  const togglePanel = async () => {
    setBusy(true);
    try {
      const enabled = !status?.panelEnabled;
      if (enabled && !(await ensureNotificationPermission())) { toast.error("ابتدا اجازهٔ اعلان را در تنظیمات اندروید فعال کن"); return; }
      setStatus(await nativeExperience.configure({ panelEnabled: enabled }));
      haptic("success");
    } catch { toast.error("ذخیرهٔ تنظیم پنل اعلان انجام نشد"); }
    finally { setBusy(false); }
  };

  const refreshWidgets = async () => {
    setWidgetBusy(true);
    try { await refreshAndroidWidgets(); toast.success("همهٔ ویجت‌ها تازه‌سازی شدند"); haptic("success"); }
    catch { toast.error("تازه‌سازی ویجت‌ها انجام نشد"); }
    finally { setWidgetBusy(false); }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" />امکانات اندروید</CardTitle>
            <CardDescription className="mt-1">مرکز کنترل ویجت‌ها، اعلان‌ها، لمس و یادآورهای بومی · نسخهٔ ۱.۷</CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1 whitespace-nowrap"><Sparkles className="h-3.5 w-3.5" />قابلیت بومی</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatusTile icon={BellRing} label="اعلان" value={status ? (status.notificationsAllowed ? "فعال" : "خاموش") : "در حال بررسی"} good={status?.notificationsAllowed} />
          <StatusTile icon={TimerReset} label="آلارم دقیق" value={status ? (status.exactAllowed ? "مجاز" : "نیازمند اجازه") : "در حال بررسی"} good={status?.exactAllowed} />
          <StatusTile icon={CalendarClock} label="یادآور ثبت‌شده" value={status ? String(status.scheduledCount) : "—"} />
          <StatusTile icon={Activity} label="پنل اعلان" value={status ? (status.panelEnabled ? "روشن" : "خاموش") : "—"} good={status?.panelEnabled} />
        </div>

        <section aria-labelledby="android-widgets-title" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div><h3 id="android-widgets-title" className="flex items-center gap-2 text-sm font-semibold"><LayoutGrid className="h-4 w-4 text-primary" />خانوادهٔ ویجت‌ها</h3><p className="mt-1 text-xs text-muted-foreground">ویجت‌ها انگلیسی‌اند و هرکدام تنظیمات مستقلِ View، Theme، filter، sort، text size و task limit دارند.</p></div>
            <Button size="sm" variant="outline" onClick={() => void refreshWidgets()} disabled={widgetBusy} className="gap-2"><RefreshCw className={`h-4 w-4 ${widgetBusy ? "animate-spin" : ""}`} />تازه‌سازی همه</Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {WIDGETS.map(({ name, description, icon: Icon }) => <div key={name} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-3"><div className="rounded-xl bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="text-sm font-medium">{name}</div><div className="truncate text-xs text-muted-foreground">{description}</div></div><Badge variant="outline" className="gap-1 whitespace-nowrap text-[10px]"><CheckCircle2 className="h-3 w-3 text-emerald-500" />Ready</Badge></div>)}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowGuide((value) => !value)} className="w-full justify-between px-2">راهنمای نصب و تنظیم ویجت‌ها<ChevronDown className={`h-4 w-4 transition-transform ${showGuide ? "rotate-180" : ""}`} /></Button>
          {showGuide && <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-7">روی صفحهٔ اصلی گوشی لمس طولانی کن، از بخش ویجت‌ها ARSHNAZ را انتخاب کن و یکی از نماها را اضافه کن. از دکمهٔ «تنظیم» داخل هر ویجت می‌توانی بازه، نمایش انجام‌شده‌ها، فقط اولویت‌های بالا، اندازهٔ متن و ظاهر روشن را مستقل تغییر بدهی. دکمهٔ «✓ انجام شد» نیز تسک را از همان ردیف برای تکمیل به برنامه می‌فرستد.</div>}
        </section>

        <section className="space-y-3 border-t border-border/60 pt-4">
          <div><h3 className="flex items-center gap-2 text-sm font-semibold"><BellRing className="h-4 w-4 text-primary" />پنل هوشمند اعلان</h3><p className="mt-1 text-xs text-muted-foreground">مرور امروز و فردا را بدون بازکردن برنامه در اعلان‌ها نگه می‌دارد.</p></div>
          <Button variant="outline" disabled={busy || !status} aria-pressed={status?.panelEnabled || false} onClick={() => void togglePanel()}>{status?.panelEnabled ? "خاموش کردن پنل تسک‌ها در اعلان" : "فعال کردن پنل تسک‌ها در اعلان"}</Button>
          <p className="text-xs leading-6 text-muted-foreground">داخل پنل می‌توانی بین تسک قبلی و بعدی جابه‌جا شوی، امروز و فردا را عوض کنی، تسک را باز کنی و برای تسک انتخاب‌شده «انجام شد» بزنی.</p>
        </section>

        <section className="space-y-3 border-t border-border/60 pt-4">
          <div><h3 className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-primary" />تعامل لمسی و یادآور</h3><p className="mt-1 text-xs text-muted-foreground">بازخورد لمسی و حرکت بین نماها را برای کار روزمره تنظیم کن.</p></div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" aria-pressed={touch} onClick={() => { const next = !touch; localStorage.setItem("haptics_off", next ? "0" : "1"); setTouch(next); if (next) haptic("success"); }}>بازخورد لمسی: {touch ? "روشن" : "خاموش"} · آزمایش</Button>
            <Button variant="outline" aria-pressed={gestures} onClick={() => { const next = !gestures; localStorage.setItem("android_gestures_off", next ? "0" : "1"); setGestures(next); }}>حرکت‌های لمسی: {gestures ? "روشن" : "خاموش"}</Button>
          </div>
          <p className="text-xs leading-6 text-muted-foreground">از داخل لبهٔ راست به چپ بکش تا منو باز شود؛ داخل منو به راست بکش تا بسته شود. در فهرست تسک‌ها با کشیدن افقی بین امروز، فردا، هفته و صندوق جابه‌جا می‌شوی. لبهٔ بیرونی برای برگشت اندروید آزاد می‌ماند.</p>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void nativeExperience.openNotificationSettings().catch(() => toast.error("تنظیمات اعلان باز نشد"))}>تنظیمات اعلان گوشی</Button><Button variant="outline" onClick={() => void nativeExperience.openExactSettings().catch(() => toast.error("تنظیمات آلارم باز نشد"))}>اجازهٔ آلارم دقیق</Button><Button variant="ghost" onClick={() => void refresh().catch(() => toast.error("وضعیت دریافت نشد"))}>بررسی دوبارهٔ وضعیت</Button></div>
        </section>
      </CardContent>
      <CardFooter><p className="text-sm leading-6">برای افزودن ویجت: صفحهٔ اصلی گوشی ← لمس طولانی ← Widgets ← ARSHNAZ. برای افزودن دکمهٔ «تسک جدید» به پنل سریع: نوار اعلان را پایین بکش ← ویرایش دکمه‌ها ← ARSHNAZ.</p></CardFooter>
    </Card>
  );
}
