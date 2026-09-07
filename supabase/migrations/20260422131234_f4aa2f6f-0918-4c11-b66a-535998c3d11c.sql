-- Task widgets table (saved task views)
CREATE TABLE public.task_widgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'all', -- all | today | next7 | inbox | folder | tag | smart
  folder_id UUID NULL,
  tag_id UUID NULL,
  sort_by TEXT NOT NULL DEFAULT 'created_desc', -- created_desc | created_asc | due_asc | due_desc | priority | title
  date_filter TEXT NOT NULL DEFAULT 'all', -- all | today | overdue | this_week | this_month | no_date
  show_completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  icon TEXT NULL,
  color TEXT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own task_widgets"
ON public.task_widgets
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_task_widgets_updated_at
BEFORE UPDATE ON public.task_widgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add default widget + card layout to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS default_widget_id UUID NULL,
ADD COLUMN IF NOT EXISTS task_card_layout TEXT NOT NULL DEFAULT 'comfortable',
ADD COLUMN IF NOT EXISTS default_landing TEXT NOT NULL DEFAULT 'today'; -- today | widget | last