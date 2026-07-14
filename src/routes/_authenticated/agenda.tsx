import { createFileRoute } from '@tanstack/react-router'
import { CalendarDays } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/agenda')({
  head: () => ({ meta: [{ title: 'Agenda — NeuroFlux' }] }),
  component: AgendaPage,
})

function AgendaPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-primary">Agenda</p>
        <h1 className="font-serif text-3xl font-semibold">Sessões planejadas</h1>
      </div>
      <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-12 text-center">
        <CalendarDays className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          O planejamento de sessões será habilitado na próxima etapa.
        </p>
      </div>
    </div>
  )
}
