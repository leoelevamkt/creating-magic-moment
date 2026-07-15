import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const CreateCase = z.object({
  title: z.string().min(2),
  patientId: z.string().uuid().optional().nullable(),
  hypothesis: z.string().optional().nullable(),
  evolution: z.string().optional().nullable(),
  questions: z.string().optional().nullable(),
})

export const listCases = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('supervision_cases')
      .select('id, title, hypothesis, evolution, questions, status, owner_id, patient_id, created_at, patients(name)')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    const rows = data ?? []
    const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id)))
    const owners: Record<string, string> = {}
    if (ownerIds.length) {
      const { data: profs } = await context.supabase.from('profiles').select('id, name').in('id', ownerIds)
      for (const p of profs ?? []) owners[p.id] = p.name
    }
    return rows.map((r) => ({ ...r, owner_name: owners[r.owner_id] ?? '—' }))
  })

export const createCase = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateCase.parse(i))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from('supervision_cases')
      .insert({
        owner_id: context.userId,
        title: data.title,
        patient_id: data.patientId || null,
        hypothesis: data.hypothesis || null,
        evolution: data.evolution || null,
        questions: data.questions || null,
        status: 'open',
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return { id: row!.id }
  })

export const updateCaseStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; status: 'open' | 'in_supervision' | 'closed' }) => i)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from('supervision_cases')
      .update({ status: data.status })
      .eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const listCaseNotes = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { caseId: string }) => i)
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from('supervision_notes')
      .select('id, body, author_id, created_at')
      .eq('case_id', data.caseId)
      .order('created_at', { ascending: true })
    if (error) throw new Error(error.message)
    const ids = Array.from(new Set((rows ?? []).map((r) => r.author_id)))
    const authors: Record<string, string> = {}
    if (ids.length) {
      const { data: profs } = await context.supabase.from('profiles').select('id, name').in('id', ids)
      for (const p of profs ?? []) authors[p.id] = p.name
    }
    return (rows ?? []).map((r) => ({ ...r, author_name: authors[r.author_id] ?? '—' }))
  })

export const addCaseNote = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { caseId: string; body: string }) => i)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('supervision_notes').insert({
      case_id: data.caseId,
      author_id: context.userId,
      body: data.body,
    })
    if (error) throw new Error(error.message)
    return { ok: true }
  })
