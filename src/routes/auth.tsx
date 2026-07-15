import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import logoAsset from '@/assets/neuroflux-logo.png.asset.json'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { checkLoginRateLimit, resetLoginRateLimit } from '@/lib/auth-rate-limit.functions'
import { toast } from 'sonner'

export const Route = createFileRoute('/auth')({
  head: () => ({ meta: [{ title: 'Entrar — NeuroFlux' }] }),
  component: AuthPage,
})

function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const checkLimit = useServerFn(checkLoginRateLimit)
  const resetLimit = useServerFn(resetLoginRateLimit)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: '/dashboard', replace: true })
    })
  }, [navigate])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    const normalizedEmail = email.trim().toLowerCase()

    if (mode === 'sign-in') {
      try {
        const gate = await checkLimit({ data: { email: normalizedEmail } })
        if (!gate.allowed) {
          setLoading(false)
          const mins = Math.ceil(gate.retryAfter / 60)
          toast.error(
            gate.reason === 'ip'
              ? `Muitas tentativas deste dispositivo. Aguarde ${mins} min.`
              : `Muitas tentativas para este e-mail. Aguarde ${mins} min.`,
          )
          return
        }
      } catch (err) {
        console.error('[auth] rate-limit check failed', err)
      }
    }

    const result =
      mode === 'sign-up'
        ? await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              data: { name },
              emailRedirectTo: `${window.location.origin}/dashboard`,
            },
          })
        : await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
    setLoading(false)
    if (result.error) {
      toast.error(result.error.message)
      return
    }
    if (result.data.session) {
      if (mode === 'sign-in') {
        resetLimit({ data: { email: normalizedEmail } }).catch(() => {})
      }
      navigate({ to: '/dashboard', replace: true })
    } else {
      toast.success('Verifique seu e-mail para confirmar o acesso.')
    }
  }

  const isSignUp = mode === 'sign-up'

  return (
    <main className="flex min-h-svh bg-background">
      <section className="hidden flex-1 flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <img src={logoAsset.url} alt="NeuroFlux" className="size-10 object-contain" />
          <span className="font-serif text-2xl font-semibold">NeuroFlux</span>
        </div>
        <div className="max-w-xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-primary-foreground/65">
            Gestão neuropsicológica
          </p>
          <h1 className="text-balance font-serif text-5xl font-semibold leading-tight">
            Cada avaliação no lugar certo, do planejamento à aprovação.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-primary-foreground/70">
            Organize pacientes, testes, correções e revisões administrativas em um fluxo clínico
            simples e rastreável.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-primary-foreground/65">
          <ShieldCheck size={18} /> Dados clínicos protegidos e acesso controlado
        </div>
      </section>
      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3 text-primary">
              <img src={logoAsset.url} alt="NeuroFlux" className="size-10 object-contain" />
              <span className="font-serif text-2xl font-semibold">NeuroFlux</span>
            </div>
          </div>
          <p className="mb-2 text-sm font-medium text-primary">Acesso restrito</p>
          <h2 className="text-balance font-serif text-3xl font-semibold text-foreground">
            {isSignUp ? 'Criar acesso da clínica' : 'Bem-vinda de volta'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Use seu e-mail profissional para acessar o ambiente clínico.
          </p>
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            {isSignUp && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="voce@clinica.com.br"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                minLength={8}
                required
              />
            </div>
            <Button size="lg" type="submit" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {isSignUp ? 'Criar acesso' : 'Entrar na plataforma'}
            </Button>
          </form>
          <button
            type="button"
            className="mt-6 w-full text-center text-sm font-medium text-primary hover:underline"
            onClick={() => setMode(isSignUp ? 'sign-in' : 'sign-up')}
          >
            {isSignUp ? 'Já tenho acesso' : 'Configurar primeiro acesso'}
          </button>
          <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
            Uso exclusivo de profissionais autorizadas. A utilização de testes deve respeitar o
            SATEPSI e as normas do CFP.
          </p>
        </div>
      </section>
    </main>
  )
}
