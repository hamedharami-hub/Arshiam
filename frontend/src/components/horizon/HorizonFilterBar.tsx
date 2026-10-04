import { useMemo, useState } from "react";
import {
  Filter,
  X,
  CheckCircle2,
  Folder as FolderIcon,
  Target,
  Tag as TagIcon,
  Search,
  Check,
  ChevronDown,
  ArrowUpDown,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PRIORITY_META, type Priority } from "@/lib/priority";
import type { FolderItem, TagItem } from "@/lib/firestoreDataService";
import type { GoalKanban } from "@/lib/kanbanGoals";
import type { Task } from "@/lib/taskTypes";
import {
  isFilterActive,
  type HorizonFilter,
  type SortKey,
  type CompletionFilter,
  EMPTY_FILTER,
} from "@/lib/horizonFilters";
import { useShowCompletedTasks, setShowCompletedTasks } from "@/lib/completedTaskVisibility";
import { toPersianDigits } from "@/lib/jalali";

const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low", "none"];
const SORTS: { key: SortKey; fa: string; en: string }[] = [
  { key: "priority", fa: "اهمیت", en: "Importance" },
  { key: "time", fa: "زمان", en: "Time" },
  { key: "goal", fa: "هدف کانبان", en: "Kanban Goal" },
  { key: "created", fa: "جدیدترین", en: "Newest" },
  { key: "title", fa: "عنوان", en: "Title" },
];

