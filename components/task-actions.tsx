'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { CheckCircle2, PlayCircle, RotateCcw, Send } from 'lucide-react'
import { toast } from 'sonner'
import { updateTask, type ActionState } from '@/app/actions/clinical'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

const icons = {
  start: <PlayCircle />,
  submit: <Send />,
  approve: <CheckCircle2 />,
  return: <RotateCcw />,
} as const

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Processando…' : label}
    </Button>
  )
}

export function TaskAction({
  taskId,
  action,
  label,
  withNotes = false,
  variant = 'default',
  fullWidth = false,
}: {
  taskId: number
  action: keyof typeof icons
  label: string
  withNotes?: boolean
  variant?: 'default' | 'outline'
  fullWidth?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState<ActionState, FormData>(updateTask, null)

  useEffect(() => {
    if (!state) return
    if (state.ok) {
      toast.success(state.message)
      setOpen(false)
    } else {
      toast.error(state.message)
    }
  }, [state])

  if (!withNotes) {
    return (
      <form action={formAction} className={fullWidth ? 'w-full' : undefined}>
        <input type="hidden" name="taskId" value={taskId} />
        <input type="hidden" name="action" value={action} />
        <InlineButton label={label} action={action} variant={variant} fullWidth={fullWidth} />
      </form>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={variant} className={fullWidth ? 'w-full' : 'flex-1'} />}>
        {icons[action]}
        {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">{label}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="action" value={action} />
          <Textarea
            name="notes"
            required={action !== 'approve'}
            rows={4}
            placeholder={
              action === 'submit'
                ? 'Descreva o que foi corrigido, pontuações e observações relevantes…'
                : action === 'approve'
                  ? 'Observação opcional para o registro do OK…'
                  : 'Explique o que precisa ser ajustado…'
            }
          />
          <SubmitButton label="Confirmar" />
        </form>
      </DialogContent>
    </Dialog>
  )
}

function InlineButton({ label, action, variant, fullWidth }: { label: string; action: keyof typeof icons; variant: 'default' | 'outline'; fullWidth: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" variant={variant} className={fullWidth ? 'w-full' : 'flex-1'} disabled={pending}>
      {icons[action]}
      {pending ? 'Processando…' : label}
    </Button>
  )
}
