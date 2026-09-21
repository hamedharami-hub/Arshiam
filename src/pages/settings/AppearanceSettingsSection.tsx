import { Palette, Sun, Moon, CheckCircle2, Heart, Settings2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useTranslation } from "react-i18next";
import { SectionCard, SettingRow } from "./SectionCard";
import { getSidebarPosition, setSidebarPosition, type SidebarPosition } from "@/lib/sidebarPosition";
import type { UserSettings } from "@/lib/reminders";

export interface AppearanceSettingsSectionProps {
  isEn: boolean;
  reminders: UserSettings | null;
  updateReminder: (patch: Partial<UserSettings>) => Promise<void> | void;
  currentTheme: string;
  setAppTheme: (theme: string) => void;
}

export function AppearanceSettingsSection({
  isEn,
  reminders,
  updateReminder,
  currentTheme,
  setAppTheme,
}: AppearanceSettingsSectionProps) {
  const { t } = useTranslation();

  const themeOptions = [
    { value: "system", label: t("settings.themeSystem"), icon: Settings2, swatch: ["#94a3b8", "#cbd5e1", "#475569"] },
    { value: "light", label: t("settings.themeLight"), icon: Sun, swatch: ["#ffffff", "#f1f5f9", "#6366f1"] },
    { value: "dark", label: t("settings.themeDark"), icon: Moon, swatch: ["#0f172a", "#1e293b", "#818cf8"] },
    { value: "ticktick-light", label: t("settings.themeTickTick"), icon: CheckCircle2, swatch: ["#ffffff", "#f0fdf4", "#4ade80"] },
    { value: "arshnaz-light", label: t("settings.themeArshnaz"), icon: Heart, swatch: ["#fff7ed", "#fef3c7", "#f59e0b"] },
    { value: "arshnaz-dark", label: t("settings.themeArshnazDark"), icon: Moon, swatch: ["#1c1917", "#292524", "#fb923c"] },
  ];

  const fontSizeOptions = [
    { value: "small", label: t("settings.fontSmall") },
    { value: "medium", label: t("settings.fontMedium") },
    { value: "large", label: t("settings.fontLarge") },
    { value: "xlarge", label: t("settings.fontXLarge") },
  ];

  const landingOptions = [
    { value: "today", label: t("settings.landingToday") },
    { value: "last", label: t("settings.landingLast") },
  ];

  const layoutOptions = [
    { value: "comfortable", label: t("settings.layoutComfortable") },
    { value: "compact", label: t("settings.layoutCompact") },
  ];

  const sidebarPositionOptions = [
    { value: "right", label: isEn ? "Right side (Persian standard)" : "سمت راست (استاندارد فارسی)" },
    { value: "left", label: isEn ? "Left side (TickTick style)" : "سمت چپ (مشابه تیک‌تیک)" },
  ];

  return (
    <SectionCard
      icon={Palette}
      title={t("settings.appearance")}
      description={t("settings.appearanceDesc")}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">{t("settings.theme")}</Label>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const active = currentTheme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setAppTheme(opt.value)}
                  className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all duration-200 hover:scale-[1.03] hover:shadow-md ${
                    active
                      ? "border-primary shadow-sm bg-primary/5"
                      : "border-border/60 bg-card/60 hover:border-primary/40"
                  }`}
                >
                  <div className="flex gap-1 h-7 w-full rounded-lg overflow-hidden">
                    {opt.swatch.map((color, i) => (
                      <div key={i} className="flex-1 h-full" style={{ background: color }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                    <Icon className="w-3 h-3" />
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {active && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {reminders && (
          <>
            <SettingRow label={t("settings.fontSize")} help={t("settings.fontSizeHelp")}>
              <Select value={reminders.font_size} onValueChange={(v) => updateReminder({ font_size: v as UserSettings["font_size"] })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fontSizeOptions.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </SettingRow>

            <SettingRow label={t("settings.uiZoom")} help={t("settings.uiZoomHelp")}>
              <div className="flex items-center gap-3 w-full">
                <Slider
                  value={[Math.round((reminders.ui_scale || 1) * 100)]}
                  min={80} max={140} step={5}
                  onValueChange={([v]) => updateReminder({ ui_scale: v / 100 })}
                  className="flex-1"
                />
                <span className="text-sm font-mono w-12 text-center">{Math.round((reminders.ui_scale || 1) * 100)}%</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => updateReminder({ ui_scale: 1 })} className="mt-2 h-7 text-xs">
                {t("settings.resetTo100")}
              </Button>
            </SettingRow>

            <SettingRow label={t("settings.taskCardLayout")} help={t("settings.layoutHelp")}>
              <Select value={reminders.task_card_layout} onValueChange={(v) => updateReminder({ task_card_layout: v as UserSettings["task_card_layout"] })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {layoutOptions.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </SettingRow>

            <SettingRow label={t("settings.defaultLanding")}>
              <Select value={(reminders as { default_landing?: string }).default_landing === "home" ? "today" : ((reminders as { default_landing?: string }).default_landing || "today")} onValueChange={(v) => updateReminder({ default_landing: v as "today" | "last" | "home" })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {landingOptions.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </SettingRow>

            <SettingRow
              label={isEn ? "Sidebar & Navigation Position" : "جهت منو و نوار کناری (سایدبار / تسک‌بار)"}
              help={isEn ? "Choose whether navigation opens from the right (Persian standard) or left (TickTick style)" : "تعیین باز شدن تسک‌بار و منوی برنامه از سمت راست یا چپ در تمام دستگاه‌ها"}
            >
              <Select
                value={reminders.sidebar_position || getSidebarPosition()}
                onValueChange={(v) => {
                  const pos = v as SidebarPosition;
                  setSidebarPosition(pos);
                  updateReminder({ sidebar_position: pos });
                }}
              >
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sidebarPositionOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingRow>
          </>
        )}
      </div>
    </SectionCard>
  );
}
