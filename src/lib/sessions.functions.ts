import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const CreateSession = z.object({
  patientId: z.string().uuid(),
  title: z.string().min(2),
  modality: z.enum(['presencial', 'online']),
  sessionDate: z.string().min(4),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  objectives: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  plannedTestIds: z.array(z.string().uuid()).default([]),
})

export const listSessions = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { from: string; to: string }) => input)
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from('sessions_plan')
      .select(
        'id, patient_id, title, session_date, start_time, end_time, modality, planned_test_ids, objectives, notes, status, patients(name)',
      )
      .gte('session_date', data.from)
      .lte('session_date', data.to)
      .order('session_date', { ascending: true })
    if (error) throw new Error(error.message)
    return rows ?? []
  })

export const createSession = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateSession.parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('sessions_plan').insert({
      created_by: context.userId,
      patient_id: data.patientId,
      title: data.title,
      modality: data.modality,
      session_date: data.sessionDate,
      start_time: data.startTime || null,
      end_time: data.endTime || null,
      objectives: data.objectives || null,
      notes: data.notes || null,
      planned_test_ids: data.plannedTestIds,
      status: 'scheduled',
    })
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const updateSessionStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; status: 'scheduled' | 'done' | 'cancelled' }) => i)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from('sessions_plan')
      .update({ status: data.status })
      .eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const deleteSession = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('sessions_plan').delete().eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })
