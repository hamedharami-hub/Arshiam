import { LucideIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  const ActionIcon = action?.icon;

  return (
    <div
      className={`rounded-2xl border border-dashed border-border/80 bg-card/40 backdrop-blur-xs p-8 md:p-12 flex flex-col items-center justify-center text-center transition-all ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent border border-primary/25 flex items-center justify-center text-primary shadow-sm mb-4 group-hover:scale-105 transition-transform duration-300">
        <Icon className="w-7 h-7" />
      </div>

      <h3 className="text-base font-semibold text-foreground tracking-tight mb-1.5">
        {title}
      </h3>

      {description && (
        <p className="text-xs md:text-sm text-muted-foreground max-w-sm leading-relaxed mb-5">
          {description}
        </p>
      )}

      {action && (
        <Button
          type="button"
          onClick={action.onClick}
          size="sm"
          className="rounded-xl shadow-xs gap-1.5 font-medium px-4 active:scale-95 transition-all"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          <span>{action.label}</span>
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
