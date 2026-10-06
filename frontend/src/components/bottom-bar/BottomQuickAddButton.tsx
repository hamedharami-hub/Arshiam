import { useState, useEffect } from "react";
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
  const { t } = useTranslation();
  const [speedDialOpen, setSpeedDialOpen] = useState(
    () => typeof window !== "undefined" && window.location.search.includes("speeddial")
  );

  useEffect(() => {
    const handleOpen = () => setSpeedDialOpen(true);
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
        <button
          type="button"
          onClick={handleQuickAdd}
          {...longPressProps}
          aria-label={label}
          title={label}
          className={`group/add relative flex items-center justify-center h-10 w-[4rem] max-w-full overflow-hidden rounded-full bg-primary text-primary-foreground shadow-[0_5px_15px_hsl(var(--primary)/0.32),inset_0_1px_0_hsl(var(--primary-foreground)/0.32)] active:scale-[0.96] hover:scale-[1.03] hover:shadow-[0_7px_20px_hsl(var(--primary)/0.42),inset_0_1px_0_hsl(var(--primary-foreground)/0.4)] transition-all duration-200 ease-out border border-primary/45 ring-1 ring-primary/15 select-none ${className}`}
          style={{ backgroundImage: "linear-gradient(145deg, hsl(var(--primary)), hsl(var(--primary) / 0.86))" }}
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-3 top-px h-1/2 rounded-full bg-primary-foreground/10 blur-[5px]" />
          <Plus className="relative h-6 w-6 stroke-[2.8] text-primary-foreground drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-out group-hover/add:rotate-90 group-active/add:scale-90" />
        </button>
      </div>

      <MobileSpeedDialMenu
        open={speedDialOpen}
        onClose={() => setSpeedDialOpen(false)}
      />
    </>
  );
}
