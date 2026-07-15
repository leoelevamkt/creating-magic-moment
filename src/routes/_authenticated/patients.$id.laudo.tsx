import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { Download, Sparkles } from 'lucide-react'
import {
  getLaudoContext,
  generateLaudoDraft,
  generateLaudoDocx,
} from '@/lib/laudo.functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/_authenticated/patients/$id/laudo')({
  beforeLoad: ({ context }) => {
    if ((context as { role?: string }).role !== 'admin') throw redirect({ to: '/kanban' })
  },
  head: () => ({ meta: [{ title: 'Laudo — NeuroFlux' }] }),
  component: LaudoPage,
})

type LaudoForm = {
  demand: string
  procedures: string
  results: string
  hypotheses: string
  conclusion: string
  recommendations: string
  psychologist: string
  crp: string
}

const empty: LaudoForm = {
  demand: '',
  procedures: '',
  results: '',
  hypotheses: '',
  conclusion: '',
  recommendations: '',
  psychologist: '',
  crp: '',
}

function LaudoPage() {
  const { id } = Route.useParams()
  const fetchCtx = useServerFn(getLaudoContext)
  const fetchDraft = useServerFn(generateLaudoDraft)
  const fetchDocx = useServerFn(generateLaudoDocx)

  const ctxQ = useQuery({
    queryKey: ['laudo-ctx', id],
    queryFn: () => fetchCtx({ data: { patientId: id } }),
  })

  const [form, setForm] = useState<LaudoForm>(empty)

  const draftM = useMutation({
    mutationFn: () => fetchDraft({ data: { patientId: id } }),
    onSuccess: (d) => {
      setForm((f) => ({
        ...f,
        demand: d.demand ?? f.demand,
        procedures: d.procedures ?? f.procedures,
        results: d.results ?? f.results,
        hypotheses: d.hypotheses ?? f.hypotheses,
        conclusion: d.conclusion ?? f.conclusion,
        recommendations: d.recommendations ?? f.recommendations,
      }))
      toast.success('Rascunho gerado pela IA.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const docxM = useMutation({
    mutationFn: () =>
      fetchDocx({
        data: {
          patientId: id,
          ...form,
        },
      }),
    onSuccess: ({ base64, filename }) => {
      const bin = atob(base64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Laudo baixado.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const patient = ctxQ.data?.patient
  const tasks = ctxQ.data?.tasks ?? []
  const screenings = ctxQ.data?.screenings ?? []

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <Link to="/patients/$id" params={{ id }} className="text-xs text-muted-foreground hover:text-foreground">
          ← Prontuário
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-semibold">Laudo psicológico</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {patient?.name ?? '—'} · alinhado à Resolução CFP 06/2019
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => draftM.mutate()} disabled={draftM.isPending}>
              <Sparkles className="mr-2 h-4 w-4" />
              {draftM.isPending ? 'Gerando…' : 'Gerar rascunho (IA)'}
            </Button>
            <Button onClick={() => docxM.mutate()} disabled={docxM.isPending}>
              <Download className="mr-2 h-4 w-4" />
              {docxM.isPending ? 'Preparando…' : 'Baixar .docx'}
            </Button>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border bg-card p-5 text-sm">
        <p className="font-medium text-foreground">Fontes que serão incluídas</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>{tasks.length} resultado(s) de teste aprovado(s)</li>
          <li>{screenings.length} triagem(ens) DSM-5-TR</li>
          <li>Anamnese: {ctxQ.data?.anamnese ? 'presente' : 'não preenchida'}</li>
        </ul>
      </section>

      <div className="grid gap-4">
        {[
          ['demand', 'Demanda / Queixa', 4],
          ['procedures', 'Procedimentos', 3],
          ['results', 'Análise dos resultados', 6],
          ['hypotheses', 'Hipóteses diagnósticas', 4],
          ['conclusion', 'Conclusão', 4],
          ['recommendations', 'Encaminhamentos e orientações', 4],
        ].map(([key, label, rows]) => (
          <div key={key as string} className="grid gap-1.5">
            <Label>{label as string}</Label>
            <Textarea
              rows={rows as number}
              value={form[key as keyof LaudoForm]}
              onChange={(e) => setForm({ ...form, [key as string]: e.target.value })}
            />
          </div>
        ))}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Psicóloga responsável</Label>
            <Input
              value={form.psychologist}
              placeholder={ctxQ.data?.psychologistName ?? 'Nome completo'}
              onChange={(e) => setForm({ ...form, psychologist: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>CRP</Label>
            <Input
              value={form.crp}
              placeholder="00/00000"
              onChange={(e) => setForm({ ...form, crp: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
