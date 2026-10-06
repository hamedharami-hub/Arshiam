import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setTaskSwipeSettings, useTaskSwipeSettings, type TaskSwipeAction } from "@/lib/taskSwipeSettings";

export function TaskSwipeSettings() {
  const { user } = useAuth();
  const { T } = useBilingual();
  const settings = useTaskSwipeSettings(user?.id);
  const options: Array<{ value: TaskSwipeAction; label: string }> = [
    { value: "none", label: T("خاموش", "Off") },
    { value: "complete", label: T("انجام‌شده / بازگشایی", "Complete / reopen") },
    { value: "today", label: T("انتقال به امروز", "Schedule for today") },
    { value: "tomorrow", label: T("انتقال به فردا", "Schedule for tomorrow") },
    { value: "menu", label: T("گزینه‌های کار", "Task actions") },
  ];
  return <div className="space-y-2" data-testid="task-swipe-settings">
    {(["left", "right"] as const).map(side => <div key={side} className="flex items-center justify-between gap-3 py-2 border-b last:border-0 border-border/40">
      <label className="text-sm" htmlFor={`task-swipe-${side}`}>{side === "left" ? T("کشیدن به چپ", "Swipe left") : T("کشیدن به راست", "Swipe right")}</label>
      <Select value={settings[side]} onValueChange={value => setTaskSwipeSettings(user?.id, { ...settings, [side]: value as TaskSwipeAction })}>
        <SelectTrigger id={`task-swipe-${side}`} className="h-9 text-xs w-[160px]"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>)}
  </div>;
}
