ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS start_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS end_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS estimated_minutes integer;

CREATE INDEX IF NOT EXISTS idx_tasks_start_at ON public.tasks(user_id, start_at) WHERE start_at IS NOT NULL;