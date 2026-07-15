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
        'id, patient_id, title, session_date, start_time, end_time, modality, planned_test_ids, objectives, notes, status, meet_url, google_event_id, create_meet, patients(name)',
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
    // Overlap check against this user's agenda blocks
    if (data.startTime && data.endTime) {
      const weekday = new Date(`${data.sessionDate}T00:00:00`).getDay()
      const { data: blocks } = await context.supabase
        .from('agenda_blocks')
        .select('id, title, recurrence, weekday, block_date, start_time, end_time')
        .eq('owner_id', context.userId)
      const hit = (blocks ?? []).find((b) => {
        if (b.recurrence === 'weekly' && b.weekday !== weekday) return false
        if (b.recurrence === 'once' && b.block_date !== data.sessionDate) return false
        return data.startTime! < b.end_time && data.endTime! > b.start_time
      })
      if (hit) {
        throw new Error(`Horário conflita com o bloqueio "${hit.title}".`)
      }
    }
    const { data: row, error } = await context.supabase
      .from('sessions_plan')
      .insert({
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
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return { ok: true, id: row.id }
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
