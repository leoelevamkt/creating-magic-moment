import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { FileUp, Mic, Sparkles, Square, User2, Wand2 } from 'lucide-react'
import { getAnamnese, upsertAnamnese, analyzeAnamneseWithAI } from '@/lib/anamneses.functions'
import { listScreenings } from '@/lib/screenings.functions'
import { getPatientDetail } from '@/lib/patients.functions'
import { formatAge } from '@/lib/age'
import { importAnamneseFromPdf } from '@/lib/anamnese-import.functions'

import { transcribeAudio } from '@/lib/transcribe.functions'
import { SegmentedRecorder, blobToBase64, chunkAudioFile } from '@/lib/audio-chunker'
import type { ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NeuroChildAnamnese, type ChildNeuroData } from '@/components/anamnese/NeuroChildAnamnese'
import { NeuroAdultAnamnese, type AdultNeuroData } from '@/components/anamnese/NeuroAdultAnamnese'

export const Route = createFileRoute('/_authenticated/patients/$id/anamnese')({
  head: () => ({ meta: [{ title: 'Anamnese — NeuroFlux' }] }),
  component: AnamnesePage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl p-8 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl p-8 text-sm">Anamnese não encontrada.</div>
  ),
})

type Fields =
  | 'queixa_principal'
  | 'historia_atual'
  | 'desenvolvimento'
  | 'historia_medica'
  | 'medicacoes'
  | 'historia_familiar'
  | 'historia_escolar'
  | 'historia_social'
  | 'observacoes'
  | 'transcript'

const SECTIONS: Array<{ id: Fields; label: string; hint?: string; rows?: number }> = [
  { id: 'queixa_principal', label: 'Queixa principal', rows: 3 },
  { id: 'historia_atual', label: 'História da queixa atual', rows: 4 },
  { id: 'desenvolvimento', label: 'Desenvolvimento (gestação, marcos)', rows: 4 },
  { id: 'historia_medica', label: 'História médica e neurológica', rows: 4 },
  { id: 'medicacoes', label: 'Medicações em uso', rows: 2 },
  { id: 'historia_familiar', label: 'História familiar', rows: 4 },
  { id: 'historia_escolar', label: 'História escolar / ocupacional', rows: 4 },
  { id: 'historia_social', label: 'História social e relacional', rows: 4 },
  { id: 'observacoes', label: 'Observações clínicas', rows: 3 },
]

type Guardian = { name?: string; relation?: string; phone?: string; email?: string }
type Professional = { name?: string; specialty?: string; contact?: string }

