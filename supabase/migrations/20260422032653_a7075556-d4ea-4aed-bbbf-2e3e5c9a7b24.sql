ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS clinical_consent boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS clinical_consent_at timestamptz;