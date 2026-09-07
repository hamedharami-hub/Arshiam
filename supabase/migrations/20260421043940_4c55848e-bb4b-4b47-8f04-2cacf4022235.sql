-- Folder kanban columns (custom per-folder columns)
CREATE TABLE public.folder_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  folder_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.folder_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own folder_columns"
  ON public.folder_columns FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_folder_columns_folder ON public.folder_columns(folder_id, position);

CREATE TRIGGER update_folder_columns_updated_at
  BEFORE UPDATE ON public.folder_columns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add kanban_column_id to tasks (links task to a folder's custom column)
ALTER TABLE public.tasks ADD COLUMN kanban_column_id UUID;
CREATE INDEX idx_tasks_kanban_column ON public.tasks(kanban_column_id);

-- User AI preferences (language for AI output)
ALTER TABLE public.profiles ADD COLUMN ai_language TEXT NOT NULL DEFAULT 'fa';