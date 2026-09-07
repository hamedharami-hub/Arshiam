-- Enable Supabase Realtime for the main tables used in ARSHNAZ
-- This allows live data sync between devices for logged-in users.

-- Make sure the realtime extension publication exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- Add core tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.folders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.habits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.habit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subtasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_steps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_tags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.note_tags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_attachments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_step_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shares;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pomodoro_sessions;

-- Note: RLS policies still apply. Users only receive realtime events
-- for rows they are allowed to read.
