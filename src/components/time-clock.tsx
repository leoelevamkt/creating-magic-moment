import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Clock, Play, Square } from 'lucide-react'
import { toast } from 'sonner'
import {
  getActiveWorkSession,
  startWorkSession,
  stopWorkSession,
} from '@/lib/work-sessions.functions'
import { Button } from '@/components/ui/button'

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TimeClock() {
  const qc = useQueryClient()
  const fetchActive = useServerFn(getActiveWorkSession)
  const start = useServerFn(startWorkSession)
  const stop = useServerFn(stopWorkSession)

  const active = useQuery({
    queryKey: ['work-session', 'active'],
    queryFn: () => fetchActive(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active.data) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active.data])

  const startMut = useMutation({
    mutationFn: () => start(),
    onSuccess: () => {
      toast.success('Ponto iniciado.')
      qc.invalidateQueries({ queryKey: ['work-session'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const stopMut = useMutation({
    mutationFn: () => stop({ data: {} }),
    onSuccess: () => {
      toast.success('Ponto encerrado.')
      qc.invalidateQueries({ queryKey: ['work-session'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const running = !!active.data
  const elapsed = running ? now - new Date(active.data!.started_at).getTime() : 0

  return (
    <div className="hidden items-center gap-2 rounded-full border bg-card px-3 py-1.5 md:flex">
      <Clock size={16} className={running ? 'text-primary' : 'text-muted-foreground'} />
      <span className="min-w-[68px] font-mono text-sm tabular-nums">
        {running ? formatElapsed(elapsed) : '--:--:--'}
      </span>
      {running ? (
        <Button
          size="sm"
          variant="destructive"
          className="h-7 gap-1 rounded-full px-2"
          onClick={() => stopMut.mutate()}
          disabled={stopMut.isPending}
        >
          <Square size={13} /> Sair
        </Button>
      ) : (
        <Button
          size="sm"
          className="h-7 gap-1 rounded-full px-2"
          onClick={() => startMut.mutate()}
          disabled={startMut.isPending || active.isLoading}
        >
          <Play size={13} /> Entrar
        </Button>
      )}
    </div>
  )
}
