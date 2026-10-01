import { useBilingual } from "@/hooks/useBilingual";

export type LessonStatus = "not_started" | "learning" | "practised";

const LABEL: Record<LessonStatus, [string, string]> = {
  not_started: ["شروع‌نشده", "Not started"],
  learning: ["در حال یادگیری", "Learning"],
  practised: ["تمرین‌شده", "Practised"],
};
const TONE: Record<LessonStatus, string> = {
  not_started: "border-border bg-muted/60 text-muted-foreground",
  learning: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  practised: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export function PharmacyStatusBadge({ status, testId }: { status: LessonStatus; testId?: string }) {
  const { T } = useBilingual();
  return <span data-testid={testId} data-status={status} className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium ${TONE[status]}`}>{T(...LABEL[status])}</span>;
}
