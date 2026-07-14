import { AppShell } from '@/components/app-shell'
import { PageHeading, SummaryCards, TaskTable, Upcoming } from '@/components/clinical-ui'
import { getContext, getDashboardData } from '@/lib/dashboard-data'

export default async function DashboardPage() {
  const { session, profile } = await getContext()
  const data = await getDashboardData()
  const firstName = session.user.name.split(' ')[0]
  return <AppShell userName={session.user.name} role={profile.role}>
    <PageHeading eyebrow="Visão geral" title={`Bom dia, ${firstName}.`} description="Acompanhe as avaliações, correções e aprovações que precisam da sua atenção hoje." />
    <SummaryCards patients={data.patients.length} tasks={data.tasks} />
    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]"><TaskTable tasks={data.tasks} /><Upcoming tasks={data.tasks} /></div>
  </AppShell>
}
