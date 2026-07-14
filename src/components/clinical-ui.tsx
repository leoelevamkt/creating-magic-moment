import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowRight, CalendarDays, CheckCircle2, CircleDot, Clock3, FileCheck2, UserRound, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type DashboardTask = { task: { id: number; status: string; scheduledAt: Date | null; durationMinutes: number | null; correctionNotes: string | null; adminNotes: string | null; approvedAt: Date | null }; patient: { id: number; name: string } | null; test: { name: string; acronym: string | null } | null }

const statusLabel: Record<string, string> = { todo: 'A fazer', correcting: 'Em correção', review: 'Aguardando admin', approved: 'Aprovado' }

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div>{eyebrow && <p className="mb-2 text-sm font-semibold text-primary">{eyebrow}</p>}<h1 className="text-balance font-serif text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p></div>{action}</div>
}

export function SummaryCards({ patients, tasks }: { patients: number; tasks: DashboardTask[] }) {
  const review = tasks.filter(({ task }) => task.status === 'review').length
  const correcting = tasks.filter(({ task }) => task.status === 'correcting').length
  const approved = tasks.filter(({ task }) => task.status === 'approved').length
  const cards = [
    { label: 'Pacientes ativos', value: patients, helper: 'em acompanhamento', icon: Users },
    { label: 'Em correção', value: correcting, helper: 'testes em andamento', icon: CircleDot },
    { label: 'Aguardando seu OK', value: review, helper: 'tarefas para revisar', icon: FileCheck2 },
    { label: 'Aprovados', value: approved, helper: 'tarefas concluídas', icon: CheckCircle2 },
  ]
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, helper, icon: Icon }) => <Card key={label} className="border-border/70 shadow-none"><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 font-serif text-3xl font-semibold text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{helper}</p></div><span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary"><Icon size={20} /></span></CardContent></Card>)}</div>
}

export function TaskTable({ tasks }: { tasks: DashboardTask[] }) {
  return <Card className="shadow-none"><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="font-serif text-xl">Atividade clínica</CardTitle><p className="mt-1 text-sm text-muted-foreground">Últimas tarefas e revisões</p></div><Button render={<Link href="/kanban" />} nativeButton={false} variant="ghost">Ver quadro <ArrowRight /></Button></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-y bg-muted/45 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-6 py-3 font-medium">Paciente</th><th className="px-4 py-3 font-medium">Teste</th><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Duração</th><th className="px-6 py-3 font-medium">Status</th></tr></thead><tbody>{tasks.slice(0, 7).map(({ task, patient, test }) => <tr key={task.id} className="border-b last:border-0"><td className="px-6 py-4 font-medium text-foreground">{patient?.name ?? 'Paciente removido'}</td><td className="px-4 py-4 text-muted-foreground">{test?.acronym || test?.name || 'Teste removido'}</td><td className="px-4 py-4 text-muted-foreground">{task.scheduledAt ? format(task.scheduledAt, "dd MMM, HH:mm", { locale: ptBR }) : 'A definir'}</td><td className="px-4 py-4 text-muted-foreground">{task.durationMinutes ? `${task.durationMinutes} min` : '—'}</td><td className="px-6 py-4"><Badge variant={task.status === 'approved' ? 'default' : 'secondary'}>{statusLabel[task.status] ?? task.status}</Badge></td></tr>)}{!tasks.length && <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Nenhuma tarefa ainda. Crie uma avaliação para começar.</td></tr>}</tbody></table></div></CardContent></Card>
}

export function Upcoming({ tasks }: { tasks: DashboardTask[] }) {
  const upcoming = tasks.filter(({ task }) => task.scheduledAt).slice(0, 4)
  return <Card className="h-full shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Próximas aplicações</CardTitle></CardHeader><CardContent className="flex flex-col gap-5">{upcoming.map(({ task, patient, test }) => <div key={task.id} className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><CalendarDays size={18} /></span><div><p className="text-sm font-medium text-foreground">{patient?.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{test?.acronym || test?.name}</p><p className="mt-1 flex items-center gap-1 text-xs text-primary"><Clock3 size={12} />{task.scheduledAt && format(task.scheduledAt, "dd/MM 'às' HH:mm")}</p></div></div>)}{!upcoming.length && <div className="flex flex-col items-center gap-3 py-8 text-center"><UserRound className="text-muted-foreground" /><p className="text-sm text-muted-foreground">Nenhuma aplicação agendada.</p></div>}</CardContent></Card>
}
