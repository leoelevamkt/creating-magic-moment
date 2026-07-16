ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS patients_assigned_to_idx ON public.patients(assigned_to);