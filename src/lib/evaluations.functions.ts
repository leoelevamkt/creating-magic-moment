import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const CreateEvaluation = z.object({
  patientId: z.string().uuid(),
  title: z.string().min(2),
  modality: z.enum(['presencial', 'online']),
  scheduledAt: z.string().optional().nullable(),
  testIds: z.array(z.string().uuid()).min(1),
})

export const listEvaluations = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('evaluations')
      .select('id, title, modality, scheduled_at, status, patients(name)')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data ?? []
  })

export const createEvaluation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateEvaluation.parse(i))
  .handler(async ({ context, data }) => {
    const scheduled = data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null
    const { data: ev, error } = await context.supabase
      .from('evaluations')
      .insert({
        created_by: context.userId,
        patient_id: data.patientId,
        title: data.title,
        modality: data.modality,
        scheduled_at: scheduled,
        status: 'active',
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    const tasks = data.testIds.map((testId) => ({
      evaluation_id: ev!.id,
      patient_id: data.patientId,
      test_id: testId,
      status: 'todo' as const,
      scheduled_at: scheduled,
    }))
    const { error: tErr } = await context.supabase.from('test_tasks').insert(tasks)
    if (tErr) throw new Error(tErr.message)
    return { id: ev!.id }
  })

export const listTasks = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('test_tasks')
      .select(
        'id, status, scheduled_at, started_at, completed_at, duration_minutes, correction_notes, raw_score, standard_score, classification, synthesis, admin_notes, approved_at, patients(name), test_catalog(acronym, name)',
      )
      .order('scheduled_at', { ascending: false, nullsFirst: false })
    if (error) throw new Error(error.message)
    return data ?? []
  })

export const updateTaskStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: {
      id: string
      status: 'todo' | 'in_correction' | 'awaiting_admin' | 'approved'
    }) => i,
  )
  .handler(async ({ context, data }) => {
    const patch: Record<string, unknown> = { status: data.status }
    if (data.status === 'in_correction') patch.started_at = new Date().toISOString()
    if (data.status === 'awaiting_admin') patch.completed_at = new Date().toISOString()
    if (data.status === 'approved') {
      patch.approved_at = new Date().toISOString()
      patch.approved_by = context.userId
    }
    const { error } = await context.supabase.from('test_tasks').update(patch).eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const dashboardData = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [patientsQ, tasksQ, upcomingQ] = await Promise.all([
      context.supabase.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      context.supabase
        .from('test_tasks')
        .select('id, status, scheduled_at, duration_minutes, patients(name), test_catalog(acronym)')
        .order('scheduled_at', { ascending: false, nullsFirst: false })
        .limit(50),
      context.supabase
        .from('sessions_plan')
        .select('id, session_date, start_time, title, patients(name)')
        .gte('session_date', new Date().toISOString().slice(0, 10))
        .order('session_date', { ascending: true })
        .limit(5),
    ])
    const tasks = tasksQ.data ?? []
    const counts = {
      inCorrection: tasks.filter((t) => t.status === 'in_correction').length,
      awaitingAdmin: tasks.filter((t) => t.status === 'awaiting_admin').length,
      approved: tasks.filter((t) => t.status === 'approved').length,
    }
    return {
      patients: patientsQ.count ?? 0,
      ...counts,
      activity: tasks.slice(0, 8),
      upcoming: upcomingQ.data ?? [],
    }
  })
