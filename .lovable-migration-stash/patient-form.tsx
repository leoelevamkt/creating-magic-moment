'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createPatient, type ActionState } from '@/app/actions/clinical'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : 'Salvar paciente'}
    </Button>
  )
}

export function PatientForm() {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState<ActionState, FormData>(createPatient, null)

  useEffect(() => {
    if (!state) return
    if (state.ok) {
      toast.success(state.message)
      setOpen(false)
    } else {
      toast.error(state.message)
    }
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        Novo paciente
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Cadastrar paciente</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid gap-5 py-4 sm:grid-cols-2">
          <Field label="Nome completo" name="name" />
          <Field label="Data de nascimento" name="birthDate" type="date" />
          <Field label="CPF" name="cpf" placeholder="000.000.000-00" />
          <Field label="Escolaridade" name="schooling" placeholder="Ex.: 5º ano, Ensino médio" />
          <Field label="Cidade" name="city" />
          <div />
          <Area label="Hipóteses diagnósticas" name="hypotheses" />
          <Area label="Observações clínicas" name="notes" />
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Para crianças, registre os responsáveis no campo de observações ou complemente no prontuário.
          </p>
          <div className="flex justify-end sm:col-span-2">
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, name, type = 'text', placeholder }: { label: string; name: string; type?: string; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} placeholder={placeholder} required />
    </div>
  )
}

function Area({ label, name }: { label: string; name: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} rows={3} />
    </div>
  )
}
