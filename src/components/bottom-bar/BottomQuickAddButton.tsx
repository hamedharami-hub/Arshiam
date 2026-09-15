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

  // Mobile & Foldable mode: Elevated circular FAB with vibrant gradient and ambient glow
  return (
    <div className="relative flex items-center justify-center -mt-6 min-[600px]:-mt-7">
      {/* Ambient background glow */}
      <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-primary via-purple-500 to-indigo-400 blur-md opacity-50 dark:opacity-65 pointer-events-none -z-10 animate-pulse" />
      <button
        type="button"
        onClick={handleQuickAdd}
        aria-label={label}
        className={`group relative h-[3.4rem] w-[3.4rem] min-[600px]:h-[3.6rem] min-[600px]:w-[3.6rem] rounded-full bg-gradient-to-tr from-primary via-indigo-600 to-violet-500 text-primary-foreground shadow-[0_10px_25px_-4px_rgba(99,102,241,0.5),0_4px_10px_-2px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.45)] flex items-center justify-center active:scale-90 hover:scale-105 transition-all duration-200 ring-4 ring-background/95 dark:ring-background/90 border border-white/30 select-none overflow-hidden ${className}`}
      >
        {/* Subtle top gloss reflection */}
        <span className="absolute inset-x-1.5 top-0.5 h-1/2 rounded-t-full bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
        <Plus className="w-6 h-6 min-[600px]:w-6.5 min-[600px]:h-6.5 stroke-[2.6] drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out group-hover:rotate-90 group-active:rotate-45" />
        <span className="sr-only">{label}</span>
      </button>
    </div>
  );
}
