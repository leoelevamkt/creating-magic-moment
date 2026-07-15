import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const CreateEvaluation = z.object({
  patientId: z.string().uuid(),
  title: z.string().min(2),
  modality: z.enum(['presencial', 'online']),
  scheduledAt: z.string().optional().nullable(),
  testIds: z.array(z.string().uuid()),
  customTests: z
    .array(
      z.object({
        name: z.string().min(2).max(200),
        acronym: z.string().max(40).optional().nullable(),
        category: z.string().max(80).optional().nullable(),
      }),
    )
    .optional()
    .default([]),
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
    if (data.testIds.length === 0 && (data.customTests?.length ?? 0) === 0) {
      throw new Error('Selecione ou adicione ao menos um teste.')
    }
    const scheduled = data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null

    const customIds: string[] = []
    if (data.customTests && data.customTests.length > 0) {
      const rows = data.customTests.map((t) => ({
        name: t.name.trim(),
        acronym: (t.acronym?.trim() || t.name.trim().slice(0, 20)),
        category: (t.category?.trim() || 'Outros'),
        source: 'custom',
        status: 'pending' as const,
      }))
      const { data: inserted, error: cErr } = await context.supabase
        .from('test_catalog')
        .insert(rows)
        .select('id')
      if (cErr) throw new Error(cErr.message)
      for (const r of inserted ?? []) customIds.push(r.id)
    }

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
    const allTestIds = [...data.testIds, ...customIds]
    const tasks = allTestIds.map((testId) => ({
      evaluation_id: ev!.id,
      patient_id: data.patientId,
      test_id: testId,
      status: 'todo' as 'todo',
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
        'id, evaluation_id, patient_id, test_id, status, created_at, scheduled_at, started_at, completed_at, duration_minutes, correction_notes, raw_score, standard_score, classification, synthesis, admin_notes, approved_at, patients(name), test_catalog(acronym, name), evaluations(title, modality)',
      )
      .order('created_at', { ascending: false, nullsFirst: false })
    if (error) throw new Error(error.message)
    return data ?? []
  })

export type TaskStatus = 'todo' | 'correcting' | 'review' | 'approved'

export const updateTaskStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; status: TaskStatus }) => i)
  .handler(async ({ context, data }) => {
    const nowIso = new Date().toISOString()
    const patch: {
      status: TaskStatus
      started_at?: string
      completed_at?: string
      approved_at?: string
      approved_by?: string
      duration_minutes?: number
    } = { status: data.status }
    if (data.status === 'correcting') patch.started_at = nowIso
    if (data.status === 'review') {
      patch.completed_at = nowIso
      const { data: current } = await context.supabase
        .from('test_tasks')
        .select('started_at, duration_minutes')
        .eq('id', data.id)
        .maybeSingle()
      if (current?.started_at && !current.duration_minutes) {
        const diffMs = Date.now() - new Date(current.started_at).getTime()
        patch.duration_minutes = Math.max(1, Math.round(diffMs / 60000))
      }
    }
    if (data.status === 'approved') {
      patch.approved_at = nowIso
      patch.approved_by = context.userId
    }
    const { error } = await context.supabase.from('test_tasks').update(patch).eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

const UpdateTask = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  title: z.string().min(2),
  modality: z.enum(['presencial', 'online']),
  testId: z.string().uuid(),
})

export const updateTask = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdateTask.parse(i))
  .handler(async ({ context, data }) => {
    const { data: current, error: cErr } = await context.supabase
      .from('test_tasks')
      .select('evaluation_id')
      .eq('id', data.id)
      .maybeSingle()
    if (cErr) throw new Error(cErr.message)
    if (!current?.evaluation_id) throw new Error('Tarefa não encontrada.')

    const { error: evErr } = await context.supabase
      .from('evaluations')
      .update({ patient_id: data.patientId, title: data.title, modality: data.modality })
      .eq('id', current.evaluation_id)
    if (evErr) throw new Error(evErr.message)

    const { error } = await context.supabase
      .from('test_tasks')
      .update({ patient_id: data.patientId, test_id: data.testId })
      .eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const deleteTask = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('test_tasks').delete().eq('id', data.id)
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
      inCorrection: tasks.filter((t) => t.status === 'correcting').length,
      awaitingAdmin: tasks.filter((t) => t.status === 'review').length,
      approved: tasks.filter((t) => t.status === 'approved').length,
    }
    return {
      patients: patientsQ.count ?? 0,
      ...counts,
      activity: tasks.slice(0, 8),
      upcoming: upcomingQ.data ?? [],
    }
  })
