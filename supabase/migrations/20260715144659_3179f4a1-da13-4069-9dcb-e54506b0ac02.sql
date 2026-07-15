ALTER TABLE public.patient_documents
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'outro'
  CHECK (category IN ('exame','laudo_externo','receita','outro'));

CREATE INDEX IF NOT EXISTS patient_documents_category_idx
  ON public.patient_documents(patient_id, category);