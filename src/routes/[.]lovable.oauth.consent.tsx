import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldCheck } from 'lucide-react'

// Beta auth.oauth namespace — declare a local typed wrapper for the 3 methods.
type OAuthAuthorizationDetails = {
  redirect_url?: string
  redirect_to?: string
  client?: { name?: string; redirect_uri?: string; scope?: string }
  scopes?: string[]
}
type OAuthReply = { data: OAuthAuthorizationDetails | null; error: { message: string } | null }
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthReply>
  approveAuthorization: (id: string) => Promise<OAuthReply>
  denyAuthorization: (id: string) => Promise<OAuthReply>
}
function oauth(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth
}

export const Route = createFileRoute('/.lovable/oauth/consent')({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === 'string' ? s.authorization_id : '',
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error('Missing authorization_id')
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      const next = location.pathname + location.searchStr
      throw redirect({ to: '/auth', search: { next } })
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get('authorization_id')!
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId)
    if (error) throw new Error(error.message)
    const immediate = data?.redirect_url ?? data?.redirect_to
    if (immediate && !data?.client) throw redirect({ href: immediate })
    return data
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="font-serif text-2xl font-semibold">Não foi possível carregar a autorização</h1>
      <p className="mt-3 text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
    </main>
  ),
})

function Consent() {
  const details = Route.useLoaderData()
  const { authorization_id } = Route.useSearch()
  const [busy, setBusy] = useState<'approve' | 'deny' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const clientName = details?.client?.name ?? 'este aplicativo'
  const scopes = details?.scopes ?? (details?.client?.scope ? details.client.scope.split(/\s+/) : [])

  async function decide(approve: boolean) {
    setBusy(approve ? 'approve' : 'deny')
    setError(null)
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id)
    if (error) {
      setBusy(null)
      setError(error.message)
      return
    }
    const target = data?.redirect_url ?? data?.redirect_to
    if (!target) {
      setBusy(null)
      setError('O servidor de autorização não retornou um endereço de retorno.')
      return
    }
    window.location.href = target
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-6 p-6">
      <div className="flex items-center gap-2 text-primary">
        <ShieldCheck size={22} />
        <span className="text-sm font-semibold uppercase tracking-widest">Autorização</span>
      </div>
      <h1 className="font-serif text-3xl font-semibold">
        Conectar {clientName} à sua conta NeuroFlux
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Isso permite que <strong>{clientName}</strong> use o NeuroFlux em seu nome, com as mesmas
        permissões que você já tem no aplicativo. Suas políticas de acesso continuam valendo — nada
        contorna elas.
      </p>
      {scopes.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Permissões solicitadas
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {scopes.map((s) => (
              <li key={s} className="font-mono text-xs">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-2 flex gap-3">
        <Button onClick={() => decide(true)} disabled={busy !== null} size="lg" className="flex-1">
          {busy === 'approve' && <Loader2 className="animate-spin" />} Aprovar
        </Button>
        <Button
          onClick={() => decide(false)}
          disabled={busy !== null}
          size="lg"
          variant="outline"
          className="flex-1"
        >
          {busy === 'deny' && <Loader2 className="animate-spin" />} Recusar
        </Button>
      </div>
    </main>
  )
}
