import { toPersianDigits } from "@/lib/persianDigits";

/**
 * Group title in task lists (Overdue, Today, Tomorrow, a weekday…).
 * Same type scale as the task header: 13px, medium, muted — overdue only changes colour.
 * Sticky on an opaque page-coloured surface (never see-through).
 */
export function TaskGroupHeader({ label, count, tone = "default", testid }: { label: string; count?: number; tone?: "default" | "overdue" | "accent"; testid?: string }) {
  const color = tone === "overdue" ? "text-rose-600 dark:text-rose-400" : tone === "accent" ? "text-primary" : "text-muted-foreground";
  return (
    <div className="task-group-header sticky top-0 z-[5] flex items-center justify-between px-1 py-1.5"
      style={{ background: "var(--page-surface, hsl(var(--background)))" }} data-testid={testid}>
      <span className={`text-[13px] font-medium ${color}`}>{label}</span>
      {typeof count === "number" && <span className="text-xs text-muted-foreground/80">{toPersianDigits(count)}</span>}
    </div>
  );
}
