import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const UpsertInput = z.object({
  patientId: z.string().uuid(),
  queixa_principal: z.string().nullable().optional(),
  historia_atual: z.string().nullable().optional(),
  desenvolvimento: z.string().nullable().optional(),
  historia_medica: z.string().nullable().optional(),
  medicacoes: z.string().nullable().optional(),
  historia_familiar: z.string().nullable().optional(),
  historia_escolar: z.string().nullable().optional(),
  historia_social: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  transcript: z.string().nullable().optional(),
})

export const getAnamnese = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { patientId: string }) => i)
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from('anamneses')
      .select('*')
      .eq('patient_id', data.patientId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return row
  })

export const upsertAnamnese = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpsertInput.parse(i))
  .handler(async ({ context, data }) => {
    const payload = {
      patient_id: data.patientId,
      queixa_principal: data.queixa_principal ?? null,
      historia_atual: data.historia_atual ?? null,
      desenvolvimento: data.desenvolvimento ?? null,
      historia_medica: data.historia_medica ?? null,
      medicacoes: data.medicacoes ?? null,
      historia_familiar: data.historia_familiar ?? null,
      historia_escolar: data.historia_escolar ?? null,
      historia_social: data.historia_social ?? null,
      observacoes: data.observacoes ?? null,
      transcript: data.transcript ?? null,
      created_by: context.userId,
      updated_at: new Date().toISOString(),
    }
    const { error } = await context.supabase
      .from('anamneses')
      .upsert(payload, { onConflict: 'patient_id' })
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const analyzeAnamneseWithAI = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { patientId: string }) => i)
  .handler(async ({ context, data }) => {
    const { data: pat } = await context.supabase
      .from('patients')
      .select('name, birth_date, schooling, hypotheses')
      .eq('id', data.patientId)
      .maybeSingle()
    const { data: an } = await context.supabase
      .from('anamneses')
      .select('*')
      .eq('patient_id', data.patientId)
      .maybeSingle()
    if (!an) throw new Error('Preencha a anamnese antes de analisar.')

    const prompt = `Você é neuropsicóloga clínica. A partir da anamnese abaixo, produza uma análise de caso preliminar em português:
1) principais hipóteses diagnósticas a investigar (referenciando DSM-5-TR quando pertinente);
2) domínios cognitivos e comportamentais a priorizar na avaliação;
3) testes/instrumentos sugeridos;
4) sinais de alerta ou fatores de proteção.
Tom técnico e humano, 3 a 6 parágrafos. Não invente dados; se algo não estiver descrito, diga que precisa ser investigado.

Paciente: ${pat?.name ?? '—'} (nasc. ${pat?.birth_date ?? '—'}, escolaridade ${pat?.schooling ?? '—'}).
Hipóteses iniciais: ${pat?.hypotheses ?? 'não informadas'}.

Queixa principal: ${an.queixa_principal ?? '—'}
História atual: ${an.historia_atual ?? '—'}
Desenvolvimento: ${an.desenvolvimento ?? '—'}
História médica: ${an.historia_medica ?? '—'}
Medicações: ${an.medicacoes ?? '—'}
História familiar: ${an.historia_familiar ?? '—'}
História escolar: ${an.historia_escolar ?? '—'}
História social: ${an.historia_social ?? '—'}
Observações: ${an.observacoes ?? '—'}
${an.transcript ? `Trecho da entrevista (transcrição):\n${an.transcript}` : ''}`

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
    return { analysis }
  })
