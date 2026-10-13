import { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { haptic } from "@/lib/haptics";
import { useLongPress } from "@/lib/useLongPress";
import { MobileSpeedDialMenu } from "./MobileSpeedDialMenu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BottomQuickAddButtonProps {
  mode?: "mobile" | "desktop";
  className?: string;
}

export function BottomQuickAddButton({ mode = "mobile", className = "" }: BottomQuickAddButtonProps) {
  const { t, i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const [speedDialOpen, setSpeedDialOpen] = useState(
    () => typeof window !== "undefined" && window.location.search.includes("speeddial")
  );
  // Explicit "more actions" affordance and the element focus should return to
  // when the speed dial closes (whichever control opened it).
  const quickAddButtonRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleOpen = () => {
      lastTriggerRef.current = quickAddButtonRef.current;
      setSpeedDialOpen(true);
    };
    const handleClose = () => setSpeedDialOpen(false);
    window.addEventListener("lov:open-speed-dial", handleOpen);
    window.addEventListener("lov:close-speed-dial", handleClose);
    return () => {
      window.removeEventListener("lov:open-speed-dial", handleOpen);
      window.removeEventListener("lov:close-speed-dial", handleClose);
    };
  }, []);

  const handleQuickAdd = () => {
    haptic("medium");
    window.dispatchEvent(new Event("lov:open-quick-capture"));
  };

  const handleLongPress = () => {
    haptic("heavy");
    lastTriggerRef.current = quickAddButtonRef.current;
    setSpeedDialOpen(true);
  };

  const longPressProps = useLongPress({
    onLongPress: handleLongPress,
    delay: 450,
  });

  const label = t("nav.quickAdd", "افزودن سریع");

  if (mode === "desktop") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label={label}
            className={`group relative h-11 min-w-11 px-3.5 rounded-xl bg-gradient-to-r from-primary via-primary/95 to-primary/90 text-primary-foreground font-medium text-xs shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 flex items-center gap-1.5 transition-[color,background-color,box-shadow] duration-150 border border-primary/30 select-none touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
          >
            <Plus aria-hidden="true" className="w-4 h-4 stroke-[2.5] transition-transform duration-200 motion-safe:group-hover:rotate-90" />
            <span className="hidden lg:inline">{label}</span>
            <kbd className="hidden lg:inline-flex text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-primary-foreground/20 text-primary-foreground border border-white/20 shadow-[0_1px_0_rgba(0,0,0,0.1)] ltr">
              Alt+N
            </kbd>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="flex items-center gap-1.5 text-xs py-1 px-2.5">
          <span>{label}</span>
          <kbd className="text-[10px] bg-muted/80 px-1.5 py-0.5 rounded font-mono border ltr">Alt+N</kbd>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Mobile mode: Sleek, perfectly aligned primary action button
  return (
    <>
      <div data-floating-quick-add="true" className="absolute right-0 bottom-[calc(100%+12px)] z-10 select-none">
          <button
            type="button"
            ref={quickAddButtonRef}
            onClick={() => { if (!longPressProps.didFire()) handleQuickAdd(); }}
            {...longPressProps.handlers}
            aria-label={label}
            aria-description={isEn ? "Tap to add. Hold for more actions; keyboard: Shift+F10." : "برای افزودن بزن؛ برای گزینه‌های بیشتر نگه دار. با صفحه‌کلید: Shift+F10."}
            aria-haspopup="dialog"
            aria-expanded={speedDialOpen}
            onKeyDown={event => {
              if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
                event.preventDefault();
                handleLongPress();
              }
            }}
            onContextMenu={event => { event.preventDefault(); handleLongPress(); }}
            title={isEn ? `${label} · Hold for more actions` : `${label} · برای گزینه‌های بیشتر نگه دار`}
            className={`group/add relative flex items-center justify-center h-11 w-11 shrink-0 overflow-hidden rounded-full bg-primary text-primary-foreground shadow-[0_5px_15px_hsl(var(--primary)/0.32),inset_0_1px_0_hsl(var(--primary-foreground)/0.32)] hover:shadow-[0_7px_20px_hsl(var(--primary)/0.42),inset_0_1px_0_hsl(var(--primary-foreground)/0.4)] transition-shadow duration-200 ease-out border border-primary/45 ring-1 ring-primary/15 select-none touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
            style={{ backgroundImage: "linear-gradient(145deg, hsl(var(--primary)), hsl(var(--primary) / 0.86))" }}
          >
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-3 top-px h-1/2 rounded-full bg-primary-foreground/10 blur-[5px]" />
            <Plus aria-hidden="true" className="relative h-6 w-6 stroke-[2.8] text-primary-foreground drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-out motion-safe:group-hover/add:rotate-90 motion-safe:group-active/add:scale-90" />
          </button>
      </div>

      <MobileSpeedDialMenu
        open={speedDialOpen}
        onClose={() => setSpeedDialOpen(false)}
        triggerRef={lastTriggerRef}
      />
    </>
  );
}
