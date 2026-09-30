import React from "react";
import type { LucideIcon } from "lucide-react";

export interface MetaTileProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  leading?: React.ReactNode;
  label: string;
  value?: string | null;
  active?: boolean;
  activeClassName?: string;
  iconStyle?: React.CSSProperties;
  dotStyle?: React.CSSProperties;
  count?: number;
}

// Compact property chip (date, priority, tags, pin) — one row, no nested frames.
export const MetaTile = React.forwardRef<HTMLButtonElement, MetaTileProps>(
  ({ icon: Icon, leading, label, value, active = false, activeClassName = "", iconStyle, dotStyle: _dotStyle, count, className = "", ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      data-active={active || undefined}
      className={`inline-flex h-8 max-w-[14rem] min-w-0 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-default disabled:opacity-60 paper-chip ${
        active
          ? `border-border text-foreground ${activeClassName}`
          : "border-dashed border-border text-muted-foreground enabled:hover:border-foreground/30 enabled:hover:text-foreground"
      } ${className}`}
      {...rest}
    >
      {leading ?? (Icon && <Icon className="h-4 w-4 shrink-0" style={iconStyle} />)}
      <span className="min-w-0 truncate" dir="auto">{value || label}</span>
      {typeof count === "number" && count > 1 && <span className="tabular-nums text-muted-foreground">{count}</span>}
    </button>
  ),
);
MetaTile.displayName = "MetaTile";
