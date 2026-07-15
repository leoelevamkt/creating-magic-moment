import type { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { DefaultCatchBoundary } from '@/components/default-catch-boundary'
import { NotFound } from '@/components/not-found'
import styles from '@/styles.css?url'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'NeuroFlux — Gestão neuropsicológica' },
      {
        name: 'description',
        content:
          'Gestão segura de pacientes, avaliações neuropsicológicas, correções e aprovações clínicas.',
      },
      { name: 'theme-color', content: '#214d48' },
      { property: 'og:title', content: 'NeuroFlux — Gestão neuropsicológica' },
      {
        property: 'og:description',
        content:
          'Organize pacientes, testes, correções e revisões administrativas em um fluxo clínico simples.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { title: "Lovable App" },
      { property: "og:title", content: "Lovable App" },
      { name: "twitter:title", content: "Lovable App" },
      { name: "description", content: "Vamos Criar Juntos is a project creation tool." },
      { property: "og:description", content: "Vamos Criar Juntos is a project creation tool." },
      { name: "twitter:description", content: "Vamos Criar Juntos is a project creation tool." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2faee8a3-43b8-4942-932a-28920a234bd7/id-preview-2fcf56a8--aff4f85b-f80b-469b-b803-cd0a9a44cc00.lovable.app-1784075059637.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2faee8a3-43b8-4942-932a-28920a234bd7/id-preview-2fcf56a8--aff4f85b-f80b-469b-b803-cd0a9a44cc00.lovable.app-1784075059637.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: 'stylesheet', href: styles },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300..900&family=Lora:wght@400;500;600;700&display=swap',
      },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        router.invalidate()
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [router])
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster position="top-center" richColors />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}
