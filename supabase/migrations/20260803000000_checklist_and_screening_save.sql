-- Adicionar suporte a checklist no quadro clínico
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb;

-- Garantir que a triagem tenha suporte a salvamento automático (já tem updated_at, mas vamos garantir o campo de versão ou rascunho se necessário)
-- Por enquanto, apenas habilitar as permissões se necessário (já existem políticas de RLS, mas vamos reforçar)
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.screenings TO authenticated;

-- Comentários para documentação
COMMENT ON COLUMN public.tasks.checklist IS 'Checklist de atividades para a tarefa no Kanban.';
