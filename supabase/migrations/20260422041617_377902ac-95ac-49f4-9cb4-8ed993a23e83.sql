CREATE TABLE public.user_settings (
  user_id uuid NOT NULL PRIMARY KEY,
  sleep_reminder_enabled boolean NOT NULL DEFAULT true,
  sleep_reminder_time time NOT NULL DEFAULT '22:00',
  checkin_reminder_enabled boolean NOT NULL DEFAULT true,
  checkin_reminder_time time NOT NULL DEFAULT '21:00',
  notifications_enabled boolean NOT NULL DEFAULT false,
  sleep_goal_hours numeric NOT NULL DEFAULT 7.5,
  micro_prompt_enabled boolean NOT NULL DEFAULT true,
  theme text NOT NULL DEFAULT 'system',
  auto_create_daily_tasks boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();