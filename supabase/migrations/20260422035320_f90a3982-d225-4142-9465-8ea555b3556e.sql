-- B1: Sleep logs
CREATE TABLE public.sleep_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sleep_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bedtime TIME,
  wake_time TIME,
  hours NUMERIC(4,2),
  quality SMALLINT CHECK (quality BETWEEN 1 AND 5),
  awakenings SMALLINT DEFAULT 0,
  caffeine_cutoff_hour SMALLINT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, sleep_date)
);

ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sleep_logs"
ON public.sleep_logs FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_sleep_logs_updated_at
BEFORE UPDATE ON public.sleep_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_sleep_logs_user_date ON public.sleep_logs(user_id, sleep_date DESC);

-- B3: Progressive profiling queue
CREATE TABLE public.profile_questions_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source TEXT NOT NULL,
  question_key TEXT NOT NULL,
  question_text TEXT NOT NULL,
  scale_min SMALLINT NOT NULL DEFAULT 1,
  scale_max SMALLINT NOT NULL DEFAULT 5,
  reverse_scored BOOLEAN NOT NULL DEFAULT false,
  trait TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  answer SMALLINT,
  asked_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  trigger_context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_questions_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile_questions_queue"
ON public.profile_questions_queue FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_pqq_user_status ON public.profile_questions_queue(user_id, status, scheduled_for);

-- B5: Decision journal
CREATE TABLE public.decision_journal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  decision_title TEXT NOT NULL,
  context TEXT,
  options_considered JSONB DEFAULT '[]'::jsonb,
  chosen_option TEXT,
  rationale TEXT,
  predicted_outcome TEXT,
  predicted_confidence SMALLINT CHECK (predicted_confidence BETWEEN 0 AND 100),
  emotional_state TEXT,
  review_date DATE,
  actual_outcome TEXT,
  outcome_rating SMALLINT CHECK (outcome_rating BETWEEN 1 AND 5),
  lessons_learned TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own decision_journal"
ON public.decision_journal FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_decision_journal_updated_at
BEFORE UPDATE ON public.decision_journal
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_decision_journal_user ON public.decision_journal(user_id, created_at DESC);
CREATE INDEX idx_decision_journal_review ON public.decision_journal(user_id, review_date) WHERE reviewed_at IS NULL;