function AnamnesePage() {
  const { id } = Route.useParams()
  const qc = useQueryClient()
  const fetchAn = useServerFn(getAnamnese)
  const save = useServerFn(upsertAnamnese)
  const analyze = useServerFn(analyzeAnamneseWithAI)
  const scrFn = useServerFn(listScreenings)
  const patFn = useServerFn(getPatientDetail)

  const q = useQuery({ queryKey: ['anamnese', id], queryFn: () => fetchAn({ data: { patientId: id } }) })
  const screenings = useQuery({ queryKey: ['screenings', id], queryFn: () => scrFn({ data: { patientId: id } }) })
  const patQ = useQuery({ queryKey: ['patient-detail', id], queryFn: () => patFn({ data: { id } }) })
  const patient = patQ.data?.patient as
    | undefined
    | {
        name: string
        sex: string | null
        birth_date: string | null
        schooling: string | null
        city: string | null
        phone: string | null
        medications: string | null
        hypotheses: string | null
        guardians: Guardian[] | null
        professionals: Professional[] | null
      }

  const [values, setValues] = useState<Record<Fields, string>>({
    queixa_principal: '', historia_atual: '', desenvolvimento: '', historia_medica: '',
    medicacoes: '', historia_familiar: '', historia_escolar: '', historia_social: '',
    observacoes: '', transcript: '',
  })
  const [activeTarget, setActiveTarget] = useState<Fields>('historia_atual')
  const [analysis, setAnalysis] = useState<string>('')
  const [mode, setMode] = useState<'livre' | 'neuro_child' | 'neuro_adult'>('livre')
  const [childData, setChildData] = useState<ChildNeuroData>({})
  const [adultData, setAdultData] = useState<AdultNeuroData>({})
  const hydrated = useRef(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (q.isSuccess && !hydrated.current) {
      hydrated.current = true
      setLoaded(true)
      if (!q.data) return

      setValues({
        queixa_principal: q.data.queixa_principal ?? '',
        historia_atual: q.data.historia_atual ?? '',
        desenvolvimento: q.data.desenvolvimento ?? '',
        historia_medica: q.data.historia_medica ?? '',
        medicacoes: q.data.medicacoes ?? '',
        historia_familiar: q.data.historia_familiar ?? '',
        historia_escolar: q.data.historia_escolar ?? '',
        historia_social: q.data.historia_social ?? '',
        observacoes: q.data.observacoes ?? '',
        transcript: q.data.transcript ?? '',
      })
      const sd = (q.data as { structured_data?: Record<string, unknown> | null }).structured_data ?? {}
      const child = (sd as Record<string, unknown>).child_neuro
      if (child && typeof child === 'object') {
        setChildData(child as ChildNeuroData)
        setMode('neuro_child')
      }
      const adult = (sd as Record<string, unknown>).adult_neuro
      if (adult && typeof adult === 'object') {
        setAdultData(adult as AdultNeuroData)
        setMode('neuro_adult')
      }
    }
  }, [q.data])

  // Auto-preencher a partir dos dados já cadastrados do paciente.
  useEffect(() => {
    if (!patient || !q.isSuccess) return
    // Anamnese livre: só preenche se o campo estiver vazio, para não sobrescrever.
    setValues((cur) => {
      const next = { ...cur }
      if (!next.medicacoes && patient.medications) next.medicacoes = patient.medications
      // história familiar: usa hipóteses ou lista de responsáveis como ponto de partida
      if (!next.historia_familiar && patient.guardians && patient.guardians.length > 0) {
        next.historia_familiar = patient.guardians
          .filter((g) => g?.name)
          .map((g) => `${g.name}${g.relation ? ` (${g.relation})` : ''}${g.phone ? ' · ' + g.phone : ''}`)
          .join('\n')
      }
      return next
    })
    setChildData((cur) => {
      const draft: Record<string, unknown> = { ...cur }
      const setIf = (k: string, v: string | null | undefined) => {
        if (v && !draft[k]) draft[k] = v
      }
      setIf('nome', patient.name)
      setIf('nascimento', patient.birth_date ?? undefined)
      setIf('sexo', patient.sex ?? undefined)
      setIf('escola', patient.schooling ?? undefined)
      setIf('cidade_uf', patient.city ?? undefined)
      setIf('hipotese_encaminhante', patient.hypotheses ?? undefined)
      if (patient.birth_date && !draft.idade) draft.idade = formatAge(patient.birth_date)
      if (patient.guardians && patient.guardians.length > 0) {
        const g0 = patient.guardians[0]
        setIf('responsaveis', patient.guardians.map((g) => g?.name).filter(Boolean).join(', '))
        setIf('relacao', g0?.relation ?? undefined)
        setIf('contato_resp', [g0?.phone, g0?.email].filter(Boolean).join(' · ') || patient.phone || undefined)
      } else if (patient.phone) {
        setIf('contato_resp', patient.phone)
      }
      if (patient.professionals && patient.professionals.length > 0 && !draft.encaminhado_por) {
        const p0 = patient.professionals[0]
        draft.encaminhado_por = `${p0?.name ?? ''}${p0?.specialty ? ' — ' + p0.specialty : ''}`.trim()
      }
      // composição familiar inicial a partir dos responsáveis, se ainda vazia
      const comp = draft.composicao_familiar as unknown[] | undefined
      if ((!comp || comp.length === 0) && patient.guardians && patient.guardians.length > 0) {
        draft.composicao_familiar = patient.guardians.map((g) => ({
          nome: g?.name ?? '',
          relacao: g?.relation ?? '',
          idade: '',
          ocupacao: '',
        }))
      }
      return draft
    })
    setAdultData((cur) => {
      const draft: Record<string, unknown> = { ...cur }
      const setIf = (k: string, v: string | null | undefined) => {
        if (v && !draft[k]) draft[k] = v
      }
      setIf('nome', patient.name)
      setIf('nascimento', patient.birth_date ?? undefined)
      setIf('sexo', patient.sex ?? undefined)
      setIf('escolaridade', patient.schooling ?? undefined)
      setIf('cidade_uf', patient.city ?? undefined)
      setIf('contato', patient.phone ?? undefined)
      if (patient.birth_date && !draft.idade) draft.idade = formatAge(patient.birth_date)
      if (patient.professionals && patient.professionals.length > 0 && !draft.encaminhado_por) {
        const p0 = patient.professionals[0]
        draft.encaminhado_por = `${p0?.name ?? ''}${p0?.specialty ? ' — ' + p0.specialty : ''}`.trim()
      }
      return draft
    })
  }, [patient, q.isSuccess])


  // ---- Rascunho automático local (recuperação em caso de falha ao salvar) ----
  const draftKey = `anamnese-draft:${id}`
  const canSave = loaded

  useEffect(() => {
    if (!canSave) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ at: new Date().toISOString(), values, childData, adultData }),
        )
      } catch { /* quota */ }
    }, 1500)
    return () => clearTimeout(t)
  }, [values, childData, adultData, canSave, draftKey])

  const saveMut = useMutation({
    mutationFn: () => {
      if (!canSave) throw new Error('Aguarde o carregamento da anamnese antes de salvar.')
      return save({ data: { patientId: id, ...values, structured_data: { child_neuro: childData, adult_neuro: adultData } } })
    },
    onSuccess: () => {
      toast.success('Anamnese salva.')
      try { localStorage.removeItem(draftKey) } catch { /* noop */ }
      qc.invalidateQueries({ queryKey: ['anamnese', id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })


  const analyzeMut = useMutation({
    mutationFn: () => analyze({ data: { patientId: id } }),
    onSuccess: (r) => { setAnalysis(r.analysis); toast.success('Análise gerada.') },
    onError: (e: Error) => toast.error(e.message),
  })

  const importPdf = useServerFn(importAnamneseFromPdf)
  const [importing, setImporting] = useState(false)
  const [importReport, setImportReport] = useState<{ count: number; notes: string; unmapped: string; overwrite: boolean } | null>(null)

  async function onImportPdf(file: File, overwrite: boolean) {
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx. 20 MB).')
      return
    }
    setImporting(true)
    setImportReport(null)
    try {
      const buf = await file.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let bin = ''
      const CHUNK = 0x8000
      for (let i = 0; i < bytes.length; i += CHUNK) {
        bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
      }
      const b64 = btoa(bin)
      const res = await importPdf({
        data: {
          fileBase64: b64,
          mimeType: file.type || 'application/pdf',
          filename: file.name,
          mode,
        },
      })
      const applied = res.fields ?? {}
      if (mode === 'livre') {
        setValues((cur) => {
          const next = { ...cur }
          for (const [k, v] of Object.entries(applied)) {
            if (!(k in next)) continue
            const key = k as Fields
            if (overwrite || !next[key]) next[key] = v
            else next[key] = `${next[key]}\n\n${v}`
          }
          if (res.unmapped) {
            next.observacoes = [next.observacoes, '--- Conteúdo adicional do PDF ---', res.unmapped]
              .filter(Boolean).join('\n\n')
          }
          return next
        })
      } else if (mode === 'neuro_child') {
        setChildData((cur) => {
          const draft: Record<string, unknown> = { ...cur }
          for (const [k, v] of Object.entries(applied)) {
            const existing = draft[k]
            if (overwrite || !existing) draft[k] = v
            else if (typeof existing === 'string') draft[k] = `${existing}\n\n${v}`
          }
          return draft
        })
      } else {
        setAdultData((cur) => {
          const draft: Record<string, unknown> = { ...cur }
          for (const [k, v] of Object.entries(applied)) {
            const existing = draft[k]
            if (overwrite || !existing) draft[k] = v
            else if (typeof existing === 'string') draft[k] = `${existing}\n\n${v}`
          }
          return draft
        })
      }
      setImportReport({ count: res.extractedCount, notes: res.notes, unmapped: res.unmapped, overwrite })
      toast.success(`PDF importado: ${res.extractedCount} campo(s) preenchido(s).`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao importar PDF.')
    } finally {
      setImporting(false)
    }
  }


  function insertText(text: string) {
    setValues((v) => ({ ...v, [activeTarget]: (v[activeTarget] ? v[activeTarget] + '\n\n' : '') + text }))
  }

  function refillFromPatient() {
    if (!patient) return
    setChildData((cur) => {
      const draft: Record<string, unknown> = { ...cur }
      draft.nome = patient.name
      if (patient.birth_date) {
        draft.nascimento = patient.birth_date
        draft.idade = formatAge(patient.birth_date)
      }
      if (patient.sex) draft.sexo = patient.sex
      if (patient.schooling) draft.escola = patient.schooling
      if (patient.city) draft.cidade_uf = patient.city
      if (patient.hypotheses) draft.hipotese_encaminhante = patient.hypotheses
      if (patient.guardians && patient.guardians.length > 0) {
        const g0 = patient.guardians[0]
        draft.responsaveis = patient.guardians.map((g) => g?.name).filter(Boolean).join(', ')
        if (g0?.relation) draft.relacao = g0.relation
        const contact = [g0?.phone, g0?.email].filter(Boolean).join(' · ') || patient.phone || ''
        if (contact) draft.contato_resp = contact
      }
      if (patient.professionals && patient.professionals.length > 0) {
        const p0 = patient.professionals[0]
        draft.encaminhado_por = `${p0?.name ?? ''}${p0?.specialty ? ' — ' + p0.specialty : ''}`.trim()
      }
      return draft
    })
    setAdultData((cur) => {
      const draft: Record<string, unknown> = { ...cur }
      draft.nome = patient.name
      if (patient.birth_date) {
        draft.nascimento = patient.birth_date
        draft.idade = formatAge(patient.birth_date)
      }
      if (patient.sex) draft.sexo = patient.sex
      if (patient.schooling) draft.escolaridade = patient.schooling
      if (patient.city) draft.cidade_uf = patient.city
      if (patient.phone) draft.contato = patient.phone
      if (patient.professionals && patient.professionals.length > 0) {
        const p0 = patient.professionals[0]
        draft.encaminhado_por = `${p0?.name ?? ''}${p0?.specialty ? ' — ' + p0.specialty : ''}`.trim()
      }
      return draft
    })
    setValues((cur) => ({
      ...cur,
      medicacoes: patient.medications || cur.medicacoes,
    }))
    toast.success('Dados do paciente aplicados na anamnese.')
  }

  const patientChips = useMemo(() => {
    if (!patient) return [] as Array<{ label: string; value: string }>
    const items: Array<{ label: string; value: string }> = []
    if (patient.birth_date) items.push({ label: 'Idade', value: formatAge(patient.birth_date) })
    if (patient.sex) items.push({ label: 'Sexo', value: patient.sex })
    if (patient.schooling) items.push({ label: 'Escola', value: patient.schooling })
    if (patient.city) items.push({ label: 'Cidade', value: patient.city })
    if (patient.phone) items.push({ label: 'Telefone', value: patient.phone })
    if (patient.medications) items.push({ label: 'Medicações', value: patient.medications })
    return items
  }, [patient])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-24">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
        <div className="min-w-0">
          <Link to="/patients/$id" params={{ id }} className="text-xs text-muted-foreground hover:text-foreground">
            ← Voltar ao prontuário
          </Link>
          <h1 className="mt-0.5 truncate font-serif text-xl sm:text-2xl font-semibold">
            Anamnese {patient ? `· ${patient.name}` : ''}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => analyzeMut.mutate()} disabled={analyzeMut.isPending}>
            <Sparkles /> {analyzeMut.isPending ? 'Analisando…' : 'Análise (IA)'}
          </Button>
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !canSave}>
            {saveMut.isPending ? 'Salvando…' : !canSave ? 'Carregando…' : 'Salvar anamnese'}
          </Button>
        </div>
      </div>

      {/* Patient snapshot */}
      {patient ? (
        <section className="rounded-2xl border bg-gradient-to-br from-primary/5 to-transparent p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <User2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Dados do paciente</p>
                <p className="font-serif text-lg font-semibold">{patient.name}</p>
                <p className="text-xs text-muted-foreground">
                  Preenchidos automaticamente nos campos vazios da anamnese.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={refillFromPatient}>
              <Wand2 /> Reaplicar dados do paciente
            </Button>
          </div>
          {patientChips.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {patientChips.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1 rounded-full border bg-background/60 px-3 py-1 text-xs"
                >
                  <span className="text-muted-foreground">{c.label}:</span>
                  <span className="font-medium">{c.value}</span>
                </span>
              ))}
            </div>
          ) : null}
          {patient.guardians && patient.guardians.length > 0 ? (
            <div className="mt-3 grid gap-1 text-xs">
              <p className="text-muted-foreground">Responsáveis</p>
              <ul className="grid gap-0.5">
                {patient.guardians.map((g, i) => (
                  <li key={i}>
                    <span className="font-medium">{g?.name ?? '—'}</span>
                    {g?.relation ? ` · ${g.relation}` : ''}
                    {g?.phone ? ` · ${g.phone}` : ''}
                    {g?.email ? ` · ${g.email}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {patient.professionals && patient.professionals.length > 0 ? (
            <div className="mt-3 grid gap-1 text-xs">
              <p className="text-muted-foreground">Profissionais que acompanham</p>
              <ul className="grid gap-0.5">
                {patient.professionals.map((p, i) => (
                  <li key={i}>
                    <span className="font-medium">{p?.name ?? '—'}</span>
                    {p?.specialty ? ` · ${p.specialty}` : ''}
                    {p?.contact ? ` · ${p.contact}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Mode picker */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3">
        <span className="text-xs text-muted-foreground">Modelo:</span>
        <button
          type="button"
          onClick={() => setMode('livre')}
          className={`rounded-md border px-3 py-1.5 text-xs transition ${mode === 'livre' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}`}
        >Anamnese livre</button>
        <button
          type="button"
          onClick={() => setMode('neuro_child')}
          className={`rounded-md border px-3 py-1.5 text-xs transition ${mode === 'neuro_child' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}`}
        >Neuropsicológica — Crianças e Adolescentes</button>
        <button
          type="button"
          onClick={() => setMode('neuro_adult')}
          className={`rounded-md border px-3 py-1.5 text-xs transition ${mode === 'neuro_adult' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}`}
        >Neuropsicológica — Adultos</button>
      </div>

      {/* Importar PDF com IA */}
      <PdfImportPanel
        mode={mode}
        importing={importing}
        report={importReport}
        onImport={onImportPdf}
      />



      <TranscriptionPanel
        activeTarget={activeTarget}
        onTarget={setActiveTarget}
        onInsert={insertText}
      />

      {analysis ? (
        <section className="rounded-2xl border bg-primary/5 p-5">
          <h2 className="font-serif text-xl font-semibold">Análise de caso (IA)</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm">{analysis}</p>
          <p className="mt-3 text-xs text-muted-foreground">Sugestão preliminar — revise clinicamente antes de qualquer conduta.</p>
        </section>
      ) : null}

      {(screenings.data ?? []).length > 0 ? (
        <section className="rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-semibold">Triagens realizadas</h2>
              <p className="text-xs text-muted-foreground">
                Puxe o contexto das triagens para dentro da anamnese sem redigitar.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const items = screenings.data ?? []
                const lines = items.map((s) => {
                  const crit = Array.isArray(s.criteria) ? s.criteria : []
                  const present = (crit as Array<{ label: string; present: boolean; value?: unknown }>)
                    .filter((c) => c.present)
                    .map((c) => c.value != null && c.value !== '' ? `${c.label}: ${c.value}` : c.label)
                  const head = `• ${s.instrument === 'social' ? 'Triagem social' : (s.domain ?? s.instrument)} (${new Date(s.created_at).toLocaleDateString('pt-BR')})`
                  const body = present.length ? `\n  - ${present.join('\n  - ')}` : ''
                  const notes = s.notes ? `\n  Obs: ${s.notes}` : ''
                  return head + body + notes
                }).join('\n\n')
                setValues((cur) => ({
                  ...cur,
                  observacoes: [cur.observacoes, '--- Contexto das triagens ---', lines].filter(Boolean).join('\n\n'),
                }))
                toast.success('Contexto das triagens copiado para Observações.')
              }}
            >
              Puxar para observações
            </Button>
          </div>
          <ul className="mt-3 grid gap-1 text-xs text-muted-foreground">
            {(screenings.data ?? []).slice(0, 5).map((s) => (
              <li key={s.id}>
                {s.instrument === 'social' ? 'Triagem social' : (s.domain ?? s.instrument)} · {new Date(s.created_at).toLocaleDateString('pt-BR')}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {mode === 'neuro_child' ? (
        <NeuroChildAnamnese value={childData} onChange={setChildData} />
      ) : mode === 'neuro_adult' ? (
        <NeuroAdultAnamnese value={adultData} onChange={setAdultData} />
      ) : (
        <section className="grid gap-4">
          {SECTIONS.map((s) => (
            <FieldBlock
              key={s.id}
              id={s.id}
              label={s.label}
              rows={s.rows ?? 3}
              value={values[s.id]}
              active={activeTarget === s.id}
              onFocus={() => setActiveTarget(s.id)}
              onChange={(v) => setValues((cur) => ({ ...cur, [s.id]: v }))}
            />
          ))}
          <FieldBlock
            id="transcript"
            label="Transcrição bruta (opcional)"
            rows={6}
            value={values.transcript}
            active={activeTarget === 'transcript'}
            onFocus={() => setActiveTarget('transcript')}
            onChange={(v) => setValues((cur) => ({ ...cur, transcript: v }))}
          />
        </section>
      )}

      {/* Sticky bottom save (mobile-friendly) */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/90 p-3 backdrop-blur sm:hidden">
        <Button className="w-full" onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !canSave}>
          {saveMut.isPending ? 'Salvando…' : !canSave ? 'Carregando…' : 'Salvar anamnese'}
        </Button>
      </div>

      <div className="hidden justify-end sm:flex">
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !canSave}>
          {saveMut.isPending ? 'Salvando…' : !canSave ? 'Carregando…' : 'Salvar anamnese'}
        </Button>
      </div>
    </div>
  )
}

function FieldBlock({
  id, label, rows, value, onChange, active, onFocus,
}: {
  id: string
  label: string
  rows: number
  value: string
  onChange: (v: string) => void
  active: boolean
  onFocus: () => void
}) {
  return (
    <div className={`rounded-xl border bg-card p-4 transition ${active ? 'ring-2 ring-primary/40 shadow-sm' : ''}`}>
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      <Textarea
        id={id}
        rows={rows}
        value={value}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2"
      />
    </div>
  )
}

function TranscriptionPanel({
  activeTarget, onTarget, onInsert,
}: {
  activeTarget: string
  onTarget: (id: Fields) => void
  onInsert: (text: string) => void
}) {
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const recorderRef = useRef<SegmentedRecorder | null>(null)
  const transcribe = useServerFn(transcribeAudio)

  async function sendOne(blob: Blob, mimeType: string, durationSec?: number) {
    const b64 = await blobToBase64(blob)
    const r = await transcribe({ data: { audioBase64: b64, mimeType, language: 'pt', durationSeconds: durationSec } })
    if (r.text) onInsert(r.text)
  }

  async function start() {
    try {
      const rec = new SegmentedRecorder({
        segmentMs: 4 * 60_000,
        onSegment: async (blob, mime, dur) => {
          setBusy(true)
          try { await sendOne(blob, mime, dur); setProgress('Trecho transcrito.') }
          catch (err) { toast.error(err instanceof Error ? err.message : 'Falha ao transcrever trecho') }
          finally { setBusy(false) }
        },
        onError: (e) => toast.error(e.message),
      })
      await rec.start()
      recorderRef.current = rec
      setRecording(true)
      setProgress('Gravando… (chunks de 4 min são transcritos automaticamente)')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível acessar o microfone.')
    }
  }
  async function stop() {
    await recorderRef.current?.stop()
    recorderRef.current = null
    setRecording(false)
  }
  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    e.target.value = ''
    setBusy(true)
    try {
      if (f.size <= 20 * 1024 * 1024) {
        setProgress('Transcrevendo…')
        await sendOne(f, f.type || 'audio/webm')
      } else {
        setProgress('Preparando áudio longo…')
        const chunks = await chunkAudioFile(f, 240)
        for (let i = 0; i < chunks.length; i++) {
          setProgress(`Transcrevendo ${i + 1}/${chunks.length}…`)
          await sendOne(chunks[i], 'audio/wav', 240)
        }
      }
      toast.success('Áudio transcrito.')
      setProgress('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha na transcrição')
    } finally { setBusy(false) }
  }

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-semibold">Transcrição por IA</h2>
          <p className="text-xs text-muted-foreground">
            Suporta gravações longas (até 2h). Campo focado: <strong>{activeTarget}</strong>
          </p>
          {progress ? <p className="text-xs text-muted-foreground mt-1">{progress}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={activeTarget}
            onChange={(e) => onTarget(e.target.value as Fields)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            {SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            <option value="transcript">Transcrição bruta</option>
          </select>
          {!recording ? (
            <Button onClick={start} disabled={busy}>
              <Mic /> {busy ? 'Enviando…' : 'Gravar'}
            </Button>
          ) : (
            <Button variant="destructive" onClick={stop}>
              <Square /> Parar
            </Button>
          )}
          <label className="inline-flex h-10 cursor-pointer items-center rounded-md border px-3 text-sm hover:bg-accent">
            Enviar áudio
            <input type="file" accept="audio/*" onChange={onFile} className="hidden" disabled={busy} />
          </label>
        </div>
      </div>
    </section>
  )
}

function PdfImportPanel({
  mode,
  importing,
  report,
  onImport,
}: {
  mode: 'livre' | 'neuro_child' | 'neuro_adult'
  importing: boolean
  report: { count: number; notes: string; unmapped: string; overwrite: boolean } | null
  onImport: (file: File, overwrite: boolean) => void
}) {
  const [overwrite, setOverwrite] = useState(false)
  const [fileName, setFileName] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  const modeLabel =
    mode === 'neuro_child' ? 'Neuropsicológica — Crianças'
    : mode === 'neuro_adult' ? 'Neuropsicológica — Adultos'
    : 'Anamnese livre'

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
            <FileUp className="h-5 w-5 text-primary" /> Importar anamnese por PDF
          </h2>
          <p className="text-xs text-muted-foreground">
            Envie um PDF (ou imagem digitalizada) da anamnese e a IA fará a leitura e o mapeamento automático para
            os campos do modelo atualmente selecionado: <strong>{modeLabel}</strong>.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm hover:bg-accent">
          <FileUp className="h-4 w-4" />
          {fileName || 'Selecionar PDF/imagem'}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            disabled={importing}
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              setFileName(f.name)
              onImport(f, overwrite)
            }}
          />
        </label>
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Sobrescrever campos já preenchidos
        </label>
        {importing ? (
          <span className="text-xs text-muted-foreground">Lendo o PDF com IA…</span>
        ) : null}
      </div>

      {report ? (
        <div className="mt-4 rounded-xl border bg-background p-3 text-xs">
          <p className="font-medium text-foreground">
            {report.count} campo(s) preenchido(s){report.overwrite ? ' · sobrescrevendo' : ' · sem sobrescrever'}.
          </p>
          {report.notes ? (
            <p className="mt-1 text-muted-foreground"><strong>Observações da IA:</strong> {report.notes}</p>
          ) : null}
          {report.unmapped ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-muted-foreground">Conteúdo não mapeado (revisar)</summary>
              <p className="mt-2 whitespace-pre-wrap">{report.unmapped}</p>
            </details>
          ) : null}
          <p className="mt-2 text-muted-foreground">
            Revise sempre as informações extraídas antes de salvar — a IA pode omitir ou interpretar mal itens do documento.
          </p>
        </div>
      ) : null}
    </section>
  )
}

