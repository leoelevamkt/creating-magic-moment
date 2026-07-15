-- 1) Permitir que funcionárias acessem anamneses e triagens dos pacientes
DROP POLICY IF EXISTS "anamneses admin read" ON public.anamneses;
DROP POLICY IF EXISTS "anamneses admin insert" ON public.anamneses;
DROP POLICY IF EXISTS "anamneses admin update" ON public.anamneses;
DROP POLICY IF EXISTS "anamneses admin delete" ON public.anamneses;
CREATE POLICY "Team reads anamneses" ON public.anamneses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team writes anamneses" ON public.anamneses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team updates anamneses" ON public.anamneses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins delete anamneses" ON public.anamneses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "screenings admin read" ON public.screenings;
DROP POLICY IF EXISTS "screenings admin insert" ON public.screenings;
DROP POLICY IF EXISTS "screenings admin update" ON public.screenings;
DROP POLICY IF EXISTS "screenings admin delete" ON public.screenings;
CREATE POLICY "Team reads screenings" ON public.screenings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team writes screenings" ON public.screenings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team updates screenings" ON public.screenings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins delete screenings" ON public.screenings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2) Ponto digital / registro de horas de trabalho
CREATE TABLE public.work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_sessions TO authenticated;
GRANT ALL ON public.work_sessions TO service_role;
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own work sessions" ON public.work_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own work sessions" ON public.work_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own work sessions" ON public.work_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users delete own or admin" ON public.work_sessions FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Impede sobreposição de sessões em aberto por usuário
CREATE UNIQUE INDEX work_sessions_one_open_per_user ON public.work_sessions (user_id) WHERE ended_at IS NULL;
CREATE INDEX work_sessions_user_started_idx ON public.work_sessions (user_id, started_at DESC);

CREATE TRIGGER work_sessions_set_updated_at BEFORE UPDATE ON public.work_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();