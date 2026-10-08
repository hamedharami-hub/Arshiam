import { Palette, Sun, Moon, Settings2, Check, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { ACCENT_COLORS, ACCENT_SWATCH, applyAccent, getStoredAccent, normalizeTheme, type AccentColor } from "@/lib/theme";
import { resetSidebarOrder } from "@/components/sidebar/SidebarNavSections";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useTranslation } from "react-i18next";
import { SectionCard, SettingRow } from "./SectionCard";
import { useSidebarPosition, type SidebarPosition } from "@/lib/sidebarPosition";
import { CompletionFeedbackSettingsCard } from "@/components/CompletionFeedbackSettingsCard";
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
    { value: "paper-light", label: t("ui.themePaperLight"), icon: Sun, swatch: ["#f8f6f2", "#efebe4", "#d9d3c9"] },
    { value: "paper-dark", label: t("ui.themePaperDark"), icon: Moon, swatch: ["#1c1a18", "#262320", "#3a3632"] },
    { value: "oled", label: t("ui.themeOled"), icon: Moon, swatch: ["#000000", "#000000", "#424242"] },
    { value: "system", label: t("ui.themeSystem"), icon: Settings2, swatch: ["#f8f6f2", "#1c1a18", "#000000"] },
  ];
  const activeTheme = normalizeTheme(currentTheme);
  const [accent, setAccent] = useState<AccentColor>(getStoredAccent);
  const accentGroupRef = useRef<HTMLDivElement>(null);
  const { sidebarPosition, setSidebarPosition } = useSidebarPosition();
  useEffect(() => {
    const synced = reminders?.accent_color;
    if (synced && (ACCENT_COLORS as string[]).includes(synced) && synced !== accent) {
      applyAccent(synced);
      setAccent(synced as AccentColor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminders?.accent_color]);
  const selectAccent = (color: AccentColor) => {
    applyAccent(color);
    setAccent(color);
    void updateReminder({ accent_color: color });
  };

  const handleAccentKeyDown = (event: KeyboardEvent<HTMLButtonElement>, color: AccentColor) => {
    const index = ACCENT_COLORS.indexOf(color);
    const rtl = !isEn;
    let delta: number | null = null;
    if (event.key === "ArrowRight") delta = rtl ? -1 : 1;
    if (event.key === "ArrowLeft") delta = rtl ? 1 : -1;
    if (event.key === "ArrowDown") delta = 1;
    if (event.key === "ArrowUp") delta = -1;
    if (delta === null) return;

    event.preventDefault();
    const next = ACCENT_COLORS[(index + delta + ACCENT_COLORS.length) % ACCENT_COLORS.length];
    accentGroupRef.current
      ?.querySelector<HTMLButtonElement>(`[data-accent-option="${next}"]`)
      ?.focus();
    selectAccent(next);
  };
  const accentKey: Record<AccentColor, string> = {
    indigo: "ui.accentIndigo", olive: "ui.accentOlive", amber: "ui.accentAmber",
    steel: "ui.accentSteel", rose: "ui.accentRose", brick: "ui.accentBrick",
  };

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
    { value: "right", label: isEn ? "Right side" : "سمت راست" },
    { value: "left", label: isEn ? "Left side" : "سمت چپ" },
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const active = activeTheme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setAppTheme(opt.value)}
                  data-testid={`theme-option-${opt.value}`}
                  aria-pressed={active}
                  className={`group relative flex flex-col items-center gap-2 rounded-lg border p-2.5 transition-colors ${
                    active ? "border-primary" : "border-border hover:border-foreground/30"
                  }`}
                >
                  <div className="flex h-7 w-full overflow-hidden rounded-md border border-border">
                    {opt.swatch.map((color, i) => (
                      <div key={i} className="flex-1 h-full" style={{ background: color }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                    <Icon className="w-3 h-3" />
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {active && <Check className="absolute top-1.5 end-1.5 h-3.5 w-3.5 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">{t("ui.accent")}</Label>
          <div ref={accentGroupRef} className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("ui.accent")}>
            {ACCENT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={accent === c}
                title={t(accentKey[c])}
                aria-label={t(accentKey[c])}
                data-testid={`accent-option-${c}`}
                data-accent-option={c}
                tabIndex={accent === c ? 0 : -1}
                onClick={() => selectAccent(c)}
                onKeyDown={(event) => handleAccentKeyDown(event, c)}
                className={`grid h-10 w-10 place-items-center rounded-full border-2 ${accent === c ? "border-foreground" : "border-transparent"}`}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full" style={{ background: ACCENT_SWATCH[c] }}>
                  {accent === c && <Check className="h-3.5 w-3.5 text-white" />}
                </span>
              </button>
            ))}
          </div>
        </div>

        <SettingRow label={t("ui.appearanceReset")}>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            data-testid="settings-reset-sidebar-order"
            onClick={() => { resetSidebarOrder(); toast.success(t("sidebar.resetDone")); window.dispatchEvent(new Event("arshnaz:sidebar-order-reset")); }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> {t("sidebar.resetOrder")}
          </Button>
        </SettingRow>

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
              help={isEn ? "Choose whether navigation opens from the right or left" : "تعیین باز شدن تسک‌بار و منوی برنامه از سمت راست یا چپ در تمام دستگاه‌ها"}
            >
              <Select
                value={sidebarPosition}
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

        <div className="pt-2">
          <CompletionFeedbackSettingsCard compact />
        </div>
      </div>
    </SectionCard>
  );
}
