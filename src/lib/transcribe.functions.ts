import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { RATE_LIMITS, enforceRateLimit } from '@/lib/rate-limit.server'

const Input = z.object({
  // base64 de UM chunk de áudio (máx ~24MB — abaixo do cap de 25MiB do gateway).
  audioBase64: z.string().min(10).max(32 * 1024 * 1024),
  mimeType: z.string().max(120).default('audio/webm'),
  language: z.string().max(10).default('pt'),
  // duração deste chunk (segundos). Cap por chunk = 15 min; sessões longas devem ser divididas no client.
  durationSeconds: z.number().int().min(0).max(15 * 60).optional(),
})

/**
 * Transcreve UM chunk de áudio via Lovable AI Gateway.
 * Para gravações longas (até 2h), o front envia vários chunks (~4-10 min cada) em sequência.
 */
export const transcribeAudio = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ context, data }) => {
    const seconds = Math.max(1, Math.min(data.durationSeconds ?? 60, 900))
    await enforceRateLimit(RATE_LIMITS.aiTranscribe, `user:${context.userId}`, seconds)

    const key = process.env.LOVABLE_API_KEY
    if (!key) throw new Error('LOVABLE_API_KEY ausente.')

    const bin = Buffer.from(data.audioBase64, 'base64')
    if (bin.byteLength > 24 * 1024 * 1024) {
      throw new Error('Chunk de áudio muito grande (máx. 24 MB). Divida em trechos menores.')
    }
    const baseMime = data.mimeType.split(';')[0].trim() || 'audio/webm'
    const ext = baseMime.includes('mp4') ? 'mp4'
      : baseMime.includes('mpeg') || baseMime.includes('mp3') ? 'mp3'
      : baseMime.includes('wav') ? 'wav'
      : baseMime.includes('ogg') ? 'ogg'
      : baseMime.includes('m4a') ? 'm4a'
      : 'webm'

    const form = new FormData()
    form.append('file', new Blob([bin], { type: baseMime }), `audio.${ext}`)
    form.append('model', 'openai/gpt-4o-transcribe')
    if (data.language) form.append('language', data.language)
    form.append('response_format', 'json')

    const res = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    })

    // Caso de erro 402 ou 401 (créditos ou chave), tentamos o fallback gratuito via Gemini
    if (res.status === 402 || res.status === 401 || !res.ok) {
      console.warn(`[transcribe] Gateway Lovable falhou (${res.status}). Tentando fallback gratuito via Gemini...`)
      try {
        const geminiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model: 'google/gemini-2.0-flash-exp', // Usando o modelo mais recente e eficiente da série Flash
            messages: [
              {
                role: 'system',
                content: 'Você é um transcritor de áudio. Transcreva exatamente o conteúdo do arquivo de áudio fornecido. Retorne apenas o texto transcrito.'
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Transcreva este áudio:' },
                  { type: 'file', file: { filename: `audio.${ext}`, file_data: `data:${baseMime};base64,${data.audioBase64}` } }
                ]
              }
            ]
          })
        })

        if (geminiRes.ok) {
          const gJson = await geminiRes.json() as { choices?: Array<{ message?: { content?: string } }> }
          const text = gJson.choices?.[0]?.message?.content?.trim() ?? ''
          if (text) return { text }
        }
      } catch (e) {
        console.error('[transcribe] Fallback Gemini falhou', e)
      }

      // Se o fallback também falhar ou o erro original não for contornável
      if (res.status === 402) {
        throw new Error('O limite de créditos de IA da plataforma Lovable para transcrições dedicadas foi atingido. O sistema tentou o uso gratuito (Gemini Flash), mas ele também não está disponível no momento. Por favor, verifique seus créditos.')
      }
      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(`Falha na transcrição (${res.status}): ${t.slice(0, 300)}`)
      }
    }
    const json = (await res.json()) as { text?: string }
    const text = json.text?.trim() ?? ''
    if (!text) throw new Error('Não foi possível transcrever o áudio.')
    return { text }
  })

const SessionInput = z.object({ sessionId: z.string().uuid(), transcript: z.string() })
export const saveSessionTranscript = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SessionInput.parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from('sessions_plan')
      .update({ transcript: data.transcript })
      .eq('id', data.sessionId)
    if (error) throw new Error(error.message)
    return { ok: true }
  })
