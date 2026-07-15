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
  head: () => ({ meta: [{ title: 'Laudo — NeuroFlux' }] }),
  component: LaudoPage,
})

type LaudoForm = {
  psychologist: string
  crp: string
  solicitante: string
  finalidade: string
  local_avaliacao: string
  periodo: string
  num_encontros: string
  demand: string
  procedures: string
  instrumentos_aplicados: string
  instrumentos_complementares: string
  entrevista_terceiros: string
  analise_anamnese: string
  analise_intelectiva: string
  analise_atencao: string
  analise_memoria: string
  analise_linguagem: string
  analise_velocidade: string
  analise_visuoespacial: string
  analise_emocional: string
  analise_personalidade: string
  analise_habilidades_sociais: string
  analise_responsividade: string
  analise_criatividade: string
  sintese: string
  hypotheses: string
  recommendations: string
}

const empty: LaudoForm = {
  psychologist: '', crp: '', solicitante: '', finalidade: '', local_avaliacao: '',
  periodo: '', num_encontros: '',
  demand: '', procedures: '', instrumentos_aplicados: '', instrumentos_complementares: '',
  entrevista_terceiros: '', analise_anamnese: '', analise_intelectiva: '', analise_atencao: '',
  analise_memoria: '', analise_linguagem: '', analise_velocidade: '', analise_visuoespacial: '',
  analise_emocional: '', analise_personalidade: '', analise_habilidades_sociais: '',
  analise_responsividade: '', analise_criatividade: '', sintese: '', hypotheses: '',
  recommendations: '',
}

const sections: Array<[keyof LaudoForm, string, number]> = [
  ['demand', '2. Descrição da demanda', 4],
  ['procedures', '3. Procedimentos (visão geral)', 3],
  ['instrumentos_aplicados', '3.1 Instrumentos psicológicos aplicados (bullets)', 6],
  ['instrumentos_complementares', '3.2 Instrumentos complementares', 3],
  ['entrevista_terceiros', '3.3 Entrevistas com terceiros', 3],
  ['analise_anamnese', '4.1 Análise da anamnese e entrevistas', 6],
  ['analise_intelectiva', '4.2 Área intelectiva', 5],
  ['analise_atencao', '4.3 Atenção e funções executivas', 5],
  ['analise_memoria', '4.4 Memória e aprendizagem', 5],
  ['analise_linguagem', '4.5 Linguagem', 4],
  ['analise_velocidade', '4.6 Velocidade de processamento', 4],
  ['analise_visuoespacial', '4.7 Funções visuoespaciais', 4],
  ['analise_emocional', '4.8 Funcionamento emocional', 5],
  ['analise_personalidade', '4.9 Personalidade', 4],
  ['analise_habilidades_sociais', '4.10 Habilidades sociais', 4],
  ['analise_responsividade', '4.11 Responsividade social', 5],
  ['analise_criatividade', '4.12 Criatividade', 3],
  ['sintese', '5. Síntese integrativa', 6],
  ['hypotheses', '6. Hipóteses diagnósticas (DSM-5-TR / CID-11)', 5],
  ['recommendations', '7. Encaminhamentos e recomendações', 5],
]

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
      setForm((f) => {
        const next = { ...f }
        for (const k of Object.keys(next) as Array<keyof LaudoForm>) {
          const v = (d as Record<string, unknown>)[k]
          if (typeof v === 'string' && v.trim()) next[k] = v
        }
        return next
      })
      toast.success('Rascunho gerado pela IA.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const docxM = useMutation({
    mutationFn: () => fetchDocx({ data: { patientId: id, ...form } }),
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
            <h1 className="font-serif text-3xl font-semibold">Laudo neuropsicológico</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {patient?.name ?? '—'} · modelo alinhado à Resolução CFP 06/2019 e DSM-5-TR
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

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 font-serif text-lg font-semibold">1. Identificação</h2>
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
            <Input value={form.crp} placeholder="00/00000" onChange={(e) => setForm({ ...form, crp: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Solicitante</Label>
            <Input value={form.solicitante} onChange={(e) => setForm({ ...form, solicitante: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Finalidade</Label>
            <Input value={form.finalidade} onChange={(e) => setForm({ ...form, finalidade: e.target.value })} />
          </div>
          <div className="grid gap-1.5 md:col-span-2">
            <Label>Local da avaliação</Label>
            <Input value={form.local_avaliacao} onChange={(e) => setForm({ ...form, local_avaliacao: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Período da avaliação</Label>
            <Input value={form.periodo} placeholder="ex: abril a julho de 2026" onChange={(e) => setForm({ ...form, periodo: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Número de encontros</Label>
            <Input value={form.num_encontros} placeholder="ex: 10" onChange={(e) => setForm({ ...form, num_encontros: e.target.value })} />
          </div>
        </div>
      </section>

      <div className="grid gap-4">
        {sections.map(([key, label, rows]) => (
          <div key={key} className="grid gap-1.5">
            <Label>{label}</Label>
            <Textarea
              rows={rows}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
