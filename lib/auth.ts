import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.V0_RUNTIME_URL),
  emailAndPassword: { enabled: true, autoSignIn: true },
  trustedOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // Cobre qualquer domínio de deploy da Vercel e dos previews do v0,
    // garantindo login a partir de qualquer dispositivo/URL.
    'https://*.vercel.app',
    'https://*.v0.dev',
    'https://*.v0.build',
    'https://*.vusercontent.net',
    ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`] : []),
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ],
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  advanced: {
    // Confia no proxy da Vercel/v0 para inferir o host correto da requisição,
    // permitindo login a partir de qualquer domínio de deploy.
    trustedProxyHeaders: true,
    // No preview do v0 o app roda dentro de um iframe (contexto cross-site),
    // por isso os cookies precisam de SameSite=None + Secure em desenvolvimento.
    ...(process.env.NODE_ENV === 'development'
      ? { defaultCookieAttributes: { sameSite: 'none' as const, secure: true } }
      : {}),
  },
})
