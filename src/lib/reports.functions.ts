import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc('has_role', {
    _user_id: context.userId,
    _role: 'admin',
  })
  if (!data) throw new Error('Apenas administradores acessam relatórios.')
}

export type ReportsRange = '30d' | '90d' | '180d' | '365d'

function sinceDate(range: ReportsRange): string {
  const days = { '30d': 30, '90d': 90, '180d': 180, '365d': 365 }[range]
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export const getClinicReports = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { range: ReportsRange }) => i)
  .handler(async ({ context, data }) => {
    await requireAdmin(context)
    const since = sinceDate(data.range)
    const sinceDay = since.slice(0, 10)

    const [profilesQ, tasksQ, sessionsQ, evalsQ, patientsQ, screeningsQ, anamnesesQ] =
      await Promise.all([
        context.supabase.from('profiles').select('id, name'),
        context.supabase
          .from('test_tasks')
          .select(
            'id, status, scheduled_at, started_at, completed_at, approved_at, duration_minutes, patient_id, evaluation_id, test_id, test_catalog(acronym, name, category), evaluations(created_by)',
          )
          .gte('scheduled_at', since),
        context.supabase
          .from('sessions_plan')
          .select('id, session_date, status, modality, created_by, patient_id')
          .gte('session_date', sinceDay),
        context.supabase
          .from('evaluations')
          .select('id, created_at, created_by, status, patient_id')
          .gte('created_at', since),
        context.supabase.from('patients').select('id, status, created_at'),
        context.supabase
          .from('screenings')
          .select('id, instrument, created_at, created_by')
          .gte('created_at', since),
        context.supabase
          .from('anamneses')
          .select('id, created_by, created_at')
          .gte('created_at', since),
      ])

    const profiles = (profilesQ.data ?? []) as Array<{ id: string; name: string }>
    const nameOf: Record<string, string> = {}
    profiles.forEach((p) => (nameOf[p.id] = p.name))

    const tasks = (tasksQ.data ?? []) as any[]
    const sessions = (sessionsQ.data ?? []) as any[]
    const evals = (evalsQ.data ?? []) as any[]
    const patients = (patientsQ.data ?? []) as any[]
    const screenings = (screeningsQ.data ?? []) as any[]
    const anamneses = (anamnesesQ.data ?? []) as any[]

    // Corrections stats
    const durations: number[] = []
    tasks.forEach((t) => {
      if (t.started_at && t.completed_at) {
        const ms = new Date(t.completed_at).getTime() - new Date(t.started_at).getTime()
        if (ms > 0) durations.push(ms / (1000 * 60 * 60)) // hours
      }
    })
    durations.sort((a, b) => a - b)
    const avgCorrectionHours = durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0
    const medianCorrectionHours = durations.length
      ? durations[Math.floor(durations.length / 2)]
      : 0

    // Per psychologist productivity (via evaluations.created_by for tasks)
    type Prod = {
      id: string
      name: string
      sessions: number
      evaluations: number
      screenings: number
      anamneses: number
      tasksCompleted: number
      tasksApproved: number
      avgHours: number
    }
    const prod: Record<string, Prod> = {}
    const bucket = (uid: string): Prod => {
      if (!prod[uid])
        prod[uid] = {
          id: uid,
          name: nameOf[uid] ?? '—',
          sessions: 0,
          evaluations: 0,
          screenings: 0,
          anamneses: 0,
          tasksCompleted: 0,
          tasksApproved: 0,
          avgHours: 0,
        }
      return prod[uid]
    }
    sessions.forEach((s) => s.created_by && bucket(s.created_by).sessions++)
    evals.forEach((e) => e.created_by && bucket(e.created_by).evaluations++)
    screenings.forEach((s) => s.created_by && bucket(s.created_by).screenings++)
    anamneses.forEach((a) => a.created_by && bucket(a.created_by).anamneses++)

    const perUserDur: Record<string, number[]> = {}
    tasks.forEach((t) => {
      const uid = t.evaluations?.created_by
      if (!uid) return
      const b = bucket(uid)
      if (t.completed_at) b.tasksCompleted++
      if (t.status === 'approved') b.tasksApproved++
      if (t.started_at && t.completed_at) {
        const h = (new Date(t.completed_at).getTime() - new Date(t.started_at).getTime()) / 3600000
        if (h > 0) {
          perUserDur[uid] = perUserDur[uid] ?? []
          perUserDur[uid].push(h)
        }
      }
    })
    Object.entries(perUserDur).forEach(([uid, arr]) => {
      bucket(uid).avgHours = arr.reduce((a, b) => a + b, 0) / arr.length
    })
    const productivity = Object.values(prod).sort(
      (a, b) => b.sessions + b.evaluations - (a.sessions + a.evaluations),
    )

    // Most used tests
    const testCount: Record<string, { acronym: string; name: string; category: string; count: number }> = {}
    tasks.forEach((t) => {
      const tc = t.test_catalog
      if (!tc) return
      const key = tc.acronym ?? tc.name
      testCount[key] = testCount[key] ?? {
        acronym: tc.acronym ?? '—',
        name: tc.name ?? '—',
        category: tc.category ?? '—',
        count: 0,
      }
      testCount[key].count++
    })
    const topTests = Object.values(testCount).sort((a, b) => b.count - a.count).slice(0, 10)

    // Status funnel
    const funnel = {
      todo: tasks.filter((t) => t.status === 'todo').length,
      correcting: tasks.filter((t) => t.status === 'correcting').length,
      review: tasks.filter((t) => t.status === 'review').length,
      approved: tasks.filter((t) => t.status === 'approved').length,
    }

    // Session status
    const sessionStatus = {
      scheduled: sessions.filter((s) => s.status === 'scheduled' || s.status === 'planned').length,
      done: sessions.filter((s) => s.status === 'done' || s.status === 'completed').length,
      cancelled: sessions.filter((s) => s.status === 'cancelled').length,
    }

    // Sessions per week (last 12 weeks)
    const weekMap: Record<string, number> = {}
    sessions.forEach((s) => {
      const d = new Date(s.session_date)
      d.setDate(d.getDate() - d.getDay())
      const key = d.toISOString().slice(0, 10)
      weekMap[key] = (weekMap[key] ?? 0) + 1
    })
    const weekly = Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([week, count]) => ({ week, count }))

    // Modality mix
    const modality = {
      presencial: sessions.filter((s) => s.modality === 'presencial').length,
      online: sessions.filter((s) => s.modality === 'online').length,
    }

    return {
      range: data.range,
      totals: {
        activePatients: patients.filter((p) => p.status === 'active').length,
        newPatients: patients.filter((p) => new Date(p.created_at) >= new Date(since)).length,
        sessions: sessions.length,
        evaluations: evals.length,
        screenings: screenings.length,
        anamneses: anamneses.length,
        approvedResults: funnel.approved,
      },
      avgCorrectionHours,
      medianCorrectionHours,
      funnel,
      sessionStatus,
      modality,
      productivity,
      topTests,
      weekly,
    }
  })
