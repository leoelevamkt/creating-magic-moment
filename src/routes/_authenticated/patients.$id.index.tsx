import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { CalendarPlus, MoreHorizontal, Pencil, Pin, PinOff, Plus, Sparkles, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  listPatientNotes,
  createPatientNote,
  updatePatientNote,
  deletePatientNote,
  listPatientPlan,
  createPatientPlanEntry,
  updatePatientPlanEntry,
  deletePatientPlanEntry,
} from '@/lib/patient-plan.functions'
import { getPatientDetail, updateTaskResult, generateEvaluationSynthesis, updatePatient, generatePatientOverallSynthesis, setPatientStatus, deletePatient } from '@/lib/patients.functions'
import { DocumentsTab } from '@/components/patients/DocumentsTab'
import { FinanceTab } from '@/components/patients/FinanceTab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter } from '@tanstack/react-router'
import { createSession } from '@/lib/sessions.functions'
import { createEvaluation } from '@/lib/evaluations.functions'
import { listCatalog } from '@/lib/profile.functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  GuardiansEmergencyFields,
  EMPTY_GUARDIAN,
  EMPTY_EMERGENCY,
  toPatientContactPayload,
  type GuardiansEmergencyValue,
} from '@/components/patients/GuardiansEmergencyFields'

export const Route = createFileRoute('/_authenticated/patients/$id/')({
  head: () => ({ meta: [{ title: 'Prontuário — NeuroFlux' }] }),
  component: PatientDetailPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl p-8 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl p-8 text-sm">Paciente não encontrado.</div>
  ),
})

