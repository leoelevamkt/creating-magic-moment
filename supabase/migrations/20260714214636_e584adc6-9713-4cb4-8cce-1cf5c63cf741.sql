
-- =====================================================================
-- ENUMS
-- =====================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
CREATE TYPE public.task_status AS ENUM ('todo', 'correcting', 'review', 'approved');

-- =====================================================================
-- PROFILES
-- =====================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =====================================================================
-- USER ROLES (separate table – Lovable best practice)
-- =====================================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- =====================================================================
-- updated_at helper trigger
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================================
-- Auto-create profile + first-user-is-admin trigger on new auth.users
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first;
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first THEN 'admin'::public.app_role ELSE 'staff'::public.app_role END);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- PATIENTS
-- =====================================================================
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  cpf TEXT NOT NULL,
  schooling TEXT NOT NULL,
  city TEXT NOT NULL,
  hypotheses TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team reads patients" ON public.patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team inserts patients" ON public.patients FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Team updates patients" ON public.patients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins delete patients" ON public.patients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- TEST CATALOG (shared across the clinic)
-- =====================================================================
CREATE TABLE public.test_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  acronym TEXT,
  category TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  age_range TEXT,
  application_mode TEXT,
  estimated_minutes INTEGER,
  verified_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_catalog TO authenticated;
GRANT ALL ON public.test_catalog TO service_role;
ALTER TABLE public.test_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team reads catalog" ON public.test_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins write catalog" ON public.test_catalog FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_test_catalog_updated_at BEFORE UPDATE ON public.test_catalog FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- EVALUATIONS
-- =====================================================================
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  modality TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  synthesis TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluations TO authenticated;
GRANT ALL ON public.evaluations TO service_role;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team reads evaluations" ON public.evaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team writes evaluations" ON public.evaluations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Team updates evaluations" ON public.evaluations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins delete evaluations" ON public.evaluations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_evaluations_updated_at BEFORE UPDATE ON public.evaluations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- TEST TASKS (kanban cards)
-- =====================================================================
CREATE TABLE public.test_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.test_catalog(id) ON DELETE RESTRICT,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.task_status NOT NULL DEFAULT 'todo',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  correction_notes TEXT,
  raw_score TEXT,
  standard_score TEXT,
  classification TEXT,
  synthesis TEXT,
  admin_notes TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_tasks TO authenticated;
GRANT ALL ON public.test_tasks TO service_role;
ALTER TABLE public.test_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team reads tasks" ON public.test_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team inserts tasks" ON public.test_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team updates tasks" ON public.test_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins delete tasks" ON public.test_tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_test_tasks_updated_at BEFORE UPDATE ON public.test_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- SESSIONS PLAN (agenda)
-- =====================================================================
CREATE TABLE public.sessions_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Sessão',
  session_date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  modality TEXT NOT NULL DEFAULT 'presencial',
  planned_test_ids UUID[] NOT NULL DEFAULT '{}',
  objectives TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions_plan TO authenticated;
GRANT ALL ON public.sessions_plan TO service_role;
ALTER TABLE public.sessions_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team manages sessions" ON public.sessions_plan FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sessions_plan_updated_at BEFORE UPDATE ON public.sessions_plan FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- AUDIT LOG
-- =====================================================================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team reads audit log" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team appends audit log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);

