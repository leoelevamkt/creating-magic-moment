import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from '@/lib/finance.functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export type TxRow = Awaited<ReturnType<typeof listTransactions>>[number]

const KIND_LABELS: Record<string, string> = { income: 'Entrada', expense: 'Saída' }
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Atrasado',
  cancelled: 'Cancelado',
}
const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'outline',
  paid: 'default',
  overdue: 'destructive',
  cancelled: 'secondary',
}

function fmtMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function FinanceTab({
  patientId,
  scope,
  showPatientColumn,
}: {
  patientId?: string
  scope?: 'patient' | 'company' | 'all'
  showPatientColumn?: boolean
}) {
  const qc = useQueryClient()
  const list = useServerFn(listTransactions)
  const del = useServerFn(deleteTransaction)
  const [editing, setEditing] = useState<TxRow | null>(null)
  const [openNew, setOpenNew] = useState(false)

  const queryKey = ['transactions', patientId ?? scope ?? 'all']
  const q = useQuery({
    queryKey,
    queryFn: () => list({ data: { patientId: patientId ?? null, scope } }),
  })

  const rows = q.data ?? []

  const summary = useMemo(() => {
    let inc = 0
    let exp = 0
    let pend = 0
    for (const r of rows) {
      const amt = Number(r.amount)
      if (r.status === 'cancelled') continue
      if (r.kind === 'income') inc += r.status === 'paid' ? amt : 0
      if (r.kind === 'expense') exp += r.status === 'paid' ? amt : 0
      if (r.status === 'pending' || r.status === 'overdue') pend += amt
    }
    return { inc, exp, net: inc - exp, pend }
  }, [rows])

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success('Lançamento excluído.')
      qc.invalidateQueries({ queryKey })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey })
  }

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Financeiro</h2>
          <p className="text-sm text-muted-foreground">
            Controle entradas, saídas e status de pagamento.
          </p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger render={<Button><Plus className="mr-1 size-4" /> Novo lançamento</Button>} />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Novo lançamento</DialogTitle>
            </DialogHeader>
            <TxForm
              defaultPatientId={patientId ?? null}
              lockPatient={!!patientId}
              onDone={() => {
                setOpenNew(false)
                invalidate()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Entradas pagas" value={fmtMoney(summary.inc)} tone="pos" />
        <Metric label="Saídas pagas" value={fmtMoney(summary.exp)} tone="neg" />
        <Metric label="Saldo" value={fmtMoney(summary.net)} tone={summary.net >= 0 ? 'pos' : 'neg'} />
        <Metric label="Em aberto" value={fmtMoney(summary.pend)} />
      </div>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum lançamento registrado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left">Data</th>
                <th className="py-2 text-left">Tipo</th>
                <th className="py-2 text-left">Categoria</th>
                {showPatientColumn ? <th className="py-2 text-left">Paciente</th> : null}
                <th className="py-2 text-left">Descrição</th>
                <th className="py-2 text-right">Valor</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2">{format(new Date(r.transaction_date), 'dd/MM/yyyy')}</td>
                  <td className="py-2">{KIND_LABELS[r.kind]}</td>
                  <td className="py-2">{r.category}</td>
                  {showPatientColumn ? (
                    <td className="py-2">
                      {(r.patients as { name?: string } | null)?.name ?? <span className="text-muted-foreground">Empresa</span>}
                    </td>
                  ) : null}
                  <td className="py-2 text-muted-foreground">{r.description ?? '—'}</td>
                  <td className={`py-2 text-right font-medium ${r.kind === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {r.kind === 'expense' ? '-' : ''}{fmtMoney(Number(r.amount))}
                  </td>
                  <td className="py-2">
                    <Badge variant={STATUS_VARIANTS[r.status] ?? 'outline'}>{STATUS_LABELS[r.status] ?? r.status}</Badge>
                  </td>
                  <td className="py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Excluir este lançamento?')) delMut.mutate(r.id)
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Editar lançamento</DialogTitle>
          </DialogHeader>
          {editing ? (
            <TxForm
              editing={editing}
              defaultPatientId={patientId ?? editing.patient_id ?? null}
              lockPatient={!!patientId}
              onDone={() => {
                setEditing(null)
                invalidate()
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' }) {
  const color = tone === 'pos' ? 'text-emerald-600' : tone === 'neg' ? 'text-red-600' : ''
  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-serif text-xl font-semibold ${color}`}>{value}</p>
    </div>
  )
}

