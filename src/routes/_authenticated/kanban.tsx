import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Loader2, Pencil, Play, Plus, ShieldCheck, Trash2, X } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  createEvaluation,
  deleteTask,
  listTasks,
  updateTask,
  updateTaskStatus,
  type TaskStatus,
} from '@/lib/evaluations.functions'
import { listPatients } from '@/lib/patients.functions'
import { listCatalog } from '@/lib/profile.functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export const Route = createFileRoute('/_authenticated/kanban')({
  head: () => ({ meta: [{ title: 'Quadro clínico — NeuroFlux' }] }),
  component: KanbanPage,
})

const columns: Array<{ id: TaskStatus; label: string; icon: typeof ClipboardList; next?: TaskStatus; nextLabel?: string; prev?: TaskStatus; prevLabel?: string }> = [
  { id: 'todo', label: 'A fazer', icon: ClipboardList, next: 'correcting', nextLabel: 'Iniciar correção' },
  { id: 'correcting', label: 'Em correção', icon: Loader2, next: 'review', nextLabel: 'Enviar para OK', prev: 'todo', prevLabel: 'Voltar para A fazer' },
  { id: 'review', label: 'Aguardando OK do admin', icon: ShieldCheck, next: 'approved', nextLabel: 'Aprovar', prev: 'correcting', prevLabel: 'Voltar para correção' },
  { id: 'approved', label: 'Aprovado', icon: CheckCircle2, prev: 'review', prevLabel: 'Reabrir para revisão' },
]

