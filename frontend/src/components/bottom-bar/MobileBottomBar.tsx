import { useTranslation } from "react-i18next";
import { useSidebar } from "@/components/ui/sidebar";
import type { BottomTabItemConfig } from "./types";
import { MobileTabSlot } from "./MobileTabSlot";
import { BottomQuickAddButton } from "./BottomQuickAddButton";

export interface MobileBottomBarProps {
  tabs?: BottomTabItemConfig[];
  primaryTabs?: BottomTabItemConfig[];
  secondaryTabs?: BottomTabItemConfig[];
  currentPath: string;
  dir: "rtl" | "ltr";
}

export function MobileBottomBar({ tabs, primaryTabs, secondaryTabs, currentPath, dir }: MobileBottomBarProps) {
  const { openMobileFromSide } = useSidebar();
  const { t } = useTranslation();
  const effectiveTabs = tabs || [...(primaryTabs || []), ...(secondaryTabs || [])];
  const visibleTabs = effectiveTabs.slice(0, 4);
  const liveTabs = visibleTabs.map(tab => tab.key);
  return <>
    {/* Visually empty, named edge targets; no overlap with the navigation links. */}
    {(["left", "right"] as const).map(side => <button
      key={side} type="button" data-bottom-menu-edge={side}
      aria-label={side === "left" ? t("nav.openMenuLeft", "Open menu from left") : t("nav.openMenuRight", "Open menu from right")}
      aria-haspopup="dialog" onClick={event => { event.currentTarget.focus(); openMobileFromSide(side); }}
      className="fixed z-40 h-[var(--bottom-bar-height)] w-11 rounded-xl bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ bottom: "max(env(safe-area-inset-bottom, 0px), 0.625rem)", [side]: `env(safe-area-inset-${side}, 0px)` }}
    />)}
    <nav dir={dir} data-bottom-bar="true"
      className="isolate fixed z-40 left-[calc(env(safe-area-inset-left,0px)+2.75rem)] right-[calc(env(safe-area-inset-right,0px)+2.75rem)] flex h-[var(--bottom-bar-height)] select-none items-stretch rounded-full border border-border bg-card text-foreground shadow-sm"
      style={{ bottom: "max(env(safe-area-inset-bottom, 0px), 0.625rem)", paddingInline: "0.25rem" }}
      aria-label={t("nav.bottomBar", "ناوبری پایین صفحه")}>
      {visibleTabs.map((tab, slot) => <MobileTabSlot key={slot} tab={tab} currentPath={currentPath} liveTabs={liveTabs} />)}
      <BottomQuickAddButton mode="mobile" />
    </nav>
  </>;
}
export default MobileBottomBar;
