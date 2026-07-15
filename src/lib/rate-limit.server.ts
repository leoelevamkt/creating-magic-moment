import { getRequestIP, getRequestHeader } from '@tanstack/react-start/server'

export type RateLimitConfig = {
  action: string
  max: number
  windowSeconds: number
  blockSeconds?: number
}

export type RateLimitResult = {
  allowed: boolean
  retryAfter: number
  currentCount: number
}

export function getClientKey(fallback = 'unknown'): string {
  try {
    const ip = getRequestIP({ xForwardedFor: true })
    if (ip) return `ip:${ip}`
  } catch {
    // no request context
  }
  try {
    const fwd = getRequestHeader('x-forwarded-for')
    if (fwd) return `ip:${fwd.split(',')[0].trim()}`
  } catch {
    // ignore
  }
  return `ip:${fallback}`
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  increment = 1,
): Promise<RateLimitResult> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
    _key: key,
    _action: config.action,
    _max: config.max,
    _window_seconds: config.windowSeconds,
    _block_seconds: config.blockSeconds ?? 0,
    _increment: increment,
  })
  if (error) {
    console.error('[rate-limit] rpc error', error)
    // fail-open to avoid taking the app down on infra glitches
    return { allowed: true, retryAfter: 0, currentCount: 0 }
  }
  const row = Array.isArray(data) ? data[0] : data
  return {
    allowed: row?.allowed ?? true,
    retryAfter: row?.retry_after ?? 0,
    currentCount: row?.current_count ?? 0,
  }
}

export async function resetRateLimit(key: string, action: string): Promise<void> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  await supabaseAdmin.rpc('reset_rate_limit', { _key: key, _action: action })
}

export class RateLimitError extends Error {
  status = 429
  retryAfter: number
  constructor(retryAfter: number, action: string) {
    super(
      `Muitas tentativas (${action}). Aguarde ${Math.ceil(retryAfter / 60)} min e tente novamente.`,
    )
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

/**
 * Enforce a rate limit. Throws RateLimitError (HTTP 429) when blocked.
 * `keyOverride` lets you pin to a user id or email; otherwise falls back to IP.
 */
export async function enforceRateLimit(
  config: RateLimitConfig,
  keyOverride?: string,
  increment = 1,
): Promise<void> {
  const key = keyOverride ?? getClientKey()
  const result = await checkRateLimit(key, config, increment)
  if (!result.allowed) throw new RateLimitError(result.retryAfter, config.action)
}

export const RATE_LIMITS = {
  loginIp: { action: 'login_ip', max: 10, windowSeconds: 900, blockSeconds: 1800 },
  loginEmail: { action: 'login_email', max: 5, windowSeconds: 900, blockSeconds: 1800 },
  aiSynthesis: { action: 'ai_synthesis', max: 30, windowSeconds: 3600, blockSeconds: 900 },
  aiReport: { action: 'ai_report', max: 20, windowSeconds: 3600, blockSeconds: 900 },
  aiTranscribe: { action: 'ai_transcribe', max: 3600, windowSeconds: 86400 },
  genericWrite: { action: 'generic_write', max: 300, windowSeconds: 60, blockSeconds: 300 },
} as const satisfies Record<string, RateLimitConfig>
