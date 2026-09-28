import React from "react";
import type { LucideIcon } from "lucide-react";

export interface MetaTileProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  value?: string | null;
  active?: boolean;
  activeClassName?: string;
  iconStyle?: React.CSSProperties;
  dotStyle?: React.CSSProperties;
  count?: number;
}

export const MetaTile = React.forwardRef<HTMLButtonElement, MetaTileProps>(
  ({ icon: Icon, label, value, active = false, activeClassName = "", iconStyle, dotStyle, count, className = "", ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      data-active={active || undefined}
      className={`group relative flex h-[52px] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl border px-1.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-default disabled:opacity-60 enabled:hover:-translate-y-px enabled:hover:shadow-sm enabled:active:scale-[0.97] ${
        active
          ? `border-transparent shadow-2xs ${activeClassName || "bg-primary/12 text-primary"}`
          : "border-border/50 bg-muted/25 text-muted-foreground enabled:hover:border-border enabled:hover:bg-muted/50 enabled:hover:text-foreground"
      } ${className}`}
      {...rest}
    >
      <span className="relative">
        <Icon className="h-[17px] w-[17px] shrink-0 transition-transform duration-200 group-enabled:group-hover:scale-110" style={iconStyle} />
        {typeof count === "number" && count > 0 && (
          <span className="absolute -end-2.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-current px-0.5 text-[9px] font-bold leading-none">
            <span className="text-background">{count}</span>
          </span>
        )}
      </span>
      <span className="w-full truncate text-center text-[10px] font-medium leading-tight">{value || label}</span>
      {active && <span className="absolute end-2 top-2 h-1.5 w-1.5 rounded-full bg-current" style={dotStyle} />}
    </button>
  ),
);
MetaTile.displayName = "MetaTile";
