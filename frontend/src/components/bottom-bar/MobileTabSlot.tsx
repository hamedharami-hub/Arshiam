import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLongPress } from "@/lib/useLongPress";
import { ALL_MOBILE_TAB_OPTIONS, getAccessibleMobileTabs, setMobileBottomTabs, useMobileBottomTabs, useMobileTabHoldEnabled } from "@/lib/mobileBottomBarSettings";
import { isPathAllowed, useModules } from "@/lib/appModules";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BottomTabItem } from "./BottomTabItem";
import type { BottomTabItemConfig } from "./types";

export function MobileTabSlot({ tab, currentPath, liveTabs }: { tab: BottomTabItemConfig; currentPath: string; liveTabs?: string[] }) {
  const enabled = useMobileTabHoldEnabled();
  const tabs = useMobileBottomTabs();
  const modules = useModules();
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!enabled && open) setOpen(false); }, [enabled, open]);
  const trigger = useRef<HTMLDivElement>(null);
  const hold = useLongPress({ onLongPress: () => { if (enabled) setOpen(true); }, delay: 450 });
  return <>
    <div ref={trigger} className="flex min-w-11 flex-1" {...(enabled ? hold.handlers : {})}
      onClickCapture={event => { if (enabled && hold.didFire()) { event.preventDefault(); event.stopPropagation(); } }}
      onKeyDown={event => { if (enabled && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) { event.preventDefault(); setOpen(true); } }}>
      <BottomTabItem tab={tab} isActive={tab.match(currentPath)} mode="mobile" />
    </div>
    <Dialog open={open && enabled} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm" onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.querySelector<HTMLAnchorElement>("a")?.focus(); }}>
        <DialogTitle>{isEn ? "Choose this tab" : "انتخاب این تب"}</DialogTitle>
        <DialogDescription>{isEn ? "Replace this destination. Other tabs stay available." : "مقصد این تب را تغییر بده؛ تب‌های دیگر حفظ می‌شوند."}</DialogDescription>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(ALL_MOBILE_TAB_OPTIONS).filter(option => isPathAllowed(option.to, modules)).map(option => <button key={option.key} type="button" className="min-h-11 rounded-lg border px-2 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              // Module access can substitute saved destinations. Edit the layout the
              // user actually sees, including fallback tabs absent from storage.
              const next = [...(liveTabs ?? getAccessibleMobileTabs(tabs, modules).map(item => item.key))];
              const slot = next.indexOf(tab.key);
              if (slot < 0) return;
              const existing = next.indexOf(option.key);
              if (existing >= 0) next[existing] = next[slot];
              next[slot] = option.key;
              if (setMobileBottomTabs(next)) setOpen(false);
              else toast.error(isEn ? "Could not save. Try again." : "ذخیره نشد؛ دوباره تلاش کن.");
            }}>{isEn ? option.labelEn : option.labelFa}</button>)}
        </div>
        <Link to="/app/settings?tab=general" onClick={() => setOpen(false)} className="text-sm text-primary underline">{isEn ? "Navigation settings" : "تنظیمات نوار پایین"}</Link>
      </DialogContent>
    </Dialog>
  </>;
}
