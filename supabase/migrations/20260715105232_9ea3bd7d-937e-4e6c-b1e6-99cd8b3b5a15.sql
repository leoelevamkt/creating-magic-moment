
ALTER TABLE public.patient_notes
  ADD COLUMN IF NOT EXISTS session_number integer,
  ADD COLUMN IF NOT EXISTS session_dates text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS planned_tests text;
