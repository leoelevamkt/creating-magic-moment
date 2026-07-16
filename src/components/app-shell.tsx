import { useState } from 'react'
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
  Menu,
  MoreHorizontal,
  Settings,
  Users,
  Wallet,
} from 'lucide-react'
import logoAsset from '@/assets/neuroflux-logo.png.asset.json'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useQueryClient } from '@tanstack/react-query'
import { TimeClock } from '@/components/time-clock'
import { ThemeToggle } from '@/components/theme-toggle'

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
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
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

// Bottom nav shows the 4 most-used sections + "Mais" opening the sheet
const adminBottom = [
  { to: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/kanban', label: 'Kanban', icon: ClipboardList },
  { to: '/patients', label: 'Pacientes', icon: Users },
] as const

const staffBottom = [
  { to: '/kanban', label: 'Correções', icon: ClipboardList },
  { to: '/patients', label: 'Pacientes', icon: Users },
  { to: '/tasks', label: 'Tarefas', icon: ListTodo },
  { to: '/formularios', label: 'Forms', icon: FileText },
] as const


function Sidebar({ role, onNavigate }: { role: string; onNavigate?: () => void }) {
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
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
        {(role === 'admin' ? adminNav : staffNav).map((item) => {
          const Icon = item.icon
          const active = pathname === item.to || pathname.startsWith(item.to + '/')
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground'
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <Link
          to="/settings"
          onClick={onNavigate}
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent"
        >
          <Settings size={20} />
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

function BottomNav({ role, onMoreClick }: { role: string; onMoreClick: () => void }) {
  const pathname = useLocation({ select: (l) => l.pathname })
  const items = role === 'admin' ? adminBottom : staffBottom
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon
          const active = pathname === item.to || pathname.startsWith(item.to + '/')
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={20} aria-hidden />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          )
        })}
        <li>
          <button
            type="button"
            onClick={onMoreClick}
            className="flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <MoreHorizontal size={20} aria-hidden />
            <span>Mais</span>
          </button>
        </li>
      </ul>
    </nav>
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
  const [sheetOpen, setSheetOpen] = useState(false)

  async function logout() {
    await queryClient.cancelQueries()
    queryClient.clear()
    await supabase.auth.signOut()
    toast.success('Sessão encerrada.')
    navigate({ to: '/auth', search: {}, replace: true })
  }

  return (
    <div className="min-h-svh bg-background lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="hidden h-svh lg:sticky lg:top-0 lg:block">
        <Sidebar role={role} />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b bg-background/95 px-3 backdrop-blur md:h-20 md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 lg:hidden"
                    aria-label="Abrir menu"
                  />
                }
              >
                <Menu />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0" showCloseButton={false}>
                <SheetTitle className="sr-only">Menu principal</SheetTitle>
                <Sidebar role={role} onNavigate={() => setSheetOpen(false)} />
              </SheetContent>
            </Sheet>
            <img
              src={logoAsset.url}
              alt="NeuroFlux"
              className="size-8 shrink-0 object-contain lg:hidden"
            />
            <span className="truncate font-serif text-lg font-semibold lg:hidden">
              NeuroFlux
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {role !== 'admin' && <TimeClock />}
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground">
                {role === 'admin' ? 'Admin' : 'Funcionária'}
              </p>
            </div>
            <span
              className="hidden size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground sm:flex"
              aria-hidden
            >
              {userName.slice(0, 2).toUpperCase()}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              onClick={logout}
              aria-label="Sair"
            >
              <LogOut />
            </Button>
          </div>
        </header>
        <main className="p-4 pb-24 md:p-8 lg:pb-8">{children}</main>
      </div>
      <BottomNav role={role} onMoreClick={() => setSheetOpen(true)} />
    </div>
  )
}
