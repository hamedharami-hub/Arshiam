-- 1) Extend user_settings with UI scale + font size
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS font_size text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS ui_scale numeric NOT NULL DEFAULT 1.0;

-- 2) About-me table (single row per user)
CREATE TABLE IF NOT EXISTS public.about_me (
  user_id uuid PRIMARY KEY,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  free_text text,
  ai_analysis jsonb,
  ai_suggestions jsonb,
  analyzed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.about_me ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own about_me"
ON public.about_me
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_about_me_updated_at
BEFORE UPDATE ON public.about_me
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();