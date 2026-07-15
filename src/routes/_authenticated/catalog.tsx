import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { Library, Pencil, Plus, Trash2 } from 'lucide-react'
import { listCatalog, getMyProfile } from '@/lib/profile.functions'
import { upsertTest, deleteTest } from '@/lib/catalog.functions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export const Route = createFileRoute('/_authenticated/catalog')({
  head: () => ({ meta: [{ title: 'Catálogo — NeuroFlux' }] }),
  component: CatalogPage,
})

type TestRow = {
  id: string
  name: string
  acronym: string | null
  category: string
  source: string
  status: string
  age_range: string | null
  application_mode: string | null
  estimated_minutes: number | null
  notes: string | null
}

type FormState = {
  id?: string
  name: string
  acronym: string
  category: string
  source: string
  age_range: string
  application_mode: string
  estimated_minutes: string
  notes: string
  status: 'approved' | 'pending' | 'archived'
}

const emptyForm: FormState = {
  name: '',
  acronym: '',
  category: '',
  source: 'SATEPSI',
  age_range: '',
  application_mode: '',
  estimated_minutes: '',
  notes: '',
  status: 'approved',
}

function CatalogPage() {
  const qc = useQueryClient()
  const fetchCatalog = useServerFn(listCatalog)
  const fetchProfile = useServerFn(getMyProfile)
  const saveTest = useServerFn(upsertTest)
  const removeTest = useServerFn(deleteTest)

  const catalogQ = useQuery({ queryKey: ['catalog'], queryFn: () => fetchCatalog() })
  const profileQ = useQuery({ queryKey: ['my-profile'], queryFn: () => fetchProfile() })
  const isAdmin = profileQ.data?.role === 'admin'

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [search, setSearch] = useState('')

  const openNew = () => {
    setForm(emptyForm)
    setOpen(true)
  }
  const openEdit = (t: TestRow) => {
    setForm({
      id: t.id,
      name: t.name,
      acronym: t.acronym ?? '',
      category: t.category,
      source: t.source,
      age_range: t.age_range ?? '',
      application_mode: t.application_mode ?? '',
      estimated_minutes: t.estimated_minutes?.toString() ?? '',
      notes: t.notes ?? '',
      status: (t.status as FormState['status']) ?? 'approved',
    })
    setOpen(true)
  }

  const saveM = useMutation({
    mutationFn: () =>
      saveTest({
        data: {
          id: form.id,
          name: form.name,
          acronym: form.acronym,
          category: form.category,
          source: form.source,
          age_range: form.age_range || null,
          application_mode: form.application_mode || null,
          estimated_minutes: form.estimated_minutes
            ? parseInt(form.estimated_minutes, 10)
            : null,
          notes: form.notes || null,
          status: form.status,
        },
      }),
    onSuccess: () => {
      toast.success('Teste salvo.')
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['catalog'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const delM = useMutation({
    mutationFn: (id: string) => removeTest({ data: { id } }),
    onSuccess: () => {
      toast.success('Teste removido.')
      qc.invalidateQueries({ queryKey: ['catalog'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const grouped = useMemo(() => {
    const g: Record<string, TestRow[]> = {}
    for (const t of (catalogQ.data ?? []) as TestRow[]) {
      const k = t.category || 'Outros'
      g[k] = g[k] ?? []
      g[k].push(t)
    }
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b))
  }, [catalogQ.data])

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Catálogo de testes</p>
          <h1 className="font-serif text-3xl font-semibold">Instrumentos disponíveis</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Testes SATEPSI e complementares aprovados para uso na clínica.
          </p>
        </div>
        {isAdmin ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button onClick={openNew}>
                  <Plus className="mr-2 h-4 w-4" /> Novo teste
                </Button>
              }
            />

            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{form.id ? 'Editar teste' : 'Novo teste'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-1.5 md:col-span-2">
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Sigla</Label>
                  <Input value={form.acronym} onChange={(e) => setForm({ ...form, acronym: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Categoria</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Origem</Label>
                  <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="SATEPSI / Complementar" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Status</Label>
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as FormState['status'] })}
                  >
                    <option value="approved">Aprovado</option>
                    <option value="pending">Pendente</option>
                    <option value="archived">Arquivado</option>
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Faixa etária</Label>
                  <Input value={form.age_range} onChange={(e) => setForm({ ...form, age_range: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Aplicação</Label>
                  <Input value={form.application_mode} onChange={(e) => setForm({ ...form, application_mode: e.target.value })} placeholder="Individual / Coletiva" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Duração (min)</Label>
                  <Input
                    type="number"
                    value={form.estimated_minutes}
                    onChange={(e) => setForm({ ...form, estimated_minutes: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5 md:col-span-2">
                  <Label>Observações</Label>
                  <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => saveM.mutate()} disabled={saveM.isPending || !form.name || !form.acronym || !form.category}>
                  {saveM.isPending ? 'Salvando…' : 'Salvar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {catalogQ.isLoading ? (
        <p className="p-8 text-sm text-muted-foreground">Carregando catálogo…</p>
      ) : !catalogQ.data || catalogQ.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-12 text-center">
          <Library className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum teste cadastrado.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(([cat, list]) => (
            <section key={cat}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {cat}
              </h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {list.map((t) => (
                  <article key={t.id} className="rounded-xl border bg-card p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-serif text-lg font-semibold text-foreground">{t.acronym}</p>
                        <p className="text-sm text-muted-foreground">{t.name}</p>
                      </div>
                      <Badge variant={t.status === 'approved' ? 'default' : 'secondary'}>{t.source}</Badge>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <dt>Faixa etária</dt>
                        <dd className="text-foreground">{t.age_range ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Aplicação</dt>
                        <dd className="text-foreground">{t.application_mode ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Duração</dt>
                        <dd className="text-foreground">
                          {t.estimated_minutes ? `${t.estimated_minutes} min` : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd className="text-foreground capitalize">{t.status}</dd>
                      </div>
                    </dl>
                    {t.notes ? <p className="mt-3 text-xs text-muted-foreground">{t.notes}</p> : null}
                    {isAdmin ? (
                      <div className="mt-4 flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                          <Pencil className="mr-1 h-3 w-3" /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Remover ${t.acronym}?`)) delM.mutate(t.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
