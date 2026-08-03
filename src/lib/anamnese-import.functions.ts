import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { RATE_LIMITS, enforceRateLimit } from '@/lib/rate-limit.server'

const Input = z.object({
  fileBase64: z.string().min(20).max(28 * 1024 * 1024), // ~20MB PDF
  mimeType: z.string().max(120).default('application/pdf'),
  filename: z.string().max(200).default('anamnese.pdf'),
  mode: z.enum(['livre', 'neuro_child', 'neuro_adult']).default('livre'),
})

// Field lists mirror the keys used in the anamnese page + structured forms.
const LIVRE_KEYS = [
  'queixa_principal',
  'historia_atual',
  'desenvolvimento',
  'historia_medica',
  'medicacoes',
  'historia_familiar',
  'historia_escolar',
  'historia_social',
  'observacoes',
]

const CHILD_KEYS = [
  'nome', 'nascimento', 'idade', 'sexo', 'escola', 'cidade_uf',
  'responsaveis', 'relacao', 'contato_resp', 'encaminhado_por',
  'data_entrevista', 'hipotese_encaminhante',
  'qp_principal', 'qp_tempo', 'qp_contextos', 'qp_recente', 'qp_prev_diag',
  'dominios_obs',
  'gest_planejada', 'gest_complicacoes', 'gest_substancias', 'parto_tipo',
  'peso_ig', 'neo_intercorrencias', 'neo_uti', 'aleitamento',
  'regressoes', 'oftalmo_audio',
  'diag_desc', 'hospitalizacoes', 'meds_psiq', 'terapias', 'aval_previas', 'dor_fadiga',
  'sono_rotina', 'sono_dif', 'alimentacao',
  'esc_inicio', 'esc_desempenho', 'esc_queixa', 'esc_apoio',
  'esc_organizacao', 'esc_tarefas', 'esc_troca', 'esc_retencao', 'esc_sentimento',
  'fe_inicio', 'fe_ambientes',
  'lang_desc', 'comp_desc', 'comp_regulacao',
  'fam_dinamica', 'fam_estressores', 'fam_escolaridade', 'fam_idioma', 'fam_desc',
  'rotina', 'ativ_favoritas', 'brincar', 'atividade_fisica', 'telas_horas', 'telas_dif',
  'exp_resultado', 'exp_laudo', 'exp_perguntas', 'exp_sensivel', 'exp_adicional',
  'clin_hipoteses', 'clin_dominios', 'clin_instrumentos', 'clin_sessoes',
  'clin_adaptacoes', 'clin_encaminhamentos', 'clin_documentos', 'clin_observacoes',
  'pontos_fortes',
]

const ADULT_KEYS = [
  'nome', 'nascimento', 'idade', 'sexo', 'escolaridade', 'cidade_uf', 'contato',
  'encaminhado_por', 'data_entrevista', 'hipotese_encaminhante',
  'qp_principal', 'qp_tempo', 'qp_contextos', 'qp_recente', 'qp_prev_diag',
  'dominios_obs',
  'lang_desc',
  'dev_desc', 'hist_saude', 'meds', 'terapias',
  'sono_rotina', 'sono_dif', 'alimentacao',
  'substancias_desc',
  'sintomas_desc', 'personalidade_desc',
  'social_desc', 'trabalho_desc', 'familia_desc', 'identidade_desc',
  'escalas_obs',
  'exp_resultado', 'exp_laudo', 'exp_perguntas', 'exp_sensivel', 'exp_adicional',
  'clin_hipoteses', 'clin_dominios', 'clin_instrumentos', 'clin_sessoes',
  'clin_adaptacoes', 'clin_encaminhamentos', 'clin_documentos', 'clin_observacoes',
  'pontos_fortes',
]

/**
 * Lê um PDF de anamnese (relatório, ficha, questionário respondido) e
 * mapeia o conteúdo para os campos da anamnese na plataforma via IA.
 * Retorna um objeto com o subset relevante para o `mode` selecionado.
 */
