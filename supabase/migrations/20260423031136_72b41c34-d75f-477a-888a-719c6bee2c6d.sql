CREATE TABLE public.task_step_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  style TEXT NOT NULL DEFAULT 'numbered',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_step_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own task_step_lists"
ON public.task_step_lists FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_task_step_lists_updated_at
BEFORE UPDATE ON public.task_step_lists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_task_step_lists_task ON public.task_step_lists(task_id);

CREATE TABLE public.task_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  list_id UUID NOT NULL REFERENCES public.task_step_lists(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own task_steps"
ON public.task_steps FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_task_steps_updated_at
BEFORE UPDATE ON public.task_steps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_task_steps_list ON public.task_steps(list_id);