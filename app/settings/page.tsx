import { ShieldCheck, UserCog, Users } from 'lucide-react'
import { setRole } from '@/app/actions/clinical'
import { AppShell } from '@/components/app-shell'
import { PageHeading } from '@/components/clinical-ui'
import { StaffForm } from '@/components/staff-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getContext, getTeam } from '@/lib/dashboard-data'

export default async function SettingsPage() {
  const { session, profile } = await getContext()
  const isAdmin = profile.role === 'admin'
  const team = isAdmin ? await getTeam() : []

  return (
    <AppShell userName={session.user.name} role={profile.role}>
      <PageHeading
        eyebrow="Configurações"
        title="Acesso e equipe"
        description="Gerencie os acessos da clínica e confira as regras essenciais de proteção dos dados clínicos."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-6">
          <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
            <UserCog />
          </span>
          <h2 className="mt-5 font-serif text-xl font-semibold">Seu perfil</h2>
          <dl className="mt-5 flex flex-col gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="mt-1 font-medium">{session.user.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">E-mail</dt>
              <dd className="mt-1 font-medium">{session.user.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Permissão</dt>
              <dd className="mt-1">
                <Badge>{isAdmin ? 'Administradora' : 'Funcionária'}</Badge>
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <ShieldCheck />
          </span>
          <h2 className="mt-5 font-serif text-xl font-semibold">Boas práticas</h2>
          <ul className="mt-5 flex list-disc flex-col gap-3 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Não compartilhe sua senha ou sessão.</li>
            <li>Registre apenas informações necessárias para a atividade clínica.</li>
            <li>Confirme a situação regulatória de cada teste antes da aplicação.</li>
            <li>O OK administrativo deve ocorrer somente após revisão da tarefa realizada.</li>
          </ul>
        </section>
      </div>

      {isAdmin && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border bg-card p-6">
            <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
              <Users />
            </span>
            <h2 className="mt-5 font-serif text-xl font-semibold">Criar novo acesso</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie o login da funcionária ou de outra administradora. Compartilhe a senha provisória com segurança.
            </p>
            <StaffForm />
          </section>

          <section className="rounded-xl border bg-card p-6">
            <h2 className="font-serif text-xl font-semibold">Equipe da clínica</h2>
            <div className="mt-5 flex flex-col divide-y">
              {team.map((member) => (
                <div key={member.userId} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                      {member.role === 'admin' ? 'Admin' : 'Funcionária'}
                    </Badge>
                    {member.userId !== session.user.id && (
                      <form action={setRole}>
                        <input type="hidden" name="userId" value={member.userId} />
                        <input type="hidden" name="role" value={member.role === 'admin' ? 'staff' : 'admin'} />
                        <Button type="submit" size="sm" variant="outline">
                          {member.role === 'admin' ? 'Tornar funcionária' : 'Tornar admin'}
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  )
}
