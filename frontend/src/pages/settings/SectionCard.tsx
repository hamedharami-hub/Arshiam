import React from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type LucideIcon = React.ComponentType<{ className?: string }>;

export function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("p-3 sm:p-4 space-y-3 bg-card border-border", className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-primary" />}
        <h2 className="font-semibold">{title}</h2>
      </div>
      {description && <p className="text-xs text-muted-foreground leading-6">{description}</p>}
      {children}
    </Card>
  );
}

export function SettingRow({
  label,
  help,
  children,
  className,
  controlId,
}: {
  label: React.ReactNode;
  help?: React.ReactNode;
  children: React.ReactNode | ((props: { id: string; "aria-labelledby": string; "aria-describedby"?: string }) => React.ReactNode);
  className?: string;
  /** For a specific control; otherwise the row is a labelled group, not a false label. */
  controlId?: string;
}) {
  const id = React.useId();
  const labelId = `${id}-label`;
  const helpId = help ? `${id}-help` : undefined;
  const renderedChildren = typeof children === "function"
    ? children({ id: controlId || `${id}-control`, "aria-labelledby": labelId, "aria-describedby": helpId })
    : children;
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={helpId}
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 border-b last:border-0 border-border/40",
        className,
      )}
    >
      <div className="space-y-0.5">
        {controlId ? <Label id={labelId} htmlFor={controlId} className="text-sm font-medium">{label}</Label>
          : <span id={labelId} className="text-sm font-medium">{label}</span>}
        {help && <p id={helpId} className="text-xs text-muted-foreground">{help}</p>}
      </div>
      <div className="min-w-0 sm:min-w-[140px] shrink-0">{renderedChildren}</div>
    </div>
  );
}
