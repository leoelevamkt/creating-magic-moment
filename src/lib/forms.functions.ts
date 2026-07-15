import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { templateById, type FormField } from './form-templates'

const CreateInput = z.object({
  patientId: z.string().uuid(),
  templateId: z.string().min(1),
  expiresInDays: z.number().int().min(1).max(365).optional().nullable(),
})

export const listForms = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from('patient_forms')
      .select('id, patient_id, title, description, token, status, submitted_at, expires_at, created_at, patients(name)')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []) as Array<{
      id: string
      patient_id: string
      title: string
      description: string | null
      token: string
      status: 'pending' | 'submitted' | 'archived'
      submitted_at: string | null
      expires_at: string | null
      created_at: string
      patients: { name: string } | null
    }>
  })

export const getFormResponses = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    const { data: row, error } = await (context.supabase as any)
      .from('patient_forms')
      .select('*, patients(name)')
      .eq('id', data.id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return row
  })

export const createForm = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateInput.parse(i))
  .handler(async ({ context, data }) => {
    const tpl = templateById(data.templateId)
    if (!tpl) throw new Error('Template não encontrado.')
    const expires_at = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 86400_000).toISOString()
      : null
    const { data: row, error } = await (context.supabase as any)
      .from('patient_forms')
      .insert({
        patient_id: data.patientId,
        title: tpl.title,
        description: tpl.description,
        fields: tpl.fields as unknown as FormField[],
        expires_at,
        created_by: context.userId,
      })
      .select('id, token')
      .single()
    if (error) throw new Error(error.message)
    return row as { id: string; token: string }
  })

export const archiveForm = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as any)
      .from('patient_forms')
      .update({ status: 'archived' })
      .eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })
