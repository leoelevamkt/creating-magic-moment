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
  name: 'list_patients',
  title: 'Listar pacientes',
  description:
    'Lista pacientes do NeuroFlux visíveis para o usuário autenticado. Aceita busca por nome/CPF e filtro por status. Respeita RLS.',
  inputSchema: {
    search: z.string().trim().optional().describe('Busca parcial por nome ou CPF.'),
    status: z
      .enum(['ativo', 'em_avaliacao', 'inativo', 'concluido'])
      .optional()
      .describe('Filtrar por status do paciente.'),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: 'text', text: 'Não autenticado' }], isError: true }
    }
    let q = supabaseForUser(ctx)
      .from('patients')
      .select('id, name, birth_date, cpf, city, status, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (status) q = q.eq('status', status)
    if (search) q = q.or(`name.ilike.%${search}%,cpf.ilike.%${search}%`)
    const { data, error } = await q
    if (error) return { content: [{ type: 'text', text: error.message }], isError: true }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      structuredContent: { patients: data ?? [] },
    }
  },
})