function ageFromDate(d: string) {
  const b = new Date(d)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

const statusLabels: Record<string, string> = {
  todo: 'A fazer',
  correcting: 'Em correção',
  review: 'Aguardando OK',
  approved: 'Aprovado',
}

function PatientDetailPage() {
  const { id } = Route.useParams()
  const qc = useQueryClient()
  const fetchDetail = useServerFn(getPatientDetail)
  const detailQ = useQuery({
    queryKey: ['patient-detail', id],
    queryFn: () => fetchDetail({ data: { id } }),
  })

  const patient = detailQ.data?.patient
  const tasks = detailQ.data?.tasks ?? []
  const upcoming = detailQ.data?.upcoming ?? []
  const evaluations = detailQ.data?.evaluations ?? []
  const history = detailQ.data?.history ?? []

  if (detailQ.isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando prontuário…</div>
  }
  if (!patient) {
    return <div className="p-8 text-sm">Paciente não encontrado.</div>
  }

  const statusLabel =
    patient.status === 'active'
      ? 'Ativo'
      : patient.status === 'archived'
      ? 'Inativo'
      : patient.status === 'discharged'
      ? 'Alta'
      : patient.status
  const statusVariant =
    patient.status === 'active' ? 'default' : patient.status === 'discharged' ? 'secondary' : 'outline'

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-8">
      {/* HEADER */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <Link
            to="/patients"
            className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            ← Pacientes / Prontuário
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">{patient.name}</h1>
            <Badge variant={statusVariant} className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
              {statusLabel}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {ageFromDate(patient.birth_date)} anos · {patient.schooling} · {patient.city} ·{' '}
            <span className="font-medium">Nasc:</span> {patient.birth_date}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border bg-card/60 p-1 shadow-sm">
            <Button variant="ghost" size="sm" className="rounded-lg" render={<Link to="/patients/$id/anamnese" params={{ id }} />}>
              Anamnese
            </Button>
            <Button variant="ghost" size="sm" className="rounded-lg" render={<Link to="/patients/$id/triagem" params={{ id }} />}>
              Triagem
            </Button>
            <Button variant="ghost" size="sm" className="rounded-lg" render={<Link to="/patients/$id/laudo" params={{ id }} />}>
              Laudo
            </Button>
          </div>
          <EditPatientDialog patient={patient} onSaved={() => qc.invalidateQueries({ queryKey: ['patient-detail', id] })} />
          <NewSessionDialog patientId={id} onDone={() => qc.invalidateQueries({ queryKey: ['patient-detail', id] })} />
          <NewEvaluationDialog patientId={id} onDone={() => qc.invalidateQueries({ queryKey: ['patient-detail', id] })} />
          <PatientMoreMenu
            patientId={id}
            status={patient.status}
            onChanged={() => qc.invalidateQueries({ queryKey: ['patient-detail', id] })}
          />
        </div>
      </header>

      {/* CONTENT GRID 3 / 6 / 3 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT — patient facts */}
        <aside className="flex flex-col gap-6 lg:col-span-3">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-lg font-semibold">Dados do paciente</h2>
            <dl className="mt-5 grid gap-5 text-sm">
              <Info label="CPF" value={patient.cpf} />
              <Info label="Escolaridade" value={patient.schooling} />
              <Info label="Cidade" value={patient.city} />
              <Info label="Hipóteses diagnósticas" value={patient.hypotheses ?? '—'} />
              <Info label="Observações" value={patient.notes ?? 'Sem observações'} />
            </dl>
          </section>

          <ContactsCard
            hasGuardians={!!patient.has_guardians}
            guardians={patient.guardians as unknown as Array<{ name: string; phone: string; relation: string }> | null}
            emergency={patient.emergency_contact as unknown as { name: string; phone: string; relation: string } | null}
          />

          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-lg font-semibold">Próximas sessões</h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nenhuma sessão agendada.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3 text-sm">
                {upcoming.map((s) => (
                  <li key={s.id} className="rounded-lg border p-3">
                    <p className="font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.session_date} {s.start_time ? `· ${s.start_time}` : ''} · {s.modality}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        {/* CENTER — tabs */}
        <main className="flex min-w-0 flex-col gap-6 lg:col-span-6">
          <Tabs defaultValue="chart" className="w-full">
            <TabsList>
              <TabsTrigger value="chart">Prontuário</TabsTrigger>
              <TabsTrigger value="documents">Documentos</TabsTrigger>
              <TabsTrigger value="finance">Financeiro</TabsTrigger>
            </TabsList>
            <TabsContent value="chart" className="mt-4 flex flex-col gap-6">
              <NotesBoard patientId={id} />

              <OverallSynthesisCard
                patientId={id}
                synthesis={patient.overall_synthesis ?? null}
                onSaved={() => qc.invalidateQueries({ queryKey: ['patient-detail', id] })}
              />

              <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-serif text-xl font-semibold">Testes e correções</h2>
                    <p className="text-sm text-muted-foreground">
                      Tudo o que foi aplicado, corrigido e aprovado.
                    </p>
                  </div>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {tasks.length}
                  </span>
                </div>
                {tasks.length === 0 ? (
                  <p className="mt-6 text-sm text-muted-foreground">
                    Nenhum teste ainda. Use “Nova avaliação” para planejar.
                  </p>
                ) : (
                  <div className="mt-4 flex flex-col divide-y">
                    {tasks.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        onSaved={() => qc.invalidateQueries({ queryKey: ['patient-detail', id] })}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <h2 className="font-serif text-xl font-semibold">Síntese integradora</h2>
                <p className="text-sm text-muted-foreground">
                  A IA integra os resultados por domínios cognitivos. Sempre revise.
                </p>
                {evaluations.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">Nenhuma avaliação planejada ainda.</p>
                ) : (
                  <div className="mt-4 flex flex-col gap-3">
                    {evaluations.map((ev) => (
                      <SynthesisCard
                        key={ev.id}
                        evaluation={ev}
                        taskCount={tasks.filter((t) => t.evaluation_id === ev.id && (t.synthesis || t.raw_score || t.standard_score)).length}
                        onSaved={() => qc.invalidateQueries({ queryKey: ['patient-detail', id] })}
                      />
                    ))}
                  </div>
                )}
              </section>

              <EvaluationPlan patientId={id} />
            </TabsContent>
            <TabsContent value="documents" className="mt-4">
              <DocumentsTab patientId={id} />
            </TabsContent>
            <TabsContent value="finance" className="mt-4">
              <FinanceTab patientId={id} />
            </TabsContent>
          </Tabs>
        </main>

        {/* RIGHT — timeline / history */}
        <aside className="flex flex-col gap-6 lg:col-span-3">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-lg font-semibold">Histórico</h2>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Sem eventos registrados.</p>
            ) : (
              <ul className="relative mt-4 flex flex-col gap-5 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                {history.map((h, i) => (
                  <li key={i} className="relative pl-6">
                    <span
                      className={`absolute left-0 top-1.5 size-3.5 rounded-full border-[3px] border-background ${
                        i === 0 ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {format(new Date(h.at), 'dd/MM/yyyy')}
                    </p>
                    <p className="text-sm font-medium">{h.text}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(h.at), "HH:mm")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

function PatientMoreMenu({
  patientId,
  status,
  onChanged,
}: {
  patientId: string
  status: string
  onChanged: () => void
}) {
  const router = useRouter()
  const setStatus = useServerFn(setPatientStatus)
  const removePatient = useServerFn(deletePatient)
  const statusMut = useMutation({
    mutationFn: (s: 'active' | 'archived' | 'discharged') => setStatus({ data: { id: patientId, status: s } }),
    onSuccess: () => {
      toast.success('Status atualizado.')
      onChanged()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const delMut = useMutation({
    mutationFn: () => removePatient({ data: { id: patientId } }),
    onSuccess: () => {
      toast.success('Paciente excluído.')
      router.navigate({ to: '/patients' })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const isActive = status === 'active'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon" aria-label="Mais ações">
            <MoreHorizontal className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onSelect={() => statusMut.mutate(isActive ? 'archived' : 'active')}
          disabled={statusMut.isPending}
        >
          {isActive ? 'Desativar paciente' : 'Ativar paciente'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => {
            if (
              confirm(
                'Excluir permanentemente este paciente e todos os seus dados? Esta ação não pode ser desfeita.',
              )
            ) {
              delMut.mutate()
            }
          }}
          disabled={delMut.isPending}
        >
          <Trash2 className="mr-2 size-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  )
}

type Task = NonNullable<ReturnType<typeof useTasksType>>[number]
function useTasksType() {
  return undefined as unknown as Awaited<ReturnType<typeof getPatientDetail>>['tasks']
}

function TaskRow({ task, onSaved }: { task: Task; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const cat = (task.test_catalog as { acronym: string | null; name: string; category: string } | null)
  const save = useServerFn(updateTaskResult)
  const mut = useMutation({
    mutationFn: (v: {
      raw_score: string
      standard_score: string
      classification: string
      correction_notes: string
      synthesis: string
      markCompleted: boolean
    }) => save({ data: { id: task.id, ...v } }),
    onSuccess: () => {
      toast.success('Resultado salvo.')
      setOpen(false)
      onSaved()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const hasResult = Boolean(task.synthesis || task.raw_score || task.standard_score || task.classification)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mut.mutate({
      raw_score: String(fd.get('raw_score') ?? ''),
      standard_score: String(fd.get('standard_score') ?? ''),
      classification: String(fd.get('classification') ?? ''),
      correction_notes: String(fd.get('correction_notes') ?? ''),
      synthesis: String(fd.get('synthesis') ?? ''),
      markCompleted: fd.get('markCompleted') === 'on',
    })
  }

  return (
    <div className="flex flex-col gap-2 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{cat?.acronym ?? '—'}</p>
          <p className="text-sm text-muted-foreground">{cat?.name}</p>
          {task.scheduled_at ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {format(new Date(task.scheduled_at), "dd/MM/yyyy 'às' HH:mm")}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{statusLabels[task.status] ?? task.status}</Badge>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" variant={hasResult ? 'default' : 'outline'} />}>
              {hasResult ? 'Editar resultado' : 'Registrar resultado'}
            </DialogTrigger>
            <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">
                  {cat?.acronym} — Resultado
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="grid gap-4 pt-2 sm:grid-cols-3">
                <FieldSmall label="Escore bruto" name="raw_score" defaultValue={task.raw_score ?? ''} />
                <FieldSmall label="Padronizado" name="standard_score" defaultValue={task.standard_score ?? ''} />
                <FieldSmall label="Classificação" name="classification" defaultValue={task.classification ?? ''} />
                <AreaSmall label="Notas de correção" name="correction_notes" defaultValue={task.correction_notes ?? ''} />
                <AreaSmall label="Síntese do teste" name="synthesis" defaultValue={task.synthesis ?? ''} />
                <div className="flex items-center gap-2 sm:col-span-3">
                  <Checkbox id="markCompleted" name="markCompleted" defaultChecked={task.status === 'todo'} />
                  <Label htmlFor="markCompleted" className="text-sm">
                    Marcar como concluído (enviar para OK do admin)
                  </Label>
                </div>
                <div className="flex justify-end sm:col-span-3">
                  <Button type="submit" disabled={mut.isPending}>
                    {mut.isPending ? 'Salvando…' : 'Salvar resultado'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {task.synthesis ? (
        <p className="rounded-lg bg-muted/50 p-3 text-sm text-foreground/90">{task.synthesis}</p>
      ) : null}
    </div>
  )
}

function FieldSmall({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} className="text-xs">{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} />
    </div>
  )
}
function AreaSmall({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <div className="flex flex-col gap-1.5 sm:col-span-3">
      <Label htmlFor={name} className="text-xs">{label}</Label>
      <Textarea id={name} name={name} rows={4} defaultValue={defaultValue} />
    </div>
  )
}

type Evaluation = Awaited<ReturnType<typeof getPatientDetail>>['evaluations'][number]

function SynthesisCard({ evaluation, taskCount, onSaved }: { evaluation: Evaluation; taskCount: number; onSaved: () => void }) {
  const gen = useServerFn(generateEvaluationSynthesis)
  const mut = useMutation({
    mutationFn: () => gen({ data: { evaluationId: evaluation.id } }),
    onSuccess: () => {
      toast.success('Síntese gerada.')
      onSaved()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{evaluation.title}</p>
          <p className="text-xs text-muted-foreground">
            {taskCount} teste(s) com resultado registrado
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            if (taskCount === 0) {
              toast.error('Registre pelo menos um resultado antes de gerar a síntese.')
              return
            }
            mut.mutate()
          }}
          disabled={mut.isPending || taskCount === 0}
        >
          <Sparkles /> {mut.isPending ? 'Gerando…' : 'Gerar síntese com IA'}
        </Button>
      </div>
      {evaluation.synthesis ? (
        <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm">{evaluation.synthesis}</p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Nenhuma síntese gerada ainda. Clique em “Gerar síntese com IA”.
        </p>
      )}
    </div>
  )
}

function NewSessionDialog({ patientId, onDone }: { patientId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const create = useServerFn(createSession)
  const mut = useMutation({
    mutationFn: (v: {
      title: string
      sessionDate: string
      startTime: string
      endTime: string
      modality: 'presencial' | 'online'
      objectives: string
      notes: string
    }) => create({ data: { patientId, plannedTestIds: [], ...v } }),
    onSuccess: () => {
      toast.success('Sessão agendada.')
      setOpen(false)
      onDone()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mut.mutate({
      title: String(fd.get('title') ?? ''),
      sessionDate: String(fd.get('sessionDate') ?? ''),
      startTime: String(fd.get('startTime') ?? ''),
      endTime: String(fd.get('endTime') ?? ''),
      modality: (String(fd.get('modality') ?? 'presencial') as 'presencial' | 'online'),
      objectives: String(fd.get('objectives') ?? ''),
      notes: String(fd.get('notes') ?? ''),
    })
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <CalendarPlus /> Nova sessão
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Nova sessão</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 pt-2 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Título</Label>
            <Input name="title" defaultValue="Sessão clínica" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Data</Label>
            <Input type="date" name="sessionDate" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Modalidade</Label>
            <select name="modality" className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue="presencial">
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Início</Label>
            <Input type="time" name="startTime" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Fim</Label>
            <Input type="time" name="endTime" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Objetivos</Label>
            <Textarea name="objectives" rows={2} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Notas</Label>
            <Textarea name="notes" rows={2} />
          </div>
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? 'Agendando…' : 'Agendar sessão'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function NewEvaluationDialog({ patientId, onDone }: { patientId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const create = useServerFn(createEvaluation)
  const catalogFn = useServerFn(listCatalog)
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: () => catalogFn(), enabled: open })
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const grouped = useMemo(() => {
    const map = new Map<string, Array<{ id: string; name: string; acronym: string | null }>>()
    for (const t of catalog.data ?? []) {
      const arr = map.get(t.category) ?? []
      arr.push({ id: t.id, name: t.name, acronym: t.acronym })
      map.set(t.category, arr)
    }
    return Array.from(map.entries())
  }, [catalog.data])

  const mut = useMutation({
    mutationFn: (v: { title: string; modality: 'presencial' | 'online'; scheduledAt: string | null; testIds: string[] }) =>
      create({ data: { patientId, ...v } }),
    onSuccess: () => {
      toast.success('Avaliação planejada.')
      setOpen(false)
      setSelected(new Set())
      onDone()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (selected.size === 0) return toast.error('Selecione ao menos um teste.')
    const fd = new FormData(e.currentTarget)
    mut.mutate({
      title: String(fd.get('title') ?? 'Avaliação neuropsicológica'),
      modality: (String(fd.get('modality') ?? 'presencial') as 'presencial' | 'online'),
      scheduledAt: String(fd.get('scheduledAt') ?? '') || null,
      testIds: Array.from(selected),
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus /> Nova avaliação
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Planejar avaliação</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 pt-2">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div className="flex flex-col gap-1.5">
              <Label>Nome da avaliação</Label>
              <Input name="title" defaultValue="Avaliação neuropsicológica" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Modalidade</Label>
              <select name="modality" defaultValue="presencial" className="h-10 rounded-md border bg-background px-3 text-sm">
                <option value="presencial">presencial</option>
                <option value="online">online</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Data e horário</Label>
            <Input type="datetime-local" name="scheduledAt" />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Testes a aplicar ({selected.size})</Label>
            {catalog.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando catálogo…</p>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-lg border p-3">
                {grouped.map(([cat, items]) => (
                  <div key={cat} className="mb-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{cat}</p>
                    <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                      {items.map((t) => (
                        <li key={t.id}>
                          <label className="flex cursor-pointer items-center gap-2 rounded p-1 text-sm hover:bg-muted/50">
                            <Checkbox
                              checked={selected.has(t.id)}
                              onCheckedChange={() => toggle(t.id)}
                            />
                            <span>
                              <span className="font-medium">{t.acronym ?? '—'}</span>{' '}
                              <span className="text-muted-foreground">{t.name}</span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? 'Planejando…' : 'Planejar avaliação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type PatientData = NonNullable<Awaited<ReturnType<typeof getPatientDetail>>['patient']>

type GuardianRec = { name: string; phone: string; relation: string }
type EmergencyRec = { name: string; phone: string; relation: string }

function ContactsCard({
  hasGuardians,
  guardians,
  emergency,
}: {
  hasGuardians: boolean
  guardians: GuardianRec[] | null
  emergency: EmergencyRec | null
}) {
  const list = Array.isArray(guardians) ? guardians : []
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="font-serif text-xl font-semibold">Responsáveis e emergência</h2>
      <div className="mt-3 text-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Responsáveis</p>
        {hasGuardians && list.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-2">
            {list.map((g, i) => (
              <li key={i} className="rounded-lg border bg-background p-2">
                <p className="font-medium">{g.name} <span className="text-xs text-muted-foreground">· {g.relation}</span></p>
                <p className="text-xs text-muted-foreground">{g.phone}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-muted-foreground">Sem responsáveis cadastrados.</p>
        )}
      </div>
      <div className="mt-4 text-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Contato de emergência</p>
        {emergency && emergency.name ? (
          <div className="mt-2 rounded-lg border bg-background p-2">
            <p className="font-medium">{emergency.name} <span className="text-xs text-muted-foreground">· {emergency.relation}</span></p>
            <p className="text-xs text-muted-foreground">{emergency.phone}</p>
          </div>
        ) : (
          <p className="mt-1 text-muted-foreground">Não informado.</p>
        )}
      </div>
    </section>
  )
}

function EditPatientDialog({ patient, onSaved }: { patient: PatientData; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const save = useServerFn(updatePatient)
  const initialGuardians = Array.isArray(patient.guardians) ? (patient.guardians as unknown as GuardianRec[]) : []
  const initialEmergency = (patient.emergency_contact as unknown as EmergencyRec | null) ?? null
  const [contact, setContact] = useState<GuardiansEmergencyValue>({
    hasGuardians: !!patient.has_guardians,
    guardians: initialGuardians.length > 0 ? initialGuardians : (patient.has_guardians ? [{ ...EMPTY_GUARDIAN }] : []),
    emergencyContact: initialEmergency ?? { ...EMPTY_EMERGENCY },
  })
  const mut = useMutation({
    mutationFn: (v: {
      name: string; birthDate: string; cpf: string; schooling: string; city: string;
      hypotheses: string; notes: string;
      hasGuardians: boolean;
      guardians: GuardianRec[];
      emergencyContact: EmergencyRec | null;
    }) => save({ data: { id: patient.id, ...v } }),
    onSuccess: () => {
      toast.success('Paciente atualizado.')
      setOpen(false)
      onSaved()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const contactPayload = toPatientContactPayload(contact)
    if (contact.hasGuardians && contactPayload.guardians.length === 0) {
      toast.error('Preencha ao menos um responsável ou desmarque "Possui responsável(eis)".')
      return
    }
    mut.mutate({
      name: String(fd.get('name') ?? ''),
      birthDate: String(fd.get('birthDate') ?? ''),
      cpf: String(fd.get('cpf') ?? ''),
      schooling: String(fd.get('schooling') ?? ''),
      city: String(fd.get('city') ?? ''),
      hypotheses: String(fd.get('hypotheses') ?? ''),
      notes: String(fd.get('notes') ?? ''),
      ...contactPayload,
    })
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Pencil /> Editar
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Editar paciente</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 pt-2 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Nome</Label>
            <Input name="name" defaultValue={patient.name} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Nascimento</Label>
            <Input type="date" name="birthDate" defaultValue={patient.birth_date} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>CPF</Label>
            <Input name="cpf" defaultValue={patient.cpf} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Escolaridade</Label>
            <Input name="schooling" defaultValue={patient.schooling} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Cidade</Label>
            <Input name="city" defaultValue={patient.city} required />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Hipóteses diagnósticas</Label>
            <Textarea name="hypotheses" rows={3} defaultValue={patient.hypotheses ?? ''} placeholder="Ex.: TDAH combinado; investigar comorbidade ansiosa." />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Observações clínicas</Label>
            <Textarea name="notes" rows={3} defaultValue={patient.notes ?? ''} />
          </div>
          <GuardiansEmergencyFields value={contact} onChange={setContact} />
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


function OverallSynthesisCard({ patientId, synthesis, onSaved }: { patientId: string; synthesis: string | null; onSaved: () => void }) {
  const gen = useServerFn(generatePatientOverallSynthesis)
  const mut = useMutation({
    mutationFn: () => gen({ data: { id: patientId } }),
    onSuccess: () => {
      toast.success('Síntese do caso gerada.')
      onSaved()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Síntese do caso (IA)</h2>
          <p className="text-sm text-muted-foreground">
            Integra anamnese, triagem, avaliações e testes registrados. Revise antes de usar clinicamente.
          </p>
        </div>
        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
          <Sparkles /> {mut.isPending ? 'Gerando…' : synthesis ? 'Regerar' : 'Gerar síntese'}
        </Button>
      </div>
      {synthesis ? (
        <p className="mt-4 whitespace-pre-wrap rounded-lg bg-muted/40 p-4 text-sm leading-relaxed">{synthesis}</p>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Nenhuma síntese gerada ainda. Preencha ao menos a anamnese, triagem ou alguns testes e clique em “Gerar síntese”.
        </p>
      )}
    </section>
  )
}

// ============ Notes Board ============
const NOTE_COLORS: Record<string, string> = {
  default: 'bg-card',
  yellow: 'bg-yellow-100 dark:bg-yellow-950/40',
  blue: 'bg-blue-100 dark:bg-blue-950/40',
  green: 'bg-green-100 dark:bg-green-950/40',
  pink: 'bg-pink-100 dark:bg-pink-950/40',
}

function NotesBoard({ patientId }: { patientId: string }) {
  const qc = useQueryClient()
  const listFn = useServerFn(listPatientNotes)
  const createFn = useServerFn(createPatientNote)
  const q = useQuery({
    queryKey: ['patient-notes', patientId],
    queryFn: () => listFn({ data: { patientId } }),
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['patient-notes', patientId] })
  const createMut = useMutation({
    mutationFn: (v: NoteFormValues) =>
      createFn({ data: { patientId, ...v, pinned: false } }),
    onSuccess: () => {
      toast.success('Anotação criada.')
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const notes = q.data ?? []

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Quadro de anotações</h2>
          <p className="text-sm text-muted-foreground">
            Notas rápidas sobre o paciente. Fixe as mais importantes e use o checklist para tarefas.
          </p>
        </div>
        <NoteDialog
          trigger={
            <Button size="sm" variant="outline">
              <Plus /> Nova anotação
            </Button>
          }
          onSubmit={(v) => createMut.mutate(v)}
          isPending={createMut.isPending}
        />
      </div>

      {notes.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Nenhuma anotação ainda.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} onChanged={invalidate} />
          ))}
        </div>
      )}
    </section>
  )
}

type Note = Awaited<ReturnType<typeof listPatientNotes>>[number]
type NoteFormValues = {
  title: string
  content: string
  color: string
  checklist: ChecklistItem[]
  sessionNumber: number | null
  sessionDates: string[]
  plannedTests: string
}

function NoteCard({ note, onChanged }: { note: Note; onChanged: () => void }) {
  const upd = useServerFn(updatePatientNote)
  const del = useServerFn(deletePatientNote)
  const updMut = useMutation({
    mutationFn: (v: Partial<NoteFormValues & { pinned: boolean }>) =>
      upd({ data: { id: note.id, ...v } }),
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  })
  const delMut = useMutation({
    mutationFn: () => del({ data: { id: note.id } }),
    onSuccess: () => {
      toast.success('Anotação removida.')
      onChanged()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const checklist = toChecklist(note.checklist)
  const doneCount = checklist.filter((c) => c.done).length
  const n = note as Note & {
    session_number?: number | null
    session_dates?: string[] | null
    planned_tests?: string | null
  }
  const sessionDates = Array.isArray(n.session_dates) ? n.session_dates : []
  const plannedTests = n.planned_tests ?? ''

  function toggleItem(idx: number) {
    const next = checklist.map((c, i) => (i === idx ? { ...c, done: !c.done } : c))
    updMut.mutate({ checklist: next })
  }

  function fmtDate(d: string) {
    try {
      return format(new Date(d.length <= 10 ? d + 'T00:00:00' : d), 'dd/MM/yyyy')
    } catch {
      return d
    }
  }

  return (
    <div className={`flex flex-col gap-2 rounded-xl border p-3 ${NOTE_COLORS[note.color] ?? NOTE_COLORS.default}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm">{note.title || 'Sem título'}</p>
          {n.session_number ? (
            <p className="text-[11px] font-medium text-primary">Sessão nº {n.session_number}</p>
          ) : null}
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="size-7" onClick={() => updMut.mutate({ pinned: !note.pinned })} title={note.pinned ? 'Desfixar' : 'Fixar'}>
            {note.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
          </Button>
          <NoteDialog
            trigger={
              <Button size="icon" variant="ghost" className="size-7" title="Editar">
                <Pencil className="size-3.5" />
              </Button>
            }
            initial={{
              title: note.title,
              content: note.content,
              color: note.color,
              checklist,
              sessionNumber: n.session_number ?? null,
              sessionDates,
              plannedTests,
            }}
            onSubmit={(v) => updMut.mutate(v)}
            isPending={updMut.isPending}
          />
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-destructive"
            onClick={() => {
              if (confirm('Remover esta anotação?')) delMut.mutate()
            }}
            title="Excluir"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      {sessionDates.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {sessionDates.map((d, i) => (
            <span key={i} className="rounded-full border bg-background/60 px-2 py-0.5 text-[11px]">
              {fmtDate(d)}
            </span>
          ))}
        </div>
      ) : null}
      {plannedTests ? (
        <div className="rounded-md bg-background/60 p-2 text-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">O que será aplicado</p>
          <p className="mt-0.5 whitespace-pre-wrap">{plannedTests}</p>
        </div>
      ) : null}
      {note.content ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Observações</p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground/90">{note.content}</p>
        </div>
      ) : null}
      {checklist.length > 0 ? (
        <div className="mt-1 flex flex-col gap-1.5 border-t pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Checklist · {doneCount}/{checklist.length}
          </p>
          <ul className="flex flex-col gap-1">
            {checklist.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Checkbox
                  id={`note-${note.id}-${i}`}
                  checked={c.done}
                  onCheckedChange={() => toggleItem(i)}
                  className="mt-0.5"
                />
                <label
                  htmlFor={`note-${note.id}-${i}`}
                  className={`cursor-pointer ${c.done ? 'text-muted-foreground line-through' : ''}`}
                >
                  {c.label}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {format(new Date(note.updated_at), "dd/MM/yyyy 'às' HH:mm")}
      </p>
    </div>
  )
}

function NoteDialog({
  trigger,
  initial,
  onSubmit,
  isPending,
}: {
  trigger: React.ReactNode
  initial?: NoteFormValues
  onSubmit: (v: NoteFormValues) => void
  isPending: boolean
}) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ChecklistItem[]>(initial?.checklist ?? [])
  const [newItem, setNewItem] = useState('')
  const [dates, setDates] = useState<string[]>(initial?.sessionDates ?? [])
  const [newDate, setNewDate] = useState('')

  function addItem() {
    const label = newItem.trim()
    if (!label) return
    setItems((prev) => [...prev, { label, done: false }])
    setNewItem('')
  }

  function addDate() {
    if (!newDate) return
    setDates((prev) => (prev.includes(newDate) ? prev : [...prev, newDate].sort()))
    setNewDate('')
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const rawNum = String(fd.get('session_number') ?? '').trim()
    const parsedNum = rawNum ? Number(rawNum) : null
    onSubmit({
      title: String(fd.get('title') ?? ''),
      content: String(fd.get('content') ?? ''),
      color: String(fd.get('color') ?? 'default'),
      checklist: items,
      sessionNumber: parsedNum && Number.isFinite(parsedNum) && parsedNum > 0 ? parsedNum : null,
      sessionDates: dates,
      plannedTests: String(fd.get('planned_tests') ?? ''),
    })
    setOpen(false)
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) {
          setItems(initial?.checklist ?? [])
          setDates(initial?.sessionDates ?? [])
        }
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {initial ? 'Editar anotação' : 'Nova anotação'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid max-h-[75vh] gap-3 overflow-y-auto pt-2">
          <div className="flex flex-col gap-1.5">
            <Label>Título</Label>
            <Input name="title" defaultValue={initial?.title ?? ''} />
          </div>
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <div className="flex flex-col gap-1.5">
              <Label>Nº da sessão</Label>
              <Input
                name="session_number"
                type="number"
                min={1}
                defaultValue={initial?.sessionNumber ?? ''}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Possíveis datas</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="h-9"
                />
                <Button type="button" size="sm" variant="outline" onClick={addDate}>
                  <Plus /> Adicionar
                </Button>
              </div>
              {dates.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {dates.map((d) => (
                    <span
                      key={d}
                      className="flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs"
                    >
                      {format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy')}
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDates((prev) => prev.filter((x) => x !== d))}
                        aria-label="Remover data"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>O que será aplicado</Label>
            <Textarea
              name="planned_tests"
              rows={2}
              placeholder="Ex.: WAIS-IV, Rey, TDE-II…"
              defaultValue={initial?.plannedTests ?? ''}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Observações</Label>
            <Textarea name="content" rows={4} defaultValue={initial?.content ?? ''} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Checklist</Label>
            {items.length > 0 ? (
              <ul className="flex flex-col gap-1.5 rounded-md border p-2">
                {items.map((it, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={it.done}
                      onCheckedChange={() =>
                        setItems((prev) => prev.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))
                      }
                    />
                    <Input
                      value={it.label}
                      onChange={(e) =>
                        setItems((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                      }
                      className="h-8"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive"
                      onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex gap-2">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem()
                  }
                }}
                placeholder="Adicionar item ao checklist"
                className="h-9"
              />
              <Button type="button" size="sm" variant="outline" onClick={addItem}>
                <Plus /> Adicionar
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Cor</Label>
            <select
              name="color"
              defaultValue={initial?.color ?? 'default'}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="default">Padrão</option>
              <option value="yellow">Amarelo</option>
              <option value="blue">Azul</option>
              <option value="green">Verde</option>
              <option value="pink">Rosa</option>
            </select>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


// ============ Evaluation Plan ============
type PlanEntry = Awaited<ReturnType<typeof listPatientPlan>>[number]
type ChecklistItem = { label: string; done: boolean }

function toChecklist(v: unknown): ChecklistItem[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((it): it is Record<string, unknown> => typeof it === 'object' && it !== null)
    .map((it) => ({ label: String(it.label ?? ''), done: Boolean(it.done) }))
}

function EvaluationPlan({ patientId }: { patientId: string }) {
  const qc = useQueryClient()
  const listFn = useServerFn(listPatientPlan)
  const createFn = useServerFn(createPatientPlanEntry)
  const q = useQuery({
    queryKey: ['patient-plan', patientId],
    queryFn: () => listFn({ data: { patientId } }),
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['patient-plan', patientId] })
  const createMut = useMutation({
    mutationFn: (v: {
      title: string
      sessionNumber: number | null
      sessionDate: string
      startTime: string
      modality: 'presencial' | 'online'
      objectives: string
      notes: string
      checklist: ChecklistItem[]
    }) => createFn({ data: { patientId, ...v } }),
    onSuccess: () => {
      toast.success('Sessão adicionada ao plano.')
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const entries = q.data ?? []

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Plano de avaliação</h2>
          <p className="text-sm text-muted-foreground">
            Programe as sessões, o que será aplicado, use o checklist e registre observações.
          </p>
        </div>
        <PlanDialog
          trigger={
            <Button size="sm" variant="outline">
              <Plus /> Nova sessão do plano
            </Button>
          }
          onSubmit={(v) => createMut.mutate(v)}
          isPending={createMut.isPending}
        />
      </div>

      {entries.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Nenhuma sessão planejada. Adicione a primeira acima.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {entries.map((e) => (
            <PlanRow key={e.id} entry={e} onChanged={invalidate} />
          ))}
        </div>
      )}
    </section>
  )
}

function PlanRow({ entry, onChanged }: { entry: PlanEntry; onChanged: () => void }) {
  const upd = useServerFn(updatePatientPlanEntry)
  const del = useServerFn(deletePatientPlanEntry)
  const checklist = toChecklist(entry.checklist)
  const done = checklist.filter((c) => c.done).length
  const updMut = useMutation({
    mutationFn: (v: {
      id: string
      title?: string
      sessionNumber?: number | null
      sessionDate?: string
      startTime?: string | null
      modality?: 'presencial' | 'online'
      objectives?: string | null
      notes?: string | null
      status?: 'scheduled' | 'done' | 'cancelled'
      checklist?: ChecklistItem[]
    }) => upd({ data: v }),
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  })
  const delMut = useMutation({
    mutationFn: () => del({ data: { id: entry.id } }),
    onSuccess: () => {
      toast.success('Removida.')
      onChanged()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function toggle(idx: number) {
    const next = checklist.map((c, i) => (i === idx ? { ...c, done: !c.done } : c))
    updMut.mutate({ id: entry.id, checklist: next })
  }

  const statusColor =
    entry.status === 'done'
      ? 'default'
      : entry.status === 'cancelled'
        ? 'destructive'
        : 'outline'
  const statusLabel =
    entry.status === 'done' ? 'Realizada' : entry.status === 'cancelled' ? 'Cancelada' : 'Agendada'

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {entry.session_number ? `Sessão ${entry.session_number} · ` : ''}
            {entry.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {entry.session_date}
            {entry.start_time ? ` · ${entry.start_time}` : ''} · {entry.modality}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusColor as 'default' | 'destructive' | 'outline'}>{statusLabel}</Badge>
          <select
            className="h-8 rounded-md border bg-background px-2 text-xs"
            value={entry.status}
            onChange={(ev) =>
              updMut.mutate({
                id: entry.id,
                status: ev.target.value as 'scheduled' | 'done' | 'cancelled',
              })
            }
          >
            <option value="scheduled">Agendada</option>
            <option value="done">Realizada</option>
            <option value="cancelled">Cancelada</option>
          </select>
          <PlanDialog
            trigger={
              <Button size="icon" variant="ghost" className="size-8" title="Editar">
                <Pencil className="size-3.5" />
              </Button>
            }
            initial={{
              title: entry.title,
              sessionNumber: entry.session_number,
              sessionDate: entry.session_date,
              startTime: entry.start_time ?? '',
              modality: entry.modality as 'presencial' | 'online',
              objectives: entry.objectives ?? '',
              notes: entry.notes ?? '',
              checklist,
            }}
            onSubmit={(v) =>
              updMut.mutate({
                id: entry.id,
                title: v.title,
                sessionNumber: v.sessionNumber,
                sessionDate: v.sessionDate,
                startTime: v.startTime,
                modality: v.modality,
                objectives: v.objectives,
                notes: v.notes,
                checklist: v.checklist,
              })
            }
            isPending={updMut.isPending}
          />
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-destructive"
            onClick={() => {
              if (confirm('Remover esta sessão do plano?')) delMut.mutate()
            }}
            title="Excluir"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {entry.objectives ? (
        <p className="mt-2 text-sm text-foreground/90">
          <span className="text-muted-foreground">Objetivos: </span>
          {entry.objectives}
        </p>
      ) : null}

      {checklist.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Checklist · {done}/{checklist.length}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {checklist.map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Checkbox checked={c.done} onCheckedChange={() => toggle(i)} />
                <span className={c.done ? 'text-muted-foreground line-through' : ''}>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {entry.notes ? (
        <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/40 p-2 text-sm">
          {entry.notes}
        </p>
      ) : null}
    </div>
  )
}

function PlanDialog({
  trigger,
  initial,
  onSubmit,
  isPending,
}: {
  trigger: React.ReactNode
  initial?: {
    title: string
    sessionNumber: number | null
    sessionDate: string
    startTime: string
    modality: 'presencial' | 'online'
    objectives: string
    notes: string
    checklist: ChecklistItem[]
  }
  onSubmit: (v: {
    title: string
    sessionNumber: number | null
    sessionDate: string
    startTime: string
    modality: 'presencial' | 'online'
    objectives: string
    notes: string
    checklist: ChecklistItem[]
  }) => void
  isPending: boolean
}) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ChecklistItem[]>(initial?.checklist ?? [])
  const [newItem, setNewItem] = useState('')

  function addItem() {
    const t = newItem.trim()
    if (!t) return
    setItems((s) => [...s, { label: t, done: false }])
    setNewItem('')
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const num = String(fd.get('sessionNumber') ?? '').trim()
    onSubmit({
      title: String(fd.get('title') ?? ''),
      sessionNumber: num ? Number(num) : null,
      sessionDate: String(fd.get('sessionDate') ?? ''),
      startTime: String(fd.get('startTime') ?? ''),
      modality: String(fd.get('modality') ?? 'presencial') as 'presencial' | 'online',
      objectives: String(fd.get('objectives') ?? ''),
      notes: String(fd.get('notes') ?? ''),
      checklist: items,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {initial ? 'Editar sessão do plano' : 'Nova sessão do plano'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 pt-2 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Título / o que será aplicado</Label>
            <Input name="title" defaultValue={initial?.title ?? ''} placeholder="Ex.: Sessão 2 — WAIS-IV" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Número da sessão</Label>
            <Input name="sessionNumber" type="number" min={1} defaultValue={initial?.sessionNumber ?? ''} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Data prevista</Label>
            <Input name="sessionDate" type="date" defaultValue={initial?.sessionDate ?? ''} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Horário</Label>
            <Input name="startTime" type="time" defaultValue={initial?.startTime ?? ''} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Modalidade</Label>
            <select
              name="modality"
              defaultValue={initial?.modality ?? 'presencial'}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Objetivos</Label>
            <Textarea name="objectives" rows={2} defaultValue={initial?.objectives ?? ''} />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Checklist do que será feito</Label>
            <div className="flex flex-col gap-1.5">
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={it.done}
                    onCheckedChange={() =>
                      setItems((s) => s.map((c, idx) => (idx === i ? { ...c, done: !c.done } : c)))
                    }
                  />
                  <span className={`flex-1 ${it.done ? 'text-muted-foreground line-through' : ''}`}>
                    {it.label}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 text-destructive"
                    onClick={() => setItems((s) => s.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="Ex.: Aplicar subteste Vocabulário"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addItem()
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addItem}>
                  Adicionar
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Observações</Label>
            <Textarea name="notes" rows={3} defaultValue={initial?.notes ?? ''} />
          </div>

          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
