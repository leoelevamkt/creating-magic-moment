'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BrainCircuit, CalendarDays, ClipboardList, LayoutDashboard, Library, LogOut, PanelLeft, Search, Settings, Users } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const nav = [
  { href: '/', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/kanban', label: 'Quadro clínico', icon: ClipboardList },
  { href: '/patients', label: 'Pacientes', icon: Users },
  { href: '/catalog', label: 'Catálogo de testes', icon: Library },
]

function Sidebar({ role }: { role: string }) {
  const pathname = usePathname()
  return <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
    <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-6"><span className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><BrainCircuit size={22} /></span><div><p className="font-serif text-xl font-semibold">NeuroFlux</p><p className="text-xs text-sidebar-foreground/55">Gestão clínica</p></div></div>
    <nav className="flex flex-1 flex-col gap-1 p-4" aria-label="Navegação principal">
      {nav.map((item) => { const Icon = item.icon; const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)); return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground'}`}><Icon size={19} />{item.label}</Link> })}
    </nav>
    <div className="border-t border-sidebar-border p-4"><Link href="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/65 hover:bg-sidebar-accent"><Settings size={19} />Configurações</Link><div className="mt-3 rounded-xl bg-sidebar-accent/55 p-3"><p className="text-xs text-sidebar-foreground/55">Perfil atual</p><p className="mt-1 text-sm font-medium">{role === 'admin' ? 'Administradora' : 'Funcionária'}</p></div></div>
  </div>
}

export function AppShell({ children, userName, role }: { children: React.ReactNode; userName: string; role: string }) {
  const router = useRouter()
  async function logout() { await authClient.signOut(); router.push('/sign-in'); router.refresh() }
  return <div className="min-h-svh bg-background lg:grid lg:grid-cols-[256px_1fr]">
    <aside className="hidden h-svh lg:sticky lg:top-0 lg:block"><Sidebar role={role} /></aside>
    <div className="min-w-0">
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-8">
        <div className="flex items-center gap-3"><Sheet><SheetTrigger render={<Button variant="outline" size="icon" className="lg:hidden" />}><PanelLeft /><span className="sr-only">Abrir menu</span></SheetTrigger><SheetContent side="left" className="w-64 p-0" showCloseButton={false}><SheetTitle className="sr-only">Menu principal</SheetTitle><Sidebar role={role} /></SheetContent></Sheet><form action="/patients" className="relative hidden w-80 md:block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" className="pl-9" placeholder="Buscar paciente ou CPF" /></form></div>
        <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-medium text-foreground">{userName}</p><p className="text-xs text-muted-foreground">{role === 'admin' ? 'Admin' : 'Funcionária'}</p></div><span className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{userName.slice(0, 2).toUpperCase()}</span><Button variant="ghost" size="icon" onClick={logout}><LogOut /><span className="sr-only">Sair</span></Button></div>
      </header>
      <main className="p-4 md:p-8">{children}</main>
    </div>
  </div>
}
