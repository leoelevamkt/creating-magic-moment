import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Settings2 } from 'lucide-react'
import { getMyProfile } from '@/lib/profile.functions'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/_authenticated/settings')({
  head: () => ({ meta: [{ title: 'Configurações — NeuroFlux' }] }),
  component: SettingsPage,
})

function SettingsPage() {
  const fn = useServerFn(getMyProfile)
  const { data } = useQuery({ queryKey: ['profile'], queryFn: () => fn() })

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Configurações</p>
        <h1 className="font-serif text-3xl font-semibold">Conta e clínica</h1>
      </div>
      <section className="rounded-2xl border bg-card p-6">
        <div className="mb-4 flex items-center gap-2 text-primary">
          <Settings2 size={18} />
          <span className="text-sm font-semibold">Perfil</span>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Item label="Nome" value={data?.name ?? '—'} />
          <Item label="E-mail" value={data?.email ?? '—'} />
          <Item
            label="Papel"
            value={
              <Badge variant="secondary">
                {data?.role === 'admin' ? 'Administradora' : 'Funcionária'}
              </Badge>
            }
          />
        </dl>
      </section>
    </div>
  )
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  )
}
