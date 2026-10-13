import { Check, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { SectionCard } from "./SectionCard";
import { ALL_MOBILE_TAB_OPTIONS, resetMobileBottomTabs, setMobileBottomTabs, setMobileTabHoldEnabled, useMobileBottomTabs, useMobileTabHoldEnabled } from "@/lib/mobileBottomBarSettings";

export function MobileBottomBarSettings({ isEn = false }: { isEn?: boolean }) {
  const tabs = useMobileBottomTabs();
  const holdEnabled = useMobileTabHoldEnabled();
  const message = (ok: boolean) => ok
    ? toast.success(isEn ? "Bottom navigation saved on this device" : "نوار پایین روی این دستگاه ذخیره شد")
    : toast.error(isEn ? "Could not save. Try again." : "ذخیره نشد؛ دوباره تلاش کن.");
  const select = (slot: number, key: string) => {
    const next = [...tabs];
    const previous = next.indexOf(key);
    if (previous !== -1) next[previous] = next[slot];
    next[slot] = key;
    message(setMobileBottomTabs(next));
  };
  return <SectionCard icon={Smartphone} title={isEn ? "Bottom navigation" : "نوار پایین موبایل"}
    description={isEn ? "Choose four tabs. Tap the empty left or right edge to open the menu from that side." : "چهار تب را انتخاب کن. فضای خالی چپ یا راست، منو را از همان سمت باز می‌کند."}>
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{isEn ? "Saved on this device" : "ذخیره روی همین دستگاه"}</span>
        <Button variant="outline" size="sm" onClick={() => message(resetMobileBottomTabs())}>{isEn ? "Reset Defaults" : "بازنشانی به پیش‌فرض"}</Button>
      </div>
      <div dir={isEn ? "ltr" : "rtl"} className="flex rounded-full border bg-muted/30 p-2" aria-label={isEn ? "Bottom bar preview" : "پیش‌نمایش نوار پایین"}>
        {tabs.map(key => { const option = ALL_MOBILE_TAB_OPTIONS[key]; const Icon = option.icon; return <div key={key} className="flex min-w-0 flex-1 flex-col items-center gap-1"><Icon className="h-4 w-4" aria-hidden /><span className="max-w-full truncate text-[10px]">{isEn ? option.labelEn : option.labelFa}</span></div>; })}
      </div>
      <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border p-3">
        <span className="text-sm">{isEn ? "Hold a tab to choose another destination" : "نگه‌داشتن روی تب برای انتخاب مقصد دیگر"}</span>
        <Switch checked={holdEnabled} onCheckedChange={value => message(setMobileTabHoldEnabled(value))} aria-label={isEn ? "Tab long press" : "نگه‌داشتن روی تب"} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map(slot => <section key={slot} className="space-y-2 rounded-xl border p-3">
          <h3 className="text-sm font-medium">{isEn ? `Position ${slot + 1}` : `جایگاه ${slot + 1}`}</h3>
          <div className="grid grid-cols-2 gap-1">
            {Object.values(ALL_MOBILE_TAB_OPTIONS).map(option => <button key={option.key} type="button"
              data-testid={`mobile-bottom-tab-option-${slot}-${option.key}`} aria-pressed={tabs[slot] === option.key}
              onClick={() => select(slot, option.key)}
              className={`flex min-h-11 min-w-0 items-center gap-1 rounded-lg px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tabs[slot] === option.key ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted"}`}>
              <span className="min-w-0 flex-1 truncate">{isEn ? option.labelEn : option.labelFa}</span>
              {tabs[slot] === option.key && <Check className="h-3 w-3" aria-hidden />}
            </button>)}
          </div>
        </section>)}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{isEn ? "Quick Add (+) floats above the right edge. Hold it for quick actions. Tab holds are off by default." : "دکمهٔ + بالای سمت راست نوار است؛ نگه‌داشتن آن دسترسی سریع را باز می‌کند. نگه‌داشتن تب‌ها به‌صورت پیش‌فرض خاموش است."}</p>
    </div>
  </SectionCard>;
}
export default MobileBottomBarSettings;
