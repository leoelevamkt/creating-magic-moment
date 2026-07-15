import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { CalendarClock, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  createAgendaBlock,
  deleteAgendaBlock,
  listAgendaBlocks,
} from '@/lib/agenda-blocks.functions'
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

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const KIND_LABEL: Record<string, string> = {
  lunch: 'Almoço',
  supervision: 'Supervisão',
  off: 'Folga',
  other: 'Outro',
}

export function AgendaBlocksDialog() {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const list = useServerFn(listAgendaBlocks)
  const create = useServerFn(createAgendaBlock)
  const remove = useServerFn(deleteAgendaBlock)

  const blocks = useQuery({
    queryKey: ['agenda-blocks'],
    queryFn: () => list(),
    enabled: open,
  })

  const [recurrence, setRecurrence] = useState<'weekly' | 'once'>('weekly')

  type BlockPayload = {
    title: string
    kind: 'lunch' | 'supervision' | 'off' | 'other'
    recurrence: 'weekly' | 'once'
    weekday: number | null
    blockDate: string | null
    startTime: string
    endTime: string
    notes: string | null
  }
  const createMut = useMutation({
    mutationFn: (v: BlockPayload) => create({ data: v }),
    onSuccess: () => {
      toast.success('Bloqueio salvo.')
      qc.invalidateQueries({ queryKey: ['agenda-blocks'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success('Bloqueio removido.')
      qc.invalidateQueries({ queryKey: ['agenda-blocks'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const rec = String(fd.get('recurrence') ?? 'weekly') as 'weekly' | 'once'
    createMut.mutate({
      title: String(fd.get('title') ?? ''),
      kind: String(fd.get('kind') ?? 'other') as 'lunch' | 'supervision' | 'off' | 'other',
      recurrence: rec,
      weekday: rec === 'weekly' ? Number(fd.get('weekday') ?? 1) : null,
      blockDate: rec === 'once' ? String(fd.get('blockDate') ?? '') : null,
      startTime: String(fd.get('startTime') ?? ''),
      endTime: String(fd.get('endTime') ?? ''),
      notes: String(fd.get('notes') ?? '') || null,
    })
    e.currentTarget.reset()
    setRecurrence('weekly')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <CalendarClock /> Bloqueios
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Bloqueios de horário</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-xl border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Título</Label>
              <Input name="title" required placeholder="Ex.: Almoço" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Tipo</Label>
              <select name="kind" className="h-10 rounded-md border bg-background px-3 text-sm">
                <option value="lunch">Almoço</option>
                <option value="supervision">Supervisão</option>
                <option value="off">Folga</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label>Recorrência</Label>
              <select
                name="recurrence"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as 'weekly' | 'once')}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="weekly">Semanal</option>
                <option value="once">Data única</option>
              </select>
            </div>
            {recurrence === 'weekly' ? (
              <div className="flex flex-col gap-2">
                <Label>Dia da semana</Label>
                <select
                  name="weekday"
                  defaultValue="1"
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  {WEEKDAYS.map((w, i) => (
                    <option key={i} value={i}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label>Data</Label>
                <Input type="date" name="blockDate" required />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label>Início</Label>
                <Input type="time" name="startTime" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Fim</Label>
                <Input type="time" name="endTime" required />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Observações</Label>
            <Textarea name="notes" rows={2} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={createMut.isPending}>
              <Plus /> {createMut.isPending ? 'Salvando…' : 'Adicionar bloqueio'}
            </Button>
          </div>
        </form>

        <div className="mt-4 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Seus bloqueios
          </p>
          {blocks.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (blocks.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum bloqueio cadastrado.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(blocks.data ?? []).map((b) => (
                <li
                  key={b.id}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="flex flex-col text-sm">
                    <span className="font-medium">
                      {b.title}{' '}
                      <span className="text-xs text-muted-foreground">
                        · {KIND_LABEL[b.kind] ?? b.kind}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {b.recurrence === 'weekly'
                        ? `Toda ${WEEKDAYS[b.weekday ?? 0]}`
                        : `Em ${b.block_date}`}{' '}
                      · {b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)}
                    </span>
                    {b.notes ? (
                      <span className="mt-1 text-xs text-muted-foreground">{b.notes}</span>
                    ) : null}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeMut.mutate(b.id)}
                    aria-label="Remover"
                  >
                    <Trash2 size={16} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
