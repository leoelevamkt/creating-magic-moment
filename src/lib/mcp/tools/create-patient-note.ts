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
  name: 'create_patient_note',
  title: 'Criar nota clínica',
  description:
    'Cria uma nota no prontuário de um paciente. A nota fica associada ao usuário autenticado.',
  inputSchema: {
    patient_id: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1).max(10_000),
    pinned: z.boolean().default(false),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ patient_id, title, content, pinned }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: 'text', text: 'Não autenticado' }], isError: true }
    }
    const { data, error } = await supabaseForUser(ctx)
      .from('patient_notes')
      .insert({
        patient_id,
        title,
        content,
        pinned,
        created_by: ctx.getUserId(),
      })
      .select('id, patient_id, title, created_at')
      .single()
    if (error) return { content: [{ type: 'text', text: error.message }], isError: true }
    return {
      content: [{ type: 'text', text: `Nota criada: ${data.id}` }],
      structuredContent: { note: data },
    }
  },
})
