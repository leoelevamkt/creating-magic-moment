import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { CheckCircle2, ListTodo, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { createTask, deleteTask, listTasks, updateTaskStatus, type TaskStatus } from '@/lib/tasks.functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export const Route = createFileRoute('/_authenticated/tasks')({
  head: () => ({ meta: [{ title: 'Tarefas — NeuroFlux' }] }),
  component: TasksPage,
})

const columns: Array<{ id: TaskStatus; label: string; icon: typeof ListTodo; next?: TaskStatus; nextLabel?: string }> = [
  { id: 'todo', label: 'A fazer', icon: ListTodo, next: 'doing', nextLabel: 'Iniciar' },
  { id: 'doing', label: 'Em andamento', icon: Loader2, next: 'done', nextLabel: 'Concluir' },
  { id: 'done', label: 'Concluída', icon: CheckCircle2 },
]

const colors: Array<{ id: string; label: string; className: string }> = [
  { id: 'slate', label: 'Neutro', className: 'bg-slate-100 border-slate-300 text-slate-800' },
  { id: 'blue', label: 'Azul', className: 'bg-blue-50 border-blue-300 text-blue-800' },
  { id: 'green', label: 'Verde', className: 'bg-green-50 border-green-300 text-green-800' },
  { id: 'yellow', label: 'Amarelo', className: 'bg-yellow-50 border-yellow-300 text-yellow-900' },
  { id: 'red', label: 'Urgente', className: 'bg-red-50 border-red-300 text-red-800' },
  { id: 'purple', label: 'Roxo', className: 'bg-purple-50 border-purple-300 text-purple-800' },
]

function colorClass(id: string) {
  return colors.find((c) => c.id === id)?.className ?? colors[0].className
}

function TasksPage() {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const listFn = useServerFn(listTasks)
  const createFn = useServerFn(createTask)
  const statusFn = useServerFn(updateTaskStatus)
  const deleteFn = useServerFn(deleteTask)

  const { data: tasks = [] } = useQuery({ queryKey: ['tasks-free'], queryFn: () => listFn() })

  const grouped = useMemo(() => {
    const map = new Map<TaskStatus, typeof tasks>()
    for (const c of columns) map.set(c.id, [])
    for (const t of tasks) map.get(t.status as TaskStatus)?.push(t)
    return map
  }, [tasks])

  const create = useMutation({
    mutationFn: (v: { title: string; description: string | null; color: string; dueDate: string | null }) => createFn({ data: v }),
    onSuccess: () => {
      toast.success('Tarefa criada.')
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['tasks-free'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: TaskStatus }) => statusFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks-free'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks-free'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    create.mutate({
      title: String(fd.get('title') ?? ''),
      description: (String(fd.get('description') ?? '') || null),
      color: String(fd.get('color') ?? 'slate'),
      dueDate: (String(fd.get('dueDate') ?? '') || null),
    })
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Organização pessoal</p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold">Tarefas</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Tarefas rápidas sem vínculo com paciente. Defina cor, prazo e acompanhe o status.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus /> Nova tarefa
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Nova tarefa</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" name="description" rows={3} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="dueDate">Prazo</Label>
                  <Input id="dueDate" name="dueDate" type="date" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="color">Cor</Label>
                  <select id="color" name="color" defaultValue="slate" className="h-10 rounded-md border bg-background px-3 text-sm">
                    {colors.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? 'Criando…' : 'Criar tarefa'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((col) => {
          const items = grouped.get(col.id) ?? []
          const Icon = col.icon
          return (
            <div key={col.id} className="flex min-h-[240px] flex-col gap-3 rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Icon size={16} className="text-primary" />
                  {col.label}
                </div>
                <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <div className="my-auto flex flex-1 items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Nada por aqui.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {items.map((t) => (
                    <article key={t.id} className={`flex flex-col gap-2 rounded-xl border p-3 text-sm ${colorClass(t.color)}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-serif text-base font-semibold">{t.title}</p>
                        <button
                          type="button"
                          onClick={() => del.mutate(t.id)}
                          className="opacity-60 hover:opacity-100"
                          aria-label="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {t.description ? <p className="text-xs opacity-80">{t.description}</p> : null}
                      {t.due_date ? (
                        <p className="text-xs opacity-80">Prazo: {format(new Date(t.due_date), 'dd/MM/yyyy')}</p>
                      ) : null}
                      {col.next ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus.mutate({ id: t.id, status: col.next! })}
                          disabled={setStatus.isPending}
                        >
                          {col.nextLabel}
                        </Button>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
