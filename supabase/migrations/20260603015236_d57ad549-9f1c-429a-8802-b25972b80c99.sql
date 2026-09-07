-- Add time-bucket categorization to tasks
-- bucket_kind: 'day' | 'week' | 'month' | 'quarter' | 'year' (calendar-system agnostic; UI maps to Jalali or Gregorian)
-- bucket_calendar: 'jalali' | 'gregorian' (so a "month" anchor is unambiguous)
-- bucket_anchor: ISO date (yyyy-mm-dd) representing the start of the bucket period in the chosen calendar.
--   For day: that exact day. For week: first day of that week. For month/quarter/year: first day in that calendar system.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS bucket_kind text,
  ADD COLUMN IF NOT EXISTS bucket_calendar text,
  ADD COLUMN IF NOT EXISTS bucket_anchor date;

CREATE INDEX IF NOT EXISTS tasks_bucket_lookup_idx
  ON public.tasks (user_id, bucket_kind, bucket_calendar, bucket_anchor)
  WHERE bucket_kind IS NOT NULL;
