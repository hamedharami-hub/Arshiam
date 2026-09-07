-- 1) Drop unused sleep-related columns from user_settings
ALTER TABLE public.user_settings 
  DROP COLUMN IF EXISTS sleep_reminder_time,
  DROP COLUMN IF EXISTS sleep_reminder_enabled,
  DROP COLUMN IF EXISTS sleep_goal_hours;

-- 2) Performance indexes
-- Tasks: hottest queries (today, by folder, by goal, by user)
CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date
  ON public.tasks (user_id, due_date) WHERE completed = false;

CREATE INDEX IF NOT EXISTS idx_tasks_user_completed
  ON public.tasks (user_id, completed, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_user_folder
  ON public.tasks (user_id, folder_id) WHERE folder_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_user_goal
  ON public.tasks (user_id, goal_id) WHERE goal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_user_kanban
  ON public.tasks (kanban_column_id) WHERE kanban_column_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_user_reminder
  ON public.tasks (user_id, reminder_at) WHERE reminder_at IS NOT NULL;

-- Notes
CREATE INDEX IF NOT EXISTS idx_notes_user_updated
  ON public.notes (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_notes_user_folder
  ON public.notes (user_id, folder_id) WHERE folder_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notes_user_sr_due
  ON public.notes (user_id, sr_due_date) WHERE sr_enabled = true;

-- Daily checkins
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date
  ON public.daily_checkins (user_id, checkin_date DESC);

-- Habit logs
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date
  ON public.habit_logs (user_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date
  ON public.habit_logs (habit_id, log_date DESC);

-- Pomodoro sessions
CREATE INDEX IF NOT EXISTS idx_pomodoro_user_started
  ON public.pomodoro_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_pomodoro_task
  ON public.pomodoro_sessions (task_id) WHERE task_id IS NOT NULL;

-- Subtasks / steps
CREATE INDEX IF NOT EXISTS idx_subtasks_task
  ON public.subtasks (task_id, position);

CREATE INDEX IF NOT EXISTS idx_task_step_lists_task
  ON public.task_step_lists (task_id, position);

CREATE INDEX IF NOT EXISTS idx_task_steps_list
  ON public.task_steps (list_id, position);

-- ABC / Thought records / Decisions (analysis pages)
CREATE INDEX IF NOT EXISTS idx_abc_user_created
  ON public.abc_records (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_thought_records_user_created
  ON public.thought_records (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_decision_journal_user_created
  ON public.decision_journal (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_decision_journal_review
  ON public.decision_journal (user_id, review_date) WHERE review_date IS NOT NULL;

-- Tags & folder relations
CREATE INDEX IF NOT EXISTS idx_task_tags_task ON public.task_tags (task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON public.task_tags (tag_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_note ON public.note_tags (note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON public.note_tags (tag_id);

CREATE INDEX IF NOT EXISTS idx_folders_user_parent
  ON public.folders (user_id, parent_id);

CREATE INDEX IF NOT EXISTS idx_folder_columns_folder
  ON public.folder_columns (folder_id, position);

-- Profile questions queue
CREATE INDEX IF NOT EXISTS idx_pqq_user_status
  ON public.profile_questions_queue (user_id, status, scheduled_for);

-- Assessment responses lookup
CREATE INDEX IF NOT EXISTS idx_assessment_responses_user_type
  ON public.assessment_responses (user_id, assessment_type);

CREATE INDEX IF NOT EXISTS idx_assessment_results_user_type
  ON public.assessment_results (user_id, assessment_type, completed_at DESC);

-- Widget tokens lookup (used by public widget endpoint)
CREATE INDEX IF NOT EXISTS idx_widget_tokens_token
  ON public.widget_tokens (token);

-- Task widgets per user
CREATE INDEX IF NOT EXISTS idx_task_widgets_user_position
  ON public.task_widgets (user_id, position);
