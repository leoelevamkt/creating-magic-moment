import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

// ---------------- Notes ----------------
const NoteChecklistItem = z.object({ label: z.string(), done: z.boolean() })

export const listPatientNotes = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { patientId: string }) => i)
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from('patient_notes')
      .select(
        'id, title, content, color, pinned, checklist, session_number, session_dates, planned_tests, created_at, updated_at, created_by',
      )
      .eq('patient_id', data.patientId)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    if (error) throw new Error(error.message)
    return rows ?? []
  })

const NoteInput = z.object({
  patientId: z.string().uuid(),
  title: z.string().max(200).default(''),
  content: z.string().default(''),
  color: z.string().default('default'),
  pinned: z.boolean().default(false),
  checklist: z.array(NoteChecklistItem).default([]),
  sessionNumber: z.number().int().positive().nullable().optional(),
  sessionDates: z.array(z.string()).default([]),
  plannedTests: z.string().optional().nullable(),
})
export const createPatientNote = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => NoteInput.parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('patient_notes').insert({
      patient_id: data.patientId,
      created_by: context.userId,
      title: data.title,
      content: data.content,
      color: data.color,
      pinned: data.pinned,
      checklist: data.checklist,
      session_number: data.sessionNumber ?? null,
      session_dates: data.sessionDates,
      planned_tests: data.plannedTests || null,
    } as never)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

const NoteUpdate = z.object({
  id: z.string().uuid(),
  title: z.string().max(200).optional(),
  content: z.string().optional(),
  color: z.string().optional(),
  pinned: z.boolean().optional(),
  checklist: z.array(NoteChecklistItem).optional(),
  sessionNumber: z.number().int().positive().nullable().optional(),
  sessionDates: z.array(z.string()).optional(),
  plannedTests: z.string().nullable().optional(),
})
export const updatePatientNote = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => NoteUpdate.parse(i))
  .handler(async ({ context, data }) => {
    const { id, sessionNumber, sessionDates, plannedTests, ...rest } = data
    const patch: Record<string, unknown> = { ...rest }
    if (sessionNumber !== undefined) patch.session_number = sessionNumber
    if (sessionDates !== undefined) patch.session_dates = sessionDates
    if (plannedTests !== undefined) patch.planned_tests = plannedTests || null
    const { error } = await context.supabase
      .from('patient_notes')
      .update(patch as never)
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const deletePatientNote = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('patient_notes').delete().eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })


// ---------------- Session plan ----------------
export const listPatientPlan = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { patientId: string }) => i)
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from('sessions_plan')
      .select(
        'id, title, session_date, start_time, end_time, modality, status, objectives, notes, session_number, checklist, planned_test_ids',
      )
      .eq('patient_id', data.patientId)
      .order('session_number', { ascending: true, nullsFirst: false })
      .order('session_date', { ascending: true })
    if (error) throw new Error(error.message)
    return rows ?? []
  })

const ChecklistItem = z.object({ label: z.string(), done: z.boolean() })
const PlanCreate = z.object({
  patientId: z.string().uuid(),
  title: z.string().min(1),
  sessionNumber: z.number().int().positive().nullable().optional(),
  sessionDate: z.string().min(4),
  startTime: z.string().optional().nullable(),
  modality: z.enum(['presencial', 'online']).default('presencial'),
  objectives: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  checklist: z.array(ChecklistItem).default([]),
})
export const createPatientPlanEntry = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => PlanCreate.parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('sessions_plan').insert({
      created_by: context.userId,
      patient_id: data.patientId,
      title: data.title,
      session_number: data.sessionNumber ?? null,
      session_date: data.sessionDate,
      start_time: data.startTime || null,
      modality: data.modality,
      objectives: data.objectives || null,
      notes: data.notes || null,
      checklist: data.checklist,
      planned_test_ids: [],
      status: 'scheduled',
    })
    if (error) throw new Error(error.message)
    return { ok: true }
  })

const PlanUpdate = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  sessionNumber: z.number().int().positive().nullable().optional(),
  sessionDate: z.string().optional(),
  startTime: z.string().optional().nullable(),
  modality: z.enum(['presencial', 'online']).optional(),
  objectives: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['scheduled', 'done', 'cancelled']).optional(),
  checklist: z.array(ChecklistItem).optional(),
})
export const updatePatientPlanEntry = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => PlanUpdate.parse(i))
  .handler(async ({ context, data }) => {
    const { id, sessionNumber, sessionDate, startTime, checklist, ...rest } = data
    const patch: {
      title?: string
      modality?: 'presencial' | 'online'
      objectives?: string | null
      notes?: string | null
      status?: 'scheduled' | 'done' | 'cancelled'
      session_number?: number | null
      session_date?: string
      start_time?: string | null
      checklist?: Array<{ label: string; done: boolean }>
    } = { ...rest }
    if (sessionNumber !== undefined) patch.session_number = sessionNumber
    if (sessionDate !== undefined) patch.session_date = sessionDate
    if (startTime !== undefined) patch.start_time = startTime || null
    if (checklist !== undefined) patch.checklist = checklist
    const { error } = await context.supabase.from('sessions_plan').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const deletePatientPlanEntry = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('sessions_plan').delete().eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })
