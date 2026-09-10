import { useCallback, useEffect, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  isAndroid,
  nativeExperience,
  type NativeStatus,
} from "@/lib/nativeExperience";
import { ensureNotificationPermission } from "@/lib/notify";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

export default function AndroidSettings() {
  const [status, setStatus] = useState<NativeStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [touch, setTouch] = useState(
    () => localStorage.getItem("haptics_off") !== "1",
  );
  const [gestures, setGestures] = useState(
    () => localStorage.getItem("android_gestures_off") !== "1",
  );
  const refresh = useCallback(
    () => nativeExperience.status().then(setStatus),
    [],
  );
  useEffect(() => {
    if (!isAndroid()) return;
    void refresh().catch(() => toast.error("وضعیت اندروید دریافت نشد"));
    let disposed = false;
    const listener = CapApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive && !disposed) void refresh().catch(() => {});
    });
    return () => {
      disposed = true;
      void listener.then((h) => h.remove()).catch(() => {});
    };
  }, [refresh]);
  if (!isAndroid()) return null;
  const togglePanel = async () => {
    setBusy(true);
    try {
      const enabled = !status?.panelEnabled;
      if (enabled && !(await ensureNotificationPermission())) {
        toast.error("ابتدا اجازهٔ اعلان را در تنظیمات اندروید فعال کن");
        return;
      }
      setStatus(await nativeExperience.configure({ panelEnabled: enabled }));
      haptic("success");
    } catch {
      toast.error("ذخیرهٔ تنظیم پنل اعلان انجام نشد");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>امکانات اندروید</CardTitle>
        <CardDescription>
          ویجت‌ها، لمس و دسترسی سریع · نسخهٔ ۱.۲
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm">
          از فهرست ویجت‌های گوشی، «امروز»، «فردا»، «هفته» یا «جمع‌وجور» را اضافه
          کن. هر ویجت تنظیمات مستقل دارد: بازه، اولویت بالا، انجام‌شده‌ها، ظاهر
          روشن و متن بزرگ‌تر.
        </p>
        <Button
          variant="outline"
          disabled={busy || !status}
          aria-pressed={status?.panelEnabled || false}
          onClick={() => void togglePanel()}
        >
          {status?.panelEnabled
            ? "خاموش کردن پنل تسک‌ها در اعلان"
            : "فعال کردن پنل تسک‌ها در اعلان"}
        </Button>
        <p className="text-xs text-muted-foreground">
          با باز کردن اعلان، دکمه‌های قبلی، بعدی و امروز/فردا را می‌بینی. لمس
          عنوان، تسک را باز می‌کند. عنوان تسک‌ها روی صفحهٔ قفل پنهان است؛
          Android ممکن است اجازهٔ کنارزدن این اعلان را بدهد.
        </p>
        <Button
          variant="outline"
          aria-pressed={touch}
          onClick={() => {
            const next = !touch;
            localStorage.setItem("haptics_off", next ? "0" : "1");
            setTouch(next);
            if (next) haptic("success");
          }}
        >
          بازخورد لمسی: {touch ? "روشن" : "خاموش"} · تغییر / آزمایش
        </Button>
        <Button
          variant="outline"
          aria-pressed={gestures}
          onClick={() => {
            const next = !gestures;
            localStorage.setItem("android_gestures_off", next ? "0" : "1");
            setGestures(next);
          }}
        >
          حرکت‌های لمسی: {gestures ? "روشن" : "خاموش"}
        </Button>
        <p className="text-xs text-muted-foreground">
          از کمی داخل لبهٔ راست به چپ بکش تا منو باز شود؛ داخل منو به راست بکش
          تا بسته شود. در فضای غیرتعاملی فهرست، چپ و راست بین امروز، فردا، هفته
          و صندوق جابه‌جا می‌شود. لبهٔ بیرونی برای فرمان برگشت خود اندروید آزاد
          است.
        </p>
        <p className="text-sm" role="status">
          اجازهٔ اعلان:{" "}
          {status
            ? status.notificationsAllowed
              ? "فعال"
              : "غیرفعال"
            : "در حال بررسی"}{" "}
          · زمان‌بندی دقیق:{" "}
          {status
            ? status.exactAllowed
              ? "مجاز"
              : "نیازمند اجازه"
            : "در حال بررسی"}{" "}
          · یادآور ثبت‌شده: {status?.scheduledCount ?? "—"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              void nativeExperience
                .openNotificationSettings()
                .catch(() => toast.error("تنظیمات اعلان باز نشد"))
            }
          >
            تنظیمات اعلان گوشی
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              void nativeExperience
                .openExactSettings()
                .catch(() => toast.error("تنظیمات آلارم باز نشد"))
            }
          >
            اجازهٔ آلارم دقیق
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              void refresh().catch(() => toast.error("وضعیت دریافت نشد"))
            }
          >
            بررسی دوباره
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          یادآورهای تسک از کلید اعلان‌های همین صفحه پیروی می‌کنند. بدون اجازهٔ
          آلارم دقیق ممکن است با تأخیر برسند. توقف اجباری برنامه، حالت مزاحم
          نشوید و محدودیت باتری گوشی قابل دور زدن نیستند.
        </p>
      </CardContent>
      <CardFooter>
        <p className="text-sm">
          دسترسی سریع: پنل گوشی را پایین بکش ← ویرایش دکمه‌ها ← «ARSHNAZ · تسک
          جدید» را اضافه کن.
        </p>
      </CardFooter>
    </Card>
  );
}
