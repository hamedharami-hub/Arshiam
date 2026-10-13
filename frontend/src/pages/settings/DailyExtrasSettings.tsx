import { CloudSun } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { SectionCard, SettingRow } from "./SectionCard";
import { setDailyExtrasSettings, useDailyExtrasSettings, type DailyExtrasSettings as Settings } from "@/lib/dailyExtrasSettings";
import { importTreasury, parseTreasury } from "@/lib/dailyTreasury";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function DailyExtrasSettings({ isEn }: { isEn: boolean }) {
  const settings = useDailyExtrasSettings();
  const [pendingImport, setPendingImport] = useState<{ text: string; count: number } | null>(null);
  const [reading, setReading] = useState(false);
  const rows: { key: keyof Settings; fa: string; en: string }[] = [
    { key: "weather", fa: "آب‌وهوا در امروز", en: "Weather on Today" },
    { key: "calendarWeather", fa: "خلاصهٔ آب‌وهوا در تقویم", en: "Weather in Calendar" },
    { key: "news", fa: "خبرهای مثبت آنلاین", en: "Positive news online" },
    { key: "inspiration", fa: "گنجینهٔ روزانه", en: "Daily treasury" },
    { key: "bilingual", fa: "نمایش دوزبانهٔ گنجینه", en: "Bilingual treasury" },
  ];
  return <SectionCard icon={CloudSun} title={isEn ? "Daily extras · no AI" : "امکانات روزانه · بدون AI"} description={isEn ? "Optional, saved on this device. Weather sends your selected location to Open-Meteo; GPS is never requested automatically. News opens the publisher's website." : "اختیاری و ذخیره روی همین دستگاه. آب‌وهوا موقعیت انتخابی را به Open-Meteo می‌فرستد؛ GPS خودکار درخواست نمی‌شود. خبر، وب‌سایت ناشر را باز می‌کند."}>
    {rows.map(row => <SettingRow key={row.key} label={isEn ? row.en : row.fa}>
      <Switch aria-label={isEn ? row.en : row.fa} checked={settings[row.key]} onCheckedChange={value => { if (!setDailyExtrasSettings({ [row.key]: value })) toast.error(isEn ? "Could not save this setting." : "تنظیم ذخیره نشد."); }} />
    </SettingRow>)}
    <label className="block space-y-2 text-xs">
      <span>{isEn ? "Import bilingual treasury (JSON, up to 5 MB)" : "ورود گنجینهٔ دوزبانه (JSON، تا ۵ مگابایت)"}</span>
      <input type="file" disabled={reading || Boolean(pendingImport)} accept=".json,application/json" className="block w-full min-h-11 rounded-lg border p-2" onChange={async event => {
        const input = event.currentTarget;
        const file = input.files?.[0];
        if (!file) return;
        setReading(true);
        try {
          if (file.size > 5 * 1024 * 1024) throw new Error(isEn ? "File is too large." : "فایل بزرگ‌تر از حد مجاز است.");
          const text = await file.text();
          setPendingImport({ text, count: parseTreasury(text).length });
        } catch (error) { toast.error(error instanceof Error ? error.message : (isEn ? "Import failed." : "ورود ناموفق بود.")); }
        finally { input.value = ""; setReading(false); }
      }} />
    </label>
    <AlertDialog open={Boolean(pendingImport)} onOpenChange={open => { if (!open) setPendingImport(null); }}>
      <AlertDialogContent dir={isEn ? "ltr" : "rtl"}>
        <AlertDialogHeader>
          <AlertDialogTitle>{isEn ? "Replace local treasury?" : "جایگزینی گنجینهٔ محلی؟"}</AlertDialogTitle>
          <AlertDialogDescription>{isEn ? `Import ${pendingImport?.count ?? 0} entries and replace the collection on this device. Confirm that you have permission to reuse this human-authored content.` : `ورود ${pendingImport?.count ?? 0} مورد، مجموعهٔ روی این دستگاه را جایگزین می‌کند. مجوز استفاده از این محتوای با نگارش انسانی را تأیید کن.`}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{isEn ? "Cancel" : "انصراف"}</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            if (!pendingImport) return;
            try {
              const count = importTreasury(pendingImport.text);
              toast.success(isEn ? `${count} entries imported on this device.` : `${count} مورد روی این دستگاه وارد شد.`);
            } catch (error) { toast.error(error instanceof Error ? error.message : (isEn ? "Import failed." : "ورود ناموفق بود.")); }
            setPendingImport(null);
          }}>{isEn ? "Confirm and replace" : "تأیید و جایگزینی"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <p className="text-xs leading-6 text-muted-foreground">{isEn ? "Import replaces the local collection. Use human-authored content you may reuse. Each entry needs id, kind (quote/story/lesson), fa, en and source. Text is displayed without executing HTML." : "ورود، مجموعهٔ محلی را جایگزین می‌کند. متن با نگارش انسانی و مجوز استفاده بیاور. هر مورد باید id، kind (quote/story/lesson)، fa، en و source داشته باشد. متن بدون اجرای HTML نمایش داده می‌شود."}</p>
    <p className="text-xs text-muted-foreground">{isEn ? "Open-Meteo's public API is intended for non-commercial use. Commercial deployments need an appropriate plan." : "API عمومی Open-Meteo برای استفادهٔ غیرتجاری است؛ انتشار تجاری به طرح مناسب نیاز دارد."}</p>
  </SectionCard>;
}
