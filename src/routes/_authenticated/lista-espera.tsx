import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Archive, ListChecks, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  createWaitlistEntry,
  deleteWaitlistEntry,
  listWaitlist,
  setWaitlistStatus,
} from '@/lib/waitlist.functions'
import { listPatients } from '@/lib/patients.functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ExportCsvButton } from '@/components/common/ExportCsvButton'

export const Route = createFileRoute('/_authenticated/lista-espera')({
  beforeLoad: ({ context }) => {
    if ((context as { role?: string }).role !== 'admin') throw redirect({ to: '/kanban' })
  },
  head: () => ({
    meta: [{ title: 'Lista de espera — NeuroFlux' }],
  }),
  component: WaitlistPage,
})

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function useServerFnSafe<T extends (...args: never[]) => unknown>(fn: T): T {
  return fn
}

function WaitlistPage() {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'active' | 'scheduled' | 'archived' | 'all'>('active')
  const qc = useQueryClient()

  const listFn = useServerFn(listWaitlist)
  const createFn = useServerFn(createWaitlistEntry)
  const setStatusFn = useServerFn(setWaitlistStatus)
  const removeFn = useServerFn(deleteWaitlistEntry)

  const entries = useQuery({
    queryKey: ['waitlist', filter],
    queryFn: () => listFn({ data: { status: filter } }),
  })
  const patients = useQuery({
    queryKey: ['patients'],
    queryFn: () => useServerFnSafe(listPatients)(),
  })

  type WaitlistPayload = {
    patientId: string | null
    patientName: string | null
    contactPhone: string | null
    contactEmail: string | null
    sessionType: string | null
    preferredWeekdays: number[]
    preferredStartTime: string | null
    preferredEndTime: string | null
    modality: 'presencial' | 'online' | 'any'
    priority: number
    notes: string | null
  }
  const createMut = useMutation({
    mutationFn: (v: WaitlistPayload) => createFn({ data: v }),
    onSuccess: () => {
      toast.success('Adicionado à lista de espera.')
      qc.invalidateQueries({ queryKey: ['waitlist'] })
      setOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: 'active' | 'scheduled' | 'archived' }) =>
      setStatusFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['waitlist'] }),
  })
  const removeMut = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success('Removido.')
      qc.invalidateQueries({ queryKey: ['waitlist'] })
    },
  })

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const wd = fd.getAll('preferredWeekday').map((v) => Number(v))
    const patientId = String(fd.get('patientId') ?? '') || null
    createMut.mutate({
      patientId: patientId,
      patientName: String(fd.get('patientName') ?? '') || null,
      contactPhone: String(fd.get('contactPhone') ?? '') || null,
      contactEmail: String(fd.get('contactEmail') ?? '') || null,
      sessionType: String(fd.get('sessionType') ?? '') || null,
      preferredWeekdays: wd,
      preferredStartTime: String(fd.get('preferredStartTime') ?? '') || null,
      preferredEndTime: String(fd.get('preferredEndTime') ?? '') || null,
      modality: (String(fd.get('modality') ?? 'any') as 'presencial' | 'online' | 'any'),
      priority: Number(fd.get('priority') ?? 3),
      notes: String(fd.get('notes') ?? '') || null,
    })
  }

  const rows = entries.data ?? []
  const counts = useMemo(() => {
    return {
      total: rows.length,
      urgent: rows.filter((r) => r.priority <= 2).length,
    }
  }, [rows])

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Agenda e comunicação</p>
          <h1 className="font-serif text-3xl font-semibold">Lista de espera</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Pacientes aguardando encaixe. Ao cancelar uma sessão na agenda, sugerimos
            automaticamente os melhores candidatos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="active">Ativos</option>
            <option value="scheduled">Encaixados</option>
            <option value="archived">Arquivados</option>
            <option value="all">Todos</option>
          </select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>
              <Plus /> Novo
            </DialogTrigger>
            <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">Adicionar à lista de espera</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="flex flex-col gap-4 pt-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>Paciente cadastrado (opcional)</Label>
                    <select
                      name="patientId"
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">— Nenhum —</option>
                      {(patients.data ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Nome de contato (se não cadastrado)</Label>
                    <Input name="patientName" placeholder="Ex.: João da Silva" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>Telefone</Label>
                    <Input name="contactPhone" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>E-mail</Label>
                    <Input type="email" name="contactEmail" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-2">
                    <Label>Tipo de sessão</Label>
                    <Input name="sessionType" placeholder="Ex.: avaliação, terapia" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Modalidade</Label>
                    <select
                      name="modality"
                      defaultValue="any"
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="any">Qualquer</option>
                      <option value="presencial">Presencial</option>
                      <option value="online">Online</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Prioridade (1 alta - 5 baixa)</Label>
                    <select
                      name="priority"
                      defaultValue="3"
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Dias preferidos</Label>
                  <div className="flex flex-wrap gap-3">
                    {WEEKDAYS.map((w, i) => (
                      <label key={i} className="flex items-center gap-1 text-sm">
                        <Checkbox name="preferredWeekday" value={String(i)} />
                        {w}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>Janela preferida — início</Label>
                    <Input type="time" name="preferredStartTime" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Janela preferida — fim</Label>
                    <Input type="time" name="preferredEndTime" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Observações</Label>
                  <Textarea name="notes" rows={3} />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={createMut.isPending}>
                    {createMut.isPending ? 'Salvando…' : 'Adicionar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
          <ListChecks className="mr-1 inline" size={14} /> {counts.total} entradas
        </span>
        {counts.urgent > 0 ? (
          <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-800">
            {counts.urgent} prioritárias
          </span>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Sem entradas neste filtro.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Preferências</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const name = (r.patients as { name: string } | null)?.name ?? r.patient_name ?? '—'
                const wd = Array.isArray(r.preferred_weekdays) ? r.preferred_weekdays : []
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{name}</div>
                      {r.session_type ? (
                        <div className="text-xs text-muted-foreground">{r.session_type}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.contact_phone ? <div>{r.contact_phone}</div> : null}
                      {r.contact_email ? <div>{r.contact_email}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>
                        {wd.length
                          ? wd.map((d: number) => WEEKDAYS[d]).join(', ')
                          : 'Qualquer dia'}
                      </div>
                      <div>
                        {r.preferred_start_time && r.preferred_end_time
                          ? `${r.preferred_start_time.slice(0, 5)}–${r.preferred_end_time.slice(0, 5)}`
                          : 'Qualquer horário'}
                      </div>
                      <div className="capitalize">{r.modality}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.priority <= 2
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs capitalize text-muted-foreground">
                      {r.status}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {r.status !== 'archived' ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Arquivar"
                            onClick={() =>
                              statusMut.mutate({ id: r.id, status: 'archived' })
                            }
                          >
                            <Archive size={16} />
                          </Button>
                        ) : null}
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Remover"
                          onClick={() => removeMut.mutate(r.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
