import { CalendarDays } from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import { deadlineCue } from "./deadlineCue";

export default function DeadlineMarker({
  deadlineDate, completed, status,
}: {
  deadlineDate?: string | null;
  completed?: boolean;
  status?: string;
}) {
  const cue = deadlineCue(deadlineDate, { completed, status });
  const { T } = useBilingual();
  if (!cue) return null;
  const label = cue.state === "overdue"
    ? T("ددلاین گذشته", "Deadline overdue")
    : T("ددلاین تا ۷ روز آینده", "Deadline within 7 days");
  const tone = cue.state === "overdue" ? "text-destructive" : "text-amber-600 dark:text-amber-400";
  return (
    <span
      aria-label={`${label}: ${deadlineDate}`}
      title={`${label}: ${deadlineDate}`}
      className={`inline-flex shrink-0 items-center ${tone}`}
    >
      <CalendarDays aria-hidden className="h-3 w-3" />
    </span>
  );
}
