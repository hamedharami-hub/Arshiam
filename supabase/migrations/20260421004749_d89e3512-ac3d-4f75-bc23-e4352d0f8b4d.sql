CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done');

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status public.task_status NOT NULL DEFAULT 'todo';

-- Backfill: completed tasks become 'done'
UPDATE public.tasks SET status = 'done' WHERE completed = true;