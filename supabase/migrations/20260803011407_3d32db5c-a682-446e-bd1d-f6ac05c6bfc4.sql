
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb;
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
COMMENT ON COLUMN public.tasks.checklist IS 'Checklist de atividades para a tarefa no Kanban.';
