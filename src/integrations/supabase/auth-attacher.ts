// Client-side function middleware that attaches the current Supabase bearer
// token to every createServerFn call.
import { createMiddleware } from '@tanstack/react-start'
import { supabase } from './client'

export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return next({
      sendContext: {},
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })
  },
)
