import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { RATE_LIMITS, enforceRateLimit } from '@/lib/rate-limit.server'

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
  structured_data: z.record(z.string(), z.unknown()).nullable().optional(),
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

function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'object') return Object.keys(v as object).length === 0
  return false
}

/** Mescla apenas valores não vazios do novo objeto sobre o antigo (recursivo). */
function mergeNonEmpty(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...prev }
  for (const [k, v] of Object.entries(next)) {
    if (isEmptyValue(v)) continue
    const before = out[k]
    if (
      before && typeof before === 'object' && !Array.isArray(before) &&
      v && typeof v === 'object' && !Array.isArray(v)
    ) {
      out[k] = mergeNonEmpty(before as Record<string, unknown>, v as Record<string, unknown>)
    } else {
      out[k] = v
    }
  }
  return out
}

export const upsertAnamnese = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpsertInput.parse(i))
  .handler(async ({ context, data }) => {
    // 1) Estado atual (para snapshot + merge protetivo)
    const { data: current } = await context.supabase
      .from('anamneses')
      .select('*')
      .eq('patient_id', data.patientId)
      .maybeSingle()

    // 2) Snapshot de versão antes de qualquer escrita — nunca perder histórico
    if (current) {
      await context.supabase.from('anamnese_revisions').insert({
        patient_id: data.patientId,
        anamnese_id: (current as { id?: string }).id ?? null,
        author_id: context.userId,
        snapshot: current as never,
      } as never)
    }

    const textFields = [
      'queixa_principal', 'historia_atual', 'desenvolvimento', 'historia_medica',
      'medicacoes', 'historia_familiar', 'historia_escolar', 'historia_social',
      'observacoes', 'transcript',
    ] as const

    const payload: Record<string, unknown> = {
      patient_id: data.patientId,
      created_by: (current as { created_by?: string } | null)?.created_by ?? context.userId,
      updated_at: new Date().toISOString(),
    }

    // 3) Merge: campo vazio NUNCA apaga conteúdo já salvo
    const prev = (current ?? {}) as Record<string, unknown>
    for (const f of textFields) {
      const incoming = (data as Record<string, unknown>)[f]
      payload[f] = isEmptyValue(incoming) ? (prev[f] ?? null) : incoming
    }

    if (data.structured_data !== undefined) {
      const prevSd = (prev.structured_data as Record<string, unknown> | null) ?? {}
      payload.structured_data = mergeNonEmpty(
        prevSd,
        (data.structured_data ?? {}) as Record<string, unknown>,
      )
    }

    const { error } = await context.supabase
      .from('anamneses')
      .upsert(payload as never, { onConflict: 'patient_id' })
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const listAnamneseRevisions = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { patientId: string }) => i)
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from('anamnese_revisions')
      .select('id, created_at, author_id, snapshot')
      .eq('patient_id', data.patientId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) throw new Error(error.message)
    return rows ?? []
  })


export const analyzeAnamneseWithAI = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { patientId: string }) => i)
  .handler(async ({ context, data }) => {
    await enforceRateLimit(RATE_LIMITS.aiSynthesis, `user:${context.userId}`)
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
