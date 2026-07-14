import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Lora } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const lora = Lora({ subsets: ['latin'], variable: '--font-lora' })

export const metadata: Metadata = {
  title: { default: 'NeuroFlux | Gestão neuropsicológica', template: '%s | NeuroFlux' },
  description: 'Gestão segura de pacientes, avaliações neuropsicológicas, correções e aprovações clínicas.',
  generator: 'v0.app',
}

export const viewport: Viewport = { colorScheme: 'light', themeColor: '#214d48', userScalable: true }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className="bg-background"><body className={`${geist.variable} ${lora.variable} antialiased`}>{children}<Toaster position="top-center" richColors />{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
