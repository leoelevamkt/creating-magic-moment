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
  name: 'list_my_tasks',
  title: 'Minhas tarefas',
  description:
    'Lista as tarefas do kanban atribuídas ao usuário autenticado, opcionalmente filtradas por status.',
  inputSchema: {
    status: z
      .enum(['todo', 'doing', 'review', 'correcting', 'done'])
      .optional()
      .describe('Coluna do kanban.'),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: 'text', text: 'Não autenticado' }], isError: true }
    }
    let q = supabaseForUser(ctx)
      .from('tasks')
      .select('id, title, description, status, due_date, color, updated_at, created_at')
      .eq('assigned_to', ctx.getUserId())
      .order('updated_at', { ascending: false })
      .limit(limit)
    if (status) q = q.eq('status', status)
    const { data, error } = await q
    if (error) return { content: [{ type: 'text', text: error.message }], isError: true }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      structuredContent: { tasks: data ?? [] },
    }
  },
})
