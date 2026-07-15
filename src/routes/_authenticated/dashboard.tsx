import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { ArrowRight, CalendarDays, CheckCircle2, FileCheck, Gift, Loader2, Users } from 'lucide-react'
import { format } from 'date-fns'
import { dashboardData } from '@/lib/evaluations.functions'
import { getMyProfile } from '@/lib/profile.functions'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const Route = createFileRoute('/_authenticated/dashboard')({
  beforeLoad: ({ context }) => {
    if ((context as { role?: string }).role !== 'admin') throw redirect({ to: '/kanban' })
  },
  head: () => ({ meta: [{ title: 'Painel — NeuroFlux' }] }),
  component: Dashboard,
})

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  todo: { label: 'A fazer', variant: 'secondary' },
  correcting: { label: 'Em correção', variant: 'outline' },
  review: { label: 'Aguardando OK', variant: 'outline' },
  approved: { label: 'Aprovado', variant: 'default' },
}

function Dashboard() {
  const dash = useServerFn(dashboardData)
  const profile = useServerFn(getMyProfile)
  const d = useQuery({ queryKey: ['dashboard'], queryFn: () => dash() })
  const p = useQuery({ queryKey: ['profile'], queryFn: () => profile() })

  const cards = [
    { label: 'Pacientes ativos', hint: 'em acompanhamento', value: d.data?.patients ?? 0, icon: Users },
    { label: 'Em correção', hint: 'testes em andamento', value: d.data?.inCorrection ?? 0, icon: Loader2 },
    { label: 'Aguardando seu OK', hint: 'tarefas para revisar', value: d.data?.awaitingAdmin ?? 0, icon: FileCheck },
    { label: 'Aprovados', hint: 'tarefas concluídas', value: d.data?.approved ?? 0, icon: CheckCircle2 },
  ]

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header>
        <p className="text-sm font-medium text-primary">Visão geral</p>
        <h1 className="font-serif text-3xl font-semibold">
          Olá, {p.data?.name ?? 'clínica'}
        </h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="rounded-2xl border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="mt-2 font-serif text-4xl font-semibold">{c.value}</p>
                </div>
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon size={18} />
                </span>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">{c.hint}</p>
            </div>
          )
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-semibold">Atividade clínica</h2>
              <p className="text-sm text-muted-foreground">Últimas tarefas e revisões</p>
            </div>
            <Link
              to="/kanban"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver quadro <ArrowRight size={14} />
            </Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Teste</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(d.data?.activity ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma atividade registrada ainda.
                  </TableCell>
                </TableRow>
              ) : (
                (d.data?.activity ?? []).map((t) => {
                  const s = statusMap[t.status] ?? { label: t.status, variant: 'secondary' as const }
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        {(t.patients as { name: string } | null)?.name ?? '—'}
                      </TableCell>
                      <TableCell>{(t.test_catalog as { acronym: string | null } | null)?.acronym ?? '—'}</TableCell>
                      <TableCell>
                        {t.scheduled_at ? format(new Date(t.scheduled_at), "dd MMM, HH:mm") : '—'}
                      </TableCell>
                      <TableCell>{t.duration_minutes ? `${t.duration_minutes} min` : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border bg-card p-6">
            <h2 className="font-serif text-2xl font-semibold">Próximas aplicações</h2>
            <div className="mt-4 flex flex-col gap-3">
              {(d.data?.upcoming ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma sessão agendada.</p>
              ) : (
                (d.data?.upcoming ?? []).map((s) => (
                  <div key={s.id} className="flex items-start gap-3 rounded-xl border p-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CalendarDays size={16} />
                    </span>
                    <div className="min-w-0 text-sm">
                      <p className="truncate font-semibold">
                        {(s.patients as { name: string } | null)?.name ?? '—'}
                      </p>
                      <p className="text-muted-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(s.session_date), 'dd/MM')} {s.start_time ? `às ${s.start_time}` : ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-6">
            <div className="flex items-center gap-2">
              <Gift size={18} className="text-primary" />
              <h2 className="font-serif text-2xl font-semibold">Aniversariantes do mês</h2>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {(d.data?.birthdays ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum aniversariante este mês.</p>
              ) : (
                (d.data?.birthdays ?? []).map((b) => (
                  <Link
                    key={b.id}
                    to="/patients/$id"
                    params={{ id: b.id }}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/60"
                  >
                    <span className="truncate font-medium">{b.name}</span>
                    <span className="text-xs font-semibold text-primary">
                      dia {String(b.day).padStart(2, '0')}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}
