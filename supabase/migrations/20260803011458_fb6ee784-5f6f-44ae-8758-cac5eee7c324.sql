
ALTER TABLE public.test_tasks ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.test_tasks.checklist IS 'Checklist de atividades para a tarefa clínica.';
