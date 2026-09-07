ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS sr_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sr_interval integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sr_ease numeric NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS sr_reps integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sr_due_date timestamptz,
  ADD COLUMN IF NOT EXISTS sr_last_reviewed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_notes_sr_due ON public.notes(user_id, sr_due_date) WHERE sr_enabled = true;