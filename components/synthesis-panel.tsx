'use client'

import { useTransition } from 'react'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { aiEvaluationSynthesis } from '@/app/actions/clinical'
import { Button } from '@/components/ui/button'

export function SynthesisPanel({
  evaluationId,
  title,
  synthesis,
  resultsCount,
}: {
  evaluationId: number
  title: string
  synthesis: string | null
  resultsCount: number
}) {
  const [pending, startTransition] = useTransition()

  function generate() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('evaluationId', String(evaluationId))
      const res = await aiEvaluationSynthesis(null, fd)
      if (res?.ok) toast.success(res.message)
      else toast.error(res?.message || 'Falha ao gerar a síntese')
    })
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{resultsCount} teste(s) com resultado registrado</p>
        </div>
        <Button type="button" size="sm" onClick={generate} disabled={pending || resultsCount === 0}>
          <Sparkles />
          {pending ? 'Gerando…' : synthesis ? 'Regerar síntese' : 'Gerar síntese com IA'}
        </Button>
      </div>
      {synthesis ? (
        <div className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-foreground">{synthesis}</div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {resultsCount === 0
            ? 'Registre os resultados dos testes desta avaliação para habilitar a síntese integradora.'
            : 'Nenhuma síntese gerada ainda. Clique em “Gerar síntese com IA”.'}
        </p>
      )}
    </div>
  )
}
