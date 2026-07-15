
CREATE TABLE public.patient_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  responses JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','archived')),
  submitted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_forms TO authenticated;
GRANT ALL ON public.patient_forms TO service_role;

ALTER TABLE public.patient_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff manage patient forms"
  ON public.patient_forms FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX patient_forms_patient_idx ON public.patient_forms(patient_id);
CREATE INDEX patient_forms_token_idx ON public.patient_forms(token);

CREATE TRIGGER trg_patient_forms_updated_at
  BEFORE UPDATE ON public.patient_forms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
