import React from "react";
import { Sparkles, Plus, Trash2, SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  onOpenFilterSheet: () => void;
  className?: string;
  isEn?: boolean;
}

export function SmartListProfileBar({
  filters,
  onChangeFilters,
  onOpenFilterSheet,
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
      className={`w-full overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-1.5 shadow-sm transition-all ${className}`}
      data-testid="smart-list-profile-bar"
    >
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
        {/* Label icon */}
        <div className="flex items-center gap-1 px-2 text-xs font-semibold text-primary shrink-0 select-none">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isEn ? "Smart Lists:" : "لیست‌های هوشمند:"}</span>
        </div>

        {/* Profile pills */}
        {profiles.map((p) => {
          const active = isProfileActive(p);
          const displayName = isEn ? p.nameEn || p.name : p.name;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectProfile(p)}
              className={`group inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
              title={displayName}
              data-testid={`smart-profile-${p.id}`}
            >
              {p.icon && <span className="text-xs leading-none">{p.icon}</span>}
              <span>{displayName}</span>
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
                  className={`p-0.5 rounded hover:bg-background/30 text-current opacity-70 hover:opacity-100 transition-opacity ml-0.5`}
                  title={isEn ? "Delete profile" : "حذف پروفایل"}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </span>
              )}
            </button>
          );
        })}

        {/* Actions on the right */}
        <div className="flex items-center gap-1 ms-auto shrink-0 pl-1">
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              title={isEn ? "Reset all filters" : "پاک‌سازی فیلترها"}
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">{isEn ? "Reset" : "ریست"}</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenFilterSheet}
            className="h-7 px-2.5 text-xs font-medium rounded-lg border-dashed border-border/80 inline-flex items-center gap-1.5 hover:border-primary/60 hover:text-primary transition-colors"
            title={isEn ? "Customize Smart List & Filters" : "شخصی‌سازی فیلترها و ذخیره لیست"}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{isEn ? "Customize" : "شخصی‌سازی فیلترها"}</span>
            {activeCount > 0 && (
              <Badge
                variant="secondary"
                className="h-4 px-1 text-[10px] bg-primary/15 text-primary border-none font-bold"
              >
                {activeCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
