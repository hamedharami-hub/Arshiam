import React from "react";
import { Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [profiles, setProfiles] = useSmartListProfiles();

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

    return (
      sameFolders &&
      sameTags &&
      sameGoals &&
      samePriorities &&
      sameHorizons &&
      sameDueWindows
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

  const handleDeleteProfile = (e: React.MouseEvent, p: SmartListProfile) => {
    e.stopPropagation();
    if (p.isPreset) return;
    const next = profiles.filter((x) => x.id !== p.id);
    setProfiles(next);
    toast.info(
      isEn ? `Profile "${p.name}" deleted` : `پروفایل «${p.name}» حذف شد`
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

  return (
    <div
      className={`flex min-w-0 max-w-full items-center gap-1 ${className}`}
      data-testid="smart-list-profile-bar"
    >
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
        {profiles.map((p) => {
          const active = isProfileActive(p);
          const rawName = isEn ? p.nameEn || p.name : p.name;
          const displayName = p.icon && rawName.startsWith(p.icon) ? rawName.slice(p.icon.length).trim() : rawName;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectProfile(p)}
              aria-pressed={active}
              className={`group inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground ring-1 ring-inset ring-border hover:text-foreground"
              }`}
              title={displayName}
              data-testid={`smart-profile-${p.id}`}
            >
              {p.icon && <span className="text-[11px] leading-none">{p.icon}</span>}
              <span className="whitespace-nowrap">{displayName}</span>
              {!p.isPreset && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleDeleteProfile(e, p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleDeleteProfile(e as any, p);
                    }
                  }}
                  className="rounded p-0.5 opacity-60 hover:opacity-100"
                  title={isEn ? "Delete profile" : "حذف پروفایل"}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
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
