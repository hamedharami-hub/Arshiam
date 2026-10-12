import { useState, useEffect, useRef } from "react";
import { Plus, ChevronUp } from "lucide-react";
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
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleOpen = () => {
      lastTriggerRef.current = moreButtonRef.current;
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
  const moreLabel = isEn ? "More actions" : "عملیات بیشتر";

  if (mode === "desktop") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label={label}
            className={`group relative h-9 px-3.5 rounded-xl bg-gradient-to-r from-primary via-primary/95 to-primary/90 text-primary-foreground font-medium text-xs shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 active:scale-95 flex items-center gap-1.5 transition-all duration-150 border border-primary/30 select-none ${className}`}
          >
            <Plus className="w-4 h-4 stroke-[2.5] transition-transform duration-200 group-hover:rotate-90" />
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
      <div className="relative z-10 h-full flex-1 flex items-center justify-center select-none min-w-0">
        <div className="relative">
          <button
            type="button"
            ref={quickAddButtonRef}
            onClick={() => { if (!longPressProps.didFire()) handleQuickAdd(); }}
            {...longPressProps.handlers}
            aria-label={label}
            title={label}
            className={`group/add relative flex items-center justify-center h-10 w-[4rem] max-w-full overflow-hidden rounded-full bg-primary text-primary-foreground shadow-[0_5px_15px_hsl(var(--primary)/0.32),inset_0_1px_0_hsl(var(--primary-foreground)/0.32)] active:scale-[0.96] hover:scale-[1.03] hover:shadow-[0_7px_20px_hsl(var(--primary)/0.42),inset_0_1px_0_hsl(var(--primary-foreground)/0.4)] transition-all duration-200 ease-out border border-primary/45 ring-1 ring-primary/15 select-none ${className}`}
            style={{ backgroundImage: "linear-gradient(145deg, hsl(var(--primary)), hsl(var(--primary) / 0.86))" }}
          >
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-3 top-px h-1/2 rounded-full bg-primary-foreground/10 blur-[5px]" />
            <Plus className="relative h-6 w-6 stroke-[2.8] text-primary-foreground drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-out group-hover/add:rotate-90 group-active/add:scale-90" />
          </button>
          {/* Explicit, labelled affordance: the speed dial is no longer reachable
              only through a long-press gesture. Tapping/long-pressing the main
              button still performs quick add / opens the speed dial. */}
          <button
            type="button"
            ref={moreButtonRef}
            onClick={() => {
              haptic("light");
              lastTriggerRef.current = moreButtonRef.current;
              setSpeedDialOpen((open) => !open);
            }}
            aria-label={moreLabel}
            aria-haspopup="dialog"
            aria-expanded={speedDialOpen}
            title={moreLabel}
            className="absolute -bottom-1 -end-1 z-20 grid h-6 w-6 place-items-center rounded-full bg-card text-primary border border-primary/45 shadow-sm hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            <ChevronUp className="h-3.5 w-3.5 stroke-[2.6]" aria-hidden="true" />
          </button>
        </div>
      </div>

      <MobileSpeedDialMenu
        open={speedDialOpen}
        onClose={() => setSpeedDialOpen(false)}
        triggerRef={lastTriggerRef}
      />
    </>
  );
}
