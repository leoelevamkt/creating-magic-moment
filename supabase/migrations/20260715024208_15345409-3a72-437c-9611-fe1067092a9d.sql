
-- 1) Notes board per patient
CREATE TABLE public.patient_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'default',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_notes TO authenticated;
GRANT ALL ON public.patient_notes TO service_role;

ALTER TABLE public.patient_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view patient notes"
  ON public.patient_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert patient notes"
  ON public.patient_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owners or admin can update patient notes"
  ON public.patient_notes FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners or admin can delete patient notes"
  ON public.patient_notes FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER patient_notes_set_updated_at
  BEFORE UPDATE ON public.patient_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX patient_notes_patient_idx ON public.patient_notes(patient_id, pinned DESC, updated_at DESC);

-- 2) Session plan: add session number + checklist
ALTER TABLE public.sessions_plan
  ADD COLUMN IF NOT EXISTS session_number integer,
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb;
