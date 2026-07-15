import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { CalendarCheck, Clock, Pencil, ShieldCheck, Trash2, UserCog, UserPlus, Users, Video } from 'lucide-react'
import { toast } from 'sonner'
import { getMyProfile } from '@/lib/profile.functions'
import { createStaff, deleteStaff, listTeam, updateStaff } from '@/lib/staff.functions'
import { listMyWorkSessions, listTeamWorkSessions, type WorkSession } from '@/lib/work-sessions.functions'
import {
  disconnectGoogle,
  getGoogleConnectionStatus,
  saveGoogleConnection,
  startGoogleConnect,
} from '@/lib/googleCalendar.functions'
import { connectAppUser } from '@/integrations/lovable/appUserConnectorClient'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'


export const Route = createFileRoute('/_authenticated/settings')({
  head: () => ({ meta: [{ title: 'Configurações — NeuroFlux' }] }),
  component: SettingsPage,
})

function SettingsPage() {
  const profile = useServerFn(getMyProfile)
  const team = useServerFn(listTeam)
  const create = useServerFn(createStaff)
  const qc = useQueryClient()

  const me = useQuery({ queryKey: ['profile'], queryFn: () => profile() })
  const teamQ = useQuery({ queryKey: ['team'], queryFn: () => team() })
  const isAdmin = me.data?.role === 'admin'

  const [pending, setPending] = useState(false)
  const createMut = useMutation({
    mutationFn: (v: { name: string; email: string; password: string; role: 'admin' | 'staff' }) =>
      create({ data: v }),
    onSuccess: () => {
      toast.success('Acesso criado.')
      qc.invalidateQueries({ queryKey: ['team'] })
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setPending(false),
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

        <WorkSessionsSection isAdmin={isAdmin} />



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

        <GoogleCalendarSection />

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
                    {isAdmin ? (
                      <EditStaffDialog
                        member={m}
                        isSelf={m.id === me.data?.id}
                        onDone={() => qc.invalidateQueries({ queryKey: ['team'] })}
                      />
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

function GoogleCalendarSection() {
  const start = useServerFn(startGoogleConnect)
  const save = useServerFn(saveGoogleConnection)
  const status = useServerFn(getGoogleConnectionStatus)
  const disc = useServerFn(disconnectGoogle)
  const qc = useQueryClient()

  const q = useQuery({ queryKey: ['google-status'], queryFn: () => status() })
  const [busy, setBusy] = useState(false)

  const connectMut = useMutation({
    mutationFn: async () => {
      const result = await connectAppUser({
        connectorId: 'google_calendar',
        gatewayBaseUrl: 'https://connector-gateway.lovable.dev',
        start: (targetOrigin) => start({ data: targetOrigin }),
      })
      if (!result.success) throw new Error(result.error ?? 'Falha ao conectar')
      if (!result.connectionAPIKey) throw new Error('Consentimento sem chave (offline access desativado no cliente).')
      await save({ data: { connectionAPIKey: result.connectionAPIKey } })
    },
    onSuccess: () => {
      toast.success('Google Calendar conectado.')
      qc.invalidateQueries({ queryKey: ['google-status'] })
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusy(false),
  })

  const discMut = useMutation({
    mutationFn: () => disc(),
    onSuccess: () => {
      toast.success('Desconectado.')
      qc.invalidateQueries({ queryKey: ['google-status'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <section className="rounded-2xl border bg-card p-6">
      <span className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
        <CalendarCheck size={20} />
      </span>
      <h2 className="mt-4 font-serif text-2xl font-semibold">Google Calendar &amp; Meet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Conecte sua conta Google para agendar sessões diretamente no seu calendário e gerar link do Meet automaticamente.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {q.data?.connected ? (
          <>
            <div className="flex items-center gap-2 rounded-lg border bg-background p-3 text-sm">
              <Video size={16} className="text-primary" />
              <span className="font-medium">Conectado</span>
              {q.data.email ? <span className="text-muted-foreground">· {q.data.email}</span> : null}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => discMut.mutate()} disabled={discMut.isPending}>
                Desconectar
              </Button>
            </div>
          </>
        ) : (
          <Button
            onClick={() => {
              setBusy(true)
              connectMut.mutate()
            }}
            disabled={busy || connectMut.isPending}
          >
            <CalendarCheck /> {busy ? 'Abrindo…' : 'Conectar Google Calendar'}
          </Button>
        )}
      </div>
    </section>
  )
}

function EditStaffDialog({
  member,
  isSelf,
  onDone,
}: {
  member: { id: string; name: string; email: string; role: 'admin' | 'staff' }
  isSelf: boolean
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const update = useServerFn(updateStaff)
  const del = useServerFn(deleteStaff)
  const qc = useQueryClient()

  const updateMut = useMutation({
    mutationFn: (v: { name: string; email: string; password: string; role: 'admin' | 'staff' }) =>
      update({
        data: {
          userId: member.id,
          name: v.name,
          email: v.email,
          password: v.password || undefined,
          role: v.role,
        },
      }),
    onSuccess: () => {
      toast.success('Perfil atualizado.')
      setOpen(false)
      onDone()
      if (isSelf) qc.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: () => del({ data: { userId: member.id } }),
    onSuccess: () => {
      toast.success('Acesso removido.')
      setOpen(false)
      onDone()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    updateMut.mutate({
      name: String(fd.get('name') ?? '').trim(),
      email: String(fd.get('email') ?? '').trim(),
      password: String(fd.get('password') ?? ''),
      role: (String(fd.get('role') ?? member.role) as 'admin' | 'staff'),
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Pencil /> Editar
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Editar acesso</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit-name-${member.id}`}>Nome</Label>
            <Input id={`edit-name-${member.id}`} name="name" defaultValue={member.name} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit-email-${member.id}`}>E-mail</Label>
            <Input id={`edit-email-${member.id}`} name="email" type="email" defaultValue={member.email} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit-password-${member.id}`}>Nova senha</Label>
            <Input
              id={`edit-password-${member.id}`}
              name="password"
              type="text"
              minLength={8}
              placeholder="Deixe em branco para manter"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Permissão</Label>
            <select
              name="role"
              defaultValue={member.role}
              disabled={isSelf}
              className="h-10 rounded-md border bg-background px-3 text-sm disabled:opacity-60"
            >
              <option value="staff">Funcionária</option>
              <option value="admin">Administradora</option>
            </select>
            {isSelf ? (
              <p className="text-xs text-muted-foreground">Você não pode alterar sua própria permissão.</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            {isSelf ? (
              <div />
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  if (confirm(`Remover o acesso de ${member.name}? Esta ação não pode ser desfeita.`)) {
                    deleteMut.mutate()
                  }
                }}
                disabled={deleteMut.isPending}
              >
                <Trash2 /> {deleteMut.isPending ? 'Removendo…' : 'Excluir acesso'}
              </Button>
            )}
            <Button type="submit" disabled={updateMut.isPending}>
              {updateMut.isPending ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function fmtHours(ms: number) {
  const total = Math.max(0, Math.floor(ms / 60_000))
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

function sessionDurationMs(s: WorkSession) {
  const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now()
  return end - new Date(s.started_at).getTime()
}

function WorkSessionsSection({ isAdmin }: { isAdmin: boolean }) {
  const mine = useServerFn(listMyWorkSessions)
  const team = useServerFn(listTeamWorkSessions)
  const meQ = useQuery({
    queryKey: ['work-session', 'mine', 31],
    queryFn: () => mine({ data: { days: 31 } }),
    enabled: !isAdmin,
  })
  const teamQ = useQuery({
    queryKey: ['work-session', 'team', 31],
    queryFn: () => team({ data: { days: 31 } }),
    enabled: isAdmin,
  })
  const teamNames = useServerFn(listTeam)
  const teamMembers = useQuery({ queryKey: ['team'], queryFn: () => teamNames(), enabled: isAdmin })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - 6)
  const monthStart = new Date(today)
  monthStart.setDate(today.getDate() - 29)

  function totals(rows: WorkSession[]) {
    let d = 0, w = 0, m = 0
    for (const s of rows) {
      const started = new Date(s.started_at)
      const dur = sessionDurationMs(s)
      if (started >= monthStart) m += dur
      if (started >= weekStart) w += dur
      if (started >= today) d += dur
    }
    return { d, w, m }
  }

  if (isAdmin) {
    const byUser = new Map<string, WorkSession[]>()
    ;(teamQ.data ?? []).forEach((s) => {
      const arr = byUser.get(s.user_id) ?? []
      arr.push(s)
      byUser.set(s.user_id, arr)
    })
    return (
      <section className="rounded-2xl border bg-card p-6">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Clock size={20} />
        </span>
        <h2 className="mt-4 font-serif text-2xl font-semibold">Ponto da equipe</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe os turnos registrados pelas funcionárias com totais do dia, semana e mês.
        </p>
        <div className="mt-4 space-y-4">
          {(teamMembers.data ?? []).filter((m) => m.role !== 'admin').length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma funcionária cadastrada.</p>
          ) : (
            (teamMembers.data ?? [])
              .filter((m) => m.role !== 'admin')
              .map((m) => {
                const rows = byUser.get(m.id) ?? []
                const t = totals(rows)
                return (
                  <div key={m.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-md border bg-background px-3 py-1.5">
                          <p className="text-muted-foreground">Hoje</p>
                          <p className="font-mono text-sm font-semibold tabular-nums">{fmtHours(t.d)}</p>
                        </div>
                        <div className="rounded-md border bg-background px-3 py-1.5">
                          <p className="text-muted-foreground">Semana</p>
                          <p className="font-mono text-sm font-semibold tabular-nums">{fmtHours(t.w)}</p>
                        </div>
                        <div className="rounded-md border bg-background px-3 py-1.5">
                          <p className="text-muted-foreground">Mês</p>
                          <p className="font-mono text-sm font-semibold tabular-nums">{fmtHours(t.m)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 max-h-48 space-y-1 overflow-auto text-sm">
                      {rows.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sem registros nos últimos 30 dias.</p>
                      ) : (
                        rows.map((s) => (
                          <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                            <span className="text-xs">
                              {new Date(s.started_at).toLocaleString('pt-BR', {
                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                              })}
                              {' → '}
                              {s.ended_at
                                ? new Date(s.ended_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                : 'em aberto'}
                            </span>
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                              {fmtHours(sessionDurationMs(s))}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })
          )}
        </div>
      </section>
    )
  }

  const sessions = meQ.data ?? []
  const t = totals(sessions)

  return (
    <section className="rounded-2xl border bg-card p-6">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Clock size={20} />
      </span>
      <h2 className="mt-4 font-serif text-2xl font-semibold">Meu ponto</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Use o botão no topo da tela para iniciar e encerrar seu turno. O tempo é somado abaixo.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-background p-4">
          <p className="text-xs text-muted-foreground">Hoje</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{fmtHours(t.d)}</p>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <p className="text-xs text-muted-foreground">Semana</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{fmtHours(t.w)}</p>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <p className="text-xs text-muted-foreground">Mês</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{fmtHours(t.m)}</p>
        </div>
      </div>

      <h3 className="mt-6 text-sm font-semibold">Histórico (30 dias)</h3>
      <div className="mt-2 max-h-60 space-y-1 overflow-auto text-sm">
        {sessions.length === 0 ? (
          <p className="text-muted-foreground">Nenhum registro ainda.</p>
        ) : (
          sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <span>
                {new Date(s.started_at).toLocaleString('pt-BR', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                })}
                {' → '}
                {s.ended_at
                  ? new Date(s.ended_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : 'em aberto'}
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {fmtHours(sessionDurationMs(s))}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}


