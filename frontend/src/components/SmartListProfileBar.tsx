import { Check, ChevronDown, ListFilter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type SmartListProfile,
  type TaskFilters,
  useSmartListProfiles,
  DEFAULT_FILTERS,
} from "@/lib/smartListService";
import { toast } from "sonner";

interface SmartListProfileBarProps {
  filters: TaskFilters;
  onChangeFilters: (next: TaskFilters) => void;
  onOpenFilterSheet?: () => void;
  className?: string;
  isEn?: boolean;
}

export function SmartListProfileBar({
  filters,
  onChangeFilters,
  className = "",
  isEn = false,
}: SmartListProfileBarProps) {
  const [profiles] = useSmartListProfiles();

  // Helper to determine if current filters match a profile
  const isProfileActive = (p: SmartListProfile): boolean => {
    const pf = p.filters;
    const sameFolders =
      (pf.folder_ids?.length || 0) === (filters.folder_ids?.length || 0) &&
      (pf.folder_ids || []).every((id) => filters.folder_ids?.includes(id));
    const sameTags =
      (pf.tag_ids?.length || 0) === (filters.tag_ids?.length || 0) &&
      (pf.tag_ids || []).every((id) => filters.tag_ids?.includes(id));
    const sameGoals =
      (pf.goal_ids?.length || 0) === (filters.goal_ids?.length || 0) &&
      (pf.goal_ids || []).every((id) => filters.goal_ids?.includes(id));
    const samePriorities =
      (pf.priorities?.length || 0) === (filters.priorities?.length || 0) &&
      (pf.priorities || []).every((pr) => filters.priorities?.includes(pr));
    const sameHorizons =
      (pf.time_horizons?.length || 0) === (filters.time_horizons?.length || 0) &&
      (pf.time_horizons || []).every((h) => filters.time_horizons?.includes(h));
    const sameDueWindows =
      (pf.due_windows?.length || 0) === (filters.due_windows?.length || 0) &&
      (pf.due_windows || []).every((w) => filters.due_windows?.includes(w));

    const sameSort = (a: typeof DEFAULT_FILTERS.sort_primary, b: typeof DEFAULT_FILTERS.sort_primary) =>
      a.key === b.key && a.dir === b.dir;

    return (
      sameFolders &&
      sameTags &&
      sameGoals &&
      samePriorities &&
      sameHorizons &&
      sameDueWindows &&
      sameSort(pf.sort_primary || DEFAULT_FILTERS.sort_primary, filters.sort_primary || DEFAULT_FILTERS.sort_primary) &&
      sameSort(pf.sort_secondary || DEFAULT_FILTERS.sort_secondary, filters.sort_secondary || DEFAULT_FILTERS.sort_secondary)
    );
  };

  const handleSelectProfile = (p: SmartListProfile) => {
    onChangeFilters({
      ...filters,
      ...p.filters,
      show_completed: filters.show_completed, // Preserve current completion toggle
    });
    toast.success(
      isEn
        ? `Applied "${p.nameEn || p.name}"`
        : `پروفایل «${p.name}» فعال شد`
    );
  };

  const handleResetFilters = () => {
    onChangeFilters({
      ...DEFAULT_FILTERS,
      show_completed: filters.show_completed,
    });
    toast.info(isEn ? "Filters reset" : "فیلترها ریست شدند");
  };

  // Count active filters (excluding sort and show_completed)
  const activeCount =
    (filters.folder_ids?.length || 0) +
    (filters.priorities?.length || 0) +
    (filters.tag_ids?.length || 0) +
    (filters.goal_ids?.length || 0) +
    (filters.time_horizons?.length || 0) +
    (filters.due_windows?.length || 0);

  const activeProfile = profiles.find(isProfileActive);
  const activeNameSource = activeProfile
    ? (isEn ? activeProfile.nameEn || activeProfile.name : activeProfile.name)
    : (isEn ? "Custom filters" : "فیلترهای دلخواه");
  const activeName = activeProfile?.icon && activeNameSource.startsWith(activeProfile.icon)
    ? activeNameSource.slice(activeProfile.icon.length).trim()
    : activeNameSource;

  return (
    <div
      className={`flex min-w-0 max-w-full items-center gap-1.5 ${className}`}
      data-testid="smart-list-profile-bar"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant={activeProfile ? "secondary" : "outline"}
            className="h-9 w-36 min-w-0 max-w-full justify-start gap-2 rounded-xl px-3 text-xs sm:w-44"
            aria-label={isEn ? `Choose smart list. Current: ${activeName}` : `انتخاب فهرست هوشمند. فهرست فعلی: ${activeName}`}
            data-testid="smart-list-selector"
          >
            {activeProfile?.icon ? <span className="shrink-0 text-sm">{activeProfile.icon}</span> : <ListFilter className="h-4 w-4 shrink-0 text-primary" />}
            <span className="min-w-0 truncate text-start">{activeName}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[60vh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto p-1.5">
          <DropdownMenuLabel className="px-2 text-[11px] text-muted-foreground">
            {isEn ? "Saved smart lists" : "فهرست‌های هوشمند ذخیره‌شده"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {profiles.length === 0 ? (
            <div className="px-2 py-4 text-center text-xs text-muted-foreground">
              {isEn ? "No saved lists yet" : "هنوز فهرستی ذخیره نشده"}
            </div>
          ) : profiles.map((p) => {
            const active = isProfileActive(p);
            const rawName = isEn ? p.nameEn || p.name : p.name;
            const displayName = p.icon && rawName.startsWith(p.icon) ? rawName.slice(p.icon.length).trim() : rawName;
            return (
              <DropdownMenuItem
                key={p.id}
                onSelect={() => handleSelectProfile(p)}
                aria-current={active ? "true" : undefined}
                className="min-h-10 gap-2 rounded-lg text-xs"
                data-testid={`smart-profile-${p.id}`}
              >
                <span className="shrink-0 text-sm">{p.icon || "📋"}</span>
                <span className="min-w-0 flex-1 truncate">{displayName}</span>
                {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleResetFilters}
          className="h-7 w-7 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
          title={isEn ? "Reset all filters" : "پاک‌سازی فیلترها"}
          aria-label={isEn ? "Reset all filters" : "پاک‌سازی فیلترها"}
          data-testid="smart-profile-reset"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
