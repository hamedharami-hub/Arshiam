import React from "react";
import type { LucideIcon } from "lucide-react";

export interface MetaTileProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  leading?: React.ReactNode;
  /** Accessible name when no value is set (not rendered as text). */
  label: string;
  value?: string | null;
  active?: boolean;
  open?: boolean;
  activeClassName?: string;
  iconStyle?: React.CSSProperties;
  dotStyle?: React.CSSProperties;
  count?: number;
}

// Quiet header item: icon + real value only. Unset → faint icon. Same font size/weight/colour everywhere.
export const MetaTile = React.forwardRef<HTMLButtonElement, MetaTileProps>(
  ({ icon: Icon, leading, label, value, active = false, open = false, activeClassName = "", iconStyle, dotStyle: _dotStyle, count, className = "", title, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      data-active={active || undefined}
      data-open={open || undefined}
      aria-label={rest["aria-label"] ?? (value ? `${label}: ${value}` : label)}
      title={title ?? (value ? `${label}: ${value}` : label)}
      className={`meta-item inline-flex h-9 min-w-0 max-w-[13rem] shrink-0 items-center gap-1.5 rounded-md px-1.5 text-[13px] font-normal leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-default disabled:opacity-60 ${
        open
          ? "bg-muted text-foreground"
          : active
            ? `text-foreground/85 enabled:hover:bg-muted/70 ${activeClassName}`
            : "text-muted-foreground/55 enabled:hover:bg-muted/70 enabled:hover:text-foreground"
      } ${className}`}
      {...rest}
    >
      {leading ?? (Icon && <Icon className="h-4 w-4 shrink-0" style={iconStyle} />)}
      {value && <span className="min-w-0 truncate" dir="auto">{value}</span>}
      {typeof count === "number" && count > 1 && <span className="tabular-nums text-muted-foreground">{count}</span>}
    </button>
  ),
);
MetaTile.displayName = "MetaTile";
