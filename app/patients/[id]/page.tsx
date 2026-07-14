import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { differenceInYears, parseISO } from 'date-fns'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { PageHeading } from '@/components/clinical-ui'
import { EvaluationForm } from '@/components/evaluation-form'
import { ResultForm } from '@/components/result-form'
import { SessionForm } from '@/components/session-form'
import { SynthesisPanel } from '@/components/synthesis-panel'
import { Badge } from '@/components/ui/badge'
import { getContext, getPatientDetail } from '@/lib/dashboard-data'

const statusInfo: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  todo: { label: 'A fazer', variant: 'outline' },
  correcting: { label: 'Em correção', variant: 'secondary' },
  review: { label: 'Aguardando OK do admin', variant: 'secondary' },
  approved: { label: 'Aprovado', variant: 'default' },
}

function age(birthDate: string) {
  try {
    return `${differenceInYears(new Date(), parseISO(birthDate))} anos`
  } catch {
    return '—'
  }
}

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { session, profile } = await getContext()
  const detail = await getPatientDetail(Number(id))
  if (!detail) notFound()
  const { patient, catalog, tasks, evaluations, sessions, history } = detail
  const resultsByEvaluation = new Map<number, number>()
  for (const { task } of tasks) {
    if (task.rawScore || task.standardScore || task.classification || task.synthesis) {
      resultsByEvaluation.set(task.evaluationId, (resultsByEvaluation.get(task.evaluationId) ?? 0) + 1)
    }
  }
  const today = format(new Date(), 'yyyy-MM-dd')
  const upcomingSessions = sessions.filter((s) => s.sessionDate >= today && s.status !== 'done').slice(0, 5)

  return (
    <AppShell userName={session.user.name} role={profile.role}>
      <PageHeading
        eyebrow="Prontuário operacional"
        title={patient.name}
        description={`${age(patient.birthDate)} · ${patient.schooling} · ${patient.city} · Nascimento: ${patient.birthDate}`}
        action={
          <div className="flex flex-wrap gap-2">
            <SessionForm catalog={catalog} fixedPatientId={patient.id} defaultDate={today} triggerLabel="Nova sessão" triggerVariant="outline" />
            <EvaluationForm catalog={catalog} fixedPatientId={patient.id} triggerLabel="Nova avaliação" />
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="flex flex-col gap-6">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="font-serif text-xl font-semibold">Dados do paciente</h2>
            <dl className="mt-5 flex flex-col gap-4 text-sm">
              <Info label="CPF" value={patient.cpf} />
              <Info label="Escolaridade" value={patient.schooling} />
              <Info label="Cidade" value={patient.city} />
              <Info label="Hipóteses diagnósticas" value={patient.hypotheses || 'Não informado'} />
              <Info label="Observações" value={patient.notes || 'Sem observações'} />
            </dl>
          </section>
          <section className="rounded-xl border bg-card p-5">
            <h2 className="font-serif text-xl font-semibold">Próximas sessões</h2>
            <div className="mt-4 flex flex-col gap-3">
              {upcomingSessions.map((s) => {
                const tests: number[] = s.plannedTestIds ? (JSON.parse(s.plannedTestIds) as (string | number)[]).map(Number) : []
                return (
                  <div key={s.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{format(parseISO(s.sessionDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                      <span className="text-xs capitalize text-muted-foreground">
                        {s.startTime ? `${s.startTime} · ` : ''}
                        {s.modality}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.title}</p>
                    {tests.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tests.map((id) => {
                          const t = catalog.find((c) => c.id === id)
                          return (
                            <Badge key={id} variant="outline" className="text-[10px]">
                              {t?.acronym || t?.name || 'Teste'}
                            </Badge>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
              {!upcomingSessions.length && <p className="text-sm text-muted-foreground">Nenhuma sessão agendada. Use “Nova sessão”.</p>}
            </div>
          </section>
          <section className="rounded-xl border bg-card p-5">
            <h2 className="font-serif text-xl font-semibold">Histórico</h2>
            <div className="mt-4 flex flex-col gap-4">
              {history.map((item) => (
                <div key={item.id} className="border-l-2 border-primary/25 pl-3">
                  <p className="text-sm font-medium text-foreground">{item.details}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(item.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              ))}
              {!history.length && <p className="text-sm text-muted-foreground">O histórico de ações aparecerá aqui.</p>}
            </div>
          </section>
        </aside>

        <section className="rounded-xl border bg-card">
          <header className="flex items-center justify-between border-b p-5">
            <div>
              <h2 className="font-serif text-xl font-semibold">Testes e correções</h2>
              <p className="mt-1 text-sm text-muted-foreground">Tudo o que foi aplicado, corrigido e aprovado para este paciente.</p>
            </div>
            <Badge variant="secondary">{tasks.length}</Badge>
          </header>
          <div className="divide-y">
            {tasks.map(({ task, test }) => {
              const info = statusInfo[task.status] ?? statusInfo.todo
              return (
                <div key={task.id} className="flex flex-col gap-3 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{test?.acronym || test?.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{test?.name}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {task.scheduledAt && <span>{format(task.scheduledAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>}
                        {task.durationMinutes ? <span>Duração: {task.durationMinutes} min</span> : null}
                        {task.approvedAt && <span>OK em {format(task.approvedAt, 'dd/MM/yyyy', { locale: ptBR })}</span>}
                      </div>
                      {task.correctionNotes && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Correção:</span> {task.correctionNotes}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={info.variant}>{info.label}</Badge>
                      <ResultForm task={task} testName={test?.acronym || test?.name || 'Teste'} />
                    </div>
                  </div>
                  {(task.rawScore || task.standardScore || task.classification || task.synthesis) && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                        {task.rawScore && <span><span className="text-muted-foreground">Bruto:</span> <span className="font-medium text-foreground">{task.rawScore}</span></span>}
                        {task.standardScore && <span><span className="text-muted-foreground">Padronizado:</span> <span className="font-medium text-foreground">{task.standardScore}</span></span>}
                        {task.classification && <span><span className="text-muted-foreground">Classificação:</span> <span className="font-medium text-foreground">{task.classification}</span></span>}
                      </div>
                      {task.synthesis && <p className="mt-2 text-sm leading-relaxed text-foreground">{task.synthesis}</p>}
                    </div>
                  )}
                </div>
              )
            })}
            {!tasks.length && (
              <p className="p-10 text-center text-sm text-muted-foreground">
                Nenhum teste selecionado. Use “Nova avaliação” para marcar os testes que serão aplicados.
              </p>
            )}
          </div>

          <div className="border-t p-5">
            <h2 className="font-serif text-xl font-semibold">Síntese integradora</h2>
            <p className="mt-1 text-sm text-muted-foreground">A IA integra os resultados registrados em uma síntese por domínios cognitivos. Sempre revise o texto.</p>
            <div className="mt-4 flex flex-col gap-4">
              {evaluations.map((ev) => (
                <SynthesisPanel
                  key={ev.id}
                  evaluationId={ev.id}
                  title={ev.title}
                  synthesis={ev.synthesis}
                  resultsCount={resultsByEvaluation.get(ev.id) ?? 0}
                />
              ))}
              {!evaluations.length && <p className="text-sm text-muted-foreground">Crie uma avaliação para gerar a síntese.</p>}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 leading-relaxed text-foreground">{value}</dd>
    </div>
  )
}
