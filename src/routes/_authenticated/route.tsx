import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { supabase } from '@/integrations/supabase/client'
import { AppShell } from '@/components/app-shell'
import { getMyProfile } from '@/lib/profile.functions'

export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) throw redirect({ to: '/auth', search: {} })
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id)
    const role = (roles?.[0]?.role as 'admin' | 'staff' | undefined) ?? 'staff'
    return { user: data.user, role }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const fn = useServerFn(getMyProfile)
  const { data } = useQuery({
    queryKey: ['profile'],
    queryFn: () => fn(),
  })
  return (
    <AppShell userName={data?.name ?? 'Usuária'} role={data?.role ?? 'staff'}>
      <Outlet />
    </AppShell>
  )
}

