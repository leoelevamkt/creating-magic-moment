import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Plus, Sparkles, Trash2 } from 'lucide-react'
import { listScreenings, saveScreening, deleteScreening, analyzeScreeningWithAI } from '@/lib/screenings.functions'
import { DSM5TR_DOMAINS } from '@/lib/dsm5tr-catalog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export const Route = createFileRoute('/_authenticated/patients/$id/triagem')({
  head: () => ({ meta: [{ title: 'Triagem — NeuroFlux' }] }),
  component: TriagemPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl p-8 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl p-8 text-sm">Triagem não encontrada.</div>
  ),
})

type Criterion = { code: string; label: string; present: boolean; notes?: string | null }
type ScreeningRow = {
  id: string
  patient_id: string
  instrument: string
  domain: string | null
  criteria: Criterion[]
  score: number | null
  ai_analysis: string | null
  notes: string | null
  created_at: string
}

function TriagemPage() {
  const { id } = Route.useParams()
  const qc = useQueryClient()
  const list = useServerFn(listScreenings)
  const del = useServerFn(deleteScreening)
  const analyze = useServerFn(analyzeScreeningWithAI)

  const q = useQuery({ queryKey: ['screenings', id], queryFn: () => list({ data: { patientId: id } }) })
  const rows = ((q.data ?? []) as unknown as ScreeningRow[])

  const delMut = useMutation({
    mutationFn: (screeningId: string) => del({ data: { id: screeningId } }),
    onSuccess: () => { toast.success('Triagem removida.'); qc.invalidateQueries({ queryKey: ['screenings', id] }) },
    onError: (e: Error) => toast.error(e.message),
  })
  const analyzeMut = useMutation({
    mutationFn: (screeningId: string) => analyze({ data: { id: screeningId } }),
    onSuccess: () => { toast.success('Análise gerada.'); qc.invalidateQueries({ queryKey: ['screenings', id] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/patients/$id" params={{ id }} className="text-xs text-muted-foreground hover:text-foreground">
            ← Voltar ao prontuário
          </Link>
          <h1 className="mt-1 font-serif text-3xl font-semibold">Triagem clínica</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Checklists resumidos do DSM-5-TR por domínio. Registre critérios observados e gere uma análise por IA.
          </p>
        </div>
        <NewScreeningDialog patientId={id} onDone={() => qc.invalidateQueries({ queryKey: ['screenings', id] })} />
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhuma triagem registrada. Use “Nova triagem”.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((r) => {
            const domain = DSM5TR_DOMAINS.find((d) => d.id === r.domain)
            const total = r.criteria.length
            const present = r.criteria.filter((c) => c.present).length
            return (
              <article key={r.id} className="rounded-2xl border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-xl font-semibold">
                      {domain?.name ?? r.domain ?? r.instrument}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                    {domain?.cutoff ? (
                      <p className="mt-1 text-xs text-muted-foreground">Corte: {domain.cutoff}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{present}/{total} critérios</Badge>
                    <Button size="sm" variant="outline" onClick={() => analyzeMut.mutate(r.id)} disabled={analyzeMut.isPending}>
                      <Sparkles /> IA
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => delMut.mutate(r.id)}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                  {r.criteria.map((c) => (
                    <li key={c.code} className={c.present ? 'text-foreground' : 'text-muted-foreground/60'}>
                      <span className="font-mono text-xs">{c.code}</span> {c.label}{c.present ? ' ✓' : ''}
                    </li>
                  ))}
                </ul>
                {r.notes ? (
                  <p className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">{r.notes}</p>
                ) : null}
                {r.ai_analysis ? (
                  <div className="mt-3 rounded-lg border bg-primary/5 p-3 text-sm">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Análise IA</p>
                    <p className="whitespace-pre-wrap">{r.ai_analysis}</p>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function NewScreeningDialog({ patientId, onDone }: { patientId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [domainId, setDomainId] = useState<string>(DSM5TR_DOMAINS[0]!.id)
  const domain = useMemo(() => DSM5TR_DOMAINS.find((d) => d.id === domainId)!, [domainId])
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')
  const save = useServerFn(saveScreening)

  const mut = useMutation({
    mutationFn: () => save({
      data: {
        patientId,
        instrument: 'dsm5tr',
        domain: domain.id,
        notes: notes || null,
        criteria: domain.criteria.map((c) => ({
          code: c.code, label: c.label, present: Boolean(checks[c.code]),
        })),
      },
    }),
    onSuccess: () => {
      toast.success('Triagem salva.')
      setOpen(false)
      setChecks({})
      setNotes('')
      onDone()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus /> Nova triagem
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Nova triagem DSM-5-TR</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label>Domínio</Label>
            <select
              value={domainId}
              onChange={(e) => { setDomainId(e.target.value); setChecks({}) }}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              {DSM5TR_DOMAINS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {domain.cutoff ? <p className="text-xs text-muted-foreground">Corte: {domain.cutoff}</p> : null}
          </div>
          <div className="flex flex-col gap-2 rounded-xl border p-3">
            {domain.criteria.map((c) => (
              <label key={c.code} className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/40">
                <Checkbox
                  checked={Boolean(checks[c.code])}
                  onCheckedChange={(v) => setChecks((s) => ({ ...s, [c.code]: Boolean(v) }))}
                  id={`chk-${c.code}`}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{c.code}</span>
                  {c.label}
                </span>
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Observações clínicas</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
              {mut.isPending ? 'Salvando…' : 'Salvar triagem'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
