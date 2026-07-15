import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { ShieldCheck, UserCog, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { getMyProfile } from '@/lib/profile.functions'
import { createStaff, listTeam, setRole } from '@/lib/staff.functions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/_authenticated/settings')({
  head: () => ({ meta: [{ title: 'Configurações — NeuroFlux' }] }),
  component: SettingsPage,
})

function SettingsPage() {
  const profile = useServerFn(getMyProfile)
  const team = useServerFn(listTeam)
  const create = useServerFn(createStaff)
  const role = useServerFn(setRole)
  const qc = useQueryClient()

  const me = useQuery({ queryKey: ['profile'], queryFn: () => profile() })
  const teamQ = useQuery({ queryKey: ['team'], queryFn: () => team() })
  const isAdmin = me.data?.role === 'admin'

  const [pending, setPending] = useState(false)
  const createMut = useMutation({
    mutationFn: (v: Parameters<typeof create>[0]['data']) => create({ data: v }),
    onSuccess: () => {
      toast.success('Acesso criado.')
      qc.invalidateQueries({ queryKey: ['team'] })
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setPending(false),
  })
  const roleMut = useMutation({
    mutationFn: (v: { userId: string; role: 'admin' | 'staff' }) => role({ data: v }),
    onSuccess: () => {
      toast.success('Papel atualizado.')
      qc.invalidateQueries({ queryKey: ['team'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const fd = new FormData(e.currentTarget)
    createMut.mutate({
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      password: String(fd.get('password') ?? ''),
      role: (String(fd.get('role') ?? 'staff') as 'admin' | 'staff'),
    })
    e.currentTarget.reset()
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold">Acesso e equipe</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gerencie os acessos da clínica e confira as regras essenciais de proteção dos dados clínicos.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border bg-card p-6">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserCog size={20} />
          </span>
          <h2 className="mt-4 font-serif text-2xl font-semibold">Seu perfil</h2>
          <dl className="mt-4 grid gap-3">
            <Item label="Nome" value={me.data?.name ?? '—'} />
            <Item label="E-mail" value={me.data?.email ?? '—'} />
            <Item
              label="Permissão"
              value={<Badge>{isAdmin ? 'Administradora' : 'Funcionária'}</Badge>}
            />
          </dl>
        </section>

        <section className="rounded-2xl border bg-card p-6">
          <span className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <ShieldCheck size={20} />
          </span>
          <h2 className="mt-4 font-serif text-2xl font-semibold">Boas práticas</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• Não compartilhe sua senha ou sessão.</li>
            <li>• Registre apenas informações necessárias para a atividade clínica.</li>
            <li>• Confirme a situação regulatória de cada teste antes da aplicação.</li>
            <li>• O OK administrativo deve ocorrer somente após revisão da tarefa realizada.</li>
          </ul>
        </section>

        {isAdmin ? (
          <section className="rounded-2xl border bg-card p-6">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserPlus size={20} />
            </span>
            <h2 className="mt-4 font-serif text-2xl font-semibold">Criar novo acesso</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie o login da funcionária ou de outra administradora. Compartilhe a senha provisória com segurança.
            </p>
            <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="staff-name">Nome</Label>
                <Input id="staff-name" name="name" placeholder="Nome da profissional" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="staff-email">E-mail</Label>
                <Input id="staff-email" name="email" type="email" placeholder="email@clinica.com.br" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="staff-password">Senha provisória</Label>
                  <Input id="staff-password" name="password" type="text" minLength={8} required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Permissão</Label>
                  <select
                    name="role"
                    defaultValue="staff"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="staff">Funcionária</option>
                    <option value="admin">Administradora</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={pending}>
                  <UserPlus /> {pending ? 'Criando…' : 'Criar acesso'}
                </Button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-primary" />
            <h2 className="font-serif text-2xl font-semibold">Equipe da clínica</h2>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {(teamQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
            ) : (
              (teamQ.data ?? []).map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
                >
                  <div>
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={m.role === 'admin' ? 'default' : 'secondary'}>
                      {m.role === 'admin' ? 'Admin' : 'Funcionária'}
                    </Badge>
                    {isAdmin && m.id !== me.data?.id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          roleMut.mutate({
                            userId: m.id,
                            role: m.role === 'admin' ? 'staff' : 'admin',
                          })
                        }
                      >
                        {m.role === 'admin' ? 'Tornar funcionária' : 'Tornar admin'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
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
