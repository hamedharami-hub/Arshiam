import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { haptic } from "@/lib/haptics";
import { BottomTabItemConfig } from "./types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BottomTabItemProps {
  tab: BottomTabItemConfig;
  isActive: boolean;
  mode?: "mobile" | "desktop";
  dir?: "rtl" | "ltr";
}

export function BottomTabItem({ tab, isActive, mode = "mobile", dir = "rtl" }: BottomTabItemProps) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const label = isEn ? tab.labelEn : tab.labelFa;
  const Icon = tab.icon;

  const handleClick = () => {
    haptic("light");
    navigate(tab.to);
  };

  if (mode === "desktop") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium select-none transition-all duration-150 ${
              isActive
                ? "bg-primary/15 text-primary shadow-xs border border-primary/25 font-semibold"
                : "text-muted-foreground/80 hover:text-foreground hover:bg-accent/50"
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-105"}`} />
              {tab.badge ? (
                <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 rounded-full text-[9px] font-bold bg-primary text-primary-foreground min-w-3.5 h-3.5 flex items-center justify-center">
                  {tab.badge}
                </span>
              ) : null}
            </div>
            <span>{label}</span>
            <kbd className={`text-[9px] px-1 py-0.2 rounded font-mono border ltr ${
              isActive ? "bg-primary/20 text-primary border-primary/30" : "bg-muted/60 text-muted-foreground/80 border-border/50"
            }`}>
              {tab.shortcutKey}
            </kbd>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="flex items-center gap-1.5 text-xs py-1 px-2.5">
          <span>{label}</span>
          <kbd className="text-[10px] bg-muted/80 px-1.5 py-0.5 rounded font-mono border ltr">
            {tab.shortcutLabel}
          </kbd>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Mobile mode
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className={`relative h-full flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium select-none active:scale-90 transition-all duration-150 ${
        isActive
          ? "text-primary"
          : "text-muted-foreground/75 hover:text-foreground"
      }`}
    >
      <div className={`relative flex items-center justify-center px-3 py-1 rounded-full transition-all duration-200 ${
        isActive ? "bg-primary/10" : ""
      }`}>
        <Icon
          className={`w-5 h-5 transition-transform duration-200 ${
            isActive ? "scale-110 stroke-[2.2]" : "stroke-[1.8]"
          }`}
        />
        {tab.badge ? (
          <span className="absolute -top-1 -right-1 px-1 rounded-full text-[9px] font-bold bg-primary text-primary-foreground min-w-3.5 h-3.5 flex items-center justify-center shadow-xs">
            {tab.badge}
          </span>
        ) : null}
        {isActive && (
          <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        )}
      </div>
      <span
        dir={dir}
        className={`tracking-tight transition-colors duration-150 ${
          isActive ? "font-bold text-primary" : "text-muted-foreground/90"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
