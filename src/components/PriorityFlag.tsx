import { Flag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type FlagPriority = "urgent" | "high" | "medium" | "low" | "none";

const FLAG_COLOR: Record<FlagPriority, string> = {
  urgent: "text-priority-high",
  high: "text-priority-medium",
  medium: "text-priority-low",
  low: "text-priority-none",
  none: "text-muted-foreground/60",
};

const LABEL_KEY: Record<FlagPriority, string> = {
  urgent: "ui.priorityUrgent",
  high: "ui.priorityHigh",
  medium: "ui.priorityMedium",
  low: "ui.priorityLow",
  none: "ui.priorityNone",
};

export function priorityLabelKey(priority: string | null | undefined): string {
  return LABEL_KEY[(priority as FlagPriority) in LABEL_KEY ? (priority as FlagPriority) : "none"];
}

export function PriorityFlag({
  priority,
  className,
  withLabel = false,
}: {
  priority: string | null | undefined;
  className?: string;
  withLabel?: boolean;
}) {
  const { t } = useTranslation();
  const p: FlagPriority = priority && priority in FLAG_COLOR ? (priority as FlagPriority) : "none";
  const label = t(LABEL_KEY[p]);
  return (
    <span className={cn("inline-flex items-center gap-1", FLAG_COLOR[p], className)} title={label} data-priority={p}>
      <Flag className="h-4 w-4 shrink-0" fill={p === "none" ? "none" : "currentColor"} strokeWidth={p === "urgent" ? 2.25 : 1.75} aria-hidden />
      {withLabel ? <span className="text-xs text-foreground/80">{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}
