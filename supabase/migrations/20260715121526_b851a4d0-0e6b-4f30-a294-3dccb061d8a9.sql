ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS medications text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS professionals jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.patients ADD CONSTRAINT patients_professionals_is_array CHECK (jsonb_typeof(professionals) = 'array');