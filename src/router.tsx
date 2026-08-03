import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { DefaultCatchBoundary } from './components/default-catch-boundary'
import { NotFound } from './components/not-found'

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  try {
    const msg = (error as any)?.message ?? (error as any)?.error?.message
    if (typeof msg === 'string' && msg) return msg
  } catch { /* ignore */ }
  return 'Erro inesperado'
}

/** Show a toast for any runtime/data error (client-side only). */
export function notifyError(error: unknown, title = 'Ocorreu um erro') {
  if (typeof window === 'undefined') return
  toast.error(title, { description: errorMessage(error) })
}

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
    queryCache: new QueryCache({
      onError: (error) => notifyError(error, 'Não foi possível carregar os dados'),
    }),
    mutationCache: new MutationCache({
      onError: (error) => notifyError(error, 'Não foi possível salvar'),
    }),
  })
  return createTanStackRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: NotFound,
    scrollRestoration: true,
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
