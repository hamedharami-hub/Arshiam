import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { haptic } from "@/lib/haptics";
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

  const handleQuickAdd = () => {
    haptic("medium");
    window.dispatchEvent(new Event("lov:open-quick-capture"));
  };

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

  // Mobile & Foldable mode: Elevated circular FAB with ambient glow
  return (
    <div className="relative flex items-center justify-center -mt-6 min-[520px]:-mt-7">
      <button
        type="button"
        onClick={handleQuickAdd}
        aria-label={label}
        className={`group relative h-13 w-13 min-[520px]:h-14 min-[520px]:w-14 rounded-full bg-gradient-to-tr from-primary via-primary/95 to-primary/85 text-primary-foreground shadow-lg shadow-primary/35 hover:shadow-xl hover:shadow-primary/50 flex items-center justify-center active:scale-90 hover:scale-105 transition-all duration-200 ring-4 ring-background/90 dark:ring-background/80 border border-white/25 select-none ${className}`}
      >
        <Plus className="w-6 h-6 min-[520px]:w-6.5 min-[520px]:h-6.5 stroke-[2.5] transition-transform duration-200 group-hover:rotate-90" />
        <span className="sr-only">{label}</span>
      </button>
    </div>
  );
}
