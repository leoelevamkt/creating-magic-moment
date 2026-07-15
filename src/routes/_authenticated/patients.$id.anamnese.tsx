import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { Mic, Sparkles, Square } from 'lucide-react'
import { getAnamnese, upsertAnamnese, analyzeAnamneseWithAI } from '@/lib/anamneses.functions'
import { transcribeAudio } from '@/lib/transcribe.functions'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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

function AnamnesePage() {
  const { id } = Route.useParams()
  const qc = useQueryClient()
  const fetchAn = useServerFn(getAnamnese)
  const save = useServerFn(upsertAnamnese)
  const analyze = useServerFn(analyzeAnamneseWithAI)

  const q = useQuery({ queryKey: ['anamnese', id], queryFn: () => fetchAn({ data: { patientId: id } }) })
  const [values, setValues] = useState<Record<Fields, string>>({
    queixa_principal: '', historia_atual: '', desenvolvimento: '', historia_medica: '',
    medicacoes: '', historia_familiar: '', historia_escolar: '', historia_social: '',
    observacoes: '', transcript: '',
  })
  const [activeTarget, setActiveTarget] = useState<Fields>('historia_atual')
  const [analysis, setAnalysis] = useState<string>('')

  useEffect(() => {
    if (q.data) {
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
    }
  }, [q.data])

  const saveMut = useMutation({
    mutationFn: () => save({ data: { patientId: id, ...values } }),
    onSuccess: () => { toast.success('Anamnese salva.'); qc.invalidateQueries({ queryKey: ['anamnese', id] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const analyzeMut = useMutation({
    mutationFn: () => analyze({ data: { patientId: id } }),
    onSuccess: (r) => { setAnalysis(r.analysis); toast.success('Análise gerada.') },
    onError: (e: Error) => toast.error(e.message),
  })

  function insertText(text: string) {
    setValues((v) => ({ ...v, [activeTarget]: (v[activeTarget] ? v[activeTarget] + '\n\n' : '') + text }))
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/patients/$id" params={{ id }} className="text-xs text-muted-foreground hover:text-foreground">
            ← Voltar ao prontuário
          </Link>
          <h1 className="mt-1 font-serif text-3xl font-semibold">Anamnese</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registre a entrevista inicial. Use a transcrição por IA para agilizar e inserir trechos direto no campo focado.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => analyzeMut.mutate()} disabled={analyzeMut.isPending}>
            <Sparkles /> {analyzeMut.isPending ? 'Analisando…' : 'Análise de caso (IA)'}
          </Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Salvando…' : 'Salvar anamnese'}
          </Button>
        </div>
      </header>

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

      <section className="grid gap-5">
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

      <div className="flex justify-end">
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? 'Salvando…' : 'Salvar anamnese'}
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
    <div className={`rounded-xl border bg-card p-4 ${active ? 'ring-2 ring-primary/40' : ''}`}>
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
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    e.target.value = ''
    setBusy(true)
    try {
      // Se pequeno, envia direto; se grande, divide em WAVs de 4 min.
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

