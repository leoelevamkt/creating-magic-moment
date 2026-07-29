CREATE TABLE public.anamnese_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  anamnese_id uuid,
  author_id uuid,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX anamnese_revisions_patient_idx ON public.anamnese_revisions (patient_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.anamnese_revisions TO authenticated;
GRANT ALL ON public.anamnese_revisions TO service_role;

ALTER TABLE public.anamnese_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team reads anamnese revisions" ON public.anamnese_revisions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Team writes anamnese revisions" ON public.anamnese_revisions
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admins delete anamnese revisions" ON public.anamnese_revisions
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));