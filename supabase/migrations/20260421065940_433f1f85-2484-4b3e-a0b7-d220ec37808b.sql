
-- Assessment in-progress responses (for split sessions)
CREATE TABLE public.assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assessment_type text NOT NULL, -- 'hexaco' | 'via' | 'ecr'
  responses jsonb NOT NULL DEFAULT '{}'::jsonb, -- { questionId: answer }
  completed boolean NOT NULL DEFAULT false,
  current_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, assessment_type)
);

ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own assessment_responses" ON public.assessment_responses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_assessment_responses_updated_at
  BEFORE UPDATE ON public.assessment_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Final assessment results
CREATE TABLE public.assessment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assessment_type text NOT NULL,
  scores jsonb NOT NULL, -- e.g. { H: 32, E: 18, X: 35, A: 28, C: 45, O: 42 }
  analysis jsonb, -- patterns, attention points, ai_tone
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own assessment_results" ON public.assessment_results
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_assessment_results_user_type ON public.assessment_results(user_id, assessment_type, completed_at DESC);

-- Mental health profile (aggregated)
CREATE TABLE public.mh_profile (
  user_id uuid PRIMARY KEY,
  ai_tone text NOT NULL DEFAULT 'neutral', -- 'data_driven' | 'gentle_analytical' | 'exploratory' | 'neutral'
  signature_strengths jsonb DEFAULT '[]'::jsonb, -- top 5 VIA strengths
  hexaco_pattern text, -- e.g. 'High-Functioning Analytical'
  attachment_quadrant text, -- 'secure' | 'preoccupied' | 'dismissive' | 'fearful'
  attention_points jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mh_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own mh_profile" ON public.mh_profile
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_mh_profile_updated_at
  BEFORE UPDATE ON public.mh_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Daily check-ins
CREATE TABLE public.daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  mood smallint, -- 1..10
  energy smallint, -- 1..10
  focus smallint, -- 1..10
  sleep_hours numeric(3,1),
  sleep_quality smallint, -- 1..10
  stress smallint, -- 1..10
  notes text,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own daily_checkins" ON public.daily_checkins
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_daily_checkins_updated_at
  BEFORE UPDATE ON public.daily_checkins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_daily_checkins_user_date ON public.daily_checkins(user_id, checkin_date DESC);
