import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const CatalogInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  acronym: z.string().min(1),
  category: z.string().min(1),
  source: z.string().min(1),
  age_range: z.string().optional().nullable(),
  application_mode: z.string().optional().nullable(),
  estimated_minutes: z.number().int().nullable().optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(['approved', 'pending', 'archived']).default('approved'),
})

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc('has_role', {
    _user_id: context.userId,
    _role: 'admin',
  })
  if (!data) throw new Error('Apenas administradores podem alterar o catálogo.')
}

export const upsertTest = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CatalogInput.parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context)
    const payload = {
      name: data.name,
      acronym: data.acronym,
      category: data.category,
      source: data.source,
      age_range: data.age_range ?? null,
      application_mode: data.application_mode ?? null,
      estimated_minutes: data.estimated_minutes ?? null,
      notes: data.notes ?? null,
      status: data.status,
    }
    if (data.id) {
      const { error } = await context.supabase.from('test_catalog').update(payload).eq('id', data.id)
      if (error) throw new Error(error.message)
      return { id: data.id }
    }
    const { data: row, error } = await context.supabase
      .from('test_catalog')
      .insert(payload)
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return { id: row!.id }
  })

export const deleteTest = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    await assertAdmin(context)
    const { error } = await context.supabase.from('test_catalog').delete().eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })
