import { createStart } from '@tanstack/react-start'
import { attachSupabaseAuth } from '@/integrations/supabase/auth-attacher'
import { securityHeaders } from '@/lib/security-headers.middleware'

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders],
  functionMiddleware: [attachSupabaseAuth],
}))
