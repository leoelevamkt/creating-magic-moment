import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { HeartHandshake, Plus, Sparkles, Trash2 } from 'lucide-react'
import { listScreenings, saveScreening, deleteScreening, analyzeScreeningWithAI, analyzeSocialScreeningWithAI } from '@/lib/screenings.functions'
import { DSM5TR_DOMAINS } from '@/lib/dsm5tr-catalog'
import { SOCIAL_TRIAGEM_SECTIONS, SALARIO_MINIMO_BRL, faixaTarifa, FAIXA_LABELS } from '@/lib/social-triagem-catalog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

type Criterion = { code: string; label: string; present: boolean; notes?: string | null; value?: string | number | null }
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
  const analyzeSocial = useServerFn(analyzeSocialScreeningWithAI)

  const q = useQuery({ queryKey: ['screenings', id], queryFn: () => list({ data: { patientId: id } }) })
  const rows = ((q.data ?? []) as unknown as ScreeningRow[])

  const delMut = useMutation({
    mutationFn: (screeningId: string) => del({ data: { id: screeningId } }),
    onSuccess: () => { toast.success('Triagem removida.'); qc.invalidateQueries({ queryKey: ['screenings', id] }) },
    onError: (e: Error) => toast.error(e.message),
  })
  const analyzeMut = useMutation({
    mutationFn: ({ id: sid, social }: { id: string; social: boolean }) =>
      social ? analyzeSocial({ data: { id: sid } }) : analyze({ data: { id: sid } }),
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
            Checklists resumidos do DSM-5-TR por domínio e triagem social para elegibilidade de gratuidade/subsídio.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NewSocialScreeningDialog patientId={id} onDone={() => qc.invalidateQueries({ queryKey: ['screenings', id] })} />
          <NewScreeningDialog patientId={id} onDone={() => qc.invalidateQueries({ queryKey: ['screenings', id] })} />
        </div>
      </header>


      {rows.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhuma triagem registrada. Use “Nova triagem”.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((r) => {
            const isSocial = r.instrument === 'social'
            const domain = isSocial ? null : DSM5TR_DOMAINS.find((d) => d.id === r.domain)
            const meta = isSocial ? socialMeta(r.criteria) : null
            const nonMeta = r.criteria.filter((c) => !['RENDA_MENSAL', 'PESSOAS_DOMICILIO'].includes(c.code))
            const total = nonMeta.length
            const present = nonMeta.filter((c) => c.present).length
            const title = isSocial
              ? 'Triagem social'
              : (domain?.name ?? r.domain ?? r.instrument)
            return (
              <article key={r.id} className="rounded-2xl border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-xl font-semibold">{title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                    {domain?.cutoff ? (
                      <p className="mt-1 text-xs text-muted-foreground">Corte: {domain.cutoff}</p>
                    ) : null}
                    {meta ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Renda per capita: R$ {meta.perCapita.toFixed(2)} ({meta.perCapitaSM.toFixed(2)} SM · SM = R$ {SALARIO_MINIMO_BRL})
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {meta ? (
                      <Badge variant={meta.faixa === 'gratuidade' ? 'default' : meta.faixa === 'subsidio' ? 'secondary' : 'outline'}>
                        {FAIXA_LABELS[meta.faixa].badge}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{present}/{total} critérios</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => analyzeMut.mutate({ id: r.id, social: isSocial })}
                      disabled={analyzeMut.isPending}
                    >
                      <Sparkles /> IA
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => delMut.mutate(r.id)}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                  {nonMeta.map((c) => (
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

function socialMeta(criteria: Criterion[]) {
  const num = (code: string) => {
    const c = criteria.find((x) => x.code === code)
    if (!c || c.value === null || c.value === undefined || c.value === '') return 0
    const n = Number(c.value)
    return Number.isFinite(n) ? n : 0
  }
  const renda = num('RENDA_MENSAL')
  const pessoas = Math.max(1, num('PESSOAS_DOMICILIO') || 1)
  const perCapita = renda / pessoas
  const perCapitaSM = perCapita / SALARIO_MINIMO_BRL
  return { renda, pessoas, perCapita, perCapitaSM, faixa: faixaTarifa(perCapitaSM) }
}

function NewSocialScreeningDialog({ patientId, onDone }: { patientId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [renda, setRenda] = useState<string>('')
  const [pessoas, setPessoas] = useState<string>('')
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')
  const save = useServerFn(saveScreening)

  const rendaNum = Number(renda) || 0
  const pessoasNum = Math.max(1, Number(pessoas) || 1)
  const perCapita = rendaNum / pessoasNum
  const perCapitaSM = perCapita / SALARIO_MINIMO_BRL
  const faixa = faixaTarifa(perCapitaSM)

  const mut = useMutation({
    mutationFn: () => {
      const criteria: Array<{ code: string; label: string; present: boolean; value?: string | number | null }> = [
        { code: 'RENDA_MENSAL', label: 'Renda familiar mensal (R$)', present: true, value: rendaNum },
        { code: 'PESSOAS_DOMICILIO', label: 'Pessoas no domicílio', present: true, value: pessoasNum },
      ]
      for (const sec of SOCIAL_TRIAGEM_SECTIONS) {
        for (const it of sec.items) {
          criteria.push({ code: it.code, label: it.label, present: Boolean(checks[it.code]) })
        }
      }
      return save({
        data: {
          patientId,
          instrument: 'social',
          domain: 'triagem-social',
          notes: notes || null,
          criteria,
        },
      })
    },
    onSuccess: () => {
      toast.success('Triagem social salva.')
      setOpen(false)
      setChecks({}); setRenda(''); setPessoas(''); setNotes('')
      onDone()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <HeartHandshake /> Nova triagem social
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Triagem social e socioeconômica</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Renda familiar mensal (R$)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={renda}
                onChange={(e) => setRenda(e.target.value)}
                placeholder="Ex.: 2500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Pessoas no domicílio</Label>
              <Input
                type="number"
                min={1}
                step="1"
                inputMode="numeric"
                value={pessoas}
                onChange={(e) => setPessoas(e.target.value)}
                placeholder="Ex.: 4"
              />
            </div>
          </div>

          {rendaNum > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3 text-sm">
              <div>
                <p>
                  Renda per capita: <strong>R$ {perCapita.toFixed(2)}</strong> ({perCapitaSM.toFixed(2)} SM)
                </p>
                <p className="text-xs text-muted-foreground">SM referência: R$ {SALARIO_MINIMO_BRL}</p>
              </div>
              <Badge variant={faixa === 'gratuidade' ? 'default' : faixa === 'subsidio' ? 'secondary' : 'outline'}>
                {FAIXA_LABELS[faixa].badge}
              </Badge>
            </div>
          ) : null}

          {SOCIAL_TRIAGEM_SECTIONS.map((sec) => (
            <div key={sec.id} className="flex flex-col gap-2 rounded-xl border p-3">
              <div>
                <p className="font-medium">{sec.name}</p>
                {sec.help ? <p className="text-xs text-muted-foreground">{sec.help}</p> : null}
              </div>
              {sec.items.map((it) => (
                <label key={it.code} className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/40">
                  <Checkbox
                    checked={Boolean(checks[it.code])}
                    onCheckedChange={(v) => setChecks((s) => ({ ...s, [it.code]: Boolean(v) }))}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">{it.code}</span>
                    {it.label}
                  </span>
                </label>
              ))}
            </div>
          ))}

          <div className="flex flex-col gap-1.5">
            <Label>Observações da entrevista social</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => mut.mutate()} disabled={mut.isPending || !renda || !pessoas}>
              {mut.isPending ? 'Salvando…' : 'Salvar triagem social'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

