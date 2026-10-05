import type { Priority } from "@/lib/priority";
import type { RecurrenceRule } from "@/lib/recurrence";

export type TaskStatus = "todo" | "in_progress" | "done" | "wont_do";

export type ReminderMode = "once" | "until_ack" | "count";
export type ReminderImportance = "normal" | "important";
export type ReminderPlanStatus = "pending" | "firing" | "snoozed" | "missed" | "acknowledged" | "cancelled";

export type ReminderPlan = {
  version: 1;
  enabled: boolean;
  trigger_at: string;
  mode: ReminderMode;
  repeat_interval_minutes: 5 | 10 | 15 | 30 | 60;
  repeat_count: 1 | 3 | 5;
  snooze_options: number[];
  importance: ReminderImportance;
  status?: ReminderPlanStatus;
  fire_count?: number;
  max_window_hours?: number;
  snooze_until?: string | null;
  last_fired_at?: string | null;
};

export type Task = {
  id: string;
  user_id?: string;
  title: string;
  description?: string | null;
  priority: Priority;
  due_date?: string | null;
  /** The task's date (optionally with a time). Legacy tasks without it fall back to due_date. */
  work_date?: string | null;
  completed: boolean;
  status: TaskStatus;
  folder_id?: string | null;
  kanban_column_id?: string | null;
  reminder_at?: string | null;
  reminder_plan?: ReminderPlan | null;
  recurrence?: "none" | "daily" | "weekly" | "monthly";
  recurrence_rule?: RecurrenceRule | null;
  parent_id?: string | null;
  outcome_id?: string | null;
  source_type?: "cbt_thought" | "abc_model" | "worry_tree" | "values_goal" | string | null;
  source_id?: string | null;
  outcome_review?: { helpful: "helpful" | "somewhat" | "not_helpful"; note?: string; created_at: string } | null;
  pinned?: boolean;
  is_avoidance?: boolean;
  location?: string | null;
  bucket_kind?:
    | "day"
    | "week"
    | "month"
    | "quarter"
    | "year"
    | null;
  bucket_calendar?: "jalali" | "gregorian" | null;
  bucket_anchor?: string | null;
  planning_horizon?: "day" | "week" | "month" | "quarter" | "year" | null;
  planning_start?: string | null;
  planning_end?: string | null;
  planning_calendar?: "jalali" | "gregorian" | null;
  /** Cascade link to an item one or more planning levels higher (year → quarter → month → week → day). */
  plan_parent_id?: string | null;
  // Time horizon v2 (see src/lib/timeHorizon.ts)
  horizon?: "day" | "week" | "month" | "quarter" | "year" | null;
  period_start?: string | null;
  period_end?: string | null;
  due_at?: string | null;
  is_exact?: boolean | null;
  postpone_count?: number | null;
  /** 2 = the task stores exactly one schedule in work_date | planning_* (see src/lib/taskSchedule.ts). */
  schedule_v?: number | null;
  /** IANA zone at explicit datetime selection; absent legacy zones are not guessed by the API. */
  schedule_timezone?: string | null;
  /** Backup of the pre-v2 schedule fields, written once by the migration. Never read as a schedule. */
  schedule_legacy?: { version: number; migrated_at: string; fields: Record<string, unknown>; conflict?: string } | null;
  start_at?: string | null;
  end_at?: string | null;
  estimated_minutes?: number | null;
  time_of_day?: string | null;
  part_of_day?: string | null;
  deadline?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  position?: number | null;
  // transient UI state for deleted-task grace period
  _graceUntil?: number;
};

export type TaskTemplate = {
  id: string;
  user_id?: string;
  title: string;
  description?: string | null;
  priority: Priority;
  folder_id?: string | null;
  due_offset_hours?: number | null;
  recurrence?: "none" | "daily" | "weekly" | "monthly";
  payload?: Record<string, unknown>;
};

export type TaskActivity = {
  id: string;
  user_id?: string;
  task_id: string;
  action: string;
  payload?: Record<string, unknown>;
  created_at: string;
};

export type TaskNote = {
  id: string;
  user_id?: string;
  task_id?: string;
  title: string;
  content: string;
  created_at?: string;
  updated_at?: string;
};

export type OutcomeAction = {
  title: string;
  description?: string | null;
  priority?: Priority;
  folder_id?: string | null;
  due_offset_hours?: number | null;
  tag_ids?: string[];
};

export type TaskOutcome = {
  id: string;
  user_id?: string;
  task_id: string;
  label: string;
  color?: string | null;
  icon?: string | null;
  position: number;
  actions: OutcomeAction[];
  created_at: string;
  updated_at: string;
};

export type OutcomeExecution = {
  id: string;
  user_id?: string;
  task_id: string;
  outcome_id: string;
  created_task_ids: string[];
  created_at: string;
};

export type ConfirmState =
  | {
      kind: "task" | "note" | "subtask-row";
      id: string;
      title: string;
      /** Resolve false when the delete failed so the dialog stays open. */
      onConfirm: () => Promise<void | boolean>;
      childCount?: number;
    }
  | null;
