import { useTaskPlanningLabel } from "./TaskPlanningPicker";
import { TaskScheduleSheet } from "./TaskScheduleSheet";
import React, { memo, useMemo } from "react";
import { isPathAllowed } from "@/lib/appModules";
import {
  CornerDownRight, ChevronDown, ChevronRight, Pin, X, Ban, CircleDot, Flag,
  GripVertical, Calendar, Repeat, GitBranch, Check, Trash2, Clock, FolderInput, Brain,
  Network, BookOpen, FolderTree, ExternalLink, Layers,
  Sunrise, Sun, Sunset, Moon, CalendarRange, AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BidiText } from "@/components/BidiText";
import { SortableTaskRow } from "@/components/TaskDnDHelpers";
import SwipeableRow, { type SwipeAction } from "@/components/gestures/SwipeableRow";
import { useLongPress } from "@/lib/useLongPress";
import { addDays } from "date-fns";
import { formatDate } from "@/lib/jalali";
import { formatTaskDueDateDisplay, getLocalDateString, taskWorkDate, workDatePatch } from "@/lib/taskDate";
import { getStudyTaskNavigation, isLeitnerStudyTask } from "@/lib/taskStudyService";
import { playCompletionFeedback } from "@/lib/completionFeedback";
import type { Task } from "@/lib/taskTypes";
import { PRIORITY_META } from "@/lib/priority";
import { isTaskOverdue } from "@/lib/taskPlanning";
import { getTimeSettings } from "@/lib/timeHorizon";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

export function outcomeMeta(
  task: Task,
  byTaskId: Record<string, string>,
  byId: Record<string, { label: string; color?: string | null; icon?: string | null }>,
): { label: string; color?: string | null; icon?: string | null } | null {
  const oid = task.outcome_id || byTaskId[task.id];
  if (!oid) return null;
  return byId[oid] || null;
}

export function groupedChildren(
  subs: Task[],
  byTaskId: Record<string, string>,
  byId: Record<string, { label: string; color?: string | null; icon?: string | null }>,
): [string | null, { meta?: { label: string; color?: string | null; icon?: string | null }; tasks: Task[] }][] {
  const groups = new Map<string | null, { meta?: { label: string; color?: string | null; icon?: string | null }; tasks: Task[] }>();
  for (const s of subs) {
    const oid = s.outcome_id || byTaskId[s.id] || null;
    if (!groups.has(oid)) {
      groups.set(oid, { meta: oid ? byId[oid] : undefined, tasks: [] });
    }
    groups.get(oid)!.tasks.push(s);
  }
  return [...groups.entries()].sort((a, b) => {
    if (a[0] === null) return -1;
    if (b[0] === null) return 1;
    const la = a[1].meta?.label || "";
    const lb = b[1].meta?.label || "";
    return la.localeCompare(lb);
  });
}

export interface TaskListItemProps {
  t: Task;
  depth?: number;
  subs: Task[];
  open: boolean;
  onToggleExpand: (id: string) => void;
  progress?: { done: number; total: number };
  parent?: Task | null;
  onSelectTask: (t: Task) => void;
  onToggleTask: (t: Task) => void;
  onActionTask: (t: Task) => void;
  onDeleteTask?: (t: Task) => void;
  onPatchTask: (id: string, patch: Partial<Task>) => void;
  onMoveTask?: (t: Task) => void;
  userId?: string;
  isSelected: boolean;
  splitView: boolean;
  layout: "compact" | "default" | "comfortable";
  isEn: boolean;
  T: (fa: string, en: string) => string;
  navigate: (to: string) => void;
  outcomeByTaskId: Record<string, string>;
  outcomeById: Record<string, { label: string; color?: string | null; icon?: string | null }>;
  childrenMap: Record<string, Task[]>;
  expanded: Record<string, boolean>;
  getProgress: (id: string) => { done: number; total: number };
  taskMap: Map<string, Task>;
  allowDrag?: boolean;
  showCompletedTasks?: boolean;
  /** Shows an inline "Overdue" pill; used by lists that do not group rows by due date. */
  showOverdueBadge?: boolean;
  todayNextTaskId?: string | null;
  todayImportantTaskIds?: string[];
  externalDragHandle?: Record<string, any>;
}