function TxForm({
  editing,
  defaultPatientId,
  lockPatient,
  onDone,
}: {
  editing?: TxRow
  defaultPatientId: string | null
  lockPatient: boolean
  onDone: () => void
}) {
  const create = useServerFn(createTransaction)
  const update = useServerFn(updateTransaction)
  const mut = useMutation({
    mutationFn: async (v: {
      kind: 'income' | 'expense'
      category: string
      description: string
      amount: number
      transactionDate: string
      status: 'pending' | 'paid' | 'overdue' | 'cancelled'
      paidAt: string
      paymentMethod: string
      notes: string
    }) => {
      const payload = {
        patientId: defaultPatientId,
        kind: v.kind,
        category: v.category,
        description: v.description || null,
        amount: v.amount,
        transactionDate: v.transactionDate,
        status: v.status,
        paidAt: v.paidAt || null,
        paymentMethod: v.paymentMethod || null,
        notes: v.notes || null,
      }
      if (editing) return update({ data: { ...payload, id: editing.id } })
      return create({ data: payload })
    },
    onSuccess: () => {
      toast.success(editing ? 'Lançamento atualizado.' : 'Lançamento criado.')
      onDone()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mut.mutate({
      kind: (fd.get('kind') as 'income' | 'expense') ?? 'income',
      category: String(fd.get('category') ?? '').trim(),
      description: String(fd.get('description') ?? ''),
      amount: Number(fd.get('amount') ?? 0),
      transactionDate: String(fd.get('transactionDate') ?? ''),
      status: (fd.get('status') as 'pending' | 'paid' | 'overdue' | 'cancelled') ?? 'pending',
      paidAt: String(fd.get('paidAt') ?? ''),
      paymentMethod: String(fd.get('paymentMethod') ?? ''),
      notes: String(fd.get('notes') ?? ''),
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 pt-2 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label>Tipo</Label>
        <select name="kind" defaultValue={editing?.kind ?? 'income'} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="income">Entrada</option>
          <option value="expense">Saída</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Categoria</Label>
        <Input name="category" defaultValue={editing?.category ?? ''} placeholder="Ex.: Sessão, Aluguel" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Valor (R$)</Label>
        <Input name="amount" type="number" step="0.01" min="0" defaultValue={editing?.amount ?? ''} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Data</Label>
        <Input name="transactionDate" type="date" defaultValue={editing?.transaction_date ?? new Date().toISOString().slice(0, 10)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Status</Label>
        <select name="status" defaultValue={editing?.status ?? 'pending'} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="pending">Pendente</option>
          <option value="paid">Pago</option>
          <option value="overdue">Atrasado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Data de pagamento</Label>
        <Input name="paidAt" type="date" defaultValue={editing?.paid_at ?? ''} />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label>Forma de pagamento</Label>
        <Input name="paymentMethod" defaultValue={editing?.payment_method ?? ''} placeholder="Pix, Cartão, Boleto…" />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label>Descrição</Label>
        <Input name="description" defaultValue={editing?.description ?? ''} placeholder="Ex.: Sessão de 06/07" />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label>Observações</Label>
        <Textarea name="notes" rows={3} defaultValue={editing?.notes ?? ''} />
      </div>
      {!lockPatient && !defaultPatientId ? (
        <p className="text-xs text-muted-foreground sm:col-span-2">
          Este lançamento será registrado como <strong>Empresa</strong>.
        </p>
      ) : null}
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" disabled={mut.isPending}>
          {mut.isPending ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar lançamento'}
        </Button>
      </div>
    </form>
  )
}