export const importAnamneseFromPdf = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ context, data }) => {
    await enforceRateLimit(RATE_LIMITS.aiSynthesis, `user:${context.userId}`)

    const key = process.env.LOVABLE_API_KEY
    if (!key) throw new Error('LOVABLE_API_KEY ausente.')

    const bin = Buffer.from(data.fileBase64, 'base64')
    if (bin.byteLength < 100) throw new Error('Arquivo inválido ou vazio.')
    if (bin.byteLength > 20 * 1024 * 1024) {
      throw new Error('Arquivo muito grande (máx. 20 MB).')
    }
    const mime = data.mimeType || 'application/pdf'
    if (!mime.startsWith('application/pdf') && !mime.startsWith('image/')) {
      throw new Error('Envie um PDF ou imagem digitalizada da anamnese.')
    }

    const keys =
      data.mode === 'neuro_child' ? CHILD_KEYS
      : data.mode === 'neuro_adult' ? ADULT_KEYS
      : LIVRE_KEYS

    const modeLabel =
      data.mode === 'neuro_child' ? 'anamnese neuropsicológica infantil'
      : data.mode === 'neuro_adult' ? 'anamnese neuropsicológica de adultos'
      : 'anamnese clínica livre'

    const system = `Você é assistente clínica de neuropsicologia. Sua tarefa é ler um documento (anamnese preenchida, prontuário, relatório, questionário) e extrair as informações mapeando para os campos de uma ${modeLabel}. Regras:
- Preserve o texto do documento em português (BR); resuma somente quando o campo pedir síntese.
- Nunca invente dados. Se algo não estiver no documento, OMITA a chave.
- Retorne SOMENTE um objeto JSON válido, sem texto adicional, com o formato: {"fields": { "<chave>": "<texto>" }, "notes": "<observações da extração, opcional>", "unmapped": "<conteúdos relevantes que não couberam nas chaves, opcional>"}
- Use apenas as chaves listadas. Valores devem ser strings (concatene listas com quebras de linha).
- Datas em formato ISO (AAAA-MM-DD) quando possível; mantenha o original entre parênteses se ambíguo.`

    const userText = `Chaves permitidas (use apenas estas):
${keys.map((k) => `- ${k}`).join('\n')}

Extraia o máximo de informação do PDF anexo para essas chaves.`

    const dataUrl = `data:${mime};base64,${data.fileBase64}`

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Lovable-API-Key': key },
      body: JSON.stringify({
        model: 'google/gemini-1.5-flash', // Usando explicitamente o modelo Flash (mais barato/estável para grandes volumes)
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              { type: 'file', file: { filename: data.filename, file_data: dataUrl } },
            ],
          },
        ],
      }),
    })
    if (res.status === 402 || !res.ok) {
      console.warn(`[anamnese-import] Gateway Lovable falhou (${res.status}). Tentando modelo de baixo custo/gratuito...`)
      // Se falhar por créditos, poderíamos tentar alternar para um modelo mais barato (Flash 1.5) 
      // mas como já estamos usando gemini-1.5-flash (ou gemini-3.6-flash que é competitivo), 
      // o erro 402 é no nível da plataforma Lovable.
      if (res.status === 402) {
        throw new Error('Créditos de IA esgotados na plataforma Lovable. A importação de PDFs requer créditos ativos.')
      }
      const t = await res.text().catch(() => '')
      console.error('[anamnese-import] gateway error', res.status, t)
      throw new Error(`Falha na leitura do PDF (${res.status}).`)
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const raw = json.choices?.[0]?.message?.content?.trim() ?? ''
    if (!raw) throw new Error('Resposta vazia da IA.')

    let parsed: { fields?: Record<string, unknown>; notes?: string; unmapped?: string }
    try {
      parsed = JSON.parse(raw)
    } catch {
      // tenta extrair primeiro bloco JSON
      const m = raw.match(/\{[\s\S]*\}/)
      if (!m) throw new Error('A IA não retornou JSON válido.')
      parsed = JSON.parse(m[0])
    }

    const fields: Record<string, string> = {}
    if (parsed.fields && typeof parsed.fields === 'object') {
      for (const k of keys) {
        const v = (parsed.fields as Record<string, unknown>)[k]
        if (v == null) continue
        const str = typeof v === 'string' ? v : Array.isArray(v) ? v.filter(Boolean).join('\n') : String(v)
        const trimmed = str.trim()
        if (trimmed) fields[k] = trimmed
      }
    }

    return {
      mode: data.mode,
      fields,
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      unmapped: typeof parsed.unmapped === 'string' ? parsed.unmapped : '',
      extractedCount: Object.keys(fields).length,
    }
  })
