'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createEvaluation, type ActionState } from '@/app/actions/clinical'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type CatalogItem = { id: number; name: string; acronym: string | null; category: string; estimatedMinutes: number | null }
type PatientOption = { id: number; name: string }

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? 'Criando…' : 'Criar avaliação e tarefas'}
    </Button>
  )
}

export function EvaluationForm({
  catalog,
  patients,
  fixedPatientId,
  triggerLabel = 'Nova avaliação',
  triggerVariant = 'default',
}: {
  catalog: CatalogItem[]
  patients?: PatientOption[]
  fixedPatientId?: number
  triggerLabel?: string
  triggerVariant?: 'default' | 'outline'
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState<ActionState, FormData>(createEvaluation, null)
  const [modality, setModality] = useState('presencial')

  useEffect(() => {
    if (!state) return
    if (state.ok) {
      toast.success(state.message)
      setOpen(false)
    } else {
      toast.error(state.message)
    }
  }, [state])

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogItem[]>()
    for (const test of catalog) {
      const list = map.get(test.category) ?? []
      list.push(test)
      map.set(test.category, list)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [catalog])

  const noCatalog = catalog.length === 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={triggerVariant} />}>
        <Plus />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Planejar avaliação</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-5 py-2">
          {fixedPatientId ? (
            <input type="hidden" name="patientId" value={fixedPatientId} />
          ) : (
            <div className="flex flex-col gap-2">
              <Label>Paciente</Label>
              <Select name="patientId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="title">Nome da avaliação</Label>
              <Input id="title" name="title" defaultValue="Avaliação neuropsicológica" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Modalidade</Label>
              <input type="hidden" name="modality" value={modality} />
              <Select value={modality} onValueChange={(v) => setModality(v ?? 'presencial')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="hibrida">Híbrida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="scheduledAt">Data e horário</Label>
            <Input id="scheduledAt" name="scheduledAt" type="datetime-local" className="sm:max-w-xs" />
          </div>

          <div>
            <Label className="mb-3 block">Testes a aplicar</Label>
            {noCatalog ? (
              <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                O catálogo ainda não foi carregado. Abra a página Catálogo de testes para gerá-lo.
              </p>
            ) : (
              <div className="flex max-h-80 flex-col gap-4 overflow-y-auto rounded-xl border p-4">
                {grouped.map(([category, tests]) => (
                  <div key={category}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {tests.map((test) => (
                        <label key={test.id} className="flex cursor-pointer items-start gap-3 rounded-lg p-2.5 hover:bg-muted">
                          <Checkbox name="testIds" value={String(test.id)} className="mt-0.5" />
                          <span>
                            <span className="block text-sm font-medium text-foreground">{test.acronym || test.name}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {test.name}
                              {test.estimatedMinutes ? ` · ${test.estimatedMinutes} min` : ''}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Badge variant="secondary">{catalog.length} testes disponíveis</Badge>
            <SubmitButton disabled={noCatalog} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
