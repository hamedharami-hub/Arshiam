
-- Milestones
CREATE TABLE public.goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  position INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goal_milestones" ON public.goal_milestones
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_goal_milestones_goal ON public.goal_milestones(goal_id);
CREATE TRIGGER trg_goal_milestones_updated
  BEFORE UPDATE ON public.goal_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Key Results (OKR)
CREATE TABLE public.goal_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  unit TEXT,
  start_value NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  target_value NUMERIC NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.goal_key_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goal_key_results" ON public.goal_key_results
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_goal_key_results_goal ON public.goal_key_results(goal_id);
CREATE TRIGGER trg_goal_key_results_updated
  BEFORE UPDATE ON public.goal_key_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link habits to goals
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS goal_id UUID;
CREATE INDEX IF NOT EXISTS idx_habits_goal ON public.habits(goal_id);
