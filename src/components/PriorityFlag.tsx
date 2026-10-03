import { useTranslation } from "react-i18next";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_META, type Priority } from "@/lib/priority";

export type FlagPriority = Priority;

/** Narrows any stored or user-provided string to a real priority key (unknown values fall back to "none"). */
export function normalizePriority(priority: string | null | undefined): FlagPriority {
  return priority && priority in PRIORITY_META ? (priority as FlagPriority) : "none";
}

const LABEL_KEY: Record<FlagPriority, string> = {
  urgent: "ui.priorityUrgent",
  high: "ui.priorityHigh",
  medium: "ui.priorityMedium",
  low: "ui.priorityLow",
  none: "ui.priorityNone",
};

export function priorityLabelKey(priority: string | null | undefined): string {
  return LABEL_KEY[normalizePriority(priority)];
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
  const p = normalizePriority(priority);
  const label = t(LABEL_KEY[p]);
  return (
    <span
      className={cn("inline-flex items-center gap-1", PRIORITY_META[p].flagClass, className)}
      title={label}
      data-priority={p}
    >
      <Flag className={cn("h-3.5 w-3.5 shrink-0", p !== "none" && "fill-current")} aria-hidden />
      {withLabel ? <span className="text-xs text-foreground/80">{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}