-- =====================================================================
-- SEED: test catalog (25 SATEPSI + complementary instruments)
-- =====================================================================
INSERT INTO public.test_catalog (name, acronym, category, source, age_range, estimated_minutes, application_mode, verified_at, notes) VALUES
('Escala Wechsler de Inteligência para Adultos','WAIS-III','Inteligência','SATEPSI','16 a 89 anos',90,'Online ou presencial, conforme manual', CURRENT_DATE, 'Confirmar situação vigente no SATEPSI antes do uso.'),
('Escala Wechsler de Inteligência para Crianças','WISC-IV','Inteligência','SATEPSI','6 a 16 anos',90,'Online ou presencial, conforme manual', CURRENT_DATE, NULL),
('Teste de Atenção Concentrada','TEACO-FF','Atenção','SATEPSI','Adultos',15,'Presencial', CURRENT_DATE, NULL),
('Teste de Atenção Dividida','TEADI','Atenção','SATEPSI','Adultos',20,'Presencial', CURRENT_DATE, NULL),
('Teste de Atenção Alternada','TEALT','Atenção','SATEPSI','Adultos',20,'Presencial', CURRENT_DATE, NULL),
('Bateria Psicológica para Avaliação da Atenção','BPA','Atenção','SATEPSI','Crianças e adultos',40,'Presencial', CURRENT_DATE, NULL),
('Teste dos Cinco Dígitos','FDT','Funções executivas','SATEPSI','6 a 92 anos',15,'Presencial', CURRENT_DATE, NULL),
('Teste de Aprendizagem Auditivo-Verbal de Rey','RAVLT','Memória','Complementar','Crianças, adultos e idosos',30,'Presencial', CURRENT_DATE, NULL),
('Figura Complexa de Rey','FCR','Memória e visuoconstrução','SATEPSI','4 anos ou mais',30,'Presencial', CURRENT_DATE, NULL),
('Teste de Trilhas Coloridas','CTT','Atenção e flexibilidade','SATEPSI','Crianças e adultos',20,'Presencial', CURRENT_DATE, NULL),
('Teste de Fluência Verbal','FAS/Semântica','Linguagem e funções executivas','Complementar','Crianças e adultos',10,'Presencial', CURRENT_DATE, NULL),
('Teste de Nomeação de Boston','BNT','Linguagem','Complementar','Adultos e idosos',25,'Presencial', CURRENT_DATE, NULL),
('Escala de Inteligência Wechsler Abreviada','WASI','Inteligência','SATEPSI','6 a 89 anos',45,'Presencial', CURRENT_DATE, NULL),
('Bateria de Provas de Raciocínio','BPR-5','Raciocínio','SATEPSI','Adolescentes e adultos',60,'Presencial', CURRENT_DATE, NULL),
('Escala de Maturidade Mental Columbia','CMMS','Raciocínio não verbal','SATEPSI','3 a 9 anos',30,'Presencial', CURRENT_DATE, NULL),
('Teste de Desempenho Escolar','TDE-II','Desempenho acadêmico','SATEPSI','Escolares',60,'Presencial', CURRENT_DATE, NULL),
('Teste de Aprendizagem e Memória Infantil','TAM-I','Memória','SATEPSI','Crianças',40,'Presencial', CURRENT_DATE, NULL),
('Inventário de Funções Executivas e Regulação Infantil','IFERA-I','Funções executivas','SATEPSI','Crianças',20,'Presencial', CURRENT_DATE, NULL),
('Child Behavior Checklist','CBCL','Comportamento','Complementar','1,5 a 18 anos',20,'Questionário', CURRENT_DATE, NULL),
('Escala de Responsividade Social','SRS-2','Cognição social','SATEPSI','2,5 anos ou mais',20,'Questionário', CURRENT_DATE, NULL),
('Escala de TDAH para Adultos','ETDAH-AD','Sintomas de TDAH','SATEPSI','Adultos',20,'Questionário', CURRENT_DATE, NULL),
('Inventário de Depressão de Beck','BDI-II','Humor','SATEPSI','Adolescentes e adultos',15,'Questionário', CURRENT_DATE, NULL),
('Inventário de Ansiedade de Beck','BAI','Ansiedade','SATEPSI','Adolescentes e adultos',15,'Questionário', CURRENT_DATE, NULL),
('Montreal Cognitive Assessment','MoCA','Rastreio cognitivo','Complementar','Adultos e idosos',15,'Presencial', CURRENT_DATE, NULL),
('Mini Exame do Estado Mental','MEEM','Rastreio cognitivo','Complementar','Adultos e idosos',15,'Presencial', CURRENT_DATE, NULL);
