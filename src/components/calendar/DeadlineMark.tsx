import { DEADLINE_MARK_TEXT } from "@/lib/taskSchedule";

/** Text mark. Color is never the only signal that a day is a deadline. */
export function DeadlineMark({ className = "" }: { className?: string }) {
  return (
    <span data-testid="calendar-deadline-mark" className={`shrink-0 ${className}`}>
      {DEADLINE_MARK_TEXT}
    </span>
  );
}
