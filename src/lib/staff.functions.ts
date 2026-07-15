import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const CreateStaff = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'staff']),
})

export const listTeam = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      context.supabase.from('profiles').select('id, name, email').order('name'),
      context.supabase.from('user_roles').select('user_id, role'),
    ])
    const map = new Map<string, 'admin' | 'staff'>()
    for (const r of roles ?? []) {
      const existing = map.get(r.user_id)
      if (r.role === 'admin' || !existing) map.set(r.user_id, r.role as 'admin' | 'staff')
    }
    return (profiles ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: map.get(p.id) ?? 'staff',
    }))
  })

async function assertAdmin(supabase: ReturnType<typeof requireSupabaseAuth> extends never ? never : any, userId: string) {
  const { data, error } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Apenas administradoras podem executar esta ação.')
}

export const createStaff = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateStaff.parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    })
    if (error) throw new Error(error.message)
    const uid = created.user!.id
    await supabaseAdmin.from('profiles').upsert({ id: uid, name: data.name, email: data.email })
    // handle_new_user trigger already sets a default role; upsert desired role
    await supabaseAdmin.from('user_roles').delete().eq('user_id', uid)
    await supabaseAdmin.from('user_roles').insert({ user_id: uid, role: data.role })
    return { ok: true }
  })

export const setRole = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string; role: 'admin' | 'staff' }) => i)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    await supabaseAdmin.from('user_roles').delete().eq('user_id', data.userId)
    const { error } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: data.userId, role: data.role })
    if (error) throw new Error(error.message)
    return { ok: true }
  })
