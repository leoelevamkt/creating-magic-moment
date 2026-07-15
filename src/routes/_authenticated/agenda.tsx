import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Mic, Plus, Square, Video, X } from 'lucide-react'
import { toast } from 'sonner'
import { transcribeAudio, saveSessionTranscript } from '@/lib/transcribe.functions'
import { SegmentedRecorder, blobToBase64, chunkAudioFile } from '@/lib/audio-chunker'
import type { ChangeEvent } from 'react'
import {
  addDays,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  createSession,
  deleteSession,
  listSessions,
  updateSessionStatus,
} from '@/lib/sessions.functions'
import { createMeetForSession, getGoogleConnectionStatus } from '@/lib/googleCalendar.functions'
import { listPatients } from '@/lib/patients.functions'
import { listCatalog } from '@/lib/profile.functions'
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
import { Checkbox } from '@/components/ui/checkbox'

export const Route = createFileRoute('/_authenticated/agenda')({
  beforeLoad: ({ context }) => {
    if ((context as { role?: string }).role !== 'admin') throw redirect({ to: '/kanban' })
  },
  head: () => ({ meta: [{ title: 'Agenda — NeuroFlux' }] }),
  component: AgendaPage,
})

function AgendaPage() {
  const [anchor, setAnchor] = useState(() => new Date())
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const list = useServerFn(listSessions)
  const create = useServerFn(createSession)
  const remove = useServerFn(deleteSession)
  const setStatus = useServerFn(updateSessionStatus)
  const meetFn = useServerFn(createMeetForSession)
  const googleStatus = useServerFn(getGoogleConnectionStatus)

  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(anchor, { weekStartsOn: 1 })
  const from = format(weekStart, 'yyyy-MM-dd')
  const to = format(weekEnd, 'yyyy-MM-dd')

  const sessions = useQuery({
    queryKey: ['sessions', from, to],
    queryFn: () => list({ data: { from, to } }),
  })
  const patients = useQuery({ queryKey: ['patients'], queryFn: () => useServerFnSafe(listPatients)() })
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: () => useServerFnSafe(listCatalog)() })
  const gStatus = useQuery({ queryKey: ['google-status'], queryFn: () => googleStatus() })

  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Sessão removida.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: 'done' }) => setStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
  const meetMut = useMutation({
    mutationFn: (sessionId: string) => meetFn({ data: { sessionId } }),
    onSuccess: (r) => {
      toast.success('Meet criado.')
      qc.invalidateQueries({ queryKey: ['sessions'] })
      if (r?.meetUrl) window.open(r.meetUrl, '_blank', 'noopener')
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const createMut = useMutation({
    mutationFn: async (v: {
      patientId: string
      title: string
      modality: 'presencial' | 'online'
      sessionDate: string
      startTime: string | null
      endTime: string | null
      objectives: string | null
      notes: string | null
      plannedTestIds: string[]
      createMeet: boolean
    }) => {
      const { createMeet, ...rest } = v
      const res = await create({ data: rest })
      if (createMeet && res.id) {
        try {
          await meetFn({ data: { sessionId: res.id } })
        } catch (e) {
          toast.error(`Sessão criada, mas Meet falhou: ${(e as Error).message}`)
        }
      }
      return res
    },
    onSuccess: () => {
      toast.success('Sessão agendada.')
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['sessions'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const testIds = fd.getAll('testId').map(String)
    createMut.mutate({
      patientId: String(fd.get('patientId') ?? ''),
      title: String(fd.get('title') ?? 'Sessão'),
      modality: (String(fd.get('modality') ?? 'presencial') as 'presencial' | 'online'),
      sessionDate: String(fd.get('sessionDate') ?? ''),
      startTime: String(fd.get('startTime') ?? '') || null,
      endTime: String(fd.get('endTime') ?? '') || null,
      objectives: String(fd.get('objectives') ?? '') || null,
      notes: String(fd.get('notes') ?? '') || null,
      plannedTestIds: testIds,
      createMeet: fd.get('createMeet') === 'on',
    })
  }

  const grouped = useMemo(() => {
    const map = new Map<string, NonNullable<typeof sessions.data>>()
    for (const s of sessions.data ?? []) {
      const key = s.session_date
      const arr = map.get(key) ?? []
      arr.push(s)
      map.set(key, arr)
    }
    return map
  }, [sessions.data])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Planejamento semanal</p>
          <h1 className="font-serif text-3xl font-semibold">Agenda de sessões</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Organize os atendimentos da semana e os testes que podem ser aplicados em cada sessão.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <CalendarDays /> Nova sessão
          </DialogTrigger>
          <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Planejar sessão</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="flex flex-col gap-4 pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>Paciente</Label>
                  <select
                    name="patientId"
                    required
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">Selecione o paciente</option>
                    {(patients.data ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Modalidade</Label>
                  <select
                    name="modality"
                    defaultValue="presencial"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="presencial">presencial</option>
                    <option value="online">online</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Título da sessão</Label>
                <Input name="title" defaultValue="Sessão de aplicação" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label>Data</Label>
                  <Input type="date" name="sessionDate" required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Início</Label>
                  <Input type="time" name="startTime" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Término</Label>
                  <Input type="time" name="endTime" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Objetivos da sessão</Label>
                <Textarea name="objectives" rows={2} placeholder="Ex.: anamnese, aplicação de testes de atenção…" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Testes que podem ser aplicados nesta sessão</Label>
                <TestPicker tests={catalog.data ?? []} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Observações</Label>
                <Textarea name="notes" rows={2} />
              </div>
              <label className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
                <input
                  type="checkbox"
                  name="createMeet"
                  defaultChecked={gStatus.data?.connected ?? false}
                  disabled={!gStatus.data?.connected}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Gerar link do Google Meet</span>
                  <span className="ml-1 text-muted-foreground">
                    {gStatus.data?.connected
                      ? '(cria evento no seu Google Calendar)'
                      : '(conecte o Google Calendar em Configurações)'}
                  </span>
                </span>
              </label>
              <div className="flex justify-end">
                <Button type="submit" disabled={createMut.isPending}>
                  {createMut.isPending ? 'Agendando…' : 'Agendar sessão'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setAnchor(addDays(anchor, -7))}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setAnchor(addDays(anchor, 7))}>
            <ChevronRight />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <CalendarDays size={16} />
          {format(weekStart, "d 'de' MMM", { locale: ptBR })} –{' '}
          {format(weekEnd, "d 'de' MMM", { locale: ptBR })}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayEvents = grouped.get(key) ?? []
          const isToday = isSameDay(day, new Date())
          return (
            <div
              key={key}
              className={`flex min-h-[220px] flex-col gap-2 rounded-2xl border bg-card p-3 ${isToday ? 'ring-2 ring-primary/30' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {format(day, 'EEEE', { locale: ptBR })}
                  </p>
                  <p className="font-serif text-xl">{format(day, 'dd/MM')}</p>
                </div>
                {dayEvents.length > 0 ? (
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {dayEvents.length}
                  </span>
                ) : null}
              </div>
              {dayEvents.length === 0 ? (
                <p className="my-auto text-center text-xs text-muted-foreground">Sem sessões</p>
              ) : (
                dayEvents.map((s) => (
                  <article
                    key={s.id}
                    className="flex flex-col gap-1 rounded-lg border bg-background p-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-semibold text-foreground">
                        {(s.patients as { name: string } | null)?.name ?? '—'}
                      </p>
                      <button
                        onClick={() => removeMut.mutate(s.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remover"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <p className="text-muted-foreground">{s.title}</p>
                    {s.start_time ? (
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <Clock size={12} /> {s.start_time}
                        {s.end_time ? `–${s.end_time}` : ''}
                      </p>
                    ) : null}
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <MapPin size={12} /> {s.modality}
                    </p>
                    {s.objectives ? (
                      <p className="line-clamp-3 text-muted-foreground">{s.objectives}</p>
                    ) : null}
                    {s.meet_url ? (
                      <a
                        href={s.meet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-blue-700 hover:bg-blue-100"
                      >
                        <Video size={12} /> Entrar no Meet
                      </a>
                    ) : gStatus.data?.connected && s.modality === 'online' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1"
                        onClick={() => meetMut.mutate(s.id)}
                        disabled={meetMut.isPending}
                      >
                        <Video size={12} /> Gerar Meet
                      </Button>
                    ) : null}
                    <SessionTranscribeButton
                      sessionId={s.id}
                      existing={(s as { transcript?: string | null }).transcript ?? null}
                    />
                    {s.status !== 'done' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1"
                        onClick={() => statusMut.mutate({ id: s.id, status: 'done' })}
                      >
                        Concluir
                      </Button>
                    ) : (
                      <span className="mt-1 rounded-md bg-primary/10 px-2 py-1 text-center text-primary">
                        Concluída
                      </span>
                    )}
                  </article>
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TestPicker({ tests }: { tests: Array<{ id: string; acronym: string | null; category: string; estimated_minutes: number | null }> }) {
  const byCat = useMemo(() => {
    const m = new Map<string, typeof tests>()
    for (const t of tests) {
      const arr = m.get(t.category) ?? []
      arr.push(t)
      m.set(t.category, arr)
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [tests])
  return (
    <div className="max-h-64 overflow-y-auto rounded-lg border p-3">
      {byCat.map(([cat, items]) => (
        <div key={cat} className="mb-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {cat}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm">
                <Checkbox name="testId" value={t.id} />
                <span className="font-medium">{t.acronym ?? '—'}</span>
                {t.estimated_minutes ? (
                  <span className="text-xs text-muted-foreground">· {t.estimated_minutes} min</span>
                ) : null}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Small helper to satisfy hooks-in-callback lint when passing server fns to react-query.
function useServerFnSafe<T extends (...args: never[]) => unknown>(fn: T): T {
  return fn
}

function SessionTranscribeButton({ sessionId, existing }: { sessionId: string; existing: string | null }) {
  const [open, setOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState(existing ?? '')
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const transcribe = useServerFn(transcribeAudio)
  const save = useServerFn(saveSessionTranscript)

  const saveMut = useMutation({
    mutationFn: () => save({ data: { sessionId, transcript: text } }),
    onSuccess: () => { toast.success('Transcrição salva.'); setOpen(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '' })
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        await sendBlob(blob, mr.mimeType || 'audio/webm')
      }
      mediaRef.current = mr
      mr.start()
      setRecording(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sem acesso ao microfone.')
    }
  }
  function stop() { mediaRef.current?.stop(); setRecording(false) }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    await sendBlob(f, f.type || 'audio/webm')
    e.target.value = ''
  }
  async function sendBlob(blob: Blob, mimeType: string) {
    setBusy(true)
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onerror = () => reject(new Error('Falha ao ler áudio'))
        r.onload = () => {
          const s = String(r.result ?? '')
          const i = s.indexOf(',')
          resolve(i >= 0 ? s.slice(i + 1) : s)
        }
        r.readAsDataURL(blob)
      })
      const r = await transcribe({ data: { audioBase64: b64, mimeType, language: 'pt' } })
      setText((cur) => (cur ? cur + '\n\n' : '') + r.text)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha na transcrição')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="mt-1" />}>
        <Mic size={12} /> Transcrever
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Transcrição da sessão</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex flex-wrap gap-2">
            {!recording ? (
              <Button onClick={start} disabled={busy}>
                <Mic /> {busy ? 'Enviando…' : 'Gravar'}
              </Button>
            ) : (
              <Button variant="destructive" onClick={stop}><Square /> Parar</Button>
            )}
            <label className="inline-flex h-10 cursor-pointer items-center rounded-md border px-3 text-sm hover:bg-accent">
              Enviar áudio
              <input type="file" accept="audio/*" onChange={onFile} className="hidden" disabled={busy} />
            </label>
          </div>
          <Textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex justify-end">
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Salvando…' : 'Salvar transcrição'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
