import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { RATE_LIMITS, enforceRateLimit } from '@/lib/rate-limit.server'
import { SALARIO_MINIMO_BRL, faixaTarifa, FAIXA_LABELS } from '@/lib/social-triagem-catalog'

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

type SocialCriterion = { code: string; label: string; present: boolean; notes?: string | null; value?: string | number | null }

function pickNumber(criteria: SocialCriterion[], code: string): number | null {
  const c = criteria.find((x) => x.code === code)
  if (!c || c.value === null || c.value === undefined || c.value === '') return null
  const n = Number(c.value)
  return Number.isFinite(n) ? n : null
}

export const analyzeSocialScreeningWithAI = createServerFn({ method: 'POST' })
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
    if (row.instrument !== 'social') throw new Error('Esta triagem não é do tipo social.')

    const criteria = (row.criteria as SocialCriterion[]) ?? []
    const rendaMensal = pickNumber(criteria, 'RENDA_MENSAL') ?? 0
    const pessoas = Math.max(1, pickNumber(criteria, 'PESSOAS_DOMICILIO') ?? 1)
    const perCapita = rendaMensal / pessoas
    const perCapitaSM = perCapita / SALARIO_MINIMO_BRL
    const faixa = faixaTarifa(perCapitaSM)
    const patient = row.patients as { name: string; birth_date: string; schooling: string } | null

    const marcados = criteria.filter((c) => c.present && !['RENDA_MENSAL', 'PESSOAS_DOMICILIO'].includes(c.code))
    const listar = (prefix: string) =>
      marcados.filter((c) => c.code.startsWith(prefix)).map((c) => `- ${c.code}: ${c.label}`).join('\n') || '(nenhum)'

    const prompt = `Você é assistente social apoiando psicóloga clínica. Escreva uma síntese socioeconômica (3–4 parágrafos, português) sobre a situação da família a partir da triagem social abaixo. Estruture:
1) Panorama socioeconômico (renda, composição, moradia, benefícios);
2) Fatores de vulnerabilidade relevantes e riscos psicossociais;
3) Fatores protetivos e recursos disponíveis;
4) Recomendação de encaixe: elegibilidade para gratuidade / subsídio / particular, encaminhamentos a CRAS/CREAS/CAPS quando pertinente, e ajustes de plano terapêutico (frequência, modalidade, apoio familiar).

Dados objetivos:
- Paciente: ${patient?.name ?? '—'} (nasc. ${patient?.birth_date ?? '—'}, escolaridade ${patient?.schooling ?? '—'}).
- Renda familiar mensal declarada: R$ ${rendaMensal.toFixed(2)}.
- Pessoas no domicílio: ${pessoas}.
- Renda per capita: R$ ${perCapita.toFixed(2)} (${perCapitaSM.toFixed(2)} salários mínimos, SM = R$ ${SALARIO_MINIMO_BRL}).
- Faixa calculada: ${FAIXA_LABELS[faixa].label}.

Fatores de vulnerabilidade marcados:
${listar('V')}

Benefícios sociais em uso:
${listar('B')}

Fatores protetivos:
${listar('P')}

Observações do avaliador: ${row.notes ?? '—'}

Regra de faixa (use como referência, não repita mecanicamente):
- ≤ 1 SM per capita → gratuidade
- 1 a 3 SM per capita → subsídio (tabela social)
- > 3 SM per capita → particular

Seja objetiva, empática e evite jargão jurídico.`

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
    const narrative = json.choices?.[0]?.message?.content?.trim()
    if (!narrative) throw new Error('Resposta vazia da IA.')

    const header = `**Síntese socioeconômica**  \nRenda per capita: R$ ${perCapita.toFixed(2)} (${perCapitaSM.toFixed(2)} SM) — **${FAIXA_LABELS[faixa].label}**.\n\n`
    const analysis = header + narrative

    const { error: upErr } = await context.supabase
      .from('screenings')
      .update({ ai_analysis: analysis })
      .eq('id', data.id)
    if (upErr) throw new Error(upErr.message)
    return { analysis, faixa, perCapita, perCapitaSM }
  })

