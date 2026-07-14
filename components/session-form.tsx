'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { CalendarPlus } from 'lucide-react'
import { toast } from 'sonner'
import { createSession, type ActionState } from '@/app/actions/clinical'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type CatalogItem = { id: number; name: string; acronym: string | null; category: string; estimatedMinutes: number | null }
type PatientOption = { id: number; name: string }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Agendando…' : 'Agendar sessão'}
    </Button>
  )
}

export function SessionForm({
  catalog,
  patients,
  fixedPatientId,
  defaultDate,
  triggerLabel = 'Nova sessão',
  triggerVariant = 'default',
}: {
  catalog: CatalogItem[]
  patients?: PatientOption[]
  fixedPatientId?: number
  defaultDate?: string
  triggerLabel?: string
  triggerVariant?: 'default' | 'outline'
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState<ActionState, FormData>(createSession, null)
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={triggerVariant} />}>
        <CalendarPlus />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Planejar sessão</DialogTitle>
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Título da sessão</Label>
              <Input id="title" name="title" defaultValue="Sessão de aplicação" />
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
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sessionDate">Data</Label>
              <Input id="sessionDate" name="sessionDate" type="date" defaultValue={defaultDate} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="startTime">Início</Label>
              <Input id="startTime" name="startTime" type="time" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endTime">Término</Label>
              <Input id="endTime" name="endTime" type="time" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="objectives">Objetivos da sessão</Label>
            <Textarea id="objectives" name="objectives" rows={2} placeholder="Ex.: anamnese, aplicação de testes de atenção…" />
          </div>

          <div>
            <Label className="mb-3 block">Testes que podem ser aplicados nesta sessão</Label>
            <div className="flex max-h-64 flex-col gap-4 overflow-y-auto rounded-xl border p-4">
              {grouped.map(([category, tests]) => (
                <div key={category}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {tests.map((test) => (
                      <label key={test.id} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-muted">
                        <Checkbox name="plannedTestIds" value={String(test.id)} className="mt-0.5" />
                        <span className="text-sm font-medium text-foreground">
                          {test.acronym || test.name}
                          {test.estimatedMinutes ? <span className="ml-1 text-xs font-normal text-muted-foreground">· {test.estimatedMinutes} min</span> : null}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Badge variant="secondary">{catalog.length} testes no catálogo</Badge>
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
