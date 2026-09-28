import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PRIORITY_META, type Priority } from "@/lib/priority";
import type { FolderItem, TagItem } from "@/lib/firestoreDataService";
import { isFilterActive, type HorizonFilter, type SortKey } from "@/lib/horizonFilters";

const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low", "none"];
const SORTS: { key: SortKey; fa: string; en: string }[] = [
  { key: "priority", fa: "اهمیت", en: "Importance" },
  { key: "time", fa: "زمان", en: "Time" },
  { key: "created", fa: "جدیدترین", en: "Newest" },
  { key: "title", fa: "عنوان", en: "Title" },
];

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function Chip({ active, onClick, children, testId }: { active: boolean; onClick: () => void; children: React.ReactNode; testId?: string }) {
  return (
    <button type="button" onClick={onClick} data-testid={testId}
      className={`shrink-0 h-8 px-3 rounded-full border text-xs transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}>
      {children}
    </button>
  );
}

export function HorizonFilterBar({ filter, onChange, folders, tags, lang }: {
  filter: HorizonFilter; onChange: (f: HorizonFilter) => void; folders: FolderItem[]; tags: TagItem[]; lang: "fa" | "en";
}) {
  const fa = lang === "fa";
  const active = isFilterActive(filter);
  const count = filter.priorities.length + filter.folderIds.length + filter.tagIds.length;
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1" data-testid="horizon-filter-bar">
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant={active ? "default" : "outline"} className="shrink-0 h-8 rounded-full gap-1" data-testid="horizon-filter-btn">
            <Filter className="w-3.5 h-3.5" /> {fa ? "فیلتر" : "Filter"}{count ? ` (${count})` : ""}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 max-h-[60vh] overflow-y-auto space-y-3" align="start">
          <section>
            <div className="text-xs font-semibold mb-1.5">{fa ? "اهمیت" : "Importance"}</div>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITIES.map((p) => (
                <Chip key={p} active={filter.priorities.includes(p)} onClick={() => onChange({ ...filter, priorities: toggle(filter.priorities, p) })} testId={`horizon-filter-priority-${p}`}>
                  {p === "none" ? (fa ? "بدون" : "None") : fa ? PRIORITY_META[p].label : PRIORITY_META[p].labelEn}
                </Chip>
              ))}
            </div>
          </section>
          {folders.length > 0 && (
            <section>
              <div className="text-xs font-semibold mb-1.5">{fa ? "فولدر" : "Folder"}</div>
              <div className="flex flex-wrap gap-1.5">
                {folders.map((f) => (
                  <Chip key={f.id} active={filter.folderIds.includes(f.id)} onClick={() => onChange({ ...filter, folderIds: toggle(filter.folderIds, f.id) })} testId={`horizon-filter-folder-${f.id}`}>{f.name}</Chip>
                ))}
              </div>
            </section>
          )}
          {tags.length > 0 && (
            <section>
              <div className="text-xs font-semibold mb-1.5">{fa ? "تگ" : "Tag"}</div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Chip key={t.id} active={filter.tagIds.includes(t.id)} onClick={() => onChange({ ...filter, tagIds: toggle(filter.tagIds, t.id) })} testId={`horizon-filter-tag-${t.id}`}>#{t.name}</Chip>
                ))}
              </div>
            </section>
          )}
          <p className="text-[11px] text-muted-foreground">
            {fa ? "تسک جدید، فولدر/تگ/اهمیتِ فیلتر را به ارث می‌برد؛ اگر در یک دسته بیش از یک گزینه انتخاب شود، چیزی به ارث نمی‌رسد." : "New tasks inherit folder/tag/importance from the filter — unless a category has several values selected."}
          </p>
        </PopoverContent>
      </Popover>
      {SORTS.map((s) => (
        <Chip key={s.key} active={filter.sort === s.key} onClick={() => onChange({ ...filter, sort: s.key })} testId={`horizon-sort-${s.key}`}>{fa ? s.fa : s.en}</Chip>
      ))}
      {active && (
        <Button size="sm" variant="ghost" className="shrink-0 h-8 rounded-full gap-1 text-xs" onClick={() => onChange({ ...filter, priorities: [], folderIds: [], tagIds: [] })} data-testid="horizon-filter-clear">
          <X className="w-3 h-3" /> {fa ? "پاک کردن" : "Clear"}
        </Button>
      )}
    </div>
  );
}
