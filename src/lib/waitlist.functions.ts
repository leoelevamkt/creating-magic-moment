import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const WaitlistInput = z.object({
  patientId: z.string().uuid().nullable().optional(),
  patientName: z.string().max(200).nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  contactEmail: z.string().email().max(200).nullable().optional().or(z.literal('').transform(() => null)),
  sessionType: z.string().max(80).nullable().optional(),
  preferredWeekdays: z.array(z.number().int().min(0).max(6)).default([]),
  preferredStartTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  preferredEndTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  modality: z.enum(['presencial', 'online', 'any']).default('any'),
  priority: z.number().int().min(1).max(5).default(3),
  notes: z.string().max(2000).nullable().optional(),
})

const UpdateWaitlistInput = WaitlistInput.extend({
  id: z.string().uuid(),
  status: z.enum(['active', 'scheduled', 'archived']).optional(),
})

export const listWaitlist = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { status?: 'active' | 'scheduled' | 'archived' | 'all' }) =>
    z.object({ status: z.enum(['active', 'scheduled', 'archived', 'all']).optional() }).parse(i),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from('waitlist')
      .select(
        'id, patient_id, patient_name, contact_phone, contact_email, session_type, preferred_weekdays, preferred_start_time, preferred_end_time, modality, priority, notes, status, created_at, patients(name)',
      )
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
    if (!data.status || data.status === 'active') q = q.eq('status', 'active')
    else if (data.status !== 'all') q = q.eq('status', data.status)
    const { data: rows, error } = await q
    if (error) throw new Error(error.message)
    return rows ?? []
  })

export const createWaitlistEntry = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => WaitlistInput.parse(i))
  .handler(async ({ context, data }) => {
    if (!data.patientId && !data.patientName) {
      throw new Error('Informe um paciente ou um nome de contato.')
    }
    const { error, data: row } = await context.supabase
      .from('waitlist')
      .insert({
        patient_id: data.patientId ?? null,
        patient_name: data.patientName ?? null,
        contact_phone: data.contactPhone ?? null,
        contact_email: data.contactEmail ?? null,
        session_type: data.sessionType ?? null,
        preferred_weekdays: data.preferredWeekdays,
        preferred_start_time: data.preferredStartTime ?? null,
        preferred_end_time: data.preferredEndTime ?? null,
        modality: data.modality,
        priority: data.priority,
        notes: data.notes ?? null,
        created_by: context.userId,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return { id: row!.id }
  })

export const updateWaitlistEntry = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdateWaitlistInput.parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from('waitlist')
      .update({
        patient_id: data.patientId ?? null,
        patient_name: data.patientName ?? null,
        contact_phone: data.contactPhone ?? null,
        contact_email: data.contactEmail ?? null,
        session_type: data.sessionType ?? null,
        preferred_weekdays: data.preferredWeekdays,
        preferred_start_time: data.preferredStartTime ?? null,
        preferred_end_time: data.preferredEndTime ?? null,
        modality: data.modality,
        priority: data.priority,
        notes: data.notes ?? null,
        ...(data.status ? { status: data.status } : {}),
      })
      .eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const setWaitlistStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; status: 'active' | 'scheduled' | 'archived' }) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(['active', 'scheduled', 'archived']),
    }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from('waitlist')
      .update({ status: data.status })
      .eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const deleteWaitlistEntry = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('waitlist').delete().eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

/**
 * Suggest waitlist candidates for a freed slot.
 * Matches on: modality (any-compat), weekday preference, and time window overlap.
 * Returns up to `limit` active entries sorted by priority then creation time.
 */
export const suggestWaitlistForSlot = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: {
    sessionDate: string
    startTime?: string | null
    endTime?: string | null
    modality?: 'presencial' | 'online'
    limit?: number
  }) =>
    z.object({
      sessionDate: z.string().min(4),
      startTime: z.string().nullable().optional(),
      endTime: z.string().nullable().optional(),
      modality: z.enum(['presencial', 'online']).optional(),
      limit: z.number().int().min(1).max(20).optional(),
    }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from('waitlist')
      .select(
        'id, patient_id, patient_name, contact_phone, contact_email, session_type, preferred_weekdays, preferred_start_time, preferred_end_time, modality, priority, notes, patients(name)',
      )
      .eq('status', 'active')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(200)
    if (error) throw new Error(error.message)

    const dayOfWeek = new Date(`${data.sessionDate}T00:00:00`).getDay()
    const slotStart = data.startTime ?? null
    const slotEnd = data.endTime ?? null
    const slotModality = data.modality ?? null
    const limit = data.limit ?? 5

    const scored = (rows ?? [])
      .map((r) => {
        let score = 0
        // modality
        if (!slotModality || r.modality === 'any' || r.modality === slotModality) score += 2
        else return null
        // weekday
        const wd = Array.isArray(r.preferred_weekdays) ? r.preferred_weekdays : []
        if (wd.length === 0 || wd.includes(dayOfWeek)) score += 2
        else score -= 1
        // time window overlap
        if (slotStart && slotEnd && r.preferred_start_time && r.preferred_end_time) {
          const overlap = slotStart < r.preferred_end_time && slotEnd > r.preferred_start_time
          if (overlap) score += 3
          else score -= 2
        } else {
          score += 1
        }
        // priority (1 best)
        score += 6 - r.priority
        return { entry: r, score }
      })
      .filter((x): x is { entry: NonNullable<typeof rows>[number]; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return scored.map((s) => s.entry)
  })
