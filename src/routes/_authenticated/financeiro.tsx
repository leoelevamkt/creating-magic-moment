import { createFileRoute, redirect } from '@tanstack/react-router'
import { FinanceTab } from '@/components/patients/FinanceTab'

export const Route = createFileRoute('/_authenticated/financeiro')({
  head: () => ({ meta: [{ title: 'Financeiro — NeuroFlux' }] }),
  beforeLoad: ({ context }) => {
    if ((context as { role?: string }).role !== 'admin') {
      throw redirect({ to: '/kanban' })
    }
  },
  component: FinanceiroPage,
})

function FinanceiroPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold">Financeiro da empresa</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie entradas, saídas e a saúde financeira de toda a clínica.
        </p>
      </header>
      <FinanceTab scope="all" showPatientColumn />
    </div>
  )
}
