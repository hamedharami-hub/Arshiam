import React from "react";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { toPersianDigits } from "@/lib/persianDigits";

interface TaskSectionProps {
  icon?: LucideIcon;
  title: string;
  count?: number | string | null;
  actions?: React.ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  children: React.ReactNode;
  testid?: string;
}

/** One consistent block inside the task page: thin divider, quiet heading, optional count/actions. No nested frames. */
export function TaskSection({ icon: Icon, title, count, actions, onClose, closeLabel, children, testid }: TaskSectionProps) {
  return (
    <section className="task-section border-t border-border/60 pt-3" aria-label={title} data-testid={testid}>
      <div className="mb-1.5 flex min-h-7 items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
          {Icon && <Icon className="h-4 w-4 shrink-0" />}
          <span className="truncate">{title}</span>
          {count !== null && count !== undefined && count !== 0 && count !== "" && (
            <span className="text-xs font-normal text-muted-foreground/70">{toPersianDigits(count)}</span>
          )}
        </h3>
        <div className="flex shrink-0 items-center gap-0.5">
          {actions}
          {onClose && (
            <button type="button" onClick={onClose} title={closeLabel} aria-label={closeLabel}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground/70 hover:bg-muted hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Small text action used in section headers ("+ New", "Manage"). */
export function TaskSectionAction({ icon: Icon, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon }) {
  return (
    <button type="button" {...rest}
      className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
