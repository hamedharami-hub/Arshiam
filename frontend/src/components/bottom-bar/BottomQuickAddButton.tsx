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
      <div className="h-full flex-1 flex flex-col items-center justify-center pt-1.5 pb-1 select-none min-w-0">
        <button
          type="button"
          onClick={handleQuickAdd}
          {...longPressProps}
          aria-label={label}
          title={label}
          className={`group relative flex items-center justify-center h-8 w-14 rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/30 active:scale-95 hover:scale-105 transition-all duration-200 border border-primary/40 select-none ${className}`}
        >
          <Plus className="w-5 h-5 stroke-[2.5] text-primary-foreground transition-transform duration-200 group-hover:rotate-90" />
        </button>
        <span className="tracking-tight truncate max-w-full px-1 text-[11px] font-semibold text-primary mt-1 leading-tight select-none">
          {label}
        </span>
      </div>

      <MobileSpeedDialMenu
        open={speedDialOpen}
        onClose={() => setSpeedDialOpen(false)}
      />
    </>
  );
}
