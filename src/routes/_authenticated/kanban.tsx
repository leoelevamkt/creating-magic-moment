import { createFileRoute } from '@tanstack/react-router'
import { ClipboardList } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/kanban')({
  head: () => ({ meta: [{ title: 'Quadro clínico — NeuroFlux' }] }),
  component: KanbanPage,
})

function KanbanPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-primary">Quadro clínico</p>
        <h1 className="font-serif text-3xl font-semibold">Fluxo de correções e revisões</h1>
      </div>
      <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-12 text-center">
        <ClipboardList className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          O kanban de tarefas clínicas será habilitado após o cadastro das primeiras
          avaliações.
        </p>
      </div>
    </div>
  )
}
