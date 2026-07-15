import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { CalendarPlus, Plus, Sparkles } from 'lucide-react'
import { getPatientDetail, updateTaskResult, generateEvaluationSynthesis } from '@/lib/patients.functions'
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

export const Route = createFileRoute('/_authenticated/patients/$id')({
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

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/patients" className="text-xs text-muted-foreground hover:text-foreground">
            ← Pacientes
          </Link>
          <h1 className="mt-1 font-serif text-3xl font-semibold">{patient.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ageFromDate(patient.birth_date)} anos · {patient.schooling} · {patient.city} · Nascimento:{' '}
            {patient.birth_date}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NewSessionDialog patientId={id} onDone={() => qc.invalidateQueries({ queryKey: ['patient-detail', id] })} />
          <NewEvaluationDialog patientId={id} onDone={() => qc.invalidateQueries({ queryKey: ['patient-detail', id] })} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="flex flex-col gap-6">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-serif text-xl font-semibold">Dados do paciente</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <Info label="CPF" value={patient.cpf} />
              <Info label="Escolaridade" value={patient.schooling} />
              <Info label="Cidade" value={patient.city} />
              <Info label="Hipóteses diagnósticas" value={patient.hypotheses ?? '—'} />
              <Info label="Observações" value={patient.notes ?? 'Sem observações'} />
            </dl>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-serif text-xl font-semibold">Próximas sessões</h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhuma sessão agendada. Use “Nova sessão”.
              </p>
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

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-serif text-xl font-semibold">Histórico</h2>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Sem eventos registrados.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3 border-l text-sm">
                {history.map((h, i) => (
                  <li key={i} className="pl-3">
                    <p>{h.text}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(h.at), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <main className="flex flex-col gap-6">
          <section className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-semibold">Testes e correções</h2>
                <p className="text-sm text-muted-foreground">
                  Tudo o que foi aplicado, corrigido e aprovado para este paciente.
                </p>
              </div>
              <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
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
                  <TaskRow key={t.id} task={t} onSaved={() => qc.invalidateQueries({ queryKey: ['patient-detail', id] })} />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-serif text-2xl font-semibold">Síntese integradora</h2>
            <p className="text-sm text-muted-foreground">
              A IA integra os resultados registrados em uma síntese por domínios cognitivos. Sempre revise o texto.
            </p>
            {evaluations.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nenhuma avaliação planejada ainda.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {evaluations.map((ev) => (
                  <SynthesisCard key={ev.id} evaluation={ev} taskCount={tasks.filter((t) => t.evaluation_id === ev.id && (t.synthesis || t.raw_score || t.standard_score)).length} onSaved={() => qc.invalidateQueries({ queryKey: ['patient-detail', id] })} />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
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
        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
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
