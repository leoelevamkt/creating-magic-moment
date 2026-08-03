import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export const listStandardBattery = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('standard_battery')
      .select('test_id, test_catalog(id, name, acronym, category)')
    if (error) throw new Error(error.message)
    return (data ?? []).map(d => d.test_catalog)
  })

export const addToStandardBattery = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { testId: string }) => i)
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    })
    if (!isAdmin) throw new Error('Apenas admins podem gerenciar a bateria padrão.')

    const { error } = await context.supabase
      .from('standard_battery')
      .upsert({ test_id: data.testId })
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const removeFromStandardBattery = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { testId: string }) => i)
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    })
    if (!isAdmin) throw new Error('Apenas admins podem gerenciar a bateria padrão.')

    const { error } = await context.supabase
      .from('standard_battery')
      .delete()
      .eq('test_id', data.testId)
    if (error) throw new Error(error.message)
    return { ok: true }
  })
