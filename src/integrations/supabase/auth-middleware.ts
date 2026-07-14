// Server middleware that validates the bearer token from the incoming
// createServerFn request and injects an authenticated Supabase client into
// context.
import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

function makeClient(token: string): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!
  const isNewKey = key.startsWith('sb_publishable_') || key.startsWith('sb_secret_')
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers)
        headers.set('Authorization', `Bearer ${token}`)
        headers.set('apikey', key)
        if (isNewKey && headers.get('Authorization') === `Bearer ${key}`) {
          headers.set('Authorization', `Bearer ${token}`)
        }
        return fetch(input, { ...init, headers })
      },
    },
  })
}

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const authHeader = getRequestHeader('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Response('Unauthorized', { status: 401 })
    }
    const token = authHeader.slice('Bearer '.length)
    const supabase = makeClient(token)
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) throw new Response('Unauthorized', { status: 401 })
    return next({
      context: { supabase, userId: data.user.id, user: data.user },
    })
  },
)
