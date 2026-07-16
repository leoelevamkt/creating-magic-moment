import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { AlertTriangle, Boxes, Minus, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  createMaterial,
  deleteMaterial,
  listMaterials,
  listMovements,
  registerMovement,
} from '@/lib/materials.functions'
import { getMyProfile } from '@/lib/profile.functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export const Route = createFileRoute('/_authenticated/materials')({
  head: () => ({ meta: [{ title: 'Materiais — NeuroFlux' }] }),
  component: MaterialsPage,
})

function MaterialsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const profileFn = useServerFn(getMyProfile)
  const listFn = useServerFn(listMaterials)
  const createFn = useServerFn(createMaterial)
  const deleteFn = useServerFn(deleteMaterial)
  const movFn = useServerFn(registerMovement)

  const profile = useQuery({ queryKey: ['profile'], queryFn: () => profileFn() })
  const isAdmin = profile.data?.role === 'admin'
  const materials = useQuery({ queryKey: ['materials'], queryFn: () => listFn() })

  const create = useMutation({
    mutationFn: (v: { name: string; category: string; unit: string; quantity: number; minQuantity: number; notes: string | null }) =>
      createFn({ data: v }),
    onSuccess: () => {
      toast.success('Material cadastrado.')
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['materials'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materials'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const move = useMutation({
    mutationFn: (v: { materialId: string; kind: 'in' | 'out' | 'adjust'; quantity: number; reason: string | null }) =>
      movFn({ data: v }),
    onSuccess: () => {
      toast.success('Movimentação registrada.')
      qc.invalidateQueries({ queryKey: ['materials'] })
      qc.invalidateQueries({ queryKey: ['mov'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    create.mutate({
      name: String(fd.get('name') ?? ''),
      category: String(fd.get('category') ?? 'geral') || 'geral',
      unit: String(fd.get('unit') ?? 'un') || 'un',
      quantity: Number(fd.get('quantity') ?? 0),
      minQuantity: Number(fd.get('minQuantity') ?? 0),
      notes: (String(fd.get('notes') ?? '') || null),
    })
  }

  const lowStock = (materials.data ?? []).filter((m) => m.quantity <= m.min_quantity).length

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Estoque</p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold">Materiais e testes</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Cadastro de materiais e cadernos de teste, com controle de quantidade em estoque e alertas.
          </p>
          {lowStock > 0 ? (
            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
              <AlertTriangle size={14} /> {lowStock} item(ns) abaixo do mínimo
            </p>
          ) : null}
        </div>
        {isAdmin ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>
              <Plus /> Novo material
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">Cadastrar material</DialogTitle>
              </DialogHeader>
              <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
                <div className="flex flex-col gap-2">
                  <Label>Nome</Label>
                  <Input name="name" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-2">
                    <Label>Categoria</Label>
                    <Input name="category" defaultValue="Teste" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Unidade</Label>
                    <Input name="unit" defaultValue="un" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Mínimo</Label>
                    <Input type="number" name="minQuantity" defaultValue={0} min={0} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Quantidade inicial</Label>
                  <Input type="number" name="quantity" defaultValue={0} min={0} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Observações</Label>
                  <Textarea name="notes" rows={2} />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={create.isPending}>
                    {create.isPending ? 'Salvando…' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Material</th>
                <th className="px-4 py-3 text-left">Categoria</th>
                <th className="px-4 py-3 text-right">Estoque</th>
                <th className="px-4 py-3 text-right">Mín.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(materials.data ?? []).map((m) => {
                const low = m.quantity <= m.min_quantity
                return (
                  <tr
                    key={m.id}
                    className={`cursor-pointer border-t hover:bg-muted/40 ${selected === m.id ? 'bg-muted/60' : ''}`}
                    onClick={() => setSelected(m.id)}
                  >
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.category}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${low ? 'text-amber-700' : ''}`}>
                      {m.quantity} {m.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{m.min_quantity}</td>
                    <td className="px-4 py-3 text-right">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Excluir "${m.name}"?`)) del.mutate(m.id)
                          }}
                          aria-label="Excluir"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
              {(materials.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    <Boxes className="mx-auto mb-2" />
                    Nenhum material cadastrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <MovementPanel
          materialId={selected}
          onMove={(v) => move.mutate(v)}
          pending={move.isPending}
        />
      </div>
    </div>
  )
}

function MovementPanel({
  materialId,
  onMove,
  pending,
}: {
  materialId: string | null
  onMove: (v: { materialId: string; kind: 'in' | 'out' | 'adjust'; quantity: number; reason: string | null }) => void
  pending: boolean
}) {
  const listMovFn = useServerFn(listMovements)
  const movs = useQuery({
    queryKey: ['mov', materialId],
    queryFn: () => listMovFn({ data: { materialId: materialId! } }),
    enabled: !!materialId,
  })

  if (!materialId) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Selecione um material para registrar entradas, saídas e ver o histórico.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <p className="text-sm font-semibold">Movimentar estoque</p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const kind = String(fd.get('kind') ?? 'in') as 'in' | 'out' | 'adjust'
          const qty = Number(fd.get('quantity') ?? 0)
          if (qty < 0) return
          onMove({
            materialId,
            kind,
            quantity: qty,
            reason: (String(fd.get('reason') ?? '') || null),
          })
          e.currentTarget.reset()
        }}
        className="flex flex-col gap-2"
      >
        <div className="grid grid-cols-[1fr_1fr] gap-2">
          <select name="kind" defaultValue="in" className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="in">Entrada</option>
            <option value="out">Saída</option>
            <option value="adjust">Ajuste (define total)</option>
          </select>
          <Input type="number" name="quantity" min={0} defaultValue={1} required />
        </div>
        <Input name="reason" placeholder="Motivo (opcional)" />
        <Button type="submit" size="sm" disabled={pending}>
          <Plus /> <Minus /> Registrar
        </Button>
      </form>
      <div className="mt-2 flex flex-col gap-2 border-t pt-3">
        <p className="text-xs font-semibold text-muted-foreground">Histórico</p>
        {(movs.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem movimentações.</p>
        ) : (
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {(movs.data ?? []).map((m) => (
              <div key={m.id} className="rounded-md border bg-background px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {m.kind === 'in' ? 'Entrada' : m.kind === 'out' ? 'Saída' : 'Ajuste'} · {m.quantity}
                  </span>
                  <span className="text-muted-foreground">{format(new Date(m.created_at), 'dd/MM HH:mm')}</span>
                </div>
                {m.reason ? <p className="text-muted-foreground">{m.reason}</p> : null}
                <p className="text-muted-foreground">por {m.author_name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
