import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { RATE_LIMITS, enforceRateLimit } from '@/lib/rate-limit.server'

const CriterionSchema = z.object({
  code: z.string(),
  label: z.string(),
  present: z.boolean(),
  notes: z.string().optional().nullable(),
  value: z.union([z.string(), z.number()]).optional().nullable(),
})

const SaveInput = z.object({
  id: z.string().uuid().optional(),
  patientId: z.string().uuid(),
  instrument: z.string().min(1),
  domain: z.string().nullable().optional(),
  criteria: z.array(CriterionSchema),
  notes: z.string().nullable().optional(),
})

export const listScreenings = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { patientId: string }) => i)
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from('screenings')
      .select('*')
      .eq('patient_id', data.patientId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return rows ?? []
  })

export const saveScreening = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SaveInput.parse(i))
  .handler(async ({ context, data }) => {
    const score = data.criteria.filter((c) => c.present).length
    const payload = {
      patient_id: data.patientId,
      instrument: data.instrument,
      domain: data.domain ?? null,
      criteria: data.criteria,
      score,
      notes: data.notes ?? null,
      created_by: context.userId,
      updated_at: new Date().toISOString(),
    }
    if (data.id) {
      const { error } = await context.supabase.from('screenings').update(payload).eq('id', data.id)
      if (error) throw new Error(error.message)
      return { ok: true, id: data.id }
    }
    const { data: row, error } = await context.supabase
      .from('screenings')
      .insert(payload)
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return { ok: true, id: row.id }
  })

export const deleteScreening = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('screenings').delete().eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const analyzeScreeningWithAI = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    await enforceRateLimit(RATE_LIMITS.aiSynthesis, `user:${context.userId}`)
    const { data: row, error } = await context.supabase
      .from('screenings')
      .select('*, patients(name, birth_date, schooling)')
      .eq('id', data.id)
      .maybeSingle()
    if (error || !row) throw new Error(error?.message ?? 'Triagem não encontrada.')

    const criteria = (row.criteria as Array<{ code: string; label: string; present: boolean; notes?: string | null }>) ?? []
    const present = criteria.filter((c) => c.present)
    const patient = row.patients as { name: string; birth_date: string; schooling: string } | null

    const prompt = `Você é neuropsicóloga clínica. Analise a triagem baseada em critérios ${row.instrument === 'dsm5tr' ? 'DSM-5-TR' : row.instrument} para o domínio "${row.domain ?? '—'}" e escreva uma breve análise (2–4 parágrafos, português) considerando:
- quais critérios foram marcados e possíveis padrões clínicos;
- se o número de critérios se aproxima do ponto de corte diagnóstico do DSM-5-TR;
- diagnósticos diferenciais a considerar;
- recomendação de próximos passos (aprofundar entrevista, testes específicos, encaminhamentos).
Nunca conclua diagnóstico definitivo; use "hipótese" e "sugere investigar".

Paciente: ${patient?.name ?? '—'} (nasc. ${patient?.birth_date ?? '—'}, escolaridade ${patient?.schooling ?? '—'}).
Critérios marcados (${present.length}/${criteria.length}):
${present.map((c) => `- ${c.code}: ${c.label}${c.notes ? ` — ${c.notes}` : ''}`).join('\n') || '(nenhum)'}

Observações do avaliador: ${row.notes ?? '—'}`

    const key = process.env.LOVABLE_API_KEY
    if (!key) throw new Error('LOVABLE_API_KEY ausente.')
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Lovable-API-Key': key },
      body: JSON.stringify({
        model: 'google/gemini-3.1-pro-preview',
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (res.status === 429) throw new Error('Limite de uso da IA. Tente novamente em instantes.')
    if (res.status === 402) throw new Error('Créditos de IA esgotados.')
    if (!res.ok) throw new Error(`Falha na IA: ${res.status}`)
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const analysis = json.choices?.[0]?.message?.content?.trim()
    if (!analysis) throw new Error('Resposta vazia da IA.')

    const { error: upErr } = await context.supabase
      .from('screenings')
      .update({ ai_analysis: analysis })
      .eq('id', data.id)
    if (upErr) throw new Error(upErr.message)
    return { analysis }
  })
