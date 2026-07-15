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
  name: 'get_patient',
  title: 'Detalhes do paciente',
  description:
    'Retorna o cadastro completo de um paciente pelo id: dados demográficos, hipóteses, medicações, responsáveis e síntese geral. Respeita RLS.',
  inputSchema: {
    id: z.string().uuid().describe('UUID do paciente.'),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: 'text', text: 'Não autenticado' }], isError: true }
    }
    const { data, error } = await supabaseForUser(ctx)
      .from('patients')
      .select(
        'id, name, birth_date, sex, cpf, phone, city, schooling, status, hypotheses, medications, notes, has_guardians, guardians, emergency_contact, professionals, overall_synthesis, created_at, updated_at',
      )
      .eq('id', id)
      .maybeSingle()
    if (error) return { content: [{ type: 'text', text: error.message }], isError: true }
    if (!data) return { content: [{ type: 'text', text: 'Paciente não encontrado.' }], isError: true }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      structuredContent: { patient: data },
    }
  },
})
