import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { CalendarDays, ClipboardList, Library, Users } from 'lucide-react'
import { patientStats } from '@/lib/patients.functions'
import { getMyProfile } from '@/lib/profile.functions'

export const Route = createFileRoute('/_authenticated/dashboard')({
  head: () => ({ meta: [{ title: 'Painel — NeuroFlux' }] }),
  component: Dashboard,
})

function Dashboard() {
  const stats = useServerFn(patientStats)
  const profile = useServerFn(getMyProfile)
  const statsQ = useQuery({ queryKey: ['stats'], queryFn: () => stats() })
  const profileQ = useQuery({ queryKey: ['profile'], queryFn: () => profile() })

  const cards = [
    {
      label: 'Pacientes',
      value: statsQ.data?.patients ?? 0,
      icon: Users,
      to: '/patients' as const,
    },
    {
      label: 'Avaliações',
      value: statsQ.data?.evaluations ?? 0,
      icon: ClipboardList,
      to: '/kanban' as const,
    },
    {
      label: 'Tarefas',
      value: statsQ.data?.tasks ?? 0,
      icon: CalendarDays,
      to: '/agenda' as const,
    },
    {
      label: 'Catálogo',
      value: '25+',
      icon: Library,
      to: '/catalog' as const,
    },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header>
        <p className="text-sm font-medium text-primary">Visão geral</p>
        <h1 className="font-serif text-3xl font-semibold">
          Olá, {profileQ.data?.name ?? 'clínica'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Panorama da clínica e atalhos para os principais fluxos.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.label}
              to={c.to}
              className="group flex flex-col gap-3 rounded-2xl border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{c.label}</span>
                <Icon className="text-primary" size={18} />
              </div>
              <p className="font-serif text-3xl font-semibold text-foreground">{c.value}</p>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
