import { createMiddleware } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'

const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: data:",
  "connect-src 'self' https://*.supabase.co https://*.lovable.dev https://*.lovable.app https://ai.gateway.lovable.dev https://connector-gateway.lovable.dev wss://*.supabase.co",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

/**
 * Global request middleware — sets baseline security headers on every SSR
 * response. Assets served by Vite/CDN are untouched.
 */
export const securityHeaders = createMiddleware().server(async ({ next }) => {
  const result = await next()
  try {
    setResponseHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    setResponseHeader('X-Content-Type-Options', 'nosniff')
    setResponseHeader('X-Frame-Options', 'DENY')
    setResponseHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    setResponseHeader(
      'Permissions-Policy',
      'camera=(self), microphone=(self), geolocation=(), payment=()',
    )
    setResponseHeader('Content-Security-Policy', CSP)
  } catch {
    // outside a request context (build-time prerender edges); safe to ignore
  }
  return result
})