function KanbanPage() {
  const [open, setOpen] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<TaskStatus | null>(null)
  const [search, setSearch] = useState('')
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set())
  const [customTests, setCustomTests] = useState<Array<{ name: string; acronym: string }>>([])
  const [customName, setCustomName] = useState('')
  const [customAcronym, setCustomAcronym] = useState('')
  const [editing, setEditing] = useState<null | {
    id: string
    scheduled_at: string | null
    duration_minutes: number | null
  }>(null)
  const qc = useQueryClient()
  const tasksFn = useServerFn(listTasks)
  const setStatus = useServerFn(updateTaskStatus)
  const create = useServerFn(createEvaluation)
  const patchTask = useServerFn(updateTask)
  const removeTask = useServerFn(deleteTask)
  const patientsFn = useServerFn(listPatients)
  const catalogFn = useServerFn(listCatalog)

  const tasks = useQuery({ queryKey: ['tasks'], queryFn: () => tasksFn() })
  const patients = useQuery({ queryKey: ['patients'], queryFn: () => patientsFn() })
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: () => catalogFn() })

  const grouped = useMemo(() => {
    const map = new Map<TaskStatus, NonNullable<typeof tasks.data>>()
    for (const c of columns) map.set(c.id, [])
    for (const t of tasks.data ?? []) map.get(t.status as TaskStatus)?.push(t)
    return map
  }, [tasks.data])

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase()
    const all = catalog.data ?? []
    if (!q) return all
    return all.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.acronym ?? '').toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    )
  }, [catalog.data, search])

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: TaskStatus }) => setStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: (v: { id: string; scheduledAt: string | null; durationMinutes: number | null }) =>
      patchTask({ data: v }),
    onSuccess: () => {
      toast.success('Tarefa atualizada.')
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => removeTask({ data: { id } }),
    onSuccess: () => {
      toast.success('Tarefa excluída.')
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function resetForm() {
    setSearch('')
    setSelectedTests(new Set())
    setCustomTests([])
    setCustomName('')
    setCustomAcronym('')
  }

  const createMut = useMutation({
    mutationFn: (v: {
      patientId: string
      title: string
      modality: 'presencial' | 'online'
      scheduledAt: string | null
      testIds: string[]
      customTests: Array<{ name: string; acronym: string }>
    }) => create({ data: v }),
    onSuccess: () => {
      toast.success('Avaliação planejada.')
      setOpen(false)
      resetForm()
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function toggleTest(id: string) {
    setSelectedTests((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addCustom() {
    const name = customName.trim()
    if (name.length < 2) {
      toast.error('Informe o nome do teste personalizado.')
      return
    }
    setCustomTests((prev) => [...prev, { name, acronym: customAcronym.trim() }])
    setCustomName('')
    setCustomAcronym('')
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const testIds = Array.from(selectedTests)
    if (testIds.length === 0 && customTests.length === 0) {
      toast.error('Selecione ou adicione ao menos um teste.')
      return
    }
    createMut.mutate({
      patientId: String(fd.get('patientId') ?? ''),
      title: String(fd.get('title') ?? 'Avaliação neuropsicológica'),
      modality: (String(fd.get('modality') ?? 'presencial') as 'presencial' | 'online'),
      scheduledAt: String(fd.get('scheduledAt') ?? '') || null,
      testIds,
      customTests,
    })
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Fluxo de correções</p>
          <h1 className="font-serif text-3xl font-semibold">Quadro clínico</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Acompanhe cada teste desde a aplicação até o OK final do admin, com paciente, data,
            horário e duração registrados.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus /> Nova tarefa
          </DialogTrigger>
          <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Planejar avaliação</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-2">
                <Label>Paciente</Label>
                <select
                  name="patientId"
                  required
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Selecione o paciente</option>
                  {(patients.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <div className="flex flex-col gap-2">
                  <Label>Nome da avaliação</Label>
                  <Input name="title" defaultValue="Avaliação neuropsicológica" required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Modalidade</Label>
                  <select
                    name="modality"
                    defaultValue="presencial"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="presencial">presencial</option>
                    <option value="online">online</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Data e horário</Label>
                <Input type="datetime-local" name="scheduledAt" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Testes a aplicar</Label>
                <Input
                  placeholder="Pesquisar por nome, sigla ou categoria…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <TestPicker
                  tests={filteredCatalog}
                  selected={selectedTests}
                  onToggle={toggleTest}
                />
                {selectedTests.size > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {selectedTests.size} teste(s) selecionado(s).
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
                <Label>Adicionar teste fora do catálogo</Label>
                <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                  <Input
                    placeholder="Nome do teste"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                  <Input
                    placeholder="Sigla (opcional)"
                    value={customAcronym}
                    onChange={(e) => setCustomAcronym(e.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={addCustom}>
                    <Plus /> Adicionar
                  </Button>
                </div>
                {customTests.length > 0 ? (
                  <ul className="flex flex-wrap gap-2 pt-1">
                    {customTests.map((t, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs"
                      >
                        <span className="font-medium">{t.acronym || t.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomTests((prev) => prev.filter((_, j) => j !== i))
                          }
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Remover"
                        >
                          <X size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={createMut.isPending}>
                  {createMut.isPending ? 'Planejando…' : 'Planejar avaliação'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => {
          const items = grouped.get(col.id) ?? []
          const Icon = col.icon
          const isOver = overCol === col.id
          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                if (dragId) {
                  e.preventDefault()
                  if (overCol !== col.id) setOverCol(col.id)
                }
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return
                if (overCol === col.id) setOverCol(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                const id = dragId
                setDragId(null)
                setOverCol(null)
                if (id) statusMut.mutate({ id, status: col.id })
              }}
              className={`flex min-h-[240px] flex-col gap-3 rounded-2xl border bg-card p-4 transition-colors ${isOver ? 'border-primary bg-primary/5' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Icon size={16} className="text-primary" />
                  {col.label}
                </div>
                <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {items.length}
                </span>
              </div>
              {items.length === 0 ? (
                <div className="my-auto flex flex-1 items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Arraste aqui ou nenhuma tarefa nesta etapa.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {items.map((t) => {
                    const acronym = (t.test_catalog as { acronym: string | null } | null)?.acronym ?? '—'
                    const patient = (t.patients as { name: string } | null)?.name ?? '—'
                    const isDragging = dragId === t.id
                    return (
                      <article
                        key={t.id}
                        draggable
                        onDragStart={(e) => {
                          setDragId(t.id)
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', t.id)
                        }}
                        onDragEnd={() => {
                          setDragId(null)
                          setOverCol(null)
                        }}
                        className={`flex cursor-grab flex-col gap-2 rounded-xl border bg-background p-3 text-sm active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-primary">{acronym}</p>
                            <p className="font-serif text-base font-semibold">{patient}</p>
                          </div>
                          {t.duration_minutes ? (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                              {t.duration_minutes} min
                            </span>
                          ) : null}
                        </div>
                        {t.scheduled_at ? (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(t.scheduled_at), "dd/MM/yyyy 'às' HH:mm")}
                          </p>
                        ) : null}
                        {t.status === 'approved' && t.approved_at ? (
                          <p className="rounded-md bg-primary/10 px-2 py-1 text-center text-xs text-primary">
                            Aprovado em {format(new Date(t.approved_at), 'dd/MM/yyyy')}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2">
                          {col.prev ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => statusMut.mutate({ id: t.id, status: col.prev! })}
                              disabled={statusMut.isPending}
                              title={col.prevLabel}
                            >
                              <ArrowLeft /> Voltar
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setEditing({
                                id: t.id,
                                scheduled_at: t.scheduled_at,
                                duration_minutes: t.duration_minutes,
                              })
                            }
                            title="Editar tarefa"
                          >
                            <Pencil />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Excluir esta tarefa?')) deleteMut.mutate(t.id)
                            }}
                            disabled={deleteMut.isPending}
                            title="Excluir tarefa"
                          >
                            <Trash2 />
                          </Button>
                          {col.next ? (
                            <Button
                              size="sm"
                              variant={col.id === 'todo' ? 'default' : 'outline'}
                              onClick={() => statusMut.mutate({ id: t.id, status: col.next! })}
                              disabled={statusMut.isPending}
                              className="ml-auto"
                            >
                              {col.id === 'todo' ? <Play /> : <ArrowRight />}
                              {col.nextLabel}
                            </Button>
                          ) : null}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Editar tarefa</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                const scheduledAt = String(fd.get('scheduledAt') ?? '') || null
                const durRaw = String(fd.get('duration') ?? '').trim()
                const durationMinutes = durRaw === '' ? null : Number(durRaw)
                updateMut.mutate({ id: editing.id, scheduledAt, durationMinutes })
              }}
              className="flex flex-col gap-4 pt-2"
            >
              <div className="flex flex-col gap-2">
                <Label>Data e horário</Label>
                <Input
                  type="datetime-local"
                  name="scheduledAt"
                  defaultValue={
                    editing.scheduled_at
                      ? format(new Date(editing.scheduled_at), "yyyy-MM-dd'T'HH:mm")
                      : ''
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Duração (minutos)</Label>
                <Input
                  type="number"
                  min="0"
                  name="duration"
                  defaultValue={editing.duration_minutes ?? ''}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMut.isPending}>
                  {updateMut.isPending ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TestPicker({
  tests,
  selected,
  onToggle,
}: {
  tests: Array<{ id: string; acronym: string | null; name: string; category: string; estimated_minutes: number | null }>
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  const byCat = useMemo(() => {
    const m = new Map<string, typeof tests>()
    for (const t of tests) {
      const arr = m.get(t.category) ?? []
      arr.push(t)
      m.set(t.category, arr)
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [tests])
  if (byCat.length === 0) {
    return (
      <div className="rounded-lg border p-4 text-center text-xs text-muted-foreground">
        Nenhum teste encontrado.
      </div>
    )
  }
  return (
    <div className="max-h-72 overflow-y-auto rounded-lg border p-3">
      {byCat.map(([cat, items]) => (
        <div key={cat} className="mb-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {cat}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((t) => (
              <label key={t.id} className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={selected.has(t.id)}
                  onCheckedChange={() => onToggle(t.id)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">{t.acronym ?? t.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t.name}
                    {t.estimated_minutes ? ` · ${t.estimated_minutes} min` : ''}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