const TaskListItemComponent = ({
  t,
  depth = 0,
  subs,
  open,
  onToggleExpand,
  progress,
  parent,
  onSelectTask,
  onToggleTask,
  onActionTask,
  onDeleteTask,
  onPatchTask,
  onMoveTask,
  userId,
  isSelected,
  splitView,
  layout,
  isEn,
  T,
  navigate,
  outcomeByTaskId,
  outcomeById,
  childrenMap,
  expanded,
  getProgress,
  taskMap,
  allowDrag = false,
  showCompletedTasks = true,
  showOverdueBadge = false,
  todayNextTaskId,
  todayImportantTaskIds = [],
  externalDragHandle,
}: TaskListItemProps) => {
  const studyNavigation = getStudyTaskNavigation(t);
  const isNextTask = todayNextTaskId === t.id;
  const isImportantToday = todayImportantTaskIds.includes(t.id);
  const priorityMeta = PRIORITY_META[t.priority] ?? PRIORITY_META.none;
  // Today/Next-7 group overdue rows under a header, so only ungrouped lists need a row-level pill.
  const overdue = useMemo(
    () => (showOverdueBadge ? isTaskOverdue(t, getTimeSettings()) : false),
    [showOverdueBadge, t],
  );
  const isScheduledLeitnerReview = isLeitnerStudyTask(t);
  const whenLabel = useTaskPlanningLabel(t);
  const parentTask = parent || (t.parent_id ? taskMap?.get(t.parent_id) : null);
  const effectiveProgress = progress ?? (typeof getProgress === "function" ? getProgress(t.id) : undefined) ?? { done: 0, total: subs?.length || 0 };
  const visibleSubs = showCompletedTasks ? subs : subs.filter((subtask) => !subtask.completed);
  const STEP = 18; // px per nesting level
  const lp = useLongPress({ onLongPress: () => onActionTask(t) });

  return (
    <div className="relative swipe-row" style={{ paddingInlineStart: depth * STEP }} {...lp.handlers}>
      {/* Vertical guide lines for each ancestor level */}
      {Array.from({ length: depth }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute top-0 bottom-0 w-px bg-border/70 pointer-events-none"
          style={{ insetInlineStart: i * STEP + 7 }}
        />
      ))}
      {/* Horizontal connector from parent line to this card */}
      {depth > 0 && (
        <span
          aria-hidden
          className="absolute h-px bg-border/70 pointer-events-none"
          style={{ insetInlineStart: (depth - 1) * STEP + 7, top: 20, width: STEP - 4 }}
        />
      )}
      <TaskRowContainer id={t.id} disabled={!allowDrag} externalDragHandle={externalDragHandle}>
        {(dragHandle) => (
          <SwipeableRow
            disabled={t.user_id !== userId}
            rightActions={isScheduledLeitnerReview && !t.completed ? [] : [
              {
                id: "complete",
                label: t.completed ? T("بازگشایی", "Reopen") : T("تکمیل", "Complete"),
                icon: Check,
                baseClass: "bg-emerald-500/80",
                activeClass: "bg-emerald-700",
                textClass: "text-white",
                fullSwipe: true,
                onActivate: () => onToggleTask(t),
              },
            ] as SwipeAction[]}
            leftActions={[
              {
                id: "delete",
                label: T("حذف", "Delete"),
                icon: Trash2,
                baseClass: "bg-destructive/80",
                activeClass: "bg-red-700",
                textClass: "text-white",
                fullSwipe: false,
                onActivate: () => onDeleteTask?.(t),
              },
              {
                id: "tomorrow",
                label: T("فردا", "Tomorrow"),
                icon: Clock,
                baseClass: "bg-amber-500/80",
                activeClass: "bg-amber-700",
                textClass: "text-white",
                onActivate: () => onPatchTask(t.id, workDatePatch(t, getLocalDateString(addDays(new Date(), 1)))),
              },
              {
                id: "move",
                label: T("انتقال", "Move"),
                icon: FolderInput,
                baseClass: "bg-slate-500/80",
                activeClass: "bg-slate-700",
                textClass: "text-white",
                onActivate: () => onMoveTask?.(t),
              },
            ].filter((action) => action.id === "delete" ? !!onDeleteTask : action.id === "move" ? !!onMoveTask : true) as SwipeAction[]}
          >
            <Card className={`rounded-xl ${layout === "compact" ? "p-1.5" : "p-2 sm:p-2.5"} ${t.is_avoidance ? "bg-amber-500/[0.04] border-amber-500/30" : ""} ${depth > 0 ? "bg-muted/20" : "bg-card"} hover:bg-accent/40 transition-colors ${isSelected && splitView ? "border-primary bg-accent" : ""}`}>
              {/* Standalone subtask chip when rendered at top-level (depth === 0) */}
              {depth === 0 && t.parent_id && (
                <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (parentTask) {
                        onSelectTask(parentTask);
                      } else if (t.parent_id) {
                        navigate(`/app/tasks/${encodeURIComponent(t.parent_id)}`);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 hover:border-primary/40 transition-all duration-150 cursor-pointer group max-w-full shadow-2xs"
                    title={T("مشاهده تسک مادر", "View parent task")}
                  >
                    <CornerDownRight className="w-3 h-3 shrink-0 text-primary/70 group-hover:text-primary transition-colors rtl:rotate-180" />
                    <span className="text-primary/70 text-[10px] shrink-0 font-normal">
                      {T("تسک مادر:", "Parent:")}
                    </span>
                    <span className="truncate font-semibold text-[11px] max-w-[200px] sm:max-w-[320px]">
                      {parentTask?.title || T("بدون عنوان", "Untitled")}
                    </span>
                  </button>
                </div>
              )}
              {depth > 0 && parent && (
                <div className="flex items-center gap-1 mb-1 text-[10px] text-muted-foreground/80">
                  <CornerDownRight className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{T(`سطح ${depth} · زیرِ «${parent.title}»`, `Level ${depth} · under "${parent.title}"`)}</span>
                </div>
              )}
              {/* Row 1: chevron + pin + TITLE (wide) + checkbox (right) */}
              <div dir={isEn ? "ltr" : "rtl"} className="flex items-start gap-1.5">
                {visibleSubs.length > 0 ? (
                  <button type="button" aria-label={open ? T("بستن زیرتسک‌ها", "Collapse subtasks") : T("نمایش زیرتسک‌ها", "Expand subtasks")} onClick={(e) => { e.stopPropagation(); onToggleExpand(t.id); }} className="text-muted-foreground hover:text-foreground shrink-0 pt-0.5">
                    {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                ) : <span className="w-4 shrink-0" />}
                <button
                  onClick={(e) => { e.stopPropagation(); onPatchTask(t.id, { pinned: !t.pinned }); }}
                  disabled={t.user_id !== userId}
                  className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded transition mt-0.5 ${t.pinned ? "text-primary" : "text-muted-foreground/40 hover:text-foreground"} ${t.user_id !== userId ? "opacity-40 cursor-not-allowed" : ""}`}
                  title={t.pinned ? T("حذف پین", "Unpin") : T("پین کردن", "Pin")}
                  data-no-longpress
                >
                  <Pin className={`w-3 h-3 ${t.pinned ? "fill-primary" : ""}`} />
                </button>
                <button
                  type="button"
                  className="flex-1 min-w-0 cursor-pointer select-none text-start rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  onClick={() => {
                    if (isPathAllowed("/app/checkin") && (t.title.startsWith("چک‌این روزانه") || t.title.startsWith("Daily Check-in"))) { navigate("/app/checkin"); return; }
                    onSelectTask(t);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (!isScheduledLeitnerReview || t.completed) onToggleTask(t);
                  }}
                >
                  {t.status === "wont_do" && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-sky-500/10 text-sky-600 ms-1 shrink-0">
                      <X className="w-2.5 h-2.5" />
                    </span>
                  )}
                  <BidiText
                    as="span"
                    text={t.title}
                    className={`block ${layout === "compact" ? "text-sm" : "text-[15px]"} font-medium leading-tight break-words ${t.completed ? "line-through text-muted-foreground" : t.status === "wont_do" ? "text-sky-600" : "text-foreground/90"}`}
                  />
                </button>
                {isScheduledLeitnerReview && !t.completed ? (
                  <button
                    type="button"
                    data-no-longpress
                    aria-label={T("شروع مرور لایتنر", "Open Leitner review")}
                    title={T("شروع مرور لایتنر", "Open Leitner review")}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (studyNavigation.navUrl) navigate(studyNavigation.navUrl);
                    }}
                    className="mt-0.5 shrink-0 h-5 w-5 rounded-md border border-primary/40 text-primary flex items-center justify-center hover:bg-primary/10 transition"
                  >
                    <BookOpen className="w-3 h-3" />
                  </button>
                ) : t.is_avoidance ? (
                  <button
                    onClick={() => onToggleTask(t)}
                    title={t.completed ? T("موفق به اجتناب — لغو", "Avoidance succeeded — undo") : T("علامت بزن: موفق به اجتناب شدم", "Mark: I successfully avoided")}
                    className={`mt-0.5 shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center transition ${
                      t.completed
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "border-amber-500/60 text-amber-600 hover:bg-amber-500/10"
                    }`}
                  >
                    <Ban className="w-3 h-3" />
                  </button>
                ) : (
                  <Checkbox
                    checked={t.completed}
                    onCheckedChange={() => {
                      if (!t.completed) playCompletionFeedback();
                      onToggleTask(t);
                    }}
                    className={`mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 transition-transform duration-200 active:scale-75 data-[state=checked]:scale-110 ${priorityMeta.checkboxClass}`}
                  />
                )}
              </div>

              {/* Row 2: metadata */}
              <div className="flex items-center gap-1.5 mt-1 ms-5 flex-wrap min-h-[20px]" dir={isEn ? "ltr" : "rtl"}>
                {allowDrag && (
                  <button {...dragHandle} data-drag-handle data-no-swipe-nav className="text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing touch-none shrink-0 h-5 w-5 rounded flex items-center justify-center" aria-label={T("جابجایی", "Drag")} title={T("جابجایی", "Drag")}>
                    <GripVertical className="w-3 h-3" />
                  </button>
                )}
                {t.is_avoidance && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 h-4 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    <Ban className="w-2.5 h-2.5" /> {T("اجتنابی", "Avoidance")}
                  </span>
                )}
                {isNextTask && (
                  <span data-testid={`today-next-task-${t.id}`} className="inline-flex items-center gap-0.5 text-[9px] px-1.5 h-4 rounded bg-primary/10 text-primary border border-primary/25">
                    <CircleDot className="w-2.5 h-2.5" /> {T("کار بعدی من", "My next task")}
                  </span>
                )}
                {isImportantToday && (
                  <span data-testid={`today-important-task-${t.id}`} className="inline-flex items-center gap-0.5 text-[9px] px-1.5 h-4 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                    <Flag className="w-2.5 h-2.5" /> {T("مهم امروز", "Important today")}
                  </span>
                )}
                {(() => {
                  const studyInfo = studyNavigation;
                  if (studyInfo.isStudyTask) {
                    const isLeitner = isScheduledLeitnerReview;
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isLeitner && t.completed) onToggleTask(t);
                          else navigate(studyInfo.navUrl);
                        }}
                        className={`inline-flex items-center gap-1 text-[9px] px-2 h-5 rounded-full border font-medium transition cursor-pointer ${
                          isLeitner
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25"
                            : studyInfo.isMindMap
                            ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                        }`}
                        title={isLeitner && t.completed
                          ? T("بازگشایی مرور لایتنر", "Reopen scheduled review")
                          : T(studyInfo.actionTextFa, studyInfo.actionTextEn)}
                      >
                        {isLeitner ? (
                          <Layers className="w-2.5 h-2.5 shrink-0" />
                        ) : studyInfo.isMindMap ? (
                          <Network className="w-2.5 h-2.5 shrink-0" />
                        ) : t.source_type === "knowledge_folder" ? (
                          <FolderTree className="w-2.5 h-2.5 shrink-0" />
                        ) : (
                          <BookOpen className="w-2.5 h-2.5 shrink-0" />
                        )}
                        <span>{T(studyInfo.badgeLabelFa, studyInfo.badgeLabelEn)}</span>
                        <ExternalLink className="w-2 h-2 shrink-0 opacity-70 rtl:rotate-180" />
                      </button>
                    );
                  }

                  if (t.source_type) {
                    return (
                      <span
                        className="inline-flex items-center gap-0.5 text-[9px] px-1.5 h-4 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                        title={T("ایجاد شده از بخش ذهن", "Created from Mind")}
                      >
                        <Brain className="w-2.5 h-2.5" />
                        <span>
                          {t.source_type === "cbt_thought" ? T("CBT", "CBT")
                            : t.source_type === "abc_model" ? T("ABC", "ABC")
                            : t.source_type === "worry_tree" ? T("نگرانی", "Worry")
                            : t.source_type === "values_goal" ? T("ارزش‌ها", "Values")
                            : T("ذهن", "Mind")}
                        </span>
                      </span>
                    );
                  }

                  return null;
                })()}

                {overdue && (
                  <span
                    data-testid="task-overdue-badge"
                    className="inline-flex h-5 items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-2 text-[10px] font-medium text-rose-700 dark:text-rose-300"
                    title={T("زمان این تسک گذشته است", "This task's date has passed")}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {T("عقب‌افتاده", "Overdue")}
                  </span>
                )}

                <TaskScheduleSheet task={t} onPatch={patch => onPatchTask(t.id, patch)}>
                  <button
                    type="button"
                    onClick={e => e.stopPropagation()}
                    data-testid={`task-schedule-chip-${t.id}`}
                    className={`text-[10px] gap-1 px-2 h-5 font-medium inline-flex items-center rounded-full border transition ${whenLabel ? "bg-secondary/80 text-secondary-foreground hover:bg-secondary" : "border-dashed text-muted-foreground/70 hover:bg-muted/40"}`}
                    title={T("روز، ساعت و تکرار", "Day, time and repeat")}
                  >
                    <Calendar className="h-3 w-3" />
                    {whenLabel ? <bdi>{whenLabel}</bdi> : <span>{T("زمان", "When")}</span>}
                    {(t.recurrence_rule || (t.recurrence && t.recurrence !== "none")) && <Repeat className="h-3 w-3 text-violet-600" aria-label={T("تکراری", "Repeats")} />}
                  </button>
                </TaskScheduleSheet>
                {effectiveProgress.total > 0 && (visibleSubs.length > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand(t.id);
                    }}
                    className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-accent/40 transition cursor-pointer"
                    title={open ? T("بستن زیرتسک‌ها", "Collapse subtasks") : T("نمایش زیرتسک‌ها", "Expand subtasks")}
                  >
                    <CornerDownRight className="w-3 h-3 text-primary" />
                    <span>{`${effectiveProgress.done}/${effectiveProgress.total}`}</span>
                    <span className="text-[9px] text-muted-foreground/70">
                      {open ? `(${T("بستن", "hide")})` : `(${T("نمایش", "show")})`}
                    </span>
                  </button>
                ) : (
                  <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1 px-1.5 py-0.5">
                    <CornerDownRight className="w-3 h-3 text-primary" />
                    <span>{`${effectiveProgress.done}/${effectiveProgress.total}`}</span>
                  </span>
                ))}
                {(() => {
                  const ometa = outcomeMeta(t, outcomeByTaskId, outcomeById);
                  if (!ometa) return null;
                  return (
                    <span
                      className="inline-flex items-center gap-0.5 text-[9px] px-1.5 h-4 rounded border"
                      style={{ borderColor: ometa.color || "hsl(var(--primary))", background: ometa.color ? `${ometa.color}20` : "hsl(var(--primary) / 0.1)" }}
                    >
                      <GitBranch className="w-2.5 h-2.5" />
                      <span style={{ color: ometa.color || undefined }}>{ometa.label}</span>
                    </span>
                  );
                })()}
              </div>
            </Card>
          </SwipeableRow>
        )}
      </TaskRowContainer>
      {open && visibleSubs.length > 0 && (
        <div className="mt-1 space-y-2">
          {groupedChildren(visibleSubs, outcomeByTaskId, outcomeById).map(([oid, group]) => (
            <div key={oid ?? "root"} className="space-y-1">
              {group.meta && (
                <div className="flex items-center gap-1.5 ps-5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: group.meta.color || "hsl(var(--primary))", color: "#fff" }}
                  >
                    {group.meta.icon || "•"}
                  </span>
                  <span>{group.meta.label}</span>
                </div>
              )}
              <SortableContext items={group.tasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
                {group.tasks.map((s) => (
                  <TaskListItem
                    key={s.id}
                    t={s}
                    depth={depth + 1}
                    subs={childrenMap[s.id] || []}
                    open={!!expanded[s.id]}
                    onToggleExpand={onToggleExpand}
                    progress={getProgress(s.id)}
                    parent={t}
                    onSelectTask={onSelectTask}
                    onToggleTask={onToggleTask}
                    onActionTask={onActionTask}
                    onDeleteTask={onDeleteTask}
                    onPatchTask={onPatchTask}
                    onMoveTask={onMoveTask}
                    userId={userId}
                    isSelected={isSelected}
                    splitView={splitView}
                    layout={layout}
                    isEn={isEn}
                    T={T}
                    navigate={navigate}
                    outcomeByTaskId={outcomeByTaskId}
                    outcomeById={outcomeById}
                    childrenMap={childrenMap}
                    expanded={expanded}
                    getProgress={getProgress}
                    taskMap={taskMap}
                    allowDrag={externalDragHandle ? false : allowDrag}
                    showCompletedTasks={showCompletedTasks}
                    showOverdueBadge={showOverdueBadge}
                    todayNextTaskId={todayNextTaskId}
                    todayImportantTaskIds={todayImportantTaskIds}
                  />
                ))}
              </SortableContext>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const TaskListItem = memo(TaskListItemComponent);

function TaskRowContainer({ externalDragHandle, children, ...props }: {
  id: string; disabled: boolean; externalDragHandle?: Record<string, any>;
  children: (handle: any) => React.ReactNode;
}) {
  if (externalDragHandle) return <>{children(externalDragHandle)}</>;
  return <SortableTaskRow {...props}>{children}</SortableTaskRow>;
}
