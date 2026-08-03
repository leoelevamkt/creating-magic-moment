import { useRef, useState, type ChangeEvent } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { Mic, Square, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { transcribeAudio } from '@/lib/transcribe.functions'
import { SegmentedRecorder, blobToBase64, chunkAudioFile } from '@/lib/audio-chunker'

/**
 * Botão reutilizável de transcrição por IA (gravação ao vivo + upload de áudio).
 * Entrega o texto transcrito via onInsert (o chamador decide onde acrescentar).
 */
export function AudioTranscriber({
  onInsert,
  label = 'Transcrição por IA',
  compact = false,
}: {
  onInsert: (text: string) => void
  label?: string
  compact?: boolean
}) {
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const recorderRef = useRef<SegmentedRecorder | null>(null)
  const transcribe = useServerFn(transcribeAudio)

  async function sendOne(blob: Blob, mimeType: string, durationSec?: number) {
    if (blob.size < 2048) throw new Error('Gravação vazia — tente novamente.')
    const b64 = await blobToBase64(blob)
    const r = await transcribe({
      data: { audioBase64: b64, mimeType, language: 'pt', durationSeconds: durationSec },
    })
    if (r.text) onInsert(r.text)
  }

  async function start() {
    try {
      const rec = new SegmentedRecorder({
        segmentMs: 4 * 60_000,
        onSegment: async (blob, mime, dur) => {
          setBusy(true)
          try {
            await sendOne(blob, mime, dur)
            setProgress('Trecho transcrito.')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Falha ao transcrever trecho')
          } finally {
            setBusy(false)
          }
        },
        onError: (e) => toast.error(e.message),
      })
      await rec.start()
      recorderRef.current = rec
      setRecording(true)
      setProgress('Gravando… trechos de 4 min são transcritos automaticamente.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível acessar o microfone.')
    }
  }

  async function stop() {
    setProgress('Finalizando transcrição…')
    await recorderRef.current?.stop()
    recorderRef.current = null
    setRecording(false)
    setProgress('')
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
          await sendOne(chunks[i]!, 'audio/wav', 240)
        }
      }
      toast.success('Áudio transcrito.')
      setProgress('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha na transcrição')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!compact ? (
        <span className="text-xs text-muted-foreground">{label}:</span>
      ) : null}
      {!recording ? (
        <Button type="button" size="sm" variant="outline" onClick={start} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Mic />} Gravar
        </Button>
      ) : (
        <Button type="button" size="sm" variant="destructive" onClick={stop}>
          <Square /> Parar
        </Button>
      )}
      <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs hover:bg-accent">
        <Upload className="size-3.5" />
        Enviar áudio
        <input type="file" accept="audio/*" onChange={onFile} className="hidden" disabled={busy} />
      </label>
      {progress ? <span className="text-xs text-muted-foreground">{progress}</span> : null}
    </div>
  )
}
