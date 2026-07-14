import Link from 'next/link'
import { differenceInYears, parseISO } from 'date-fns'
import { Search, UserRound } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { PageHeading } from '@/components/clinical-ui'
import { PatientForm } from '@/components/patient-form'
import { Input } from '@/components/ui/input'
import { getContext, getDashboardData } from '@/lib/dashboard-data'

function age(birthDate: string) {
  try {
    return `${differenceInYears(new Date(), parseISO(birthDate))} anos`
  } catch {
    return '—'
  }
}

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  const { session, profile } = await getContext()
  const data = await getDashboardData(q)

  return (
    <AppShell userName={session.user.name} role={profile.role}>
      <PageHeading
        eyebrow="Pacientes"
        title="Pessoas em acompanhamento"
        description="Localize rapidamente cada paciente e acesse o histórico completo de avaliações e correções."
        action={<PatientForm />}
      />
      <form className="relative mb-6 max-w-xl">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} className="pl-9" placeholder="Buscar por nome ou CPF" />
      </form>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="grid grid-cols-[1fr_110px_140px_160px_44px] border-b bg-muted/40 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>Paciente</span>
          <span>Idade</span>
          <span>Nascimento</span>
          <span>Cidade</span>
          <span />
        </div>
        {data.patients.map((patient) => (
          <Link
            href={`/patients/${patient.id}`}
            key={patient.id}
            className="grid grid-cols-[1fr_110px_140px_160px_44px] items-center border-b px-5 py-4 text-sm transition-colors last:border-0 hover:bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-primary">
                <UserRound size={17} />
              </span>
              <div>
                <p className="font-medium text-foreground">{patient.name}</p>
                <p className="text-xs text-muted-foreground">CPF {patient.cpf}</p>
              </div>
            </div>
            <span className="text-muted-foreground">{age(patient.birthDate)}</span>
            <span className="text-muted-foreground">{patient.birthDate}</span>
            <span className="text-muted-foreground">{patient.city}</span>
            <span className="text-primary">→</span>
          </Link>
        ))}
        {!data.patients.length && (
          <p className="p-12 text-center text-sm text-muted-foreground">
            {q ? 'Nenhum paciente encontrado para a busca.' : 'Nenhum paciente cadastrado ainda. Use “Novo paciente” para começar.'}
          </p>
        )}
      </div>
    </AppShell>
  )
}
