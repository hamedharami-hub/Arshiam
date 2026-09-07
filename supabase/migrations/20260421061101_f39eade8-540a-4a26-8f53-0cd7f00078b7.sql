-- Goals table
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  progress INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#F59E0B',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own goals"
ON public.goals FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns to tasks
ALTER TABLE public.tasks
  ADD COLUMN goal_id UUID,
  ADD COLUMN goal_level TEXT,
  ADD COLUMN quadrant SMALLINT;

CREATE INDEX idx_tasks_goal_id ON public.tasks(goal_id);

-- Holidays table (public read, service-role write)
CREATE TABLE public.holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  country_code TEXT NOT NULL,
  name TEXT NOT NULL,
  local_name TEXT,
  type TEXT DEFAULT 'national',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date, country_code, name)
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view holidays"
ON public.holidays FOR SELECT
USING (true);

CREATE INDEX idx_holidays_date_country ON public.holidays(date, country_code);