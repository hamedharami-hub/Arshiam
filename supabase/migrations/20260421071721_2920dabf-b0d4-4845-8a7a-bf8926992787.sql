
-- Thought Records (CBT)
CREATE TABLE public.thought_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  situation TEXT NOT NULL,
  automatic_thought TEXT NOT NULL,
  emotion_intensity_before SMALLINT NOT NULL CHECK (emotion_intensity_before BETWEEN 0 AND 100),
  emotions TEXT[] DEFAULT '{}',
  evidence_for TEXT[] DEFAULT '{}',
  evidence_against TEXT[] DEFAULT '{}',
  alternative_thought TEXT,
  emotion_intensity_after SMALLINT CHECK (emotion_intensity_after BETWEEN 0 AND 100),
  distortions TEXT[] DEFAULT '{}',
  ai_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.thought_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own thought_records" ON public.thought_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_thought_records_updated_at BEFORE UPDATE ON public.thought_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ABC Model Records
CREATE TABLE public.abc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trigger TEXT NOT NULL,
  belief TEXT NOT NULL,
  consequences TEXT[] DEFAULT '{}',
  duration_minutes INTEGER,
  regret_level SMALLINT CHECK (regret_level BETWEEN 0 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.abc_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own abc_records" ON public.abc_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Prediction Journal
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prediction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  predicted_work_hours NUMERIC,
  actual_work_hours NUMERIC,
  predicted_productivity SMALLINT CHECK (predicted_productivity BETWEEN 1 AND 10),
  actual_productivity SMALLINT CHECK (actual_productivity BETWEEN 1 AND 10),
  predicted_completion_pct SMALLINT,
  actual_completion_pct SMALLINT,
  hardest_part TEXT,
  evening_reflection TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, prediction_date)
);
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own predictions" ON public.predictions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON public.predictions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User Values (ACT)
CREATE TABLE public.user_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  value_name TEXT NOT NULL,
  meaning TEXT,
  position SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own user_values" ON public.user_values FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Chronotype (MEQ)
CREATE TABLE public.chronotype (
  user_id UUID PRIMARY KEY,
  meq_score SMALLINT,
  category TEXT,
  peak_window_start SMALLINT,
  peak_window_end SMALLINT,
  trough_window_start SMALLINT,
  trough_window_end SMALLINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chronotype ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own chronotype" ON public.chronotype FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Safe Contacts
CREATE TABLE public.safe_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.safe_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own safe_contacts" ON public.safe_contacts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Crisis Events Log
CREATE TABLE public.crisis_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trigger_type TEXT NOT NULL,
  steps_taken JSONB DEFAULT '[]',
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crisis_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own crisis_events" ON public.crisis_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
