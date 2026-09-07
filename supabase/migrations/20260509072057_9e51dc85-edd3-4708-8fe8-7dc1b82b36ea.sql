-- Remove Goals feature: drop dependent columns and tables
ALTER TABLE public.tasks DROP COLUMN IF EXISTS goal_id;
ALTER TABLE public.notes DROP COLUMN IF EXISTS goal_id;
ALTER TABLE public.folders DROP COLUMN IF EXISTS goal_id;
ALTER TABLE public.habits DROP COLUMN IF EXISTS goal_id;
DROP TABLE IF EXISTS public.goal_key_results CASCADE;
DROP TABLE IF EXISTS public.goal_milestones CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;