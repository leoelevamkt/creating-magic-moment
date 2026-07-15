import { createClient } from '@supabase/supabase-js'
import { defineTool, type ToolContext } from '@lovable.dev/mcp-js'
import { z } from 'zod'

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export default defineTool({
  name: 'list_upcoming_sessions',
  title: 'Próximas sessões',
  description:
    'Lista as próximas sessões planejadas (a partir de hoje), com paciente, data, horário e modalidade. Respeita RLS.',
  inputSchema: {
    days: z.number().int().min(1).max(60).default(14).describe('Janela em dias a partir de hoje.'),
    limit: z.number().int().min(1).max(100).default(50),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: 'text', text: 'Não autenticado' }], isError: true }
    }
    const today = new Date().toISOString().slice(0, 10)
    const until = new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10)
    const { data, error } = await supabaseForUser(ctx)
      .from('sessions_plan')
      .select(
        'id, patient_id, title, session_date, start_time, end_time, modality, status, meet_url, patients(name)',
      )
      .gte('session_date', today)
      .lte('session_date', until)
      .order('session_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(limit)
    if (error) return { content: [{ type: 'text', text: error.message }], isError: true }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      structuredContent: { sessions: data ?? [] },
    }
  },
})
