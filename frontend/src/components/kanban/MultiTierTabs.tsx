import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PriorityFlag } from "@/components/PriorityFlag";
import { toPersianDigits } from "@/lib/persianDigits";
import {
  type GoalKanban,
  type TimeHorizon,
  type GoalPriority,
  TIME_HORIZONS,
  GOAL_PRIORITIES,
  filterGoalsForView,
} from "@/lib/kanbanGoals";

interface MultiTierTabsProps {
  goals: GoalKanban[];
  selectedGoalId: string | null;
  viewMode: "hierarchy" | "time" | "priority";
  selectedTimeFilter: TimeHorizon | "all";
  selectedPriorityFilter: GoalPriority | "all";
  onSelectGoal: (id: string) => void;
  onSelectTimeFilter: (horizon: TimeHorizon | "all") => void;
  onSelectPriorityFilter: (priority: GoalPriority | "all") => void;
  onDoubleTapGoal: (goal: GoalKanban) => void;
  onEditGoal?: (goal: GoalKanban) => void;
  onAddNewGoal: () => void;
  taskCountsByGoal: Record<string, number>;
}

/** Single-tier goal tabs: one flat row of goals, optionally filtered by time or priority. */
export default function MultiTierTabs({
  goals,
  selectedGoalId,
  viewMode,
  selectedTimeFilter,
  selectedPriorityFilter,
  onSelectGoal,
  onSelectTimeFilter,
  onSelectPriorityFilter,
  onDoubleTapGoal,
  onEditGoal,
  onAddNewGoal,
  taskCountsByGoal,
}: MultiTierTabsProps) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  void onDoubleTapGoal; void onEditGoal;

  const filteredGoals = filterGoalsForView(goals, viewMode, selectedTimeFilter, selectedPriorityFilter);

  return (
    <div className="space-y-2 select-none">
      {/* Optional filter row (time / priority modes) */}
      {viewMode === "time" && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => onSelectTimeFilter("all")}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors shrink-0 ${
              selectedTimeFilter === "all"
                ? "bg-foreground/90 text-background"
                : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {isEn ? "All horizons" : "همه بازه‌ها"}
          </button>
          {TIME_HORIZONS.map((th) => (
            <button
              key={th.id}
              type="button"
              onClick={() => onSelectTimeFilter(th.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors shrink-0 ${
                selectedTimeFilter === th.id
                  ? "bg-foreground/90 text-background"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>{isEn ? th.labelEn : th.labelFa}</span>
            </button>
          ))}
        </div>
      )}

      {viewMode === "priority" && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => onSelectPriorityFilter("all")}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors shrink-0 ${
              selectedPriorityFilter === "all"
                ? "bg-foreground/90 text-background"
                : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {isEn ? "All priorities" : "همه اولویت‌ها"}
          </button>
          {GOAL_PRIORITIES.map((pr) => (
            <button
              key={pr.id}
              type="button"
              onClick={() => onSelectPriorityFilter(pr.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors shrink-0 ${
                selectedPriorityFilter === pr.id
                  ? "bg-foreground/90 text-background"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <PriorityFlag priority={pr.id} />
              <span>{isEn ? pr.labelEn : pr.labelFa}</span>
            </button>
          ))}
        </div>
      )}

      {/* Underline tabs: one flat row of goals */}
      <div className="flex items-end gap-1 overflow-x-auto no-scrollbar border-b border-border" role="tablist">
        {filteredGoals.map((g) => {
          const isSelected = selectedGoalId === g.id;
          const count = taskCountsByGoal[g.id] || 0;
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectGoal(g.id)}
              title={g.title}
              data-testid={`goal-tab-${g.id}`}
              className={`-mb-px flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-[13px] transition-colors ${
                isSelected
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span aria-hidden>{g.icon || "🎯"}</span>
              <span className="max-w-[14rem] truncate" dir="auto">{g.title}</span>
              {count > 0 && <span className="text-[11px] tabular-nums text-muted-foreground">{toPersianDigits(count)}</span>}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onAddNewGoal()}
          className="flex h-10 shrink-0 items-center gap-1 px-2 text-[13px] text-muted-foreground hover:text-foreground"
          data-testid="goal-tab-add"
        >
          <Plus className="h-4 w-4" /> {isEn ? "New goal" : "هدف جدید"}
        </button>
      </div>
    </div>
  );
}
