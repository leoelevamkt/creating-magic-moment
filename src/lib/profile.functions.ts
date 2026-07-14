import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export const getMyProfile = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profile, roles] = await Promise.all([
      context.supabase.from('profiles').select('id, name, email').eq('id', context.userId).maybeSingle(),
      context.supabase.from('user_roles').select('role').eq('user_id', context.userId),
    ])
    return {
      id: context.userId,
      email: context.user.email ?? profile.data?.email ?? '',
      name: profile.data?.name ?? (context.user.email?.split('@')[0] ?? 'Usuária'),
      role: (roles.data?.[0]?.role as 'admin' | 'staff' | undefined) ?? 'staff',
    }
  })

export const listCatalog = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('test_catalog')
      .select('id, name, acronym, category, source, status, age_range, application_mode, estimated_minutes, notes')
      .order('name')
    if (error) throw new Error(error.message)
    return data ?? []
  })