function toggle<T>(arr: T[] = [], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function Chip({
  active,
  onClick,
  children,
  testId,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-pressed={active}
      className={`shrink-0 h-8 px-3 rounded-full border text-xs transition-colors flex items-center gap-1.5 ${
        active
          ? "bg-primary text-primary-foreground border-primary shadow-xs"
          : "bg-card border-border hover:bg-muted/70 text-foreground"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function HorizonFilterBar({
  filter,
  onChange,
  folders,
  tags,
  goals = [],
  lang,
  tasks = [],
}: {
  filter: HorizonFilter;
  onChange: (f: HorizonFilter) => void;
  folders: FolderItem[];
  tags: TagItem[];
  goals?: GoalKanban[];
  lang: "fa" | "en";
  tasks?: Task[];
}) {
  const fa = lang === "fa";
  const num = (n: number) => (fa ? toPersianDigits(n) : String(n));
  const showCompletedGlobal = useShowCompletedTasks();
  const [folderOpen, setFolderOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [mainFilterOpen, setMainFilterOpen] = useState(false);

  // Derived completion state: if completion is explicit, use it; otherwise fallback to global
  const effectiveCompletion: CompletionFilter =
    filter.completion && filter.completion !== "all"
      ? filter.completion
      : showCompletedGlobal
      ? "all"
      : "active";

  const isCompletedVisible = effectiveCompletion !== "active";

  const toggleCompleted = () => {
    if (isCompletedVisible) {
      setShowCompletedTasks(false);
      onChange({ ...filter, completion: "active" });
    } else {
      setShowCompletedTasks(true);
      onChange({ ...filter, completion: "all" });
    }
  };

  const setCompletionMode = (mode: CompletionFilter) => {
    if (mode === "active") {
      setShowCompletedTasks(false);
      onChange({ ...filter, completion: "active" });
    } else if (mode === "completed") {
      setShowCompletedTasks(true);
      onChange({ ...filter, completion: "completed" });
    } else {
      setShowCompletedTasks(true);
      onChange({ ...filter, completion: "all" });
    }
  };

  // Pre-calculate counts for items in current tasks
  const folderCounts = useMemo(() => {
    const map = new Map<string, number>();
    let noFolder = 0;
    for (const t of tasks) {
      if (!t.folder_id) noFolder++;
      else map.set(t.folder_id, (map.get(t.folder_id) || 0) + 1);
    }
    map.set("__none__", noFolder);
    return map;
  }, [tasks]);

  const goalCounts = useMemo(() => {
    const map = new Map<string, number>();
    let noGoal = 0;
    for (const t of tasks) {
      if (!t.kanban_column_id) noGoal++;
      else map.set(t.kanban_column_id, (map.get(t.kanban_column_id) || 0) + 1);
    }
    map.set("__none__", noGoal);
    return map;
  }, [tasks]);

  const active = isFilterActive(filter);
  const totalCount =
    (filter.priorities?.length || 0) +
    (filter.folderIds?.length || 0) +
    (filter.tagIds?.length || 0) +
    (filter.goalIds?.length || 0) +
    (filter.completion && filter.completion !== "all" ? 1 : 0) +
    (filter.search?.trim() ? 1 : 0);

  // Folder button label
  const folderLabel = useMemo(() => {
    const count = filter.folderIds?.length || 0;
    if (count === 0) return fa ? "فولدرها" : "Folders";
    if (count === 1) {
      if (filter.folderIds[0] === "__none__") return fa ? "بدون فولدر" : "No folder";
      const f = folders.find((x) => x.id === filter.folderIds[0]);
      return f?.name || (fa ? "فولدر" : "Folder");
    }
    return fa ? `${num(count)} فولدر` : `${count} Folders`;
  }, [filter.folderIds, folders, fa]);

  // Goal button label
  const goalLabel = useMemo(() => {
    const count = filter.goalIds?.length || 0;
    if (count === 0) return fa ? "اهداف" : "Goals";
    if (count === 1) {
      if (filter.goalIds[0] === "__none__") return fa ? "بدون هدف" : "No goal";
      const g = goals.find((x) => x.id === filter.goalIds[0]);
      return g ? `${g.icon ? `${g.icon} ` : ""}${g.title}` : fa ? "هدف" : "Goal";
    }
    return fa ? `${num(count)} هدف` : `${count} Goals`;
  }, [filter.goalIds, goals, fa]);

  // Tag button label
  const tagLabel = useMemo(() => {
    const count = filter.tagIds?.length || 0;
    if (count === 0) return fa ? "تگ‌ها" : "Tags";
    if (count === 1) {
      if (filter.tagIds[0] === "__none__") return fa ? "بدون تگ" : "No tag";
      const t = tags.find((x) => x.id === filter.tagIds[0]);
      return t ? `#${t.name}` : fa ? "تگ" : "Tag";
    }
    return fa ? `${num(count)} تگ` : `${count} Tags`;
  }, [filter.tagIds, tags, fa]);

  const clearAllFilters = () => {
    setShowCompletedTasks(true);
    onChange({ ...EMPTY_FILTER, sort: filter.sort });
  };

  return (
    <div className="space-y-1.5" data-testid="horizon-filter-bar">
      {/* Primary Row: Controls & Quick Selectors */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {/* Main Comprehensive Filter Popover */}
        <Popover open={mainFilterOpen} onOpenChange={setMainFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant={active ? "default" : "outline"}
              className="shrink-0 h-8 rounded-full gap-1.5 text-xs font-medium"
              data-testid="horizon-filter-btn"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{fa ? "فیلترها" : "Filters"}</span>
              {totalCount > 0 && (
                <span className="h-4 min-w-4 px-1 rounded-full bg-primary-foreground text-primary text-[10px] flex items-center justify-center font-bold">
                  {num(totalCount)}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-88 max-w-[92vw] max-h-[75vh] overflow-y-auto space-y-4 p-3.5"
            align="start"
            dir={fa ? "rtl" : "ltr"}
          >
            {/* Completion Status Section */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  {fa ? "وضعیت انجام تسک‌ها" : "Task Completion Status"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/50">
                <button
                  type="button"
                  onClick={() => setCompletionMode("all")}
                  data-testid="horizon-filter-show-completed"
                  className={`text-xs py-1.5 px-2 rounded-lg font-medium transition-all ${
                    effectiveCompletion === "all"
                      ? "bg-background text-foreground shadow-xs border border-border/70"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {fa ? "همه کارها" : "All Tasks"}
                </button>
                <button
                  type="button"
                  onClick={() => setCompletionMode("active")}
                  data-testid="horizon-filter-hide-completed"
                  className={`text-xs py-1.5 px-2 rounded-lg font-medium transition-all ${
                    effectiveCompletion === "active"
                      ? "bg-background text-foreground shadow-xs border border-border/70"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {fa ? "فقط باز" : "Incomplete"}
                </button>
                <button
                  type="button"
                  onClick={() => setCompletionMode("completed")}
                  data-testid="horizon-filter-completed-only"
                  className={`text-xs py-1.5 px-2 rounded-lg font-medium transition-all ${
                    effectiveCompletion === "completed"
                      ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs border border-border/70"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {fa ? "فقط انجام‌شده" : "Completed only"}
                </button>
              </div>
            </section>

            {/* Folders Section */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <FolderIcon className="w-3.5 h-3.5 text-primary" />
                  <span>{fa ? "فولدرها" : "Folders"}</span>
                </span>
                {(filter.folderIds?.length || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...filter, folderIds: [] })}
                    className="text-[11px] text-muted-foreground hover:text-primary transition"
                  >
                    {fa ? "نمایش همه" : "Show all"}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Chip
                  active={filter.folderIds?.includes("__none__") || false}
                  onClick={() => onChange({ ...filter, folderIds: toggle(filter.folderIds, "__none__") })}
                  testId="horizon-filter-folder-__none__"
                >
                  {fa ? "بدون فولدر" : "No folder"}
                  {folderCounts.has("__none__") && folderCounts.get("__none__")! > 0 && (
                    <span className="opacity-70 text-[10px]">({num(folderCounts.get("__none__")!)})</span>
                  )}
                </Chip>
                {folders.map((f) => {
                  const count = folderCounts.get(f.id) || 0;
                  return (
                    <Chip
                      key={f.id}
                      active={filter.folderIds?.includes(f.id) || false}
                      onClick={() => onChange({ ...filter, folderIds: toggle(filter.folderIds, f.id) })}
                      testId={`horizon-filter-folder-${f.id}`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: f.color || "#e11d48" }} />
                      <span className="truncate max-w-[120px]">{f.name}</span>
                      {count > 0 && <span className="opacity-70 text-[10px]">({num(count)})</span>}
                    </Chip>
                  );
                })}
              </div>
            </section>

            {/* Goals Section */}
            {goals.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <Target className="w-3.5 h-3.5 text-rose-500" />
                    <span>{fa ? "اهداف کانبان" : "Kanban Goals"}</span>
                  </span>
                  {(filter.goalIds?.length || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => onChange({ ...filter, goalIds: [] })}
                      className="text-[11px] text-muted-foreground hover:text-primary transition"
                    >
                      {fa ? "نمایش همه" : "Show all"}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Chip
                    active={filter.goalIds?.includes("__none__") || false}
                    onClick={() => onChange({ ...filter, goalIds: toggle(filter.goalIds, "__none__") })}
                    testId="horizon-filter-goal-__none__"
                  >
                    {fa ? "بدون هدف" : "No goal"}
                    {goalCounts.has("__none__") && goalCounts.get("__none__")! > 0 && (
                      <span className="opacity-70 text-[10px]">({num(goalCounts.get("__none__")!)})</span>
                    )}
                  </Chip>
                  {goals.map((g) => {
                    const count = goalCounts.get(g.id) || 0;
                    return (
                      <Chip
                        key={g.id}
                        active={filter.goalIds?.includes(g.id) || false}
                        onClick={() => onChange({ ...filter, goalIds: toggle(filter.goalIds, g.id) })}
                        testId={`horizon-filter-goal-${g.id}`}
                      >
                        <span>{g.icon || "🎯"}</span>
                        <span className="truncate max-w-[120px]">{g.title}</span>
                        {count > 0 && <span className="opacity-70 text-[10px]">({num(count)})</span>}
                      </Chip>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Tags Section */}
            {tags.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <TagIcon className="w-3.5 h-3.5 text-amber-500" />
                    <span>{fa ? "تگ‌ها" : "Tags"}</span>
                  </span>
                  {(filter.tagIds?.length || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => onChange({ ...filter, tagIds: [] })}
                      className="text-[11px] text-muted-foreground hover:text-primary transition"
                    >
                      {fa ? "نمایش همه" : "Show all"}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Chip
                    active={filter.tagIds?.includes("__none__") || false}
                    onClick={() => onChange({ ...filter, tagIds: toggle(filter.tagIds, "__none__") })}
                    testId="horizon-filter-tag-__none__"
                  >
                    {fa ? "بدون تگ" : "No tag"}
                  </Chip>
                  {tags.map((t) => (
                    <Chip
                      key={t.id}
                      active={filter.tagIds?.includes(t.id) || false}
                      onClick={() => onChange({ ...filter, tagIds: toggle(filter.tagIds, t.id) })}
                      testId={`horizon-filter-tag-${t.id}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color || "#f59e0b" }} />
                      <span>#{t.name}</span>
                    </Chip>
                  ))}
                </div>
              </section>
            )}

            {/* Importance / Priorities Section */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  {fa ? "اهمیت و اولویت" : "Importance & Priority"}
                </span>
                {(filter.priorities?.length || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...filter, priorities: [] })}
                    className="text-[11px] text-muted-foreground hover:text-primary transition"
                  >
                    {fa ? "نمایش همه" : "Show all"}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITIES.map((p) => (
                  <Chip
                    key={p}
                    active={filter.priorities?.includes(p) || false}
                    onClick={() => onChange({ ...filter, priorities: toggle(filter.priorities, p) })}
                    testId={`horizon-filter-priority-${p}`}
                  >
                    {p === "none" ? (fa ? "بدون اولویت" : "None") : fa ? PRIORITY_META[p].label : PRIORITY_META[p].labelEn}
                  </Chip>
                ))}
              </div>
            </section>

            {/* Clear All Footer */}
            {active && (
              <div className="pt-2 border-t flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
                  onClick={() => {
                    clearAllFilters();
                    setMainFilterOpen(false);
                  }}
                  data-testid="horizon-filter-clear"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{fa ? "پاک کردن همه فیلترها" : "Clear all filters"}</span>
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Quick Folder Selector Dropdown */}
        {folders.length > 0 && (
          <Popover open={folderOpen} onOpenChange={setFolderOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant={(filter.folderIds?.length || 0) > 0 ? "default" : "outline"}
                className="shrink-0 h-8 rounded-full gap-1 text-xs font-normal"
                data-testid="horizon-filter-folder-dropdown"
              >
                <FolderIcon className="w-3.5 h-3.5" />
                <span className="truncate max-w-[110px]">{folderLabel}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2 space-y-1" align="start" dir={fa ? "rtl" : "ltr"}>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...filter, folderIds: [] });
                  setFolderOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                  (filter.folderIds?.length || 0) === 0 ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                }`}
              >
                <span>{fa ? "همه فولدرها" : "All folders"}</span>
                {(filter.folderIds?.length || 0) === 0 && <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...filter, folderIds: toggle(filter.folderIds, "__none__") });
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                  filter.folderIds?.includes("__none__") ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Circle className="w-2.5 h-2.5 text-muted-foreground" />
                  <span>{fa ? "بدون فولدر (اینباکس)" : "No folder (Inbox)"}</span>
                </div>
                {filter.folderIds?.includes("__none__") && <Check className="w-3.5 h-3.5" />}
              </button>
              <div className="h-px bg-border/60 my-1" />
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {folders.map((f) => {
                  const isSelected = filter.folderIds?.includes(f.id) || false;
                  const count = folderCounts.get(f.id) || 0;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => onChange({ ...filter, folderIds: toggle(filter.folderIds, f.id) })}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                        isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: f.color || "#e11d48" }} />
                        <span className="truncate">{f.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {count > 0 && <span className="text-[10px] text-muted-foreground">{num(count)}</span>}
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Quick Goal Selector Dropdown */}
        {goals.length > 0 && (
          <Popover open={goalOpen} onOpenChange={setGoalOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant={(filter.goalIds?.length || 0) > 0 ? "default" : "outline"}
                className="shrink-0 h-8 rounded-full gap-1 text-xs font-normal"
                data-testid="horizon-filter-goal-dropdown"
              >
                <Target className="w-3.5 h-3.5" />
                <span className="truncate max-w-[110px]">{goalLabel}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-68 max-w-[90vw] p-2 space-y-1" align="start" dir={fa ? "rtl" : "ltr"}>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...filter, goalIds: [] });
                  setGoalOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                  (filter.goalIds?.length || 0) === 0 ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                }`}
              >
                <span>{fa ? "همه اهداف" : "All goals"}</span>
                {(filter.goalIds?.length || 0) === 0 && <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...filter, goalIds: toggle(filter.goalIds, "__none__") });
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                  filter.goalIds?.includes("__none__") ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Circle className="w-2.5 h-2.5 text-muted-foreground" />
                  <span>{fa ? "بدون هدف" : "No goal"}</span>
                </div>
                {filter.goalIds?.includes("__none__") && <Check className="w-3.5 h-3.5" />}
              </button>
              <div className="h-px bg-border/60 my-1" />
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {goals.map((g) => {
                  const isSelected = filter.goalIds?.includes(g.id) || false;
                  const count = goalCounts.get(g.id) || 0;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => onChange({ ...filter, goalIds: toggle(filter.goalIds, g.id) })}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                        isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span>{g.icon || "🎯"}</span>
                        <span className="truncate">{g.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {count > 0 && <span className="text-[10px] text-muted-foreground">{num(count)}</span>}
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Quick Tag Selector Dropdown */}
        {tags.length > 0 && (
          <Popover open={tagOpen} onOpenChange={setTagOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant={(filter.tagIds?.length || 0) > 0 ? "default" : "outline"}
                className="shrink-0 h-8 rounded-full gap-1 text-xs font-normal"
                data-testid="horizon-filter-tag-dropdown"
              >
                <TagIcon className="w-3.5 h-3.5" />
                <span className="truncate max-w-[90px]">{tagLabel}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 space-y-1" align="start" dir={fa ? "rtl" : "ltr"}>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...filter, tagIds: [] });
                  setTagOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                  (filter.tagIds?.length || 0) === 0 ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                }`}
              >
                <span>{fa ? "همه تگ‌ها" : "All tags"}</span>
                {(filter.tagIds?.length || 0) === 0 && <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...filter, tagIds: toggle(filter.tagIds, "__none__") });
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                  filter.tagIds?.includes("__none__") ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Circle className="w-2.5 h-2.5 text-muted-foreground" />
                  <span>{fa ? "بدون تگ" : "No tag"}</span>
                </div>
                {filter.tagIds?.includes("__none__") && <Check className="w-3.5 h-3.5" />}
              </button>
              <div className="h-px bg-border/60 my-1" />
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {tags.map((t) => {
                  const isSelected = filter.tagIds?.includes(t.id) || false;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onChange({ ...filter, tagIds: toggle(filter.tagIds, t.id) })}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                        isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color || "#f59e0b" }} />
                        <span className="truncate">#{t.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* 1-Click Completed Tasks Toggle Chip (fully compliant with existing testid and UX) */}
        <Chip
          active={isCompletedVisible}
          onClick={toggleCompleted}
          testId="horizon-toggle-completed"
        >
          <CheckCircle2
            className={`w-3.5 h-3.5 ${isCompletedVisible ? "text-emerald-500" : "text-muted-foreground"}`}
          />
          <span>{fa ? "انجام‌شده‌ها" : "Completed"}</span>
        </Chip>

        {/* Sort menu */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="shrink-0 h-8 px-3 rounded-full border border-border/60 text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              data-testid="horizon-sort-trigger"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{fa ? "مرتب‌سازی:" : "Sort:"}</span>
              <span className="font-medium text-foreground">
                {(() => { const cur = SORTS.find((x) => x.key === filter.sort) || SORTS[0]; return fa ? cur.fa : cur.en; })()}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-44 p-1">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => onChange({ ...filter, sort: s.key })}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs hover:bg-muted ${filter.sort === s.key ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                data-testid={`horizon-sort-${s.key}`}
              >
                {fa ? s.fa : s.en}
                {filter.sort === s.key && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Clear Button */}
        {active && (
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 h-8 rounded-full gap-1 text-xs text-muted-foreground hover:text-destructive"
            onClick={clearAllFilters}
            data-testid="horizon-filter-clear"
          >
            <X className="w-3 h-3" />
            <span>{fa ? "پاک کردن" : "Clear"}</span>
          </Button>
        )}
        {/* Title Search Input */}
        <div className="relative ms-auto flex w-40 shrink-0 items-center">
          <Search className="w-3 h-3 text-muted-foreground absolute start-2.5 pointer-events-none" />
          <Input
            value={filter.search || ""}
            onChange={(e) => onChange({ ...filter, search: e.target.value })}
            placeholder={fa ? "جستجوی تسک..." : "Search tasks..."}
            className="h-7 text-xs ps-7 pe-6 rounded-full bg-muted/30 border-border/60"
            data-testid="horizon-filter-search-input"
          />
          {filter.search && (
            <button
              type="button"
              onClick={() => onChange({ ...filter, search: "" })}
              className="absolute end-2 p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Active filter badges (only when present) */}
      <div className="flex items-center gap-2 flex-wrap empty:hidden">
        {/* Active Filter Pills with 1-click removal */}
        {filter.completion === "completed" && (
          <Badge
            variant="secondary"
            className="h-6 gap-1 px-2 text-[11px] rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>{fa ? "فقط انجام‌شده‌ها" : "Completed only"}</span>
            <button
              type="button"
              onClick={() => setCompletionMode("all")}
              className="p-0.5 hover:opacity-70"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        )}

        {filter.folderIds?.map((id) => {
          const fName =
            id === "__none__"
              ? fa
                ? "بدون فولدر"
                : "No folder"
              : folders.find((f) => f.id === id)?.name || id;
          return (
            <Badge
              key={id}
              variant="secondary"
              className="h-6 gap-1 px-2 text-[11px] rounded-full bg-primary/10 text-primary border border-primary/20"
            >
              <FolderIcon className="w-3 h-3" />
              <span>{fName}</span>
              <button
                type="button"
                onClick={() => onChange({ ...filter, folderIds: filter.folderIds.filter((x) => x !== id) })}
                className="p-0.5 hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          );
        })}

        {filter.goalIds?.map((id) => {
          const g = goals.find((x) => x.id === id);
          const gTitle = id === "__none__" ? (fa ? "بدون هدف" : "No goal") : g?.title || id;
          return (
            <Badge
              key={id}
              variant="secondary"
              className="h-6 gap-1 px-2 text-[11px] rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
            >
              <span>{g?.icon || "🎯"}</span>
              <span className="truncate max-w-[100px]">{gTitle}</span>
              <button
                type="button"
                onClick={() => onChange({ ...filter, goalIds: filter.goalIds.filter((x) => x !== id) })}
                className="p-0.5 hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          );
        })}

        {filter.tagIds?.map((id) => {
          const tName = id === "__none__" ? (fa ? "بدون تگ" : "No tag") : tags.find((t) => t.id === id)?.name || id;
          return (
            <Badge
              key={id}
              variant="secondary"
              className="h-6 gap-1 px-2 text-[11px] rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
            >
              <TagIcon className="w-3 h-3" />
              <span>#{tName}</span>
              <button
                type="button"
                onClick={() => onChange({ ...filter, tagIds: filter.tagIds.filter((x) => x !== id) })}
                className="p-0.5 hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          );
        })}

        {filter.priorities?.map((p) => {
          const pm = PRIORITY_META[p];
          return (
            <Badge
              key={p}
              variant="secondary"
              className="h-6 gap-1 px-2 text-[11px] rounded-full bg-muted border border-border"
            >
              <span>{p === "none" ? (fa ? "بدون اولویت" : "No priority") : fa ? pm.label : pm.labelEn}</span>
              <button
                type="button"
                onClick={() => onChange({ ...filter, priorities: filter.priorities.filter((x) => x !== p) })}
                className="p-0.5 hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
