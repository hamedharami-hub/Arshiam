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
    <Card className={cn("p-5 space-y-4 bg-card/60 border-border/60", className)}>
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
}: {
  label: React.ReactNode;
  help?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b last:border-0 border-border/40",
        className,
      )}
    >
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {help && <p className="text-xs text-muted-foreground">{help}</p>}
      </div>
      <div className="min-w-[140px] shrink-0">{children}</div>
    </div>
  );
}
