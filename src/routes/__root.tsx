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
          'NeuroFlux organiza pacientes, avaliações neuropsicológicas, correções e laudos em um fluxo clínico seguro.',
      },
      {
        name: 'keywords',
        content:
          'neuropsicologia, avaliação neuropsicológica, laudo neuropsicológico, gestão clínica, prontuário, psicologia',
      },
      { name: 'author', content: 'NeuroFlux' },
      { name: 'robots', content: 'index, follow' },
      { name: 'theme-color', content: '#b3907a' },
      { property: 'og:site_name', content: 'NeuroFlux' },
      { property: 'og:title', content: 'NeuroFlux — Gestão neuropsicológica' },
      {
        property: 'og:description',
        content:
          'Organize pacientes, testes, correções e laudos neuropsicológicos com segurança e clareza.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'pt_BR' },
      { property: 'og:url', content: 'https://neuroflux0.lovable.app' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'NeuroFlux — Gestão neuropsicológica' },
      {
        name: 'twitter:description',
        content:
          'Plataforma clínica para avaliações neuropsicológicas, correções e laudos.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: styles },
      { rel: 'icon', type: 'image/png', href: '/favicon.png' },
      { rel: 'apple-touch-icon', href: '/favicon.png' },
      { rel: 'canonical', href: 'https://neuroflux0.lovable.app' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300..900&family=Lora:wght@400;500;600;700&display=swap',
      },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'NeuroFlux',
          url: 'https://neuroflux0.lovable.app',
          description:
            'Plataforma de gestão neuropsicológica para pacientes, avaliações, correções e laudos.',
          inLanguage: 'pt-BR',
        }),
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
