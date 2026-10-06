import React from "react";
import { useTranslation } from "react-i18next";
import {
  Smartphone,
  RotateCcw,
  Plus,
  PanelRight,
  Check,
} from "lucide-react";
import { SectionCard } from "./SectionCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useMobileBottomTabs,
  setMobileBottomTabs,
  resetMobileBottomTabs,
  ALL_MOBILE_TAB_OPTIONS,
  DEFAULT_MOBILE_BOTTOM_TABS,
} from "@/lib/mobileBottomBarSettings";

interface MobileBottomBarSettingsProps {
  isEn?: boolean;
}

export function MobileBottomBarSettings({ isEn = false }: MobileBottomBarSettingsProps) {
  const { t } = useTranslation();
  const currentTabs = useMobileBottomTabs();

  const handleSelectSlot = (slotIndex: number, newKey: string) => {
    const next = [...currentTabs];
    // If the selected key is already in another slot, swap them
    const existingIndex = next.indexOf(newKey);
    if (existingIndex !== -1 && existingIndex !== slotIndex) {
      next[existingIndex] = next[slotIndex];
    }
    next[slotIndex] = newKey;
    setMobileBottomTabs(next);
    toast.success(
      isEn
        ? "Mobile bottom bar updated"
        : "چیدمان نوار پایین موبایل به‌روزرسانی شد"
    );
  };

  const handleReset = () => {
    resetMobileBottomTabs();
    toast.success(
      isEn
        ? "Restored default bottom navigation"
        : "چیدمان پیش‌فرض نوار پایین موبایل بازیابی شد"
    );
  };

  const optionsList = Object.values(ALL_MOBILE_TAB_OPTIONS);

  return (
    <SectionCard
      icon={Smartphone}
      title={isEn ? "Mobile Bottom Navigation Bar" : "شخصی‌سازی نوار پایین موبایل"}
      description={
        isEn
          ? "Choose which 3 primary sections appear alongside the Menu and Quick Add (+) buttons."
          : "انتخاب ۳ بخش اصلی برنامه برای قرارگیری در کنار دکمه‌های منو و مثبت (+) در گوشی‌های همراه."
      }
    >
      <div className="space-y-4">
        {/* Live Interactive Miniature Preview */}
        <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pb-1 border-b border-border/50">
            <span>{isEn ? "Live Bottom Bar Preview" : "پیش‌نمایش زنده نوار پایین"}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isEn ? "Reset Defaults" : "بازنشانی به پیش‌فرض"}</span>
            </Button>
          </div>

          <div
            dir={isEn ? "ltr" : "rtl"}
            className="flex items-center justify-between p-2 rounded-xl bg-background/90 dark:bg-card/90 border border-border/60 shadow-inner gap-1"
          >
            {/* Slot 0: Menu (Fixed) */}
            <div className="flex-1 flex flex-col items-center justify-center p-1 rounded-lg bg-muted/40 text-muted-foreground/80 min-w-0">
              <PanelRight className="w-4 h-4 mb-0.5 text-primary/70" />
              <span className="text-[10px] font-medium truncate max-w-full">
                {isEn ? "Menu" : "منو"}
              </span>
            </div>

            {/* Slot 1: User Tab 1 */}
            {(() => {
              const opt = ALL_MOBILE_TAB_OPTIONS[currentTabs[0]] || ALL_MOBILE_TAB_OPTIONS.today;
              const Icon = opt.icon;
              return (
                <div className="flex-1 flex flex-col items-center justify-center p-1 rounded-lg bg-primary/10 text-primary border border-primary/25 min-w-0">
                  <Icon className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px] font-bold truncate max-w-full">
                    {isEn ? opt.labelEn : opt.labelFa}
                  </span>
                </div>
              );
            })()}

            {/* Center: Quick Add (+) (Fixed) */}
            <div className="flex-1 flex flex-col items-center justify-center p-1 rounded-lg min-w-0">
              <div className="flex items-center justify-center h-6 w-9 rounded-full bg-primary text-primary-foreground shadow-xs">
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-bold text-primary mt-0.5 truncate max-w-full">
                {isEn ? "Add" : "ثبت"}
              </span>
            </div>

            {/* Slot 2: User Tab 2 */}
            {(() => {
              const opt = ALL_MOBILE_TAB_OPTIONS[currentTabs[1]] || ALL_MOBILE_TAB_OPTIONS.calendar;
              const Icon = opt.icon;
              return (
                <div className="flex-1 flex flex-col items-center justify-center p-1 rounded-lg bg-primary/10 text-primary border border-primary/25 min-w-0">
                  <Icon className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px] font-bold truncate max-w-full">
                    {isEn ? opt.labelEn : opt.labelFa}
                  </span>
                </div>
              );
            })()}

            {/* Slot 3: User Tab 3 */}
            {(() => {
              const opt = ALL_MOBILE_TAB_OPTIONS[currentTabs[2]] || ALL_MOBILE_TAB_OPTIONS.notes;
              const Icon = opt.icon;
              return (
                <div className="flex-1 flex flex-col items-center justify-center p-1 rounded-lg bg-primary/10 text-primary border border-primary/25 min-w-0">
                  <Icon className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px] font-bold truncate max-w-full">
                    {isEn ? opt.labelEn : opt.labelFa}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 3 Slot Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[0, 1, 2].map((slotIdx) => {
            const currentKey = currentTabs[slotIdx];
            const currentOpt = ALL_MOBILE_TAB_OPTIONS[currentKey] || ALL_MOBILE_TAB_OPTIONS[DEFAULT_MOBILE_BOTTOM_TABS[slotIdx]];
            const SlotIcon = currentOpt.icon;

            return (
              <div
                key={slotIdx}
                className="p-3 rounded-2xl border border-border/80 bg-card/50 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center">
                      {slotIdx + 1}
                    </span>
                    {isEn ? `Position ${slotIdx + 1}` : `جایگاه ${slotIdx + 1}`}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    <SlotIcon className="w-3.5 h-3.5" />
                    <span>{isEn ? currentOpt.labelEn : currentOpt.labelFa}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {optionsList.map((opt) => {
                    const isSelected = opt.key === currentKey;
                    const OptIcon = opt.icon;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleSelectSlot(slotIdx, opt.key)}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium transition-all text-right select-none ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs font-bold"
                            : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <OptIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate flex-1">
                          {isEn ? opt.labelEn : opt.labelFa}
                        </span>
                        {isSelected && <Check className="w-3 h-3 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tip / Guidance Note */}
        <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
          💡{" "}
          {isEn
            ? "Tip: Holding down (long-pressing) the center Plus button on your mobile device instantly opens the Speed Dial menu with Quick Note, Focus Timer, Mood Check-in, and Task capture."
            : "نکته کاربردی: با نگه داشتن انگشت (Long-press) روی دکمه مثبت (+) وسط صفحه، منوی دسترسی سریع به یادداشت فوری، تایمر فوکوس، ثبت حال امروز و تسک جدید گشوده می‌شود."}
        </p>
      </div>
    </SectionCard>
  );
}
export default MobileBottomBarSettings;
