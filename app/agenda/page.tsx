import { addDays, format, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, X } from 'lucide-react'
import { updateSession } from '@/app/actions/clinical'
import { AppShell } from '@/components/app-shell'
import { PageHeading } from '@/components/clinical-ui'
import { SessionForm } from '@/components/session-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getAgenda, getContext } from '@/lib/dashboard-data'

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { session, profile } = await getContext()
  const { week } = await searchParams
  const offset = Number(week) || 0
  const { sessions, patients, catalog } = await getAgenda()

  const weekStart = startOfWeek(addDays(new Date(), offset * 7), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const catalogName = new Map(catalog.map((t) => [t.id, t.acronym || t.name]))

  function sessionsFor(day: Date) {
    const key = format(day, 'yyyy-MM-dd')
    return sessions
      .filter((s) => s.session.sessionDate === key)
      .sort((a, b) => (a.session.startTime || '').localeCompare(b.session.startTime || ''))
  }

  const rangeLabel = `${format(weekStart, "dd 'de' MMM", { locale: ptBR })} – ${format(addDays(weekStart, 6), "dd 'de' MMM", { locale: ptBR })}`

  return (
    <AppShell userName={session.user.name} role={profile.role}>
      <PageHeading
        eyebrow="Planejamento semanal"
        title="Agenda de sessões"
        description="Organize os atendimentos da semana e os testes que podem ser aplicados em cada sessão."
        action={<SessionForm catalog={catalog} patients={patients} />}
      />

      <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" render={<Link href={`/agenda?week=${offset - 1}`} />}>
            <ChevronLeft />
            <span className="sr-only">Semana anterior</span>
          </Button>
          <Button variant="outline" size="icon" render={<Link href={`/agenda?week=${offset + 1}`} />}>
            <ChevronRight />
            <span className="sr-only">Próxima semana</span>
          </Button>
          {offset !== 0 && (
            <Button variant="ghost" size="sm" render={<Link href="/agenda" />}>
              Hoje
            </Button>
          )}
        </div>
        <p className="flex items-center gap-2 font-serif text-lg font-semibold capitalize">
          <CalendarDays className="size-5 text-primary" />
          {rangeLabel}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        {days.map((day) => {
          const daySessions = sessionsFor(day)
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
          return (
            <div key={day.toISOString()} className="flex min-h-48 flex-col rounded-xl border bg-card">
              <div className={`flex items-center justify-between rounded-t-xl border-b px-3 py-2.5 ${isToday ? 'bg-primary/10' : ''}`}>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">{format(day, 'EEEE', { locale: ptBR })}</p>
                  <p className="font-serif text-lg font-semibold">{format(day, 'dd/MM')}</p>
                </div>
                {daySessions.length > 0 && <Badge variant="secondary">{daySessions.length}</Badge>}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-2.5">
                {daySessions.map(({ session: s, patient }) => {
                  const tests: number[] = s.plannedTestIds ? (JSON.parse(s.plannedTestIds) as (string | number)[]).map(Number) : []
                  return (
                    <article key={s.id} className={`rounded-lg border p-3 ${s.status === 'done' ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/patients/${s.patientId}`} className="text-sm font-semibold text-foreground hover:underline">
                          {patient?.name || 'Paciente'}
                        </Link>
                        <form action={updateSession}>
                          <input type="hidden" name="sessionId" value={s.id} />
                          <input type="hidden" name="action" value="delete" />
                          <button type="submit" className="text-muted-foreground hover:text-destructive" aria-label="Remover sessão">
                            <X className="size-3.5" />
                          </button>
                        </form>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{s.title}</p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {(s.startTime || s.endTime) && (
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {s.startTime}
                            {s.endTime ? `–${s.endTime}` : ''}
                          </span>
                        )}
                        <span className="flex items-center gap-1 capitalize">
                          <MapPin className="size-3" />
                          {s.modality}
                        </span>
                      </div>
                      {tests.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tests.map((id) => (
                            <Badge key={id} variant="outline" className="text-[10px]">
                              {catalogName.get(id) || 'Teste'}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {s.objectives && <p className="mt-2 text-xs text-muted-foreground">{s.objectives}</p>}
                      {s.status !== 'done' && (
                        <form action={updateSession} className="mt-2">
                          <input type="hidden" name="sessionId" value={s.id} />
                          <input type="hidden" name="action" value="done" />
                          <Button type="submit" size="sm" variant="outline" className="h-7 w-full text-xs">
                            Concluir
                          </Button>
                        </form>
                      )}
                    </article>
                  )
                })}
                {!daySessions.length && (
                  <p className="flex flex-1 items-center justify-center py-6 text-center text-xs text-muted-foreground">Sem sessões</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </AppShell>
  )
}
