import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  BarChart3,
  Boxes,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Library,
  ListTodo,
  LogOut,
  MessagesSquare,
  PanelLeft,
  Settings,
  Users,
} from 'lucide-react'
import logoAsset from '@/assets/neuroflux-logo.png.asset.json'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useQueryClient } from '@tanstack/react-query'
import { TimeClock } from '@/components/time-clock'

const adminNav = [
  { to: '/dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/kanban', label: 'Quadro clínico', icon: ClipboardList },
  { to: '/patients', label: 'Pacientes', icon: Users },
  { to: '/tasks', label: 'Tarefas', icon: ListTodo },
  { to: '/formularios', label: 'Formulários', icon: FileText },
  { to: '/supervision', label: 'Supervisão', icon: MessagesSquare },
  { to: '/materials', label: 'Materiais', icon: Boxes },
  { to: '/catalog', label: 'Catálogo de testes', icon: Library },
  { to: '/reports', label: 'Relatórios', icon: BarChart3 },
] as const

const staffNav = [
  { to: '/kanban', label: 'Correções', icon: ClipboardList },
  { to: '/patients', label: 'Pacientes', icon: Users },
  { to: '/tasks', label: 'Tarefas', icon: ListTodo },
  { to: '/formularios', label: 'Formulários', icon: FileText },
  { to: '/supervision', label: 'Supervisão', icon: MessagesSquare },
  { to: '/materials', label: 'Materiais', icon: Boxes },
  { to: '/settings', label: 'Configurações', icon: Settings },
] as const


function Sidebar({ role }: { role: string }) {
  const pathname = useLocation({ select: (l) => l.pathname })
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-6">
        <img src={logoAsset.url} alt="NeuroFlux" className="size-10 object-contain" />
        <div>
          <p className="font-serif text-xl font-semibold">NeuroFlux</p>
          <p className="text-xs text-sidebar-foreground/55">Gestão clínica</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {(role === 'admin' ? adminNav : staffNav).map((item) => {
          const Icon = item.icon
          const active = pathname === item.to || pathname.startsWith(item.to + '/')
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground'
              }`}
            >
              <Icon size={19} />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/65 hover:bg-sidebar-accent"
        >
          <Settings size={19} />
          Configurações
        </Link>
        <div className="mt-3 rounded-xl bg-sidebar-accent/55 p-3">
          <p className="text-xs text-sidebar-foreground/55">Perfil atual</p>
          <p className="mt-1 text-sm font-medium">
            {role === 'admin' ? 'Administradora' : 'Funcionária'}
          </p>
        </div>
      </div>
    </div>
  )
}

export function AppShell({
  children,
  userName,
  role,
}: {
  children: React.ReactNode
  userName: string
  role: string
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  async function logout() {
    await queryClient.cancelQueries()
    queryClient.clear()
    await supabase.auth.signOut()
    toast.success('Sessão encerrada.')
    navigate({ to: '/auth', replace: true })
  }

  return (
    <div className="min-h-svh bg-background lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="hidden h-svh lg:sticky lg:top-0 lg:block">
        <Sidebar role={role} />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger render={<Button variant="outline" size="icon" className="lg:hidden" />}>
                <PanelLeft />
                <span className="sr-only">Abrir menu</span>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
                <SheetTitle className="sr-only">Menu principal</SheetTitle>
                <Sidebar role={role} />
              </SheetContent>
            </Sheet>
          </div>
          <div className="flex items-center gap-3">
            <TimeClock />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground">
                {role === 'admin' ? 'Admin' : 'Funcionária'}
              </p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {userName.slice(0, 2).toUpperCase()}
            </span>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut />
              <span className="sr-only">Sair</span>
            </Button>
          </div>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
