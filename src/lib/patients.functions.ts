import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const CreateInput = z.object({
  name: z.string().min(2),
  birthDate: z.string().min(4),
  cpf: z.string().min(3),
  schooling: z.string().min(1),
  city: z.string().min(1),
  hypotheses: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const listPatients = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('patients')
      .select('id, name, birth_date, cpf, schooling, city, status, created_at')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data ?? []
  })

export const createPatient = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateInput.parse(input))
  .handler(async ({ context, data }) => {
    const { error, data: row } = await context.supabase
      .from('patients')
      .insert({
        created_by: context.userId,
        name: data.name,
        birth_date: data.birthDate,
        cpf: data.cpf,
        schooling: data.schooling,
        city: data.city,
        hypotheses: data.hypotheses || null,
        notes: data.notes || null,
        status: 'active',
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return { id: row!.id }
  })

export const patientStats = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [patients, evaluations, tasks] = await Promise.all([
      context.supabase.from('patients').select('id', { count: 'exact', head: true }),
      context.supabase.from('evaluations').select('id', { count: 'exact', head: true }),
      context.supabase.from('test_tasks').select('id', { count: 'exact', head: true }),
    ])
    return {
      patients: patients.count ?? 0,
      evaluations: evaluations.count ?? 0,
      tasks: tasks.count ?? 0,
    }
  })
