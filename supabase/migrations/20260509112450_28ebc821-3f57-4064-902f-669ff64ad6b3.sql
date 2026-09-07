
CREATE TABLE public.cycle_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#EC4899',
  is_self boolean NOT NULL DEFAULT true,
  avg_cycle_length smallint NOT NULL DEFAULT 28,
  avg_period_length smallint NOT NULL DEFAULT 5,
  luteal_length smallint NOT NULL DEFAULT 14,
  notify_period boolean NOT NULL DEFAULT false,
  notify_ovulation boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cycle_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cycle_profiles" ON public.cycle_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_cycle_profiles_updated BEFORE UPDATE ON public.cycle_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cycle_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile_id uuid NOT NULL REFERENCES public.cycle_profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  event text,
  flow smallint,
  pain smallint,
  mood smallint,
  energy smallint,
  symptoms text[] DEFAULT '{}'::text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, log_date)
);
CREATE INDEX idx_cycle_logs_profile_date ON public.cycle_logs(profile_id, log_date);
ALTER TABLE public.cycle_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cycle_logs" ON public.cycle_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_cycle_logs_updated BEFORE UPDATE ON public.cycle_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS cycle_overlay_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active_cycle_profile_id uuid;
