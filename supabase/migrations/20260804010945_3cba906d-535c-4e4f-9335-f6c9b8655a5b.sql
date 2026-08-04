DROP POLICY IF EXISTS "Authenticated read profiles" ON public.profiles;
CREATE POLICY "Team reads profiles" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_team(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can add custom pending tests" ON public.test_catalog;
CREATE POLICY "Team can add custom pending tests" ON public.test_catalog FOR INSERT TO authenticated
WITH CHECK (source = 'custom' AND status = 'pending' AND public.is_team(auth.uid()));