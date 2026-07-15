
CREATE TABLE public.patient_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  mime_type text,
  size_bytes bigint,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_patient_documents_patient ON public.patient_documents(patient_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_documents TO authenticated;
GRANT ALL ON public.patient_documents TO service_role;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docs select" ON public.patient_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "docs insert" ON public.patient_documents FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "docs update" ON public.patient_documents FOR UPDATE TO authenticated USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "docs delete" ON public.patient_documents FOR DELETE TO authenticated USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_patient_documents_updated BEFORE UPDATE ON public.patient_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "storage read patient docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'patient-documents');
CREATE POLICY "storage insert patient docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'patient-documents');
CREATE POLICY "storage update patient docs" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'patient-documents');
CREATE POLICY "storage delete patient docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'patient-documents');

CREATE TABLE public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.sessions_plan(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('income','expense')),
  category text NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','cancelled')),
  paid_at date,
  payment_method text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_financial_tx_patient ON public.financial_transactions(patient_id);
CREATE INDEX idx_financial_tx_date ON public.financial_transactions(transaction_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_transactions TO authenticated;
GRANT ALL ON public.financial_transactions TO service_role;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx select" ON public.financial_transactions FOR SELECT TO authenticated
  USING (patient_id IS NOT NULL OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tx insert" ON public.financial_transactions FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (patient_id IS NOT NULL OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "tx update" ON public.financial_transactions FOR UPDATE TO authenticated
  USING ((patient_id IS NOT NULL AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))) OR (patient_id IS NULL AND public.has_role(auth.uid(), 'admin')))
  WITH CHECK ((patient_id IS NOT NULL AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))) OR (patient_id IS NULL AND public.has_role(auth.uid(), 'admin')));
CREATE POLICY "tx delete" ON public.financial_transactions FOR DELETE TO authenticated
  USING ((patient_id IS NOT NULL AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))) OR (patient_id IS NULL AND public.has_role(auth.uid(), 'admin')));
CREATE TRIGGER trg_financial_tx_updated BEFORE UPDATE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
