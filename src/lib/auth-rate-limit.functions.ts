import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  RATE_LIMITS,
  checkRateLimit,
  getClientKey,
  resetRateLimit,
} from './rate-limit.server'

const Input = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
})

/**
 * Called BEFORE supabase.auth.signInWithPassword on /auth.
 * Returns { allowed, retryAfter }. Never throws on rate-limit; the UI decides.
 * Enforces two keys: IP (defeats bruteforce from a single origin) + email
 * (defeats attacker rotating IPs against one account).
 */
export const checkLoginRateLimit = createServerFn({ method: 'POST' })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const ipKey = getClientKey()
    const emailKey = `email:${data.email}`
    const [ipResult, emailResult] = await Promise.all([
      checkRateLimit(ipKey, RATE_LIMITS.loginIp),
      checkRateLimit(emailKey, RATE_LIMITS.loginEmail),
    ])
    if (!ipResult.allowed) {
      return { allowed: false, retryAfter: ipResult.retryAfter, reason: 'ip' as const }
    }
    if (!emailResult.allowed) {
      return {
        allowed: false,
        retryAfter: emailResult.retryAfter,
        reason: 'email' as const,
      }
    }
    return { allowed: true, retryAfter: 0, reason: null as const }
  })

/** Reset counter for an email after a successful sign-in. */
export const resetLoginRateLimit = createServerFn({ method: 'POST' })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    await resetRateLimit(`email:${data.email}`, RATE_LIMITS.loginEmail.action)
    return { ok: true }
  })
