export type Priority = "none" | "low" | "medium" | "high" | "urgent";

export const PRIORITY_META: Record<Priority, {
  label: string;
  labelEn: string;
  emoji: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  /** Border + checked-fill classes for the row checkbox (single source of truth). */
  checkboxClass: string;
  /** Colored flag-icon class used for the priority flag glyph. */
  flagClass: string;
  rank: number;
}> = {
  urgent: {
    label: "فوری",
    labelEn: "Urgent",
    emoji: "🔥",
    textClass: "text-red-700 dark:text-red-300",
    bgClass: "bg-red-600/15 border-red-600/40",
    borderClass: "border-l-red-600",
    checkboxClass: "border-red-600 data-[state=checked]:bg-red-600",
    flagClass: "text-red-600",
    rank: -1,
  },
  high: {
    label: "زیاد",
    labelEn: "High",
    emoji: "🔴",
    textClass: "text-rose-600 dark:text-rose-400",
    bgClass: "bg-rose-500/10 border-rose-500/30",
    borderClass: "border-l-rose-500",
    checkboxClass: "border-rose-500 data-[state=checked]:bg-rose-500",
    flagClass: "text-rose-500",
    rank: 0,
  },
  medium: {
    label: "متوسط",
    labelEn: "Medium",
    emoji: "🟠",
    textClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10 border-amber-500/30",
    borderClass: "border-l-amber-500",
    checkboxClass: "border-amber-500 data-[state=checked]:bg-amber-500",
    flagClass: "text-amber-500",
    rank: 1,
  },
  low: {
    label: "کم",
    labelEn: "Low",
    emoji: "🟢",
    textClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10 border-emerald-500/30",
    borderClass: "border-l-emerald-500",
    checkboxClass: "border-emerald-500 data-[state=checked]:bg-emerald-500",
    flagClass: "text-emerald-500",
    rank: 2,
  },
  none: {
    label: "بدون اولویت",
    labelEn: "No priority",
    emoji: "⚪",
    textClass: "text-muted-foreground",
    bgClass: "bg-muted/30 border-border",
    borderClass: "border-l-transparent",
    checkboxClass: "border-muted-foreground/50 data-[state=checked]:bg-muted-foreground",
    flagClass: "text-muted-foreground/60",
    rank: 3,
  },
};

export const PRIORITY_ORDER: Priority[] = ["urgent", "high", "medium", "low"];
export const PRIORITY_SELECTABLE: Priority[] = ["urgent", "high", "medium", "low"];
