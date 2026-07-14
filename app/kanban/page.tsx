import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarClock, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { PageHeading, type DashboardTask } from '@/components/clinical-ui'
import { EvaluationForm } from '@/components/evaluation-form'
import { TaskAction } from '@/components/task-actions'
import { Badge } from '@/components/ui/badge'
import { getContext, getDashboardData } from '@/lib/dashboard-data'

const columns = [
  { key: 'todo', title: 'A fazer', icon: CalendarClock },
  { key: 'correcting', title: 'Em correção', icon: Clock3 },
  { key: 'review', title: 'Aguardando OK do admin', icon: ShieldCheck },
  { key: 'approved', title: 'Aprovado', icon: CheckCircle2 },
] as const

export default async function KanbanPage() {
  const { session, profile } = await getContext()
  const data = await getDashboardData()

  return (
    <AppShell userName={session.user.name} role={profile.role}>
      <PageHeading
        eyebrow="Fluxo de correções"
        title="Quadro clínico"
        description="Acompanhe cada teste desde a aplicação até o OK final do admin, com paciente, data, horário e duração registrados."
        action={<EvaluationForm catalog={data.catalog} patients={data.patients} triggerLabel="Nova tarefa" />}
      />
      <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {columns.map(({ key, title, icon: Icon }) => {
          const tasks = data.tasks.filter(({ task }) => task.status === key)
          return (
            <section key={key} className="rounded-xl bg-muted/45 p-3">
              <header className="mb-3 flex items-center justify-between px-1 py-2">
                <div className="flex items-center gap-2">
                  <Icon size={17} className="text-primary" />
                  <h2 className="text-sm font-semibold">{title}</h2>
                </div>
                <Badge variant="secondary">{tasks.length}</Badge>
              </header>
              <div className="flex flex-col gap-3">
                {tasks.map((row) => (
                  <TaskCard key={row.task.id} row={row} isAdmin={profile.role === 'admin'} columnKey={key} />
                ))}
                {!tasks.length && (
                  <div className="rounded-xl border border-dashed bg-background/60 p-6 text-center text-xs text-muted-foreground">
                    Nenhuma tarefa nesta etapa.
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </AppShell>
  )
}

function TaskCard({ row, isAdmin, columnKey }: { row: DashboardTask; isAdmin: boolean; columnKey: string }) {
  const { task, patient, test } = row
  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-primary">{test?.acronym || 'Teste'}</p>
          <h3 className="mt-1 font-medium text-foreground">{patient?.name ?? 'Paciente removido'}</h3>
        </div>
        {task.durationMinutes ? <Badge variant="outline">{task.durationMinutes} min</Badge> : null}
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{test?.name}</p>
      <div className="mt-4 flex flex-col gap-1 border-t pt-3 text-xs text-muted-foreground">
        <span>{task.scheduledAt ? format(task.scheduledAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Data a definir'}</span>
        {task.correctionNotes && <span className="line-clamp-2">Correção: {task.correctionNotes}</span>}
        {task.adminNotes && <span className="line-clamp-2">Admin: {task.adminNotes}</span>}
      </div>
      <div className="mt-4">
        {columnKey === 'todo' && <TaskAction taskId={task.id} action="start" label="Iniciar correção" fullWidth />}
        {columnKey === 'correcting' && <TaskAction taskId={task.id} action="submit" label="Enviar ao admin" withNotes fullWidth />}
        {columnKey === 'review' &&
          (isAdmin ? (
            <div className="flex gap-2">
              <TaskAction taskId={task.id} action="approve" label="Dar OK" withNotes />
              <TaskAction taskId={task.id} action="return" label="Devolver" withNotes variant="outline" />
            </div>
          ) : (
            <p className="rounded-lg bg-secondary/60 px-3 py-2 text-center text-xs text-muted-foreground">Aguardando OK do admin</p>
          ))}
        {columnKey === 'approved' && task.approvedAt && (
          <p className="flex items-center justify-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-center text-xs font-medium text-primary">
            <CheckCircle2 size={13} />
            Aprovado em {format(task.approvedAt, 'dd/MM/yyyy', { locale: ptBR })}
          </p>
        )}
      </div>
    </article>
  )
}
