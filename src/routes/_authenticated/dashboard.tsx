import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BrainCircuit, LogOut, Sparkles } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/dashboard')({
  head: () => ({ meta: [{ title: 'Painel — NeuroFlux' }] }),
  component: Dashboard,
})

function Dashboard() {
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()

  async function signOut() {
    await supabase.auth.signOut()
    toast.success('Sessão encerrada.')
    navigate({ to: '/auth', replace: true })
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-8 p-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-primary">
          <BrainCircuit size={28} />
          <span className="font-serif text-2xl font-semibold">NeuroFlux</span>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>
          <LogOut />
          Sair
        </Button>
      </header>

      <section className="rounded-2xl border border-primary/25 bg-primary/5 p-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Sparkles size={16} /> Migração em andamento
        </div>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-foreground">
          Bem-vinda, {user?.email}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          O login e o banco de dados já estão funcionando aqui no Lovable. A próxima etapa é
          reconstruir as telas de <strong>pacientes, agenda, quadro clínico, catálogo e
          configurações</strong>, além da integração com a IA para a síntese neuropsicológica. Vou
          fazer isso na próxima mensagem.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {[
          { title: 'Autenticação', done: true, desc: 'E-mail e senha via Lovable Cloud' },
          { title: 'Banco de dados', done: true, desc: 'Pacientes, avaliações, tarefas, sessões, catálogo, papéis (RLS ativa)' },
          { title: 'Rotas clínicas', done: false, desc: 'Pacientes, prontuário, agenda, kanban, catálogo, configurações' },
          { title: 'IA — síntese', done: false, desc: 'Classificação e síntese com Lovable AI Gateway' },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">{item.title}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.done ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}
              >
                {item.done ? 'Pronto' : 'Em fila'}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </section>
    </main>
  )
}
