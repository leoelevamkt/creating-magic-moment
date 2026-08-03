
-- 1. Tabela de bateria padrão (apenas admin gerencia)
CREATE TABLE IF NOT EXISTS public.standard_battery (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id uuid REFERENCES public.test_catalog(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(test_id)
);

GRANT SELECT ON public.standard_battery TO authenticated;
GRANT ALL ON public.standard_battery TO service_role;

ALTER TABLE public.standard_battery ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Qualquer autenticado pode ler a bateria padrão') THEN
        CREATE POLICY "Qualquer autenticado pode ler a bateria padrão"
        ON public.standard_battery FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Apenas admins podem modificar a bateria padrão') THEN
        CREATE POLICY "Apenas admins podem modificar a bateria padrão"
        ON public.standard_battery FOR ALL TO authenticated
        USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- 2. Tabela de revisões de tarefas (backup automático)
CREATE TABLE IF NOT EXISTS public.task_revisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid REFERENCES public.test_tasks(id) ON DELETE CASCADE NOT NULL,
    author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    snapshot jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.task_revisions TO authenticated;
GRANT ALL ON public.task_revisions TO service_role;

ALTER TABLE public.task_revisions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see revisions of their tasks') THEN
        CREATE POLICY "Users can see revisions of their tasks"
        ON public.task_revisions FOR SELECT TO authenticated
        USING (
            public.has_role(auth.uid(), 'admin') OR 
            EXISTS (
                SELECT 1 FROM public.test_tasks t 
                WHERE t.id = task_id AND (t.assignee_id = auth.uid())
            )
        );
    END IF;
END $$;
