ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS goal_id uuid;
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS goal_id uuid;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'daily';
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS target_per_week smallint NOT NULL DEFAULT 7;

CREATE INDEX IF NOT EXISTS idx_notes_goal_id ON public.notes(goal_id) WHERE goal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folders_goal_id ON public.folders(goal_id) WHERE goal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON public.tasks(goal_id) WHERE goal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON public.tasks(user_id, due_date) WHERE completed = false;