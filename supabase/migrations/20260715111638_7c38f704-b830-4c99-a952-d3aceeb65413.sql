ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS has_guardians boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guardians jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS emergency_contact jsonb;

-- Structural sanity: guardians is always an array; emergency_contact is object or null.
ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_guardians_is_array,
  ADD CONSTRAINT patients_guardians_is_array CHECK (jsonb_typeof(guardians) = 'array');

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_emergency_contact_is_object,
  ADD CONSTRAINT patients_emergency_contact_is_object CHECK (emergency_contact IS NULL OR jsonb_typeof(emergency_contact) = 'object');