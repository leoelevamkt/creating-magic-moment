'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { createStaff, type ActionState } from '@/app/actions/clinical'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      <UserPlus />
      {pending ? 'Criando…' : 'Criar acesso'}
    </Button>
  )
}

export function StaffForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [role, setRole] = useState('staff')
  const [state, formAction] = useActionState<ActionState, FormData>(createStaff, null)

  useEffect(() => {
    if (!state) return
    if (state.ok) {
      toast.success(state.message)
      formRef.current?.reset()
      setRole('staff')
    } else {
      toast.error(state.message)
    }
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="mt-5 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="staff-name">Nome</Label>
        <Input id="staff-name" name="name" placeholder="Nome da profissional" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="staff-email">E-mail</Label>
        <Input id="staff-email" name="email" type="email" placeholder="email@clinica.com.br" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="staff-password">Senha provisória</Label>
          <Input id="staff-password" name="password" type="text" placeholder="Mínimo 8 caracteres" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Permissão</Label>
          <input type="hidden" name="role" value={role} />
          <Select value={role} onValueChange={(v) => setRole(v ?? 'staff')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">Funcionária</SelectItem>
              <SelectItem value="admin">Administradora</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  )
}
