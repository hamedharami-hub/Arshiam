import { useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import { SORT_KEYS, SORT_LABELS, type SortKey } from "@/lib/smartListService";
import { saveTaskListSort, useTaskListSort, type TaskListSort } from "@/lib/taskListSort";
import { SectionCard } from "./SectionCard";
import { toast } from "sonner";

const SCOPES = [
  ["today:_", "امروز", "Today"], ["tomorrow:_", "فردا", "Tomorrow"],
  ["bucket:week", "این هفته", "This week"],
  ["next7:_", "۷ روز آینده", "Next 7 days"],
  ["bucket:month", "این ماه", "This month"],
  ["inbox:_", "صندوق ورودی", "Inbox"], ["default:_", "سایر فهرست‌ها", "Other lists"],
] as const;

export function TaskListSortSettings() {
  const { T } = useBilingual();
  const [scope, setScope] = useState<string>("today:_");
  const value = useTaskListSort(scope);
  const change = (next: TaskListSort) => {
    if (!saveTaskListSort(scope, next)) toast.error(T("ذخیرهٔ ترتیب نمایش انجام نشد.", "Display order could not be saved."));
  };
  return <SectionCard icon={ArrowDownUp} title={T("ترتیب نمایش تسک‌ها", "Task list order")}
    description={T("پین‌شده‌ها همیشه بالاتر هستند. معیار دوم فقط هنگام برابر بودن معیار اول استفاده می‌شود.", "Pinned tasks always come first. The second rule resolves ties in the first rule.")}>
    <label className="block space-y-1 text-sm">
      <span>{T("فهرست", "List")}</span>
      <select aria-label={T("فهرست", "List")} value={scope} onChange={(event) => setScope(event.target.value)} className="h-10 w-full rounded-md border bg-background px-2">
        {SCOPES.map(([key, fa, en]) => <option key={key} value={key}>{T(fa, en)}</option>)}
      </select>
    </label>
    {(["sort_primary", "sort_secondary"] as const).map((level, index) => <div key={level} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
      <label className="min-w-0 space-y-1 text-sm">
        <span>{index === 0 ? T("معیار اول", "First rule") : T("معیار دوم", "Second rule")}</span>
        <select aria-label={index === 0 ? T("معیار اول", "First rule") : T("معیار دوم", "Second rule")} className="h-10 w-full rounded-md border bg-background px-2" value={value[level].key}
          onChange={(event) => {
            const key = event.target.value as SortKey;
            const other = level === "sort_primary" ? "sort_secondary" : "sort_primary";
            change({ ...value, [level]: { ...value[level], key }, ...(value[other].key === key ? { [other]: value[level] } : {}) });
          }}>
          {SORT_KEYS.map((key) => <option key={key} value={key}>{T(SORT_LABELS[key].fa, SORT_LABELS[key].en)}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span>{T("جهت", "Direction")}</span>
        <select aria-label={index === 0 ? T("جهت معیار اول", "First rule direction") : T("جهت معیار دوم", "Second rule direction")} className="h-10 w-full rounded-md border bg-background px-2" value={value[level].dir}
          onChange={(event) => change({ ...value, [level]: { ...value[level], dir: event.target.value as "asc" | "desc" } })}>
          <option value="asc">{value[level].key === "priority" ? T("مهم‌تر اول", "Higher priority first") : T("صعودی", "Ascending")}</option>
          <option value="desc">{value[level].key === "priority" ? T("کم‌اهمیت‌تر اول", "Lower priority first") : T("نزولی", "Descending")}</option>
        </select>
      </label>
    </div>)}
  </SectionCard>;
}
