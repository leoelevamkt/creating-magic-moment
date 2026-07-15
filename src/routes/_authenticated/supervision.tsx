import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { MessageSquarePlus, Plus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { addCaseNote, createCase, listCaseNotes, listCases, updateCaseStatus } from '@/lib/supervision.functions'
import { listPatients } from '@/lib/patients.functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export const Route = createFileRoute('/_authenticated/supervision')({
  head: () => ({ meta: [{ title: 'Supervisão — NeuroFlux' }] }),
  component: SupervisionPage,
})

function SupervisionPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const listFn = useServerFn(listCases)
  const createFn = useServerFn(createCase)
  const statusFn = useServerFn(updateCaseStatus)
  const patientsFn = useServerFn(listPatients)

  const cases = useQuery({ queryKey: ['sup-cases'], queryFn: () => listFn() })
  const patients = useQuery({ queryKey: ['patients'], queryFn: () => patientsFn() })

  const create = useMutation({
    mutationFn: (v: { title: string; patientId: string | null; hypothesis: string | null; evolution: string | null; questions: string | null }) =>
      createFn({ data: v }),
    onSuccess: () => {
      toast.success('Caso cadastrado.')
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['sup-cases'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: 'open' | 'in_supervision' | 'closed' }) => statusFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sup-cases'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    create.mutate({
      title: String(fd.get('title') ?? ''),
      patientId: (String(fd.get('patientId') ?? '') || null),
      hypothesis: (String(fd.get('hypothesis') ?? '') || null),
      evolution: (String(fd.get('evolution') ?? '') || null),
      questions: (String(fd.get('questions') ?? '') || null),
    })
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Supervisão clínica</p>
          <h1 className="font-serif text-3xl font-semibold">Casos em supervisão</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Cada profissional cadastra os próprios casos. O administrador acompanha e comenta.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus /> Novo caso
          </DialogTrigger>
          <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Novo caso</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-2">
                <Label>Título do caso</Label>
                <Input name="title" required placeholder="Ex.: Adolescente com queixas de atenção" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Paciente (opcional)</Label>
                <select name="patientId" className="h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="">— Sem vínculo —</option>
                  {(patients.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Hipótese diagnóstica</Label>
                <Textarea name="hypothesis" rows={2} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Evolução</Label>
                <Textarea name="evolution" rows={3} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Dúvidas para supervisão</Label>
                <Textarea name="questions" rows={3} />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? 'Salvando…' : 'Cadastrar caso'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-3">
          {(cases.data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              Nenhum caso cadastrado ainda.
            </div>
          ) : (
            (cases.data ?? []).map((c) => {
              const owner = c.owner_name
              const patient = (c.patients as { name: string } | null)?.name
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`flex flex-col gap-2 rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary ${selected === c.id ? 'border-primary ring-1 ring-primary/40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-lg font-semibold">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        <Users size={12} className="mr-1 inline" />
                        {owner}{patient ? ` · ${patient}` : ''}
                      </p>
                    </div>
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                      value={c.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setStatus.mutate({ id: c.id, status: e.target.value as 'open' | 'in_supervision' | 'closed' })}
                    >
                      <option value="open">Aberto</option>
                      <option value="in_supervision">Em supervisão</option>
                      <option value="closed">Encerrado</option>
                    </select>
                  </div>
                  {c.hypothesis ? <p className="text-sm"><span className="font-medium">Hipótese: </span>{c.hypothesis}</p> : null}
                  {c.questions ? <p className="text-sm text-muted-foreground">{c.questions}</p> : null}
                  <p className="text-xs text-muted-foreground">Criado em {format(new Date(c.created_at), 'dd/MM/yyyy')}</p>
                </button>
              )
            })
          )}
        </div>
        <NotesPanel caseId={selected} />
      </div>
    </div>
  )
}

function NotesPanel({ caseId }: { caseId: string | null }) {
  const qc = useQueryClient()
  const listFn = useServerFn(listCaseNotes)
  const addFn = useServerFn(addCaseNote)
  const notes = useQuery({
    queryKey: ['sup-notes', caseId],
    queryFn: () => listFn({ data: { caseId: caseId! } }),
    enabled: !!caseId,
  })
  const add = useMutation({
    mutationFn: (body: string) => addFn({ data: { caseId: caseId!, body } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sup-notes', caseId] }),
    onError: (e: Error) => toast.error(e.message),
  })

  if (!caseId) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Selecione um caso para ver e adicionar comentários.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <p className="text-sm font-semibold">Comentários</p>
      <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
        {(notes.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem comentários ainda.</p>
        ) : (
          (notes.data ?? []).map((n) => (
            <div key={n.id} className="rounded-lg border bg-background p-3">
              <p className="text-xs font-medium">{(n.profiles as { name: string } | null)?.name ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(n.created_at), 'dd/MM/yyyy HH:mm')}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{n.body}</p>
            </div>
          ))
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const body = String(fd.get('body') ?? '').trim()
          if (!body) return
          add.mutate(body)
          e.currentTarget.reset()
        }}
        className="flex flex-col gap-2"
      >
        <Textarea name="body" rows={3} placeholder="Escreva um comentário…" required />
        <Button type="submit" size="sm" disabled={add.isPending}>
          <MessageSquarePlus /> Comentar
        </Button>
      </form>
    </div>
  )
}
