'use client'

import { useState, useTransition } from 'react'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { aiTaskSynthesis, saveTaskResult } from '@/app/actions/clinical'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Task = {
  id: number
  rawScore: string | null
  standardScore: string | null
  classification: string | null
  synthesis: string | null
}

export function ResultForm({ task, testName }: { task: Task; testName: string }) {
  const [open, setOpen] = useState(false)
  const [rawScore, setRawScore] = useState(task.rawScore || '')
  const [standardScore, setStandardScore] = useState(task.standardScore || '')
  const [classification, setClassification] = useState(task.classification || '')
  const [synthesis, setSynthesis] = useState(task.synthesis || '')
  const [savingPending, startSaving] = useTransition()
  const [aiPending, startAi] = useTransition()

  function buildFormData() {
    const fd = new FormData()
    fd.set('taskId', String(task.id))
    fd.set('rawScore', rawScore)
    fd.set('standardScore', standardScore)
    fd.set('classification', classification)
    fd.set('synthesis', synthesis)
    return fd
  }

  function handleAi() {
    startAi(async () => {
      const res = await aiTaskSynthesis(null, buildFormData())
      if (res?.ok) {
        if (res.classification) setClassification(res.classification)
        if (res.synthesis) setSynthesis(res.synthesis)
        toast.success(res.message)
      } else {
        toast.error(res?.message || 'Falha ao gerar com IA')
      }
    })
  }

  function handleSave() {
    startSaving(async () => {
      const res = await saveTaskResult(null, buildFormData())
      if (res?.ok) {
        toast.success(res.message)
        setOpen(false)
      } else {
        toast.error(res?.message || 'Falha ao salvar')
      }
    })
  }

  const hasResult = task.rawScore || task.standardScore || task.classification || task.synthesis

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={hasResult ? 'secondary' : 'outline'} />}>
        {hasResult ? 'Editar resultado' : 'Registrar resultado'}
      </DialogTrigger>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-pretty">Resultado — {testName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rawScore">Pontuação bruta</Label>
              <Input id="rawScore" value={rawScore} onChange={(e) => setRawScore(e.target.value)} placeholder="Ex.: 32 pontos" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="standardScore">Escore padronizado / percentil</Label>
              <Input id="standardScore" value={standardScore} onChange={(e) => setStandardScore(e.target.value)} placeholder="Ex.: percentil 75" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="classification">Classificação</Label>
            <Input
              id="classification"
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              placeholder="Preencha ou deixe a IA sugerir (ex.: Médio superior)"
            />
          </div>

          <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Gerar com IA</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Preencha as pontuações e a IA sugere a classificação e a síntese. Se você já definiu a classificação, ela é mantida.
                </p>
              </div>
              <Button type="button" size="sm" onClick={handleAi} disabled={aiPending}>
                <Sparkles />
                {aiPending ? 'Gerando…' : 'Gerar'}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="synthesis">Síntese interpretativa</Label>
            <Textarea id="synthesis" value={synthesis} onChange={(e) => setSynthesis(e.target.value)} rows={6} placeholder="Síntese gerada pela IA ou escrita manualmente." />
            <p className="text-xs text-muted-foreground">Revise e ajuste o texto: a responsabilidade técnica é sempre da psicóloga.</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={savingPending}>
              {savingPending ? 'Salvando…' : 'Salvar resultado'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
