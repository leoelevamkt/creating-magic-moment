
-- has_role must be SECURITY DEFINER to avoid RLS recursion on user_roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_team(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (select 1 from public.user_roles where user_id = _uid and role in ('admin','staff'))
$$;
REVOKE ALL ON FUNCTION public.is_team(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team(uuid) TO authenticated, service_role;

-- Clinical tables: restrict reads to team
DROP POLICY IF EXISTS "Team reads anamneses" ON public.anamneses;
CREATE POLICY "Team reads anamneses" ON public.anamneses FOR SELECT TO authenticated USING (public.is_team(auth.uid()));

DROP POLICY IF EXISTS "Team reads evaluations" ON public.evaluations;
CREATE POLICY "Team reads evaluations" ON public.evaluations FOR SELECT TO authenticated USING (public.is_team(auth.uid()));

DROP POLICY IF EXISTS "docs select" ON public.patient_documents;
CREATE POLICY "docs select" ON public.patient_documents FOR SELECT TO authenticated USING (public.is_team(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view patient notes" ON public.patient_notes;
CREATE POLICY "Team can view patient notes" ON public.patient_notes FOR SELECT TO authenticated USING (public.is_team(auth.uid()));

DROP POLICY IF EXISTS "Team reads patients" ON public.patients;
CREATE POLICY "Team reads patients" ON public.patients FOR SELECT TO authenticated USING (public.is_team(auth.uid()));

DROP POLICY IF EXISTS "Team reads screenings" ON public.screenings;
CREATE POLICY "Team reads screenings" ON public.screenings FOR SELECT TO authenticated USING (public.is_team(auth.uid()));

DROP POLICY IF EXISTS "Team reads tasks" ON public.test_tasks;
CREATE POLICY "Team reads tasks" ON public.test_tasks FOR SELECT TO authenticated USING (public.is_team(auth.uid()));

-- Audit log: team only
DROP POLICY IF EXISTS "Team reads audit log" ON public.audit_log;
CREATE POLICY "Team reads audit log" ON public.audit_log FOR SELECT TO authenticated USING (public.is_team(auth.uid()));

-- Financial transactions
DROP POLICY IF EXISTS "tx select" ON public.financial_transactions;
CREATE POLICY "tx select" ON public.financial_transactions FOR SELECT TO authenticated
USING (public.is_team(auth.uid()) AND ((patient_id IS NOT NULL) OR public.has_role(auth.uid(),'admin')));

DROP POLICY IF EXISTS "tx insert" ON public.financial_transactions;
CREATE POLICY "tx insert" ON public.financial_transactions FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND public.is_team(auth.uid()) AND ((patient_id IS NOT NULL) OR public.has_role(auth.uid(),'admin')));

-- user_roles: own row or admin
DROP POLICY IF EXISTS "Authenticated read user_roles" ON public.user_roles;
CREATE POLICY "Read own roles or admin" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Storage: patient-documents restricted to team
DROP POLICY IF EXISTS "storage read patient docs" ON storage.objects;
CREATE POLICY "storage read patient docs" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'patient-documents' AND public.is_team(auth.uid()));

DROP POLICY IF EXISTS "storage insert patient docs" ON storage.objects;
CREATE POLICY "storage insert patient docs" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'patient-documents' AND public.is_team(auth.uid()));

DROP POLICY IF EXISTS "storage update patient docs" ON storage.objects;
CREATE POLICY "storage update patient docs" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'patient-documents' AND public.is_team(auth.uid()))
WITH CHECK (bucket_id = 'patient-documents' AND public.is_team(auth.uid()));

DROP POLICY IF EXISTS "storage delete patient docs" ON storage.objects;
CREATE POLICY "storage delete patient docs" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'patient-documents' AND (public.has_role(auth.uid(),'admin') OR owner = auth.uid()));

-- Garantir que as funções de segurança são acessíveis apenas por quem deve
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_team(uuid) TO authenticated, service_role;

-- Reforçar permissões na tabela de pacientes para evitar erros de RLS no update
DROP POLICY IF EXISTS "Team updates patients" ON public.patients;
CREATE POLICY "Team updates patients" ON public.patients 
  FOR UPDATE TO authenticated 
  USING (public.is_team(auth.uid()))
  WITH CHECK (public.is_team(auth.uid()));

-- Garantir GRANTs na tabela patients
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
