import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const CreateMaterial = z.object({
  name: z.string().min(2),
  category: z.string().min(1).default('geral'),
  unit: z.string().min(1).default('un'),
  quantity: z.number().int().nonnegative().default(0),
  minQuantity: z.number().int().nonnegative().default(0),
  notes: z.string().optional().nullable(),
})

export const listMaterials = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('materials')
      .select('id, name, category, unit, quantity, min_quantity, notes, updated_at')
      .order('name')
    if (error) throw new Error(error.message)
    return data ?? []
  })

async function requireAdmin(context: { userId: string; supabase: ReturnType<typeof (async () => null)> extends never ? never : any }) {
  const { data, error } = await (context as { supabase: any }).supabase.rpc('has_role', {
    _user_id: context.userId,
    _role: 'admin',
  })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Apenas administradores podem editar materiais.')
}

export const createMaterial = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateMaterial.parse(i))
  .handler(async ({ context, data }) => {
    await requireAdmin(context)
    const { error } = await context.supabase.from('materials').insert({
      name: data.name,
      category: data.category,
      unit: data.unit,
      quantity: data.quantity,
      min_quantity: data.minQuantity,
      notes: data.notes || null,
    })
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const deleteMaterial = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    await requireAdmin(context)
    const { error } = await context.supabase.from('materials').delete().eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const registerMovement = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { materialId: string; kind: 'in' | 'out' | 'adjust'; quantity: number; reason?: string | null }) => i)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('material_movements').insert({
      material_id: data.materialId,
      author_id: context.userId,
      kind: data.kind,
      quantity: data.quantity,
      reason: data.reason || null,
    })
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const listMovements = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { materialId: string }) => i)
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from('material_movements')
      .select('id, kind, quantity, reason, created_at, profiles!material_movements_author_id_fkey(name)')
      .eq('material_id', data.materialId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)
    return rows ?? []
  })
