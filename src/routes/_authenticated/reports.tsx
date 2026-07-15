import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { BarChart3, Clock, Users, ClipboardCheck } from 'lucide-react'
import { getClinicReports, type ReportsRange } from '@/lib/reports.functions'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_authenticated/reports')({
  beforeLoad: ({ context }) => {
    if ((context as { role?: string }).role !== 'admin') throw redirect({ to: '/kanban' })
  },
  head: () => ({ meta: [{ title: 'Relatórios — NeuroFlux' }] }),
  component: ReportsPage,
})

const RANGES: Array<{ v: ReportsRange; label: string }> = [
  { v: '30d', label: '30 dias' },
  { v: '90d', label: '90 dias' },
  { v: '180d', label: '6 meses' },
  { v: '365d', label: '12 meses' },
]

function ReportsPage() {
  const [range, setRange] = useState<ReportsRange>('90d')
  const fetchReports = useServerFn(getClinicReports)
  const q = useQuery({
    queryKey: ['reports', range],
    queryFn: () => fetchReports({ data: { range } }),
  })

  const data = q.data
  const weekMax = Math.max(1, ...(data?.weekly.map((w) => w.count) ?? [1]))
  const prodMax = Math.max(
    1,
    ...(data?.productivity.map((p) => p.sessions + p.evaluations) ?? [1]),
  )
  const testMax = Math.max(1, ...(data?.topTests.map((t) => t.count) ?? [1]))

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Relatórios</p>
          <h1 className="font-serif text-3xl font-semibold">Painel da clínica</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Produtividade por psicóloga, uso de instrumentos e tempo de correção.
          </p>
        </div>
        <div className="flex gap-1 rounded-full border bg-card p-1">
          {RANGES.map((r) => (
            <Button
              key={r.v}
              size="sm"
              variant={range === r.v ? 'default' : 'ghost'}
              className="rounded-full"
              onClick={() => setRange(r.v)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </header>

      {q.isLoading || !data ? (
        <p className="p-8 text-sm text-muted-foreground">Calculando…</p>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <StatCard icon={<Users className="h-4 w-4" />} label="Pacientes ativos" value={data.totals.activePatients} sub={`+${data.totals.newPatients} novos no período`} />
            <StatCard icon={<ClipboardCheck className="h-4 w-4" />} label="Sessões" value={data.totals.sessions} sub={`${data.totals.evaluations} avaliações`} />
            <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Testes aprovados" value={data.totals.approvedResults} sub={`${data.totals.screenings} triagens`} />
            <StatCard icon={<Clock className="h-4 w-4" />} label="Tempo médio de correção" value={`${data.avgCorrectionHours.toFixed(1)}h`} sub={`mediana ${data.medianCorrectionHours.toFixed(1)}h`} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Panel title="Sessões por semana">
              {data.weekly.length === 0 ? (
                <Empty />
              ) : (
                <div className="flex h-40 items-end gap-2">
                  {data.weekly.map((w) => (
                    <div key={w.week} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-primary/80"
                        style={{ height: `${(w.count / weekMax) * 100}%` }}
                        title={`${w.count} sessões`}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {w.week.slice(5)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Funil de correções">
              <div className="grid grid-cols-4 gap-3 text-center text-sm">
                {(
                  [
                    ['A fazer', data.funnel.todo, 'bg-muted'],
                    ['Em correção', data.funnel.correcting, 'bg-amber-500/70'],
                    ['Revisão', data.funnel.review, 'bg-blue-500/70'],
                    ['Aprovado', data.funnel.approved, 'bg-emerald-500/70'],
                  ] as const
                ).map(([label, n, cls]) => (
                  <div key={label} className="rounded-xl border p-3">
                    <div className={`mx-auto mb-2 h-2 w-full rounded ${cls}`} />
                    <p className="text-2xl font-semibold">{n}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>Presencial: {data.modality.presencial}</span>
                <span>Online: {data.modality.online}</span>
                <span>Sessões concluídas: {data.sessionStatus.done}</span>
                <span>Canceladas: {data.sessionStatus.cancelled}</span>
              </div>
            </Panel>
          </section>

          <Panel title="Produtividade por psicóloga">
            {data.productivity.length === 0 ? (
              <Empty />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="pb-2">Psicóloga</th>
                      <th className="pb-2">Volume</th>
                      <th className="pb-2 text-right">Sessões</th>
                      <th className="pb-2 text-right">Avaliações</th>
                      <th className="pb-2 text-right">Anamneses</th>
                      <th className="pb-2 text-right">Triagens</th>
                      <th className="pb-2 text-right">Testes aprovados</th>
                      <th className="pb-2 text-right">Tempo médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.productivity.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="py-2 font-medium">{p.name}</td>
                        <td className="w-40 py-2">
                          <div className="h-2 rounded bg-muted">
                            <div
                              className="h-2 rounded bg-primary"
                              style={{
                                width: `${((p.sessions + p.evaluations) / prodMax) * 100}%`,
                              }}
                            />
                          </div>
                        </td>
                        <td className="py-2 text-right">{p.sessions}</td>
                        <td className="py-2 text-right">{p.evaluations}</td>
                        <td className="py-2 text-right">{p.anamneses}</td>
                        <td className="py-2 text-right">{p.screenings}</td>
                        <td className="py-2 text-right">{p.tasksApproved}</td>
                        <td className="py-2 text-right">
                          {p.avgHours ? `${p.avgHours.toFixed(1)}h` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Instrumentos mais aplicados">
            {data.topTests.length === 0 ? (
              <Empty />
            ) : (
              <div className="flex flex-col gap-2">
                {data.topTests.map((t) => (
                  <div key={t.acronym + t.name} className="flex items-center gap-3">
                    <div className="w-24 shrink-0 text-sm font-medium">{t.acronym}</div>
                    <div className="flex-1">
                      <div className="h-2 rounded bg-muted">
                        <div
                          className="h-2 rounded bg-primary/80"
                          style={{ width: `${(t.count / testMax) * 100}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t.name} · {t.category}
                      </p>
                    </div>
                    <div className="w-10 text-right text-sm">{t.count}</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  sub?: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-2 font-serif text-3xl font-semibold">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="mb-4 text-sm font-medium text-foreground">{title}</p>
      {children}
    </div>
  )
}

function Empty() {
  return <p className="py-6 text-center text-xs text-muted-foreground">Sem dados no período.</p>
}
